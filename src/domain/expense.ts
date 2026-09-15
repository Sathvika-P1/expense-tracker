import type { Category } from "./categories";

export interface Expense {
  id: string;
  amount: number;
  date: string;
  category: Category;
  notes?: string;
  createdAt: number;
  createdBy?: string;
}

export interface ExpenseInput {
  amount: string;
  date: string;
  category: string;
  notes: string;
}
