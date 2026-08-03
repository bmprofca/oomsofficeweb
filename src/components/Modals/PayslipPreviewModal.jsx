import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { FiX, FiPlus, FiRotateCcw } from "react-icons/fi";

const formatCurrency = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  })}`;

const formatDate = (value) => {
  if (!value) return "—";
  const raw = String(value);
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
    const [y, m, d] = raw.slice(0, 10).split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("en-IN");
  }
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return raw.slice(0, 10);
  return d.toLocaleDateString("en-IN");
};

/**
 * Preview / confirm generate or regenerate payslip.
 * Props: isOpen, preview, loading, generating, onClose, onConfirm
 */
const PayslipPreviewModal = ({
  isOpen,
  preview,
  loading = false,
  generating = false,
  onClose,
  onConfirm,
}) => {
  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape" && !generating) onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, generating, onClose]);

  if (typeof document === "undefined") return null;

  const isRegen = Boolean(preview?.already_generated);
  const amountOk = Number(preview?.amount) > 0;
  const summary = preview?.attendance_summary || {};
  const bonusFine = preview?.bonus_fine || {};
  const busy = loading || generating;

  return createPortal(
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          key="payslip-preview-modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-[1100] flex items-center justify-center overflow-hidden overscroll-none p-3 sm:p-4 pointer-events-none"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm pointer-events-auto"
            aria-hidden="true"
            onClick={busy ? undefined : onClose}
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="payslip-preview-title"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="relative z-[1] pointer-events-auto flex w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-2xl max-h-[calc(100vh-1.5rem)] sm:max-h-[calc(100vh-2rem)]"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="shrink-0 border-b border-slate-100 px-4 py-3 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2
                  id="payslip-preview-title"
                  className="m-0 text-sm font-semibold text-slate-900"
                >
                  {isRegen ? "Regenerate salary" : "Generate salary"}
                </h2>
                {preview ? (
                  <p className="m-0 mt-0.5 text-xs text-slate-500">
                    {preview.month_name} {preview.year}
                    {isRegen ? " · Updates existing ledger entry" : " · Credits staff ledger"}
                  </p>
                ) : (
                  <p className="m-0 mt-0.5 text-xs text-slate-500">Loading preview…</p>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                disabled={busy}
                className="shrink-0 inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-50 hover:text-slate-600 disabled:opacity-50"
                aria-label="Close"
              >
                <FiX className="w-4 h-4" />
              </button>
            </header>

            <div
              className="px-4 py-3 flex-1 min-h-0 overflow-y-auto overscroll-y-contain [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
              {loading && !preview ? (
                <p className="text-sm text-slate-500 py-6 text-center">Loading preview…</p>
              ) : preview ? (
                <div className="space-y-3">
                  <div className="rounded-xl border border-teal-100 bg-teal-50/70 px-3 py-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-teal-700/80">
                        Payable amount
                      </p>
                      <p className="mt-0.5 text-xl font-semibold tabular-nums text-teal-900">
                        {formatCurrency(preview.amount)}
                      </p>
                      <p className="mt-1 text-xs text-teal-800/80">
                        Txn date: {formatDate(preview.transaction_date)}
                      </p>
                    </div>
                    {isRegen && preview.amount_delta != null ? (
                      <div className="text-right shrink-0">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                          Previously
                        </p>
                        <p className="mt-0.5 text-sm font-semibold tabular-nums text-slate-800">
                          {formatCurrency(preview.previous_amount)}
                        </p>
                        <p
                          className={`mt-0.5 text-xs font-semibold tabular-nums ${
                            Number(preview.amount_delta) > 0
                              ? "text-emerald-700"
                              : Number(preview.amount_delta) < 0
                                ? "text-rose-600"
                                : "text-slate-500"
                          }`}
                        >
                          {Number(preview.amount_delta) >= 0 ? "+" : ""}
                          {formatCurrency(preview.amount_delta)}
                        </p>
                      </div>
                    ) : null}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                    <div className="rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-2">
                      Present{" "}
                      <span className="font-semibold text-slate-800">
                        {summary.present_days ?? 0}
                      </span>
                    </div>
                    <div className="rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-2">
                      Half{" "}
                      <span className="font-semibold text-slate-800">
                        {summary.half_days ?? 0}
                      </span>
                    </div>
                    <div className="rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-2">
                      Leave{" "}
                      <span className="font-semibold text-slate-800">
                        {summary.leave_days ?? 0}
                      </span>
                    </div>
                    <div className="rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-2">
                      OT / Att. fine{" "}
                      <span className="font-semibold text-slate-800">
                        {formatCurrency(summary.total_overtime)} /{" "}
                        {formatCurrency(summary.total_fine)}
                      </span>
                    </div>
                    <div className="rounded-lg border border-emerald-100 bg-emerald-50/60 px-2.5 py-2 col-span-1">
                      Bonus{" "}
                      <span className="font-semibold text-emerald-800 tabular-nums">
                        {formatCurrency(bonusFine.total_bonus)}
                      </span>
                    </div>
                    <div className="rounded-lg border border-rose-100 bg-rose-50/60 px-2.5 py-2 col-span-1">
                      Fine{" "}
                      <span className="font-semibold text-rose-800 tabular-nums">
                        {formatCurrency(bonusFine.total_fine)}
                      </span>
                    </div>
                  </div>

                  {Array.isArray(bonusFine.items) && bonusFine.items.length > 0 ? (
                    <div className="rounded-lg border border-slate-100 px-2.5 py-2 space-y-1">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 m-0">
                        Bonus / fine this month
                      </p>
                      {bonusFine.items.map((item) => (
                        <div
                          key={item.entry_id}
                          className="flex items-start justify-between gap-2 text-xs"
                        >
                          <span className="min-w-0 text-slate-600 truncate">
                            <span
                              className={`font-semibold ${
                                item.type === "bonus"
                                  ? "text-emerald-700"
                                  : "text-rose-700"
                              }`}
                            >
                              {item.type === "bonus" ? "Bonus" : "Fine"}
                            </span>
                            {item.remark ? ` · ${item.remark}` : ""}
                          </span>
                          <span className="shrink-0 font-semibold tabular-nums text-slate-800">
                            {formatCurrency(item.amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  {!amountOk ? (
                    <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-2.5 py-2">
                      No payable amount for this month. Mark attendance or add a
                      bonus first.
                    </p>
                  ) : null}
                </div>
              ) : (
                <p className="text-sm text-slate-500 py-6 text-center">
                  Preview unavailable.
                </p>
              )}
            </div>

            <footer className="shrink-0 border-t border-slate-100 bg-slate-50/80 px-4 py-3 flex gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={busy}
                className="flex-1 h-9 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-white disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={busy || !preview || !amountOk}
                className="flex-1 h-9 inline-flex items-center justify-center gap-1.5 rounded-lg bg-teal-600 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
              >
                {generating ? (
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : isRegen ? (
                  <FiRotateCcw className="w-3.5 h-3.5" />
                ) : (
                  <FiPlus className="w-3.5 h-3.5" />
                )}
                {generating
                  ? isRegen
                    ? "Updating…"
                    : "Generating…"
                  : isRegen
                    ? "Confirm update"
                    : "Confirm generate"}
              </button>
            </footer>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
};

export default PayslipPreviewModal;
