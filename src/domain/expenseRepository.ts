import { recordAuditEntry } from "./auditLog";
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

function isLive(expense: Expense): boolean {
  return expense.deletedAt === undefined;
}

export function loadExpenses(userId: string = getCurrentUserId()): Expense[] {
  return loadAll()
    .filter((expense) => isLive(expense) && expense.userId === userId)
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function findExpenseById(id: string): Expense | undefined {
  return loadAll().find((expense) => isLive(expense) && expense.id === id);
}

export function saveExpense(expense: Expense): Expense[] {
  const expenses = [expense, ...loadAll()];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
  return expenses;
}

export const UNDO_WINDOW_MS = 10_000;

export type DeleteResult =
  | { ok: true; expenses: Expense[]; expense: Expense }
  | { ok: false; error: "invalid-id" | "not-found" | "forbidden" };

function auditDetails(expense: Expense) {
  return {
    id: expense.id,
    amount: expense.amount,
    date: expense.date,
    category: expense.category,
    notes: expense.notes,
  };
}

export function deleteExpense(
  id: string,
  requesterId: string,
  now: number = Date.now(),
): DeleteResult {
  if (id.trim().length === 0) {
    return { ok: false, error: "invalid-id" };
  }

  const all = loadAll();
  const index = all.findIndex((item) => isLive(item) && item.id === id);
  if (index === -1) {
    return { ok: false, error: "not-found" };
  }

  if (all[index].userId !== requesterId) {
    return { ok: false, error: "forbidden" };
  }

  const expense: Expense = { ...all[index], deletedAt: now };
  all[index] = expense;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  recordAuditEntry({
    action: "deleted",
    userId: requesterId,
    timestamp: now,
    expense: auditDetails(expense),
  });
  return { ok: true, expenses: loadExpenses(requesterId), expense };
}

export type RestoreResult = { ok: true; expense: Expense } | { ok: false; error: "not-found" };

export function restoreExpense(
  id: string,
  requesterId: string,
  now: number = Date.now(),
): RestoreResult {
  const all = loadAll();
  const index = all.findIndex(
    (item) => item.id === id && item.userId === requesterId && !isLive(item),
  );
  if (index === -1) {
    return { ok: false, error: "not-found" };
  }

  const { deletedAt: _deletedAt, ...restored } = all[index];
  all[index] = restored;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  recordAuditEntry({
    action: "restored",
    userId: requesterId,
    timestamp: now,
    expense: auditDetails(restored),
  });
  return { ok: true, expense: restored };
}

export function purgeExpiredDeletions(now: number = Date.now()): number {
  const all = loadAll();
  const kept = all.filter(
    (item) => item.deletedAt === undefined || item.deletedAt > now - UNDO_WINDOW_MS,
  );
  if (kept.length !== all.length) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(kept));
  }
  return all.length - kept.length;
}

export function updateExpense(
  id: string,
  input: ExpenseInput,
  loadedUpdatedAt: number | undefined,
  userId: string = getCurrentUserId(),
): UpdateResult {
  const expenses = loadAll();
  const index = expenses.findIndex((expense) => isLive(expense) && expense.id === id);
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
