import { beforeEach, describe, expect, it } from "vitest";
import { findAuditGaps, loadAuditLog, type AuditEntry } from "./auditLog";
import type { Expense } from "./expense";
import { DELETION_PATHS, saveExpense } from "./expenseRepository";

const seedFinalizedExpense = (): Expense => {
  const expense: Expense = {
    id: "fin-1",
    userId: "local-user",
    amount: 12.5,
    date: "2026-01-01",
    category: "Food",
    notes: "lunch",
    createdAt: 1,
    createdBy: "u1",
    finalized: true,
  };
  saveExpense(expense);
  return expense;
};

beforeEach(() => {
  localStorage.clear();
});

describe("audit coverage gate", () => {
  it("has at least one registered deletion path", () => {
    expect(DELETION_PATHS.length).toBeGreaterThanOrEqual(1);
  });

  it.each(DELETION_PATHS)("$name writes a complete audit record for a finalized expense", ({ run }) => {
    const seeded = seedFinalizedExpense();
    run(seeded.id, seeded.createdBy!);
    expect(findAuditGaps(seeded, loadAuditLog())).toEqual([]);
  });
});

describe("audit coverage checker", () => {
  const seeded: Expense = {
    id: "fin-1",
    userId: "local-user",
    amount: 12.5,
    date: "2026-01-01",
    category: "Food",
    createdAt: 1,
    finalized: true,
  };
  const entry: AuditEntry = { action: "delete", deletedBy: "u1", deletedAt: 5, expense: seeded };

  it("passes a complete entry", () => {
    expect(findAuditGaps(seeded, [entry])).toEqual([]);
  });
  it("flags a path that writes no entry", () => {
    expect(findAuditGaps(seeded, [])).toContain("no-entry");
  });
  it("flags a missing user", () => {
    expect(findAuditGaps(seeded, [{ ...entry, deletedBy: "" }])).toContain("missing-user");
  });
  it("flags a missing timestamp", () => {
    expect(
      findAuditGaps(seeded, [{ ...entry, deletedAt: undefined as unknown as number }]),
    ).toContain("missing-timestamp");
  });
  it("flags missing details", () => {
    expect(findAuditGaps(seeded, [{ ...entry, expense: { ...seeded, amount: 0 } }])).toContain(
      "missing-details",
    );
  });
  it("checks the most recent entry when an id was deleted more than once", () => {
    const stale = { ...entry, deletedBy: "" };
    expect(findAuditGaps(seeded, [stale, entry])).toEqual([]);
    expect(findAuditGaps(seeded, [entry, stale])).toContain("missing-user");
  });
});
