summary: |
  Restyle and refit the already-implemented expense add/list flow (from ET-STORY-004 and
  ET-STORY-009) to match the approved prototype at
  `.arc/designs/ET-STORY-023-design.html`, and close the remaining acceptance-criteria gaps
  (custom category listbox, server-error banner, split list/add views). Most of the underlying
  behavior (validation, localStorage persistence, date-descending sort) already exists and is
  tested; this plan's job is to (a) switch `App` from a single combined page to two views
  (list, add-form) matching the design's screen navigation, (b) replace the `<select>` category
  control with the design's custom listbox (`role="listbox"`/`role="option"`), (c) replace the
  `<table>` expense list with the design's card/`.expense-row` layout, (d) add the design's
  success/error toast banners, and (e) update every existing test whose assertions encode the
  old table/select/single-page shape so the suite matches the new UI rather than being deleted
  or weakened.

scope:
  - description: |
      Split `App.tsx` into two views driven by local state instead of rendering the form and
      list simultaneously, matching the design's separate "List — Populated" and "Add Form —
      Pristine" screens (design lines 360-371, 379-413) where Cancel/Back navigate back to the
      list and both CTAs ("+ Add an expense" on empty, "+ Add expense" on populated) navigate
      to the form.

      No router exists in this repo (no react-router in `src`), so use plain view-state:
      `const [view, setView] = useState<'list' | 'add'>('list')`. Pass `onAddExpenseClick={() =>
      setView('add')}` to `ExpenseList`, and `onSaved`/`onCancel={() => setView('list')}` to
      `AddExpenseForm`. Also show the success toast ("Expense added", design lines 605-608,
      `role="status"`) briefly on returning to the list after a save — implemented as transient
      state in `App`, not a new dependency.
    files:
      - src/App.tsx
      - src/App.test.tsx
    rationale: |
      The design has add-expense as its own screen reachable only via a CTA/back-link (design
      lines 383, 409, 347, 368), not inlined above the list. AC8 ("CTA button linking to the
      add-expense form") matches a real navigation, not a same-page focus jump. This breaks two
      existing tests that assume the single-page layout:
      `App.test.tsx:52-59` ("focuses the add-expense form when the empty-state CTA is clicked")
      must become an assertion that the add-form view is shown, e.g.
      `expect(screen.getByRole("heading", { name: /add expense/i })).toBeInTheDocument()`.
      `App.test.tsx:27-50` ("shows a newly submitted expense... without a reload") must first
      switch to the add view before filling the form, e.g. click the populated list's
      "+ Add expense" button, then assert the list view (not the form) shows the new row after
      save.

  - description: |
      Replace the native `<select>` category control in `AddExpenseForm.tsx` with the design's
      custom listbox: a `<button role="combobox" aria-haspopup="listbox" aria-expanded>` trigger
      (mirroring `.select-trigger` at design lines 397-401, 439-442) that toggles a
      `<ul role="listbox" aria-label="Category options">` of `<li role="option">` items (design
      lines 443-451), one per entry in the existing `CATEGORIES` domain list. Selecting an option
      sets `form.category` and closes the listbox.
    files:
      - src/components/AddExpenseForm.tsx
      - src/components/AddExpenseForm.test.tsx
      - src/App.test.tsx
    rationale: |
      Design line 377 explicitly states the category control is "a custom listbox trigger, not
      a native `<select>` (design system provides no select styling)" — this is a deliberate,
      approved design choice, not an oversight, so AC5's "fixed list of category options is
      displayed" must be satisfied by opening this listbox. This invalidates every
      `user.selectOptions(screen.getByLabelText(/category/i), "Food")` call
      (`AddExpenseForm.test.tsx:15, 42, 81, 125`, `App.test.tsx:42`) and the
      `toHaveValue("")` reset assertion at `AddExpenseForm.test.tsx:115`. Replace with:

      ```ts
      await user.click(screen.getByRole("button", { name: /category/i }));
      await user.click(screen.getByRole("option", { name: "Food" }));
      ```

      and replace the reset assertion with checking the trigger's displayed text returns to
      "Select a category":

      ```ts
      expect(screen.getByRole("button", { name: /category/i })).toHaveTextContent(/select a category/i);
      ```

  - description: |
      Replace the `<table>`-based expense list in `ExpenseList.tsx` with the design's card of
      `.expense-row` divs (design lines 231-251, 360-371): each row shows category, formatted
      date, optional description, and right-aligned tabular-numeric amount, inside a single
      `.card` wrapping all rows, with the "N expenses" subtitle (design line 363) and the
      existing pagination controls kept underneath (pagination has no equivalent in the design,
      which shows one unpaginated card — see assumptions) but restyled to fit.
    files:
      - src/components/ExpenseList.tsx
      - src/components/ExpenseList.test.tsx
      - src/App.test.tsx
    rationale: |
      This breaks every row/table-role assertion: `ExpenseList.test.tsx:26-28` (`getAllByRole("row")`
      indexing), `:47` (`getAllByRole("row")[1]`), `:57` (`queryByRole("table")`), `:77`
      (`toHaveLength(11)` — includes a header row that no longer exists once there is no table,
      so this becomes `toHaveLength(10)` for 10 data rows), `:108-112` (`getByRole("table", {name:
      /expenses/i})` and four `columnheader` checks, which have no card equivalent and must be
      deleted), and `App.test.tsx:24, 46-48`. Replace row lookups with a stable per-row test
      hook, e.g. render each row as `<div role="listitem">` inside a `<ul aria-label="Expenses">`
      (semantically closer to the design's row list than a table, while still giving tests a
      reliable role query):

      ```ts
      const rows = screen.getAllByRole("listitem");
      expect(rows[0]).toHaveTextContent("Travel");
      ```

      Also switch date rendering to the design's formatted string (design lines 637-641,
      `toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })`) instead
      of the raw ISO string currently rendered at `ExpenseList.tsx:43`; no AC dictates a date
      format, this adopts the design's. This changes the assertion at
      `ExpenseList.test.tsx:48` from `toHaveTextContent("2026-01-01")` to
      `toHaveTextContent("Jan 1, 2026")`. Also prefix amounts with `$` (design line 634) to match
      AC10's "fixed currency" — this does not break the existing `toHaveTextContent("12.50")`
      substring assertion at `ExpenseList.test.tsx:49`, so no change needed there.

  - description: |
      Rename the visible form label/placeholder from "Notes" to "Description (optional)" to
      match the design (design line 404: `Description <span>(optional)</span>`) and AC11's
      wording, while keeping the underlying domain field named `notes` on `Expense`/`ExpenseInput`
      (`domain/expense.ts:9,17`) unchanged.
    files:
      - src/components/AddExpenseForm.tsx
      - src/components/AddExpenseForm.test.tsx
      - src/App.test.tsx
    rationale: |
      Renaming the domain field itself would churn already-tested repository/persistence code
      (`expenseRepository.test.ts`) and any expense already saved to a user's localStorage under
      the old key shape, for a change that is purely cosmetic per the design (the design's field
      is optional free text shown alongside the row exactly like `notes` already is — AC11 only
      requires "description text is shown", which the existing `notes` field already satisfies
      functionally). Only the label text changes, so update every
      `screen.getByLabelText(/notes/i)` call to `screen.getByLabelText(/description/i)`
      (`AddExpenseForm.test.tsx:94, 108, 116, 137, 166`, and any in `App.test.tsx`).

  - description: |
      Add a server-error banner and a submitting/disabled-button state to `AddExpenseForm.tsx`,
      matching the design's "Add Form — Submitting" (disabled inputs, button reads "Saving…",
      design lines 518-548) and "Add Form — Server Error" (`role="alert"` toast-banner reading
      "Couldn't save the expense" with retained form values, design lines 550-594) screens.
      The existing catch-block already sets a plain-text error and preserves form state
      (`AddExpenseForm.tsx:53-56`); wrap that message in the banner markup instead of a bare
      `<p>`.
    files:
      - src/components/AddExpenseForm.tsx
      - src/components/AddExpenseForm.test.tsx
    rationale: |
      AC6 requires "a banner or toast error message" specifically, not just any inline text.
      The existing test at `AddExpenseForm.test.tsx:144-158` ("shows an error and does not reset
      the form when saving fails") already exercises this path and just needs its assertion
      widened to also check banner semantics:

      ```ts
      expect(await screen.findByRole("alert")).toHaveTextContent(/could not save/i);
      ```

      The submitting/disabled-button state (design lines 542-546) has no AC of its own but is
      cheap and already implied by the existing synchronous save path; note it as design-driven
      scope, not AC-driven, per instructions to flag rather than silently drop cheap
      design-only elements.

tests:
  - |
    AC1 (existing behavior, retargeted): after switching `App` to two views, submitting a valid
    expense from the add view returns to the list view showing the new row —
    `expect(await screen.findByRole("listitem")).toHaveTextContent("Travel")` following the
    click-through-to-add-view flow described in the first scope item.
  - |
    AC2 (existing, retargeted for card rows): `ExpenseList.test.tsx` — "displays date, amount,
    category, and description for each expense" — assert
    `expect(screen.getAllByRole("listitem")[0]).toHaveTextContent("Food")` and similarly for date
    (formatted), amount, and notes text, replacing the current table-cell assertions.
  - |
    AC3 (existing, unaffected by view/markup changes): `AddExpenseForm.test.tsx` — "shows inline
    errors for amount, date, and category when blank" already asserts
    `screen.getByText(/amount is required/i)` etc.; keep as-is, since inline field errors are
    independent of the category-listbox swap.
  - |
    AC4 (existing, retargeted for listbox): a new/adjusted test — "creates the expense
    successfully with amount, date, and category filled and no description" — fill amount/date,
    then `await user.click(screen.getByRole("button", { name: /category/i })); await
    user.click(screen.getByRole("option", { name: "Food" }));`, submit, and assert
    `expect(expenseRepository.loadExpenses()).toHaveLength(1)` with `notes` undefined/empty.
  - |
    AC5 (new): "opening the category field shows the fixed list of category options" —
    `await user.click(screen.getByRole("button", { name: /category/i }));` then
    `expect(screen.getAllByRole("option")).toHaveLength(CATEGORIES.length);` and
    `expect(screen.getByRole("option", { name: "Food" })).toBeInTheDocument();`.
  - |
    AC6 (existing, widened assertion): `AddExpenseForm.test.tsx:144-158` updated to assert
    `expect(await screen.findByRole("alert")).toHaveTextContent(/could not save/i)` instead of a
    bare text match, confirming the banner semantics rather than just visible text.
  - |
    AC7 (existing, unaffected): `ExpenseList.test.tsx` — "shows an empty-state message and no
    table when there are no expenses" — updated to assert
    `expect(screen.queryByRole("list")).not.toBeInTheDocument()` (or equivalent list-container
    query) instead of `queryByRole("table")`, plus the existing
    `screen.getByText(/no expenses recorded yet/i)` assertion kept.
  - |
    AC8 (existing, unaffected): `ExpenseList.test.tsx` — "shows a call-to-action to add a new
    expense when the list is empty" — `fireEvent.click(cta); expect(onAddExpenseClick).toHaveBeenCalled();`
    stays valid since `onAddExpenseClick` is still a prop callback, now wired to `setView('add')`
    in `App` rather than a focus call.
  - |
    AC9 (existing, no duplicate sort logic added): `expenseRepository.test.ts:69-74` already
    covers "orders expenses by date descending regardless of save order" via
    `expect(loadExpenses("u").map((e) => e.id)).toEqual(["new", "old"])`; `ExpenseList` stays
    presentation-only and must not re-sort, so add one guard test asserting `ExpenseList` renders
    whatever order it's given (already covered by `ExpenseList.test.tsx:18-29` "renders expenses
    in the given order").
  - |
    AC10 (new/retargeted): `ExpenseList.test.tsx` — assert
    `expect(screen.getAllByRole("listitem")[0]).toHaveTextContent("$12.50")` for an expense of
    amount `12.5`, confirming both the `$` prefix and two-decimal formatting from the design.
  - |
    AC11 (existing, retargeted for label rename): `ExpenseList.test.tsx:31-35` — "displays notes
    with the expense when present" stays `expect(screen.getByText("Lunch with team")).toBeInTheDocument()`
    unchanged (this is list-display, not the form label), but the corresponding `AddExpenseForm`
    save-path tests move from `screen.getByLabelText(/notes/i)` to `screen.getByLabelText(/description/i)`.

assumptions_or_open_questions:
  - |
    Category values conflict: `domain/categories.ts` defines `Food, Travel, Shopping, Bills,
    Healthcare, Others`, but the design's fixed listbox (design lines 444-450) lists `Food,
    Transport, Housing, Utilities, Health, Entertainment, Other`. No AC names specific category
    values (AC5 only requires "a fixed list of category options"), so this plan keeps the
    existing domain `CATEGORIES` list and renders it inside the design's listbox markup, rather
    than adopting the design's specific values — changing the values would retype the persisted
    `Expense.category` union and break fixtures across three existing test files for no
    AC-driven reason. Reviewer should confirm this resolution, or say if the design's specific
    category names are meant to be authoritative.
  - |
    The design's loading/skeleton screen ("List — Loading", design lines 316-332) is not built:
    `loadExpenses()` reads localStorage synchronously with no network/async boundary, so there is
    no state during which a skeleton would ever be visible, and no AC requires one.
  - |
    Existing pagination in `ExpenseList.tsx` (10-per-page, Previous/Next controls) is kept and
    restyled, not removed, even though the design's populated-list screen shows all rows in one
    unpaginated card. No AC calls for removing pagination, and dropping it would be an
    unrequested behavior change beyond what this story asks for.
  - |
    The design's success toast ("Expense added", `role="status"`, design lines 605-608) and the
    submitting/disabled "Saving…" button state (design lines 542-546) are included as scope even
    though no single AC names them, because they are explicitly part of the approved design and
    cheap to add; flagged here rather than silently dropped or silently added without a note.
  - |
    "Description" remains the domain field name `notes` internally (see `domain/expense.ts`);
    only the user-facing label/placeholder text changes to match the design and AC wording.

package_dependencies: []

notes: |
  No router package is introduced; `App`'s list/add view switch is local `useState`, matching
  the repo's existing convention (no react-router present anywhere in `src`).

  ```mermaid
  flowchart TD
    App[App.tsx]
    List[ExpenseList.tsx]
    Form[AddExpenseForm.tsx]
    Validate[domain/validateExpense.ts]
    Repo[domain/expenseRepository.ts]
    Cats[domain/categories.ts]

    App -->|"view state: list <-> add"| List
    App -->|"view state: list <-> add"| Form
    Form -->|"validateExpense(input) before save"| Validate
    Form -->|"saveExpense(expense) on valid submit"| Repo
    App -->|"loadExpenses() on mount / after save"| Repo
    Form -->|"renders CATEGORIES in new listbox markup"| Cats
    Validate -->|"checks category against CATEGORIES"| Cats

    classDef touched fill:#f96,color:#000
    class App,List,Form,Validate,Repo,Cats touched
  ```

  Sorting stays solely in `expenseRepository.loadExpenses()` (already covered by
  `expenseRepository.test.ts`); `ExpenseList` must remain presentation-only per AC9 and must not
  duplicate the design prototype's inline `renderRows` sort.
