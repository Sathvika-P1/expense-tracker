import { useEffect, useRef, useState } from "react";
import type { Expense } from "../domain/expense";
import { ConfirmDialog } from "./ConfirmDialog";

interface ExpenseListProps {
  expenses: Expense[];
  onDelete: (id: string) => void;
}

export function ExpenseList({ expenses, onDelete }: ExpenseListProps) {
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [restoreFocusToken, setRestoreFocusToken] = useState(0);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const pendingIndexRef = useRef<number>(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (restoreFocusToken === 0) return;
    const trigger = triggerRef.current;
    if (trigger && document.body.contains(trigger)) {
      trigger.focus();
      return;
    }

    const deleteButtons = containerRef.current?.querySelectorAll<HTMLButtonElement>(
      'button[data-role="delete"]',
    );
    const nextTrigger = deleteButtons?.[Math.min(pendingIndexRef.current, deleteButtons.length - 1)];
    if (nextTrigger) {
      nextTrigger.focus();
    } else {
      containerRef.current?.focus();
    }
  }, [restoreFocusToken]);

  function openConfirm(id: string, trigger: HTMLButtonElement, index: number) {
    triggerRef.current = trigger;
    pendingIndexRef.current = index;
    setPendingDeleteId(id);
  }

  function closeConfirm() {
    setPendingDeleteId(null);
    setRestoreFocusToken((token) => token + 1);
  }

  function handleConfirm() {
    if (pendingDeleteId) {
      onDelete(pendingDeleteId);
    }
    closeConfirm();
  }

  return (
    <div ref={containerRef} tabIndex={-1} role="region" aria-label="Expense list">
      {expenses.length === 0 ? (
        <p>No expenses recorded yet.</p>
      ) : (
        <ul>
          {expenses.map((expense, index) => (
            <li key={expense.id}>
              <span>{expense.category}</span>
              <span>{expense.amount.toFixed(2)}</span>
              <span>{expense.date}</span>
              {expense.notes && <p>{expense.notes}</p>}
              <button
                type="button"
                data-role="delete"
                onClick={(event) => openConfirm(expense.id, event.currentTarget, index)}
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
      )}
    </div>
  );
}
