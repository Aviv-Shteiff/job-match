import { Router } from 'express';
import { getDb } from '../db.js';

// C1: a single-user profile, one document, fixed id. Skills are trimmed and
// de-duplicated case-insensitively; empty strings are rejected.
// Stores plain skill names only. C1's optional per-skill years and the optional
// education entry are specified but not implemented yet — that is turn 3's work.
const PROFILE_ID = 'profile';

export const profileRouter = Router();

profileRouter.get('/', async (req, res) => {
  const db = getDb();
  const profile = await db.collection('profiles').findOne({ _id: PROFILE_ID });
  res.json({ ok: true, profile: profile || { _id: PROFILE_ID, skills: [], updatedAt: null } });
});

profileRouter.put('/', async (req, res) => {
  const { skills } = req.body ?? {};

  if (!Array.isArray(skills) || !skills.every((s) => typeof s === 'string')) {
    return res.status(400).json({ ok: false, message: 'skills must be an array of strings.' });
  }

  const cleaned = [];
  const seen = new Set();
  for (const raw of skills) {
    const trimmed = raw.trim();
    if (trimmed === '') continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    cleaned.push(trimmed);
  }

  const db = getDb();
  const updatedAt = new Date();
  await db
    .collection('profiles')
    .updateOne({ _id: PROFILE_ID }, { $set: { skills: cleaned, updatedAt } }, { upsert: true });

  res.json({ ok: true, profile: { _id: PROFILE_ID, skills: cleaned, updatedAt } });
});
