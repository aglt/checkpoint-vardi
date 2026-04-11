# S1-03 - Start assessment from seeded template

> **Status: NOT STARTED**
> **Stage:** S1 - MVP assessment workflow
> **Epic:** Checkpoint Vardi - Stage One assessment workflow
> **Priority:** P0

Role: **Implementation source of truth** for assessment initialization from seeded templates.  
Depends on: S1-01, S1-02

---

## Goal

Allow a user to create or start an assessment from one of the seeded checklists.

## Scope

- Add the flow to choose the assessment context and checklist template.
- Use the seeded checklist catalog as the source of available templates.
- Start a new assessment from a chosen checklist.
- Materialize the initial runtime state so the walkthrough can begin immediately.
- Freeze enough template identity and version data onto the assessment so exports later remain consistent.

## Acceptance Criteria

- User can start an assessment from seeded checklist data.
- The seeded woodworking and construction checklists are available as startable templates.
- Starting an assessment creates the necessary persisted runtime records.
- A fresh assessment is ready for walkthrough without manual setup.
- No full walkthrough editing yet beyond initialization.

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
