summary: |
  This story introduces a minimal app shell (navigation + a routable main content
  area) and an inline error boundary around the content area, so that when a child
  route's lazily-loaded module fails, an error message renders inline while the
  navigation chrome stays usable. The codebase currently has no shell, router, or
  navigation at all -- `App.tsx` renders a single flat expense-tracker view -- so
  this plan builds the smallest shell that can host the error-boundary behavior
  (destination state, lazy module loading, a class-based error boundary keyed for
  retry) without pulling in a routing library or building the full responsive
  layout, both of which belong to other stories in the parent "UI Shell &
  Responsiveness" epic.

scope:
  - description: |
      Create `RouteErrorBoundary`, a class component that catches render/load
      errors from its children and displays an inline error message in place of
      the failed content, without unmounting anything outside itself.
      Signature:
      ```tsx
      type Props = { children: React.ReactNode };
      type State = { hasError: boolean };
      class RouteErrorBoundary extends React.Component<Props, State> {
        state: State = { hasError: false };
        static getDerivedStateFromError(): State { return { hasError: true }; }
        componentDidCatch(error: unknown) { /* no-op, error already surfaced via state */ }
        render() {
          if (this.state.hasError) {
            return <div role="alert">Something went wrong loading this page.</div>;
          }
          return this.props.children;
        }
      }
      ```
    files:
      - src/shell/RouteErrorBoundary.tsx
      - src/shell/RouteErrorBoundary.test.tsx
    rationale: |
      React 19 has no hook-based error boundary API; a class component with
      `getDerivedStateFromError` is the only mechanism. Isolating it as its own
      component lets it wrap only the main content area (AC1) while leaving
      navigation as an untouched sibling (AC2).

  - description: |
      Create `Navigation`, a simple nav component rendering a list of destination
      buttons/links with `role="navigation"`, that calls a `onSelect(destId)`
      callback. No responsive/breakpoint variants (tab bar vs sidebar) are built
      here -- see assumptions.
      Signature:
      ```tsx
      type Destination = "expenses" | "reports";
      type NavigationProps = {
        current: Destination;
        onSelect: (dest: Destination) => void;
      };
      function Navigation({ current, onSelect }: NavigationProps): JSX.Element
      ```
    files:
      - src/shell/Navigation.tsx
      - src/shell/Navigation.test.tsx
    rationale: |
      AC2 and AC3 require a persistent, clickable nav distinct from the content
      area. A minimal nav is enough to prove the shell behavior; full chrome
      (tabs/sidebar per breakpoint) is out of scope for this story.

  - description: |
      Create `AppShell`, which owns `destination` and `attempt` state, renders
      `Navigation` plus a `<main>` containing `RouteErrorBoundary` wrapping a
      `React.Suspense`-wrapped lazily-loaded destination module. Re-selecting the
      *same* destination bumps `attempt`, which is folded into the boundary's
      `key` so React remounts (and thus resets) the boundary and re-invokes the
      loader.
      Signature:
      ```tsx
      type Loaders = Record<Destination, () => Promise<{ default: React.ComponentType }>>;
      type AppShellProps = { loaders: Loaders };
      function AppShell({ loaders }: AppShellProps): JSX.Element {
        const [dest, setDest] = useState<Destination>("expenses");
        const [attempt, setAttempt] = useState(0);
        const select = (next: Destination) => {
          setDest(next);
          setAttempt((a) => a + 1);
        };
        const LazyContent = React.lazy(loaders[dest]);
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
      ```
    files:
      - src/shell/AppShell.tsx
      - src/shell/AppShell.test.tsx
    rationale: |
      Keying the boundary by `dest:attempt` is what makes re-selecting the same
      failed destination retry (AC4) instead of being a no-op, since a caught
      class-component error boundary cannot reset its own `hasError` state from
      outside without a remount.

  - description: |
      Wire `App.tsx` to render `AppShell` with a real `loaders` map: `"expenses"`
      loads a module wrapping the existing `AddExpenseForm` + `ExpenseList` UI,
      `"reports"` is a stub destination for exercising the error path in
      integration if needed. `"expenses"` stays the default `dest` so the two
      existing `App.test.tsx` assertions (list renders at mount, new expense
      appears without reload) keep passing unchanged.
      Before → after:
      ```tsx
      // before
      export default function App() {
        const [expenses, setExpenses] = useState<Expense[]>(() => loadExpenses());
        return (
          <main>
            <h1>Expense Tracker</h1>
            <AddExpenseForm onSaved={() => setExpenses(loadExpenses())} />
            <ExpenseList expenses={expenses} />
          </main>
        );
      }

      // after
      export default function App() {
        return <AppShell loaders={{ expenses: loadExpensesRoute, reports: loadReportsRoute }} />;
      }
      ```
    files:
      - src/App.tsx
      - src/shell/routes/ExpensesRoute.tsx
    rationale: |
      Keeps the existing expense-tracker feature working exactly as before while
      moving it behind the new shell's default route, satisfying the "no
      regression" constraint without rewriting `App.test.tsx`.

tests:
  - |
    AC1 -- RouteErrorBoundary.test.tsx: a child that throws during render results
    in an inline error message rendered in place of the child, not a blank page.
    ```tsx
    it("shows an inline error message when a child throws", () => {
      const Bomb = () => { throw new Error("boom"); };
      vi.spyOn(console, "error").mockImplementation(() => {});
      render(
        <RouteErrorBoundary>
          <Bomb />
        </RouteErrorBoundary>
      );
      expect(screen.getByRole("alert")).toHaveTextContent(/something went wrong/i);
    });
    ```
  - |
    AC2 -- AppShell.test.tsx: when the active destination's loader rejects, the
    error is shown inline AND the navigation remains present and clickable.
    ```tsx
    it("keeps navigation visible and functional when a route fails to load", async () => {
      vi.spyOn(console, "error").mockImplementation(() => {});
      const failing = vi.fn().mockRejectedValue(new Error("chunk load failed"));
      const ok = vi.fn().mockResolvedValue({ default: () => <div>Expenses</div> });
      render(<AppShell loaders={{ expenses: ok, reports: failing }} />);
      await userEvent.click(screen.getByRole("button", { name: /reports/i }));
      expect(await screen.findByRole("alert")).toBeInTheDocument();
      expect(screen.getByRole("navigation")).toBeVisible();
      expect(screen.getByRole("button", { name: /expenses/i })).toBeEnabled();
    });
    ```
  - |
    AC3 -- AppShell.test.tsx: from an error state, selecting a different
    destination navigates normally and clears the error.
    ```tsx
    it("navigating away from a failed route clears the error and renders the new route", async () => {
      vi.spyOn(console, "error").mockImplementation(() => {});
      const failing = vi.fn().mockRejectedValue(new Error("boom"));
      const ok = vi.fn().mockResolvedValue({ default: () => <div>Expenses content</div> });
      render(<AppShell loaders={{ expenses: ok, reports: failing }} />);
      await userEvent.click(screen.getByRole("button", { name: /reports/i }));
      await screen.findByRole("alert");
      await userEvent.click(screen.getByRole("button", { name: /expenses/i }));
      expect(await screen.findByText("Expenses content")).toBeInTheDocument();
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
    ```
  - |
    AC4 -- AppShell.test.tsx: re-selecting the same failed destination retries
    the loader and shows the error again if it still fails.
    ```tsx
    it("retries the same failed destination and shows the error again on repeat failure", async () => {
      vi.spyOn(console, "error").mockImplementation(() => {});
      const failing = vi.fn().mockRejectedValue(new Error("boom"));
      render(<AppShell loaders={{ expenses: vi.fn(), reports: failing }} />);
      await userEvent.click(screen.getByRole("button", { name: /reports/i }));
      await screen.findByRole("alert");
      await userEvent.click(screen.getByRole("button", { name: /reports/i }));
      await waitFor(() => expect(failing).toHaveBeenCalledTimes(2));
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
    ```
  - |
    AC5 -- AppShell.test.tsx: re-selecting the same destination after the loader
    now resolves clears the error and renders the content.
    ```tsx
    it("clears the error and renders content when a retried route now succeeds", async () => {
      vi.spyOn(console, "error").mockImplementation(() => {});
      const flaky = vi.fn()
        .mockRejectedValueOnce(new Error("boom"))
        .mockResolvedValue({ default: () => <div>Reports</div> });
      render(<AppShell loaders={{ expenses: vi.fn(), reports: flaky }} />);
      await userEvent.click(screen.getByRole("button", { name: /reports/i }));
      await screen.findByRole("alert");
      await userEvent.click(screen.getByRole("button", { name: /reports/i }));
      expect(await screen.findByText("Reports")).toBeInTheDocument();
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      expect(flaky).toHaveBeenCalledTimes(2);
    });
    ```

assumptions_or_open_questions:
  - "No routing library (e.g. react-router) exists or is added; 'child route' is modeled as an in-memory destination + lazily-loaded module, since the parent epic's actual router/URL scheme has not been built yet."
  - "AC2's breakpoint-specific chrome (bottom tab bar vs top nav vs left sidebar) is deferred to the epic's responsiveness story; this plan implements one `Navigation` component with `role=\"navigation\"` and verifies it stays visible/functional, not the breakpoint variants."
  - "\"Fails to load\" is modeled as a rejected dynamic-import-style loader promise (consistent with lazy-loaded route chunks failing in a real router); a thrown render error is also covered via RouteErrorBoundary's own unit test."
  - "The existing `src/App.tsx` behavvior (expense list + add form) is preserved unchanged as the default \"expenses\" destination so the current App.test.tsx assertions keep passing without modification."
  - "componentDidCatch in RouteErrorBoundary intentionally does not log to an external service; adding error reporting/telemetry is out of scope for this story."

package_dependencies: []

notes: |
  No new third-party dependencies are needed: `React.lazy`, `Suspense`, and a
  class-based error boundary are sufficient to satisfy all five ACs without a
  router. Introducing react-router now would pull in unrelated
  layout/breakpoint work that belongs to sibling stories in the "UI Shell &
  Responsiveness" epic.

  The retry mechanism (AC4/AC5) hinges on keying `RouteErrorBoundary` by
  `` `${dest}:${attempt}` `` where `attempt` increments on every `select`,
  including re-selecting the current destination. A class error boundary cannot
  reset `hasError` from outside itself; remounting via `key` is the standard
  React pattern for this.

  Boundary/AppShell tests must mock `console.error` (React logs a noisy stack
  trace for every caught error) via
  `vi.spyOn(console, "error").mockImplementation(() => {})`, restored per test
  via Vitest's default `restoreMocks`/`afterEach` or explicit `mockRestore()`.

  ```mermaid
  flowchart TD
    App["src/App.tsx"]
    AppShell["src/shell/AppShell.tsx"]
    Nav["src/shell/Navigation.tsx"]
    Boundary["src/shell/RouteErrorBoundary.tsx"]
    ExpensesRoute["src/shell/routes/ExpensesRoute.tsx"]
    AddExpenseForm["src/components/AddExpenseForm.tsx"]
    ExpenseList["src/components/ExpenseList.tsx"]

    App -->|"renders shell with loaders map"| AppShell
    AppShell -->|"renders nav sibling to main"| Nav
    AppShell -->|"wraps lazy content, AC1/AC2"| Boundary
    Boundary -->|"React.lazy(loaders[dest]) inside Suspense"| ExpensesRoute
    ExpensesRoute -->|"unchanged, moved behind default route"| AddExpenseForm
    ExpensesRoute -->|"unchanged, moved behind default route"| ExpenseList

    classDef touched fill:#f96,color:#000
    class App,AppShell,Nav,Boundary,ExpensesRoute touched
  ```
