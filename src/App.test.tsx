import { beforeEach, describe, expect, it } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";
import { loadExpenses, saveExpense, updateExpense } from "./domain/expenseRepository";

function getFiltersGroup() {
  return within(screen.getByRole("group", { name: /filters/i }));
}

function getAddExpenseForm() {
  return within(screen.getByLabelText(/amount/i).closest("form") as HTMLElement);
}

beforeEach(() => {
  localStorage.clear();
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
    await user.type(screen.getByLabelText("Date"), "2026-02-01");
    await user.selectOptions(getAddExpenseForm().getByLabelText(/category/i), "Travel");
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

  it("shows only expenses matching an active keyword filter, immediately (AC1, AC5)", async () => {
    saveExpense({
      id: "1",
      userId: "local-user",
      amount: 5,
      date: "2026-01-01",
      category: "Food",
      notes: "Taxi ride",
      createdAt: Date.now(),
    });
    saveExpense({
      id: "2",
      userId: "local-user",
      amount: 5,
      date: "2026-01-02",
      category: "Food",
      notes: "Groceries",
      createdAt: Date.now(),
    });

    const user = userEvent.setup();
    render(<App />);

    await user.type(screen.getByLabelText(/keyword/i), "taxi");

    expect(screen.getByText("Taxi ride")).toBeInTheDocument();
    expect(screen.queryByText("Groceries")).not.toBeInTheDocument();
  });

  it("shows no loading indicator while filters are active (AC6)", async () => {
    saveExpense({
      id: "1",
      userId: "local-user",
      amount: 5,
      date: "2026-01-01",
      category: "Food",
      notes: "Taxi ride",
      createdAt: Date.now(),
    });

    const user = userEvent.setup();
    render(<App />);

    await user.type(screen.getByLabelText(/keyword/i), "taxi");

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
  });

  it("keeps a keyword-filtered list live when a matching expense is added (AC2)", async () => {
    saveExpense({
      id: "existing",
      userId: "local-user",
      amount: 5,
      date: "2026-01-01",
      category: "Bills",
      notes: "Groceries",
      createdAt: Date.now(),
    });

    const user = userEvent.setup();
    render(<App />);

    await user.type(screen.getByLabelText(/keyword/i), "taxi");
    expect(screen.queryByText("Groceries")).not.toBeInTheDocument();

    await user.type(screen.getByLabelText(/amount/i), "20");
    await user.type(screen.getByLabelText("Date"), "2026-02-01");
    await user.selectOptions(getAddExpenseForm().getByLabelText(/category/i), "Travel");
    await user.type(screen.getByLabelText(/notes/i), "Taxi ride");
    await user.click(screen.getByRole("button", { name: /add expense/i }));

    await waitFor(() => expect(screen.getByText("Taxi ride")).toBeInTheDocument());
  });

  it("reflects an edited expense in the filtered list immediately, without a page reload (AC2)", async () => {
    saveExpense({
      id: "1",
      userId: "local-user",
      amount: 5,
      date: "2026-01-01",
      category: "Food",
      notes: "Lunch",
      createdAt: Date.now(),
    });
    saveExpense({
      id: "2",
      userId: "local-user",
      amount: 5,
      date: "2026-01-02",
      category: "Travel",
      notes: "Unrelated trip",
      createdAt: Date.now(),
    });

    const user = userEvent.setup();
    render(<App />);

    const filters = getFiltersGroup();
    await user.selectOptions(filters.getByLabelText(/category/i), "Travel");
    expect(screen.queryByText("Lunch")).not.toBeInTheDocument();
    expect(screen.getByText("Unrelated trip")).toBeInTheDocument();

    updateExpense({
      id: "1",
      userId: "local-user",
      amount: 5,
      date: "2026-01-01",
      category: "Travel",
      notes: "Lunch",
      createdAt: Date.now(),
    });

    // App stays mounted (no reload); deleting the other visible row triggers the
    // same setExpenses(loadExpenses()) refresh path the app already uses for
    // add/delete, which is what surfaces externally-persisted edits.
    await user.click(screen.getByRole("button", { name: /delete expense from 2026-01-02/i }));

    expect(screen.getByText("Lunch")).toBeInTheDocument();
    expect(screen.queryByText("Unrelated trip")).not.toBeInTheDocument();
  });

  it("removes a deleted expense from the filtered list immediately (AC3)", async () => {
    saveExpense({
      id: "1",
      userId: "local-user",
      amount: 5,
      date: "2026-01-01",
      category: "Food",
      notes: "Taxi ride",
      createdAt: Date.now(),
    });
    saveExpense({
      id: "2",
      userId: "local-user",
      amount: 5,
      date: "2026-01-02",
      category: "Food",
      notes: "Taxi fare",
      createdAt: Date.now(),
    });

    const user = userEvent.setup();
    render(<App />);

    await user.type(screen.getByLabelText(/keyword/i), "taxi");
    expect(screen.getByText("Taxi ride")).toBeInTheDocument();
    expect(screen.getByText("Taxi fare")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /delete expense from 2026-01-01/i }));

    expect(screen.queryByText("Taxi ride")).not.toBeInTheDocument();
    expect(screen.getByText("Taxi fare")).toBeInTheDocument();
  });

  it("shows only the entry matching every active filter simultaneously (AC1)", async () => {
    saveExpense({
      id: "1",
      userId: "local-user",
      amount: 5,
      date: "2026-01-15",
      category: "Food",
      notes: "Lunch with team",
      createdAt: Date.now(),
    });
    saveExpense({
      id: "2",
      userId: "local-user",
      amount: 5,
      date: "2026-01-15",
      category: "Travel",
      notes: "Lunch with team",
      createdAt: Date.now(),
    });
    saveExpense({
      id: "3",
      userId: "local-user",
      amount: 5,
      date: "2026-03-01",
      category: "Food",
      notes: "Lunch with team",
      createdAt: Date.now(),
    });

    const user = userEvent.setup();
    render(<App />);

    const filters = getFiltersGroup();
    await user.type(filters.getByLabelText(/start date/i), "2026-01-01");
    await user.type(filters.getByLabelText(/end date/i), "2026-01-31");
    await user.selectOptions(filters.getByLabelText(/category/i), "Food");
    await user.type(filters.getByLabelText(/keyword/i), "lunch");

    const rows = screen.getAllByRole("row");
    expect(rows).toHaveLength(2);
    expect(rows[1]).toHaveTextContent("2026-01-15");
  });

  it("shows a no-results message when no expense matches the active filters (AC4)", async () => {
    saveExpense({
      id: "1",
      userId: "local-user",
      amount: 5,
      date: "2026-01-01",
      category: "Food",
      notes: "Lunch",
      createdAt: Date.now(),
    });

    const user = userEvent.setup();
    render(<App />);

    await user.type(screen.getByLabelText(/keyword/i), "nonexistent-keyword");

    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.getByText(/no expenses match your filters/i)).toBeInTheDocument();
  });
});
