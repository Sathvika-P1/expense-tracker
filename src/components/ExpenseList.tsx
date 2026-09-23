import { useState } from "react";
import type { Expense } from "../domain/expense";
import { filterExpensesByKeyword } from "../domain/searchExpenses";

interface ExpenseListProps {
  expenses: Expense[];
  onAddExpenseClick: () => void;
  onEditClick: (expense: Expense) => void;
}

const PAGE_SIZE = 10;

export function ExpenseList({ expenses, onAddExpenseClick, onEditClick }: ExpenseListProps) {
  const [page, setPage] = useState(0);
  const [keyword, setKeyword] = useState("");

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

  const filtered = filterExpensesByKeyword(expenses, keyword);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pageItems = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  const searchInput = (
    <div>
      <label htmlFor="expense-search">Search expenses by keyword</label>
      <input
        id="expense-search"
        type="text"
        value={keyword}
        onChange={(e) => {
          setKeyword(e.target.value);
          setPage(0);
        }}
      />
    </div>
  );

  if (filtered.length === 0) {
    return (
      <div>
        {searchInput}
        <p>No expenses match your search.</p>
      </div>
    );
  }

  return (
    <div>
      {searchInput}
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
          {pageItems.map((expense) => (
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
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {filtered.length > PAGE_SIZE && (
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
