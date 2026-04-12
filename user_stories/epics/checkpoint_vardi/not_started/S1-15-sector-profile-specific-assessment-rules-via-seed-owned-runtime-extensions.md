# S1-15 - Sector/profile-specific assessment rules via seed-owned runtime extensions

> **Status: NOT STARTED**
> **Stage:** S1 - MVP assessment workflow
> **Epic:** Checkpoint Vardi - Stage One assessment workflow
> **Priority:** P2

Role: **Implementation source of truth** for limited seed-owned workflow rule extensions.  
Depends on: S1-14

---

## Context

`@vardi/checklists` already owns the seeded checklist/runtime truth that
the app composes into the assessment flow. The next meaningful expansion
is not to scatter hardcoded app conditionals for every sector-specific
need, but to let seed-owned runtime truth express a small reviewed set
of workflow requirements safely.

This story extends seed/runtime expressiveness without introducing a
generic rules DSL or letting shared packages bleed across the repo's
boundaries. The app continues to compose runtime truth and enforce
supported rules intentionally.

## Goal

Allow seeded templates to express a limited set of sector/profile
workflow rules so the app can model more realistic assessment behavior
without hardcoding those requirements case by case in the web layer.

## Scope

- Extend seed shape and runtime validation in `@vardi/checklists` for a
  small supported rule set.
- Expose supported rules through the public runtime seam.
- Add app consumption for those supported rules where the current
  assessment flow already has concrete UI and readiness owners.
- Keep the slice narrow and explicit; unsupported rule shapes must fail
  clearly.

### Suggested supported rule types

Keep MVP rule types small and concrete:

- `requiresJustification: boolean`
- `requiresMitigationForRiskLevels: []`
- `summaryRequiredFields: []`

### Product rules

- seed/runtime truth remains the owner of supported template behavior
- only explicitly supported rule types may be added
- structural normalization must not silently change meaning
- app consumes runtime rules; it does not invent them ad hoc
- unsupported rules fail validation clearly
- shared packages do not import each other and app remains the
  composition root

## Acceptance Criteria

- Given a seeded template with supported workflow rules, runtime loading
  validates them and exposes them through the supported public seam.
- Given an invalid rule shape, seed validation fails clearly.
- Given a template that requires mitigation actions for some risk
  outcomes, the UI and readiness behavior reflect that rule using the
  persisted action state from `S1-11`.
- Given a template that requires justification text, omission of that
  text affects completion or readiness using the persisted reasoning
  state from `S1-13`.
- Given a template that requires specific summary fields, completion or
  readiness behavior reflects the seed-defined rule rather than app-only
  conditionals.

## Architecture Notes

- Keep rule ownership intentional and reviewable.
- Do not add template-defined code execution or a generic scripting
  engine.
- Preserve backward compatibility so existing seeds remain predictable
  unless they opt into the new supported rule fields.

## Validation And Tests

- seed validation tests
- runtime loading tests
- app behavior tests for each supported rule type
- regression tests proving existing seeds still behave predictably

## Notes For Later Stories

- This story should plug into the progression/completion owner from
  `S1-12`, not bypass it.
- `S1-16` should verify at least one runtime-driven readiness behavior
  only if the flow is stable enough to keep the browser suite reliable.

## Execution Rules

- Start by creating a new git branch and checking it out.
- Apply any repo skill, AGENTS guidance, local conventions, or project
  skill that is helpful for this story.
- Apply `vardi-web-architecture`, `vardi-web-data-boundary`, and
  `vardi-web-unit-testing` before extending seed/runtime validation or
  app rule consumption.
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
