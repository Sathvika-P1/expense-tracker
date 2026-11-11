summary: |
  Add an inline child-route error boundary to the app. Today `src/App.tsx` is a single page with no navigation panel and no route concept (list/edit/access-denied are `view` modes), so the story needs a minimal app shell: a left navigation panel (Dashboard, Expenses, Reports, Settings, per the approved prototype) and a main content area that renders the selected child route lazily. A `RouteErrorBoundary` wraps only the main content area; when the route's lazy load fails it shows the prototype's `.error-panel` (role="alert", Retry button) while the nav stays rendered and clickable. Retry re-attempts the same route's loader, success replaces the panel with the route, a second consecutive failure shows the escalated "Still having trouble loading this" message with Retry still present, and selecting another nav item resets the boundary and loads that route. No new dependencies, no router library.
scope:
  - description: |
      Route registry. Define the nav items and a lazy loader per route.

      ```ts
      export type RouteKey = "dashboard" | "expenses" | "reports" | "settings";
      export type RouteLoader = () => Promise<{ default: ComponentType }>;
      export const ROUTES: { key: RouteKey; label: string; load: RouteLoader }[];
      export const DEFAULT_ROUTE: RouteKey = "expenses";
      ```
      `expenses` loads the existing expenses page; the other three load minimal placeholder pages (an h1-less body line) so the shell has real child routes. Default route stays `expenses` so existing App tests (list visible at mount) keep passing.
    files:
      - src/routes.ts
      - src/pages/ExpensesPage.tsx
      - src/pages/DashboardPage.tsx
      - src/pages/ReportsPage.tsx
      - src/pages/SettingsPage.tsx
    rationale: |
      Lazy loaders are the only realistic way a child route "fails to load" in a client-only Vite app (dynamic import rejection), and give Retry something concrete to re-run.
      ExpensesPage is the current body of `App` (state, handlers, list/edit/access-denied views) moved verbatim; its three `<main>` wrappers become `<div>` because the shell now owns the single `<main>` landmark.
  - description: |
      `RouteErrorBoundary` (class component, the only way to catch render/lazy errors) in the prototype's `.error-panel` markup: icon `!` (aria-hidden), h2, p, Retry `.btn .btn-primary`, small muted status text.

      ```ts
      type Props = {
        routeLabel: string;
        onRetry: () => Promise<boolean>; // true when the route loader resolved
        children: ReactNode;
      };
      // state: { failed: boolean; failureCount: number; retrying: boolean }
      ```
      Behaviour: `getDerivedStateFromError` sets failed and increments failureCount. First failure message: "Something went wrong while loading {routeLabel}. Check your connection and try again." with h2 "This section couldn't load". failureCount >= 2: h2 "Still having trouble loading this", body "This keeps failing to load. It may be a longer-lasting problem — try again in a bit, or contact support if it continues.", muted "Failed {n} times". Retry click: set retrying (button disabled, label "Retrying…", `data-loading="true"`), await `onRetry()`; true resets state to render children again, false increments failureCount and re-enables Retry. Panel root has `role="alert"` and `aria-live="assertive"`.
    files:
      - src/components/RouteErrorBoundary.tsx
    rationale: |
      Covers AC1, 4, 5, 6, 7, 8, 9. Retry preloads via the loader first because React.lazy caches a rejected promise; a fresh loader call is the only way to genuinely reattempt.
  - description: |
      `AppShell` renders `<div className="app-shell">` with `<nav className="sidebar" aria-label="Primary">` (brand "Expense Tracker" plus one `.nav-item` button per route, `aria-current="page"` on the selected one) and `<main className="main-content">` containing the route outlet. The outlet keys `RouteErrorBoundary` by route key so selecting another item remounts it (clearing the error, AC3) and builds a fresh `React.lazy(route.load)` inside `useMemo` keyed on route key and an `attempt` counter, wrapped in `Suspense` with a simple "Loading…" `role="status"` fallback. `onRetry` calls `route.load()`, on success bumps `attempt` and returns true, on rejection returns false.
    files:
      - src/components/AppShell.tsx
      - src/App.tsx
    rationale: |
      `App` becomes `export default function App() { return <AppShell />; }`. The boundary sits inside `<main>` and the nav outside it, which is what keeps navigation visible and functional on failure (AC2, AC3).
  - description: |
      Styles appended to the existing global stylesheet that main.tsx already imports (src/design-system/prototype-utils.css, imported at src/main.tsx line 5 after tokens.css at line 4): copy the prototype's `.app-shell`, `.sidebar`, `.sidebar-brand`, `.nav-item` (+hover, focus-visible, `[aria-current="page"]`), `.main-content`, `.error-panel`, `.error-icon`, `.error-body`, `.error-actions`, `.btn[data-loading="true"]::after` spinner with `prefers-reduced-motion`, and the `max-width: 640px` stacked-nav media query. Tokens used: --color-border, --color-bg, --color-fg, --color-primary, --color-primary-fg, --color-negative, --space-1..4, --radius-sm, --radius-lg, --font-family-base, --font-family-heading, --font-size-md, --font-size-lg, --font-weight-bold, --border-width-thin, --focus-ring-width, --focus-ring-offset. Existing `.btn:disabled` rule already covers the disabled Retry. No new loader of tokens is needed since they are already loaded.
    files:
      - src/design-system/prototype-utils.css
    rationale: |
      Reuses the existing token loading and the shared `.btn`, `.btn-primary`, `.heading` classes. Raw pixel values in the prototype with no token (220px sidebar, 44px nav min-height, 40px icon, 640px max-width, 14px spinner) are listed in open questions rather than silently copied.
  - description: |
      Tests, written first (see `tests`): a boundary unit test and an AppShell integration test that mocks a route loader.
    files:
      - src/components/RouteErrorBoundary.test.tsx
      - src/components/AppShell.test.tsx
    rationale: Test-first; existing App.test.tsx stays unchanged and must still pass.
tests:
  - |
    AC1 (src/components/AppShell.test.tsx). Mock the reports loader to reject, click Reports in the nav. Write first; fails because no AppShell exists.
    ```ts
    vi.spyOn(routes.ROUTES.find(r => r.key === "reports")!, "load").mockRejectedValue(new Error("chunk"));
    await user.click(screen.getByRole("button", { name: "Reports" }));
    expect(await screen.findByText("This section couldn't load")).toBeInTheDocument();
    expect(within(screen.getByRole("main")).getByRole("alert")).toBeInTheDocument();
    ```
  - |
    AC2. After the failure, the nav is still present and still shows the selected item.
    ```ts
    expect(screen.getByRole("navigation", { name: "Primary" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Reports" })).toHaveAttribute("aria-current", "page");
    ```
  - |
    AC3. With the Reports error showing, click Dashboard; the error is gone and Dashboard content renders.
    ```ts
    await user.click(screen.getByRole("button", { name: "Dashboard" }));
    expect(await screen.findByText(/dashboard/i, { selector: "[data-testid=route-dashboard]" })).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    ```
  - |
    AC4 (src/components/RouteErrorBoundary.test.tsx). Render a child that throws.
    ```ts
    const alert = screen.getByRole("alert");
    expect(alert).toHaveAttribute("aria-live", "assertive");
    expect(alert).toHaveTextContent(/couldn't load/i);
    ```
  - |
    AC5. Retry control visible in the error state.
    ```ts
    expect(screen.getByRole("button", { name: "Retry" })).toBeVisible();
    ```
  - |
    AC6. Clicking Retry calls the loader for the same route once more.
    ```ts
    const onRetry = vi.fn().mockResolvedValue(false);
    await user.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
    ```
    In AppShell.test.tsx also assert `expect(reportsLoad).toHaveBeenCalledTimes(2)` (initial attempt plus retry), and that the Retry button is disabled with name "Retrying…" while the promise is pending.
  - |
    AC7 (AppShell.test.tsx). Loader rejects the first call, resolves the second with a component.
    ```ts
    reportsLoad.mockRejectedValueOnce(new Error("x")).mockResolvedValueOnce({ default: () => <p>Monthly summary</p> });
    await user.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByText("Monthly summary")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    ```
  - |
    AC8. Loader rejects twice; after the Retry click the escalated copy shows.
    ```ts
    await user.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByText("Still having trouble loading this")).toBeInTheDocument();
    expect(screen.getByText(/longer-lasting problem/i)).toBeInTheDocument();
    ```
  - |
    AC9. In the escalated state Retry is present and enabled.
    ```ts
    expect(screen.getByRole("button", { name: "Retry" })).toBeEnabled();
    ```
  - |
    Regression. Existing src/App.test.tsx passes unchanged (default route is Expenses). Run narrowly with `npm test -- src/components/AppShell.test.tsx src/components/RouteErrorBoundary.test.tsx src/App.test.tsx`.
assumptions_or_open_questions:
  - |
    The app has no navigation panel, router or route concept today (src/App.tsx is a single page with view modes; package.json has no router). The story presumes the epic's shell exists. I plan a minimal state-based shell here with no router dependency. If another story is meant to supply the shell or a router (e.g. react-router), this plan should be rebased onto it.
  - |
    Dashboard, Reports and Settings have no defined content anywhere; I plan placeholder pages only so the nav items resolve to real lazy routes. The prototype's sample Reports/Dashboard cards (monthly summary, balances) are fixture copy and are not built.
  - |
    Prototype raw values with no token (sidebar 220px, nav-item min-height 44px, error-icon 40px, error-panel max-width 640px, spinner 14px and 2px border, 640px breakpoint, 46px review-bar offset) have no matching token. The 46px is reviewer-bar only and is not built. For the others I propose calc() on --space-* where one fits (for example the existing `calc(var(--space-4) * 14)` pattern in prototype-utils.css) and ask the reviewer to confirm, or to add tokens.
  - |
    The prototype's skeleton loader CSS has no screen; I use a plain role="status" "Loading…" Suspense fallback and do not build the skeleton.
  - |
    The prototype shows "Failed 2 times" in the escalated state. I treat the escalation threshold as the second consecutive failure and the counter as consecutive failures since the last success or route change.
  - |
    The prototype shows an h1 route title above the panel. Existing pages already render an h1 "Expense Tracker"; I keep that and add no second h1 for the shell, and the error panel therefore sits under the page's existing heading or, for failed routes, under no heading other than its own h2. Confirm whether the shell should render a per-route h1 instead.
estimated_points: 5
package_dependencies: []
notes: |
  ### Data & rollout
  None — client-side UI only; no stored data, schema, settings or env vars change. localStorage expense data is untouched (the Expenses page is moved, not altered).

  Stack: React + TypeScript, npm, vitest with jsdom and Testing Library (package.json, vite.config.ts). Tokens load via `import "./design-system/tokens.css"` and `import "./design-system/prototype-utils.css"` in src/main.tsx lines 4-5; all new styling goes in prototype-utils.css using token variables. Component reuse: ExpenseList, AddExpenseForm, EditExpenseForm and ConfirmDialog are reused unchanged inside ExpensesPage; no catalogued component covers a nav panel or error panel, so AppShell and RouteErrorBoundary are new. ADR-0010 (cross-cutting error handling) and ADR-0009 (accessibility) apply; the live region and focus-visible styles follow them.

  ```mermaid
  flowchart TD
    main[src/main.tsx] --> App[src/App.tsx]
    App --> Shell[AppShell]
    Shell --> Boundary[RouteErrorBoundary]
    Shell --> Routes[src/routes.ts]
    Routes --> Exp[ExpensesPage]
    Exp --> List[ExpenseList]
    Exp --> Add[AddExpenseForm]
    Exp --> Edit[EditExpenseForm]
    main --> CSS[prototype-utils.css]
    classDef touched fill:#f96,color:#000
    class App,Shell,Boundary,Routes,Exp,CSS touched
  ```
  App is reduced to the shell; Shell and Boundary are new; Routes holds the lazy loaders; ExpensesPage receives the old App body; the CSS gains the shell and error-panel styles.
review_focus: |
  IN: a minimal state-based shell, one error boundary around the main content area only, Retry and escalation, and the move of the existing App body into ExpensesPage. OUT: a router library, real Dashboard/Reports/Settings content, and any change to expense behaviour. Riskiest areas are Retry semantics (React.lazy caches rejections, so Retry preloads via a fresh loader call and then re-keys the lazy component) and the App to ExpensesPage move, which must leave App.test.tsx green. The shell's existence is itself an assumption because the repo has no nav today.
