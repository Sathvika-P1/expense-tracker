import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EMPTY_FILTERS, type ExpenseFilters } from "../domain/expenseFilters";
import { ExpenseFiltersForm } from "./ExpenseFiltersForm";

function StatefulFiltersForm() {
  const [filters, setFilters] = useState<ExpenseFilters>(EMPTY_FILTERS);
  return (
    <ExpenseFiltersForm
      filters={filters}
      onChange={setFilters}
      onClear={() => setFilters(EMPTY_FILTERS)}
    />
  );
}

describe("ExpenseFiltersForm", () => {
  it("calls onClear when the Clear all filters button is activated", async () => {
    const user = userEvent.setup();
    const onClear = vi.fn();
    render(
      <ExpenseFiltersForm filters={EMPTY_FILTERS} onChange={vi.fn()} onClear={onClear} />
    );

    const clearButton = screen.getByRole("button", { name: /clear all filters/i });
    expect(clearButton).toBeInTheDocument();

    await user.click(clearButton);

    expect(onClear).toHaveBeenCalled();
  });

  it("renders the typed keyword in the input", async () => {
    const user = userEvent.setup();
    render(<StatefulFiltersForm />);

    const keywordInput = screen.getByLabelText("Keyword");
    expect(keywordInput).toBeInTheDocument();

    await user.type(keywordInput, "a");

    expect(keywordInput).toHaveValue("a");
  });
});
