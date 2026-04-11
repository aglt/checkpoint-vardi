# S1-04 - Assessment walkthrough form slice

> **Status: NOT STARTED**
> **Stage:** S1 - MVP assessment workflow
> **Epic:** Checkpoint Vardi - Stage One assessment workflow
> **Priority:** P0

Role: **Implementation source of truth** for the assessment walkthrough UI and persistence slice.  
Depends on: S1-03

---

## Goal

Build the core assessment form experience where the user walks through checklist items and records answers.

## Scope

- Render the selected checklist in stable seeded order:
  - sections
  - criteria
- For MVP, one seeded criterion equals one answerable assessment item.
- Support criterion-level answer capture:
  - ok
  - not ok
  - not applicable
  - notes
- Show criterion title and guidance from seeded data.
- Persist answers or findings against stable criterion ids.
- Support resume or reload without losing progress.

## Acceptance Criteria

- User can move through a seeded checklist and answer items.
- Section and criterion order matches the seeded template.
- Notes persist cleanly.
- Existing answers reload correctly.
- The form is usable on both desktop and phone-sized layouts.
- No risk register transfer yet.

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
