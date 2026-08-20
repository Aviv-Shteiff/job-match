// C17: submitting an ad accepts an optional job title, company name, and posting
// link, each free text. None is required, and none is validated beyond being
// text — the link is never fetched or checked for reachability (§3, out of
// scope). Turn-4 decision (G5/G6): trimmed, empty becomes null, each field has a
// length cap enforced by rejection — SPEC.md sets no bound, and unbounded form
// input landing in the database is worth a limit; rejecting rather than
// truncating matches the posture of the ad-text length guards (guards.js).
const TITLE_MAX_LENGTH = 200;
const COMPANY_MAX_LENGTH = 200;
const URL_MAX_LENGTH = 2000;

function normalizeField(raw, maxLength, label) {
  if (raw === undefined || raw === null) return { ok: true, value: null };
  if (typeof raw !== 'string') return { ok: false, message: `${label} must be a string.` };

  const trimmed = raw.trim();
  if (trimmed === '') return { ok: true, value: null };

  if (Array.from(trimmed).length > maxLength) {
    return { ok: false, message: `${label} is too long (max ${maxLength} characters).` };
  }

  return { ok: true, value: trimmed };
}

export function validateAdMetadata(body) {
  const title = normalizeField(body?.title, TITLE_MAX_LENGTH, 'title');
  if (!title.ok) return { ok: false, message: title.message };

  const company = normalizeField(body?.company, COMPANY_MAX_LENGTH, 'company');
  if (!company.ok) return { ok: false, message: company.message };

  const url = normalizeField(body?.url, URL_MAX_LENGTH, 'url');
  if (!url.ok) return { ok: false, message: url.message };

  return { ok: true, title: title.value, company: company.value, url: url.value };
}
