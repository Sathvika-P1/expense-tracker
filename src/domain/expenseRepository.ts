import { getCurrentUserId } from "./currentUser";
import type { Category } from "./categories";
import type { Expense, ExpenseInput } from "./expense";

export type UpdateResult =
  | { ok: true; expense: Expense }
  | { ok: false; reason: "not_found" | "unauthorized" | "conflict" };

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

export function findExpenseById(id: string): Expense | undefined {
  return loadAll().find((expense) => expense.id === id);
}

export function saveExpense(expense: Expense): Expense[] {
  const expenses = [expense, ...loadAll()];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
  return expenses;
}

export function updateExpense(
  id: string,
  input: ExpenseInput,
  loadedUpdatedAt: number | undefined,
  userId: string = getCurrentUserId(),
): UpdateResult {
  const expenses = loadAll();
  const index = expenses.findIndex((expense) => expense.id === id);
  if (index === -1) {
    return { ok: false, reason: "not_found" };
  }

  const record = expenses[index];
  if (record.userId !== userId) {
    return { ok: false, reason: "unauthorized" };
  }

  if (record.updatedAt !== loadedUpdatedAt) {
    return { ok: false, reason: "conflict" };
  }

  const updated: Expense = {
    ...record,
    amount: Number(input.amount),
    date: input.date,
    category: input.category as Category,
    notes: input.notes || undefined,
    updatedAt: Date.now(),
  };
  expenses[index] = updated;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
  return { ok: true, expense: updated };
}
