# S1-10 - Browser E2E testing foundation

> **Status: DONE**
> **Stage:** S1 - MVP assessment workflow
> **Epic:** Checkpoint Vardi - Stage One assessment workflow
> **Priority:** P1

Role: **Implementation source of truth** for browser-level end-to-end testing of the current MVP workflow.  
Depends on: S1-08

---

## Context

This story is complete. `S1-08` already established the full persisted
MVP assessment flow and export-readiness surface; `S1-10` now adds a
truthful browser-level verification seam on top of that existing flow
without reviving `S1-09`, adding `safety_plan`, or widening the root
truth beyond `workplace -> risk_assessment`.

The repo now uses Playwright as the narrow browser E2E baseline for the
current MVP workflow. The root `pnpm test:e2e` command delegates into
`apps/web`, where `playwright.config.mjs` starts the Next app on
`http://127.0.0.1:3001`, runs Chromium-only, and uses an isolated SQLite
database path for deterministic runs.

Deterministic bootstrap/reset now lives under `apps/web/e2e/`. The
isolated state directory is `apps/web/.e2e/state/`, path resolution and
cleanup live in `apps/web/e2e/support/e2eDatabase.mjs`, and the actual
SQLite recreation plus package-owned migration replay lives in
`apps/web/e2e/scripts/resetE2eDatabase.ts`. The app keeps using
`VARDI_DATABASE_PATH`, but Playwright now points that env var at the
isolated E2E database instead of normal local state.

The browser suite currently contains two specs in
`apps/web/e2e/specs/`: a smoke test for `/` boot plus seeded template
visibility, and a real assessment workflow test that starts an
assessment, persists a `Not ok` walkthrough answer, transfers the
finding into the risk register, edits and saves a transferred risk row,
saves the summary, and confirms the current MVP export/readiness surface
stays truthfully blocked until the walkthrough is complete.

This change also fixed the current MVP assessment editors so imported
server actions actually dispatch from the browser and the client-side
save state no longer stalls in `saving` because of request-id sequencing.
The repo-local Playwright guidance under
`.claude/skills/vardi-web-e2e-testing/` now documents the exact run
commands, isolated DB behavior, and extension rules for future agents.

This implementation was verified locally with `pnpm test`,
`pnpm typecheck`, `pnpm lint`, and `pnpm test:e2e`. The local shell used
`node v25.6.1`; Node 22 remains the declared repo contract, but that
exact runtime was not directly re-verified in this environment.

## Goal

Introduce a stable browser E2E testing foundation that verifies the real user workflow through the running app, using deterministic local data and the same product seams the app already ships.

## Why this story exists

The current repo has good package-level and app-level tests, but the MVP workflow is now broad enough that it needs browser-level confidence across the actual page flow:

- start assessment
- walkthrough answers
- transfer into risk register
- risk-entry editing
- summary
- export trigger

This story should add that confidence without widening into flaky network mocking, visual-regression tooling, or a giant cross-browser matrix.

The primary objective is not "add a test tool."
The primary objective is to add a trustworthy browser-level verification seam for the real product workflow.

## Scope

Add Playwright as the browser E2E framework for this repo.

Deliver:

- Playwright installation and repo wiring
- a deterministic local test strategy for seeded DB/runtime truth
- a CI-friendly Playwright config
- one smoke test
- one core MVP workflow test
- repo-local Playwright skill guidance so future agents know how to run, debug, and extend the browser suite in this repo

The resulting test foundation must be suitable for expanding later, but this story should stay narrow.

## Required approach

### Framework choice

Use **Playwright** as the browser E2E framework.

### Product-truth rule

Tests must use the real app seams.
Do not bypass product truth by inventing fake client state or replacing core flow logic with mocks.

### Data strategy rule

Prefer deterministic local DB fixture/bootstrap over brittle UI-only setup for every test.
The tests should start from a known state quickly and reproducibly.

### Boundary rule

Keep browser E2E ownership in the app/testing layer.
Do not push Playwright-specific logic into shared packages unless a file is truly package-agnostic and testing-owned.

## In scope

- Add Playwright dependencies and config
- Add `pnpm test:e2e`
- Add a local browser E2E directory and conventions
- Add a deterministic test-data/bootstrap approach for the local SQLite-backed app
- Add one smoke spec for app boot/basic page render
- Add one core workflow spec for the current MVP assessment flow
- Add minimal documentation for how to run E2E locally
- Add or update repo-local skill guidance under `.claude/skills/` for Playwright setup, execution, and suite extension
- Make the setup reasonable for CI use later

## Out of scope

- visual regression
- screenshot snapshot approval flows
- Storybook/browser-component testing
- Cypress
- Selenium/WebDriver stack
- cross-browser matrix expansion beyond the minimum default
- flaky network stubbing of product flows
- auth redesign
- backend/service decomposition
- rewriting current unit/integration tests
- broad CI pipeline redesign beyond what is necessary to make this story credible

## Expected implementation shape

### Tooling

- Install Playwright in the monorepo in the smallest sensible owner location.
- Add a clear script such as:
  - `pnpm test:e2e`
- Add any needed companion scripts for local setup only if truly necessary, for example:
  - app boot for E2E
  - deterministic DB reset/bootstrap

### Config

Add a basic Playwright config that:

- starts the Next app for tests, or cleanly targets a local running instance
- uses a deterministic base URL
- is friendly to local development and future CI
- avoids unnecessary browser/project explosion in this first story
- keeps traces/screenshots/videos sensible for debugging failures

### Deterministic data/bootstrap

Add a reproducible strategy so E2E tests do not depend on leftover local state.

This can be any narrow, honest approach that fits current architecture, for example:

- dedicated E2E database path
- DB reset before run
- deterministic seeded fixture/bootstrap helper
- narrow test-only app bootstrap seam

But it must satisfy:

- repeatable
- isolated from the user's normal local DB
- no hidden manual state required
- does not distort product truth

### Local skill guidance

Add or update the repo-local E2E skill guidance so future agents can use Playwright in this repo without rediscovering setup details.

That guidance should cover at least:

- how to run `pnpm test:e2e`
- how deterministic bootstrap/reset works
- where browser specs live
- how to target a single Playwright spec locally
- how to extend the suite without bypassing product truth

The preferred owner is the existing `.claude/skills/vardi-web-e2e-testing/` skill unless the implementation discovers a better clearly named repo-local Playwright skill.

### First smoke spec

Add one browser test that proves the app boots and the start surface is reachable.

Example scope:

- `/` loads
- seeded templates are visible
- no fatal app boot error

### First core workflow spec

Add one real workflow browser test that covers the MVP path end to end with as much real behavior as is reasonable now.

Target path:

- create/start an assessment
- answer at least one walkthrough item
- mark one item `Not ok`
- transfer findings into the risk register
- edit and save one transferred risk entry
- save the summary
- confirm export/readiness UI is present and truthful for the current product state

This test should verify real user-visible behavior, not just URL transitions.

## Acceptance criteria

- Playwright is installed and runnable in the repo.
- `pnpm test:e2e` exists and works.
- Browser E2E tests run against a deterministic local app state.
- There is one smoke test proving the app boots and the start surface renders.
- There is one core workflow test proving the current MVP flow works through the browser.
- The tests use real app seams and do not bypass product truth with fake client-only state.
- The new setup is documented enough that another engineer can run it locally.
- A repo-local skill exists or is updated with repo-specific Playwright usage guidance.
- Existing repo boundaries remain intact.

## Suggested file ownership

The exact paths can be adjusted to repo conventions, but ownership should stay roughly here:

- Playwright config: repo/app test owner
- browser test specs: app/browser test owner
- deterministic DB/bootstrap helper: app/server/test owner or a clearly scoped testing seam
- repo-local Playwright skill guidance: `.claude/skills/` owner
- no Playwright logic pushed into shared domain packages without a strong reason

## Test plan

Run and document:

- `pnpm test`
- `pnpm typecheck`
- `pnpm lint`
- `pnpm test:e2e`

The story is not done unless the E2E suite actually runs successfully in local deterministic mode.

## Notes for later stories

Future stories may extend this into:

- more workflow coverage
- export download verification
- failure-path coverage
- CI job wiring
- visual regression if later justified

But this story should stop after the first stable foundation and two meaningful specs.

## Execution rules

- Start by creating a new git branch and checking it out.
- Apply any repo skill, AGENTS guidance, local conventions, or project skill that is helpful for this story.
- Apply the `vardi-web-e2e-testing` skill if present.
- If the repo-local Playwright skill guidance is missing or too generic, add or update it in the same change as the E2E foundation work.
- Keep the implementation inside the scope of this story. Do not silently widen scope.
- After implementation, open a GitHub PR and make sure it is **not** a draft.
- If the story cannot be fully completed because of blockers, do both:
  - create a new follow-up story for the blocker or remainder
  - still open a **non-draft PR** for the work that was completed
- After merge to `main`, update the user stories and tracker to reflect the new truth.
- After merge to `main`, ensure local `main` is up to date, clean, and ready for the next story.
- Do not leave uncommitted leftovers or stale local branches behind.
