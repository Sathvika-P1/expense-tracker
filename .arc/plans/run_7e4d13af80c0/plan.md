summary: |
  Add keyword search over the expense list. A pure `searchExpenses` domain function does a
  case-insensitive substring match against each expense's `category` and `notes`, and a search
  form in `App` (input + submit button, matching the approved prototype's "Search — Try it"
  screen) submits a term that filters the list shown by `ExpenseList`. Submitting a term that
  matches nothing renders the design's no-results empty state instead of the table. The design
  file (`.arc/designs/ET-STORY-026-design.html`) also depicts loading/error/highlight states and
  "Try:" hint chips; per the notes below, several of those are prototype-only affordances that
  don't apply to this synchronous, localStorage-backed app, or that this plan implements with a
  safer approach than the prototype's raw HTML injection.

scope:
  - description: |
      Add a pure domain function that filters expenses by a keyword term, matching the
      prototype's `matches()` helper: case-insensitive substring match against `category` and
      `notes` (which is optional, `notes?: string`, so treat a missing value as `""`). An empty
      or whitespace-only term returns the full list unfiltered (the design's browse baseline —
      "Showing all 8 expenses" — and AC1/AC2 both describe a *non-empty* keyword, so this is the
      only sensible default for the empty case).

      Signature:
      ```ts
      export function searchExpenses(expenses: Expense[], term: string): Expense[]
      ```
    files:
      - src/domain/searchExpenses.ts
    rationale: |
      Keeps the matching rule as a small, directly testable unit, mirroring how
      `validateExpense.ts` is factored out of the form component in this codebase.

  - description: |
      Add a search form to `App`: a labeled text input ("Search expenses", matching the
      prototype's `<label class="label" for="search-input">Search expenses</label>`) and a
      submit button labeled "Search". Use a native `<form role="search" onSubmit>` with
      `<button type="submit">Search</button>` so both clicking Search and pressing Enter submit
      — this is a deliberate improvement on the prototype, which uses `type="button"` plus a
      manual `onkeydown` Enter handler; a real `<form>` gets Enter-to-submit for free and is
      more robust.

      `App` holds `submittedTerm` state (not a pre-filtered array), and computes the visible
      list via `searchExpenses(expenses, submittedTerm)` on every render, so an expense added
      while a search term is active is still filtered correctly rather than going stale:
      ```tsx
      const [submittedTerm, setSubmittedTerm] = useState("");
      const visibleExpenses = searchExpenses(expenses, submittedTerm);
      ```

      Above the results, render a status line matching the prototype's `results-summary`
      copy: `Showing all N expenses` when `submittedTerm` is empty, otherwise
      `N result(s) for "term"` (singular "result" for N === 1, as in the prototype's
      `results.length === 1 ? '' : 's'` logic).
    files:
      - src/App.tsx
    rationale: |
      AC1/AC2 are both scoped to "when the search is submitted", so state must be submit-driven,
      not live-filter-as-you-type. The design's default screen and results screen both include
      this results-summary line.

  - description: |
      Pass `visibleExpenses` into `ExpenseList` and fix a latent pagination bug: `ExpenseList`
      keeps its own `page` state, so if a user is on page 2 of a 12-item list and then submits a
      search that returns 3 results, the existing `page` index slices past the end and the table
      silently renders no rows. Reset pagination whenever the submitted term changes by
      remounting the list keyed on the term:
      ```tsx
      <ExpenseList key={submittedTerm} expenses={visibleExpenses} onAddExpenseClick={...} />
      ```
    files:
      - src/App.tsx
    rationale: |
      Not called out by name in either AC, but AC1 requires "results matching the keyword are
      displayed" — a blank page-2 remnant after a valid search would violate that AC in practice
      for any list over 10 items, which this app already supports (see `PAGE_SIZE = 10` and the
      existing pagination tests in ExpenseList.test.tsx).

  - description: |
      Add a no-results empty state to `ExpenseList` for the case where `expenses` is non-empty
      overall but the *submitted term* matched nothing — distinct from the existing
      "No expenses recorded yet" empty state, which must keep firing when there are truly zero
      expenses (ExpenseList.test.tsx:54 already covers that case and must keep passing).

      Add a new prop so `ExpenseList` can distinguish "no expenses at all" from "no expenses
      matched this search":
      ```ts
      interface ExpenseListProps {
        expenses: Expense[];
        onAddExpenseClick: () => void;
        searchTerm?: string;
        onClearSearch?: () => void;
      }
      ```
      When `expenses.length === 0 && searchTerm` is non-empty, render the design's no-results
      state instead of the "no expenses yet" CTA: a heading `No expenses found for "{searchTerm}"`,
      the helper paragraph ("We couldn't find any expenses matching that keyword. Check the
      spelling, or try a broader term like a category name."), and a "Clear search" button that
      calls `onClearSearch`. Omit the 🔍 icon's decorative emoji or mark it `aria-hidden`, matching
      the prototype's `<div class="icon" aria-hidden="true">🔍</div>`.
    files:
      - src/components/ExpenseList.tsx
    rationale: |
      AC2 requires a no-results state to be displayed; the design's "No results — 'parking'
      (AC2)" screen is the only recorded spec for its copy and controls.

  - description: |
      Wire "Clear search" (in `ExpenseList`'s no-results state) back to `App`: clicking it resets
      `submittedTerm` to `""` and clears the search input's value, restoring the full list and
      the "Showing all N expenses" summary — matching the prototype's `clearSearch()` behavior.
    files:
      - src/App.tsx
    rationale: |
      AC2's screen includes a "Clear search" recovery action as part of the no-results state;
      without wiring it the no-results state would be a dead end.

  - description: |
      Deliberate deviations from the prototype, documented here rather than built silently:
      (1) the prototype's "Search — Try it" screen simulates a 350ms network delay with a
      skeleton-loading state and has a separate "Error" screen with a retry button — this app's
      search runs synchronously over an in-memory/localStorage array with no network call, so
      there is no pending or failure state to represent; loading and error screens are not
      implemented. (2) the "Try: coffee / groceries / transport / parking" hint chips are a
      prototype-only demo affordance for exploring the mock without typing; they are not part of
      either AC and are omitted. (3) the prototype's `highlight()` helper injects matched text
      via `innerHTML` and `mark.hit`, which is unsafe to apply to arbitrary user-entered `notes`
      (stored XSS risk) — this plan does not implement inline match-highlighting since it is not
      required by either AC; if a future story wants it, it must build the highlighted text as
      React child elements, never via `dangerouslySetInnerHTML`. (4) the prototype's fixture data
      uses category values ("Coffee", "Groceries", "Transport", "Utilities", "Entertainment")
      that don't exist in this app's real `Category` union (`src/domain/categories.ts`:
      Food/Travel/Shopping/Bills/Healthcare/Others); tests below use the real categories. (5) the
      prototype's page chrome (top nav bar, "Expenses" `<h1>`, card-wrapped table, design-token
      colors/spacing/typography) is not applied — the app currently renders fully unstyled (no
      design-system CSS is imported anywhere, confirmed by reading `src/main.tsx`), and neither
      AC requires a visual restyle, so this plan adds only the new search input/button/status/
      empty-state markup without introducing the design tokens or card/table chrome.
    files: []
    rationale: |
      The instructions require surfacing prototype/AC conflicts explicitly rather than silently
      picking one; this scope item is the record of every such decision made while planning.

tests:
  - |
    // src/domain/searchExpenses.test.ts
    it("returns expenses whose category or notes contain the term, case-insensitively", () => {
      const coffee = makeExpense({ category: "Food", notes: "Latte at Blue Bottle" });
      const travel = makeExpense({ category: "Travel", notes: "Uber to airport" });
      expect(searchExpenses([coffee, travel], "LATTE")).toEqual([coffee]);
    });
  - |
    // src/domain/searchExpenses.test.ts
    it("matches on category as well as notes", () => {
      const bills = makeExpense({ category: "Bills", notes: "Electric bill" });
      expect(searchExpenses([bills], "bills")).toEqual([bills]);
    });
  - |
    // src/domain/searchExpenses.test.ts
    it("treats a missing notes field as empty rather than throwing", () => {
      const noNotes = makeExpense({ category: "Food", notes: undefined });
      expect(() => searchExpenses([noNotes], "food")).not.toThrow();
      expect(searchExpenses([noNotes], "food")).toEqual([noNotes]);
    });
  - |
    // src/domain/searchExpenses.test.ts
    it("returns every expense when the term is empty or whitespace", () => {
      const all = [makeExpense(), makeExpense({ id: "2" })];
      expect(searchExpenses(all, "  ")).toEqual(all);
    });
  - |
    // src/domain/searchExpenses.test.ts
    it("returns an empty array when nothing matches", () => {
      expect(searchExpenses([makeExpense({ category: "Food", notes: "Lunch" })], "parking")).toEqual([]);
    });
  - |
    // src/App.test.tsx — AC1
    it("shows only expenses matching a submitted keyword (AC1)", async () => {
      saveExpense({ id: "1", userId: "local-user", amount: 5, date: "2026-01-01", category: "Food", notes: "Latte", createdAt: Date.now() });
      saveExpense({ id: "2", userId: "local-user", amount: 5, date: "2026-01-02", category: "Travel", notes: "Uber ride", createdAt: Date.now() });
      const user = userEvent.setup();
      render(<App />);
      await user.type(screen.getByLabelText(/search expenses/i), "latte");
      await user.click(screen.getByRole("button", { name: /^search$/i }));
      await waitFor(() => {
        expect(screen.getAllByRole("row")).toHaveLength(2);
        expect(screen.getByRole("row", { name: /latte/i })).toBeInTheDocument();
      });
    });
  - |
    // src/App.test.tsx — AC1, submit via Enter
    it("submits the search when Enter is pressed in the search field (AC1)", async () => {
      saveExpense({ id: "1", userId: "local-user", amount: 5, date: "2026-01-01", category: "Food", notes: "Latte", createdAt: Date.now() });
      const user = userEvent.setup();
      render(<App />);
      await user.type(screen.getByLabelText(/search expenses/i), "latte{Enter}");
      await waitFor(() => expect(screen.getAllByRole("row")).toHaveLength(2));
    });
  - |
    // src/App.test.tsx — AC2
    it("shows a no-results state when the keyword matches nothing (AC2)", async () => {
      saveExpense({ id: "1", userId: "local-user", amount: 5, date: "2026-01-01", category: "Food", notes: "Latte", createdAt: Date.now() });
      const user = userEvent.setup();
      render(<App />);
      await user.type(screen.getByLabelText(/search expenses/i), "parking");
      await user.click(screen.getByRole("button", { name: /^search$/i }));
      await waitFor(() => {
        expect(screen.queryByRole("table")).not.toBeInTheDocument();
        expect(screen.getByText(/no expenses found for "parking"/i)).toBeInTheDocument();
      });
    });
  - |
    // src/App.test.tsx — AC2 recovery
    it("restores the full list after Clear search is clicked (AC2)", async () => {
      saveExpense({ id: "1", userId: "local-user", amount: 5, date: "2026-01-01", category: "Food", notes: "Latte", createdAt: Date.now() });
      const user = userEvent.setup();
      render(<App />);
      await user.type(screen.getByLabelText(/search expenses/i), "parking");
      await user.click(screen.getByRole("button", { name: /^search$/i }));
      await user.click(await screen.findByRole("button", { name: /clear search/i }));
      await waitFor(() => expect(screen.getAllByRole("row")).toHaveLength(2));
    });
  - |
    // src/App.test.tsx — pagination reset regression guard
    it("does not leave a blank page after searching from page 2 of a long list (AC1)", async () => {
      Array.from({ length: 12 }, (_, i) =>
        saveExpense({
          id: String(i), userId: "local-user", amount: 1, date: `2026-01-${String(i + 1).padStart(2, "0")}`,
          category: i === 5 ? "Bills" : "Food", notes: i === 5 ? "Electric bill" : "", createdAt: Date.now(),
        }),
      );
      const user = userEvent.setup();
      render(<App />);
      await user.click(screen.getByRole("button", { name: /next page/i }));
      await user.type(screen.getByLabelText(/search expenses/i), "electric");
      await user.click(screen.getByRole("button", { name: /^search$/i }));
      await waitFor(() => {
        expect(screen.getAllByRole("row")).toHaveLength(2);
        expect(screen.getByText("Electric bill")).toBeInTheDocument();
      });
    });
  - |
    // src/App.test.tsx — existing empty-state must still fire with zero expenses
    it("still shows the no-expenses-yet CTA (not the no-results state) when there are no expenses at all", () => {
      render(<App />);
      expect(screen.getByText(/no expenses recorded yet/i)).toBeInTheDocument();
      expect(screen.queryByText(/no expenses found for/i)).not.toBeInTheDocument();
    });

assumptions_or_open_questions:
  - |
    The prototype's loading-state (350ms simulated delay, skeleton rows) and error-state screens
    are not implemented, since this app's search is a synchronous, in-memory/localStorage
    operation with no network call to fail or be pending on — see the "Deliberate deviations"
    scope item above. If a future story introduces async/remote search, those states should be
    revisited against this same prototype.
  - |
    The "Try: coffee / groceries / transport / parking" hint chips from the prototype's
    interactive demo screen are treated as a prototype-only exploration aid, not a required UI
    element, and are not built.
  - |
    Inline match-highlighting (`mark.hit` around the matched substring in Category/Description)
    shown in the AC1 design screen is not implemented, since it is not stated by either AC and
    the prototype's own implementation technique (`innerHTML`) is unsafe to replicate against
    user-entered notes.
  - |
    No design-system CSS/tokens are imported into the app today (verified by reading
    src/main.tsx and the absence of any import of src/design-system/*.css elsewhere), and the
    existing ExpenseList/App markup is unstyled plain HTML. This plan therefore adds only
    unstyled markup for the new search elements, consistent with the rest of the app, rather
    than introducing the prototype's card/table/token styling as a one-off.
  - |
    Search matches only `category` and `notes`, per the prototype's `matches()` function; date
    and amount are not searched, since the AC and design both describe this as a "keyword"
    search over descriptive text.
  - |
    "Clear search" clears the input's visible value in addition to resetting the submitted term,
    matching the prototype's `clearSearch()`, even though this detail isn't explicit in the ACs.

package_dependencies: []

notes: |
  The design's fixture categories ("Coffee", "Groceries", "Transport", "Utilities",
  "Entertainment") are not members of this app's real `Category` union in
  `src/domain/categories.ts` (Food/Travel/Shopping/Bills/Healthcare/Others) — this mirrors a
  category mismatch already flagged for ET-STORY-023's design. All test fixtures in this plan use
  the real category values.

  ```mermaid
  flowchart TD
    App[App.tsx]
    List[ExpenseList.tsx]
    Search[searchExpenses.ts new]
    Repo[expenseRepository.ts loadExpenses]
    ListTest[ExpenseList.test.tsx]
    AppTest[App.test.tsx]
    SearchTest[searchExpenses.test.ts new]

    Repo -->|"loadExpenses() populates App state"| App
    App -->|"submittedTerm drives filtering"| Search
    Search -->|"visibleExpenses"| App
    App -->|"expenses, searchTerm, onClearSearch props"| List
    AppTest -->|"exercises AC1/AC2 end to end"| App
    ListTest -->|"exercises no-results state prop contract"| List
    SearchTest -->|"unit tests matching rule"| Search

    classDef touched fill:#f96,color:#000
    class App,List,Search,AppTest,ListTest,SearchTest touched
  ```
