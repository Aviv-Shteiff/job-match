// SPEC.md C1: a skill entry is a name plus an optional number of years; the
// profile also holds one optional free-text education entry. No years recorded
// (null) and years recorded as zero are distinct and stored distinctly. Each
// entry also records which of the profile screen's two groups it belongs to —
// display only; matching (skillMatch.js) never reads it.
// Validation is strict and all-or-nothing at this boundary — a malformed entry
// fails the whole request rather than being silently dropped or coerced, per
// CLAUDE.md's rule against placeholders a user could mistake for a real answer.

const VALID_GROUPS = new Set(['skill', 'role']);

function isNonNegativeInteger(value) {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

function normalizeGroup(group) {
  if (group === undefined) return { ok: true, group: 'skill' };
  if (!VALID_GROUPS.has(group)) return { ok: false };
  return { ok: true, group };
}

function normalizeYears(years) {
  if (years === undefined || years === null) return { ok: true, years: null };
  if (!isNonNegativeInteger(years)) return { ok: false };
  return { ok: true, years };
}

function normalizeSkills(rawSkills) {
  if (!Array.isArray(rawSkills)) return { ok: false, message: 'skills must be an array.' };

  const skills = [];
  const seen = new Set();

  for (const entry of rawSkills) {
    if (entry === null || typeof entry !== 'object' || Array.isArray(entry)) {
      return { ok: false, message: 'Each skill entry must be an object.' };
    }
    if (typeof entry.name !== 'string') {
      return { ok: false, message: 'Each skill entry must have a name.' };
    }

    const trimmedName = entry.name.trim();
    if (trimmedName === '') continue;

    const yearsResult = normalizeYears(entry.years);
    if (!yearsResult.ok) {
      return { ok: false, message: `Invalid years value for "${trimmedName}".` };
    }

    const groupResult = normalizeGroup(entry.group);
    if (!groupResult.ok) {
      return { ok: false, message: `Invalid group value for "${trimmedName}".` };
    }

    const key = trimmedName.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    skills.push({ name: trimmedName, years: yearsResult.years, group: groupResult.group });
  }

  return { ok: true, skills };
}

function normalizeEducation(rawEducation) {
  if (rawEducation === undefined || rawEducation === null) return { ok: true, education: null };
  if (typeof rawEducation !== 'string') {
    return { ok: false, message: 'education must be a string.' };
  }
  const trimmed = rawEducation.trim();
  return { ok: true, education: trimmed === '' ? null : trimmed };
}

export function validateProfileInput(body) {
  const skillsResult = normalizeSkills(body?.skills);
  if (!skillsResult.ok) return { ok: false, message: skillsResult.message };

  const educationResult = normalizeEducation(body?.education);
  if (!educationResult.ok) return { ok: false, message: educationResult.message };

  return { ok: true, skills: skillsResult.skills, education: educationResult.education };
}
