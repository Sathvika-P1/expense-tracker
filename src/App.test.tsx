import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";
import * as expenseRepository from "./domain/expenseRepository";
import { saveExpense } from "./domain/expenseRepository";
import type { Expense } from "./domain/expense";

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("App", () => {
  it("renders expenses already present in localStorage at mount (AC7)", () => {
    saveExpense({
      id: "existing",
      userId: "local-user",
      amount: 5,
      date: "2026-01-01",
      category: "Bills",
      createdAt: Date.now(),
    });

    render(<App />);

    expect(screen.getAllByRole("row")[1]).toHaveTextContent("Bills");
  });

  it("shows a newly submitted expense at the top of the list without a reload (AC1)", async () => {
    saveExpense({
      id: "existing",
      userId: "local-user",
      amount: 5,
      date: "2026-01-01",
      category: "Bills",
      createdAt: Date.now(),
    });

    const user = userEvent.setup();
    render(<App />);

    await user.type(screen.getByLabelText(/amount/i), "20");
    await user.type(screen.getByLabelText(/date/i), "2026-02-01");
    await user.selectOptions(screen.getByLabelText(/category/i), "Travel");
    await user.click(screen.getByRole("button", { name: /add expense/i }));

    await waitFor(() => {
      const rows = screen.getAllByRole("row");
      expect(rows).toHaveLength(3);
      expect(rows[1]).toHaveTextContent("Travel");
    });
  });

  it("focuses the add-expense form when the empty-state call-to-action is clicked (AC5)", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Add an expense" }));

    expect(screen.getByLabelText(/amount/i)).toHaveFocus();
  });

  it("pre-fills the edit form when the user opens edit for their own expense (AC1)", async () => {
    saveExpense({
      id: "e1",
      userId: "local-user",
      amount: 20,
      date: "2026-01-01",
      category: "Travel",
      notes: "Trip",
      createdAt: 1,
      updatedAt: 1,
    });

    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: /edit/i }));

    expect(screen.getByLabelText("Amount")).toHaveValue("20");
  });

  it("denies access to the edit view for an expense owned by another user (AC5)", async () => {
    saveExpense({
      id: "e2",
      userId: "local-user",
      amount: 5,
      date: "2026-01-01",
      category: "Bills",
      createdAt: 1,
      updatedAt: 1,
    });

    const user = userEvent.setup();
    render(<App />);

    // The edit route is reached via a stale list row: the row was loaded while
    // owned by the current user, then ownership changed before the click.
    const reassigned: Expense = {
      id: "e2",
      userId: "other-user",
      amount: 5,
      date: "2026-01-01",
      category: "Bills",
      createdAt: 1,
      updatedAt: 1,
    };
    localStorage.setItem("expenses", JSON.stringify([reassigned]));

    await user.click(screen.getByRole("button", { name: /edit/i }));

    expect(screen.getByText("You can't edit this expense")).toBeInTheDocument();
    expect(screen.queryByLabelText("Amount")).not.toBeInTheDocument();
  });

  it("returns to the expense list without saving when the edit is cancelled (AC7, AC8)", async () => {
    saveExpense({
      id: "e1",
      userId: "local-user",
      amount: 20,
      date: "2026-01-01",
      category: "Travel",
      createdAt: 1,
      updatedAt: 1,
    });

    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: /edit/i }));
    await user.clear(screen.getByLabelText("Amount"));
    await user.type(screen.getByLabelText("Amount"), "999");
    await user.click(screen.getByRole("button", { name: /cancel/i }));

    expect(screen.getByRole("table", { name: /expenses/i })).toBeInTheDocument();
    expect(screen.getByText("20.00")).toBeInTheDocument();
  });

  it("redirects to the expense list after a save fails because the expense was deleted (AC11)", async () => {
    saveExpense({
      id: "e1",
      userId: "local-user",
      amount: 20,
      date: "2026-01-01",
      category: "Travel",
      createdAt: 1,
      updatedAt: 1,
    });
    vi.spyOn(expenseRepository, "updateExpense").mockReturnValue({
      ok: false,
      reason: "not_found",
    });

    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: /edit/i }));
    await user.click(screen.getByRole("button", { name: /save changes/i }));

    expect(screen.getByText("This expense no longer exists")).toBeInTheDocument();

    await waitFor(
      () => {
        expect(screen.getByRole("table", { name: /expenses/i })).toBeInTheDocument();
      },
      { timeout: 3000 },
    );
  });

  it("saves an edit and shows the updated values in the list afterward (AC2, AC3)", async () => {
    saveExpense({
      id: "e1",
      userId: "local-user",
      amount: 48.5,
      date: "2026-09-14",
      category: "Travel",
      notes: "Client lunch",
      createdAt: 1,
      updatedAt: 1,
    });

    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: /edit/i }));
    await user.clear(screen.getByLabelText("Notes"));
    await user.type(screen.getByLabelText("Notes"), "Rescheduled");
    await user.click(screen.getByRole("button", { name: /save changes/i }));

    expect(screen.getByRole("table", { name: /expenses/i })).toBeInTheDocument();
    expect(screen.getByText("Rescheduled")).toBeInTheDocument();
  });
});
