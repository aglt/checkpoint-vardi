# S1-14 - Compliance-oriented export framing and assessment metadata

> **Status: NOT STARTED**
> **Stage:** S1 - MVP assessment workflow
> **Epic:** Checkpoint Vardi - Stage One assessment workflow
> **Priority:** P2

Role: **Implementation source of truth** for stronger export framing, provenance, and metadata.  
Depends on: S1-13

---

## Context

`S1-08` proved that Varði can generate a teacher-deliverable export
bundle from persisted checklist, register, and summary truth. The
content is present, but the overall framing can still read like an
internal data dump instead of a serious workplace risk-assessment
deliverable with clear scope, provenance, ordering, and handling notes.

This story strengthens report framing without overclaiming legal or
regulatory status. Export rendering remains package-owned in
`@vardi/export`, while export-specific section ordering, metadata
selection, unresolved-reference handling, and prose framing remain
app-owned.

## Goal

Make exported bundles truthful, deterministic, and professionally framed
so they present as structured assessment deliverables rather than raw
data dumps.

## Scope

- Add clear export metadata sections based on persisted assessment and
  workplace truth.
- Strengthen provenance and section ordering across the export bundle.
- Add deterministic timestamp and formatting strategy.
- Represent unresolved legal references as code-only linkage wherever
  they appear.
- Include mitigation actions if `S1-11` exists by the time this story is
  implemented.

### Suggested sections

- cover or assessment metadata
- checklist observations
- risk register
- summary
- optional action plan section if mitigation actions exist
- note on unresolved coded references where relevant

### Product rules

- do not claim regulatory approval or legal compliance status the system
  does not provide
- do not invent resolved legal-reference titles for unresolved
  references
- do not use unsaved client defaults as export truth
- export ordering must remain deterministic
- provenance must reflect persisted assessment, workplace, template, and
  runtime truth only

## Acceptance Criteria

- Exported reports clearly identify workplace, assessment identity,
  available creation/export context, checklist/template provenance, and
  structured section ordering.
- Export clearly separates checklist observations, risk
  register/classification, summary, and mitigation actions if they
  exist.
- Given unresolved imported legal references, export represents them as
  code/linkage-only references and not as authoritative resolved titles.
- Given unchanged persisted state, repeated export generation produces
  stable ordering and stable included content.
- Export wording remains truthful and professional without overstating
  legal or regulatory standing.

## Architecture Notes

- Export rendering stays package-owned in `@vardi/export`.
- Export framing and mapping stay app-owned.
- Avoid slipping domain behavior changes into document-layout work unless
  explicitly required and documented.
- Keep future "official template" or "country pack" work safely
  sliceable afterward.

## Validation And Tests

- export-mapping tests
- deterministic ordering tests
- unresolved-legal-ref representation tests
- snapshot-style document-structure tests if that pattern already exists

## Notes For Later Stories

- `S1-16` should verify the final export trigger and blocking behavior
  against this shaped output once the flow settles.
- Runtime-driven wording or required-field rules belong in `S1-15`, not
  in ad hoc export conditionals added here.

## Execution Rules

- Start by creating a new git branch and checking it out.
- Apply any repo skill, AGENTS guidance, local conventions, or project
  skill that is helpful for this story.
- Apply `vardi-web-architecture`, `vardi-web-data-boundary`, and
  `vardi-web-unit-testing` before reshaping export mapping seams.
- Keep the implementation inside the scope of this story. Do not
  silently widen scope.
- After implementation, open a GitHub PR and make sure it is **not** a
  draft.
- If the story cannot be fully completed because of blockers, do both:
  - create a new follow-up story for the blocker or remainder
  - still open a **non-draft PR** for the work that was completed
- After merge to `main`, update the user stories and tracker to reflect
  the new truth.
- After merge to `main`, ensure local `main` is up to date, clean, and
  ready for the next story.
- Do not leave uncommitted leftovers or stale local branches behind.
