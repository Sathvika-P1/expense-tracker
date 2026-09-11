import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";
import { installMatchMediaStub } from "./test/matchMediaStub";
import { App } from "./App";
import { saveExpense } from "./domain/expenseRepository";

beforeEach(() => {
  localStorage.clear();
});

describe("App", () => {
  it("renders expenses already present in localStorage at mount (AC7)", () => {
    installMatchMediaStub(1024);
    saveExpense({
      id: "existing",
      userId: "local-user",
      amount: 5,
      date: "2026-01-01",
      category: "Bills",
      createdAt: Date.now(),
    });

    render(
      <MemoryRouter initialEntries={["/"]}>
        <App />
      </MemoryRouter>,
    );

    expect(screen.getAllByRole("row")[1]).toHaveTextContent("Bills");
  });

  it("shows a newly submitted expense at the top of the list without a reload (AC1)", async () => {
    installMatchMediaStub(1024);
    saveExpense({
      id: "existing",
      userId: "local-user",
      amount: 5,
      date: "2026-01-01",
      category: "Bills",
      createdAt: Date.now(),
    });

    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/"]}>
        <App />
      </MemoryRouter>,
    );

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
});

describe("AC11: navigation chrome stays mounted across route changes", () => {
  it("does not remount the nav DOM node when navigating between routes via the chrome's own links", async () => {
    installMatchMediaStub(1024);
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={["/"]}>
        <App />
      </MemoryRouter>,
    );

    const navBefore = screen.getByRole("navigation", { name: "Top navigation bar" });
    expect(screen.getByRole("heading", { name: "Expense Tracker" })).toBeInTheDocument();

    await user.click(screen.getByRole("link", { name: "Reports" }));

    const navAfter = screen.getByRole("navigation", { name: "Top navigation bar" });
    expect(screen.getByRole("heading", { name: "Reports" })).toBeInTheDocument();
    expect(navAfter).toBe(navBefore);
  });
});
