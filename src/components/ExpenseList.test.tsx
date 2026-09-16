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
        onAddExpenseClick={vi.fn()}
      />,
    );

    const rows = screen.getAllByRole("row");
    expect(rows[1]).toHaveTextContent("Travel");
    expect(rows[2]).toHaveTextContent("Food");
  });

  it("displays notes with the expense when present", () => {
    render(<ExpenseList expenses={[makeExpense({ notes: "Lunch with team" })]} onAddExpenseClick={vi.fn()} />);

    expect(screen.getByText("Lunch with team")).toBeInTheDocument();
  });

  it("displays date, amount, category, and description for each expense", () => {
    render(
      <ExpenseList
        expenses={[
          makeExpense({ date: "2026-01-01", amount: 12.5, category: "Food", notes: "Lunch" }),
        ]}
        onAddExpenseClick={vi.fn()}
      />,
    );

    const row = screen.getAllByRole("row")[1];
    expect(row).toHaveTextContent("2026-01-01");
    expect(row).toHaveTextContent("12.50");
    expect(row).toHaveTextContent("Food");
    expect(row).toHaveTextContent("Lunch");
  });

  it("shows an empty-state message and no table when there are no expenses", () => {
    render(<ExpenseList expenses={[]} onAddExpenseClick={vi.fn()} />);

    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.getByText(/no expenses recorded yet/i)).toBeInTheDocument();
  });

  it("shows a call-to-action to add a new expense when the list is empty", () => {
    const onAddExpenseClick = vi.fn();
    render(<ExpenseList expenses={[]} onAddExpenseClick={onAddExpenseClick} />);

    const cta = screen.getByRole("button", { name: /add.*expense/i });
    fireEvent.click(cta);

    expect(onAddExpenseClick).toHaveBeenCalled();
  });

  it("shows only the first page of expenses when there are more than fit on one page", () => {
    const many = Array.from({ length: 12 }, (_, i) =>
      makeExpense({ id: String(i), date: `2026-01-${String(i + 1).padStart(2, "0")}` }),
    );
    render(<ExpenseList expenses={many} onAddExpenseClick={vi.fn()} />);

    expect(screen.getAllByRole("row")).toHaveLength(11);
  });

  it("shows page navigation controls when there is more than one page", () => {
    const many = Array.from({ length: 12 }, (_, i) => makeExpense({ id: String(i) }));
    render(<ExpenseList expenses={many} onAddExpenseClick={vi.fn()} />);

    expect(screen.getByRole("button", { name: /next page/i })).toBeInTheDocument();
  });

  it("does not show page navigation controls when everything fits on one page", () => {
    render(<ExpenseList expenses={[makeExpense()]} onAddExpenseClick={vi.fn()} />);

    expect(screen.queryByRole("button", { name: /next page/i })).not.toBeInTheDocument();
  });

  it("shows the remaining expenses on page two after navigating", async () => {
    const many = Array.from({ length: 12 }, (_, i) =>
      makeExpense({ id: String(i), notes: `note-${i}` }),
    );
    render(<ExpenseList expenses={many} onAddExpenseClick={vi.fn()} />);

    await userEvent.click(screen.getByRole("button", { name: /next page/i }));

    expect(screen.getByText("note-11")).toBeInTheDocument();
    expect(screen.queryByText("note-0")).not.toBeInTheDocument();
  });

  it("shows the first page again after navigating back with Previous", async () => {
    const many = Array.from({ length: 12 }, (_, i) =>
      makeExpense({ id: String(i), notes: `note-${i}` }),
    );
    render(<ExpenseList expenses={many} onAddExpenseClick={vi.fn()} />);

    await userEvent.click(screen.getByRole("button", { name: /next page/i }));
    await userEvent.click(screen.getByRole("button", { name: /previous page/i }));

    expect(screen.getByText("note-0")).toBeInTheDocument();
    expect(screen.queryByText("note-11")).not.toBeInTheDocument();
  });

  it("shows pagination based on the currently rendered (filtered) result set, not the unfiltered total", () => {
    const all = Array.from({ length: 25 }, (_, i) => makeExpense({ id: String(i) }));
    const { rerender } = render(
      <ExpenseList expenses={all} onAddExpenseClick={vi.fn()} filterKey="all" />,
    );

    expect(
      screen.getByRole("navigation", { name: /pagination/i }),
    ).toHaveTextContent("Page 1 of 3");

    rerender(
      <ExpenseList
        expenses={all.slice(0, 12)}
        onAddExpenseClick={vi.fn()}
        filterKey="category:Food"
      />,
    );

    expect(
      screen.getByRole("navigation", { name: /pagination/i }),
    ).toHaveTextContent("Page 1 of 2");
  });

  it("resets to the first page when the filter changes while on a later page", async () => {
    const wide = Array.from({ length: 25 }, (_, i) => makeExpense({ id: String(i) }));
    const { rerender } = render(
      <ExpenseList expenses={wide} onAddExpenseClick={vi.fn()} filterKey="all" />,
    );

    await userEvent.click(screen.getByRole("button", { name: /next page/i }));
    expect(
      screen.getByRole("navigation", { name: /pagination/i }),
    ).toHaveTextContent("Page 2 of 3");

    const narrow = Array.from({ length: 12 }, (_, i) => makeExpense({ id: String(i) }));
    rerender(
      <ExpenseList expenses={narrow} onAddExpenseClick={vi.fn()} filterKey="category:Food" />,
    );

    expect(
      screen.getByRole("navigation", { name: /pagination/i }),
    ).toHaveTextContent("Page 1 of 2");
  });

  it("resets to the first page when the filter key changes even if the result count stays the same", async () => {
    const setOne = Array.from({ length: 25 }, (_, i) => makeExpense({ id: `a${i}` }));
    const { rerender } = render(
      <ExpenseList expenses={setOne} onAddExpenseClick={vi.fn()} filterKey="category:Food" />,
    );

    await userEvent.click(screen.getByRole("button", { name: /next page/i }));
    expect(
      screen.getByRole("navigation", { name: /pagination/i }),
    ).toHaveTextContent("Page 2 of 3");

    const setTwo = Array.from({ length: 25 }, (_, i) => makeExpense({ id: `b${i}` }));
    rerender(
      <ExpenseList expenses={setTwo} onAddExpenseClick={vi.fn()} filterKey="category:Travel" />,
    );

    expect(
      screen.getByRole("navigation", { name: /pagination/i }),
    ).toHaveTextContent("Page 1 of 3");
  });

  it("exposes the expense list as a table with labeled columns", () => {
    render(<ExpenseList expenses={[makeExpense()]} onAddExpenseClick={vi.fn()} />);

    expect(screen.getByRole("table", { name: /expenses/i })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /date/i })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /amount/i })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /category/i })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /description/i })).toBeInTheDocument();
  });
});
