import { describe, expect, it } from "vitest";
import { filterExpensesByKeyword } from "./searchExpenses";
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

describe("filterExpensesByKeyword", () => {
  it("returns only expenses whose notes contain the keyword, case-insensitively", () => {
    const lunch = makeExpense({ id: "1", notes: "Lunch with team" });
    const taxi = makeExpense({ id: "2", notes: "Taxi home" });
    expect(filterExpensesByKeyword([lunch, taxi], "LUNCH")).toEqual([lunch]);
  });

  it("returns the input array unchanged when the keyword is empty or whitespace", () => {
    const lunch = makeExpense({ id: "1", notes: "Lunch with team" });
    const taxi = makeExpense({ id: "2", notes: "Taxi home" });
    expect(filterExpensesByKeyword([lunch, taxi], "")).toEqual([lunch, taxi]);
    expect(filterExpensesByKeyword([lunch, taxi], "   ")).toEqual([lunch, taxi]);
  });

  it("does not match an expense with no notes against a non-empty keyword", () => {
    const noNotes = makeExpense({ id: "1", notes: undefined });
    expect(filterExpensesByKeyword([noNotes], "lunch")).toEqual([]);
  });
});
