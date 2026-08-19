import { FAILURE_REASONS, failure } from './failures.js';

const VALID_TYPES = new Set(['must_have', 'nice_to_have']);

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
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
    })),
  };
}
