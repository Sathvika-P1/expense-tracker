import { getCurrentUserId } from "./currentUser";
import type { Expense } from "./expense";
import { isValidDate } from "./monthlySummary";

const STORAGE_KEY = "expenses";

export type LoadResult = { ok: true; expenses: Expense[] } | { ok: false; message: string };

export const SUMMARY_LOAD_ERROR = "We couldn't load your spending data. Please try again later.";

type RawReadResult = { ok: true; data: unknown[] } | { ok: false };

function readRawExpenses(): RawReadResult {
  let raw: string | null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    return { ok: false };
  }
  if (!raw) return { ok: true, data: [] };

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? { ok: true, data: parsed } : { ok: false };
  } catch {
    return { ok: false };
  }
}

function loadAll(): Expense[] {
  const result = readRawExpenses();
  return result.ok ? (result.data as Expense[]) : [];
}

export function loadExpenses(userId: string = getCurrentUserId()): Expense[] {
  return loadAll()
    .filter((expense) => expense.userId === userId)
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function loadExpensesStrict(userId: string = getCurrentUserId()): LoadResult {
  const result = readRawExpenses();
  if (!result.ok) return { ok: false, message: SUMMARY_LOAD_ERROR };

  const userExpenses = (result.data as Expense[]).filter((e) => e?.userId === userId);
  if (userExpenses.some((e) => !isValidDate(e?.date))) {
    return { ok: false, message: SUMMARY_LOAD_ERROR };
  }
  return { ok: true, expenses: userExpenses };
}

export function saveExpense(expense: Expense): Expense[] {
  const result = readRawExpenses();
  if (!result.ok) {
    throw new Error("Unable to read existing expenses; refusing to overwrite stored data.");
  }
  const expenses = [expense, ...(result.data as Expense[])];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
  return expenses;
}
