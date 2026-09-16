summary: |
  No filter UI or filtering logic exists yet anywhere in the codebase (confirmed by grepping
  `src/` for "filter"/"keyword" — zero matches), so this story must introduce the filter
  mechanism itself, not just "combine" pre-existing filters. It adds a pure `filterExpenses`
  predicate in the domain layer (date range + category + keyword, all simultaneously AND'd), a
  new presentational `ExpenseFilters` component for the three controls, and wires filter state
  into `App.tsx` so the already-synchronous `setExpenses(loadExpenses())` refresh path (used
  today by `AddExpenseForm`'s `onSaved`) keeps the filtered view live. It also fixes a page-reset
  bug in `ExpenseList` where narrowing the filtered set while on a later page would strand the
  user on a blank page, and adds a distinct "no results match your filters" empty state so it
  isn't confused with the true empty-list state. Editing and deleting expenses (full UI: forms,
  confirmation, validation) are explicitly OUT of scope — this story only needs a repository-level
  `deleteExpense`/`updateExpense` seam so AC2/AC3 (live updates on edit/delete) are testable
  without inventing UI that belongs to separate CRUD stories under a different epic.

scope:
  - description: |
      Add a pure, dependency-free filter predicate to the domain layer.

      New file `src/domain/filterExpenses.ts`:
      ```ts
      import type { Expense } from "./expense";
      import type { Category } from "./categories";

      export interface ExpenseFilterCriteria {
        startDate?: string; // ISO YYYY-MM-DD, inclusive
        endDate?: string;   // ISO YYYY-MM-DD, inclusive
        category?: Category;
        keyword?: string;   // matched case-insensitively against `notes`
      }

      export function filterExpenses(
        expenses: Expense[],
        criteria: ExpenseFilterCriteria,
      ): Expense[] {
        return expenses.filter((expense) => {
          if (criteria.startDate && expense.date < criteria.startDate) return false;
          if (criteria.endDate && expense.date > criteria.endDate) return false;
          if (criteria.category && expense.category !== criteria.category) return false;
          if (criteria.keyword) {
            const needle = criteria.keyword.trim().toLowerCase();
            if (needle && !(expense.notes ?? "").toLowerCase().includes(needle)) return false;
          }
          return true;
        });
      }
      ```
    files:
      - src/domain/filterExpenses.ts
      - src/domain/filterExpenses.test.ts
    rationale: |
      Mirrors the ET-STORY-009 pattern of keeping derivation logic (filter/sort) in the domain
      layer and components purely presentational. A pure function is the cheapest thing to unit
      test for AC1/AC4 (combination correctness, no-match case) without touching React at all.
      An absent/empty field means "inactive," per the story's "any combination" wording — an
      unset date range or empty keyword must not exclude everything.

  - description: |
      Add a presentational `ExpenseFilters` component exposing date-range, category, and keyword
      controls, fully controlled by the parent.

      New file `src/components/ExpenseFilters.tsx`:
      ```ts
      import type { ExpenseFilterCriteria } from "../domain/filterExpenses";
      import { CATEGORIES } from "../domain/categories";

      interface ExpenseFiltersProps {
        criteria: ExpenseFilterCriteria;
        onChange: (criteria: ExpenseFilterCriteria) => void;
      }

      export function ExpenseFilters({ criteria, onChange }: ExpenseFiltersProps) { /* ... */ }
      ```
      Inputs: `<input type="date">` for start/end with `aria-label`s "Start date"/"End date",
      `<select aria-label="Category">` (with an "All categories" option), and
      `<input aria-label="Keyword">`. Every `onChange` calls the parent's `onChange` with the
      merged criteria object immediately (no local buffering/debounce) so AC5/AC6 hold.
    files:
      - src/components/ExpenseFilters.tsx
      - src/components/ExpenseFilters.test.tsx
    rationale: |
      A separate controlled component (state lifted to `App.tsx`) matches the existing
      `AddExpenseForm`/`ExpenseList` split: `ExpenseFilters` only renders controls and reports
      changes, it does not read/filter expenses itself.

  - description: |
      Wire filter state into `App.tsx`: hold `ExpenseFilterCriteria` state, derive the filtered
      list with `filterExpenses` on every render, and pass the filtered list to `ExpenseList`.

      Before:
      ```ts
      const [expenses, setExpenses] = useState<Expense[]>(() => loadExpenses());
      ...
      <ExpenseList expenses={expenses} onAddExpenseClick={...} />
      ```
      After:
      ```ts
      const [expenses, setExpenses] = useState<Expense[]>(() => loadExpenses());
      const [criteria, setCriteria] = useState<ExpenseFilterCriteria>({});
      const filteredExpenses = filterExpenses(expenses, criteria);
      ...
      <ExpenseFilters criteria={criteria} onChange={setCriteria} />
      <ExpenseList expenses={filteredExpenses} onAddExpenseClick={...} />
      ```
    files:
      - src/App.tsx
    rationale: |
      Filtering is a synchronous derivation from state already held in `App`, so no new
      async/loading state is introduced (satisfies AC6 by construction) and the existing
      `onSaved={() => setExpenses(loadExpenses())}` refresh already re-runs the derivation,
      satisfying the "new expense added" half of AC2 with zero additional code.

  - description: |
      Add `updateExpense` and `deleteExpense` to the repository so AC2 (edit) and AC3 (delete)
      are testable at the domain layer. No edit/delete UI is added in this story (see
      `assumptions_or_open_questions`); `App.tsx` gains no new call sites for these beyond what
      the tests exercise directly against the repository, except confirming the existing refresh
      path also re-filters after a repository mutation.

      New functions in `src/domain/expenseRepository.ts`:
      ```ts
      export function updateExpense(updated: Expense): Expense[] {
        const expenses = loadAll().map((e) => (e.id === updated.id ? updated : e));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
        return expenses;
      }

      export function deleteExpense(id: string): Expense[] {
        const expenses = loadAll().filter((e) => e.id !== id);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
        return expenses;
      }
      ```
    files:
      - src/domain/expenseRepository.ts
      - src/domain/expenseRepository.test.ts
    rationale: |
      AC2/AC3 require that edits/deletes to underlying data are reflected in the filtered view
      "immediately." Since `App.tsx` already re-derives the filtered list from `expenses` state
      on every render, the only new behavior to prove is that the repository correctly persists
      an update/delete and that `loadExpenses()` (or `filterExpenses` over its result) reflects
      it — an integration test in `App.test.tsx` (calling `updateExpense`/`deleteExpense` then
      re-rendering) exercises this without needing an edit form or delete button.

  - description: |
      Fix a pagination bug in `ExpenseList`: `page` state is not reset when the `expenses` prop
      shrinks (e.g., a filter narrows 30 results to 3 while the user is on page 3), leaving a
      blank page and violating AC5 ("filtered results are displayed immediately").

      Before:
      ```ts
      const [page, setPage] = useState(0);
      ```
      After:
      ```ts
      const [page, setPage] = useState(0);
      const totalPages = Math.max(1, Math.ceil(expenses.length / PAGE_SIZE));
      const clampedPage = Math.min(page, totalPages - 1);
      // use clampedPage (not page) for slicing/display; call setPage(clampedPage) in an effect
      // if clampedPage !== page, or derive without storing an out-of-range value at all.
      ```
    files:
      - src/components/ExpenseList.tsx
      - src/components/ExpenseList.test.tsx
    rationale: |
      This bug is latent today (only reachable via pagination edge cases) but becomes reachable
      the moment filters can shrink the list mid-session, which is exactly this story's AC5/AC6.

  - description: |
      Give `ExpenseList` a distinct "no results match your filters" empty state, separate from
      the current "No expenses recorded yet." (true empty list) state, so AC4 doesn't reuse the
      wrong message when the user has expenses but none match the active filters.

      Add a new prop:
      ```ts
      interface ExpenseListProps {
        expenses: Expense[];
        onAddExpenseClick: () => void;
        hasActiveFilters?: boolean;
      }
      ```
      When `expenses.length === 0 && hasActiveFilters`, render "No expenses match your filters."
      without the "Add an expense" CTA; otherwise keep the existing true-empty-state branch.
    files:
      - src/components/ExpenseList.tsx
      - src/components/ExpenseList.test.tsx
      - src/App.tsx
    rationale: |
      AC4 says the list "shows no entries" for a non-matching filter combination, which the
      existing empty state already does structurally (no table), but its copy and CTA are
      written for the zero-expenses-ever case and would mislead a user who does have expenses.
      `App.tsx` passes `hasActiveFilters` computed from whether `criteria` has any set field.

tests:
  - |
    AC1 - combined filters AND together (src/domain/filterExpenses.test.ts):
    ```ts
    it("returns only expenses matching date range, category, and keyword simultaneously", () => {
      const expenses = [
        makeExpense({ id: "1", date: "2026-01-15", category: "Food", notes: "Lunch with team" }),
        makeExpense({ id: "2", date: "2026-01-15", category: "Travel", notes: "Lunch with team" }),
        makeExpense({ id: "3", date: "2026-03-01", category: "Food", notes: "Lunch with team" }),
        makeExpense({ id: "4", date: "2026-01-15", category: "Food", notes: "Taxi ride" }),
      ];
      const result = filterExpenses(expenses, {
        startDate: "2026-01-01",
        endDate: "2026-01-31",
        category: "Food",
        keyword: "lunch",
      });
      expect(result.map((e) => e.id)).toEqual(["1"]);
    });
    ```
    Minimal code: the `filterExpenses` predicate above, ANDing all active criteria.
  - |
    AC2 - filtered list updates live when an expense is added or edited (src/App.test.tsx):
    ```ts
    it("keeps a keyword-filtered list live when a matching expense is added (AC2)", async () => {
      saveExpense(makeExpense({ id: "old", notes: "Groceries" }));
      const user = userEvent.setup();
      render(<App />);
      await user.type(screen.getByLabelText(/keyword/i), "taxi");
      expect(screen.queryByText("Groceries")).not.toBeInTheDocument();

      await user.type(screen.getByLabelText(/amount/i), "20");
      await user.type(screen.getByLabelText(/date/i), "2026-02-01");
      await user.selectOptions(screen.getByLabelText(/category/i), "Travel");
      await user.type(screen.getByLabelText(/notes/i), "Taxi ride");
      await user.click(screen.getByRole("button", { name: /add expense/i }));

      await waitFor(() => expect(screen.getByText("Taxi ride")).toBeInTheDocument());
    });

    it("reflects an edited expense in the filtered list immediately (AC2)", () => {
      saveExpense(makeExpense({ id: "1", category: "Food", notes: "Lunch" }));
      const { rerender } = render(<App />);
      updateExpense(makeExpense({ id: "1", category: "Travel", notes: "Lunch" }));
      rerender(<App />);
      // domain-level: loadExpenses() reflects the update, which App re-derives on next render
      expect(loadExpenses().find((e) => e.id === "1")?.category).toBe("Travel");
    });
    ```
    Minimal code: no new App code beyond the `filteredExpenses` derivation from scope item 3;
    `updateExpense` from scope item 4.
  - |
    AC3 - deleted expense disappears from the filtered list immediately (src/domain/expenseRepository.test.ts):
    ```ts
    it("removes the expense from subsequent loadExpenses() results after deleteExpense", () => {
      saveExpense(makeExpense({ id: "1" }));
      saveExpense(makeExpense({ id: "2" }));
      deleteExpense("1");
      expect(loadExpenses().map((e) => e.id)).toEqual(["2"]);
    });
    ```
    Minimal code: `deleteExpense(id)` from scope item 4.
  - |
    AC4 - no-match filter combination shows zero entries with a distinct message (src/components/ExpenseList.test.tsx):
    ```ts
    it("shows a no-results message (not the empty-list CTA) when filters match nothing", () => {
      render(
        <ExpenseList expenses={[]} onAddExpenseClick={vi.fn()} hasActiveFilters />,
      );
      expect(screen.queryByRole("table")).not.toBeInTheDocument();
      expect(screen.getByText(/no expenses match your filters/i)).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /add.*expense/i })).not.toBeInTheDocument();
    });
    ```
    Minimal code: the `hasActiveFilters` branch from scope item 6.
  - |
    AC5 - filtered results render synchronously as soon as a filter is applied (src/App.test.tsx):
    ```ts
    it("shows filtered results immediately after typing a keyword, with no intermediate empty render (AC5)", async () => {
      saveExpense(makeExpense({ id: "1", notes: "Taxi ride" }));
      saveExpense(makeExpense({ id: "2", notes: "Groceries" }));
      const user = userEvent.setup();
      render(<App />);
      await user.type(screen.getByLabelText(/keyword/i), "taxi");
      expect(screen.getByText("Taxi ride")).toBeInTheDocument();
      expect(screen.queryByText("Groceries")).not.toBeInTheDocument();
    });
    ```
    Minimal code: the synchronous `filterExpenses(expenses, criteria)` derivation in `App.tsx`
    (scope item 3) — no debounce, no async state.
  - |
    AC6 - no loading indicator is ever shown while filters are active (src/App.test.tsx):
    ```ts
    it("shows no loading indicator while filters are active (AC6)", async () => {
      saveExpense(makeExpense({ id: "1", notes: "Taxi ride" }));
      const user = userEvent.setup();
      render(<App />);
      await user.type(screen.getByLabelText(/keyword/i), "taxi");
      expect(screen.queryByRole("status")).not.toBeInTheDocument();
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });
    ```
    Minimal code: none beyond AC5's — this is an absence assertion proving the synchronous
    derivation never introduces a loading state, not a feature to build.

assumptions_or_open_questions:
  - |
    Edit and delete UI (forms, confirmation dialogs, buttons in `ExpenseList`) are explicitly
    OUT of scope for this story. The parent epic is "Filtering & Search," not expense CRUD, and
    an edit/delete UI has its own ACs (which fields are editable, validation, confirmation
    prompts) that belong to separate stories. This story only adds `updateExpense`/
    `deleteExpense` to the repository as the minimal seam needed to make AC2/AC3 ("live updates
    on edit/delete") testable. If the reviewer intends full edit/delete UI to land as part of
    this story, that is materially more scope and should be called out explicitly.
  - |
    Keyword search matches only the `notes` field, case-insensitively, substring match. The ACs
    don't specify which field(s) "keyword" searches; `notes` is the only free-text field on
    `Expense` today.
  - |
    An unset/empty filter field (no start date, no end date, no category, empty keyword) is
    treated as "inactive" and does not narrow the results, per the story's "any combination of
    filters" wording — this is required for AC1 to be meaningful when only some filters are set.
  - |
    Date range bounds are inclusive and compared as ISO `YYYY-MM-DD` strings via ordinary
    `<`/`>` comparison, consistent with the existing `localeCompare` date-sort convention in
    `expenseRepository.ts`.
  - |
    "Category" filter is a single-select (one category at a time), matching the single-category
    `<select>` pattern already used in `AddExpenseForm`. Multi-select category filtering is not
    implied by any AC.
  - |
    No debounce is added to the keyword input. AC5/AC6 push toward showing results immediately;
    a debounce would introduce a perceptible delay that could read as a mini "loading" state.

package_dependencies: []

notes: |
  This plan touches the domain layer (`filterExpenses.ts` new, `expenseRepository.ts` extended)
  and the component layer (`ExpenseFilters.tsx` new, `ExpenseList.tsx` modified, `App.tsx`
  modified), so a flowchart is included.

  ```mermaid
  flowchart TD
    App["App.tsx"]:::touched
    ExpenseFilters["ExpenseFilters.tsx (new)"]:::touched
    ExpenseList["ExpenseList.tsx"]:::touched
    AddExpenseForm["AddExpenseForm.tsx"]
    FilterFn["filterExpenses.ts (new)"]:::touched
    Repo["expenseRepository.ts"]:::touched
    ExpenseType["expense.ts"]

    App -->|"holds ExpenseFilterCriteria state, calls filterExpenses(expenses, criteria) every render"| FilterFn
    App -->|"renders controls, receives onChange(criteria)"| ExpenseFilters
    App -->|"passes filteredExpenses + hasActiveFilters"| ExpenseList
    AddExpenseForm -->|"onSaved triggers setExpenses(loadExpenses()), already existing"| App
    App -->|"loadExpenses(), updateExpense(), deleteExpense() (new)"| Repo
    FilterFn -->|"reads Expense/Category shape"| ExpenseType

    classDef touched fill:#f96,color:#000
  ```

  Existing tests that must keep passing without modification to their assertions:
  `src/components/ExpenseList.test.tsx`'s current empty-state test (`hasActiveFilters` defaults
  to falsy/undefined, preserving the original "No expenses recorded yet." + CTA branch) and
  `src/App.test.tsx`'s three existing tests (AC7/AC1/AC5 from ET-STORY-009), which exercise the
  unfiltered path (`criteria = {}`) and must continue to pass unchanged since `filterExpenses`
  with no active criteria returns the input list as-is.
