import type { Expense } from "./expense";

export interface AuditEntry {
  action: "delete";
  deletedBy: string;
  deletedAt: number;
  expense: Expense;
}

export const AUDIT_STORAGE_KEY = "expenseAuditLog";

export function loadAuditLog(): AuditEntry[] {
  const raw = localStorage.getItem(AUDIT_STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as AuditEntry[]) : [];
  } catch {
    return [];
  }
}

function writeAuditLog(entries: AuditEntry[]): boolean {
  try {
    localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(entries));
    return true;
  } catch {
    return false;
  }
}

export function appendAuditEntry(entry: AuditEntry): boolean {
  return writeAuditLog([...loadAuditLog(), entry]);
}

export function removeLastAuditEntry(): boolean {
  return writeAuditLog(loadAuditLog().slice(0, -1));
}

// Returns [] when a complete entry exists for the expense, else the reasons it is incomplete.
export function findAuditGaps(expense: Expense, entries: AuditEntry[]): string[] {
  const entry = entries.find((item) => item.expense?.id === expense.id);
  if (!entry) return ["no-entry"];

  const gaps: string[] = [];
  if (typeof entry.deletedBy !== "string" || entry.deletedBy.trim() === "") {
    gaps.push("missing-user");
  }
  if (typeof entry.deletedAt !== "number" || Number.isNaN(entry.deletedAt)) {
    gaps.push("missing-timestamp");
  }
  if (JSON.stringify(sortKeys(entry.expense)) !== JSON.stringify(sortKeys(expense))) {
    gaps.push("missing-details");
  }
  return gaps;
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, item]) => [key, sortKeys(item)]),
    );
  }
  return value;
}
