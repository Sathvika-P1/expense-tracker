---
id: ADR-0006
category: nfr
title: "NFR: performance (ET Story 004 Add Expense) \u2014 5,000 expenses, paginated\
  \ at 20 per page"
status: accepted
superseded_by: null
dimension: performance
metric: max_expenses_paginated_page_size
threshold: 5,000 expenses, paginated at 20 per page
component_id: comp_et_story_004_add_expense
needs_dedicated_tracking: true
evidence: 'Human: "Up to 5,000 expenses, pagination at 20 per page". ET-EPIC-004,
  ET-STORY-019. Code currently uses PAGE_SIZE = 10 (src/components/ExpenseList.tsx:12).'
contested: true
alternatives_considered:
- 'Virtualized list for up to 10,000 expenses: not chosen, human picked pagination.'
- '1,000 expenses at 10 per page: not chosen, lower capacity.'
consequences:
- Page size must change from 10 to 20 in the existing list.
- 5,000 records must fit in the ~5 MB localStorage quota (about 1 KB per record available).
---

## Context

Human: "Up to 5,000 expenses, pagination at 20 per page". ET-EPIC-004, ET-STORY-019. Code currently uses PAGE_SIZE = 10 (src/components/ExpenseList.tsx:12).

## Decision

max_expenses_paginated_page_size: 5,000 expenses, paginated at 20 per page

Applies to ET Story 004 Add Expense.

## Alternatives considered

- Virtualized list for up to 10,000 expenses: not chosen, human picked pagination.
- 1,000 expenses at 10 per page: not chosen, lower capacity.

## Consequences

- Page size must change from 10 to 20 in the existing list.
- 5,000 records must fit in the ~5 MB localStorage quota (about 1 KB per record available).
