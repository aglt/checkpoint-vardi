---
name: vardi-web-e2e-testing
description: "E2E test patterns for Vardi Web (Playwright). Use when writing, modifying, or reviewing E2E tests, the auth setup pipeline, test fixtures, or adding smoke tests for new pages. Covers the agent@vardi.com test account, Firebase custom-token auth, Playwright projects, and read-only DEV API testing."
---

# Vardi Web E2E Testing

## Overview

E2E tests validate user-facing pages, navigation, and auth behavior against the real DEV API using Playwright. All tests live in `../../../apps/admin/e2e/` and run via the admin app.

Tests are **read-only** — zero mutations against the DEV backend.

## Load Context First

- Read `../../../CLAUDE.md` for project structure and app layout.
- Read `../admin-client-structure/SKILL.md` for page conventions and layout components.
- Read `../../../apps/admin/playwright.config.ts` for project setup and webServer config.
- Inspect existing test patterns in `../../../apps/admin/e2e/` before writing new tests.

## Test Account

| Field            | Value                                                      |
|------------------|------------------------------------------------------------|
| Email            | `agent@vardi.com`                                         |
| Role             | ADMIN in DEV                                               |
| OU               | Automation (no 2FA)                                        |

**Never create additional test accounts.** All E2E tests use this single agent account.

## Auth Pipeline (`e2e/auth.setup.ts`)

The auth setup runs on Node.js using Firebase Admin SDK (unlike Android which uses self-signed JWTs because the Admin SDK is JVM-only).

### Flow
1. **Load credentials** — from `FIREBASE_SERVICE_ACCOUNT_KEY` env var (CI) or Application Default Credentials (local dev with `gcloud auth application-default login`).
2. **Fast path (refresh)** — If cached session in `.auth/agent.json` is valid (>1h remaining), only refresh the access token via `POST /auth/refresh`.
3. **Full path (login)** — Create Firebase custom token → exchange for ID token via Identity Toolkit → `POST /auth/login` → extract cookies + access token.
4. **Persist** — Write cookies and localStorage entries (access_token, env, timestamp) to `.auth/agent.json` as Playwright storageState.

### Credential provisioning
```bash
# Option 1: Env var (CI — JSON key string)
export FIREBASE_SERVICE_ACCOUNT_KEY="$(cat path/to/sa-key.json)"
pnpm test:e2e:admin

# Option 2: ADC (local dev)
gcloud auth application-default login
pnpm test:e2e:admin
```

## Test Fixtures (`e2e/fixtures.ts`)

The custom fixture extends Playwright's `test` base with a mocked `/auth/refresh` endpoint:

**Why mock refresh?** The backend rotates the `vardi_session` cookie on every refresh. With parallel workers, multiple tests calling refresh simultaneously would invalidate each other's cookies.

**How it works:**
1. Reads pre-fetched access_token and session cookie from `.auth/agent.json`.
2. Routes all `POST /auth/refresh` requests to a local handler.
3. Handler checks token freshness (12-minute TTL per worker).
4. If stale (e.g., paused in debugger), makes one real refresh call to DEV API.
5. Responds with cached or refreshed token — no concurrent cookie rotation.

**Shared constants:**
- `SHELL` — `'[data-testid="authenticated-shell"]'` — wait target for authenticated pages.
- `SESSION_TIMEOUT` — `15_000` ms — timeout for session initialization.

**Import rule:** All authenticated test files must import `{ test, expect }` from `"../fixtures"`, not from `"@playwright/test"`.

## Three Playwright Projects

From `playwright.config.ts`:

| Project | Matches | Auth | Dependencies |
|---|---|---|---|
| `auth-setup` | `auth.setup.ts` | Firebase Admin SDK → DEV API | None |
| `unauthenticated` | `auth.spec.ts` | None (seeds `vardi:env=dev` in localStorage) | None |
| `authenticated` | Everything except `auth.spec.ts` | Uses `.auth/agent.json` storageState | `auth-setup` |

The `unauthenticated` project seeds `vardi:env=dev` in localStorage so the app contacts the DEV API (returns 401 → redirect) instead of localhost:8080 which may not be running.

## Writing Smoke Tests

Canonical pattern from `e2e/smoke/navigation.spec.ts`:

```typescript
import { test, expect, SHELL, SESSION_TIMEOUT } from "../fixtures";

test.describe("sidebar navigation", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(SHELL)).toBeVisible({ timeout: SESSION_TIMEOUT });
  });

  test("clicking Users link navigates to /users", async ({ page }) => {
    await page.getByRole("link", { name: "Users", exact: true }).click();
    await expect(page).toHaveURL(/\/users$/);
    await expect(
      page.getByRole("heading", { name: "Users", exact: true }),
    ).toBeVisible();
  });
});
```

### Pattern:
1. Navigate to base URL.
2. Wait for `SHELL` to be visible (auth + session + render complete).
3. Interact with page elements using roles/labels.
4. Assert on URL, headings, and structural elements.

## Writing Unauthenticated Tests

Unauthenticated tests import from `@playwright/test` (not fixtures) because they don't need the refresh mock:

```typescript
import { test, expect } from "@playwright/test";

test("redirects unauthenticated user to login", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login/);
});
```

## Writing Feature Tests

For pages with data tables, forms, or interactive elements:

```typescript
import { test, expect, SHELL, SESSION_TIMEOUT } from "../fixtures";

test.describe("users table", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/users");
    await expect(page.locator(SHELL)).toBeVisible({ timeout: SESSION_TIMEOUT });
  });

  test("displays column headers", async ({ page }) => {
    await expect(page.getByRole("columnheader", { name: "Email" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Role" })).toBeVisible();
  });

  test("shows data rows after load", async ({ page }) => {
    await expect(page.getByRole("row")).toHaveCount({ minimum: 2 }); // header + data
  });
});
```

## Page Object Model

For pages with 3+ test cases, extract a class encapsulating locators and actions (web equivalent of Android's Robot Pattern):

```typescript
class UsersPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto("/users");
    await expect(this.page.locator(SHELL)).toBeVisible({ timeout: SESSION_TIMEOUT });
  }

  async searchFor(query: string) {
    await this.page.getByPlaceholder("Search").fill(query);
  }

  async clickUser(email: string) {
    await this.page.getByRole("row", { name: email }).click();
  }

  async assertHeadingVisible() {
    await expect(this.page.getByRole("heading", { name: "Users" })).toBeVisible();
  }

  async assertRowCount(min: number) {
    await expect(this.page.getByRole("row")).toHaveCount({ minimum: min });
  }
}

// Usage:
test("search filters users", async ({ page }) => {
  const users = new UsersPage(page);
  await users.goto();
  await users.searchFor("admin");
  await users.assertRowCount(2);
});
```

## Non-Negotiable Rules

1. **Read-only** — never create, modify, or delete data in DEV via tests.
2. **Agent account only** — all authenticated tests use `agent@vardi.com`.
3. **No secrets in code** — credentials come from env var or ADC, never hardcoded.
4. **Real DEV API** — no mocked API responses for authenticated tests (refresh mock is the only exception).
5. **Import from fixtures** — authenticated tests import `{ test, expect }` from `"../fixtures"`, not `"@playwright/test"`.
6. **Structural assertions** — assert on headings, nav links, roles, column headers, and `data-testid`. Don't assert on specific dynamic content that may change.
7. **Prefer roles and labels** — use `getByRole`, `getByLabel`, `getByText` over CSS selectors. Use `data-testid` only when semantic queries aren't sufficient.
8. **Wait for SHELL** — every authenticated test must wait for `SHELL` with `SESSION_TIMEOUT` before interacting.
9. **Deterministic outcomes** — each test asserts exactly one expected outcome. Never write a test that accepts both success and failure as passing.
10. **No known-broken tests** — do not merge tests whose main behavior is currently broken.
11. **New pages need tests** — when adding a new page, add a corresponding smoke test.
12. **Name matches behavior** — if a test is named `search filters users`, it must perform the search and verify filtering.

## Test Structure

```
apps/admin/e2e/
├── auth.setup.ts              # Firebase auth → storageState
├── auth.spec.ts               # Unauthenticated state tests
├── fixtures.ts                # Custom test base with refresh mock
├── .auth/
│   └── agent.json             # Persisted storageState (gitignored)
├── smoke/
│   ├── pages.spec.ts          # All main pages render
│   └── navigation.spec.ts     # Sidebar navigation works
└── users/
    ├── users-table.spec.ts    # Users list, search, sort
    └── user-detail.spec.ts    # User detail page
```

## Running Tests

```bash
# Full E2E suite
pnpm test:e2e:admin

# Playwright UI mode (interactive)
cd apps/admin && npx playwright test --ui

# Specific project only
cd apps/admin && npx playwright test --project=authenticated

# Single file
cd apps/admin && npx playwright test e2e/smoke/navigation.spec.ts

# Unauthenticated tests only (no Firebase credentials needed)
cd apps/admin && npx playwright test --project=unauthenticated

# Debug mode
cd apps/admin && npx playwright test --debug
```

## Security Checklist

- No hardcoded secrets in test files or fixtures.
- Firebase credentials loaded from env var (CI) or ADC (local dev), never committed.
- Tokens cached in storageState file, gitignored via `.auth/`.
- Tests run against DEV only, never staging or prod.
- Access tokens are 15-minute lived; session cookies are httpOnly.
