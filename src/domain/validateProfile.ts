import { CURRENCIES } from "./currencies";

export interface ProfileInput {
  name: string;
  email: string;
  currency: string;
}
export type ProfileErrors = Partial<Record<"name" | "email" | "currency", string>>;

export interface PasswordInput {
  current: string;
  next: string;
  confirm: string;
}
export type PasswordErrors = Partial<Record<"current" | "next" | "confirm", string>>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_MIN_LENGTH = 8;

export function validateProfile(input: ProfileInput): ProfileErrors {
  const errors: ProfileErrors = {};
  if (!input.name.trim()) errors.name = "Enter your full name.";
  if (!EMAIL_PATTERN.test(input.email.trim())) {
    errors.email = "Enter a valid email address, like name@example.com.";
  }
  if (!CURRENCIES.some((c) => c.code === input.currency)) {
    errors.currency = "Choose a currency from the list.";
  }
  return errors;
}

export function validatePasswordForm(input: PasswordInput): PasswordErrors {
  const errors: PasswordErrors = {};
  if (input.next.length < PASSWORD_MIN_LENGTH) {
    errors.next = "New password must be at least 8 characters.";
  }
  if (input.confirm !== input.next) errors.confirm = "Passwords do not match.";
  return errors;
}
