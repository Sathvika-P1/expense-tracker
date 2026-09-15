import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { ExpenseList } from "./ExpenseList";
import type { Expense } from "../domain/expense";

function ExpenseListHarness({ initialExpenses }: { initialExpenses: Expense[] }) {
  const [expenses, setExpenses] = useState(initialExpenses);
  return (
    <ExpenseList
      expenses={expenses}
      onDelete={(id) => setExpenses((current) => current.filter((expense) => expense.id !== id))}
    />
  );
}

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

  it("moves focus to the next remaining Delete button when the deleted expense's own button unmounts", async () => {
    const user = userEvent.setup();
    const expenses = [makeExpense({ id: "1", category: "Food" }), makeExpense({ id: "2", category: "Travel" })];
    render(<ExpenseListHarness initialExpenses={expenses} />);

    const deleteButtons = screen.getAllByRole("button", { name: /delete/i });
    await user.click(deleteButtons[0]);
    await user.click(screen.getByRole("button", { name: /confirm/i }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /delete/i })).toHaveFocus();
    });
  });

  it("falls back to focusing the labelled container when no Delete buttons remain", async () => {
    const user = userEvent.setup();
    const expenses = [makeExpense({ id: "1", category: "Food" })];
    render(<ExpenseListHarness initialExpenses={expenses} />);

    await user.click(screen.getByRole("button", { name: /delete/i }));
    await user.click(screen.getByRole("button", { name: /confirm/i }));

    await waitFor(() => {
      expect(screen.getByRole("region", { name: /expense list/i })).toHaveFocus();
    });
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
