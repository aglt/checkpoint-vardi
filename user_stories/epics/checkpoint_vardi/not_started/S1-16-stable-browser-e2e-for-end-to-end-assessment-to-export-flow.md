# S1-16 - Stable browser E2E for end-to-end assessment-to-export flow

> **Status: NOT STARTED**
> **Stage:** S1 - MVP assessment workflow
> **Epic:** Checkpoint Vardi - Stage One assessment workflow
> **Priority:** P1

Role: **Implementation source of truth** for the stable browser-level regression flow after the assessment/export path settles.  
Depends on: S1-10, S1-15

---

## Context

The repo already stages `S1-10` as the Playwright foundation story:
tooling, config, deterministic bootstrap, and the first meaningful
browser seams. This story is intentionally later. Its job is not to
introduce Playwright from scratch, but to lock one reliable golden-path
assessment-to-export flow once the persisted readiness and export
behavior on `main` have stabilized after the queued follow-up changes.

That means this story should wait until the real product flow is no
longer churning across action planning, completion guards, saved
reasoning, export framing, and any seed-driven runtime requirements that
affect readiness truth.

## Goal

Add one reliable browser regression test for the full assessment flow so
future changes do not silently break walkthrough, transfer,
classification, summary persistence, readiness, or export triggering.

## Scope

- Add one golden-path browser E2E for the real assessment flow.
- Add deterministic fixtures or seed/bootstrap support needed for test
  stability.
- Add an optional negative readiness/export-block case only if it stays
  cheap and stable.
- Reuse the Playwright foundation from `S1-10`; only extend setup if the
  later stabilized flow genuinely needs it.

### Target flow

- start assessment from a seeded template
- complete walkthrough responses
- transfer `notOk` findings into the risk register
- classify and edit risk entries
- save summary
- verify export readiness
- trigger export bundle successfully

### Product rules

- browser E2E must reflect real persisted product behavior
- tests must not depend on unsaved client defaults
- fixtures must align with seed/runtime truth
- selectors should stay stable and semantic rather than tied to
  accidental DOM details

## Acceptance Criteria

- Given a stable local test environment, the golden-path E2E completes
  the assessment workflow and reaches a successful export trigger.
- Given an incomplete assessment in the negative case, export remains
  blocked with truthful persisted-state behavior.
- The suite remains small, maintainable, and focused on real user
  outcomes rather than broad browser coverage.

## Architecture Notes

- E2E is a verification layer, not a place to hide weak domain or app
  boundaries.
- Do not backfill product truth into test helpers.
- Prefer explicit app/test ids and semantic UI states where needed for
  stability.
- Keep setup minimal; reuse the tooling and conventions added in
  `S1-10`.

## Validation And Tests

This story is itself a test story. At minimum:

- one golden-path browser E2E
- optionally one negative readiness/export-block case

Run and document:

- `pnpm test`
- `pnpm typecheck`
- `pnpm lint`
- `pnpm test:e2e`

## Notes For Later Stories

- Do not start this story until export behavior on `main` is accepted
  truth and the core assessment flow is no longer in active churn.
- If the golden-path suite becomes brittle because product truth is
  still moving, stop and create a narrower follow-up rather than padding
  the browser helpers with fake state.

## Execution Rules

- Start by creating a new git branch and checking it out.
- Apply any repo skill, AGENTS guidance, local conventions, or project
  skill that is helpful for this story.
- Apply `vardi-web-e2e-testing` before adding or expanding Playwright
  coverage.
- Keep the implementation inside the scope of this story. Do not
  silently widen scope.
- After implementation, open a GitHub PR and make sure it is **not** a
  draft.
- If the story cannot be fully completed because of blockers, do both:
  - create a new follow-up story for the blocker or remainder
  - still open a **non-draft PR** for the work that was completed
- After merge to `main`, update the user stories and tracker to reflect
  the new truth.
- After merge to `main`, ensure local `main` is up to date, clean, and
  ready for the next story.
- Do not leave uncommitted leftovers or stale local branches behind.
