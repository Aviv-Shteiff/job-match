# CLAUDE.md

What to build is in `docs/SPEC.md`. Why it exists is in `docs/FRAMING.md`. This file
is only about how work is done in this repository.

## Stack — fixed

- Backend: Node.js with Express
- Database: MongoDB
- Frontend: React with Vite, plain JavaScript
- Model access: OpenRouter only
- **No TypeScript.** Not in the client, not in the server, not in config, not "just
  for the types"
- Do not add a dependency, framework, ORM, state library, or component library
  without asking first

## What good work looks like here

- The model is called only to extract and classify requirements from ad text.
  Matching, percentages, ordering, storage, and the grounding check are ordinary code.
- A failure is shown as a failure. Never return an empty result, a default, or a
  placeholder that a user could mistake for a successful analysis.
- Every model call is logged with model identifier, input tokens, output tokens, cost,
  and latency.
- Stored analyses are immutable snapshots. Changing the profile does not silently
  rewrite them.

## How to approach a task

- Produce a plan before writing code and stop for approval. State which files you will
  touch and which criteria in `docs/SPEC.md` Part 2 the plan satisfies.
- Do not expand scope beyond the task given. Entries on the out-of-scope list in
  `docs/FRAMING.md` are decisions, not oversights.
- Prefer the smallest change that meets the criterion. Propose larger refactors and
  wait.

## Version control

- Commit before starting any non-trivial task — anything touching several files or
  changing behaviour that already works.
- One logical change per commit. Do not bundle a fix and a feature.
- Commit messages say why. The diff already shows what.
- Work on a branch. `main` receives merges, not direct commits.
- Never commit a secret. The OpenRouter key lives in `.env`, which is gitignored.

## Verification

- Tests are written from `docs/SPEC.md`, not from the implementation. Cite the
  criterion each test covers.
- Write the test from the specification before the code where possible.
- Coverage is not evidence. A line running is not a line checked.
- Gate before merge: tests pass, linter passes, no secret in the diff, and the changed
  behaviour was checked against the specific criterion it claims.

## When to stop and ask

- Before adding any dependency
- Before changing `docs/SPEC.md` or `docs/FRAMING.md` — propose the edit, do not make it
- Before changing the database schema once data exists
- Before touching the grounding check or the failure path
- On the third correction of the same fault, stop and say so rather than attempting a
  fourth

## Commands

- `cd server && npm run dev` — server with auto-restart, reads `../.env`
- `cd server && npm test` — server tests (`node --test`)
- `cd server && npm run lint` — server lint
- `cd client && npm run dev` — client dev server (Vite, proxies `/api` to the server)
- `cd client && npm run build` — client production build
- `cd client && npm run lint` — client lint
- `cd server && node --env-file=../.env scripts/backfillMatches.js` — one-off:
  computes and stores a match snapshot for any analysis that doesn't have one yet
- `cd server && node --env-file=../.env scripts/migrateProfileGroups.js` — one-off:
  adds the display-only `group` field to any profile skill entry that lacks one