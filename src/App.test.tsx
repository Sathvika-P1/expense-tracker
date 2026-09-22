import { beforeEach, describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
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

    await user.type(screen.getByLabelText(/amount/i), "20");
    await user.type(screen.getByLabelText("Date"), "2026-02-01");
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

  it("keeps the full list visible while the date range is inverted (ET-STORY-014 AC4)", async () => {
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
      amount: 5,
      date: "2026-02-01",
      category: "Bills",
      createdAt: Date.now(),
    });
    const user = userEvent.setup();
    render(<App />);

    await user.type(screen.getByLabelText(/start date/i), "2026-02-01");
    await user.type(screen.getByLabelText(/end date/i), "2026-01-01");

    expect(screen.getAllByRole("row")).toHaveLength(3);
  });

  it("restores the full list when both date fields are cleared (ET-STORY-014 AC5)", async () => {
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
      amount: 5,
      date: "2026-02-01",
      category: "Bills",
      createdAt: Date.now(),
    });
    const user = userEvent.setup();
    render(<App />);

    await user.type(screen.getByLabelText(/start date/i), "2026-01-15");
    await user.type(screen.getByLabelText(/end date/i), "2026-01-20");
    await user.clear(screen.getByLabelText(/start date/i));
    await user.clear(screen.getByLabelText(/end date/i));

    expect(screen.getAllByRole("row")).toHaveLength(3);
  });

  it("filters using only the remaining field after clearing one of two valid dates (ET-STORY-014 AC10)", async () => {
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
      amount: 5,
      date: "2026-02-01",
      category: "Bills",
      createdAt: Date.now(),
    });
    saveExpense({
      id: "3",
      userId: "local-user",
      amount: 5,
      date: "2026-04-01",
      category: "Bills",
      createdAt: Date.now(),
    });
    const user = userEvent.setup();
    render(<App />);

    await user.type(screen.getByLabelText(/start date/i), "2026-01-15");
    await user.type(screen.getByLabelText(/end date/i), "2026-03-01");
    await user.clear(screen.getByLabelText(/start date/i));

    const rows = screen.getAllByRole("row");
    expect(rows).toHaveLength(3);
    expect(screen.getByText("2026-01-01")).toBeInTheDocument();
    expect(screen.getByText("2026-02-01")).toBeInTheDocument();
    expect(screen.queryByText("2026-04-01")).not.toBeInTheDocument();
  });

  it("shows a distinct empty-state message when the range matches nothing (ET-STORY-014 AC6)", async () => {
    saveExpense({
      id: "1",
      userId: "local-user",
      amount: 5,
      date: "2026-01-01",
      category: "Bills",
      createdAt: Date.now(),
    });
    const user = userEvent.setup();
    render(<App />);

    await user.type(screen.getByLabelText(/start date/i), "2026-06-01");
    await user.type(screen.getByLabelText(/end date/i), "2026-07-01");

    expect(screen.getByText(/no expenses match the selected date range/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /add an expense/i })).not.toBeInTheDocument();
  });

  it("keeps the full list visible while the start date is unparseable (ET-STORY-014 AC9)", async () => {
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
      amount: 5,
      date: "2026-02-01",
      category: "Bills",
      createdAt: Date.now(),
    });
    const user = userEvent.setup();
    render(<App />);

    await user.type(screen.getByLabelText(/start date/i), "not-a-date");

    expect(screen.getAllByRole("row")).toHaveLength(3);
  });
});
