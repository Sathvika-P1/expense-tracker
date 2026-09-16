import { getCurrentUserId } from "./currentUser";
import type { Expense } from "./expense";

const STORAGE_KEY = "expenses";

// Maps categories renamed in ET-STORY-015 so expenses saved under the old
// names still match the current (and only selectable) category set.
const LEGACY_CATEGORY_MIGRATIONS: Record<string, string> = {
  Travel: "Transport",
  Shopping: "Housing",
  Bills: "Utilities",
  Healthcare: "Entertainment",
  Others: "Other",
};

function migrateCategory(expense: Expense): Expense {
  const migrated = LEGACY_CATEGORY_MIGRATIONS[expense.category as string];
  return migrated ? { ...expense, category: migrated as Expense["category"] } : expense;
}

function loadAll(): Expense[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Expense[]).map(migrateCategory) : [];
  } catch {
    return [];
  }
}

export function loadExpenses(userId: string = getCurrentUserId()): Expense[] {
  return loadAll()
    .filter((expense) => expense.userId === userId)
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function saveExpense(expense: Expense): Expense[] {
  const expenses = [expense, ...loadAll()];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
  return expenses;
}
