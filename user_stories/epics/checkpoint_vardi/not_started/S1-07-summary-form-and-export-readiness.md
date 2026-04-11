# S1-07 - Summary form and export readiness

> **Status: NOT STARTED**
> **Stage:** S1 - MVP assessment workflow
> **Epic:** Checkpoint Vardi - Stage One assessment workflow
> **Priority:** P0

Role: **Implementation source of truth** for summary capture and export-readiness gating.  
Depends on: S1-06

---

## Goal

Capture the summary data required for the final teacher-deliverable report package and gate export readiness.

## Scope

- Add the summary form fields required by the teacher deliverable.
- Make sure the system can determine whether an assessment is export-ready.
- Keep the summary tied to the active assessment and its evaluated findings and risk entries.
- Ensure the app flow supports the real process:
  - walkthrough
  - transfer
  - risk evaluation
  - summary
  - export

## Acceptance Criteria

- User can fill the required summary fields.
- Summary data persists and reloads correctly.
- The system can determine whether export prerequisites are met.
- No actual export rendering in this story yet.

## Execution Rules

- Start by creating a new git branch and checking it out.
- Apply any repo skill, AGENTS guidance, local conventions, or project skill that is helpful for this story.
- You must apply the `frontend-design` skill for all user-facing web work in this story, including layout, form UX, interaction states, responsive behavior, and visual hierarchy.
- Keep the implementation inside the scope of this story. Do not silently widen scope.
- After implementation, open a GitHub PR and make sure it is **not** a draft.
- If the story cannot be fully completed because of blockers, do both:
  - create a new follow-up story for the blocker or remainder
  - still open a **non-draft PR** for the work that was completed
- After merge to `main`, update the user stories and tracker to reflect the new truth.
- After merge to `main`, ensure local `main` is up to date, clean, and ready for the next story.
- Do not leave uncommitted leftovers or stale local branches behind.
