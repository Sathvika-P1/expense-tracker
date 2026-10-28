---
id: ADR-0001
category: component
title: ET Story 004 Add Expense
status: accepted
superseded_by: null
component_id: comp_et_story_004_add_expense
responsibility: React single-page UI containing the responsive shell and data-driven
  navigation, the add/view/edit/delete expense forms and list, the dashboard (total
  and monthly summary), and filtering/search/pagination. It persists expense records
  in browser localStorage. Per-epic modules (shell, expenses, dashboard, filtering)
  live inside this one component.
kind: web_ui
serves:
- ET-EPIC-001
- ET-EPIC-002
- ET-EPIC-003
- ET-EPIC-004
- ET-STORY-001
- ET-STORY-002
- ET-STORY-004
- ET-STORY-009
- ET-STORY-011
- ET-STORY-012
- ET-STORY-013
- ET-STORY-014
- ET-STORY-015
- ET-STORY-016
- ET-STORY-017
- ET-STORY-018
- ET-STORY-019
- ET-STORY-020
- ET-STORY-021
- ET-STORY-022
- ET-STORY-023
- ET-STORY-025
- ET-STORY-026
- ET-STORY-027
split_reason: exists in the code
evidence: 'Codebase scan: manifest at the repo root, uses React (kind_hint web_ui).
  ET-EPIC-002 and ET-STORY-004 state that data persists in localStorage. ET-STORY-025
  refers to App.tsx, AddExpenseForm and ExpenseList.'
---

## Context

Codebase scan: manifest at the repo root, uses React (kind_hint web_ui). ET-EPIC-002 and ET-STORY-004 state that data persists in localStorage. ET-STORY-025 refers to App.tsx, AddExpenseForm and ExpenseList.

Serves: ET-EPIC-001, ET-EPIC-002, ET-EPIC-003, ET-EPIC-004, ET-STORY-001, ET-STORY-002, ET-STORY-004, ET-STORY-009, ET-STORY-011, ET-STORY-012, ET-STORY-013, ET-STORY-014, ET-STORY-015, ET-STORY-016, ET-STORY-017, ET-STORY-018, ET-STORY-019, ET-STORY-020, ET-STORY-021, ET-STORY-022, ET-STORY-023, ET-STORY-025, ET-STORY-026, ET-STORY-027.

## Decision

React single-page UI containing the responsive shell and data-driven navigation, the add/view/edit/delete expense forms and list, the dashboard (total and monthly summary), and filtering/search/pagination. It persists expense records in browser localStorage. Per-epic modules (shell, expenses, dashboard, filtering) live inside this one component.

Kept separate because exists in the code.
