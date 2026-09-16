summary: |
  Add a category filter control above the expense list so users can narrow the visible
  expenses to one or more of six fixed categories, with an "any of" match, a dedicated
  empty-state for no matches, and a reset to unfiltered on reload/navigation (filter state
  is in-memory only, never persisted). This requires reconciling the six category labels
  from the acceptance criteria (Food, Transport, Housing, Utilities, Entertainment, Other)
  with the six currently in `src/domain/categories.ts` (Food, Travel, Shopping, Bills,
  Healthcare, Others), since AC1 and AC4 together only work if the filter's options and
  `Expense.category` share one vocabulary.

scope:
  - description: |
      Rename the fixed category vocabulary in `src/domain/categories.ts` from
      `Food, Travel, Shopping, Bills, Healthcare, Others` to
      `Food, Transport, Housing, Utilities, Entertainment, Other` to match AC4 exactly,
      and update every test/fixture that hardcodes an old label so the suite stays green.
    files:
      - src/domain/categories.ts
      - src/components/ExpenseList.test.tsx
      - src/App.test.tsx
      - src/components/AddExpenseForm.test.tsx
    rationale: |
      AC4 requires the filter to list exactly these six names. AC1 requires that selecting
      a category narrows the list to expenses that actually carry that category value. If
      the filter vocabulary and `Expense.category` vocabulary differ, every selection would
      hit AC5's empty state instead of AC1's expected match, so the domain categories must
      be renamed rather than layering a second, filter-only category list on top.
  - description: |
      Create `src/domain/categoryFilter.ts` exporting a pure function
      `filterExpensesByCategories(expenses: Expense[], selected: Category[]): Expense[]`
      that returns all expenses when `selected` is empty, and otherwise returns expenses
      whose `category` is included in `selected` (OR semantics).
    files:
      - src/domain/categoryFilter.ts
      - src/domain/categoryFilter.test.ts
    rationale: |
      Keeping the filter predicate as a small pure function (mirroring `validateExpense.ts`'s
      style) makes AC1/AC2/AC3 independently testable without mounting React, and gives
      `ExpenseList`/`App` one shared source of truth for "what counts as a match."
  - description: |
      Create `src/components/CategoryFilter.tsx`, a checkbox group of the six `CATEGORIES`
      values (`props: { selected: Category[]; onChange: (next: Category[]) => void }`),
      each checkbox labelled with its category name and toggled independently.
    files:
      - src/components/CategoryFilter.tsx
      - src/components/CategoryFilter.test.tsx
    rationale: |
      AC4 requires exactly the six fixed categories as selectable options and nothing else;
      a dedicated component keeps that list declarative (`CATEGORIES.map(...)`) so it can
      never drift from `domain/categories.ts`.
  - description: |
      Wire filtering into `App.tsx`: hold `selectedCategories: Category[]` in
      `useState<Category[]>([])` (never persisted to localStorage or read from it), render
      `<CategoryFilter>` above `<ExpenseList>`, and pass `filterExpensesByCategories(expenses,
      selectedCategories)` as `ExpenseList`'s `expenses` prop instead of the raw list.
    files:
      - src/App.tsx
    rationale: |
      AC6 requires the filter to reset on reload/navigation; keeping `selectedCategories` in
      component state (not localStorage, not a URL param) makes that the natural, default
      behavior rather than something to explicitly clear.
  - description: |
      Extend `ExpenseListProps` with a new required prop `filterActive: boolean`
      (before: `{ expenses: Expense[]; onAddExpenseClick: () => void }`, after:
      `{ expenses: Expense[]; onAddExpenseClick: () => void; filterActive: boolean }`).
      In the existing empty branch, render "No expenses match the selected categories." when
      `filterActive` is true (no add-expense CTA), and keep the current
      "No expenses recorded yet." + CTA when `filterActive` is false. Also reset the
      component's internal `page` state to 0 whenever the (already-filtered) `expenses` prop
      reference changes, so switching filters while on page 2+ doesn't strand the user on a
      blank page.
    files:
      - src/components/ExpenseList.tsx
      - src/components/ExpenseList.test.tsx
    rationale: |
      AC5 asks for a message "in place of the expense list" that is distinct from the
      no-expenses-at-all state, which the current component conflates; `filterActive` lets
      the caller (App) say which case it is without ExpenseList knowing about filtering
      itself. Resetting `page` on prop change avoids a silent regression where a previously
      valid `page` index yields zero rows after filtering.

tests:
  - |
    # AC1: selecting one category shows only that category's expenses
    # src/domain/categoryFilter.test.ts
    it("returns only expenses matching the single selected category", () => {
      const food = makeExpense({ category: "Food" });
      const transport = makeExpense({ category: "Transport" });
      expect(filterExpensesByCategories([food, transport], ["Food"])).toEqual([food]);
    });
  - |
    # AC2: selecting multiple categories shows expenses in any of them
    # src/domain/categoryFilter.test.ts
    it("returns expenses matching any of the selected categories", () => {
      const food = makeExpense({ category: "Food" });
      const transport = makeExpense({ category: "Transport" });
      const housing = makeExpense({ category: "Housing" });
      expect(filterExpensesByCategories([food, transport, housing], ["Food", "Transport"]))
        .toEqual([food, transport]);
    });
  - |
    # AC3: deselecting all categories restores the full unfiltered list
    # src/components/CategoryFilter integration in App.test.tsx (via user interaction)
    it("restores the full expense list after deselecting all categories", async () => {
      saveExpense(makeExpense({ id: "1", category: "Food" }));
      saveExpense(makeExpense({ id: "2", category: "Housing" }));
      render(<App />);
      const user = userEvent.setup();
      await user.click(screen.getByRole("checkbox", { name: "Food" }));
      expect(screen.getAllByRole("row")).toHaveLength(2);
      await user.click(screen.getByRole("checkbox", { name: "Food" }));
      expect(screen.getAllByRole("row")).toHaveLength(3);
    });
  - |
    # AC4: exactly the six fixed categories are listed, no others
    # src/components/CategoryFilter.test.tsx
    it("lists exactly the six fixed categories as checkboxes", () => {
      render(<CategoryFilter selected={[]} onChange={vi.fn()} />);
      const checkboxes = screen.getAllByRole("checkbox");
      expect(checkboxes.map((c) => c.getAttribute("aria-label") ?? c.textContent)).toHaveLength(6);
      ["Food", "Transport", "Housing", "Utilities", "Entertainment", "Other"].forEach((name) => {
        expect(screen.getByRole("checkbox", { name })).toBeInTheDocument();
      });
    });
  - |
    # AC5: dedicated empty-state message when selected categories match nothing
    # src/components/ExpenseList.test.tsx
    it("shows a dedicated empty-state message when the filter matches no expenses", () => {
      render(<ExpenseList expenses={[]} onAddExpenseClick={vi.fn()} filterActive />);
      expect(screen.queryByRole("table")).not.toBeInTheDocument();
      expect(screen.getByText(/no expenses match the selected categories/i)).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /add.*expense/i })).not.toBeInTheDocument();
    });
  - |
    # AC6: filter resets on reload/remount, nothing persisted
    # src/App.test.tsx
    it("does not persist the category filter across a remount", async () => {
      saveExpense(makeExpense({ id: "1", category: "Food" }));
      saveExpense(makeExpense({ id: "2", category: "Housing" }));
      const user = userEvent.setup();
      const { unmount } = render(<App />);
      await user.click(screen.getByRole("checkbox", { name: "Food" }));
      expect(screen.getAllByRole("row")).toHaveLength(2);
      unmount();
      render(<App />);
      expect(screen.getAllByRole("row")).toHaveLength(3);
      expect(localStorage.getItem("categoryFilter")).toBeNull();
    });

assumptions_or_open_questions:
  - |
    OPEN QUESTION (blocking, high blast radius): the six categories named in AC4
    (Food, Transport, Housing, Utilities, Entertainment, Other) do not match the six
    currently in `src/domain/categories.ts` (Food, Travel, Shopping, Bills, Healthcare,
    Others). This plan assumes the domain vocabulary should be renamed to match the AC,
    touching `categories.ts`, `AddExpenseForm` (via `CATEGORIES.map`, no code change needed
    there, only its test fixtures), and every test file that hardcodes an old label
    (`ExpenseList.test.tsx`, `App.test.tsx`, `AddExpenseForm.test.tsx`). If the intent was
    instead to add a second, filter-only category list, or to keep the old vocabulary and
    change the AC wording, say so and this plan will be revised before any code is written.
  - |
    OPEN QUESTION: any expenses already saved in a user's browser localStorage under the old
    category names (e.g. "Travel") will silently stop matching any filter checkbox once the
    rename ships, since there is no migration step in this plan. Confirming whether a
    migration/back-fill is in scope, or whether this is acceptable (e.g. pre-launch app with
    no real user data yet), is needed before merging.
  - |
    Assumed the filter is "select zero or more of six checkboxes," not a dropdown/multi-select
    widget, since ACs describe independent selection/deselection of individual categories
    (AC1-3) rather than a single combo control; a checkbox group is the simplest fit and
    mirrors no existing precedent in this codebase (first filter control added).
  - |
    Assumed "no categories selected" (empty array) is the unfiltered state per AC3's wording
    ("deselect all categories THEN the full unfiltered list is restored"), rather than a
    separate "select all" sentinel value.
  - |
    Assumed filter state does not need to survive the "Add Expense" form's own re-render
    cycle within the same page load, only that it resets on an actual reload/remount (AC6),
    since App already re-fetches `expenses` via `loadExpenses()` on every save without
    touching filter state.

package_dependencies: []

notes: |
  No new third-party dependencies: React, vitest, @testing-library/react, and
  @testing-library/user-event are already used identically in `ExpenseList.test.tsx` and
  `AddExpenseForm.test.tsx`.

  Renaming `categories.ts` is a pure string-literal change; `AddExpenseForm.tsx` itself needs
  no code change since it already renders `CATEGORIES.map(...)` generically, but its test
  file selects `"Food"` (unaffected) and does not reference the renamed categories, so no
  edit is needed there beyond what's already listed in `scope`.

  ```mermaid
  flowchart TD
    App["App.tsx"]
    CF["CategoryFilter.tsx (new)"]
    EL["ExpenseList.tsx"]
    AEF["AddExpenseForm.tsx"]
    CAT["domain/categories.ts"]
    FILT["domain/categoryFilter.ts (new)"]
    REPO["domain/expenseRepository.ts"]

    App -->|renders, owns selectedCategories state| CF
    App -->|passes filtered expenses + filterActive prop| EL
    App -->|calls filterExpensesByCategories| FILT
    App -->|loadExpenses on mount/save| REPO
    CF -->|reads CATEGORIES for checkbox list| CAT
    AEF -->|reads CATEGORIES for select options| CAT
    FILT -->|reads Category type| CAT

    classDef touched fill:#f96,color:#000
    class App,CF,EL,CAT,FILT touched
  ```

  `AddExpenseForm.tsx` and `expenseRepository.ts` are shown for context (both read/depend on
  `categories.ts`'s renamed values) but are not edited beyond their test fixtures.
