import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AppShell } from "./AppShell";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("AppShell", () => {
  it("keeps navigation visible and functional when a route fails to load (AC2)", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const failing = vi.fn().mockRejectedValue(new Error("chunk load failed"));
    const ok = vi.fn().mockResolvedValue({ default: () => <div>Expenses</div> });

    render(<AppShell loaders={{ expenses: ok, reports: failing }} />);

    await userEvent.click(screen.getByRole("button", { name: /reports/i }));

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(screen.getByRole("navigation")).toBeVisible();
    expect(screen.getByRole("button", { name: /expenses/i })).toBeEnabled();
  });

  it("navigating away from a failed route clears the error and renders the new route (AC3)", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const failing = vi.fn().mockRejectedValue(new Error("boom"));
    const ok = vi.fn().mockResolvedValue({ default: () => <div>Expenses content</div> });

    render(<AppShell loaders={{ expenses: ok, reports: failing }} />);

    await userEvent.click(screen.getByRole("button", { name: /reports/i }));
    await screen.findByRole("alert");

    await userEvent.click(screen.getByRole("button", { name: /expenses/i }));

    expect(await screen.findByText("Expenses content")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("retries the same failed destination and shows the error again on repeat failure (AC4)", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const failing = vi.fn().mockRejectedValue(new Error("boom"));

    const ok = vi.fn().mockResolvedValue({ default: () => <div>Expenses</div> });

    render(<AppShell loaders={{ expenses: ok, reports: failing }} />);

    await userEvent.click(screen.getByRole("button", { name: /reports/i }));
    await screen.findByRole("alert");

    await userEvent.click(screen.getByRole("button", { name: /reports/i }));

    await waitFor(() => expect(failing).toHaveBeenCalledTimes(2));
    await screen.findByRole("alert");
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("clears the error and renders content when a retried route now succeeds (AC5)", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const flaky = vi
      .fn()
      .mockRejectedValueOnce(new Error("boom"))
      .mockResolvedValue({ default: () => <div>Reports</div> });

    const ok = vi.fn().mockResolvedValue({ default: () => <div>Expenses</div> });

    render(<AppShell loaders={{ expenses: ok, reports: flaky }} />);

    await userEvent.click(screen.getByRole("button", { name: /reports/i }));
    await screen.findByRole("alert");

    await userEvent.click(screen.getByRole("button", { name: /reports/i }));

    expect(await screen.findByText("Reports")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(flaky).toHaveBeenCalledTimes(2);
  });
});
