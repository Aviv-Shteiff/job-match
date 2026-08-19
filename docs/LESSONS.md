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
