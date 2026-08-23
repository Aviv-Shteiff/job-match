# Lessons

## Turn 1 — extraction slice

- The model originally configured in `.env` (`meta-llama/llama-3.3-70b-instruct:free`)
  had been withdrawn from OpenRouter's free tier by the time of building (confirmed by
  a live API call, not assumed). Free-tier model availability on OpenRouter turns over
  — treat the configured model as something to re-check, not a fixed fact.
  Switched to `nvidia/nemotron-3-super-120b-a12b:free` after an empirical check
  against a realistic extraction prompt: valid JSON, correctly grounded quotes,
  boilerplate correctly excluded, on the first call, at $0 cost. Two other free
  candidates tried in the same check returned HTTP 429 (provider-side rate limiting
  on OpenRouter's shared free pool) rather than a real answer — free-tier
  availability is noisy call-to-call, not just model-to-model, so a single failed
  call is not evidence a model is unusable.
- `nvidia/nemotron-3-super-120b-a12b:free` is a reasoning model: it emits a long
  internal chain-of-thought before the final JSON content (1651 output tokens for a
  6-item extraction in one real test). On an English ad this took under 1 second; on
  a same-length Hebrew ad, latency varied from ~13s to a full timeout at the 25s
  internal budget across three otherwise-identical live calls. Extraction quality was
  correct every time it did respond — grounding, boilerplate exclusion, and
  must_have/nice_to_have labelling all worked on both languages — but C2's 30-second
  end-to-end bound is genuinely at risk for Hebrew/mixed-script ads with this model,
  not just theoretically. Worth deciding explicitly whether to accept occasional
  timeouts as the visible-failure behaviour SPEC calls for, or move to a
  non-reasoning free model for lower, steadier latency. A later, separate round of
  testing (below) saw a Hebrew ad consistently land around 15s with no timeout — the
  risk above is still real (it happened), but on the evidence gathered so far no
  model change looks necessary yet.

### Manual extraction testing (real ads)

Five real ads read against the extraction pipeline and judged against what a human
would have labelled: three during build-time verification (one Hebrew, two English —
a fintech/React role and a DevOps role) and two more from the user's own testing
afterward (one English full-stack role, one Hebrew role).

- Boilerplate exclusion (C5's added sentence) worked correctly every time. "About
  us", benefits, PTO policy, and diversity statements were never extracted as
  requirements, and — more tellingly — a "What you'll do" section (own architecture,
  collaborate daily, mentor juniors) was correctly left out too, even though nothing
  in the prompt names responsibilities specifically as something to exclude, only
  "background, benefits, culture statements."
- Requirement granularity relative to individual skills showed up two ways, both
  worth turn 2's attention:
  - The duplicate-skill decision (§5's pitfall, resolved by asking the model to
    merge rather than deduplicating in code) worked as designed: an ad mentioning
    "strong Node experience" in prose and "Node.js in production environments" in a
    bullet list was correctly returned as a single requirement, not two.
  - Separately, a requirement naming multiple distinct skills together — "Knowledge
    of MongoDB and SQL-Based database" — stayed as one requirement rather than being
    split into one per skill. Flag this for turn 2's matching logic to handle
    explicitly (substring match against each named skill, or split the requirement)
    rather than let it happen by accident.
- Requirements regularly include soft skills — one ad labelled "Comfortable working
  in a fast-paced, ambiguous environment" as `must_have`; another extracted
  "independent self-learner" and "communication skills" as requirements outright.
  These are defensible readings of the ad text and not a bug, but they raise two
  separate open questions: whether C5's boilerplate rule needs a third bucket or
  clearer guidance for culture-fit language (a pure "background/benefits/culture"
  exclusion doesn't obviously cover a sentence that's neither), and — more
  concretely for turn 2 — a pure tech-skills profile can never match against a soft
  skill, so the matching logic needs to decide explicitly whether to weight these
  differently in the percentage calculation or exclude them from it.
- No fabricated (ungrounded) requirements were observed across any of the five real
  ads — the English full-stack ad and the second Hebrew ad were both fully grounded
  (the Hebrew ad's all seven requirements included), matching the first three. That's
  still a small sample; the grounding check exists precisely because this can't be
  assumed to hold at scale.
- The second Hebrew ad's extraction showed real judgment, not just correct grounding:
  the source sentence "ניסיון בסביבת ענן - חובה! (AWS יתרון)" was correctly split
  into a must-have cloud-experience requirement and a separate nice-to-have AWS
  requirement, rather than merged into one or losing the must/nice-to-have
  distinction. That ad completed in about 15 seconds.
- Display bug found and fixed: mixed Hebrew/English text in the ad textarea and in
  the requirement/quote text rendered with confusing bidi ordering. Fixed by adding
  `dir="auto"` to those elements (`client/src/AdScreen.jsx`) so each line's
  direction is judged from its own content — display only, no change to extraction
  or grounding logic.
- Remaining cosmetic issue, deprioritized on purpose: the requirement card's left
  border accent doesn't flip side for RTL layout. Text itself is fully readable
  either way. Not fixed now since most ads tested so far are in English (LinkedIn);
  revisit in a future design pass if Hebrew ads become more common in practice.

## Turn 2 — matching, ranking, detail view

- The Q1 multi-skill overstatement (substring matching a requirement like
  "Knowledge of MongoDB and SQL-Based database" as fully met if the profile has
  only one of the two skills) is real but currently **latent**, not visible: the
  test profile (Node.js, MongoDB, React, SQL) happens to contain both halves of
  every multi-skill requirement seen so far, so nothing in the current data
  demonstrates the overstatement actually happening. A future reader shouldn't
  read "no overstatement observed" as "the risk didn't materialize" — it means
  the profile hasn't yet been in the specific shape (partial coverage of an
  AND-requirement) that would expose it. Worth deliberately testing with a
  narrower profile before trusting the percentages on a real multi-skill-heavy ad.
  **Update:** now confirmed against real data, not just predicted — see below.
- A requirement that names a role or years-of-experience rather than a specific
  technology — "5 שנות ניסיון בפיתוח Full Stack" (5 years of Full Stack
  development experience) — stays matchable under the approved exclude-list
  (it's not a soft-skill marker) but can never be met by a skills-only profile,
  since nothing in a list of skill names could ever match "Full Stack" as a
  discrete token the way "React" or "Node.js" can. Observed as a permanent gap
  on the real Hebrew full-stack ad. Not a bug under the current rules — a
  skills-only profile genuinely can't express "5 years of experience" — but
  worth watching: if this pattern recurs often, it may argue for a category
  between "matchable" and "soft skill" for experience/seniority requirements.
- Backfilling and re-verifying by hand against all 10 real stored analyses
  (the 8 from turn 1, plus 2 new ones analysed this turn) confirmed every
  computed percentage matches manual calculation, and that ranking, including
  tie-breaking, holds up on real duplicate data: the two identical WeDev ads and
  the two identical Hebrew backend ads sort adjacent to each other, newest
  first, exactly as decided (G5).
- Could not test the list → detail → back click-through in an actual browser
  this session either — the Claude in Chrome skill wasn't available at all this
  time (not just declined). Verified the equivalent behavior at the API level
  instead: fetched every analysis id from the live list endpoint and confirmed
  each detail response has the expected shape, with met + gaps + excluded
  summing to that ad's actual requirement count for all 10 analyses. Rendering
  and click behavior in an actual browser are still unconfirmed by me.
- The Q1 multi-skill overstatement is now confirmed in real data, not just
  theoretical: "Knowledge of MongoDB and SQL-Based databases" is marked as met
  against a profile that has "MongoDB" but no "SQL" skill at all. This is the
  substring-match trade-off from Q1's answer working exactly as expected — not a
  bug, but now an observed case rather than only a predicted risk.
- Tested against a longer, denser real ad (Minute Media — a full job description
  with separate responsibilities, requirements, and advantages sections).
  Boilerplate exclusion held up correctly at this greater length and density.
  Grounding also showed real judgment in a subtler way than anything seen in
  turn 1: the ad's narrative mentions "the backend is written in Go" outside the
  requirements list, describing the stack — and Go was correctly NOT extracted
  as a must-have from that sentence. It only appeared as a requirement where the
  ad names it explicitly, under Advantages. The model did not fill in a
  plausible-sounding requirement from surrounding context, which is exactly the
  failure mode §5's grounding-check pitfall exists to catch.
- Matching only checks whether a skill name appears in the profile — it has no
  concept of experience level, years, education, or role/seniority. Three
  concrete gaps observed across real ads, all currently permanent and
  unresolvable by any profile edit under the current rules:
  - Years of experience per skill: "3+ years of experience with Node.js" is
    marked met by a profile that just lists "Node.js", with no way to express
    how many years.
  - Degree requirements: "Bachelor's degree in Computer Science (BSC) or an
    equivalent technical degree" is neither a soft-skill marker nor a named
    technology, so it stays in the must-have denominator as an unresolvable gap.
  - Role/seniority-level requirements: "4+ years of experience as a full-stack
    developer" — the same shape as the "5 years of Full Stack development
    experience" example already noted above, and equally a permanent gap.
- There's no way to delete an analysed ad from the list. Not in FRAMING.md's
  original scope, but worth having eventually — useful for removing test data
  now and irrelevant ads later.
- The ranked list currently shows duplicate/re-analysed ads as separate entries
  with no visual distinction. Expected, per the plan's G9 decision not to
  de-duplicate (avoids silently discarding stored evidence) — but worth deciding
  in a future turn whether re-analyses of the same ad should be grouped or
  marked.

Decided next step (turn 3): the three permanent-gap categories above —
experience-per-skill, education, and role/seniority — will be addressed in
turn 3 by extending the profile and matching logic, ahead of the recalculate
button, which moves to turn 4. This is a deliberate scope extension rather than
a clarification: FRAMING.md never defined the profile's contents at all — it
said only "a skills profile", and the "list of skill names" phrasing came from
turn 1's build prompt, not from the document — so this fills a silence rather
than resolving an ambiguity. Like turn 1 and turn 2's amendments, it will be
proposed as new FRAMING.md/SPEC.md criteria for approval before turn 3's build
prompt is written, not decided silently.

## Turn 3 — profile depth (years, education, roles)

All 11 ads stored before this turn were re-analysed against the new extraction
and the user's real, filled-in profile (Node.js: 5y, MongoDB: 2y, React: 1y,
SQL: 0y, Express: no years recorded, Full Stack: 4y, Git: no years recorded;
education: BSc Computer Science). Every resulting percentage, met/gap split,
and gap reason was checked by hand against that profile.

- The stricter extraction schema (turn-3 Q2: years_required and
  is_education_requirement required as present keys) never once caused a
  wrong_shape or bad_label failure across all 11 re-analyses. Every failure —
  5 of 11 on the first pass, all eventually succeeding on retry — was
  model_timeout. The schema change didn't make the model worse at following
  instructions; it made responses longer (more to reason about per
  requirement), and this model's latency was already the known risk
  (documented in turn 1's lessons). Worth stating precisely rather than
  leaving Q2's "more visible failures" prediction unquantified: on this
  sample, the cost was latency, not malformed output.
- Role-entry matching (C16) was confirmed working end to end in production,
  not just in unit tests, in both directions on the same profile entry
  ("Full Stack", 4 years): the Minute Media ad's "4+ years of experience as a
  full-stack developer" matched and met (4 ≥ 4); the Hebrew ad's "5 שנות
  ניסיון בפיתוח Full Stack" matched and correctly produced a shortfall gap
  (4 < 5, shown as required: 5, recorded: 4). Choosing the shorter profile
  wording ("Full Stack" rather than "Full Stack Developer") is also what let
  both ads match at all — confirming the wording-sensitivity pitfall
  documented in SPEC.md §5 mattered in exactly the way it warned about, and
  that avoiding it was a real, correct choice rather than a hypothetical one.
- The Q1 multi-skill overstatement has now been confirmed on three separate
  real ads total across two turns: turn 2's original case ("MongoDB and
  SQL-Based database," met via MongoDB alone), plus two more found in later
  testing — including "Strong proficiency in vanilla JavaScript and React,"
  marked met through the profile's React entry alone with no JavaScript entry
  in the profile at all. Same mechanism every time. Still deferred to a
  future turn's extraction change per the turn-2 decision, but worth
  recording that it keeps recurring, not a one-off.
- Multi-skill years matching (turn-3 Q3: highest years among matching skills
  with years recorded) was confirmed correctly ignoring a null: "3+ years of
  experience with Node.js and Express" matched Node.js (5y) and Express (no
  years recorded), and was met on Node.js's 5 alone — Express's null did not
  drag the outcome down or get treated as 0, exactly as designed.
- C14 (no stated threshold, met by presence alone) was confirmed on a skill
  with no years recorded: "version control tools such as Git" matched the
  profile's Git entry (no years recorded) and was met, since the requirement
  itself stated no threshold to fail.
- One ad (the Fintech/React role) scored a genuine 0% must-have match: React
  wanted at 5+ years against a profile recording 1, plus two more skills
  (TypeScript, state management) entirely absent from the profile. Not a bug
  — the profile genuinely doesn't fit this ad — but worth naming as a real
  example of the tool producing a harsh, honest score rather than softening
  a bad fit, which is the whole point of building it.
- Confirmed live on a real ad, by the user, on top of the above: a threshold
  gap shows the exact reason as designed — a React requirement stating "5+
  years" against a profile recording 3 years produced "Requires 5+ years;
  your profile records 3." A borderline case in the same session — MongoDB
  required at "2+ years" against a profile recording exactly 2 — correctly
  scored as met, not a gap: the boundary condition (recorded years == required
  years) works.
- Confirmed live: the education field worked end to end on a real ad — a
  profile education entry of "BSc Computer Science" matched an ad requirement
  for "Bachelor's degree in Computer Science or equivalent technical degree,"
  per Q4's field-of-study rule.
- Confirmed live, and worth flagging explicitly: a "Full Stack" profile entry
  (4 years) did NOT match a real ad's requirement of "5+ years of experience
  as a Backend Developer." This is exactly the wording-sensitivity pitfall
  SPEC.md §5 already predicted, not a bug — a role entry only matches a
  requirement naming that same role. Closing this specific gap would need a
  separate "Backend" (or "Backend Developer") entry in the profile.

### Ideas for a future turn (not scoped, just recorded)

Surfaced while reviewing the app in real use. None of this is turn 4's scope
by default — turn 4 was already earmarked for the recalculate button. Recorded
as candidates to discuss, not a plan.

**Update:** the first three were promoted into turn 4's spec amendment, and the
recalculate button moved to a later turn. The two entries added at the end of
this list came out of that amendment and are still unscoped.

- Split the profile screen into two visually distinct sections: "Skills" for
  technologies/tools, and "Roles & experience" for role-level entries like
  "Full Stack" or "Backend". Same underlying data (one skills list),
  display-only change. Directly motivated by the Backend Developer gap above
  — a clearer prompt to add role entries would make gaps like that easier to
  close.
- Let the user optionally enter a job title and/or company name when pasting
  an ad, and optionally a URL to the original posting. The ad list currently
  shows auto-derived titles like "About the job," which aren't useful for
  telling analysed ads apart, and there's no way to get back to the source
  posting.
- The missing delete button (already flagged after turn 2) is more useful
  once the above two exist, since the list will carry more identifying
  information worth curating.
- Part 2 now holds three criteria whose final clause can only be checked by
  eye rather than by a test: C5's boilerplate exclusion, C13's "the shortfall
  is shown as the reason", and C18's "a derived label reads as derived". Each
  is honest about being a §4 manual check, but they have accumulated one turn
  at a time, and Part 2 is meant to be the testable part of the spec. Worth
  deciding once whether such clauses belong in Part 4 or Part 5 instead of
  continuing to add them to Part 2. Deliberately deferred — a documentation
  reorganization, not a behaviour change.
- The `modelCalls` collection now grows monotonically relative to `analyses`:
  C19 deliberately keeps a model-call record when the analysis it produced is
  deleted, so the cost and latency history survives (CLAUDE.md requires every
  model call to be logged). This is as designed, not a leak — but it means the
  two collections will drift apart over time, and `modelCalls` will contain
  entries pointing at analyses that no longer exist. Nothing reads that
  collection today. Noted so it isn't a surprise to whoever first does.

## Turn 4 — ad metadata, deletion, grouped profile

- The delete-then-re-paste remedy for a badly-labelled ad — the mechanism the
  spec amendment relies on for fixing the 24 ads that predate title/company —
  was tested for real, not just assumed to work: deleted a duplicate "About
  the job / WeDev Technologies" analysis, re-submitted the identical ad text
  with a title and company this time, and it came back correctly labelled
  "Full Stack Developer — WeDev Technologies". The cycle costs one model call
  and works exactly as the amendment describes.
- Deleting is confirmed genuinely hard and genuinely isolated: after the test
  above, `analyses` moved from 26 to 25 to 26 again (delete, then re-add),
  while `modelCalls` only ever grew (43 total by the end of this turn) —
  confirming, on real data rather than by reading the code, that a delete
  never touches the call log, which is the specific claim C19 makes.
- The migration for the 7 profile entries and the move-between-sections
  control were exercised together, not just separately: the migration wrote
  `group: 'skill'` to all 7 (including "Full Stack"), and the entry was then
  moved to Roles & Experience through the same PUT the profile screen uses
  — confirming the whole path C1/Q1/Q2 describes, migration through to a
  corrected profile, works end to end rather than only in isolation at each
  step.
- Both gaps flagged when this turn's plan was written are still open, as
  expected — recorded here so they don't need rediscovering: C19's claim that
  a deleted analysis's model-call record survives is unfalsifiable, since
  `modelCalls` and `analyses` share no linking field in either direction
  (confirmed directly against both collections' schemas); and the delete
  endpoint — the app's first destructive operation — has no automated
  regression test, verified live instead, consistent with every other route
  in this codebase but still the highest-stakes gap in the suite.
- 3 of 27 stored analyses now carry an entered title, all from this turn's
  own testing. The other 24 remain exactly as predicted when the amendment
  was drafted: unlabelled, distinguishable only by date, fixable only by
  delete-and-re-paste — which the first finding above now confirms actually
  works, not just in principle.
- Tested end to end on a real ad with all three optional fields filled in
  (title "Backend Developer", company "FinPay Europe", posting link).
  Confirmed live: the entered title and company display in the ad list in
  normal weight, not the italic/grey derived-label styling — the two cases
  read as visibly different, as C18 intends. The posting link renders as a
  working clickable link on the detail view only, never in the list.
- Confirmed live: a "Full Stack" role entry (4 years) did NOT match a "4+
  years of experience as a Backend Developer" requirement on this ad — the
  same wording-sensitivity pitfall already flagged in turn 3, reproduced on
  independent data with a different role pairing (Full Stack vs. Backend,
  not Full Stack vs. Full Stack Developer this time).
- Confirmed live: a years-recorded-but-empty skill (Git, no years) produces
  a distinct gap message — "In your profile, but no years of experience
  recorded" — different from "Not in your profile," used when the skill is
  absent entirely. Both messages were designed for in turn 3; this is the
  first live confirmation they actually render differently rather than
  collapsing into the same text.
- Confirmed live: the delete control works correctly end to end, but its
  confirmation is a raw browser `window.confirm()` dialog — functional, but
  visually inconsistent with the rest of the app.

### UX findings from real use (not this turn's scope)

- The delete confirmation should be an in-app modal styled to match the
  app, replacing the native `window.confirm()` dialog.
- The "Analysing…" state during ad submission is currently just a disabled
  button label. A more visible loading indicator (e.g. a spinner with a
  dimmed background) would make it clearer that something is happening,
  especially given observed latency of 15-25 seconds on some ads.
- The "profile saved" confirmation is plain text next to the Save button. A
  nicer transient confirmation (e.g. a toast notification) would read
  better.
- These three, plus a full visual pass (colours, typography, buttons,
  general modernization), are earmarked for a dedicated design turn after
  recalculate (turn 5) is built — not before, since the screens may still
  change shape until the remaining functional piece is in place.

## Turn 5 — recalculate, and three UX fixes

- The prompt expected no spec amendment; there were four. The one worth
  remembering is that Part 3 — not C9 — was blocking recalculate: a line
  added in turn 4 ("a stored analysis is never modified after it is
  created — it can be created or deleted, and nothing else") contradicted
  C10, which has been in the spec since v0.1. A defect this project
  introduced, not one inherent to the spec. Worth the general lesson: a
  spec amendment written to justify one turn's decision can quietly
  foreclose a criterion several turns older, and nothing catches that
  automatically — it surfaced only because this turn happened to need the
  thing the earlier wording forbade.
- Recorded, deliberately not built: 10 of the 27 stored analyses predated
  turn 3's years/education extraction fields. The user resolved this by
  deleting all of them rather than by code handling the gap — "this case
  no longer exists in the current data." If an analysis missing
  years_required/is_education_requirement ever appears again by some
  other path, the recorded posture is that recalculate should refuse with
  a clear message rather than silently compute under different semantics
  (a missing years_required reads as "no threshold," producing real
  numbers that mean something different from a post-turn-3 analysis with
  nothing to distinguish them on screen). No guard exists for this today;
  see the comment in server/src/lib/recalculate.js.
- Recalculate was tested against real, meaningful profile edits, not just
  a full wipe-and-restore: added AWS (3 years) to the live profile and
  recalculated a real DevOps ad whose only gaps were AWS, Docker, CI/CD,
  Kubernetes, and Terraform. Must-have match moved 25% → 50%, with AWS
  correctly shifting from the gaps list to the met list and nothing else
  changing. Reverted and ran recalculate-all to bring every analysis back
  in sync with the restored profile — confirmed at 25% again on the same
  ad, which is itself a live demonstration that recalculate-all is a
  reliable way to resynchronize the whole list after any profile change,
  not only the one-off scenario it was built for.
- The match-date logic (matchDateInfo, duplicated between AdListScreen
  and AdDetailScreen) needed a 5-second tolerance that wasn't anticipated
  in the plan: buildMatchSnapshot runs synchronously, milliseconds before
  analyzedAt is set, on every freshly analysed ad — so a naive
  matchedAt !== analyzedAt check would have marked every single ad as
  "recalculated" from the moment it was created. Confirmed against a
  genuinely recalculated ad (9 hours apart) and a simulated fresh one
  (2ms apart) before trusting the logic.
- modelCalls has grown to 44 entries against 17 analyses (turn 4's
  LESSONS.md entry predicted this drift; now directly observed). Still
  nothing reads that collection.
- All five pieces of this turn confirmed live, by the user, on top of the
  above:
  - Toast notification on profile save: confirmed working, styled
    consistently, auto-dismisses.
  - Loading overlay during ad analysis: confirmed functional (spinner,
    dimmed background, "up to 30 seconds" message) — but the overlay
    text visually overlaps the title/company/link fields below it, with
    no background container separating it from the page content.
    Functional, not polished — noted for the design turn.
  - Per-ad recalculate: confirmed end to end on a real ad. Raised
    MongoDB from 2 to 3 years in the profile, recalculated a stored
    analysis whose "3+ years of experience with MongoDB" requirement
    was a gap — it correctly moved to met, the percentage updated (75%
    to 100%), and the label changed from "Analysed" to "Recalculated"
    with the new date.
  - Delete confirmation modal: confirmed — an in-app styled dialog
    naming the specific ad, replacing the native browser confirm().
  - Recalculate-all: confirmed on all 17 stored analyses at once. The
    confirmation modal correctly stated the exact count and that no
    model call is made. One analysis's must-have percentage changed
    live (60% to 80%) reflecting an unrelated profile edit (Express
    years added) made earlier — confirming recalculate-all responds to
    real profile state, not just re-stamping dates.
  - Noted and understood, not a bug: once any analysis is recalculated,
    its list label permanently reads "Recalculated" instead of
    "Analysed," even after a later recalculation. Intended per Q4/
    FRAMING #5 — the label states which kind of event the displayed
    date and percentages come from, and that fact doesn't reverse
    itself.

## Turn 6 — visual design pass

- The two JSX changes planned up front (a wrapper div for the
  loading-overlay card; a met-list class on the detail view's two met
  sections) were both verified by more than reading the diff: the JS
  bundle grew by exactly 50 bytes for the first and exactly 10 bytes
  for the second, matching what each change should cost almost to the
  byte, and `git diff` showed nothing else in either file. Every other
  step's bundle size was byte-for-byte identical to the step before it
  — the strongest evidence available, short of a browser, that seven of
  the nine steps touched no behaviour at all.
- Choosing green for "met" (Q4) turned out to have a real, unplanned
  consequence: `.ad-recalculated-tag` had been coloured green since
  turn 5 with no real deliberation behind it, and once green became
  load-bearing for match outcomes, that tag had to move to neutral grey
  — a date label sharing "met"'s colour would have silently implied a
  positive result. Caught while executing the list-screen step, not
  anticipated in the plan.
- The toast notification (profile saved) was also moved off green,
  though nothing required it — a toast and a requirement list never
  appear on screen together. Kept as a deliberate simplification: one
  colour, one meaning, everywhere in the app, rather than "green means
  met, except when it means success."
- `.ad-percent` (singular) had been used in AdListScreen's JSX since
  turn 2 with no CSS rule ever written for it — flagged as a probable
  leftover in the plan, confirmed and given a small rule during this
  step's verification pass rather than left unaddressed.
- Verified the RTL and accessibility surface is exactly unchanged, not
  just probably unchanged: 14 dir="auto" attributes, 6 aria-label, 1
  aria-hidden, 1 aria-modal, 4 role="alert", 1 role="dialog", 1
  role="status" — identical counts before and after all nine steps.
- Could not verify any of this visually — no browser tool was available
  this session either. A client dev server was already running with an
  active browser connection when this step checked, which may mean it
  was open and hot-reloading throughout the session, but that was not
  confirmed directly. Rendering, spacing, and colour contrast in an
  actual browser remain unconfirmed by the agent; recommend opening the
  app and clicking through all three screens before treating this turn
  as done.
