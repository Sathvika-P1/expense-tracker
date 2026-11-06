import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { authenticate, deleteAccount, getSessionUserId } from "./accountRepository";
import { loadExpenses, saveExpense } from "./expenseRepository";

const EMAIL = "a@b.com";
const PASSWORD = "test-password";

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem("accounts", JSON.stringify([{ id: "u1", email: EMAIL, password: PASSWORD }]));
  localStorage.setItem("session", "u1");
  for (const id of ["e1", "e2"]) {
    saveExpense({ id, userId: "u1", amount: 1, date: "2026-01-01", category: "Food", createdAt: 1 });
  }
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("deleteAccount", () => {
  it("removes the account so it can no longer sign in (AC5)", () => {
    expect(deleteAccount("u1")).toEqual({ ok: true });
    expect(authenticate(EMAIL, PASSWORD)).toBeUndefined();
    expect(getSessionUserId()).toBeNull();
  });

  it("removes the user's expenses (AC9)", () => {
    deleteAccount("u1");
    expect(loadExpenses("u1")).toEqual([]);
  });

  it("leaves the account usable when not deleted (AC3)", () => {
    expect(authenticate(EMAIL, PASSWORD)).toBeDefined();
    expect(authenticate(EMAIL, "wrong")).toBeUndefined();
  });

  it("reports session-expired and changes nothing without a session (AC6)", () => {
    localStorage.removeItem("session");
    expect(deleteAccount("u1")).toEqual({ ok: false, reason: "session-expired" });
    expect(authenticate(EMAIL, PASSWORD)).toBeDefined();
    expect(loadExpenses("u1")).toHaveLength(2);
  });

  it("restores everything when a write fails (AC8)", () => {
    const real = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (
      this: Storage,
      k: string,
      v: string,
    ) {
      if (k === "expenses") throw new Error("quota");
      return real.call(this, k, v);
    });
    expect(deleteAccount("u1")).toEqual({ ok: false, reason: "failed" });
    vi.restoreAllMocks();
    expect(authenticate(EMAIL, PASSWORD)).toBeDefined();
    expect(loadExpenses("u1")).toHaveLength(2);
    expect(getSessionUserId()).toBe("u1");
  });
});
