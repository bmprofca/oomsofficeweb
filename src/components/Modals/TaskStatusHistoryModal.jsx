import React, { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { FiX, FiClock, FiUser, FiCheck } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import API_BASE_URL from '../../utils/api-controller';
import getHeaders from '../../utils/get-headers';

const STATUS_META = {
  'in process': {
    chip: 'bg-orange-50 text-orange-700 ring-1 ring-orange-200/80',
    node: 'bg-orange-500 ring-orange-100',
    accent: 'border-l-orange-400',
  },
  'pending from client': {
    chip: 'bg-purple-50 text-purple-700 ring-1 ring-purple-200/80',
    node: 'bg-purple-500 ring-purple-100',
    accent: 'border-l-purple-400',
  },
  'pending from department': {
    chip: 'bg-amber-50 text-amber-800 ring-1 ring-amber-200/80',
    node: 'bg-amber-500 ring-amber-100',
    accent: 'border-l-amber-400',
  },
  complete: {
    chip: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/80',
    node: 'bg-emerald-500 ring-emerald-100',
    accent: 'border-l-emerald-400',
  },
  cancel: {
    chip: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200/80',
    node: 'bg-rose-500 ring-rose-100',
    accent: 'border-l-rose-400',
  },
};

const DEFAULT_META = {
  chip: 'bg-slate-50 text-slate-700 ring-1 ring-slate-200/80',
  node: 'bg-slate-400 ring-slate-100',
  accent: 'border-l-slate-300',
};

const STATUS_LABELS = {
  'in process': 'In Process',
  'pending from client': 'Pending from Client',
  'pending from department': 'Pending from Department',
  complete: 'Complete',
  cancel: 'Cancel',
};

function getStatusMeta(status) {
  const key = String(status || '').toLowerCase();
  return STATUS_META[key] || DEFAULT_META;
}

function formatStatusLabel(status) {
  if (!status) return 'Unknown';
  const key = String(status).toLowerCase();
  return STATUS_LABELS[key] || status;
}

function formatDateTime(value) {
  if (!value) return '—';
  const raw = String(value).trim();
  const normalized = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(raw)
    ? raw.replace(' ', 'T')
    : raw;
  const d = new Date(normalized);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

const SkeletonPulse = ({ className = '' }) => (
  <div className={`animate-pulse rounded bg-slate-200/80 ${className}`} />
);

const HistoryListSkeleton = () => (
  <ul className="space-y-0">
    {Array.from({ length: 5 }).map((_, index) => (
      <li key={index} className="relative flex gap-3">
        <div className="flex w-7 shrink-0 flex-col items-center">
          <span className="mt-1.5 h-3.5 w-3.5 shrink-0 rounded-full bg-slate-200 ring-4 ring-white" />
          {index < 4 ? (
            <div className="mt-1 w-0.5 flex-1 min-h-[12px] bg-slate-200" />
          ) : (
            <div className="mt-1 w-0.5 flex-1 min-h-[12px] bg-transparent" />
          )}
        </div>
        <div className="mb-3 min-w-0 flex-1 rounded-lg border border-slate-100 border-l-[3px] border-l-slate-200 bg-white px-2.5 py-2 last:mb-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <SkeletonPulse className="h-5 w-24 rounded-full" />
            {index === 0 ? (
              <SkeletonPulse className="h-4 w-12 rounded-full" />
            ) : null}
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
            <SkeletonPulse className="h-3 w-32" />
            <SkeletonPulse className="h-3 w-20" />
          </div>
        </div>
      </li>
    ))}
  </ul>
);

/**
 * Viewport-safe status history modal (CLIENT/context/modal.md).
 * Fade-only; fixed header/footer; scrollable body with hidden scrollbar.
 */
export default function TaskStatusHistoryModal({
  isOpen = false,
  taskId,
  onClose,
}) {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);

  const fetchHistory = useCallback(async () => {
    if (!taskId) return;
    setLoading(true);
    try {
      const headers = getHeaders();
      if (!headers) throw new Error('Authentication required');
      const res = await fetch(
        `${API_BASE_URL}/task/${encodeURIComponent(taskId)}/status-history`,
        { headers }
      );
      const result = await res.json().catch(() => ({}));
      if (!res.ok || !result.success) {
        throw new Error(result.message || 'Failed to load status history');
      }
      setRows(Array.isArray(result.data) ? result.data : []);
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Failed to load status history');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    if (!isOpen) return undefined;
    fetchHistory();
    return undefined;
  }, [isOpen, fetchHistory]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          key="task-status-history-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-[210] flex items-center justify-center overflow-hidden overscroll-none p-3 sm:p-4 pointer-events-none"
        >
          <motion.button
            type="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm pointer-events-auto"
            aria-label="Close"
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="task-status-history-title"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="relative z-[1] pointer-events-auto flex h-[min(32rem,calc(100vh-2rem))] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex shrink-0 items-center justify-between border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-white px-5 py-3.5">
              <div className="min-w-0">
                <h2
                  id="task-status-history-title"
                  className="m-0 text-base font-bold text-gray-900"
                >
                  Status History
                </h2>
                <p className="mt-0.5 truncate text-xs text-gray-500">
                  Task {taskId || '—'}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
              >
                <FiX className="h-5 w-5" />
              </button>
            </div>

            <div
              className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-y-contain px-4 py-3 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {loading ? (
                <HistoryListSkeleton />
              ) : rows.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-center">
                  <FiClock className="h-6 w-6 text-gray-300" />
                  <p className="mt-2 text-sm font-medium text-gray-700">
                    No status changes yet
                  </p>
                  <p className="mt-0.5 text-xs text-gray-500">
                    Status updates for this task will appear here.
                  </p>
                </div>
              ) : (
                <ul className="min-h-full space-y-0">
                  {rows.map((row, index) => {
                    const meta = getStatusMeta(row.status);
                    const byName =
                      row.create_by?.name ||
                      row.create_by?.username ||
                      '—';
                    const isLatest = index === 0;
                    const isLast = index === rows.length - 1;
                    const isComplete =
                      String(row.status || '').toLowerCase() === 'complete';

                    return (
                      <li
                        key={row.id || index}
                        className="relative flex gap-3"
                      >
                        {/* Dot + connector line to next item */}
                        <div className="flex w-7 shrink-0 flex-col items-center self-stretch">
                          <span
                            className={`relative z-[1] mt-1.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full ring-[3px] ring-white shadow-sm ${meta.node} ${
                              isLatest ? 'h-4 w-4 shadow' : ''
                            }`}
                          >
                            {isComplete ? (
                              <FiCheck
                                className="h-2 w-2 text-white"
                                strokeWidth={3}
                              />
                            ) : isLatest ? (
                              <span className="h-1 w-1 rounded-full bg-white" />
                            ) : null}
                          </span>
                          {!isLast ? (
                            <div
                              className="mt-1 w-0.5 flex-1 bg-slate-300"
                              aria-hidden
                            />
                          ) : null}
                        </div>

                        {/* Card */}
                        <div
                          className={`mb-3 min-w-0 flex-1 rounded-lg border border-slate-200/90 border-l-[3px] bg-white px-2.5 py-2 shadow-[0_1px_2px_rgba(15,23,42,0.04)] ${meta.accent} ${
                            isLatest ? 'bg-slate-50/50' : ''
                          } ${isLast ? 'mb-0' : ''}`}
                        >
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span
                              className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold leading-none ${meta.chip}`}
                            >
                              {formatStatusLabel(row.status)}
                            </span>
                            {isLatest ? (
                              <span className="inline-flex items-center rounded-full bg-indigo-600/90 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide leading-none text-white">
                                Latest
                              </span>
                            ) : null}
                          </div>
                          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] leading-snug text-slate-500">
                            <span className="inline-flex items-center gap-1">
                              <FiClock className="h-3 w-3 shrink-0 text-slate-400" />
                              {formatDateTime(row.create_date)}
                            </span>
                            <span className="inline-flex min-w-0 items-center gap-1">
                              <FiUser className="h-3 w-3 shrink-0 text-slate-400" />
                              <span className="truncate font-medium text-slate-700">
                                {byName}
                              </span>
                            </span>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="flex shrink-0 justify-end border-t border-gray-100 bg-gray-50 px-5 py-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
              >
                Close
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body
  );
}
