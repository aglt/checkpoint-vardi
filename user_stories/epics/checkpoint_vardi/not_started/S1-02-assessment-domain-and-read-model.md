# S1-02 - Assessment domain and read model

> **Status: NOT STARTED**
> **Stage:** S1 - MVP assessment workflow
> **Epic:** Checkpoint Vardi - Stage One assessment workflow
> **Priority:** P0

Role: **Implementation source of truth** for the assessment-side schema and read model.  
Depends on: S1-01

---

## Goal

Create the core DB and domain model for running an assessment from seeded checklist data.

## Scope

- Add the assessment-side schema and entities needed for MVP:
  - workplace or project root as already appropriate for repo naming
  - assessment
  - assessment checklist snapshot link or equivalent
  - assessment section or item read model as needed
  - finding or answer entity bound to stable criterion ids
  - risk entry entity for non-compliant findings
  - summary entity for final report data
- Keep runtime mapping centered on seeded checklist truth.
- Support ordered walkthrough rendering from seeded template data.
- Expose a read model or load path that gives the app enough data to render:
  - selected checklist
  - ordered sections
  - ordered criteria
  - any existing answers or findings
  - summary status
  - risk entry status

## Acceptance Criteria

- The assessment schema compiles and migrates cleanly.
- Findings are linked to stable seeded criterion ids, not fragile positional assumptions alone.
- A read model exists for loading an assessment with checklist structure plus persisted answers.
- No export generation yet.
- No broad safety-plan modules yet unless strictly required by the model.

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
