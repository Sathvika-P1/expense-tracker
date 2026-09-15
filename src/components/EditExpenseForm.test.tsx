import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EditExpenseForm } from "./EditExpenseForm";
import * as expenseRepository from "../domain/expenseRepository";
import { ForbiddenError } from "../domain/errors";
import type { Expense } from "../domain/expense";

const expense: Expense = {
  id: "1",
  amount: 10,
  date: "2026-01-01",
  category: "Food",
  notes: "Lunch",
  createdAt: Date.now(),
  status: "draft",
  ownerId: "current-user",
};

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe("EditExpenseForm", () => {
  it("pre-populates the form with the expense's current values", () => {
    render(
      <EditExpenseForm expense={expense} currentUserId="current-user" onSaved={vi.fn()} onCancel={vi.fn()} />,
    );

    expect(screen.getByLabelText(/amount/i)).toHaveValue("10");
    expect(screen.getByLabelText(/date/i)).toHaveValue("2026-01-01");
    expect(screen.getByLabelText(/category/i)).toHaveValue("Food");
    expect(screen.getByLabelText(/description/i)).toHaveValue("Lunch");
  });

  it("keeps amount, date, category, description, and receipt fields editable", () => {
    render(
      <EditExpenseForm expense={expense} currentUserId="current-user" onSaved={vi.fn()} onCancel={vi.fn()} />,
    );

    expect(screen.getByLabelText(/amount/i)).not.toBeDisabled();
    expect(screen.getByLabelText(/date/i)).not.toBeDisabled();
    expect(screen.getByLabelText(/category/i)).not.toBeDisabled();
    expect(screen.getByLabelText(/description/i)).not.toBeDisabled();
    expect(screen.getByLabelText(/receipt/i)).not.toBeDisabled();
  });

  it("saves updated values via updateExpense", async () => {
    const user = userEvent.setup();
    const updateSpy = vi
      .spyOn(expenseRepository, "updateExpense")
      .mockImplementation((id, changes, editorId) => ({ ...expense, ...changes }) as Expense);
    const onSaved = vi.fn();

    render(
      <EditExpenseForm expense={expense} currentUserId="current-user" onSaved={onSaved} onCancel={vi.fn()} />,
    );

    await user.clear(screen.getByLabelText(/amount/i));
    await user.type(screen.getByLabelText(/amount/i), "42");
    await user.click(screen.getByRole("button", { name: /save/i }));

    expect(updateSpy).toHaveBeenCalledWith(
      "1",
      expect.objectContaining({ amount: 42 }),
      "current-user",
    );
    expect(onSaved).toHaveBeenCalled();
  });

  it("rejects a zero or negative amount", async () => {
    const user = userEvent.setup();
    render(
      <EditExpenseForm expense={expense} currentUserId="current-user" onSaved={vi.fn()} onCancel={vi.fn()} />,
    );

    await user.clear(screen.getByLabelText(/amount/i));
    await user.type(screen.getByLabelText(/amount/i), "0");
    await user.click(screen.getByRole("button", { name: /save/i }));

    expect(screen.getByText(/positive number/i)).toBeInTheDocument();
  });

  it("asks for confirmation when cancelling with unsaved changes", async () => {
    const user = userEvent.setup();
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    const onCancel = vi.fn();

    render(
      <EditExpenseForm expense={expense} currentUserId="current-user" onSaved={vi.fn()} onCancel={onCancel} />,
    );

    await user.clear(screen.getByLabelText(/amount/i));
    await user.type(screen.getByLabelText(/amount/i), "99");
    await user.click(screen.getByRole("button", { name: /cancel/i }));

    expect(confirmSpy).toHaveBeenCalled();
    expect(onCancel).toHaveBeenCalled();
  });

  it("asks for confirmation when cancelling after replacing the receipt with a same-named file", async () => {
    const user = userEvent.setup();
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    const onCancel = vi.fn();
    const expenseWithReceipt: Expense = {
      ...expense,
      receipt: { name: "receipt.png", dataUrl: "data:image/png;base64,AAAA" },
    };

    render(
      <EditExpenseForm
        expense={expenseWithReceipt}
        currentUserId="current-user"
        onSaved={vi.fn()}
        onCancel={onCancel}
      />,
    );

    const file = new File(["different-content"], "receipt.png", { type: "image/png" });
    await user.upload(screen.getByLabelText(/receipt/i), file);
    await waitFor(() => expect(screen.getByText("receipt.png")).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: /cancel/i }));

    expect(confirmSpy).toHaveBeenCalled();
    expect(onCancel).toHaveBeenCalled();
  });

  it("cancels without a confirmation dialog when nothing changed", async () => {
    const user = userEvent.setup();
    const confirmSpy = vi.spyOn(window, "confirm");
    const onCancel = vi.fn();

    render(
      <EditExpenseForm expense={expense} currentUserId="current-user" onSaved={vi.fn()} onCancel={onCancel} />,
    );

    await user.click(screen.getByRole("button", { name: /cancel/i }));

    expect(confirmSpy).not.toHaveBeenCalled();
    expect(onCancel).toHaveBeenCalled();
  });

  it("retains entered values and shows an inline error when save fails", async () => {
    const user = userEvent.setup();
    vi.spyOn(expenseRepository, "updateExpense").mockImplementation(() => {
      throw new Error("network error");
    });

    render(
      <EditExpenseForm expense={expense} currentUserId="current-user" onSaved={vi.fn()} onCancel={vi.fn()} />,
    );

    await user.clear(screen.getByLabelText(/amount/i));
    await user.type(screen.getByLabelText(/amount/i), "77");
    await user.click(screen.getByRole("button", { name: /save/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/could not save/i);
    expect(screen.getByLabelText(/amount/i)).toHaveValue("77");
  });

  it("shows a clear permission error when the editor is not the owner", async () => {
    const user = userEvent.setup();
    vi.spyOn(expenseRepository, "updateExpense").mockImplementation(() => {
      throw new ForbiddenError();
    });

    render(
      <EditExpenseForm expense={expense} currentUserId="current-user" onSaved={vi.fn()} onCancel={vi.fn()} />,
    );

    await user.click(screen.getByRole("button", { name: /save/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/permission/i);
  });

  it("submits the selected receipt file as part of the update", async () => {
    const user = userEvent.setup();
    const updateSpy = vi
      .spyOn(expenseRepository, "updateExpense")
      .mockImplementation((id, changes, editorId) => ({ ...expense, ...changes }) as Expense);

    render(
      <EditExpenseForm expense={expense} currentUserId="current-user" onSaved={vi.fn()} onCancel={vi.fn()} />,
    );

    const file = new File(["x"], "receipt.png", { type: "image/png" });
    await user.upload(screen.getByLabelText(/receipt/i), file);
    await user.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith(
        "1",
        expect.objectContaining({ receipt: expect.objectContaining({ name: "receipt.png" }) }),
        "current-user",
      );
    });
  });

  it("resubmits the retained data on retry after a failed save", async () => {
    const user = userEvent.setup();
    const updateSpy = vi
      .spyOn(expenseRepository, "updateExpense")
      .mockImplementationOnce(() => {
        throw new Error("network error");
      })
      .mockImplementationOnce((id, changes, editorId) => ({ ...expense, ...changes }) as Expense);

    render(
      <EditExpenseForm expense={expense} currentUserId="current-user" onSaved={vi.fn()} onCancel={vi.fn()} />,
    );

    await user.clear(screen.getByLabelText(/amount/i));
    await user.type(screen.getByLabelText(/amount/i), "77");
    await user.click(screen.getByRole("button", { name: /save/i }));
    await screen.findByRole("alert");

    await user.click(screen.getByRole("button", { name: /save/i }));

    expect(updateSpy).toHaveBeenLastCalledWith(
      "1",
      expect.objectContaining({ amount: 77 }),
      "current-user",
    );
  });
});
