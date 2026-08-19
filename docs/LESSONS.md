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
