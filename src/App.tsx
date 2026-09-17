import { useRef, useState } from "react";
import { AddExpenseForm } from "./components/AddExpenseForm";
import { CategoryFilter } from "./components/CategoryFilter";
import { ExpenseList } from "./components/ExpenseList";
import type { Category } from "./domain/categories";
import { filterExpensesByCategories } from "./domain/categoryFilter";
import type { Expense } from "./domain/expense";
import { loadExpenses } from "./domain/expenseRepository";

export default function App() {
  const [expenses, setExpenses] = useState<Expense[]>(() => loadExpenses());
  const [selectedCategories, setSelectedCategories] = useState<Category[]>([]);
  const formRef = useRef<HTMLDivElement>(null);

  const filteredExpenses = filterExpensesByCategories(expenses, selectedCategories);

  return (
    <main>
      <h1>Expense Tracker</h1>
      <div ref={formRef}>
        <AddExpenseForm onSaved={() => setExpenses(loadExpenses())} />
      </div>
      <CategoryFilter selected={selectedCategories} onChange={setSelectedCategories} />
      <ExpenseList
        expenses={filteredExpenses}
        onAddExpenseClick={() => formRef.current?.querySelector("input")?.focus()}
        filterActive={selectedCategories.length > 0}
      />
    </main>
  );
}
