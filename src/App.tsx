import { useEffect, useState } from "react";
import { AddExpenseForm } from "./components/AddExpenseForm";
import { EditExpenseForm } from "./components/EditExpenseForm";
import { ExpenseList } from "./components/ExpenseList";
import { getCurrentUserId } from "./domain/currentUser";
import type { Expense } from "./domain/expense";
import { findExpenseById, loadExpenses } from "./domain/expenseRepository";

type View =
  | { mode: "list" }
  | { mode: "add" }
  | { mode: "edit"; expense: Expense }
  | { mode: "access-denied" };

export default function App() {
  const [expenses, setExpenses] = useState<Expense[]>(() => loadExpenses());
  const [view, setView] = useState<View>({ mode: "list" });
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    if (!justSaved) {
      return;
    }
    const timeoutId = setTimeout(() => setJustSaved(false), 4000);
    return () => clearTimeout(timeoutId);
  }, [justSaved]);

  function backToList() {
    setExpenses(loadExpenses());
    setView({ mode: "list" });
  }

  function handleEditClick(expense: Expense) {
    const current = findExpenseById(expense.id);
    if (!current) {
      backToList();
      return;
    }
    if (current.userId !== getCurrentUserId()) {
      setView({ mode: "access-denied" });
      return;
    }
    setView({ mode: "edit", expense: current });
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

  if (view.mode === "add") {
    return (
      <main>
        <AddExpenseForm
          onSaved={() => {
            setExpenses(loadExpenses());
            setJustSaved(true);
            setView({ mode: "list" });
          }}
          onCancel={() => setView({ mode: "list" })}
        />
      </main>
    );
  }

  return (
    <main>
      {justSaved && (
        <div className="app-shell">
          <div className="toast-banner toast-positive" role="status">
            <span className="toast-icon" aria-hidden="true">
              ✓
            </span>
            <div>
              <strong>Expense added</strong>
            </div>
          </div>
        </div>
      )}
      <ExpenseList
        expenses={expenses}
        onAddExpenseClick={() => {
          setJustSaved(false);
          setView({ mode: "add" });
        }}
        onEditClick={handleEditClick}
      />
    </main>
  );
}
