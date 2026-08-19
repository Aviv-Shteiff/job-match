import { useEffect, useState } from 'react';
import { getAnalyses } from './api.js';

// No title field is stored (SPEC.md never gives ads one) — derived at render
// time from the ad's own text, so nothing new needs to be stored (G8).
function adTitle(adText) {
  const firstLine = adText
    .split('\n')
    .map((line) => line.trim())
    .find((line) => line.length > 0);
  if (!firstLine) return '(untitled ad)';
  return firstLine.length > 80 ? `${firstLine.slice(0, 80)}…` : firstLine;
}

function formatPercent(percent) {
  return percent === null || percent === undefined ? 'not yet calculated' : `${percent}%`;
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString();
}

export default function AdListScreen({ onSelect }) {
  const [state, setState] = useState('loading'); // loading | loaded | error
  const [analyses, setAnalyses] = useState([]);

  useEffect(() => {
    let cancelled = false;
    getAnalyses().then((result) => {
      if (cancelled) return;
      if (result.ok) {
        setAnalyses(result.analyses);
        setState('loaded');
      } else {
        setState('error');
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (state === 'loading') {
    return <p>Loading ads…</p>;
  }

  if (state === 'error') {
    return <p className="failure">Could not load the ad list. Try reloading the page.</p>;
  }

  if (analyses.length === 0) {
    return <p>No ads analysed yet. Use the &ldquo;Analyse ad&rdquo; tab to paste one in.</p>;
  }

  return (
    <section>
      <h2>Analysed ads</h2>
      <ul className="ad-list">
        {analyses.map((analysis) => (
          <li key={analysis._id}>
            <button type="button" className="ad-row" onClick={() => onSelect(analysis._id)}>
              <span className="ad-title" dir="auto">
                {adTitle(analysis.adText)}
              </span>
              <span className="ad-percents">
                <span className="ad-percent">Must-have: {formatPercent(analysis.mustHavePercent)}</span>
                <span className="ad-percent">Nice-to-have: {formatPercent(analysis.niceToHavePercent)}</span>
              </span>
              <span className="ad-date">{formatDate(analysis.analyzedAt)}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
