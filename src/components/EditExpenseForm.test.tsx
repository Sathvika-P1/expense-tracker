import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EditExpenseForm } from "./EditExpenseForm";
import type { Expense } from "../domain/expense";
import { saveExpense, updateExpense } from "../domain/expenseRepository";

vi.mock("../domain/expenseRepository", async () => {
  const actual = await vi.importActual<typeof import("../domain/expenseRepository")>(
    "../domain/expenseRepository",
  );
  return { ...actual, updateExpense: vi.fn(actual.updateExpense) };
});

const expense: Expense = {
  id: "e1",
  userId: "local-user",
  amount: 48.5,
  date: "2026-09-14",
  category: "Travel",
  notes: "Client lunch",
  createdAt: 1,
  updatedAt: 1,
};

beforeEach(() => {
  localStorage.clear();
  vi.mocked(updateExpense).mockClear();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("EditExpenseForm", () => {
  it("pre-fills the form with the expense's current values (AC1)", () => {
    render(
      <EditExpenseForm expense={expense} onSaved={vi.fn()} onCancel={vi.fn()} onDeleted={vi.fn()} />,
    );

    expect(screen.getByLabelText("Amount")).toHaveValue("48.5");
    expect(screen.getByLabelText("Notes")).toHaveValue("Client lunch");
  });

  it("shows a validation error and does not save when amount is non-positive (AC4)", async () => {
    saveExpense(expense);
    const user = userEvent.setup();
    render(
      <EditExpenseForm expense={expense} onSaved={vi.fn()} onCancel={vi.fn()} onDeleted={vi.fn()} />,
    );

    const amountInput = screen.getByLabelText("Amount");
    await user.clear(amountInput);
    await user.type(amountInput, "-10");
    await user.click(screen.getByRole("button", { name: /save changes/i }));

    expect(screen.getByText("Amount must be a positive number.")).toBeInTheDocument();
    expect(updateExpense).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Amount")).toHaveValue("-10");
  });

  it("discards in-memory changes and calls onCancel without saving (AC7, AC8)", async () => {
    saveExpense(expense);
    const onCancel = vi.fn();
    const user = userEvent.setup();
    render(
      <EditExpenseForm expense={expense} onSaved={vi.fn()} onCancel={onCancel} onDeleted={vi.fn()} />,
    );

    const amountInput = screen.getByLabelText("Amount");
    await user.clear(amountInput);
    await user.type(amountInput, "99");
    await user.click(screen.getByRole("button", { name: /cancel/i }));

    expect(updateExpense).not.toHaveBeenCalled();
    expect(onCancel).toHaveBeenCalled();
  });

  it("shows an authorization error when the save is rejected (AC6)", async () => {
    vi.mocked(updateExpense).mockReturnValue({ ok: false, reason: "unauthorized" });
    const user = userEvent.setup();
    render(
      <EditExpenseForm expense={expense} onSaved={vi.fn()} onCancel={vi.fn()} onDeleted={vi.fn()} />,
    );

    await user.click(screen.getByRole("button", { name: /save changes/i }));

    expect(
      screen.getByText("You don't have permission to edit this expense. It belongs to another user."),
    ).toBeInTheDocument();
  });

  it("shows a conflict error prompting a reload when the save is rejected (AC9)", async () => {
    vi.mocked(updateExpense).mockReturnValue({ ok: false, reason: "conflict" });
    const user = userEvent.setup();
    render(
      <EditExpenseForm expense={expense} onSaved={vi.fn()} onCancel={vi.fn()} onDeleted={vi.fn()} />,
    );

    await user.click(screen.getByRole("button", { name: /save changes/i }));

    expect(screen.getByText("This expense changed since you opened it")).toBeInTheDocument();
    expect(screen.getByText(/reload it to see the latest values/i)).toBeInTheDocument();
  });

  it("shows a not-found error then redirects when the expense was deleted (AC10, AC11)", async () => {
    vi.mocked(updateExpense).mockReturnValue({ ok: false, reason: "not_found" });
    const onDeleted = vi.fn();
    vi.useFakeTimers();
    render(
      <EditExpenseForm expense={expense} onSaved={vi.fn()} onCancel={vi.fn()} onDeleted={onDeleted} />,
    );

    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    expect(screen.getByText("This expense no longer exists")).toBeInTheDocument();
    expect(onDeleted).not.toHaveBeenCalled();

    vi.advanceTimersByTime(2000);

    expect(onDeleted).toHaveBeenCalled();
    vi.useRealTimers();
  });

  it("calls onSaved when the save succeeds (AC2, AC3)", async () => {
    vi.mocked(updateExpense).mockReturnValue({
      ok: true,
      expense: { ...expense, notes: "Rescheduled" },
    });
    const onSaved = vi.fn();
    const user = userEvent.setup();
    render(
      <EditExpenseForm expense={expense} onSaved={onSaved} onCancel={vi.fn()} onDeleted={vi.fn()} />,
    );

    await user.click(screen.getByRole("button", { name: /save changes/i }));

    expect(onSaved).toHaveBeenCalled();
  });
});
