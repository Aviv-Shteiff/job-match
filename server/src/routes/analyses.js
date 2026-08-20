import { Router } from 'express';
import { ObjectId } from 'mongodb';
import { getDb } from '../db.js';
import { analyseAd } from '../lib/analyse.js';
import { rankAnalyses } from '../lib/ranking.js';
import { recalculateMatch } from '../lib/recalculate.js';

const CLIENT_ERROR_REASONS = new Set(['too_short', 'too_long', 'invalid_metadata']);

export const analysesRouter = Router();

function parseObjectId(rawId) {
  try {
    return new ObjectId(rawId);
  } catch {
    return null;
  }
}

// C7: the ad list is ordered by must-have match percentage, highest first —
// computed in ordinary code (ranking.js), not left to storage order or a
// database-level sort, so the same tested tie-breaking rules apply everywhere.
analysesRouter.get('/', async (req, res) => {
  const db = getDb();
  const analyses = await db
    .collection('analyses')
    .find(
      {},
      {
        projection: {
          adText: 1,
          title: 1,
          company: 1,
          mustHavePercent: 1,
          niceToHavePercent: 1,
          analyzedAt: 1,
        },
      },
    )
    .toArray();

  res.json({ ok: true, analyses: rankAnalyses(analyses) });
});

analysesRouter.get('/:id', async (req, res) => {
  const objectId = parseObjectId(req.params.id);
  if (!objectId) {
    return res.status(400).json({ ok: false, message: 'Invalid analysis id.' });
  }

  const db = getDb();
  const analysis = await db.collection('analyses').findOne({ _id: objectId });

  if (!analysis) {
    return res.status(404).json({ ok: false, message: 'Analysis not found.' });
  }

  res.json({ ok: true, analysis });
});

// C19: a hard delete — the analysis document is removed outright, no soft-delete
// flag, no archive (FRAMING.md's constraints: permanence is a decision, not
// something a later turn quietly softens). The modelCalls collection is
// untouched: nothing links a call to the analysis it produced, in either
// direction, so there is no record to find and remove even if this wanted to.
analysesRouter.delete('/:id', async (req, res) => {
  const objectId = parseObjectId(req.params.id);
  if (!objectId) {
    return res.status(400).json({ ok: false, message: 'Invalid analysis id.' });
  }

  const db = getDb();
  const { deletedCount } = await db.collection('analyses').deleteOne({ _id: objectId });

  if (deletedCount === 0) {
    return res.status(404).json({ ok: false, message: 'Analysis not found.' });
  }

  res.json({ ok: true });
});

// C10/Part 3: the only route that updates an existing analysis document —
// replaces its match snapshot against the current profile, with no model call.
// Everything else on the document (ad text, requirements, title, company, link,
// analyzedAt, model-call metadata) is untouched, since recalculateMatch() returns
// only the three fields $set below.
analysesRouter.post('/:id/recalculate', async (req, res) => {
  const objectId = parseObjectId(req.params.id);
  if (!objectId) {
    return res.status(400).json({ ok: false, message: 'Invalid analysis id.' });
  }

  const db = getDb();
  const analysis = await db.collection('analyses').findOne({ _id: objectId });
  if (!analysis) {
    return res.status(404).json({ ok: false, message: 'Analysis not found.' });
  }

  const storedProfile = await db.collection('profiles').findOne({ _id: 'profile' });
  const profile = { skills: storedProfile?.skills ?? [], education: storedProfile?.education ?? null };
  const update = recalculateMatch(analysis.requirements, profile);

  await db.collection('analyses').updateOne({ _id: objectId }, { $set: update });

  res.json({ ok: true, analysis: { ...analysis, ...update } });
});

// C20: the same operation as recalculate, applied to every stored analysis in one
// action. Reports per-ad outcomes rather than aborting on the first failure — with
// no model call involved, a failure here means a database error, and a partial
// result silently reported as complete would be worse than a slower, honest one.
analysesRouter.post('/recalculate-all', async (req, res) => {
  const db = getDb();
  const storedProfile = await db.collection('profiles').findOne({ _id: 'profile' });
  const profile = { skills: storedProfile?.skills ?? [], education: storedProfile?.education ?? null };

  const analyses = await db
    .collection('analyses')
    .find({}, { projection: { requirements: 1 } })
    .toArray();

  let succeeded = 0;
  const failed = [];
  for (const analysis of analyses) {
    try {
      const update = recalculateMatch(analysis.requirements, profile);
      await db.collection('analyses').updateOne({ _id: analysis._id }, { $set: update });
      succeeded += 1;
    } catch (err) {
      failed.push({ id: String(analysis._id), message: err.message });
    }
  }

  res.json({ ok: true, total: analyses.length, succeeded, failed });
});

analysesRouter.post('/', async (req, res) => {
  const adText = req.body?.adText;

  if (typeof adText !== 'string') {
    return res.status(400).json({ ok: false, reason: 'missing_ad_text', message: 'adText is required.' });
  }

  const { title, company, url } = req.body ?? {};
  const result = await analyseAd(adText, { title, company, url });

  if (!result.ok) {
    const status = CLIENT_ERROR_REASONS.has(result.reason) ? 400 : 502;
    return res.status(status).json(result);
  }

  return res.status(201).json(result);
});
