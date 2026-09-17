import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadExpenses, loadExpensesResult, saveExpense } from "./expenseRepository";
import type { Expense } from "./expense";

const makeExpense = (overrides: Partial<Expense> = {}): Expense => ({
  id: "1",
  userId: "local-user",
  amount: 10,
  date: "2026-01-01",
  category: "Food",
  createdAt: Date.now(),
  ...overrides,
});

beforeEach(() => {
  localStorage.clear();
});

describe("expenseRepository", () => {
  it("returns an empty list when nothing is stored", () => {
    expect(loadExpenses()).toEqual([]);
  });

  it("persists a saved expense so a fresh load (simulated reload) returns it", () => {
    const expense = makeExpense();
    saveExpense(expense);

    const loaded = loadExpenses();

    expect(loaded).toHaveLength(1);
    expect(loaded[0]).toEqual(expense);
  });

  it("prepends new expenses so the most recently saved appears first", () => {
    const first = makeExpense({ id: "1" });
    const second = makeExpense({ id: "2" });

    saveExpense(first);
    saveExpense(second);

    const loaded = loadExpenses();

    expect(loaded[0].id).toBe("2");
    expect(loaded[1].id).toBe("1");
  });

  it("returns an empty list when localStorage contains corrupted JSON", () => {
    localStorage.setItem("expenses", "{not valid json");

    expect(loadExpenses()).toEqual([]);
  });

  it.each(['{"foo":1}', "null", "42", '"a string"'])(
    "returns an empty list when localStorage contains valid JSON that is not an array (%s)",
    (value) => {
      localStorage.setItem("expenses", value);

      expect(loadExpenses()).toEqual([]);
    },
  );

  it("only returns expenses belonging to the given user", () => {
    saveExpense(makeExpense({ id: "1", userId: "user-a" }));
    saveExpense(makeExpense({ id: "2", userId: "user-b" }));

    expect(loadExpenses("user-a").map((e) => e.id)).toEqual(["1"]);
  });

  it("orders expenses by date descending regardless of save order", () => {
    saveExpense(makeExpense({ id: "old", date: "2026-01-01", userId: "u" }));
    saveExpense(makeExpense({ id: "new", date: "2026-03-01", userId: "u" }));

    expect(loadExpenses("u").map((e) => e.id)).toEqual(["new", "old"]);
  });
});

describe("loadExpensesResult", () => {
  it("reports corrupted JSON instead of swallowing it", () => {
    localStorage.setItem("expenses", "{not valid json");

    expect(loadExpensesResult()).toEqual({ ok: false, reason: "corrupted" });
  });

  it("reports a non-array JSON payload as corrupted", () => {
    localStorage.setItem("expenses", '{"foo":1}');

    expect(loadExpensesResult()).toEqual({ ok: false, reason: "corrupted" });
  });

  it("reports unavailable storage without throwing", () => {
    const spy = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("denied", "SecurityError");
    });

    expect(loadExpensesResult()).toEqual({ ok: false, reason: "unavailable" });

    spy.mockRestore();
  });

  it("returns the current user's expenses on success", () => {
    saveExpense({
      id: "1",
      userId: "local-user",
      amount: 10,
      date: "2026-01-01",
      category: "Food",
      createdAt: Date.now(),
    });

    expect(loadExpensesResult()).toEqual({
      ok: true,
      expenses: [
        {
          id: "1",
          userId: "local-user",
          amount: 10,
          date: "2026-01-01",
          category: "Food",
          createdAt: expect.any(Number),
        },
      ],
    });
  });

  it("returns an empty successful result when nothing is stored", () => {
    expect(loadExpensesResult()).toEqual({ ok: true, expenses: [] });
  });
});
