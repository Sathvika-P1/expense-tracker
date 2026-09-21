import type { LoadResult } from "../domain/expenseRepository";

interface TotalExpensesWidgetProps {
  result: LoadResult;
}

export function TotalExpensesWidget({ result }: TotalExpensesWidgetProps) {
  if (!result.ok) {
    return (
      <div>
        <p role="alert">
          {result.reason === "unavailable"
            ? "Unable to access your expense data. Please check your browser storage settings."
            : "Your expense data appears to be corrupted and could not be loaded."}
        </p>
      </div>
    );
  }

  const total = result.expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(total);

  return (
    <div>
      <h2>Total Expenses</h2>
      <p data-testid="total-expenses-amount">{formatted}</p>
    </div>
  );
}
