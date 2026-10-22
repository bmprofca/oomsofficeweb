import API_BASE_URL from '../utils/api-controller';
import getHeaders from '../utils/get-headers';
import { handleUnauthorizedResponse } from '../utils/auth-session';

const endpoint = `${API_BASE_URL}/executive-summary`;

async function request(path = '', options = {}) {
  const response = await fetch(`${endpoint}${path}`, {
    ...options,
    headers: { ...(getHeaders() || {}), ...(options.headers || {}) },
  });
  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json') ? await response.json() : await response.blob();
  if (!response.ok) {
    if (response.status === 401) handleUnauthorizedResponse();
    const error = new Error(payload?.message || 'Executive Summary request failed');
    error.status = response.status;
    error.code = payload?.code;
    throw error;
  }
  return payload;
}

const queryString = (params = {}) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') query.set(key, Array.isArray(value) ? value.join(',') : String(value));
  });
  const value = query.toString();
  return value ? `?${value}` : '';
};

const service = {
  getConfig: () => request('/config'),
  updateConfig: (payload) => request('/config', { method: 'PUT', body: JSON.stringify(payload) }),
  getSummary: (params) => request(queryString(params)),
  downloadPdf: (params) => request(`/pdf${queryString(params)}`),
  sendNow: (payload) => request('/send', { method: 'POST', body: JSON.stringify(payload) }),
  getRuns: (params) => request(`/runs${queryString(params)}`),
  downloadRunPdf: (runId) => request(`/runs/${encodeURIComponent(runId)}/pdf`),
};

export default service;
