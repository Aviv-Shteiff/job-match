import { isMatchable } from './matchable.js';
import { skillMatches } from './skillMatch.js';

// C6/C8/C12: match a stored analysis's requirements against a skills profile, in
// ordinary code, no model call. Soft-skill requirements (matchable.js) are
// excluded from both lists and the percentage denominator entirely. A zero
// denominator yields null, not 0 — consistent with turn 1's rule that null means
// "not computed," never a placeholder mistakable for a real answer.
function percent(matched, matchable) {
  if (matchable === 0) return null;
  return Math.round((matched / matchable) * 100);
}

export function computeMatch(requirements, profileSkills) {
  const met = { must_have: [], nice_to_have: [] };
  const gaps = { must_have: [], nice_to_have: [] };
  const excluded = [];

  for (const requirement of requirements) {
    if (!isMatchable(requirement.text)) {
      excluded.push(requirement);
      continue;
    }

    const isMet = profileSkills.some((skill) => skillMatches(skill, requirement.text));
    (isMet ? met : gaps)[requirement.type].push(requirement);
  }

  const mustHaveMatched = met.must_have.length;
  const mustHaveMatchable = mustHaveMatched + gaps.must_have.length;
  const niceToHaveMatched = met.nice_to_have.length;
  const niceToHaveMatchable = niceToHaveMatched + gaps.nice_to_have.length;

  return {
    // Met requirements: must-have first, nice-to-have after; extraction order
    // preserved within each type (no criterion orders the met list, unlike C8's
    // explicit gap ordering, so this is the simplest consistent choice).
    met: [...met.must_have, ...met.nice_to_have],
    // C8: must-have gaps before nice-to-have gaps.
    gaps: [...gaps.must_have, ...gaps.nice_to_have],
    excluded,
    counts: {
      mustHaveMatched,
      mustHaveMatchable,
      niceToHaveMatched,
      niceToHaveMatchable,
    },
    mustHavePercent: percent(mustHaveMatched, mustHaveMatchable),
    niceToHavePercent: percent(niceToHaveMatched, niceToHaveMatchable),
  };
}

// Wraps computeMatch() with the provenance a stored snapshot needs: which profile
// skills produced this result and when. Kept separate from computeMatch so that
// function stays pure and trivially testable (no Date.now() inside it). Shared by
// analyse.js (computed at analysis time) and the backfill script (computed once,
// after the fact, for analyses stored before matching existed).
export function buildMatchSnapshot(requirements, profileSkills) {
  return {
    ...computeMatch(requirements, profileSkills),
    profileSkillsUsed: profileSkills,
    matchedAt: new Date(),
  };
}
