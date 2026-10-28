summary: |
  Adds delete-expense capability to the existing localStorage-backed expense tracker: a
  `deleteExpense` domain function with validation/not-found/ownership checks, a reusable
  accessible confirmation dialog (`ConfirmDialog`) with focus trapping and focus restoration,
  wiring in `ExpenseList` for a per-row Delete action, and ARIA-live announcements for
  success/error outcomes surfaced from `App`. The app has no server and no auth/session system
  today, so "system returns an error" (ACs 3/4/9) and "not the creator" (AC9/10) are implemented
  entirely in the domain layer as a synchronous discriminated result plus an optional
  `createdBy` ownership field, rather than as a network/API layer or a login system.

scope:
  - description: |
      Add a `deleteExpense(id, requesterId)` domain function to `expenseRepository.ts` that
      validates the id, looks up the expense, enforces ownership, removes it from storage, and
      returns a discriminated result instead of throwing. This is the seam that AC3, AC4, AC5,
      AC8, AC9, AC10 are tested against, independent of any UI.

      Signature:
      ```ts
      export type DeleteResult =
        | { ok: true; expenses: Expense[] }
        | { ok: false; error: "invalid-id" | "not-found" | "forbidden" };

      export function deleteExpense(id: string, requesterId: string): DeleteResult
      ```

      Rules:
      - `invalid-id`: id is empty/whitespace-only or not a string (malformed id, AC4/AC5) —
        checked before any storage lookup so nothing is ever removed on this path.
      - `not-found`: id is well-formed but no stored expense matches it (AC3).
      - `forbidden`: matching expense has `createdBy !== undefined` and
        `createdBy !== requesterId` (AC9/AC10). Legacy expenses with no `createdBy` are always
        deletable, so no migration of existing localStorage data is needed.
      - On success, the expense is spliced out and the remaining list is persisted via
        `localStorage.setItem`, and the resulting array is returned (mirrors `saveExpense`'s
        existing style of returning the updated list) — this is what makes AC8 (no restore path)
        trivially true: there is no tombstone, soft-delete flag, or restore function added.
    files:
      - src/domain/expense.ts
      - src/domain/expenseRepository.ts
      - src/domain/expenseRepository.test.ts
    rationale: |
      Keeps the delete/validate/authorize logic testable in isolation from React, consistent
      with how `validateExpense.ts` and `expenseRepository.ts` already separate domain logic
      from `AddExpenseForm.tsx`. A result object (not a thrown exception) matches the existing
      convention where `loadExpenses` returns values rather than throwing.

  - description: |
      Build a reusable, accessible `ConfirmDialog` component: renders `role="dialog"
      aria-modal="true"` with a message plus explicit Confirm and Cancel buttons, traps Tab/
      Shift+Tab focus cycling within itself while open, moves focus to itself (or its first
      focusable element) on open, and restores focus to the element that triggered it on close
      via either action.

      Signature:
      ```ts
      interface ConfirmDialogProps {
        message: string;
        onConfirm: () => void;
        onCancel: () => void;
      }
      export function ConfirmDialog({ message, onConfirm, onCancel }: ConfirmDialogProps)
      ```
      Focus restoration is the caller's responsibility for *which* element to return to (the
      caller records `document.activeElement` before opening and calls `.focus()` on it from its
      own `onConfirm`/`onCancel` handlers after the dialog unmounts) — this keeps `ConfirmDialog`
      itself free of caller-specific state, matching the presentational style of `ExpenseList`.
    files:
      - src/components/ConfirmDialog.tsx
      - src/components/ConfirmDialog.test.tsx
    rationale: |
      Native `<dialog>` + `showModal()` has inconsistent jsdom support and risks flaking the
      whole focus-trap test set; a plain `div[role=dialog]` with manual Tab-cycling keydown
      handling is the minimal, framework-free approach that already works under
      `@testing-library/user-event`'s `user.tab()`, which is a devDependency today.

  - description: |
      Add a per-row Delete button to `ExpenseList`, wire it to open `ConfirmDialog`, and on
      confirm call `deleteExpense` and report the result upward via a callback so `App` can
      re-load the list and render the outcome message. `ExpenseList` gains an `onDelete`
      prop instead of importing the repository directly, keeping it presentational like it is
      today (it currently takes only `expenses`).

      Signature change:
      ```ts
      // before
      interface ExpenseListProps { expenses: Expense[]; }
      // after
      interface ExpenseListProps {
        expenses: Expense[];
        onDelete: (id: string) => DeleteResult;
      }
      ```
    files:
      - src/components/ExpenseList.tsx
      - src/components/ExpenseList.test.tsx
    rationale: |
      `ExpenseList` is currently a pure render component with no side effects; keeping the
      repository call in the caller (`App`) and passing a callback preserves that boundary and
      makes `ExpenseList` easy to unit test with a stubbed `onDelete`.

  - description: |
      Wire deletion end-to-end in `App`: pass `onDelete` down to `ExpenseList`, and render the
      success/error outcome as an ARIA live region (`role="status"` for success, reusing the
      `role="alert"` pattern already used in `AddExpenseForm` for errors).
    files:
      - src/App.tsx
      - src/App.test.tsx
    rationale: |
      `App` already owns `expenses` state and re-derives it from `loadExpenses()` after
      `AddExpenseForm`'s `onSaved`; deletion follows the same pattern instead of introducing new
      state-management machinery.

tests:
  - |
    AC1 (deleted expense disappears from the list after confirm) — integration test in
    `App.test.tsx`:
    ```ts
    await user.click(screen.getByRole("button", { name: /delete/i }));
    await user.click(screen.getByRole("button", { name: /confirm/i }));
    expect(screen.queryByText("Bills")).not.toBeInTheDocument();
    ```
  - |
    AC2 (user sees a confirmation the expense was deleted) — `App.test.tsx`:
    ```ts
    expect(await screen.findByRole("status")).toHaveTextContent(/deleted/i);
    ```
  - |
    AC3 (not-found id returns a not-found error) — `expenseRepository.test.ts`:
    ```ts
    saveExpense(makeExpense({ id: "1" }));
    expect(deleteExpense("does-not-exist", "u1")).toEqual({ ok: false, error: "not-found" });
    ```
  - |
    AC4 (malformed id returns a validation error) — `expenseRepository.test.ts`:
    ```ts
    expect(deleteExpense("", "u1")).toEqual({ ok: false, error: "invalid-id" });
    ```
  - |
    AC5 (malformed id deletes nothing) — `expenseRepository.test.ts`, paired with AC4's call:
    ```ts
    saveExpense(makeExpense({ id: "1" }));
    deleteExpense("   ", "u1");
    expect(loadExpenses()).toHaveLength(1);
    ```
  - |
    AC6 (delete action shows a confirmation dialog with explicit Confirm/Cancel) —
    `ExpenseList.test.tsx`:
    ```ts
    await user.click(screen.getByRole("button", { name: /delete/i }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /confirm/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
    ```
  - |
    AC7 (Cancel does not delete) — `ExpenseList.test.tsx`:
    ```ts
    const onDelete = vi.fn();
    await user.click(screen.getByRole("button", { name: /delete/i }));
    await user.click(screen.getByRole("button", { name: /cancel/i }));
    expect(onDelete).not.toHaveBeenCalled();
    ```
  - |
    AC8 (deleted expense is permanently unavailable, no recovery) —
    `expenseRepository.test.ts`:
    ```ts
    saveExpense(makeExpense({ id: "1" }));
    deleteExpense("1", "u1");
    expect(loadExpenses()).toEqual([]);
    ```
    and, in `scope`, no `restoreExpense`/soft-delete/tombstone API is added at all — there is
    nothing to call to bring it back, which is what makes this AC true by construction rather
    than by an extra runtime check.
  - |
    AC9 (non-owner delete returns an authorization error) — `expenseRepository.test.ts`:
    ```ts
    saveExpense(makeExpense({ id: "1", createdBy: "owner" }));
    expect(deleteExpense("1", "someone-else")).toEqual({ ok: false, error: "forbidden" });
    ```
  - |
    AC10 (non-owner delete does not delete) — `expenseRepository.test.ts`, paired with AC9's
    call:
    ```ts
    deleteExpense("1", "someone-else");
    expect(loadExpenses()).toHaveLength(1);
    ```
  - |
    AC11 (dialog opening traps focus) — `ConfirmDialog.test.tsx`:
    ```ts
    render(<ConfirmDialog message="Delete this expense?" onConfirm={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByRole("dialog")).toHaveFocus();
    await user.tab();
    await user.tab();
    expect(screen.getByRole("button", { name: /confirm/i })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("button", { name: /cancel/i })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("dialog")).toHaveFocus();
    ```
  - |
    AC12 (focus returns to the trigger element on close) — `ExpenseList.test.tsx`:
    ```ts
    const deleteButton = screen.getByRole("button", { name: /delete/i });
    await user.click(deleteButton);
    await user.click(screen.getByRole("button", { name: /cancel/i }));
    expect(deleteButton).toHaveFocus();
    ```
  - |
    AC13 (success message announced via ARIA live region) — `App.test.tsx`:
    ```ts
    const status = await screen.findByRole("status");
    expect(status).toHaveTextContent(/deleted/i);
    ```
  - |
    AC14 (error message announced via ARIA live region) — `App.test.tsx`, forcing a not-found
    by deleting twice in the same session or seeding a dialog against an id removed elsewhere:
    ```ts
    expect(await screen.findByRole("alert")).toHaveTextContent(/not found/i);
    ```

assumptions_or_open_questions:
  - |
    **Needs reviewer confirmation:** the codebase has no user accounts, sessions, or backend —
    everything runs client-side against `localStorage` with a single implicit user. AC9/AC10
    ("not the creator/owner") and the "system returns an authorization/validation/not-found
    error" language in AC3/AC4/AC9 are implemented as a synchronous domain-layer check
    (`deleteExpense(id, requesterId)` returning a discriminated `DeleteResult`), using a new
    optional `createdBy` field on `Expense`. There is no login UI and the "requester" is a fixed
    local identity passed by `App`. If the intent was to defer real multi-user
    authorization/authentication to a later story, ACs 9/10 should be marked out of scope
    instead — please confirm this interpretation before implementation starts.
  - |
    Existing expenses saved before this change have no `createdBy` value; they are treated as
    ownerless and therefore deletable by anyone, so no data migration is required.
  - |
    "Confirmation" in AC2 is a transient on-screen status message (`role="status"`), not a
    persisted notification or toast queue — matches the existing inline-message style already
    used for validation/save errors in `AddExpenseForm.tsx`.
  - |
    No native `<dialog>` element is used, to avoid jsdom `showModal()` support issues in tests;
    `ConfirmDialog` is a plain `div[role="dialog"]` with manual focus trapping.

package_dependencies: []

notes: |
  No ADRs exist in this repository (`.arc/` only contains `scratch/` and `plans/`), so no ADR
  cross-referencing is applicable here.

  TDD order: (1) `expenseRepository.ts` `deleteExpense` + its unit tests (AC3/4/5/8/9/10) with no
  UI dependency, (2) `ConfirmDialog.tsx` + its focus-trap tests (AC6/11) in isolation, (3)
  `ExpenseList.tsx` wiring the Delete button + dialog + focus restoration (AC7/12), (4) `App.tsx`
  integration wiring the live-region outcome messages (AC1/2/13/14).

  ```mermaid
  flowchart TD
    App[App.tsx]
    List[ExpenseList.tsx]
    Dialog[ConfirmDialog.tsx]
    Repo[expenseRepository.ts]
    Form[AddExpenseForm.tsx]

    App -->|passes onDelete callback, renders status/alert live region| List
    List -->|opens on Delete click, confirm/cancel wired to onDelete| Dialog
    App -->|calls deleteExpense id, requesterId| Repo
    Form -->|existing: calls saveExpense| Repo

    classDef touched fill:#f96,color:#000
    class App,List,Dialog,Repo touched
  ```
