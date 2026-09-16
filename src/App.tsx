import { useRef, useState } from "react";
import { AddExpenseForm } from "./components/AddExpenseForm";
import { ExpenseList } from "./components/ExpenseList";
import { MonthlySummary } from "./components/MonthlySummary";
import type { Expense } from "./domain/expense";
import { loadExpenses, loadExpensesStrict, type LoadResult } from "./domain/expenseRepository";

export default function App() {
  const [expenses, setExpenses] = useState<Expense[]>(() => loadExpenses());
  const [summaryResult, setSummaryResult] = useState<LoadResult>(() => loadExpensesStrict());
  const formRef = useRef<HTMLDivElement>(null);

  const refresh = () => {
    setExpenses(loadExpenses());
    setSummaryResult(loadExpensesStrict());
  };

  return (
    <main>
      <h1>Expense Tracker</h1>
      <div ref={formRef}>
        <AddExpenseForm onSaved={refresh} />
      </div>
      <ExpenseList
        expenses={expenses}
        onAddExpenseClick={() => formRef.current?.querySelector("input")?.focus()}
      />
      <MonthlySummary result={summaryResult} />
    </main>
  );
}
