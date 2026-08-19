// Criterion C5 (SPEC.md Part 2): every shown requirement is labelled exactly one of
// must_have or nice_to_have.
// Criterion C11: a model response that is not valid JSON, or is missing required
// fields, produces a visible failure state, never an empty list rendered as success.
// SPEC.md §4 mandates: "a test that hands the response handler a malformed model
// reply and asserts a visible failure rather than an empty result."
// Criteria C13-C15 (turn 3): the model reads years_required and
// is_education_requirement off the ad (Part 3). Turn-3 decision (Q2): both keys
// must be present on every requirement — years_required may be null,
// is_education_requirement must be a boolean — so a model that silently omits
// them fails visibly rather than producing an invisibly-optimistic match.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateExtractionResponse } from '../src/lib/validateResponse.js';

function req(overrides = {}) {
  return {
    text: 'Node.js',
    source_quote: 'Node.js experience',
    type: 'must_have',
    years_required: null,
    is_education_requirement: false,
    ...overrides,
  };
}

test('accepts a well-formed response', () => {
  const raw = JSON.stringify({
    requirements: [
      req(),
      req({ text: 'Docker', source_quote: 'familiarity with Docker', type: 'nice_to_have' }),
    ],
  });

  const result = validateExtractionResponse(raw);

  assert.equal(result.ok, true);
  assert.equal(result.requirements.length, 2);
});

test('accepts a requirement with a numeric years_required', () => {
  const raw = JSON.stringify({ requirements: [req({ years_required: 3 })] });

  const result = validateExtractionResponse(raw);

  assert.equal(result.ok, true);
  assert.equal(result.requirements[0].years_required, 3);
});

test('accepts an education requirement', () => {
  const raw = JSON.stringify({
    requirements: [
      req({
        text: "Bachelor's degree in Computer Science",
        source_quote: "Bachelor's degree in Computer Science",
        is_education_requirement: true,
      }),
    ],
  });

  const result = validateExtractionResponse(raw);

  assert.equal(result.ok, true);
  assert.equal(result.requirements[0].is_education_requirement, true);
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
  const raw = JSON.stringify({ requirements: [{ ...req(), source_quote: undefined }] });

  const result = validateExtractionResponse(raw);

  assert.equal(result.ok, false);
  assert.equal(result.reason, 'wrong_shape');
});

test('rejects a requirement item missing text', () => {
  const raw = JSON.stringify({ requirements: [{ ...req(), text: undefined }] });

  const result = validateExtractionResponse(raw);

  assert.equal(result.ok, false);
  assert.equal(result.reason, 'wrong_shape');
});

test('rejects a requirement whose type is neither must_have nor nice_to_have', () => {
  const raw = JSON.stringify({ requirements: [req({ type: 'optional' })] });

  const result = validateExtractionResponse(raw);

  assert.equal(result.ok, false);
  assert.equal(result.reason, 'bad_label');
});

test('rejects a requirement whose source_quote is an empty string', () => {
  const raw = JSON.stringify({ requirements: [req({ source_quote: '' })] });

  const result = validateExtractionResponse(raw);

  assert.equal(result.ok, false);
  assert.equal(result.reason, 'wrong_shape');
});

test('rejects a requirement missing the years_required key entirely', () => {
  const raw = JSON.stringify({ requirements: [{ ...req(), years_required: undefined }] });

  const result = validateExtractionResponse(raw);

  assert.equal(result.ok, false);
  assert.equal(result.reason, 'wrong_shape');
});

test('rejects a years_required value that is not a number or null', () => {
  const raw = JSON.stringify({ requirements: [req({ years_required: '3' })] });

  const result = validateExtractionResponse(raw);

  assert.equal(result.ok, false);
  assert.equal(result.reason, 'wrong_shape');
});

test('rejects a negative years_required', () => {
  const raw = JSON.stringify({ requirements: [req({ years_required: -1 })] });

  const result = validateExtractionResponse(raw);

  assert.equal(result.ok, false);
  assert.equal(result.reason, 'wrong_shape');
});

test('rejects a fractional years_required', () => {
  const raw = JSON.stringify({ requirements: [req({ years_required: 2.5 })] });

  const result = validateExtractionResponse(raw);

  assert.equal(result.ok, false);
  assert.equal(result.reason, 'wrong_shape');
});

test('rejects a requirement missing the is_education_requirement key entirely', () => {
  const raw = JSON.stringify({ requirements: [{ ...req(), is_education_requirement: undefined }] });

  const result = validateExtractionResponse(raw);

  assert.equal(result.ok, false);
  assert.equal(result.reason, 'wrong_shape');
});

test('rejects an is_education_requirement value that is not a boolean', () => {
  const raw = JSON.stringify({ requirements: [req({ is_education_requirement: 'true' })] });

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
    requirements: [req(), req({ text: 'Docker', type: 'sort-of' })],
  });

  const result = validateExtractionResponse(raw);

  assert.equal(result.ok, false);
});
