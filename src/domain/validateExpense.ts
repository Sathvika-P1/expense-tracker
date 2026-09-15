import { CATEGORIES } from "./categories";
import type { ExpenseInput } from "./expense";

export interface ValidationErrors {
  amount?: string;
  date?: string;
  category?: string;
  notes?: string;
}

const AMOUNT_PATTERN = /^\d+(\.\d{1,2})?$/;
const NOTES_MAX_LENGTH = 200;

export function validateExpense(input: ExpenseInput): ValidationErrors {
  const errors: ValidationErrors = {};

  const amount = input.amount.trim();
  if (!amount) {
    errors.amount = "Amount is required.";
  } else if (!AMOUNT_PATTERN.test(amount)) {
    if (/^\d+\.\d{3,}$/.test(amount)) {
      errors.amount = "Amount must have at most two decimal places.";
    } else {
      errors.amount = "Amount must be a positive number.";
    }
  } else if (Number(amount) <= 0) {
    errors.amount = "Amount must be a positive number.";
  }

  const date = input.date.trim();
  if (!date) {
    errors.date = "Date is required.";
  } else if (Number.isNaN(Date.parse(date))) {
    errors.date = "Date must be a valid date.";
  }

  if (!input.category.trim()) {
    errors.category = "Category is required.";
  } else if (!CATEGORIES.includes(input.category as (typeof CATEGORIES)[number])) {
    errors.category = "Category must be one of the fixed options.";
  }

  if (input.notes.length > NOTES_MAX_LENGTH) {
    errors.notes = `Notes must be at most ${NOTES_MAX_LENGTH} characters.`;
  }

  return errors;
}
