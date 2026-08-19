# Framing — Job Match

## The problem

Someone searching for a junior tech role collects dozens of job ads and cannot tell
which ones are worth applying to first. Reading them one by one works badly at scale:
by the tenth ad you have forgotten the third, the comparison is done from memory, and
the ranking is a feeling rather than a judgement. Effort then goes to the wrong ads
and the wrong preparation.

## Who has a stake

- The job seeker using the tool, who reads the ranking and decides where to apply.
- The employers whose ads are pasted in. Their text is processed privately and never
  republished.
- A later reader of this repository, who must be able to reconstruct what was decided
  and why.

## Definition of done

Each line is true or false when someone else runs the app.

1. A skills profile can be created and edited, and it persists between visits.
2. Pasting a job ad returns a list of its requirements, each labelled must-have or
   nice-to-have, or a visible error, within 30 seconds.
3. Every requirement shown carries a quote that is present in the pasted ad text. A
   requirement whose quote is not found in the source is never shown as a requirement.
4. Each analysed ad is saved and appears in a list ranked by match percentage.
5. The list shows, for each ad, the match percentage for must-have requirements, the
   match percentage for nice-to-have requirements, and the date it was analysed.
6. Opening an ad shows which requirements are met and which are gaps, with must-have
   gaps listed before nice-to-have gaps.
7. Editing the profile does not change the percentages already stored on existing ads.
8. Pressing "recalculate" on a single ad updates that ad's percentages against the
   current profile, without calling the model again.
9. A malformed or failed model response produces a visible failure. It never produces
   an empty requirement list presented as a successful analysis.

## Out of scope

- Scraping job boards. Ads are pasted as text by hand.
- Parsing CV or résumé files. The profile is typed by hand.
- Multiple users, registration, or authentication.
- Sending applications or generating cover letters.
- Automatic recalculation of stored ads when the profile changes.

## Constraints

- One person building, no budget beyond free tiers.
- Backend must be Node/Express and the database MongoDB — the parts I can read and
  review without learning them first.
- No TypeScript.
- React on the frontend. I am not learning React for this project — the agent builds
  the client code without expecting me to write or deeply understand React myself.
  My review of the client happens at the level of behaviour (does the screen do what
  Part 2 says), not at the level of JSX or component internals.