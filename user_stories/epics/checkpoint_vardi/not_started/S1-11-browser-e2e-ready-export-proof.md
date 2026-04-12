# S1-11 - Browser E2E ready-state and export proof

> **Status: NOT STARTED**
> **Stage:** S1 - MVP assessment workflow
> **Epic:** Checkpoint Vardi - Stage One assessment workflow
> **Priority:** P1

Role: **Implementation source of truth** for the first happy-path browser proof of export-ready completion.  
Depends on: S1-10

---

## Goal

Extend the Playwright baseline so the browser suite also proves the true happy path:
complete the walkthrough truthfully, reach export-ready state, and verify the export trigger works.

## Why this story exists

`S1-10` intentionally stopped at a stable blocked-readiness baseline. That was enough to prove
Playwright setup, deterministic local bootstrap, real save/transfer seams, and truthful blocked
readiness behavior, but it does not yet protect the teacher-deliverable success path.

For Varði, successful export is first-class contract behavior. That needs its own browser-level
proof without overloading the narrower E2E foundation slice.

## Scope

- add one happy-path Playwright spec that starts from deterministic local state
- complete the walkthrough truthfully enough to unlock readiness
- verify the readiness UI flips to ready
- trigger export through the real browser surface
- verify the export trigger succeeds truthfully for the current product state

## Out of scope

- redesigning export UX
- visual regression
- multi-browser expansion
- auth redesign
- broad CI redesign beyond what is needed for this browser proof

## Acceptance Criteria

- A browser spec completes the real walkthrough path truthfully enough to unlock export readiness.
- The readiness UI reflects ready state rather than blocked state.
- The browser suite verifies the export trigger succeeds through the real app seam.
- The deterministic local E2E bootstrap remains isolated from normal local state.
- Existing E2E foundation guidance stays aligned with the expanded happy-path coverage.

## Execution Rules

- Start by creating a new git branch and checking it out.
- Apply any repo skill, AGENTS guidance, local conventions, or project skill that is helpful for this story.
- Apply the `vardi-web-e2e-testing` skill if present.
- Keep the implementation inside the scope of this story. Do not silently widen scope.
- After implementation, open a GitHub PR and make sure it is **not** a draft.
- If the story cannot be fully completed because of blockers, do both:
  - create a new follow-up story for the blocker or remainder
  - still open a **non-draft PR** for the work that was completed
- After merge to `main`, update the user stories and tracker to reflect the new truth.
- After merge to `main`, ensure local `main` is up to date, clean, and ready for the next story.
- Do not leave uncommitted leftovers or stale local branches behind.
