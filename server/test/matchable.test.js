// Turn-2 resolution (Q2, docs/LESSONS.md's open soft-skill question): a curated
// exclude-list drops clearly-soft requirements from the percentage calculation
// entirely — communication, self-learner, problem-solving, team player,
// collaboration, fast-paced, attention to detail, and the Hebrew equivalents.
// Everything else, including borderline technical concepts with no named tool
// ("responsive design", "RESTful APIs", "cloud experience"), stays matchable —
// errs toward showing a gap rather than hiding one (SPEC.md §1).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isMatchable } from '../src/lib/matchable.js';

test('excludes a self-learner requirement', () => {
  assert.equal(isMatchable('Independent, self learner eager to learn and succeed'), false);
});

test('excludes a communication requirement', () => {
  assert.equal(isMatchable('Strong communication and collaboration skills'), false);
});

test('excludes a problem-solving requirement', () => {
  assert.equal(isMatchable('Excellent problem-solving and debugging skills'), false);
});

test('excludes a "team player" requirement', () => {
  assert.equal(isMatchable('Must be a team player'), false);
});

test('excludes a fast-paced/culture-fit requirement', () => {
  assert.equal(isMatchable('Comfortable working in a fast-paced, ambiguous environment'), false);
});

test('excludes an attention-to-detail requirement', () => {
  assert.equal(isMatchable('Strong attention to detail'), false);
});

test('excludes a Hebrew communication requirement', () => {
  assert.equal(isMatchable('תקשורת בין-אישית מצוינת'), false);
});

test('excludes a Hebrew independence requirement', () => {
  assert.equal(isMatchable('עצמאי ובעל יוזמה'), false);
});

test('keeps a plain technical requirement matchable', () => {
  assert.equal(isMatchable('3+ years of experience with Node.js and Express'), true);
});

test('keeps a borderline technical-concept requirement matchable (no named tool)', () => {
  assert.equal(isMatchable('Understanding of responsive design'), true);
  assert.equal(isMatchable('Experience designing RESTful APIs'), true);
});

test('keeps a borderline Hebrew technical-concept requirement matchable', () => {
  assert.equal(isMatchable('ניסיון בסביבת ענן'), true);
});

test('keeps a multi-skill technical requirement matchable', () => {
  assert.equal(isMatchable('Knowledge of MongoDB and SQL-Based database'), true);
});
