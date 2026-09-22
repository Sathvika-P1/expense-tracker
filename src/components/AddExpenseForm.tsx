import { useId, useState } from "react";
import { CATEGORIES } from "../domain/categories";
import { getCurrentUserId } from "../domain/currentUser";
import type { ExpenseInput } from "../domain/expense";
import { saveExpense } from "../domain/expenseRepository";
import { validateExpense, type ValidationErrors } from "../domain/validateExpense";

const EMPTY_FORM: ExpenseInput = {
  amount: "",
  date: "",
  category: "",
  notes: "",
};

interface AddExpenseFormProps {
  onSaved: () => void;
}

export function AddExpenseForm({ onSaved }: AddExpenseFormProps) {
  const [form, setForm] = useState<ExpenseInput>(EMPTY_FORM);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [saveError, setSaveError] = useState<string | null>(null);

  const amountId = useId();
  const dateId = useId();
  const categoryId = useId();
  const notesId = useId();
  const amountErrorId = useId();
  const dateErrorId = useId();
  const categoryErrorId = useId();
  const notesErrorId = useId();
  const saveErrorId = useId();

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    const validationErrors = validateExpense(form);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    try {
      saveExpense({
        id: crypto.randomUUID(),
        userId: getCurrentUserId(),
        amount: Number(form.amount),
        date: form.date,
        category: form.category as (typeof CATEGORIES)[number],
        notes: form.notes || undefined,
        createdAt: Date.now(),
      });
    } catch {
      setSaveError("Could not save the expense. Please try again.");
      return;
    }

    setForm(EMPTY_FORM);
    setErrors({});
    setSaveError(null);
    onSaved();
  }

  return (
    <form className="expense-form" onSubmit={handleSubmit}>
      {saveError && (
        <div className="form-error-banner" role="alert" id={saveErrorId}>
          {saveError}
        </div>
      )}

      <div className="field">
        <label className="label" htmlFor={amountId}>
          Amount
        </label>
        <input
          className={`input${errors.amount ? " has-error" : ""}`}
          id={amountId}
          type="text"
          inputMode="decimal"
          value={form.amount}
          aria-describedby={errors.amount ? amountErrorId : undefined}
          onChange={(event) => setForm({ ...form, amount: event.target.value })}
        />
        {errors.amount && (
          <p className="field-error" id={amountErrorId} role="alert">
            {errors.amount}
          </p>
        )}
      </div>

      <div className="field">
        <label className="label" htmlFor={dateId}>
          Date
        </label>
        <input
          className={`input${errors.date ? " has-error" : ""}`}
          id={dateId}
          type="date"
          value={form.date}
          aria-describedby={errors.date ? dateErrorId : undefined}
          onChange={(event) => setForm({ ...form, date: event.target.value })}
        />
        {errors.date && (
          <p className="field-error" id={dateErrorId} role="alert">
            {errors.date}
          </p>
        )}
      </div>

      <div className="field">
        <label className="label" htmlFor={categoryId}>
          Category
        </label>
        <select
          className={`input${errors.category ? " has-error" : ""}`}
          id={categoryId}
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
          <p className="field-error" id={categoryErrorId} role="alert">
            {errors.category}
          </p>
        )}
      </div>

      <div className="field">
        <label className="label" htmlFor={notesId}>
          Notes
        </label>
        <textarea
          className={`input${errors.notes ? " has-error" : ""}`}
          id={notesId}
          value={form.notes}
          aria-describedby={errors.notes ? notesErrorId : undefined}
          onChange={(event) => setForm({ ...form, notes: event.target.value })}
        />
        {errors.notes && (
          <p className="field-error" id={notesErrorId} role="alert">
            {errors.notes}
          </p>
        )}
      </div>

      <div>
        <button className="btn btn-primary" type="submit">
          Add Expense
        </button>
      </div>
    </form>
  );
}
