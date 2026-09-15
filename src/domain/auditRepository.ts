import type { ExpenseEditableFields } from "./expense";

const STORAGE_KEY = "expense-audit-log";

export interface AuditEntry {
  id: string;
  expenseId: string;
  editedAt: number;
  editorId: string;
  before: ExpenseEditableFields;
  after: ExpenseEditableFields;
}

function loadAllAuditRecords(): AuditEntry[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as AuditEntry[]) : [];
  } catch {
    return [];
  }
}

export function loadAuditRecords(expenseId: string): AuditEntry[] {
  return loadAllAuditRecords().filter((entry) => entry.expenseId === expenseId);
}

export function recordEdit(entry: Omit<AuditEntry, "id" | "editedAt">): AuditEntry {
  const fullEntry: AuditEntry = {
    id: crypto.randomUUID(),
    editedAt: Date.now(),
    ...entry,
  };
  const entries = [fullEntry, ...loadAllAuditRecords()];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  return fullEntry;
}
