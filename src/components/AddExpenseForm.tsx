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
  onCancel: () => void;
}

export function AddExpenseForm({ onSaved, onCancel }: AddExpenseFormProps) {
  const [form, setForm] = useState<ExpenseInput>(EMPTY_FORM);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [categoryOpen, setCategoryOpen] = useState(false);

  const amountId = useId();
  const dateId = useId();
  const categoryLabelId = useId();
  const categoryListId = useId();
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
      const now = Date.now();
      saveExpense({
        id: crypto.randomUUID(),
        userId: getCurrentUserId(),
        amount: Number(form.amount),
        date: form.date,
        category: form.category as (typeof CATEGORIES)[number],
        notes: form.notes || undefined,
        createdAt: now,
        updatedAt: now,
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

  function selectCategory(category: string) {
    setForm({ ...form, category });
    setCategoryOpen(false);
  }

  function handleOptionKeyDown(event: React.KeyboardEvent, category: string) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      selectCategory(category);
    }
  }

  return (
    <div className="app-shell">
      <div className="form-header-row">
        <h1 className="page-title" style={{ margin: 0 }}>
          Add expense
        </h1>
        <button type="button" className="back-link" onClick={onCancel}>
          ← Back to list
        </button>
      </div>

      {saveError && (
        <div className="toast-banner" role="alert" id={saveErrorId}>
          <span className="toast-icon" aria-hidden="true">
            ⚠
          </span>
          <div>
            <strong>Couldn't save the expense</strong>
            <div className="text-sm text-muted">{saveError}</div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="card">
        <div className="field">
          <label className="label" htmlFor={amountId}>
            Amount
          </label>
          <input
            id={amountId}
            className={`input${errors.amount ? " input-error" : ""}`}
            type="text"
            inputMode="decimal"
            placeholder="0.00"
            autoFocus
            value={form.amount}
            aria-invalid={Boolean(errors.amount)}
            aria-describedby={errors.amount ? amountErrorId : undefined}
            onChange={(event) => setForm({ ...form, amount: event.target.value })}
          />
          {errors.amount && (
            <p className="field-error" id={amountErrorId} role="alert">
              <span aria-hidden="true">⚠</span> {errors.amount}
            </p>
          )}
        </div>

        <div className="field">
          <label className="label" htmlFor={dateId}>
            Date
          </label>
          <input
            id={dateId}
            className={`input${errors.date ? " input-error" : ""}`}
            type="date"
            value={form.date}
            aria-invalid={Boolean(errors.date)}
            aria-describedby={errors.date ? dateErrorId : undefined}
            onChange={(event) => setForm({ ...form, date: event.target.value })}
          />
          {errors.date && (
            <p className="field-error" id={dateErrorId} role="alert">
              <span aria-hidden="true">⚠</span> {errors.date}
            </p>
          )}
        </div>

        <div className="field">
          <span className="label" id={categoryLabelId}>
            Category
          </span>
          <div className="select-wrap">
            <button
              type="button"
              className={`input select-trigger${errors.category ? " input-error" : ""}`}
              role="combobox"
              aria-haspopup="listbox"
              aria-expanded={categoryOpen}
              aria-controls={categoryListId}
              aria-labelledby={categoryLabelId}
              aria-invalid={Boolean(errors.category)}
              aria-describedby={errors.category ? categoryErrorId : undefined}
              onClick={() => setCategoryOpen((open) => !open)}
            >
              <span style={{ color: form.category ? undefined : "var(--color-muted)" }}>
                {form.category || "Select a category"}
              </span>
              <span aria-hidden="true">{categoryOpen ? "▴" : "▾"}</span>
            </button>
            {categoryOpen && (
              <ul id={categoryListId} className="listbox" role="listbox" aria-label="Category options">
                {CATEGORIES.map((category) => (
                  <li
                    key={category}
                    className="listbox-option"
                    role="option"
                    aria-selected={form.category === category}
                    tabIndex={0}
                    onClick={() => selectCategory(category)}
                    onKeyDown={(event) => handleOptionKeyDown(event, category)}
                  >
                    {category}
                  </li>
                ))}
              </ul>
            )}
          </div>
          {errors.category && (
            <p className="field-error" id={categoryErrorId} role="alert">
              <span aria-hidden="true">⚠</span> {errors.category}
            </p>
          )}
        </div>

        <div className="field">
          <label className="label" htmlFor={notesId}>
            Description <span style={{ color: "var(--color-muted)", fontWeight: 400 }}>(optional)</span>
          </label>
          <textarea
            id={notesId}
            className={`input${errors.notes ? " input-error" : ""}`}
            placeholder="e.g. Team lunch"
            value={form.notes}
            aria-invalid={Boolean(errors.notes)}
            aria-describedby={errors.notes ? notesErrorId : undefined}
            onChange={(event) => setForm({ ...form, notes: event.target.value })}
          />
          {errors.notes && (
            <p className="field-error" id={notesErrorId} role="alert">
              <span aria-hidden="true">⚠</span> {errors.notes}
            </p>
          )}
        </div>

        <div className="form-actions">
          <button type="submit" className="btn btn-primary">
            Save expense
          </button>
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
