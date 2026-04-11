---
name: vardi-web-unit-testing
description: "Unit test patterns for Vardi Web (Vitest). Use when writing, modifying, or reviewing unit tests for hooks, API client functions, utilities, Zod schemas, or React components."
---

# Vardi Web Unit Testing

## Overview

Unit and component test patterns for Vardi Web. Covers hook tests, API client tests, utility tests, and component tests. For E2E tests against the real DEV API, see `../vardi-web-e2e-testing/SKILL.md`.

## Load Context First

- Read `../vardi-web-hooks/SKILL.md` when testing hook contracts.
- Read `../vardi-web-data-boundary/SKILL.md` when testing API client or schema code.
- Inspect existing tests in the module under test before writing new ones.
- The admin app has `passWithNoTests: true` — unit tests are a new capability for the admin.

## Current Reality Check

- `../../../packages/api-client` already has working Vitest coverage today.
- `../../../apps/admin` currently has Vitest configured, but no jsdom or Testing Library setup yet.
- If you add hook or component tests in `apps/admin`, first add the missing test dependencies and update `../../../apps/admin/vitest.config.ts` for the right environment.

## Stack

| Concern | Library | Notes |
|---|---|---|
| Test framework | Vitest 3.0 | `vitest.config.ts` per app |
| React testing | `@testing-library/react` | `render`, `screen`, `renderHook`, `waitFor` |
| TanStack Query testing | `@tanstack/react-query` | `QueryClient` wrapper per test |
| Assertions | Vitest `expect` | Built-in, Jest-compatible |
| HTTP mocking | `vi.fn()` / `vi.spyOn` | Mock `useApiClient` return |
| Component queries | `@testing-library/react` | `getByRole`, `getByText`, `getByTestId` |

## Existing Tests

The `packages/api-client` package already has real test coverage in `../../../packages/api-client/src/client.test.ts` and `../../../packages/api-client/src/__tests__/` covering:
- Zod response validation (valid and invalid payloads)
- `authFetch` retry behavior on 401
- `ApiError` construction from HTTP status codes
- Login/refresh token flows
- All endpoint method signatures

New tests should follow these patterns.

---

## Hook Tests

### Setup: QueryClient wrapper

Every hook test needs a fresh `QueryClient` and a provider wrapper:

```typescript
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { vi, describe, it, expect, beforeEach } from "vitest";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
```

### Testing a query hook

```typescript
import { useUsers } from "@/hooks/useUsers";

// Mock the api-client module
vi.mock("@vardi/api-client", () => ({
  useApiClient: () => ({
    listUsers: vi.fn().mockResolvedValue({
      content: [{ id: "u1", email: "test@example.com", role: "admin" }],
      total_elements: 1,
      total_pages: 1,
      page: 0,
      size: 20,
    }),
  }),
}));

describe("useUsers", () => {
  it("returns user data on success", async () => {
    const { result } = renderHook(() => useUsers({ page: 0, size: 20 }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.content).toHaveLength(1);
    expect(result.current.data?.content[0].email).toBe("test@example.com");
  });
});
```

### Testing a mutation hook

```typescript
import { useRevokeAllSessions } from "@/hooks/useSessionMutation";
import { toast } from "sonner";

const mockApi = {
  revokeAllSessions: vi.fn(),
};

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@vardi/api-client", () => ({
  useApiClient: () => mockApi,
}));

describe("useRevokeAllSessions", () => {
  beforeEach(() => {
    mockApi.revokeAllSessions.mockReset();
  });

  it("shows success toast after revoking", async () => {
    mockApi.revokeAllSessions.mockResolvedValue({ user_id: "u1", revoked_count: 3 });

    const { result } = renderHook(() => useRevokeAllSessions(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ userId: "u1" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(toast.success).toHaveBeenCalledWith(expect.stringContaining("3 sessions"));
  });

  it("shows error toast on failure", async () => {
    mockApi.revokeAllSessions.mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() => useRevokeAllSessions(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ userId: "u1" });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(toast.error).toHaveBeenCalledWith("Network error");
  });
});
```

### Testing cache invalidation

```typescript
describe("useRevokeAllSessions", () => {
  it("invalidates user queries on success", async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useRevokeAllSessions(), { wrapper });
    result.current.mutate({ userId: "u1" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ["admin", "users", "u1"] }),
    );
  });
});
```

---

## API Client Tests

Reference `../../../packages/api-client/src/client.test.ts` for comprehensive patterns. Key approaches:

### Mock global fetch
```typescript
const mockFetch = vi.fn();
global.fetch = mockFetch;

beforeEach(() => {
  mockFetch.mockReset();
});
```

### Test Zod validation
```typescript
it("throws on invalid response shape", async () => {
  mockFetch.mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ invalid: "shape" }),
  });

  await expect(api.listUsers()).rejects.toThrow(/Invalid listUsers response/);
});
```

### Test ApiError status
```typescript
it("throws ApiError with status on 404", async () => {
  mockFetch.mockResolvedValue({
    ok: false,
    status: 404,
    statusText: "Not Found",
  });

  await expect(api.getUser("missing")).rejects.toThrow(ApiError);
  await expect(api.getUser("missing")).rejects.toHaveProperty("status", 404);
});
```

---

## Component Tests

Test presentational components (not page components) with props:

```typescript
import { render, screen } from "@testing-library/react";
import { Badge } from "@/components/ui/AdminBadge";

describe("Badge", () => {
  it("renders with correct variant", () => {
    render(<Badge variant="success">Active</Badge>);
    expect(screen.getByText("Active")).toBeInTheDocument();
  });
});
```

For components that need providers (theme, query client), wrap them:

```typescript
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

function renderWithProviders(ui: React.ReactElement) {
  return render(ui, {
    wrapper: ({ children }) => (
      <QueryClientProvider client={new QueryClient()}>
        {children}
      </QueryClientProvider>
    ),
  });
}
```

---

## What to Test

- **Hooks:** query success/error states, mutation side-effects (toast, cache invalidation).
- **API client:** Zod validation (valid + invalid), `ApiError` status codes, `authFetch` retry.
- **Utilities:** formatters, mappers, validators, pure functions.
- **Components:** critical presentational components with user interaction.
- **Zod schemas:** edge cases (nullable fields, enum values, datetime formats).

## What NOT to Test

- Trivial pass-through components with no logic.
- TanStack Query internals (caching behavior, refetch intervals).
- Next.js routing (covered by E2E tests).
- Layout components (AppShell, Sidebar — tested via E2E).
- Third-party library behavior.

---

## Naming Conventions

| Thing | Convention | Example |
|---|---|---|
| Test file | `<module>.test.ts` or `<module>.test.tsx` | `useUsers.test.ts`, `Badge.test.tsx` |
| Describe block | Class or function name | `describe("useUsers", ...)` |
| Test case | Descriptive phrase | `it("returns user data on success", ...)` |
| Mock | `mock<Thing>` or `vi.fn()` inline | `const mockFetch = vi.fn()` |
| Wrapper | `createWrapper()` | Query client provider factory |

---

## Vitest Config

Each app has its own `vitest.config.ts`:

```typescript
// apps/admin/vitest.config.ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    exclude: ["e2e/**", "node_modules/**"],
    passWithNoTests: true,  // Will be removed once unit tests exist
  },
});
```

The `passWithNoTests: true` flag allows the test command to exit cleanly while unit tests are being added incrementally.

---

## Running Tests

```bash
# All unit tests across the monorepo
pnpm test

# Admin unit tests only
pnpm --filter @vardi/admin test

# Watch mode
pnpm --filter @vardi/admin exec vitest --watch

# Single file
pnpm --filter @vardi/admin exec vitest hooks/useUsers.test.ts

# API client tests
pnpm --filter @vardi/api-client test
```

---

## Checklist: Writing a New Test

- [ ] Use Vitest (`describe`, `it`, `expect`, `vi.fn()`)
- [ ] Create fresh `QueryClient` per test (via `createWrapper()`)
- [ ] Mock `useApiClient` at module level for hook tests
- [ ] Test success, error, and loading states for query hooks
- [ ] Test toast calls and cache invalidation for mutation hooks
- [ ] Use `waitFor` for async assertions
- [ ] Test presentational components with props, not page components
- [ ] Name test file `*.test.ts(x)` to match Vitest config
