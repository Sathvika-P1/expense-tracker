import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ExpenseFilters } from "./ExpenseFilters";
import type { ExpenseFilterCriteria } from "../domain/filterExpenses";

function ControlledExpenseFilters({ onChange }: { onChange: (c: ExpenseFilterCriteria) => void }) {
  const [criteria, setCriteria] = useState<ExpenseFilterCriteria>({});
  return (
    <ExpenseFilters
      criteria={criteria}
      onChange={(next) => {
        setCriteria(next);
        onChange(next);
      }}
    />
  );
}

describe("ExpenseFilters", () => {
  it("reports the merged criteria immediately when the start date changes", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<ExpenseFilters criteria={{}} onChange={onChange} />);

    await user.type(screen.getByLabelText(/start date/i), "2026-01-01");

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ startDate: "2026-01-01" }));
  });

  it("reports the merged criteria immediately when the end date changes", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<ExpenseFilters criteria={{}} onChange={onChange} />);

    await user.type(screen.getByLabelText(/end date/i), "2026-01-31");

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ endDate: "2026-01-31" }));
  });

  it("reports the merged criteria when a category is selected", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<ExpenseFilters criteria={{}} onChange={onChange} />);

    await user.selectOptions(screen.getByLabelText(/category/i), "Travel");

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ category: "Travel" }));
  });

  it("offers an 'All categories' option to clear the category filter", () => {
    render(<ExpenseFilters criteria={{}} onChange={vi.fn()} />);

    expect(screen.getByRole("option", { name: /all categories/i })).toBeInTheDocument();
  });

  it("reports the merged criteria immediately as the keyword is typed", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<ControlledExpenseFilters onChange={onChange} />);

    await user.type(screen.getByLabelText(/keyword/i), "taxi");

    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ keyword: "taxi" }));
  });
});
