---
id: ADR-0014
category: cross_cutting
title: 'Cross-cutting: backlog duplicates'
status: accepted
superseded_by: null
component_id: null
decision: 'The backlog is left as is: ET-STORY-011 and ET-STORY-027 (both Delete Expense)
  and ET-STORY-016 and ET-STORY-026 (both Keyword search) both stay. The architecture
  supports the ET-STORY-027 delete behavior (10-second undo, then permanent purge,
  with an audit entry), which extends the permanent delete from ET-STORY-011.'
evidence: 'Human: "keep everything as it is".'
---

## Context

Human: "keep everything as it is".

## Decision

The backlog is left as is: ET-STORY-011 and ET-STORY-027 (both Delete Expense) and ET-STORY-016 and ET-STORY-026 (both Keyword search) both stay. The architecture supports the ET-STORY-027 delete behavior (10-second undo, then permanent purge, with an audit entry), which extends the permanent delete from ET-STORY-011.
