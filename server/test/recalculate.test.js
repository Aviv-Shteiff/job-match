// C10: "recalculate" updates an analysis's percentages — and the met, gap, and
// excluded lists behind them — against the current profile, with no model call.
// C12: matching and percentage calculation are ordinary code. Turn-5 G1:
// recalculate rewrites exactly three fields on a stored analysis (match,
// mustHavePercent, niceToHavePercent) and nothing else — this pure function
// computes those three; the route (not tested here, per turn-4 Q3's precedent)
// does the actual partial update, which is what leaves every other field
// untouched.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { recalculateMatch } from '../src/lib/recalculate.js';

function req(text, type, overrides = {}) {
  return {
    text,
    source_quote: text,
    type,
    years_required: null,
    is_education_requirement: false,
    ...overrides,
  };
}

test('computes the same result as matching directly against the given profile', () => {
  const requirements = [req('Node.js experience', 'must_have')];
  const profile = { skills: [{ name: 'Node.js', years: null, group: 'skill' }], education: null };

  const result = recalculateMatch(requirements, profile);

  assert.equal(result.mustHavePercent, 100);
  assert.equal(result.match.met.length, 1);
});

test('recalculating against a different profile changes the outcome (C10)', () => {
  const requirements = [req('React experience', 'must_have')];
  const roleProfile = { skills: [{ name: 'React', years: null, group: 'skill' }], education: null };

  const before = recalculateMatch(requirements, { skills: [], education: null });
  const after = recalculateMatch(requirements, roleProfile);

  assert.equal(before.mustHavePercent, 0);
  assert.equal(after.mustHavePercent, 100);
});

test('returns exactly match, mustHavePercent, and niceToHavePercent — the only three fields C10 rewrites', () => {
  const result = recalculateMatch([req('X', 'must_have')], { skills: [], education: null });

  assert.deepEqual(Object.keys(result).sort(), ['match', 'mustHavePercent', 'niceToHavePercent']);
});

test('the returned match snapshot records the profile it was computed against', () => {
  const profile = { skills: [{ name: 'Go', years: 2, group: 'skill' }], education: 'BSc' };
  const result = recalculateMatch([req('Go experience', 'must_have')], profile);

  assert.deepEqual(result.match.profileUsed, profile);
});

test('the returned match snapshot has a fresh matchedAt timestamp', () => {
  const before = Date.now();
  const result = recalculateMatch([req('X', 'must_have')], { skills: [], education: null });
  const after = Date.now();

  const matchedAt = result.match.matchedAt.getTime();
  assert.ok(matchedAt >= before && matchedAt <= after);
});
