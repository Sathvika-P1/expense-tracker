import { Suspense, lazy, useMemo, useRef, useState } from "react";
import { DEFAULT_ROUTE, ROUTES, type RouteKey } from "../routes";
import { RouteErrorBoundary } from "./RouteErrorBoundary";

function RouteOutlet({ routeKey, onLoaded }: { routeKey: RouteKey; onLoaded: () => void }) {
  const [attempt, setAttempt] = useState(0);
  const route = ROUTES.find((r) => r.key === routeKey)!;

  // React.lazy caches a rejected promise, so a fresh lazy component is built per attempt.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const Page = useMemo(() => route.eager ?? lazy(route.load), [routeKey, attempt]);

  async function retry() {
    try {
      await route.load();
    } catch (error) {
      console.error(`Retry failed to load the ${route.label} route`, error);
      return false;
    }
    setAttempt((n) => n + 1);
    onLoaded();
    return true;
  }

  return (
    <RouteErrorBoundary routeLabel={route.label} onRetry={retry}>
      <Suspense fallback={<p role="status">Loading…</p>}>
        <Page />
      </Suspense>
    </RouteErrorBoundary>
  );
}

export function AppShell() {
  const [current, setCurrent] = useState<RouteKey>(DEFAULT_ROUTE);
  const mainRef = useRef<HTMLElement>(null);

  return (
    <div className="app-shell">
      <nav className="sidebar" aria-label="Primary">
        <div className="sidebar-brand">Expense Tracker</div>
        {ROUTES.map((route) => (
          <button
            key={route.key}
            type="button"
            className="nav-item"
            aria-current={route.key === current ? "page" : undefined}
            onClick={() => setCurrent(route.key)}
          >
            {route.label}
          </button>
        ))}
      </nav>
      <main className="main-content" ref={mainRef} tabIndex={-1}>
        <RouteOutlet key={current} routeKey={current} onLoaded={() => mainRef.current?.focus()} />
      </main>
    </div>
  );
}
