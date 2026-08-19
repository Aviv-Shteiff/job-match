// Criterion C2 (SPEC.md Part 2): "Text shorter than 200 characters is rejected before
// any model call, with a message asking for the full ad."
// SPEC.md §5 pitfall: "Very long ads exceed a sensible token budget. Decide the cap
// and the behaviour at the cap." — decided as a 20,000 character upper bound,
// rejected before any model call, same as the lower bound.
// Length is counted in Unicode code points over the trimmed text (not UTF-16 code
// units), so a string full of astral characters (e.g. emoji) is not miscounted as
// longer than it reads.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkAdTextLength } from '../src/lib/guards.js';

test('rejects text shorter than 200 characters', () => {
  const result = checkAdTextLength('too short');

  assert.equal(result.ok, false);
  assert.equal(result.reason, 'too_short');
});

test('rejects text that is only whitespace padding around a short string', () => {
  const result = checkAdTextLength('   short ad   ');

  assert.equal(result.ok, false);
  assert.equal(result.reason, 'too_short');
});

test('accepts text at exactly 200 characters', () => {
  const text = 'a'.repeat(200);
  const result = checkAdTextLength(text);

  assert.equal(result.ok, true);
});

test('accepts text at exactly 20000 characters', () => {
  const text = 'a'.repeat(20000);
  const result = checkAdTextLength(text);

  assert.equal(result.ok, true);
});

test('rejects text longer than 20000 characters', () => {
  const text = 'a'.repeat(20001);
  const result = checkAdTextLength(text);

  assert.equal(result.ok, false);
  assert.equal(result.reason, 'too_long');
});

test('counts length in Unicode code points, not UTF-16 code units', () => {
  // Each 😀 (U+1F600) is one code point but two UTF-16 code units (a surrogate
  // pair). 150 of them is 150 code points but text.length (UTF-16 units) is 300 —
  // above 200 if miscounted, below 200 if counted correctly.
  const text = '😀'.repeat(150);

  const result = checkAdTextLength(text);

  assert.equal(result.ok, false);
  assert.equal(result.reason, 'too_short');
});

test('does not count length before trimming surrounding whitespace', () => {
  const padded = `   ${'a'.repeat(200)}   `;
  const result = checkAdTextLength(padded);

  assert.equal(result.ok, true);
});
