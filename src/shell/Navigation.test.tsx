import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Navigation } from "./Navigation";

describe("Navigation", () => {
  it("calls onSelect with the destination id when a nav button is clicked", async () => {
    const onSelect = vi.fn();
    render(<Navigation current="expenses" onSelect={onSelect} />);

    await userEvent.click(screen.getByRole("button", { name: /reports/i }));

    expect(onSelect).toHaveBeenCalledWith("reports");
  });
});
