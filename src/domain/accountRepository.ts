import { deleteExpensesByUser } from "./expenseRepository";

export interface Account {
  id: string;
  email: string;
  password: string;
}

export type DeleteAccountResult =
  | { ok: true }
  | { ok: false; reason: "session-expired" | "failed" };

const ACCOUNTS_KEY = "accounts";
const SESSION_KEY = "session";
const EXPENSES_KEY = "expenses";

function loadAccounts(): Account[] {
  const raw = localStorage.getItem(ACCOUNTS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Account[]) : [];
  } catch {
    return [];
  }
}

export function authenticate(email: string, password: string): Account | undefined {
  return loadAccounts().find((a) => a.email === email && a.password === password);
}

export function getSessionUserId(): string | null {
  return localStorage.getItem(SESSION_KEY);
}

export function getSessionAccount(): Account | undefined {
  const id = getSessionUserId();
  return id === null ? undefined : loadAccounts().find((a) => a.id === id);
}

function restore(key: string, raw: string | null) {
  try {
    if (raw === null) localStorage.removeItem(key);
    else localStorage.setItem(key, raw);
  } catch {
    // best effort: nothing more can be done if storage is unavailable
  }
}

export function deleteAccount(userId: string): DeleteAccountResult {
  if (getSessionUserId() !== userId) {
    return { ok: false, reason: "session-expired" };
  }

  const accountsSnapshot = localStorage.getItem(ACCOUNTS_KEY);
  const expensesSnapshot = localStorage.getItem(EXPENSES_KEY);
  try {
    const remaining = loadAccounts().filter((a) => a.id !== userId);
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(remaining));
    deleteExpensesByUser(userId);
    localStorage.removeItem(SESSION_KEY);
    return { ok: true };
  } catch {
    restore(ACCOUNTS_KEY, accountsSnapshot);
    restore(EXPENSES_KEY, expensesSnapshot);
    restore(SESSION_KEY, userId);
    return { ok: false, reason: "failed" };
  }
}
