summary: |
  ET-STORY-025 asks us to lock in the existing wiring between `AddExpenseForm` and
  `ExpenseList` in `src/App.tsx` with explicit integration test coverage, and fix any gaps
  found. Reading the code shows the wiring is already implemented: `onSaved` calls
  `setExpenses(loadExpenses())` (src/App.tsx:15) and the empty-state CTA focuses the form's
  first input (src/App.tsx:19). `src/App.test.tsx` already has integration tests for AC1
  (new expense appears without reload) and AC2 (empty-state focus handoff), and
  `src/components/AddExpenseForm.test.tsx` already covers AC6 (validation error message
  shown) and AC7 (form resets after a successful save) at the component level. The two real
  gaps are AC3 (two consecutive submissions both stay visible) and the *integration-level*
  half of AC5 (an invalid submission leaves the rendered list itself unchanged, not just
  that `saveExpense` wasn't called) — neither is asserted anywhere today. This plan adds
  those two tests to `src/App.test.tsx`, confirms the underlying code already satisfies
  them, and stops there. No visual/UI restyling is included — see the design note below.
scope:
  - description: |
      Add a failing-first integration test asserting AC3: submitting the `AddExpenseForm`
      twice in a row, one after another, leaves both newly added expenses visible in the
      `ExpenseList` table without a page reload.

      ```tsx
      it("keeps both expenses visible after two consecutive submissions (AC3)", async () => {
        const user = userEvent.setup();
        render(<App />);

        await user.type(screen.getByLabelText(/amount/i), "10");
        await user.type(screen.getByLabelText(/date/i), "2026-03-01");
        await user.selectOptions(screen.getByLabelText(/category/i), "Food");
        await user.click(screen.getByRole("button", { name: /add expense/i }));

        await waitFor(() => expect(screen.getAllByRole("row")).toHaveLength(2));

        await user.type(screen.getByLabelText(/amount/i), "20");
        await user.type(screen.getByLabelText(/date/i), "2026-03-02");
        await user.selectOptions(screen.getByLabelText(/category/i), "Travel");
        await user.click(screen.getByRole("button", { name: /add expense/i }));

        await waitFor(() => {
          const rows = screen.getAllByRole("row");
          expect(rows).toHaveLength(3);
          expect(rows[1]).toHaveTextContent("Travel");
          expect(rows[2]).toHaveTextContent("Food");
        });
      });
      ```

      Row order asserted here (newest submission on top) matches `saveExpense` in
      src/domain/expenseRepository.ts:23-27, which prepends new records, and `loadExpenses`
      (src/domain/expenseRepository.ts:17-21), which sorts by `date` descending — both dates
      used in the test keep this ordering unambiguous.
    files:
      - src/App.test.tsx
    rationale: |
      AC3 is not exercised by any existing test. `App.test.tsx` already has an AC1 test for
      a single addition; this extends the same pattern to a second, immediately-following
      submission to prove the wiring holds up across repeated use, per AC3 and AC4
      (an automated integration test must exist for this wiring).
  - description: |
      Add a failing-first integration test asserting the App-level half of AC5: submitting
      the `AddExpenseForm` with invalid data (all fields blank) against a list that already
      has an expense leaves the rendered `ExpenseList` unchanged (same row count, no new
      row) and shows a validation error.

      ```tsx
      it("leaves the expense list unchanged when an invalid submission is rejected (AC5, AC6)", async () => {
        saveExpense({
          id: "existing",
          userId: "local-user",
          amount: 5,
          date: "2026-01-01",
          category: "Bills",
          createdAt: Date.now(),
        });

        const user = userEvent.setup();
        render(<App />);

        await user.click(screen.getByRole("button", { name: /add expense/i }));

        expect(await screen.findAllByRole("alert")).not.toHaveLength(0);
        expect(screen.getAllByRole("row")).toHaveLength(2);
      });
      ```
    files:
      - src/App.test.tsx
    rationale: |
      `AddExpenseForm.test.tsx` already proves `saveExpense` is not called and the form
      shows inline errors on invalid input (AC6), but no test proves the *rendered list*
      stays put at the `App` integration level, which is what AC5 actually states. This
      closes that gap without duplicating the component-level validation-message tests.
  - description: |
      Run the full test suite after adding the two tests above. Given `onSaved` only fires
      on a successful save (src/components/AddExpenseForm.tsx:34-62) and `setExpenses` is
      never called on the invalid path, both new tests are expected to pass against the
      current code with no production changes. If either fails, make the minimal fix in
      `src/App.tsx` or `src/components/AddExpenseForm.tsx` needed to satisfy it — do not
      add scope beyond what the failing assertion requires (e.g. no Edit/Delete, no
      restyling).
    files:
      - src/App.tsx
      - src/components/AddExpenseForm.tsx
    rationale: |
      Confirms the "fix any gaps found" clause in the story description is satisfied
      without speculative changes. This step is expected to be a no-op based on reading the
      current implementation, but is listed as scope in case the new tests surface a real
      defect.
tests:
  - |
    `App.test.tsx`: "keeps both expenses visible after two consecutive submissions (AC3)" —
    `expect(screen.getAllByRole("row")).toHaveLength(3)` after two sequential submits (1
    header + 2 data rows), with `rows[1]` and `rows[2]` matching the second and first
    submitted categories respectively.
  - |
    `App.test.tsx`: "shows a newly submitted expense at the top of the list without a
    reload (AC1)" already exists and passes — re-verified as part of this plan, not
    rewritten.
  - |
    `App.test.tsx`: "focuses the add-expense form when the empty-state call-to-action is
    clicked (AC5)" [existing test's own label, covers story AC2] already exists and
    passes — re-verified, not rewritten.
  - |
    `App.test.tsx`: new test "leaves the expense list unchanged when an invalid submission
    is rejected (AC5, AC6)" —
    `expect(await screen.findAllByRole("alert")).not.toHaveLength(0)` and
    `expect(screen.getAllByRole("row")).toHaveLength(2)` (header + the one pre-existing
    expense only).
  - |
    `AddExpenseForm.test.tsx`: "shows inline errors for amount, date, and category when
    blank (AC2)" already exists and passes — satisfies story AC6 (validation error
    message displayed), re-verified, not rewritten.
  - |
    `AddExpenseForm.test.tsx`: "resets the form to empty state after a successful save
    (AC6)" already exists and passes — satisfies story AC7 (form fields reset after
    success), re-verified, not rewritten.
  - |
    The two new `App.test.tsx` cases above, taken together with the four pre-existing
    integration/component tests re-verified in this plan, are the automated integration
    test coverage required by story AC4.
assumptions_or_open_questions:
  - |
    Design conflict: the approved prototype
    (.arc/designs/ET-STORY-025-design.html) shows a fully restyled experience —
    design-system CSS classes (`.card`, `.expense-form`, `.field`, `.input`,
    `.expense-table`, `.btn-primary`/`.btn-secondary`), a `list-meta` expense count, a
    submit button that shows "Adding…" and disables itself for ~300ms, and a `row-new`
    highlight animation on the just-added row — none of which exist in the current
    `App.tsx` / `AddExpenseForm.tsx` / `ExpenseList.tsx` (plain unstyled semantic HTML) and
    none of which are implied by any of this story's 7 acceptance criteria. The story
    description also scopes this item to "confirm/lock in this wiring with explicit test
    coverage... fix any gaps found," not visual work. I am treating the restyling,
    loading-state, and animation shown in the prototype as OUT OF SCOPE for this plan and
    likely belonging to a sibling story (e.g. the list/form UI story tracked as
    ET-STORY-023 per prior session's plan) — flagging this explicitly rather than silently
    adding or skipping the visual work.
  - |
    Assumed "without a page reload" (AC1, AC3, AC4) is adequately proven by asserting on
    the React Testing Library render tree after `userEvent` interactions in the same
    render — jsdom-based tests never reload the page, so there is no separate reload-guard
    assertion to write; the existing and new tests demonstrate state persists across
    renders within one `render(<App />)` call, which is the practical meaning of the AC.
  - |
    Assumed the two new tests belong in `src/App.test.tsx` (integration level) rather than
    `ExpenseList.test.tsx` or `AddExpenseForm.test.tsx`, since AC3 and the list-unchanged
    half of AC5 are specifically about the wiring between the two components, which only
    `App.tsx` owns.
package_dependencies: []
notes: |
  No new files, no new dependencies, and (expected) no production code changes — this is a
  test-hardening pass confirming already-implemented wiring, per the story's explicit
  framing ("This appears largely implemented already... confirm/lock in this wiring").
  Skipping the flowchart: this plan touches one test file (two new `it` blocks) plus a
  contingent no-op review of two already-read source files, well under the bar where a
  diagram would add anything.
