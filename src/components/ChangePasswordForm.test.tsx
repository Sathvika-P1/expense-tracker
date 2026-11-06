import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { verifyPassword } from "../domain/accountRepository";
import { ChangePasswordForm } from "./ChangePasswordForm";

async function fill(current: string, next: string, confirm: string) {
  const onSaved = vi.fn();
  const onCancel = vi.fn();
  render(<ChangePasswordForm accountId="local-user" onSaved={onSaved} onCancel={onCancel} />);
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Current password"), current);
  await user.type(screen.getByLabelText("New password"), next);
  await user.type(screen.getByLabelText("Confirm new password"), confirm);
  return { user, onSaved, onCancel };
}

describe("ChangePasswordForm", () => {
  it("changes the password on valid input (AC9)", async () => {
    const { user, onSaved } = await fill("Passw0rd!", "NewPassw0rd!", "NewPassw0rd!");
    await user.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(await verifyPassword("local-user", "NewPassw0rd!")).toBe(true);
  });

  it("calls onCancel and keeps the password (AC10, AC11)", async () => {
    const { user, onCancel } = await fill("Passw0rd!", "NewPassw0rd!", "NewPassw0rd!");
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(await verifyPassword("local-user", "Passw0rd!")).toBe(true);
  });

  it("flags a wrong current password on the current field (AC20)", async () => {
    const { user, onSaved } = await fill("wrong", "NewPassw0rd!", "NewPassw0rd!");
    await user.click(screen.getByRole("button", { name: "Save" }));
    await screen.findByText("Current password is incorrect.");
    expect(screen.getByLabelText("Current password")).toHaveAccessibleDescription(
      "Current password is incorrect.",
    );
    expect(onSaved).not.toHaveBeenCalled();
  });

  it("flags a mismatched confirmation on the confirm field (AC21)", async () => {
    const { user, onSaved } = await fill("Passw0rd!", "NewPassw0rd!", "different");
    await user.click(screen.getByRole("button", { name: "Save" }));
    await screen.findByText("Passwords do not match.");
    expect(screen.getByLabelText("Confirm new password")).toHaveAccessibleDescription(
      "Passwords do not match.",
    );
    expect(onSaved).not.toHaveBeenCalled();
    expect(await verifyPassword("local-user", "Passw0rd!")).toBe(true);
  });
});
