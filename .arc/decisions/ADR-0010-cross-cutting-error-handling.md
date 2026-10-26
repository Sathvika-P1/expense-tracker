---
id: ADR-0010
category: cross_cutting
title: 'Cross-cutting: error handling'
status: accepted
superseded_by: null
component_id: null
decision: Show an inline error state with Retry in the main content area when a child
  route fails to load. Keep the navigation visible and functional, and escalate the
  message after repeated failures. Show form validation errors inline on add and edit.
evidence: ET-STORY-021, ET-STORY-004, ET-STORY-022.
---

## Context

ET-STORY-021, ET-STORY-004, ET-STORY-022.

## Decision

Show an inline error state with Retry in the main content area when a child route fails to load. Keep the navigation visible and functional, and escalate the message after repeated failures. Show form validation errors inline on add and edit.
