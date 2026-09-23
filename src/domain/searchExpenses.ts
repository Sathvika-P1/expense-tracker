import type { Expense } from "./expense";

export function searchExpenses(expenses: Expense[], term: string): Expense[] {
  const normalized = term.trim().toLowerCase();
  if (!normalized) {
    return expenses;
  }

  return expenses.filter(
    (expense) =>
      expense.category.toLowerCase().includes(normalized) ||
      (expense.notes ?? "").toLowerCase().includes(normalized),
  );
}
