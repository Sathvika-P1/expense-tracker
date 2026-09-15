import { useState } from "react";
import type { Expense, ExpenseStatus } from "../domain/expense";
import { ExpenseHistory } from "./ExpenseHistory";

const NON_EDITABLE_STATUSES: ExpenseStatus[] = ["submitted", "approved", "reimbursed"];

interface ExpenseListProps {
  expenses: Expense[];
  onEdit: (id: string) => void;
}

export function ExpenseList({ expenses, onEdit }: ExpenseListProps) {
  const [historyId, setHistoryId] = useState<string | null>(null);

  if (expenses.length === 0) {
    return <p>No expenses recorded yet.</p>;
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
            disabled={NON_EDITABLE_STATUSES.includes(expense.status)}
            onClick={() => onEdit(expense.id)}
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => setHistoryId((current) => (current === expense.id ? null : expense.id))}
          >
            {historyId === expense.id ? "Hide history" : "View history"}
          </button>
          {historyId === expense.id && <ExpenseHistory expenseId={expense.id} />}
        </li>
      ))}
    </ul>
  );
}
