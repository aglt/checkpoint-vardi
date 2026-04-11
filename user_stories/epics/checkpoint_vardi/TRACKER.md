# Checkpoint Vardi - Story Tracker

Status tracks which folder each story lives in: `done/` or `not_started/`.
PR is filled when a PR is open or merged (format: `#NN`).
Any agent changing story state must update `TRACKER.md`, `EXECUTION_PLAN.md`, `EPIC.md`, and the
story file or folder in the same change. Invoke `$vardi-story-management`.

## S0 - Foundations

| ID   | Story                                 | Status      | PR |
|------|---------------------------------------|-------------|----|
| S0-01 | Foundations: runnable empty scaffold | done        | #1 |

## S1 - MVP assessment workflow

| ID    | Story                                                   | Status       | PR |
|-------|---------------------------------------------------------|--------------|----|
| S1-01 | Seed catalog foundation for assessment runtime          | done         | #3 |
| S1-02 | Assessment domain and read model                        | done         | #4 |
| S1-03 | Start assessment from seeded template                   | done         | #5 |
| S1-04 | Assessment walkthrough form slice                       | done         |    |
| S1-05 | Transfer non-compliant findings into risk register      | not_started  |    |
| S1-06 | Risk classification engine and risk-entry editing       | not_started  |    |
| S1-07 | Summary form and export readiness                       | not_started  |    |
| S1-08 | Report export for checklist, register, and summary      | not_started  |    |

## S1/S2 - Stage bridge

| ID    | Story                                          | Status       | PR |
|-------|------------------------------------------------|--------------|----|
| S1-09 | Foundation for broader safety-plan modules     | not_started  |    |

---

**Next up:**

- `S1-05 - Transfer non-compliant findings into risk register`
- Continue through `S1-05` to `S1-08` in dependency order and keep `S1-09` narrowly scoped and non-blocking.
