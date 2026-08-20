import { buildMatchSnapshot } from './matching.js';

// C10/C20: recalculate replaces an analysis's match snapshot against the current
// profile, with no model call. SPEC.md Part 3 names this the single exception to
// "a stored analysis is never modified after it is created" — everything else on
// the document (ad text, requirements, title, company, link, analyzedAt, the
// model-call metadata) is untouched, because this function only ever returns
// these three fields; the route does a partial update with exactly them.
//
// Deliberately no guard here for a requirement missing years_required or
// is_education_requirement (the turn-1..2 extraction shape). No stored analysis
// currently lacks those fields — the ones that did were deleted before this turn.
// If one reappears by some other path, recalculate should refuse with a clear
// message rather than silently compute under different semantics (see
// docs/LESSONS.md, turn 5) — not built now, since there is nothing today to guard
// against.
export function recalculateMatch(requirements, profile) {
  const match = buildMatchSnapshot(requirements, profile);
  return {
    match,
    mustHavePercent: match.mustHavePercent,
    niceToHavePercent: match.niceToHavePercent,
  };
}
