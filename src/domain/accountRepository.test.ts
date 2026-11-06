import { changePassword, getAccount, updateProfile, verifyPassword } from "./accountRepository";

const valid = { name: "Priya Rao", email: "priya@example.com", currency: "EUR" };

describe("accountRepository", () => {
  it("seeds idempotently, hashes the password and leaves expenses alone", () => {
    localStorage.setItem("expenses", "[]");
    const first = getAccount();
    expect(first.email).toBe("sathvika@example.com");
    getAccount();
    const stored = JSON.parse(localStorage.getItem("accounts")!);
    expect(stored).toHaveLength(2);
    expect(stored[0].passwordHash).not.toContain("Passw0rd!");
    expect(localStorage.getItem("expenses")).toBe("[]");
  });

  it("updates and trims the profile", () => {
    const r = updateProfile("local-user", { ...valid, name: "  Priya Rao " });
    expect(r.ok).toBe(true);
    expect(getAccount()).toMatchObject({ name: "Priya Rao", email: "priya@example.com", currency: "EUR" });
  });

  it("allows keeping the own email", () => {
    expect(updateProfile("local-user", { ...valid, email: "SATHVIKA@example.com" }).ok).toBe(true);
  });

  it.each([
    ["blank name", { ...valid, name: "" }],
    ["invalid email", { ...valid, email: "nope" }],
    ["duplicate email", { ...valid, email: "asha.menon@example.com" }],
    ["duplicate email, other case", { ...valid, email: "ASHA.MENON@example.com" }],
  ])("rejects %s and writes nothing", (_n, input) => {
    const before = getAccount();
    const r = updateProfile("local-user", input);
    expect(r.ok).toBe(false);
    expect(getAccount()).toEqual(before);
  });

  it("reports the duplicate email message", () => {
    expect(updateProfile("local-user", { ...valid, email: "asha.menon@example.com" })).toEqual({
      ok: false,
      errors: { email: "That email address is already used by another account." },
    });
  });

  it("changes the password", async () => {
    const r = await changePassword("local-user", {
      current: "Passw0rd!",
      next: "NewPassw0rd!",
      confirm: "NewPassw0rd!",
    });
    expect(r).toEqual({ ok: true });
    expect(await verifyPassword("local-user", "NewPassw0rd!")).toBe(true);
    expect(await verifyPassword("local-user", "Passw0rd!")).toBe(false);
  });

  it.each([
    ["wrong current", { current: "wrong", next: "NewPassw0rd!", confirm: "NewPassw0rd!" }],
    ["mismatch", { current: "Passw0rd!", next: "NewPassw0rd!", confirm: "different" }],
  ])("leaves the password unchanged on %s", async (_n, input) => {
    const before = getAccount();
    const r = await changePassword("local-user", input);
    expect(r.ok).toBe(false);
    expect(await verifyPassword("local-user", "Passw0rd!")).toBe(true);
    expect(getAccount().passwordHash).toBe(before.passwordHash);
  });

  it("reports wrong current on the current field", async () => {
    const r = await changePassword("local-user", { current: "wrong", next: "NewPassw0rd!", confirm: "NewPassw0rd!" });
    expect(r).toEqual({ ok: false, errors: { current: "Current password is incorrect." } });
  });
});
