import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { RouteErrorBoundary } from "./RouteErrorBoundary";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("RouteErrorBoundary", () => {
  it("shows an inline error message when a child throws (AC1)", () => {
    const Bomb = () => {
      throw new Error("boom");
    };
    vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <RouteErrorBoundary>
        <Bomb />
      </RouteErrorBoundary>,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(/something went wrong/i);
  });
});
