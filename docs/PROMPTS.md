# Prompts

## Turn 1 — extraction slice

Requested: the first vertical slice of the app — a skills profile screen that
persists to MongoDB, an ad screen that submits pasted job ad text, a backend call
to OpenRouter that extracts a structured requirement list (each requirement
labelled `must_have` or `nice_to_have` with a `source_quote`), a grounding check
that discards any requirement whose quote isn't actually present in the submitted
ad text, storage of the full analysis with model/token/cost/latency metadata, and
a visible failure state for malformed or failed model responses. Match
percentages, the ranked ad list, and the recalculate button were explicitly out of
scope for this turn — build without blocking them, not build toward them. The
client was to be written entirely by the agent, reviewable at the level of
behaviour rather than JSX. The agent was asked to produce a plan first — files
touched, which SPEC.md Part 2 criterion each step satisfies, and any gap in the
specification surfaced as an explicit question rather than silently assumed — and
to stop for approval before writing code.

Four gaps in SPEC.md Part 2 were surfaced during planning and resolved by the user
before building started:

- **All requirements rejected by grounding** (every `source_quote` fabricated) —
  should this show as a visible failure or a successful analysis with an empty
  list? → **Visible failure.**
- **Grounding normalization strictness** — C3 said only "whitespace and case,"
  under-specified against §5's requirement to survive mixed Hebrew/English and RTL
  text. Options ranged from a literal reading of C3 to also ignoring punctuation. →
  **Unicode-aware**: NFKC-normalize, strip bidi/zero-width control characters,
  collapse whitespace, case-fold — punctuation and wording left untouched.
- **Which dependencies to add**, since CLAUDE.md requires asking first. →
  **Approved**: express, the `mongodb` driver (not Mongoose),
  react/react-dom/vite/@vitejs/plugin-react, and ESLint. Nothing beyond that list.
- **What the must-have/nice-to-have percentage fields hold** on an analysis stored
  before matching exists — C6 requires the fields, but percentages are explicitly
  a later turn. → **Store `null`, documented** as "not yet calculated" — never
  `0`, since 0% would be indistinguishable from a genuine no-match result.

These four resolutions were also written directly into `docs/SPEC.md` Part 2
itself (criteria 3, 5, and 6), so they're not only a record here but the current
spec text.

A follow-up dependency question came up mid-build (ESLint's `no-unused-vars` can't
tell a component referenced only inside JSX is "used," which needs
`eslint-plugin-react`) and was approved the same way. A model swap
(`meta-llama/llama-3.3-70b-instruct:free` → `nvidia/nemotron-3-super-120b-a12b:free`,
after the originally configured model turned out to be withdrawn from OpenRouter's
free tier) was proposed with evidence and approved before building continued —
see `docs/LESSONS.md` for what that testing found.
