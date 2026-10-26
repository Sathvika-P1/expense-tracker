import { buildNavigation } from "./navigation/buildNavigation";
import { dashboardNavigation } from "./features/dashboard/navigation";
import { expensesNavigation } from "./features/expenses/navigation";
import { AppShell } from "./shell/AppShell";

const destinations = buildNavigation(dashboardNavigation, expensesNavigation);

export default function App() {
  return <AppShell destinations={destinations} />;
}
