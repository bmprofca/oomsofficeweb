import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { FiX, FiPlus, FiEdit2, FiTrash2 } from "react-icons/fi";
import { MonthPickerField } from "../PortalMonthPicker";

const INPUT_CLASS =
  "w-full h-10 text-sm border border-slate-200 rounded-xl bg-white outline-none transition focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 px-3 disabled:bg-slate-50";

const LABEL_CLASS = "mb-1.5 block text-xs font-semibold text-slate-600";

function sanitizeDecimal(raw) {
  let next = String(raw ?? "").replace(/[^\d.]/g, "");
  const firstDot = next.indexOf(".");
  if (firstDot === -1) return next;
  return (
    next.slice(0, firstDot + 1) + next.slice(firstDot + 1).replace(/\./g, "")
  );
}

const emptyForm = {
  type: "bonus",
  month: null,
  year: null,
  amount: "",
  remark: "",
};

/**
 * Create / edit / delete staff bonus or fine for a month.
 * modes: create | edit | delete
 */
const BonusFineModal = ({
  isOpen,
  mode = "create",
  entry = null,
  username,
  saving = false,
  onClose,
  onSubmit,
  onConfirmDelete,
}) => {
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    setError("");
    if ((mode === "edit" || mode === "delete") && entry) {
      setForm({
        type: entry.type === "fine" ? "fine" : "bonus",
        month: Number(entry.month) || null,
        year: Number(entry.year) || null,
        amount: entry.amount != null ? String(entry.amount) : "",
        remark: entry.remark || "",
      });
    } else {
      const now = new Date();
      const m = now.getMonth() + 1;
      setForm({
        ...emptyForm,
        type: "bonus",
        month: m > 1 ? m - 1 : 12,
        year: m > 1 ? now.getFullYear() : now.getFullYear() - 1,
        amount: "",
        remark: "",
      });
    }
  }, [isOpen, mode, entry]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape" && !saving) onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, saving, onClose]);

  if (typeof document === "undefined") return null;

  const isDelete = mode === "delete";
  const isEdit = mode === "edit";
  const title = isDelete
    ? "Delete entry"
    : isEdit
      ? "Edit bonus / fine"
      : "Add bonus / fine";

  const handleSubmit = () => {
    if (isDelete) {
      onConfirmDelete?.(entry);
      return;
    }
    if (!username) {
      setError("Staff username missing");
      return;
    }
    if (!form.month || !form.year) {
      setError("Select a month");
      return;
    }
    const amount = Math.abs(parseFloat(form.amount));
    if (!Number.isFinite(amount) || !(amount > 0)) {
      setError("Enter a valid amount");
      return;
    }
    const remark = String(form.remark || "").trim();
    if (!remark) {
      setError("Remark is required");
      return;
    }
    setError("");
    onSubmit?.({
      entry_id: entry?.entry_id,
      username,
      type: form.type,
      month: form.month,
      year: form.year,
      amount,
      remark,
    });
  };

  return createPortal(
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          key="bonus-fine-modal"
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
            onClick={saving ? undefined : onClose}
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="bonus-fine-title"
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
                  id="bonus-fine-title"
                  className="m-0 text-sm font-semibold text-slate-900"
                >
                  {title}
                </h2>
                <p className="m-0 mt-0.5 text-xs text-slate-500">
                  {isDelete
                    ? "This removes the entry from future payslips."
                    : "Applies to salary for the selected month."}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="shrink-0 inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-50 hover:text-slate-600 disabled:opacity-50"
                aria-label="Close"
              >
                <FiX className="w-4 h-4" />
              </button>
            </header>

            <div className="px-4 py-3 flex-1 min-h-0 overflow-y-auto overscroll-y-contain [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              {isDelete ? (
                <div className="rounded-xl border border-rose-100 bg-rose-50/70 px-3 py-3 text-sm text-rose-900">
                  <p className="m-0 font-semibold">
                    {entry?.type === "fine" ? "Fine" : "Bonus"} · ₹
                    {Number(entry?.amount || 0).toLocaleString("en-IN", {
                      maximumFractionDigits: 2,
                    })}
                  </p>
                  <p className="m-0 mt-1 text-xs text-rose-800/80">
                    {entry?.month_name || entry?.month} {entry?.year}
                    {entry?.remark ? ` · ${entry.remark}` : ""}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <span className={LABEL_CLASS}>Type</span>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { value: "bonus", label: "Bonus" },
                        { value: "fine", label: "Fine" },
                      ].map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() =>
                            setForm((prev) => ({ ...prev, type: opt.value }))
                          }
                          className={`h-10 rounded-xl border text-sm font-semibold transition ${
                            form.type === opt.value
                              ? opt.value === "bonus"
                                ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                                : "border-rose-300 bg-rose-50 text-rose-800"
                              : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <MonthPickerField
                    label="Salary month"
                    value={
                      form.month && form.year
                        ? { month: form.month, year: form.year }
                        : null
                    }
                    onChange={(next) =>
                      setForm((prev) => ({
                        ...prev,
                        month: next?.month || null,
                        year: next?.year || null,
                      }))
                    }
                    placeholder="Select month"
                    buttonClassName={INPUT_CLASS}
                    showResetButton={false}
                  />

                  <div>
                    <label className={LABEL_CLASS} htmlFor="bf-amount">
                      Amount (₹)
                    </label>
                    <input
                      id="bf-amount"
                      type="text"
                      inputMode="decimal"
                      value={form.amount}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          amount: sanitizeDecimal(e.target.value),
                        }))
                      }
                      className={INPUT_CLASS}
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <label className={LABEL_CLASS} htmlFor="bf-remark">
                      Remark
                    </label>
                    <textarea
                      id="bf-remark"
                      rows={3}
                      value={form.remark}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          remark: e.target.value,
                        }))
                      }
                      className="w-full text-sm border border-slate-200 rounded-xl bg-white outline-none transition focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 px-3 py-2 resize-none"
                      placeholder="e.g. Festival bonus, late coming fine…"
                      maxLength={500}
                    />
                  </div>
                </div>
              )}

              {error ? (
                <p className="mt-3 text-xs text-rose-600 m-0">{error}</p>
              ) : null}
            </div>

            <footer className="shrink-0 border-t border-slate-100 bg-slate-50/80 px-4 py-3 flex gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="flex-1 h-9 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-white disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={saving}
                className={`flex-1 h-9 inline-flex items-center justify-center gap-1.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50 ${
                  isDelete
                    ? "bg-rose-600 hover:bg-rose-700"
                    : "bg-teal-600 hover:bg-teal-700"
                }`}
              >
                {saving ? (
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : isDelete ? (
                  <FiTrash2 className="w-3.5 h-3.5" />
                ) : isEdit ? (
                  <FiEdit2 className="w-3.5 h-3.5" />
                ) : (
                  <FiPlus className="w-3.5 h-3.5" />
                )}
                {saving
                  ? "Saving…"
                  : isDelete
                    ? "Delete"
                    : isEdit
                      ? "Save changes"
                      : "Add"}
              </button>
            </footer>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
};

export default BonusFineModal;
