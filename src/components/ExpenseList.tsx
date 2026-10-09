import { useEffect, useRef, useState } from "react";
import type { Expense } from "../domain/expense";
import { ConfirmDialog } from "./ConfirmDialog";

interface ExpenseListProps {
  expenses: Expense[];
  onAddExpenseClick: () => void;
  onEditClick: (expense: Expense) => void;
  onDelete: (id: string) => void;
}

const PAGE_SIZE = 10;

export function ExpenseList({ expenses, onAddExpenseClick, onEditClick, onDelete }: ExpenseListProps) {
  const [page, setPage] = useState(0);
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

  if (expenses.length === 0) {
    return (
      <div ref={containerRef} tabIndex={-1} role="region" aria-label="Expense list">
        <p>No expenses recorded yet.</p>
        <button type="button" onClick={onAddExpenseClick}>
          Add an expense
        </button>
      </div>
    );
  }

  const totalPages = Math.ceil(expenses.length / PAGE_SIZE);
  const pageItems = expenses.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  return (
    <div ref={containerRef} tabIndex={-1} role="region" aria-label="Expense list">
      <table>
        <caption>Expenses</caption>
        <thead>
          <tr>
            <th scope="col">Date</th>
            <th scope="col">Amount</th>
            <th scope="col">Category</th>
            <th scope="col">Description</th>
            <th scope="col">Actions</th>
          </tr>
        </thead>
        <tbody>
          {pageItems.map((expense, index) => (
            <tr key={expense.id}>
              <td>{expense.date}</td>
              <td>{expense.amount.toFixed(2)}</td>
              <td>{expense.category}</td>
              <td>{expense.notes ?? ""}</td>
              <td>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => onEditClick(expense)}
                >
                  Edit
                </button>
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
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {expenses.length > PAGE_SIZE && (
        <nav aria-label="Expense list pagination">
          <button
            type="button"
            aria-label="Previous page"
            onClick={() => setPage((p) => p - 1)}
            disabled={page === 0}
          >
            Previous
          </button>
          <span>
            Page {page + 1} of {totalPages}
          </span>
          <button
            type="button"
            aria-label="Next page"
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= totalPages - 1}
          >
            Next
          </button>
        </nav>
      )}
    </div>
  );
}
