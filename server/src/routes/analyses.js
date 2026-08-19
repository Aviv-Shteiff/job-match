import { Router } from 'express';
import { analyseAd } from '../lib/analyse.js';

const CLIENT_ERROR_REASONS = new Set(['too_short', 'too_long']);

export const analysesRouter = Router();

analysesRouter.post('/', async (req, res) => {
  const adText = req.body?.adText;

  if (typeof adText !== 'string') {
    return res.status(400).json({ ok: false, reason: 'missing_ad_text', message: 'adText is required.' });
  }

  const result = await analyseAd(adText);

  if (!result.ok) {
    const status = CLIENT_ERROR_REASONS.has(result.reason) ? 400 : 502;
    return res.status(status).json(result);
  }

  return res.status(201).json(result);
});
