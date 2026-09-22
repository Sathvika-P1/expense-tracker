import { useState } from "react";
import type { Expense } from "../domain/expense";

interface ExpenseListProps {
  expenses: Expense[];
  onAddExpenseClick: () => void;
}

const PAGE_SIZE = 10;

export function ExpenseList({ expenses, onAddExpenseClick }: ExpenseListProps) {
  const [page, setPage] = useState(0);

  if (expenses.length === 0) {
    return (
      <div className="card empty-state">
        <p>No expenses recorded yet.</p>
        <button className="btn btn-secondary" type="button" onClick={onAddExpenseClick}>
          Add an expense
        </button>
      </div>
    );
  }

  const totalPages = Math.ceil(expenses.length / PAGE_SIZE);
  const pageItems = expenses.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  return (
    <div>
      <div className="list-meta">
        <span className="count">
          {expenses.length} expense{expenses.length === 1 ? "" : "s"}
        </span>
      </div>
      <table className="expense-table">
        <caption>Expenses</caption>
        <thead>
          <tr>
            <th scope="col">Date</th>
            <th scope="col">Amount</th>
            <th scope="col">Category</th>
            <th scope="col">Description</th>
          </tr>
        </thead>
        <tbody>
          {pageItems.map((expense) => (
            <tr key={expense.id}>
              <td>{expense.date}</td>
              <td>{expense.amount.toFixed(2)}</td>
              <td>{expense.category}</td>
              <td>{expense.notes ?? ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {expenses.length > PAGE_SIZE && (
        <nav className="pagination" aria-label="Expense list pagination">
          <button
            className="btn btn-secondary"
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
            className="btn btn-secondary"
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
