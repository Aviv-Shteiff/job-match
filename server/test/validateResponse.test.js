// Criterion C5 (SPEC.md Part 2): every shown requirement is labelled exactly one of
// must_have or nice_to_have.
// Criterion C11: a model response that is not valid JSON, or is missing required
// fields, produces a visible failure state, never an empty list rendered as success.
// SPEC.md §4 mandates: "a test that hands the response handler a malformed model
// reply and asserts a visible failure rather than an empty result."

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateExtractionResponse } from '../src/lib/validateResponse.js';

test('accepts a well-formed response', () => {
  const raw = JSON.stringify({
    requirements: [
      { text: 'Node.js', source_quote: 'Node.js experience', type: 'must_have' },
      { text: 'Docker', source_quote: 'familiarity with Docker', type: 'nice_to_have' },
    ],
  });

  const result = validateExtractionResponse(raw);

  assert.equal(result.ok, true);
  assert.equal(result.requirements.length, 2);
});

test('rejects prose that is not JSON at all (§4 mandated malformed-reply case)', () => {
  const raw = "Sure, here are the requirements I found in the ad: Node.js, Docker.";

  const result = validateExtractionResponse(raw);

  assert.equal(result.ok, false);
  assert.equal(result.reason, 'not_json');
});

test('rejects valid JSON that is missing the requirements field', () => {
  const raw = JSON.stringify({ notes: 'no requirements key here' });

  const result = validateExtractionResponse(raw);

  assert.equal(result.ok, false);
  assert.equal(result.reason, 'wrong_shape');
});

test('rejects valid JSON whose requirements value is not an array', () => {
  const raw = JSON.stringify({ requirements: 'Node.js, Docker' });

  const result = validateExtractionResponse(raw);

  assert.equal(result.ok, false);
  assert.equal(result.reason, 'wrong_shape');
});

test('rejects a requirement item missing source_quote', () => {
  const raw = JSON.stringify({
    requirements: [{ text: 'Node.js', type: 'must_have' }],
  });

  const result = validateExtractionResponse(raw);

  assert.equal(result.ok, false);
  assert.equal(result.reason, 'wrong_shape');
});

test('rejects a requirement item missing text', () => {
  const raw = JSON.stringify({
    requirements: [{ source_quote: 'Node.js experience', type: 'must_have' }],
  });

  const result = validateExtractionResponse(raw);

  assert.equal(result.ok, false);
  assert.equal(result.reason, 'wrong_shape');
});

test('rejects a requirement whose type is neither must_have nor nice_to_have', () => {
  const raw = JSON.stringify({
    requirements: [
      { text: 'Node.js', source_quote: 'Node.js experience', type: 'optional' },
    ],
  });

  const result = validateExtractionResponse(raw);

  assert.equal(result.ok, false);
  assert.equal(result.reason, 'bad_label');
});

test('rejects a requirement whose source_quote is an empty string', () => {
  const raw = JSON.stringify({
    requirements: [{ text: 'Node.js', source_quote: '', type: 'must_have' }],
  });

  const result = validateExtractionResponse(raw);

  assert.equal(result.ok, false);
  assert.equal(result.reason, 'wrong_shape');
});

test('an empty requirements array is structurally valid (shape-only check)', () => {
  const raw = JSON.stringify({ requirements: [] });

  const result = validateExtractionResponse(raw);

  assert.equal(result.ok, true);
  assert.deepEqual(result.requirements, []);
});

test('one malformed item invalidates the whole response, not just that item', () => {
  const raw = JSON.stringify({
    requirements: [
      { text: 'Node.js', source_quote: 'Node.js experience', type: 'must_have' },
      { text: 'Docker', source_quote: 'Docker', type: 'sort-of' },
    ],
  });

  const result = validateExtractionResponse(raw);

  assert.equal(result.ok, false);
});
