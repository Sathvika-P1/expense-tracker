import { beforeEach, describe, expect, it } from "vitest";
import { Component } from "react";
import type { ReactNode } from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";
import { saveExpense } from "./domain/expenseRepository";
import { buildNavigation } from "./navigation/buildNavigation";
import { AppShell } from "./shell/AppShell";

class NavErrorBoundary extends Component<
  { children: ReactNode },
  { errored: boolean }
> {
  state = { errored: false };

  static getDerivedStateFromError() {
    return { errored: true };
  }

  render() {
    if (this.state.errored) {
      return <p>Navigation configuration failed to build.</p>;
    }
    return this.props.children;
  }
}

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

  it("renders no nav item for either conflicting entry (AC8)", () => {
    const moduleA = [
      {
        id: "dashboard",
        label: "Dashboard",
        route: "/dashboard",
        render: () => null,
      },
    ];
    const moduleB = [
      {
        id: "dashboard",
        label: "Duplicate Dashboard",
        route: "/duplicate-dashboard",
        render: () => null,
      },
    ];

    function ConflictingComposition() {
      return <AppShell destinations={buildNavigation(moduleA, moduleB)} />;
    }

    render(
      <NavErrorBoundary>
        <ConflictingComposition />
      </NavErrorBoundary>,
    );

    expect(
      screen.getByText("Navigation configuration failed to build."),
    ).toBeInTheDocument();
    expect(screen.queryByText("Dashboard")).not.toBeInTheDocument();
    expect(screen.queryByText("Duplicate Dashboard")).not.toBeInTheDocument();
  });
});
