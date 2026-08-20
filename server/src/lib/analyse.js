import { getDb } from '../db.js';
import { checkAdTextLength } from './guards.js';
import { validateAdMetadata } from './adMetadata.js';
import { buildExtractionPrompt } from './extractionPrompt.js';
import { callOpenRouter } from './openrouter.js';
import { validateExtractionResponse } from './validateResponse.js';
import { groundRequirements } from './grounding.js';
import { buildMatchSnapshot } from './matching.js';
import { FAILURE_REASONS, failure } from './failures.js';

// The only place the model is called (SPEC.md §3): guard the input, extract, ground
// every requirement against the submitted text, and store only what survives
// grounding. A failure at any stage returns a typed failure and stores nothing in
// `analyses` — but a model call, if one was made, is always logged by
// callOpenRouter regardless of what happens afterward.
export async function analyseAd(rawAdText, rawMetadata = {}) {
  const adText = rawAdText.trim();

  const lengthCheck = checkAdTextLength(adText);
  if (!lengthCheck.ok) {
    return lengthCheck;
  }

  const metadataResult = validateAdMetadata(rawMetadata);
  if (!metadataResult.ok) {
    return failure(FAILURE_REASONS.INVALID_METADATA, metadataResult.message);
  }

  const prompt = buildExtractionPrompt(adText);
  const modelResult = await callOpenRouter(prompt);
  if (!modelResult.ok) {
    return modelResult;
  }

  const validation = validateExtractionResponse(modelResult.content);
  if (!validation.ok) {
    return validation;
  }

  const { accepted, rejected } = groundRequirements(validation.requirements, adText);

  if (accepted.length === 0) {
    const message =
      validation.requirements.length === 0
        ? 'The model did not return any requirements for this ad.'
        : `The model returned ${validation.requirements.length} requirement(s), but none of their quotes were found in the ad text.`;
    return failure(FAILURE_REASONS.NO_GROUNDED_REQUIREMENTS, message);
  }

  const db = getDb();
  const storedProfile = await db.collection('profiles').findOne({ _id: 'profile' });
  const profile = { skills: storedProfile?.skills ?? [], education: storedProfile?.education ?? null };
  const match = buildMatchSnapshot(accepted, profile);

  const analysis = {
    adText,
    // C17: optional, independent of each other and of the ad text itself.
    title: metadataResult.title,
    company: metadataResult.company,
    url: metadataResult.url,
    requirements: accepted,
    rejectedRequirements: rejected.map(({ requirement, reason }) => ({
      ...requirement,
      reason,
    })),
    // Top-level fields mirror match.mustHavePercent/niceToHavePercent for cheap
    // sorting (C7) without reaching into the nested snapshot. They're written
    // together in one insert, so the two can't drift apart.
    mustHavePercent: match.mustHavePercent,
    niceToHavePercent: match.niceToHavePercent,
    match,
    analyzedAt: new Date(),
    model: modelResult.model,
    inputTokens: modelResult.inputTokens,
    outputTokens: modelResult.outputTokens,
    cost: modelResult.cost,
    latencyMs: modelResult.latencyMs,
  };

  const { insertedId } = await db.collection('analyses').insertOne(analysis);

  return { ok: true, analysis: { ...analysis, _id: insertedId } };
}
