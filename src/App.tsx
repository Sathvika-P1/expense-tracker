import { useRef, useState } from "react";
import { AddExpenseForm } from "./components/AddExpenseForm";
import { ExpenseList } from "./components/ExpenseList";
import { TotalExpensesWidget } from "./components/TotalExpensesWidget";
import { loadExpensesResult, type LoadResult } from "./domain/expenseRepository";

export default function App() {
  const [result, setResult] = useState<LoadResult>(() => loadExpensesResult());
  const formRef = useRef<HTMLDivElement>(null);

  return (
    <main>
      <h1>Expense Tracker</h1>
      <TotalExpensesWidget result={result} />
      <div ref={formRef}>
        <AddExpenseForm onSaved={() => setResult(loadExpensesResult())} />
      </div>
      <ExpenseList
        expenses={result.ok ? result.expenses : []}
        onAddExpenseClick={() => formRef.current?.querySelector("input")?.focus()}
      />
    </main>
  );
}
