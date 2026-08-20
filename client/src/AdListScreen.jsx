import { useEffect, useState } from 'react';
import { getAnalyses, deleteAnalysis } from './api.js';

// Fallback when neither title nor company was entered (C18). Derived at render
// time from the ad's own text — nothing new needs to be stored for this case.
function derivedTitle(adText) {
  const firstLine = adText
    .split('\n')
    .map((line) => line.trim())
    .find((line) => line.length > 0);
  if (!firstLine) return '(untitled ad)';
  return firstLine.length > 80 ? `${firstLine.slice(0, 80)}…` : firstLine;
}

// C18: identify each ad by its entered title and company; fall back to a
// derived label, presented so it reads as derived rather than as something
// typed (§4 manual check — see the "derived" flag consumed by the className
// below).
function adLabel(analysis) {
  if (analysis.title) {
    return { primary: analysis.title, secondary: analysis.company, derived: false };
  }
  if (analysis.company) {
    return { primary: analysis.company, secondary: null, derived: false };
  }
  return { primary: derivedTitle(analysis.adText), secondary: null, derived: true };
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
  const [deleteError, setDeleteError] = useState(null);

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

  // C19: deletion is permanent and takes one confirmation — window.confirm is
  // that one confirmation, with no dependency and no custom dialog to build.
  async function handleDelete(id, label) {
    const confirmed = window.confirm(`Delete "${label}"? This cannot be undone.`);
    if (!confirmed) return;

    setDeleteError(null);
    const result = await deleteAnalysis(id);
    if (result.ok) {
      setAnalyses((prev) => prev.filter((a) => a._id !== id));
    } else {
      // A failed delete is shown as a failure, not left to look like nothing
      // happened (CLAUDE.md: "a failure is shown as a failure").
      setDeleteError(result.message || 'Could not delete this ad.');
    }
  }

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
      {deleteError && (
        <p className="failure" role="alert">
          Could not delete: {deleteError}
        </p>
      )}
      <ul className="ad-list">
        {analyses.map((analysis) => {
          const label = adLabel(analysis);
          return (
            <li key={analysis._id}>
              <div className="ad-row">
                <button type="button" className="ad-row-main" onClick={() => onSelect(analysis._id)}>
                  <span className={label.derived ? 'ad-title ad-title-derived' : 'ad-title'} dir="auto">
                    {label.primary}
                    {label.secondary && <span className="ad-company"> — {label.secondary}</span>}
                  </span>
                  <span className="ad-percents">
                    <span className="ad-percent">Must-have: {formatPercent(analysis.mustHavePercent)}</span>
                    <span className="ad-percent">Nice-to-have: {formatPercent(analysis.niceToHavePercent)}</span>
                  </span>
                  <span className="ad-date">{formatDate(analysis.analyzedAt)}</span>
                </button>
                <button
                  type="button"
                  className="delete-button"
                  onClick={() => handleDelete(analysis._id, label.primary)}
                  aria-label="Delete this ad"
                >
                  Delete
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
