# S1-05 - Transfer non-compliant findings into risk register

> **Status: NOT STARTED**
> **Stage:** S1 - MVP assessment workflow
> **Epic:** Checkpoint Vardi - Stage One assessment workflow
> **Priority:** P0

Role: **Implementation source of truth** for transfer from walkthrough findings into the risk register model.  
Depends on: S1-04

---

## Goal

Convert non-compliant checklist findings into structured risk and action records.

## Scope

- Add the transfer step from walkthrough findings into the risk register and action-plan model.
- Use the finding status to determine eligible non-compliant items.
- Preserve traceability from each risk entry back to the originating criterion or finding.
- Avoid duplicate transfer behavior when re-running the transfer step.

## Acceptance Criteria

- Non-compliant findings can be transferred into structured risk-entry rows.
- Risk entries remain linked to their originating finding and criterion.
- Transfer is deterministic and does not create uncontrolled duplicates.
- Compliant and not-applicable items are not transferred.
- The result is ready for later risk scoring and editing.

## Execution Rules

- Start by creating a new git branch and checking it out.
- Apply any repo skill, AGENTS guidance, local conventions, or project skill that is helpful for this story.
- If this story includes meaningful user-facing transfer UI, you must apply the `frontend-design` skill for all user-facing web work in this story, including layout, form UX, interaction states, responsive behavior, and visual hierarchy.
- Keep the implementation inside the scope of this story. Do not silently widen scope.
- After implementation, open a GitHub PR and make sure it is **not** a draft.
- If the story cannot be fully completed because of blockers, do both:
  - create a new follow-up story for the blocker or remainder
  - still open a **non-draft PR** for the work that was completed
- After merge to `main`, update the user stories and tracker to reflect the new truth.
- After merge to `main`, ensure local `main` is up to date, clean, and ready for the next story.
- Do not leave uncommitted leftovers or stale local branches behind.
