import type { Expense } from "./expense";

export interface ExpenseFilters {
  startDate: string;
  endDate: string;
  category: string;
  keyword: string;
}

export const EMPTY_FILTERS: ExpenseFilters = {
  startDate: "",
  endDate: "",
  category: "",
  keyword: "",
};

export function filterExpenses(expenses: Expense[], filters: ExpenseFilters): Expense[] {
  return expenses.filter((expense) => {
    if (filters.startDate && expense.date < filters.startDate) return false;
    if (filters.endDate && expense.date > filters.endDate) return false;
    if (filters.category && expense.category !== filters.category) return false;
    if (
      filters.keyword &&
      !(expense.notes ?? "").toLowerCase().includes(filters.keyword.toLowerCase())
    )
      return false;
    return true;
  });
}
