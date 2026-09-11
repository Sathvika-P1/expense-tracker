import { describe, expect, it } from "vitest";
import { validateExpense } from "./validateExpense";

const validInput = {
  amount: "12.50",
  date: "2026-01-01",
  category: "Food",
  notes: "",
};

describe("validateExpense", () => {
  it("returns no errors for valid input", () => {
    expect(validateExpense(validInput)).toEqual({});
  });

  it("reports errors for all missing required fields at once", () => {
    const errors = validateExpense({ amount: "", date: "", category: "", notes: "" });
    expect(errors.amount).toMatch(/amount is required/i);
    expect(errors.date).toMatch(/date is required/i);
    expect(errors.category).toMatch(/category is required/i);
  });

  it.each(["0", "-5", "abc"])("rejects non-positive/non-numeric amount %s", (amount) => {
    const errors = validateExpense({ ...validInput, amount });
    expect(errors.amount).toMatch(/positive number/i);
  });

  it("rejects amounts with more than two decimal places", () => {
    const errors = validateExpense({ ...validInput, amount: "12.345" });
    expect(errors.amount).toMatch(/two decimal/i);
  });

  it("accepts amounts with up to two decimal places", () => {
    const errors = validateExpense({ ...validInput, amount: "12.34" });
    expect(errors.amount).toBeUndefined();
  });

  it("rejects notes exceeding 200 characters", () => {
    const errors = validateExpense({ ...validInput, notes: "a".repeat(201) });
    expect(errors.notes).toMatch(/200/);
  });

  it("accepts notes of exactly 200 characters", () => {
    const errors = validateExpense({ ...validInput, notes: "a".repeat(200) });
    expect(errors.notes).toBeUndefined();
  });

  it("does not reject future dates", () => {
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);
    const errors = validateExpense({
      ...validInput,
      date: futureDate.toISOString().slice(0, 10),
    });
    expect(errors.date).toBeUndefined();
  });

  it("rejects an invalid category", () => {
    const errors = validateExpense({ ...validInput, category: "NotACategory" });
    expect(errors.category).toMatch(/fixed options/i);
  });
});
