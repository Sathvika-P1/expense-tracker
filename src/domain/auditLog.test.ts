import { beforeEach, describe, expect, it } from "vitest";
import { loadAuditLog } from "./auditLog";
import { deleteExpense, restoreExpense, saveExpense } from "./expenseRepository";
import type { Expense } from "./expense";

const makeExpense = (overrides: Partial<Expense> = {}): Expense => ({
  id: "1",
  userId: "local-user",
  amount: 10,
  date: "2026-01-01",
  category: "Food",
  createdAt: 1,
  ...overrides,
});

beforeEach(() => {
  localStorage.clear();
});

describe("audit log", () => {
  it("is empty when nothing was recorded", () => {
    expect(loadAuditLog()).toEqual([]);
  });

  it("records deleting user, timestamp and expense details, newest first", () => {
    saveExpense(makeExpense({ id: "1", amount: 52.75 }));
    deleteExpense("1", "local-user", 5000);

    expect(loadAuditLog()[0]).toEqual(
      expect.objectContaining({
        action: "deleted",
        userId: "local-user",
        timestamp: 5000,
        expense: expect.objectContaining({ id: "1", amount: 52.75 }),
      }),
    );

    restoreExpense("1", "local-user", 6000);
    expect(loadAuditLog().map((e) => e.action)).toEqual(["restored", "deleted"]);
  });

  it("records nothing for failed deletes", () => {
    saveExpense(makeExpense({ id: "1", userId: "other-user" }));

    deleteExpense("1", "local-user");
    deleteExpense("missing", "local-user");

    expect(loadAuditLog()).toEqual([]);
  });
});
