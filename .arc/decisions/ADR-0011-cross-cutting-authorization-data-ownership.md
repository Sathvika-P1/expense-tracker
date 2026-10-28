---
id: ADR-0011
category: cross_cutting
title: 'Cross-cutting: authorization / data ownership'
status: accepted
superseded_by: null
component_id: null
decision: 'Single local user: every expense belongs to the hardcoded id ''local-user''
  and data is scoped to the browser profile. Cross-user authorization and conflict
  errors in the stories are satisfied only at the domain-layer level (owner check
  against the current user id); there is no server enforcement.'
evidence: 'Human: "stay on local storage". src/domain/currentUser.ts returns the constant
  ''local-user''. Backlog: ET-STORY-009, 011, 022, 027.'
contested: true
alternatives_considered:
- 'Backend identity provider with server-side enforcement: not chosen, human keeps
  localStorage.'
consequences:
- Multi-user security is not a real guarantee; anyone with browser access can read
  or alter the data.
---

## Context

Human: "stay on local storage". src/domain/currentUser.ts returns the constant 'local-user'. Backlog: ET-STORY-009, 011, 022, 027.

## Decision

Single local user: every expense belongs to the hardcoded id 'local-user' and data is scoped to the browser profile. Cross-user authorization and conflict errors in the stories are satisfied only at the domain-layer level (owner check against the current user id); there is no server enforcement.

## Alternatives considered

- Backend identity provider with server-side enforcement: not chosen, human keeps localStorage.

## Consequences

- Multi-user security is not a real guarantee; anyone with browser access can read or alter the data.
