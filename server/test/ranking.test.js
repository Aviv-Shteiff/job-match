// Criterion C7: the ad list is ordered by must-have match percentage, highest
// first. SPEC.md doesn't say what happens on a tie or with a null percentage
// (an analysis not yet matched) — decided (turn 2, G5): ties break by analyzedAt,
// newest first; null percentages sort last regardless of any other field.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rankAnalyses } from '../src/lib/ranking.js';

function analysis(id, mustHavePercent, analyzedAt) {
  return { id, mustHavePercent, analyzedAt: new Date(analyzedAt) };
}

test('orders by must-have percentage, highest first', () => {
  const input = [analysis('a', 40, '2026-01-01'), analysis('b', 80, '2026-01-01'), analysis('c', 10, '2026-01-01')];

  const ranked = rankAnalyses(input);

  assert.deepEqual(
    ranked.map((a) => a.id),
    ['b', 'a', 'c'],
  );
});

test('null percentages sort last regardless of value', () => {
  const input = [analysis('a', null, '2026-01-01'), analysis('b', 10, '2026-01-01'), analysis('c', null, '2026-01-02')];

  const ranked = rankAnalyses(input);

  assert.equal(ranked[0].id, 'b');
  assert.deepEqual(
    ranked.slice(1).map((a) => a.id).sort(),
    ['a', 'c'],
  );
});

test('ties on percentage break by analyzedAt, newest first', () => {
  const input = [analysis('older', 50, '2026-01-01'), analysis('newer', 50, '2026-02-01')];

  const ranked = rankAnalyses(input);

  assert.deepEqual(
    ranked.map((a) => a.id),
    ['newer', 'older'],
  );
});

test('does not mutate the input array', () => {
  const input = [analysis('a', 40, '2026-01-01'), analysis('b', 80, '2026-01-01')];
  const inputCopy = [...input];

  rankAnalyses(input);

  assert.deepEqual(input, inputCopy);
});
