import { useState } from "react";
import type { Expense } from "../domain/expense";

interface ExpenseListProps {
  expenses: Expense[];
  onAddExpenseClick: () => void;
  onDelete?: (id: string) => void;
  hasActiveFilters?: boolean;
}

const PAGE_SIZE = 10;

export function ExpenseList({ expenses, onAddExpenseClick, onDelete, hasActiveFilters }: ExpenseListProps) {
  const [page, setPage] = useState(0);
  const totalPages = Math.max(1, Math.ceil(expenses.length / PAGE_SIZE));
  const clampedPage = Math.min(page, totalPages - 1);

  if (expenses.length === 0) {
    if (hasActiveFilters) {
      return (
        <div role="status">
          <p>No expenses match your filters.</p>
        </div>
      );
    }
    return (
      <div>
        <p>No expenses recorded yet.</p>
        <button type="button" onClick={onAddExpenseClick}>
          Add an expense
        </button>
      </div>
    );
  }

  const pageItems = expenses.slice(clampedPage * PAGE_SIZE, clampedPage * PAGE_SIZE + PAGE_SIZE);

  return (
    <div>
      <table>
        <caption>Expenses</caption>
        <thead>
          <tr>
            <th scope="col">Date</th>
            <th scope="col">Amount</th>
            <th scope="col">Category</th>
            <th scope="col">Description</th>
            {onDelete && <th scope="col">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {pageItems.map((expense) => (
            <tr key={expense.id}>
              <td>{expense.date}</td>
              <td>{expense.amount.toFixed(2)}</td>
              <td>{expense.category}</td>
              <td>{expense.notes ?? ""}</td>
              {onDelete && (
                <td>
                  <button
                    type="button"
                    aria-label={`Delete expense from ${expense.date}, ${expense.notes ?? expense.category}`}
                    onClick={() => {
                      if (window.confirm("Delete this expense? This cannot be undone.")) {
                        onDelete(expense.id);
                      }
                    }}
                  >
                    Delete
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {expenses.length > PAGE_SIZE && (
        <nav aria-label="Expense list pagination">
          <button
            type="button"
            aria-label="Previous page"
            onClick={() => setPage(clampedPage - 1)}
            disabled={clampedPage === 0}
          >
            Previous
          </button>
          <span>
            Page {clampedPage + 1} of {totalPages}
          </span>
          <button
            type="button"
            aria-label="Next page"
            onClick={() => setPage(clampedPage + 1)}
            disabled={clampedPage >= totalPages - 1}
          >
            Next
          </button>
        </nav>
      )}
    </div>
  );
}
