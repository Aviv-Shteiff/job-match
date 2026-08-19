import { FAILURE_REASONS, failure } from './failures.js';

const VALID_TYPES = new Set(['must_have', 'nice_to_have']);

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isNonNegativeInteger(value) {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

// Validates the shape of a parsed extraction response. Does not check grounding —
// that is a separate, later step (see grounding.js) — only that the envelope and
// every item in it are structurally sound (C5, C11).
function validateShape(parsed) {
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return failure(FAILURE_REASONS.WRONG_SHAPE, 'Model response is not a JSON object.');
  }

  if (!Array.isArray(parsed.requirements)) {
    return failure(
      FAILURE_REASONS.WRONG_SHAPE,
      'Model response is missing a "requirements" array.',
    );
  }

  for (const item of parsed.requirements) {
    if (item === null || typeof item !== 'object' || Array.isArray(item)) {
      return failure(FAILURE_REASONS.WRONG_SHAPE, 'A requirement entry is not an object.');
    }

    if (!isNonEmptyString(item.text)) {
      return failure(FAILURE_REASONS.WRONG_SHAPE, 'A requirement is missing "text".');
    }

    if (!isNonEmptyString(item.source_quote)) {
      return failure(
        FAILURE_REASONS.WRONG_SHAPE,
        'A requirement is missing "source_quote".',
      );
    }

    if (item.type === undefined) {
      return failure(FAILURE_REASONS.WRONG_SHAPE, 'A requirement is missing "type".');
    }

    if (!VALID_TYPES.has(item.type)) {
      return failure(
        FAILURE_REASONS.BAD_LABEL,
        `A requirement has an invalid type: "${item.type}".`,
      );
    }

    // C13/C14/Part 3: the model reads any stated years threshold off the ad.
    // Turn-3 decision (Q2): the key must be present — null means "no threshold
    // stated" — so a model that silently omits it fails visibly rather than
    // producing an invisibly-optimistic match (LESSONS.md's confirmed Q1
    // overstatement is exactly this failure mode with a different cause).
    if (item.years_required === undefined) {
      return failure(FAILURE_REASONS.WRONG_SHAPE, 'A requirement is missing "years_required".');
    }
    if (item.years_required !== null && !isNonNegativeInteger(item.years_required)) {
      return failure(
        FAILURE_REASONS.WRONG_SHAPE,
        `A requirement has an invalid years_required: "${item.years_required}".`,
      );
    }

    // C15/Part 3: the model reads off whether a requirement is asking for a
    // degree, so education requirements never rely on matchable.js's soft-skill
    // exclude-list to be recognized.
    if (item.is_education_requirement === undefined) {
      return failure(
        FAILURE_REASONS.WRONG_SHAPE,
        'A requirement is missing "is_education_requirement".',
      );
    }
    if (typeof item.is_education_requirement !== 'boolean') {
      return failure(
        FAILURE_REASONS.WRONG_SHAPE,
        `A requirement has a non-boolean is_education_requirement: "${item.is_education_requirement}".`,
      );
    }
  }

  return null;
}

export function validateExtractionResponse(rawText) {
  let parsed;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    return failure(FAILURE_REASONS.NOT_JSON, 'Model response is not valid JSON.');
  }

  const shapeFailure = validateShape(parsed);
  if (shapeFailure) return shapeFailure;

  return {
    ok: true,
    requirements: parsed.requirements.map((item) => ({
      text: item.text.trim(),
      source_quote: item.source_quote,
      type: item.type,
      years_required: item.years_required,
      is_education_requirement: item.is_education_requirement,
    })),
  };
}
