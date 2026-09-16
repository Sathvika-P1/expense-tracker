import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CategoryFilter } from "./CategoryFilter";

describe("CategoryFilter", () => {
  it("lists exactly the six fixed categories as checkboxes", () => {
    render(<CategoryFilter selected={[]} onChange={vi.fn()} />);

    const checkboxes = screen.getAllByRole("checkbox");
    expect(checkboxes).toHaveLength(6);

    const names = ["Food", "Transport", "Housing", "Utilities", "Entertainment", "Other"];
    names.forEach((name) => {
      expect(screen.getByRole("checkbox", { name })).toBeInTheDocument();
    });
  });

  it("calls onChange with the category added when an unchecked box is clicked", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<CategoryFilter selected={["Food"]} onChange={onChange} />);

    await user.click(screen.getByRole("checkbox", { name: "Transport" }));

    expect(onChange).toHaveBeenCalledWith(["Food", "Transport"]);
  });

  it("calls onChange with the category removed when a checked box is clicked", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<CategoryFilter selected={["Food", "Transport"]} onChange={onChange} />);

    await user.click(screen.getByRole("checkbox", { name: "Food" }));

    expect(onChange).toHaveBeenCalledWith(["Transport"]);
  });
});
