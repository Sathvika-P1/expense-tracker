import type { NavigationGroup } from "../../navigation/types";
import { Dashboard } from "./Dashboard";

export const dashboardNavigation: NavigationGroup = [
  {
    id: "dashboard",
    label: "Dashboard",
    route: "/dashboard",
    render: () => <Dashboard />,
  },
];
