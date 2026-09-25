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
  it("renders expenses in the given order (AC9)", () => {
    render(
      <ExpenseList
        expenses={[makeExpense({ id: "2", category: "Travel" }), makeExpense({ id: "1" })]}
        onAddExpenseClick={vi.fn()} onEditClick={vi.fn()}
      />,
    );

    const rows = screen.getAllByRole("listitem");
    expect(rows[0]).toHaveTextContent("Travel");
    expect(rows[1]).toHaveTextContent("Food");
  });

  it("displays notes with the expense when present (AC11)", () => {
    render(
      <ExpenseList
        expenses={[makeExpense({ notes: "Lunch with team" })]}
        onAddExpenseClick={vi.fn()}
        onEditClick={vi.fn()}
      />,
    );

    expect(screen.getByText("Lunch with team")).toBeInTheDocument();
  });

  it("displays date, amount, category, and description for each expense (AC2, AC10)", () => {
    render(
      <ExpenseList
        expenses={[
          makeExpense({ date: "2026-01-01", amount: 12.5, category: "Food", notes: "Lunch" }),
        ]}
        onAddExpenseClick={vi.fn()} onEditClick={vi.fn()}
      />,
    );

    const row = screen.getAllByRole("listitem")[0];
    expect(row).toHaveTextContent("Jan 1, 2026");
    expect(row).toHaveTextContent("$12.50");
    expect(row).toHaveTextContent("Food");
    expect(row).toHaveTextContent("Lunch");
  });

  it("shows an empty-state message and no list when there are no expenses (AC7)", () => {
    render(<ExpenseList expenses={[]} onAddExpenseClick={vi.fn()} onEditClick={vi.fn()} />);

    expect(screen.queryByRole("list")).not.toBeInTheDocument();
    expect(screen.getByText(/no expenses yet/i)).toBeInTheDocument();
  });

  it("shows a call-to-action to add a new expense when the list is empty (AC8)", () => {
    const onAddExpenseClick = vi.fn();
    render(<ExpenseList expenses={[]} onAddExpenseClick={onAddExpenseClick} onEditClick={vi.fn()} />);

    const cta = screen.getByRole("button", { name: /add.*expense/i });
    fireEvent.click(cta);

    expect(onAddExpenseClick).toHaveBeenCalled();
  });

  it("shows only the first page of expenses when there are more than fit on one page", () => {
    const many = Array.from({ length: 12 }, (_, i) =>
      makeExpense({ id: String(i), date: `2026-01-${String(i + 1).padStart(2, "0")}` }),
    );
    render(<ExpenseList expenses={many} onAddExpenseClick={vi.fn()} onEditClick={vi.fn()} />);

    expect(screen.getAllByRole("listitem")).toHaveLength(10);
  });

  it("shows page navigation controls when there is more than one page", () => {
    const many = Array.from({ length: 12 }, (_, i) => makeExpense({ id: String(i) }));
    render(<ExpenseList expenses={many} onAddExpenseClick={vi.fn()} onEditClick={vi.fn()} />);

    expect(screen.getByRole("button", { name: /next page/i })).toBeInTheDocument();
  });

  it("does not show page navigation controls when everything fits on one page", () => {
    render(<ExpenseList expenses={[makeExpense()]} onAddExpenseClick={vi.fn()} onEditClick={vi.fn()} />);

    expect(screen.queryByRole("button", { name: /next page/i })).not.toBeInTheDocument();
  });

  it("shows the remaining expenses on page two after navigating", async () => {
    const many = Array.from({ length: 12 }, (_, i) =>
      makeExpense({ id: String(i), notes: `note-${i}` }),
    );
    render(<ExpenseList expenses={many} onAddExpenseClick={vi.fn()} onEditClick={vi.fn()} />);

    await userEvent.click(screen.getByRole("button", { name: /next page/i }));

    expect(screen.getByText("note-11")).toBeInTheDocument();
    expect(screen.queryByText("note-0")).not.toBeInTheDocument();
  });

  it("calls onEditClick with the expense when its Edit button is clicked", () => {
    const onEditClick = vi.fn();
    const expense = makeExpense();
    render(<ExpenseList expenses={[expense]} onAddExpenseClick={vi.fn()} onEditClick={onEditClick} />);

    fireEvent.click(screen.getByRole("button", { name: /edit/i }));

    expect(onEditClick).toHaveBeenCalledWith(expense);
  });
});
