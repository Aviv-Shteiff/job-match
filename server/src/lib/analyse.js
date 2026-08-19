import { getDb } from '../db.js';
import { checkAdTextLength } from './guards.js';
import { buildExtractionPrompt } from './extractionPrompt.js';
import { callOpenRouter } from './openrouter.js';
import { validateExtractionResponse } from './validateResponse.js';
import { groundRequirements } from './grounding.js';
import { FAILURE_REASONS, failure } from './failures.js';

// The only place the model is called (SPEC.md §3): guard the input, extract, ground
// every requirement against the submitted text, and store only what survives
// grounding. A failure at any stage returns a typed failure and stores nothing in
// `analyses` — but a model call, if one was made, is always logged by
// callOpenRouter regardless of what happens afterward.
export async function analyseAd(rawAdText) {
  const adText = rawAdText.trim();

  const lengthCheck = checkAdTextLength(adText);
  if (!lengthCheck.ok) {
    return lengthCheck;
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

  const analysis = {
    adText,
    requirements: accepted,
    rejectedRequirements: rejected.map(({ requirement, reason }) => ({
      ...requirement,
      reason,
    })),
    mustHavePercent: null,
    niceToHavePercent: null,
    analyzedAt: new Date(),
    model: modelResult.model,
    inputTokens: modelResult.inputTokens,
    outputTokens: modelResult.outputTokens,
    cost: modelResult.cost,
    latencyMs: modelResult.latencyMs,
  };

  const db = getDb();
  const { insertedId } = await db.collection('analyses').insertOne(analysis);

  return { ok: true, analysis: { ...analysis, _id: insertedId } };
}
