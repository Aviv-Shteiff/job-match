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
  non-reasoning free model for lower, steadier latency.
- Manual read of three real ads (§4's required check) against the extraction pipeline
  — one Hebrew, two English, covering a fintech/React role and a DevOps role:
  - Boilerplate exclusion (C5's added sentence) worked correctly every time.
    "About us", benefits, PTO policy, and diversity statements were never extracted
    as requirements, and — more tellingly — a "What you'll do" section (own
    architecture, collaborate daily, mentor juniors) was correctly left out too, even
    though nothing in the prompt names responsibilities specifically as something to
    exclude, only "background, benefits, culture statements."
  - The duplicate-skill decision (§5's pitfall, resolved by asking the model to merge
    rather than deduplicating in code) worked as designed: an ad mentioning "strong
    Node experience" in prose and "Node.js in production environments" in a bullet
    list was correctly returned as a single requirement, not two.
  - One genuinely borderline call: "Comfortable working in a fast-paced, ambiguous
    environment," listed under the ad's own "what we're looking for" heading, was
    labelled `must_have`. That's a defensible reading of the ad, but it's a
    soft-skill/culture-fit statement, not a hard qualification — the kind of
    sentence C5's new boilerplate rule doesn't clearly cover either way, since it
    isn't "company background" but also isn't a skill. Not a bug; a real ambiguity
    in the ad text itself, worth watching for as more ads are analysed — if it
    recurs, C5 may need a third bucket or clearer guidance on culture-fit language.
  - No fabricated (ungrounded) requirements were observed in any of the three calls
    — grounding rejected 0 of 0 across all three. That's a small sample; the
    grounding check exists precisely because this can't be assumed to hold at scale.
