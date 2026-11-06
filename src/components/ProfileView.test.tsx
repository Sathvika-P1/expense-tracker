import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { getAccount, verifyPassword } from "../domain/accountRepository";
import { ProfileView } from "./ProfileView";

async function openEdit() {
  const user = userEvent.setup();
  render(<ProfileView />);
  await user.click(screen.getByRole("button", { name: "Edit profile" }));
  return user;
}

function details() {
  return within(screen.getByRole("region", { name: "Account details" }));
}

describe("ProfileView", () => {
  it("opens an inline Edit profile form (AC1)", async () => {
    await openEdit();
    expect(screen.getByRole("heading", { name: "Edit profile" })).toBeInTheDocument();
    expect(screen.getByLabelText("Full name")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Default currency")).toBeInTheDocument();
  });

  it("shows the new name, email and currency after Save and stays on Profile (AC2,3,4,7)", async () => {
    const user = await openEdit();
    await user.clear(screen.getByLabelText("Full name"));
    await user.type(screen.getByLabelText("Full name"), "Priya Rao");
    await user.clear(screen.getByLabelText("Email"));
    await user.type(screen.getByLabelText("Email"), "priya@example.com");
    await user.selectOptions(screen.getByLabelText("Default currency"), "EUR");
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    expect(screen.getByRole("heading", { level: 1, name: "Priya Rao" })).toBeInTheDocument();
    expect(details().getByText("priya@example.com")).toBeInTheDocument();
    expect(details().getByText("Euro (EUR)")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Profile updated.");
    expect(screen.getByRole("button", { name: "Edit profile" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Edit profile" })).not.toBeInTheDocument();
  });

  it("closes the form and keeps previous values on Cancel (AC5, AC6)", async () => {
    const user = await openEdit();
    await user.clear(screen.getByLabelText("Full name"));
    await user.type(screen.getByLabelText("Full name"), "Priya Rao");
    await user.selectOptions(screen.getByLabelText("Default currency"), "EUR");
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("heading", { name: "Edit profile" })).not.toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 1, name: "Sathvika Papishetti" }),
    ).toBeInTheDocument();
    expect(details().getByText("sathvika@example.com")).toBeInTheDocument();
    expect(details().getByText("US dollar (USD)")).toBeInTheDocument();
  });

  it("keeps the form open and previous values on a failed Save (AC18, AC19)", async () => {
    const user = await openEdit();
    const before = getAccount();
    await user.clear(screen.getByLabelText("Email"));
    await user.type(screen.getByLabelText("Email"), "asha.menon@example.com");
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    expect(screen.getByRole("heading", { name: "Edit profile" })).toBeInTheDocument();
    expect(getAccount()).toEqual(before);
  });

  it("opens an inline Update password form (AC8)", async () => {
    const user = userEvent.setup();
    render(<ProfileView />);
    await user.click(screen.getByRole("button", { name: /Update password/ }));
    expect(screen.getByRole("heading", { name: "Update password" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
  });

  it("closes the password form on Cancel and keeps the password (AC10, AC11)", async () => {
    const user = userEvent.setup();
    render(<ProfileView />);
    await user.click(screen.getByRole("button", { name: /Update password/ }));
    await user.type(screen.getByLabelText("Current password"), "Passw0rd!");
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("heading", { name: "Update password" })).not.toBeInTheDocument();
    expect(await verifyPassword("local-user", "Passw0rd!")).toBe(true);
  });

  it("confirms a password change", async () => {
    const user = userEvent.setup();
    render(<ProfileView />);
    await user.click(screen.getByRole("button", { name: /Update password/ }));
    await user.type(screen.getByLabelText("Current password"), "Passw0rd!");
    await user.type(screen.getByLabelText("New password"), "NewPassw0rd!");
    await user.type(screen.getByLabelText("Confirm new password"), "NewPassw0rd!");
    await user.click(screen.getAllByRole("button", { name: "Update password" }).at(-1)!);
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Password updated."));
  });

  it("shows no currency selector while the form is closed (AC12)", () => {
    render(<ProfileView />);
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Default currency")).not.toBeInTheDocument();
  });

  it("shows a Change photo placeholder that opens nothing (AC13, AC14)", async () => {
    const clickSpy = vi.spyOn(HTMLInputElement.prototype, "click");
    const user = userEvent.setup();
    render(<ProfileView />);
    await user.click(screen.getByRole("button", { name: "Change photo" }));
    expect(document.querySelector('input[type="file"]')).toBeNull();
    expect(clickSpy).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
