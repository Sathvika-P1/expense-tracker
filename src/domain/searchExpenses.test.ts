import { describe, expect, it } from "vitest";
import { searchExpenses } from "./searchExpenses";
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

describe("searchExpenses", () => {
  it("returns expenses whose category or notes contain the term, case-insensitively", () => {
    const coffee = makeExpense({ category: "Food", notes: "Latte at Blue Bottle" });
    const travel = makeExpense({ id: "2", category: "Travel", notes: "Uber to airport" });
    expect(searchExpenses([coffee, travel], "LATTE")).toEqual([coffee]);
  });

  it("matches on category as well as notes", () => {
    const bills = makeExpense({ category: "Bills", notes: "Electric bill" });
    expect(searchExpenses([bills], "bills")).toEqual([bills]);
  });

  it("treats a missing notes field as empty rather than throwing", () => {
    const noNotes = makeExpense({ category: "Food", notes: undefined });
    expect(() => searchExpenses([noNotes], "food")).not.toThrow();
    expect(searchExpenses([noNotes], "food")).toEqual([noNotes]);
  });

  it("returns every expense when the term is empty or whitespace", () => {
    const all = [makeExpense(), makeExpense({ id: "2" })];
    expect(searchExpenses(all, "  ")).toEqual(all);
  });

  it("returns an empty array when nothing matches", () => {
    expect(searchExpenses([makeExpense({ category: "Food", notes: "Lunch" })], "parking")).toEqual([]);
  });
});
