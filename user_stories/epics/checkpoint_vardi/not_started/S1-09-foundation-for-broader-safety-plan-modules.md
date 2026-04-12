# S1-09 - Foundation for broader safety-plan modules

> **Status: DEFERRED**
> **Stage:** S1/S2 bridge
> **Epic:** Checkpoint Vardi - Stage boundary guardrail
> **Priority:** P2

Role: **Implementation source of truth** for any minimal groundwork that S1 genuinely needs from the broader platform direction.  
Depends on: None

---

## Context

`S1-09` was reviewed and explicitly deferred. The current MVP root truth remains
`workplace -> risk_assessment`, and no active story currently requires a broader
container, grouping abstraction, or migration surface above that root.

This story stays parked under `not_started/` for reference only. It must not be
implemented until a later concrete vertical slice needs broader safety-plan
grouping and explicitly authorizes the required root/container change.

## Goal

Create only the minimal structural foundation needed for the broader reusable platform direction without derailing the MVP deliverable flow.

## Scope

- Add only the minimal repo-safe foundation for broader safety-plan expansion if needed by the current architecture:
  - naming
  - package seams
  - extension points
- Do not drag full accident log, chemical inventory, emergency plan, harassment policy, or training plan implementation into the MVP if not required yet.

## Acceptance Criteria

- MVP stories remain focused on assessment and report generation.
- Any broader-platform groundwork introduced here stays small and non-blocking.
- No accidental scope creep into S2 product areas.

## Deferred Until

- a real product workflow needs grouping multiple assessments under a broader
  safety-plan concept
- a later story explicitly authorizes a root/container change above
  `risk_assessment`
- the required aggregate, export, and browser-test impact is part of the same
  approved vertical slice

## Notes

- No implementation is currently accepted for this story.
- Do not introduce a `safetyPlan` table, migration, aggregate root, or export
  ownership change under `S1-09` as it stands.
- If future work becomes necessary, rewrite this story before coding begins.

## Execution Rules

- Start by creating a new git branch and checking it out.
- Apply any repo skill, AGENTS guidance, local conventions, or project skill that is helpful for this story.
- Keep the implementation inside the scope of this story. Do not silently widen scope.
- After implementation, open a GitHub PR and make sure it is **not** a draft.
- If the story cannot be fully completed because of blockers, do both:
  - create a new follow-up story for the blocker or remainder
  - still open a **non-draft PR** for the work that was completed
- After merge to `main`, update the user stories and tracker to reflect the new truth.
- After merge to `main`, ensure local `main` is up to date, clean, and ready for the next story.
- Do not leave uncommitted leftovers or stale local branches behind.
