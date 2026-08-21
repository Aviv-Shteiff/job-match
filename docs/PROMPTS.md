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

## Turn 2 — matching, ranking, detail view

Requested: match percentage calculation for a stored analysis's requirements
against the current skills profile, computed in ordinary code with no model call;
the ranked ad list, ordered by must-have percentage; and the detail view, showing
met requirements and gaps with must-have gaps before nice-to-have gaps. The
recalculate button stayed out of scope. Two things came from `docs/LESSONS.md`'s
open questions rather than from a blank slate: the principle that soft-skill
requirements are excluded from the percentage calculation entirely was given
pre-decided, with the exact classification mechanism left for the agent to
propose; and the multi-skill-requirement question (should "Knowledge of MongoDB
and SQL-Based database" require both named skills or just one) was named directly
as still open, to be presented with options and trade-offs rather than picked.

Four gaps were surfaced during planning and resolved by the user before building
started:

- **Multi-skill requirements** — substring match now (accepting that a profile
  covering only one of two named skills scores the requirement as fully met),
  split at match-time in code, or defer splitting to a later turn's extraction
  change? → **Substring now, split at extraction later** — the model has the ad's
  context and language understanding; code parsing conjunctions in two languages
  does not.
- **Matchable classification mechanism**, for the soft-skill exclusion principle
  already given — an exclude-list of soft-skill markers, an include-list of known
  tech terms, or an exclude-list that also drops no-named-tool borderlines? →
  **Exclude-list, clearly-soft markers only** — borderline concepts like
  "responsive design" and "RESTful APIs" stay in and show as a gap if unmet,
  erring toward visible gaps per SPEC §1.
- **The 8 existing turn-1 analyses**, stored with null percentages — backfill
  against the current profile, leave null, or delete? → **Backfill all 8** —
  makes the ranked list demonstrable immediately; acceptable since this is test
  data, not history that needs preserving.
- **Variant tolerance** for skill matching, since SPEC §5 already warns exact
  string equality under-reports — plain substring, word-boundary-only, or
  word-boundary plus a fuzzy/edit-distance fallback? → **Word-boundary matching
  plus a small alias table** (js/javascript, ts/typescript, postgres/postgresql,
  k8s/kubernetes) — plain substring would wrongly match profile "SQL" inside ad
  text "NoSQL"; fuzzy matching risks a wrong match silently inflating the
  percentage with no visible trace.

These four resolutions were not written into `docs/SPEC.md` as new criteria — turn
2 extended behaviour within criteria the spec already had (C6, C7, C8, C12) rather
than adding new ones, so the record lives only in `docs/LESSONS.md` and the code's
own comments.

## Turn 3 — profile depth (years, education, roles)

Requested: closing three permanent-gap categories turn 2's testing had found —
years of experience per skill, education, and role/seniority requirements — none
of which a skills-only profile could ever satisfy, no matter how it was edited.
Framed explicitly as a scope extension, not a clarification, and split into two
exchanges: a spec amendment approved on its own first, then a separate build plan
once that amendment was committed.

Three decisions came pre-set in the amendment prompt: each profile skill gains an
optional years-of-experience number, with no separate seniority label; the
profile gains one optional free-text education field; and role or seniority
experience is entered as an ordinary skill entry in the same list, not a separate
schema concept. Four more were resolved before the amendment text was finalized:

- **Scoring a years shortfall** ("3+ years" against a profile skill recording 2)
  — strict gap, partial credit, met-but-flagged, or a tolerance band? → **Strict
  gap, with the shortfall shown as the reason** — keeps the percentage a plain
  count of met requirements and avoids repeating the multi-skill overstatement
  turn 2 had just confirmed.
- **Where the required-years number comes from** — the model reading it off the
  ad at extraction time, code parsing the stored requirement text, or a hybrid? →
  **The model supplies it** — reading the ad is the model's job under SPEC §3;
  comparing the number to the profile stays ordinary code.
- **How an education entry satisfies a degree requirement** — field-of-study
  overlap after stripping degree-type words, presence-only (any entry satisfies
  any requirement), or an exact-ish match? → **Field-of-study overlap**, degree
  words set aside on both sides.
- **The 10 existing analyses**, scored under rules with no years or education
  concept at all — re-analyse, delete, or mark as scored under old rules? →
  **Re-analyse all 10** against the new extraction, creating new analyses rather
  than overwriting, per C9's immutability rule.

The amendment landed in `docs/SPEC.md` as criteria 13–16 plus extensions to C1 and
C6, and moved Part 3's model/code boundary for the first time: classifying a
requirement now includes reading off any stated years and whether it asks for a
degree, justified as still "reading the ad" — the model's job.

A separate build-plan exchange followed once the amendment was committed, with
three more decisions:

- **When to re-analyse the 10 existing ads** — immediately once the code landed,
  or after the user filled in real years and education through the new profile
  screen? → **After** — re-analysing first would match every ad against an
  all-null-years profile, turning every years requirement into a gap with no way
  to fix it until turn 4's recalculate. This put a deliberate pause in the middle
  of the turn.
- **Whether `years_required` and `is_education_requirement` are required keys**
  on every extracted requirement, given the free model already times out
  occasionally — required-and-present (value may be null), or optional with
  defaults? → **Required present** — a silently-omitted `years_required` would
  turn a threshold requirement into a thresholdless one and overstate the match
  with no trace, accepting a higher visible-failure rate as the cost.
- **When several profile skills match one requirement, whose years count** — e.g.
  Node.js (5y) and Express (1y) both matching "3+ years with Node.js and
  Express" — highest, lowest, or must-all-satisfy? → **Highest years wins** —
  lowest or all-must-satisfy both create a perverse incentive where adding a
  barely-used skill lowers the match on requirements already comfortably met.
- **Refining the field-of-study rule**: C15's own example, "an equivalent
  technical degree," didn't actually reduce to "no field" under just the
  degree-word stoplist, since real sentences always carry grammatical
  scaffolding — a whitelist of known fields, plain token overlap, or a second
  stoplist? → **A second stoplist of generic qualifiers** (equivalent, technical,
  relevant, related, similar, field, or) alongside the degree-word one.

## Turn 4 — ad metadata, deletion, grouped profile

Requested: three items `docs/LESSONS.md`'s "ideas for a future turn" section had
recorded but not scoped — splitting the profile screen into Skills and Roles &
Experience sections, optional job title/company/posting-link fields when
submitting an ad (shown in the list, with the link on the detail view only), and
a hard delete for analysed ads. Promoted ahead of the recalculate button, which
moved to a later turn. Split into a spec amendment first, then a build plan.

Two gaps were resolved before the amendment text was finalized:

- **How the profile screen knows which entries are roles** — the profile stored
  only `{name, years}`, so nothing distinguished "Full Stack" from "Node.js," and
  C16 as written forbade both a stored field and a code path for learning it.
  Store a display-only group field, guess from the entry's name, or don't split
  at all and just improve the prompting? → **Store a display-only group field**
  on each entry, defaulting to `'skill'` — a name-guessing heuristic would get
  Hebrew or unusual role names wrong with no way to correct it, and would still
  need the same C16 amendment for no reliability gained.
- **Whether title/company/link can be added to an analysis after the fact** — no
  (paste-time only), yes (freely editable), or yes-once (only while blank)? →
  **No, paste-time only** — keeps "a stored analysis is never modified" absolute
  with no exception fields; the remedy for badly-labelled existing ads is
  delete-and-re-paste, which the new delete control makes possible.

This surfaced that the premise "display-only, same data shape" didn't hold: the
grouping is a real stored field, which makes all three of this turn's changes
schema-touching, not two of three as originally framed. The amendment added
`docs/FRAMING.md` definition-of-done items #12–14 and `docs/SPEC.md` criteria
17–19, extended C1 and C6, and narrowed C16 to scope its "no distinct kind" claim
to matching only, since the grouped screen necessarily treats roles distinctly
for display.

A separate build-plan exchange followed, with three more decisions:

- **The one-off migration for the 7 existing profile entries** (including "Full
  Stack," the entry that motivated the whole feature) — migrate all to `'skill'`
  and let the user re-file by hand, migrate while pre-classifying likely roles by
  name, or default a missing group at read time with no migration at all? →
  **Migrate all to `'skill'`, re-file by hand** — a script guessing at stored
  data and writing the guess is the same fragile name-matching already rejected
  for the display layer.
- **How an entry moves between the two sections** — a small move control on each
  row, or delete-and-retype in the other section? → **A small control on each
  row** — retyping would silently lose the entry's years value, and "Full Stack"
  (4 years) is exactly the kind of entry likely to need moving.
- **Test coverage for the delete endpoint**, the app's first destructive
  operation — live verification with no new dependency, add `supertest`, or
  extract just the id-parsing logic into a tested pure function? → **Live
  verification, no dependency** — follows the precedent that every route in this
  codebase is curl-verified while only pure functions are unit-tested; accepted
  cost is that the one destructive endpoint has no automated regression test.

## Turn 5 — recalculate, and three UX fixes

Requested: `recalculate` (C10, specified since v0.1 but never built) — a per-ad
control that re-runs matching for one stored analysis against the current
profile with no model call, since the requirements are already stored — plus a
"recalculate all" control on the ad list applying the same operation to every
stored analysis at once, updating each match snapshot in place. Framed
explicitly as the one deliberate exception to "a stored analysis is never
modified" (C9), stated plainly rather than routed around, since C9 exists to
protect analyses from silently changing when the profile changes and
recalculate is the explicit, user-initiated escape hatch for that. Alongside
recalculate, three UX fixes named in `docs/LESSONS.md`'s "UX findings from real
use" section: an in-app modal replacing the native `window.confirm()` on
delete, a visible loading indicator during ad analysis, and a toast replacing
the plain-text "profile saved" confirmation. The agent was asked to state
plainly whether C9 needed an explicit amendment for the recalculate exception,
or whether its existing wording already permitted this without a spec change.

The plan found that C9 was not the problem — Part 3 was. A line added in turn
4 ("a stored analysis is never modified after it is created — it can be
created or deleted, and nothing else") had been written to justify
paste-time-only ad metadata, and it forbade C10 outright, a criterion that
predates that line by four turns. Four spec amendments were proposed and
approved in the same exchange as the build plan, before any code was written:

- **Part 3's conflict with C10** — fixed by naming the match snapshot as the
  single explicit exception to "never modified," and stating the relationship
  between C9 and C10 directly: C9 forecloses the implicit path (editing the
  profile changes nothing by itself), C10 provides the explicit one.
- **New C20**, since neither C10 ("on one ad") nor FRAMING #8 ("a single ad")
  covered bulk recalculation, and FRAMING's out-of-scope line only rules out
  *automatic* recalculation when the profile changes — user-initiated bulk was
  neither covered nor forbidden.
- **C10 extended** to name the met, gap, and excluded lists explicitly, not
  just "percentages" — updating only the two numbers while leaving the lists
  stale would reproduce the two-screens-disagree failure turn 2's G2 was
  written to prevent.
- **FRAMING #5 reworded** so the list's date column shows whichever date
  actually explains the displayed percentages — the date analysed, or the date
  of the most recent recalculation when the two differ, marked as such —
  rather than unconditionally "the date it was analysed."

Four more decisions were resolved as part of the same build plan:

- **10 of the 27 stored analyses predated turn 3's years/education extraction
  fields** — recalculating them would work, but every requirement would read
  as "no threshold stated" under different semantics than a post-turn-3
  analysis, indistinguishable on screen. Delete them, mark them, or recalculate
  them like any other and accept the risk? → **Deleted all pre-turn-3
  analyses** — this removed the case from the current data entirely rather
  than special-casing code for it; the posture for if it recurs (refuse rather
  than silently compute under different semantics) was recorded but
  deliberately not built, since there was nothing left to guard against.
- **Where the per-ad recalculate control lives** — the detail view, the list
  row next to delete, or both? → **Detail view only** — the met/gap lists it
  changes are actually visible there, and the list row already carries a
  title, two percentages, a date, and delete.
- **Whether "recalculate all" needs a confirmation**, given it overwrites
  every stored match snapshot at once with no undo, though nothing is
  destroyed the way delete destroys data → **One confirmation, reusing the
  same modal built for delete** — overwriting every stored snapshot in one
  click is worth a deliberate beat, and the modal already exists by the time
  this needs it.
- **Whether and where to show the match date**, since after a recalculate the
  existing "date analysed" no longer explains the percentages beside it →
  **Shown in both the list and the detail view**, marked when it differs from
  the analysis date — the ranked list is the screen the tool exists to
  produce, so it shouldn't show a number next to a date that doesn't account
  for it. This is what drove the FRAMING #5 amendment above.
