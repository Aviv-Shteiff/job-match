import { getDb } from '../db.js';

// Every OpenRouter call is logged here, success or failure, per CLAUDE.md: "Every
// model call is logged with model identifier, input tokens, output tokens, cost, and
// latency."
export async function logModelCall({
  requestedModel,
  model,
  inputTokens,
  outputTokens,
  cost,
  latencyMs,
  status,
  errorMessage,
}) {
  const db = getDb();
  await db.collection('modelCalls').insertOne({
    requestedModel,
    model,
    inputTokens,
    outputTokens,
    cost,
    latencyMs,
    status,
    errorMessage,
    timestamp: new Date(),
  });
}
