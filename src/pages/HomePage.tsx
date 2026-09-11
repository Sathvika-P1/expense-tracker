import { useState } from "react";
import { AddExpenseForm } from "../components/AddExpenseForm";
import { ExpenseList } from "../components/ExpenseList";
import type { Expense } from "../domain/expense";
import { loadExpenses } from "../domain/expenseRepository";

export function HomePage() {
  const [expenses, setExpenses] = useState<Expense[]>(() => loadExpenses());

  return (
    <div>
      <h1>Expense Tracker</h1>
      <AddExpenseForm onSaved={() => setExpenses(loadExpenses())} />
      <ExpenseList expenses={expenses} />
    </div>
  );
}
