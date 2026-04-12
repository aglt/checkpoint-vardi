# S1-08 - Report export for checklist, register, and summary

> **Status: DONE**
> **Stage:** S1 - MVP assessment workflow
> **Epic:** Checkpoint Vardi - Stage One assessment workflow
> **Priority:** P0

Role: **Implementation source of truth** for teacher-deliverable export generation.  
Depends on: S1-07

---

## Context

This story is complete and merged to `main` in PR `#10`. `S1-07`
already established the persisted summary row and the export-readiness
gate on `/assessments/[assessmentId]`; `S1-08` now consumes those
existing walkthrough, risk-register, and summary seams as-is to generate
the teacher-deliverable export bundle without widening into broader
safety-plan modules, auth changes, or template-editing work.

`@vardi/schemas` now exports the narrow export trigger contract together
with the zip-bundle response manifest that the app and UI share. The
input stays limited to `assessmentId`, while the output returns the zip
filename, `application/zip` content type, the base64 payload, and the
six generated files that make up the bundle.

`packages/export` now owns the pure report-generation seam for MVP:
first-party DOCX and PDF rendering for checklist, register, and summary,
plus deterministic zip bundling. The package stays framework-agnostic,
does not depend on any other `@vardi/*` package, and renders six files
in a fixed order: `checklist.docx`, `checklist.pdf`, `register.docx`,
`register.pdf`, `summary.docx`, and `summary.pdf`.

`apps/web/lib/assessments/buildAssessmentExportDocuments.ts` now owns
the app-only mapping from the current assessment flow into export
documents. Checklist export uses `loadAssessmentReadModel` only and
preserves seeded section and criterion order, status, notes, and legal
reference display; unresolved imported legal references remain code-only
in exports. Register export uses
`loadAssessmentRiskRegisterProjection` only and preserves the existing
transferred-row order plus full saved risk-entry detail. Summary export
uses `loadAssessmentSummaryProjection` only and exports the persisted
step-6 saved values, not the unsaved defaults.

The app now adds a single export trigger to the summary surface through
`generateAssessmentExportBundleAction`. The server boundary validates the
request, recomputes readiness from persisted state, rejects blocked
exports with a typed `422 assessment-export-not-ready` failure, and only
then renders the bundle. `AssessmentSummaryEditor` now exposes a minimal
"Download Word + PDF bundle" CTA with ready, blocked, exporting, and
error states while keeping the rest of the summary/readiness UI intact.

This implementation was verified locally with `pnpm test`,
`pnpm typecheck`, and `pnpm lint`. The local shell used `node v25.6.1`;
Node 22 remains the declared repo contract, but that exact runtime was
not directly re-verified in this environment.

## Goal

Generate the teacher-deliverable output package from the assessment data captured in the system.

## Scope

- Export the required report outputs for MVP:
  - filled checklist output
  - action or risk register output
  - summary output
- Use seeded checklist structure and persisted assessment data.
- Own the deterministic mapping seam from persisted assessment state into export-template input data for each report.
- Use stable ordering and traceable mappings so outputs are deterministic.
- Prioritize correctness and completeness of exported content.
- Keep report generation good enough that the output can be handed to the teacher as the system-produced deliverable.

## Acceptance Criteria

- The system generates the required teacher-facing report outputs from in-app data.
- The outputs reflect the completed assessment state, not manual side editing.
- Checklist output respects seeded section and criterion order.
- Register output reflects transferred and evaluated risk entries.
- Summary output reflects the persisted summary form.
- The export implementation owns explicit, deterministic mapping from assessment state into report fields and template inputs.
- The export path proves the app can replace manual checklist and document-editor work for the MVP deliverable.

## Notes For Later Stories

- Official teacher-template fidelity, template editing, and any later
  docxtemplater + LibreOffice pipeline remain out of scope for this
  slice.
- Export-history persistence, signed URLs, auth changes, and broader
  safety-plan modules remain out of scope after `S1-08`.

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
