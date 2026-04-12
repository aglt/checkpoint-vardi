# S1-17 - Language-consistent web content for the current MVP flow

> **Status: DONE**
> **Stage:** S1 - MVP assessment workflow
> **Epic:** Checkpoint Vardi - Stage One assessment workflow
> **Priority:** P1

Role: **Implementation source of truth** for app-language-consistent web copy on the current MVP assessment surfaces.  
Depends on: S1-08

---

## Context

This story is complete and merged via PR `#14`. The current MVP web flow
now resolves a temporary request-derived app display language at the
page/layout boundary, normalizes to `is` or `en`, and falls back to `is`
without treating request language as durable product truth.

App-owned copy for the start page, walkthrough, risk register, and
summary/readiness surfaces now lives in `apps/web/lib/i18n/`. Lower
assessment projections remain state-oriented and no longer own localized
display copy; page/view-owned presentation helpers now shape save-state text,
validation/runtime messaging, readiness text, and presentation-only risk labels
from stable persisted values.

Seeded checklist content continues to use the existing `@vardi/checklists`
translation/runtime seam, and export document wording remains out of scope for
this story. Verification ran locally under `node v22.22.2` with `pnpm lint`,
`pnpm typecheck`, `pnpm test`, `pnpm test:e2e`, and `pnpm build`. The final
merged implementation also hardens the request-language boundary by keeping
request parsing in `requestAppLanguage.server.ts`, keeping shared i18n modules
framework-free, and asserting that `use client` files do not import the
server-only request seam.

## Goal

Make the current MVP web flow render app-owned content consistently in the
selected app language, with Icelandic fully respected when `is` is active.

## Scope

- Identify the current language-selection truth for MVP web surfaces, or add
  the smallest app-owned seam needed to resolve one language per request/view.
- Move app-owned UI strings for the current MVP flow into a dedicated app-owned
  dictionary or equivalent language-aware seam.
- Cover the current MVP pages and in-flow surfaces:
  - start page
  - assessment walkthrough
  - risk register
  - summary and readiness UI
  - save-state messages
  - empty states
  - field labels
  - helper text
  - validation and error copy that the user sees in the page
- Ensure risk-level display labels follow the resolved app language:
  - `is`: `Lág`, `Miðlungs`, `Há`
  - `en`: `Low`, `Medium`, `High`
- Define and apply one consistent fallback rule so a page does not mix app
  languages component by component.

## Product rules

- One rendered page resolves to one app language for app-owned copy.
- When `is` is active, app-owned web content on the current MVP flow must be
  Icelandic, not mixed Icelandic and English.
- Seeded checklist and legal-reference content should keep using their existing
  translation/runtime seams.
- English stays in source code identifiers; user-facing copy moves into
  dictionaries or language-aware app seams.
- Do not treat unresolved imported legal-reference placeholders as localized
  authoritative titles.
- Do not silently redesign exports in this story. This is web-content
  consistency, not export localization.

## Out of scope

- full export-document localization
- adding new product languages beyond the current supported app surfaces
- machine translation of unresolved seed content
- auth redesign
- broader public-marketing site localization
- future Stage Two safety-plan modules

## Acceptance Criteria

- Given the current MVP start page with app language `is`, all app-owned UI
  copy on that page renders in Icelandic.
- Given the assessment walkthrough, risk register, and summary/readiness
  surfaces with app language `is`, the page does not mix English app-owned copy
  into labels, helper text, buttons, save-state pills, or user-visible messages.
- Given a rendered risk severity label with app language `is`, the user sees
  `Lág`, `Miðlungs`, or `Há` rather than English labels.
- Given app language `en`, app-owned copy resolves consistently through the
  same dictionary seam rather than inline per-component strings.
- Given a missing translation for a non-default app language, the fallback rule
  is explicit and page-consistent rather than producing mixed-language output.
- The implementation stays inside the current MVP web surfaces and does not
  widen into unrelated export or domain redesign work.

## Architecture Notes

- Keep translation ownership in `apps/web` for app-owned UI copy.
- Reuse seeded translation/runtime data from `@vardi/checklists`; do not copy
  seed text into app dictionaries.
- Prefer one small app-language resolver plus focused dictionaries over ad hoc
  per-component string branching.
- Add only the smallest testing needed to keep the language seam truthful.

## Validation And Tests

- targeted tests for language-resolved app copy where practical
- page/render tests for the most important mixed-language surfaces
- `pnpm test`
- `pnpm typecheck`
- `pnpm lint`

## Notes For Later Stories

- `S1-16` browser assertions should prefer the stabilized, language-consistent
  copy once this story lands.
- Export-document localization can be scoped separately later if the product
  explicitly requires it.

## Execution Rules

- Start by creating a new git branch and checking it out.
- Apply any repo skill, AGENTS guidance, local conventions, or project skill
  that is helpful for this story.
- Apply `vardi-web-architecture`, `vardi-web-hooks`,
  `vardi-web-error-handling`, and `vardi-web-unit-testing` as needed.
- Keep the implementation inside the scope of this story. Do not silently
  widen scope.
- After implementation, open a GitHub PR and make sure it is **not** a draft.
- If the story cannot be fully completed because of blockers, do both:
  - create a new follow-up story for the blocker or remainder
  - still open a **non-draft PR** for the work that was completed
- After merge to `main`, update the user stories and tracker to reflect the
  new truth.
- After merge to `main`, ensure local `main` is up to date, clean, and ready
  for the next story.
- Do not leave uncommitted leftovers or stale local branches behind.
