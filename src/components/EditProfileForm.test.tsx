import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { getAccount } from "../domain/accountRepository";
import { CURRENCIES } from "../domain/currencies";
import { EditProfileForm } from "./EditProfileForm";

function setup() {
  const onSaved = vi.fn();
  const onCancel = vi.fn();
  render(<EditProfileForm account={getAccount()} onSaved={onSaved} onCancel={onCancel} />);
  return { onSaved, onCancel, user: userEvent.setup() };
}

describe("EditProfileForm", () => {
  it("offers the fixed currency list (AC23)", () => {
    setup();
    const select = screen.getByLabelText("Default currency");
    expect(
      within(select)
        .getAllByRole("option")
        .map((o) => o.getAttribute("value")),
    ).toEqual(CURRENCIES.map((c) => c.code));
  });

  it("shows an inline error on a blank name (AC15)", async () => {
    const { user } = setup();
    await user.clear(screen.getByLabelText("Full name"));
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    const input = screen.getByLabelText("Full name");
    expect(input).toHaveAccessibleDescription("Enter your full name.");
    expect(input).toHaveAttribute("aria-invalid", "true");
  });

  it("shows an inline error on an invalid email (AC16)", async () => {
    const { user } = setup();
    await user.clear(screen.getByLabelText("Email"));
    await user.type(screen.getByLabelText("Email"), "sathvika@example");
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    expect(screen.getByLabelText("Email")).toHaveAccessibleDescription(
      "Enter a valid email address, like name@example.com.",
    );
  });

  it("shows an inline error on a duplicate email (AC17)", async () => {
    const { user } = setup();
    await user.clear(screen.getByLabelText("Email"));
    await user.type(screen.getByLabelText("Email"), "asha.menon@example.com");
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    expect(screen.getByLabelText("Email")).toHaveAccessibleDescription(
      "That email address is already used by another account.",
    );
  });

  it.each([
    ["blank name", "Full name", ""],
    ["invalid email", "Email", "nope"],
    ["duplicate email", "Email", "asha.menon@example.com"],
  ])("stays open and does not save on %s (AC18)", async (_n, label, value) => {
    const { user, onSaved } = setup();
    const field = screen.getByLabelText(label);
    await user.clear(field);
    if (value) await user.type(field, value);
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    expect(onSaved).not.toHaveBeenCalled();
    expect(screen.getByRole("heading", { name: "Edit profile" })).toBeInTheDocument();
  });

  it("saves valid changes and calls onSaved", async () => {
    const { user, onSaved } = setup();
    await user.clear(screen.getByLabelText("Full name"));
    await user.type(screen.getByLabelText("Full name"), "Priya Rao");
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    expect(onSaved).toHaveBeenCalledWith(expect.objectContaining({ name: "Priya Rao" }));
  });

  it("calls onCancel without saving (AC5)", async () => {
    const { user, onCancel } = setup();
    await user.clear(screen.getByLabelText("Full name"));
    await user.type(screen.getByLabelText("Full name"), "Priya Rao");
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(getAccount().name).toBe("Sathvika Papishetti");
  });
});
