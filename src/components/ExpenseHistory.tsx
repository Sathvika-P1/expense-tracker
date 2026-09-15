import { loadAuditRecords } from "../domain/auditRepository";

interface ExpenseHistoryProps {
  expenseId: string;
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
          <span>
            {entry.before.amount} → {entry.after.amount}
          </span>
        </li>
      ))}
    </ul>
  );
}
