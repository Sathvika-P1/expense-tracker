summary: |
  Rework the existing delete flow (ET-STORY-011: immediate hard delete behind a confirm dialog in `ExpenseList`) into the ET-STORY-027 behaviour: ownership-checked soft delete, an audit entry per finalized deletion, a 10-second pausable Undo toast, and permanent purge once the undo window passes. The domain layer (`expenseRepository.ts`) changes `deleteExpense` to soft-delete and adds `restoreExpense` and `purgeExpiredDeletions`, plus a new `auditLog.ts`. The existing `ConfirmDialog` is extended to match the approved prototype (alertdialog, Cancel focused, destructive confirm), and one new component, `UndoToast`, is added. AC8 (block deletion on a submitted or locked report) is NOT built: ADR-0012 records the human decision that it is out of scope because no reports capability exists. The "fixed retention window" in AC6 is the 10-second undo window plus purge, per the same ADR, not a 30-day window.

scope:
  - description: |
      Add an optional soft-delete marker to the stored record shape.

      ```ts
      export interface Expense {
        // ...existing fields
        deletedAt?: number; // epoch ms; present = soft-deleted, pending purge
      }
      ```
    files:
      - src/domain/expense.ts
    rationale: |
      Undo (AC5) needs the record to survive deletion for a short window; purge (AC6) needs to know when it was deleted.

  - description: |
      Add `src/domain/auditLog.ts`, stored under its own localStorage key `audit-log`, newest first, using the same read/parse/fallback pattern as `loadAll` in `expenseRepository.ts`.

      ```ts
      export interface AuditEntry {
        action: "deleted" | "restored";
        userId: string;
        timestamp: number;
        expense: { id: string; amount: number; date: string; category: string; notes?: string };
      }
      export function recordAuditEntry(entry: AuditEntry): void;
      export function loadAuditLog(): AuditEntry[];
      ```
    files:
      - src/domain/auditLog.ts
    rationale: |
      AC9 / ADR-0007 / ADR-0012: every finalized deletion records the deleting user, timestamp and expense details, stored client-side in localStorage. No log mechanism exists today. The prototype's "Restored" entry on undo is recorded too (the original "deleted" entry is never erased).

  - description: |
      Change `src/domain/expenseRepository.ts`. Keep a raw `loadAll()` for write-back and add a private `isLive(e) = e.deletedAt === undefined`. `loadExpenses`, `findExpenseById` and `updateExpense` only see live records, so a soft-deleted expense disappears from the list and cannot be found, edited or re-deleted (`not_found`). `saveExpense` keeps writing the raw array, so soft-deleted records are preserved.

      Existing `deleteExpense` is changed in place. Result shape and error names are kept so `App.tsx` stays compatible. `expense` is added, and the owner check moves from `createdBy` to `userId` (like `updateExpense`, ADR-0011).

      ```ts
      export const UNDO_WINDOW_MS = 10_000;

      export type DeleteResult =
        | { ok: true; expenses: Expense[]; expense: Expense }
        | { ok: false; error: "invalid-id" | "not-found" | "forbidden" };

      // before: deleteExpense(id: string, requesterId: string): DeleteResult
      export function deleteExpense(id: string, requesterId: string, now: number = Date.now()): DeleteResult;
      // order: invalid-id -> not-found (live only) -> forbidden (userId !== requesterId)
      // success: set deletedAt = now, persist, recordAuditEntry({ action: "deleted", userId: requesterId, timestamp: now, expense: {...} })

      export type RestoreResult = { ok: true; expense: Expense } | { ok: false; error: "not-found" };
      export function restoreExpense(id: string, requesterId: string, now: number = Date.now()): RestoreResult;
      // clears deletedAt, records a "restored" audit entry; not-found if missing, not soft-deleted, or purged

      export function purgeExpiredDeletions(now: number = Date.now()): number;
      // removes from storage every record with deletedAt !== undefined && deletedAt <= now - UNDO_WINDOW_MS; returns count
      ```
    files:
      - src/domain/expenseRepository.ts
    rationale: |
      Authoritative enforcement point for AC1, AC3, AC5, AC6, AC7 and AC9. The legacy rule "an expense with no createdBy can be deleted by anyone" contradicts AC1, so it is removed. Every stored record has a required `userId`, so the check is well defined. restoreExpense does not enforce the window itself; the purge is the hard boundary (see assumptions on WCAG-pausable timing).

  - description: |
      Extend the existing `ConfirmDialog` (do not create a second dialog) to match the prototype `confirm-dialog` / `deleting` screens. Existing `message` / `onConfirm` / `onCancel` props stay required. New optional props:

      ```ts
      interface ConfirmDialogProps {
        message: string;
        onConfirm: () => void;
        onCancel: () => void;
        title?: string;        // default "Confirm"; delete usage passes "Delete this expense?"
        confirmLabel?: string; // default "Confirm"; delete usage passes "Delete expense"
        destructive?: boolean; // confirm button gets btn btn-destructive; cancel gets btn btn-secondary
      }
      ```

      Behaviour per the prototype: `role="alertdialog"`, `aria-modal="true"`, `aria-labelledby` the `h2.card-title` title and `aria-describedby` the message `p`. The markup is wrapped in `.dialog-scrim` > `.dialog`. Button order is Cancel then confirm. Initial focus goes to Cancel ("the safer default"). Escape and a scrim click call `onCancel`. After confirm is clicked, the confirm button is disabled and relabelled "Deleting…" and Cancel is disabled (prototype `deleting` screen), which prevents double submit. The existing Tab/Shift+Tab focus trap is kept but re-pointed at the new first/last buttons.
    files:
      - src/components/ConfirmDialog.tsx
    rationale: |
      AC2 and AC4. The catalogue already has ConfirmDialog and ExpenseList already uses it, so it is extended rather than replaced. Changing the role and initial focus requires updating `ConfirmDialog.test.tsx` (role "dialog" to "alertdialog", initial focus Cancel, tab order).

  - description: |
      New `src/components/UndoToast.tsx`, built from the prototype toast. There is no catalogue match.

      ```ts
      interface UndoToastProps {
        onUndo: () => void;  // caller restores the record
        onExpire: () => void; // 10s elapsed without undo
      }
      ```

      It renders `.toast` with `role="status"` and `aria-live="polite"`, the text "Expense deleted", a `.toast-count` showing `{n}s` counting down from 10 each second, and a `.toast-undo` "Undo" button (44px min-height). The countdown pauses on `mouseenter` and `focusin` and resumes on `mouseleave` and `focusout` (prototype: WCAG 2.2.1). At 0 it calls `onExpire` once. After Undo it calls `onUndo` and shows "Expense restored" for about 2.2s (prototype `showRestoredToast`), then unmounts.
    files:
      - src/components/UndoToast.tsx
    rationale: |
      AC5 (undo within the window) and AC6 (after the window the deletion stands and the record is purged via onExpire).

  - description: |
      Update `src/components/ExpenseList.tsx`. The per-row Delete button and confirm flow already exist (ET-STORY-011). Changes:

      - Delete button gets `className="btn btn-secondary"` and `aria-label={`Delete ${expense.category} expense`}`, which still matches `/delete/i`. The 44px min-height comes from the new CSS. The Delete button is always visible, as in the prototype.
      - The dialog is rendered with `title="Delete this expense?"`, `confirmLabel="Delete expense"`, `destructive`, and a message naming the item and amount, with "You can undo for 10 seconds after deleting." appended. `Expense` has no title field, so the item name is derived from category plus notes or date.
      - Pagination clamp: derive `const currentPage = Math.min(page, totalPages - 1)` and use it for slicing and the "Page x of y" label, so deleting the only row on the last page does not leave an empty page.
    files:
      - src/components/ExpenseList.tsx
    rationale: |
      AC2/AC3/AC4 UI. Reuses the existing list (catalogue) instead of adding one. Existing focus-restoration behaviour on cancel (prototype `list-cancelled`: focus returns to the row's Delete button) is already implemented and kept.

  - description: |
      Update `src/App.tsx`.

      - Replace the `"Expense deleted."` `<p role="status">` with `UndoToast` state: `pendingUndo: { id: string } | null`. Two role="status" regions would also break getByRole queries.
      - `handleDelete(id)` keeps calling `deleteExpense(id, CURRENT_USER_ID)`. On success it calls `setExpenses(result.expenses)` and sets `pendingUndo`. On failure it shows a `.banner` with `role="alert"` (prototype `auth-error` / `not-found-error`): "You can't delete this expense" for `forbidden`, "This expense no longer exists" for `not-found`, and the existing invalid-id text. The not-found banner body keeps "Expense not found." so the existing alert assertion still reads sensibly.
      - `onUndo` calls `restoreExpense(id, CURRENT_USER_ID)` and `setExpenses(loadExpenses())`. `onExpire` calls `purgeExpiredDeletions()` (real clock; at expiry at least 10s have passed since `deletedAt`, even when the countdown was paused), then clears `pendingUndo`.
      - On mount, run `purgeExpiredDeletions()` once in a `useEffect` so records soft-deleted in a closed tab or reload are permanently purged.
    files:
      - src/App.tsx
    rationale: |
      App owns list state and the delete result handling. This covers AC1 and AC7 error display, and the AC5 and AC6 lifecycle. There is no backend or timer outside the page, so toast expiry plus mount-time purge are the only purge triggers.

  - description: |
      Append prototype rules to `src/design-system/prototype-utils.css`, copying values from the prototype's inlined style block (no new tokens): `.btn-destructive` (+ `:hover:not(:disabled)`), `.dialog-scrim`, `.dialog` (+ `h2` and `.actions-row` rules), `.toast` (without the prototype's `display:none` / `.show` toggling because React mounts it conditionally), `.toast .toast-undo`, `.toast .toast-count`, and the `max-width: 480px` `.toast` column rule. The prototype flags `.btn-destructive` as a design-system gap (no `button-destructive-*` token; composed from `color-negative` + `color-primary-fg`, about 5.9:1 contrast); that gap is carried through, not resolved here.
    files:
      - src/design-system/prototype-utils.css
    rationale: |
      These classes do not exist in the app CSS yet; the dialog and toast reference them per the approved design.

tests:
  - |
    AC1 (src/domain/expenseRepository.test.ts), another user's expense is rejected and kept:
    ```ts
    saveExpense(makeExpense({ id: "1", userId: "other-user" }));
    expect(deleteExpense("1", "local-user")).toEqual({ ok: false, error: "forbidden" });
    expect(findExpenseById("1")).toBeDefined();
    ```
    Run: `npm test -- src/domain/expenseRepository.test.ts`
  - |
    AC1 (src/App.test.tsx), error shown, row kept. Seed an expense, click Delete, change its userId in localStorage to "other-user", click "Delete expense" in the dialog:
    ```ts
    expect(await screen.findByRole("alert")).toHaveTextContent(/can't delete this expense/i);
    expect(screen.getAllByRole("row")[1]).toHaveTextContent("Bills");
    ```
    Run: `npm test -- src/App.test.tsx`
  - |
    AC2 (src/App.test.tsx and src/components/ConfirmDialog.test.tsx), dialog before deletion, with the prototype's semantics:
    ```ts
    await user.click(screen.getByRole("button", { name: /delete/i }));
    const dialog = screen.getByRole("alertdialog", { name: /delete this expense/i });
    expect(dialog).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /cancel/i })).toHaveFocus();
    expect(findExpenseById("existing")).toBeDefined(); // nothing deleted yet
    ```
    Run: `npm test -- src/components/ConfirmDialog.test.tsx`
  - |
    AC2 (ConfirmDialog.test.tsx), Escape and scrim cancel, and confirm disables to "Deleting…":
    ```ts
    await user.keyboard("{Escape}");
    expect(onCancel).toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Delete expense" }));
    expect(screen.getByRole("button", { name: "Deleting…" })).toBeDisabled();
    ```
  - |
    AC3 (src/App.test.tsx, update the existing confirm test; "Confirm" is now "Delete expense"), removed from list:
    ```ts
    await user.click(screen.getByRole("button", { name: /delete/i }));
    await user.click(screen.getByRole("button", { name: "Delete expense" }));
    expect(screen.queryByRole("cell", { name: "Bills" })).not.toBeInTheDocument();
    expect(await screen.findByRole("status")).toHaveTextContent(/expense deleted/i);
    ```
  - |
    AC3 (expenseRepository.test.ts), soft delete hides from list and find, keeps the record in storage:
    ```ts
    saveExpense(makeExpense({ id: "1" }));
    const result = deleteExpense("1", "local-user", 1000);
    expect(result.ok).toBe(true);
    expect(loadExpenses("local-user")).toHaveLength(0);
    expect(findExpenseById("1")).toBeUndefined();
    expect(JSON.parse(localStorage.getItem("expenses")!)[0].deletedAt).toBe(1000);
    ```
  - |
    AC4 (src/App.test.tsx, existing cancel test kept), expense unchanged and focus returns:
    ```ts
    await user.click(deleteButton);
    await user.click(screen.getByRole("button", { name: /cancel/i }));
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(screen.getAllByRole("row")[1]).toHaveTextContent("Bills");
    expect(deleteButton).toHaveFocus();
    ```
  - |
    AC5 (expenseRepository.test.ts), restore:
    ```ts
    saveExpense(makeExpense({ id: "1" }));
    deleteExpense("1", "local-user", 1000);
    expect(restoreExpense("1", "local-user", 2000).ok).toBe(true);
    expect(loadExpenses("local-user").map((e) => e.id)).toEqual(["1"]);
    ```
  - |
    AC5 (src/components/UndoToast.test.tsx, vitest fake timers), countdown, undo, pause:
    ```ts
    vi.useFakeTimers();
    render(<UndoToast onUndo={onUndo} onExpire={onExpire} />);
    expect(screen.getByRole("status")).toHaveTextContent("Expense deleted");
    act(() => vi.advanceTimersByTime(3000));
    expect(screen.getByText("7s")).toBeInTheDocument();
    fireEvent.mouseEnter(screen.getByRole("status"));
    act(() => vi.advanceTimersByTime(5000));
    expect(screen.getByText("7s")).toBeInTheDocument(); // paused
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(onUndo).toHaveBeenCalledTimes(1);
    expect(onExpire).not.toHaveBeenCalled();
    ```
    Run: `npm test -- src/components/UndoToast.test.tsx`
  - |
    AC5 (src/App.test.tsx), undo restores the row:
    ```ts
    await user.click(screen.getByRole("button", { name: /delete/i }));
    await user.click(screen.getByRole("button", { name: "Delete expense" }));
    await user.click(await screen.findByRole("button", { name: "Undo" }));
    expect(await screen.findByRole("cell", { name: "Bills" })).toBeInTheDocument();
    ```
  - |
    AC6 (expenseRepository.test.ts), purge after the window:
    ```ts
    saveExpense(makeExpense({ id: "1" }));
    deleteExpense("1", "local-user", 0);
    expect(purgeExpiredDeletions(UNDO_WINDOW_MS - 1)).toBe(0);
    expect(purgeExpiredDeletions(UNDO_WINDOW_MS)).toBe(1);
    expect(JSON.parse(localStorage.getItem("expenses")!)).toEqual([]);
    expect(restoreExpense("1", "local-user")).toEqual({ ok: false, error: "not-found" });
    ```
  - |
    AC6 (UndoToast.test.tsx and App.test.tsx), expiry calls onExpire once at 10s and the record is purged from storage after the toast disappears; also a mount-time purge test: seed a record with `deletedAt: Date.now() - 20_000`, render `<App />`, assert `localStorage.getItem("expenses")` no longer contains it.
    ```ts
    act(() => vi.advanceTimersByTime(10_000));
    expect(onExpire).toHaveBeenCalledTimes(1);
    ```
  - |
    AC7 (expenseRepository.test.ts), missing and already-deleted ids:
    ```ts
    expect(deleteExpense("missing", "local-user")).toEqual({ ok: false, error: "not-found" });
    saveExpense(makeExpense({ id: "1" }));
    deleteExpense("1", "local-user");
    expect(deleteExpense("1", "local-user")).toEqual({ ok: false, error: "not-found" });
    ```
  - |
    AC7 (src/App.test.tsx, update the existing AC14 test), banner copy:
    ```ts
    localStorage.setItem("expenses", "[]");
    await user.click(screen.getByRole("button", { name: "Delete expense" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/no longer exists/i);
    ```
  - |
    AC8, no test and no code: out of scope per ADR-0012 (human decision, no reports capability). See assumptions.
  - |
    AC9 (src/domain/auditLog.test.ts), entry content and order:
    ```ts
    saveExpense(makeExpense({ id: "1", amount: 52.75 }));
    deleteExpense("1", "local-user", 5000);
    expect(loadAuditLog()[0]).toEqual(expect.objectContaining({
      action: "deleted", userId: "local-user", timestamp: 5000,
      expense: expect.objectContaining({ id: "1", amount: 52.75 }),
    }));
    restoreExpense("1", "local-user", 6000);
    expect(loadAuditLog().map((e) => e.action)).toEqual(["restored", "deleted"]);
    ```
    Also assert that a failed delete (forbidden, not-found) records no entry.
    Run: `npm test -- src/domain/auditLog.test.ts`
  - |
    Regression and data (expenseRepository.test.ts and ExpenseList.test.tsx): existing rows without `deletedAt` still load and delete; edit of a soft-deleted id returns not_found; pagination clamp.
    ```ts
    // stored before this change, no deletedAt
    localStorage.setItem("expenses", JSON.stringify([{ id: "1", userId: "local-user", amount: 1, date: "2026-01-01", category: "Food", createdAt: 1 }]));
    expect(loadExpenses("local-user")).toHaveLength(1);
    expect(updateExpense("1", validInput, undefined)).toEqual(expect.objectContaining({ ok: true }));
    // list: 11 rows, go to page 2, delete the only row there
    expect(screen.getByText("Page 1 of 1")).toBeInTheDocument(); // or nav hidden; page-1 rows shown
    ```
    Existing tests to update because behaviour intentionally changes: "allows deleting a legacy expense with no createdBy by anyone" (removed; replaced by the AC1 owner test), the `createdBy: "owner"` forbidden test (now keyed on `userId`), requester "u1" in the delete tests (use "local-user"), `{ ok: true, expenses: [] }` equality (now also has `expense`), `ConfirmDialog.test.tsx` and `ExpenseList.test.tsx` / `App.test.tsx` queries for `dialog` / `/confirm/i`.

assumptions_or_open_questions:
  - |
    AC8 (block deletion when the expense is on a submitted or locked report) is deliberately NOT implemented. ADR-0012 records the human decision: "ignore the reports rule (out of scope)", because no reports capability exists in this codebase (no report entity, field or repository). The prototype's `report-locked-error` screen and report chip are therefore not built. If the reviewer wants AC8 in scope, that needs a decision on where report status comes from (a new reports domain), which this plan does not invent.
  - |
    Retention window: ADR-0012 says a deleted expense can be undone for 10 seconds, "after which it is purged permanently with no recovery". AC6's "fixed retention window" is therefore read as that same 10-second window (`UNDO_WINDOW_MS`). The prototype's copy "retained internally for 30 days" and its 30-day "permanently purged" deep-link screen conflict with the ADR; the ADR is followed and that copy is not built. The deep-link screen is also moot because the app has no routing.
  - |
    The prototype's countdown pauses on hover and focus (WCAG 2.2.1), so a paused toast can keep Undo available beyond 10 wall-clock seconds. `restoreExpense` does not check the clock; the purge (toast expiry, or the mount-time sweep) is the hard boundary. This is intentional.
  - |
    "Finalized" (AC2, AC9) is read as the moment the user confirms in the dialog, matching the prototype, which logs "Deleted" at confirm time and a separate "Restored" entry on undo. Soft-delete in localStorage means the audit entry is written when `deleteExpense` succeeds.
  - |
    Divergence from the prototype: the prototype never opens the dialog for another user's or stale expense (it shows the error banner directly). The existing flow (ET-STORY-011) opens the dialog from the list and the domain check runs on confirm, with the error banner shown afterwards. This plan keeps the existing flow (smaller change, and ACs 1 and 7 only require the error and no deletion). A pre-check like `handleEditClick` could be added if the reviewer wants the prototype's exact sequence.
  - |
    `Expense` has no title field, so the dialog's item name and the Delete button's accessible label are derived from category plus notes or date instead of the prototype's literal titles. The prototype's top nav, breadcrumb, list-row layout, empty-state card and Settings activity-log screen are out of scope: the app list is an existing table, and AC9 only requires that an entry is recorded, not shown.
  - |
    Owner check moves from `createdBy` to `userId`. `createdBy` is optional and legacy rows lack it; `userId` is required on every record and is what `updateExpense` and the edit flow already use (ADR-0011: domain-layer check only, no server enforcement). Behaviour change: legacy rows can no longer be deleted by arbitrary requesters.
  - |
    ADR-0006 mentions 20 per page while `ExpenseList` uses `PAGE_SIZE = 10`. Not touched by this story.

estimated_points: 5

package_dependencies: []

notes: |
  ### Data & rollout

  - **Existing data**: The stored `expenses` array gains an optional `deletedAt` field. Existing rows have no `deletedAt`, which means "live", so they stay readable, editable and deletable with no migration. Rows are never rewritten on load. A new `audit-log` localStorage key is created lazily on first write; absent means an empty log.
  - **Backfill / seed**: None needed. `purgeExpiredDeletions()` is idempotent and safe to re-run.
  - **Settings**: None. `UNDO_WINDOW_MS` (10,000) is a code constant in `expenseRepository.ts`.
  - **Provisioning**: None — client-side localStorage only (ADR-0008).
  - **Order and rollback**: Single deploy. Rolling back leaves any soft-deleted rows in storage; old code would treat them as live (they would reappear) until purged. That is acceptable for a local single-user app and is noted rather than mitigated.

  A test that pre-change rows (no `deletedAt`) still load, edit and delete is listed in `tests`.

  Reuse (component catalogue): `ConfirmDialog` and `ExpenseList` are extended; `AddExpenseForm` and `EditExpenseForm` are untouched. `UndoToast` is the only new component. `EditExpenseForm` needs no code change: `updateExpense` on a soft-deleted id returns `not_found`, which its existing redirect handles.

  Existing UI tests run with `@testing-library/user-event` (already a devDependency) and seed `localStorage` directly; the UndoToast tests use vitest fake timers, so no new test dependency.

  ```mermaid
  flowchart TD
    Expense["expense.ts<br/>+ deletedAt"]:::touched
    Repo["expenseRepository.ts<br/>soft delete, restore, purge"]:::touched
    Audit["auditLog.ts<br/>new, AC9"]:::touched
    App["App.tsx<br/>delete result banners, undo lifecycle, mount purge"]:::touched
    List["ExpenseList.tsx<br/>Delete button label and dialog copy, page clamp"]:::touched
    Dialog["ConfirmDialog.tsx<br/>alertdialog, Cancel focus, destructive"]:::touched
    Toast["UndoToast.tsx<br/>new, 10s pausable"]:::touched
    CSS["prototype-utils.css<br/>dialog, toast, btn-destructive"]:::touched
    Edit["EditExpenseForm.tsx<br/>calls updateExpense"]
    User["currentUser.ts<br/>getCurrentUserId"]

    Repo --> Expense
    Repo -->|records deleted/restored| Audit
    Repo --> User
    App -->|deleteExpense, restoreExpense, purge| Repo
    App --> List
    App --> Toast
    List --> Dialog
    Dialog -.styled by.-> CSS
    Toast -.styled by.-> CSS
    Edit -->|not_found for soft-deleted| Repo

    classDef touched fill:#f96,color:#000
  ```

review_focus: |
  Hold the plan to: soft delete, owner check, audit entry, 10s Undo then purge, dialog and toast per the prototype. AC8 and the 30-day retention are deliberately out, per ADR-0012 (reports out of scope; undo 10s then permanent purge). Riskiest area is `expenseRepository.ts`: every read path must exclude soft-deleted rows while `saveExpense` and purge operate on the raw array, and moving the owner check from `createdBy` to `userId` changes legacy behaviour (existing tests are updated on purpose). The pausable toast means Undo can outlast 10 wall-clock seconds by design; purge, not `restoreExpense`, is the boundary.
