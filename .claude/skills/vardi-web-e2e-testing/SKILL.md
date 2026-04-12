---
name: vardi-web-e2e-testing
description: Browser-level verification guidance for Checkpoint Vardi. Use when adding, updating, or reviewing end-to-end tests, Playwright setup, smoke coverage, or user-flow verification in this repo.
---

# Vardi Web E2E Testing

Use this skill when a story calls for browser-level proof.

## Current posture

Playwright is now the repo-local browser E2E baseline for the MVP assessment workflow. Keep the
suite intentionally small, Chromium-only, and tied to real app seams.

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

- keep specs in `apps/web/e2e/specs/`
- the Playwright config lives at `apps/web/playwright.config.mjs`
- the deterministic SQLite reset lives in `apps/web/e2e/support/e2eDatabase.mjs`
- `pnpm test:e2e` is the root entrypoint and delegates to `@vardi/web`
- one-time browser install for a fresh worktree: `pnpm --filter @vardi/web exec playwright install chromium`
- target one spec locally with `pnpm --filter @vardi/web test:e2e -- e2e/specs/<file>.spec.ts`
- the suite uses an isolated app-local DB at `apps/web/.e2e/state/checkpoint-vardi.e2e.db`
- Playwright starts Next on `http://127.0.0.1:3001` for the suite so it stays separate from the normal `pnpm dev` server on port `3000`
- avoid dependence on third-party services when a local or seeded path can prove the behavior
- if auth is not fully implemented yet, test the current dev-safe behavior explicitly instead of inventing a fake production flow
- do not add fake client state, network stubs for the product flow, or test-only routes when the real app seam can prove the behavior

## Checklist

- selector strategy is semantic
- fixtures are small and explicit
- the test proves a user-facing outcome, not framework internals
- failures are actionable from the test output
- the command needed to rerun the test is documented in the change summary
- the isolated E2E DB is reset before the suite starts
- the assertions reflect the current MVP truth, even when that truth is a blocked export state

## Anti-patterns

- testing every branch of business logic through the browser
- requiring live external credentials for basic smoke coverage
- accepting multiple contradictory outcomes as "passing"
- asserting on fragile CSS or generated IDs when roles and labels exist
