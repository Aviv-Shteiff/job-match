// Criterion C6: each analysis stores a must-have match percentage and a
// nice-to-have match percentage, plus the profile snapshot matched against.
// Criterion C8: met requirements and gaps, with must-have gaps before
// nice-to-have gaps. Criterion C12: ordinary code, no model call.
// Criteria C13/C14 (turn 3): a stated years threshold is met only when the
// matching skill records at least that many years; no stated threshold is met by
// presence alone. Criterion C15: an education requirement is judged against the
// profile's education entry, never dropped as a soft skill. Criterion C16: roles
// are matched by the same mechanism as any other skill.
// Turn-3 decisions: a years shortfall is a strict gap with the reason shown
// (Q1); when several profile skills match one requirement, the highest recorded
// years wins (Q3); a requirement with years_required but no matching skill at
// all gets gap reason 'skill_missing', not 'no_years_recorded' (G10).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeMatch } from '../src/lib/matching.js';

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

function skill(name, years = null) {
  return { name, years };
}

function profile(skills, education = null) {
  return { skills, education };
}

test('splits requirements into met and gaps based on the profile', () => {
  const requirements = [
    req('Node.js experience', 'must_have'),
    req('Kubernetes experience', 'must_have'),
    req('Docker experience', 'nice_to_have'),
  ];

  const result = computeMatch(requirements, profile([skill('Node.js')]));

  assert.deepEqual(
    result.met.map((r) => r.text),
    ['Node.js experience'],
  );
  assert.deepEqual(
    result.gaps.map((r) => r.text),
    ['Kubernetes experience', 'Docker experience'],
  );
});

test('C8: must-have gaps come before nice-to-have gaps regardless of input order', () => {
  const requirements = [req('Docker', 'nice_to_have'), req('AWS', 'must_have')];

  const result = computeMatch(requirements, profile([]));

  assert.deepEqual(
    result.gaps.map((r) => r.text),
    ['AWS', 'Docker'],
  );
});

test('met requirements list must-have items before nice-to-have items, extraction order preserved within each', () => {
  const requirements = [
    req('Docker', 'nice_to_have'),
    req('React', 'must_have'),
    req('Node.js', 'must_have'),
  ];

  const result = computeMatch(
    requirements,
    profile([skill('Docker'), skill('React'), skill('Node.js')]),
  );

  assert.deepEqual(
    result.met.map((r) => r.text),
    ['React', 'Node.js', 'Docker'],
  );
});

test('soft-skill requirements are excluded from both the met/gap lists and the denominator', () => {
  const requirements = [
    req('Node.js experience', 'must_have'),
    req('Strong communication skills', 'must_have'),
  ];

  const result = computeMatch(requirements, profile([skill('Node.js')]));

  assert.deepEqual(
    result.excluded.map((r) => r.text),
    ['Strong communication skills'],
  );
  assert.equal(result.counts.mustHaveMatchable, 1);
  assert.equal(result.counts.mustHaveMatched, 1);
  assert.equal(result.mustHavePercent, 100);
});

test('a zero matchable denominator yields a null percentage, not 0', () => {
  const requirements = [req('Team player', 'must_have')];

  const result = computeMatch(requirements, profile([]));

  assert.equal(result.counts.mustHaveMatchable, 0);
  assert.equal(result.mustHavePercent, null);
});

test('percentage rounds to the nearest integer', () => {
  const requirements = [req('Node.js', 'must_have'), req('React', 'must_have'), req('AWS', 'must_have')];

  const result = computeMatch(requirements, profile([skill('Node.js')]));

  assert.equal(result.counts.mustHaveMatched, 1);
  assert.equal(result.counts.mustHaveMatchable, 3);
  assert.equal(result.mustHavePercent, 33);
});

test('C13: a stated years threshold is met when the profile skill records enough years', () => {
  const requirements = [req('3+ years of Node.js', 'must_have', { years_required: 3 })];

  const result = computeMatch(requirements, profile([skill('Node.js', 5)]));

  assert.equal(result.met.length, 1);
  assert.equal(result.gaps.length, 0);
});

test('C13: a stated years threshold is a gap when the profile skill records fewer years, with the shortfall shown', () => {
  const requirements = [req('3+ years of Node.js', 'must_have', { years_required: 3 })];

  const result = computeMatch(requirements, profile([skill('Node.js', 2)]));

  assert.equal(result.met.length, 0);
  assert.equal(result.gaps.length, 1);
  assert.deepEqual(result.gaps[0].gapReason, { code: 'years_short', required: 3, recorded: 2 });
});

test('C13: a skill with no years recorded does not satisfy a stated threshold', () => {
  const requirements = [req('3+ years of Node.js', 'must_have', { years_required: 3 })];

  const result = computeMatch(requirements, profile([skill('Node.js', null)]));

  assert.equal(result.met.length, 0);
  assert.equal(result.gaps[0].gapReason.code, 'no_years_recorded');
});

test('a years threshold with no matching skill at all is a skill_missing gap, not no_years_recorded', () => {
  const requirements = [req('3+ years of Kubernetes', 'must_have', { years_required: 3 })];

  const result = computeMatch(requirements, profile([skill('Node.js', 5)]));

  assert.equal(result.gaps[0].gapReason.code, 'skill_missing');
});

test('C14: a requirement stating no years threshold is met by presence alone, regardless of recorded years', () => {
  const requirements = [req('Experience with Node.js', 'must_have', { years_required: null })];

  assert.equal(computeMatch(requirements, profile([skill('Node.js', null)])).met.length, 1);
  assert.equal(computeMatch(requirements, profile([skill('Node.js', 0)])).met.length, 1);
  assert.equal(computeMatch(requirements, profile([skill('Node.js', 10)])).met.length, 1);
});

test('years_required of 0 behaves the same as null (no threshold)', () => {
  const requirements = [req('Experience with Node.js', 'must_have', { years_required: 0 })];

  const result = computeMatch(requirements, profile([skill('Node.js', null)]));

  assert.equal(result.met.length, 1);
});

test('a recorded years value of 0 counts toward the threshold check (distinct from no years recorded)', () => {
  const requirements = [req('3+ years of Rust', 'must_have', { years_required: 3 })];

  const result = computeMatch(requirements, profile([skill('Rust', 0)]));

  assert.equal(result.gaps[0].gapReason.code, 'years_short');
  assert.equal(result.gaps[0].gapReason.recorded, 0);
});

test('multi-match: when several profile skills match one requirement, the highest years wins (Q3)', () => {
  const requirements = [
    req('3+ years of experience with Node.js and Express', 'must_have', { years_required: 3 }),
  ];

  const result = computeMatch(
    requirements,
    profile([skill('Node.js', 5), skill('Express', 1)]),
  );

  assert.equal(result.met.length, 1);
});

test('C15: an education requirement is met when the education entry matches the field', () => {
  const requirements = [
    req("Bachelor's degree in Computer Science", 'must_have', { is_education_requirement: true }),
  ];

  const result = computeMatch(requirements, profile([], 'BSc Computer Science'));

  assert.equal(result.met.length, 1);
});

test('C15: an education requirement with an empty profile education entry is a gap, not dropped', () => {
  const requirements = [
    req("Bachelor's degree in Computer Science", 'must_have', { is_education_requirement: true }),
  ];

  const result = computeMatch(requirements, profile([], null));

  assert.equal(result.gaps.length, 1);
  assert.equal(result.excluded.length, 0);
  assert.equal(result.gaps[0].gapReason.code, 'no_education_recorded');
});

test('C15: education requirements are never excluded as soft skills, even if worded that way', () => {
  // "communication" is a matchable.js soft-skill marker; is_education_requirement
  // must override that exclusion per the spec's "never dropped" wording.
  const requirements = [
    req('Strong communication of academic research through a completed degree', 'must_have', {
      is_education_requirement: true,
    }),
  ];

  const result = computeMatch(requirements, profile([], null));

  assert.equal(result.excluded.length, 0);
  assert.equal(result.gaps.length, 1);
});

test('C16: a role entry is matched by the ordinary skill mechanism, no special handling', () => {
  const requirements = [req('4+ years as a Full Stack Developer', 'must_have', { years_required: 4 })];

  const result = computeMatch(requirements, profile([skill('Full Stack Developer', 5)]));

  assert.equal(result.met.length, 1);
});

test('nice-to-have percentage is computed independently of must-have', () => {
  const requirements = [
    req('Node.js', 'must_have'),
    req('Docker', 'nice_to_have'),
    req('Kubernetes', 'nice_to_have'),
  ];

  const result = computeMatch(requirements, profile([skill('Node.js'), skill('Docker')]));

  assert.equal(result.mustHavePercent, 100);
  assert.equal(result.niceToHavePercent, 50);
});
