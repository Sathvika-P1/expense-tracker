import { beforeEach, describe, expect, it } from "vitest";
import {
  UNDO_WINDOW_MS,
  deleteExpense,
  findExpenseById,
  loadExpenses,
  purgeExpiredDeletions,
  restoreExpense,
  saveExpense,
  updateExpense,
} from "./expenseRepository";
import type { Expense, ExpenseInput } from "./expense";

const validInput: ExpenseInput = {
  amount: "52.75",
  date: "2026-09-15",
  category: "Travel",
  notes: "Rescheduled",
};

const makeExpense = (overrides: Partial<Expense> = {}): Expense => ({
  id: "1",
  userId: "local-user",
  amount: 10,
  date: "2026-01-01",
  category: "Food",
  createdAt: Date.now(),
  ...overrides,
});

beforeEach(() => {
  localStorage.clear();
});

describe("expenseRepository", () => {
  it("returns an empty list when nothing is stored", () => {
    expect(loadExpenses()).toEqual([]);
  });

  it("persists a saved expense so a fresh load (simulated reload) returns it", () => {
    const expense = makeExpense();
    saveExpense(expense);

    const loaded = loadExpenses();

    expect(loaded).toHaveLength(1);
    expect(loaded[0]).toEqual(expense);
  });

  it("prepends new expenses so the most recently saved appears first", () => {
    const first = makeExpense({ id: "1" });
    const second = makeExpense({ id: "2" });

    saveExpense(first);
    saveExpense(second);

    const loaded = loadExpenses();

    expect(loaded[0].id).toBe("2");
    expect(loaded[1].id).toBe("1");
  });

  it("returns an empty list when localStorage contains corrupted JSON", () => {
    localStorage.setItem("expenses", "{not valid json");

    expect(loadExpenses()).toEqual([]);
  });

  it.each(['{"foo":1}', "null", "42", '"a string"'])(
    "returns an empty list when localStorage contains valid JSON that is not an array (%s)",
    (value) => {
      localStorage.setItem("expenses", value);

      expect(loadExpenses()).toEqual([]);
    },
  );

  it("only returns expenses belonging to the given user", () => {
    saveExpense(makeExpense({ id: "1", userId: "user-a" }));
    saveExpense(makeExpense({ id: "2", userId: "user-b" }));

    expect(loadExpenses("user-a").map((e) => e.id)).toEqual(["1"]);
  });

  it("orders expenses by date descending regardless of save order", () => {
    saveExpense(makeExpense({ id: "old", date: "2026-01-01", userId: "u" }));
    saveExpense(makeExpense({ id: "new", date: "2026-03-01", userId: "u" }));

    expect(loadExpenses("u").map((e) => e.id)).toEqual(["new", "old"]);
  });

  it("updates an owned expense and reflects the new values (AC2)", () => {
    saveExpense(makeExpense({ id: "e1", userId: "local-user", updatedAt: 1 }));

    const result = updateExpense("e1", validInput, 1, "local-user");

    expect(result).toEqual({
      ok: true,
      expense: expect.objectContaining({ amount: 52.75, notes: "Rescheduled" }),
    });
    expect(loadExpenses("local-user")[0].notes).toBe("Rescheduled");
  });

  it("rejects updating an expense owned by another user (AC6)", () => {
    saveExpense(makeExpense({ id: "e2", userId: "other-user", updatedAt: 1 }));

    const result = updateExpense("e2", validInput, 1, "local-user");

    expect(result).toEqual({ ok: false, reason: "unauthorized" });
  });

  it("rejects updating when the record changed since it was loaded (AC9)", () => {
    saveExpense(makeExpense({ id: "e1", userId: "local-user", updatedAt: 5 }));

    const result = updateExpense("e1", validInput, 1, "local-user");

    expect(result).toEqual({ ok: false, reason: "conflict" });
  });

  it("updates a legacy record with no updatedAt when it hasn't changed since loading (AC2)", () => {
    saveExpense(makeExpense({ id: "e1", userId: "local-user", updatedAt: undefined }));

    const result = updateExpense("e1", validInput, undefined, "local-user");

    expect(result.ok).toBe(true);
  });

  it("rejects updating a legacy record that gained an updatedAt from another writer since it was loaded (AC9)", () => {
    saveExpense(makeExpense({ id: "e1", userId: "local-user", updatedAt: undefined }));
    const afterOtherWriter = updateExpense("e1", validInput, undefined, "local-user");
    if (!afterOtherWriter.ok) throw new Error("setup failed");

    const result = updateExpense("e1", validInput, undefined, "local-user");

    expect(result).toEqual({ ok: false, reason: "conflict" });
  });

  it("rejects updating an expense that no longer exists (AC10)", () => {
    const result = updateExpense("missing", validInput, 1, "local-user");

    expect(result).toEqual({ ok: false, reason: "not_found" });
  });
});

describe("deleteExpense", () => {
  it("returns not-found when no expense matches the id", () => {
    saveExpense(makeExpense({ id: "1" }));

    expect(deleteExpense("does-not-exist", "local-user")).toEqual({ ok: false, error: "not-found" });
  });

  it("returns invalid-id for an empty id and deletes nothing", () => {
    saveExpense(makeExpense({ id: "1" }));

    expect(deleteExpense("", "local-user")).toEqual({ ok: false, error: "invalid-id" });
    expect(loadExpenses()).toHaveLength(1);
  });

  it("returns invalid-id for a whitespace-only id and deletes nothing", () => {
    saveExpense(makeExpense({ id: "1" }));

    expect(deleteExpense("   ", "local-user")).toEqual({ ok: false, error: "invalid-id" });
    expect(loadExpenses()).toHaveLength(1);
  });

  it("soft deletes: hides the expense from list and find but keeps the record", () => {
    saveExpense(makeExpense({ id: "1" }));
    saveExpense(makeExpense({ id: "2" }));

    const result = deleteExpense("1", "local-user", 1000);

    expect(result).toEqual({
      ok: true,
      expenses: expect.any(Array),
      expense: expect.objectContaining({ id: "1" }),
    });
    expect(loadExpenses("local-user").map((e) => e.id)).toEqual(["2"]);
    expect(findExpenseById("1")).toBeUndefined();
    const stored = JSON.parse(localStorage.getItem("expenses")!);
    expect(stored.find((e: Expense) => e.id === "1").deletedAt).toBe(1000);
  });

  it("returns forbidden for another user's expense and keeps it", () => {
    saveExpense(makeExpense({ id: "1", userId: "other-user" }));

    expect(deleteExpense("1", "local-user")).toEqual({ ok: false, error: "forbidden" });
    expect(findExpenseById("1")).toBeDefined();
  });

  it("returns not-found for an already soft-deleted id", () => {
    saveExpense(makeExpense({ id: "1" }));
    deleteExpense("1", "local-user");

    expect(deleteExpense("1", "local-user")).toEqual({ ok: false, error: "not-found" });
  });

  it("does not let a soft-deleted expense be edited", () => {
    saveExpense(makeExpense({ id: "1" }));
    deleteExpense("1", "local-user");

    expect(updateExpense("1", validInput, undefined, "local-user")).toEqual({
      ok: false,
      reason: "not_found",
    });
  });

  it("still loads, edits and deletes rows stored without deletedAt", () => {
    localStorage.setItem(
      "expenses",
      JSON.stringify([
        { id: "1", userId: "local-user", amount: 1, date: "2026-01-01", category: "Food", createdAt: 1 },
      ]),
    );

    expect(loadExpenses("local-user")).toHaveLength(1);
    expect(updateExpense("1", validInput, undefined, "local-user")).toEqual(
      expect.objectContaining({ ok: true }),
    );
    expect(deleteExpense("1", "local-user").ok).toBe(true);
  });
});

describe("restoreExpense", () => {
  it("restores a soft-deleted expense into the list", () => {
    saveExpense(makeExpense({ id: "1" }));
    deleteExpense("1", "local-user", 1000);

    expect(restoreExpense("1", "local-user", 2000).ok).toBe(true);
    expect(loadExpenses("local-user").map((e) => e.id)).toEqual(["1"]);
  });

  it("returns not-found for a live expense", () => {
    saveExpense(makeExpense({ id: "1" }));

    expect(restoreExpense("1", "local-user")).toEqual({ ok: false, error: "not-found" });
  });
});

describe("purgeExpiredDeletions", () => {
  it("permanently removes deletions once the undo window has passed", () => {
    saveExpense(makeExpense({ id: "1" }));
    deleteExpense("1", "local-user", 0);

    expect(purgeExpiredDeletions(UNDO_WINDOW_MS - 1)).toBe(0);
    expect(purgeExpiredDeletions(UNDO_WINDOW_MS)).toBe(1);
    expect(JSON.parse(localStorage.getItem("expenses")!)).toEqual([]);
    expect(restoreExpense("1", "local-user")).toEqual({ ok: false, error: "not-found" });
  });

  it("keeps live expenses", () => {
    saveExpense(makeExpense({ id: "1" }));

    expect(purgeExpiredDeletions(UNDO_WINDOW_MS * 5)).toBe(0);
    expect(loadExpenses("local-user")).toHaveLength(1);
  });
});
