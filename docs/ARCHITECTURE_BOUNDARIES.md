# Architecture Boundaries

Checkpoint Varði is a strongly-bounded pnpm monorepo. This document is the
invariant list that ESLint (`eslint.config.mjs`) enforces mechanically.

## Package graph

```
apps/web
  ├─ @vardi/ui        (presentational primitives, no data)
  ├─ @vardi/schemas   (Zod contracts)
  ├─ @vardi/db        (Drizzle ORM)
  ├─ @vardi/risk      (matrix lookup + classify)
  ├─ @vardi/export    (docxtemplater templates)
  ├─ @vardi/checklists(seed loader + parser bridge)
  └─ @vardi/config    (TS + ESLint base, env constants)
```

There is only **one** app. Shared packages never import each other. Only
`apps/web` may depend on `@vardi/*`.

## Rules

1. Shared packages must not import any other `@vardi/*` package. The single
   exception is `@vardi/ui` importing from within its own `src/`.
2. Shared packages must not import from `next`, `next/*`, or `next/**`. They
   stay framework-agnostic so they can be tested in isolation with Vitest.
3. Apps must not import other apps (trivially true — there is only one, but
   the rule stays in place for future growth).
4. No deep imports into package internals (`@vardi/*/src/*`). Use the public
   exports defined in each package's `package.json#exports` field.
5. No direct `fetch()` in components. Use the typed client generated from
   `@vardi/schemas`.
6. No raw SQL strings in app code. All queries go through Drizzle in
   `@vardi/db`.

## Data flow

```
API request
  → Next route handler (apps/web/app/api)
  → Zod validate (packages/schemas)
  → getCurrentUser() ownership check
  → Drizzle query (packages/db)
  → Business rule (packages/risk, packages/checklists)
  → JSON response (Zod-typed)
  → TanStack Query cache
  → hook → page → component renders
```

Break this chain in review if you see it.

## i18n invariant

Structural identifiers are English. Human-readable strings live in sibling
translation tables keyed by `(entityId, language)`. Never inline Icelandic
text in component source. A lint rule will catch this in CI once the
dictionary pattern lands in `@vardi/ui`.

## Auth seam

`getCurrentUser()` is the single point of truth for identity. It returns a
placeholder user in dev and will resolve to a real session once auth lands.
Every mutation route imports it before touching the database.
