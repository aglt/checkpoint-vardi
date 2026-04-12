# S1-13 - Explicit risk reasoning capture

> **Status: DONE**
> **Stage:** S1 - MVP assessment workflow
> **Epic:** Checkpoint Vardi - Stage One assessment workflow
> **Priority:** P1

Role: **Implementation source of truth** for persisted reasoning alongside risk classification.  
Depends on: S1-12

---

## Context

This story is complete and is tracked in PR `#16`. `S1-06` introduced
persisted risk classification, but the saved result was still too
opaque: a risk level could exist without a persisted explanation for why
that classification was chosen. That weakened review, teaching value,
export fidelity, and the long-term usefulness of the assessment record.

`S1-13` now adds one narrow optional `classificationReasoning` field on
`risk_entry`, keeps persistence ownership in `packages/db`, reuses the
existing app-owned risk-entry save and risk-register projection seams,
and renders the field inside the existing in-flow risk-entry editor. The
same saved value now flows through app-owned export mapping into the
register report without asking `@vardi/export` to invent prose or expand
unresolved legal-reference placeholders into authoritative wording.

This slice stayed deliberately narrow: one persisted reasoning field,
update flow inside the current editor, deterministic export rendering,
and targeted regression coverage. Progression and export readiness still
derive from persisted workflow state only, but missing reasoning does
not become a blocker in this story.

## Goal

Make risk classifications understandable and reviewable by persisting
human reasoning alongside the selected risk level.

## Scope

- Add persisted reasoning fields to `risk_entry` or an equivalent owned
  child structure.
- Add update flow and UI capture inside the risk-entry editor.
- Include saved reasoning in export mapping.
- If product truth decides reasoning is required, wire readiness or
  completion consequences through the app-owned completion owner rather
  than ad hoc component logic.

### Recommended shape

Prefer the tight MVP shape unless the current risk UI already separates
likelihood and severity reasoning cleanly:

- single `classificationReasoning` field

Possible richer shape only if it fits the current product cleanly:

- `likelihoodReasoning`
- `severityReasoning`
- `overallReasoning`

### Product rules

- reasoning is persisted assessment truth
- exports must use persisted reasoning only
- unsaved local draft text never appears in export or readiness truth
- missing reasoning does not block save, completion, or export readiness in
  this slice
- reasoning fields must not invent compliance language
- unresolved legal refs remain code-only linkage, not expanded
  authoritative prose

## Acceptance Criteria

- Given a risk entry, when a user enters classification reasoning and
  saves, that reasoning persists and is returned on subsequent reads.
- Given saved reasoning, when the user edits it, the updated reasoning
  becomes the new persisted truth.
- Given the risk-entry edit flow, the user can see and edit reasoning in
  a clear section associated with classification.
- Given empty reasoning in the current MVP flow, save, completion, and
  export readiness remain unchanged until a later story makes reasoning
  required.
- Given persisted reasoning, export generation includes it in stable,
  deterministic locations in the output bundle.

## Architecture Notes

- Keep ownership with the risk-entry classification domain and the app's
  assessment/risk-entry seams.
- Do not move text shaping into `@vardi/export`.
- If readiness impact is introduced, route it through the single
  progression/completion owner from `S1-12`.

## Validation And Tests

- persistence tests
- edit/update tests
- export-mapping tests
- readiness tests if required-field behavior is added

Validation completed locally with `pnpm test`, `pnpm typecheck`, and
`pnpm lint` after installing workspace dependencies in this worktree.
This session used `node v25.6.1`; Node 22 remains the declared repo
contract, but was not directly re-verified in this shell.

## Notes For Later Stories

- `S1-14` should consume persisted reasoning when strengthening export
  framing.
- `S1-15` may later let template runtime truth require justification for
  some sectors or profiles; this story should add the saved data and UI
  seam first without inventing template rules.

## Execution Rules

- Start by creating a new git branch and checking it out.
- Apply any repo skill, AGENTS guidance, local conventions, or project
  skill that is helpful for this story.
- Apply `vardi-web-data-boundary` and `vardi-web-architecture` before
  changing persistence or export-mapping seams.
- Apply `vardi-web-error-handling`, `vardi-web-hooks`, and
  `vardi-web-unit-testing` as relevant for editing UX and regressions.
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
