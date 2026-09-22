import { useRef, useState } from "react";
import { AddExpenseForm } from "./components/AddExpenseForm";
import { ExpenseList } from "./components/ExpenseList";
import type { Expense } from "./domain/expense";
import { loadExpenses } from "./domain/expenseRepository";

export default function App() {
  const [expenses, setExpenses] = useState<Expense[]>(() => loadExpenses());
  const formRef = useRef<HTMLDivElement>(null);

  return (
    <main className="app-shell">
      <h1 className="page-title font-heading">Expense Tracker</h1>
      <p className="section-label">Add expense</p>
      <div ref={formRef}>
        <AddExpenseForm onSaved={() => setExpenses(loadExpenses())} />
      </div>
      <ExpenseList
        expenses={expenses}
        onAddExpenseClick={() => formRef.current?.querySelector("input")?.focus()}
      />
    </main>
  );
}
