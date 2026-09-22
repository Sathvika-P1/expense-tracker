import { describe, expect, it } from "vitest";
import { groupByMonth, isValidDate } from "./monthlySummary";
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

describe("groupByMonth", () => {
  it("totals amounts within the same month", () => {
    const expenses = [
      makeExpense({ date: "2026-01-05", amount: 10 }),
      makeExpense({ date: "2026-01-20", amount: 15 }),
    ];
    expect(groupByMonth(expenses)).toEqual([{ key: "2026-01", label: "January 2026", total: 25 }]);
  });

  it("skips expenses with a non-numeric amount instead of corrupting the month total", () => {
    const expenses = [
      makeExpense({ date: "2026-01-05", amount: 10 }),
      { ...makeExpense({ date: "2026-01-06" }), amount: "not-a-number" as unknown as number },
    ];
    expect(groupByMonth(expenses)).toEqual([{ key: "2026-01", label: "January 2026", total: 10 }]);
  });

  it("omits months with no recorded expenses", () => {
    const expenses = [makeExpense({ date: "2026-01-05" })];
    const keys = groupByMonth(expenses).map((m) => m.key);
    expect(keys).not.toContain("2026-02");
  });

  it("orders months descending by most recent first", () => {
    const expenses = [
      makeExpense({ date: "2026-01-05" }),
      makeExpense({ date: "2026-03-10" }),
      makeExpense({ date: "2026-02-01" }),
    ];
    expect(groupByMonth(expenses).map((m) => m.key)).toEqual(["2026-03", "2026-02", "2026-01"]);
  });

  it("lists the same month in different years as separate entries", () => {
    const expenses = [
      makeExpense({ date: "2023-01-10", amount: 5 }),
      makeExpense({ date: "2024-01-15", amount: 7 }),
    ];
    expect(groupByMonth(expenses)).toEqual([
      { key: "2024-01", label: "January 2024", total: 7 },
      { key: "2023-01", label: "January 2023", total: 5 },
    ]);
  });
});

describe("isValidDate", () => {
  it("accepts a well-formed calendar date", () => {
    expect(isValidDate("2026-01-05")).toBe(true);
  });

  it.each(["", "not-a-date", "2026-02-31", undefined, null])(
    "rejects invalid date value (%s)",
    (value) => {
      expect(isValidDate(value)).toBe(false);
    },
  );
});
