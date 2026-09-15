import { beforeEach, describe, expect, it } from "vitest";
import { loadAuditRecords } from "./auditRepository";
import { loadExpenses, saveExpense, updateExpense } from "./expenseRepository";
import { ForbiddenError } from "./errors";
import type { Expense } from "./expense";

const makeExpense = (overrides: Partial<Expense> = {}): Expense => ({
  id: "1",
  amount: 10,
  date: "2026-01-01",
  category: "Food",
  createdAt: Date.now(),
  status: "draft",
  ownerId: "current-user",
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

  it("defaults missing status and ownerId on legacy records", () => {
    localStorage.setItem(
      "expenses",
      JSON.stringify([{ id: "1", amount: 10, date: "2026-01-01", category: "Food", createdAt: 1 }]),
    );

    expect(loadExpenses()[0]).toMatchObject({ status: "draft", ownerId: "current-user" });
  });

  it("updates the stored expense with new values", () => {
    const expense = makeExpense({ ownerId: "current-user" });
    saveExpense(expense);

    updateExpense(expense.id, { amount: 42, notes: "changed" }, "current-user");

    const [loaded] = loadExpenses();
    expect(loaded.amount).toBe(42);
    expect(loaded.notes).toBe("changed");
  });

  it("throws ForbiddenError when a non-owner attempts to update", () => {
    const expense = makeExpense({ ownerId: "owner-a" });
    saveExpense(expense);

    expect(() => updateExpense(expense.id, { amount: 5 }, "owner-b")).toThrow(ForbiddenError);
  });

  it("records an audit entry with timestamp, editor, and before/after values", () => {
    const expense = makeExpense({ ownerId: "current-user", amount: 10 });
    saveExpense(expense);

    updateExpense(expense.id, { amount: 20 }, "current-user");

    const [entry] = loadAuditRecords(expense.id);
    expect(entry.editorId).toBe("current-user");
    expect(entry.before.amount).toBe(10);
    expect(entry.after.amount).toBe(20);
    expect(typeof entry.editedAt).toBe("number");
  });
});
