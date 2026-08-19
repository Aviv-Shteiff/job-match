// SPEC.md C15: an education requirement is met only when the profile's education
// entry names the same field of study, compared after degree-type words are set
// aside on both sides. A requirement naming no field is met by any non-empty
// education entry. Turn-3 decision (Q4): two stoplists — degree words, then
// generic qualifiers — whatever survives is "the field."

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { educationMatches } from '../src/lib/educationMatch.js';

const REAL_AD_REQUIREMENT =
  "Bachelor's degree in Computer Science (BSC) or an equivalent technical degree";

test('matches the real ad case: "BSc Computer Science" against the BSC-or-equivalent requirement', () => {
  assert.equal(educationMatches('BSc Computer Science', REAL_AD_REQUIREMENT), true);
});

test('matches when the profile field alone (no degree word) is given', () => {
  assert.equal(educationMatches('Computer Science', REAL_AD_REQUIREMENT), true);
});

test('does not match an unrelated field of study', () => {
  assert.equal(educationMatches('History', REAL_AD_REQUIREMENT), false);
});

test('an empty or missing education entry never matches', () => {
  assert.equal(educationMatches(null, REAL_AD_REQUIREMENT), false);
  assert.equal(educationMatches('', REAL_AD_REQUIREMENT), false);
  assert.equal(educationMatches('   ', REAL_AD_REQUIREMENT), false);
});

test('a requirement naming no field at all is met by any non-empty education entry', () => {
  const noFieldRequirement = 'A relevant technical degree or equivalent experience is required';
  assert.equal(educationMatches('MBA', noFieldRequirement), true);
  assert.equal(educationMatches('BSc Computer Science', noFieldRequirement), true);
});

test('survives mixed Hebrew degree wording', () => {
  const hebrewRequirement = 'תואר במדעי המחשב או תעודה מקבילה';
  assert.equal(educationMatches('מדעי המחשב', hebrewRequirement), true);
  assert.equal(educationMatches('היסטוריה', hebrewRequirement), false);
});
