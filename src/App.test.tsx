import { beforeEach, describe, expect, it } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";
import { saveExpense } from "./domain/expenseRepository";

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

    const addExpenseForm = screen.getByRole("form", { name: /add expense/i });
    await user.type(within(addExpenseForm).getByLabelText(/amount/i), "20");
    await user.type(within(addExpenseForm).getByLabelText("Date"), "2026-02-01");
    await user.selectOptions(within(addExpenseForm).getByLabelText("Category"), "Travel");
    await user.click(within(addExpenseForm).getByRole("button", { name: /add expense/i }));

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

  it("resets all filter inputs to their default values when Clear all filters is activated (AC1)", async () => {
    const user = userEvent.setup();
    render(<App />);
    const filtersForm = screen.getByRole("search", { name: /filter expenses/i });

    await user.type(within(filtersForm).getByLabelText(/start date/i), "2026-01-01");
    await user.type(within(filtersForm).getByLabelText(/end date/i), "2026-02-01");
    await user.selectOptions(within(filtersForm).getByLabelText(/category/i), "Travel");
    await user.type(within(filtersForm).getByLabelText(/keyword/i), "lunch");

    await user.click(within(filtersForm).getByRole("button", { name: /clear all filters/i }));

    expect(within(filtersForm).getByLabelText(/start date/i)).toHaveValue("");
    expect(within(filtersForm).getByLabelText(/end date/i)).toHaveValue("");
    expect(within(filtersForm).getByLabelText(/category/i)).toHaveValue("");
    expect(within(filtersForm).getByLabelText(/keyword/i)).toHaveValue("");
  });

  it("shows the full unfiltered expense list after Clear all filters is activated (AC2)", async () => {
    saveExpense({
      id: "1",
      userId: "local-user",
      amount: 5,
      date: "2026-01-01",
      category: "Bills",
      createdAt: Date.now(),
    });
    saveExpense({
      id: "2",
      userId: "local-user",
      amount: 8,
      date: "2026-02-01",
      category: "Travel",
      createdAt: Date.now(),
    });

    const user = userEvent.setup();
    render(<App />);
    const filtersForm = screen.getByRole("search", { name: /filter expenses/i });

    await user.selectOptions(within(filtersForm).getByLabelText(/category/i), "Travel");
    expect(screen.getAllByRole("row")).toHaveLength(2);

    await user.click(within(filtersForm).getByRole("button", { name: /clear all filters/i }));

    expect(screen.getAllByRole("row")).toHaveLength(3);
  });
});
