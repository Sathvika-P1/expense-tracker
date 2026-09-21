import { useEffect, useId, useState } from "react";
import { CATEGORIES } from "../domain/categories";
import { getCurrentUserId } from "../domain/currentUser";
import type { Expense, ExpenseInput } from "../domain/expense";
import { updateExpense } from "../domain/expenseRepository";
import { validateExpense, type ValidationErrors } from "../domain/validateExpense";

interface EditExpenseFormProps {
  expense: Expense;
  onSaved: () => void;
  onCancel: () => void;
  onDeleted: () => void;
}

const NOT_FOUND_REDIRECT_DELAY_MS = 2000;

function toFormInput(expense: Expense): ExpenseInput {
  return {
    amount: String(expense.amount),
    date: expense.date,
    category: expense.category,
    notes: expense.notes ?? "",
  };
}

export function EditExpenseForm({ expense, onSaved, onCancel, onDeleted }: EditExpenseFormProps) {
  const [form, setForm] = useState<ExpenseInput>(() => toFormInput(expense));
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [saveErrorReason, setSaveErrorReason] = useState<
    "unauthorized" | "conflict" | "not_found" | null
  >(null);

  const amountId = useId();
  const dateId = useId();
  const categoryId = useId();
  const notesId = useId();
  const amountErrorId = useId();
  const dateErrorId = useId();
  const categoryErrorId = useId();
  const notesErrorId = useId();

  useEffect(() => {
    if (saveErrorReason !== "not_found") return;
    const timer = setTimeout(onDeleted, NOT_FOUND_REDIRECT_DELAY_MS);
    return () => clearTimeout(timer);
  }, [saveErrorReason, onDeleted]);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    const validationErrors = validateExpense(form);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    const result = updateExpense(expense.id, form, expense.updatedAt, getCurrentUserId());
    if (!result.ok) {
      setSaveErrorReason(result.reason);
      return;
    }

    setSaveErrorReason(null);
    onSaved();
  }

  return (
    <div className="card">
      <h1 className="card-title">Edit expense</h1>

      {saveErrorReason === "unauthorized" && (
        <div className="banner" role="alert">
          <span aria-hidden="true">🔒</span>
          <div>
            <div className="banner-title">Save rejected</div>
            <div className="banner-body">
              You don't have permission to edit this expense. It belongs to another user.
            </div>
          </div>
        </div>
      )}

      {saveErrorReason === "conflict" && (
        <div className="banner" role="alert">
          <span aria-hidden="true">⚠</span>
          <div>
            <div className="banner-title">This expense changed since you opened it</div>
            <div className="banner-body">
              Someone else saved a newer version of this expense. Reload it to see the latest
              values before saving your changes again.
            </div>
          </div>
        </div>
      )}

      {saveErrorReason === "not_found" && (
        <div className="banner" role="alert">
          <span aria-hidden="true">✕</span>
          <div>
            <div className="banner-title">This expense no longer exists</div>
            <div className="banner-body">
              This expense was deleted after you opened it, so your changes can't be saved. Taking
              you to the expense list…
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="field-row">
          <div className="field">
            <label className="label" htmlFor={amountId}>
              Amount
            </label>
            <input
              className={errors.amount ? "input has-error" : "input"}
              id={amountId}
              type="text"
              inputMode="decimal"
              disabled={saveErrorReason === "unauthorized" || saveErrorReason === "not_found"}
              value={form.amount}
              aria-describedby={errors.amount ? amountErrorId : undefined}
              onChange={(event) => setForm({ ...form, amount: event.target.value })}
            />
            {errors.amount && (
              <p id={amountErrorId} className="error-text" role="alert">
                {errors.amount}
              </p>
            )}
          </div>

          <div className="field">
            <label className="label" htmlFor={dateId}>
              Date
            </label>
            <input
              className={errors.date ? "input has-error" : "input"}
              id={dateId}
              type="date"
              disabled={saveErrorReason === "unauthorized" || saveErrorReason === "not_found"}
              value={form.date}
              aria-describedby={errors.date ? dateErrorId : undefined}
              onChange={(event) => setForm({ ...form, date: event.target.value })}
            />
            {errors.date && (
              <p id={dateErrorId} className="error-text" role="alert">
                {errors.date}
              </p>
            )}
          </div>
        </div>

        <div className="field">
          <label className="label" htmlFor={categoryId}>
            Category
          </label>
          <select
            className={errors.category ? "input has-error" : "input"}
            id={categoryId}
            disabled={saveErrorReason === "unauthorized" || saveErrorReason === "not_found"}
            value={form.category}
            aria-describedby={errors.category ? categoryErrorId : undefined}
            onChange={(event) => setForm({ ...form, category: event.target.value })}
          >
            <option value="">Select a category</option>
            {CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
          {errors.category && (
            <p id={categoryErrorId} className="error-text" role="alert">
              {errors.category}
            </p>
          )}
        </div>

        <div className="field">
          <label className="label" htmlFor={notesId}>
            Notes
          </label>
          <textarea
            className={errors.notes ? "input has-error" : "input"}
            id={notesId}
            disabled={saveErrorReason === "unauthorized" || saveErrorReason === "not_found"}
            value={form.notes}
            aria-describedby={errors.notes ? notesErrorId : undefined}
            onChange={(event) => setForm({ ...form, notes: event.target.value })}
          />
          {errors.notes && (
            <p id={notesErrorId} className="error-text" role="alert">
              {errors.notes}
            </p>
          )}
        </div>

        <div className="actions-row">
          {saveErrorReason !== "unauthorized" && saveErrorReason !== "not_found" && (
            <button type="submit" className="btn btn-primary">
              Save changes
            </button>
          )}
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            {saveErrorReason === "unauthorized" ? "Back to expense list" : "Cancel"}
          </button>
        </div>
      </form>
    </div>
  );
}
