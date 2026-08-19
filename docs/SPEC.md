# Specification — Job Match (v0.1)

## 1. Goal and reason

Build a single-user web application that keeps a skills profile, extracts structured
requirements from pasted job ads, and ranks the collected ads by how well they match
the profile.

The reason: a job seeker's scarce resource is attention, and reading twenty ads by
hand produces a ranking made from memory and fatigue. The tool exists to turn a pile
of ads into an ordered list, so the next application goes to the ad most worth the
effort.

Where this document is silent, decide in favour of making a real gap more visible.

## 2. Testable success criteria

1. A skills profile can be created, edited, and persists between sessions.
2. Submitting ad text returns a requirement list or a visible error within 30 seconds.
   Text shorter than 200 characters is rejected before any model call, with a message
   asking for the full ad — this is a minimum length guard against empty or accidental
   submissions, not a claim about what makes a valid job ad.
3. Every extracted requirement carries a `source_quote` field, and that quote is
   present in the submitted ad text after Unicode-aware normalization: NFKC
   normalization, removal of bidirectional and zero-width control characters,
   collapsing of all Unicode whitespace to a single space, and case-folding.
   Punctuation and wording are not altered — the quote must still match what the ad
   actually says, only its script direction and casing are neutralized.
4. A requirement whose `source_quote` is not found in the source text is not shown as
   a requirement.
5. Every shown requirement is labelled exactly one of `must_have` or `nice_to_have`.
   Sentences that are not a skill, qualification, or experience requirement —
   company background, benefits, culture statements, equal-opportunity text — must
   not be extracted as a requirement at all; this is checked manually per §4, not by
   an automated test, since there is no ground truth to assert against.
6. Each analysis stores: the ad text, the requirement list, the must-have match
   percentage, the nice-to-have match percentage, the analysis timestamp, the model
   identifier, input and output tokens, cost, and latency in milliseconds. The two
   percentages are absent or `null` until a skills profile has been matched against
   the analysis — an analysis produced before matching exists is not incomplete, it
   has simply not reached that stage yet.
7. The ad list is ordered by must-have match percentage, highest first.
8. The detail view lists met requirements and gaps, with must-have gaps before
   nice-to-have gaps.
9. Editing the profile leaves the stored percentages on existing ads unchanged.
10. "Recalculate" on one ad updates that ad's percentages against the current profile
    and makes no model call.
11. A model response that is not valid JSON, or is missing required fields, produces
    a visible failure state, never an empty list rendered as success.
12. Matching, percentage calculation, and gap ordering are performed in ordinary code
    with no model call.

## 3. Architectural boundaries

- The Express backend holds the OpenRouter API key. It never reaches the browser.
- All persistence is MongoDB.
- The frontend is React with Vite, in plain JavaScript. No TypeScript anywhere.
- The model is called only to extract and classify requirements from ad text.
  Everything else — matching, percentages, ordering, storage, the grounding check —
  is ordinary code.
- Model access goes through OpenRouter so the model can be changed by configuration.

File layout and module boundaries inside `server/` and `client/` are the agent's
decisions.

## 4. Validation approach

- Tests are written from the criteria in Part 2, not from the implementation. An agent
  that writes a function and its tests from the same reading of its own code produces
  tests that confirm the code agrees with itself.
- The grounding check is covered by a test that feeds it a fabricated requirement whose
  quote does not appear in the source, and asserts it is rejected.
- The failure path is covered by a test that hands the response handler a malformed
  model reply and asserts a visible failure rather than an empty result.
- Once the first slice is built, extraction quality is checked manually: real ads are
  pasted in and the output is read against what I would have labelled myself. Issues
  found this way go into `docs/LESSONS.md` and become sharper criteria or pitfalls for
  the next turn.

## 5. Known pitfalls

- Ads mix Hebrew and English in the same paragraph. Quote matching must survive mixed
  scripts and RTL text.
- The same skill appears twice in one ad in different wording ("Node", "Node.js").
  Decide deliberately whether that is one requirement or two.
- Skill names in the profile will not match ad wording exactly. Matching must tolerate
  variants; exact string equality will under-report every time.
- Models return prose when asked for JSON. Validate the shape rather than trusting the
  first reply.
- A model will confidently return a requirement typical of such ads but absent from
  this one. That is the specific failure the grounding check exists to catch.
- Company boilerplate — "about us", benefits, equal-opportunity text — is not a
  requirement and will be extracted as one unless excluded on purpose.
- OpenRouter calls time out and rate-limit. A timeout must surface as a failure, not
  as an empty analysis.
- Very long ads exceed a sensible token budget. Decide the cap and the behaviour at
  the cap.