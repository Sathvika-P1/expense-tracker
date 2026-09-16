import { useState } from "react";
import type { Expense } from "../domain/expense";

interface ExpenseListProps {
  expenses: Expense[];
  hasActiveFilters: boolean;
  onAddExpenseClick: () => void;
  onClearFilters: () => void;
}

const PAGE_SIZE = 10;

export function ExpenseList({
  expenses,
  hasActiveFilters,
  onAddExpenseClick,
  onClearFilters,
}: ExpenseListProps) {
  const [page, setPage] = useState(0);
  const [prevExpenses, setPrevExpenses] = useState(expenses);

  // Reset synchronously during render (not in an effect) to avoid a stale out-of-range page flash.
  let currentPage = page;
  if (expenses !== prevExpenses) {
    setPrevExpenses(expenses);
    setPage(0);
    currentPage = 0;
  }

  if (expenses.length === 0) {
    return (
      <div>
        {hasActiveFilters ? (
          <>
            <p>No matching expenses found.</p>
            <button type="button" onClick={onClearFilters}>
              Clear all filters
            </button>
          </>
        ) : (
          <>
            <p>No expenses recorded yet.</p>
            <button type="button" onClick={onAddExpenseClick}>
              Add an expense
            </button>
          </>
        )}
      </div>
    );
  }

  const totalPages = Math.ceil(expenses.length / PAGE_SIZE);
  const pageItems = expenses.slice(currentPage * PAGE_SIZE, currentPage * PAGE_SIZE + PAGE_SIZE);

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
        <nav aria-label="Expense list pagination">
          <button
            type="button"
            aria-label="Previous page"
            onClick={() => setPage((p) => p - 1)}
            disabled={currentPage === 0}
          >
            Previous
          </button>
          <span>
            Page {currentPage + 1} of {totalPages}
          </span>
          <button
            type="button"
            aria-label="Next page"
            onClick={() => setPage((p) => p + 1)}
            disabled={currentPage >= totalPages - 1}
          >
            Next
          </button>
        </nav>
      )}
    </div>
  );
}
