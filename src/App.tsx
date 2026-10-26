import { useEffect, useRef, useState } from "react";
import { UndoToast } from "./components/UndoToast";
import { AddExpenseForm } from "./components/AddExpenseForm";
import { EditExpenseForm } from "./components/EditExpenseForm";
import { ExpenseList } from "./components/ExpenseList";
import { getCurrentUserId } from "./domain/currentUser";
import type { Expense } from "./domain/expense";
import {
  deleteExpense,
  findExpenseById,
  loadExpenses,
  purgeExpiredDeletions,
  restoreExpense,
} from "./domain/expenseRepository";

const CURRENT_USER_ID = "local-user";

const DELETE_ERROR_MESSAGES = {
  "invalid-id": {
    title: "That expense identifier is not valid.",
    body: "Refresh the list and try again.",
  },
  "not-found": {
    title: "This expense no longer exists",
    body: "Expense not found. Your list has been refreshed.",
  },
  forbidden: {
    title: "You can't delete this expense",
    body: "Only the expense owner can delete it.",
  },
} as const;

const RESTORE_ERROR = {
  title: "This expense can't be restored",
  body: "The undo window has passed.",
};

type View =
  | { mode: "list" }
  | { mode: "edit"; expense: Expense }
  | { mode: "access-denied" };

export default function App() {
  const [expenses, setExpenses] = useState<Expense[]>(() => loadExpenses());
  const [view, setView] = useState<View>({ mode: "list" });
  const [pendingUndo, setPendingUndo] = useState<{ id: string; token: number } | null>(null);
  const [deleteError, setDeleteError] = useState<{ title: string; body: string } | null>(null);
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    purgeExpiredDeletions();
  }, []);

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
      setPendingUndo({ id, token: Date.now() });
    } else {
      setPendingUndo(null);
      setDeleteError(DELETE_ERROR_MESSAGES[result.error]);
      if (result.error === "not-found") setExpenses(loadExpenses());
    }
  }

  function handleUndo(id: string) {
    const result = restoreExpense(id, CURRENT_USER_ID);
    if (!result.ok) {
      setPendingUndo(null);
      setDeleteError(RESTORE_ERROR);
    }
    setExpenses(loadExpenses());
  }

  function handleExpire() {
    purgeExpiredDeletions();
    setPendingUndo(null);
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
      {deleteError && (
        <div className="banner" role="alert">
          <div>
            <div className="banner-title">{deleteError.title}</div>
            <div className="banner-body">{deleteError.body}</div>
          </div>
        </div>
      )}
      {pendingUndo && (
        <UndoToast
          key={pendingUndo.token}
          onUndo={() => handleUndo(pendingUndo.id)}
          onExpire={handleExpire}
        />
      )}
      <ExpenseList
        expenses={expenses}
        onAddExpenseClick={() => formRef.current?.querySelector("input")?.focus()}
        onEditClick={handleEditClick}
        onDelete={handleDelete}
      />
    </main>
  );
}
