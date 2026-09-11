import { useRef, useState } from "react";
import { AddExpenseForm } from "../components/AddExpenseForm";
import { ExpenseList } from "../components/ExpenseList";
import type { Expense } from "../domain/expense";
import { loadExpenses } from "../domain/expenseRepository";

export function HomePage() {
  const [expenses, setExpenses] = useState<Expense[]>(() => loadExpenses());
  const formRef = useRef<HTMLDivElement>(null);

  return (
    <div>
      <h1>Expense Tracker</h1>
      <div ref={formRef}>
        <AddExpenseForm onSaved={() => setExpenses(loadExpenses())} />
      </div>
      <ExpenseList
        expenses={expenses}
        onAddExpenseClick={() => formRef.current?.querySelector("input")?.focus()}
      />
    </div>
  );
}
