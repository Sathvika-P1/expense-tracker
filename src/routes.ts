import type { ComponentType } from "react";
import ExpensesPage from "./pages/ExpensesPage";

export type RouteKey = "dashboard" | "expenses" | "reports" | "settings";
export type RouteLoader = () => Promise<{ default: ComponentType }>;
export type Route = {
  key: RouteKey;
  label: string;
  load: RouteLoader;
  /** Bundled with the app so the default route renders at mount without a lazy load. */
  eager?: ComponentType;
};

export const ROUTES: Route[] = [
  { key: "dashboard", label: "Dashboard", load: () => import("./pages/DashboardPage") },
  {
    key: "expenses",
    label: "Expenses",
    load: () => Promise.resolve({ default: ExpensesPage }),
    eager: ExpensesPage,
  },
  { key: "reports", label: "Reports", load: () => import("./pages/ReportsPage") },
  { key: "settings", label: "Settings", load: () => import("./pages/SettingsPage") },
];

export const DEFAULT_ROUTE: RouteKey = "expenses";
