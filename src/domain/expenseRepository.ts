import { getCurrentUserId } from "./currentUser";
import type { Expense } from "./expense";
import { isValidDate } from "./monthlySummary";

const STORAGE_KEY = "expenses";

export type LoadResult = { ok: true; expenses: Expense[] } | { ok: false; message: string };

export const SUMMARY_LOAD_ERROR = "We couldn't load your spending data. Please try again later.";

type RawReadResult = { ok: true; data: unknown[] } | { ok: false };

function readRawExpenses(userId: string): RawReadResult {
  let raw: string | null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch (error) {
    console.error("[expenseRepository] localStorage.getItem failed", { userId, error });
    return { ok: false };
  }
  if (!raw) return { ok: true, data: [] };

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      console.error("[expenseRepository] stored expenses payload is not an array", {
        userId,
        raw: raw.slice(0, 200),
      });
      return { ok: false };
    }
    return { ok: true, data: parsed };
  } catch (error) {
    console.error("[expenseRepository] failed to parse stored expenses", {
      userId,
      raw: raw.slice(0, 200),
      error,
    });
    return { ok: false };
  }
}

function loadAll(userId: string): Expense[] {
  const result = readRawExpenses(userId);
  return result.ok ? (result.data as Expense[]) : [];
}

export function loadExpenses(userId: string = getCurrentUserId()): Expense[] {
  return loadAll(userId)
    .filter((expense) => expense.userId === userId)
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function loadExpensesStrict(userId: string = getCurrentUserId()): LoadResult {
  const result = readRawExpenses(userId);
  if (!result.ok) return { ok: false, message: SUMMARY_LOAD_ERROR };

  const userExpenses = (result.data as Expense[]).filter((e) => e?.userId === userId);
  const invalidDateExpenses = userExpenses.filter((e) => !isValidDate(e?.date));
  if (invalidDateExpenses.length > 0) {
    console.warn("[expenseRepository] expenses with invalid dates", {
      userId,
      invalid: invalidDateExpenses.map((e) => ({ id: e?.id, date: e?.date })),
    });
    return { ok: false, message: SUMMARY_LOAD_ERROR };
  }
  return { ok: true, expenses: userExpenses };
}

export function saveExpense(expense: Expense): Expense[] {
  const result = readRawExpenses(expense.userId);
  if (!result.ok) {
    console.error("[expenseRepository] saveExpense aborted: unable to read existing expenses", {
      userId: expense.userId,
      expenseId: expense.id,
    });
    throw new Error("Unable to read existing expenses; refusing to overwrite stored data.");
  }
  const expenses = [expense, ...(result.data as Expense[])];
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
  } catch (error) {
    console.error("[expenseRepository] localStorage.setItem failed", {
      userId: expense.userId,
      expenseId: expense.id,
      count: expenses.length,
      error,
    });
    throw new Error("Unable to save expense.");
  }
  console.info("[expenseRepository] saved expense", { userId: expense.userId, expenseId: expense.id });
  return expenses;
}
