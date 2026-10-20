import axios from 'axios';
import API_BASE_URL from './api-controller';
import getHeaders from './get-headers';

/**
 * AI assistant API client. Chat uses fetch + a streamed (SSE) response so tool
 * progress can be shown; 401 / subscription 403 responses are still handled by the
 * global fetch wrapper in src/index.js because the server rejects those before streaming.
 */

const ERROR_MESSAGES = {
  AI_RATE_LIMITED: 'You are asking too quickly. Please wait a moment and try again.',
  AI_DISABLED: 'The AI assistant is not enabled for this office. A branch admin can turn it on in Settings → AI Assistant.',
  AI_NOT_CONFIGURED: 'The AI assistant is not configured yet. Please contact your administrator.',
  NETWORK: 'Network problem — check your connection and try again.',
};

// Retrying won't help: a branch admin must fix it (Settings → AI Assistant), or the user is paused.
const NOT_RETRYABLE = new Set(['AI_NOT_CONFIGURED', 'AI_NO_CREDIT', 'AI_INVALID_KEY', 'AI_MODEL_UNAVAILABLE', 'AI_ALL_CONNECTIONS_FAILED', 'AI_SAFETY_PAUSED']);

export class AiChatError extends Error {
  constructor(code, message, { retryable = true, conversationId = null } = {}) {
    super(message);
    this.code = code;
    this.retryable = retryable;
    this.conversationId = conversationId;
  }
}

/** Parse one SSE frame ("event: x\ndata: {...}") into { event, data }. */
export function parseSseFrame(frame) {
  let event = 'message';
  const dataLines = [];
  for (const line of frame.split('\n')) {
    if (line.startsWith('event:')) event = line.slice(6).trim();
    else if (line.startsWith('data:')) dataLines.push(line.slice(5).trimStart());
  }
  if (!dataLines.length) return null;
  try {
    return { event, data: JSON.parse(dataLines.join('\n')) };
  } catch (_) {
    return null;
  }
}

/**
 * Send a chat message. Calls onEvent({event, data}) for meta / status / block / text / done.
 * Resolves when the stream ends; rejects with AiChatError on failure.
 */
export async function streamChat({ message, conversationId, signal, onEvent }) {
  const headers = getHeaders();
  if (!headers) throw new AiChatError('SESSION', 'Your session has expired. Please log in again.', { retryable: false });

  let response;
  try {
    response = await fetch(`${API_BASE_URL}/ai/chat`, {
      method: 'POST',
      headers: { ...headers, Accept: 'text/event-stream' },
      body: JSON.stringify({ message, conversation_id: conversationId || undefined }),
      signal,
    });
  } catch (err) {
    if (err?.name === 'AbortError') throw err;
    throw new AiChatError('NETWORK', ERROR_MESSAGES.NETWORK);
  }

  if (!response.ok) {
    let body = {};
    try {
      body = await response.json();
    } catch (_) {
      body = {};
    }
    const code = body.code || (response.status === 401 ? 'SESSION' : `HTTP_${response.status}`);
    const msg = ERROR_MESSAGES[code] || body.message || 'Something went wrong. Please try again.';
    throw new AiChatError(code, msg, { retryable: response.status !== 401 && response.status !== 404 && !NOT_RETRYABLE.has(code) });
  }

  const reader = response.body?.getReader?.();
  if (!reader) throw new AiChatError('NETWORK', ERROR_MESSAGES.NETWORK);
  const decoder = new TextDecoder();
  let buffer = '';
  let finished = false;

  try {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let idx;
      while ((idx = buffer.indexOf('\n\n')) !== -1) {
        const frame = parseSseFrame(buffer.slice(0, idx));
        buffer = buffer.slice(idx + 2);
        if (!frame) continue;
        if (frame.event === 'error') {
          throw new AiChatError(frame.data?.code || 'AI_ERROR', frame.data?.message || 'Something went wrong.', {
            conversationId: frame.data?.conversation_id || null,
            retryable: !NOT_RETRYABLE.has(frame.data?.code),
          });
        }
        if (frame.event === 'done') finished = true;
        onEvent(frame);
      }
    }
  } catch (err) {
    if (err instanceof AiChatError || err?.name === 'AbortError') throw err;
    throw new AiChatError('NETWORK', ERROR_MESSAGES.NETWORK);
  }

  if (!finished) throw new AiChatError('NETWORK', 'The answer was interrupted. Please try again.');
}

export async function listAiConversations(page = 1) {
  const res = await axios.get(`${API_BASE_URL}/ai/conversations`, { headers: getHeaders(), params: { page } });
  return res.data?.data || [];
}

export async function getAiConversation(conversationId) {
  const res = await axios.get(`${API_BASE_URL}/ai/conversations/${encodeURIComponent(conversationId)}`, { headers: getHeaders() });
  return res.data?.data || null;
}

export async function deleteAiConversation(conversationId) {
  await axios.delete(`${API_BASE_URL}/ai/conversations/${encodeURIComponent(conversationId)}`, { headers: getHeaders() });
}

/* ------------------------- branch status & admin settings ------------------------- */

export const AI_SETTINGS_EVENT = 'ooms:ai-settings-updated';
const statusCache = new Map(); // `${user}:${branch}` -> { at, promise }
const STATUS_TTL_MS = 60 * 1000;

function statusKey() {
  return `${localStorage.getItem('user_username') || ''}:${localStorage.getItem('branch_id') || ''}`;
}

/** { enabled, configured, can_manage } for the current branch; cached for a minute. */
export function getAiStatus({ force = false } = {}) {
  const key = statusKey();
  const hit = statusCache.get(key);
  if (!force && hit && Date.now() - hit.at < STATUS_TTL_MS) return hit.promise;
  const headers = getHeaders();
  if (!headers) return Promise.resolve({ enabled: false, configured: false, can_manage: false });
  const promise = axios
    .get(`${API_BASE_URL}/ai/status`, { headers })
    .then((res) => res.data?.data || { enabled: false, configured: false, can_manage: false })
    .catch(() => {
      statusCache.delete(key);
      return { enabled: false, configured: false, can_manage: false };
    });
  statusCache.set(key, { at: Date.now(), promise });
  return promise;
}

export function invalidateAiStatus() {
  statusCache.clear();
  window.dispatchEvent(new Event(AI_SETTINGS_EVENT));
}

export async function getAiSettings() {
  const res = await axios.get(`${API_BASE_URL}/ai/settings`, { headers: getHeaders() });
  return res.data?.data;
}

/**
 * Branch switch, rate limits and (optionally) access mode. Switching to read_write must send
 * acknowledge_write: true (after the confirmation dialog). Returns the full settings payload.
 */
export async function saveAiSettings({ enabled, rate_per_min, rate_per_day, access_mode, acknowledge_write }) {
  const body = { enabled, rate_per_min, rate_per_day };
  if (access_mode) body.access_mode = access_mode;
  if (acknowledge_write) body.acknowledge_write = true;
  const res = await axios.put(`${API_BASE_URL}/ai/settings`, body, { headers: getHeaders() });
  invalidateAiStatus();
  return res.data?.data;
}

/** Test an unsaved provider + key + model (no credit is used beyond one tiny request). */
export async function testAiConnection({ provider, apiKey, model, effort } = {}) {
  const res = await axios.post(
    `${API_BASE_URL}/ai/settings/test`,
    { provider, api_key: apiKey, model, ...(effort ? { effort } : {}) },
    { headers: getHeaders() }
  );
  return res.data?.data;
}

/* AI connections: several keys/providers per branch, used in priority order with failover. */

export async function createAiConnection({ label, provider, model, effort, apiKey, enabled = true }) {
  const res = await axios.post(
    `${API_BASE_URL}/ai/connections`,
    { ...(label ? { label } : {}), provider, model, effort, api_key: apiKey, enabled },
    { headers: getHeaders() }
  );
  invalidateAiStatus();
  return res.data?.data;
}

/** Partial update: label, model, effort, enabled, or a new key (required when the provider changes). */
export async function updateAiConnection(id, { apiKey, ...patch }) {
  const res = await axios.patch(
    `${API_BASE_URL}/ai/connections/${encodeURIComponent(id)}`,
    { ...patch, ...(apiKey ? { api_key: apiKey } : {}) },
    { headers: getHeaders() }
  );
  invalidateAiStatus();
  return res.data?.data;
}

export async function deleteAiConnection(id) {
  const res = await axios.delete(`${API_BASE_URL}/ai/connections/${encodeURIComponent(id)}`, { headers: getHeaders() });
  invalidateAiStatus();
  return res.data?.data;
}

export async function reorderAiConnections(ids) {
  const res = await axios.put(`${API_BASE_URL}/ai/connections/order`, { ids }, { headers: getHeaders() });
  return res.data?.data;
}

/** Test a saved connection with its stored key; the result is recorded as its status. */
export async function testSavedAiConnection(id) {
  const res = await axios.post(`${API_BASE_URL}/ai/connections/${encodeURIComponent(id)}/test`, {}, { headers: getHeaders() });
  return res.data?.data;
}

/* Remote MCP connectors (Claude → Settings → Connectors → Add custom connector). */

export async function getMcpConnectors() {
  const res = await axios.get(`${API_BASE_URL}/ai/mcp-connectors`, { headers: getHeaders() });
  return res.data?.data;
}

/** Returns `{ url, ...list }` — the secret URL is only ever returned here and by rotate. */
export async function createMcpConnector({ label, runAs, accessMode, acknowledgeWrite }) {
  const body = { ...(label ? { label } : {}), run_as: runAs };
  if (accessMode) body.access_mode = accessMode;
  if (acknowledgeWrite) body.acknowledge_write = true;
  const res = await axios.post(`${API_BASE_URL}/ai/mcp-connectors`, body, { headers: getHeaders() });
  return res.data?.data;
}

export async function updateMcpConnector(id, { label, enabled, runAs, accessMode, acknowledgeWrite }) {
  const body = {};
  if (accessMode !== undefined) body.access_mode = accessMode;
  if (acknowledgeWrite) body.acknowledge_write = true;
  if (label !== undefined) body.label = label;
  if (enabled !== undefined) body.enabled = enabled;
  if (runAs !== undefined) body.run_as = runAs;
  const res = await axios.patch(`${API_BASE_URL}/ai/mcp-connectors/${encodeURIComponent(id)}`, body, { headers: getHeaders() });
  return res.data?.data;
}

export async function rotateMcpConnector(id) {
  const res = await axios.post(`${API_BASE_URL}/ai/mcp-connectors/${encodeURIComponent(id)}/rotate`, {}, { headers: getHeaders() });
  return res.data?.data;
}

export async function deleteMcpConnector(id) {
  const res = await axios.delete(`${API_BASE_URL}/ai/mcp-connectors/${encodeURIComponent(id)}`, { headers: getHeaders() });
  return res.data?.data;
}

/* Write actions proposed by the assistant in read-write mode. Nothing is sent until confirmed. */

export async function confirmAiAction(id) {
  const res = await axios.post(`${API_BASE_URL}/ai/actions/${encodeURIComponent(id)}/confirm`, {}, { headers: getHeaders() });
  return res.data?.data;
}

export async function cancelAiAction(id) {
  const res = await axios.post(`${API_BASE_URL}/ai/actions/${encodeURIComponent(id)}/cancel`, {}, { headers: getHeaders() });
  return res.data?.data;
}
