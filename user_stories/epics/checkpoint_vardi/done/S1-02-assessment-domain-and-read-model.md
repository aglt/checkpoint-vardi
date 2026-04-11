# S1-02 - Assessment domain and read model

> **Status: DONE**
> **Stage:** S1 - MVP assessment workflow
> **Epic:** Checkpoint Vardi - Stage One assessment workflow
> **Priority:** P0

Role: **Implementation source of truth** for the assessment-side schema and read model.  
Depends on: S1-01

---

## Context

This story is complete. The repo now has a narrow persisted assessment slice
without widening into broader safety-plan workflow structure. `workplace` is
the current assessment root, `risk_assessment` attaches directly to it, and the
assessment record pins the seeded checklist tuple through `checklistId`,
`checklistSlug`, and `checklistVersion`, plus the effective `riskMatrixId`.

The persisted walkthrough truth is centered on stable seeded criterion ids.
`finding` is the per-criterion assessment response row, not a risk register row
by default. `risk_entry` exists only as optional downstream structure linked to
an existing response row, and `summary` exists as a single optional row keyed
uniquely by `assessmentId`.

The implementation stayed boundary-tight. `packages/db` owns the schema,
replayable SQL migration, SQLite connection helpers, and the owner-scoped raw
aggregate loader. `apps/web/lib/assessments/loadAssessmentReadModel` is now the
only supported app-owned composition seam for walkthrough reads, and it is the
only place that combines persisted assessment rows with `@vardi/checklists`
runtime data.

The composed read seam validates the currently available seeded tuple rather
than promising historical seed-version retention. It deterministically fails on
unknown checklist ids, mismatched checklist slug or version, orphaned persisted
criterion ids, and unknown risk matrix ids. It also keeps `riskEntryStatus` and
`summaryStatus` as pure presence flags only, with no readiness, completeness,
transfer, or risk-classification inference.

This completion was verified locally with `pnpm test`, `pnpm typecheck`, and
`pnpm lint` on `node v25.6.1`. Node 22 remains the declared repo contract, but
that exact runtime was not available in this shell during this session.

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

## Notes For Later Stories

- `S1-03` should start assessments against the persisted `workplace` root and
  materialize runtime rows using the pinned seeded checklist and matrix ids.
- `S1-04` should treat `finding` as the persisted walkthrough response seam and
  keep overlay behavior keyed to stable `criterionId`.
- `S1-05` and later stories must not reinterpret `riskEntryStatus` or
  `summaryStatus` from this story as readiness or completeness signals. They are
  presence-only flags in `S1-02`.
- Broader safety-plan container work remains out of scope until a later story
  explicitly needs it.

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
