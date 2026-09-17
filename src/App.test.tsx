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
      category: "Utilities",
      createdAt: Date.now(),
    });

    render(<App />);

    expect(screen.getAllByRole("row")[1]).toHaveTextContent("Utilities");
  });

  it("shows a newly submitted expense at the top of the list without a reload (AC1)", async () => {
    saveExpense({
      id: "existing",
      userId: "local-user",
      amount: 5,
      date: "2026-01-01",
      category: "Utilities",
      createdAt: Date.now(),
    });

    const user = userEvent.setup();
    render(<App />);

    await user.type(screen.getByLabelText(/amount/i), "20");
    await user.type(screen.getByLabelText(/date/i), "2026-02-01");
    await user.selectOptions(screen.getByLabelText(/category/i), "Transport");
    await user.click(screen.getByRole("button", { name: /add expense/i }));

    await waitFor(() => {
      const rows = screen.getAllByRole("row");
      expect(rows).toHaveLength(3);
      expect(rows[1]).toHaveTextContent("Transport");
    });
  });

  it("focuses the add-expense form when the empty-state call-to-action is clicked (AC5)", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Add an expense" }));

    expect(screen.getByLabelText(/amount/i)).toHaveFocus();
  });

  it("restores the full expense list after deselecting all categories (AC3)", async () => {
    saveExpense({
      id: "1",
      userId: "local-user",
      amount: 5,
      date: "2026-01-01",
      category: "Food",
      createdAt: Date.now(),
    });
    saveExpense({
      id: "2",
      userId: "local-user",
      amount: 5,
      date: "2026-01-02",
      category: "Housing",
      createdAt: Date.now(),
    });

    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("checkbox", { name: "Food" }));
    expect(screen.getAllByRole("row")).toHaveLength(2);

    await user.click(screen.getByRole("checkbox", { name: "Food" }));
    expect(screen.getAllByRole("row")).toHaveLength(3);
  });

  it("does not persist the category filter across a remount (AC6)", async () => {
    saveExpense({
      id: "1",
      userId: "local-user",
      amount: 5,
      date: "2026-01-01",
      category: "Food",
      createdAt: Date.now(),
    });
    saveExpense({
      id: "2",
      userId: "local-user",
      amount: 5,
      date: "2026-01-02",
      category: "Housing",
      createdAt: Date.now(),
    });

    const user = userEvent.setup();
    const { unmount } = render(<App />);

    await user.click(screen.getByRole("checkbox", { name: "Food" }));
    expect(screen.getAllByRole("row")).toHaveLength(2);

    unmount();
    render(<App />);

    expect(screen.getAllByRole("row")).toHaveLength(3);
    expect(localStorage.getItem("categoryFilter")).toBeNull();
  });
});
