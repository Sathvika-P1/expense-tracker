import type { Expense } from "./expense";

const STORAGE_KEY = "expenses";

export function loadExpenses(): Expense[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Expense[]) : [];
  } catch {
    return [];
  }
}

export function saveExpense(expense: Expense): Expense[] {
  const expenses = [expense, ...loadExpenses()];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
  return expenses;
}
