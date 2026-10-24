import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FiActivity, FiAlertCircle, FiBarChart2, FiCalendar, FiCheck, FiCheckCircle, FiChevronDown, FiClock, FiCreditCard, FiDollarSign, FiDownload, FiFileText, FiList, FiMail, FiPieChart, FiPlus, FiPlusCircle, FiRefreshCw, FiSave, FiSearch, FiSettings, FiTrash2, FiUsers } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Header, Sidebar } from '../components/header';
import { DatePickerField } from '../components/PortalDatePicker';
import { resolveBranchRole } from '../services/branchSetupService';
import executiveSummaryService from '../services/executiveSummaryService';

const SECTION_LABELS = {
  tasks_completed: 'Staff-wise completed tasks', new_tasks: 'New tasks', sales: 'Sales',
  collections: 'Collections from debtors', expenses: 'Expenses', unpaid_debtors: 'Unpaid debtors',
  due_tasks: 'Due tasks', clients_without_service: 'Clients without recent service',
};

// Must match MAX_RECIPIENT_EMAILS in SERVER services/executiveSummaryService.js.
const MAX_RECIPIENT_EMAILS = 5;
// Same normalisation the server applies before counting (trim, lowercase, de-duplicate).
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const uniqueRecipients = (value) => [...new Set((Array.isArray(value) ? value : String(value || '').split(/[,;\s]+/)).map((email) => String(email || '').trim().toLowerCase()).filter(Boolean))];
const shiftDays = (value, days) => { const date = new Date(`${value}T00:00:00Z`); date.setUTCDate(date.getUTCDate() + days); return date.toISOString().slice(0, 10); };
const previousPeriod = (preset) => {
  const now = new Date();
  if (preset === 'previous_month') {
    const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0));
    return { from_date: new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 1)).toISOString().slice(0, 10), to_date: end.toISOString().slice(0, 10) };
  }
  const weekday = now.getUTCDay();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - ((weekday + 6) % 7) - 7));
  return { from_date: start.toISOString().slice(0, 10), to_date: shiftDays(start.toISOString().slice(0, 10), 6) };
};

function isAdmin() {
  try {
    const branchId = localStorage.getItem('branch_id');
    const branches = JSON.parse(localStorage.getItem('user_branches') || '[]');
    const branch = Array.isArray(branches) && branches.find((item) => String(item.branch_id || item.id) === String(branchId));
    if (branch) return resolveBranchRole(branch) === 'admin';
  } catch (error) {
    console.error('Failed to resolve Executive Summary branch role', error);
  }
  const role = String(localStorage.getItem('branch_role') || '').trim().toLowerCase();
  return localStorage.getItem('branch_owned') === 'true' || role === 'admin' || role === 'owner';
}

const money = (value) => Number(value || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 });
const number = (value) => Number(value || 0).toLocaleString('en-IN');
const digitsOnly = (value) => value.replace(/\D/g, '');
const CHART_COLORS = ['#4f46e5', '#0f766e', '#ea580c', '#c026d3', '#0891b2', '#ca8a04', '#be123c', '#7c3aed'];
const formatCompactCurrency = (value) => {
  const amount = Number(value) || 0;
  if (Math.abs(amount) >= 10000000) return `₹${(amount / 10000000).toFixed(1)}Cr`;
  if (Math.abs(amount) >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
  if (Math.abs(amount) >= 1000) return `₹${(amount / 1000).toFixed(1)}k`;
  return `₹${number(amount)}`;
};

function ChartTooltip({ active, payload, label, currency = false }) {
  if (!active || !payload?.length) return null;
  const rows = payload.filter((item) => Number(item.value) !== 0);
  if (!rows.length) return null;
  return <div className="min-w-44 rounded-xl border border-slate-200 bg-white/95 p-3 shadow-xl backdrop-blur">
    {label && <p className="mb-2 max-w-56 truncate text-xs font-semibold text-slate-800">{label}</p>}
    <div className="space-y-1.5">
      {rows.map((item) => <div key={item.dataKey} className="flex items-center justify-between gap-5 text-xs">
        <span className="flex min-w-0 items-center gap-2 text-slate-500"><span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: item.color || item.payload?.fill }} /><span className="truncate">{item.name}</span></span>
        <span className="shrink-0 font-semibold tabular-nums text-slate-800">{currency ? money(item.value) : number(item.value)}</span>
      </div>)}
    </div>
  </div>;
}

function mergeStaffMetrics(sections, metrics) {
  const rows = new Map();
  metrics.forEach(([sectionKey, sourceKey, targetKey]) => {
    (sections?.[sectionKey]?.rows || []).forEach((source) => {
      const key = source.username || source.staff_username || source.staff_name || 'unassigned';
      const row = rows.get(key) || { staff_name: source.staff_name || 'Unassigned' };
      row[targetKey] = (row[targetKey] || 0) + (sourceKey ? Number(source[sourceKey]) || 0 : 1);
      rows.set(key, row);
    });
  });
  return [...rows.values()];
}

function chartTopRows(rows, keys) {
  const sorted = [...rows].sort((first, second) =>
    keys.reduce((total, key) => total + (second[key] || 0) - (first[key] || 0), 0)
  );
  if (sorted.length <= 10) return sorted;
  const remaining = sorted.slice(9);
  return [
    ...sorted.slice(0, 9),
    {
      staff_name: `Others (${remaining.length})`,
      ...Object.fromEntries(keys.map((key) => [key, remaining.reduce((sum, row) => sum + (row[key] || 0), 0)])),
    },
  ];
}

function SectionTable({ sectionKey, section }) {
  const rows = section?.rows || [];
  if (!rows.length) return <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">No records for this period.</div>;
  const columns = {
    tasks_completed: [['staff_name', 'Staff details'], ['completed_count', 'Completed']],
    new_tasks: [['staff_name', 'Staff'], ['new_task_count', 'New tasks']],
    sales: [['staff_name', 'Staff'], ['sale_count', 'Sales'], ['sale_amount', 'Amount']],
    collections: [['staff_name', 'Staff'], ['collection_count', 'Receipts'], ['collection_amount', 'Amount']],
    expenses: [['staff_name', 'Staff'], ['expense_count', 'Entries'], ['expense_amount', 'Amount']],
    unpaid_debtors: [['client_name', 'Client'], ['outstanding_amount', 'Outstanding'], ['last_payment_date', 'Last payment'], ['days_since_payment', 'Days']],
    due_tasks: [['task_id', 'Task'], ['staff_name', 'Staff'], ['due_date', 'Due date'], ['status', 'Status'], ['days_overdue', 'Overdue days']],
    clients_without_service: [['client_name', 'Client'], ['last_service_date', 'Last service']],
  }[sectionKey] || [];
  const cell = (key, value) => key.includes('amount') ? money(value) : key === 'last_payment_date' || key === 'last_service_date' || key === 'due_date' ? (value ? String(value).slice(0, 10) : 'No service recorded') : number(value) && (key.includes('count') || key.includes('days')) ? number(value) : String(value ?? '—');
  const renderCell = (key, row) => {
    if (sectionKey === 'tasks_completed' && key === 'staff_name') {
      return <div><p className="font-medium text-slate-800">{row.staff_name}</p><p className="mt-0.5 text-xs text-slate-500">{[row.designation, row.username && `Username: ${row.username}`].filter(Boolean).join(' · ') || 'Staff details unavailable'}</p></div>;
    }
    return cell(key, row[key]);
  };
  return <div className="overflow-x-auto rounded-lg border border-slate-200"><table className="min-w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr>{columns.map(([, label]) => <th key={label} className="px-4 py-3 font-semibold">{label}</th>)}</tr></thead><tbody className="divide-y divide-slate-100 bg-white">{rows.map((row, index) => <tr key={row.username || row.task_id || `${sectionKey}-${index}`} className="hover:bg-slate-50">{columns.map(([key]) => <td key={key} className="px-4 py-3 text-slate-700">{renderCell(key, row)}</td>)}</tr>)}</tbody></table></div>;
}

// Same accent palette as the APP brand kit (src/shared/constants/colors.ts: stripes / accentBg / accentFg).
const ACCENTS = [
  { stripe: '#EEF4FF', bg: '#DBEAFE', fg: '#1552D4' },
  { stripe: '#E9F8F1', bg: '#D1FAE5', fg: '#047857' },
  { stripe: '#FFF6E5', bg: '#FEF3C7', fg: '#B45309' },
  { stripe: '#F3EEFF', bg: '#EDE9FE', fg: '#6D28D9' },
  { stripe: '#FDEFF6', bg: '#FCE7F3', fg: '#BE185D' },
  { stripe: '#E7F7F8', bg: '#CCFBF1', fg: '#0F766E' },
];
const accentAt = (index) => ACCENTS[index % ACCENTS.length];
const SECTION_ICONS = {
  tasks_completed: FiCheckCircle, new_tasks: FiPlusCircle, sales: FiDollarSign, collections: FiCreditCard,
  expenses: FiFileText, unpaid_debtors: FiUsers, due_tasks: FiClock, clients_without_service: FiAlertCircle,
};
const formatDateTime = (value) => {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) return value ? String(value) : 'Never';
  return date.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' });
};
const formatDateLabel = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))) return value || '';
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

function IconWell({ icon: Icon, accent = 0, size = 'h-10 w-10', iconSize = 18 }) {
  const a = accentAt(accent);
  return <span className={`flex ${size} shrink-0 items-center justify-center rounded-xl`} style={{ backgroundColor: a.bg, color: a.fg }}><Icon size={iconSize} /></span>;
}

function Card({ className = '', children }) {
  return <section className={`rounded-2xl border border-slate-200 bg-white shadow-sm ${className}`}>{children}</section>;
}

function CardHeader({ icon, accent = 0, title, subtitle, right }) {
  return <div className="flex items-start justify-between gap-3">
    <div className="flex min-w-0 items-center gap-3">
      <IconWell icon={icon} accent={accent} />
      <div className="min-w-0"><h2 className="text-base font-bold text-slate-900">{title}</h2>{subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}</div>
    </div>
    {right}
  </div>;
}

function SectionLabel({ children, right }) {
  return <div className="mb-2 mt-1 flex items-center justify-between"><h3 className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">{children}</h3>{right}</div>;
}

function FieldLabel({ children, htmlFor }) {
  return <label htmlFor={htmlFor} className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-500">{children}</label>;
}

/** Animated switch used in place of plain checkboxes. */
export function ToggleSwitch({ checked, onChange, label, disabled = false }) {
  return <button type="button" role="switch" aria-checked={!!checked} aria-label={label} disabled={disabled} onClick={() => onChange(!checked)}
    className={`group relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-300 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${checked ? 'bg-[#1552D4]' : 'bg-slate-300'}`}>
    <span className={`inline-block h-5 w-5 rounded-full bg-white shadow-md ring-0 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-active:w-6 ${checked ? 'translate-x-[22px] group-active:translate-x-[18px]' : 'translate-x-0.5'}`} />
  </button>;
}

function Segmented({ options, value, onChange, size = 'md' }) {
  return <div className="inline-flex w-full rounded-xl border border-slate-200 bg-slate-50 p-1">
    {options.map(([key, label, Icon]) => {
      const selected = value === key;
      return <button key={key} type="button" aria-pressed={selected} onClick={() => onChange(key)}
        className={`flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg font-semibold transition-all duration-200 ${size === 'sm' ? 'px-1.5 py-1.5 text-xs' : 'px-3 py-2 text-sm'} ${selected ? 'bg-[#1552D4] text-white shadow-sm' : 'text-slate-600 hover:bg-white hover:text-slate-900'}`}>
        {Icon && <Icon size={14} />}{label}
      </button>;
    })}
  </div>;
}

function KpiTile({ label, value, icon, accent }) {
  const a = accentAt(accent);
  return <div className="rounded-2xl border p-4 transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-md" style={{ backgroundColor: a.stripe, borderColor: a.bg }}>
    <div className="flex items-center gap-2"><IconWell icon={icon} accent={accent} size="h-8 w-8" iconSize={15} /><p className="truncate text-xs font-semibold text-slate-600">{label}</p></div>
    <p className="mt-3 truncate text-xl font-bold tabular-nums sm:text-2xl" style={{ color: a.fg }} title={value}>{value}</p>
  </div>;
}

export function ConfigurationPanel({ draft, config, saving, onSave, patchDraft, patchSection }) {
  // One input per recipient; blank rows are kept for editing but never sent.
  const [recipientRows, setRecipientRows] = useState(['']);
  useEffect(() => {
    if (!config) return;
    const saved = uniqueRecipients(config.recipient_emails).slice(0, MAX_RECIPIENT_EMAILS);
    setRecipientRows(saved.length ? saved : ['']);
  }, [config]);
  const setRecipients = (rows) => {
    setRecipientRows(rows);
    patchDraft('recipient_emails', rows.map((row) => row.trim()).filter(Boolean));
  };
  const recipientCount = draft ? uniqueRecipients(draft.recipient_emails).length : 0;
  const canAddRecipient = recipientRows.length < MAX_RECIPIENT_EMAILS;
  const recipientError = (index) => {
    const value = recipientRows[index].trim().toLowerCase();
    if (!value) return '';
    if (!EMAIL_PATTERN.test(value)) return 'Enter a valid email address';
    if (recipientRows.findIndex((row) => row.trim().toLowerCase() === value) !== index) return 'This email is already added';
    return '';
  };
  if (!draft) return <Card className="p-8"><p className="flex items-center justify-center gap-2 text-sm text-slate-500"><FiRefreshCw className="animate-spin" /> Loading settings…</p></Card>;
  const enabledSections = Object.keys(SECTION_LABELS).filter((key) => draft.sections?.[key]?.enabled !== false).length;

  return <div className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
    <div className="space-y-5">
      <Card className="p-5 sm:p-6">
        <CardHeader icon={FiMail} title="Automated email report" subtitle="Configure the delivery schedule, recipients, and report sections." />
        <div className={`mt-5 flex items-center justify-between gap-4 rounded-xl border px-4 py-3.5 transition-colors duration-300 ${draft.enabled ? 'border-blue-300 bg-blue-50' : 'border-slate-200 bg-slate-50'}`}>
          <div><p className="text-sm font-semibold text-slate-800">Enable scheduled reports</p><p className="mt-0.5 text-xs text-slate-500">Automatically email this summary on your selected schedule.</p></div>
          <ToggleSwitch checked={!!draft.enabled} onChange={(value) => patchDraft('enabled', value)} label="Enable scheduled reports" disabled={saving} />
        </div>
      </Card>

      <Card className="p-5 sm:p-6">
        <CardHeader icon={FiCalendar} accent={1} title="Schedule" subtitle="When the report is generated and emailed." />
        <div className="mt-5 space-y-4">
          <div><FieldLabel>Frequency</FieldLabel><Segmented options={[['weekly', 'Weekly', FiCalendar], ['monthly', 'Monthly', FiCalendar]]} value={draft.schedule_type} onChange={(value) => patchDraft('schedule_type', value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><FieldLabel htmlFor="es-hour">Hour (0-23)</FieldLabel><input id="es-hour" className="ui-input w-full" type="text" inputMode="numeric" pattern="[0-9]*" maxLength={2} value={draft.send_hour} onChange={(event) => patchDraft('send_hour', digitsOnly(event.target.value))} /></div>
            <div><FieldLabel htmlFor="es-minute">Minute (0-59)</FieldLabel><input id="es-minute" className="ui-input w-full" type="text" inputMode="numeric" pattern="[0-9]*" maxLength={2} value={draft.send_minute} onChange={(event) => patchDraft('send_minute', digitsOnly(event.target.value))} /></div>
          </div>
          <p className="flex items-center gap-1.5 text-xs text-slate-500"><FiClock /> Indian Standard Time (IST), 24-hour clock.</p>
          <div className="max-w-xs"><FieldLabel htmlFor="es-inactivity">Inactivity days</FieldLabel>
            <div className="relative"><input id="es-inactivity" className="ui-input w-full pr-12" type="text" inputMode="numeric" pattern="[0-9]*" value={draft.inactivity_days} onChange={(event) => patchDraft('inactivity_days', digitsOnly(event.target.value))} /><span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">days</span></div>
            <p className="mt-1.5 text-xs text-slate-500">Clients with no service in this many days are listed in the report.</p>
          </div>
        </div>
      </Card>

      <Card className="p-5 sm:p-6">
        <CardHeader icon={FiUsers} accent={3} title="Recipients" subtitle="Who receives the scheduled email." right={<span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">{recipientCount} / {MAX_RECIPIENT_EMAILS}</span>} />
        <div className="mt-5"><FieldLabel>Recipient emails</FieldLabel>
          <div className="space-y-2">
            {recipientRows.map((row, index) => {
              const rowError = recipientError(index);
              const canRemove = recipientRows.length > 1 || !!row;
              return <div key={index}>
                <div className="flex items-center gap-2">
                  <div className={`flex flex-1 items-center gap-2 rounded-xl border bg-white px-3 transition focus-within:ring-2 ${rowError ? 'border-red-400 focus-within:ring-red-100' : 'border-slate-300 focus-within:border-blue-400 focus-within:ring-blue-100'}`}>
                    <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${rowError ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-[#1552D4]'}`}>{index + 1}</span>
                    <input type="email" className="w-full border-0 bg-transparent py-2.5 text-sm text-slate-800 outline-none placeholder:text-slate-400" value={row} onChange={(event) => setRecipients(recipientRows.map((current, i) => (i === index ? event.target.value.replace(/\s/g, '') : current)))} placeholder={index ? 'another@example.com' : 'admin@example.com'} aria-label={`Recipient email ${index + 1}`} aria-invalid={!!rowError} />
                  </div>
                  {canRemove && <button type="button" onClick={() => setRecipients(recipientRows.length > 1 ? recipientRows.filter((_, i) => i !== index) : [''])} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-500 transition hover:bg-red-100" aria-label={`Remove recipient email ${index + 1}`} title="Remove"><FiTrash2 /></button>}
                </div>
                {rowError && <p className="mt-1 flex items-center gap-1 text-xs text-red-600"><FiAlertCircle /> {rowError}</p>}
              </div>;
            })}
          </div>
          <button type="button" onClick={() => canAddRecipient && setRecipients([...recipientRows, ''])} disabled={!canAddRecipient} className={`mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border-2 border-dashed px-3 py-2.5 text-sm font-semibold transition ${canAddRecipient ? 'border-blue-300 bg-blue-50/60 text-[#1552D4] hover:bg-blue-50' : 'cursor-not-allowed border-slate-200 text-slate-400'}`} aria-label="Add recipient email">
            {canAddRecipient ? <FiPlus /> : <FiCheck />} {canAddRecipient ? `Add email · ${MAX_RECIPIENT_EMAILS - recipientRows.length} more allowed` : `Maximum of ${MAX_RECIPIENT_EMAILS} recipients reached`}
          </button>
        </div>
      </Card>
    </div>

    <div className="space-y-5">
      <Card className="overflow-hidden">
        <div className="p-5 pb-3 sm:p-6 sm:pb-3"><CardHeader icon={FiList} accent={2} title="Included sections" subtitle="Choose which sections are included in scheduled email reports." right={<span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">{enabledSections} of {Object.keys(SECTION_LABELS).length} on</span>} /></div>
        <ul className="divide-y divide-slate-100">
          {Object.entries(SECTION_LABELS).map(([key, label], index) => {
            const on = draft.sections?.[key]?.enabled !== false;
            return <li key={key} className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-slate-50 sm:px-6">
              <IconWell icon={SECTION_ICONS[key] || FiList} accent={index} size="h-9 w-9" iconSize={16} />
              <span className={`flex-1 text-sm transition-colors ${on ? 'font-medium text-slate-800' : 'text-slate-400'}`}>{label}</span>
              <ToggleSwitch checked={on} onChange={(value) => patchSection(key, { enabled: value })} label={`Include ${label}`} />
            </li>;
          })}
        </ul>
      </Card>

      <Card className="p-5 sm:p-6">
        <button type="button" className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1552D4] px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#0F3FA8] disabled:cursor-not-allowed disabled:opacity-60" onClick={onSave} disabled={saving}>{saving ? <FiRefreshCw className="animate-spin" /> : <FiSave />} {saving ? 'Saving…' : 'Save automation settings'}</button>
        <div className="mt-4 space-y-2 rounded-xl bg-slate-50 p-3 text-xs">
          <p className="flex items-center justify-between gap-3"><span className="flex items-center gap-1.5 text-slate-500">{config?.last_success_at ? <FiCheckCircle className="text-emerald-600" /> : <FiClock />} Last success</span><span className="font-semibold text-slate-800">{config?.last_success_at ? formatDateTime(config.last_success_at) : 'Never'}</span></p>
          <p className="flex items-start justify-between gap-3"><span className="flex items-center gap-1.5 text-slate-500"><FiAlertCircle className={config?.last_error ? 'text-red-500' : ''} /> Last error</span><span className={`text-right font-semibold ${config?.last_error ? 'text-red-600' : 'text-slate-800'}`}>{config?.last_error || 'None'}</span></p>
        </div>
      </Card>
    </div>
  </div>;
}

function ChartCard({ icon, accent, title, subtitle, badge, legend, children, className = '' }) {
  const a = accentAt(accent);
  return <Card className={`min-w-0 overflow-hidden p-4 transition-shadow hover:shadow-md sm:p-5 ${className}`}>
    <CardHeader icon={icon} accent={accent} title={title} subtitle={subtitle} right={badge && <span className="shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide" style={{ backgroundColor: a.stripe, color: a.fg }}>{badge}</span>} />
    {legend && <div className="mt-4 flex flex-wrap gap-2">{legend.map(([label, color]) => <span key={label} className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-600"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />{label}</span>)}</div>}
    {children}
  </Card>;
}

export default function ExecutiveSummary() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [config, setConfig] = useState(null);
  const [draft, setDraft] = useState(null);
  const [report, setReport] = useState(null);
  const [collapsedSections, setCollapsedSections] = useState(() => new Set(Object.keys(SECTION_LABELS)));
  const [activeTab, setActiveTab] = useState('report');
  const [preset, setPreset] = useState('previous_month');
  const [filters, setFilters] = useState(() => ({ ...previousPeriod('previous_month'), inactivity_days: 30, staff_username: '', search: '' }));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const actionInProgressRef = useRef(false);
  const [error, setError] = useState(null);
  const admin = useMemo(isAdmin, []);

  const load = useCallback(async (nextFilters = filters) => {
    setLoading(true); setError(null);
    try {
      const [configResponse, reportResponse] = await Promise.all([
        executiveSummaryService.getConfig(),
        executiveSummaryService.getSummary(nextFilters),
      ]);
      const nextConfig = configResponse.data;
      setConfig(nextConfig); setDraft(nextConfig);
      setFilters((current) => ({ ...current, inactivity_days: nextFilters.inactivity_days ?? nextConfig.inactivity_days }));
      setReport(reportResponse.data);
    } catch (requestError) {
      setError(requestError); if (requestError.status === 403) toast.error('Executive Summary is available only to branch admins.');
    } finally { setLoading(false); }
  }, [filters]);

  useEffect(() => { if (admin) load(); else setLoading(false); }, [admin]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateFilter = (key, value) => setFilters((current) => ({ ...current, [key]: value }));
  const applyPreset = (value) => { setPreset(value); if (value !== 'custom') setFilters((current) => ({ ...current, ...previousPeriod(value) })); };
  const apply = () => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(filters.from_date) || !/^\d{4}-\d{2}-\d{2}$/.test(filters.to_date) || filters.from_date > filters.to_date) return toast.error('Choose a valid date range.');
    if (!/^\d+$/.test(String(filters.inactivity_days)) || Number(filters.inactivity_days) < 0) return toast.error('Inactivity days must be a non-negative number.');
    load(filters);
  };
  const actionInProgress = sending || downloading;
  const downloadPdf = async () => {
    if (actionInProgressRef.current) return;
    actionInProgressRef.current = true;
    setDownloading(true);
    const toastId = toast.loading('Preparing your PDF. This may take a little while; please wait.');
    const slowNotice = window.setTimeout(() => toast.loading('Still preparing your PDF. Larger reports can take longer; please keep waiting.', { id: toastId }), 8000);
    try {
      const blob = await executiveSummaryService.downloadPdf(filters);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `executive-summary-${filters.from_date}-to-${filters.to_date}.pdf`;
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.success('PDF downloaded.', { id: toastId });
    } catch (requestError) {
      toast.error(requestError.message, { id: toastId });
    } finally {
      window.clearTimeout(slowNotice);
      actionInProgressRef.current = false;
      setDownloading(false);
    }
  };
  const sendNow = async () => {
    if (actionInProgressRef.current) return;
    actionInProgressRef.current = true;
    setSending(true);
    const toastId = toast.loading('Generating the report and sending your email. This may take a little while; please wait.');
    const slowNotice = window.setTimeout(() => toast.loading('Still working on your email. Larger reports can take longer; please keep waiting.', { id: toastId }), 8000);
    try {
      await executiveSummaryService.sendNow({ from_date: filters.from_date, to_date: filters.to_date });
      toast.success('Executive Summary email sent.', { id: toastId });
    } catch (requestError) {
      toast.error(requestError.message, { id: toastId });
    } finally {
      window.clearTimeout(slowNotice);
      actionInProgressRef.current = false;
      setSending(false);
    }
  };
  const saveConfig = async () => {
    if (![draft.send_hour, draft.send_minute, draft.inactivity_days].every((value) => /^\d+$/.test(String(value)))) {
      return toast.error('Enter valid numeric values for the schedule and inactivity settings.');
    }
    const hour = Number(draft.send_hour);
    const minute = Number(draft.send_minute);
    const inactivityDays = Number(draft.inactivity_days);
    if (!Number.isInteger(hour) || hour < 0 || hour > 23) return toast.error('Hour must be between 0 and 23.');
    if (!Number.isInteger(minute) || minute < 0 || minute > 59) return toast.error('Minute must be between 0 and 59.');
    if (!Number.isInteger(inactivityDays) || inactivityDays < 0) return toast.error('Inactivity days must be a non-negative number.');
    if (uniqueRecipients(draft.recipient_emails).length > MAX_RECIPIENT_EMAILS) return toast.error(`You can add up to ${MAX_RECIPIENT_EMAILS} recipient emails.`);
    if (uniqueRecipients(draft.recipient_emails).some((email) => !EMAIL_PATTERN.test(email))) return toast.error('Fix the highlighted recipient emails before saving.');
    setSaving(true);
    try {
      const recipientEmails = Array.isArray(draft.recipient_emails) ? draft.recipient_emails : String(draft.recipient_emails || '').split(/[,;\s]+/).filter(Boolean);
      const response = await executiveSummaryService.updateConfig({ ...draft, send_hour: hour, send_minute: minute, inactivity_days: inactivityDays, recipient_emails: recipientEmails });
      setConfig(response.data); setDraft(response.data); updateFilter('inactivity_days', response.data.inactivity_days); toast.success('Automation settings saved.');
    } catch (requestError) { toast.error(requestError.message); } finally { setSaving(false); }
  };
  const patchDraft = (key, value) => setDraft((current) => ({ ...current, [key]: value }));
  const patchSection = (key, value) => setDraft((current) => ({ ...current, sections: { ...current.sections, [key]: { ...current.sections[key], ...value } } }));

  const shell = (content) => <div className="app-page min-h-screen bg-slate-50"><Header mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} isMinimized={isMinimized} setIsMinimized={setIsMinimized} /><Sidebar mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} isMinimized={isMinimized} setIsMinimized={setIsMinimized} /><main className={`pt-16 transition-all ${isMinimized ? 'md:pl-20' : 'md:pl-[260px]'}`}>{content}</main></div>;

  if (!admin) return shell(<div className="p-6"><Card className="mx-auto max-w-xl p-8 text-center"><span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-pink-100 text-pink-700"><FiAlertCircle size={22} /></span><h1 className="text-xl font-semibold text-slate-900">Admin access required</h1><p className="mt-2 text-sm text-slate-500">Executive Summary is available only to the active branch administrator.</p></Card></div>);

  const totals = report?.totals || {};
  const cards = [['tasks_completed', 'Completed tasks', totals.tasks_completed, 'count'], ['new_tasks', 'New tasks', totals.new_tasks, 'count'], ['sales', 'Sales', totals.sales, 'money'], ['collections', 'Collections', totals.collections, 'money'], ['expenses', 'Expenses', totals.expenses, 'money'], ['unpaid_debtors', 'Unpaid debtors', totals.unpaid_debtors, 'count'], ['due_tasks', 'Due tasks', totals.due_tasks, 'count'], ['clients_without_service', 'No recent service', totals.clients_without_service, 'count']];
  const activityData = chartTopRows(mergeStaffMetrics(report?.sections, [
    ['tasks_completed', 'completed_count', 'completed'],
    ['new_tasks', 'new_task_count', 'new_tasks'],
    ['due_tasks', null, 'due_tasks'],
  ]), ['completed', 'new_tasks', 'due_tasks']);
  const financialData = chartTopRows(mergeStaffMetrics(report?.sections, [
    ['sales', 'sale_amount', 'sales'],
    ['collections', 'collection_amount', 'collections'],
    ['expenses', 'expense_amount', 'expenses'],
  ]), ['sales', 'collections', 'expenses']);
  const portfolioData = [
    { name: 'Unpaid debtors', value: Number(totals.unpaid_debtors) || 0 },
    { name: 'Due tasks', value: Number(totals.due_tasks) || 0 },
    { name: 'No recent service', value: Number(totals.clients_without_service) || 0 },
  ];
  const portfolioTotal = portfolioData.reduce((sum, item) => sum + item.value, 0);
  const presetTitle = preset === 'previous_week' ? 'Previous week' : preset === 'previous_month' ? 'Previous month' : 'Custom range';

  return shell(<div className="mx-auto max-w-[1600px] space-y-5 p-4 sm:p-6">
    <Card className="px-4 py-3.5 sm:px-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-sm" style={{ background: 'linear-gradient(135deg, #0F3FA8, #1A73E8)' }}><FiBarChart2 className="h-5 w-5" /></span>
          <div className="min-w-0">
            <h1 className="font-display text-lg font-bold tracking-tight text-slate-900 md:text-xl">Executive Summary</h1>
            <p className="mt-0.5 truncate text-xs text-slate-500">Branch admin report{report?.meta?.period ? ` · ${formatDateLabel(report.meta.period.from_date)} – ${formatDateLabel(report.meta.period.to_date)}` : ''}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg bg-slate-100 p-1" role="tablist" aria-label="Executive Summary views">
            {[['report', 'Report', FiBarChart2], ['configuration', 'Configuration', FiSettings]].map(([tab, label, Icon]) => (
              <button key={tab} type="button" role="tab" aria-selected={activeTab === tab} onClick={() => setActiveTab(tab)} className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-semibold transition-all duration-200 ${activeTab === tab ? 'bg-white text-[#1552D4] shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}><Icon size={14} />{label}</button>
            ))}
          </div>
          <span className="mx-1 hidden h-6 w-px bg-slate-200 sm:block" aria-hidden="true" />
          <button type="button" onClick={() => load(filters)} disabled={loading} title="Refresh" aria-label="Refresh report" className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50 hover:text-[#1552D4] disabled:opacity-50"><FiRefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /></button>
          {activeTab === 'report' && <>
            <button type="button" className="inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 hover:text-[#1552D4] disabled:cursor-not-allowed disabled:opacity-50" onClick={downloadPdf} disabled={actionInProgress || !report}><FiDownload className="h-4 w-4" />{downloading ? 'Preparing…' : 'Download PDF'}</button>
            <button type="button" className="inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-lg bg-[#1552D4] px-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#0F3FA8] disabled:cursor-not-allowed disabled:opacity-50" onClick={sendNow} disabled={actionInProgress || !report}><FiMail className="h-4 w-4" />{sending ? 'Sending…' : 'Send now'}</button>
          </>}
        </div>
      </div>
    </Card>

    {activeTab === 'report' && <Card className="p-5 sm:p-6">
      <CardHeader icon={FiCalendar} title="Reporting period" subtitle={`${presetTitle} · ${formatDateLabel(filters.from_date)} – ${formatDateLabel(filters.to_date)}`} />
      <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,2fr)]">
        <div><FieldLabel>Quick range</FieldLabel><Segmented size="sm" options={[['previous_week', 'Previous week'], ['previous_month', 'Previous month'], ['custom', 'Custom']]} value={preset} onChange={applyPreset} /></div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div><FieldLabel>From</FieldLabel><DatePickerField value={filters.from_date} onChange={(value) => { setPreset('custom'); updateFilter('from_date', value); }} hideTabs showResetButton={false} placeholder="Select start date" buttonClassName="ui-input w-full" /></div>
          <div><FieldLabel>To</FieldLabel><DatePickerField value={filters.to_date} onChange={(value) => { setPreset('custom'); updateFilter('to_date', value); }} hideTabs showResetButton={false} placeholder="Select end date" buttonClassName="ui-input w-full" /></div>
        </div>
      </div>
      <div className="mt-4 grid items-end gap-3 sm:grid-cols-[10rem_minmax(0,1fr)_auto]">
        <div><FieldLabel htmlFor="es-filter-inactivity">Inactivity days</FieldLabel><div className="relative"><input id="es-filter-inactivity" type="text" inputMode="numeric" pattern="[0-9]*" value={filters.inactivity_days} onChange={(event) => updateFilter('inactivity_days', digitsOnly(event.target.value))} className="ui-input w-full pr-12" /><span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">days</span></div></div>
        <div><FieldLabel htmlFor="es-filter-search">Search</FieldLabel><div className="relative"><FiSearch className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-slate-400" /><input id="es-filter-search" value={filters.search} onChange={(event) => updateFilter('search', event.target.value)} className="ui-input w-full" style={{ paddingLeft: '2.25rem' }} placeholder="Search rows" /></div></div>
        <button type="button" className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-[#1552D4] px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#0F3FA8] disabled:opacity-60" onClick={apply} disabled={loading}>{loading ? <FiRefreshCw className="animate-spin" /> : <FiBarChart2 />} Apply filters</button>
      </div>
    </Card>}

    {error ? <div className="flex items-center justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"><span className="flex items-center gap-2"><FiAlertCircle /> {error.message || 'Unable to load report.'}</span><button type="button" className="rounded-lg bg-white px-3 py-1.5 font-semibold text-[#1552D4] shadow-sm hover:bg-blue-50" onClick={() => load(filters)}>Retry</button></div> : null}

    {activeTab === 'report' && <div>
      <SectionLabel>Overview</SectionLabel>
      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">{cards.map(([key, label, value, type], index) => <KpiTile key={key} label={label} value={type === 'money' ? money(value) : number(value)} icon={SECTION_ICONS[key]} accent={index} />)}</section>
    </div>}

    {activeTab === 'report' && report && <div>
      <SectionLabel>Insights</SectionLabel>
      <section className="grid min-w-0 gap-4 xl:grid-cols-2">
        <ChartCard icon={FiActivity} accent={0} title="Staff activity" subtitle="Work completed, created, and due by staff" badge="Top performers" legend={[['Completed', CHART_COLORS[0]], ['New tasks', CHART_COLORS[1]], ['Due tasks', CHART_COLORS[2]]]}>
          <div className="mt-2 h-[300px] rounded-xl bg-slate-50/60 p-2 sm:h-[340px]">
            {activityData.length ? <ResponsiveContainer width="100%" height="100%"><BarChart data={activityData} layout="vertical" margin={{ top: 8, right: 12, bottom: 4, left: 4 }} barCategoryGap="24%">
              <CartesianGrid stroke="#e9edf5" strokeDasharray="3 5" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} axisLine={false} allowDecimals={false} />
              <YAxis type="category" dataKey="staff_name" width={100} tick={{ fontSize: 10, fill: '#475569' }} tickLine={false} axisLine={false} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: '#eef2ff', radius: 6 }} />
              <Bar dataKey="completed" name="Completed" fill={CHART_COLORS[0]} radius={[0, 5, 5, 0]} maxBarSize={14} />
              <Bar dataKey="new_tasks" name="New tasks" fill={CHART_COLORS[1]} radius={[0, 5, 5, 0]} maxBarSize={14} />
              <Bar dataKey="due_tasks" name="Due tasks" fill={CHART_COLORS[2]} radius={[0, 5, 5, 0]} maxBarSize={14} />
            </BarChart></ResponsiveContainer> : <p className="flex h-full items-center justify-center text-sm text-slate-500">No activity data for this period.</p>}
          </div>
          <p className="mt-2 text-[11px] text-slate-400">Showing up to 9 staff members; remaining staff are grouped as Others.</p>
        </ChartCard>
        <ChartCard icon={FiDollarSign} accent={1} title="Financial performance" subtitle="Compare sales, collections, and expenses" badge="By staff" legend={[['Sales', CHART_COLORS[0]], ['Collections', CHART_COLORS[1]], ['Expenses', CHART_COLORS[2]]]}>
          <div className="mt-2 h-[300px] rounded-xl bg-slate-50/60 p-2 sm:h-[340px]">
            {financialData.length ? <ResponsiveContainer width="100%" height="100%"><BarChart data={financialData} layout="vertical" margin={{ top: 8, right: 12, bottom: 4, left: 4 }} barCategoryGap="24%">
              <CartesianGrid stroke="#e9edf5" strokeDasharray="3 5" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} axisLine={false} tickFormatter={formatCompactCurrency} />
              <YAxis type="category" dataKey="staff_name" width={100} tick={{ fontSize: 10, fill: '#475569' }} tickLine={false} axisLine={false} />
              <Tooltip content={<ChartTooltip currency />} cursor={{ fill: '#ecfdf5', radius: 6 }} />
              <Bar dataKey="sales" name="Sales" fill={CHART_COLORS[0]} radius={[0, 5, 5, 0]} maxBarSize={14} />
              <Bar dataKey="collections" name="Collections" fill={CHART_COLORS[1]} radius={[0, 5, 5, 0]} maxBarSize={14} />
              <Bar dataKey="expenses" name="Expenses" fill={CHART_COLORS[2]} radius={[0, 5, 5, 0]} maxBarSize={14} />
            </BarChart></ResponsiveContainer> : <p className="flex h-full items-center justify-center text-sm text-slate-500">No financial data for this period.</p>}
          </div>
          <p className="mt-2 text-[11px] text-slate-400">Showing up to 9 staff members; remaining staff are grouped as Others.</p>
        </ChartCard>
        <ChartCard icon={FiPieChart} accent={2} title="Client & task follow-up" subtitle="At-a-glance view of outstanding follow-up items" className="xl:col-span-2">
          {portfolioData.some((item) => item.value > 0) ? <div className="mt-3 grid items-center gap-2 sm:grid-cols-[minmax(220px,0.8fr)_minmax(0,1.2fr)]">
            <div className="mx-auto h-56 w-full max-w-[300px]">
              <ResponsiveContainer width="100%" height="100%"><PieChart>
                <Pie data={portfolioData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={58} outerRadius={88} paddingAngle={4} stroke="none">
                  {portfolioData.map((item, index) => <Cell key={item.name} fill={CHART_COLORS[index]} />)}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
                <text x="50%" y="47%" textAnchor="middle" dominantBaseline="middle" className="fill-slate-800 text-2xl font-bold">{number(portfolioTotal)}</text>
                <text x="50%" y="58%" textAnchor="middle" dominantBaseline="middle" className="fill-slate-400 text-[10px] font-medium">TOTAL ITEMS</text>
              </PieChart></ResponsiveContainer>
            </div>
            <div className="grid gap-2">
              {portfolioData.map((item, index) => <div key={item.name} className="flex items-center justify-between gap-4 rounded-xl border border-slate-100 bg-slate-50/70 px-4 py-3">
                <span className="flex min-w-0 items-center gap-3 text-sm font-medium text-slate-600"><span className="h-3 w-3 shrink-0 rounded" style={{ backgroundColor: CHART_COLORS[index] }} /><span className="truncate">{item.name}</span></span>
                <span className="shrink-0 text-right"><span className="block text-base font-bold tabular-nums text-slate-900">{number(item.value)}</span><span className="text-[10px] text-slate-400">{portfolioTotal ? `${Math.round(item.value / portfolioTotal * 100)}% of total` : '0% of total'}</span></span>
              </div>)}
            </div>
          </div> : <p className="flex min-h-48 items-center justify-center text-sm text-slate-500">No follow-up items for this period.</p>}
        </ChartCard>
      </section>
    </div>}

    {activeTab === 'report' && (loading ? <Card className="flex min-h-56 flex-col items-center justify-center px-6 py-10 text-center"><span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 text-[#1552D4]"><FiRefreshCw className="h-7 w-7 animate-spin" aria-hidden="true" /></span><h2 className="text-base font-semibold text-slate-800">Generating your Executive Summary</h2><p className="mt-2 max-w-md text-sm leading-6 text-slate-500">We’re gathering the report data now. Larger date ranges may take longer to process.</p></Card> : <div>
      <SectionLabel>Detailed breakdown</SectionLabel>
      <Card className="divide-y divide-slate-100 overflow-hidden">{Object.entries(SECTION_LABELS).map(([key, label], index) => {
        const isCollapsed = collapsedSections.has(key);
        const count = Number(report?.sections?.[key]?.total_count || 0);
        const toggle = () => setCollapsedSections((current) => { const next = new Set(current); if (next.has(key)) next.delete(key); else next.add(key); return next; });
        return <section key={key}>
          <button type="button" className={`flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-slate-50 focus:outline-none focus-visible:bg-slate-50 sm:px-5 ${isCollapsed ? '' : 'bg-slate-50'}`} onClick={toggle} aria-label={`${isCollapsed ? 'Expand' : 'Collapse'} ${label}`} aria-expanded={!isCollapsed} aria-controls={`summary-section-${key}`}>
            <IconWell icon={SECTION_ICONS[key] || FiList} accent={index} size="h-9 w-9" iconSize={16} />
            <h2 className="flex-1 text-sm font-semibold text-slate-800">{label}</h2>
            <span className={`rounded-full px-2.5 py-1 text-xs font-bold tabular-nums ${count ? 'bg-blue-50 text-[#1552D4]' : 'bg-slate-100 text-slate-500'}`}>{number(count)}</span>
            <FiChevronDown className={`h-4 w-4 text-slate-500 transition-transform duration-200 ${isCollapsed ? '-rotate-90' : ''}`} />
          </button>
          <div id={`summary-section-${key}`} className="border-t border-slate-100 p-4 sm:px-5" hidden={isCollapsed}><SectionTable sectionKey={key} section={report?.sections?.[key]} /></div>
        </section>;
      })}</Card>
    </div>)}

    {activeTab === 'configuration' && <ConfigurationPanel draft={draft} config={config} saving={saving} onSave={saveConfig} patchDraft={patchDraft} patchSection={patchSection} />}
  </div>);
}
