/** Value formatting shared by AI table / KPI / chart blocks. */

const moneyFmt = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 });
const numberFmt = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 });

export function formatValue(value, type) {
  if (value === null || value === undefined || value === '') return '—';
  if (type === 'money') {
    const n = Number(value);
    return Number.isFinite(n) ? moneyFmt.format(n) : String(value);
  }
  if (type === 'number') {
    const n = Number(value);
    return Number.isFinite(n) ? numberFmt.format(n) : String(value);
  }
  if (type === 'date') {
    const m = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return String(value);
    const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }
  return String(value);
}

const STATUS_TONES = [
  [/overdue|absent|cancel|not marked|^cr$/i, 'bg-red-50 text-red-700 border-red-200'],
  [/complete|present|^dr$|billed/i, 'bg-emerald-50 text-emerald-700 border-emerald-200'],
  [/pending|leave|half/i, 'bg-amber-50 text-amber-800 border-amber-200'],
  [/process/i, 'bg-indigo-50 text-indigo-700 border-indigo-200'],
];

export function statusTone(value) {
  const text = String(value || '');
  for (const [re, cls] of STATUS_TONES) if (re.test(text)) return cls;
  return 'bg-slate-50 text-slate-600 border-slate-200';
}

/** Fill an in-app link template like "/task/{task_id}" from a row; only relative paths. */
export function buildHref(template, row) {
  if (!template || !template.startsWith('/') || template.startsWith('//')) return null;
  let missing = false;
  const href = template.replace(/\{([a-z_]+)\}/g, (_, key) => {
    const v = row?.[key];
    if (v === null || v === undefined || v === '') missing = true;
    return encodeURIComponent(String(v ?? ''));
  });
  return missing ? null : href;
}
