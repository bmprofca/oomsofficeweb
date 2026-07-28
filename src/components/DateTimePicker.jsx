import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  FiCalendar,
  FiChevronLeft,
  FiChevronRight,
  FiClock,
  FiX,
} from "react-icons/fi";

const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
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

const pad2 = (n) => String(n).padStart(2, "0");

/** Parse `YYYY-MM-DDTHH:mm` (or with seconds) into parts. */
export function parseDateTimeValue(value) {
  if (!value || typeof value !== "string") return null;
  const [datePart, timePartRaw] = value.split("T");
  if (!datePart) return null;
  const [y, m, d] = datePart.split("-").map(Number);
  if (!y || !m || !d) return null;
  const timePart = timePartRaw || "00:00";
  const [hh, mm] = timePart.split(":").map((x) => Number(x) || 0);
  return {
    year: y,
    month: m,
    day: d,
    hours: hh,
    minutes: mm,
    date: new Date(y, m - 1, d, hh, mm, 0, 0),
  };
}

/** Format local date + time as `YYYY-MM-DDTHH:mm`. */
export function toDateTimeLocalValue(date, hours = 0, minutes = 0) {
  if (!date) return "";
  const y = date.getFullYear();
  const m = pad2(date.getMonth() + 1);
  const d = pad2(date.getDate());
  return `${y}-${m}-${d}T${pad2(hours)}:${pad2(minutes)}`;
}

export function formatDateTimeDisplay(value) {
  const parsed = parseDateTimeValue(value);
  if (!parsed) return "";
  const dateLabel = parsed.date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const timeLabel = parsed.date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
  return `${dateLabel} · ${timeLabel}`;
}

function startOfDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function sameDay(a, b) {
  if (!a || !b) return false;
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * Date + time picker. Value uses `datetime-local` shape: `YYYY-MM-DDTHH:mm`.
 */
export default function DateTimePicker({
  value = "",
  onChange,
  disabled = false,
  placeholder = "Select date & time",
  className = "",
  inputClassName = "",
  minDate = null,
  maxDate = null,
  minuteStep = 5,
  clearable = true,
  label,
}) {
  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [panelPos, setPanelPos] = useState({ top: 0, left: 0, width: 320 });

  const parsed = useMemo(() => parseDateTimeValue(value), [value]);

  const [viewMonth, setViewMonth] = useState(() => {
    const base = parsed?.date || new Date();
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });
  const [draftDate, setDraftDate] = useState(() =>
    parsed ? startOfDay(parsed.date) : null,
  );
  const [draftHours, setDraftHours] = useState(parsed?.hours ?? 9);
  const [draftMinutes, setDraftMinutes] = useState(parsed?.minutes ?? 0);

  useEffect(() => {
    if (!open) return;
    const base = parsed?.date || new Date();
    setViewMonth(new Date(base.getFullYear(), base.getMonth(), 1));
    setDraftDate(parsed ? startOfDay(parsed.date) : null);
    setDraftHours(parsed?.hours ?? 9);
    setDraftMinutes(parsed?.minutes ?? 0);
  }, [open, parsed]);

  const updatePosition = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const width = Math.min(340, Math.max(300, rect.width));
    const gap = 8;
    let top = rect.bottom + gap;
    let left = rect.left;
    const panelH = 420;
    if (top + panelH > window.innerHeight - 8) {
      top = Math.max(8, rect.top - panelH - gap);
    }
    if (left + width > window.innerWidth - 8) {
      left = Math.max(8, window.innerWidth - width - 8);
    }
    setPanelPos({ top, left, width });
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    updatePosition();
    const onScroll = () => updatePosition();
    window.addEventListener("resize", onScroll);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      window.removeEventListener("resize", onScroll);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        setOpen(false);
      }
    };
    const onPointer = (e) => {
      if (
        panelRef.current?.contains(e.target) ||
        triggerRef.current?.contains(e.target)
      ) {
        return;
      }
      setOpen(false);
    };
    document.addEventListener("keydown", onKey, true);
    document.addEventListener("mousedown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey, true);
      document.removeEventListener("mousedown", onPointer);
    };
  }, [open]);

  const yearOptions = useMemo(() => {
    const now = new Date().getFullYear();
    const years = [];
    for (let y = now - 1; y <= now + 5; y += 1) years.push(y);
    return years;
  }, []);

  const minuteOptions = useMemo(() => {
    const step = Math.max(1, Number(minuteStep) || 5);
    const opts = [];
    for (let m = 0; m < 60; m += step) opts.push(m);
    if (parsed?.minutes != null && !opts.includes(parsed.minutes)) {
      opts.push(parsed.minutes);
      opts.sort((a, b) => a - b);
    }
    return opts;
  }, [minuteStep, parsed?.minutes]);

  const isDayDisabled = (date) => {
    const day = startOfDay(date);
    if (minDate && day < startOfDay(minDate)) return true;
    if (maxDate && day > startOfDay(maxDate)) return true;
    return false;
  };

  const applyDraft = () => {
    if (!draftDate) return;
    const next = toDateTimeLocalValue(draftDate, draftHours, draftMinutes);
    onChange?.(next);
    setOpen(false);
  };

  const setNow = () => {
    const now = new Date();
    const stepped =
      Math.round(now.getMinutes() / Math.max(1, minuteStep)) *
      Math.max(1, minuteStep);
    const mins = stepped >= 60 ? 0 : stepped;
    const hours = stepped >= 60 ? now.getHours() + 1 : now.getHours();
    setDraftDate(startOfDay(now));
    setDraftHours(hours % 24);
    setDraftMinutes(mins);
    setViewMonth(new Date(now.getFullYear(), now.getMonth(), 1));
  };

  const clearValue = (e) => {
    e?.stopPropagation?.();
    onChange?.("");
    setOpen(false);
  };

  const display = formatDateTimeDisplay(value);

  const y = viewMonth.getFullYear();
  const m = viewMonth.getMonth();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const firstDay = new Date(y, m, 1).getDay();
  const today = startOfDay(new Date());

  const dayCells = [];
  for (let i = 0; i < firstDay; i += 1) {
    dayCells.push(<div key={`e-${i}`} className="h-8" />);
  }
  for (let d = 1; d <= daysInMonth; d += 1) {
    const date = startOfDay(new Date(y, m, d));
    const selected = draftDate && sameDay(date, draftDate);
    const isToday = sameDay(date, today);
    const disabledDay = isDayDisabled(date);
    dayCells.push(
      <button
        key={d}
        type="button"
        disabled={disabledDay}
        onClick={() => setDraftDate(date)}
        className={`h-8 w-full rounded-lg text-xs font-medium transition-colors ${
          selected
            ? "bg-emerald-600 text-white shadow-sm shadow-emerald-200"
            : isToday
              ? "bg-emerald-50 text-emerald-700"
              : "text-gray-700 hover:bg-gray-100"
        } ${disabledDay ? "opacity-30 cursor-not-allowed hover:bg-transparent" : ""}`}
      >
        {d}
      </button>,
    );
  }

  const panel =
    typeof document !== "undefined"
      ? createPortal(
          <AnimatePresence>
            {open ? (
              <motion.div
                ref={panelRef}
                data-datetimepicker-portal="true"
                initial={{ opacity: 0, y: 6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 6, scale: 0.98 }}
                transition={{ duration: 0.15 }}
                style={{
                  position: "fixed",
                  top: panelPos.top,
                  left: panelPos.left,
                  width: panelPos.width,
                  zIndex: 220,
                }}
                className="rounded-2xl border border-gray-200 bg-white shadow-2xl shadow-gray-900/10 overflow-hidden"
              >
                <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                  <p className="text-xs font-bold text-gray-700 uppercase tracking-wide m-0">
                    Schedule
                  </p>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="p-1 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100"
                    aria-label="Close"
                  >
                    <FiX className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-3">
                  <div className="mb-2.5 flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setViewMonth(new Date(y, m - 1, 1))}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
                      aria-label="Previous month"
                    >
                      <FiChevronLeft className="w-4 h-4" />
                    </button>
                    <select
                      value={m}
                      onChange={(e) =>
                        setViewMonth(new Date(y, Number(e.target.value), 1))
                      }
                      className="h-8 flex-1 min-w-0 rounded-lg border border-gray-200 bg-white px-2 text-xs font-medium text-gray-800"
                    >
                      {MONTHS.map((name, i) => (
                        <option key={name} value={i}>
                          {name}
                        </option>
                      ))}
                    </select>
                    <select
                      value={y}
                      onChange={(e) =>
                        setViewMonth(new Date(Number(e.target.value), m, 1))
                      }
                      className="h-8 w-[4.75rem] rounded-lg border border-gray-200 bg-white px-1.5 text-xs font-medium text-gray-800"
                    >
                      {yearOptions.map((yr) => (
                        <option key={yr} value={yr}>
                          {yr}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setViewMonth(new Date(y, m + 1, 1))}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
                      aria-label="Next month"
                    >
                      <FiChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-7 mb-1">
                    {DAYS.map((day) => (
                      <div
                        key={day}
                        className="h-6 flex items-center justify-center text-[10px] font-medium text-gray-400"
                      >
                        {day}
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-0.5">{dayCells}</div>

                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <div className="flex items-center gap-2 mb-2">
                      <FiClock className="w-3.5 h-3.5 text-gray-400" />
                      <span className="text-[11px] font-bold text-gray-600 uppercase tracking-wide">
                        Time
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <label className="block">
                        <span className="sr-only">Hours</span>
                        <select
                          value={draftHours}
                          onChange={(e) =>
                            setDraftHours(Number(e.target.value))
                          }
                          className="w-full h-9 rounded-lg border border-gray-200 bg-white px-2 text-sm font-medium text-gray-800"
                        >
                          {Array.from({ length: 24 }, (_, h) => (
                            <option key={h} value={h}>
                              {pad2(h)} hr
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="block">
                        <span className="sr-only">Minutes</span>
                        <select
                          value={draftMinutes}
                          onChange={(e) =>
                            setDraftMinutes(Number(e.target.value))
                          }
                          className="w-full h-9 rounded-lg border border-gray-200 bg-white px-2 text-sm font-medium text-gray-800"
                        >
                          {minuteOptions.map((min) => (
                            <option key={min} value={min}>
                              {pad2(min)} min
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="px-3 py-2.5 border-t border-gray-100 bg-gray-50 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={setNow}
                    className="px-2.5 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg hover:bg-emerald-100"
                  >
                    Now
                  </button>
                  {clearable ? (
                    <button
                      type="button"
                      onClick={clearValue}
                      className="px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-200 rounded-lg"
                    >
                      Clear
                    </button>
                  ) : null}
                  <button
                    type="button"
                    disabled={!draftDate}
                    onClick={applyDraft}
                    className="ml-auto px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg disabled:opacity-40"
                  >
                    Apply
                  </button>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>,
          document.body,
        )
      : null;

  return (
    <div className={className}>
      {label ? (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      ) : null}
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((v) => !v)}
        className={`w-full flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm text-left bg-white hover:border-emerald-400 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none disabled:opacity-60 disabled:cursor-not-allowed transition-colors ${inputClassName}`}
      >
        <FiCalendar className="w-4 h-4 text-gray-400 shrink-0" />
        <span
          className={`flex-1 min-w-0 truncate ${
            display ? "text-gray-800 font-medium" : "text-gray-400"
          }`}
        >
          {display || placeholder}
        </span>
        {clearable && value && !disabled ? (
          <span
            role="button"
            tabIndex={0}
            onClick={clearValue}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                clearValue(e);
              }
            }}
            className="p-0.5 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100"
            aria-label="Clear date"
          >
            <FiX className="w-3.5 h-3.5" />
          </span>
        ) : (
          <FiClock className="w-3.5 h-3.5 text-gray-300 shrink-0" />
        )}
      </button>
      {panel}
    </div>
  );
}
