import { recordEdit } from "./auditRepository";
import { CURRENT_USER_ID } from "./currentUser";
import { ForbiddenError } from "./errors";
import type { Expense, ExpenseEditableFields } from "./expense";

const STORAGE_KEY = "expenses";

function withDefaults(expense: Partial<Expense>): Expense {
  return {
    status: "draft",
    ownerId: CURRENT_USER_ID,
    ...expense,
  } as Expense;
}

export function loadExpenses(): Expense[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Partial<Expense>[]).map(withDefaults) : [];
  } catch {
    return [];
  }
}

export function saveExpense(expense: Expense): Expense[] {
  const expenses = [expense, ...loadExpenses()];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
  return expenses;
}

function toEditableFields(expense: Expense): ExpenseEditableFields {
  return {
    amount: expense.amount,
    date: expense.date,
    category: expense.category,
    notes: expense.notes,
    receipt: expense.receipt,
  };
}

export function updateExpense(
  id: string,
  changes: Partial<ExpenseEditableFields>,
  editorId: string,
): Expense {
  const expenses = loadExpenses();
  const index = expenses.findIndex((expense) => expense.id === id);
  if (index === -1) {
    throw new Error(`Expense ${id} not found.`);
  }

  const existing = expenses[index];
  if (existing.ownerId !== editorId) {
    throw new ForbiddenError();
  }

  const before = toEditableFields(existing);
  const updated: Expense = { ...existing, ...changes };
  expenses[index] = updated;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));

  recordEdit({
    expenseId: id,
    editorId,
    before,
    after: toEditableFields(updated),
  });

  return updated;
}
