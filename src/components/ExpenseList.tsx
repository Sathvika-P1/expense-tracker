import { useRef, useState } from "react";
import type { Expense } from "../domain/expense";
import { ConfirmDialog } from "./ConfirmDialog";

interface ExpenseListProps {
  expenses: Expense[];
  onDelete: (id: string) => void;
}

export function ExpenseList({ expenses, onDelete }: ExpenseListProps) {
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  if (expenses.length === 0) {
    return <p>No expenses recorded yet.</p>;
  }

  function openConfirm(id: string, trigger: HTMLButtonElement) {
    triggerRef.current = trigger;
    setPendingDeleteId(id);
  }

  function closeConfirm() {
    setPendingDeleteId(null);
    triggerRef.current?.focus();
  }

  function handleConfirm() {
    if (pendingDeleteId) {
      onDelete(pendingDeleteId);
    }
    closeConfirm();
  }

  return (
    <ul>
      {expenses.map((expense) => (
        <li key={expense.id}>
          <span>{expense.category}</span>
          <span>{expense.amount.toFixed(2)}</span>
          <span>{expense.date}</span>
          {expense.notes && <p>{expense.notes}</p>}
          <button
            type="button"
            onClick={(event) => openConfirm(expense.id, event.currentTarget)}
          >
            Delete
          </button>
          {pendingDeleteId === expense.id && (
            <ConfirmDialog
              message={`Delete this ${expense.category} expense?`}
              onConfirm={handleConfirm}
              onCancel={closeConfirm}
            />
          )}
        </li>
      ))}
    </ul>
  );
}
