import { describe, expect, it } from "vitest";
import { buildNavigation, NavigationConfigError } from "./buildNavigation";
import type { NavigationEntry } from "./types";

const dashboardEntry: NavigationEntry = {
  id: "dashboard",
  label: "Dashboard",
  route: "/dashboard",
  render: () => null,
};

const expenseListEntry: NavigationEntry = {
  id: "expense-list",
  label: "Expense list",
  route: "/expenses",
  render: () => null,
};

describe("buildNavigation", () => {
  it("merges entries contributed by separate modules (AC5)", () => {
    const result = buildNavigation([dashboardEntry], [expenseListEntry]);

    expect(result).toContainEqual(dashboardEntry);
    expect(result).toContainEqual(expenseListEntry);
    expect(result).toHaveLength(2);
  });

  it("preserves registration order across modules (AC6)", () => {
    const inOrder = buildNavigation([dashboardEntry], [expenseListEntry]);
    expect(inOrder.map((e) => e.id)).toEqual(["dashboard", "expense-list"]);

    const reversed = buildNavigation([expenseListEntry], [dashboardEntry]);
    expect(reversed.map((e) => e.id)).toEqual(["expense-list", "dashboard"]);
  });

  it("throws a NavigationConfigError when two groups declare the same key (AC7)", () => {
    const conflictingId: NavigationEntry = {
      id: "dashboard",
      label: "Duplicate Dashboard",
      route: "/other-dashboard",
      render: () => null,
    };

    expect(() =>
      buildNavigation([dashboardEntry], [conflictingId]),
    ).toThrow(NavigationConfigError);
  });

  it("throws a NavigationConfigError when two groups declare the same route (AC7)", () => {
    const conflictingRoute: NavigationEntry = {
      id: "other-id",
      label: "Other",
      route: "/expenses",
      render: () => null,
    };

    expect(() =>
      buildNavigation([expenseListEntry], [conflictingRoute]),
    ).toThrow(NavigationConfigError);
  });
});
