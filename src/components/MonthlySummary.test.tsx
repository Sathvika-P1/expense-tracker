import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MonthlySummary } from "./MonthlySummary";
import { SUMMARY_LOAD_ERROR } from "../domain/expenseRepository";
import type { Expense } from "../domain/expense";

const makeExpense = (overrides: Partial<Expense> = {}): Expense => ({
  id: "1",
  userId: "local-user",
  amount: 10,
  date: "2026-01-01",
  category: "Food",
  createdAt: Date.now(),
  ...overrides,
});

describe("MonthlySummary", () => {
  it("shows an empty-state message when there is no spending data", () => {
    render(<MonthlySummary result={{ ok: true, expenses: [] }} />);
    const region = within(screen.getByRole("region", { name: /monthly spending/i }));
    expect(region.getByText("No spending data available yet.")).toBeInTheDocument();
  });

  it("lists monthly totals when spending data exists", () => {
    render(<MonthlySummary result={{ ok: true, expenses: [makeExpense({ date: "2026-01-05", amount: 25 })] }} />);
    const region = within(screen.getByRole("region", { name: /monthly spending/i }));
    expect(region.getByText("January 2026")).toBeInTheDocument();
    expect(region.getByText("25.00")).toBeInTheDocument();
  });

  it("shows an error message when the load result is not ok", () => {
    render(<MonthlySummary result={{ ok: false, message: SUMMARY_LOAD_ERROR }} />);
    expect(screen.getByRole("alert")).toHaveTextContent(SUMMARY_LOAD_ERROR);
  });
});
