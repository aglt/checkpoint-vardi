---
name: vardi-web-hooks
description: "Custom hook contracts for Vardi Web. Use when creating, refactoring, or reviewing TanStack Query hooks, mutation hooks, derived state hooks, query key conventions, or cache invalidation patterns."
---

# Vardi Web Hooks

## Overview
Unify hook behavior across Vardi Web so agents and contributors can apply one deterministic contract for data fetching, mutations, and cache management.
For architecture-level boundaries, see `../vardi-web-architecture/SKILL.md`.
For data boundary specifics, see `../vardi-web-data-boundary/SKILL.md`.
For error handling patterns, see `../vardi-web-error-handling/SKILL.md`.

## Load Context First
- Read `../vardi-web-architecture/SKILL.md` for layer ownership and data flow contracts.
- Read `../vardi-web-data-boundary/SKILL.md` when the hook's API method is new or changing.
- Inspect existing hooks in `../../../apps/admin/hooks/` before creating new ones.
- Inspect existing query key patterns to avoid key conflicts.

## Non-Negotiable Hook Contracts
- Query hooks use `useQuery` from `@tanstack/react-query`.
- Mutation hooks use `useMutation` from `@tanstack/react-query`.
- All hooks access the API exclusively via `useApiClient()` from `@vardi/api-client`.
- Query hooks export a `const` key prefix and a key factory function.
- Mutation hooks invalidate relevant query caches in `onSuccess`.
- Mutation hooks show user-facing feedback via `toast` from `sonner` in `onSuccess`/`onError`.
- Hooks return TanStack Query result objects directly — do not unwrap or reshape.

## Query Hook Pattern

Canonical example from `../../../apps/admin/hooks/useUsers.ts`:

```typescript
import { useQuery } from "@tanstack/react-query";
import { useApiClient, type ListUsersOptions } from "@vardi/api-client";

export function useUsers(options: ListUsersOptions) {
  const api = useApiClient();
  return useQuery({
    queryKey: ["admin", "users", options],
    queryFn: () => api.listUsers(options),
  });
}
```

With conditional enabling from `../../../apps/admin/hooks/useUserDetail.ts`:

```typescript
import { useQuery } from "@tanstack/react-query";
import { useApiClient } from "@vardi/api-client";

export function useUserDetail(userId: string) {
  const api = useApiClient();
  return useQuery({
    queryKey: ["admin", "users", userId],
    queryFn: () => api.getUser(userId),
    enabled: !!userId,
  });
}
```

With exported key prefix and factory from `../../../apps/admin/hooks/useAdminRoutines.ts`:

```typescript
import { useQuery } from "@tanstack/react-query";
import { useApiClient, type ListAdminRoutinesOptions } from "@vardi/api-client";

export const ROUTINES_QUERY_KEY_PREFIX = ["admin", "routines"] as const;

export function routinesListKey(options: ListAdminRoutinesOptions) {
  return [
    ...ROUTINES_QUERY_KEY_PREFIX,
    {
      query: options.query ?? null,
      status: options.status ?? null,
      visibility: options.visibility ?? null,
      page: options.page ?? 0,
      size: options.size ?? 20,
      sort: options.sort ?? null,
    },
  ] as const;
}

export function useAdminRoutines(options: ListAdminRoutinesOptions = {}) {
  const api = useApiClient();
  return useQuery({
    queryKey: routinesListKey(options),
    queryFn: () => api.listAdminRoutines(options),
  });
}
```

## Mutation Hook Pattern

Canonical example from `../../../apps/admin/hooks/useSessionMutation.ts`:

```typescript
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useApiClient } from "@vardi/api-client";
import { toast } from "sonner";

export function useRevokeAllSessions() {
  const api = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId }: { userId: string }) =>
      api.revokeAllSessions(userId),
    onSuccess: (data, { userId }) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users", userId] });
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      toast.success(
        `Revoked ${data.revoked_count} session${data.revoked_count === 1 ? "" : "s"} successfully`,
      );
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to revoke sessions",
      );
    },
  });
}
```

### Mutation contract:
1. `mutationFn` calls one `api.*` method.
2. `onSuccess` invalidates affected query caches (detail + list).
3. `onSuccess` shows `toast.success()` with a meaningful message.
4. `onError` shows `toast.error()` with error message or fallback.
5. Input types are defined inline or imported from `@vardi/api-client`.

## Query Key Conventions

### Hierarchical structure
Keys follow the pattern `['admin', '<entity>', ...params]`:
```typescript
["admin", "users"]                    // list (all users)
["admin", "users", options]           // list (filtered)
["admin", "users", userId]            // detail
["admin", "routines"]                 // list prefix
["admin", "routines", { query, status, page }]  // list (filtered)
["admin", "routines", routineId]      // detail
```

### Exported prefix for invalidation
Every hook file that defines query keys exports a `const` prefix:
```typescript
export const ROUTINES_QUERY_KEY_PREFIX = ["admin", "routines"] as const;
```

This enables broad invalidation in mutation hooks:
```typescript
queryClient.invalidateQueries({ queryKey: ROUTINES_QUERY_KEY_PREFIX });
```

### Key factory functions
For complex filter objects, export a key factory that normalizes options:
```typescript
export function routinesListKey(options: ListAdminRoutinesOptions) {
  return [...ROUTINES_QUERY_KEY_PREFIX, { /* normalized fields */ }] as const;
}
```

Normalization prevents cache misses from `undefined` vs absent fields.

## Hook Knowledge Boundary

Hooks should only know:
- `useApiClient()` — to access the API client
- Query keys — hierarchical string/object arrays
- TanStack Query APIs — `useQuery`, `useMutation`, `useQueryClient`
- `toast` from `sonner` — for user feedback in mutations

Hooks must NOT know:
- `fetch()` or URL construction
- Zod schemas or `validateResponse`
- Route params or `useParams()`
- Component state or rendering concerns
- Other hooks from different feature areas

## Loading State Discipline

Never derive loading from data emptiness:

```typescript
// BAD — empty data is not a loading signal
const isLoading = !data?.content?.length;

// GOOD — use TanStack Query's explicit states
const { data, isLoading, isFetching, isError } = useUsers(options);
```

In offline-first or cache-first scenarios, stale data is shown while `isFetching` is true. `isLoading` means no cached data at all and a fetch is in progress.

### State priority for UI:
1. `isLoading` (no cache, fetching) → show skeleton/spinner
2. `isError` (fetch failed, no cache) → show error state with retry
3. `data` present → render content
4. `isFetching` while `data` exists → optionally show refresh indicator

## Cache Invalidation Rules

### After mutations — invalidate affected caches:
```typescript
onSuccess: (data, { userId }) => {
  // Invalidate detail (exact)
  queryClient.invalidateQueries({ queryKey: ["admin", "users", userId] });
  // Invalidate list (prefix — catches all filter variants)
  queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
},
```

### Optimistic updates — for instant UI feedback:
```typescript
onMutate: async ({ userId, newRole }) => {
  await queryClient.cancelQueries({ queryKey: ["admin", "users", userId] });
  const previous = queryClient.getQueryData(["admin", "users", userId]);
  queryClient.setQueryData(["admin", "users", userId], (old) => ({ ...old, role: newRole }));
  return { previous };
},
onError: (err, vars, context) => {
  queryClient.setQueryData(["admin", "users", vars.userId], context?.previous);
},
onSettled: (data, error, { userId }) => {
  queryClient.invalidateQueries({ queryKey: ["admin", "users", userId] });
},
```

Use optimistic updates only when the mutation is fast and the shape is predictable. Default to invalidation.

## Domain-to-UI Mapping

Formatting belongs in pages or components, not hooks:

```typescript
// BAD — hook formats UI strings
export function useUsers(options) {
  const query = useQuery({ ... });
  return { ...query, data: query.data?.map(u => ({ ...u, createdAtFormatted: format(u.created_at) })) };
}

// GOOD — page or component formats
function UserRow({ user }: { user: AdminUserSummary }) {
  return <td>{formatDate(user.created_at)}</td>;
}
```

**Exception:** When a page needs complex derived state from multiple queries, create a `use*ScreenModel` hook that composes queries and derives the page-specific model. This is the web equivalent of Android ViewModel `combine()` flows.

## Naming Conventions

| Thing | Convention | Example |
|---|---|---|
| Query hook | `use<Entity>(options)` or `use<Entity>Detail(id)` | `useUsers`, `useUserDetail` |
| Mutation hook | `use<Action><Entity>()` | `useRevokeAllSessions`, `useUpdateRoutine` |
| Query key prefix | `<ENTITY>_QUERY_KEY_PREFIX` | `ROUTINES_QUERY_KEY_PREFIX` |
| Key factory | `<entity>ListKey(options)` | `routinesListKey` |
| File name | `use<Entity>.ts` or `use<Action>.ts` | `useUsers.ts`, `useSessionMutation.ts` |

## Common Violations (Do Not Do)
- Do not call `fetch()` in hooks. Use `useApiClient()` exclusively.
- Do not construct URLs in hooks. The API client owns URL construction.
- Do not access Zod schemas in hooks. Validation happens in `packages/api-client`.
- Do not store fetched data in `useState`. TanStack Query is the cache.
- Do not use `useEffect` + `useState` for data fetching. Use `useQuery`.
- Do not reshape TanStack Query results into custom objects. Return the query result directly.
- Do not put `toast` calls in query hooks. Toast belongs in mutation hooks (success/error).

## Review Checklist
- [ ] Hook accesses API via `useApiClient()`, not `fetch()`.
- [ ] Query key follows hierarchical convention `["admin", "<entity>", ...]`.
- [ ] Key prefix exported as `const` for invalidation.
- [ ] Mutation invalidates affected query caches in `onSuccess`.
- [ ] Mutation shows `toast.success` / `toast.error`.
- [ ] Hook does not format UI strings or derive display values.
- [ ] Hook returns TanStack Query result object directly.
- [ ] No `useEffect` + `useState` for data that should be `useQuery`.
