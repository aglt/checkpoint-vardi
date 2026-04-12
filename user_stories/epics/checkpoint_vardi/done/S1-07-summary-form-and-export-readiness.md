# S1-07 - Summary form and export readiness

> **Status: DONE**
> **Stage:** S1 - MVP assessment workflow
> **Epic:** Checkpoint Vardi - Stage One assessment workflow
> **Priority:** P0

Role: **Implementation source of truth** for summary capture and export-readiness gating.  
Depends on: S1-06

---

## Context

This story is complete and merged to `main`. `S1-06` already established the in-flow
walkthrough and risk-register editors on `/assessments/[assessmentId]`, and
`S1-07` now adds the final summary step plus the server-owned readiness gate
that `S1-08` can consume without reshaping the assessment page again.

`packages/db` now owns the narrow `upsertAssessmentSummary` write seam. It
verifies the owner-scoped assessment first, inserts the `summary` row on first
save, updates it on later saves, normalizes blank strings to `null`, and
stores the summary date as a UTC-midnight timestamp without widening into
assessment lifecycle or export state persistence.

`@vardi/schemas` now exports the strict summary save contract together with the
nested export-readiness response shape. The save input accepts the six summary
fields, preserves draft-friendly partial saves by normalizing empty strings to
missing values, and keeps readiness as a server-derived response rather than a
client guess. The app-owned save boundary in
`apps/web/lib/assessments/saveAssessmentSummary.ts` follows the same
validation/error-mapping pattern as the earlier walkthrough and risk-entry
save seams.

`apps/web/lib/assessments/loadAssessmentSummaryProjection.ts` is the separate
summary owner seam added in this story. It loads persisted summary values,
builds workplace-derived default form values, orders transferred risk entries
by verified severity for step-6 reference, and computes export readiness only
from persisted state: walkthrough answers, transferred risk rows, verified
classifications, and required saved summary fields. `loadAssessmentReadModel`
remains walkthrough-centric and `loadAssessmentRiskRegisterProjection`
continues to own the risk-register view of transferred rows.

The assessment page now includes a third focused surface,
`AssessmentSummaryEditor`, below the risk register. It keeps summary editing,
readiness feedback, and prioritized risk reference content together while
leaving the walkthrough and risk-register components as separate owners on the
same route. The implementation was verified locally on branch
`feat/assessment-summary-export-readiness` with `pnpm test`, `pnpm typecheck`,
and `pnpm lint`. This session used `node v25.6.1`; Node 22 remains the
declared repo contract, but that exact runtime was not directly re-verified in
this shell. This completion merged to `main` in PR `#9`.

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

## Notes For Later Stories

- `S1-08` should consume the persisted summary row, prioritized risk-entry
  reference ordering, and readiness shape from this story as-is when mapping
  assessment state into export inputs.
- Export rendering, template mapping, PDF generation, and any persisted
  assessment lifecycle transitions remain explicitly out of scope for this
  slice.

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
