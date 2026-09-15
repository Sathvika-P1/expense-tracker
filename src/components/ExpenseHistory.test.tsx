import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ExpenseHistory } from "./ExpenseHistory";
import * as auditRepository from "../domain/auditRepository";

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("ExpenseHistory", () => {
  it("displays prior edits for the expense", () => {
    vi.spyOn(auditRepository, "loadAuditRecords").mockReturnValue([
      {
        id: "a1",
        expenseId: "1",
        editedAt: Date.parse("2026-01-02"),
        editorId: "current-user",
        before: { amount: 10, date: "2026-01-01", category: "Food", notes: undefined, receipt: undefined },
        after: { amount: 20, date: "2026-01-01", category: "Food", notes: undefined, receipt: undefined },
      },
    ]);

    render(<ExpenseHistory expenseId="1" />);

    expect(screen.getByText(/current-user/)).toBeInTheDocument();
    expect(screen.getByText(/10 → 20/)).toBeInTheDocument();
  });

  it("shows every changed field, not just amount", () => {
    vi.spyOn(auditRepository, "loadAuditRecords").mockReturnValue([
      {
        id: "a1",
        expenseId: "1",
        editedAt: Date.parse("2026-01-02"),
        editorId: "current-user",
        before: { amount: 10, date: "2026-01-01", category: "Food", notes: "old note", receipt: undefined },
        after: { amount: 10, date: "2026-02-01", category: "Travel", notes: "new note", receipt: undefined },
      },
    ]);

    render(<ExpenseHistory expenseId="1" />);

    expect(screen.getByText(/2026-01-01 → 2026-02-01/)).toBeInTheDocument();
    expect(screen.getByText(/Food → Travel/)).toBeInTheDocument();
    expect(screen.getByText(/old note → new note/)).toBeInTheDocument();
  });

  it("shows a message when there is no edit history", () => {
    vi.spyOn(auditRepository, "loadAuditRecords").mockReturnValue([]);

    render(<ExpenseHistory expenseId="1" />);

    expect(screen.getByText(/no edit history/i)).toBeInTheDocument();
  });
});
