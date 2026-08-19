// C7: the ad list is ordered by must-have match percentage, highest first.
// SPEC.md is silent on ties and on a null percentage (an analysis not yet
// matched) — decided (turn 2, G5): ties break by analyzedAt, newest first; null
// percentages sort last regardless of any other field.
export function rankAnalyses(analyses) {
  return [...analyses].sort((a, b) => {
    const aIsNull = a.mustHavePercent === null || a.mustHavePercent === undefined;
    const bIsNull = b.mustHavePercent === null || b.mustHavePercent === undefined;

    if (aIsNull && bIsNull) return b.analyzedAt - a.analyzedAt;
    if (aIsNull) return 1;
    if (bIsNull) return -1;
    if (b.mustHavePercent !== a.mustHavePercent) return b.mustHavePercent - a.mustHavePercent;
    return b.analyzedAt - a.analyzedAt;
  });
}
