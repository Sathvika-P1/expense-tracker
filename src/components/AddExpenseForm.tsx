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
    <form onSubmit={handleSubmit} aria-label="Add expense">
      <div>
        <label htmlFor={amountId}>Amount</label>
        <input
          id={amountId}
          type="text"
          inputMode="decimal"
          value={form.amount}
          aria-describedby={errors.amount ? amountErrorId : undefined}
          onChange={(event) => setForm({ ...form, amount: event.target.value })}
        />
        {errors.amount && (
          <p id={amountErrorId} role="alert">
            {errors.amount}
          </p>
        )}
      </div>

      <div>
        <label htmlFor={dateId}>Date</label>
        <input
          id={dateId}
          type="date"
          value={form.date}
          aria-describedby={errors.date ? dateErrorId : undefined}
          onChange={(event) => setForm({ ...form, date: event.target.value })}
        />
        {errors.date && (
          <p id={dateErrorId} role="alert">
            {errors.date}
          </p>
        )}
      </div>

      <div>
        <label htmlFor={categoryId}>Category</label>
        <select
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
          <p id={categoryErrorId} role="alert">
            {errors.category}
          </p>
        )}
      </div>

      <div>
        <label htmlFor={notesId}>Notes</label>
        <textarea
          id={notesId}
          value={form.notes}
          aria-describedby={errors.notes ? notesErrorId : undefined}
          onChange={(event) => setForm({ ...form, notes: event.target.value })}
        />
        {errors.notes && (
          <p id={notesErrorId} role="alert">
            {errors.notes}
          </p>
        )}
      </div>

      {saveError && (
        <p id={saveErrorId} role="alert">
          {saveError}
        </p>
      )}

      <button type="submit">Add Expense</button>
    </form>
  );
}
