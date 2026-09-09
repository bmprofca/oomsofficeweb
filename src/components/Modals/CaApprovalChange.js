import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiCheckCircle,
  FiClock,
  FiInfo,
  FiLoader,
  FiSend,
  FiShield,
  FiX,
} from 'react-icons/fi';

const OPTION_META = {
  pending: {
    label: 'Pending',
    hint: 'CA review has not started yet.',
    icon: FiClock,
    className: 'bg-amber-50 text-amber-800 border-amber-200',
    selectedRing: 'ring-amber-400',
  },
  sent: {
    label: 'Sent',
    hint: 'Waiting for CA to provide UDIN.',
    icon: FiSend,
    className: 'bg-sky-50 text-sky-800 border-sky-200',
    selectedRing: 'ring-sky-400',
  },
  complete: {
    label: 'Complete',
    hint: 'CA approval finished. Task can proceed to completion.',
    icon: FiCheckCircle,
    className: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    selectedRing: 'ring-emerald-400',
  },
};

/**
 * Confirm CA approval status change (pending / sent / complete).
 */
export default function CaApprovalChange({
  isOpen,
  onClose,
  taskName = '',
  currentApproval = 'pending',
  options = [],
  onConfirm,
}) {
  const [selected, setSelected] = useState('');
  const [loading, setLoading] = useState(false);

  const currentKey = String(currentApproval || 'pending').toLowerCase().trim();

  useEffect(() => {
    if (isOpen) setSelected('');
  }, [isOpen, currentKey]);

  const handleConfirm = async () => {
    if (!selected || selected === currentKey) return;
    setLoading(true);
    try {
      await onConfirm(selected);
      onClose();
    } catch {
      // Keep modal open on failure (caller shows toast)
    } finally {
      setLoading(false);
    }
  };

  const currentMeta = OPTION_META[currentKey] || OPTION_META.pending;
  const selectedMeta = selected ? OPTION_META[selected] : null;
  const isDisabled = loading || !selected || selected === currentKey;

  return (
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden overscroll-none bg-black/50 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="flex max-h-[min(82vh,100dvh)] w-full max-w-sm flex-col overflow-hidden rounded-xl bg-white shadow-2xl"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="shrink-0 bg-gradient-to-r from-violet-600 to-indigo-700 px-4 py-3 text-white">
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/20">
                    <FiShield className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base font-bold">Change CA Approval</h3>
                    <p className="truncate text-xs text-violet-100">
                      {taskName || 'Task'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg p-1 text-white hover:bg-white/10"
                  aria-label="Close"
                >
                  <FiX className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto border-b border-gray-200 p-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              <div className="mb-3 flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Current
                </span>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${currentMeta.className}`}
                >
                  <currentMeta.icon className="h-3 w-3" />
                  {currentMeta.label}
                </span>
              </div>

              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Select new status
              </p>
              <div className="space-y-1.5">
                {options.map((opt) => {
                  const value = String(opt.value || '').toLowerCase();
                  const meta = OPTION_META[value] || OPTION_META.pending;
                  const Icon = meta.icon;
                  const isCurrent = value === currentKey;
                  const isSelected = selected === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      disabled={isCurrent || loading}
                      onClick={() => setSelected(value)}
                      className={`flex w-full items-start justify-between gap-2 rounded-lg border p-2.5 text-left transition-all ${meta.className} ${
                        isSelected ? `ring-2 ${meta.selectedRing}` : ''
                      } ${isCurrent ? 'cursor-not-allowed opacity-70' : 'hover:brightness-[0.98]'}`}
                    >
                      <span className="flex min-w-0 items-start gap-2">
                        <Icon className="mt-0.5 h-4 w-4 shrink-0" />
                        <span className="min-w-0">
                          <span className="block text-sm font-semibold">
                            {opt.label || meta.label}
                          </span>
                          <span className="mt-0.5 block text-[11px] leading-snug opacity-80">
                            {meta.hint}
                          </span>
                        </span>
                      </span>
                      {isCurrent ? (
                        <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-semibold">
                          <FiCheckCircle className="h-3.5 w-3.5" />
                          Current
                        </span>
                      ) : isSelected ? (
                        <FiCheckCircle className="h-4 w-4 shrink-0" />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="shrink-0 bg-gray-50 px-4 py-3">
              {selected && selected !== currentKey ? (
                <div className="mb-2 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  <FiInfo className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <p>
                    Confirm changing CA approval from{' '}
                    <span className="font-semibold">{currentMeta.label}</span> to{' '}
                    <span className="font-semibold">
                      {selectedMeta?.label || selected}
                    </span>
                    .
                    {selected === 'sent'
                      ? ' An email may be sent to the assigned CA.'
                      : ''}
                  </p>
                </div>
              ) : null}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={isDisabled}
                  className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-700 px-3 py-1.5 text-sm font-medium text-white hover:from-violet-700 hover:to-indigo-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <FiLoader className="h-4 w-4 animate-spin" />
                      Updating…
                    </>
                  ) : (
                    'Confirm change'
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
