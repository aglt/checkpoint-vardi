# S1-01 - Seed catalog foundation for assessment runtime

> **Status: NOT STARTED**
> **Stage:** S1 - MVP assessment workflow
> **Epic:** Checkpoint Vardi - Stage One assessment workflow
> **Priority:** P0

Role: **Implementation source of truth** for seeded assessment runtime data.  
Depends on: S0-01

---

## Goal

Establish the seeded runtime truth for checklist-driven assessments.

This story must safely adapt the current seed files using the structural improvements provided in this packet, while preserving fuller in-repo checklist content where the packet only supplies smaller canonical examples. It also wires the seed-loading or validation baseline so later stories can safely depend on seeded checklist, legal-reference, and risk-matrix data.

## Why

The web app depends on seeded domain data. Users will fill in assessment forms from seeded checklists, and the system must evaluate and export reports from that structured data. This story creates the trusted data baseline for the rest of the MVP.

## Scope

- Update the existing seed files in `packages/checklists/assets/seeds/` using the packet as a structural source of truth, not a blind overwrite.
- Keep the same overall seed approach:
  - `manifest.json`
  - checklist JSON files
  - `legal_references.json`
  - `risk_matrices.json`
- Preserve the full useful checklist content already present in the repo where the packet contains smaller illustrative or canonical examples.
- Avoid destructive downgrade from fuller extracted data to reduced packet examples unless the packet clearly contains the complete intended replacement dataset.
- Ensure the updated seeds support runtime use, not just extraction provenance.
- Add or preserve canonical stable identifiers for seeded entities where needed for DB and runtime mapping:
  - checklist id or slug
  - section id
  - criterion id
  - legal reference id or code
  - risk matrix id or slug
- Validate that all checklist `legalRefs` resolve cleanly against the legal-reference catalog.
- Validate that risk matrices are complete and structurally valid.
- Keep structural normalization separate from behavior-changing domain-rule changes unless the story explicitly authorizes both.
- Keep provenance metadata only as metadata, not as the core runtime shape.
- Ensure the seed loader or validation path fails fast if seed integrity is broken.

## Acceptance Criteria

- The repo contains the updated seed files from this packet.
- The seed structure is consistent across all checklist files.
- The repo keeps the best available runtime checklist content and does not destructively downgrade to smaller packet examples.
- Sections and criteria have stable canonical ids suitable for DB seeding and foreign keys.
- Every legal reference used by a checklist resolves to a canonical legal-reference entry.
- Unresolved imported legal-reference placeholders, if any remain, are explicitly distinguished from canonical resolved references.
- No orphan legal references remain in checklist files.
- Risk matrix seed data validates successfully.
- Structural normalization does not silently change seed-driven product behavior unless the story explicitly authorizes that behavior change.
- A repo command or automated validation path proves the seed set is internally consistent.
- No feature UI is introduced in this story.

## Notes For Later Stories

This story intentionally shapes the seed truth so later stories can:

- seed the database
- start assessments from a template
- persist answers against stable criterion ids
- derive exports in stable checklist order

## Execution Rules

- Start by creating a new git branch and checking it out.
- Apply any repo skill, AGENTS guidance, local conventions, or project skill that is helpful for this story.
- Keep the implementation inside the scope of this story. Do not silently widen scope.
- After implementation, open a GitHub PR and make sure it is **not** a draft.
- If the story cannot be fully completed because of blockers, do both:
  - create a new follow-up story for the blocker or remainder
  - still open a **non-draft PR** for the work that was completed
- After merge to `main`, update the user stories and tracker to reflect the new truth.
- After merge to `main`, ensure local `main` is up to date, clean, and ready for the next story.
- Do not leave uncommitted leftovers or stale local branches behind.
