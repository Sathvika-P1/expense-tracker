---
id: ADR-0002
category: nfr
title: "NFR: accessibility (ET Story 004 Add Expense) \u2014 WCAG 2.1 AA"
status: accepted
superseded_by: null
dimension: accessibility
metric: compliance_standard
threshold: WCAG 2.1 AA
component_id: comp_et_story_004_add_expense
needs_dedicated_tracking: true
evidence: ET-STORY-009 requires semantic table/list markup with ARIA labels meeting
  WCAG 2.1 AA. ET-STORY-021 requires an assistive-technology live region for route
  errors, and ET-STORY-020 is tagged accessibility. Threshold proposed from the ET-STORY-009
  wording; applying it project-wide is an extension for the human to confirm.
---

## Context

ET-STORY-009 requires semantic table/list markup with ARIA labels meeting WCAG 2.1 AA. ET-STORY-021 requires an assistive-technology live region for route errors, and ET-STORY-020 is tagged accessibility. Threshold proposed from the ET-STORY-009 wording; applying it project-wide is an extension for the human to confirm.

## Decision

compliance_standard: WCAG 2.1 AA

Applies to ET Story 004 Add Expense.
