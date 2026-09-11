import { useState } from "react";
import type { NavigationEntry } from "../navigation/types";
import "./nav.css";

interface AppShellProps {
  destinations: NavigationEntry[];
}

export function AppShell({ destinations }: AppShellProps) {
  const [activeId, setActiveId] = useState<string>(destinations[0]?.id ?? "");

  const active =
    destinations.find((destination) => destination.id === activeId) ??
    destinations[0];

  return (
    <div>
      <h1>Expense Tracker</h1>
      <nav aria-label="Main navigation">
        <ul>
          {destinations.map((destination) => {
            const isActive = destination.id === active?.id;
            return (
              <li key={destination.id}>
                <a
                  href={destination.route}
                  className={isActive ? "nav-link nav-link--active" : "nav-link"}
                  aria-current={isActive ? "page" : undefined}
                  onClick={(event) => {
                    event.preventDefault();
                    setActiveId(destination.id);
                  }}
                >
                  {destination.label}
                </a>
              </li>
            );
          })}
        </ul>
      </nav>
      <main>{active?.render()}</main>
    </div>
  );
}
