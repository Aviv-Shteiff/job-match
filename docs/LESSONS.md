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
button, which moves to turn 4. This is a deliberate scope extension beyond
FRAMING.md's current "list of skill names" profile definition, not a spec
clarification — like turn 1 and turn 2's amendments, it will be proposed as new
FRAMING.md/SPEC.md criteria for approval before turn 3's build prompt is
written, not decided silently.
