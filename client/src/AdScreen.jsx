import { useState } from 'react';
import { submitAd } from './api.js';

const FAILURE_LABELS = {
  too_short: 'Ad text is too short.',
  too_long: 'Ad text is too long.',
  not_json: 'The model did not return valid JSON.',
  wrong_shape: 'The model response was missing required fields.',
  bad_label: 'The model returned an invalid requirement label.',
  no_grounded_requirements: 'None of the extracted requirements could be verified against the ad text.',
  model_call_failed: 'The model call failed.',
  model_timeout: 'The model did not respond in time.',
  missing_ad_text: 'No ad text was submitted.',
  invalid_metadata: 'One of the fields below is not valid.',
  network_error: 'Could not reach the server.',
};

export default function AdScreen() {
  const [adText, setAdText] = useState('');
  const [title, setTitle] = useState('');
  const [company, setCompany] = useState('');
  const [url, setUrl] = useState('');
  const [status, setStatus] = useState('idle'); // idle | submitting | success | failure
  const [result, setResult] = useState(null);
  const [failure, setFailure] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus('submitting');
    setResult(null);
    setFailure(null);

    const response = await submitAd(adText, { title, company, url });

    if (response.ok) {
      setResult(response.analysis);
      setStatus('success');
    } else {
      setFailure(response);
      setStatus('failure');
    }
  }

  const mustHave = result?.requirements.filter((r) => r.type === 'must_have') ?? [];
  const niceToHave = result?.requirements.filter((r) => r.type === 'nice_to_have') ?? [];
  const rejectedCount = result?.rejectedRequirements?.length ?? 0;

  return (
    <section>
      <h2>Analyse a job ad</h2>
      <form onSubmit={handleSubmit}>
        <textarea
          rows={12}
          value={adText}
          onChange={(e) => setAdText(e.target.value)}
          placeholder="Paste the full job ad text here…"
          dir="auto"
        />
        <div className="ad-metadata-row">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Job title (optional)"
            dir="auto"
          />
          <input
            type="text"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder="Company (optional)"
            dir="auto"
          />
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Link to posting (optional)"
          />
        </div>
        <div>
          <button type="submit" disabled={status === 'submitting' || adText.trim() === ''}>
            {status === 'submitting' ? 'Analysing…' : 'Analyse'}
          </button>
        </div>
      </form>

      {status === 'submitting' && (
        <div className="loading-overlay">
          <div className="loading-card">
            <div className="spinner" aria-hidden="true" />
            <p>Analysing your ad — this can take up to 60 seconds…</p>
          </div>
        </div>
      )}

      {status === 'failure' && failure && (
        <div className="failure" role="alert">
          <strong>Analysis failed:</strong> {FAILURE_LABELS[failure.reason] || 'Something went wrong.'}
          <div className="failure-detail">{failure.message}</div>
        </div>
      )}

      {status === 'success' && result && (
        <div className="results">
          <h3>Requirements</h3>
          {mustHave.length > 0 && (
            <>
              <h4>Must have</h4>
              <ul className="requirement-list">
                {mustHave.map((r, i) => (
                  <RequirementItem key={i} requirement={r} />
                ))}
              </ul>
            </>
          )}
          {niceToHave.length > 0 && (
            <>
              <h4>Nice to have</h4>
              <ul className="requirement-list">
                {niceToHave.map((r, i) => (
                  <RequirementItem key={i} requirement={r} />
                ))}
              </ul>
            </>
          )}
          {rejectedCount > 0 && (
            <p className="rejected-note">
              {rejectedCount} requirement{rejectedCount === 1 ? '' : 's'} discarded: quote not found
              in the ad.
            </p>
          )}
        </div>
      )}
    </section>
  );
}

function RequirementItem({ requirement }) {
  return (
    <li>
      <div className="requirement-text" dir="auto">
        {requirement.text}
      </div>
      <div className="requirement-quote" dir="auto">
        &ldquo;{requirement.source_quote}&rdquo;
      </div>
    </li>
  );
}
