import { describe, expect, it } from "vitest";
import type { Expense } from "./expense";
import { EMPTY_FILTERS, filterExpenses } from "./expenseFilters";

function makeExpense(overrides: Partial<Expense> = {}): Expense {
  return {
    id: "1",
    userId: "local-user",
    amount: 10,
    date: "2026-01-01",
    category: "Food",
    notes: "lunch",
    createdAt: Date.now(),
    ...overrides,
  };
}

describe("filterExpenses", () => {
  it("returns all expenses when filters are empty", () => {
    const expenses = [makeExpense({ id: "1" }), makeExpense({ id: "2" })];
    expect(filterExpenses(expenses, EMPTY_FILTERS)).toEqual(expenses);
  });

  it("filters by category", () => {
    const expenses = [
      makeExpense({ id: "1", category: "Food" }),
      makeExpense({ id: "2", category: "Travel" }),
    ];
    expect(filterExpenses(expenses, { ...EMPTY_FILTERS, category: "Travel" })).toEqual([
      expenses[1],
    ]);
  });

  it("filters by date range", () => {
    const expenses = [
      makeExpense({ id: "1", date: "2026-01-01" }),
      makeExpense({ id: "2", date: "2026-02-01" }),
    ];
    expect(
      filterExpenses(expenses, { ...EMPTY_FILTERS, startDate: "2026-01-15" })
    ).toEqual([expenses[1]]);
  });

  it("filters by keyword in notes", () => {
    const expenses = [
      makeExpense({ id: "1", notes: "grocery shopping" }),
      makeExpense({ id: "2", notes: "movie night" }),
    ];
    expect(filterExpenses(expenses, { ...EMPTY_FILTERS, keyword: "movie" })).toEqual([
      expenses[1],
    ]);
  });
});
