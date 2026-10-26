import type { NavigationEntry, NavigationGroup } from "./types";

export class NavigationConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NavigationConfigError";
  }
}

export function buildNavigation(
  ...groups: NavigationGroup[]
): NavigationEntry[] {
  const merged: NavigationEntry[] = [];
  const seenIds = new Set<string>();
  const seenRoutes = new Set<string>();

  for (const group of groups) {
    for (const entry of group) {
      if (seenIds.has(entry.id)) {
        throw new NavigationConfigError(
          `Duplicate navigation entry key "${entry.id}"`,
        );
      }
      if (seenRoutes.has(entry.route)) {
        throw new NavigationConfigError(
          `Duplicate navigation entry route "${entry.route}"`,
        );
      }

      seenIds.add(entry.id);
      seenRoutes.add(entry.route);
      merged.push(entry);
    }
  }

  return merged;
}
