# S1-09 - Foundation for broader safety-plan modules

> **Status: NOT STARTED**
> **Stage:** S1/S2 bridge
> **Epic:** Checkpoint Vardi - Stage boundary guardrail
> **Priority:** P2

Role: **Implementation source of truth** for the narrow additive `safetyPlan` persistence seam that prepares broader modules without changing the current MVP flow.  
Depends on: S1-08

---

## Context

`S1-08` is now merged and owns the shipped export request/response contract,
assessment export mapping seam, package-owned bundle renderer, and summary-step
download CTA. `S1-10` is now queued to prove that current assessment and export
flow through the browser.

That means the original "naming / package seams / extension points" wording is
too vague for safe parallel work. Any code-bearing attempt to add broader
safety-plan groundwork now would likely collide with the landed export seams or
the upcoming browser-test foundation.

This story is therefore narrowed to the smallest runtime foundation that still
remains non-blocking: an additive `packages/db` seam for `safetyPlan`
persistence, plus the docs that define how a later explicit root/container
story can build on it.

## Goal

Introduce an additive `safetyPlan` persistence seam in `packages/db` while
keeping the current assessment, export, and browser-test seams untouched.

## Scope

- Add a new additive `safetyPlan` table in `packages/db` with owner-scoped
  workplace attachment and future review metadata.
- Add a replayable SQLite migration for that table.
- Export the new schema seam from `packages/db` for later stories.
- Add package-level tests that prove the new table migrates cleanly and stays
  attached to workplace lifecycle without changing the current assessment
  aggregate or projections.
- Document the migration boundary for the later story that will actually make
  `safetyPlan` the runtime root/container.
- Maintain the reference at
  `user_stories/epics/checkpoint_vardi/reference/S1-09-safety-plan-container-boundary.md`.
- Keep `S1-10` as the next implementation story and keep this bridge work
  non-blocking.

## Out of Scope

- changes under `packages/schemas`
- changes under `packages/export`
- changes under `apps/web/lib/assessments`
- changes under `apps/web/app/assessments/**`
- export bundle, export readiness, or summary CTA changes
- seeded/runtime truth changes
- auth, navigation, or unrelated product-flow work

## Acceptance Criteria

- `S1-09` adds only an additive `packages/db` safety-plan persistence seam and
  does not change current MVP contracts.
- The new table migrates cleanly and can be inserted and cascaded through the
  existing workplace lifecycle.
- The story docs explicitly define the later `safetyPlan` root/container
  migration boundary and ownership rules.
- The story docs explicitly state which current seams must remain unchanged:
  aggregate loading, walkthrough/risk-register/summary projections, export
  mapping, bundle contracts, and the summary export CTA.
- The docs name the later explicit post-`S1-10` story that can introduce the
  runtime root/container change.

## Key Files

- `user_stories/epics/checkpoint_vardi/not_started/S1-09-foundation-for-broader-safety-plan-modules.md`
- `user_stories/epics/checkpoint_vardi/reference/S1-09-safety-plan-container-boundary.md`
- `packages/db/src/schema.ts`
- `packages/db/migrations/0001_s1_09_safety_plan.sql`
- `packages/db/src/assessment-persistence.test.ts`

## Notes For Later Stories

- The first root/container follow-up should be a separate story such as
  `Introduce safety-plan root/container`.
- That later story must treat the current export and browser-test seams as part
  of the change surface, not as unaffected background context.
- That later story should require `pnpm test`, `pnpm typecheck`, `pnpm lint`,
  and `pnpm test:e2e`.

## Execution Rules

- Start by creating a new git branch and checking it out.
- Apply any repo skill, AGENTS guidance, local conventions, or project skill that is helpful for this story.
- Keep the implementation inside the scope of this story. Do not silently widen scope.
- Runtime changes are limited to the additive `packages/db` seam only.
- After implementation, open a GitHub PR and make sure it is **not** a draft.
- If the story cannot be fully completed because of blockers, do both:
  - create a new follow-up story for the blocker or remainder
  - still open a **non-draft PR** for the work that was completed
- After merge to `main`, update the user stories and tracker to reflect the new truth.
- After merge to `main`, ensure local `main` is up to date, clean, and ready for the next story.
- Do not leave uncommitted leftovers or stale local branches behind.
