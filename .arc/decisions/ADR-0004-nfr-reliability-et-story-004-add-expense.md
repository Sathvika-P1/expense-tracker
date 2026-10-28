---
id: ADR-0004
category: nfr
title: 'NFR: reliability (ET Story 004 Add Expense)'
status: accepted
superseded_by: null
dimension: reliability
metric: ''
threshold: ''
component_id: comp_et_story_004_add_expense
needs_dedicated_tracking: false
evidence: ET-STORY-004 requires saved expenses to survive a reload or browser restart.
  ET-STORY-021 requires an inline error state with Retry when a child route fails
  to load, and ET-STORY-022 requires conflict and deleted-record handling. Left qualitative
  because no numeric target is stated.
---

## Context

ET-STORY-004 requires saved expenses to survive a reload or browser restart. ET-STORY-021 requires an inline error state with Retry when a child route fails to load, and ET-STORY-022 requires conflict and deleted-record handling. Left qualitative because no numeric target is stated.

## Decision

Qualitative — no checkable threshold yet.

Applies to ET Story 004 Add Expense.
