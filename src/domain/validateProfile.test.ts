import { validatePasswordForm, validateProfile } from "./validateProfile";

describe("validateProfile", () => {
  it("accepts valid input", () => {
    expect(validateProfile({ name: "A", email: "a@b.co", currency: "USD" })).toEqual({});
  });
  it("flags blank name", () => {
    expect(validateProfile({ name: "  ", email: "a@b.co", currency: "USD" }).name).toBe(
      "Enter your full name.",
    );
  });
  it("flags invalid email", () => {
    expect(validateProfile({ name: "A", email: "sathvika@example", currency: "USD" }).email).toBe(
      "Enter a valid email address, like name@example.com.",
    );
  });
  it("flags currency outside the list", () => {
    expect(validateProfile({ name: "A", email: "a@b.co", currency: "XXX" }).currency).toBeDefined();
  });
});

describe("validatePasswordForm", () => {
  it("flags mismatch on confirm", () => {
    expect(validatePasswordForm({ current: "x", next: "abcdefgh", confirm: "abcdefgX" }).confirm).toBe(
      "Passwords do not match.",
    );
  });
  it("flags short new password", () => {
    expect(validatePasswordForm({ current: "x", next: "abc", confirm: "abc" }).next).toBe(
      "New password must be at least 8 characters.",
    );
  });
  it("accepts valid input", () => {
    expect(validatePasswordForm({ current: "x", next: "abcdefgh", confirm: "abcdefgh" })).toEqual({});
  });
});
