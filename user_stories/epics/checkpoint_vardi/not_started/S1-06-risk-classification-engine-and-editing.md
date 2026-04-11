# S1-06 - Risk classification engine and risk-entry editing

> **Status: NOT STARTED**
> **Stage:** S1 - MVP assessment workflow
> **Epic:** Checkpoint Vardi - Stage One assessment workflow
> **Priority:** P0

Role: **Implementation source of truth** for risk-entry editing and derived classification.  
Depends on: S1-01, S1-05

---

## Goal

Let the user evaluate each transferred risk entry and derive the final risk classification from seeded matrix data.

## Scope

- Add editable risk-entry fields needed for MVP teacher deliverables:
  - hazard
  - possible health effects
  - who is at risk
  - likelihood
  - consequence
  - current controls
  - corrective action or improvement
  - cost estimate if in scope for the current model
  - responsible owner
  - due date or completion fields as appropriate
- Compute risk level from seeded matrix truth.
- Do not trust client-supplied final classification.
- Ensure risk classification remains stable and reproducible.

## Acceptance Criteria

- User can edit the required risk-entry fields.
- Likelihood and consequence produce the derived risk classification via seeded matrix rules.
- Final classification is computed by the system.
- Persisted risk entries are ready for report export.
- The implementation supports the teacher-facing action-register output path.

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
