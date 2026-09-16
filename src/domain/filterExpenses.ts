import type { Expense } from "./expense";
import type { Category } from "./categories";

export interface ExpenseFilterCriteria {
  startDate?: string;
  endDate?: string;
  category?: Category;
  keyword?: string;
}

export function hasActiveCriteria(criteria: ExpenseFilterCriteria): boolean {
  return Boolean(
    criteria.startDate ||
      criteria.endDate ||
      criteria.category ||
      criteria.keyword?.trim(),
  );
}

export function filterExpenses(expenses: Expense[], criteria: ExpenseFilterCriteria): Expense[] {
  const needle = criteria.keyword?.trim().toLowerCase();
  return expenses.filter((expense) => {
    if (criteria.startDate && expense.date < criteria.startDate) return false;
    if (criteria.endDate && expense.date > criteria.endDate) return false;
    if (criteria.category && expense.category !== criteria.category) return false;
    if (needle && !(expense.notes ?? "").toLowerCase().includes(needle)) return false;
    return true;
  });
}
