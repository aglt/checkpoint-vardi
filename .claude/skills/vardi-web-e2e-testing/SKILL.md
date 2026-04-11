---
name: vardi-web-e2e-testing
description: Browser-level verification guidance for Checkpoint Vardi. Use when adding, updating, or reviewing end-to-end tests, Playwright setup, smoke coverage, or user-flow verification in this repo.
---

# Vardi Web E2E Testing

Use this skill when a story calls for browser-level proof.

## Current posture

Playwright is not a guaranteed baseline in this repo yet. Add E2E capability only when the story
needs it, and keep the first setup intentionally small.

## Good E2E targets

- top-level navigation and shell rendering
- a critical form flow
- route protection or session bootstrap
- a high-risk import or export journey

## Rules

- prefer a few truthful smoke paths over wide shallow coverage
- use accessible selectors first
- seed state through helpers or fixtures, not through long click scripts
- keep tests deterministic and environment-light
- one test should assert one expected outcome

## Setup guidance

- keep tests near the app, such as `apps/web/e2e/` or `tests/e2e/`
- use a local dev server in test runs
- avoid dependence on third-party services when a local or seeded path can prove the behavior
- if auth is not fully implemented yet, test the current dev-safe behavior explicitly instead of inventing a fake production flow

## Checklist

- selector strategy is semantic
- fixtures are small and explicit
- the test proves a user-facing outcome, not framework internals
- failures are actionable from the test output
- the command needed to rerun the test is documented in the change summary

## Anti-patterns

- testing every branch of business logic through the browser
- requiring live external credentials for basic smoke coverage
- accepting multiple contradictory outcomes as "passing"
- asserting on fragile CSS or generated IDs when roles and labels exist
