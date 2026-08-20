async function apiFetch(path, options) {
  try {
    const res = await fetch(path, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
    return await res.json();
  } catch (err) {
    return { ok: false, reason: 'network_error', message: err.message || 'Network request failed.' };
  }
}

export function getProfile() {
  return apiFetch('/api/profile');
}

export function saveProfile(payload) {
  return apiFetch('/api/profile', { method: 'PUT', body: JSON.stringify(payload) });
}

export function submitAd(adText, metadata) {
  return apiFetch('/api/analyses', { method: 'POST', body: JSON.stringify({ adText, ...metadata }) });
}

export function getAnalyses() {
  return apiFetch('/api/analyses');
}

export function getAnalysis(id) {
  return apiFetch(`/api/analyses/${id}`);
}

export function deleteAnalysis(id) {
  return apiFetch(`/api/analyses/${id}`, { method: 'DELETE' });
}

export function recalculateAnalysis(id) {
  return apiFetch(`/api/analyses/${id}/recalculate`, { method: 'POST' });
}

export function recalculateAllAnalyses() {
  return apiFetch('/api/analyses/recalculate-all', { method: 'POST' });
}
