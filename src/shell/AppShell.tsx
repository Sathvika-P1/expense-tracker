import React, { Suspense, useState } from "react";
import { Navigation, type Destination } from "./Navigation";
import { RouteErrorBoundary } from "./RouteErrorBoundary";

type Loaders = Record<Destination, () => Promise<{ default: React.ComponentType }>>;

type AppShellProps = { loaders: Loaders };

export function AppShell({ loaders }: AppShellProps) {
  const [dest, setDest] = useState<Destination>("expenses");
  const [attempt, setAttempt] = useState(0);

  const select = (next: Destination) => {
    setDest(next);
    setAttempt((a) => a + 1);
  };

  const LazyContent = React.useMemo(
    () => React.lazy(loaders[dest]),
    [loaders, dest, attempt],
  );

  return (
    <>
      <Navigation current={dest} onSelect={select} />
      <main>
        <RouteErrorBoundary key={`${dest}:${attempt}`}>
          <Suspense fallback={<div>Loading...</div>}>
            <LazyContent />
          </Suspense>
        </RouteErrorBoundary>
      </main>
    </>
  );
}
