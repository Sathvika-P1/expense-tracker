summary: |
  Implement ET-STORY-018 (Clear All Filters). The codebase currently has no filtering or
  search functionality at all (no date/category/keyword inputs, no filter predicate) — the
  only filtering that exists is the unrelated per-user filter inside `expenseRepository.ts`.
  Since this story's acceptance criteria require date, category, and keyword inputs to exist
  and be resettable, a minimal filter surface is introduced as an explicit prerequisite
  (scope item 1), kept as thin as possible (four inputs, one pure predicate, no debouncing,
  no URL sync, no active-filter chips/summary — those belong to the parent "Filtering &
  Search" epic, not this story). The actual story work is the "Clear all filters" control
  that resets those inputs to their defaults and restores the full expense list
  (scope items 2-3).

scope:
  - description: |
      Add a minimal filter surface: an `ExpenseFilters` type, a pure `filterExpenses`
      domain function, and filter/search inputs (start date, end date, category, keyword)
      rendered above the list, with state owned by `App`.

      New file `src/domain/expenseFilters.ts`:
      ```ts
      import type { Expense } from "./expense";

      export interface ExpenseFilters {
        startDate: string;
        endDate: string;
        category: string;
        keyword: string;
      }

      export const EMPTY_FILTERS: ExpenseFilters = {
        startDate: "",
        endDate: "",
        category: "",
        keyword: "",
      };

      export function filterExpenses(expenses: Expense[], filters: ExpenseFilters): Expense[] {
        return expenses.filter((expense) => {
          if (filters.startDate && expense.date < filters.startDate) return false;
          if (filters.endDate && expense.date > filters.endDate) return false;
          if (filters.category && expense.category !== filters.category) return false;
          if (filters.keyword && !(expense.notes ?? "").toLowerCase().includes(filters.keyword.toLowerCase())) return false;
          return true;
        });
      }
      ```

      New file `src/components/ExpenseFiltersForm.tsx` exposing labeled inputs:
      ```ts
      interface ExpenseFiltersFormProps {
        filters: ExpenseFilters;
        onChange: (filters: ExpenseFilters) => void;
        onClear: () => void;
      }
      export function ExpenseFiltersForm({ filters, onChange, onClear }: ExpenseFiltersFormProps) { ... }
      ```
      Inputs: `<input type="date" aria-label="Start date">`, `<input type="date" aria-label="End date">`,
      `<select aria-label="Category">` (options from `CATEGORIES`, plus an "All categories" empty option),
      `<input type="text" aria-label="Keyword">`, and `<button type="button">Clear all filters</button>`.
    files:
      - src/domain/expenseFilters.ts
      - src/domain/expenseFilters.test.ts
      - src/components/ExpenseFiltersForm.tsx
      - src/components/ExpenseFiltersForm.test.tsx
    rationale: |
      This story's ACs presuppose date, category, and keyword filter/search inputs already
      exist ("all date, category, and keyword inputs are reset"), but no such inputs or
      predicate exist anywhere in the repo today (confirmed: the only `filter` usages are
      `expenseRepository.ts`'s per-user filter and an old unrelated plan file). This is a
      genuine prerequisite, not scope creep — kept minimal on purpose so it does not
      encroach on the parent epic's own filtering stories. If a sibling filtering story from
      the parent epic lands separately before this one, this scope item should be dropped and
      the Clear-all control rebased onto that story's `ExpenseFilters`/`filterExpenses`
      interface instead.

  - description: |
      Wire filter state into `App.tsx`: own `filters` state initialized to `EMPTY_FILTERS`,
      render `ExpenseFiltersForm` above `ExpenseList`, derive the displayed list via
      `filterExpenses`, and reset the `filters` state to `EMPTY_FILTERS` when "Clear all
      filters" is activated.

      Before:
      ```ts
      export default function App() {
        const [expenses, setExpenses] = useState<Expense[]>(() => loadExpenses());
        ...
        <ExpenseList expenses={expenses} onAddExpenseClick={...} />
      ```
      After:
      ```ts
      export default function App() {
        const [expenses, setExpenses] = useState<Expense[]>(() => loadExpenses());
        const [filters, setFilters] = useState<ExpenseFilters>(EMPTY_FILTERS);
        const visibleExpenses = filterExpenses(expenses, filters);
        ...
        <ExpenseFiltersForm filters={filters} onChange={setFilters} onClear={() => setFilters(EMPTY_FILTERS)} />
        <ExpenseList expenses={visibleExpenses} onAddExpenseClick={...} />
      ```
    files:
      - src/App.tsx
      - src/App.test.tsx
    rationale: |
      Filter state and the derived visible list are owned by `App` (the same place
      `expenses` state already lives), keeping `ExpenseList` purely presentational per its
      existing test suite ("renders expenses in the given order"). "Clear all filters"
      is a plain `setFilters(EMPTY_FILTERS)` call, which is exactly AC1's requirement that
      all inputs reset to their default (empty) values, and AC2 follows automatically since
      `filterExpenses(expenses, EMPTY_FILTERS)` returns every expense unfiltered.

  - description: |
      Reset `ExpenseList`'s internal pagination (`page` state) to 0 whenever the filtered
      list identity changes due to filters being cleared, so "the full unfiltered expense
      list is displayed" (AC2) does not leave the user stranded on a page beyond the new
      list's bounds. Add a `useEffect` keyed on the `expenses` prop reference.

      Before:
      ```ts
      export function ExpenseList({ expenses, onAddExpenseClick }: ExpenseListProps) {
        const [page, setPage] = useState(0);
      ```
      After:
      ```ts
      export function ExpenseList({ expenses, onAddExpenseClick }: ExpenseListProps) {
        const [page, setPage] = useState(0);
        useEffect(() => {
          setPage(0);
        }, [expenses]);
      ```
    files:
      - src/components/ExpenseList.tsx
      - src/components/ExpenseList.test.tsx
    rationale: |
      `ExpenseList` owns `page` internally and currently never resets it when the `expenses`
      prop changes. Without this, clearing filters while on page 2 of a filtered result
      would still render page 2 of the newly-unfiltered list rather than starting at the
      top, which is a plausible reading violation of AC2 ("the full unfiltered expense list
      is displayed"). Resetting on every `expenses` reference change is simplest and matches
      the existing pattern of `ExpenseList` reacting only to its own props.

tests:
  - |
    AC1 (expenseFilters) - filterExpenses with EMPTY_FILTERS returns everything unfiltered
    (src/domain/expenseFilters.test.ts), establishing the baseline the Clear-all control relies on:
    ```ts
    it("returns all expenses when filters are empty", () => {
      const expenses = [makeExpense({ id: "1" }), makeExpense({ id: "2" })];
      expect(filterExpenses(expenses, EMPTY_FILTERS)).toEqual(expenses);
    });
    ```
    Minimal code: `filterExpenses` short-circuits each predicate when the corresponding filter field is `""`.
  - |
    AC1 - activating "Clear all filters" resets all date, category, and keyword inputs to their
    defaults (src/App.test.tsx):
    ```ts
    it("resets all filter inputs to their default values when Clear all filters is activated (AC1)", async () => {
      const user = userEvent.setup();
      render(<App />);

      await user.type(screen.getByLabelText(/start date/i), "2026-01-01");
      await user.type(screen.getByLabelText(/end date/i), "2026-02-01");
      await user.selectOptions(screen.getByLabelText(/category/i), "Travel");
      await user.type(screen.getByLabelText(/keyword/i), "lunch");

      await user.click(screen.getByRole("button", { name: /clear all filters/i }));

      expect(screen.getByLabelText(/start date/i)).toHaveValue("");
      expect(screen.getByLabelText(/end date/i)).toHaveValue("");
      expect(screen.getByLabelText(/category/i)).toHaveValue("");
      expect(screen.getByLabelText(/keyword/i)).toHaveValue("");
    });
    ```
    Minimal code: `ExpenseFiltersForm` is a controlled form (`value={filters.x}` / `onChange`); the
    "Clear all filters" button calls the `onClear` prop, which `App` wires to
    `setFilters(EMPTY_FILTERS)`.
  - |
    AC2 - activating "Clear all filters" restores the full unfiltered expense list
    (src/App.test.tsx):
    ```ts
    it("shows the full unfiltered expense list after Clear all filters is activated (AC2)", async () => {
      saveExpense({ id: "1", userId: "local-user", amount: 5, date: "2026-01-01", category: "Bills", createdAt: Date.now() });
      saveExpense({ id: "2", userId: "local-user", amount: 8, date: "2026-02-01", category: "Travel", createdAt: Date.now() });

      const user = userEvent.setup();
      render(<App />);

      await user.selectOptions(screen.getByLabelText(/category/i), "Travel");
      expect(screen.getAllByRole("row")).toHaveLength(2); // header + 1 filtered row

      await user.click(screen.getByRole("button", { name: /clear all filters/i }));

      expect(screen.getAllByRole("row")).toHaveLength(3); // header + both expenses
    });
    ```
    Minimal code: same `setFilters(EMPTY_FILTERS)` wiring as AC1; `filterExpenses(expenses,
    EMPTY_FILTERS)` returns all expenses, which `App` passes to `ExpenseList`.
  - |
    AC2 (pagination edge case) - clearing filters resets ExpenseList back to page one
    (src/components/ExpenseList.test.tsx):
    ```ts
    it("resets to the first page when the expenses prop changes", async () => {
      const pageOne = Array.from({ length: 12 }, (_, i) => makeExpense({ id: String(i) }));
      const { rerender } = render(<ExpenseList expenses={pageOne} onAddExpenseClick={vi.fn()} />);
      await userEvent.click(screen.getByRole("button", { name: /next page/i }));
      expect(screen.getByText(/page 2 of 2/i)).toBeInTheDocument();

      rerender(<ExpenseList expenses={[makeExpense({ id: "only" })]} onAddExpenseClick={vi.fn()} />);

      expect(screen.queryByText(/page 2/i)).not.toBeInTheDocument();
    });
    ```
    Minimal code: `useEffect(() => setPage(0), [expenses])` in `ExpenseList`.

assumptions_or_open_questions:
  - |
    No filtering or search functionality exists anywhere in the current codebase (verified:
    the only `filter` matches are `expenseRepository.ts`'s unrelated per-user filter). This
    plan therefore introduces a deliberately minimal filter surface (scope item 1) as a
    prerequisite for this story's ACs, rather than waiting on an unspecified sibling story
    from the parent "Filtering & Search" epic. If that epic's own filtering story lands
    first, scope item 1 should be dropped and this story rebased onto its
    `ExpenseFilters`/`filterExpenses` interface.
  - |
    "Clear all filters" is always visible (not conditionally shown only when a filter is
    active), since the ACs phrase "at least one filter is active" as a precondition for the
    reset *behavior*, not as a rendering rule for the control itself.
  - |
    Keyword search is assumed to match against `expense.notes` (the only free-text field on
    `Expense`); the story doesn't specify which field(s) "keyword" should search.
  - |
    Clearing filters resets `ExpenseList`'s internal pagination to page one; this isn't
    stated explicitly in the ACs but is necessary for "the full unfiltered expense list is
    displayed" to hold when the user was on a later page of a filtered result.
  - |
    Category filtering uses a single-select `<select>` (one category at a time, plus an "All
    categories" option), matching the single-select `AddExpenseForm` category input already
    in the codebase; the story doesn't specify multi-select.

package_dependencies: []

notes: |
  This plan touches the domain layer (new `expenseFilters.ts`) and the component layer
  (new `ExpenseFiltersForm.tsx`, `App.tsx`, `ExpenseList.tsx`), so a flowchart is included.

  ```mermaid
  flowchart TD
    App["App.tsx"]:::touched
    FiltersForm["ExpenseFiltersForm.tsx (new)"]:::touched
    ExpenseList["ExpenseList.tsx"]:::touched
    FiltersDomain["expenseFilters.ts (new)"]:::touched
    Repo["expenseRepository.ts"]
    ExpenseType["expense.ts"]
    Categories["categories.ts"]

    App -->|"owns filters state, renders form"| FiltersForm
    FiltersForm -->|"onClear -> setFilters(EMPTY_FILTERS)"| App
    App -->|"filterExpenses(expenses, filters)"| FiltersDomain
    App -->|"passes filtered list"| ExpenseList
    App -->|"loadExpenses() (unchanged)"| Repo
    FiltersDomain -->|"reads Expense shape"| ExpenseType
    FiltersForm -->|"category options"| Categories

    classDef touched fill:#f96,color:#000
  ```

  Verification command: `npm test` (runs `vitest run`, per `package.json`). No new
  third-party packages are needed — `@testing-library/react`, `@testing-library/user-event`,
  and `vitest` are already devDependencies used by the existing test suite.
