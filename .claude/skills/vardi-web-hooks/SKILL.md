---
name: vardi-web-hooks
description: React hook guidance for Checkpoint Vardi. Use when creating, refactoring, or reviewing custom hooks, client-side state orchestration, browser API integration, or interactive search and form flows in this repo.
---

# Vardi Web Hooks

Use this skill when a change genuinely needs hooks.

## Current posture

This repo is server-first. Default to server components, route handlers, and plain props.
Introduce a custom hook only when it improves an interactive client surface.

## Good hook use cases

- browser-only APIs
- client-side forms and local interaction state
- debounced search or filtering
- optimistic UI on clearly interactive flows
- reusable client behavior shared across multiple components

## Placement

- feature-local hooks: `apps/web/app/**/_hooks` or nearby feature modules
- broadly reusable hooks: `apps/web/hooks`
- keep shared packages free of app-specific hooks

## Hook rules

- one hook, one concern
- hide browser API setup details, not business logic
- prefer explicit inputs and outputs over grabbing global state
- avoid `useEffect` for data fetching unless the architecture truly calls for it
- use `useEffectEvent`, `startTransition`, and `useDeferredValue` when they clearly improve correctness or UX
- do not add `useMemo` or `useCallback` by default

## If a data hook is necessary

- keep the network path typed
- centralize the caller in an app helper instead of inlining `fetch()`
- expose the smallest useful state surface
- keep cache keys or resource IDs local and readable

## Checklist

- hook is necessary for a client-only concern
- hook placement matches its reuse level
- side effects are explicit and easy to trace
- typed inputs and outputs are present
- no hidden coupling to unrelated features

## Anti-patterns

- creating a hook only to move code out of a component
- reading or writing unrelated feature state from a shared hook
- inlining URLs or parsing rules inside effects
- turning a server-friendly flow into a client hook without a real UX reason
