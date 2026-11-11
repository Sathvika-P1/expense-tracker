import type { ReactNode } from "react";

export interface NavigationEntry {
  id: string;
  label: string;
  route: string;
  render: () => ReactNode;
}

export type NavigationGroup = readonly NavigationEntry[];
