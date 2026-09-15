import { beforeEach, describe, expect, it } from "vitest";
import { loadAuditRecords, recordEdit } from "./auditRepository";

beforeEach(() => {
  localStorage.clear();
});

describe("auditRepository", () => {
  it("returns an empty list when nothing is recorded for the expense", () => {
    expect(loadAuditRecords("1")).toEqual([]);
  });

  it("stores and retrieves audit entries for an expense, most recent first", () => {
    recordEdit({
      expenseId: "1",
      editorId: "current-user",
      before: { amount: 10, date: "2026-01-01", category: "Food", notes: undefined, receipt: undefined },
      after: { amount: 20, date: "2026-01-01", category: "Food", notes: undefined, receipt: undefined },
    });

    const [entry] = loadAuditRecords("1");

    expect(entry.expenseId).toBe("1");
    expect(entry.editorId).toBe("current-user");
    expect(entry.before.amount).toBe(10);
    expect(entry.after.amount).toBe(20);
    expect(typeof entry.editedAt).toBe("number");
    expect(typeof entry.id).toBe("string");
  });

  it("only returns entries for the requested expense", () => {
    recordEdit({
      expenseId: "1",
      editorId: "current-user",
      before: { amount: 10, date: "2026-01-01", category: "Food", notes: undefined, receipt: undefined },
      after: { amount: 20, date: "2026-01-01", category: "Food", notes: undefined, receipt: undefined },
    });
    recordEdit({
      expenseId: "2",
      editorId: "current-user",
      before: { amount: 5, date: "2026-01-01", category: "Travel", notes: undefined, receipt: undefined },
      after: { amount: 6, date: "2026-01-01", category: "Travel", notes: undefined, receipt: undefined },
    });

    expect(loadAuditRecords("2")).toHaveLength(1);
    expect(loadAuditRecords("2")[0].expenseId).toBe("2");
  });
});
