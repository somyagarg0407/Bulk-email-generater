// Single place for all HTTP calls. Components never call fetch directly.
const BASE = import.meta.env.VITE_API_URL || '/api';
const TOKEN_KEY = 'nitd_token';

let token = sessionStorage.getItem(TOKEN_KEY);
export const getToken = () => token;
export function setToken(t) {
  token = t;
  if (t) sessionStorage.setItem(TOKEN_KEY, t); else sessionStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  constructor(message, status, details, code) { super(message); this.status = status; this.details = details; this.code = code; }
}

const qs = (query = {}) => {
  const p = new URLSearchParams();
  Object.entries(query).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') p.set(k, v); });
  const s = p.toString();
  return s ? `?${s}` : '';
};

async function request(method, path, { body, query, raw } = {}) {
  let res;
  try {
    res = await fetch(`${BASE}${path}${qs(query)}`, {
      method,
      headers: { ...(body !== undefined && { 'Content-Type': 'application/json' }), ...(token && { Authorization: `Bearer ${token}` }) },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError('Cannot reach the server. Check your connection and try again.', 0);
  }
  if (!res.ok) {
    let payload = null;
    try { payload = await res.json(); } catch { /* non-JSON error */ }
    if (res.status === 401 && path !== '/auth/login') {
      setToken(null);
      window.dispatchEvent(new Event('auth:expired'));
    }
    const fallback = res.status === 401 ? 'Unauthorized.' : res.status === 403 ? 'You do not have permission to do that.' : 'Something went wrong. Please try again.';
    if (res.status === 403 && payload?.error?.code === 'PASSWORD_CHANGE_REQUIRED') window.dispatchEvent(new Event('auth:password-required'));
    throw new ApiError(payload?.error?.message || fallback, res.status, payload?.error?.details, payload?.error?.code);
  }
  return raw ? res : res.json();
}

const get = (path, query) => request('GET', path, { query });
const post = (path, body, query) => request('POST', path, { body, query });
const put = (path, body) => request('PUT', path, { body });
const patch = (path, body) => request('PATCH', path, { body });
const del = (path) => request('DELETE', path);

async function download(method, path, { body, query }) {
  const res = await request(method, path, { body, query, raw: true });
  const blob = await res.blob();
  const m = /filename="([^"]+)"/.exec(res.headers.get('Content-Disposition') || '');
  const name = m?.[1] || 'recipients.csv';
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return name;
}

export const api = {
  auth: {
    login: (email, password) => post('/auth/login', { email, password }),
    me: () => get('/auth/me'),
    changePassword: (currentPassword, newPassword) => post('/auth/change-password', { currentPassword, newPassword }),
  },
  config: {
    batches: () => get('/batches'),
    branches: () => get('/branches'),
    rules: () => get('/roll-rules'),
    settings: () => get('/settings'),
  },
  recipients: {
    // Backend does ALL roll-number generation. `view` = { q, sort, order, page, limit, audit }.
    preview: (spec, view = {}) => post('/recipients/preview', { ...spec, ...view }),
    copyText: (spec, format) => post('/recipients/export', spec, { format, inline: 1 }),
    download: (spec, format) => download('POST', '/recipients/export', { body: spec, query: { format } }),
  },
  lists: {
    create: (payload) => post('/campaigns', payload),
    list: (query) => get('/campaigns', query),
    get: (id) => get(`/campaigns/${id}`),
    update: (id, payload) => put(`/campaigns/${id}`, payload),
    remove: (id) => del(`/campaigns/${id}`),
    recipients: (id, query) => get(`/campaigns/${id}/recipients`, query),
    copyText: (id, format) => get(`/campaigns/${id}/export`, { format, inline: 1 }),
    download: (id, format) => download('GET', `/campaigns/${id}/export`, { query: { format } }),
  },
  dashboard: () => get('/dashboard'),
  users: {
    list: () => get('/users'),
    create: (payload) => post('/auth/register', payload),
    update: (id, payload) => patch(`/users/${id}`, payload),
  },
  clubs: { list: () => get('/clubs'), create: (name) => post('/clubs', { name }) },
  admin: {
    createBatch: (p) => post('/admin/batches', p),
    updateBatch: (id, p) => put(`/admin/batches/${id}`, p),
    createBranch: (p) => post('/admin/branches', p),
    updateBranch: (id, p) => put(`/admin/branches/${id}`, p),
    createRule: (p) => post('/admin/roll-rules', p),
    updateRule: (id, p) => put(`/admin/roll-rules/${id}`, p),
    deleteRule: (id) => del(`/admin/roll-rules/${id}`),
    updateSettings: (p) => put('/admin/settings', p),
    auditLogs: (limit) => get('/admin/audit-logs', { limit }),
  },
};
