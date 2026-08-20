// SPEC.md C1: a skill entry is a name plus an optional number of years; the
// profile also holds one optional free-text education entry. No-years-recorded
// and years-recorded-as-zero are stored distinctly. Turn 4: each entry also
// records which of the profile screen's two groups it belongs to — skills, or
// roles and experience — defaulting to skills; that grouping is display only.
// FRAMING.md's "profile stays small enough to read at a glance" constraint:
// strict, all-or-nothing validation at the boundary, not silent coercion of
// malformed input.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateProfileInput } from '../src/lib/profile.js';

test('accepts a well-formed profile with skills and education', () => {
  const result = validateProfileInput({
    skills: [
      { name: 'Node.js', years: 3, group: 'skill' },
      { name: 'MongoDB', years: null, group: 'skill' },
    ],
    education: 'BSc Computer Science',
  });

  assert.equal(result.ok, true);
  assert.deepEqual(result.skills, [
    { name: 'Node.js', years: 3, group: 'skill' },
    { name: 'MongoDB', years: null, group: 'skill' },
  ]);
  assert.equal(result.education, 'BSc Computer Science');
});

test('an entry with no group defaults to "skill" (C1)', () => {
  const result = validateProfileInput({
    skills: [{ name: 'Node.js', years: null }],
    education: null,
  });

  assert.equal(result.ok, true);
  assert.equal(result.skills[0].group, 'skill');
});

test('accepts an entry explicitly grouped as "role"', () => {
  const result = validateProfileInput({
    skills: [{ name: 'Full Stack', years: 4, group: 'role' }],
    education: null,
  });

  assert.equal(result.ok, true);
  assert.equal(result.skills[0].group, 'role');
});

test('rejects a group value that is neither "skill" nor "role"', () => {
  const result = validateProfileInput({
    skills: [{ name: 'Full Stack', years: 4, group: 'seniority' }],
    education: null,
  });

  assert.equal(result.ok, false);
});

test('trims skill names and drops empty ones', () => {
  const result = validateProfileInput({
    skills: [{ name: '  React  ', years: null }, { name: '   ', years: null }],
    education: null,
  });

  assert.equal(result.ok, true);
  assert.deepEqual(result.skills, [{ name: 'React', years: null, group: 'skill' }]);
});

test('de-duplicates skill names case-insensitively, keeping the first occurrence', () => {
  const result = validateProfileInput({
    skills: [
      { name: 'Node.js', years: 5, group: 'skill' },
      { name: 'node.js', years: 1, group: 'role' },
    ],
    education: null,
  });

  assert.equal(result.ok, true);
  assert.deepEqual(result.skills, [{ name: 'Node.js', years: 5, group: 'skill' }]);
});

test('missing or null years normalizes to null', () => {
  const result = validateProfileInput({
    skills: [{ name: 'React' }, { name: 'SQL', years: null }],
    education: null,
  });

  assert.equal(result.ok, true);
  assert.deepEqual(result.skills, [
    { name: 'React', years: null, group: 'skill' },
    { name: 'SQL', years: null, group: 'skill' },
  ]);
});

test('years recorded as zero is kept distinct from no years recorded', () => {
  const result = validateProfileInput({
    skills: [{ name: 'Rust', years: 0 }],
    education: null,
  });

  assert.equal(result.ok, true);
  assert.equal(result.skills[0].years, 0);
});

test('rejects a negative years value', () => {
  const result = validateProfileInput({
    skills: [{ name: 'React', years: -1 }],
    education: null,
  });

  assert.equal(result.ok, false);
});

test('rejects a fractional years value', () => {
  const result = validateProfileInput({
    skills: [{ name: 'React', years: 2.5 }],
    education: null,
  });

  assert.equal(result.ok, false);
});

test('rejects a years value that is not a number', () => {
  const result = validateProfileInput({
    skills: [{ name: 'React', years: '3' }],
    education: null,
  });

  assert.equal(result.ok, false);
});

test('education is trimmed', () => {
  const result = validateProfileInput({ skills: [], education: '  BSc  ' });

  assert.equal(result.ok, true);
  assert.equal(result.education, 'BSc');
});

test('empty or whitespace-only education normalizes to null', () => {
  const result1 = validateProfileInput({ skills: [], education: '' });
  const result2 = validateProfileInput({ skills: [], education: '   ' });
  const result3 = validateProfileInput({ skills: [] });

  assert.equal(result1.education, null);
  assert.equal(result2.education, null);
  assert.equal(result3.education, null);
});

test('rejects education that is not a string', () => {
  const result = validateProfileInput({ skills: [], education: 42 });

  assert.equal(result.ok, false);
});

test('rejects a skills value that is not an array', () => {
  const result = validateProfileInput({ skills: 'Node.js', education: null });

  assert.equal(result.ok, false);
});

test('rejects a skill entry that is not an object', () => {
  const result = validateProfileInput({ skills: ['Node.js'], education: null });

  assert.equal(result.ok, false);
});

test('rejects a skill entry whose name is not a string', () => {
  const result = validateProfileInput({ skills: [{ name: 123, years: null }], education: null });

  assert.equal(result.ok, false);
});
