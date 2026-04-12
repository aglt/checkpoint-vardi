# S1-05 - Transfer non-compliant findings into risk register

> **Status: DONE**
> **Stage:** S1 - MVP assessment workflow
> **Epic:** Checkpoint Vardi - Stage One assessment workflow
> **Priority:** P0

Role: **Implementation source of truth** for transfer from walkthrough findings into the risk register model.  
Depends on: S1-04

---

## Context

This story is complete. Step `1b` now exists as a narrow transfer bridge from
persisted walkthrough findings into persisted `risk_entry` rows without
widening into risk scoring, editing, summary readiness, or export work. The
walkthrough still reads through
`apps/web/lib/assessments/loadAssessmentReadModel.ts`, which remains the only
supported composed walkthrough read seam in app code and now continues to
surface transferred-vs-not-yet-transferred state through the existing
`riskEntryStatus` field rather than a widened read model.

`packages/db` now owns the transactional transfer write seam:
`transferAssessmentFindingsToRiskRegister`. It re-reads owner-scoped persisted
findings by assessment, treats only persisted `status === "notOk"` rows as
eligible, pre-filters any existing `risk_entry` rows by `findingId`, and
inserts only the missing rows. Duplicate prevention is therefore two-layered:
the transfer logic filters by existing `findingId`, and the existing
`risk_entry_finding_unique` constraint remains the final guardrail if the write
seam is re-run.

The inserted risk rows keep traceability through the existing persisted chain:
`risk_entry.findingId -> finding.id -> finding.criterionId`. This story does
not add a direct `criterionId` column to `risk_entry`. Instead, the initial
`hazard` field is seeded from the stable checklist criterion title for each
eligible transferred finding, while all later-step fields remain nullable for
`S1-06`.

The app-owned mutation boundary lives in
`apps/web/lib/assessments/transferAssessmentFindingsToRiskRegister.ts` and its
server action companion. That helper validates the transfer request, re-loads
the walkthrough through `loadAssessmentReadModel`, derives the seeded
`hazardByCriterionId` map from the persisted `notOk` criteria already present
in the read model, and returns client-safe errors for invalid input, missing
assessments, or deterministic integrity failures.

The walkthrough UI now exposes a minimal Step `1b` trigger inside the existing
sidebar. It shows counts for eligible `notOk` findings, already transferred
rows, and remaining transfers, and adds a per-criterion transfer badge only for
persisted `notOk` findings. Re-running transfer is intentionally
non-destructive: it adds missing rows for current persisted `notOk` findings
and keeps any existing `risk_entry` rows in place even if a finding later
changes away from `notOk`.

This completion was verified locally with `pnpm test`, `pnpm typecheck`, and
`pnpm lint`. This session used `node v25.6.1` because no Node 22 manager was
available in the local shell; Node 22 remains the declared repo contract, but
that exact runtime was not directly re-verified here. PR: `#7`.

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

## Notes For Later Stories

- `S1-06` should consume the seeded `hazard` defaults and persisted transfer
  rows that `S1-05` now creates, then layer on risk-entry editing and derived
  classification without rethinking the transfer seam.
- Summary capture, export readiness, export generation, and broader safety-plan
  modules remain explicitly out of scope for this slice.

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
