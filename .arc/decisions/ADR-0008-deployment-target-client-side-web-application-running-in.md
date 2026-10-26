---
id: ADR-0008
category: deployment_target
title: "Deployment target: Client-side web application running in the user's browser,\
  \ served locally (Vite\u2026"
status: accepted
superseded_by: null
component_id: null
decision: 'Client-side web application running in the user''s browser, served locally
  (Vite dev server / local build) for now, with all expense data in browser localStorage
  and no backend, API, database or identity provider. No hosting constraint: no cloud
  provider, region, environments or budget are mandated.'
evidence: 'Human: "No hosting constraint; run locally for now" and "stay on local
  storage". Codebase scan: single React web_ui component; package.json scripts dev/build
  use Vite.'
contested: true
alternatives_considered:
- 'Static hosting on AWS, Netlify/Vercel or GitHub Pages: not chosen, human has no
  hosting constraint and runs locally for now.'
consequences:
- No deployment pipeline, environments or region topology to design yet; hosting can
  be chosen later without changing the app.
- Data lives per browser profile and is bounded by localStorage capacity.
---

## Context

Human: "No hosting constraint; run locally for now" and "stay on local storage". Codebase scan: single React web_ui component; package.json scripts dev/build use Vite.

## Decision

Client-side web application running in the user's browser, served locally (Vite dev server / local build) for now, with all expense data in browser localStorage and no backend, API, database or identity provider. No hosting constraint: no cloud provider, region, environments or budget are mandated.

## Alternatives considered

- Static hosting on AWS, Netlify/Vercel or GitHub Pages: not chosen, human has no hosting constraint and runs locally for now.

## Consequences

- No deployment pipeline, environments or region topology to design yet; hosting can be chosen later without changing the app.
- Data lives per browser profile and is bounded by localStorage capacity.
