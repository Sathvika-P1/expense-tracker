import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RouteErrorBoundary } from "./RouteErrorBoundary";

function Boom(): never {
  throw new Error("chunk failed");
}

function renderBroken(onRetry = vi.fn().mockResolvedValue(false)) {
  vi.spyOn(console, "error").mockImplementation(() => {});
  render(
    <RouteErrorBoundary routeLabel="Reports" onRetry={onRetry}>
      <Boom />
    </RouteErrorBoundary>,
  );
  return onRetry;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("RouteErrorBoundary", () => {
  it("renders an assertive live-region error panel (AC1, AC4)", () => {
    renderBroken();
    const alert = screen.getByRole("alert");
    expect(alert).toHaveAttribute("aria-live", "assertive");
    expect(alert).toHaveTextContent(/couldn't load/i);
    expect(alert).toHaveTextContent("Something went wrong while loading Reports.");
  });

  it("shows a visible Retry control (AC5)", () => {
    renderBroken();
    expect(screen.getByRole("button", { name: "Retry" })).toBeVisible();
  });

  it("calls onRetry once when Retry is activated (AC6)", async () => {
    const onRetry = renderBroken();
    await userEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("escalates after a failed retry and keeps Retry enabled (AC8, AC9)", async () => {
    renderBroken();
    await userEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByText("Still having trouble loading this")).toBeInTheDocument();
    expect(screen.getByText(/longer-lasting problem/i)).toBeInTheDocument();
    expect(screen.getByText("Failed 2 times")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toBeEnabled();
  });
});
