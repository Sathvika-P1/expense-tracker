import type { AuditEntry } from "../domain/auditRepository";
import { loadAuditRecords } from "../domain/auditRepository";
import type { ExpenseEditableFields } from "../domain/expense";

interface ExpenseHistoryProps {
  expenseId: string;
}

const FIELD_LABELS: Record<keyof ExpenseEditableFields, string> = {
  amount: "Amount",
  date: "Date",
  category: "Category",
  notes: "Description",
  receipt: "Receipt",
};

function receiptLabel(receipt: ExpenseEditableFields["receipt"]): string {
  return receipt ? receipt.name : "(none)";
}

function fieldChanges(entry: AuditEntry): { label: string; before: string; after: string }[] {
  return (Object.keys(FIELD_LABELS) as (keyof ExpenseEditableFields)[])
    .filter((field) => {
      if (field === "receipt") {
        return entry.before.receipt?.dataUrl !== entry.after.receipt?.dataUrl;
      }
      return entry.before[field] !== entry.after[field];
    })
    .map((field) => ({
      label: FIELD_LABELS[field],
      before: field === "receipt" ? receiptLabel(entry.before.receipt) : String(entry.before[field] ?? ""),
      after: field === "receipt" ? receiptLabel(entry.after.receipt) : String(entry.after[field] ?? ""),
    }));
}

export function ExpenseHistory({ expenseId }: ExpenseHistoryProps) {
  const entries = loadAuditRecords(expenseId);

  if (entries.length === 0) {
    return <p>No edit history for this expense.</p>;
  }

  return (
    <ul>
      {entries.map((entry) => (
        <li key={entry.id}>
          <span>{new Date(entry.editedAt).toLocaleString()}</span>
          <span>{entry.editorId}</span>
          <ul>
            {fieldChanges(entry).map((change) => (
              <li key={change.label}>
                {change.label}: {change.before} → {change.after}
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ul>
  );
}
