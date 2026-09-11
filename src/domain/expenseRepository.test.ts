import { beforeEach, describe, expect, it } from "vitest";
import { loadExpenses, saveExpense } from "./expenseRepository";
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
});
