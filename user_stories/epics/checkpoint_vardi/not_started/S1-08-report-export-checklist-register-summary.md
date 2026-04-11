# S1-08 - Report export for checklist, register, and summary

> **Status: NOT STARTED**
> **Stage:** S1 - MVP assessment workflow
> **Epic:** Checkpoint Vardi - Stage One assessment workflow
> **Priority:** P0

Role: **Implementation source of truth** for teacher-deliverable export generation.  
Depends on: S1-07

---

## Goal

Generate the teacher-deliverable output package from the assessment data captured in the system.

## Scope

- Export the required report outputs for MVP:
  - filled checklist output
  - action or risk register output
  - summary output
- Use seeded checklist structure and persisted assessment data.
- Use stable ordering and traceable mappings so outputs are deterministic.
- Prioritize correctness and completeness of exported content.
- Keep report generation good enough that the output can be handed to the teacher as the system-produced deliverable.

## Acceptance Criteria

- The system generates the required teacher-facing report outputs from in-app data.
- The outputs reflect the completed assessment state, not manual side editing.
- Checklist output respects seeded section and criterion order.
- Register output reflects transferred and evaluated risk entries.
- Summary output reflects the persisted summary form.
- The export path proves the app can replace manual checklist and document-editor work for the MVP deliverable.

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
