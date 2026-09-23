summary: |
  Add keyword search over expense notes. A pure, unit-tested domain function
  `filterExpensesByKeyword` does the partial, case-insensitive matching against
  `Expense.notes`. `ExpenseList` (which already owns pagination state internally,
  mirroring this story's need for filter state) gains a labeled search input,
  filters the `expenses` prop it receives through that domain function, resets
  pagination to page 1 whenever the keyword changes, and renders a distinct
  "no matches" empty state (separate from the existing "no expenses recorded
  yet" empty state) when a keyword is active but nothing matches. No changes to
  `App.tsx` or `expenseRepository.ts` are needed since filtering only narrows
  what's already loaded into memory.

scope:
  - description: |
      Add a pure domain function that performs partial, case-insensitive
      matching of a keyword against each expense's `notes` field.

      Signature:
      ```ts
      export function filterExpensesByKeyword(expenses: Expense[], keyword: string): Expense[]
      ```
      Empty/whitespace keyword returns `expenses` unchanged. Expenses with no
      `notes` are treated as non-matching for any non-empty keyword.
    files:
      - src/domain/searchExpenses.ts
      - src/domain/searchExpenses.test.ts
    rationale: |
      Keeps the matching rule (AC1) as an isolated, directly testable unit,
      consistent with how `validateExpense.ts` is split out from the form
      component in this codebase.

  - description: |
      Add a labeled search text input to `ExpenseList`, hold the typed keyword
      in local state (alongside the existing `page` state), derive the visible
      rows via `filterExpensesByKeyword(expenses, keyword)`, and reset `page`
      to `0` whenever the keyword changes so a stale page number from before
      filtering can't hide matching rows on page 1.

      New internal state: `const [keyword, setKeyword] = useState("");`
      Filtering point: `const filtered = filterExpensesByKeyword(expenses, keyword);`
      then all existing pagination math (`totalPages`, `pageItems`) operates on
      `filtered` instead of `expenses`.
    files:
      - src/components/ExpenseList.tsx
    rationale: |
      `ExpenseList` already owns UI state (`page`) independently of `App`, so
      keyword state belongs at the same level rather than lifting it into
      `App` and threading a new prop through — avoids widening `ExpenseListProps`
      for a UI-local concern.

  - description: |
      Distinguish two empty states in `ExpenseList`: the existing "no expenses
      recorded yet" (shown when `expenses.length === 0`, i.e. no data at all,
      keeping its "Add an expense" CTA) versus a new "no expenses match your
      search" message (shown when `expenses.length > 0` but `filtered.length === 0`
      because of an active keyword). The CTA button is not shown in the
      no-matches case since adding an expense doesn't address a search with no
      results.
    files:
      - src/components/ExpenseList.tsx
    rationale: |
      AC3 requires a message "in place of the list" specifically for the
      no-match-on-search case, which must not be conflated with the
      always-empty-list case that already has its own CTA-bearing message and
      tests (`ExpenseList.test.tsx:54-59`).

  - description: |
      Extend `ExpenseList.test.tsx` with tests covering keyword filtering,
      clearing the field, and the no-match empty state.
    files:
      - src/components/ExpenseList.test.tsx
    rationale: |
      Confirms the search input is wired to the domain filter correctly at
      the component level, matching this file's existing style of testing
      pagination end-to-end rather than mocking internals.

tests:
  - |
    In `src/domain/searchExpenses.test.ts` (new file), first failing test:
    ```ts
    it("returns only expenses whose notes contain the keyword, case-insensitively", () => {
      const lunch = makeExpense({ id: "1", notes: "Lunch with team" });
      const taxi = makeExpense({ id: "2", notes: "Taxi home" });
      expect(filterExpensesByKeyword([lunch, taxi], "LUNCH")).toEqual([lunch]);
    });
    ```
    Minimal code to pass: implement `filterExpensesByKeyword` in
    `src/domain/searchExpenses.ts` using
    `expenses.filter(e => (e.notes ?? "").toLowerCase().includes(keyword.toLowerCase()))`.
    Also add a same-file test for an empty keyword returning the input array
    unchanged, and one for an expense with `notes: undefined` not matching a
    non-empty keyword (guards the `??` fallback).
  - |
    In `src/components/ExpenseList.test.tsx`, failing test for AC1:
    ```ts
    it("shows only expenses whose notes match the typed keyword", async () => {
      render(
        <ExpenseList
          expenses={[
            makeExpense({ id: "1", notes: "Lunch with team" }),
            makeExpense({ id: "2", notes: "Taxi home" }),
          ]}
          onAddExpenseClick={vi.fn()}
        />,
      );
      await userEvent.type(screen.getByRole("textbox", { name: /search/i }), "lunch");
      expect(screen.getByText("Lunch with team")).toBeInTheDocument();
      expect(screen.queryByText("Taxi home")).not.toBeInTheDocument();
    });
    ```
    Minimal code to pass: add a labeled `<input type="text" aria-label="Search expenses by keyword" ... />`
    to `ExpenseList`, wire its `onChange` to `setKeyword`, and render
    `filtered`/`pageItems` derived from `filterExpensesByKeyword`.
  - |
    In `src/components/ExpenseList.test.tsx`, failing test for AC2:
    ```ts
    it("restores the full list when the search field is cleared", async () => {
      render(
        <ExpenseList
          expenses={[
            makeExpense({ id: "1", notes: "Lunch with team" }),
            makeExpense({ id: "2", notes: "Taxi home" }),
          ]}
          onAddExpenseClick={vi.fn()}
        />,
      );
      const input = screen.getByRole("textbox", { name: /search/i });
      await userEvent.type(input, "lunch");
      await userEvent.clear(input);
      expect(screen.getByText("Lunch with team")).toBeInTheDocument();
      expect(screen.getByText("Taxi home")).toBeInTheDocument();
    });
    ```
    Minimal code to pass: no special-casing needed beyond the AC1 wiring —
    an empty `keyword` must make `filterExpensesByKeyword` return the full
    array (already covered by the domain-level empty-keyword test above).
  - |
    In `src/components/ExpenseList.test.tsx`, failing test for AC3:
    ```ts
    it("shows a no-matches empty state instead of the table when the keyword matches nothing", async () => {
      render(
        <ExpenseList
          expenses={[makeExpense({ id: "1", notes: "Lunch with team" })]}
          onAddExpenseClick={vi.fn()}
        />,
      );
      await userEvent.type(screen.getByRole("textbox", { name: /search/i }), "zzz-no-match");
      expect(screen.queryByRole("table")).not.toBeInTheDocument();
      expect(screen.getByText(/no expenses match your search/i)).toBeInTheDocument();
    });
    ```
    Also add a guard test that the original "no expenses recorded yet." message
    (with its CTA) is unaffected when `expenses` is `[]` and no keyword is
    typed, to lock in the distinction between the two empty states:
    ```ts
    it("still shows the original empty-state CTA when there are no expenses at all", () => {
      render(<ExpenseList expenses={[]} onAddExpenseClick={vi.fn()} />);
      expect(screen.getByText(/no expenses recorded yet/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /add.*expense/i })).toBeInTheDocument();
    });
    ```
    Minimal code to pass: in `ExpenseList`, branch on
    `expenses.length === 0` (original CTA message, input not shown) vs.
    `expenses.length > 0 && filtered.length === 0` (new "No expenses match
    your search." message, no CTA, search input still shown so the user can
    edit/clear it) vs. the normal table render.

assumptions_or_open_questions:
  - "The search input lives inside ExpenseList as local UI state rather than being lifted into App.tsx; nothing in the story requires the keyword to be visible/controlled outside the list, and this avoids widening ExpenseListProps."
  - "When there are zero expenses at all (expenses.length === 0), the search input is not rendered and the original 'no expenses recorded yet' + CTA message takes precedence over any search UI, since there is nothing to search yet."
  - "Matching is restricted to the notes field only, per the AC wording ('matched against expense notes'); category, date, and amount are out of scope for this story (they belong to the sibling date-range/category filter stories under the same epic)."
  - "Typing a keyword resets pagination to page 1; this isn't stated in the ACs but is necessary to avoid a confusing blank page 2+ after filtering shrinks the result set."
  - "No debounce/throttle on the search input — filtering runs on every keystroke, consistent with the small, client-side, in-memory expense list this app currently supports."

package_dependencies: []

notes: |
  Existing test-double `makeExpense` helper (already defined at the top of
  `ExpenseList.test.tsx`) is reused as-is for the new tests — no new fixtures
  needed.

  Since this plan touches two files across the domain/component boundary,
  here is the shape of the call path:

  ```mermaid
  flowchart TD
    classDef touched fill:#f96,color:#000
    App["App.tsx (unchanged)\npasses full expenses[] as before"] --> EL
    EL["ExpenseList.tsx\n+ keyword state\n+ search input\n+ filtered empty state"]:::touched
    EL -->|"calls filterExpensesByKeyword(expenses, keyword)"| SE["searchExpenses.ts\nfilterExpensesByKeyword()"]:::touched
    SE -->|"reads .notes"| EXP["expense.ts\nExpense type (unchanged)"]
  ```

  `App.tsx` and `expenseRepository.ts` need no changes: they continue to load
  and pass the full, unfiltered list into `ExpenseList`, which now narrows it
  for display only.
