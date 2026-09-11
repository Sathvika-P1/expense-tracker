import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AddExpenseForm } from "./AddExpenseForm";
import * as expenseRepository from "../domain/expenseRepository";

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

async function fillValidForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/amount/i), "25.50");
  await user.type(screen.getByLabelText(/date/i), "2026-01-15");
  await user.selectOptions(screen.getByLabelText(/category/i), "Food");
}

describe("AddExpenseForm", () => {
  it("saves a valid expense and notifies the parent (AC1, AC9)", async () => {
    const user = userEvent.setup();
    const onSaved = vi.fn();
    render(<AddExpenseForm onSaved={onSaved} />);

    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: /add expense/i }));

    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
    expect(expenseRepository.loadExpenses()).toHaveLength(1);
  });

  it("saves successfully with a future date (AC9)", async () => {
    const user = userEvent.setup();
    const onSaved = vi.fn();
    render(<AddExpenseForm onSaved={onSaved} />);

    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);
    const futureDateStr = futureDate.toISOString().slice(0, 10);

    await user.type(screen.getByLabelText(/amount/i), "10");
    await user.type(screen.getByLabelText(/date/i), futureDateStr);
    await user.selectOptions(screen.getByLabelText(/category/i), "Food");
    await user.click(screen.getByRole("button", { name: /add expense/i }));

    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows inline errors for amount, date, and category when blank (AC2)", async () => {
    const user = userEvent.setup();
    render(<AddExpenseForm onSaved={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /add expense/i }));

    await screen.findAllByRole("alert");
    expect(screen.getByText(/amount is required/i)).toBeInTheDocument();
    expect(screen.getByText(/date is required/i)).toBeInTheDocument();
    expect(screen.getByText(/category is required/i)).toBeInTheDocument();
  });

  it("does not save when the form is invalid (AC3)", async () => {
    const saveSpy = vi.spyOn(expenseRepository, "saveExpense");
    const user = userEvent.setup();
    render(<AddExpenseForm onSaved={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /add expense/i }));

    await screen.findAllByRole("alert");
    expect(saveSpy).not.toHaveBeenCalled();
    expect(expenseRepository.loadExpenses()).toHaveLength(0);
  });

  it.each(["-5", "abc"])(
    "shows a validation error for a non-positive or non-numeric amount %s (AC4)",
    async (amount) => {
      const user = userEvent.setup();
      render(<AddExpenseForm onSaved={vi.fn()} />);

      await user.type(screen.getByLabelText(/amount/i), amount);
      await user.type(screen.getByLabelText(/date/i), "2026-01-15");
      await user.selectOptions(screen.getByLabelText(/category/i), "Food");
      await user.click(screen.getByRole("button", { name: /add expense/i }));

      expect(await screen.findByText(/positive number/i)).toBeInTheDocument();
      expect(expenseRepository.loadExpenses()).toHaveLength(0);
    },
  );

  it("displays notes with a valid submission (AC5)", async () => {
    const user = userEvent.setup();
    render(<AddExpenseForm onSaved={vi.fn()} />);

    await fillValidForm(user);
    await user.type(screen.getByLabelText(/notes/i), "Lunch with team");
    await user.click(screen.getByRole("button", { name: /add expense/i }));

    await waitFor(() => {
      const [saved] = expenseRepository.loadExpenses();
      expect(saved.notes).toBe("Lunch with team");
    });
  });

  it("resets the form to empty state after a successful save (AC6)", async () => {
    const user = userEvent.setup();
    render(<AddExpenseForm onSaved={vi.fn()} />);

    await fillValidForm(user);
    await user.type(screen.getByLabelText(/notes/i), "Some notes");
    await user.click(screen.getByRole("button", { name: /add expense/i }));

    await waitFor(() => {
      expect(screen.getByLabelText(/amount/i)).toHaveValue("");
    });
    expect(screen.getByLabelText(/date/i)).toHaveValue("");
    expect(screen.getByLabelText(/category/i)).toHaveValue("");
    expect(screen.getByLabelText(/notes/i)).toHaveValue("");
  });

  it("shows an error requiring at most two decimal places (AC8)", async () => {
    const user = userEvent.setup();
    render(<AddExpenseForm onSaved={vi.fn()} />);

    await user.type(screen.getByLabelText(/amount/i), "12.345");
    await user.type(screen.getByLabelText(/date/i), "2026-01-15");
    await user.selectOptions(screen.getByLabelText(/category/i), "Food");
    await user.click(screen.getByRole("button", { name: /add expense/i }));

    expect(await screen.findByText(/two decimal/i)).toBeInTheDocument();
    expect(expenseRepository.loadExpenses()).toHaveLength(0);
  });

  it("shows a max length error for notes exceeding 200 characters (AC10)", async () => {
    const user = userEvent.setup();
    render(<AddExpenseForm onSaved={vi.fn()} />);

    await fillValidForm(user);
    await user.type(screen.getByLabelText(/notes/i), "a".repeat(201));
    await user.click(screen.getByRole("button", { name: /add expense/i }));

    expect(await screen.findByText(/200/)).toBeInTheDocument();
    expect(expenseRepository.loadExpenses()).toHaveLength(0);
  });

  it("shows an error and does not reset the form when saving fails", async () => {
    vi.spyOn(expenseRepository, "saveExpense").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });
    const user = userEvent.setup();
    const onSaved = vi.fn();
    render(<AddExpenseForm onSaved={onSaved} />);

    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: /add expense/i }));

    expect(await screen.findByText(/could not save/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/amount/i)).toHaveValue("25.50");
    expect(onSaved).not.toHaveBeenCalled();
  });

  it("saves notes of exactly 200 characters intact (AC11)", async () => {
    const user = userEvent.setup();
    render(<AddExpenseForm onSaved={vi.fn()} />);

    const notes = "a".repeat(200);
    await fillValidForm(user);
    await user.type(screen.getByLabelText(/notes/i), notes);
    await user.click(screen.getByRole("button", { name: /add expense/i }));

    await waitFor(() => {
      const [saved] = expenseRepository.loadExpenses();
      expect(saved.notes).toBe(notes);
    });
  });
});
