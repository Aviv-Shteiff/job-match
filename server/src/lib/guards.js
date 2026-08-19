import { FAILURE_REASONS, failure } from './failures.js';

// C2: text shorter than 200 characters is rejected before any model call.
const MIN_AD_LENGTH = 200;

// §5 pitfall ("very long ads exceed a sensible token budget"), decided cap: reject
// rather than truncate, since a truncated ad makes quotes ungroundable.
const MAX_AD_LENGTH = 20000;

// Counted in Unicode code points, not UTF-16 code units, so astral characters
// (e.g. emoji) aren't double-counted against the bound.
function codePointLength(text) {
  return Array.from(text).length;
}

export function checkAdTextLength(rawText) {
  const length = codePointLength(rawText.trim());

  if (length < MIN_AD_LENGTH) {
    return failure(
      FAILURE_REASONS.TOO_SHORT,
      `Ad text is too short (${length} characters). Paste the full ad — at least ${MIN_AD_LENGTH} characters.`,
    );
  }

  if (length > MAX_AD_LENGTH) {
    return failure(
      FAILURE_REASONS.TOO_LONG,
      `Ad text is too long (${length} characters). Trim it to at most ${MAX_AD_LENGTH} characters.`,
    );
  }

  return { ok: true };
}
