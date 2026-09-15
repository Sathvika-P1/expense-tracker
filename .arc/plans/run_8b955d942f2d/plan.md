summary: |
  This is a small, entirely client-side React + localStorage app (no server, no auth, no
  workflow engine) built for ET-STORY-004 (Add Expense). ET-STORY-010 (Edit Expense) asks for
  ownership checks with HTTP 403s, workflow states (draft/submitted/approved/rejected/
  reimbursed), a receipt attachment field, save retry over "network" failures, and an audit
  history panel -- none of which exist in the current model. Rather than inventing a backend,
  auth layer, or file-upload subsystem to satisfy these literally, this plan implements each
  acceptance criterion at the thinnest layer that is genuinely testable in this codebase:
  `Expense` gains `status` and `ownerId` fields, `updateExpense` in the repository enforces
  ownership (surfaced as a typed `ForbiddenError` in the UI, since there is no HTTP layer to
  return a status code from), a new `auditRepository` records before/after diffs on every edit,
  and a new `EditExpenseForm` component (parallel to the existing `AddExpenseForm`) handles
  pre-population, dirty-tracking with a confirm-on-cancel dialog, and retry-with-retained-data
  on save failure. The receipt attachment field contradicts the parent epic's definition of an
  expense ("amount, date, one of six fixed categories, and optional notes") and is flagged as an
  open question rather than silently built.
scope:
  - description: |
      Add `status: ExpenseStatus` and `ownerId: string` to the `Expense` model so AC6-8 have a
      real field to check against. `ExpenseStatus` is `'draft' | 'submitted' | 'approved' |
      'rejected' | 'reimbursed'`. Existing localStorage records predate these fields, so
      `loadExpenses` must default missing `status` to `'draft'` and missing `ownerId` to the
      current user constant on read.
    files:
      - src/domain/expense.ts
      - src/domain/expenseRepository.ts
      - src/domain/expenseRepository.test.ts
      - src/components/AddExpenseForm.tsx
    rationale: |
      AC6/7/8 require an owner and a lifecycle state to exist somewhere before "editable" or
      "403" can mean anything. `makeExpense` in expenseRepository.test.ts and the save() call in
      AddExpenseForm.tsx both construct `Expense` object literals and must be updated to satisfy
      the now-required fields.
  - description: |
      Introduce a single-user identity constant to stand in for auth, since none exists.
      `CURRENT_USER_ID = "current-user"` in a new `src/domain/currentUser.ts`. This is the
      "logged in" editor for audit records and the owner assigned to expenses created via
      AddExpenseForm.
    files:
      - src/domain/currentUser.ts
    rationale: |
      AC6 ("owned by a different user") and AC14 ("editor identity") need an identity concept.
      Building real auth is out of scope for this story; a constant makes the ownership/identity
      checks exercisable without inventing a login system.
  - description: |
      Add `updateExpense(id, changes, editorId)` to expenseRepository. Throws a typed
      `ForbiddenError` when `editorId !== expense.ownerId`. On success, writes the updated
      record and appends an audit entry via `auditRepository.recordEdit`.
      Signature: `export function updateExpense(id: string, changes: Partial<ExpenseEditableFields>, editorId: string): Expense`
      where `ExpenseEditableFields = Pick<Expense, "amount" | "date" | "category" | "notes">`.
    files:
      - src/domain/expenseRepository.ts
      - src/domain/expenseRepository.test.ts
      - src/domain/errors.ts
    rationale: |
      Centralizes the ownership guard and audit-write in one place so both the UI and future
      callers get AC6/AC14 for free instead of re-implementing the check per call site.
  - description: |
      Add `src/domain/auditRepository.ts`, mirroring the existing `expenseRepository` shape
      (own `STORAGE_KEY = "expense-audit-log"`, `loadAuditRecords(expenseId)`,
      `recordEdit(entry)`). Entry shape:
      `interface AuditEntry { id: string; expenseId: string; editedAt: number; editorId: string; before: ExpenseEditableFields; after: ExpenseEditableFields }`
    files:
      - src/domain/auditRepository.ts
      - src/domain/auditRepository.test.ts
    rationale: |
      AC14/15 need a durable, queryable history separate from the expense record itself; this
      follows the exact persistence pattern already established by expenseRepository.ts so it
      fits existing conventions.
  - description: |
      Extend `validateExpense` with a "valid date" check (currently only checks non-blank).
      Confirm via new tests that amount<=0 and out-of-list category are *already* rejected by
      the existing regex/membership checks (AC4 and part of AC5 require no new production code
      beyond the date check -- they are covered by pinning tests against existing logic).
      New branch: `if (input.date.trim() && Number.isNaN(Date.parse(input.date.trim()))) errors.date = "Date must be a valid date.";`
    files:
      - src/domain/validateExpense.ts
      - src/domain/validateExpense.test.ts
    rationale: |
      `AMOUNT_PATTERN` already has no `-` in its character class so `-5` fails to match, and
      `Number(amount) <= 0` catches `0`; `CATEGORIES.includes(...)` already rejects out-of-list
      values. Only the date-format check is genuinely missing.
  - description: |
      Add `src/components/EditExpenseForm.tsx`, a sibling to `AddExpenseForm.tsx` (not a
      generalization of it -- edit needs pre-population, dirty-tracking, and a cancel-confirm
      flow that add does not). Props:
      `interface EditExpenseFormProps { expense: Expense; currentUserId: string; onSaved: () => void; onCancel: () => void }`
      Internal state initializes from `expense`, tracks a `hasUnsavedChanges` boolean (shallow
      compare of current form vs. initial), calls `window.confirm(...)` on cancel only when
      dirty, and on save failure keeps entered values and shows an inline `role="alert"` error
      without resetting the form (mirrors the existing AddExpenseForm.tsx:51-54 pattern).
    files:
      - src/components/EditExpenseForm.tsx
      - src/components/EditExpenseForm.test.tsx
    rationale: |
      Whether to extract a shared `ExpenseForm` base is flagged as an open question for the
      reviewer rather than decided unilaterally, since AddExpenseForm has no dirty-tracking or
      status-gating concerns today.
  - description: |
      Add an "Edit" control per row in `ExpenseList.tsx`, `disabled` when
      `expense.status` is `'submitted' | 'approved' | 'reimbursed'` (AC7) and enabled for
      `'draft' | 'rejected'` (AC8). Clicking raises an `onEdit(expense.id)` callback.
    files:
      - src/components/ExpenseList.tsx
      - src/components/ExpenseList.test.tsx
    rationale: |
      AC7/8 are about the edit *control's* enabled state on the list view, which is where
      expenses are currently rendered.
  - description: |
      Add a read-only expense history panel, `src/components/ExpenseHistory.tsx`, rendering
      `auditRepository.loadAuditRecords(expenseId)` as a list of before/after/editor/timestamp
      entries. Shown from `EditExpenseForm` behind a toggle (e.g. "View history").
    files:
      - src/components/ExpenseHistory.tsx
      - src/components/ExpenseHistory.test.tsx
    rationale: |
      AC15 requires a dedicated place to view audit records; keeping it a separate component
      keeps `EditExpenseForm` focused on the edit flow itself.
  - description: |
      Wire editing state into `App.tsx`: track `editingId: string | null`, render
      `EditExpenseForm` in place of the list item being edited (or as a separate view), and
      pass `onEdit`/`onSaved`/`onCancel` through. Reload expenses from `loadExpenses()` after a
      successful save, matching the existing `onSaved` reload pattern used for AddExpenseForm.
    files:
      - src/App.tsx
      - src/App.test.tsx
    rationale: |
      App.tsx is already the composition root wiring AddExpenseForm and ExpenseList together;
      editing follows the same wiring pattern rather than introducing routing.
tests:
  - |
    expenseRepository.test.ts -- AC1/AC3 (pre-population is a UI concern tested in
    EditExpenseForm.test.tsx, but the underlying read must return all editable fields):
    `expect(loadExpenses()[0]).toMatchObject({ amount: 10, date: "2026-01-01", category: "Food", notes: undefined, status: "draft", ownerId: "current-user" });`
  - |
    expenseRepository.test.ts -- AC2 (stored details reflect the update):
    ```
    it("updates the stored expense with new values", () => {
      const expense = makeExpense({ ownerId: "current-user" });
      saveExpense(expense);
      updateExpense(expense.id, { amount: 42, notes: "changed" }, "current-user");
      const [loaded] = loadExpenses();
      expect(loaded.amount).toBe(42);
      expect(loaded.notes).toBe("changed");
    });
    ```
  - |
    EditExpenseForm.test.tsx -- AC3 (amount, date, category, notes, receipt all editable):
    `expect(screen.getByLabelText(/amount/i)).not.toBeDisabled();` for each of amount/date/category/notes.
    Receipt attachment is NOT implemented (see assumptions) -- this test intentionally omits a
    receipt field assertion until the open question is resolved.
  - |
    validateExpense.test.ts -- AC4 (zero/negative amount rejected), pinning existing behavior:
    ```
    it.each(["0", "-5"])("rejects non-positive amount %s", (amount) => {
      const errors = validateExpense({ amount, date: "2026-01-01", category: "Food", notes: "" });
      expect(errors.amount).toMatch(/positive number/i);
    });
    ```
  - |
    validateExpense.test.ts -- AC5 (blank required field, invalid date, invalid category):
    ```
    it("rejects an invalid date string", () => {
      const errors = validateExpense({ amount: "10", date: "not-a-date", category: "Food", notes: "" });
      expect(errors.date).toMatch(/valid date/i);
    });
    it("rejects a category outside the fixed list", () => {
      const errors = validateExpense({ amount: "10", date: "2026-01-01", category: "Yacht", notes: "" });
      expect(errors.category).toMatch(/fixed options/i);
    });
    ```
  - |
    expenseRepository.test.ts -- AC6 (non-owner edit rejected):
    ```
    it("throws ForbiddenError when a non-owner attempts to update", () => {
      const expense = makeExpense({ ownerId: "owner-a" });
      saveExpense(expense);
      expect(() => updateExpense(expense.id, { amount: 5 }, "owner-b")).toThrow(ForbiddenError);
    });
    ```
    Note: there is no HTTP layer in this app, so "403" is represented as a typed error surfaced
    by the UI as a clear inline message, not an actual status code -- see assumptions.
  - |
    ExpenseList.test.tsx -- AC7 (edit control disabled for submitted/approved/reimbursed):
    ```
    it.each(["submitted", "approved", "reimbursed"])("disables edit for status %s", (status) => {
      render(<ExpenseList expenses={[makeExpense({ status })]} onEdit={vi.fn()} />);
      expect(screen.getByRole("button", { name: /edit/i })).toBeDisabled();
    });
    ```
  - |
    ExpenseList.test.tsx -- AC8 (edit control enabled for draft/rejected):
    ```
    it.each(["draft", "rejected"])("enables edit for status %s", (status) => {
      render(<ExpenseList expenses={[makeExpense({ status })]} onEdit={vi.fn()} />);
      expect(screen.getByRole("button", { name: /edit/i })).toBeEnabled();
    });
    ```
  - |
    EditExpenseForm.test.tsx -- AC9 (confirm dialog shown when cancelling with unsaved changes):
    ```
    it("asks for confirmation when cancelling with unsaved changes", async () => {
      const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
      const onCancel = vi.fn();
      render(<EditExpenseForm expense={expense} currentUserId="current-user" onSaved={vi.fn()} onCancel={onCancel} />);
      await user.clear(screen.getByLabelText(/amount/i));
      await user.type(screen.getByLabelText(/amount/i), "99");
      await user.click(screen.getByRole("button", { name: /cancel/i }));
      expect(confirmSpy).toHaveBeenCalled();
      expect(onCancel).toHaveBeenCalled();
    });
    ```
  - |
    EditExpenseForm.test.tsx -- AC10 (no confirm dialog when no unsaved changes):
    ```
    it("cancels without a confirmation dialog when nothing changed", async () => {
      const confirmSpy = vi.spyOn(window, "confirm");
      const onCancel = vi.fn();
      render(<EditExpenseForm expense={expense} currentUserId="current-user" onSaved={vi.fn()} onCancel={onCancel} />);
      await user.click(screen.getByRole("button", { name: /cancel/i }));
      expect(confirmSpy).not.toHaveBeenCalled();
      expect(onCancel).toHaveBeenCalled();
    });
    ```
  - |
    EditExpenseForm.test.tsx -- AC11 (form data retained after save failure):
    ```
    it("retains entered values when save fails", async () => {
      vi.spyOn(expenseRepository, "updateExpense").mockImplementation(() => { throw new Error("network"); });
      render(<EditExpenseForm expense={expense} currentUserId="current-user" onSaved={vi.fn()} onCancel={vi.fn()} />);
      await user.clear(screen.getByLabelText(/amount/i));
      await user.type(screen.getByLabelText(/amount/i), "77");
      await user.click(screen.getByRole("button", { name: /save/i }));
      expect(await screen.findByRole("alert")).toBeInTheDocument();
      expect(screen.getByLabelText(/amount/i)).toHaveValue("77");
    });
    ```
  - |
    EditExpenseForm.test.tsx -- AC12 (inline error message on failure): covered by the same
    test as AC11 via `expect(await screen.findByRole("alert")).toHaveTextContent(/could not save/i);`
  - |
    EditExpenseForm.test.tsx -- AC13 (retry resubmits retained data without re-entry):
    ```
    it("resubmits the retained data on retry after a failed save", async () => {
      const updateSpy = vi.spyOn(expenseRepository, "updateExpense")
        .mockImplementationOnce(() => { throw new Error("network"); })
        .mockImplementationOnce((id, changes, editor) => ({ ...expense, ...changes }));
      render(<EditExpenseForm expense={expense} currentUserId="current-user" onSaved={vi.fn()} onCancel={vi.fn()} />);
      await user.clear(screen.getByLabelText(/amount/i));
      await user.type(screen.getByLabelText(/amount/i), "77");
      await user.click(screen.getByRole("button", { name: /save/i }));
      await screen.findByRole("alert");
      await user.click(screen.getByRole("button", { name: /save/i }));
      expect(updateSpy).toHaveBeenLastCalledWith(expense.id, expect.objectContaining({ amount: 77 }), "current-user");
    });
    ```
  - |
    expenseRepository.test.ts / auditRepository.test.ts -- AC14 (audit record on save):
    ```
    it("records an audit entry with timestamp, editor, and before/after values", () => {
      const expense = makeExpense({ ownerId: "current-user", amount: 10 });
      saveExpense(expense);
      updateExpense(expense.id, { amount: 20 }, "current-user");
      const [entry] = loadAuditRecords(expense.id);
      expect(entry.editorId).toBe("current-user");
      expect(entry.before.amount).toBe(10);
      expect(entry.after.amount).toBe(20);
      expect(typeof entry.editedAt).toBe("number");
    });
    ```
  - |
    ExpenseHistory.test.tsx -- AC15 (history panel displays audit records):
    ```
    it("displays prior edits for the expense", () => {
      vi.spyOn(auditRepository, "loadAuditRecords").mockReturnValue([
        { id: "a1", expenseId: "1", editedAt: Date.parse("2026-01-02"), editorId: "current-user", before: { amount: 10 }, after: { amount: 20 } },
      ]);
      render(<ExpenseHistory expenseId="1" />);
      expect(screen.getByText(/current-user/)).toBeInTheDocument();
      expect(screen.getByText(/10/)).toBeInTheDocument();
      expect(screen.getByText(/20/)).toBeInTheDocument();
    });
    ```
assumptions_or_open_questions:
  - |
    The parent epic defines an expense as carrying only "amount, date, one of six fixed
    categories, and optional notes" -- no receipt attachment. AC3 requires a receipt attachment
    field to be editable. This plan does NOT implement file upload/attachment storage; it
    flags this as a direct conflict for the reviewer to resolve (defer receipt support to a
    follow-up story, or approve a minimal `receipt?: { name: string; dataUrl: string }` field
    added to `Expense` and a file input in `EditExpenseForm`/`AddExpenseForm`). No attachment
    code is written until this is resolved.
  - |
    There is no authentication or HTTP layer in this app (confirmed: no server code, no fetch
    calls, no `.env` auth vars). AC6's "403 error" and AC11/AC12's "server or network error" are
    implemented as: a typed `ForbiddenError` thrown from `expenseRepository.updateExpense` and
    surfaced as an inline message in the UI (no real status code exists to assert), and a
    localStorage write failure (e.g. quota exceeded, or a mocked throw in tests) standing in for
    "server/network error" -- mirroring how AddExpenseForm.tsx already handles `saveExpense`
    throwing.
  - |
    A single hardcoded `CURRENT_USER_ID` constant stands in for a logged-in user, since no auth
    system exists. Real multi-user ownership enforcement would require an actual identity
    provider, out of scope for this story.
  - |
    AC1's "pre-populated" and AC3's editable-fields list assume the edit form is reached via
    some navigation action; this plan wires it through in-page state in App.tsx (no router
    exists in this app) rather than a "direct URL," so AC6's "via direct URL" is only exercised
    at the repository layer (`updateExpense` guard), not via actual routing.
  - |
    Existing localStorage records (from before this story) have no `status`/`ownerId` fields.
    `loadExpenses` is extended to default missing `status` to `"draft"` and missing `ownerId`
    to `CURRENT_USER_ID` at read time so old data doesn't break the new AC6/7/8 checks.
package_dependencies: []
notes: |
  `@testing-library/user-event` and all other testing libraries needed are already
  devDependencies (see package.json); no new packages are required.

  This story significantly extends the domain model (`status`, `ownerId`) that ET-STORY-004's
  code and tests did not anticipate. `expenseRepository.test.ts`'s `makeExpense` helper and
  `AddExpenseForm.tsx`'s `saveExpense(...)` call site both need updates to keep constructing
  valid `Expense` objects -- these are called out explicitly in `scope` above so they aren't
  missed during implementation.

  ```mermaid
  flowchart TD
    App["App.tsx"]
    AddForm["AddExpenseForm.tsx"]
    EditForm["EditExpenseForm.tsx (new)"]
    List["ExpenseList.tsx"]
    History["ExpenseHistory.tsx (new)"]
    Repo["expenseRepository.ts"]
    AuditRepo["auditRepository.ts (new)"]
    Validate["validateExpense.ts"]
    ExpenseModel["expense.ts"]
    CurrentUser["currentUser.ts (new)"]
    Errors["errors.ts (new)"]

    App --> AddForm
    App --> EditForm
    App --> List
    EditForm --> History
    AddForm --> Repo
    AddForm --> Validate
    EditForm --> Repo
    EditForm --> Validate
    EditForm --> CurrentUser
    History --> AuditRepo
    Repo --> AuditRepo
    Repo --> Errors
    Repo --> ExpenseModel
    List --> ExpenseModel

    classDef touched fill:#f96,color:#000
    class App,AddForm,EditForm,List,History,Repo,AuditRepo,Validate,ExpenseModel,CurrentUser,Errors touched
  ```
