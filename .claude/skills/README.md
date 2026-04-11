# Claude Skills for Checkpoint Varði

These skills were adapted from the house `web` monorepo tooling and retargeted
to Vardi's single-app layout. Before relying on any of them, check for any
residual references to multi-app concepts (`admin`, `display`, `api-client`,
`Firebase auth`) that do not exist in Vardi — those should be treated as
out-of-scope and trimmed as the codebase takes shape.

Relevant skills at scaffold time:

- `vardi-web-architecture` — top-level boundaries and data flow rules
- `vardi-web-data-boundary` — Zod-first contracts (adapted: Next route handlers replace api-client package)
- `vardi-web-hooks` — hook ownership and feature scoping
- `vardi-web-unit-testing` — Vitest patterns
- `vardi-web-e2e-testing` — Playwright patterns
- `vardi-web-error-handling` — error surface and telemetry hooks
- `modern-premium-web` — visual and interaction quality bar

Skills omitted on purpose (multi-app or Firebase-specific, not applicable):
- admin-client-structure
- console-environment-architecture
