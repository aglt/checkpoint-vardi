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
| S1-04 | Assessment walkthrough form slice                       | done         | #6, #22 |
| S1-05 | Transfer non-compliant findings into risk register      | done         | #7 |
| S1-06 | Risk classification engine and risk-entry editing       | done         | #8 |
| S1-07 | Summary form and export readiness                       | done         | #9 |
| S1-08 | Report export for checklist, register, and summary      | done         | #10 |
| S1-10 | Browser E2E foundation and blocked-readiness baseline   | done         | #12 |
| S1-11 | Risk mitigation planning on risk entries                | done         | #13 |
| S1-12 | Guided assessment progression and completion guards     | done         | #15 |
| S1-13 | Explicit risk reasoning capture                         | done         | #16 |
| S1-14 | Compliance-oriented export framing and assessment metadata | done        | #17 |
| S1-15 | Sector/profile-specific assessment rules via seed-owned runtime extensions | done        | #21 |
| S1-16 | Stable browser E2E for end-to-end assessment-to-export flow | done        | #23 |
| S1-17 | Language-consistent web content for the current MVP flow | done        | #14, #19, #20 |
| S1-18 | Risk severity choice alignment with the reference workflow | done        | #18 |
| S1-19 | Simplify checklist flow with clear progress and risk clarity | not_started |    |

## S1/S2 - Stage bridge

| ID    | Story                                          | Status       | PR |
|-------|------------------------------------------------|--------------|----|
| S1-09 | Foundation for broader safety-plan modules     | not_started  |    |

---

**Next up:**

- `S1-19 - Simplify checklist flow with clear progress and risk clarity`
- Keep `S1-09` narrowly scoped and non-blocking unless a later active follow-up exposes a concrete need for it.
