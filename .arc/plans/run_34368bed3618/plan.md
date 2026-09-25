summary: |
  Implements delete-expense (ET-STORY-027): soft-delete with an ownership check, a
  confirmation dialog, a 10-second undo toast, permanent purge after a 30-day retention
  window, a not-found error for stale rows, a report-lock check, and an audit log entry per
  finalized deletion. The domain layer (`expenseRepository.ts`) gains `deleteExpense`,
  `restoreExpense`, and `purgeExpiredDeletions`, plus a new `auditLog.ts`. Existing
  read/write paths (`loadExpenses`, `findExpenseById`, `updateExpense`) are updated to treat
  soft-deleted records as absent, matching AC7's "deleted expense can't be re-deleted or
  edited" implication. Two new UI components (`ConfirmDeleteDialog`, `UndoToast`) are built
  from the approved prototype at `.arc/designs/ET-STORY-027-design.html`, and `ExpenseList`
  gets a Delete action per row. There is no existing "report" domain in this codebase, so a
  minimal inline report reference is added to `Expense` purely to make AC8 testable — flagged
  as an assumption below, not a full reports feature.

scope:
  - description: |
      Add `deletedAt?: number` and a minimal `report?: { id: string; name: string; status:
      "draft" | "submitted" | "locked" }` field to the `Expense` interface in
      `src/domain/expense.ts`. No reports domain exists in this codebase today; `report` is a
      denormalized reference carried on the expense record purely so AC8 is testable.
    files:
      - src/domain/expense.ts
    rationale: |
      Soft-delete (needed for undo, AC5) and the report-lock check (AC8) both need data that
      doesn't exist on `Expense` yet.
  - description: |
      In `src/domain/expenseRepository.ts`: make `loadAll`/`loadExpenses`/`findExpenseById`
      filter out records with `deletedAt` set (so a soft-deleted expense disappears from the
      list and can't be found for edit/delete). Add:
      ```ts
      export type DeleteResult =
        | { ok: true; expense: Expense }
        | { ok: false; reason: "not_found" }
        | { ok: false; reason: "unauthorized" }
        | { ok: false; reason: "report_locked"; report: { id: string; name: string; status: string } };

      export function deleteExpense(
        id: string,
        userId: string = getCurrentUserId(),
        now: number = Date.now(),
      ): DeleteResult

      export type RestoreResult =
        | { ok: true; expense: Expense }
        | { ok: false; reason: "not_found" };

      export function restoreExpense(
        id: string,
        userId: string = getCurrentUserId(),
      ): RestoreResult

      export function purgeExpiredDeletions(now: number = Date.now()): number // count purged
      ```
      Check order in `deleteExpense` mirrors `updateExpense`: not_found → unauthorized →
      report_locked (report status is `"submitted"` or `"locked"`) → success. On success, set
      `deletedAt = now` (soft delete, record stays in storage) and append an audit entry via
      `recordAuditEntry` from the new `auditLog.ts`. `restoreExpense` clears `deletedAt` and
      appends a `"restored"` audit entry; it does not enforce any time window itself — the
      10-second undo window is a UI-only constraint (see below), so any soft-deleted,
      unpurged record can still be restored. `purgeExpiredDeletions` permanently removes (from
      the underlying storage array, not just soft-deletes) any record whose
      `deletedAt <= now - RETENTION_MS`, where `RETENTION_MS = 30 * 24 * 60 * 60 * 1000` (the
      prototype's "30 days" and "10-second undo window" copy).
    files:
      - src/domain/expenseRepository.ts
    rationale: |
      This is the authoritative enforcement point for every AC except the dialog/toast UI
      (AC1, AC3, AC5, AC6, AC7, AC8, AC9). Loading/finding must exclude soft-deleted rows so
      AC7 (re-deleting an already-deleted id 404s) and the existing edit flow both hold.
  - description: |
      Add `src/domain/auditLog.ts`:
      ```ts
      export interface AuditEntry {
        action: "deleted" | "restored";
        userId: string;
        timestamp: number;
        expense: { id: string; amount: number; date: string; category: string };
      }
      export function recordAuditEntry(entry: AuditEntry): void
      export function loadAuditLog(): AuditEntry[]
      ```
      Stored under its own `localStorage` key (`audit-log`), append-only, most-recent-first —
      mirrors the `STORAGE_KEY`/`loadAll` pattern already used in `expenseRepository.ts`.
    files:
      - src/domain/auditLog.ts
    rationale: |
      AC9 requires an audit entry (deleting user, timestamp, expense details) on every
      finalized deletion. No log mechanism exists in the codebase yet.
  - description: |
      New `src/components/ConfirmDeleteDialog.tsx`, built from the prototype's
      `confirm-dialog`/`deleting` screens: `role="alertdialog"`, `aria-modal="true"`,
      `aria-labelledby`/`aria-describedby` pointing at a heading ("Delete this expense?") and
      a description naming the item and amount plus "You can undo for 10 seconds after
      deleting." Props:
      ```ts
      interface ConfirmDeleteDialogProps {
        expense: Expense;
        onConfirm: () => void;
        onCancel: () => void;
      }
      ```
      Cancel button (`btn btn-secondary`) receives initial focus (prototype: "the safer
      default"); `Escape` and a scrim click both cancel. Confirm button (`btn btn-destructive`)
      shows a disabled "Deleting…" label while the confirm handler is in flight, matching the
      prototype's transient `deleting` screen, to prevent double-submit.
    files:
      - src/components/ConfirmDeleteDialog.tsx
    rationale: |
      AC2 requires a confirmation dialog before finalizing; AC4 requires cancel to leave the
      expense untouched and (per the prototype's own notes) return focus to the row's Delete
      button — that refocus is done by the caller (`ExpenseList`), since only it holds a
      reference to the triggering button.
  - description: |
      New `src/components/UndoToast.tsx`, built from the prototype's toast: `role="status"`,
      `aria-live="polite"`, text "Expense deleted", a live `{n}s` countdown, and an "Undo"
      button (44px min-height, matching the prototype's `.toast-undo`). The countdown pauses
      on `mouseenter`/`focusin` and resumes on `mouseleave`/`focusout` (prototype comment:
      "WCAG 2.2.1 — no unpausable timing"). After 10 seconds elapse without Undo, the toast
      disappears and `onExpire` fires. After Undo, a brief "Expense restored" message shows
      (prototype's `showRestoredToast`, ~2.2s), then dismisses on its own.
      ```ts
      interface UndoToastProps {
        expense: Expense;
        onUndo: () => void;
        onExpire: () => void;
      }
      ```
    files:
      - src/components/UndoToast.tsx
    rationale: |
      AC5 requires an undo affordance within an "immediate undo window"; AC6 requires that
      once the window elapses the deletion stands (permanent purge is a separate, later
      concern handled by `purgeExpiredDeletions`, not this component).
  - description: |
      In `src/components/ExpenseList.tsx`: add a "Delete" button per row next to the existing
      "Edit" button (`btn btn-secondary`, `aria-label={`Delete ${label}`}`, 44px min-height —
      matches the prototype's always-visible per-row Delete affordance, no hover-only
      variant). Since `Expense` has no `title` field (unlike the prototype's fixture rows),
      derive the accessible label from `${category} — ${notes || date}` and flag this
      divergence in assumptions. Add `onDeleteClick: (expense: Expense) => void` to
      `ExpenseListProps`. After a delete removes the last row on the current page, clamp
      `page` back so pagination doesn't show "Page 2 of 1" (`setPage((p) => Math.min(p,
      Math.ceil((expenses.length - 1) / PAGE_SIZE) - 1))`-style guard, exercised by a new
      test).
    files:
      - src/components/ExpenseList.tsx
    rationale: |
      AC3 requires the deleted expense to no longer appear in the list; the existing
      component already renders per-row actions (Edit), so Delete is added the same way
      rather than introducing a new list component (reuse per the component catalogue).
  - description: |
      In `src/App.tsx`: add delete state (`{ mode: "confirm-delete"; expense }`, tracked
      alongside a `pendingUndo: { expense; timeoutHandle } | null` piece of state) and a
      `handleDeleteClick(expense)` that re-checks via `findExpenseById` first — exactly as
      `handleEditClick` already does — showing an "You can't delete this expense" /
      "not found" / report-locked banner (copied from the prototype's `auth-error`,
      `not-found-error`, `report-locked-error` screens) WITHOUT opening the dialog when the
      re-check fails, and opening `ConfirmDeleteDialog` only when the re-check passes. On
      dialog confirm, call `deleteExpense`; on success render `UndoToast`; on `onUndo` call
      `restoreExpense` and refresh the list; on `onExpire` do nothing further (record is
      already gone from `loadExpenses`). Call `purgeExpiredDeletions()` once on mount (module
      top-level `useEffect`), matching the "fixed retention window" AC6 language — there is no
      backend/cron in this app, so mount-time purge is the only enforcement point.
    files:
      - src/App.tsx
    rationale: |
      `App.tsx` already owns the analogous "load fresh record, check ownership before
      committing to a destructive/edit action" pattern for edit (AC1 in ET-STORY-022); delete
      follows the same shape for AC1/AC7/AC8, and App is the natural owner of toast/dialog
      lifecycle since it already owns `view`/`expenses` state.
  - description: |
      Add `.dialog-scrim`, `.dialog`, `.toast`, `.toast-undo`, `.toast-count`, and
      `.btn-destructive` rules to `src/design-system/prototype-utils.css`, copied verbatim
      (values, not new tokens) from the prototype's inlined `<style>` block. The prototype
      itself flags `.btn-destructive` as a design-system gap: "no button-destructive-* token
      exists yet in tokens.json... composed from color-negative + color-primary-fg (contrast
      ~5.9:1, passes AA)" — carried through unchanged, not resolved by this story.
    files:
      - src/design-system/prototype-utils.css
    rationale: |
      These classes don't exist in the app's CSS yet (only `.btn`, `.btn-primary`,
      `.btn-secondary`, `.banner` do) but every new UI component references them, per the
      approved design.

tests:
  - |
    expenseRepository.test.ts (AC1): "rejects deleting an expense owned by another user and
    leaves it in storage" —
    saveExpense(makeExpense({ id: "e1", userId: "other-user" }));
    const result = deleteExpense("e1", "local-user");
    expect(result).toEqual({ ok: false, reason: "unauthorized" });
    expect(findExpenseById("e1")).toBeDefined();
  - |
    expenseRepository.test.ts (AC3/AC5 setup): "deletes an owned expense, removing it from
    loadExpenses, and records who/when" —
    saveExpense(makeExpense({ id: "e1", userId: "local-user" }));
    const result = deleteExpense("e1", "local-user", 1000);
    expect(result.ok).toBe(true);
    expect(loadExpenses("local-user")).toHaveLength(0);
  - |
    expenseRepository.test.ts (AC5): "restores a soft-deleted expense so it reappears in
    loadExpenses" —
    saveExpense(makeExpense({ id: "e1", userId: "local-user" }));
    deleteExpense("e1", "local-user", 1000);
    const result = restoreExpense("e1", "local-user");
    expect(result.ok).toBe(true);
    expect(loadExpenses("local-user").map((e) => e.id)).toEqual(["e1"]);
  - |
    expenseRepository.test.ts (AC6): "permanently purges a soft-deleted expense once the
    retention window has passed, and it can no longer be restored" —
    saveExpense(makeExpense({ id: "e1", userId: "local-user" }));
    deleteExpense("e1", "local-user", 0);
    const purged = purgeExpiredDeletions(30 * 24 * 60 * 60 * 1000 + 1);
    expect(purged).toBe(1);
    expect(restoreExpense("e1", "local-user")).toEqual({ ok: false, reason: "not_found" });
  - |
    expenseRepository.test.ts (AC7): "returns not_found when deleting an expense id that
    does not exist" —
    const result = deleteExpense("missing", "local-user");
    expect(result).toEqual({ ok: false, reason: "not_found" });
  - |
    expenseRepository.test.ts (AC7 regression): "returns not_found when deleting an
    already-deleted expense" —
    saveExpense(makeExpense({ id: "e1", userId: "local-user" }));
    deleteExpense("e1", "local-user");
    const result = deleteExpense("e1", "local-user");
    expect(result).toEqual({ ok: false, reason: "not_found" });
  - |
    expenseRepository.test.ts (AC8): "blocks deleting an expense on a submitted report and
    names the report/status" —
    saveExpense(makeExpense({ id: "e1", userId: "local-user",
      report: { id: "RPT-311", name: "September travel", status: "submitted" } }));
    const result = deleteExpense("e1", "local-user");
    expect(result).toEqual({ ok: false, reason: "report_locked",
      report: { id: "RPT-311", name: "September travel", status: "submitted" } });
    expect(findExpenseById("e1")).toBeDefined();
  - |
    auditLog.test.ts (AC9): "records an audit entry with the deleting user, timestamp, and
    expense details when a deletion is finalized" —
    saveExpense(makeExpense({ id: "e1", userId: "local-user", amount: 52.75 }));
    deleteExpense("e1", "local-user", 5000);
    const [entry] = loadAuditLog();
    expect(entry).toEqual(expect.objectContaining({
      action: "deleted", userId: "local-user", timestamp: 5000,
      expense: expect.objectContaining({ id: "e1", amount: 52.75 }),
    }));
  - |
    App.test.tsx (AC2): "opens a confirmation dialog before finalizing delete for an owned
    expense" —
    await user.click(screen.getByRole("button", { name: /delete/i }));
    expect(screen.getByRole("alertdialog", { name: /delete this expense/i })).toBeInTheDocument();
  - |
    App.test.tsx (AC4): "cancelling the confirmation dialog leaves the expense unchanged and
    visible, and returns focus to its Delete button" —
    await user.click(screen.getByRole("button", { name: /delete/i }));
    await user.click(screen.getByRole("button", { name: /cancel/i }));
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /delete/i })).toHaveFocus();
  - |
    App.test.tsx (AC3): "confirming deletion removes the expense from the list" —
    await user.click(screen.getByRole("button", { name: /delete/i }));
    await user.click(screen.getByRole("button", { name: /delete expense/i }));
    await waitFor(() => expect(screen.queryByText("52.75")).not.toBeInTheDocument());
  - |
    App.test.tsx (AC5): "undo within the window restores the deleted expense to the list" —
    await user.click(screen.getByRole("button", { name: /delete/i }));
    await user.click(screen.getByRole("button", { name: /delete expense/i }));
    await user.click(await screen.findByRole("button", { name: /undo/i }));
    expect(await screen.findByText("52.75")).toBeInTheDocument();
  - |
    App.test.tsx (AC1): "shows an authorization error and never opens the dialog when the
    row's ownership changed since it was loaded" —
    localStorage.setItem("expenses", JSON.stringify([{ ...reassigned, userId: "other-user" }]));
    await user.click(screen.getByRole("button", { name: /delete/i }));
    expect(screen.getByText("You can't delete this expense")).toBeInTheDocument();
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  - |
    App.test.tsx (AC7): "shows a not-found error when the row was already deleted in
    another tab" —
    localStorage.setItem("expenses", JSON.stringify([]));
    await user.click(screen.getByRole("button", { name: /delete/i }));
    expect(screen.getByText("This expense no longer exists")).toBeInTheDocument();
  - |
    App.test.tsx (AC8): "shows a report-locked error naming the report and status, and does
    not delete" —
    (seed expense with report: { id: "RPT-311", name: "September travel", status: "submitted" })
    await user.click(screen.getByRole("button", { name: /delete/i }));
    expect(screen.getByText(/September travel/)).toBeInTheDocument();
    expect(screen.getByText(/Submitted/)).toBeInTheDocument();
  - |
    ExpenseList.test.tsx (AC3 regression): "clamps the current page after the last row on it
    is removed" — render with 11 rows on page 2 (1 row), fire delete on that row, assert
    the pagination nav no longer reads "Page 2 of 2" and instead shows page 1's rows.

assumptions_or_open_questions:
  - |
    There is no "report" domain anywhere in this codebase (no `reportRepository`, no report
    entity). AC8 is implemented by adding a minimal, denormalized `report?: {id,name,status}`
    field directly on `Expense`, seeded only by tests — this is NOT a reports feature and does
    not add report creation/submission/locking workflows. If a real reports domain lands in a
    later story, this field should be reconciled with it rather than kept as a permanent
    shortcut.
  - |
    The prototype's toast pauses its countdown on hover/focus (WCAG 2.2.1 no-unpausable-timing)
    but AC6 implies a "fixed retention window." Resolved by treating the 10-second undo window
    as UI-only (pauseable, cosmetic) and the 30-day retention window as the actual hard
    boundary enforced by `purgeExpiredDeletions` — a paused toast can therefore let a user undo
    well past 10 seconds, which is intentional (matches the prototype) and not a bug.
  - |
    "Finalized" (AC2's "before the deletion is finalized", AC9's "when the deletion is
    finalized") is read as: the moment the user confirms in the dialog, not the moment the
    undo window elapses or the record is purged — matching the prototype's audit log, which
    logs "Deleted" at confirm time and a separate "Restored" entry on undo (never erasing the
    original entry).
  - |
    `Expense` has no `title`/description field, so the per-row Delete button's accessible
    label and the dialog's item name are derived from `category` + `notes`/`date` instead of
    the prototype's literal title strings ("Team lunch — Blue Bottle Coffee"). This is a
    necessary divergence from the prototype's fixture copy, not an oversight.
  - |
    The prototype's Settings → Activity log screen and top nav (Dashboard/Expenses/
    Reports/Settings) are out of scope: AC9 only requires that an audit entry be recorded, not
    that it be surfaced in a UI. No activity-log screen or nav is built by this plan.
  - |
    The prototype's "permanently purged" deep-link screen (a stale bookmark to a purged
    expense) is out of scope: this app has no routing/deep-linking today, so there's no URL to
    intercept.
  - |
    `purgeExpiredDeletions()` runs once per `App` mount as the only enforcement point for AC6,
    since there is no backend, cron, or background timer in this client-only app. A user who
    never reloads the app past the 30-day mark would not see the purge occur, which is an
    accepted limitation of the current architecture, not something this story fixes.

package_dependencies: []

notes: |
  `@testing-library/user-event` is already a devDependency, so no new test dependency is
  needed; UI tests follow `App.test.tsx`'s existing pattern of seeding/mutating
  `localStorage` directly before interacting (see ET-STORY-022's unauthorized-edit and
  not-found tests), rather than mocking the repository, wherever a realistic race (AC1, AC7,
  AC8) needs to be simulated at the App level.

  ```mermaid
  flowchart TD
    Expense["expense.ts<br/>Expense interface"]:::touched
    Repo["expenseRepository.ts<br/>deleteExpense / restoreExpense / purgeExpiredDeletions"]:::touched
    Audit["auditLog.ts<br/>recordAuditEntry / loadAuditLog"]:::touched
    List["ExpenseList.tsx<br/>+ Delete button per row"]:::touched
    Dialog["ConfirmDeleteDialog.tsx<br/>new"]:::touched
    Toast["UndoToast.tsx<br/>new"]:::touched
    App["App.tsx<br/>handleDeleteClick, dialog/toast lifecycle"]:::touched
    CSS["prototype-utils.css<br/>+ .dialog/.toast/.btn-destructive"]:::touched

    Expense -->|adds deletedAt, report fields| Repo
    Repo -->|writes on confirm/undo| Audit
    App -->|re-checks via findExpenseById, like handleEditClick| Repo
    App -->|renders on confirm| Dialog
    App -->|renders on delete success| Toast
    App -->|passes onDeleteClick| List
    Dialog -.styled by.-> CSS
    Toast -.styled by.-> CSS

    classDef touched fill:#f96,color:#000
  ```

  The design prototype (`.arc/designs/ET-STORY-027-design.html`) is the sole record of the
  design and was read in full: list rows with an always-visible 44px Delete action; an
  `alertdialog` confirmation naming the item/amount with Cancel focused by default; a 300ms
  disabled "Deleting…" transient state; a bottom-centered undo toast with a pausable
  countdown; three inline error banners (auth, not-found, report-locked) that replace the
  dialog rather than opening it; an empty state; and a Settings activity-log screen (out of
  scope, see assumptions). `.btn-destructive`, `.dialog`/`.dialog-scrim`, and
  `.toast`/`.toast-undo`/`.toast-count` are copied from the prototype's own inlined CSS since
  they don't exist in `src/design-system/prototype-utils.css` yet.
