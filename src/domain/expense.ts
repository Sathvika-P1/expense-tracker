import type { Category } from "./categories";

export interface Expense {
  id: string;
  userId: string;
  amount: number;
  date: string;
  category: Category;
  notes?: string;
  createdAt: number;
  updatedAt?: number;
}

export interface ExpenseInput {
  amount: string;
  date: string;
  category: string;
  notes: string;
}
