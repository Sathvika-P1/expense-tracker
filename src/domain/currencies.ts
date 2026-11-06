export const CURRENCIES = [
  { code: "USD", label: "US dollar (USD)" },
  { code: "EUR", label: "Euro (EUR)" },
  { code: "GBP", label: "British pound (GBP)" },
  { code: "INR", label: "Indian rupee (INR)" },
  { code: "AUD", label: "Australian dollar (AUD)" },
  { code: "CAD", label: "Canadian dollar (CAD)" },
] as const;

export type CurrencyCode = (typeof CURRENCIES)[number]["code"];
