import { useState } from "react";
import { AddExpenseForm } from "../../components/AddExpenseForm";
import { ExpenseList } from "../../components/ExpenseList";
import type { Expense } from "../../domain/expense";
import { loadExpenses } from "../../domain/expenseRepository";

export function ExpensePage() {
  const [expenses, setExpenses] = useState<Expense[]>(() => loadExpenses());

  return (
    <section>
      <h2>Expenses</h2>
      <AddExpenseForm onSaved={() => setExpenses(loadExpenses())} />
      <ExpenseList expenses={expenses} />
    </section>
  );
}
