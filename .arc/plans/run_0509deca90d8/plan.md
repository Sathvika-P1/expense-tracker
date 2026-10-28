summary: |
  Make audit-log coverage of finalized expense deletions a permanent, automatically checked gate (ADR-0007, ADR-0012). Today `deleteExpense` in `src/domain/expenseRepository.ts` removes the expense from localStorage and writes no audit record, and the `Expense` model has no notion of "finalized". The plan (1) adds an optional `finalized` flag to `Expense`, (2) adds an `auditLog` module that stores entries (deleting user, timestamp, full expense snapshot) in localStorage next to the expense data, (3) makes `deleteExpense` write the audit entry BEFORE removing a finalized expense and refuse the deletion (expense stays in the list) when the entry cannot be written, writing nothing for non-finalized expenses, and (4) adds a vitest coverage check, `src/domain/auditCoverage.test.ts`, that runs every registered deletion path against a finalized expense and fails if any path writes no entry or an incomplete one. Because `npm test` is `vitest run`, the check is part of the standard run with no extra wiring.
scope:
  - description: |
      Add an optional `finalized` flag to the Expense model so finalized vs non-finalized expenses can be told apart.
      ```ts
      export interface Expense {
        // ...existing fields
        finalized?: boolean; // true = finalized; absent/false = not finalized
      }
      ```
    files:
      - src/domain/expense.ts
    rationale: |
      AC9 requires distinguishing finalized from non-finalized expenses and no such field exists today. Optional, so all stored expenses stay valid (absent = not finalized, current behaviour unchanged).
  - description: |
      Create the audit log module, stored in localStorage under its own key `expenseAuditLog` (ADR-0012).
      ```ts
      export interface AuditEntry {
        action: "delete";
        deletedBy: string;      // deleting user id
        deletedAt: number;      // Date.now() at deletion
        expense: Expense;       // full snapshot, all fields as at deletion
      }
      export function loadAuditLog(): AuditEntry[];
      export function appendAuditEntry(entry: AuditEntry): boolean; // false when storage write throws
      export function findAuditGaps(expense: Expense, entries: AuditEntry[]): string[];
      // findAuditGaps returns [] when a complete entry exists for expense.id, else
      // reasons such as "no-entry", "missing-user", "missing-timestamp", "missing-details"
      ```
      `appendAuditEntry` wraps `localStorage.setItem` in try/catch and returns false on failure. `findAuditGaps` is the pure checker used by the coverage gate; "missing-details" means the entry's `expense` is not deeply equal to the expense as it was before deletion.
    files:
      - src/domain/auditLog.ts
      - src/domain/auditLog.test.ts
    rationale: |
      Single place that owns the audit record shape and the completeness rule, so the gate and the production write agree on what "complete" means.
  - description: |
      Change `deleteExpense` so a finalized expense is audited before removal.
      ```ts
      export type DeleteResult =
        | { ok: true; expenses: Expense[] }
        | { ok: false; error: "invalid-id" | "not-found" | "forbidden" | "audit-failed" };
      ```
      After the existing id / not-found / forbidden checks: if `expense.finalized` is true, call `appendAuditEntry({ action: "delete", deletedBy: requesterId, deletedAt: Date.now(), expense: { ...expense } })`; if it returns false, return `{ ok: false, error: "audit-failed" }` without touching the stored expenses. Only then write the remaining list. If the final expense write throws, remove the just-written audit entry (best effort) so no audit record exists for a deletion that did not happen. Non-finalized expenses skip the audit step entirely. Also export a registry used by the gate:
      ```ts
      export const DELETION_PATHS: ReadonlyArray<{ name: string; run: (id: string, userId: string) => DeleteResult }> =
        [{ name: "deleteExpense", run: deleteExpense }];
      ```
      Any future deletion path must be added to `DELETION_PATHS` to be covered.
    files:
      - src/domain/expenseRepository.ts
    rationale: |
      ACs 1-3, 7-9. Audit-before-delete ordering gives the "refuse and keep the expense" behaviour (ACs 7, 8) without needing a transaction over localStorage.
  - description: |
      Add the user-facing message for the new error in the delete handler map in `App.tsx`, e.g. `"audit-failed": "This expense could not be deleted because the deletion could not be recorded."`. `DELETE_ERROR_MESSAGES` is typed `as const` and indexed by `result.error`, so the new key is needed to compile; the existing `role="alert"` paragraph displays it and the list is not updated.
    files:
      - src/App.tsx
      - src/App.test.tsx
    rationale: |
      AC7 says the deletion is refused; the user must see that. Reuses the existing alert region and ExpenseList/ConfirmDialog flow, no new component.
  - description: |
      Add the permanent audit coverage gate as a vitest file, picked up automatically by `npm test` (`vitest run`, AC6). For each entry in `DELETION_PATHS`, seed a finalized expense in localStorage, run the path, and assert `findAuditGaps(seeded, loadAuditLog())` is `[]`. Also include self-tests of the checker using deliberately broken fake deletion paths (no entry; entry missing user; missing timestamp; missing details) that must produce gaps — this proves the gate fails when coverage is broken (AC4).
    files:
      - src/domain/auditCoverage.test.ts
    rationale: |
      ACs 4, 5, 6. Lives under `src/` so the default vitest include pattern runs it in the standard command.
tests:
  - |
    AC1 (write first, src/domain/expenseRepository.test.ts, in describe("deleteExpense")): seed a finalized expense then
    ```ts
    deleteExpense("1", "u1");
    expect(loadAuditLog()[0].deletedBy).toBe("u1");
    ```
  - |
    AC2: same setup, with `vi.useFakeTimers(); vi.setSystemTime(1_700_000_000_000)` before the delete:
    ```ts
    expect(loadAuditLog()[0].deletedAt).toBe(1_700_000_000_000);
    ```
  - |
    AC3: seed a finalized expense with notes, createdBy and updatedAt set, then
    ```ts
    expect(loadAuditLog()[0].expense).toEqual(seeded);
    ```
  - |
    AC4 (src/domain/auditCoverage.test.ts): checker flags broken paths. For a path that deletes without logging, and for entries with `deletedBy: ""`, `deletedAt` undefined, or `expense` missing a field:
    ```ts
    expect(findAuditGaps(seeded, [])).toContain("no-entry");
    expect(findAuditGaps(seeded, [{ ...entry, deletedBy: "" }])).toContain("missing-user");
    expect(findAuditGaps(seeded, [{ ...entry, deletedAt: undefined as unknown as number }])).toContain("missing-timestamp");
    expect(findAuditGaps(seeded, [{ ...entry, expense: { ...seeded, amount: 0 } }])).toContain("missing-details");
    ```
  - |
    AC5 (src/domain/auditCoverage.test.ts): every registered path is complete.
    ```ts
    it.each(DELETION_PATHS)("$name writes a complete audit record for a finalized expense", ({ run }) => {
      const seeded = seedFinalizedExpense();
      run(seeded.id, seeded.createdBy!);
      expect(findAuditGaps(seeded, loadAuditLog())).toEqual([]);
    });
    ```
    Also assert `DELETION_PATHS.length` is at least 1 so the gate cannot pass vacuously.
  - |
    AC6: the gate is a `*.test.ts` file under `src/`, so `npm test` (`vitest run`) includes it. Verify by running the narrow form `npx vitest run src/domain/auditCoverage.test.ts` and confirming it reports the file; no config change expected (check vite config has no restrictive `test.include`).
  - |
    AC7 (expenseRepository.test.ts): make the audit write fail, e.g. spy `Storage.prototype.setItem` to throw only for key `expenseAuditLog`, then
    ```ts
    expect(deleteExpense("1", "u1")).toEqual({ ok: false, error: "audit-failed" });
    ```
    and in src/App.test.tsx: click Delete and confirm, then `expect(await screen.findByRole("alert")).toHaveTextContent(/could not be recorded/i)`.
  - |
    AC8 (expenseRepository.test.ts and App.test.tsx): after the failed audit write above,
    ```ts
    expect(loadExpenses("u1").map((e) => e.id)).toContain("1");
    ```
    and in App the expense row's text is still in the list.
  - |
    AC9 (expenseRepository.test.ts): seed an expense with `finalized` absent (and one with `finalized: false`), delete it:
    ```ts
    expect(deleteExpense("2", "u1").ok).toBe(true);
    expect(loadAuditLog()).toEqual([]);
    ```
  - |
    Regression: existing deleteExpense tests (invalid-id, not-found, forbidden, success) stay green unchanged; add `expect(loadAuditLog()).toEqual([])` to the forbidden and not-found cases so refused deletions leave no audit record.
assumptions_or_open_questions:
  - |
    The codebase has no "finalized" concept (grep of src for it found nothing) and no audit log. I assumed finalized is modelled as an optional boolean `finalized` on `Expense`, with absent meaning not finalized. Question for reviewer: is there a different intended definition (e.g. a status or lock set by another story) that this should key off instead? Nothing currently sets `finalized`, so no UI path creates one yet; production behaviour is unchanged until something does.
  - |
    The audit log lives in localStorage under a new key `expenseAuditLog` per ADR-0012, and is user-editable/not tamper-proof (accepted consequence in the ADR).
  - |
    ADR-0012 mentions a 10-second undo window then permanent purge. That is not implemented in the current `deleteExpense` (it deletes immediately) and is outside these ACs, so it is out of scope. The audit entry is written at the moment of deletion.
  - |
    The gate covers deletion paths registered in `DELETION_PATHS`; it cannot detect an unregistered new deletion function. Mitigation is the documented convention in code comments. An optional extra, not planned here, would be a static test scanning src for `localStorage.setItem` calls on the expenses key outside the repository. Tell me if you want it.
  - |
    Deleting user is the `requesterId` passed to `deleteExpense` (App passes the `local-user` id), consistent with the existing forbidden check.
estimated_points: 3
package_dependencies: []
notes: |
  ### Data & rollout

  None — new optional field and a new localStorage key only. Existing stored expenses have no `finalized` field and are read as not finalized, so they stay readable and delete exactly as before; there is no migration, backfill, setting, env var or provisioning. Rollback is safe by reverting the code; a leftover `expenseAuditLog` key is ignored.

  Context: the stack is React + TypeScript with vitest (npm); `npm test` runs `vitest run`, so the new coverage test runs in the standard command. No UI component is added or changed beyond one error string in `App.tsx`; ExpenseList and ConfirmDialog are reused as is, so the design-system token steps do not apply.

  ```mermaid
  flowchart TD
    App[App.tsx handleDelete] -->|shows audit-failed message| Repo[expenseRepository.deleteExpense]
    Repo -->|audit before remove| Audit[auditLog.ts]
    Repo --> Model[expense.ts]
    Gate[auditCoverage.test.ts] -->|runs DELETION_PATHS| Repo
    Gate -->|findAuditGaps| Audit
    classDef touched fill:#f96,color:#000
    class App,Repo,Audit,Model,Gate touched
  ```
review_focus: |
  IN scope: finalized flag, audit log module, audit-before-delete with refusal on audit failure, the vitest coverage gate, and one error message in App. OUT: the 10s undo/purge from ADR-0012, any UI to finalize expenses, reports. Riskiest part is the ordering and failure handling in `deleteExpense` (audit written first, rolled back if the removal write fails) and the assumed definition of "finalized", which the codebase does not define. The gate relies on the `DELETION_PATHS` registry by design, and the unregistered-path limitation is deliberate and listed as an open question.
