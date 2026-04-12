# S1-09 Reference - Safety-Plan Container Boundary

> Boundary reference for the additive `safetyPlan` seam landed in `S1-09`.

## Purpose

Capture the architecture boundary around the additive `safetyPlan` seam landed
in `S1-09`, and define what a later explicit root/container story must still
change.

## Current shipped contract

- `workplace -> risk_assessment` remains the live runtime root for the MVP.
- `packages/db` now owns an additive `safetyPlan` table attached to
  `workplace`, but that table is intentionally unused by the current assessment
  aggregate, app projections, export mapping, and browser flow.
- `packages/db/src/load-assessment-aggregate.ts` is still the aggregate seam
  that feeds the current walkthrough, risk-register, and summary projections.
- `apps/web/lib/assessments/loadAssessmentReadModel.ts`,
  `loadAssessmentRiskRegisterProjection.ts`, and
  `loadAssessmentSummaryProjection.ts` remain the current app-owned read and
  projection seams.
- `apps/web/lib/assessments/buildAssessmentExportDocuments.ts`,
  `generateAssessmentExportBundle.ts`, `packages/schemas/src/index.ts`, and
  `packages/export/src/index.ts` now define the landed export contracts and
  rendering pipeline from `S1-08`.
- `S1-10` is the next queued story and is expected to prove the current MVP
  flow, including the export trigger, through the browser.

## Future target

- A later runtime story may introduce a top-level `safetyPlan` entity that
  belongs to a `workplace` and owns one or more `riskAssessment` rows.
- That later story must preserve the current assessment workflow semantics
  until it updates the affected read, export, and browser-test seams in the
  same slice.
- `S1-09` does not make `safetyPlan` the runtime root. It only lands the
  persistence seam and records the boundary so the later story has an explicit
  contract.

## Migration boundary for the later runtime story

- `packages/db` must own any future `safetyPlan` table, migration, foreign key,
  and query/helper changes.
- `packages/db/src/load-assessment-aggregate.ts` must be updated in the same
  story if the aggregate root or joins change.
- `apps/web/lib/assessments/loadAssessmentReadModel.ts`,
  `loadAssessmentRiskRegisterProjection.ts`, and
  `loadAssessmentSummaryProjection.ts` must either preserve their current
  public shapes or be updated together with every downstream consumer.
- `apps/web/lib/assessments/buildAssessmentExportDocuments.ts` and
  `generateAssessmentExportBundle.ts` must be treated as part of the contract
  surface, not as incidental call sites.
- Any UI or route work must stay behind the existing app-owned boundaries
  unless a later story explicitly authorizes broader navigation or product-flow
  changes.

## Ownership rules

- `packages/db` owns persistence, migrations, and aggregate loading.
- `apps/web/lib/assessments` owns app composition and export mapping.
- `packages/schemas` changes only if route or action wire contracts change.
- `packages/export` changes only if the report document contract or bundle
  behavior truly changes.
- `apps/web/app/assessments/**` changes only if a later story explicitly needs
  user-visible wording or flow updates.

## Explicit non-goals for S1-09

- No aggregate or projection shape changes.
- No export contract or bundle changes.
- No summary CTA or export readiness UI changes.
- No seeded/runtime truth changes.
- No auth, navigation, or product-flow redesign.

## Follow-up story boundary

The first code-bearing follow-up should be a separate post-`S1-10` story such
as `Introduce safety-plan root/container`. That story should explicitly list
its runtime write scope, call out the export and E2E seams it will update, and
require `pnpm test`, `pnpm typecheck`, `pnpm lint`, and `pnpm test:e2e`.
