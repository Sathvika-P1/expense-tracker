import type { Category } from "./categories";
import type { Expense } from "./expense";

export function filterExpensesByCategories(expenses: Expense[], selected: Category[]): Expense[] {
  if (selected.length === 0) {
    return expenses;
  }

  return expenses.filter((expense) => selected.includes(expense.category));
}
