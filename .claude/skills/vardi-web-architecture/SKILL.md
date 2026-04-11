---
name: vardi-web-architecture
description: "Top-level architecture guidance for Vardi Web. Use when planning, implementing, or reviewing feature design; deciding boundaries across apps/packages; defining data-flow contracts from API to UI; or making provider, session, auth, and runtime lifecycle decisions."
---

# Vardi Web Architecture

## Overview
Apply Vardi's architecture contracts to design changes that are deterministic, testable, and aligned with the project's runtime model.
For hook-specific contracts, read `../vardi-web-hooks/SKILL.md`.
For data boundary specifics, read `../vardi-web-data-boundary/SKILL.md`.
For environment and API client boundary invariants, read `../console-environment-architecture/SKILL.md`.

## Core Philosophy

Vardi Web uses boring, explicit, strongly-bounded architecture.

**Goals:**
- Predictable ownership
- Low coupling
- Easy reasoning
- Safe long-term growth
- `packages/api-client` as the single data boundary
- Minimal hidden magic
- Feature-local clarity over clever abstractions

**Prefer:**
- Explicit flows over "smart" abstractions
- Small, named pieces over generic frameworks
- Feature-scoped hooks over global state
- Stable boundaries between data, orchestration, and UI
- Deterministic data movement

**The app should feel like:**
```
API response → Zod validate (api-client) → TanStack Query cache → hook → page → component renders
```

**Not:**
- API response directly drives component rendering without validation
- Raw fetch calls in pages or components
- Zod schemas inlined in hooks or pages
- One giant data hook that knows about everything
- Business rules scattered across components

## Load Context First
- Read `../../../CLAUDE.md`.
- Read `../vardi-web-hooks/SKILL.md` when touching hook APIs.
- Read `../vardi-web-data-boundary/SKILL.md` when touching API client or schema code.
- Read `../console-environment-architecture/SKILL.md` when touching providers or environment config.
- Confirm package dependencies in `../../../package.json` and per-app `package.json` files.
- Confirm existing runtime path before designing new abstractions.

## Architecture Workflow
1. Frame the change:
   - Define data/API impact.
   - Define cache/query impact.
   - Define auth/session impact.
   - Define cross-app impact.
2. Place code in the correct package/layer.
3. Define source of truth and end-to-end data flow.
4. Define provider scope and lifecycle.
5. Define failure paths and error handling.
6. Define test strategy.

## Package Placement Rules
- Place all HTTP transport, Zod schemas, validated types, and API error classes in `packages/api-client`.
- Place Firebase auth initialization, token lifecycle, and auth provider in `packages/auth`.
- Place environment definitions, supported languages, and shared constants in `packages/config`.
- Place shared UI primitives (button, card, input, badge, skeleton, table) in `packages/ui`.
- Place feature-scoped query/mutation hooks in `apps/*/hooks/`.
- Place page-level orchestration (hook + component wiring) in `apps/*/app/`.
- Place presentational components in `apps/*/components/`.
- Place layout shell, sidebar, top bar in `apps/*/components/layout/`.
- Place reusable domain-agnostic UI patterns in `apps/*/components/ui/`.
- Place type definitions shared within an app in `apps/*/lib/types/`.

## LocalizedText Contract
- LocalizedText is locked to `Array<{ language: string; text: string }>` on the wire.
- Reuse the shared schema and exported types from `packages/api-client`; do not type LocalizedText inline.
- Never introduce `locale` inside a LocalizedText entry.
- Reject invalid LocalizedText payloads at the `packages/api-client` boundary.

## Layer Ownership Doctrine
- **`packages/api-client`** owns HTTP transport, Zod schema validation, Bearer token injection, 401 auto-refresh, and `ApiError` construction.
- **`packages/auth`** owns Firebase initialization, ID token acquisition, and `AuthProvider`.
- **`apps/*/hooks/`** own TanStack Query composition, cache invalidation, mutation side-effects (toast), and query key management.
- **`apps/*/app/` pages** are thin orchestration: import hooks, wire data to components, handle route params.
- **`apps/*/components/`** render from props. Stateless. No data fetching, no direct hook usage for API calls.
- **Layout components** (`AppShell`, `Sidebar`, `TopBar`, `PageHeader`) are composed by the layout shell. Pages never import `AppShell` directly.

## Per-Layer Boundaries

### Data Boundary (`packages/api-client`)
**Owns:** `fetch()` calls, Zod schema definitions, response/request validation, `ApiError`, `authFetch` wrapper, type exports.
**Rules:**
- Only file that calls `fetch()` is `packages/api-client/src/client.ts`.
- All API responses are Zod-validated before returning to consumers.
- Types are always `z.infer<typeof Schema>` — never hand-written interfaces for API data.
- `ApiError` carries HTTP status for consumer-side branching.
**Does NOT belong here:** React components, hooks, UI formatting, route logic, Firebase auth.

### Hook Layer (`apps/*/hooks/`)
**Owns:** TanStack Query hooks (`useQuery`, `useMutation`), query key management, cache invalidation, toast notifications.
**Rules:**
- Access API exclusively via `useApiClient()`.
- Export query key prefixes and key factory functions.
- Mutations invalidate caches in `onSuccess` and show toast in `onError`.
- Hooks return TanStack Query result objects — do not unwrap or re-shape into custom types.
**Does NOT do:** call `fetch()`, construct URLs, access Zod schemas, format UI strings, depend on route params.

### Page Layer (`apps/*/app/`)
**Owns:** Route parameter extraction, hook invocation, component composition, layout integration.
**Rules:**
- `'use client'` directive when using hooks or interactivity.
- Import hooks from `@/hooks/` and components from `@/components/`.
- Handle loading/error/empty states explicitly.
- Pass data from hooks to components as props.
**Does NOT do:** call API directly, define Zod schemas, contain business logic, own reusable UI.

### Component Layer (`apps/*/components/`)
**Owns:** Stateless rendering from provided props.
**Rules:**
- Components take typed props + callbacks.
- No data fetching hooks inside presentational components.
- UI-only state (open/closed, selected tab) is local `useState`.
- `PageHeader` lives in `components/layout/`; `DataTable`, `Tabs`, and `SlideOver` live in `components/ui/`.
**Does NOT take:** `useApiClient()`, `useQuery`, query results, or route params.

## Provider Ordering

The actual provider tree (from `providers.tsx` and `(authenticated)/layout.tsx`):

```
QueryClientProvider
  └─ Suspense
       └─ EnvBridge / ApiClientProvider
            └─ AuthProvider
                 └─ Toaster
                 └─ SessionProvider
                      └─ SessionGate
                           └─ RoleProvider
                                └─ AppShell
                                     └─ {page content}
```

**Rules:**
- `QueryClientProvider` is outermost (TanStack Query must be available to all hooks).
- `ApiClientProvider` wraps `AuthProvider` so downstream session logic can use `useApiClient()`.
- `SessionProvider` wraps `SessionGate` (gate checks session validity).
- `RoleProvider` wraps `AppShell` (sidebar visibility depends on role).
- Never reorder providers without verifying dependency chains.

## Data Flow Contracts

### Read path:
1. Page calls custom hook (e.g., `useUsers(options)`).
2. Hook calls `api.listUsers(options)` via `useApiClient()` inside `useQuery`.
3. `api-client` calls `authFetch(url)` — injects Bearer token, handles 401 retry.
4. Response JSON is Zod-validated via `validateResponse()`.
5. Validated data returns to hook → TanStack Query caches it.
6. Page receives `{ data, isLoading, error }` → passes to component.

### Write path:
1. Component fires callback (e.g., `onRevoke(userId)`).
2. Page calls mutation hook (e.g., `revokeAllSessions.mutate({ userId })`).
3. Hook calls `api.revokeAllSessions(userId)` via `useMutation`.
4. `api-client` calls `authFetch(url, { method: 'POST' })`.
5. On success: hook invalidates query cache + shows success toast.
6. On error: hook shows error toast.

## Mapping Boundaries

The Android DTO→Entity→Domain→UI chain collapses for web because there is no persistence layer:

| Android | Web | Where |
|---|---|---|
| DTO → Entity | API JSON → `z.infer<Schema>` | `packages/api-client/src/client.ts` via `validateResponse()` |
| Entity → Domain | (collapsed — Zod type IS the domain type) | N/A |
| Domain → UI | Hook return → component props | Page component or UI mapper function |

**UI formatting examples (page/component concerns, never hooks):**
- Duration text: "5 min", "42s"
- Badge variants based on status
- Formatted timestamps
- Section visibility flags
- Empty state messages

## ESLint-Enforced Boundaries

The root `eslint.config.mjs` enforces architectural rules:
- **Shared packages** cannot import other `@vardi/*` or `next/*` modules.
- **Apps** cannot import other apps.
- **No deep imports** into package internals (`@vardi/*/src/*`).
- **No direct `fetch()`** in apps (use `@vardi/api-client`).
- **`packages/api-client`** cannot import Firebase (auth logic belongs in `@vardi/auth`).

Additionally enforced by scripts:
- `scripts/verify-no-direct-fetch.sh` — no `fetch()` in `app/`.
- `scripts/verify-boundaries.sh` — no mock imports from `app/`.
- `scripts/check-tier-drift.sh` — tier enum consistency.

## Non-Negotiable Contracts
- `packages/api-client` is the single data boundary. All HTTP goes through `client.ts`.
- All API responses are Zod-validated at the boundary.
- Hooks orchestrate. Components render state.
- No `fetch()` in `app/` or `components/`.
- No raw `useEffect` for data fetching — use TanStack Query.
- No cross-app imports (admin cannot import from display or web).
- No deep package imports (`@vardi/*/src/*`).
- Features do not depend on other app's page components.
- LocalizedText wire format is `Array<{ language, text }>` only.

## Change Checklist
When planning a Vardi Web change, work through these questions:
1. What is the source of truth for this data?
2. Does the schema exist in `packages/api-client/src/schemas.ts`?
3. Does the client method exist in `packages/api-client/src/client.ts`?
4. Is there an existing hook in `hooks/` or do I need a new one?
5. Where do query keys live and what invalidation is needed?
6. What is the loading/error/empty state for this page?
7. Is the component stateless (props + callbacks only)?
8. Does this introduce cross-app or cross-package coupling?
9. Does this violate provider ordering?
10. Does this add `fetch()` outside `packages/api-client`?
11. Is the LocalizedText contract preserved?
12. Confirm error handling path (ApiError → toast or error state).
13. Confirm test strategy (unit hook test, E2E smoke test).

## Review Checklist
- Reject `fetch()` calls outside `packages/api-client`.
- Reject API response types not derived from Zod schemas (`z.infer`).
- Reject hooks that construct URLs or access Zod schemas directly.
- Reject components that call `useApiClient()` or `useQuery` for data fetching.
- Reject cross-app imports.
- Reject deep package imports (`@vardi/*/src/*`).
- Reject provider reordering without dependency analysis.
- Reject `useEffect` for data fetching that should be `useQuery`.
- Reject inline LocalizedText type definitions.

## Anti-Patterns

### Fetching data in a component
```tsx
// BAD — component owns data fetching
function UserBadge({ userId }: { userId: string }) {
  const api = useApiClient();
  const { data } = useQuery({ queryKey: ['user', userId], queryFn: () => api.getUser(userId) });
  return <Badge>{data?.role}</Badge>;
}
```
```tsx
// GOOD — component receives data as props
function UserBadge({ role }: { role: string }) {
  return <Badge>{role}</Badge>;
}
```

### Inline fetch in a page
```tsx
// BAD — page calls fetch directly
export default function UsersPage() {
  const [users, setUsers] = useState([]);
  useEffect(() => { fetch('/api/users').then(r => r.json()).then(setUsers); }, []);
}
```
```tsx
// GOOD — page uses hook
export default function UsersPage() {
  const { data, isLoading } = useUsers({ page: 0, size: 20 });
}
```

### God hook
```tsx
// BAD — one hook for everything
function useAppData() {
  const users = useQuery(...);
  const routines = useQuery(...);
  const personas = useQuery(...);
  return { users, routines, personas };
}
```
```tsx
// GOOD — feature-scoped hooks
function useUsers(options: ListUsersOptions) { ... }
function useAdminRoutines(options: ListAdminRoutinesOptions) { ... }
```

## Documentation Source of Truth Rules
- Each architectural concept has exactly one canonical definition in one file.
- The canonical source for architecture rules is this skill (`vardi-web-architecture/SKILL.md`).
- Other files (`../../../CLAUDE.md`, domain skills) should summarize briefly and cross-reference instead of duplicating the full rules.
- When updating an architectural rule, update the canonical source first.
