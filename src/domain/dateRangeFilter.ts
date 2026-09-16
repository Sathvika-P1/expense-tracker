import type { Expense } from "./expense";

export interface DateRangeErrors {
  start?: string;
  end?: string;
  range?: string;
}

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function isParseable(value: string): boolean {
  if (!ISO_DATE_PATTERN.test(value)) return false;
  return !Number.isNaN(Date.parse(value));
}

export function validateDateRange(start: string, end: string): DateRangeErrors {
  const errors: DateRangeErrors = {};
  if (start && !isParseable(start)) errors.start = "Enter a valid date (YYYY-MM-DD).";
  if (end && !isParseable(end)) errors.end = "Enter a valid date (YYYY-MM-DD).";
  if (!errors.start && !errors.end && start && end && end < start) {
    errors.range = "End date must be on or after the start date.";
  }
  return errors;
}

export function filterExpensesByDateRange(
  expenses: Expense[],
  start: string,
  end: string,
): Expense[] {
  return expenses.filter((expense) => {
    if (start && expense.date < start) return false;
    if (end && expense.date > end) return false;
    return true;
  });
}
