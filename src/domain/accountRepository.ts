import type { CurrencyCode } from "./currencies";
import { getCurrentUserId } from "./currentUser";
import {
  validatePasswordForm,
  validateProfile,
  type PasswordErrors,
  type PasswordInput,
  type ProfileErrors,
  type ProfileInput,
} from "./validateProfile";

export interface Account {
  id: string;
  name: string;
  email: string;
  currency: CurrencyCode;
  passwordHash: string;
  passwordSalt: string;
  createdAt: string;
}

export type UpdateProfileResult =
  | { ok: true; account: Account }
  | { ok: false; errors: ProfileErrors };

export type ChangePasswordResult = { ok: true } | { ok: false; errors: PasswordErrors };

const STORAGE_KEY = "accounts";
const SEED_SALT = "seed-salt";
// SHA-256 of `${SEED_SALT}:Passw0rd!` — precomputed so seeding stays synchronous.
const SEED_HASH = "cadd35c64629e2cf9fca191719a436b64d4b6e438a62e024cd5d0ee33dc8422d";

// Client-side only (ADR-0008): demo-grade hashing, not real credential security.
async function hashPassword(password: string, salt: string): Promise<string> {
  const bytes = new TextEncoder().encode(`${salt}:${password}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

function loadAll(): Account[] | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Account[]) : null;
  } catch {
    return null;
  }
}

function saveAll(accounts: Account[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
}

function seed(): Account[] {
  const createdAt = new Date().toISOString();
  const accounts: Account[] = [
    {
      id: getCurrentUserId(),
      name: "Sathvika Papishetti",
      email: "sathvika@example.com",
      currency: "USD",
      passwordHash: SEED_HASH,
      passwordSalt: SEED_SALT,
      createdAt,
    },
    {
      id: "asha-menon",
      name: "Asha Menon",
      email: "asha.menon@example.com",
      currency: "INR",
      passwordHash: SEED_HASH,
      passwordSalt: SEED_SALT,
      createdAt,
    },
  ];
  saveAll(accounts);
  return accounts;
}

function accounts(): Account[] {
  return loadAll() ?? seed();
}

export function getAccount(id: string = getCurrentUserId()): Account {
  const found = accounts().find((a) => a.id === id);
  if (!found) throw new Error(`Account not found: ${id}`);
  return found;
}

export function updateProfile(id: string, input: ProfileInput): UpdateProfileResult {
  const errors = validateProfile(input);
  const all = accounts();
  const email = input.email.trim();
  if (
    !errors.email &&
    all.some((a) => a.id !== id && a.email.toLowerCase() === email.toLowerCase())
  ) {
    errors.email = "That email address is already used by another account.";
  }
  if (Object.keys(errors).length > 0) return { ok: false, errors };

  const index = all.findIndex((a) => a.id === id);
  if (index < 0) throw new Error(`Account not found: ${id}`);
  const updated: Account = {
    ...all[index],
    name: input.name.trim(),
    email,
    currency: input.currency as CurrencyCode,
  };
  all[index] = updated;
  saveAll(all);
  return { ok: true, account: updated };
}

export async function verifyPassword(id: string, password: string): Promise<boolean> {
  const account = getAccount(id);
  return (await hashPassword(password, account.passwordSalt)) === account.passwordHash;
}

export async function changePassword(
  id: string,
  input: PasswordInput,
): Promise<ChangePasswordResult> {
  const errors = validatePasswordForm(input);
  if (!(await verifyPassword(id, input.current))) {
    errors.current = "Current password is incorrect.";
  }
  if (Object.keys(errors).length > 0) return { ok: false, errors };

  const salt = crypto.randomUUID();
  const passwordHash = await hashPassword(input.next, salt);
  const all = accounts();
  const index = all.findIndex((a) => a.id === id);
  all[index] = { ...all[index], passwordHash, passwordSalt: salt };
  saveAll(all);
  return { ok: true };
}
