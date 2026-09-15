import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ExpenseList } from "./ExpenseList";
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

describe("ExpenseList", () => {
  it("renders expenses in the given order", () => {
    render(
      <ExpenseList
        expenses={[makeExpense({ id: "2", category: "Travel" }), makeExpense({ id: "1" })]}
        hasActiveFilters={false}
        onAddExpenseClick={vi.fn()}
        onClearFilters={vi.fn()}
      />,
    );

    const rows = screen.getAllByRole("row");
    expect(rows[1]).toHaveTextContent("Travel");
    expect(rows[2]).toHaveTextContent("Food");
  });

  it("displays notes with the expense when present", () => {
    render(
      <ExpenseList
        expenses={[makeExpense({ notes: "Lunch with team" })]}
        hasActiveFilters={false}
        onAddExpenseClick={vi.fn()}
        onClearFilters={vi.fn()}
      />,
    );

    expect(screen.getByText("Lunch with team")).toBeInTheDocument();
  });

  it("displays date, amount, category, and description for each expense", () => {
    render(
      <ExpenseList
        expenses={[
          makeExpense({ date: "2026-01-01", amount: 12.5, category: "Food", notes: "Lunch" }),
        ]}
        hasActiveFilters={false}
        onAddExpenseClick={vi.fn()}
        onClearFilters={vi.fn()}
      />,
    );

    const row = screen.getAllByRole("row")[1];
    expect(row).toHaveTextContent("2026-01-01");
    expect(row).toHaveTextContent("12.50");
    expect(row).toHaveTextContent("Food");
    expect(row).toHaveTextContent("Lunch");
  });

  it("shows an empty-state message and no table when there are no expenses", () => {
    render(
      <ExpenseList
        expenses={[]}
        hasActiveFilters={false}
        onAddExpenseClick={vi.fn()}
        onClearFilters={vi.fn()}
      />,
    );

    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.getByText(/no expenses recorded yet/i)).toBeInTheDocument();
  });

  it("offers to clear filters instead of adding an expense when filters exclude all expenses", () => {
    const onClearFilters = vi.fn();
    render(
      <ExpenseList
        expenses={[]}
        hasActiveFilters={true}
        onAddExpenseClick={vi.fn()}
        onClearFilters={onClearFilters}
      />,
    );

    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.getByText(/no matching expenses found/i)).toBeInTheDocument();
    expect(screen.queryByText(/no expenses recorded yet/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /add.*expense/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /clear all filters/i }));
    expect(onClearFilters).toHaveBeenCalled();
  });

  it("shows a call-to-action to add a new expense when the list is empty", () => {
    const onAddExpenseClick = vi.fn();
    render(
      <ExpenseList
        expenses={[]}
        hasActiveFilters={false}
        onAddExpenseClick={onAddExpenseClick}
        onClearFilters={vi.fn()}
      />,
    );

    const cta = screen.getByRole("button", { name: /add.*expense/i });
    fireEvent.click(cta);

    expect(onAddExpenseClick).toHaveBeenCalled();
  });

  it("shows only the first page of expenses when there are more than fit on one page", () => {
    const many = Array.from({ length: 12 }, (_, i) =>
      makeExpense({ id: String(i), date: `2026-01-${String(i + 1).padStart(2, "0")}` }),
    );
    render(
      <ExpenseList
        expenses={many}
        hasActiveFilters={false}
        onAddExpenseClick={vi.fn()}
        onClearFilters={vi.fn()}
      />,
    );

    expect(screen.getAllByRole("row")).toHaveLength(11);
  });

  it("shows page navigation controls when there is more than one page", () => {
    const many = Array.from({ length: 12 }, (_, i) => makeExpense({ id: String(i) }));
    render(
      <ExpenseList
        expenses={many}
        hasActiveFilters={false}
        onAddExpenseClick={vi.fn()}
        onClearFilters={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: /next page/i })).toBeInTheDocument();
  });

  it("does not show page navigation controls when everything fits on one page", () => {
    render(
      <ExpenseList
        expenses={[makeExpense()]}
        hasActiveFilters={false}
        onAddExpenseClick={vi.fn()}
        onClearFilters={vi.fn()}
      />,
    );

    expect(screen.queryByRole("button", { name: /next page/i })).not.toBeInTheDocument();
  });

  it("shows the remaining expenses on page two after navigating", async () => {
    const many = Array.from({ length: 12 }, (_, i) =>
      makeExpense({ id: String(i), notes: `note-${i}` }),
    );
    render(
      <ExpenseList
        expenses={many}
        hasActiveFilters={false}
        onAddExpenseClick={vi.fn()}
        onClearFilters={vi.fn()}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: /next page/i }));

    expect(screen.getByText("note-11")).toBeInTheDocument();
    expect(screen.queryByText("note-0")).not.toBeInTheDocument();
  });

  it("resets to the first page when the expenses prop changes", async () => {
    const firstSet = Array.from({ length: 12 }, (_, i) =>
      makeExpense({ id: `a${i}`, notes: `first-${i}` }),
    );
    const { rerender } = render(
      <ExpenseList
        expenses={firstSet}
        hasActiveFilters={false}
        onAddExpenseClick={vi.fn()}
        onClearFilters={vi.fn()}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: /next page/i }));
    expect(screen.getByText(/page 2 of 2/i)).toBeInTheDocument();

    const secondSet = Array.from({ length: 12 }, (_, i) =>
      makeExpense({ id: `b${i}`, notes: `second-${i}` }),
    );
    rerender(
      <ExpenseList
        expenses={secondSet}
        hasActiveFilters={false}
        onAddExpenseClick={vi.fn()}
        onClearFilters={vi.fn()}
      />,
    );

    expect(screen.getByText(/page 1 of 2/i)).toBeInTheDocument();
    expect(screen.getByText("second-0")).toBeInTheDocument();
  });

  it("exposes the expense list as a table with labeled columns", () => {
    render(
      <ExpenseList
        expenses={[makeExpense()]}
        hasActiveFilters={false}
        onAddExpenseClick={vi.fn()}
        onClearFilters={vi.fn()}
      />,
    );

    expect(screen.getByRole("table", { name: /expenses/i })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /date/i })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /amount/i })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /category/i })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /description/i })).toBeInTheDocument();
  });
});
