import { normalizeForGrounding } from './normalize.js';

// Turn-2 resolution (Q2, docs/LESSONS.md's open soft-skill question): a curated
// exclude-list of clearly-soft markers. A requirement containing one of these is
// dropped from the percentage calculation entirely — a tech-skills profile can
// never meaningfully satisfy it. Everything else stays matchable, including
// borderline technical concepts that name no specific tool ("responsive design",
// "RESTful APIs", "cloud experience") — errs toward showing a gap rather than
// hiding one (SPEC.md §1: "decide in favour of making a real gap more visible").
const SOFT_SKILL_MARKERS = [
  'communication',
  'self learner',
  'problem solving',
  'team player',
  'collaboration',
  'collaborative',
  'fast paced',
  'attention to detail',
  'תקשורת',
  'עצמאי',
];

export function isMatchable(requirementText) {
  // Hyphens normalize to spaces here (not in normalizeForGrounding, which
  // deliberately leaves punctuation untouched for the grounding check) so
  // "self-learner" and "self learner" both match the marker "self learner".
  const normalized = normalizeForGrounding(requirementText).replace(/-/g, ' ');
  return !SOFT_SKILL_MARKERS.some((marker) => normalized.includes(marker));
}
