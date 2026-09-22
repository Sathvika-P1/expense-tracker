import { getCurrentUserId } from "./currentUser";
import type { Expense } from "./expense";

const STORAGE_KEY = "expenses";

function loadAll(): Expense[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Expense[]) : [];
  } catch {
    return [];
  }
}

export function loadExpenses(userId: string = getCurrentUserId()): Expense[] {
  return loadAll()
    .filter((expense) => expense.userId === userId)
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function saveExpense(expense: Expense): Expense[] {
  const expenses = [expense, ...loadAll()];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
  return expenses;
}

export function updateExpense(updated: Expense): Expense[] {
  const expenses = loadAll().map((expense) => (expense.id === updated.id ? updated : expense));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
  return expenses;
}

export function deleteExpense(id: string): Expense[] {
  const expenses = loadAll().filter((expense) => expense.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
  return expenses;
}
