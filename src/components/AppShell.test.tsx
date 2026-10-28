import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AppShell } from "./AppShell";
import * as routes from "../routes";

function reportsRoute() {
  return routes.ROUTES.find((r) => r.key === "reports")!;
}

async function openFailedReports(reportsLoad: ReturnType<typeof vi.spyOn>) {
  reportsLoad.mockRejectedValue(new Error("chunk"));
  render(<AppShell />);
  await userEvent.click(screen.getByRole("button", { name: "Reports" }));
  await screen.findByText("This section couldn't load");
}

beforeEach(() => {
  localStorage.clear();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("AppShell", () => {
  it("shows an inline error in the main area when a child route fails (AC1)", async () => {
    await openFailedReports(vi.spyOn(reportsRoute(), "load"));
    expect(within(screen.getByRole("main")).getByRole("alert")).toBeInTheDocument();
  });

  it("keeps the navigation visible with the selected item (AC2)", async () => {
    await openFailedReports(vi.spyOn(reportsRoute(), "load"));
    expect(screen.getByRole("navigation", { name: "Primary" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Reports" })).toHaveAttribute("aria-current", "page");
  });

  it("loads another route when a different nav item is selected (AC3)", async () => {
    await openFailedReports(vi.spyOn(reportsRoute(), "load"));
    await userEvent.click(screen.getByRole("button", { name: "Dashboard" }));
    expect(await screen.findByTestId("route-dashboard")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("retries the same route's loader and disables Retry while pending (AC6)", async () => {
    const load = vi.spyOn(reportsRoute(), "load");
    await openFailedReports(load);
    let reject!: (e: Error) => void;
    load.mockReturnValueOnce(new Promise((_, r) => (reject = r)));
    await userEvent.click(screen.getByRole("button", { name: "Retry" }));
    const retrying = screen.getByRole("button", { name: "Retrying…" });
    expect(retrying).toBeDisabled();
    expect(load).toHaveBeenCalledTimes(2);
    reject(new Error("again"));
    expect(await screen.findByRole("button", { name: "Retry" })).toBeEnabled();
  });

  it("replaces the error with route content when retry succeeds (AC7)", async () => {
    const load = vi.spyOn(reportsRoute(), "load");
    await openFailedReports(load);
    load.mockResolvedValue({ default: () => <p>Monthly summary</p> });
    await userEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByText("Monthly summary")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("escalates when the retry fails again and keeps Retry available (AC8, AC9)", async () => {
    await openFailedReports(vi.spyOn(reportsRoute(), "load"));
    await userEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByText("Still having trouble loading this")).toBeInTheDocument();
    expect(screen.getByText(/longer-lasting problem/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toBeEnabled();
  });
});
