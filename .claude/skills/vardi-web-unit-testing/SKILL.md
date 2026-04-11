---
name: vardi-web-unit-testing
description: Automated test guidance for Checkpoint Vardi. Use when writing, updating, or reviewing unit and integration tests for packages, route handlers, utilities, React components, or feature modules in this repo.
---

# Vardi Web Unit Testing

Use this skill when a change benefits from automated verification below the browser level.

## Current posture

The repo is still early. If the story introduces the first tests for an area, add only the minimum
test setup the area needs instead of scaffolding a full platform all at once.

For import and catalog work, the canonical fixtures live under
`../../../packages/checklists/assets/seeds/`. Reuse the smallest relevant seed file or slice of one
instead of recreating parallel fake fixtures unless the test truly needs a minimized custom case.

## Preferred test shapes

- pure package logic: focused unit tests
- route handlers: parse -> auth -> package call -> response assertions
- component tests: only when interaction or rendering logic is non-trivial
- normalization or import code: table-driven cases with small fixtures

## Guidelines

- test behavior, not implementation details
- keep fixtures small and readable
- one test file should explain one behavior family
- prefer deterministic inputs over snapshots of large objects
- if a package is framework-agnostic, keep its tests framework-agnostic too

## Verification strategy

1. Start with the smallest unit that can prove the change.
2. Add an integration-style test only when boundaries are the risk.
3. Reuse story acceptance criteria as the test checklist.
4. Run the narrowest command that meaningfully exercises the change.

## Good candidates

- `packages/risk`
- `packages/checklists`
- route parsing helpers
- shared UI with meaningful interaction
- dictionary and formatting helpers
- seed normalization using `packages/checklists/assets/seeds/`

## Anti-patterns

- adding broad snapshots for behavior that needs explicit assertions
- mocking everything until the test no longer exercises the real contract
- introducing a full component test harness when a package-level test would prove the same thing
- adding brittle timing-based assertions when the behavior can be made deterministic
