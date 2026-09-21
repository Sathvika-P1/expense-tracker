summary: |
  Adds edit-expense capability to the existing local-storage expense tracker: a new
  `updateExpense` repository function with ownership and optimistic-concurrency checks, an
  `EditExpenseForm` component reusing the existing `validateExpense` rules, and local view-state
  navigation in `App.tsx` between the expense list and the edit form (no router). Implements all
  11 ACs test-first. Builds the already-approved `ET-STORY-022-design.html` prototype's edit-form,
  validation-error, access-denied, authorization-error, conflict-error and deleted-expense screens
  using the design tokens/classes already shipped in `src/design-system/tokens.css` and
  `src/design-system/prototype-utils.css` (not yet imported into the running app). The prototype's
  "Expense detail" screens (1 and 8) and its loading/saving skeleton screens are not built: no AC
  requires a standalone detail view, and the existing `ExpenseList` table already displays every
  field, so it serves as both the AC3 "view afterward" surface and the AC7/AC8 "previous view".

scope:
  - description: |
      Add `updatedAt: number` to the `Expense` interface in `src/domain/expense.ts` (set at
      creation time in `AddExpenseForm.tsx` alongside `createdAt`) so `updateExpense` has a
      version to compare for AC9 conflict detection.
    files:
      - src/domain/expense.ts
      - src/components/AddExpenseForm.tsx
    rationale: |
      There is currently no field to detect that a record changed after the edit form loaded.
      `updatedAt` is the minimal addition; existing localStorage records predate this field, so
      `undefined` must be treated as "no conflict" (see assumptions).

  - description: |
      Add `updateExpense` to `src/domain/expenseRepository.ts` implementing ownership and
      conflict checks, returning a discriminated union rather than throwing:

      ```ts
      export type UpdateResult =
        | { ok: true; expense: Expense }
        | { ok: false; reason: "not_found" | "unauthorized" | "conflict" };

      export function updateExpense(
        id: string,
        input: ExpenseInput,
        loadedUpdatedAt: number | undefined,
        userId: string = getCurrentUserId(),
      ): UpdateResult
      ```

      Logic: load all records, find by `id` -> not found -> `{ ok: false, reason: "not_found" }`
      (covers AC10, deletion). If found but `record.userId !== userId` -> `{ ok: false, reason:
      "unauthorized" }` (AC6). If `record.updatedAt !== undefined && loadedUpdatedAt !==
      undefined && record.updatedAt !== loadedUpdatedAt` -> `{ ok: false, reason: "conflict" }`
      (AC9). Otherwise overwrite the matching record's amount/date/category/notes/updatedAt
      (`Date.now()`), persist, and return `{ ok: true, expense }` (AC2/AC3).
    files:
      - src/domain/expenseRepository.ts
    rationale: |
      Centralizes the ownership (AC5/AC6) and conflict (AC9) rules next to `loadExpenses`/
      `saveExpense`, following the existing repository pattern rather than introducing a new
      layer. A discriminated union lets the UI branch on `reason` without try/catch per error
      type.

  - description: |
      Create `src/components/EditExpenseForm.tsx`, a new component structurally mirroring
      `AddExpenseForm.tsx` but pre-filled from an existing `Expense` prop, reusing
      `validateExpense` for AC4 and calling `updateExpense` on submit.

      ```ts
      interface EditExpenseFormProps {
        expense: Expense;
        onSaved: () => void;
        onCancel: () => void;
        onDeleted: () => void;
      }
      ```

      Behaviour: initialize `ExpenseInput` state from `expense` (AC1). On submit, run
      `validateExpense` first (AC4, same rules/limits as creation: `NOTES_MAX_LENGTH = 200`,
      `AMOUNT_PATTERN`, category membership, required date via the existing `type="date"` input
      -- the prototype's free-text "invalid date format" case is not reachable with a native date
      input, matching how creation already handles dates, see assumptions). If valid, call
      `updateExpense(expense.id, form, expense.updatedAt)`; on `{ ok: false, reason: "not_found"
      }` show "This expense no longer exists" and call `onDeleted()` (AC10/AC11); on
      `"unauthorized"` show "You don't have permission to edit this expense" (AC6); on
      `"conflict"` show "Someone else saved a newer version of this expense. Reload it to see the
      latest values" (AC9); on success call `onSaved()`. "Cancel" calls `onCancel()` directly,
      discarding in-memory form state so the underlying record is untouched (AC7/AC8).

      Applies the design tokens/classes from the approved prototype's screen
      "3. Edit form -- pre-filled": `.card`/`.card-title` wrapper, `.field-row`/`.field`/`.label`/
      `.input` for amount/date/category/notes, `.btn-primary` "Save changes" and `.btn-secondary`
      "Cancel" in an `.actions-row`, and reuses the prototype's error styling from screen
      "4. Edit form -- validation errors" (`.input.has-error` plus a `.error-text` line per field)
      and its `.banner`/`.banner-title`/`.banner-body` markup from screens "6", "10" and "12" for
      the unauthorized/conflict/not-found banners. The prototype's "Category" options (Meals &
      entertainment / Travel / Office supplies / Software) are NOT used -- the six fixed
      categories in `src/domain/categories.ts` (Food, Travel, Shopping, Bills, Healthcare, Others)
      are authoritative per the epic description and match what creation already offers; the field
      is labelled "Notes" (not "Description") to match the existing `ExpenseInput.notes` field the
      creation form already uses.
    files:
      - src/components/EditExpenseForm.tsx
    rationale: |
      A separate component (rather than branching inside `AddExpenseForm`) keeps create/edit
      concerns split, matches the prototype's distinct edit screen, and avoids complicating the
      simpler creation flow's props/state with edit-only concerns (pre-fill, conflict/auth/
      not-found banners).

  - description: |
      Import the design tokens into the app so `EditExpenseForm`'s classes resolve: add
      `import "../design-system/tokens.css";` and
      `import "../design-system/prototype-utils.css";` to `src/main.tsx`.
    files:
      - src/main.tsx
    rationale: |
      `tokens.css`/`prototype-utils.css` exist in the repo (from ET-CHORE-008) but are currently
      only linked from `src/design-system/style-guide.html`, not the running app -- without this
      import the classes used in `EditExpenseForm` render unstyled.

  - description: |
      Wire navigation and ownership gating for AC5/AC7/AC8/AC11 in `src/App.tsx`: replace the
      single-view layout with local view state,

      ```ts
      type View = { mode: "list" } | { mode: "edit"; expenseId: string };
      const [view, setView] = useState<View>({ mode: "list" });
      ```

      Pass `ExpenseList` an `onEditClick(expense)` handler. Before switching to edit mode, check
      `expense.userId === getCurrentUserId()`; if not, render an access-denied message inline
      (AC5) reusing the prototype's screen "5. Access denied" copy/markup ("You can't edit this
      expense... Only the expense owner can open the edit view") with a "Back to expense list"
      `.btn-primary` button, instead of entering edit mode. When in edit mode, render
      `EditExpenseForm` with `onSaved`/`onCancel`/`onDeleted` all setting `{ mode: "list" }` and
      re-running `loadExpenses()` (AC2/AC3/AC7/AC8/AC11).
    files:
      - src/App.tsx
      - src/components/ExpenseList.tsx
    rationale: |
      No router is installed and none of the ACs require deep-linkable URLs, so local view state
      is the minimal mechanism satisfying AC7/AC8 ("navigated back to the previous view") and
      AC11 ("redirected to the expense list"). `ExpenseList` needs an edit trigger per row, per
      the prototype's screen "11. Expense list" `.btn-secondary` "Edit" button on each `.list-row`.

  - description: |
      Add an "Edit" button per row to `ExpenseList.tsx`'s table, calling the new
      `onEditClick(expense)` prop, styled per the prototype's screen "11. Expense list" list rows
      (kept as a plain button inside the existing `<td>` since the table itself is unstyled and
      out of scope for this item).
    files:
      - src/components/ExpenseList.tsx
    rationale: |
      AC1 and AC5 both begin with "the user opens/attempts to open the edit view for that
      expense" -- there must be an entry point per row, matching the prototype's per-row "Edit"
      action rather than a single global control.

tests:
  - |
    AC1 (pre-fill): render `<EditExpenseForm expense={{ id: "e1", userId: "local-user", amount: 48.5, date: "2026-09-14", category: "Travel", notes: "Client lunch", createdAt: 1, updatedAt: 1 }} ... />` and assert
    `expect(screen.getByLabelText("Amount")).toHaveValue("48.5")` and
    `expect(screen.getByLabelText("Notes")).toHaveValue("Client lunch")`.
  - |
    AC2 (save reflects update): seed localStorage with the owned expense above, call
    `updateExpense("e1", { amount: "52.75", date: "2026-09-15", category: "Travel", notes: "Rescheduled" }, 1)`
    and assert
    `expect(result).toEqual({ ok: true, expense: expect.objectContaining({ amount: 52.75, notes: "Rescheduled" }) })`.
  - |
    AC3 (view afterward shows edited values): after the AC2 save, call `loadExpenses()` and assert
    `expect(loadExpenses()[0].notes).toBe("Rescheduled")` -- and, at the component level, that
    `ExpenseList`'s rendered row for `e1` shows `screen.getByText("Rescheduled")` after `onSaved`
    triggers a reload.
  - |
    AC4 (validation errors preserved, creation-time rules): submit `EditExpenseForm` with
    amount `"-10"` and assert
    `expect(screen.getByText("Amount must be a positive number.")).toBeInTheDocument()` and that
    `updateExpense` was never called (`expect(updateExpenseSpy).not.toHaveBeenCalled()`), and that
    the amount input still shows `"-10"` (`expect(screen.getByLabelText("Amount")).toHaveValue("-10")`).
  - |
    AC5 (access denied to open edit view): render `App` with an expense owned by `"other-user"`
    and click its "Edit" button; assert
    `expect(screen.getByText("You can't edit this expense")).toBeInTheDocument()` and
    `expect(screen.queryByLabelText("Amount")).not.toBeInTheDocument()`.
  - |
    AC6 (save rejected, authorization error): seed an expense with `userId: "other-user"`, call
    `updateExpense("e2", validInput, undefined, "local-user")` and assert
    `expect(result).toEqual({ ok: false, reason: "unauthorized" })`.
  - |
    AC7 (cancel retains last saved values): render `EditExpenseForm`, change the amount field,
    click "Cancel", then assert `expect(loadExpenses()[0].amount).toBe(48.5)` (the original,
    unpersisted value) via a spy on `updateExpense` asserting
    `expect(updateExpenseSpy).not.toHaveBeenCalled()`.
  - |
    AC8 (cancel navigates back): render `App` in edit mode, click "Cancel", assert
    `expect(onCancelSpy).toHaveBeenCalled()` at the component level, and at the `App` level that
    `expect(screen.getByRole("table", { name: "Expenses" })).toBeInTheDocument()` (back on the
    list view).
  - |
    AC9 (conflict on save): seed the record with `updatedAt: 5`, call
    `updateExpense("e1", validInput, 1)` (a stale `loadedUpdatedAt`) and assert
    `expect(result).toEqual({ ok: false, reason: "conflict" })`; at the component level assert
    `expect(screen.getByText(/changed since you opened it/)).toBeInTheDocument()`.
  - |
    AC10 (deleted expense, error message): call `updateExpense` with an `id` not present in
    localStorage and assert
    `expect(result).toEqual({ ok: false, reason: "not_found" })`; at the component level assert
    `expect(screen.getByText("This expense no longer exists")).toBeInTheDocument()`.
  - |
    AC11 (deleted expense, redirect to list): render `App`, trigger a save that resolves
    `{ ok: false, reason: "not_found" }`, and assert
    `expect(screen.getByRole("table", { name: "Expenses" })).toBeInTheDocument()` after the
    `onDeleted` callback fires (back on the expense list).

assumptions_or_open_questions:
  - |
    Records saved before this item (with no `updatedAt`) are treated as never-conflicting: the
    conflict check only fires when BOTH `record.updatedAt` and the form's `loadedUpdatedAt` are
    defined and unequal. This is a non-breaking read but means pre-existing records can never
    trigger AC9 until they've been saved once under the new schema -- flagging this as a
    deliberate compromise rather than a gap the reviewer might expect closed.
  - |
    The prototype's free-text date input with an "invalid date format" error (screen 4) is not
    built: the creation form uses a native `type="date"` input which cannot hold a malformed
    string, so that sub-case of AC4 is structurally unreachable here, mirroring how creation
    already handles dates. If the reviewer wants AC4's date-format case reachable, the date input
    itself would need to change to free text for BOTH create and edit, which is a bigger,
    unrequested change to the creation form.
  - |
    The prototype's category options and the 500-character description limit conflict with the
    existing domain code (six different fixed categories in `categories.ts`, and a 200-character
    `NOTES_MAX_LENGTH`). The existing domain code is treated as authoritative since AC4 explicitly
    references "a creation-time validation rule," and the epic specifies "six fixed categories."
  - |
    The prototype's screens 1/2/7/8 (expense detail, loading skeleton, saving-transition state)
    are not built. No AC requires a dedicated detail view or a loading/saving transition state;
    `ExpenseList` already synchronously renders every field with no async fetch, so there is no
    "loading" state to skeleton and no observable "saving" gap to show a transition for.
  - |
    Applying `tokens.css`/`prototype-utils.css` to `EditExpenseForm` while `AddExpenseForm` and
    `ExpenseList` remain unstyled produces a visually inconsistent app in this item alone. This is
    accepted as within-scope only for the screens the design covers; retrofitting the older
    components' styling is out of scope for ET-STORY-022.
  - |
    "Owned by another user" (AC5/AC6) is exercised in tests by seeding localStorage with a record
    whose `userId` differs from `getCurrentUserId()`'s fixed `"local-user"` return value, since
    the app has no real multi-user session model to switch between.

package_dependencies: []

notes: |
  No router library is introduced; navigation between the expense list and the edit form is local
  `useState` view-state in `App.tsx`, satisfying AC7/AC8/AC11 without a new dependency.

  ```mermaid
  flowchart TD
    App[App.tsx]
    ExpenseList[ExpenseList.tsx]
    AddExpenseForm[AddExpenseForm.tsx]
    EditExpenseForm[EditExpenseForm.tsx]
    Repo[expenseRepository.ts]
    Validate[validateExpense.ts]
    ExpenseType[expense.ts]
    Main[main.tsx]

    App -->|renders, passes onEditClick| ExpenseList
    App -->|renders in edit mode| EditExpenseForm
    App -->|unchanged| AddExpenseForm
    ExpenseList -->|new Edit button per row| App
    EditExpenseForm -->|calls updateExpense| Repo
    EditExpenseForm -->|reuses validateExpense| Validate
    Repo -->|reads/writes| ExpenseType
    AddExpenseForm -->|sets updatedAt at creation| ExpenseType
    Main -->|imports tokens.css, prototype-utils.css| EditExpenseForm

    classDef touched fill:#f96,color:#000
    class App,ExpenseList,EditExpenseForm,Repo,ExpenseType,Main,AddExpenseForm touched
  ```
