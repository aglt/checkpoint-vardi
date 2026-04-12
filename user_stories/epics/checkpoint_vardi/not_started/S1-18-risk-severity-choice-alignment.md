# S1-18 - Risk severity choice alignment with the reference workflow

> **Status: NOT STARTED**
> **Stage:** S1 - MVP assessment workflow
> **Epic:** Checkpoint Vardi - Stage One assessment workflow
> **Priority:** P1

Role: **Implementation source of truth** for aligning the current risk-severity UX with the reference workflow and screenshot-backed product expectation.  
Depends on: S1-08

---

## Context

The current MVP assessment flow persists risk classification truth and export
truth correctly enough for the existing stories, but the user-facing severity
experience does not match the reference workflow the product is being compared
against.

Today the app asks the user for numeric `Likelihood` and `Consequence` inputs in
`RiskRegisterEditor`, then shows app-owned labels such as `Saved level` and
English values like `High`. The reference workflow instead presents a named
severity choice using user-facing labels such as:

- `Lág`
- `Miðlungs`
- `Há`

This story exists to close that product gap honestly. It should not fake the
experience with client-only relabeling that drifts from saved state, and it
should not silently turn into the broader mixed-language cleanup story tracked
separately in `S1-17`.

## Goal

Align the current MVP risk-severity selection and display flow with the
reference screenshot and product expectation while keeping saved assessment,
summary, and export truth consistent.

## Scope

- Inspect the current assessment flow and decide the smallest truthful owner for
  the screenshot-aligned severity choice:
  - walkthrough
  - risk register
  - or a narrowly justified bridge between them
- Replace or adapt the current user-facing severity interaction so the product
  exposes named severity choices that match the reference workflow.
- Ensure user-facing severity labels resolve appropriately by app language:
  - `is`: `Lág`, `Miðlungs`, `Há`
  - `en`: `Low`, `Medium`, `High`
- Keep persisted assessment truth, summary truth, and export truth aligned with
  the chosen implementation.
- Update tests for the affected app-owned flow.

## Product rules

- Do not introduce fake client-only severity state.
- If the persisted model stays `low | medium | high`, the UI mapping must remain
  deterministic and truthful.
- If numeric likelihood/consequence still exist underneath, their relationship
  to the presented severity choice must be explicit and server-truthful rather
  than hidden ad hoc per component.
- User-facing severity labels must not drift between the risk register, summary,
  and export-facing mapping for the same saved state.
- Keep the broader app-language cleanup out of scope except where directly
  required for this severity fix. `S1-17` owns the wider mixed-language gap.

## Out of scope

- full language-consistency audit of every MVP page
- export-document localization beyond severity truth needed by this slice
- auth redesign
- broad assessment-flow redesign unrelated to severity choice
- speculative risk-domain remodels

## Acceptance Criteria

- Given the reference severity flow, the current product presents a named
  severity choice that matches the intended user-facing experience more closely
  than the current numeric-only UI.
- Given app language `is`, the user-facing severity labels are `Lág`,
  `Miðlungs`, and `Há`.
- Given app language `en`, the user-facing severity labels are `Low`,
  `Medium`, and `High`.
- Given a saved assessment, the displayed severity on the current page, summary
  surface, and export mapping remains truthful for the persisted state.
- Given browser interaction through the real app seam, the severity choice does
  not rely on fake local state or brittle UI-only trickery.

## Architecture Notes

- Keep the smallest owner directory that can truthfully solve the mismatch.
- Reuse any app-language seam from `S1-17` if it already exists, but do not
  block this story on a full language refactor unless genuinely necessary.
- Keep package boundaries intact: no shared-package cross-imports, no raw SQL
  outside `packages/db`, and no export-package ownership of app-language UI
  decisions.

## Validation And Tests

- targeted unit or render tests for the affected severity labels and display
- mutation or projection tests if persisted mapping changes
- browser coverage if the visible workflow changes materially
- `pnpm test`
- `pnpm typecheck`
- `pnpm lint`
- `pnpm test:e2e` if the browser-visible flow changes

## Notes For Later Stories

- `S1-17` still owns the broader mixed-language cleanup across the MVP web
  surfaces.
- `S1-16` should assert the stabilized severity experience once this story and
  any needed language-seam work have landed.

## Execution Rules

- Start by creating a new git branch and checking it out.
- Apply any repo skill, AGENTS guidance, local conventions, or project skill
  that is helpful for this story.
- Apply `vardi-web-architecture`, `vardi-web-hooks`,
  `vardi-web-error-handling`, `vardi-web-unit-testing`, and
  `vardi-web-e2e-testing` as needed.
- Keep the implementation inside the scope of this story. Do not silently widen
  scope.
- After implementation, open a GitHub PR and make sure it is **not** a draft.
- If the story cannot be fully completed because of blockers, do both:
  - create a new follow-up story for the blocker or remainder
  - still open a **non-draft PR** for the work that was completed
- After merge to `main`, update the user stories and tracker to reflect the
  new truth.
- After merge to `main`, ensure local `main` is up to date, clean, and ready
  for the next story.
- Do not leave uncommitted leftovers or stale local branches behind.
