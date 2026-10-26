---
id: ADR-0012
category: cross_cutting
title: 'Cross-cutting: audit logging'
status: accepted
superseded_by: null
component_id: null
decision: Record an audit entry (user, timestamp, expense details) on each finalized
  deletion, stored client-side in localStorage alongside the expense data. A deleted
  expense can be undone for 10 seconds, after which it is purged permanently with
  no recovery. The 'submitted or locked report' deletion block in ET-STORY-027 is
  out of scope because no reports capability exists.
evidence: 'ET-STORY-027; human: "Undo 10 seconds, then purge permanently; ignore the
  reports rule (out of scope)".'
consequences:
- Delete needs a short-lived pending-delete state (10s) before the permanent removal.
- The audit log is user-editable and not tamper-proof.
- No reports component is needed.
---

## Context

ET-STORY-027; human: "Undo 10 seconds, then purge permanently; ignore the reports rule (out of scope)".

## Decision

Record an audit entry (user, timestamp, expense details) on each finalized deletion, stored client-side in localStorage alongside the expense data. A deleted expense can be undone for 10 seconds, after which it is purged permanently with no recovery. The 'submitted or locked report' deletion block in ET-STORY-027 is out of scope because no reports capability exists.

## Consequences

- Delete needs a short-lived pending-delete state (10s) before the permanent removal.
- The audit log is user-editable and not tamper-proof.
- No reports component is needed.
