---
name: vardi-web-error-handling
description: Error-handling guidance for Checkpoint Vardi. Use when defining API errors, validation failures, form error states, retry behavior, route-handler failures, or user-facing failure messaging in this repo.
---

# Vardi Web Error Handling

Use this skill whenever a change introduces a new failure path.

## Principles

- validate early
- return structured client-safe errors
- separate user-fixable issues from internal failures
- never swallow an error silently
- do not leak stack traces, secrets, or raw database details to the client

## Route-handler pattern

Prefer one consistent error envelope:

```ts
type ErrorEnvelope = {
  error: {
    code: string;
    message: string;
    fieldErrors?: Record<string, string[]>;
  };
};
```

Suggested status mapping:

- `400` malformed request
- `401` authentication required
- `403` ownership or permission failure
- `404` missing resource
- `409` conflict
- `422` domain rule failure
- `500` unexpected internal failure

## UI handling

- inline field errors for user-correctable form problems
- retry affordances for transient page or fetch failures
- concise user-facing copy
- developer detail stays in logs, not the rendered UI

## Logging

- log enough context to explain what failed
- never log secrets or full sensitive payloads
- prefer stable codes over free-form one-off messages

## Checklist

- every new route has a validation failure path
- every mutation has a user-visible failure result
- status code matches the failure class
- error body shape is consistent
- unexpected failures still leave enough context for debugging

## Anti-patterns

- mixing success and error shapes unpredictably
- catching an error and returning `200` with a string message
- hiding validation detail that the user needs to correct input
- surfacing raw internal exception text directly to users
