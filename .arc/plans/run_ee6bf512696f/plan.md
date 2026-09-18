summary: |
  Add a Total Expenses widget to the dashboard that shows the running sum of the
  current user's recorded expenses, formatted in the app's single supported
  currency (USD). The widget shows a clear zero state when there are no
  expenses, updates automatically whenever App's expense list is refreshed
  (add today; the domain has no edit/remove yet), and shows a user-facing
  error message if localStorage is unavailable or its stored data is
  corrupted. Because the existing `loadExpenses` intentionally swallows
  corruption and returns `[]` (see expenseRepository.test.ts), a new
  repository function `loadExpensesResult` is added alongside it so the
  widget can distinguish "genuinely empty" (AC2) from "corrupted/unavailable"
  (AC4) without changing any existing, already-tested behavior.

scope:
  - description: |
      Add `loadExpensesResult(userId?: string): LoadResult` to
      `expenseRepository.ts`, a discriminated-union-returning sibling of
      `loadExpenses` that does NOT swallow JSON.parse failures or
      non-array payloads, and does not catch a throwing `localStorage.getItem`.
      It reuses the same sort/filter semantics as `loadExpenses` for the
      success case.

      ```ts
      export type LoadResult =
        | { ok: true; expenses: Expense[] }
        | { ok: false; reason: "corrupted" | "unavailable" };

      export function loadExpensesResult(userId: string = getCurrentUserId()): LoadResult {
        let raw: string | null;
        try {
          raw = localStorage.getItem(STORAGE_KEY);
        } catch {
          return { ok: false, reason: "unavailable" };
        }
        if (!raw) return { ok: true, expenses: [] };
        let parsed: unknown;
        try {
          parsed = JSON.parse(raw);
        } catch {
          return { ok: false, reason: "corrupted" };
        }
        if (!Array.isArray(parsed)) {
          return { ok: false, reason: "corrupted" };
        }
        const expenses = (parsed as Expense[])
          .filter((expense) => expense.userId === userId)
          .sort((a, b) => b.date.localeCompare(a.date));
        return { ok: true, expenses };
      }
      ```
    files:
      - src/domain/expenseRepository.ts
    rationale: |
      `loadExpenses`/`loadAll` already have a passing test asserting corrupted
      JSON yields `[]` (expenseRepository.test.ts:47-51), and ExpenseList relies
      on that empty-array behavior for its own empty state. Changing that
      function to throw would break both. A new, additive function keeps the
      old contract intact while giving the widget what it needs to tell "no
      expenses" apart from "can't read expenses" per AC2 vs AC4.

  - description: |
      Create `TotalExpensesWidget`, a presentational component that receives
      the already-computed result from `App` (no independent localStorage
      access, no polling, no storage-event listener) and renders one of three
      states: total (AC1), zero/empty (AC2), or error (AC4).

      ```ts
      interface TotalExpensesWidgetProps {
        result: LoadResult;
      }

      export function TotalExpensesWidget({ result }: TotalExpensesWidgetProps) {
        if (!result.ok) {
          return (
            <div>
              <p role="alert">
                {result.reason === "unavailable"
                  ? "Unable to access your expense data. Please check your browser storage settings."
                  : "Your expense data appears to be corrupted and could not be loaded."}
              </p>
            </div>
          );
        }

        const total = result.expenses.reduce((sum, expense) => sum + expense.amount, 0);
        const formatted = new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
        }).format(total);

        return (
          <div>
            <h2>Total Expenses</h2>
            <p data-testid="total-expenses-amount">{formatted}</p>
          </div>
        );
      }
      ```
    files:
      - src/components/TotalExpensesWidget.tsx
    rationale: |
      Keeping the widget presentational (fed a `LoadResult` prop rather than
      reading storage itself) means AC3 ("reflects updated data without a
      manual refresh") falls out of App's existing re-render cycle for free —
      no storage-event listeners or polling needed, since App already
      re-fetches on every save.

  - description: |
      Write the widget's failing test file first, covering AC1, AC2, and AC4
      directly against the component (no App/localStorage involved, since the
      component is now purely prop-driven).
    files:
      - src/components/TotalExpensesWidget.test.tsx
    rationale: |
      Testing the component in isolation with constructed `LoadResult` values
      is faster and more precise than driving it through App + localStorage
      for every state; the App-level integration test covers the wiring only.

  - description: |
      Wire the widget into `App.tsx`: replace the raw `Expense[]` state with
      the richer `LoadResult`, compute it once at mount and again after every
      save (same trigger `AddExpenseForm` already calls), and pass the
      `ok: true` expenses through to `ExpenseList` unchanged (empty array on
      error, matching ExpenseList's existing empty-state test since a
      non-empty error message is shown by the widget above it).

      ```ts
      const [result, setResult] = useState<LoadResult>(() => loadExpensesResult());
      // ...
      <TotalExpensesWidget result={result} />
      <AddExpenseForm onSaved={() => setResult(loadExpensesResult())} />
      <ExpenseList
        expenses={result.ok ? result.expenses : []}
        onAddExpenseClick={...}
      />
      ```
    files:
      - src/App.tsx
    rationale: |
      Reuses the exact refresh trigger AC3's existing App.test.tsx case
      ("shows a newly submitted expense... without a reload") already
      exercises, so no new refresh mechanism is introduced — the widget just
      rides along.

  - description: |
      Add an App-level integration test asserting the widget total updates
      after a save, without a manual page reload, exercising the real
      end-to-end wiring (App -> AddExpenseForm -> expenseRepository ->
      TotalExpensesWidget).
    files:
      - src/App.test.tsx
    rationale: |
      Covers AC3 as an integration behavior distinct from the isolated
      widget unit tests, matching the existing pattern in this file where
      AC1/AC5/AC7 already have App-level tests.

tests:
  - |
    AC1 (widget unit test): given a `LoadResult` with two expenses (10 and
    20.5), the widget shows the formatted total.
    ```ts
    render(<TotalExpensesWidget result={{ ok: true, expenses: [
      { id: "1", userId: "u", amount: 10, date: "2026-01-01", category: "Food", createdAt: 1 },
      { id: "2", userId: "u", amount: 20.5, date: "2026-01-02", category: "Travel", createdAt: 2 },
    ] }} />);
    expect(screen.getByTestId("total-expenses-amount")).toHaveTextContent("$30.50");
    ```
  - |
    AC2 (widget unit test): given an empty, successful `LoadResult`, the
    widget shows a clear zero state rather than blank output.
    ```ts
    render(<TotalExpensesWidget result={{ ok: true, expenses: [] }} />);
    expect(screen.getByTestId("total-expenses-amount")).toHaveTextContent("$0.00");
    ```
  - |
    AC3 (App integration test): saving a new expense updates the widget total
    without a manual reload.
    ```ts
    saveExpense({ id: "e1", userId: "local-user", amount: 5, date: "2026-01-01", category: "Bills", createdAt: Date.now() });
    render(<App />);
    expect(screen.getByTestId("total-expenses-amount")).toHaveTextContent("$5.00");

    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/amount/i), "20");
    await user.type(screen.getByLabelText(/date/i), "2026-02-01");
    await user.selectOptions(screen.getByLabelText(/category/i), "Travel");
    await user.click(screen.getByRole("button", { name: /add expense/i }));

    await waitFor(() => {
      expect(screen.getByTestId("total-expenses-amount")).toHaveTextContent("$25.00");
    });
    ```
  - |
    AC4a (repository unit test): corrupted JSON in localStorage is reported,
    not swallowed, by the new function.
    ```ts
    localStorage.setItem("expenses", "{not valid json");
    expect(loadExpensesResult()).toEqual({ ok: false, reason: "corrupted" });
    ```
  - |
    AC4b (repository unit test): a non-array JSON payload is also reported as
    corrupted.
    ```ts
    localStorage.setItem("expenses", '{"foo":1}');
    expect(loadExpensesResult()).toEqual({ ok: false, reason: "corrupted" });
    ```
  - |
    AC4c (repository unit test): a throwing `localStorage.getItem` (simulating
    unavailable storage, e.g. private-browsing restrictions) is reported as
    unavailable rather than propagating.
    ```ts
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("denied", "SecurityError");
    });
    expect(loadExpensesResult()).toEqual({ ok: false, reason: "unavailable" });
    ```
  - |
    AC4d (widget unit test): an error `LoadResult` renders a user-facing
    alert instead of a blank/broken UI.
    ```ts
    render(<TotalExpensesWidget result={{ ok: false, reason: "corrupted" }} />);
    expect(screen.getByRole("alert")).toHaveTextContent(/corrupted/i);
    ```

assumptions_or_open_questions:
  - |
    The app's "single supported currency" is not defined anywhere in the
    codebase (no currency field on `Expense`, no locale/currency config).
    This plan assumes USD, formatted via `Intl.NumberFormat("en-US", { style: "currency", currency: "USD" })`,
    purely for the widget's own display and does not touch ExpenseList's
    existing bare `toFixed(2)` rendering, which is out of scope.
  - |
    AC3 ("added, removed, or edited") is satisfied only for the "added" case
    because `saveExpense` is currently the only write operation in the
    codebase — there is no remove or edit path anywhere to wire up. No new
    removal/edit API, storage-event listener, or polling is planned; the
    widget updates automatically whenever App's existing refresh-on-save
    cycle re-renders it. If/when remove or edit are implemented in a future
    story, they should call the same `setResult(loadExpensesResult())`
    pattern App already uses.
  - |
    The widget sums only the current user's expenses (via
    `loadExpensesResult`'s existing `userId` filter), matching what
    ExpenseList displays, rather than all expenses in localStorage across
    all users.
  - |
    On an error `LoadResult`, `ExpenseList` is rendered with an empty
    `expenses` array (its existing empty state), while the error message is
    shown by the widget above it. This avoids duplicating error-state UI in
    two components; the reviewer may prefer a single shared error banner
    instead if that reads better.

package_dependencies: []

notes: |
  `Intl.NumberFormat` is a built-in JS API, so no new package is needed for
  currency formatting.

  Investigated and confirmed before planning: `expenseRepository.test.ts:47-51`
  already asserts `loadExpenses()` returns `[]` for corrupted JSON, so AC4
  cannot be satisfied by changing that function's behavior — hence the new
  additive `loadExpensesResult` export instead of modifying `loadAll`/`loadExpenses`.

  ```mermaid
  flowchart TD
    App["App.tsx"]:::touched
    Widget["TotalExpensesWidget.tsx (new)"]:::touched
    Repo["expenseRepository.ts"]:::touched
    List["ExpenseList.tsx"]
    Form["AddExpenseForm.tsx"]
    LS[("localStorage")]

    App -->|"passes LoadResult prop"| Widget
    App -->|"result.ok ? result.expenses : []"| List
    App -->|"onSaved triggers re-fetch"| Form
    App -->|"calls loadExpensesResult() on mount + after save"| Repo
    Repo -->|"getItem/JSON.parse, throws surfaced as reason"| LS
    Form -->|"saveExpense() writes"| Repo

    classDef touched fill:#f96,color:#000
  ```
