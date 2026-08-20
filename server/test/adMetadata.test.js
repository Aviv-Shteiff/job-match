// SPEC.md C17: submitting an ad accepts an optional job title, company name, and
// posting link, each free text. None is required, and none is validated beyond
// being text — the link is never fetched or checked for reachability (§3, out of
// scope). Turn-4 decision (G5/G6): all three are trimmed, empty becomes null,
// each has a length cap enforced by rejection rather than silent truncation.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateAdMetadata } from '../src/lib/adMetadata.js';

test('accepts all three fields well-formed', () => {
  const result = validateAdMetadata({
    title: 'Backend Developer',
    company: 'Acme Corp',
    url: 'https://example.com/jobs/123',
  });

  assert.equal(result.ok, true);
  assert.equal(result.title, 'Backend Developer');
  assert.equal(result.company, 'Acme Corp');
  assert.equal(result.url, 'https://example.com/jobs/123');
});

test('all three fields are optional; an absent body yields all null', () => {
  const result = validateAdMetadata({});

  assert.equal(result.ok, true);
  assert.equal(result.title, null);
  assert.equal(result.company, null);
  assert.equal(result.url, null);
});

test('trims each field', () => {
  const result = validateAdMetadata({ title: '  Backend Developer  ', company: '  Acme  ', url: '  https://x.test  ' });

  assert.equal(result.title, 'Backend Developer');
  assert.equal(result.company, 'Acme');
  assert.equal(result.url, 'https://x.test');
});

test('empty or whitespace-only fields normalize to null', () => {
  const result = validateAdMetadata({ title: '', company: '   ', url: '' });

  assert.equal(result.ok, true);
  assert.equal(result.title, null);
  assert.equal(result.company, null);
  assert.equal(result.url, null);
});

test('rejects a title that is not a string', () => {
  const result = validateAdMetadata({ title: 42 });

  assert.equal(result.ok, false);
});

test('rejects a company that is not a string', () => {
  const result = validateAdMetadata({ company: ['Acme'] });

  assert.equal(result.ok, false);
});

test('rejects a url that is not a string', () => {
  const result = validateAdMetadata({ url: 42 });

  assert.equal(result.ok, false);
});

test('accepts a title at exactly the length cap and rejects one over it', () => {
  const atCap = validateAdMetadata({ title: 'a'.repeat(200) });
  const overCap = validateAdMetadata({ title: 'a'.repeat(201) });

  assert.equal(atCap.ok, true);
  assert.equal(overCap.ok, false);
});

test('accepts a company at exactly the length cap and rejects one over it', () => {
  const atCap = validateAdMetadata({ company: 'a'.repeat(200) });
  const overCap = validateAdMetadata({ company: 'a'.repeat(201) });

  assert.equal(atCap.ok, true);
  assert.equal(overCap.ok, false);
});

test('accepts a url at exactly the length cap and rejects one over it', () => {
  const atCap = validateAdMetadata({ url: 'a'.repeat(2000) });
  const overCap = validateAdMetadata({ url: 'a'.repeat(2001) });

  assert.equal(atCap.ok, true);
  assert.equal(overCap.ok, false);
});

test('does not validate the url as a reachable or well-formed link (C17)', () => {
  const result = validateAdMetadata({ url: 'not a url at all, just text' });

  assert.equal(result.ok, true);
  assert.equal(result.url, 'not a url at all, just text');
});
