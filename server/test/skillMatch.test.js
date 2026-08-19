// SPEC.md §5 pitfall: "Skill names in the profile will not match ad wording
// exactly. Matching must tolerate variants; exact string equality will
// under-report every time." Criterion C12: matching is ordinary code, no model
// call. Turn-2 resolution (Q4): word-boundary matching, punctuation-insensitive,
// plus a small curated alias table — not plain substring (profile "SQL" must not
// match inside "NoSQL") and not fuzzy/edit-distance matching.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { skillMatches } from '../src/lib/skillMatch.js';

test('matches a whole-word skill mention, case-insensitively', () => {
  assert.equal(skillMatches('React', 'Experience with React applications'), true);
  assert.equal(skillMatches('react', 'Experience with React applications'), true);
});

test('word boundary: "SQL" does not match inside "NoSQL"', () => {
  assert.equal(
    skillMatches('SQL', 'Strong knowledge of MongoDB or another NoSQL database'),
    false,
  );
});

test('word boundary: "SQL" does match a standalone mention', () => {
  assert.equal(skillMatches('SQL', 'Knowledge of MongoDB and SQL-Based database'), true);
});

test('punctuation-insensitive: "Node.js" matches "Node js" and "Node-js"', () => {
  assert.equal(skillMatches('Node.js', 'Familiar with Node js frameworks'), true);
  assert.equal(skillMatches('Node.js', 'Familiar with Node-js frameworks'), true);
});

test('multi-word skill matches within a longer requirement sentence', () => {
  assert.equal(
    skillMatches('Node.js', '3+ years of experience with Node.js and Express'),
    true,
  );
});

test('alias table: JS and JavaScript match each other', () => {
  assert.equal(skillMatches('JS', 'Strong JavaScript fundamentals required'), true);
  assert.equal(skillMatches('JavaScript', 'Must know JS well'), true);
});

test('alias table: TypeScript and TS match each other', () => {
  assert.equal(skillMatches('TypeScript', 'Experience with TS in large codebases'), true);
});

test('alias table: Kubernetes and k8s match each other', () => {
  assert.equal(skillMatches('Kubernetes', 'Experience with k8s clusters'), true);
});

test('alias table: Postgres and PostgreSQL match each other', () => {
  assert.equal(skillMatches('Postgres', 'Must know PostgreSQL well'), true);
});

test('no match when the skill is genuinely absent', () => {
  assert.equal(skillMatches('Kubernetes', 'We use Docker for containerization'), false);
});

test('survives mixed Hebrew/English requirement text', () => {
  assert.equal(skillMatches('React', 'ניסיון עם React ו-Node.js'), true);
  assert.equal(skillMatches('Node.js', 'ניסיון עם React ו-Node.js'), true);
});
