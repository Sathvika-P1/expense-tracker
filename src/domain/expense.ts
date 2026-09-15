import type { Category } from "./categories";

export type ExpenseStatus = "draft" | "submitted" | "approved" | "rejected" | "reimbursed";

export interface ExpenseReceipt {
  name: string;
  dataUrl: string;
}

export interface Expense {
  id: string;
  amount: number;
  date: string;
  category: Category;
  notes?: string;
  receipt?: ExpenseReceipt;
  createdAt: number;
  status: ExpenseStatus;
  ownerId: string;
}

export interface ExpenseInput {
  amount: string;
  date: string;
  category: string;
  notes: string;
  receipt?: ExpenseReceipt;
}

export type ExpenseEditableFields = Pick<Expense, "amount" | "date" | "category" | "notes" | "receipt">;
