# S0-01 - Foundations: runnable empty scaffold

> **Status: DONE**
> **Stage:** S0 - Foundations
> **Epic:** Core Team - project bootstrap
> **Priority:** P0 (blocks every other story)
> **Estimate:** 1 day

Role: **Implementation source of truth** for scaffold readiness.  
Depends on: None

---

## Context

This story is complete. The repository now has a committed `pnpm-lock.yaml`, a
verified scaffold command set, workspace `test` scripts across the monorepo,
shared and app-local ESLint wiring, a latent `fetch()` lint guard for
`apps/web`, a buildable placeholder app, and cleaned legacy-name references.

The work stayed intentionally narrow: tooling, scripts, lockfile, lint, build,
README baseline, and story/doc hygiene only. No feature, schema, auth, or
product implementation landed here.

The verified baseline now supports `pnpm install`, `pnpm typecheck`,
`pnpm lint`, `pnpm test`, `pnpm build`, and `pnpm dev`, with the placeholder
landing page served at `http://localhost:3000`.

The placeholder app intentionally uses English-only source strings, `lang="en"`,
and the ASCII form `Checkpoint Vardi` in app source so this scaffold story
meets the Icelandic-content discipline acceptance criterion without introducing
real localized product copy.

This completion was validated locally with `node v25.6.1` because the shell did
not provide `nvm` or another Node 22 manager. Node 22 remains the declared repo
contract in `.nvmrc` and `package.json`, but that exact runtime was not
re-verified in this session.

## User Story

> **As a** developer joining the Checkpoint Vardi project,  
> **I want** a pre-configured monorepo that installs, lints, type-checks, tests,
> and runs its dev server without any code changes,  
> **so that** I can start claiming feature stories from the handoff document
> without first spending a day wiring up tooling.

## Out Of Scope

The following are explicitly not part of this story and will be picked up by
later stories in the handoff backlog:

- Drizzle schema or migrations
- Zod contracts beyond empty stubs
- Risk classify implementation
- Seed loader or parser
- The Python `doc-worker` sidecar
- Docker Compose dev stack
- CI pipeline beyond a minimal lint + typecheck + test job
- `packages/ui` component additions beyond whatever the empty app already needs
- Any i18n dictionary beyond `SUPPORTED_LANGUAGES`
- Real authentication

## Acceptance Criteria

A reviewer on a fresh clone must be able to run every command in the list
below and see the stated outcome. No edits to committed source should be
required between steps.

1. **Install is clean.** `pnpm install` completes without errors or peer
   dependency warnings that would fail CI. A `pnpm-lock.yaml` is committed.
2. **Type check passes.** `pnpm typecheck` exits 0 across every workspace
   package, with `strict: true` enforced by the shared `tsconfig` base.
3. **Lint passes, including boundaries.** `pnpm lint` exits 0. The boundary
   rules in `eslint.config.mjs` are executed against the current tree and
   produce no violations.
4. **Tests pass.** `pnpm test` exits 0 even though there are no meaningful
   tests yet - each package exposes a `test` script that is either a real
   `vitest run` or a placeholder that exits 0 cleanly.
5. **Dev server boots.** `pnpm dev` starts Next.js on port 3000 and serves
   the placeholder landing page with no console errors or Tailwind
   compilation warnings.
6. **Production build succeeds.** `pnpm build` produces a Next.js build with
   no errors and emits the `.next` directory.
7. **Git state is clean.** After running all of the above, `git status` is
   empty aside from generated artefacts that are already in `.gitignore`.
8. **No legacy codename leaks.** A repository search for the disallowed legacy
   codename returns zero matches outside ignored artefacts.
9. **Icelandic-content discipline.** No Icelandic user-facing strings live in
   `apps/web` component source. The placeholder landing page is allowed to
   use English because it is not real product copy.
10. **The data-boundary rule is latent but enforced.** The lint rule that
    forbids direct `fetch()` in apps is in place. Because `apps/web` has no
    data fetching yet, the rule is satisfied vacuously, but it must be wired
    rather than commented out.

## Implementation Notes

### 1. Install and pin the toolchain

- Ensure Node 22 via `nvm use` (respects `.nvmrc`).
- Enable pnpm via `corepack enable && corepack prepare pnpm@10.6.5 --activate`.
- Run `pnpm install` from the repo root. Commit the generated `pnpm-lock.yaml`.

### 2. Fill out the missing scripts

Some package manifests currently use a placeholder `test` script. Replace
those placeholders with Vitest where it makes sense (`@vardi/schemas`,
`@vardi/risk`, `@vardi/checklists`) or leave a clean `echo "no tests yet" && exit 0`
where tests will land in a later story. Either is acceptable as long as
`pnpm -r test` exits 0.

### 3. Wire the shared TypeScript base everywhere

Every package `tsconfig.json` should extend `@vardi/config/typescript/library`
(for packages) or Next.js defaults (for `apps/web`). Run `pnpm typecheck` from
the root and resolve any missing references. Typical fixes:

- adding `"references"` entries where packages depend on each other at
  type-check time
- making sure `paths` aliases in `apps/web/tsconfig.json` resolve to every
  `@vardi/*` package listed in its dependencies

### 4. Confirm Tailwind 4 loads for the app

`apps/web/app/globals.css` imports both `tailwindcss` and the token layer
from `@vardi/ui/styles/globals.css`. Start the dev server once and confirm
the placeholder page renders with the default font and background colours
from the token sheet. No hand-tuning of tokens is part of this story.

### 5. Minimal lint configuration audit

Walk through `eslint.config.mjs` and confirm each rule block actually matches
files that exist today. The scaffold already enforces:

- shared packages may not import other `@vardi/*` packages
- the UI package may not import config, schemas, or db
- apps may not use deep package imports

Run `pnpm lint:boundaries` explicitly once to prove the boundary config is
active and returns 0 violations.

### 6. Commit discipline

Split the work into small commits on a branch named `chore/foundations-scaffold`:

- `chore(install): add pnpm-lock.yaml`
- `chore(scripts): fill in workspace test scripts`
- `chore(tsconfig): wire package references`
- `chore(lint): confirm boundary rules active`
- `chore(dev): verify pnpm dev boots`

Open a pull request that references this story by ID (`S0-01`).

## Verification Checklist For The Reviewer

Paste the output of the following block into the PR description. It must
all be green before merge.

```bash
pnpm install
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm dev &   # observe localhost:3000, then kill
python - <<'PY'
from pathlib import Path

needle = bytes.fromhex("54796d626c6f").decode()
ignored = {".git", "node_modules"}
matches = []
for path in Path(".").rglob("*"):
    if any(part in ignored for part in path.parts):
        continue
    if path.is_file():
        try:
            if needle.lower() in path.read_text(errors="ignore").lower():
                matches.append(str(path))
        except Exception:
            pass
print("\n".join(matches) if matches else "clean")
PY
git status
```

## Definition Of Done

- [ ] All acceptance criteria pass on a fresh clone with Node 22 and pnpm 10.6.5
- [ ] `pnpm-lock.yaml` committed
- [ ] README quickstart commands work exactly as written
- [ ] No legacy codename references anywhere in the working tree
- [ ] No Icelandic strings hard-coded in `apps/web` component source
- [ ] PR references `S0-01` and links to `docs/handoff/CheckpointVardi_ImplementationHandoff.md`
- [ ] At least one reviewer (human or agent) has signed off
- [ ] `main` is updated with a squash-merge commit message starting with
      `chore(foundations): runnable empty scaffold (S0-01)`

## Dependencies

- **Upstream:** none. This is the first story.
- **Downstream:** every story that depends on a runnable baseline.

## Notes For The Implementing Agent

This is a boring story on purpose. Resist the urge to add "just one component"
or "just a small schema." The value of `S0-01` is that the next story can be
reviewed on its own merits without reviewers also having to judge scaffold
decisions. Keep the diff to tooling, scripts, and the lockfile. Anything that
feels like a feature belongs in its own story.
