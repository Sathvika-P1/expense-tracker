import { describe, expect, it } from "vitest";
import type { Expense } from "./expense";
import { filterExpensesByCategories } from "./categoryFilter";

const makeExpense = (overrides: Partial<Expense> = {}): Expense => ({
  id: "1",
  userId: "local-user",
  amount: 10,
  date: "2026-01-01",
  category: "Food",
  createdAt: Date.now(),
  ...overrides,
});

describe("filterExpensesByCategories", () => {
  it("returns only expenses matching the single selected category", () => {
    const food = makeExpense({ id: "1", category: "Food" });
    const transport = makeExpense({ id: "2", category: "Transport" });
    expect(filterExpensesByCategories([food, transport], ["Food"])).toEqual([food]);
  });

  it("returns expenses matching any of the selected categories", () => {
    const food = makeExpense({ id: "1", category: "Food" });
    const transport = makeExpense({ id: "2", category: "Transport" });
    const housing = makeExpense({ id: "3", category: "Housing" });
    expect(filterExpensesByCategories([food, transport, housing], ["Food", "Transport"])).toEqual([
      food,
      transport,
    ]);
  });

  it("returns the full list when no categories are selected", () => {
    const food = makeExpense({ id: "1", category: "Food" });
    const transport = makeExpense({ id: "2", category: "Transport" });
    expect(filterExpensesByCategories([food, transport], [])).toEqual([food, transport]);
  });
});
