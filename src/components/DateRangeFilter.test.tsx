import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DateRangeFilter } from "./DateRangeFilter";

describe("DateRangeFilter", () => {
  it("labels both date fields for assistive technology", () => {
    render(<DateRangeFilter onRangeChange={vi.fn()} />);
    expect(screen.getByLabelText(/start date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/end date/i)).toBeInTheDocument();
  });

  it("is reachable via Tab in document order with no keyboard trap", async () => {
    render(<DateRangeFilter onRangeChange={vi.fn()} />);
    await userEvent.tab();
    expect(screen.getByLabelText(/start date/i)).toHaveFocus();
    await userEvent.tab();
    expect(screen.getByLabelText(/end date/i)).toHaveFocus();
  });

  it("shows an inline error for an inverted range", async () => {
    render(<DateRangeFilter onRangeChange={vi.fn()} />);
    await userEvent.type(screen.getByLabelText(/start date/i), "2026-02-01");
    await userEvent.type(screen.getByLabelText(/end date/i), "2026-01-01");
    expect(screen.getByRole("alert")).toHaveTextContent(/on or after/i);
  });

  it("shows an inline error for an unparseable start date", async () => {
    render(<DateRangeFilter onRangeChange={vi.fn()} />);
    await userEvent.type(screen.getByLabelText(/start date/i), "not-a-date");
    expect(screen.getByRole("alert")).toHaveTextContent(/valid date/i);
  });

  it("reports isValid: false while an error is present", async () => {
    const onRangeChange = vi.fn();
    render(<DateRangeFilter onRangeChange={onRangeChange} />);
    await userEvent.type(screen.getByLabelText(/start date/i), "not-a-date");
    expect(onRangeChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ isValid: false, start: "not-a-date", end: "" }),
    );
  });

  it("stays focused with no navigation or trap when Enter is pressed in a field", async () => {
    render(<DateRangeFilter onRangeChange={vi.fn()} />);
    const startInput = screen.getByLabelText(/start date/i);
    await userEvent.type(startInput, "2026-01-01");
    await userEvent.keyboard("{Enter}");
    expect(startInput).toHaveFocus();
  });

  it("reports isValid: true with the current values when the range is valid", async () => {
    const onRangeChange = vi.fn();
    render(<DateRangeFilter onRangeChange={onRangeChange} />);
    await userEvent.type(screen.getByLabelText(/start date/i), "2026-01-01");
    expect(onRangeChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ isValid: true, start: "2026-01-01", end: "" }),
    );
  });
});
