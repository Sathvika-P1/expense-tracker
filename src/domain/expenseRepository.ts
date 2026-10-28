import { appendAuditEntry, removeAuditEntry, type AuditEntry } from "./auditLog";
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

export type DeleteResult =
  | { ok: true; expenses: Expense[] }
  | { ok: false; error: "invalid-id" | "not-found" | "forbidden" | "audit-failed" };

export function deleteExpense(id: string, requesterId: string): DeleteResult {
  if (id.trim().length === 0) {
    return { ok: false, error: "invalid-id" };
  }

  const expenses = loadAll();
  const expense = expenses.find((item) => item.id === id);
  if (!expense) {
    return { ok: false, error: "not-found" };
  }

  if (expense.createdBy !== undefined && expense.createdBy !== requesterId) {
    return { ok: false, error: "forbidden" };
  }

  // Finalized expenses are audited before removal; no audit means no deletion.
  let auditEntry: AuditEntry | undefined;
  if (expense.finalized === true) {
    auditEntry = {
      action: "delete",
      deletedBy: requesterId,
      deletedAt: Date.now(),
      expense: { ...expense },
    };
    if (!appendAuditEntry(auditEntry)) {
      return { ok: false, error: "audit-failed" };
    }
  }

  const remaining = expenses.filter((item) => item.id !== id);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(remaining));
  } catch (error) {
    if (auditEntry && !removeAuditEntry(auditEntry)) {
      console.error("Failed to roll back audit entry for a deletion that did not happen.");
    }
    throw error;
  }
  return { ok: true, expenses: remaining };
}

// Every deletion path must be registered here so the audit coverage gate checks it.
export const DELETION_PATHS: ReadonlyArray<{
  name: string;
  run: (id: string, userId: string) => DeleteResult;
}> = [{ name: "deleteExpense", run: deleteExpense }];

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
