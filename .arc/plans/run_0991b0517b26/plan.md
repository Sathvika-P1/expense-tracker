summary: |
  Add a Monthly Spending Breakdown to the dashboard: a new `<MonthlySummary>` section under the
  existing expense list that groups the current user's expenses by calendar month (year+month,
  e.g. "2026-01"), shows a total per month in descending chronological order, and shows explicit
  empty and error states. Grouping logic lives in a new pure function `groupByMonth` operating on
  already-loaded `Expense[]`, so it reuses App's existing single load/refresh path (the `onSaved`
  callback already triggers a reload) instead of introducing a second, independent data-fetch
  path. A new `loadExpensesStrict` function in the repository layer performs the localStorage
  read/parse *without* swallowing errors (unlike the existing lenient `loadExpenses`), so App can
  distinguish "no data" (AC2) from "corrupted/unavailable data or invalid dates" (AC6, AC7) --
  something the current `loadExpenses`, which silently returns `[]` on any failure, cannot do.

scope:
  - description: |
      Add `loadExpensesStrict(userId?: string): LoadResult` to `src/domain/expenseRepository.ts`,
      alongside the existing `loadExpenses`/`saveExpense`. Unlike `loadAll()`, this function does
      NOT swallow errors. It returns a discriminated union:
      ```ts
      export type LoadResult =
        | { ok: true; expenses: Expense[] }
        | { ok: false; message: string };

      export const SUMMARY_LOAD_ERROR =
        "We couldn't load your spending data. Please try again later.";

      export function loadExpensesStrict(userId: string = getCurrentUserId()): LoadResult {
        let raw: string | null;
        try {
          raw = localStorage.getItem(STORAGE_KEY);
        } catch {
          return { ok: false, message: SUMMARY_LOAD_ERROR };
        }
        if (!raw) return { ok: true, expenses: [] };

        let parsed: unknown;
        try {
          parsed = JSON.parse(raw);
        } catch {
          return { ok: false, message: SUMMARY_LOAD_ERROR };
        }
        if (!Array.isArray(parsed)) return { ok: false, message: SUMMARY_LOAD_ERROR };

        const userExpenses = (parsed as Expense[]).filter((e) => e?.userId === userId);
        if (userExpenses.some((e) => !isValidDate(e?.date))) {
          return { ok: false, message: SUMMARY_LOAD_ERROR };
        }
        return { ok: true, expenses: userExpenses };
      }
      ```
      Date validation is applied AFTER filtering by `userId` -- a malformed record belonging to a
      *different* user must not break the current user's summary (see
      `assumptions_or_open_questions`).
    files:
      - src/domain/expenseRepository.ts
      - src/domain/expenseRepository.test.ts
    rationale: |
      The existing `loadExpenses` intentionally returns `[]` for any storage/parse failure
      (asserted by `expenseRepository.test.ts:47-60`), which is correct for the expense list but
      makes "no data" and "corrupted data" indistinguishable -- exactly the ambiguity AC2 vs AC6
      needs resolved. Adding a sibling strict loader avoids touching that existing lenient
      behavior/tests at all.

  - description: |
      Add `isValidDate` and `groupByMonth` to a new pure module `src/domain/monthlySummary.ts`.
      Month key is derived by string slicing (`date.slice(0, 7)`), never `new Date(...)`, to avoid
      UTC/local timezone shifting the month:
      ```ts
      export interface MonthlyTotal {
        key: string;   // "2026-01"
        label: string; // "January 2026"
        total: number;
      }

      const DATE_SHAPE = /^\d{4}-\d{2}-\d{2}$/;

      export function isValidDate(value: unknown): value is string {
        return (
          typeof value === "string" &&
          DATE_SHAPE.test(value) &&
          new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value
        );
      }

      export function groupByMonth(expenses: Expense[]): MonthlyTotal[] {
        const totals = new Map<string, number>();
        for (const expense of expenses) {
          const key = expense.date.slice(0, 7);
          totals.set(key, (totals.get(key) ?? 0) + expense.amount);
        }
        return [...totals.entries()]
          .sort((a, b) => b[0].localeCompare(a[0]))
          .map(([key, total]) => ({ key, total, label: formatMonthLabel(key) }));
      }
      ```
      `isValidDate` rejects calendar-invalid-but-shape-valid strings like `"2026-02-31"` (which
      `Date` would otherwise silently roll forward into March), catching AC7's "malformed or
      invalid date" case, not just missing/wrong-shape dates.
    files:
      - src/domain/monthlySummary.ts
      - src/domain/monthlySummary.test.ts
    rationale: |
      Keeping grouping as a pure function decoupled from React/localStorage makes ACs 1, 3, 4, and
      8 trivial to test directly without rendering anything, and the string-slice key naturally
      gives AC8 (same month, different years) a distinct key per year with no extra logic.

  - description: |
      Add `src/components/MonthlySummary.tsx`, a presentational component rendered inside an
      accessible landmark so its empty/error/list states can be queried unambiguously alongside
      `ExpenseList`'s own empty state:
      ```tsx
      interface MonthlySummaryProps {
        result: LoadResult;
      }

      export function MonthlySummary({ result }: MonthlySummaryProps) {
        const headingId = useId();
        return (
          <section aria-labelledby={headingId}>
            <h2 id={headingId}>Monthly Spending</h2>
            {!result.ok && <p role="alert">{result.message}</p>}
            {result.ok && result.expenses.length === 0 && (
              <p>No spending data available yet.</p>
            )}
            {result.ok && result.expenses.length > 0 && (
              <ul>
                {groupByMonth(result.expenses).map((m) => (
                  <li key={m.key}>
                    <span>{m.label}</span>
                    <span>{m.total.toFixed(2)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      }
      ```
    files:
      - src/components/MonthlySummary.tsx
      - src/components/MonthlySummary.test.tsx
    rationale: |
      A named landmark (`role="region"` via `aria-labelledby`) lets App-level tests scope queries
      with `within(screen.getByRole("region", { name: /monthly spending/i }))`, avoiding collision
      with `ExpenseList`'s pre-existing "No expenses recorded yet." empty state which renders in
      the same tree when there are zero expenses.

  - description: |
      Wire `MonthlySummary` into `src/App.tsx` using the existing single load/refresh path:
      ```tsx
      const [summaryResult, setSummaryResult] = useState<LoadResult>(() => loadExpensesStrict());
      // ...
      <AddExpenseForm
        onSaved={() => {
          setExpenses(loadExpenses());
          setSummaryResult(loadExpensesStrict());
        }}
      />
      <MonthlySummary result={summaryResult} />
      ```
    files:
      - src/App.tsx
      - src/App.test.tsx
    rationale: |
      Reuses the `onSaved` callback that already exists for refreshing `ExpenseList` (AC5's "add"
      case) instead of adding a second independent polling/refresh mechanism (e.g. a counter +
      `useMemo`), keeping one load path per data source and avoiding drift between the list and
      the summary.

tests:
  - |
    AC1 -- `monthlySummary.test.ts`: grouping totals a month with expenses.
    ```ts
    it("totals amounts within the same month", () => {
      const expenses = [
        makeExpense({ date: "2026-01-05", amount: 10 }),
        makeExpense({ date: "2026-01-20", amount: 15 }),
      ];
      expect(groupByMonth(expenses)).toEqual([
        { key: "2026-01", label: "January 2026", total: 25 },
      ]);
    });
    ```
  - |
    AC2 -- `MonthlySummary.test.tsx`: empty state when no expenses exist.
    ```ts
    it("shows an empty-state message when there is no spending data", () => {
      render(<MonthlySummary result={{ ok: true, expenses: [] }} />);
      const region = within(screen.getByRole("region", { name: /monthly spending/i }));
      expect(region.getByText("No spending data available yet.")).toBeInTheDocument();
    });
    ```
  - |
    AC3 -- `monthlySummary.test.ts`: a month with zero expenses is absent from the result.
    ```ts
    it("omits months with no recorded expenses", () => {
      const expenses = [makeExpense({ date: "2026-01-05" })];
      const keys = groupByMonth(expenses).map((m) => m.key);
      expect(keys).not.toContain("2026-02");
    });
    ```
  - |
    AC4 -- `monthlySummary.test.ts`: months ordered most-recent-first.
    ```ts
    it("orders months descending by most recent first", () => {
      const expenses = [
        makeExpense({ date: "2026-01-05" }),
        makeExpense({ date: "2026-03-10" }),
        makeExpense({ date: "2026-02-01" }),
      ];
      expect(groupByMonth(expenses).map((m) => m.key)).toEqual([
        "2026-03", "2026-02", "2026-01",
      ]);
    });
    ```
  - |
    AC5 -- `App.test.tsx`: adding an expense updates the summary without a manual refresh.
    ```ts
    it("updates the monthly summary after adding an expense without a page reload", async () => {
      const user = userEvent.setup();
      render(<App />);
      await user.type(screen.getByLabelText(/amount/i), "20");
      await user.type(screen.getByLabelText(/date/i), "2026-04-01");
      await user.selectOptions(screen.getByLabelText(/category/i), "Travel");
      await user.click(screen.getByRole("button", { name: /add expense/i }));

      const region = within(screen.getByRole("region", { name: /monthly spending/i }));
      await waitFor(() => {
        expect(region.getByText("April 2026")).toBeInTheDocument();
      });
    });
    ```
  - |
    AC6 -- `expenseRepository.test.ts`: corrupted JSON and unavailable storage both surface the
    same error result.
    ```ts
    it("returns an error result when localStorage contains corrupted JSON", () => {
      localStorage.setItem("expenses", "{not valid json");
      expect(loadExpensesStrict()).toEqual({ ok: false, message: SUMMARY_LOAD_ERROR });
    });

    it("returns an error result when localStorage access throws", () => {
      vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
        throw new Error("access denied");
      });
      expect(loadExpensesStrict()).toEqual({ ok: false, message: SUMMARY_LOAD_ERROR });
    });
    ```
    And `MonthlySummary.test.tsx` asserts the message renders as an alert:
    ```ts
    it("shows an error message when the load result is not ok", () => {
      render(<MonthlySummary result={{ ok: false, message: SUMMARY_LOAD_ERROR }} />);
      expect(screen.getByRole("alert")).toHaveTextContent(SUMMARY_LOAD_ERROR);
    });
    ```
  - |
    AC7 -- `expenseRepository.test.ts`: a record with a missing/malformed/calendar-invalid date
    produces the same error as corrupted data.
    ```ts
    it.each(["", "not-a-date", "2026-02-31", undefined])(
      "returns an error result when an expense has an invalid date (%s)",
      (date) => {
        localStorage.setItem(
          "expenses",
          JSON.stringify([{ id: "1", userId: "local-user", amount: 1, date, category: "Food" }]),
        );
        expect(loadExpensesStrict()).toEqual({ ok: false, message: SUMMARY_LOAD_ERROR });
      },
    );
    ```
  - |
    AC8 -- `monthlySummary.test.ts`: same calendar month across different years are separate
    entries.
    ```ts
    it("lists the same month in different years as separate entries", () => {
      const expenses = [
        makeExpense({ date: "2023-01-10", amount: 5 }),
        makeExpense({ date: "2024-01-15", amount: 7 }),
      ];
      expect(groupByMonth(expenses)).toEqual([
        { key: "2024-01", label: "January 2024", total: 7 },
        { key: "2023-01", label: "January 2023", total: 5 },
      ]);
    });
    ```

assumptions_or_open_questions:
  - |
    Date validation in `loadExpensesStrict` is applied AFTER filtering records down to the current
    `userId`. This means a malformed date on a record belonging to a *different* user does not
    break the current user's summary. The story's AC7 wording ("an expense record ... has a
    missing, malformed, or invalid date") is ambiguous about scope; this plan treats it as scoped
    to the records that actually feed the current summary.
  - |
    There is no delete/remove feature anywhere in the codebase today (no `deleteExpense` export,
    no remove control in `ExpenseList`). AC5's "or an existing one is removed" clause is therefore
    left untested by a real removal flow -- the live-update behavior is verified via the add path,
    which exercises the same refresh mechanism a future remove feature would need to call. Adding
    a delete feature is out of scope for this story.
  - |
    Month labels use a fixed English "Month YYYY" format (e.g. "January 2026") derived from the
    `"YYYY-MM"` key via a small lookup/`Intl.DateTimeFormat` helper; no localization requirement
    was stated.
  - |
    `MonthlySummary` is placed directly under `ExpenseList` in `App.tsx`; no specific visual
    placement was specified in the story.

package_dependencies: []

notes: |
  All test tooling (vitest, @testing-library/react, @testing-library/user-event,
  @testing-library/jest-dom) is already present in `package.json`; no new dependencies needed.

  Key implementation risks addressed directly in `scope`:
  - Month keys are computed via `date.slice(0, 7)` string slicing, never `new Date(...)`, since
    `new Date("2026-01-01")` parses as UTC midnight and `.getMonth()` can shift to the previous
    month in negative-UTC-offset test/CI environments.
  - `isValidDate` rejects calendar-invalid-but-shape-valid strings (e.g. `"2026-02-31"`), not just
    missing or wrong-shape values, by round-tripping through `Date`/`toISOString` and comparing.
  - `loadExpensesStrict` wraps `localStorage.getItem` itself in try/catch (the existing `loadAll`
    helper in `expenseRepository.ts` does not), since "localStorage is unavailable" (AC6) means the
    accessor throwing, not just `JSON.parse` failing.
  - `MonthlySummary` renders inside a named `role="region"` landmark so App-level tests can scope
    queries and avoid colliding with `ExpenseList`'s own pre-existing empty-state text ("No
    expenses recorded yet.") which renders in the same tree.

  ```mermaid
  flowchart TD
    App["App.tsx"]
    AddForm["AddExpenseForm.tsx"]
    List["ExpenseList.tsx"]
    Repo["expenseRepository.ts"]
    CurrentUser["currentUser.ts"]
    ExpenseType["expense.ts"]
    Summary["MonthlySummary.tsx (new)"]
    Grouping["monthlySummary.ts (new)"]

    App -->|"renders, passes expenses"| List
    App -->|"onSaved triggers reload"| AddForm
    App -->|"loadExpenses() (existing, lenient)"| Repo
    App -->|"loadExpensesStrict() (new) -> LoadResult"| Repo
    App -->|"passes LoadResult"| Summary
    Summary -->|"groupByMonth(expenses) when ok"| Grouping
    AddForm -->|"saveExpense()"| Repo
    Repo -->|"getCurrentUserId()"| CurrentUser
    Repo -.->|"typed as"| ExpenseType
    Grouping -.->|"typed as"| ExpenseType

    classDef touched fill:#f96,color:#000
    class App,Repo,Summary,Grouping touched
  ```
