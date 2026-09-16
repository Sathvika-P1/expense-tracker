summary: |
  ET-STORY-019 asks for pagination of the expense list. Reading `src/components/ExpenseList.tsx`
  shows AC1 and AC2 are already implemented: the component slices `expenses` into fixed-size
  pages (`PAGE_SIZE = 10`, `ExpenseList.tsx:9-26`) and renders Prev/Next controls
  (`ExpenseList.tsx:51-73`) that update client-side state with no reload, already covered by
  passing tests (`ExpenseList.test.tsx:71`, `:80`, `:93`). The real gap is AC3/AC4: no filtering
  concept exists anywhere in the codebase yet (filtering is a sibling story in the same
  "Filtering & Search" epic), so `ExpenseList` cannot currently know a filtered result set is
  smaller than the total, and critically the `page` state is never reset when `expenses` shrinks
  — navigating to page 3 and then having the array narrow to 8 records leaves `page` pointing
  past the end, producing a blank table and disabled-looking nav. This plan adds a minimal,
  optional `filterKey` prop seam (mirroring the `currentUser.ts` stub precedent from the prior
  ET-STORY-009 plan) so pagination becomes filter-aware and testable today, fixes the page-reset
  defect (the one genuinely failing test), and adds a missed characterization test for the
  Previous button. It does not build any date/category/keyword filtering UI — that is out of
  scope for this story.

scope:
  - description: |
      Add an optional `filterKey` prop to `ExpenseListProps` that the (future) filter UI will
      change whenever the active filter set changes. Reset `page` to `0` whenever `filterKey`
      changes, using an effect keyed on `filterKey` rather than on the `expenses` array
      reference (since `App.tsx:15` constructs a fresh array on every add, so watching the
      array reference would incorrectly bounce the user back to page 1 after simply adding a
      new expense — a behavior no AC requests).

      Before:
      ```ts
      interface ExpenseListProps {
        expenses: Expense[];
        onAddExpenseClick: () => void;
      }
      export function ExpenseList({ expenses, onAddExpenseClick }: ExpenseListProps) {
        const [page, setPage] = useState(0);
        ...
      }
      ```
      After:
      ```ts
      interface ExpenseListProps {
        expenses: Expense[];
        onAddExpenseClick: () => void;
        filterKey?: string;
      }
      export function ExpenseList({ expenses, onAddExpenseClick, filterKey }: ExpenseListProps) {
        const [page, setPage] = useState(0);

        useEffect(() => {
          setPage(0);
        }, [filterKey]);
        ...
      }
      ```
    files:
      - src/components/ExpenseList.tsx
    rationale: |
      `filterKey` is optional with no default filtering behavior, so `App.tsx:17` (which does not
      pass it) needs no change and existing callers are unaffected. This is the smallest seam
      that lets a future filter story satisfy AC3 (pass a key derived from the active filters)
      and lets this story satisfy AC4 (reset page on filter change) without this plan owning any
      actual filter logic — the same pattern as the `getCurrentUserId()` stub introduced in
      `.arc/plans/run_d6a2c482098d/plan.md` to unblock a dependent AC without building the real
      subsystem early.

tests:
  - |
    AC1 (guard/characterization, already passing) - pagination divides records and shows
    controls. Existing tests already cover this and require no change:
    `src/components/ExpenseList.test.tsx:71` ("shows only the first page...") and `:80` ("shows
    page navigation controls when there is more than one page"). Cited here so the plan doesn't
    re-invent work for an AC that's already satisfied by `ExpenseList.tsx:9-26,51-73`.
  - |
    AC2 (mostly passing; adds one missing case) - navigating to a different page shows the
    correct subset without a full reload. `ExpenseList.test.tsx:93` already covers the Next
    button; the Previous button (`ExpenseList.tsx:53-60`) has no test. New failing test to add:
    ```ts
    it("shows the first page again after navigating back with Previous", async () => {
      const many = Array.from({ length: 12 }, (_, i) =>
        makeExpense({ id: String(i), notes: `note-${i}` }),
      );
      render(<ExpenseList expenses={many} onAddExpenseClick={vi.fn()} />);

      await userEvent.click(screen.getByRole("button", { name: /next page/i }));
      await userEvent.click(screen.getByRole("button", { name: /previous page/i }));

      expect(screen.getByText("note-0")).toBeInTheDocument();
      expect(screen.queryByText("note-11")).not.toBeInTheDocument();
    });
    ```
    No production code change needed for this one; it documents/guards existing behavior at
    `ExpenseList.tsx:56`.
  - |
    AC3 - pagination reflects the filtered count, not the total. New failing test (fails today
    only in the sense that `filterKey` doesn't exist yet — this is the contract test for the new
    prop, not a behavior regression):
    ```ts
    it("shows pagination based on the currently rendered (filtered) result set", () => {
      const filtered = Array.from({ length: 12 }, (_, i) => makeExpense({ id: String(i) }));
      render(
        <ExpenseList expenses={filtered} onAddExpenseClick={vi.fn()} filterKey="category:Food" />,
      );

      expect(
        screen.getByRole("navigation", { name: /pagination/i }),
      ).toHaveTextContent("Page 1 of 2");
    });
    ```
    Minimal code: no change beyond the `filterKey` prop addition — `totalPages` is already derived
    from `expenses.length`, so as long as the caller passes the already-filtered array (which any
    future filter story will do upstream), this passes once `filterKey` is a valid prop.
  - |
    AC4 - changing a filter while on a later page resets to page 1. This is the one test that
    fails against current behavior (`page` state is never reset when `expenses` narrows):
    ```ts
    it("resets to the first page when the filter changes while on a later page", async () => {
      const wide = Array.from({ length: 25 }, (_, i) => makeExpense({ id: String(i) }));
      const { rerender } = render(
        <ExpenseList expenses={wide} onAddExpenseClick={vi.fn()} filterKey="all" />,
      );

      await userEvent.click(screen.getByRole("button", { name: /next page/i }));
      expect(
        screen.getByRole("navigation", { name: /pagination/i }),
      ).toHaveTextContent("Page 2 of 3");

      const narrow = Array.from({ length: 12 }, (_, i) => makeExpense({ id: String(i) }));
      rerender(
        <ExpenseList expenses={narrow} onAddExpenseClick={vi.fn()} filterKey="category:Food" />,
      );

      expect(
        screen.getByRole("navigation", { name: /pagination/i }),
      ).toHaveTextContent("Page 1 of 2");
    });
    ```
    Minimal code: `useEffect(() => setPage(0), [filterKey])` in `ExpenseList.tsx`, as shown in
    `scope` above.

assumptions_or_open_questions:
  - |
    No filtering (date range, category, keyword) exists anywhere in the codebase yet — it's a
    sibling story in the "Filtering & Search" epic. `filterKey` is therefore a stub contract
    (an arbitrary string the caller changes when its filters change) rather than a real
    integration; the reviewer should confirm this shape matches whatever the filtering story
    ultimately lands on, or whether it should be a `dependencies: unknown[]`-style array instead
    of a single string key.
  - |
    I did not add page-range clamping (e.g. auto-selecting the last valid page instead of page 1
    when the array shrinks) since AC4 explicitly asks for a reset to page 1, not to the nearest
    valid page — flagging this only in case product intent differs from the literal AC wording.
  - |
    AC1 and AC2 are treated as already satisfied by existing code/tests rather than re-planned;
    only the missing Previous-button test and the AC3/AC4 gap are new work.

package_dependencies: []

notes: |
  Purely additive change confined to `src/components/ExpenseList.tsx` and its test file — no
  new files, no layer crossing (no route/store boundary involved), so no mermaid diagram is
  included per the plan-format guidance for small, single-file changes.
