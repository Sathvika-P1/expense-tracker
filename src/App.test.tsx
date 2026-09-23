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

  it("shows only expenses matching a submitted keyword (AC1)", async () => {
    saveExpense({
      id: "1",
      userId: "local-user",
      amount: 5,
      date: "2026-01-01",
      category: "Food",
      notes: "Latte",
      createdAt: Date.now(),
    });
    saveExpense({
      id: "2",
      userId: "local-user",
      amount: 5,
      date: "2026-01-02",
      category: "Travel",
      notes: "Uber ride",
      createdAt: Date.now(),
    });
    const user = userEvent.setup();
    render(<App />);

    await user.type(screen.getByLabelText(/search expenses/i), "latte");
    await user.click(screen.getByRole("button", { name: /^search$/i }));

    await waitFor(() => {
      expect(screen.getAllByRole("row")).toHaveLength(2);
      expect(screen.getByRole("row", { name: /latte/i })).toBeInTheDocument();
    });
  });

  it("submits the search when Enter is pressed in the search field (AC1)", async () => {
    saveExpense({
      id: "1",
      userId: "local-user",
      amount: 5,
      date: "2026-01-01",
      category: "Food",
      notes: "Latte",
      createdAt: Date.now(),
    });
    const user = userEvent.setup();
    render(<App />);

    await user.type(screen.getByLabelText(/search expenses/i), "latte{Enter}");

    await waitFor(() => expect(screen.getAllByRole("row")).toHaveLength(2));
  });

  it("shows a no-results state when the keyword matches nothing (AC2)", async () => {
    saveExpense({
      id: "1",
      userId: "local-user",
      amount: 5,
      date: "2026-01-01",
      category: "Food",
      notes: "Latte",
      createdAt: Date.now(),
    });
    const user = userEvent.setup();
    render(<App />);

    await user.type(screen.getByLabelText(/search expenses/i), "parking");
    await user.click(screen.getByRole("button", { name: /^search$/i }));

    await waitFor(() => {
      expect(screen.queryByRole("table")).not.toBeInTheDocument();
      expect(screen.getByText(/no expenses found for "parking"/i)).toBeInTheDocument();
    });
  });

  it("restores the full list after Clear search is clicked (AC2)", async () => {
    saveExpense({
      id: "1",
      userId: "local-user",
      amount: 5,
      date: "2026-01-01",
      category: "Food",
      notes: "Latte",
      createdAt: Date.now(),
    });
    const user = userEvent.setup();
    render(<App />);

    await user.type(screen.getByLabelText(/search expenses/i), "parking");
    await user.click(screen.getByRole("button", { name: /^search$/i }));
    await user.click(await screen.findByRole("button", { name: /clear search/i }));

    await waitFor(() => expect(screen.getAllByRole("row")).toHaveLength(2));
  });

  it("does not leave a blank page after searching from page 2 of a long list (AC1)", async () => {
    Array.from({ length: 12 }, (_, i) =>
      saveExpense({
        id: String(i),
        userId: "local-user",
        amount: 1,
        date: `2026-01-${String(i + 1).padStart(2, "0")}`,
        category: i === 5 ? "Bills" : "Food",
        notes: i === 5 ? "Electric bill" : "",
        createdAt: Date.now(),
      }),
    );
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: /next page/i }));
    await user.type(screen.getByLabelText(/search expenses/i), "electric");
    await user.click(screen.getByRole("button", { name: /^search$/i }));

    await waitFor(() => {
      expect(screen.getAllByRole("row")).toHaveLength(2);
      expect(screen.getByText("Electric bill")).toBeInTheDocument();
    });
  });

  it("treats a whitespace-only submitted term as no search (browse baseline)", async () => {
    saveExpense({
      id: "1",
      userId: "local-user",
      amount: 5,
      date: "2026-01-01",
      category: "Food",
      notes: "Latte",
      createdAt: Date.now(),
    });
    const user = userEvent.setup();
    render(<App />);

    await user.type(screen.getByLabelText(/search expenses/i), "   {Enter}");

    await waitFor(() => {
      expect(screen.getByText(/showing all 1 expense/i)).toBeInTheDocument();
    });
  });

  it("still shows the no-expenses-yet CTA (not the no-results state) when there are no expenses at all", () => {
    render(<App />);

    expect(screen.getByText(/no expenses recorded yet/i)).toBeInTheDocument();
    expect(screen.queryByText(/no expenses found for/i)).not.toBeInTheDocument();
  });
});
