// Criterion C6: each analysis stores a must-have match percentage and a
// nice-to-have match percentage. Criterion C8: met requirements and gaps, with
// must-have gaps before nice-to-have gaps. Criterion C12: matching, percentage
// calculation, and gap ordering are ordinary code, no model call. Turn-2
// resolutions: soft-skill requirements (matchable.js) are excluded from the
// denominator on both sides; a zero denominator yields null, not 0 (consistent
// with turn 1's decision that null means "not computed," never a placeholder
// mistakable for a real answer).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeMatch } from '../src/lib/matching.js';

function req(text, type) {
  return { text, source_quote: text, type };
}

test('splits requirements into met and gaps based on the profile', () => {
  const requirements = [
    req('Node.js experience', 'must_have'),
    req('Kubernetes experience', 'must_have'),
    req('Docker experience', 'nice_to_have'),
  ];

  const result = computeMatch(requirements, ['Node.js']);

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

  const result = computeMatch(requirements, []);

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

  const result = computeMatch(requirements, ['Docker', 'React', 'Node.js']);

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

  const result = computeMatch(requirements, ['Node.js']);

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

  const result = computeMatch(requirements, []);

  assert.equal(result.counts.mustHaveMatchable, 0);
  assert.equal(result.mustHavePercent, null);
});

test('an empty profile yields all-gap results with a computed percentage', () => {
  const requirements = [req('Node.js', 'must_have'), req('React', 'must_have')];

  const result = computeMatch(requirements, []);

  assert.equal(result.met.length, 0);
  assert.equal(result.gaps.length, 2);
  assert.equal(result.mustHavePercent, 0);
});

test('percentage rounds to the nearest integer', () => {
  const requirements = [req('Node.js', 'must_have'), req('React', 'must_have'), req('AWS', 'must_have')];

  const result = computeMatch(requirements, ['Node.js']);

  assert.equal(result.counts.mustHaveMatched, 1);
  assert.equal(result.counts.mustHaveMatchable, 3);
  assert.equal(result.mustHavePercent, 33);
});

test('nice-to-have percentage is computed independently of must-have', () => {
  const requirements = [
    req('Node.js', 'must_have'),
    req('Docker', 'nice_to_have'),
    req('Kubernetes', 'nice_to_have'),
  ];

  const result = computeMatch(requirements, ['Node.js', 'Docker']);

  assert.equal(result.mustHavePercent, 100);
  assert.equal(result.niceToHavePercent, 50);
});
