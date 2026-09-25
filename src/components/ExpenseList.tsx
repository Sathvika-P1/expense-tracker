import { useState } from "react";
import type { Expense } from "../domain/expense";

interface ExpenseListProps {
  expenses: Expense[];
  onAddExpenseClick: () => void;
  onEditClick: (expense: Expense) => void;
}

const PAGE_SIZE = 10;

function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

function formatDate(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function ExpenseList({ expenses, onAddExpenseClick, onEditClick }: ExpenseListProps) {
  const [page, setPage] = useState(0);

  if (expenses.length === 0) {
    return (
      <div className="app-shell">
        <h1 className="page-title">Expenses</h1>
        <p className="page-subtitle">Track what you spend, one entry at a time.</p>
        <div className="card empty-state">
          <div className="heading text-lg">No expenses yet</div>
          <p>Once you add an expense, it will show up here sorted by date.</p>
          <button type="button" className="btn btn-primary" onClick={onAddExpenseClick}>
            + Add an expense
          </button>
        </div>
      </div>
    );
  }

  const totalPages = Math.ceil(expenses.length / PAGE_SIZE);
  const pageItems = expenses.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  return (
    <div className="app-shell">
      <h1 className="page-title">Expenses</h1>
      <p className="page-subtitle">
        {expenses.length} {expenses.length === 1 ? "expense" : "expenses"}
      </p>
      <div className="card">
        <ul className="expense-list" aria-label="Expenses">
          {pageItems.map((expense) => (
            <li key={expense.id} className="expense-row">
              <div className="expense-main">
                <span className="expense-category">{expense.category}</span>
                <span className="expense-date">{formatDate(expense.date)}</span>
                {expense.notes && <span className="expense-desc">{expense.notes}</span>}
              </div>
              <div className="expense-amount">{formatCurrency(expense.amount)}</div>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => onEditClick(expense)}
              >
                Edit
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div className="form-actions">
        <button type="button" className="btn btn-primary" onClick={onAddExpenseClick}>
          + Add expense
        </button>
      </div>
      {expenses.length > PAGE_SIZE && (
        <nav aria-label="Expense list pagination">
          <button
            type="button"
            className="btn btn-secondary"
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
            className="btn btn-secondary"
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
