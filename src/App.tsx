import { AppShell } from "./shell/AppShell";

const loaders = {
  expenses: () => import("./shell/routes/ExpensesRoute"),
  reports: () => import("./shell/routes/ReportsRoute"),
};

export default function App() {
  return <AppShell loaders={loaders} />;
}
