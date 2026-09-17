import type { Expense } from "./expense";

export interface MonthlyTotal {
  key: string;
  label: string;
  total: number;
}

const DATE_SHAPE = /^\d{4}-\d{2}-\d{2}$/;

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function isValidDate(value: unknown): value is string {
  return (
    typeof value === "string" &&
    DATE_SHAPE.test(value) &&
    new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value
  );
}

function formatMonthLabel(key: string): string {
  const [year, month] = key.split("-");
  return `${MONTH_NAMES[Number(month) - 1]} ${year}`;
}

export function groupByMonth(expenses: Expense[]): MonthlyTotal[] {
  const totals = new Map<string, number>();
  for (const expense of expenses) {
    const key = expense.date.slice(0, 7);
    totals.set(key, (totals.get(key) ?? 0) + expense.amount);
  }
  return [...totals.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([key, total]) => ({ key, total, label: formatMonthLabel(key) }));
}
