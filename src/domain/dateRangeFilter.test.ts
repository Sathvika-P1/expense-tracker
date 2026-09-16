import { describe, expect, it } from "vitest";
import { filterExpensesByDateRange, validateDateRange } from "./dateRangeFilter";
import type { Expense } from "./expense";

function makeExpense(overrides: Partial<Expense>): Expense {
  return {
    id: "1",
    userId: "user-1",
    amount: 10,
    date: "2026-01-01",
    category: "Food",
    createdAt: 0,
    ...overrides,
  };
}

describe("filterExpensesByDateRange", () => {
  it("excludes expenses before the start date", () => {
    const expenses = [
      makeExpense({ id: "a", date: "2026-01-01" }),
      makeExpense({ id: "b", date: "2026-01-10" }),
    ];
    expect(filterExpensesByDateRange(expenses, "2026-01-05", "").map((e) => e.id)).toEqual(["b"]);
  });

  it("excludes expenses after the end date", () => {
    const expenses = [
      makeExpense({ id: "a", date: "2026-01-01" }),
      makeExpense({ id: "b", date: "2026-01-10" }),
    ];
    expect(filterExpensesByDateRange(expenses, "", "2026-01-05").map((e) => e.id)).toEqual(["a"]);
  });

  it("includes expenses on the boundary dates", () => {
    const expenses = [
      makeExpense({ id: "a", date: "2026-01-01" }),
      makeExpense({ id: "b", date: "2026-01-15" }),
      makeExpense({ id: "c", date: "2026-02-01" }),
    ];
    expect(
      filterExpensesByDateRange(expenses, "2026-01-01", "2026-01-15").map((e) => e.id),
    ).toEqual(["a", "b"]);
  });

  it("filters on the end date alone once the start bound is cleared, even though it previously excluded an earlier expense", () => {
    const expenses = [
      makeExpense({ id: "a", date: "2026-01-01" }),
      makeExpense({ id: "b", date: "2026-01-10" }),
      makeExpense({ id: "c", date: "2026-01-20" }),
    ];
    // With both bounds set, "a" would have been excluded by the start bound.
    expect(
      filterExpensesByDateRange(expenses, "2026-01-05", "2026-01-15").map((e) => e.id),
    ).toEqual(["b"]);
    // Clearing the start bound reintroduces "a" using only the end bound.
    expect(
      filterExpensesByDateRange(expenses, "", "2026-01-15").map((e) => e.id),
    ).toEqual(["a", "b"]);
  });
});

describe("validateDateRange", () => {
  it("flags an inverted range", () => {
    expect(validateDateRange("2026-02-01", "2026-01-01").range).toMatch(/on or after/i);
  });

  it("flags an unparseable start date distinctly from a range error", () => {
    const errors = validateDateRange("not-a-date", "");
    expect(errors.start).toMatch(/valid date/i);
    expect(errors.range).toBeUndefined();
  });

  it("returns no errors for a valid range or empty fields", () => {
    expect(validateDateRange("", "")).toEqual({});
    expect(validateDateRange("2026-01-01", "2026-01-10")).toEqual({});
  });
});
