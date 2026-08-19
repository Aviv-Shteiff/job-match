import { normalizeForGrounding } from './normalize.js';

// SPEC.md §5: "Skill names in the profile will not match ad wording exactly ...
// exact string equality will under-report every time." Turn-2 decision (Q4):
// word-boundary matching via tokenization — not plain substring, since a
// substring check would wrongly match profile "SQL" inside ad text "NoSQL" —
// punctuation-insensitive, plus a small curated alias table for real lexeme
// differences (abbreviation vs. full name) that tokenization alone can't bridge.
// Deliberately no fuzzy/edit-distance matching: a wrong match would silently
// inflate a percentage with no visible trace.
const ALIAS_GROUPS = [
  ['js', 'javascript'],
  ['ts', 'typescript'],
  ['postgres', 'postgresql'],
  ['k8s', 'kubernetes'],
];

function tokenize(text) {
  return normalizeForGrounding(text)
    .split(/[^\p{L}\p{N}]+/u)
    .filter((token) => token.length > 0);
}

// A single-word skill also searches for its alias group's other spellings, e.g.
// profile "TypeScript" also looks for a standalone "TS" mention. Multi-word
// skills rely on tokenization itself for variant tolerance (see skillMatches.jsdoc
// in the test file) rather than per-token alias substitution.
function aliasCandidates(skillTokens) {
  const candidates = [skillTokens];
  if (skillTokens.length === 1) {
    const group = ALIAS_GROUPS.find((g) => g.includes(skillTokens[0]));
    if (group) {
      for (const term of group) {
        if (term !== skillTokens[0]) candidates.push(tokenize(term));
      }
    }
  }
  return candidates;
}

function containsSubsequence(haystack, needle) {
  if (needle.length === 0 || needle.length > haystack.length) return false;
  for (let start = 0; start <= haystack.length - needle.length; start++) {
    let matched = true;
    for (let offset = 0; offset < needle.length; offset++) {
      if (haystack[start + offset] !== needle[offset]) {
        matched = false;
        break;
      }
    }
    if (matched) return true;
  }
  return false;
}

export function skillMatches(profileSkill, requirementText) {
  const skillTokens = tokenize(profileSkill);
  if (skillTokens.length === 0) return false;

  const requirementTokens = tokenize(requirementText);
  return aliasCandidates(skillTokens).some((candidate) =>
    containsSubsequence(requirementTokens, candidate),
  );
}
