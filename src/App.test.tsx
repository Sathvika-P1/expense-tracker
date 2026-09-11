import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";
import { saveExpense } from "./domain/expenseRepository";

beforeEach(() => {
  localStorage.clear();
});

describe("App", () => {
  it("renders expenses already present in localStorage at mount", async () => {
    saveExpense({
      id: "existing",
      amount: 5,
      date: "2026-01-01",
      category: "Bills",
      createdAt: Date.now(),
    });

    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByText("Expense list"));

    const main = screen.getByRole("main");
    expect(within(main).getAllByRole("listitem")[0]).toHaveTextContent(
      "Bills",
    );
  });

  it("shows a newly submitted expense at the top of the list without a reload", async () => {
    saveExpense({
      id: "existing",
      amount: 5,
      date: "2026-01-01",
      category: "Bills",
      createdAt: Date.now(),
    });

    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByText("Expense list"));

    await user.type(screen.getByLabelText(/amount/i), "20");
    await user.type(screen.getByLabelText(/date/i), "2026-02-01");
    await user.selectOptions(screen.getByLabelText(/category/i), "Travel");
    await user.click(screen.getByRole("button", { name: /add expense/i }));

    const main = screen.getByRole("main");
    await waitFor(() => {
      const items = within(main).getAllByRole("listitem");
      expect(items).toHaveLength(2);
      expect(items[0]).toHaveTextContent("Travel");
    });
  });

  it("throws at composition time, before any render, when two modules contribute conflicting entries (AC8)", async () => {
    vi.resetModules();
    vi.doMock("./features/dashboard/navigation", () => ({
      dashboardNavigation: [
        {
          id: "dashboard",
          label: "Dashboard",
          route: "/dashboard",
          render: () => null,
        },
      ],
    }));
    vi.doMock("./features/expenses/navigation", () => ({
      expensesNavigation: [
        {
          id: "dashboard",
          label: "Duplicate Dashboard",
          route: "/duplicate-dashboard",
          render: () => null,
        },
      ],
    }));

    await expect(import("./App")).rejects.toThrow(
      /Duplicate navigation entry key "dashboard"/,
    );
    expect(screen.queryByText("Dashboard")).not.toBeInTheDocument();
    expect(screen.queryByText("Duplicate Dashboard")).not.toBeInTheDocument();

    vi.doUnmock("./features/dashboard/navigation");
    vi.doUnmock("./features/expenses/navigation");
    vi.resetModules();
  });
});
