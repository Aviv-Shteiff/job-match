import { isMatchable } from './matchable.js';
import { skillMatches } from './skillMatch.js';
import { educationMatches } from './educationMatch.js';

// C6/C8/C12: match a stored analysis's requirements against a skills profile, in
// ordinary code, no model call. Soft-skill requirements (matchable.js) are
// excluded from both lists and the percentage denominator entirely — but an
// education requirement (is_education_requirement) is never excluded that way,
// even if its wording happens to contain a soft-skill marker (C15). A zero
// denominator yields null, not 0 — consistent with turn 1's rule that null means
// "not computed," never a placeholder mistakable for a real answer.
function percent(matched, matchable) {
  if (matchable === 0) return null;
  return Math.round((matched / matchable) * 100);
}

function findMatchingSkills(requirementText, skills) {
  return skills.filter((skill) => skillMatches(skill.name, requirementText));
}

// C13/C14. Turn-3 decisions: a shortfall is a strict gap with the reason shown
// (Q1), not partial credit; when several profile skills match one requirement,
// the highest recorded years wins (Q3); a threshold with no matching skill at
// all is 'skill_missing', distinguished from 'no_years_recorded' (G10).
function resolveYearsOutcome(requirement, matchingSkills) {
  if (matchingSkills.length === 0) {
    return { met: false, gapReason: { code: 'skill_missing' } };
  }

  if (!requirement.years_required) {
    return { met: true };
  }

  const recordedYears = matchingSkills
    .map((skill) => skill.years)
    .filter((years) => years !== null && years !== undefined);

  if (recordedYears.length === 0) {
    return { met: false, gapReason: { code: 'no_years_recorded' } };
  }

  const maxYears = Math.max(...recordedYears);
  if (maxYears >= requirement.years_required) {
    return { met: true };
  }

  return {
    met: false,
    gapReason: { code: 'years_short', required: requirement.years_required, recorded: maxYears },
  };
}

// C15: an education requirement is judged against the profile's education entry
// only, never against the skills list, and never dropped as a soft skill.
function resolveEducationOutcome(requirement, education) {
  if (educationMatches(education, requirement.text)) {
    return { met: true };
  }
  const code = education && education.trim() !== '' ? 'education_mismatch' : 'no_education_recorded';
  return { met: false, gapReason: { code } };
}

export function computeMatch(requirements, profile) {
  const met = { must_have: [], nice_to_have: [] };
  const gaps = { must_have: [], nice_to_have: [] };
  const excluded = [];

  for (const requirement of requirements) {
    let outcome;

    if (requirement.is_education_requirement) {
      outcome = resolveEducationOutcome(requirement, profile.education);
    } else {
      if (!isMatchable(requirement.text)) {
        excluded.push(requirement);
        continue;
      }
      outcome = resolveYearsOutcome(requirement, findMatchingSkills(requirement.text, profile.skills));
    }

    const item = outcome.met ? requirement : { ...requirement, gapReason: outcome.gapReason };
    (outcome.met ? met : gaps)[requirement.type].push(item);
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

// Wraps computeMatch() with the provenance a stored snapshot needs: which
// profile produced this result and when. Kept separate from computeMatch so
// that function stays pure and trivially testable (no Date.now() inside it).
// Shared by analyse.js (computed at analysis time) and the backfill script
// (computed once, after the fact, for analyses stored before matching existed).
// C6: "the profile snapshot it was matched against — skill names, their years,
// and the education entry."
export function buildMatchSnapshot(requirements, profile) {
  return {
    ...computeMatch(requirements, profile),
    profileUsed: profile,
    matchedAt: new Date(),
  };
}
