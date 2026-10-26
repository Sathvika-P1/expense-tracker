import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConfirmDialog } from "./ConfirmDialog";

const renderDialog = (props: Partial<React.ComponentProps<typeof ConfirmDialog>> = {}) =>
  render(
    <ConfirmDialog
      message="Delete this expense?"
      onConfirm={vi.fn()}
      onCancel={vi.fn()}
      {...props}
    />,
  );

describe("ConfirmDialog", () => {
  it("renders an alertdialog labelled by its title and described by the message", () => {
    renderDialog({ title: "Delete this expense?", message: "Delete Bills?" });

    const dialog = screen.getByRole("alertdialog", { name: /delete this expense/i });
    expect(dialog).toHaveAccessibleDescription("Delete Bills?");
    expect(screen.getByRole("button", { name: /confirm/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
  });

  it("uses the custom confirm label and destructive styling", () => {
    renderDialog({ confirmLabel: "Delete expense", destructive: true });

    expect(screen.getByRole("button", { name: "Delete expense" })).toHaveClass("btn-destructive");
    expect(screen.getByRole("button", { name: "Cancel" })).toHaveClass("btn-secondary");
  });

  it("calls onConfirm when confirm is clicked", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    renderDialog({ onConfirm });

    await user.click(screen.getByRole("button", { name: /confirm/i }));

    expect(onConfirm).toHaveBeenCalled();
  });

  it("defaults the submitting label to a neutral value", async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.click(screen.getByRole("button", { name: "Confirm" }));

    expect(screen.getByRole("button", { name: "Working…" })).toBeDisabled();
  });

  it("disables both buttons and shows Deleting… after confirm", async () => {
    const user = userEvent.setup();
    renderDialog({ confirmLabel: "Delete expense", submittingLabel: "Deleting…", destructive: true });

    await user.click(screen.getByRole("button", { name: "Delete expense" }));

    expect(screen.getByRole("button", { name: "Deleting…" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
  });

  it("calls onCancel when Cancel is clicked", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    renderDialog({ onCancel });

    await user.click(screen.getByRole("button", { name: /cancel/i }));

    expect(onCancel).toHaveBeenCalled();
  });

  it("calls onCancel on Escape and on a scrim click", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    const { container } = renderDialog({ onCancel });

    await user.keyboard("{Escape}");
    expect(onCancel).toHaveBeenCalledTimes(1);

    await user.click(container.querySelector(".dialog-scrim")!);
    expect(onCancel).toHaveBeenCalledTimes(2);
  });

  it("focuses Cancel on open and traps Tab within the dialog", async () => {
    const user = userEvent.setup();
    renderDialog();

    expect(screen.getByRole("button", { name: /cancel/i })).toHaveFocus();

    await user.tab();
    expect(screen.getByRole("button", { name: /confirm/i })).toHaveFocus();

    await user.tab();
    expect(screen.getByRole("button", { name: /cancel/i })).toHaveFocus();
  });

  it("traps Shift+Tab within the dialog", async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.tab({ shift: true });
    expect(screen.getByRole("button", { name: /confirm/i })).toHaveFocus();

    await user.tab({ shift: true });
    expect(screen.getByRole("button", { name: /cancel/i })).toHaveFocus();
  });
});
