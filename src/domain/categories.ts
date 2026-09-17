export const CATEGORIES = [
  "Food",
  "Transport",
  "Housing",
  "Utilities",
  "Entertainment",
  "Other",
] as const;

export type Category = (typeof CATEGORIES)[number];
