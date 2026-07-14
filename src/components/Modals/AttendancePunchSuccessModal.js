import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { FiCheck, FiClock, FiLogIn, FiLogOut, FiX } from 'react-icons/fi';

const formatPunchTime = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const TYPE_META = {
  'punch-in': {
    title: 'Punch In Successful',
    subtitle: 'Your workday has started.',
    icon: FiLogIn,
    headerClass: 'from-emerald-600 via-green-600 to-teal-600',
    ringClass: 'ring-emerald-100',
    iconWrapClass: 'bg-emerald-100 text-emerald-600',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    badgeLabel: 'Checked In',
  },
  'punch-out': {
    title: 'Punch Out Successful',
    subtitle: 'Your attendance for today is complete.',
    icon: FiLogOut,
    headerClass: 'from-orange-600 via-amber-600 to-yellow-600',
    ringClass: 'ring-orange-100',
    iconWrapClass: 'bg-orange-100 text-orange-600',
    badgeClass: 'bg-orange-50 text-orange-700 border-orange-200',
    badgeLabel: 'Checked Out',
  },
};

const AttendancePunchSuccessModal = ({
  isOpen,
  onClose,
  type = 'punch-in',
  message = '',
  punchInTime = null,
  punchOutTime = null,
  totalHours = null,
}) => {
  const meta = TYPE_META[type] || TYPE_META['punch-in'];
  const Icon = meta.icon;

  useEffect(() => {
    if (!isOpen) return undefined;

    const onKey = (event) => {
      if (event.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  return createPortal(
    <AnimatePresence>
      {isOpen ? (
        <div className="fixed inset-0 z-[10050] flex items-center justify-center overflow-hidden overscroll-none p-3 sm:p-4 pointer-events-none">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-slate-900/55 backdrop-blur-sm pointer-events-auto"
            onClick={onClose}
            aria-hidden="true"
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="attendance-punch-success-title"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className={`relative z-[1] pointer-events-auto w-full max-w-md my-2 sm:my-4 max-h-[calc(100vh-1.5rem)] sm:max-h-[calc(100vh-2rem)] overflow-hidden flex flex-col rounded-2xl bg-white shadow-2xl ring-1 ${meta.ringClass}`}
            onClick={(event) => event.stopPropagation()}
          >
            <div className={`shrink-0 px-5 py-4 bg-gradient-to-r ${meta.headerClass} flex items-start justify-between gap-3`}>
              <div className="min-w-0">
                <h2 id="attendance-punch-success-title" className="text-base font-semibold text-white">
                  {meta.title}
                </h2>
                <p className="text-xs text-white/85 mt-0.5">{meta.subtitle}</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white/90 hover:bg-white/15 transition-colors"
                aria-label="Close"
              >
                <FiX size={16} />
              </button>
            </div>

            <div className="px-5 py-5 flex-1 min-h-0 overflow-y-auto overscroll-y-contain [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              <div className="flex flex-col items-center text-center">
                <motion.div
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.08, type: 'spring', stiffness: 260, damping: 18 }}
                  className={`relative mb-4 flex h-20 w-20 items-center justify-center rounded-full ${meta.iconWrapClass}`}
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.18, type: 'spring', stiffness: 320, damping: 16 }}
                    className="absolute -right-1 -top-1 flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-md ring-2 ring-white"
                  >
                    <FiCheck className="h-4 w-4 text-emerald-600" />
                  </motion.div>
                  <Icon className="h-9 w-9" />
                </motion.div>

                <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${meta.badgeClass}`}>
                  {meta.badgeLabel}
                </span>

                {message ? (
                  <p className="mt-3 text-sm text-slate-700">{message}</p>
                ) : null}

                <div className="mt-4 w-full rounded-xl border border-slate-100 bg-slate-50/80 p-3 text-left space-y-2">
                  {punchInTime ? (
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-slate-500">Punch In</span>
                      <span className="font-medium text-slate-800">{formatPunchTime(punchInTime)}</span>
                    </div>
                  ) : null}
                  {type === 'punch-out' && punchOutTime ? (
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-slate-500">Punch Out</span>
                      <span className="font-medium text-slate-800">{formatPunchTime(punchOutTime)}</span>
                    </div>
                  ) : null}
                  {type === 'punch-out' && totalHours != null ? (
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-slate-500">Total Hours</span>
                      <span className="font-medium text-slate-800">{totalHours}</span>
                    </div>
                  ) : null}
                </div>

                <p className="mt-4 inline-flex items-center gap-1.5 text-xs text-slate-500">
                  <FiClock className="h-3.5 w-3.5" />
                  Recorded just now
                </p>
              </div>
            </div>

            <div className="shrink-0 border-t border-slate-100 px-5 py-3 bg-white">
              <button
                type="button"
                onClick={onClose}
                className="w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 transition-colors"
              >
                Done
              </button>
            </div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
};

export default AttendancePunchSuccessModal;
