import { useState } from "react";
import { AddExpenseForm } from "./components/AddExpenseForm";
import { EditExpenseForm } from "./components/EditExpenseForm";
import { ExpenseList } from "./components/ExpenseList";
import { CURRENT_USER_ID } from "./domain/currentUser";
import type { Expense } from "./domain/expense";
import { loadExpenses } from "./domain/expenseRepository";

export default function App() {
  const [expenses, setExpenses] = useState<Expense[]>(() => loadExpenses());
  const [editingId, setEditingId] = useState<string | null>(null);

  const editingExpense = expenses.find((expense) => expense.id === editingId) ?? null;

  return (
    <main>
      <h1>Expense Tracker</h1>
      {editingExpense ? (
        <EditExpenseForm
          expense={editingExpense}
          currentUserId={CURRENT_USER_ID}
          onSaved={() => {
            setExpenses(loadExpenses());
            setEditingId(null);
          }}
          onCancel={() => setEditingId(null)}
        />
      ) : (
        <AddExpenseForm onSaved={() => setExpenses(loadExpenses())} />
      )}
      <ExpenseList expenses={expenses} onEdit={setEditingId} />
    </main>
  );
}
