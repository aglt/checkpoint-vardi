---
name: vardi-web-data-boundary
description: "Data boundary and API client rules for Vardi Web. Use when implementing or reviewing API integration, Zod schema definitions, response/request validation, authFetch patterns, or packages/api-client changes."
---

# Vardi Web Data Boundary

## Overview
Enforce `packages/api-client` as the single data boundary: all HTTP goes through `client.ts`, all responses are Zod-validated, all types derive from schemas.
For environment selection and provider ordering, see `../console-environment-architecture/SKILL.md`.
For hook-level query/mutation contracts, see `../vardi-web-hooks/SKILL.md`.

## Load Context First
- Read `../vardi-web-architecture/SKILL.md` for layer ownership and data flow contracts.
- Read `../console-environment-architecture/SKILL.md` for provider and environment invariants.
- Inspect existing schemas in `../../../packages/api-client/src/schemas.ts` before adding new ones.
- Inspect existing client methods in `../../../packages/api-client/src/client.ts` before adding new ones.

## Package Architecture

```
packages/api-client/src/
├── client.ts       # All fetch calls, authFetch, ApiError, validateResponse/Request
├── schemas.ts      # All Zod schemas, type exports via z.infer
├── react.tsx       # ApiClientProvider, useApiClient hook
├── index.ts        # Barrel exports (public API surface)
├── client.test.ts  # Comprehensive tests for client.ts
├── admin/          # Admin-specific sort definitions
├── mock/           # Mock implementation (internal, never imported from app/)
├── reserved-handles.ts
└── tier.ts
```

## Mandatory Boundary Checks
- All HTTP calls go through `client.ts` via `authFetch()`.
- All API responses are Zod-validated via `validateResponse()` before returning.
- All request bodies for write operations are Zod-validated via `validateRequest()` before sending.
- `ApiError` carries HTTP status so consumers can branch on it.
- Types are always `z.infer<typeof Schema>` — never hand-written interfaces for API data.
- `LocalizedText` wire format is `Array<{ language: string; text: string }>` only.

## ApiError

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

Thrown when API responses are not `ok`. Carries the HTTP status code for consumer branching (e.g., 404 → "not found" vs 500 → "server error").

## Validation Functions

```typescript
function validatePayload<T>(schema: ZodType<T>, data: unknown, label: string, kind: "request" | "response"): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new Error(`Invalid ${label} ${kind}: ${issues}`);
  }
  return result.data;
}

function validateResponse<T>(schema: ZodType<T>, data: unknown, label: string): T {
  return validatePayload(schema, data, label, "response");
}

function validateRequest<T>(schema: ZodType<T>, data: unknown, label: string): T {
  return validatePayload(schema, data, label, "request");
}
```

- `validateResponse` — called after every successful API response parse.
- `validateRequest` — called before sending request bodies for write operations.
- Both use `safeParse` and throw descriptive errors with field paths.

## authFetch Pattern

The `authFetch` wrapper in `client.ts` handles:
1. **Bearer token injection** — sets `Authorization: Bearer {token}` on every request.
2. **401 auto-refresh** — on 401 response, calls `POST /auth/refresh`, retries the original request.
3. **Refresh deduplication** — concurrent 401s share a single refresh promise.
4. **Auth redirect** — if refresh fails, calls `config.onAuthRequired()` to redirect to login.
5. **Credentials** — all requests include `credentials: "include"` for cookie-based session.

```typescript
async function authFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  const response = await fetch(url, { ...init, headers, credentials: "include" });

  if (response.status === 401) {
    try {
      await tryRefresh();
      headers.set("Authorization", `Bearer ${accessToken}`);
      return fetch(url, { ...init, headers, credentials: "include" });
    } catch {
      config.onAuthRequired?.();
    }
  }

  return response;
}
```

## Schema Organization Conventions

### Entity schemas
One schema per API entity. Name: `<Entity>Schema`. Type: `z.infer<typeof Schema>`.

```typescript
export const AdminUserSummarySchema = z.object({
  id: z.string(),
  email: z.string().nullable(),
  username: z.string().nullable(),
  role: z.enum(["admin", "staff", "user"]),
  active_tier: z.enum(TIERS).nullable(),
  email_verified: z.boolean().nullable(),
  verified: z.boolean(),
  created_at: z.string().datetime().nullable(),
  updated_at: z.string().datetime().nullable(),
});

export type AdminUserSummary = z.infer<typeof AdminUserSummarySchema>;
```

### Response schemas
Compose entity schemas. Name: `<Action>ResponseSchema`.

```typescript
export const ListUsersResponseSchema = z.object({
  content: z.array(AdminUserSummarySchema),
  total_elements: z.number(),
  total_pages: z.number(),
  page: z.number(),
  size: z.number(),
});

export type ListUsersResponse = z.infer<typeof ListUsersResponseSchema>;
```

### Enum schemas
Use `z.enum()` with constant arrays for reusable enum values.

```typescript
export const ROUTINE_STATUSES = ["draft", "published", "archived"] as const;
export type RoutineStatusValue = (typeof ROUTINE_STATUSES)[number];
```

### Schema extension
Use `.extend()` for enriched detail schemas:

```typescript
export const AdminUserDetailSchema = AdminUserSummarySchema.extend({
  display_name: z.string().nullable(),
  identities: z.array(AdminUserIdentitySchema),
  active_sessions: z.array(AdminUserSessionSchema),
  tier_history: z.array(AdminUserTierEntrySchema),
});
```

## Mapping Boundaries

| Boundary | What happens | Where |
|---|---|---|
| API JSON → Zod type | `validateResponse(Schema, data, label)` | `client.ts` method |
| Request body → validated | `validateRequest(Schema, body, label)` | `client.ts` method |
| Zod type → hook return | Pass-through (TanStack Query wraps) | `hooks/use*.ts` |
| Hook return → component | Destructure `{ data, isLoading, error }` | Page component |
| Data → UI display | Format in component or page | `apps/*/app/` or `components/` |

## Adding a New Endpoint

### Step 1: Define Zod schemas in `schemas.ts`
```typescript
export const NewEntitySchema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.enum(["active", "inactive"]),
});
export type NewEntity = z.infer<typeof NewEntitySchema>;

export const ListNewEntitiesResponseSchema = z.object({
  content: z.array(NewEntitySchema),
  total_elements: z.number(),
});
export type ListNewEntitiesResponse = z.infer<typeof ListNewEntitiesResponseSchema>;
```

### Step 2: Add client method in `client.ts`
```typescript
async listNewEntities(options: ListNewEntitiesOptions = {}): Promise<ListNewEntitiesResponse> {
  const qs = buildQueryString(options);
  const url = qs ? `${baseUrl}/admin/new-entities?${qs}` : `${baseUrl}/admin/new-entities`;
  const response = await authFetch(url);
  if (!response.ok) {
    throw new ApiError(`API error: ${response.status} ${response.statusText}`, response.status);
  }
  const data: unknown = await response.json();
  return validateResponse(ListNewEntitiesResponseSchema, data, "listNewEntities");
},
```

### Step 3: Export from `index.ts`
```typescript
export { NewEntitySchema, ListNewEntitiesResponseSchema, type NewEntity, type ListNewEntitiesResponse } from "./schemas";
export { type ListNewEntitiesOptions } from "./client";
```

### Step 4: Create hook in `../../../apps/admin/hooks/`
```typescript
import { useQuery } from "@tanstack/react-query";
import { useApiClient, type ListNewEntitiesOptions } from "@vardi/api-client";

export const NEW_ENTITIES_KEY_PREFIX = ["admin", "new-entities"] as const;

export function useNewEntities(options: ListNewEntitiesOptions = {}) {
  const api = useApiClient();
  return useQuery({
    queryKey: [...NEW_ENTITIES_KEY_PREFIX, options],
    queryFn: () => api.listNewEntities(options),
  });
}
```

### Step 5: Wire into page
```tsx
export default function NewEntitiesPage() {
  const { data, isLoading } = useNewEntities();
  if (isLoading) return <Skeleton />;
  return <DataTable columns={columns} data={data?.content ?? []} />;
}
```

## Anti-Patterns

### Hand-written types instead of z.infer
```typescript
// BAD — drifts from schema
interface User { id: string; email: string; role: string; }

// GOOD — derived from schema
type User = z.infer<typeof AdminUserSummarySchema>;
```

### Validation in hooks or pages
```typescript
// BAD — validation belongs in api-client
const { data } = useQuery({
  queryFn: async () => {
    const res = await api.listUsers();
    return UserSchema.parse(res); // validation leaking into hook
  }
});

// GOOD — api-client validates internally
const { data } = useQuery({ queryFn: () => api.listUsers(options) });
```

### Missing response validation in client method
```typescript
// BAD — no Zod validation
async listUsers(): Promise<ListUsersResponse> {
  const response = await authFetch(`${baseUrl}/admin/users`);
  return response.json() as ListUsersResponse; // cast, not validated
}

// GOOD — Zod-validated
async listUsers(): Promise<ListUsersResponse> {
  const response = await authFetch(`${baseUrl}/admin/users`);
  const data: unknown = await response.json();
  return validateResponse(ListUsersResponseSchema, data, "listUsers");
}
```

## Review Checklist
- [ ] New API method validates response with `validateResponse()`.
- [ ] Write operations validate request body with `validateRequest()`.
- [ ] Types exported as `z.infer<typeof Schema>`, not hand-written.
- [ ] Schema follows naming convention: `<Entity>Schema`, `<Action>ResponseSchema`.
- [ ] New schemas exported from `index.ts` barrel.
- [ ] No `fetch()` calls outside `client.ts`.
- [ ] `ApiError` thrown with status code for non-ok responses.
- [ ] LocalizedText fields use the shared `RoutineLocalizedTextSchema`.
- [ ] No mock imports from `app/` code.
