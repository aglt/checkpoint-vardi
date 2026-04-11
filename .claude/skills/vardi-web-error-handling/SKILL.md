---
name: vardi-web-error-handling
description: "Error handling patterns for Vardi Web. Use when defining error types, handling API errors in hooks, mapping errors to toast notifications, implementing error states in pages, or working with ApiError and Zod validation errors."
---

# Vardi Web Error Handling

## Overview

Error handling across all layers — data boundary, hooks, and pages. Defines the `ApiError` class, the `authFetch` retry pattern, hook-level toast handling, and page-level error states.

Integrates with Vardi's existing error infrastructure:
- `ApiError` in `packages/api-client` for HTTP errors
- `validateResponse` / `validateRequest` for Zod validation errors
- `authFetch` 401 auto-refresh for auth errors
- `toast` from `sonner` for user-facing feedback
- TanStack Query's `isError` / `error` for page-level error states

## Load Context First
- Read `../vardi-web-architecture/SKILL.md` for layer ownership.
- Read `../vardi-web-data-boundary/SKILL.md` for ApiError and validation patterns.
- Read `../vardi-web-hooks/SKILL.md` for mutation onError patterns.
- Inspect existing error handling in the module under change before introducing new patterns.

---

## ApiError (`packages/api-client`)

The typed error class for HTTP failures:

```typescript
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}
```

Thrown in `client.ts` when `response.ok` is false:

```typescript
if (!response.ok) {
  throw new ApiError(`API error: ${response.status} ${response.statusText}`, response.status);
}
```

---

## Error Handling by Layer

| Error origin | Catch in | Mechanism | Example |
|---|---|---|---|
| HTTP non-ok response | `client.ts` | Throw `ApiError` with status | 404 → `new ApiError("...", 404)` |
| Zod validation failure | `client.ts` | Throw `Error` with field paths | `"Invalid listUsers response: role: Invalid enum value"` |
| 401 Unauthorized | `authFetch` in `client.ts` | Auto-refresh, retry, or redirect | `config.onAuthRequired?.()` |
| Network failure | `client.ts` / TanStack Query | `TypeError` propagates | `fetch failed` |
| Mutation failure | Hook `onError` | `toast.error()` | `"Failed to revoke sessions"` |
| Query failure | Page component | `isError` + error UI | `<ErrorState onRetry={refetch} />` |

---

## Exception Handling Philosophy

- **Expected failures** (4xx, network, validation) are handled explicitly at the right layer.
- **Unexpected failures** (unhandled throws) bubble up to TanStack Query or React Error Boundary.
- **Auth failures** are handled automatically by `authFetch` — features do not need auth-specific error handling.
- **Never swallow errors silently.** Every error path must either show user feedback or propagate.

---

## authFetch Error Flow

```
Request → authFetch injects Bearer token → fetch()
    ├─ 2xx → validate response → return data
    ├─ 401 → tryRefresh() → retry original request
    │    ├─ Refresh success → retry succeeds → return data
    │    └─ Refresh fails → config.onAuthRequired() → redirect to login
    ├─ 4xx/5xx → throw ApiError(status)
    └─ Network error → throw TypeError (fetch failed)
```

The `tryRefresh()` function deduplicates concurrent refresh attempts — multiple 401s share a single refresh promise.

---

## Mutation Error Pattern

Per hook contracts: mutations show toast on error.

```typescript
export function useRevokeAllSessions() {
  const api = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId }: { userId: string }) =>
      api.revokeAllSessions(userId),
    onSuccess: (data, { userId }) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users", userId] });
      toast.success(`Revoked ${data.revoked_count} session(s) successfully`);
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to revoke sessions",
      );
    },
  });
}
```

### Error message extraction:
```typescript
// Standard pattern for onError:
onError: (error) => {
  toast.error(
    error instanceof Error ? error.message : "Operation failed",
  );
},
```

### Status-aware error messages:
When the UI needs to differentiate error types:
```typescript
onError: (error) => {
  if (error instanceof ApiError) {
    switch (error.status) {
      case 404: toast.error("Item not found"); break;
      case 409: toast.error("Conflict — item was modified by another user"); break;
      case 429: toast.error("Too many requests — please wait"); break;
      default: toast.error(error.message);
    }
  } else {
    toast.error("An unexpected error occurred");
  }
},
```

---

## Query Error Pattern

Pages handle query errors via TanStack Query's `isError`. In this repo, prefer `ErrorState` for failures and `EmptyState` only for truly empty data:

```tsx
export default function UsersPage() {
  const queryClient = useQueryClient();
  const { data, isLoading, isError, error } = useUsers(options);

  if (isLoading) return <LoadingSkeleton />;

  if (isError) {
    return (
      <ErrorState
        message={error instanceof Error ? error.message : "Failed to load users"}
        onRetry={() =>
          queryClient.invalidateQueries({ queryKey: ["admin", "users"], exact: false })
        }
      />
    );
  }

  if (!data || data.content.length === 0) {
    return <EmptyState title="No users found" description="Try adjusting your filters" />;
  }

  return <UsersTable users={data.content} />;
}
```

### Rules:
- Always check `isLoading` before `isError` (loading takes priority).
- Always provide a retry action for recoverable errors.
- Prefer `ErrorState` or the feature-local error-state component for query failures.
- Reserve `EmptyState` for zero-data states, not recoverable failures.
- Never store error text in component state - use TanStack Query's `error` directly.

---

## Zod Validation Errors

When `validateResponse` or `validateRequest` fails, it throws a descriptive `Error`:

```
Invalid listUsers response: content.0.role: Invalid enum value; expected 'admin' | 'staff' | 'user', received 'superadmin'
```

These are programming errors (API contract mismatch), not user-facing errors. They propagate to TanStack Query's `error` state and should surface through the page's normal error UI.

**Do not catch Zod validation errors in hooks.** They indicate a schema/API mismatch that needs developer attention.

---

## React Error Boundary

There is no shared Error Boundary pattern wired into the admin console today. Default to explicit page-level loading/error handling first. If you introduce a boundary, define its fallback contract intentionally and keep TanStack Query errors on the existing page-level path.

---

## Error Mapping Utility

For consistent error messages across the app, create a shared mapper:

```typescript
export function mapApiErrorToMessage(error: unknown): string {
  if (error instanceof ApiError) {
    switch (error.status) {
      case 400: return "Invalid request";
      case 401: return "Authentication required";
      case 403: return "You don't have permission to do this";
      case 404: return "Not found";
      case 409: return "Conflict with existing data";
      case 429: return "Too many requests — please try again later";
      default:
        if (error.status >= 500) return "Server error — please try again";
        return error.message;
    }
  }
  if (error instanceof Error) return error.message;
  return "An unexpected error occurred";
}
```

Use in mutation hooks when the UI needs friendlier status-specific wording:
```typescript
onError: (error) => toast.error(mapApiErrorToMessage(error)),
```

---

## Never Do

- Never swallow errors silently (empty catch blocks).
- Never surface stack traces or opaque objects to users. Use `error.message` with a fallback, or add explicit status-aware mapping when the UX needs it.
- Never store error strings in component state — use TanStack Query's `error`.
- Never add auth-specific error handling in features — `authFetch` handles 401.
- Never catch Zod validation errors in hooks — they indicate contract mismatches.
- Never use `try/catch` around `useQuery` — TanStack Query handles async errors.
- Never show toast for query errors — use page-level error state instead. Toast is for mutations.

---

## Review Checklist
- [ ] Mutation hooks have `onError` with `toast.error()`.
- [ ] Mutation hooks have `onSuccess` with `toast.success()`.
- [ ] Page components handle `isLoading`, `isError`, and data states explicitly.
- [ ] Error UI includes retry action for recoverable errors.
- [ ] User-facing errors use `error.message` or an explicit fallback, not opaque objects.
- [ ] No `try/catch` wrapping `useQuery` calls.
- [ ] No auth-specific error handling in feature code (handled by `authFetch`).
- [ ] `ApiError` used for HTTP errors (not generic `Error`).
