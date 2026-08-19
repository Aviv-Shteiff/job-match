import { FAILURE_REASONS, failure } from './failures.js';
import { logModelCall } from './modelLog.js';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

// C2's 30-second end-to-end bound leaves room for validation, grounding, and the
// Mongo write after the model responds, so the call itself is aborted well before
// that: a timeout must still reach the browser inside the 30s window as a failure.
const CALL_TIMEOUT_MS = 25000;

export async function callOpenRouter(prompt) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const requestedModel = process.env.OPENROUTER_MODEL;

  if (!apiKey || !requestedModel) {
    throw new Error('OPENROUTER_API_KEY and OPENROUTER_MODEL must be set');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), CALL_TIMEOUT_MS);
  const startedAt = Date.now();

  try {
    const response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: requestedModel,
        messages: [{ role: 'user', content: prompt }],
        usage: { include: true },
      }),
      signal: controller.signal,
    });

    const latencyMs = Date.now() - startedAt;
    const body = await response.json().catch(() => null);

    if (!response.ok || !body) {
      const errorMessage = body?.error?.message || `OpenRouter returned HTTP ${response.status}`;
      await logModelCall({
        requestedModel,
        model: null,
        inputTokens: null,
        outputTokens: null,
        cost: null,
        latencyMs,
        status: 'error',
        errorMessage,
      });
      return failure(FAILURE_REASONS.MODEL_CALL_FAILED, errorMessage);
    }

    const content = body.choices?.[0]?.message?.content ?? null;
    const usage = body.usage ?? {};
    const inputTokens = usage.prompt_tokens ?? null;
    const outputTokens = usage.completion_tokens ?? null;
    const cost = usage.cost ?? null;
    const model = body.model ?? requestedModel;

    await logModelCall({
      requestedModel,
      model,
      inputTokens,
      outputTokens,
      cost,
      latencyMs,
      status: 'success',
      errorMessage: null,
    });

    if (content === null) {
      return failure(FAILURE_REASONS.NOT_JSON, 'Model response had no content.');
    }

    return { ok: true, content, model, inputTokens, outputTokens, cost, latencyMs };
  } catch (err) {
    const latencyMs = Date.now() - startedAt;
    const isTimeout = err.name === 'AbortError';

    await logModelCall({
      requestedModel,
      model: null,
      inputTokens: null,
      outputTokens: null,
      cost: null,
      latencyMs,
      status: isTimeout ? 'timeout' : 'error',
      errorMessage: err.message,
    });

    if (isTimeout) {
      return failure(FAILURE_REASONS.MODEL_TIMEOUT, 'The model did not respond in time.');
    }
    return failure(FAILURE_REASONS.MODEL_CALL_FAILED, err.message);
  } finally {
    clearTimeout(timeoutId);
  }
}
