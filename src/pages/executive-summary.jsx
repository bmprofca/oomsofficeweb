import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FiActivity, FiAlertCircle, FiBarChart2, FiCalendar, FiChevronDown, FiDollarSign, FiDownload, FiMail, FiPieChart, FiRefreshCw, FiSave, FiSettings } from 'react-icons/fi';
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

function ConfigurationPanel({ draft, config, saving, onSave, patchDraft, patchSection }) {
  return <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
    <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
      <div className="flex items-center gap-2 text-base font-semibold text-slate-800"><FiSettings className="text-indigo-600" /> Automated email report</div>
      <p className="mt-1 text-sm text-slate-500">Configure the delivery schedule, recipients, and report sections.</p>
    </div>
    {draft ? <div className="space-y-6 p-5 sm:p-6">
      <label className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
        <span><span className="block">Enable scheduled reports</span><span className="mt-0.5 block text-xs font-normal text-slate-500">Automatically email this summary on your selected schedule.</span></span>
        <input type="checkbox" checked={!!draft.enabled} onChange={(event) => patchDraft('enabled', event.target.checked)} />
      </label>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <label className="ui-label">Schedule<select className="ui-input mt-1" value={draft.schedule_type} onChange={(event) => patchDraft('schedule_type', event.target.value)}><option value="weekly">Weekly</option><option value="monthly">Monthly</option></select></label>
        <label className="ui-label">Hour (0-23)<input className="ui-input mt-1" type="text" inputMode="numeric" pattern="[0-9]*" maxLength={2} value={draft.send_hour} onChange={(event) => patchDraft('send_hour', digitsOnly(event.target.value))} /></label>
        <label className="ui-label">Minute (0-59)<input className="ui-input mt-1" type="text" inputMode="numeric" pattern="[0-9]*" maxLength={2} value={draft.send_minute} onChange={(event) => patchDraft('send_minute', digitsOnly(event.target.value))} /></label>
        <label className="ui-label sm:col-span-2 xl:col-span-1">Timezone<input className="ui-input mt-1" value={draft.timezone} onChange={(event) => patchDraft('timezone', event.target.value)} /></label>
        <label className="ui-label sm:col-span-2">Recipient emails<input className="ui-input mt-1" value={Array.isArray(draft.recipient_emails) ? draft.recipient_emails.join(', ') : draft.recipient_emails || ''} onChange={(event) => patchDraft('recipient_emails', event.target.value.split(/[,;\s]+/).filter(Boolean))} placeholder="admin@example.com, manager@example.com" /></label>
        <label className="ui-label">Inactivity days<input className="ui-input mt-1" type="text" inputMode="numeric" pattern="[0-9]*" value={draft.inactivity_days} onChange={(event) => patchDraft('inactivity_days', digitsOnly(event.target.value))} /></label>
      </div>
      <div className="border-t border-slate-100 pt-5">
        <h3 className="text-sm font-semibold text-slate-800">Included sections</h3>
        <p className="mt-1 text-xs text-slate-500">Choose which sections are included in scheduled email reports.</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {Object.entries(SECTION_LABELS).map(([key, label]) => <label key={key} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600"><input type="checkbox" checked={draft.sections?.[key]?.enabled !== false} onChange={(event) => patchSection(key, { enabled: event.target.checked })} />{label}</label>)}
        </div>
      </div>
      <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-slate-500">Last success: {config?.last_success_at ? String(config.last_success_at).slice(0, 16) : 'Never'}<br />Last error: {config?.last_error || 'None'}</p>
        <button type="button" className="ui-btn ui-btn-primary inline-flex items-center justify-center gap-2" onClick={onSave} disabled={saving}><FiSave /> {saving ? 'Saving…' : 'Save automation settings'}</button>
      </div>
    </div> : <p className="p-6 text-sm text-slate-500">Loading settings…</p>}
  </section>;
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
    setSaving(true);
    try {
      const recipientEmails = Array.isArray(draft.recipient_emails) ? draft.recipient_emails : String(draft.recipient_emails || '').split(/[,;\s]+/).filter(Boolean);
      const response = await executiveSummaryService.updateConfig({ ...draft, send_hour: hour, send_minute: minute, inactivity_days: inactivityDays, recipient_emails: recipientEmails });
      setConfig(response.data); setDraft(response.data); updateFilter('inactivity_days', response.data.inactivity_days); toast.success('Automation settings saved.');
    } catch (requestError) { toast.error(requestError.message); } finally { setSaving(false); }
  };
  const patchDraft = (key, value) => setDraft((current) => ({ ...current, [key]: value }));
  const patchSection = (key, value) => setDraft((current) => ({ ...current, sections: { ...current.sections, [key]: { ...current.sections[key], ...value } } }));

  if (!admin) return <div className="app-page min-h-screen bg-slate-50"><Header mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} isMinimized={isMinimized} setIsMinimized={setIsMinimized} /><Sidebar mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} isMinimized={isMinimized} setIsMinimized={setIsMinimized} /><main className="pt-20 md:pl-[260px] p-6"><div className="mx-auto max-w-xl rounded-2xl border border-rose-100 bg-white p-8 text-center shadow-sm"><FiAlertCircle className="mx-auto mb-3 text-rose-500" size={30} /><h1 className="text-xl font-semibold text-slate-900">Admin access required</h1><p className="mt-2 text-sm text-slate-500">Executive Summary is available only to the active branch administrator.</p></div></main></div>;

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
  return <div className="app-page min-h-screen bg-slate-50"><Header mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} isMinimized={isMinimized} setIsMinimized={setIsMinimized} /><Sidebar mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} isMinimized={isMinimized} setIsMinimized={setIsMinimized} /><main className={`pt-16 transition-all ${isMinimized ? 'md:pl-20' : 'md:pl-[260px]'}`}><div className="mx-auto max-w-[1600px] space-y-5 p-4 sm:p-6">
    <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600">Admin reports</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">Executive Summary</h1>
        <p className="mt-1 text-sm text-slate-500">{report?.meta?.period ? `${report.meta.period.from_date} to ${report.meta.period.to_date} · ${report.meta.timezone}` : 'Choose a period to load branch performance.'}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1" role="tablist" aria-label="Executive Summary views">
          {[['report', 'Report'], ['configuration', 'Configuration']].map(([tab, label]) => (
            <button key={tab} type="button" role="tab" aria-selected={activeTab === tab} onClick={() => setActiveTab(tab)} className={`rounded-md px-3 py-2 text-sm font-medium transition ${activeTab === tab ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>{label}</button>
          ))}
        </div>
        <button type="button" className="ui-btn ui-btn-secondary inline-flex shrink-0 flex-row items-center justify-center gap-2 whitespace-nowrap" onClick={() => load(filters)} disabled={loading}><FiRefreshCw className="h-4 w-4 shrink-0" /><span>Refresh</span></button>
        <button type="button" className="ui-btn ui-btn-secondary inline-flex shrink-0 flex-row items-center justify-center gap-2 whitespace-nowrap" onClick={downloadPdf} disabled={actionInProgress || !report}><FiDownload className="h-4 w-4 shrink-0" /><span>{downloading ? 'Preparing…' : 'Download PDF'}</span></button>
        <button type="button" className="ui-btn ui-btn-primary inline-flex shrink-0 flex-row items-center justify-center gap-2 whitespace-nowrap" onClick={sendNow} disabled={actionInProgress || !report}><FiMail className="h-4 w-4 shrink-0" /><span>{sending ? 'Sending…' : 'Send now'}</span></button>
      </div>
    </div>
    {activeTab === 'report' && <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-800"><FiCalendar className="text-indigo-600" /> Report filters</div>
      <div className="flex flex-wrap gap-2">
        {[['previous_week', 'Previous week'], ['previous_month', 'Previous month'], ['custom', 'Custom']].map(([value, label]) => (
          <button key={value} type="button" onClick={() => applyPreset(value)} className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${preset === value ? 'border-indigo-600 bg-indigo-600 text-white shadow-sm' : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700'}`}>{label}</button>
        ))}
      </div>
      <div className="mt-4 grid grid-cols-1 items-end gap-x-3 gap-y-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,0.8fr)_minmax(7rem,0.6fr)_minmax(15rem,2.4fr)_auto]">
        <label className="block text-xs font-semibold text-slate-600">From<DatePickerField value={filters.from_date} onChange={(value) => { setPreset('custom'); updateFilter('from_date', value); }} hideTabs showResetButton={false} placeholder="Select start date" buttonClassName="ui-input mt-1 w-full" /></label>
        <label className="block text-xs font-semibold text-slate-600">To<DatePickerField value={filters.to_date} onChange={(value) => { setPreset('custom'); updateFilter('to_date', value); }} hideTabs showResetButton={false} placeholder="Select end date" buttonClassName="ui-input mt-1 w-full" /></label>
        <label className="block text-xs font-semibold text-slate-600">Inactivity days<input type="text" inputMode="numeric" pattern="[0-9]*" value={filters.inactivity_days} onChange={(event) => updateFilter('inactivity_days', digitsOnly(event.target.value))} className="ui-input mt-1" /></label>
        <label className="block text-xs font-semibold text-slate-600">Search<input value={filters.search} onChange={(event) => updateFilter('search', event.target.value)} className="ui-input mt-1" placeholder="Search rows" /></label>
        <button className="ui-btn ui-btn-primary inline-flex items-center justify-center gap-2 whitespace-nowrap sm:col-span-2 lg:col-span-1" onClick={apply} disabled={loading}><FiBarChart2 /> Apply filters</button>
      </div>
    </section>}
    {error ? <div className="flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700"><span>{error.message || 'Unable to load report.'}</span><button className="btn-secondary" onClick={() => load(filters)}>Retry</button></div> : null}
    {activeTab === 'report' && <section className="grid grid-cols-2 gap-3 md:grid-cols-4">{cards.map(([key, label, value, type]) => <div key={key} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-xs font-medium text-slate-500">{label}</p><p className="mt-2 text-xl font-bold text-slate-900">{type === 'money' ? money(value) : number(value)}</p></div>)}</section>}
    {activeTab === 'report' && report && <section className="grid min-w-0 gap-4 xl:grid-cols-2">
      <article className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-white via-white to-indigo-50/60 p-4 shadow-sm transition-shadow hover:shadow-md sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700"><FiActivity size={19} /></span>
            <div className="min-w-0"><h2 className="text-sm font-bold text-slate-900">Staff activity</h2><p className="mt-1 text-xs text-slate-500">Work completed, created, and due by staff</p></div>
          </div>
          <span className="shrink-0 rounded-full border border-indigo-100 bg-white/80 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-indigo-700">Top performers</span>
        </div>
        <div className="mt-4 flex flex-wrap gap-2" aria-label="Activity chart legend">
          {[['Completed', CHART_COLORS[0]], ['New tasks', CHART_COLORS[1]], ['Due tasks', CHART_COLORS[2]]].map(([label, color]) => <span key={label} className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-medium text-slate-600"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />{label}</span>)}
        </div>
        <div className="mt-2 h-[300px] rounded-xl bg-white/65 p-2 sm:h-[340px]">
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
      </article>
      <article className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-white via-white to-emerald-50/60 p-4 shadow-sm transition-shadow hover:shadow-md sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700"><FiDollarSign size={19} /></span>
            <div className="min-w-0"><h2 className="text-sm font-bold text-slate-900">Financial performance</h2><p className="mt-1 text-xs text-slate-500">Compare sales, collections, and expenses</p></div>
          </div>
          <span className="shrink-0 rounded-full border border-emerald-100 bg-white/80 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">By staff</span>
        </div>
        <div className="mt-4 flex flex-wrap gap-2" aria-label="Financial chart legend">
          {[['Sales', CHART_COLORS[0]], ['Collections', CHART_COLORS[1]], ['Expenses', CHART_COLORS[2]]].map(([label, color]) => <span key={label} className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-medium text-slate-600"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />{label}</span>)}
        </div>
        <div className="mt-2 h-[300px] rounded-xl bg-white/65 p-2 sm:h-[340px]">
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
      </article>
      <article className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-white via-white to-amber-50/60 p-4 shadow-sm transition-shadow hover:shadow-md sm:p-5 xl:col-span-2">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700"><FiPieChart size={19} /></span>
          <div className="min-w-0"><h2 className="text-sm font-bold text-slate-900">Client &amp; task follow-up</h2><p className="mt-1 text-xs text-slate-500">At-a-glance view of outstanding follow-up items</p></div>
        </div>
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
          <div className="grid gap-2 sm:grid-cols-1">
            {portfolioData.map((item, index) => <div key={item.name} className="flex items-center justify-between gap-4 rounded-xl border border-white bg-white/80 px-4 py-3 shadow-sm">
              <span className="flex min-w-0 items-center gap-3 text-sm font-medium text-slate-600"><span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: CHART_COLORS[index] }} /><span className="truncate">{item.name}</span></span>
              <span className="shrink-0 text-right"><span className="block text-base font-bold tabular-nums text-slate-900">{number(item.value)}</span><span className="text-[10px] text-slate-400">{portfolioTotal ? `${Math.round(item.value / portfolioTotal * 100)}% of total` : '0% of total'}</span></span>
            </div>)}
          </div>
        </div> : <p className="flex min-h-48 items-center justify-center text-sm text-slate-500">No follow-up items for this period.</p>}
      </article>
    </section>}
    {activeTab === 'report' && (loading ? <div className="flex min-h-56 flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 py-10 text-center shadow-sm"><FiRefreshCw className="mb-4 h-8 w-8 animate-spin text-indigo-600" aria-hidden="true" /><h2 className="text-base font-semibold text-slate-800">Generating your Executive Summary</h2><p className="mt-2 max-w-md text-sm leading-6 text-slate-500">We’re gathering the report data now. Larger date ranges may take longer to process.</p></div> : <div className="grid gap-5"><div className="space-y-5">{Object.entries(SECTION_LABELS).map(([key, label]) => {
      const isCollapsed = collapsedSections.has(key);
      return <section key={key} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"><div className="flex items-center justify-between gap-3 px-4 py-3"><h2 className="text-sm font-semibold text-slate-800">{label}</h2><div className="flex shrink-0 items-center gap-2"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">{number(report?.sections?.[key]?.total_count || 0)}</span><button type="button" className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1" onClick={() => setCollapsedSections((current) => { const next = new Set(current); if (next.has(key)) next.delete(key); else next.add(key); return next; })} aria-label={`${isCollapsed ? 'Expand' : 'Collapse'} ${label}`} aria-expanded={!isCollapsed} aria-controls={`summary-section-${key}`}><FiChevronDown className={`h-4 w-4 transition-transform ${isCollapsed ? '-rotate-90' : ''}`} /></button></div></div><div id={`summary-section-${key}`} className="border-t border-slate-100 p-4" hidden={isCollapsed}><SectionTable sectionKey={key} section={report?.sections?.[key]} /></div></section>;
    })}</div></div>)}
    {activeTab === 'configuration' && <ConfigurationPanel draft={draft} config={config} saving={saving} onSave={saveConfig} patchDraft={patchDraft} patchSection={patchSection} />}
  </div></main></div>;
}
