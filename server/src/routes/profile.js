import { Router } from 'express';
import { getDb } from '../db.js';
import { validateProfileInput } from '../lib/profile.js';

// C1: a single-user profile, one document, fixed id. A skill entry is
// {name, years}; years is null (not recorded) or a non-negative integer — the
// two are stored distinctly. education is null or a non-empty string.
const PROFILE_ID = 'profile';
const EMPTY_PROFILE = { _id: PROFILE_ID, skills: [], education: null, updatedAt: null };

export const profileRouter = Router();

profileRouter.get('/', async (req, res) => {
  const db = getDb();
  const profile = await db.collection('profiles').findOne({ _id: PROFILE_ID });
  res.json({ ok: true, profile: profile || EMPTY_PROFILE });
});

profileRouter.put('/', async (req, res) => {
  const validation = validateProfileInput(req.body);
  if (!validation.ok) {
    return res.status(400).json({ ok: false, message: validation.message });
  }

  const { skills, education } = validation;
  const db = getDb();
  const updatedAt = new Date();
  await db
    .collection('profiles')
    .updateOne({ _id: PROFILE_ID }, { $set: { skills, education, updatedAt } }, { upsert: true });

  res.json({ ok: true, profile: { _id: PROFILE_ID, skills, education, updatedAt } });
});
