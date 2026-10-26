import type { NavigationGroup } from "../../navigation/types";
import { ExpensePage } from "./ExpensePage";

export const expensesNavigation: NavigationGroup = [
  {
    id: "expense-list",
    label: "Expense list",
    route: "/expenses",
    render: () => <ExpensePage />,
  },
];
