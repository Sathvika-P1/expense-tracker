import { useRef, useState } from "react";
import { AddExpenseForm } from "./components/AddExpenseForm";
import { ExpenseFilters } from "./components/ExpenseFilters";
import { ExpenseList } from "./components/ExpenseList";
import type { Expense } from "./domain/expense";
import { deleteExpense, loadExpenses } from "./domain/expenseRepository";
import { filterExpenses, hasActiveCriteria, type ExpenseFilterCriteria } from "./domain/filterExpenses";

export default function App() {
  const [expenses, setExpenses] = useState<Expense[]>(() => loadExpenses());
  const [criteria, setCriteria] = useState<ExpenseFilterCriteria>({});
  const formRef = useRef<HTMLDivElement>(null);

  const filteredExpenses = filterExpenses(expenses, criteria);
  const hasActiveFilters = hasActiveCriteria(criteria);

  return (
    <main>
      <h1>Expense Tracker</h1>
      <div ref={formRef}>
        <AddExpenseForm onSaved={() => setExpenses(loadExpenses())} />
      </div>
      <ExpenseFilters criteria={criteria} onChange={setCriteria} />
      <ExpenseList
        expenses={filteredExpenses}
        onAddExpenseClick={() => formRef.current?.querySelector("input")?.focus()}
        onDelete={(id) => {
          deleteExpense(id);
          setExpenses(loadExpenses());
        }}
        hasActiveFilters={hasActiveFilters}
      />
    </main>
  );
}
