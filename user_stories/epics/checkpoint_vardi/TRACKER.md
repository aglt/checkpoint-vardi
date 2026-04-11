# Checkpoint Vardi - Story Tracker

Status tracks which folder each story lives in: `done/` or `not_started/`.
PR is filled when a PR is open or merged (format: `#NN`).
Any agent changing story state must update `TRACKER.md`, `EXECUTION_PLAN.md`, `EPIC.md`, and the
story file or folder in the same change. Invoke `$vardi-story-management`.

## S0 - Foundations

| ID   | Story                                 | Status      | PR |
|------|---------------------------------------|-------------|----|
| S0-01 | Foundations: runnable empty scaffold | not_started |    |

---

**Next up:**

- Immediate start: `S0-01` makes the empty monorepo installable, runnable, and reviewable.
