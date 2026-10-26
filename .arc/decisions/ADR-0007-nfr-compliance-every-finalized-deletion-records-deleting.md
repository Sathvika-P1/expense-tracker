---
id: ADR-0007
category: nfr
title: "NFR: compliance \u2014 every finalized deletion records deleting user, timestamp\
  \ and expense details"
status: accepted
superseded_by: null
dimension: compliance
metric: audit_log_coverage
threshold: every finalized deletion records deleting user, timestamp and expense details
component_id: null
needs_dedicated_tracking: true
evidence: ET-STORY-027 acceptance criterion; human confirmed no external compliance
  regime applies, so this is a functional audit requirement only.
---

## Context

ET-STORY-027 acceptance criterion; human confirmed no external compliance regime applies, so this is a functional audit requirement only.

## Decision

audit_log_coverage: every finalized deletion records deleting user, timestamp and expense details
