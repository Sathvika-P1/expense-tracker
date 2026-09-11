import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AppShell } from "./AppShell";
import type { NavigationEntry } from "../navigation/types";

const dashboard: NavigationEntry = {
  id: "dashboard",
  label: "Dashboard",
  route: "/dashboard",
  render: () => <div>Dashboard view</div>,
};

const expenseList: NavigationEntry = {
  id: "expense-list",
  label: "Expense list",
  route: "/expenses",
  render: () => <div>Expense list view</div>,
};

const reports: NavigationEntry = {
  id: "reports",
  label: "Reports",
  route: "/reports",
  render: () => <div>Reports view</div>,
};

describe("AppShell", () => {
  it("renders exactly the given destinations in the nav chrome (AC1)", () => {
    render(<AppShell destinations={[dashboard, expenseList]} />);

    const nav = screen.getByRole("navigation");
    const items = within(nav).getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(within(nav).getByText("Dashboard")).toBeInTheDocument();
    expect(within(nav).getByText("Expense list")).toBeInTheDocument();
  });

  it("renders a newly added destination without shell changes (AC2)", () => {
    render(<AppShell destinations={[dashboard, expenseList, reports]} />);

    const nav = screen.getByRole("navigation");
    expect(within(nav).getByText("Reports")).toBeInTheDocument();
  });

  it("visually distinguishes the active destination on initial render (AC3)", () => {
    render(<AppShell destinations={[dashboard, expenseList]} />);

    const nav = screen.getByRole("navigation");
    const dashboardLink = within(nav).getByText("Dashboard").closest("a")!;
    const expenseLink = within(nav).getByText("Expense list").closest("a")!;

    expect(dashboardLink).toHaveAttribute("aria-current", "page");
    expect(dashboardLink).toHaveClass("nav-link--active");
    expect(expenseLink).not.toHaveAttribute("aria-current");
    expect(expenseLink).not.toHaveClass("nav-link--active");
  });

  it("swaps the content area to the selected destination without reload (AC4)", async () => {
    const user = userEvent.setup();
    render(<AppShell destinations={[dashboard, expenseList]} />);

    expect(screen.getByText("Dashboard view")).toBeInTheDocument();

    await user.click(screen.getByText("Expense list"));

    expect(screen.getByText("Expense list view")).toBeInTheDocument();
    expect(screen.queryByText("Dashboard view")).not.toBeInTheDocument();
  });

  it("omits a destination removed from the config without shell changes (AC9)", () => {
    render(<AppShell destinations={[dashboard]} />);

    const nav = screen.getByRole("navigation");
    expect(within(nav).queryByText("Expense list")).not.toBeInTheDocument();
  });
});
