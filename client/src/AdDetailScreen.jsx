import { useEffect, useState } from 'react';
import { getAnalysis } from './api.js';

function adTitle(adText) {
  const firstLine = adText
    .split('\n')
    .map((line) => line.trim())
    .find((line) => line.length > 0);
  return firstLine || '(untitled ad)';
}

function formatPercent(percent) {
  return percent === null || percent === undefined ? 'not yet calculated' : `${percent}%`;
}

// C13: "the shortfall is shown as the reason for the gap rather than left to be
// inferred." Old-shape analyses (stored before turn 3) have no gapReason at all
// — formatGapReason returns null for that, same as any other unrecognized
// shape, so the row just renders without a reason line rather than breaking.
function formatGapReason(gapReason) {
  if (!gapReason) return null;
  switch (gapReason.code) {
    case 'skill_missing':
      return 'Not in your profile.';
    case 'no_years_recorded':
      return 'In your profile, but no years of experience recorded.';
    case 'years_short':
      return `Requires ${gapReason.required}+ years; your profile records ${gapReason.recorded}.`;
    case 'no_education_recorded':
      return 'No education recorded in your profile.';
    case 'education_mismatch':
      return "Your recorded education doesn't name this field.";
    default:
      return null;
  }
}

function RequirementRow({ requirement, showReason = false }) {
  const reasonText = showReason ? formatGapReason(requirement.gapReason) : null;
  return (
    <li>
      <div className="requirement-text" dir="auto">
        {requirement.text}
      </div>
      <div className="requirement-quote" dir="auto">
        &ldquo;{requirement.source_quote}&rdquo;
      </div>
      {reasonText && <div className="gap-reason">{reasonText}</div>}
    </li>
  );
}

export default function AdDetailScreen({ analysisId, onBack }) {
  const [state, setState] = useState('loading'); // loading | loaded | error
  const [analysis, setAnalysis] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setState('loading');
    getAnalysis(analysisId).then((result) => {
      if (cancelled) return;
      if (result.ok) {
        setAnalysis(result.analysis);
        setState('loaded');
      } else {
        setState('error');
      }
    });
    return () => {
      cancelled = true;
    };
  }, [analysisId]);

  if (state === 'loading') {
    return (
      <section>
        <button type="button" onClick={onBack}>
          ← Back to ads
        </button>
        <p>Loading ad…</p>
      </section>
    );
  }

  if (state === 'error') {
    return (
      <section>
        <button type="button" onClick={onBack}>
          ← Back to ads
        </button>
        <p className="failure">Could not load this ad. Try going back and selecting it again.</p>
      </section>
    );
  }

  // C8: requirements the profile meets, then gaps, with must-have gaps before
  // nice-to-have gaps — match.gaps already arrives in that order from the
  // server (matching.js), grouped here into subsections for a clearer read.
  const { match } = analysis;
  const metMustHave = match.met.filter((r) => r.type === 'must_have');
  const metNiceToHave = match.met.filter((r) => r.type === 'nice_to_have');
  const gapMustHave = match.gaps.filter((r) => r.type === 'must_have');
  const gapNiceToHave = match.gaps.filter((r) => r.type === 'nice_to_have');

  return (
    <section>
      <button type="button" onClick={onBack}>
        ← Back to ads
      </button>
      <h2 dir="auto">{adTitle(analysis.adText)}</h2>
      <p className="detail-percents">
        Must-have match: <strong>{formatPercent(analysis.mustHavePercent)}</strong>
        {' · '}
        Nice-to-have match: <strong>{formatPercent(analysis.niceToHavePercent)}</strong>
      </p>

      <h3>Requirements met</h3>
      {match.met.length === 0 && <p className="empty-note">None yet.</p>}
      {metMustHave.length > 0 && (
        <>
          <h4>Must have</h4>
          <ul className="requirement-list">
            {metMustHave.map((r, i) => (
              <RequirementRow key={i} requirement={r} />
            ))}
          </ul>
        </>
      )}
      {metNiceToHave.length > 0 && (
        <>
          <h4>Nice to have</h4>
          <ul className="requirement-list">
            {metNiceToHave.map((r, i) => (
              <RequirementRow key={i} requirement={r} />
            ))}
          </ul>
        </>
      )}

      <h3>Gaps</h3>
      {match.gaps.length === 0 && (
        <p className="empty-note">No gaps — every matchable requirement is met.</p>
      )}
      {gapMustHave.length > 0 && (
        <>
          <h4>Must-have gaps</h4>
          <ul className="requirement-list gap-list">
            {gapMustHave.map((r, i) => (
              <RequirementRow key={i} requirement={r} showReason />
            ))}
          </ul>
        </>
      )}
      {gapNiceToHave.length > 0 && (
        <>
          <h4>Nice-to-have gaps</h4>
          <ul className="requirement-list gap-list">
            {gapNiceToHave.map((r, i) => (
              <RequirementRow key={i} requirement={r} showReason />
            ))}
          </ul>
        </>
      )}

      {match.excluded.length > 0 && (
        <>
          <h3>Not counted toward the match</h3>
          <p className="empty-note">
            These describe a soft skill or general trait rather than a specific
            technology or tool, so they&rsquo;re excluded from the percentages above.
          </p>
          <ul className="requirement-list excluded-list">
            {match.excluded.map((r, i) => (
              <RequirementRow key={i} requirement={r} />
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
