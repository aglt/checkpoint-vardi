# S1-04 - Assessment walkthrough form slice

> **Status: DONE**
> **Stage:** S1 - MVP assessment workflow
> **Epic:** Checkpoint Vardi - Stage One assessment workflow
> **Priority:** P0

Role: **Implementation source of truth** for the assessment walkthrough UI and persistence slice.  
Depends on: S1-03

---

## Context

This story is complete. `/assessments/[assessmentId]` is now the core
walkthrough surface rather than a readiness-only checkpoint. The page still
loads entirely through `apps/web/lib/assessments/loadAssessmentReadModel`,
which remains the only supported composed walkthrough read seam in app code.
That read model continues to compose persisted assessment state with
`@vardi/checklists` seeded runtime data, so the page renders seeded sections
and criteria in stable pinned order without importing seed assets directly.

The new walkthrough UI stays inside the intended ownership boundaries.
`packages/db` now owns the narrow `updateAssessmentFindingResponse` write seam,
which updates the pre-materialized `finding` row for a single
`assessmentId + criterionId + ownerId` tuple. This keeps answer persistence
bound to stable seeded `criterionId` values and preserves the S1-03 start flow
decision to materialize one persisted finding per seeded criterion up front.

`packages/schemas` now owns the narrow walkthrough save contract for
`ok`, `not ok`, and `not applicable`. The only transport boundary for this
story is `apps/web/lib/assessments/saveAssessmentCriterionResponseAction.ts`,
which resolves the placeholder owner through `getCurrentUser()` and passes that
context into the deterministic app mutation seam at
`apps/web/lib/assessments/saveAssessmentCriterionResponse.ts`. That helper
validates the save payload and calls the DB write seam without inventing
transport or locale policy of its own.

The walkthrough UI is implemented as a feature-local client component that
renders criterion title and guidance from seeded runtime data, provides the
three supported answer states (`ok`, `not ok`, `not applicable`) plus notes,
and persists them back onto the existing finding rows through the same narrow
server action and app mutation seam. A later merged follow-up in PR `#22`
kept that same persisted truth and controller ownership but simplified the UX
into a checklist-first shell: one focused criterion editor at a time, explicit
save instead of autosave, visible unsaved-work counts across sections, and a
small next-step orientation block so downstream workflow status stays readable
without turning the walkthrough back into a heavy dashboard. Reload and resume
behavior still comes from re-reading those same persisted rows through the
existing read model, without widening into risk transfer, summary, or export
work.

This completion was verified locally with `pnpm test`, `pnpm typecheck`, and
`pnpm lint` after installing workspace dependencies in this worktree. This
session used `node v25.6.1`; Node 22 remains the declared repo contract, but
that exact runtime was not available in this shell during this session. The
later UX follow-up in PR `#22` was re-validated under Node `v22` with
`pnpm --filter @vardi/web typecheck`, `pnpm --filter @vardi/web test`,
`pnpm lint`, and the targeted walkthrough Playwright workflow spec.

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

## Notes For Later Stories

- `S1-05` should consume the persisted `notOk` findings that S1-04 now records,
  without widening this story into transfer behavior.
- Risk scoring, summary capture, export readiness, and broader safety-plan
  modules remain explicitly out of scope for this slice.

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
