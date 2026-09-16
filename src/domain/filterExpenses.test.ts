import { describe, expect, it } from "vitest";
import { filterExpenses } from "./filterExpenses";
import type { Expense } from "./expense";

const makeExpense = (overrides: Partial<Expense> = {}): Expense => ({
  id: "1",
  userId: "local-user",
  amount: 10,
  date: "2026-01-01",
  category: "Food",
  createdAt: Date.now(),
  ...overrides,
});

describe("filterExpenses", () => {
  it("returns only expenses matching date range, category, and keyword simultaneously (AC1)", () => {
    const expenses = [
      makeExpense({ id: "1", date: "2026-01-15", category: "Food", notes: "Lunch with team" }),
      makeExpense({ id: "2", date: "2026-01-15", category: "Travel", notes: "Lunch with team" }),
      makeExpense({ id: "3", date: "2026-03-01", category: "Food", notes: "Lunch with team" }),
      makeExpense({ id: "4", date: "2026-01-15", category: "Food", notes: "Taxi ride" }),
    ];

    const result = filterExpenses(expenses, {
      startDate: "2026-01-01",
      endDate: "2026-01-31",
      category: "Food",
      keyword: "lunch",
    });

    expect(result.map((e) => e.id)).toEqual(["1"]);
  });

  it("returns all expenses when no criteria are active", () => {
    const expenses = [makeExpense({ id: "1" }), makeExpense({ id: "2" })];

    expect(filterExpenses(expenses, {}).map((e) => e.id)).toEqual(["1", "2"]);
  });

  it("returns an empty list when the combination matches nothing (AC4)", () => {
    const expenses = [makeExpense({ id: "1", category: "Food", notes: "Lunch" })];

    const result = filterExpenses(expenses, { category: "Travel" });

    expect(result).toEqual([]);
  });

  it("matches keyword case-insensitively as a substring of notes", () => {
    const expenses = [makeExpense({ id: "1", notes: "Taxi Ride" })];

    expect(filterExpenses(expenses, { keyword: "taxi" }).map((e) => e.id)).toEqual(["1"]);
  });
});
