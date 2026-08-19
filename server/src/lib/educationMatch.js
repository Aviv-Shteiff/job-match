import { normalizeForGrounding } from './normalize.js';

// C15: an education requirement is met only when the profile's education entry
// names the same field of study, compared after degree-type words are set aside
// on both sides. Turn-3 decision (Q4): two stoplists — degree words, then
// generic qualifiers. A third, minimal list (articles) is added here out of
// practical necessity: without stripping "a"/"an"/"the", C15's own literal
// example — "an equivalent technical degree" — never actually reduces to
// nothing, since real sentences always carry grammatical scaffolding. Articles
// are never a real field-of-study name, so this doesn't widen the criterion's
// intent, only makes it achievable.
const DEGREE_WORDS = new Set([
  'bsc',
  'msc',
  'ba',
  'ma',
  'phd',
  'bachelor',
  'bachelors',
  'master',
  'masters',
  'doctorate',
  'degree',
  'diploma',
  'תואר',
]);

const GENERIC_QUALIFIERS = new Set([
  'equivalent',
  'technical',
  'relevant',
  'related',
  'similar',
  'field',
  'or',
]);

const ARTICLES = new Set(['a', 'an', 'the']);

function tokenize(text) {
  return normalizeForGrounding(text)
    .split(/[^\p{L}\p{N}]+/u)
    .filter((token) => token.length > 0);
}

function extractField(text) {
  return tokenize(text).filter(
    (token) => !DEGREE_WORDS.has(token) && !GENERIC_QUALIFIERS.has(token) && !ARTICLES.has(token),
  );
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

// Known limitation, not fixed here: Hebrew prepositions are commonly fused onto
// the following word ("במדעי" = "ב" + "מדעי") rather than written as separate
// tokens, so a profile field written without the prefix ("מדעי המחשב") will not
// token-match the same field written with it inside a requirement ("במדעי
// המחשב"). Full Hebrew prefix-stripping would need a small dictionary of
// legitimate exceptions to avoid mangling words that happen to start with the
// same letters, which is out of scope for this turn.
export function educationMatches(profileEducation, requirementText) {
  if (!profileEducation || profileEducation.trim() === '') return false;

  const requirementField = extractField(requirementText);
  if (requirementField.length === 0) return true;

  const profileField = extractField(profileEducation);
  if (profileField.length === 0) return false;

  return containsSubsequence(requirementField, profileField);
}
