import type { Expense } from "../domain/expense";

interface ExpenseListProps {
  expenses: Expense[];
}

export function ExpenseList({ expenses }: ExpenseListProps) {
  if (expenses.length === 0) {
    return <p>No expenses recorded yet.</p>;
  }

  return (
    <ul>
      {expenses.map((expense) => (
        <li key={expense.id}>
          <span>{expense.category}</span>
          <span>{expense.amount.toFixed(2)}</span>
          <span>{expense.date}</span>
          {expense.notes && <p>{expense.notes}</p>}
        </li>
      ))}
    </ul>
  );
}
