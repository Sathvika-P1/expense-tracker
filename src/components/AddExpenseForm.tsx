import { useId, useRef, useState } from "react";
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
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<Array<HTMLLIElement | null>>([]);

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
    triggerRef.current?.focus();
  }

  function openListbox() {
    setCategoryOpen(true);
    const selectedIndex = CATEGORIES.indexOf(form.category as (typeof CATEGORIES)[number]);
    const focusIndex = selectedIndex >= 0 ? selectedIndex : 0;
    requestAnimationFrame(() => optionRefs.current[focusIndex]?.focus());
  }

  function handleTriggerKeyDown(event: React.KeyboardEvent) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp" || event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openListbox();
    }
  }

  function handleOptionKeyDown(event: React.KeyboardEvent, index: number) {
    switch (event.key) {
      case "Enter":
      case " ":
        event.preventDefault();
        selectCategory(CATEGORIES[index]);
        break;
      case "ArrowDown": {
        event.preventDefault();
        const nextIndex = (index + 1) % CATEGORIES.length;
        optionRefs.current[nextIndex]?.focus();
        break;
      }
      case "ArrowUp": {
        event.preventDefault();
        const prevIndex = (index - 1 + CATEGORIES.length) % CATEGORIES.length;
        optionRefs.current[prevIndex]?.focus();
        break;
      }
      case "Home":
        event.preventDefault();
        optionRefs.current[0]?.focus();
        break;
      case "End":
        event.preventDefault();
        optionRefs.current[CATEGORIES.length - 1]?.focus();
        break;
      case "Escape":
        event.preventDefault();
        setCategoryOpen(false);
        triggerRef.current?.focus();
        break;
      case "Tab":
        setCategoryOpen(false);
        break;
      default:
        break;
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
              ref={triggerRef}
              type="button"
              className={`input select-trigger${errors.category ? " input-error" : ""}`}
              role="combobox"
              aria-haspopup="listbox"
              aria-expanded={categoryOpen}
              aria-controls={categoryListId}
              aria-labelledby={categoryLabelId}
              aria-invalid={Boolean(errors.category)}
              aria-describedby={errors.category ? categoryErrorId : undefined}
              onClick={() => (categoryOpen ? setCategoryOpen(false) : openListbox())}
              onKeyDown={handleTriggerKeyDown}
            >
              <span style={{ color: form.category ? undefined : "var(--color-muted)" }}>
                {form.category || "Select a category"}
              </span>
              <span aria-hidden="true">{categoryOpen ? "▴" : "▾"}</span>
            </button>
            {categoryOpen && (
              <ul id={categoryListId} className="listbox" role="listbox" aria-label="Category options">
                {CATEGORIES.map((category, index) => (
                  <li
                    key={category}
                    ref={(el) => {
                      optionRefs.current[index] = el;
                    }}
                    className="listbox-option"
                    role="option"
                    aria-selected={form.category === category}
                    tabIndex={0}
                    onClick={() => selectCategory(category)}
                    onKeyDown={(event) => handleOptionKeyDown(event, index)}
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
