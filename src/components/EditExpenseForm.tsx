import { useId, useState } from "react";
import { CATEGORIES } from "../domain/categories";
import type { Expense, ExpenseInput, ExpenseReceipt } from "../domain/expense";
import { ForbiddenError } from "../domain/errors";
import { updateExpense } from "../domain/expenseRepository";
import { validateExpense, type ValidationErrors } from "../domain/validateExpense";

function toFormValues(expense: Expense): ExpenseInput {
  return {
    amount: String(expense.amount),
    date: expense.date,
    category: expense.category,
    notes: expense.notes ?? "",
    receipt: expense.receipt,
  };
}

function readFileAsReceipt(file: File): Promise<ExpenseReceipt> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve({ name: file.name, dataUrl: String(reader.result) });
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

interface EditExpenseFormProps {
  expense: Expense;
  currentUserId: string;
  onSaved: () => void;
  onCancel: () => void;
}

export function EditExpenseForm({ expense, currentUserId, onSaved, onCancel }: EditExpenseFormProps) {
  const [initialForm] = useState<ExpenseInput>(() => toFormValues(expense));
  const [form, setForm] = useState<ExpenseInput>(initialForm);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [saveError, setSaveError] = useState<string | null>(null);

  const amountId = useId();
  const dateId = useId();
  const categoryId = useId();
  const notesId = useId();
  const receiptId = useId();
  const amountErrorId = useId();
  const dateErrorId = useId();
  const categoryErrorId = useId();
  const notesErrorId = useId();
  const saveErrorId = useId();

  const hasUnsavedChanges =
    form.amount !== initialForm.amount ||
    form.date !== initialForm.date ||
    form.category !== initialForm.category ||
    form.notes !== initialForm.notes ||
    form.receipt?.dataUrl !== initialForm.receipt?.dataUrl;

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    const validationErrors = validateExpense(form);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    try {
      updateExpense(
        expense.id,
        {
          amount: Number(form.amount),
          date: form.date,
          category: form.category as (typeof CATEGORIES)[number],
          notes: form.notes || undefined,
          receipt: form.receipt,
        },
        currentUserId,
      );
    } catch (error) {
      setSaveError(
        error instanceof ForbiddenError
          ? error.message
          : "Could not save the expense. Please try again.",
      );
      return;
    }

    setSaveError(null);
    onSaved();
  }

  function handleCancel() {
    if (hasUnsavedChanges && !window.confirm("Discard unsaved changes?")) {
      return;
    }
    onCancel();
  }

  async function handleReceiptChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const receipt = await readFileAsReceipt(file);
      setForm((current) => ({ ...current, receipt }));
    } catch {
      setSaveError("Could not read the selected receipt file. Please try again.");
    }
  }

  return (
    <form onSubmit={handleSubmit}>
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
          <label htmlFor={notesId}>Description</label>
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

        <div>
          <label htmlFor={receiptId}>Receipt</label>
          <input id={receiptId} type="file" onChange={handleReceiptChange} />
          {form.receipt && <p>{form.receipt.name}</p>}
        </div>

        {saveError && (
          <p id={saveErrorId} role="alert">
            {saveError}
          </p>
        )}

      <button type="submit">Save</button>
      <button type="button" onClick={handleCancel}>
        Cancel
      </button>
    </form>
  );
}
