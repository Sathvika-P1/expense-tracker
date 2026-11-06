import { CURRENCIES } from "./currencies";

describe("CURRENCIES", () => {
  it("is the fixed product currency list", () => {
    expect(CURRENCIES.map((c) => c.code)).toEqual(["USD", "EUR", "GBP", "INR", "AUD", "CAD"]);
  });
});
