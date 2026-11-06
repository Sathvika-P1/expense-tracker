import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProfileView } from "./ProfileView";
import type { DeleteAccountResult } from "../domain/accountRepository";

function setup(result: DeleteAccountResult = { ok: true }) {
  const onDeleteAccount = vi.fn(() => result);
  const onAccountGone = vi.fn();
  render(
    <ProfileView
      email="a@b.com"
      expenseCount={3}
      onDeleteAccount={onDeleteAccount}
      onAccountGone={onAccountGone}
    />,
  );
  return { onDeleteAccount, onAccountGone, user: userEvent.setup() };
}

describe("ProfileView", () => {
  it("shows a Delete button (AC1)", () => {
    setup();
    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
  });

  it("opens a confirmation dialog on Delete (AC2)", async () => {
    const { user } = setup();
    await user.click(screen.getByRole("button", { name: "Delete" }));
    const dialog = screen.getByRole("alertdialog");
    expect(dialog).toHaveTextContent("Delete your account?");
    expect(dialog).toHaveTextContent("All 3 of your expense records");
  });

  it("closes without deleting on Cancel (AC3)", async () => {
    const { user, onDeleteAccount, onAccountGone } = setup();
    await user.click(screen.getByRole("button", { name: "Delete" }));
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(onDeleteAccount).not.toHaveBeenCalled();
    expect(onAccountGone).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.getByRole("button", { name: "Delete" })).toHaveFocus());
  });

  it("navigates away after confirming (AC4)", async () => {
    const { user, onAccountGone } = setup();
    await user.click(screen.getByRole("button", { name: "Delete" }));
    await user.click(screen.getByRole("button", { name: "Delete account" }));
    expect(onAccountGone).toHaveBeenCalled();
  });

  it("navigates away when the session has expired (AC6)", async () => {
    const { user, onAccountGone } = setup({ ok: false, reason: "session-expired" });
    await user.click(screen.getByRole("button", { name: "Delete" }));
    await user.click(screen.getByRole("button", { name: "Delete account" }));
    expect(onAccountGone).toHaveBeenCalled();
  });

  it("shows a general error in the dialog on failure (AC7)", async () => {
    const { user, onAccountGone } = setup({ ok: false, reason: "failed" });
    await user.click(screen.getByRole("button", { name: "Delete" }));
    await user.click(screen.getByRole("button", { name: "Delete account" }));
    expect(within(screen.getByRole("alertdialog")).getByRole("alert")).toHaveTextContent(
      "We couldn't delete your account",
    );
    expect(onAccountGone).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Delete account" })).toBeEnabled();
  });
});
