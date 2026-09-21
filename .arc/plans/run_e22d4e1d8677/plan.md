summary: |
  Add an inline, per-child-route error boundary so that when a routed page fails to load, the
  main content area shows an accessible error state with a Retry control while the navigation
  sidebar stays visible and usable, per ET-STORY-021. The codebase currently has NO routing, NO
  nav/sidebar, and NO `Outlet`/child-route concept at all (`src/App.tsx` is one flat page with
  the add-expense form and expense list, and `package.json` has no router dependency) — every
  acceptance criterion in this story presupposes that shell. This plan therefore introduces the
  minimum routed shell (react-router-dom layout route with a sidebar nav + `Outlet`, and four
  thin route pages: Dashboard, Expenses, Reports, Settings) needed to make the error boundary
  real and demonstrable, then builds the boundary itself on top of it, matching the approved
  prototype at `.arc/designs/ET-STORY-021-design.html` (sidebar, `.error-panel`, retry states,
  escalated-message state). The existing `AddExpenseForm`/`ExpenseList` functionality is
  relocated under the Expenses route rather than left dangling in a shell-less `App.tsx`.

scope:
  - description: |
      Add `react-router-dom` and restructure `src/App.tsx` into a routed shell: a layout
      component rendering the sidebar nav (per prototype `.sidebar`/`.nav-item`, 220px width,
      `aria-label="Primary"`, four `<button>`/`<Link>` items — Dashboard, Expenses, Reports,
      Settings — with `aria-current="page"` on the active route) plus a `<main class="main-content">`
      containing `<Outlet/>`. Router config:

      ```tsx
      const router = createBrowserRouter([
        {
          path: "/",
          element: <AppLayout />,
          children: [
            { index: true, element: <Navigate to="/dashboard" replace /> },
            { path: "dashboard", element: <DashboardPage />, errorElement: <RouteErrorBoundary /> },
            { path: "expenses", element: <ExpensesPage />, errorElement: <RouteErrorBoundary /> },
            { path: "reports", element: <ReportsPage />, errorElement: <RouteErrorBoundary /> },
            { path: "settings", element: <SettingsPage />, errorElement: <RouteErrorBoundary /> },
          ],
        },
      ]);
      ```
    files:
      - src/App.tsx
      - src/routes/AppLayout.tsx
      - src/routes/DashboardPage.tsx
      - src/routes/ExpensesPage.tsx
      - src/routes/ReportsPage.tsx
      - src/routes/SettingsPage.tsx
      - package.json
    rationale: |
      No routing/nav concept exists anywhere in `src/` today (confirmed by grep for
      `react-router|Outlet|createBrowserRouter|Route` returning no matches, and no ADR pins a
      router choice). AC1-3 all describe "a page with a navigation panel and a main content
      area" and "a child route" — that only means something once routes exist. `react-router-dom`
      is the idiomatic choice: `errorElement` + `useRouteError()` gives a per-route error boundary
      scoped exactly the way AC2/AC3 require (nav stays outside the boundary, in `AppLayout`).
      Dashboard/Reports/Settings pages are intentionally thin stubs (a heading, matching the
      prototype's fixture-only content) — building their real content is out of this story's scope.

  - description: |
      Move `AddExpenseForm` + `ExpenseList` (currently inline in `App.tsx`) into `ExpensesPage.tsx`
      unchanged, so the existing add/list flow keeps working under the new `/expenses` route.
      Update `src/App.test.tsx` to render the app at `/expenses` (e.g. wrap with a `MemoryRouter`
      or navigate) since it currently asserts the form/list render immediately from `<App/>`.
    files:
      - src/routes/ExpensesPage.tsx
      - src/App.test.tsx
    rationale: |
      `src/App.test.tsx:12-59` renders `<App/>` and expects the add-expense form and expense
      list to be visible immediately; once `App` becomes a router shell whose index route
      redirects to `/dashboard`, those three existing tests break unless they're pointed at the
      `/expenses` route. This is a real regression this plan causes and must be fixed, not just
      noted.

  - description: |
      Build `RouteErrorBoundary` as the child-route `errorElement`, matching the prototype's
      `.error-panel` exactly: `role="alert"` + `aria-live="assertive"` container, 40px round
      `.error-icon` with `!` glyph (`aria-hidden="true"`), `<h2>` + `<p>` message, and a
      `.error-actions` row with a Retry `<button class="btn btn-primary">`. Track a failure
      count in the boundary (via `useState`, reset to 0 keyed by `location.pathname` using
      `useRevalidator`'s `state` and a `resetKey` derived from the route) so:
        - first failure -> h2 "This section couldn't load", p "Something went wrong while
          loading Reports. Check your connection and try again." (message is genuinely per-route
          via `useRouteError()`/route name, not hardcoded to "Reports")
        - Retry click -> `useRevalidator().revalidate()`, button `disabled` + `data-loading="true"`
          + text "Retrying…", sibling status text "Reattempting the {route} route" (`aria-hidden="true"`,
          per prototype line 434)
        - second consecutive failure -> escalate to h2 "Still having trouble loading this", p
          "This keeps failing to load. It may be a longer-lasting problem — try again in a bit,
          or contact support if it continues.", status text "Failed 2 times", Retry button
          remains enabled (AC9)
        - successful revalidation replaces the boundary with the routed page content (AC7),
          because react-router unmounts `errorElement` once the loader/render no longer throws.

      Signature:
      ```tsx
      export function RouteErrorBoundary(): JSX.Element {
        const error = useRouteError();
        const revalidator = useRevalidator();
        const location = useLocation();
        const [failureCount, setFailureCount] = useState(1);
        // resets to 1 whenever location.pathname changes (new route, fresh boundary)
      }
      ```
    files:
      - src/routes/RouteErrorBoundary.tsx
      - src/routes/RouteErrorBoundary.test.tsx
    rationale: |
      This is the actual AC4-9 surface. The prototype (`.arc/designs/ET-STORY-021-design.html`
      screens 1-4) is the only source of the copy/markup, so the boundary must reproduce it
      verbatim rather than inventing new copy. Design note: the prototype puts both
      `role="alert"` and `aria-live="assertive"` on the same panel (line 427) — `role="alert"`
      already implies assertive live-region semantics, so this is redundant but harmless; I'm
      implementing it as-drawn rather than "fixing" the design. Only one live region is used —
      the escalated message replaces the same region's content rather than adding a second one.

  - description: |
      To make a "child route fails to load" reproducible in tests and in the running app without
      a real backend, the failing/loaded routes need a throwing seam. Give each stub page (or at
      minimum `ReportsPage`, matching the prototype's "Reports" screens) a data-loading function
      that can be forced to throw, wired through react-router's `loader` so `errorElement`
      activates on throw and clears on successful loader re-run via `revalidator.revalidate()`.
    files:
      - src/routes/ReportsPage.tsx
    rationale: |
      react-router's `errorElement` only activates from a thrown render/loader error, and
      `useRevalidator().revalidate()` is the supported way to "reattempt loading the same route"
      (AC6) without a full navigation. A `loader` that can throw is the smallest seam that makes
      AC6/AC7/AC8 testable end-to-end (render at the route, assert error, click Retry, assert
      recovery or escalation) rather than requiring a mocked network layer that doesn't exist yet.

tests:
  - |
    AC1 - inline error state renders in main content when a child route fails
    (src/routes/RouteErrorBoundary.test.tsx, rendered via a `createMemoryRouter` with a loader
    that throws):
    ```tsx
    it("renders an inline error panel in the main content area when the route loader throws", async () => {
      const router = createMemoryRouter(routesWithThrowingLoader, { initialEntries: ["/reports"] });
      render(<RouterProvider router={router} />);
      expect(await screen.findByRole("alert")).toBeInTheDocument();
      expect(screen.getByText(/couldn't load/i)).toBeInTheDocument();
    });
    ```
    Minimal code: register `errorElement={<RouteErrorBoundary />}` on the route; `RouteErrorBoundary`
    renders the `.error-panel` markup with `role="alert"`.
  - |
    AC2 - nav panel remains visible while the error state is shown:
    ```tsx
    it("keeps the sidebar nav visible while the error panel is shown", async () => {
      const router = createMemoryRouter(routesWithThrowingLoader, { initialEntries: ["/reports"] });
      render(<RouterProvider router={router} />);
      await screen.findByRole("alert");
      expect(screen.getByRole("navigation", { name: /primary/i })).toBeVisible();
    });
    ```
    Minimal code: `errorElement` is scoped to the child route's outlet slot only; `AppLayout`'s
    `<nav aria-label="Primary">` sits outside the router's error boundary and always renders.
  - |
    AC3 - selecting a different nav item loads the newly selected route:
    ```tsx
    it("loads a different route after navigating away from a failed one", async () => {
      const router = createMemoryRouter(routesWithThrowingLoader, { initialEntries: ["/reports"] });
      render(<RouterProvider router={router} />);
      await screen.findByRole("alert");
      await userEvent.click(screen.getByRole("link", { name: "Dashboard" }));
      expect(await screen.findByRole("heading", { name: "Dashboard" })).toBeInTheDocument();
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
    ```
    Minimal code: nav items are real `<Link to="/dashboard">` (or `<NavLink>`), so react-router
    navigation naturally discards the previous route's `errorElement`.
  - |
    AC4 - error state exposed to assistive tech via a live region:
    ```tsx
    it("exposes the error panel as an alert live region", async () => {
      const router = createMemoryRouter(routesWithThrowingLoader, { initialEntries: ["/reports"] });
      render(<RouterProvider router={router} />);
      const alert = await screen.findByRole("alert");
      expect(alert).toHaveAttribute("aria-live", "assertive");
    });
    ```
    Minimal code: `<div className="error-panel" role="alert" aria-live="assertive">` per prototype line 427.
  - |
    AC5 - Retry control is visible:
    ```tsx
    it("shows a Retry button in the error state", async () => {
      const router = createMemoryRouter(routesWithThrowingLoader, { initialEntries: ["/reports"] });
      render(<RouterProvider router={router} />);
      await screen.findByRole("alert");
      expect(screen.getByRole("button", { name: /retry/i })).toBeVisible();
    });
    ```
    Minimal code: render `<button className="btn btn-primary" onClick={() => revalidator.revalidate()}>Retry</button>`.
  - |
    AC6 - activating Retry reattempts loading the same route:
    ```tsx
    it("re-invokes the route loader when Retry is clicked", async () => {
      const loader = vi.fn().mockRejectedValueOnce(new Error("boom")).mockResolvedValueOnce({});
      const router = createMemoryRouter([{ path: "/reports", loader, element: <ReportsPage/>, errorElement: <RouteErrorBoundary/> }], { initialEntries: ["/reports"] });
      render(<RouterProvider router={router} />);
      await screen.findByRole("alert");
      await userEvent.click(screen.getByRole("button", { name: /retry/i }));
      expect(loader).toHaveBeenCalledTimes(2);
    });
    ```
    Minimal code: `revalidator.revalidate()` re-runs the same route's `loader`.
  - |
    AC7 - successful reload replaces the error state with route content:
    ```tsx
    it("replaces the error panel with the route content once the retry succeeds", async () => {
      const loader = vi.fn().mockRejectedValueOnce(new Error("boom")).mockResolvedValueOnce({});
      const router = createMemoryRouter([{ path: "/reports", loader, element: <ReportsPage/>, errorElement: <RouteErrorBoundary/> }], { initialEntries: ["/reports"] });
      render(<RouterProvider router={router} />);
      await screen.findByRole("alert");
      await userEvent.click(screen.getByRole("button", { name: /retry/i }));
      await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument());
      expect(screen.getByRole("heading", { name: "Reports" })).toBeInTheDocument();
    });
    ```
    Minimal code: no extra code needed beyond AC6's loader wiring — react-router unmounts
    `errorElement` automatically once the loader resolves without throwing.
  - |
    AC8 - a second consecutive failure escalates the message:
    ```tsx
    it("shows an escalated persistent-problem message after a second failed retry", async () => {
      const loader = vi.fn().mockRejectedValue(new Error("boom"));
      const router = createMemoryRouter([{ path: "/reports", loader, element: <ReportsPage/>, errorElement: <RouteErrorBoundary/> }], { initialEntries: ["/reports"] });
      render(<RouterProvider router={router} />);
      await screen.findByRole("alert");
      await userEvent.click(screen.getByRole("button", { name: /retry/i }));
      expect(await screen.findByText(/still having trouble loading this/i)).toBeInTheDocument();
    });
    ```
    Minimal code: `RouteErrorBoundary` increments a local `failureCount` state on each render
    triggered while `revalidator.state === "idle"` after a prior failure, and renders the
    escalated copy once `failureCount >= 2`.
  - |
    AC9 - Retry remains available on the escalated message:
    ```tsx
    it("keeps the Retry button enabled on the escalated error state", async () => {
      const loader = vi.fn().mockRejectedValue(new Error("boom"));
      const router = createMemoryRouter([{ path: "/reports", loader, element: <ReportsPage/>, errorElement: <RouteErrorBoundary/> }], { initialEntries: ["/reports"] });
      render(<RouterProvider router={router} />);
      await screen.findByRole("alert");
      await userEvent.click(screen.getByRole("button", { name: /retry/i }));
      await screen.findByText(/still having trouble loading this/i);
      expect(screen.getByRole("button", { name: /retry/i })).toBeEnabled();
    });
    ```
    Minimal code: the escalated-state branch renders the same enabled `<button>` element, not a
    disabled/removed one.

assumptions_or_open_questions:
  - |
    BIGGEST OPEN QUESTION: the codebase has no router, nav, or "child route" concept at all
    today (verified: `grep -r "react-router|Outlet|createBrowserRouter|Route" src/` returns
    nothing, `package.json` has no router dependency, no ADR pins one). This story's ACs cannot
    be built without first introducing that shell. I chose `react-router-dom` v7
    (`createBrowserRouter`/`errorElement`/`useRevalidator`) because it's the idiomatic fit for a
    per-route error boundary and matches the prototype's routed-looking sidebar (`aria-current="page"`).
    The alternative (a hand-rolled `useState`-based view switcher + class component boundary,
    no new dependency) is also defensible and cheaper, but doesn't generalize to real routes
    later. If the reviewer already has an upstream shell/router decision (e.g. from
    ET-STORY-020, whose design I have not read) that differs, this plan needs to be redone
    against that instead.
  - |
    I assumed Dashboard, Reports, and Settings pages only need thin stub content (a heading)
    since the prototype's card content for them ("Monthly summary — September 2026",
    "+$3,900.00", etc.) is explicitly prototype fixture copy, not real feature scope for this story.
  - |
    I assumed the existing `AddExpenseForm`/`ExpenseList` flow (ET-STORY-004/009) moves to the
    `/expenses` route with no behavior change, and that updating `src/App.test.tsx` to render at
    `/expenses` (rather than `/`) is in-scope as a required, non-optional fix for tests this plan
    breaks.
  - |
    I assumed "the same route" in AC6 means react-router's loader-revalidation model
    (`useRevalidator().revalidate()`) rather than a full page reload or re-navigation, since that
    is the supported mechanism for re-running a route's data loading without losing the rest of
    the app's state (e.g. nav highlighting).
  - |
    The prototype places both `role="alert"` and `aria-live="assertive"` on the same element
    (redundant, since `role="alert"` already implies an assertive live region) and marks the
    retry-status text `aria-hidden="true"`. I'm implementing this exactly as drawn rather than
    "correcting" it, since the prototype is the approved design of record.

package_dependencies:
  - name: react-router-dom
    version: ^7.9.0
    ecosystem: npm
    rationale: |
      No routing library exists in the project today. `react-router-dom` v7's data-router APIs
      (`createBrowserRouter`, `errorElement`, `useRouteError`, `useRevalidator`) are what let a
      per-child-route error boundary coexist with a persistent nav shell and support a
      Retry-triggered reload of just that route's data, which AC1-AC9 all depend on.

notes: |
  This plan's biggest risk is architectural, not implementation detail: it introduces the app's
  first router and nav shell as a side effect of an error-boundary story, because no prior story
  built one. If the reviewer would rather this shell land as its own separate piece of work (or
  already exists in a sibling branch/design I don't have visibility into), say so and this plan
  should be split or redone.

  ```mermaid
  flowchart TD
    AppTsx["App.tsx (router setup)"]:::touched
    AppLayout["routes/AppLayout.tsx (nav + Outlet, new)"]:::touched
    Dashboard["routes/DashboardPage.tsx (new)"]:::touched
    Expenses["routes/ExpensesPage.tsx (new, hosts existing form/list)"]:::touched
    Reports["routes/ReportsPage.tsx (new, throwing loader seam)"]:::touched
    Settings["routes/SettingsPage.tsx (new)"]:::touched
    Boundary["routes/RouteErrorBoundary.tsx (new, errorElement)"]:::touched
    AddForm["components/AddExpenseForm.tsx (unchanged, relocated call site)"]
    ExpList["components/ExpenseList.tsx (unchanged, relocated call site)"]
    AppTest["App.test.tsx (existing, updated to render /expenses)"]:::touched

    AppTsx -->|"createBrowserRouter([...])"| AppLayout
    AppLayout -->|"Outlet renders active child route"| Dashboard
    AppLayout --> Expenses
    AppLayout --> Reports
    AppLayout --> Settings
    Reports -->|"errorElement on throw/loader reject"| Boundary
    Dashboard -->|"errorElement"| Boundary
    Expenses -->|"errorElement"| Boundary
    Settings -->|"errorElement"| Boundary
    Expenses -->|"renders unchanged"| AddForm
    Expenses -->|"renders unchanged"| ExpList
    AppTest -->|"asserts against /expenses route"| Expenses

    classDef touched fill:#f96,color:#000
  ```
