summary: |
  Add a date range filter above the expense list (ET-STORY-014): a start date and end date field
  that narrow the visible expenses to an inclusive `[start, end]` window, with inline validation
  for an unparseable value and for an inverted range (end before start), full keyboard/
  screen-reader accessibility, and a distinct empty-state message when a valid filter matches
  zero expenses. Dates are stored as ISO `YYYY-MM-DD` strings (`src/domain/expense.ts:7`), so
  filtering and range-order comparison can be done with plain string comparison/`Date.parse` —
  no date library is needed. The filter logic is a pure domain module (mirrors the existing
  `validateExpense.ts` / `AddExpenseForm.tsx` split), a new `DateRangeFilter` component renders
  the two fields, and `App.tsx` wires filter state between the new component and `ExpenseList`.

scope:
  - description: |
      New pure domain module for parsing and validating the date range and for filtering an
      expense list against it.

      New file `src/domain/dateRangeFilter.ts`:
      ```ts
      import type { Expense } from "./expense";

      export interface DateRangeErrors {
        start?: string;
        end?: string;
        range?: string;
      }

      const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

      function isParseable(value: string): boolean {
        if (!ISO_DATE_PATTERN.test(value)) return false;
        return !Number.isNaN(Date.parse(value));
      }

      export function validateDateRange(start: string, end: string): DateRangeErrors {
        const errors: DateRangeErrors = {};
        if (start && !isParseable(start)) errors.start = "Enter a valid date (YYYY-MM-DD).";
        if (end && !isParseable(end)) errors.end = "Enter a valid date (YYYY-MM-DD).";
        if (!errors.start && !errors.end && start && end && end < start) {
          errors.range = "End date must be on or after the start date.";
        }
        return errors;
      }

      export function filterExpensesByDateRange(
        expenses: Expense[],
        start: string,
        end: string,
      ): Expense[] {
        return expenses.filter((expense) => {
          if (start && expense.date < start) return false;
          if (end && expense.date > end) return false;
          return true;
        });
      }
      ```
    files:
      - src/domain/dateRangeFilter.ts
      - src/domain/dateRangeFilter.test.ts
    rationale: |
      Isolating parsing/validation/filtering as pure functions (no React) mirrors
      `validateExpense.ts`'s existing split from its form component, keeps AC1/AC2/AC7/AC10's
      filtering rules and AC3/AC8's validation rules independently unit-testable, and lets
      `App.tsx` call `filterExpensesByDateRange` without re-deriving the rules inline. ISO
      string comparison (`expense.date < start`) is correct and sufficient because dates are
      always stored as `YYYY-MM-DD` (`src/domain/expense.ts:7`), matching the existing sort
      approach in `expenseRepository.ts`.

  - description: |
      New component rendering the two date fields with labels, inline errors, and an
      `onRangeChange` callback reporting the current filter state (raw strings, validity, and
      only-if-valid parsed start/end) to the parent.

      New file `src/components/DateRangeFilter.tsx`:
      ```ts
      interface DateRangeFilterProps {
        onRangeChange: (range: { start: string; end: string; isValid: boolean }) => void;
      }
      export function DateRangeFilter({ onRangeChange }: DateRangeFilterProps) { ... }
      ```
      Each field is `type="text"` (not `type="date"`) with `inputMode="numeric"` and a
      `YYYY-MM-DD` placeholder — deliberately diverging from `AddExpenseForm.tsx:87`'s native
      `type="date"` input; see `assumptions_or_open_questions` for why. Errors render with
      `role="alert"` (same convention as `AddExpenseForm.tsx:77,93`, satisfies AC13 without a
      separate `aria-live` region), and each input uses `useId()` + `htmlFor` (same convention
      as `AddExpenseForm.tsx:24-31`) so `getByLabelText(/start date/i)` / `getByLabelText(/end
      date/i)` resolve, satisfying AC11. No `<form>` wrapper is used — filtering applies on
      every `onChange`, so there is no submit control and no Enter-triggers-navigation risk for
      AC12.
    files:
      - src/components/DateRangeFilter.tsx
      - src/components/DateRangeFilter.test.tsx
    rationale: |
      A dedicated component (rather than inlining fields in `App.tsx`) matches the existing
      pattern of one component per concern (`AddExpenseForm`, `ExpenseList`). `onRangeChange`
      reports validity explicitly rather than making `App.tsx` re-run `validateDateRange`,
      so there is a single source of truth for "is the filter currently valid."

  - description: |
      Add an optional `emptyMessage` prop to `ExpenseList` so the parent can distinguish "no
      expenses at all" (existing message, with the add-expense CTA) from "filter matched zero
      expenses" (new message, no CTA — the list isn't actually empty, the filter just excludes
      everything).

      Before:
      ```ts
      interface ExpenseListProps {
        expenses: Expense[];
        onAddExpenseClick: () => void;
      }
      ```
      After:
      ```ts
      interface ExpenseListProps {
        expenses: Expense[];
        onAddExpenseClick: () => void;
        emptyMessage?: string; // defaults to "No expenses recorded yet."
      }
      ```
      The `expenses.length === 0` branch renders `emptyMessage ?? "No expenses recorded yet."`;
      the add-expense CTA button only renders when `emptyMessage` is not supplied (i.e. the
      ledger is genuinely empty, not filtered-empty), so AC6's empty state does not show a
      misleading "Add an expense" prompt in place of a filtered list.
    files:
      - src/components/ExpenseList.tsx
    rationale: |
      AC6 requires a distinct empty-state message for "no expenses in range" without breaking
      the existing "no expenses recorded yet." case (`ExpenseList.test.tsx:54-59`, still passes
      unchanged since `emptyMessage` is optional and defaults to the current text).

  - description: |
      Wire `DateRangeFilter` and the filtering into `App.tsx`: hold `{ start, end, isValid }`
      state, compute `visibleExpenses` by applying `filterExpensesByDateRange` only when
      `isValid`, and reset `ExpenseList`'s pagination when the filter changes so a shrunk list
      is never stranded on an empty later page (AC7/AC10 regression risk).

      ```ts
      const [range, setRange] = useState({ start: "", end: "", isValid: true });
      const visibleExpenses =
        range.isValid ? filterExpensesByDateRange(expenses, range.start, range.end) : expenses;
      ```
      `ExpenseList` receives a `key` derived from `range.start`/`range.end` (e.g.
      `key={`${range.start}|${range.end}`}`) so React remounts it — and its internal `page`
      state resets to `0` — whenever the active range changes.
    files:
      - src/App.tsx
    rationale: |
      AC4/AC9 require the *full, unfiltered* list while invalid (not a stale filtered subset),
      so `visibleExpenses` falls back to the raw `expenses` array whenever `range.isValid` is
      false. Remounting `ExpenseList` via `key` on filter change is the smallest fix for the
      page-stranding regression: `ExpenseList.tsx:12`'s `page` state persists across re-renders
      by default, so applying a range that shrinks the list while on page 2 would otherwise
      render an empty `<tbody>` with no visible pagination nav (`expenses.length > PAGE_SIZE` is
      now false) and no way back to page 1.

tests:
  - |
    AC1 - only expenses on/after the start date are shown (src/domain/dateRangeFilter.test.ts):
    ```ts
    it("excludes expenses before the start date", () => {
      const expenses = [makeExpense({ id: "a", date: "2026-01-01" }), makeExpense({ id: "b", date: "2026-01-10" })];
      expect(filterExpensesByDateRange(expenses, "2026-01-05", "").map((e) => e.id)).toEqual(["b"]);
    });
    ```
    Minimal code: `if (start && expense.date < start) return false;` in `filterExpensesByDateRange`.
  - |
    AC2 - only expenses on/before the end date are shown (src/domain/dateRangeFilter.test.ts):
    ```ts
    it("excludes expenses after the end date", () => {
      const expenses = [makeExpense({ id: "a", date: "2026-01-01" }), makeExpense({ id: "b", date: "2026-01-10" })];
      expect(filterExpensesByDateRange(expenses, "", "2026-01-05").map((e) => e.id)).toEqual(["a"]);
    });
    ```
    Minimal code: `if (end && expense.date > end) return false;` in `filterExpensesByDateRange`.
  - |
    AC3 - inline error when end date is earlier than start date (src/domain/dateRangeFilter.test.ts):
    ```ts
    it("flags an inverted range", () => {
      expect(validateDateRange("2026-02-01", "2026-01-01").range).toMatch(/on or after/i);
    });
    ```
    and rendered inline (src/components/DateRangeFilter.test.tsx):
    ```ts
    it("shows an inline error for an inverted range", async () => {
      render(<DateRangeFilter onRangeChange={vi.fn()} />);
      await userEvent.type(screen.getByLabelText(/start date/i), "2026-02-01");
      await userEvent.type(screen.getByLabelText(/end date/i), "2026-01-01");
      expect(screen.getByRole("alert")).toHaveTextContent(/on or after/i);
    });
    ```
    Minimal code: `validateDateRange` sets `errors.range`; `DateRangeFilter` renders it in a
    `role="alert"` element and reports `isValid: false` via `onRangeChange`.
  - |
    AC4 - list stays unfiltered while the range is inverted (src/App.test.tsx):
    ```ts
    it("keeps the full list visible while the date range is inverted", async () => {
      saveExpense(makeExpense({ id: "1", date: "2026-01-01" }));
      saveExpense(makeExpense({ id: "2", date: "2026-02-01" }));
      render(<App />);
      await userEvent.type(screen.getByLabelText(/start date/i), "2026-02-01");
      await userEvent.type(screen.getByLabelText(/end date/i), "2026-01-01");
      expect(screen.getAllByRole("row")).toHaveLength(3); // header + both expenses, unfiltered
    });
    ```
    Minimal code: `App.tsx`'s `visibleExpenses` falls back to the full `expenses` array whenever
    `range.isValid` is `false`.
  - |
    AC5 - clearing both date fields restores the full list (src/App.test.tsx):
    ```ts
    it("restores the full list when both date fields are cleared", async () => {
      saveExpense(makeExpense({ id: "1", date: "2026-01-01" }));
      saveExpense(makeExpense({ id: "2", date: "2026-02-01" }));
      render(<App />);
      await userEvent.type(screen.getByLabelText(/start date/i), "2026-01-15");
      await userEvent.clear(screen.getByLabelText(/start date/i));
      expect(screen.getAllByRole("row")).toHaveLength(3);
    });
    ```
    Minimal code: `filterExpensesByDateRange` treats an empty `start`/`end` string as "no bound"
    (already handled by the `if (start && ...)` guards above).
  - |
    AC6 - empty-state message when no expenses fall in a valid range (src/App.test.tsx):
    ```ts
    it("shows a distinct empty-state message when the range matches nothing", async () => {
      saveExpense(makeExpense({ id: "1", date: "2026-01-01" }));
      render(<App />);
      await userEvent.type(screen.getByLabelText(/start date/i), "2026-06-01");
      await userEvent.type(screen.getByLabelText(/end date/i), "2026-07-01");
      expect(screen.getByText(/no expenses match the selected date range/i)).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /add an expense/i })).not.toBeInTheDocument();
    });
    ```
    Minimal code: `App.tsx` passes
    `emptyMessage={range.isValid && (range.start || range.end) && visibleExpenses.length === 0 ? "No expenses match the selected date range." : undefined}`
    to `ExpenseList`.
  - |
    AC7 - inclusive range with both start and end set (src/domain/dateRangeFilter.test.ts):
    ```ts
    it("includes expenses on the boundary dates", () => {
      const expenses = [makeExpense({ id: "a", date: "2026-01-01" }), makeExpense({ id: "b", date: "2026-01-15" }), makeExpense({ id: "c", date: "2026-02-01" })];
      expect(filterExpensesByDateRange(expenses, "2026-01-01", "2026-01-15").map((e) => e.id)).toEqual(["a", "b"]);
    });
    ```
    Minimal code: both bound checks combined in one `.filter()` predicate (shown in scope above).
  - |
    AC8 - distinct error for an unparseable date value (src/domain/dateRangeFilter.test.ts):
    ```ts
    it("flags an unparseable start date distinctly from a range error", () => {
      const errors = validateDateRange("not-a-date", "");
      expect(errors.start).toMatch(/valid date/i);
      expect(errors.range).toBeUndefined();
    });
    ```
    and via the field (src/components/DateRangeFilter.test.tsx):
    ```ts
    it("shows an inline error for an unparseable start date", async () => {
      render(<DateRangeFilter onRangeChange={vi.fn()} />);
      await userEvent.type(screen.getByLabelText(/start date/i), "not-a-date");
      expect(screen.getByRole("alert")).toHaveTextContent(/valid date/i);
    });
    ```
    Minimal code: `type="text"` field (not `type="date"`) so an arbitrary string reaches
    `validateDateRange`, which rejects it via `ISO_DATE_PATTERN`/`Date.parse`.
  - |
    AC9 - list stays unfiltered while an unparseable value is present (src/App.test.tsx):
    ```ts
    it("keeps the full list visible while the start date is unparseable", async () => {
      saveExpense(makeExpense({ id: "1", date: "2026-01-01" }));
      saveExpense(makeExpense({ id: "2", date: "2026-02-01" }));
      render(<App />);
      await userEvent.type(screen.getByLabelText(/start date/i), "not-a-date");
      expect(screen.getAllByRole("row")).toHaveLength(3);
    });
    ```
    Minimal code: same `range.isValid` fallback as AC4 — `isValid` is derived from
    `Object.keys(validateDateRange(start, end)).length === 0` inside `DateRangeFilter`.
  - |
    AC10 - clearing one of two valid fields filters on the remaining field alone
    (src/domain/dateRangeFilter.test.ts):
    ```ts
    it("filters on the end date alone once the start date is cleared", () => {
      const expenses = [makeExpense({ id: "a", date: "2026-01-01" }), makeExpense({ id: "b", date: "2026-01-10" })];
      expect(filterExpensesByDateRange(expenses, "", "2026-01-05").map((e) => e.id)).toEqual(["a"]);
    });
    ```
    Minimal code: none beyond AC1/AC2/AC7 — the same guarded predicate already satisfies this
    once either bound is an empty string.
  - |
    AC11 - accessible labels for both fields (src/components/DateRangeFilter.test.tsx):
    ```ts
    it("labels both date fields for assistive technology", () => {
      render(<DateRangeFilter onRangeChange={vi.fn()} />);
      expect(screen.getByLabelText(/start date/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/end date/i)).toBeInTheDocument();
    });
    ```
    Minimal code: `<label htmlFor={startId}>Start date</label>` / `<label htmlFor={endId}>End
    date</label>` with matching `id`s via `useId()`.
  - |
    AC12 - both fields reachable/operable via keyboard only (src/components/DateRangeFilter.test.tsx):
    ```ts
    it("is reachable via Tab in document order with no keyboard trap", async () => {
      render(<DateRangeFilter onRangeChange={vi.fn()} />);
      await userEvent.tab();
      expect(screen.getByLabelText(/start date/i)).toHaveFocus();
      await userEvent.tab();
      expect(screen.getByLabelText(/end date/i)).toHaveFocus();
    });
    ```
    Minimal code: plain `<input>` elements in DOM order, no `tabIndex` overrides, no wrapping
    `<form>` (so Enter cannot trigger an implicit submit/navigation).
  - |
    AC13 - inline errors announced to assistive technology (src/components/DateRangeFilter.test.tsx):
    ```ts
    it("exposes the range error via role=alert", async () => {
      render(<DateRangeFilter onRangeChange={vi.fn()} />);
      await userEvent.type(screen.getByLabelText(/start date/i), "2026-02-01");
      await userEvent.type(screen.getByLabelText(/end date/i), "2026-01-01");
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
    ```
    Minimal code: both the format error and the range error render inside a `<p role="alert">`
    (implicit `aria-live="assertive"`), matching `AddExpenseForm.tsx:77,93`'s existing pattern.

assumptions_or_open_questions:
  - |
    I used `type="text"` (not `type="date"`) for both filter fields, deliberately diverging from
    `AddExpenseForm.tsx:87`. A native `type="date"` input cannot hold an unparseable value — the
    browser either normalizes the typed text or reports an empty string — so AC8/AC9 ("the user
    types an unparseable value... a distinct inline error... the list remains unfiltered") would
    be unreachable/untestable with `type="date"`. If the reviewer wants `type="date"` for
    platform date-picker affordances instead, AC8/AC9 need to be reinterpreted as covering only
    empty-string edge cases, which is a materially smaller scope than as written.
  - |
    I assumed the empty-state message text ("No expenses match the selected date range.") is
    free text, not specified by the story; happy to align it with whatever copy the team uses
    elsewhere.
  - |
    I assumed `ExpenseList`'s existing internal pagination `page` state must be reset whenever
    the active date range changes (via a `key` remount from `App.tsx`), since AC7/AC10 imply the
    filtered list is shown starting from its first page; the ACs don't mention pagination
    explicitly, so this is inferred to avoid a regression where a shrunk filtered list strands
    the user on a now-empty later page with no visible way back.
  - |
    I assumed ISO string comparison (`expense.date < start`) is sufficient for range comparisons
    given `Expense.date` is always stored as `YYYY-MM-DD` (`src/domain/expense.ts:7`), matching
    the existing sort in `expenseRepository.ts` — no timezone/`Date` object handling is needed.

package_dependencies: []

notes: |
  This plan touches the domain layer (new `dateRangeFilter.ts`) and the component layer (new
  `DateRangeFilter.tsx`, changed `ExpenseList.tsx`, changed `App.tsx`), crossing the
  component-to-domain boundary in a new direction (`App.tsx` calling the new filter module
  directly, the way it already calls `expenseRepository.ts`), so a flowchart is included.

  ```mermaid
  flowchart TD
    App["App.tsx"]:::touched
    DateRangeFilter["DateRangeFilter.tsx (new)"]:::touched
    ExpenseList["ExpenseList.tsx"]:::touched
    FilterDomain["dateRangeFilter.ts (new)"]:::touched
    Repo["expenseRepository.ts"]

    App -->|"renders, receives onRangeChange({start,end,isValid})"| DateRangeFilter
    App -->|"filterExpensesByDateRange(expenses, start, end) when isValid"| FilterDomain
    App -->|"passes visibleExpenses + emptyMessage, key=range for page reset"| ExpenseList
    App -->|"loadExpenses() (unchanged)"| Repo
    DateRangeFilter -->|"validateDateRange(start, end) on every change"| FilterDomain

    classDef touched fill:#f96,color:#000
  ```

  Existing tests that must keep passing unmodified as a check on this work (no ACs require
  changing them): `ExpenseList.test.tsx`'s "shows an empty-state message... when there are no
  expenses" (still hits the default `emptyMessage`) and "shows a call-to-action..." (still hits
  the CTA branch, since `App.tsx` only ever passes a non-default `emptyMessage` when the ledger
  is non-empty but filtered to zero).
