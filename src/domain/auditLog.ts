export interface AuditEntry {
  action: "deleted" | "restored";
  userId: string;
  timestamp: number;
  expense: { id: string; amount: number; date: string; category: string; notes?: string };
}

const AUDIT_STORAGE_KEY = "audit-log";

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

export function recordAuditEntry(entry: AuditEntry): void {
  localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify([entry, ...loadAuditLog()]));
}
