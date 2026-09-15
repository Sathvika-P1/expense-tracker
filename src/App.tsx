import { useState } from "react";
import { AddExpenseForm } from "./components/AddExpenseForm";
import { ExpenseList } from "./components/ExpenseList";
import type { Expense } from "./domain/expense";
import { deleteExpense, loadExpenses } from "./domain/expenseRepository";

const CURRENT_USER_ID = "local-user";

const DELETE_ERROR_MESSAGES = {
  "invalid-id": "That expense identifier is not valid.",
  "not-found": "Expense not found.",
  forbidden: "You are not allowed to delete this expense.",
} as const;

export default function App() {
  const [expenses, setExpenses] = useState<Expense[]>(() => loadExpenses());
  const [deleteMessage, setDeleteMessage] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

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

  return (
    <main>
      <h1>Expense Tracker</h1>
      <AddExpenseForm currentUserId={CURRENT_USER_ID} onSaved={() => setExpenses(loadExpenses())} />
      {deleteMessage && <p role="status">{deleteMessage}</p>}
      {deleteError && <p role="alert">{deleteError}</p>}
      <ExpenseList expenses={expenses} onDelete={handleDelete} />
    </main>
  );
}
