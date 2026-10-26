---
id: ADR-0003
category: nfr
title: "NFR: compatibility (ET Story 004 Add Expense) \u2014 320"
status: accepted
superseded_by: null
dimension: compatibility
metric: min_supported_viewport_px
threshold: '320'
component_id: comp_et_story_004_add_expense
needs_dedicated_tracking: true
evidence: "ET-STORY-020 requires the list to work at 320px and 1440px with no horizontal\
  \ scrolling. ET-EPIC-001 requires correct rendering at mobile (\u2264768px), tablet\
  \ and desktop widths. Threshold proposed from that wording."
---

## Context

ET-STORY-020 requires the list to work at 320px and 1440px with no horizontal scrolling. ET-EPIC-001 requires correct rendering at mobile (≤768px), tablet and desktop widths. Threshold proposed from that wording.

## Decision

min_supported_viewport_px: 320

Applies to ET Story 004 Add Expense.
