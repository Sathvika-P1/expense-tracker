import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConfirmDialog } from "./ConfirmDialog";

describe("ConfirmDialog", () => {
  it("renders a dialog with the message and explicit Confirm and Cancel actions", () => {
    render(<ConfirmDialog message="Delete this expense?" onConfirm={vi.fn()} onCancel={vi.fn()} />);

    expect(screen.getByRole("dialog")).toHaveTextContent("Delete this expense?");
    expect(screen.getByRole("button", { name: /confirm/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
  });

  it("calls onConfirm when Confirm is clicked", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(<ConfirmDialog message="Delete this expense?" onConfirm={onConfirm} onCancel={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /confirm/i }));

    expect(onConfirm).toHaveBeenCalled();
  });

  it("calls onCancel when Cancel is clicked", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(<ConfirmDialog message="Delete this expense?" onConfirm={vi.fn()} onCancel={onCancel} />);

    await user.click(screen.getByRole("button", { name: /cancel/i }));

    expect(onCancel).toHaveBeenCalled();
  });

  it("moves focus into the dialog on open and traps Tab within it", async () => {
    const user = userEvent.setup();
    render(<ConfirmDialog message="Delete this expense?" onConfirm={vi.fn()} onCancel={vi.fn()} />);

    expect(screen.getByRole("dialog")).toHaveFocus();

    await user.tab();
    expect(screen.getByRole("button", { name: /confirm/i })).toHaveFocus();

    await user.tab();
    expect(screen.getByRole("button", { name: /cancel/i })).toHaveFocus();

    await user.tab();
    expect(screen.getByRole("button", { name: /confirm/i })).toHaveFocus();
  });

  it("traps Shift+Tab within the dialog", async () => {
    const user = userEvent.setup();
    render(<ConfirmDialog message="Delete this expense?" onConfirm={vi.fn()} onCancel={vi.fn()} />);

    await user.tab();
    expect(screen.getByRole("button", { name: /confirm/i })).toHaveFocus();

    await user.tab({ shift: true });
    expect(screen.getByRole("button", { name: /cancel/i })).toHaveFocus();

    await user.tab({ shift: true });
    expect(screen.getByRole("button", { name: /confirm/i })).toHaveFocus();
  });

  it("keeps Shift+Tab from the initial dialog focus within the dialog", async () => {
    const user = userEvent.setup();
    render(
      <>
        <button type="button">Outside</button>
        <ConfirmDialog message="Delete this expense?" onConfirm={vi.fn()} onCancel={vi.fn()} />
      </>,
    );

    expect(screen.getByRole("dialog")).toHaveFocus();

    await user.tab({ shift: true });

    expect(screen.getByRole("button", { name: /cancel/i })).toHaveFocus();
  });
});
