import { useRef, useState } from "react";
import { AddExpenseForm } from "./components/AddExpenseForm";
import { ExpenseList } from "./components/ExpenseList";
import type { Expense } from "./domain/expense";
import { loadExpenses } from "./domain/expenseRepository";
import { searchExpenses } from "./domain/searchExpenses";

export default function App() {
  const [expenses, setExpenses] = useState<Expense[]>(() => loadExpenses());
  const [searchInput, setSearchInput] = useState("");
  const [submittedTerm, setSubmittedTerm] = useState("");
  const formRef = useRef<HTMLDivElement>(null);

  const visibleExpenses = searchExpenses(expenses, submittedTerm);

  const handleClearSearch = () => {
    setSearchInput("");
    setSubmittedTerm("");
  };

  return (
    <main>
      <h1>Expense Tracker</h1>
      <div ref={formRef}>
        <AddExpenseForm onSaved={() => setExpenses(loadExpenses())} />
      </div>
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          setSubmittedTerm(searchInput.trim());
        }}
      >
        <label htmlFor="search-input">Search expenses</label>
        <input
          id="search-input"
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
        <button type="submit">Search</button>
      </form>
      <p role="status">
        {!submittedTerm
          ? `Showing all ${expenses.length} expense${expenses.length === 1 ? "" : "s"}`
          : visibleExpenses.length > 0
            ? `${visibleExpenses.length} result${visibleExpenses.length === 1 ? "" : "s"} for "${submittedTerm}"`
            : ""}
      </p>
      <ExpenseList
        key={submittedTerm}
        expenses={visibleExpenses}
        onAddExpenseClick={() => formRef.current?.querySelector("input")?.focus()}
        searchTerm={submittedTerm}
        onClearSearch={handleClearSearch}
      />
    </main>
  );
}
