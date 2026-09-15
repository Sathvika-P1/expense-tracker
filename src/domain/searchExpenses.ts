import type { Expense } from "./expense";

export function filterExpensesByKeyword(expenses: Expense[], keyword: string): Expense[] {
  const trimmed = keyword.trim();
  if (trimmed === "") {
    return expenses;
  }

  const lowerKeyword = trimmed.toLowerCase();
  return expenses.filter((expense) => (expense.notes ?? "").toLowerCase().includes(lowerKeyword));
}
