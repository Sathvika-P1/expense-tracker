import type { Category } from "./categories";

export type ReportStatus = "draft" | "submitted" | "locked";

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
  reportStatus?: ReportStatus; // status of the report this expense belongs to, if any
  deletedAt?: number; // epoch ms; present = soft-deleted, pending purge
}

export interface ExpenseInput {
  amount: string;
  date: string;
  category: string;
  notes: string;
}
