export const CATEGORIES = [
  "Food",
  "Travel",
  "Shopping",
  "Bills",
  "Healthcare",
  "Others",
] as const;

export type Category = (typeof CATEGORIES)[number];
