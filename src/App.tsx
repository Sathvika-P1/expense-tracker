import { useRef, useState } from "react";
import { AddExpenseForm } from "./components/AddExpenseForm";
import { EditExpenseForm } from "./components/EditExpenseForm";
import { ExpenseList } from "./components/ExpenseList";
import { getCurrentUserId } from "./domain/currentUser";
import type { Expense } from "./domain/expense";
import { loadExpenses } from "./domain/expenseRepository";

type View =
  | { mode: "list" }
  | { mode: "edit"; expense: Expense }
  | { mode: "access-denied" };

export default function App() {
  const [expenses, setExpenses] = useState<Expense[]>(() => loadExpenses());
  const [view, setView] = useState<View>({ mode: "list" });
  const formRef = useRef<HTMLDivElement>(null);

  function backToList() {
    setExpenses(loadExpenses());
    setView({ mode: "list" });
  }

  function handleEditClick(expense: Expense) {
    if (expense.userId !== getCurrentUserId()) {
      setView({ mode: "access-denied" });
      return;
    }
    setView({ mode: "edit", expense });
  }

  if (view.mode === "access-denied") {
    return (
      <main>
        <h1>Expense Tracker</h1>
        <div className="card centered-block">
          <h2 className="card-title">You can't edit this expense</h2>
          <p className="text-md text-muted">
            Only the expense owner can open the edit view.
          </p>
          <button type="button" className="btn btn-primary" onClick={backToList}>
            Back to expense list
          </button>
        </div>
      </main>
    );
  }

  if (view.mode === "edit") {
    return (
      <main>
        <h1>Expense Tracker</h1>
        <EditExpenseForm
          expense={view.expense}
          onSaved={backToList}
          onCancel={backToList}
          onDeleted={backToList}
        />
      </main>
    );
  }

  return (
    <main>
      <h1>Expense Tracker</h1>
      <div ref={formRef}>
        <AddExpenseForm onSaved={() => setExpenses(loadExpenses())} />
      </div>
      <ExpenseList
        expenses={expenses}
        onAddExpenseClick={() => formRef.current?.querySelector("input")?.focus()}
        onEditClick={handleEditClick}
      />
    </main>
  );
}
