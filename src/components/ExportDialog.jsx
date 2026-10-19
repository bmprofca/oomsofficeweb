import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  FiX,
  FiDownload,
  FiMail,
  FiCheck,
  FiLoader,
  FiAlertCircle,
  FiColumns,
  FiCheckSquare,
  FiFileText,
  FiLayers,
} from 'react-icons/fi';
import getHeaders from '../utils/get-headers';
import API_BASE_URL from '../utils/api-controller';

/**
 * Shared export dialog (Tasks, Clients, …).
 *
 * The page supplies `buildRows(scope, onProgress)` which returns `{ data, columns }`
 * for scope "selected" | "page" | "all". The dialog handles format, delivery
 * (instant download via POST /export/download, or email via POST /export/request)
 * and progress.
 */

const FORMATS = [
  {
    key: 'excel',
    label: 'Excel',
    ext: '.xlsx',
    hint: 'Best for filtering, totals and sharing with your team',
    badge: 'XLS',
    chip: 'bg-emerald-600',
    ring: 'ring-emerald-500 border-emerald-500 bg-emerald-50',
  },
  {
    key: 'csv',
    label: 'CSV',
    ext: '.csv',
    hint: 'Plain data for Tally, Google Sheets or other software',
    badge: 'CSV',
    chip: 'bg-sky-600',
    ring: 'ring-sky-500 border-sky-500 bg-sky-50',
  },
  {
    key: 'pdf',
    label: 'PDF',
    ext: '.pdf',
    hint: 'Print-ready report to send to a client or file',
    badge: 'PDF',
    chip: 'bg-rose-600',
    ring: 'ring-rose-500 border-rose-500 bg-rose-50',
  },
];

function getUserEmail() {
  try {
    const direct = localStorage.getItem('user_email');
    if (direct && direct !== 'undefined' && direct !== 'null') return direct;
    for (const key of ['user_profile', 'user', 'profile', 'userData']) {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const obj = JSON.parse(raw);
      const email = obj?.email || obj?.user_email || obj?.profile?.email;
      if (email) return email;
    }
  } catch (_) {
    /* ignore */
  }
  return null;
}

function triggerDownload(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
}

function fileNameFromDisposition(header, fallback) {
  const match = /filename="?([^";]+)"?/i.exec(header || '');
  return match ? match[1] : fallback;
}

function OptionCard({ selected, disabled, onClick, children, className = '' }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      disabled={disabled}
      onClick={onClick}
      className={`relative flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-all disabled:cursor-not-allowed disabled:opacity-50 ${
        selected
          ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500'
          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
      } ${className}`}
    >
      {children}
      <span
        className={`ml-auto mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
          selected ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300 bg-white'
        }`}
        aria-hidden
      >
        {selected ? <FiCheck className="h-3 w-3" /> : null}
      </span>
    </button>
  );
}

export default function ExportDialog({
  isOpen,
  onClose,
  title = 'Export',
  reportTitle,
  entityLabel = 'records',
  fileStem = 'Export',
  jobType = 'report',
  initialFormat = 'excel',
  counts = { selected: 0, page: 0, total: 0 },
  columnsCount = 0,
  buildRows,
}) {
  const docTitle = reportTitle || title;
  const [format, setFormat] = useState(initialFormat);
  const [scope, setScope] = useState('page');
  const [delivery, setDelivery] = useState('download');
  const [phase, setPhase] = useState('idle'); // idle | collecting | generating | done | error
  const [progress, setProgress] = useState({ loaded: 0, total: 0 });
  const [errorText, setErrorText] = useState('');
  const userEmail = useMemo(() => (isOpen ? getUserEmail() : null), [isOpen]);
  const busy = phase === 'collecting' || phase === 'generating';
  const busyRef = useRef(false);
  busyRef.current = busy;

  // Reset every time the dialog opens
  useEffect(() => {
    if (!isOpen) return;
    setFormat(initialFormat || 'excel');
    setScope(counts.selected > 0 ? 'selected' : 'page');
    setDelivery('download');
    setPhase('idle');
    setProgress({ loaded: 0, total: 0 });
    setErrorText('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const requestClose = useCallback(() => {
    if (busyRef.current) return;
    onClose?.();
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        requestClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, requestClose]);

  const scopeOptions = useMemo(() => {
    const list = [];
    if (counts.selected > 0) {
      list.push({ key: 'selected', label: 'Selected rows', count: counts.selected, icon: FiCheckSquare, hint: `Only the ${entityLabel} you ticked` });
    }
    list.push({ key: 'page', label: 'Current page', count: counts.page, icon: FiFileText, hint: `The ${entityLabel} visible on this page` });
    list.push({ key: 'all', label: 'All matching', count: counts.total, icon: FiLayers, hint: 'Every record that matches your search and filters' });
    return list;
  }, [counts.selected, counts.page, counts.total, entityLabel]);

  const selectedFormat = FORMATS.find((f) => f.key === format) || FORMATS[0];
  const selectedScope = scopeOptions.find((s) => s.key === scope) || scopeOptions[0];
  const rowCount = selectedScope?.count || 0;

  const run = async () => {
    if (!buildRows) return;
    if (delivery === 'email' && !userEmail) {
      toast.error('No email address on your profile. Choose "Download now" instead.');
      return;
    }
    setErrorText('');
    setPhase('collecting');
    setProgress({ loaded: 0, total: rowCount });
    try {
      const { data, columns } = await buildRows(scope, (loaded, total) => setProgress({ loaded, total }));
      if (!data?.length) {
        throw new Error(`No ${entityLabel} to export for this selection.`);
      }
      setPhase('generating');
      const headers = await getHeaders();

      if (delivery === 'download') {
        const res = await fetch(`${API_BASE_URL}/export/download`, {
          method: 'POST',
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            file_type: format,
            title: docTitle,
            file_name: fileStem,
            subtitle: `${data.length} ${entityLabel} · generated ${new Date().toLocaleString('en-IN')}`,
            data,
            columns,
          }),
        });
        if (!res.ok) {
          let message = 'Export failed';
          try {
            message = (await res.json())?.message || message;
          } catch (_) { /* not JSON */ }
          throw new Error(message);
        }
        const blob = await res.blob();
        const stamp = new Date().toISOString().slice(0, 10);
        const name = fileNameFromDisposition(res.headers.get('Content-Disposition'), `${fileStem}_${stamp}${selectedFormat.ext}`);
        triggerDownload(blob, name);
        setPhase('done');
        toast.success(`${data.length} ${entityLabel} exported as ${selectedFormat.label}`);
        window.setTimeout(() => onClose?.(), 900);
      } else {
        const res = await fetch(`${API_BASE_URL}/export/request`, {
          method: 'POST',
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            job_type: jobType,
            file_type: format,
            recipient_email: userEmail,
            email_subject: `${docTitle} — ${new Date().toLocaleDateString('en-IN')}`,
            email_message: `<p>Your ${docTitle.toLowerCase()} export is attached.</p><p><strong>Format:</strong> ${selectedFormat.label}<br/><strong>Records:</strong> ${data.length}<br/><strong>Generated:</strong> ${new Date().toLocaleString('en-IN')}</p>`,
            data,
            columns,
            filters: { export_date: new Date().toISOString(), total_records: data.length, scope },
          }),
        });
        const result = await res.json().catch(() => ({}));
        if (!res.ok || !result.success) throw new Error(result.message || 'Could not start the email export');
        setPhase('done');
        toast.success(`Export queued. It will arrive at ${userEmail} shortly.`);
        window.setTimeout(() => onClose?.(), 1200);
      }
    } catch (error) {
      setPhase('error');
      setErrorText(error?.message || 'Export failed');
    }
  };

  if (typeof document === 'undefined') return null;

  const progressPct = progress.total > 0 ? Math.min(100, Math.round((progress.loaded / progress.total) * 100)) : 0;
  const actionLabel = delivery === 'download' ? `Download ${selectedFormat.label}` : `Email ${selectedFormat.label}`;

  return createPortal(
    <AnimatePresence>
    {isOpen && (
    <motion.div
      key="export-dialog"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-[10060] flex items-start justify-center overflow-y-auto p-3 sm:items-center sm:p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) requestClose();
      }}
    >
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="fixed inset-0 bg-slate-900/45 backdrop-blur-[2px]" aria-hidden="true" />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="export-dialog-title"
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        className="relative my-4 flex w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100">
              <FiDownload className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h2 id="export-dialog-title" className="font-display text-base font-bold tracking-tight text-slate-900">{title}</h2>
              <p className="mt-0.5 text-xs text-slate-500">Choose a format, which {entityLabel} to include, and how to receive the file.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={requestClose}
            disabled={busy}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40"
            aria-label="Close"
          >
            <FiX className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 px-5 py-5">
          {/* Format */}
          <section>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">Format</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3" role="radiogroup" aria-label="File format">
              {FORMATS.map((f) => {
                const active = f.key === format;
                return (
                  <button
                    key={f.key}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    disabled={busy}
                    onClick={() => setFormat(f.key)}
                    className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-all disabled:opacity-60 sm:flex-col sm:items-start ${
                      active ? `ring-1 ${f.ring}` : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[10px] font-extrabold tracking-wide text-white ${f.chip}`}>
                      {f.badge}
                    </span>
                    <span className="min-w-0">
                      <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
                        {f.label}
                        <span className="font-mono text-[11px] font-medium text-slate-400">{f.ext}</span>
                      </span>
                      <span className="mt-0.5 block text-[11.5px] leading-snug text-slate-500">{f.hint}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Records */}
          <section>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">Records</p>
            <div className="grid gap-2" role="radiogroup" aria-label="Records to export">
              {scopeOptions.map((opt) => {
                const Icon = opt.icon;
                return (
                  <OptionCard key={opt.key} selected={scope === opt.key} disabled={busy || opt.count === 0} onClick={() => setScope(opt.key)}>
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-slate-900">
                        {opt.label}
                        <span className="ml-2 rounded-full bg-white px-2 py-0.5 font-mono text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200">
                          {Number(opt.count || 0).toLocaleString('en-IN')}
                        </span>
                      </span>
                      <span className="mt-0.5 block text-xs text-slate-500">{opt.hint}</span>
                    </span>
                  </OptionCard>
                );
              })}
            </div>
            <p className="mt-2 flex items-center gap-1.5 text-[11.5px] text-slate-500">
              <FiColumns className="h-3.5 w-3.5" />
              {columnsCount} visible column{columnsCount === 1 ? '' : 's'} will be included. Change them from Column settings.
            </p>
          </section>

          {/* Delivery */}
          <section>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">Delivery</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Delivery">
              <OptionCard selected={delivery === 'download'} disabled={busy} onClick={() => setDelivery('download')}>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                  <FiDownload className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-slate-900">Download now</span>
                  <span className="mt-0.5 block text-xs text-slate-500">Save the file straight to this device</span>
                </span>
              </OptionCard>
              <OptionCard selected={delivery === 'email'} disabled={busy || !userEmail} onClick={() => setDelivery('email')}>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                  <FiMail className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-slate-900">Email to me</span>
                  <span className="mt-0.5 block truncate text-xs text-slate-500">{userEmail || 'No email on your profile'}</span>
                </span>
              </OptionCard>
            </div>
          </section>

          {/* Status */}
          {busy ? (
            <div className="rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3" role="status" aria-live="polite">
              <div className="flex items-center gap-2 text-sm font-medium text-indigo-800">
                <FiLoader className="h-4 w-4 animate-spin" />
                {phase === 'collecting'
                  ? scope === 'all'
                    ? `Collecting ${entityLabel}… ${progress.loaded.toLocaleString('en-IN')} of ${progress.total.toLocaleString('en-IN')}`
                    : `Preparing ${entityLabel}…`
                  : delivery === 'download'
                    ? `Building your ${selectedFormat.label} file…`
                    : 'Queuing your email export…'}
              </div>
              {phase === 'collecting' && scope === 'all' ? (
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white">
                  <div className="h-full rounded-full bg-indigo-600 transition-all" style={{ width: `${progressPct}%` }} />
                </div>
              ) : null}
            </div>
          ) : null}
          {phase === 'done' ? (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800" role="status">
              <FiCheck className="h-4 w-4" />
              {delivery === 'download' ? 'Your file is downloading.' : `Export queued for ${userEmail}.`}
            </div>
          ) : null}
          {phase === 'error' ? (
            <div className="flex items-start gap-2 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-800" role="alert">
              <FiAlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{errorText}</span>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="flex flex-col-reverse gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-slate-500">
            {Number(rowCount).toLocaleString('en-IN')} {entityLabel} · {selectedFormat.label}
          </p>
          <div className="flex gap-2">
            <button type="button" onClick={requestClose} disabled={busy} className="ui-btn ui-btn-secondary flex-1 sm:flex-none">
              Cancel
            </button>
            <button
              type="button"
              onClick={run}
              disabled={busy || rowCount === 0}
              className="ui-btn ui-btn-primary flex-1 sm:flex-none"
            >
              {busy ? <FiLoader className="h-4 w-4 animate-spin" /> : delivery === 'download' ? <FiDownload className="h-4 w-4" /> : <FiMail className="h-4 w-4" />}
              {phase === 'error' ? 'Try again' : actionLabel}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
    )}
    </AnimatePresence>,
    document.body,
  );
}
