/**
 * Display helpers for AI connections on Settings → AI Assistant.
 * Provider names, models and key formats come from the server catalog (GET /ai/settings);
 * this file only adds visuals and status wording.
 */

// Neutral monogram badges (no vendor logos).
const PROVIDER_STYLE = {
  anthropic: { initials: 'A', className: 'bg-amber-100 text-amber-800 ring-amber-200' },
  openai: { initials: 'O', className: 'bg-emerald-100 text-emerald-800 ring-emerald-200' },
  gemini: { initials: 'G', className: 'bg-sky-100 text-sky-800 ring-sky-200' },
  deepseek: { initials: 'D', className: 'bg-indigo-100 text-indigo-800 ring-indigo-200' },
};

export function providerStyle(id) {
  return PROVIDER_STYLE[id] || { initials: '?', className: 'bg-slate-100 text-slate-700 ring-slate-200' };
}

/** last_status from the server → badge. */
const STATUS = {
  ok: { label: 'Working', tone: 'success', help: 'Last request succeeded.' },
  BILLING: { label: 'No credit', tone: 'danger', help: 'The provider account has run out of credit. Add credits on the provider’s billing page.' },
  INVALID_KEY: { label: 'Key rejected', tone: 'danger', help: 'The provider rejected this key. Replace it with an active key.' },
  NOT_CONFIGURED: { label: 'Key unreadable', tone: 'danger', help: 'The saved key can no longer be read. Replace the key.' },
  MODEL_UNAVAILABLE: { label: 'Model unavailable', tone: 'warning', help: 'This key cannot use the selected model. Choose another model.' },
  RATE_LIMITED: { label: 'Rate limited', tone: 'warning', help: 'The provider is limiting requests. It is retried automatically.' },
  UNAVAILABLE: { label: 'Provider issue', tone: 'warning', help: 'The provider was unavailable. It is retried automatically.' },
  TIMEOUT: { label: 'Timed out', tone: 'warning', help: 'The provider took too long. It is retried automatically.' },
  BAD_REQUEST: { label: 'Provider issue', tone: 'warning', help: 'The provider could not process a request. It is retried automatically.' },
};

export function connectionStatus(connection) {
  if (!connection.enabled) return { label: 'Off', tone: 'neutral', help: 'Switched off — never used.' };
  if (!connection.last_status) return { label: 'Not tested', tone: 'neutral', help: 'Use Test to check this connection.' };
  return STATUS[connection.last_status] || { label: 'Provider issue', tone: 'warning', help: 'The last request failed.' };
}

export const isFailing = (connection) => Boolean(connection.last_status) && connection.last_status !== 'ok';

/** Role of each connection in the failover chain: Primary, Backup 1, Backup 2 … */
export function connectionRoles(connections) {
  let n = 0;
  return connections.map((c) => {
    if (!c.enabled) return null;
    n += 1;
    return n === 1 ? 'Primary' : `Backup ${n - 1}`;
  });
}

export const EFFORT_HELP = {
  low: 'Fastest and cheapest; fine for simple lookups.',
  medium: 'Recommended balance of accuracy, speed and cost.',
  high: 'Most thorough reasoning; slower and costs more.',
};

export function relativeTime(value) {
  if (!value) return null;
  const t = new Date(String(value).replace(' ', 'T')).getTime();
  if (Number.isNaN(t)) return null;
  const mins = Math.round((Date.now() - t) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  return days < 30 ? `${days} d ago` : new Date(t).toLocaleDateString('en-IN');
}
