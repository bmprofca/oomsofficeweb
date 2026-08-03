import React, { useState, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { FaCheck } from "react-icons/fa";
import { FiChevronLeft, FiChevronRight, FiX } from "react-icons/fi";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const MONTHS_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/** @returns {{ month: number, year: number } | null} month 1–12 */
export function parseMonthValue(value) {
  if (value == null || value === "") return null;
  if (typeof value === "object" && value.month != null && value.year != null) {
    const month = Number(value.month);
    const year = Number(value.year);
    if (
      Number.isFinite(month) &&
      month >= 1 &&
      month <= 12 &&
      Number.isFinite(year)
    ) {
      return { month, year };
    }
    return null;
  }
  if (typeof value === "string") {
    const m = value.trim().match(/^(\d{4})-(\d{1,2})$/);
    if (!m) return null;
    const year = Number(m[1]);
    const month = Number(m[2]);
    if (
      Number.isFinite(month) &&
      month >= 1 &&
      month <= 12 &&
      Number.isFinite(year)
    ) {
      return { month, year };
    }
  }
  return null;
}

export function toMonthValue({ month, year }) {
  if (!month || !year) return "";
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function formatMonthLabel(value, { short = false } = {}) {
  const parsed = parseMonthValue(value);
  if (!parsed) return "";
  const names = short ? MONTHS_SHORT : MONTHS;
  return `${names[parsed.month - 1]} ${parsed.year}`;
}

export function isMonthPickerPortalOpen() {
  if (typeof document === "undefined") return false;
  return Boolean(document.querySelector('[data-monthpicker-portal="true"]'));
}

function usePickerPortalEscapeClose(open, setOpen) {
  const close = useCallback(() => setOpen(false), [setOpen]);
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      e.stopPropagation();
      close();
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [open, close]);
}

function PickerPortalOverlay({ open, onClose, popoverClassName, portalKey, children }) {
  const [portalMounted, setPortalMounted] = useState(false);

  useEffect(() => {
    if (open) setPortalMounted(true);
  }, [open]);

  if (!portalMounted || typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence
      onExitComplete={() => {
        if (!open) setPortalMounted(false);
      }}
    >
      {open && (
        <motion.div
          key={portalKey}
          data-monthpicker-portal="true"
          className="fixed inset-0 z-[10200] grid place-items-center overflow-y-auto bg-black/45 p-3 sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
          onClick={onClose}
          role="presentation"
        >
          <motion.div
            className={`relative w-full max-w-[min(21rem,calc(100vw-1.5rem))] min-w-0 ${popoverClassName}`.trim()}
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ type: "spring", damping: 26, stiffness: 340 }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Select month"
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

function buildQuickPresets() {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  const last = m === 1 ? { month: 12, year: y - 1 } : { month: m - 1, year: y };
  return [
    { key: "tm", label: "This month", month: m, year: y },
    { key: "lm", label: "Last month", month: last.month, year: last.year },
  ];
}

/**
 * Inner month grid panel (portal content).
 */
function MonthPickerPanel({
  initialValue = null,
  minYear = 2000,
  maxYear = 2100,
  showResetButton = true,
  onApply,
  onRequestClose,
}) {
  const initial = parseMonthValue(initialValue);
  const now = new Date();
  const [viewYear, setViewYear] = useState(
    () => initial?.year || now.getFullYear(),
  );
  const [selected, setSelected] = useState(() => initial);
  const [tab, setTab] = useState("months");
  const [quickKey, setQuickKey] = useState("tm");
  const [feedback, setFeedback] = useState("");

  const presets = useMemo(() => buildQuickPresets(), []);

  const clampYear = useCallback(
    (y) => Math.min(maxYear, Math.max(minYear, y)),
    [minYear, maxYear],
  );

  useEffect(() => {
    setViewYear((y) => clampYear(y));
  }, [clampYear]);

  const isSelected = (month) =>
    selected && selected.year === viewYear && selected.month === month;

  const isCurrent = (month) =>
    now.getFullYear() === viewYear && now.getMonth() + 1 === month;

  const applySelection = (next) => {
    if (!next) return;
    if (next.year < minYear || next.year > maxYear) {
      setFeedback("Year is out of range.");
      setTimeout(() => setFeedback(""), 2000);
      return;
    }
    onApply?.(next);
  };

  const handleApply = () => {
    if (tab === "quick") {
      const p = presets.find((x) => x.key === quickKey);
      if (!p) {
        setFeedback("Please select a preset.");
        setTimeout(() => setFeedback(""), 2000);
        return;
      }
      applySelection({ month: p.month, year: p.year });
      return;
    }
    if (!selected) {
      setFeedback("Please select a month.");
      setTimeout(() => setFeedback(""), 2000);
      return;
    }
    applySelection(selected);
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl shadow-slate-900/10">
      <div className="flex items-center justify-between gap-2 border-b border-gray-100 bg-gradient-to-r from-slate-50 via-white to-blue-50/40 px-3 py-2.5">
        <p className="text-sm font-semibold text-slate-800">Select month</p>
        {onRequestClose ? (
          <button
            type="button"
            onClick={onRequestClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close"
          >
            <FiX className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      <div className="flex gap-1 border-b border-gray-100 bg-slate-50/80 p-1.5">
        {[
          { key: "quick", label: "Quick select" },
          { key: "months", label: "Months" },
        ].map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-semibold transition ${
              tab === t.key
                ? "bg-white text-blue-600 shadow-sm ring-1 ring-blue-100"
                : "text-slate-500 hover:bg-white/70 hover:text-slate-800"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="p-3">
        {tab === "quick" ? (
          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {presets.map((p) => {
              const active = quickKey === p.key;
              return (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => {
                    setQuickKey(p.key);
                    setSelected({ month: p.month, year: p.year });
                    setViewYear(p.year);
                  }}
                  className={`rounded-xl border px-3 py-2.5 text-left text-xs font-semibold transition ${
                    active
                      ? "border-blue-500 bg-blue-50 text-blue-700 ring-1 ring-blue-200"
                      : "border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <span className="block">{p.label}</span>
                  <span className="mt-0.5 block text-[11px] font-medium text-slate-500">
                    {MONTHS_SHORT[p.month - 1]} {p.year}
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <>
            <div className="mb-3 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setViewYear((y) => clampYear(y - 1))}
                disabled={viewYear <= minYear}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-gray-200 text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-40"
                aria-label="Previous year"
              >
                <FiChevronLeft className="h-4 w-4" />
              </button>
              <p className="text-sm font-semibold tabular-nums text-slate-800">
                {viewYear}
              </p>
              <button
                type="button"
                onClick={() => setViewYear((y) => clampYear(y + 1))}
                disabled={viewYear >= maxYear}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-gray-200 text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-40"
                aria-label="Next year"
              >
                <FiChevronRight className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
              {MONTHS_SHORT.map((label, idx) => {
                const month = idx + 1;
                const selectedMonth = isSelected(month);
                const currentMonth = isCurrent(month);
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setSelected({ month, year: viewYear })}
                    className={`rounded-xl px-2 py-2.5 text-xs font-semibold transition sm:text-sm ${
                      selectedMonth
                        ? "bg-blue-500 text-white shadow-sm shadow-blue-500/25"
                        : currentMonth
                          ? "bg-blue-50 text-blue-600 ring-1 ring-blue-100"
                          : "text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {feedback ? (
          <p className="mt-2 text-center text-xs font-medium text-rose-600">
            {feedback}
          </p>
        ) : null}

        <div className="mt-3 flex flex-col-reverse gap-2 border-t border-gray-100 pt-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="truncate text-xs text-slate-500">
            {selected
              ? formatMonthLabel(selected)
              : tab === "quick"
                ? presets.find((p) => p.key === quickKey)?.label || "—"
                : "Pick a month"}
          </p>
          <div className="flex items-center gap-2">
            {showResetButton ? (
              <button
                type="button"
                onClick={() => {
                  setSelected(null);
                  setQuickKey("tm");
                  setViewYear(now.getFullYear());
                }}
                className="rounded-md border border-gray-200 px-3 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
              >
                Reset
              </button>
            ) : null}
            <button
              type="button"
              onClick={handleApply}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-blue-500 px-3 py-2 text-white transition-colors hover:bg-blue-600 sm:w-auto"
              title="Apply"
              aria-label="Apply"
            >
              <FaCheck className="text-[11px]" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Field trigger + portal month picker (PortalDatePicker-style).
 *
 * value / onChange use `{ month: 1-12, year }` objects.
 * Also accepts / emits via optional `valueFormat="yyyy-mm"` as `YYYY-MM` strings.
 */
export function MonthPickerField({
  value,
  onChange,
  placeholder = "Select month",
  buttonClassName = "",
  wrapperClassName = "",
  popoverClassName = "",
  label,
  disabled = false,
  minYear = 2000,
  maxYear = 2100,
  showResetButton = true,
  valueFormat = "object",
}) {
  const [open, setOpen] = useState(false);
  const parsed = parseMonthValue(value);
  usePickerPortalEscapeClose(open, setOpen);

  const display = parsed ? formatMonthLabel(parsed) : "";

  const emit = (next) => {
    if (!next) {
      onChange?.(valueFormat === "yyyy-mm" ? "" : null);
      return;
    }
    if (valueFormat === "yyyy-mm") {
      onChange?.(toMonthValue(next));
      return;
    }
    onChange?.(next);
  };

  return (
    <div className={`relative ${wrapperClassName}`.trim()}>
      {label ? (
        <label className="mb-1.5 block text-xs font-semibold text-slate-600">
          {label}
        </label>
      ) : null}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((prev) => !prev)}
        className={`${buttonClassName} flex items-center justify-between gap-2 disabled:cursor-not-allowed disabled:opacity-50`.trim()}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span
          className={`min-w-0 flex-1 truncate text-left text-xs sm:text-sm ${
            display ? "text-slate-800" : "text-gray-400"
          }`}
        >
          {display || placeholder}
        </span>
        <span className="flex-shrink-0 text-[10px] text-gray-400">▾</span>
      </button>

      <PickerPortalOverlay
        open={open}
        onClose={() => setOpen(false)}
        popoverClassName={popoverClassName}
        portalKey="portal-monthpicker-field"
      >
        <MonthPickerPanel
          initialValue={parsed}
          minYear={minYear}
          maxYear={maxYear}
          showResetButton={showResetButton}
          onRequestClose={() => setOpen(false)}
          onApply={(next) => {
            emit(next);
            setOpen(false);
          }}
        />
      </PickerPortalOverlay>
    </div>
  );
}

export default MonthPickerField;
