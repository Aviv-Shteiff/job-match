import { normalizeForGrounding } from './normalize.js';

export function isGrounded(quote, adText) {
  return normalizeForGrounding(adText).includes(normalizeForGrounding(quote));
}

export function groundRequirements(requirements, adText) {
  const accepted = [];
  const rejected = [];

  for (const requirement of requirements) {
    if (isGrounded(requirement.source_quote, adText)) {
      accepted.push(requirement);
    } else {
      rejected.push({ requirement, reason: 'quote_not_found' });
    }
  }

  return { accepted, rejected };
}
