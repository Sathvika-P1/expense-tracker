import { useState } from "react";
import type { Expense } from "../domain/expense";
import "./ExpenseList.css";

interface ExpenseListProps {
  expenses: Expense[];
  onAddExpenseClick: () => void;
}

const PAGE_SIZE = 10;

export function ExpenseList({ expenses, onAddExpenseClick }: ExpenseListProps) {
  const [page, setPage] = useState(0);

  if (expenses.length === 0) {
    return (
      <div>
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
    <div className="expense-list">
      <table className="expense-table">
        <caption>Expenses</caption>
        <colgroup>
          <col className="col-date" />
          <col className="col-amount" />
          <col className="col-category" />
          <col className="col-notes" />
        </colgroup>
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
              <td>
                <span className="chip">{expense.category}</span>
              </td>
              <td>{expense.notes ?? ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="expense-cards">
        {pageItems.map((expense) => (
          <div className="expense-card" key={expense.id}>
            <div className="expense-card-row1">
              <span className="expense-card-amount">{expense.amount.toFixed(2)}</span>
              <span className="expense-card-date">{expense.date}</span>
            </div>
            <span className="chip">{expense.category}</span>
            <p className="expense-card-notes">{expense.notes ?? ""}</p>
          </div>
        ))}
      </div>
      {expenses.length > PAGE_SIZE && (
        <nav className="pagination" aria-label="Expense list pagination">
          <button
            type="button"
            className="btn btn-secondary"
            aria-label="Previous page"
            onClick={() => setPage((p) => p - 1)}
            disabled={page === 0}
          >
            Previous
          </button>
          <span className="pagination-label">
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
