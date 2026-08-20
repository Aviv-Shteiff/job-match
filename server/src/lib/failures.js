// Named failure reasons for the analyse pipeline. A failure always carries one of
// these reasons plus a human-readable message — never a silently empty result
// (CLAUDE.md: "A failure is shown as a failure").
export const FAILURE_REASONS = {
  TOO_SHORT: 'too_short',
  TOO_LONG: 'too_long',
  INVALID_METADATA: 'invalid_metadata',
  NOT_JSON: 'not_json',
  WRONG_SHAPE: 'wrong_shape',
  BAD_LABEL: 'bad_label',
  NO_GROUNDED_REQUIREMENTS: 'no_grounded_requirements',
  MODEL_CALL_FAILED: 'model_call_failed',
  MODEL_TIMEOUT: 'model_timeout',
};

export function failure(reason, message) {
  return { ok: false, reason, message };
}
