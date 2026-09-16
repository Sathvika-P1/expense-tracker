import { useRef, useState } from "react";
import { AddExpenseForm } from "./components/AddExpenseForm";
import { ExpenseFiltersForm } from "./components/ExpenseFiltersForm";
import { ExpenseList } from "./components/ExpenseList";
import type { Expense } from "./domain/expense";
import {
  EMPTY_FILTERS,
  filterExpenses,
  hasActiveFilters,
  type ExpenseFilters,
} from "./domain/expenseFilters";
import { loadExpenses } from "./domain/expenseRepository";

export default function App() {
  const [expenses, setExpenses] = useState<Expense[]>(() => loadExpenses());
  const [filters, setFilters] = useState<ExpenseFilters>(EMPTY_FILTERS);
  const formRef = useRef<HTMLDivElement>(null);

  const visibleExpenses = filterExpenses(expenses, filters);
  const clearFilters = () => setFilters(EMPTY_FILTERS);

  return (
    <main>
      <h1>Expense Tracker</h1>
      <div ref={formRef}>
        <AddExpenseForm onSaved={() => setExpenses(loadExpenses())} />
      </div>
      <ExpenseFiltersForm filters={filters} onChange={setFilters} onClear={clearFilters} />
      <ExpenseList
        expenses={visibleExpenses}
        hasActiveFilters={hasActiveFilters(filters)}
        onAddExpenseClick={() => formRef.current?.querySelector("input")?.focus()}
        onClearFilters={clearFilters}
      />
    </main>
  );
}
