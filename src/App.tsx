import { useRef, useState } from "react";
import { AddExpenseForm } from "./components/AddExpenseForm";
import { EditExpenseForm } from "./components/EditExpenseForm";
import { ExpenseList } from "./components/ExpenseList";
import { getCurrentUserId } from "./domain/currentUser";
import type { Expense } from "./domain/expense";
import { deleteExpense, findExpenseById, loadExpenses } from "./domain/expenseRepository";

const CURRENT_USER_ID = "local-user";

const DELETE_ERROR_MESSAGES = {
  "invalid-id": "That expense identifier is not valid.",
  "not-found": "Expense not found.",
  forbidden: "You are not allowed to delete this expense.",
} as const;

type View =
  | { mode: "list" }
  | { mode: "edit"; expense: Expense }
  | { mode: "access-denied" };

export default function App() {
  const [expenses, setExpenses] = useState<Expense[]>(() => loadExpenses());
  const [view, setView] = useState<View>({ mode: "list" });
  const [deleteMessage, setDeleteMessage] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const formRef = useRef<HTMLDivElement>(null);

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

  function handleDelete(id: string) {
    const result = deleteExpense(id, CURRENT_USER_ID);
    if (result.ok) {
      setExpenses(result.expenses);
      setDeleteError(null);
      setDeleteMessage("Expense deleted.");
    } else {
      setDeleteMessage(null);
      setDeleteError(DELETE_ERROR_MESSAGES[result.error]);
    }
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
        <AddExpenseForm currentUserId={CURRENT_USER_ID} onSaved={() => setExpenses(loadExpenses())} />
      </div>
      <p role="status">{deleteMessage ?? ""}</p>
      <p role="alert">{deleteError ?? ""}</p>
      <ExpenseList
        expenses={expenses}
        onAddExpenseClick={() => formRef.current?.querySelector("input")?.focus()}
        onEditClick={handleEditClick}
        onDelete={handleDelete}
      />
    </main>
  );
}
