import { useRef, useState } from "react";
import { AddExpenseForm } from "./components/AddExpenseForm";
import { DateRangeFilter } from "./components/DateRangeFilter";
import { ExpenseList } from "./components/ExpenseList";
import { filterExpensesByDateRange } from "./domain/dateRangeFilter";
import type { Expense } from "./domain/expense";
import { loadExpenses } from "./domain/expenseRepository";

export default function App() {
  const [expenses, setExpenses] = useState<Expense[]>(() => loadExpenses());
  const [range, setRange] = useState({ start: "", end: "", isValid: true });
  const formRef = useRef<HTMLDivElement>(null);

  const visibleExpenses = range.isValid
    ? filterExpensesByDateRange(expenses, range.start, range.end)
    : expenses;

  const emptyMessage =
    range.isValid && (range.start || range.end) && visibleExpenses.length === 0
      ? "No expenses match the selected date range."
      : undefined;

  return (
    <main>
      <h1>Expense Tracker</h1>
      <div ref={formRef}>
        <AddExpenseForm onSaved={() => setExpenses(loadExpenses())} />
      </div>
      <DateRangeFilter onRangeChange={setRange} />
      <ExpenseList
        key={`${range.start}|${range.end}`}
        expenses={visibleExpenses}
        emptyMessage={emptyMessage}
        onAddExpenseClick={() => formRef.current?.querySelector("input")?.focus()}
      />
    </main>
  );
}
