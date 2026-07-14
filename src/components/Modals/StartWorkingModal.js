import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  FiBriefcase,
  FiCalendar,
  FiLayers,
  FiLoader,
  FiPlay,
  FiX,
} from 'react-icons/fi';

const rowFirm = (row) => row?.firm || {};
const rowService = (row) => row?.service || {};

const rowDates = (row) => {
  const dates = row?.dates || {};
  return {
    ...dates,
    compliance_year: row?.compliance_year ?? dates.compliance_year,
    compliance_period: row?.compliance_period ?? dates.compliance_period,
  };
};

const resolveCompliancePeriod = (row) => {
  const dates = rowDates(row);
  const candidates = [
    dates.compliance_period,
    dates.period,
    dates.compliance_period_label,
    row?.compliance_period,
    row?.period,
    row?.schedule?.compliance_period,
    row?.schedule?.period,
  ];
  for (const value of candidates) {
    if (value != null && String(value).trim() !== '') {
      return String(value).trim();
    }
  }
  return null;
};

const getPeriodLabel = (row, periodOptions) => {
  const raw = resolveCompliancePeriod(row);
  if (raw) {
    const periods = periodOptions?.periods ?? [];
    const match = periods.find(
      (item) => String(item.value) === raw || String(item.label) === raw,
    );
    return match?.label || match?.value || raw;
  }
  const frequency =
    periodOptions?.frequency ??
    rowService(row)?.frequency ??
    row?.frequency;
  if (frequency === 'yearly') return 'Yearly';
  return null;
};

const DetailRow = ({ icon: Icon, iconWrapClass, label, value }) => (
  <div className="flex items-start gap-3 py-3 border-b border-slate-100 last:border-b-0">
    <div
      className={`mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${iconWrapClass}`}
    >
      <Icon className="h-4 w-4" />
    </div>
    <div className="min-w-0 flex-1">
      <p className="m-0 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="m-0 mt-0.5 text-sm font-semibold text-slate-800 break-words">
        {value || '—'}
      </p>
    </div>
  </div>
);

/**
 * Confirm modal for starting a not-yet-started compliance task.
 * Shared by compliance board and Yet Not Started page.
 */
const StartWorkingModal = ({
  row,
  loading = false,
  onConfirm,
  onCancel,
  periodOptions = null,
}) => {
  const isOpen = Boolean(row);

  useEffect(() => {
    if (!isOpen || loading) return undefined;

    const onKey = (event) => {
      if (event.key === 'Escape') onCancel?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, loading, onCancel]);

  const firm = rowFirm(row);
  const service = rowService(row);
  const dates = rowDates(row);
  const periodLabel = getPeriodLabel(row, periodOptions) || '—';
  const firmName = firm.firm_name || firm.firm_id || '—';
  const serviceName = service.name || service.service_id || '—';
  const yearLabel = dates.compliance_year || '—';

  return createPortal(
    <AnimatePresence>
      {isOpen ? (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center overflow-hidden overscroll-none p-3 sm:p-4 pointer-events-none">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-slate-900/55 backdrop-blur-sm pointer-events-auto"
            onClick={loading ? undefined : onCancel}
            aria-hidden="true"
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="start-working-modal-title"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="relative z-[1] pointer-events-auto w-full max-w-md my-2 sm:my-4 max-h-[calc(100vh-1.5rem)] sm:max-h-[calc(100vh-2rem)] overflow-hidden flex flex-col rounded-2xl bg-white shadow-2xl ring-1 ring-indigo-100"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="shrink-0 px-5 py-4 bg-gradient-to-r from-indigo-600 via-indigo-600 to-violet-600 flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15 text-white ring-1 ring-white/25">
                  <FiPlay className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h2
                    id="start-working-modal-title"
                    className="text-base font-semibold text-white m-0"
                  >
                    Start this task?
                  </h2>
                  <p className="text-xs text-white/85 mt-0.5 m-0">
                    Create the compliance task and mark it in process.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onCancel}
                disabled={loading}
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white/90 hover:bg-white/15 transition-colors disabled:opacity-50"
                aria-label="Close"
              >
                <FiX size={16} />
              </button>
            </div>

            <div className="px-5 py-4 flex-1 min-h-0 overflow-y-auto overscroll-y-contain [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-amber-700">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                Not started yet
              </div>

              <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-3">
                <DetailRow
                  icon={FiBriefcase}
                  iconWrapClass="bg-indigo-50 text-indigo-600"
                  label="Firm"
                  value={firmName}
                />
                <DetailRow
                  icon={FiLayers}
                  iconWrapClass="bg-violet-50 text-violet-600"
                  label="Service"
                  value={serviceName}
                />
                <DetailRow
                  icon={FiCalendar}
                  iconWrapClass="bg-emerald-50 text-emerald-600"
                  label="Period"
                  value={`${periodLabel} · ${yearLabel}`}
                />
              </div>

              <p className="mt-4 mb-0 text-sm text-slate-600 leading-relaxed">
                Confirming will create this compliance task and set its status to{' '}
                <span className="inline-flex items-center rounded-full bg-orange-100 px-2 py-0.5 text-xs font-semibold text-orange-700">
                  In Process
                </span>
                .
              </p>
            </div>

            <div className="shrink-0 border-t border-slate-100 px-5 py-3 bg-white flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onCancel}
                disabled={loading}
                className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors disabled:opacity-50 shadow-sm shadow-indigo-200"
              >
                {loading ? (
                  <FiLoader className="h-4 w-4 animate-spin" />
                ) : (
                  <FiPlay className="h-4 w-4" />
                )}
                Start
              </button>
            </div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
};

export default StartWorkingModal;
