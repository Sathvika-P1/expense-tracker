import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loadExpenses, loadExpensesStrict, saveExpense, SUMMARY_LOAD_ERROR } from "./expenseRepository";
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
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "info").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
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

  it("throws when unable to read existing expenses during save", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("access denied");
    });
    expect(() => saveExpense(makeExpense())).toThrow(
      "Unable to read existing expenses; refusing to overwrite stored data.",
    );
    expect(console.error).toHaveBeenCalled();
  });

  it("throws when localStorage.setItem fails during save", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota exceeded");
    });
    expect(() => saveExpense(makeExpense())).toThrow("Unable to save expense.");
    expect(console.error).toHaveBeenCalled();
  });

  it("returns an empty list when localStorage contains corrupted JSON", () => {
    localStorage.setItem("expenses", "{not valid json");

    expect(loadExpenses()).toEqual([]);
    expect(console.error).toHaveBeenCalled();
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

  it("does not crash and drops malformed records (null entries, missing or non-string dates)", () => {
    localStorage.setItem(
      "expenses",
      JSON.stringify([
        null,
        { id: "1", userId: "local-user", amount: 5, category: "Food", createdAt: 1 },
        { id: "2", userId: "local-user", amount: 5, date: 123, category: "Food", createdAt: 1 },
        { id: "3", userId: "local-user", amount: 5, date: "2026-01-01", category: "Food", createdAt: 1 },
      ]),
    );

    expect(() => loadExpenses()).not.toThrow();
    expect(loadExpenses().map((e) => e.id).sort()).toEqual(["1", "2", "3"]);
  });

  it("drops records with a non-numeric amount instead of returning them for rendering", () => {
    localStorage.setItem(
      "expenses",
      JSON.stringify([
        { id: "1", userId: "local-user", amount: "not-a-number", date: "2026-01-01", category: "Food", createdAt: 1 },
        { id: "2", userId: "local-user", amount: 5, date: "2026-01-02", category: "Food", createdAt: 2 },
      ]),
    );

    expect(() => loadExpenses()).not.toThrow();
    expect(loadExpenses().map((e) => e.id)).toEqual(["2"]);
  });
});

describe("loadExpensesStrict", () => {
  it("returns an ok result with an empty list when nothing is stored", () => {
    expect(loadExpensesStrict()).toEqual({ ok: true, expenses: [] });
  });

  it("returns an ok result with the current user's expenses", () => {
    const expense = makeExpense({ id: "1", userId: "local-user" });
    saveExpense(expense);
    expect(loadExpensesStrict()).toEqual({ ok: true, expenses: [expense] });
  });

  it("returns an error result when localStorage contains corrupted JSON", () => {
    localStorage.setItem("expenses", "{not valid json");
    expect(loadExpensesStrict()).toEqual({ ok: false, message: SUMMARY_LOAD_ERROR });
  });

  it.each(['{"foo":1}', "null", "42", '"a string"'])(
    "returns an error result when localStorage contains valid JSON that is not an array (%s)",
    (value) => {
      localStorage.setItem("expenses", value);
      expect(loadExpensesStrict()).toEqual({ ok: false, message: SUMMARY_LOAD_ERROR });
    },
  );

  it("returns an error result when localStorage access throws", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("access denied");
    });
    expect(loadExpensesStrict()).toEqual({ ok: false, message: SUMMARY_LOAD_ERROR });
    expect(console.error).toHaveBeenCalled();
  });

  it.each(["", "not-a-date", "2026-02-31", undefined])(
    "returns an error result when an expense has an invalid date (%s)",
    (date) => {
      localStorage.setItem(
        "expenses",
        JSON.stringify([{ id: "1", userId: "local-user", amount: 1, date, category: "Food", createdAt: 1 }]),
      );
      expect(loadExpensesStrict()).toEqual({ ok: false, message: SUMMARY_LOAD_ERROR });
      expect(console.warn).toHaveBeenCalled();
    },
  );

  it.each([undefined, "not-a-number", null, NaN])(
    "returns an error result when an expense has an invalid amount (%s)",
    (amount) => {
      localStorage.setItem(
        "expenses",
        JSON.stringify([
          { id: "1", userId: "local-user", amount, date: "2026-01-01", category: "Food", createdAt: 1 },
        ]),
      );
      expect(loadExpensesStrict()).toEqual({ ok: false, message: SUMMARY_LOAD_ERROR });
      expect(console.warn).toHaveBeenCalled();
    },
  );

  it("ignores a malformed date belonging to a different user", () => {
    localStorage.setItem(
      "expenses",
      JSON.stringify([
        { id: "1", userId: "other-user", amount: 1, date: "not-a-date", category: "Food", createdAt: 1 },
        { id: "2", userId: "local-user", amount: 5, date: "2026-01-01", category: "Food", createdAt: 2 },
      ]),
    );
    expect(loadExpensesStrict()).toEqual({
      ok: true,
      expenses: [{ id: "2", userId: "local-user", amount: 5, date: "2026-01-01", category: "Food", createdAt: 2 }],
    });
  });
});
