const BASE = import.meta.env.VITE_API_BASE || '';

async function request(path, options = {}) {
  const res = await fetch(BASE + path, { headers: { 'Content-Type': 'application/json' }, ...options });
  if (!res.ok) {
    let body = null;
    try { body = await res.json(); } catch { /* not json */ }
    const err = new Error(body?.message || `${res.status} ${res.statusText}`);
    err.status = res.status;
    err.errors = body?.errors;
    throw err;
  }
  if (res.status === 204) return null;
  return (res.headers.get('content-type') || '').includes('json') ? res.json() : res.text();
}
const json = (method, body) => ({ method, body: JSON.stringify(body) });

export const api = {
  dashboard: () => request('/api/dashboard'),
  scenarios: () => request('/api/scenarios'),
  policy: (no) => request(`/api/policies/${encodeURIComponent(no)}`),
  flights: () => request('/api/flights'),
  updateFlight: (id, body) => request(`/api/flights/${id}`, json('PUT', body)),
  claims: () => request('/api/claims'),
  claim: (id) => request(`/api/claims/${id}`),
  tracker: (id) => request(`/api/claims/${id}/tracker`),
  submitClaim: (body) => request('/api/claims', json('POST', body)),
  tasks: (group) => request(`/api/tasks?state=CREATED${group ? `&group=${group}` : ''}`),
  assignTask: (key, assignee) => request(`/api/tasks/${key}/assign`, json('POST', { assignee })),
  completeTask: (key, variables, assignee) => request(`/api/tasks/${key}/complete`, json('POST', { variables, assignee })),
  model: (id) => request(`/api/models/${id}`),
};
