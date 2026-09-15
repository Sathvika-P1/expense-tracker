import { useRef, useState } from "react";
import { AddExpenseForm } from "./components/AddExpenseForm";
import { ExpenseFiltersForm } from "./components/ExpenseFiltersForm";
import { ExpenseList } from "./components/ExpenseList";
import type { Expense } from "./domain/expense";
import { EMPTY_FILTERS, filterExpenses, type ExpenseFilters } from "./domain/expenseFilters";
import { loadExpenses } from "./domain/expenseRepository";

export default function App() {
  const [expenses, setExpenses] = useState<Expense[]>(() => loadExpenses());
  const [filters, setFilters] = useState<ExpenseFilters>(EMPTY_FILTERS);
  const formRef = useRef<HTMLDivElement>(null);

  const visibleExpenses = filterExpenses(expenses, filters);

  return (
    <main>
      <h1>Expense Tracker</h1>
      <div ref={formRef}>
        <AddExpenseForm onSaved={() => setExpenses(loadExpenses())} />
      </div>
      <ExpenseFiltersForm
        filters={filters}
        onChange={setFilters}
        onClear={() => setFilters(EMPTY_FILTERS)}
      />
      <ExpenseList
        expenses={visibleExpenses}
        onAddExpenseClick={() => formRef.current?.querySelector("input")?.focus()}
      />
    </main>
  );
}
