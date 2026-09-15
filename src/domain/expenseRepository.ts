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

export type DeleteResult =
  | { ok: true; expenses: Expense[] }
  | { ok: false; error: "invalid-id" | "not-found" | "forbidden" };

export function deleteExpense(id: string, requesterId: string): DeleteResult {
  if (id.trim().length === 0) {
    return { ok: false, error: "invalid-id" };
  }

  const expenses = loadExpenses();
  const expense = expenses.find((item) => item.id === id);
  if (!expense) {
    return { ok: false, error: "not-found" };
  }

  if (expense.createdBy !== undefined && expense.createdBy !== requesterId) {
    return { ok: false, error: "forbidden" };
  }

  const remaining = expenses.filter((item) => item.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(remaining));
  return { ok: true, expenses: remaining };
}
