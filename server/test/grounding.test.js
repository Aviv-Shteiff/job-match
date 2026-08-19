// Criterion C3 (SPEC.md Part 2): every requirement's source_quote must be present in
// the submitted ad text after normalization.
// Criterion C4: a requirement whose source_quote is not found in the source text is
// not shown as a requirement.
// SPEC.md §4 mandates: "a test that feeds it a fabricated requirement whose quote
// does not appear in the source, and asserts it is rejected."

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isGrounded, groundRequirements } from '../src/lib/grounding.js';

test('isGrounded: true when the quote appears verbatim in the ad', () => {
  const ad = 'We are looking for a developer with 3+ years of Node.js experience.';
  assert.equal(isGrounded('3+ years of Node.js experience', ad), true);
});

test('isGrounded: true when only case and whitespace differ', () => {
  const ad = 'Required:\n  NODE.JS   experience';
  assert.equal(isGrounded('Node.js experience', ad), true);
});

test('isGrounded: false for a fabricated quote absent from the source (§4 mandated case)', () => {
  const ad = 'We are looking for a developer with strong communication skills.';
  assert.equal(isGrounded('5+ years of Kubernetes experience', ad), false);
});

test('isGrounded: survives mixed Hebrew/English text with bidi control characters', () => {
  const ad = 'דרושים מפתחים עם ניסיון ב-‏React ו-Node.js לפחות שנתיים';
  assert.equal(isGrounded('ניסיון ב-React ו-Node.js', ad), true);
});

test('groundRequirements: splits accepted (grounded) from rejected (fabricated)', () => {
  const ad = 'Must have SQL. Nice to have Docker.';
  const requirements = [
    { text: 'SQL', source_quote: 'Must have SQL', type: 'must_have' },
    { text: 'Kubernetes', source_quote: '5 years of Kubernetes', type: 'must_have' },
    { text: 'Docker', source_quote: 'Nice to have Docker', type: 'nice_to_have' },
  ];

  const { accepted, rejected } = groundRequirements(requirements, ad);

  assert.equal(accepted.length, 2);
  assert.deepEqual(
    accepted.map((r) => r.text),
    ['SQL', 'Docker'],
  );
  assert.equal(rejected.length, 1);
  assert.equal(rejected[0].requirement.text, 'Kubernetes');
});

test('groundRequirements: all requirements grounded means nothing rejected', () => {
  const ad = 'Must have Python. Must have SQL.';
  const requirements = [
    { text: 'Python', source_quote: 'Must have Python', type: 'must_have' },
    { text: 'SQL', source_quote: 'Must have SQL', type: 'must_have' },
  ];

  const { accepted, rejected } = groundRequirements(requirements, ad);

  assert.equal(accepted.length, 2);
  assert.equal(rejected.length, 0);
});

test('groundRequirements: all requirements fabricated means nothing accepted', () => {
  const ad = 'We value teamwork and a growth mindset.';
  const requirements = [
    { text: 'Kubernetes', source_quote: '5 years of Kubernetes', type: 'must_have' },
    { text: 'Rust', source_quote: 'Expert-level Rust', type: 'nice_to_have' },
  ];

  const { accepted, rejected } = groundRequirements(requirements, ad);

  assert.equal(accepted.length, 0);
  assert.equal(rejected.length, 2);
});
