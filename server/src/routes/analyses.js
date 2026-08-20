import { Router } from 'express';
import { ObjectId } from 'mongodb';
import { getDb } from '../db.js';
import { analyseAd } from '../lib/analyse.js';
import { rankAnalyses } from '../lib/ranking.js';

const CLIENT_ERROR_REASONS = new Set(['too_short', 'too_long', 'invalid_metadata']);

export const analysesRouter = Router();

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
  let objectId;
  try {
    objectId = new ObjectId(req.params.id);
  } catch {
    return res.status(400).json({ ok: false, message: 'Invalid analysis id.' });
  }

  const db = getDb();
  const analysis = await db.collection('analyses').findOne({ _id: objectId });

  if (!analysis) {
    return res.status(404).json({ ok: false, message: 'Analysis not found.' });
  }

  res.json({ ok: true, analysis });
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
