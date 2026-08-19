// Criterion C3 (SPEC.md Part 2): grounding compares quotes "after Unicode-aware
// normalization: NFKC normalization, removal of bidirectional and zero-width control
// characters, collapsing of all Unicode whitespace to a single space, and
// case-folding." This file tests that normalization function in isolation.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeForGrounding } from '../src/lib/normalize.js';

test('collapses runs of whitespace, including newlines and tabs, to a single space', () => {
  assert.equal(
    normalizeForGrounding('Node.js\n\texperience   required'),
    'node.js experience required',
  );
});

test('case-folds', () => {
  assert.equal(normalizeForGrounding('REQUIRED'), 'required');
});

test('trims leading and trailing whitespace', () => {
  assert.equal(normalizeForGrounding('  hello  '), 'hello');
});

test('applies NFKC normalization (compatibility ligature folds to its parts)', () => {
  // U+FB01 LATIN SMALL LIGATURE FI normalizes under NFKC to "fi"
  assert.equal(normalizeForGrounding('ﬁle'), 'file');
});

test('strips zero-width characters', () => {
  // zero-width space (U+200B) and BOM / zero-width no-break space (U+FEFF)
  assert.equal(normalizeForGrounding('re​act﻿'), 'react');
});

test('strips bidirectional control characters around Hebrew text', () => {
  const withMarks = '‏ניסיון בפיתוח‏ ב-Node.js';
  const withoutMarks = 'ניסיון בפיתוח ב-Node.js';
  assert.equal(normalizeForGrounding(withMarks), normalizeForGrounding(withoutMarks));
});

test('strips RTL/LTR embedding and isolate control characters', () => {
  const withEmbedding = '‫דרוש מפתח‬ Node.js';
  const plain = 'דרוש מפתח Node.js';
  assert.equal(normalizeForGrounding(withEmbedding), normalizeForGrounding(plain));
});

test('does not alter punctuation or wording', () => {
  assert.equal(normalizeForGrounding("3+ years' experience, Node.js"), "3+ years' experience, node.js");
});
