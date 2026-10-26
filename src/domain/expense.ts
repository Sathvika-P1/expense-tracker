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
  deletedAt?: number; // epoch ms; present = soft-deleted, pending purge
}

export interface ExpenseInput {
  amount: string;
  date: string;
  category: string;
  notes: string;
}
