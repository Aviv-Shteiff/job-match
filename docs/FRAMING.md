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

1. A skills profile can be created and edited, and it persists between visits. A
   skill entry is a name and, optionally, the number of years of experience behind
   it. The profile also holds one optional free-text education entry. A role or
   seniority level — "Full Stack Developer", "Backend Developer" — is a skill entry
   like any other and is matched the same way; the profile screen groups role
   entries under their own heading so they are easy to notice and add, but that
   grouping changes only what is shown, never how anything is matched.
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
10. A requirement that names a minimum number of years is judged against the years
    recorded for the matching skill, not against the skill's presence alone. A
    requirement that names no number is met by presence alone.
11. A requirement for a degree is judged against the profile's education entry. An
    empty education entry makes such a requirement a gap, not something skipped.
12. Pasting an ad accepts an optional job title, company name, and link to the
    original posting. All three are free text, and an ad can be analysed without
    any of them.
13. The ad list identifies each ad by the title and company entered for it, falling
    back to text derived from the ad itself when none were entered. The link, when
    there is one, is on the ad's own page, not in the list.
14. An ad can be deleted from the list. Deleting asks once, then removes it for
    good.

## Out of scope

- Scraping job boards. Ads are pasted as text by hand.
- Fetching, validating, or following the posting link. It is stored and shown as
  text the user typed, nothing more.
- Recovering a deleted ad.
- Parsing CV or résumé files. The profile is typed by hand.
- Inferring years of experience or education from anything other than what is typed
  into the profile by hand.
- A controlled vocabulary of degree types, or any validation that an education entry
  names a real qualification.
- Multiple users, registration, or authentication.
- Sending applications or generating cover letters.
- Automatic recalculation of stored ads when the profile changes.

## Constraints

- One person building, no budget beyond free tiers.
- Deleting is permanent, and stays that way. No archive, no trash, no hidden
  "deleted" flag. If permanence ever starts to feel wrong, the answer is to add an
  explicit undo deliberately, not to quietly soften delete into a flag.
- The profile stays small enough to read at a glance: one number per skill, one line
  of education text. No per-skill history, no nested structure, nothing that turns
  keeping the profile current into data entry.
- Backend must be Node/Express and the database MongoDB — the parts I can read and
  review without learning them first.
- No TypeScript.
- React on the frontend. I am not learning React for this project — the agent builds
  the client code without expecting me to write or deeply understand React myself.
  My review of the client happens at the level of behaviour (does the screen do what
  Part 2 says), not at the level of JSX or component internals.