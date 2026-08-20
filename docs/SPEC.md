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

1. A skills profile can be created, edited, and persists between sessions. A skill
   entry is a name plus an optional number of years of experience; the profile also
   holds one optional free-text education entry. A skill with no years recorded is
   not the same as a skill recorded as zero years — the first says nothing about
   duration, the second says there is none — and the two are stored distinctly.
   Each entry also records which of the profile screen's two groups it belongs to —
   skills, or roles and experience — defaulting to skills. That grouping is display
   only: nothing in matching reads it.
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
   has simply not reached that stage yet. An analysis also stores the profile
   snapshot it was matched against — skill names, their years, and the education
   entry — so a stored percentage can be explained by the profile that produced it
   rather than by the profile as it now stands. An analysis also stores whatever job
   title, company name, and posting link were entered when the ad was submitted. All
   three are optional; an analysis carrying none of them is complete, not partial.
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
13. A requirement stating a minimum number of years is met only when the matching
    profile skill records at least that many. A skill with no years recorded does
    not satisfy a stated threshold, and the shortfall is shown as the reason for the
    gap rather than left to be inferred.
14. A requirement stating no number of years is met by the presence of the matching
    skill, whatever years are or are not recorded against it.
15. A requirement for a degree or formal education is met only when the profile's
    education entry names the same field of study, compared after degree-type words
    ("BSc", "bachelor", "degree", "תואר") are set aside on both sides. An empty
    education entry makes such a requirement a gap; it is never dropped from the
    calculation the way a soft-skill requirement is. A requirement naming no field
    at all — "an equivalent technical degree" — is met by any non-empty education
    entry.
16. Roles and seniority levels are matched by the same mechanism as any other skill
    entry. Nothing in matching — no criterion, no comparison, no code path that
    produces a percentage or a gap — treats them as a distinct kind. The profile
    screen groups them separately for display only, and matching ignores that
    grouping entirely.
17. Submitting an ad accepts an optional job title, company name, and posting link,
    each free text. None is required, and none is validated beyond being text — the
    link in particular is never fetched or checked for reachability.
18. The ad list identifies each ad by its entered title and company. An analysis
    with neither falls back to text derived from the ad, and a derived label is
    presented so that it reads as derived rather than as something typed. Like C5's
    boilerplate clause, that last part is checked by eye per §4, not by an automated
    test. The posting link appears only on the detail view, and only when one was
    entered.
19. An analysis can be deleted. Deletion is permanent, takes one confirmation, and
    works for any analysis regardless of when it was created or which fields it
    carries. The record of the model call that produced it is not deleted with it —
    the cost and latency log survives the analysis.

## 3. Architectural boundaries

- The Express backend holds the OpenRouter API key. It never reaches the browser.
- All persistence is MongoDB.
- A stored analysis is never modified after it is created — it can be created or
  deleted, and nothing else. The title, company, and link are captured at submission
  and are as fixed afterwards as the model's own output.
- The profile is one document: skill entries, each a name with optional years and a
  display group, and one optional education string. Roles and seniority are skill
  entries, not a second schema.
- The frontend is React with Vite, in plain JavaScript. No TypeScript anywhere.
- The model is called only to extract and classify requirements from ad text.
  Classifying includes reading off what the ad states about a requirement: its
  must-have/nice-to-have label, any minimum number of years, and whether it asks for
  a degree. Comparing those readings against the profile — and every percentage,
  ordering, storage, and grounding decision that follows — is ordinary code.
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
- Ads state experience many ways: "3+ years", "at least 3 years", "3-5 years",
  "minimum 3 years", "שלוש שנות ניסיון". Decide which of these yield a comparable
  number, and what happens to a requirement whose phrasing yields none.
- A number of years in an ad does not always attach to a skill. "4+ years as a
  full-stack developer" is a threshold on the role; "3+ years with Node.js" is a
  threshold on one skill. The same number means different things.
- Education requirements usually carry an escape hatch — "or an equivalent technical
  degree", "or equivalent experience". Treating the degree as a hard requirement
  over-reports gaps; ignoring the clause under-reports them.
- The wording chosen for a profile entry silently decides whether it matches. "Full
  Stack Developer" matches an English ad's "4+ years of experience as a full-stack
  developer" but not a Hebrew ad's "5 שנות ניסיון בפיתוח Full Stack", where "Full
  Stack" alone matches both. Nothing tells the user this.
- Years recorded in a profile go stale. Nothing updates them as time passes.
