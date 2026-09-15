import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ExpenseList } from "./ExpenseList";
import type { Expense } from "../domain/expense";

const makeExpense = (overrides: Partial<Expense> = {}): Expense => ({
  id: "1",
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
        onDelete={vi.fn()}
      />,
    );

    const items = screen.getAllByRole("listitem");
    expect(items[0]).toHaveTextContent("Travel");
    expect(items[1]).toHaveTextContent("Food");
  });

  it("displays notes with the expense when present", () => {
    render(<ExpenseList expenses={[makeExpense({ notes: "Lunch with team" })]} onDelete={vi.fn()} />);

    expect(screen.getByText("Lunch with team")).toBeInTheDocument();
  });

  it("shows a confirmation dialog with explicit Confirm and Cancel actions when Delete is clicked", async () => {
    const user = userEvent.setup();
    render(<ExpenseList expenses={[makeExpense()]} onDelete={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /delete/i }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /confirm/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
  });

  it("does not call onDelete when Cancel is selected", async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    render(<ExpenseList expenses={[makeExpense()]} onDelete={onDelete} />);

    await user.click(screen.getByRole("button", { name: /delete/i }));
    await user.click(screen.getByRole("button", { name: /cancel/i }));

    expect(onDelete).not.toHaveBeenCalled();
  });

  it("calls onDelete with the expense id when Confirm is selected", async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    render(<ExpenseList expenses={[makeExpense({ id: "42" })]} onDelete={onDelete} />);

    await user.click(screen.getByRole("button", { name: /delete/i }));
    await user.click(screen.getByRole("button", { name: /confirm/i }));

    expect(onDelete).toHaveBeenCalledWith("42");
  });

  it("returns focus to the Delete button that triggered the dialog after Cancel", async () => {
    const user = userEvent.setup();
    render(<ExpenseList expenses={[makeExpense()]} onDelete={vi.fn()} />);

    const deleteButton = screen.getByRole("button", { name: /delete/i });
    await user.click(deleteButton);
    await user.click(screen.getByRole("button", { name: /cancel/i }));

    expect(deleteButton).toHaveFocus();
  });

  it("returns focus to the Delete button that triggered the dialog after Confirm", async () => {
    const user = userEvent.setup();
    render(<ExpenseList expenses={[makeExpense()]} onDelete={vi.fn()} />);

    const deleteButton = screen.getByRole("button", { name: /delete/i });
    await user.click(deleteButton);
    await user.click(screen.getByRole("button", { name: /confirm/i }));

    expect(deleteButton).toHaveFocus();
  });
});
