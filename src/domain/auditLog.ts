import type { Expense } from "./expense";

export interface AuditEntry {
  action: "delete";
  deletedBy: string;
  deletedAt: number;
  expense: Expense;
}

export const AUDIT_STORAGE_KEY = "expenseAuditLog";

// null means a value is stored but unreadable; callers must not overwrite it.
function readAuditLog(): AuditEntry[] | null {
  const raw = localStorage.getItem(AUDIT_STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as AuditEntry[]) : null;
  } catch {
    return null;
  }
}

export function loadAuditLog(): AuditEntry[] {
  return readAuditLog() ?? [];
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
  const entries = readAuditLog();
  if (entries === null) {
    console.error("Audit log is unreadable; refusing to overwrite it.");
    return false;
  }
  return writeAuditLog([...entries, entry]);
}

export function removeAuditEntry(entry: AuditEntry): boolean {
  const entries = readAuditLog();
  if (entries === null) return false;
  const index = entries.map((item) => item.deletedAt === entry.deletedAt &&
      item.deletedBy === entry.deletedBy &&
      item.expense?.id === entry.expense.id).lastIndexOf(true);
  if (index === -1) return true;
  return writeAuditLog(entries.filter((_, i) => i !== index));
}

// Returns [] when a complete entry exists for the expense, else the reasons it is incomplete.
export function findAuditGaps(expense: Expense, entries: AuditEntry[]): string[] {
  const entry = [...entries].reverse().find((item) => item.expense?.id === expense.id);
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
