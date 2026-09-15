import { beforeEach, describe, expect, it } from "vitest";
import { deleteExpense, loadExpenses, saveExpense } from "./expenseRepository";
import type { Expense } from "./expense";

const makeExpense = (overrides: Partial<Expense> = {}): Expense => ({
  id: "1",
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
});

describe("deleteExpense", () => {
  it("returns not-found when no expense matches the id", () => {
    saveExpense(makeExpense({ id: "1" }));

    expect(deleteExpense("does-not-exist", "u1")).toEqual({ ok: false, error: "not-found" });
  });

  it("returns invalid-id for an empty id and deletes nothing", () => {
    saveExpense(makeExpense({ id: "1" }));

    expect(deleteExpense("", "u1")).toEqual({ ok: false, error: "invalid-id" });
    expect(loadExpenses()).toHaveLength(1);
  });

  it("returns invalid-id for a whitespace-only id and deletes nothing", () => {
    saveExpense(makeExpense({ id: "1" }));

    expect(deleteExpense("   ", "u1")).toEqual({ ok: false, error: "invalid-id" });
    expect(loadExpenses()).toHaveLength(1);
  });

  it("removes the matching expense and persists the remaining list", () => {
    saveExpense(makeExpense({ id: "1" }));
    saveExpense(makeExpense({ id: "2" }));

    const result = deleteExpense("1", "u1");

    expect(result).toEqual({ ok: true, expenses: expect.any(Array) });
    expect(loadExpenses()).toHaveLength(1);
    expect(loadExpenses()[0].id).toBe("2");
  });

  it("permanently removes an expense with no restore path", () => {
    saveExpense(makeExpense({ id: "1" }));

    deleteExpense("1", "u1");

    expect(loadExpenses()).toEqual([]);
  });

  it("returns forbidden when the requester does not own the expense", () => {
    saveExpense(makeExpense({ id: "1", createdBy: "owner" }));

    expect(deleteExpense("1", "someone-else")).toEqual({ ok: false, error: "forbidden" });
    expect(loadExpenses()).toHaveLength(1);
  });

  it("allows deleting a legacy expense with no createdBy by anyone", () => {
    saveExpense(makeExpense({ id: "1" }));

    expect(deleteExpense("1", "anyone")).toEqual({ ok: true, expenses: [] });
  });
});
