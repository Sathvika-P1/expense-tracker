import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TotalExpensesWidget } from "./TotalExpensesWidget";

describe("TotalExpensesWidget", () => {
  it("shows the formatted sum of all recorded expenses", () => {
    render(
      <TotalExpensesWidget
        result={{
          ok: true,
          expenses: [
            { id: "1", userId: "u", amount: 10, date: "2026-01-01", category: "Food", createdAt: 1 },
            { id: "2", userId: "u", amount: 20.5, date: "2026-01-02", category: "Travel", createdAt: 2 },
          ],
        }}
      />,
    );

    expect(screen.getByTestId("total-expenses-amount")).toHaveTextContent("$30.50");
  });

  it("shows a clear zero state when there are no expenses", () => {
    render(<TotalExpensesWidget result={{ ok: true, expenses: [] }} />);

    expect(screen.getByTestId("total-expenses-amount")).toHaveTextContent("$0.00");
  });

  it("shows a user-facing alert when the data is corrupted", () => {
    render(<TotalExpensesWidget result={{ ok: false, reason: "corrupted" }} />);

    expect(screen.getByRole("alert")).toHaveTextContent(/corrupted/i);
  });

  it("shows a user-facing alert when storage is unavailable", () => {
    render(<TotalExpensesWidget result={{ ok: false, reason: "unavailable" }} />);

    expect(screen.getByRole("alert")).toHaveTextContent(/unable to access/i);
  });
});
