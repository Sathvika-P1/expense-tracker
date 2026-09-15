import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EMPTY_FILTERS } from "../domain/expenseFilters";
import { ExpenseFiltersForm } from "./ExpenseFiltersForm";

describe("ExpenseFiltersForm", () => {
  it("calls onClear when the Clear all filters button is activated", async () => {
    const user = userEvent.setup();
    const onClear = vi.fn();
    render(
      <ExpenseFiltersForm filters={EMPTY_FILTERS} onChange={vi.fn()} onClear={onClear} />
    );

    await user.click(screen.getByRole("button", { name: /clear all filters/i }));

    expect(onClear).toHaveBeenCalled();
  });

  it("calls onChange with the keyword when typed", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <ExpenseFiltersForm filters={EMPTY_FILTERS} onChange={onChange} onClear={vi.fn()} />
    );

    await user.type(screen.getByLabelText("Keyword"), "a");

    expect(onChange).toHaveBeenCalledWith({ ...EMPTY_FILTERS, keyword: "a" });
  });
});
