import type { Category } from "./categories";

export interface Expense {
  id: string;
  userId: string;
  amount: number;
  date: string;
  category: Category;
  notes?: string;
  createdAt: number;
  createdBy?: string;
  updatedAt?: number;
}

export interface ExpenseInput {
  amount: string;
  date: string;
  category: string;
  notes: string;
}
