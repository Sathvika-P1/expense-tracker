import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
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

    expect(within(screen.getByRole("table")).getByText("Lunch with team")).toBeInTheDocument();
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

    expect(within(screen.getByRole("table")).getByText("note-11")).toBeInTheDocument();
    expect(within(screen.getByRole("table")).queryByText("note-0")).not.toBeInTheDocument();
  });

  it("exposes the expense list as a table with labeled columns", () => {
    render(<ExpenseList expenses={[makeExpense()]} onAddExpenseClick={vi.fn()} />);

    expect(screen.getByRole("table", { name: /expenses/i })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /date/i })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /amount/i })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /category/i })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /description/i })).toBeInTheDocument();
  });

  it("renders both a table and a card representation of each expense for responsive reflow", () => {
    render(<ExpenseList expenses={[makeExpense({ notes: "Lunch" })]} onAddExpenseClick={vi.fn()} />);

    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(document.querySelector(".expense-cards .expense-card")).not.toBeNull();
  });

  it("renders pagination controls with the touch-target class", () => {
    const many = Array.from({ length: 12 }, (_, i) => makeExpense({ id: String(i) }));
    render(<ExpenseList expenses={many} onAddExpenseClick={vi.fn()} />);

    expect(screen.getByRole("button", { name: /next page/i })).toHaveClass("btn-secondary");
  });

  it("declares a device-width viewport in index.html", () => {
    const html = readFileSync(resolve(__dirname, "../../index.html"), "utf8");
    expect(html).toMatch(/<meta name="viewport" content="width=device-width, initial-scale=1"/);
  });

  it("defines a container-query breakpoint that switches table to cards", () => {
    const css = readFileSync(resolve(__dirname, "ExpenseList.css"), "utf8");
    expect(css).toMatch(/@container\s+expense-list\s*\(max-width:\s*559px\)/);
    expect(css).toMatch(/container-type:\s*inline-size/);
  });
});
