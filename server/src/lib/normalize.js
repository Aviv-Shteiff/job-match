// Bidirectional control characters and zero-width characters are invisible on
// screen but break naive substring matching on RTL/mixed-script text (SPEC.md §5).
// Expressed as numeric code point ranges, not \u escapes or literal characters, so
// this file can't be silently corrupted by a tool that decodes escape sequences.
const INVISIBLE_CODE_POINT_RANGES = [
  [0x200b, 0x200f], // zero-width space/non-joiner/joiner, LTR mark, RTL mark
  [0x202a, 0x202e], // LTR/RTL embedding, pop directional formatting, LTR/RTL override
  [0x2066, 0x2069], // LTR/RTL/first-strong isolate, pop directional isolate
  [0xfeff, 0xfeff], // zero-width no-break space / byte order mark
];

function isInvisibleControlChar(codePoint) {
  return INVISIBLE_CODE_POINT_RANGES.some(
    ([start, end]) => codePoint >= start && codePoint <= end,
  );
}

export function normalizeForGrounding(text) {
  const withoutControlChars = Array.from(text.normalize('NFKC'))
    .filter((char) => !isInvisibleControlChar(char.codePointAt(0)))
    .join('');

  return withoutControlChars.replace(/\s+/gu, ' ').toLowerCase().trim();
}
