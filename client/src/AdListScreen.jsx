import { useEffect, useState } from 'react';
import { getAnalyses, deleteAnalysis, recalculateAllAnalyses } from './api.js';
import Modal from './Modal.jsx';

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

// C10/FRAMING #5: a date shown beside a percentage must explain that percentage.
// match.matchedAt is set at analysis time too (buildMatchSnapshot runs
// synchronously, milliseconds before analyzedAt in analyse.js), so a tolerance
// distinguishes "computed as part of analysing" from a genuine later recalculate,
// rather than flagging every ad as "recalculated" the moment it's created.
const RECALCULATION_THRESHOLD_MS = 5000;

function matchDateInfo(analysis) {
  const matchedAt = analysis.match?.matchedAt;
  if (!matchedAt) return { date: analysis.analyzedAt, recalculated: false };

  const gapMs = new Date(matchedAt).getTime() - new Date(analysis.analyzedAt).getTime();
  if (gapMs < RECALCULATION_THRESHOLD_MS) return { date: analysis.analyzedAt, recalculated: false };
  return { date: matchedAt, recalculated: true };
}

export default function AdListScreen({ onSelect }) {
  const [state, setState] = useState('loading'); // loading | loaded | error
  const [analyses, setAnalyses] = useState([]);
  const [deleteError, setDeleteError] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null); // { id, label } | null
  const [pendingRecalculateAll, setPendingRecalculateAll] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const [recalculateError, setRecalculateError] = useState(null);

  function loadAnalyses(guard = { cancelled: false }) {
    return getAnalyses().then((result) => {
      if (guard.cancelled) return;
      if (result.ok) {
        setAnalyses(result.analyses);
        setState('loaded');
      } else {
        setState('error');
      }
    });
  }

  useEffect(() => {
    const guard = { cancelled: false };
    loadAnalyses(guard);
    return () => {
      guard.cancelled = true;
    };
  }, []);

  // C19: deletion is permanent and takes one confirmation — the in-app Modal is
  // that one confirmation, replacing the native window.confirm() dialog.
  async function confirmDelete() {
    const { id } = pendingDelete;
    setPendingDelete(null);
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

  // C20/turn-5 Q3: overwrites every stored match snapshot in one action, so it
  // takes the same one-confirmation modal as delete, reused with different text.
  async function confirmRecalculateAll() {
    setPendingRecalculateAll(false);
    setRecalculating(true);
    setRecalculateError(null);
    const result = await recalculateAllAnalyses();
    setRecalculating(false);
    if (result.ok) {
      // G5: refetch so the list re-sorts under the new percentages (C7).
      await loadAnalyses();
    } else {
      setRecalculateError(result.message || 'Could not recalculate.');
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
      <div className="list-header">
        <h2>Analysed ads</h2>
        <button type="button" onClick={() => setPendingRecalculateAll(true)} disabled={recalculating}>
          {recalculating ? 'Recalculating…' : 'Recalculate all'}
        </button>
      </div>
      {deleteError && (
        <p className="failure" role="alert">
          Could not delete: {deleteError}
        </p>
      )}
      {recalculateError && (
        <p className="failure" role="alert">
          Could not recalculate: {recalculateError}
        </p>
      )}
      <ul className="ad-list">
        {analyses.map((analysis) => {
          const label = adLabel(analysis);
          const dateInfo = matchDateInfo(analysis);
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
                  <span className="ad-date">
                    {dateInfo.recalculated && <span className="ad-recalculated-tag">Recalculated </span>}
                    {formatDate(dateInfo.date)}
                  </span>
                </button>
                <button
                  type="button"
                  className="delete-button"
                  onClick={() => setPendingDelete({ id: analysis._id, label: label.primary })}
                  aria-label="Delete this ad"
                >
                  Delete
                </button>
              </div>
            </li>
          );
        })}
      </ul>
      {pendingDelete && (
        <Modal
          title="Delete this ad?"
          message={`Delete "${pendingDelete.label}"? This cannot be undone.`}
          confirmLabel="Delete"
          cancelLabel="Cancel"
          danger
          onConfirm={confirmDelete}
          onCancel={() => setPendingDelete(null)}
        />
      )}
      {pendingRecalculateAll && (
        <Modal
          title="Recalculate all ads?"
          message={`This replaces the stored match result on all ${analyses.length} ads against your current profile. No model call is made, and this cannot be undone.`}
          confirmLabel="Recalculate all"
          cancelLabel="Cancel"
          onConfirm={confirmRecalculateAll}
          onCancel={() => setPendingRecalculateAll(false)}
        />
      )}
    </section>
  );
}
