# S1-06 - Risk classification engine and risk-entry editing

> **Status: DONE**
> **Stage:** S1 - MVP assessment workflow
> **Epic:** Checkpoint Vardi - Stage One assessment workflow
> **Priority:** P0

Role: **Implementation source of truth** for risk-entry editing and derived classification.  
Depends on: S1-01, S1-05

---

## Context

This story is complete. `S1-05` already established the transfer seam from
persisted walkthrough findings into placeholder `risk_entry` rows, and `S1-06`
now turns those transferred rows into editable, classifiable assessment data
without widening into new transfer rules, summary readiness, export shaping, or
broader safety-plan modules.

`@vardi/risk` now owns the pure matrix-classification logic. It accepts a
structural matrix definition plus likelihood and consequence scores, returns
`low | medium | high | null`, and fails deterministically when a score falls
outside the configured range or when a matrix lookup cell is missing. The app
continues to treat `@vardi/checklists` as the only runtime seam for seeded risk
matrix truth, so `apps/web` composes the pinned assessment matrix from seeded
data while `@vardi/risk` stays package-pure.

Risk-entry persistence now uses a narrow owner-scoped update seam in
`packages/db`. `updateAssessmentRiskEntry` only updates existing transferred
rows, scopes access through `risk_entry.findingId -> finding.assessmentId`,
preserves the original `findingId` traceability chain, and writes the
server-derived `riskLevel` rather than trusting any client payload. No schema
or migration changes were needed in this story; the existing `risk_entry`
columns were sufficient for this draft-friendly editing slice.

The app-owned save seam lives in
`apps/web/lib/assessments/saveAssessmentRiskEntry.ts` and its server-action
companion. That boundary validates a strict risk-entry input contract, rejects
unexpected keys such as client-supplied `riskLevel`, resolves only the target
transferred row plus its pinned matrix from seeded truth, classifies on the
server, converts date-only inputs to UTC-midnight timestamps, and returns a
normalized client response shape with the authoritative saved `riskLevel`.

`loadAssessmentReadModel` stays walkthrough-centric in the final implementation.
A separate app-owned risk-register projection now composes the existing
walkthrough read model with transferred rows, preserves seeded criterion order,
and localizes stale or invalid persisted classifications to the affected risk
cards instead of failing the full assessment page. This keeps classification
stable and reproducible while still allowing the user to repair a bad row.

The assessment page at `/assessments/[assessmentId]` now includes a new in-flow
“Risk register” section below the walkthrough. It shows only already-transferred
rows, keeps the walkthrough and risk-editor UI as separate owners on the same
route, and gives each risk entry a manual save flow for hazard, health effects,
who is at risk, likelihood, consequence, current controls, next action, cost
estimate, responsible owner, planned date, and completed date. The saved
classification badge stays authoritative by reflecting only the
server-confirmed state, while any stale classification warning stays local to
that card. This completion merged to `main` in PR `#8` and was verified locally
with `pnpm test`, `pnpm typecheck`, and `pnpm lint`. This session used
`node v25.6.1` because no Node 22 manager was available in the local shell;
Node 22 remains the declared repo contract, but that exact runtime was not
directly re-verified here.

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
- Persisted risk entries are ready for later summary and export stories without
  introducing new transfer rules in this slice.
- The implementation supports draft-friendly in-flow editing, not final export
  contract completion.

## Notes For Later Stories

- `S1-07` should consume the persisted, server-classified risk-entry rows from
  this story when determining summary readiness and composing the prioritized
  summary flow.
- Export shaping, report generation, control-hierarchy editing, and any broader
  safety-plan module work remain explicitly out of scope for this slice.

## Execution Rules

- Start by creating a new git branch and checking it out.
- Apply any repo skill, AGENTS guidance, local conventions, or project skill that is helpful for this story.
- If this story includes the actual user-facing risk-entry editing interface, you must apply the `frontend-design` skill for all user-facing web work in this story, including layout, form UX, interaction states, responsive behavior, and visual hierarchy.
- Keep the implementation inside the scope of this story. Do not silently widen scope.
- After implementation, open a GitHub PR and make sure it is **not** a draft.
- If the story cannot be fully completed because of blockers, do both:
  - create a new follow-up story for the blocker or remainder
  - still open a **non-draft PR** for the work that was completed
- After merge to `main`, update the user stories and tracker to reflect the new truth.
- After merge to `main`, ensure local `main` is up to date, clean, and ready for the next story.
- Do not leave uncommitted leftovers or stale local branches behind.
