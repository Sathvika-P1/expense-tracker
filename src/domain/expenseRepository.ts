import { getCurrentUserId } from "./currentUser";
import type { Expense } from "./expense";
import { isValidDate } from "./monthlySummary";

const STORAGE_KEY = "expenses";

export type LoadResult = { ok: true; expenses: Expense[] } | { ok: false; message: string };

export const SUMMARY_LOAD_ERROR = "We couldn't load your spending data. Please try again later.";

function loadAll(): Expense[] {
  let raw: string | null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    return [];
  }
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

export function loadExpensesStrict(userId: string = getCurrentUserId()): LoadResult {
  let raw: string | null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    return { ok: false, message: SUMMARY_LOAD_ERROR };
  }
  if (!raw) return { ok: true, expenses: [] };

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, message: SUMMARY_LOAD_ERROR };
  }
  if (!Array.isArray(parsed)) return { ok: false, message: SUMMARY_LOAD_ERROR };

  const userExpenses = (parsed as Expense[]).filter((e) => e?.userId === userId);
  if (userExpenses.some((e) => !isValidDate(e?.date))) {
    return { ok: false, message: SUMMARY_LOAD_ERROR };
  }
  return { ok: true, expenses: userExpenses };
}

export function saveExpense(expense: Expense): Expense[] {
  const expenses = [expense, ...loadAll()];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
  return expenses;
}
