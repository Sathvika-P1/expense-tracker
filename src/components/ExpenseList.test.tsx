import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ExpenseList } from "./ExpenseList";
import * as auditRepository from "../domain/auditRepository";
import type { Expense } from "../domain/expense";

const makeExpense = (overrides: Partial<Expense> = {}): Expense => ({
  id: "1",
  amount: 10,
  date: "2026-01-01",
  category: "Food",
  createdAt: Date.now(),
  status: "draft",
  ownerId: "current-user",
  ...overrides,
});

describe("ExpenseList", () => {
  it("renders expenses in the given order", () => {
    render(
      <ExpenseList
        expenses={[makeExpense({ id: "2", category: "Travel" }), makeExpense({ id: "1" })]}
        onEdit={vi.fn()}
      />,
    );

    const items = screen.getAllByRole("listitem");
    expect(items[0]).toHaveTextContent("Travel");
    expect(items[1]).toHaveTextContent("Food");
  });

  it("displays notes with the expense when present", () => {
    render(<ExpenseList expenses={[makeExpense({ notes: "Lunch with team" })]} onEdit={vi.fn()} />);

    expect(screen.getByText("Lunch with team")).toBeInTheDocument();
  });

  it.each(["submitted", "approved", "reimbursed"] as const)(
    "disables edit for status %s",
    (status) => {
      render(<ExpenseList expenses={[makeExpense({ status })]} onEdit={vi.fn()} />);
      expect(screen.getByRole("button", { name: /edit/i })).toBeDisabled();
    },
  );

  it.each(["draft", "rejected"] as const)("enables edit for status %s", (status) => {
    render(<ExpenseList expenses={[makeExpense({ status })]} onEdit={vi.fn()} />);
    expect(screen.getByRole("button", { name: /edit/i })).toBeEnabled();
  });

  it("lets a non-owner-restricted viewer open the edit history even for a submitted expense", async () => {
    const user = userEvent.setup();
    vi.spyOn(auditRepository, "loadAuditRecords").mockReturnValue([
      {
        id: "a1",
        expenseId: "1",
        editedAt: Date.parse("2026-01-02"),
        editorId: "current-user",
        before: { amount: 10, date: "2026-01-01", category: "Food", notes: undefined, receipt: undefined },
        after: { amount: 20, date: "2026-01-01", category: "Food", notes: undefined, receipt: undefined },
      },
    ]);

    render(<ExpenseList expenses={[makeExpense({ status: "submitted" })]} onEdit={vi.fn()} />);

    expect(screen.getByRole("button", { name: /edit/i })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: /view history/i }));

    expect(screen.getByText(/10 → 20/)).toBeInTheDocument();
  });
});
