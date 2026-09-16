import { useId } from "react";
import type { LoadResult } from "../domain/expenseRepository";
import { groupByMonth } from "../domain/monthlySummary";

interface MonthlySummaryProps {
  result: LoadResult;
}

export function MonthlySummary({ result }: MonthlySummaryProps) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId}>
      <h2 id={headingId}>Monthly Spending</h2>
      {!result.ok && <p role="alert">{result.message}</p>}
      {result.ok && result.expenses.length === 0 && <p>No spending data available yet.</p>}
      {result.ok && result.expenses.length > 0 && (
        <ul>
          {groupByMonth(result.expenses).map((m) => (
            <li key={m.key}>
              <span>{m.label}</span>
              <span>{m.total.toFixed(2)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
