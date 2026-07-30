import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { FiClock, FiX } from "react-icons/fi";

const pad2 = (n) => String(n).padStart(2, "0");

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);

function toTwelveHourParts(hours24 = 0) {
  const meridiem = hours24 >= 12 ? "PM" : "AM";
  const hour12 = hours24 % 12 || 12;
  return { hour12, meridiem };
}

function toTwentyFourHour(hour12 = 12, meridiem = "AM") {
  const normalizedHour = Number(hour12) || 12;
  if (meridiem === "PM") return normalizedHour === 12 ? 12 : normalizedHour + 12;
  return normalizedHour === 12 ? 0 : normalizedHour;
}

/** Parse `HH:mm` or `HH:mm:ss` into { hours, minutes }. */
export function parseTimeValue(value) {
  if (value == null || value === "") return null;
  const raw = String(value).trim();
  const m = raw.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (!m) return null;
  const hours = Number(m[1]);
  const minutes = Number(m[2]);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return { hours, minutes };
}

/** Format hours/minutes as `HH:mm`. */
export function toTimeValue(hours, minutes) {
  return `${pad2(hours)}:${pad2(minutes)}`;
}

/** Display `HH:mm` in 12-hour form, e.g. `09:30 AM`. */
export function formatTimeDisplay(value) {
  const parsed = parseTimeValue(value);
  if (!parsed) return "";
  const period = parsed.hours >= 12 ? "PM" : "AM";
  const h12 = parsed.hours % 12 || 12;
  return `${pad2(h12)}:${pad2(parsed.minutes)} ${period}`;
}

/**
 * Beautiful HH:mm time picker with portal popover.
 * Controlled via `value` / `onChange` (`HH:mm` or empty string).
 */
export default function Timepicker({
  value = "",
  onChange,
  label,
  placeholder = "Select time",
  disabled = false,
  id,
  allowClear = true,
  className = "",
}) {
  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const hourListRef = useRef(null);
  const minuteListRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [panelPos, setPanelPos] = useState({ width: 320 });
  const [draftHours, setDraftHours] = useState(9);
  const [draftMinutes, setDraftMinutes] = useState(0);
  const [draftMeridiem, setDraftMeridiem] = useState("AM");

  const display = formatTimeDisplay(value) || "";

  const scrollSelected = useCallback((listEl, index, behavior = "smooth") => {
    if (!listEl || index < 0) return;
    const child = listEl.children[index];
    if (child) {
      child.scrollIntoView({ block: "center", behavior });
    }
  }, []);

  const updatePosition = useCallback(() => {
    const el = triggerRef.current;
    const rect = el?.getBoundingClientRect();
    const viewportPadding = 8;
    const maxWidth = Math.max(260, window.innerWidth - viewportPadding * 2);
    const width = Math.min(maxWidth, Math.max(300, Math.min(340, rect?.width || 320)));
    setPanelPos({ width });
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const parsedNow = parseTimeValue(value);
    const nextHours24 = parsedNow?.hours ?? 9;
    const nextTime = toTwelveHourParts(nextHours24);
    const nextMinutes = parsedNow?.minutes ?? 0;
    setDraftHours(nextTime.hour12);
    setDraftMinutes(nextMinutes);
    setDraftMeridiem(nextTime.meridiem);
    updatePosition();
    window.requestAnimationFrame(() => {
      const hourIndex = HOURS.findIndex((hour) => hour === nextTime.hour12);
      scrollSelected(hourListRef.current, hourIndex, "auto");
      scrollSelected(minuteListRef.current, nextMinutes, "auto");
    });

    const onResize = () => updatePosition();
    const onScroll = () => updatePosition();
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [open, value, updatePosition]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onPointer = (e) => {
      const t = e.target;
      if (triggerRef.current?.contains(t)) return;
      if (panelRef.current?.contains(t)) return;
      setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onPointer);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onPointer);
    };
  }, [open]);

  const applyDraft = () => {
    onChange?.(toTimeValue(toTwentyFourHour(draftHours, draftMeridiem), draftMinutes));
    setOpen(false);
  };

  const setNow = () => {
    const now = new Date();
    const next = toTwelveHourParts(now.getHours());
    setDraftHours(next.hour12);
    setDraftMinutes(now.getMinutes());
    setDraftMeridiem(next.meridiem);
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        const hourIndex = HOURS.findIndex((hour) => hour === next.hour12);
        scrollSelected(hourListRef.current, hourIndex, "smooth");
        scrollSelected(minuteListRef.current, now.getMinutes(), "smooth");
      });
    });
  };

  const clearValue = (e) => {
    e?.stopPropagation?.();
    onChange?.("");
    setOpen(false);
  };

  const panel =
    typeof document !== "undefined"
      ? createPortal(
        <AnimatePresence>
          {open ? (
            <>
              <motion.div
                key="timepicker-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="fixed inset-0 z-[1590] bg-black/40 backdrop-blur-sm"
                aria-hidden="true"
                onMouseDown={() => setOpen(false)}
              />
              <div className="fixed inset-0 z-[1600] flex items-center justify-center p-3 sm:p-4 pointer-events-none">
                <motion.div
                  key="timepicker-panel"
                  ref={panelRef}
                  data-timepicker-portal="true"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  style={{ width: panelPos.width }}
                  className="pointer-events-auto flex max-h-[calc(100vh-16px)] w-full max-w-sm flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/10"
                >
                <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
                      <FiClock className="h-3.5 w-3.5" />
                    </span>
                    <p className="m-0 text-xs font-bold uppercase tracking-wide text-slate-700">
                      {label || "Time"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                    aria-label="Close"
                  >
                    <FiX className="h-4 w-4" />
                  </button>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                  <div className="mb-3 flex items-center justify-center gap-1 rounded-xl bg-slate-50 py-2.5 tabular-nums">
                    <span className="text-2xl font-semibold text-slate-900">
                      {pad2(draftHours)}
                    </span>
                    <span className="text-2xl font-semibold text-slate-400">:</span>
                    <span className="text-2xl font-semibold text-slate-900">
                      {pad2(draftMinutes)}
                    </span>
                    <span className="ml-2 text-xs font-semibold text-slate-500">
                      {draftMeridiem}
                    </span>
                  </div>

                  <div className="mb-3 grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-1">
                    {["AM", "PM"].map((period) => {
                      const selected = draftMeridiem === period;
                      return (
                        <button
                          key={period}
                          type="button"
                          onClick={() => setDraftMeridiem(period)}
                          className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${selected
                              ? "bg-teal-600 text-white shadow-sm"
                              : "text-slate-600 hover:bg-white"
                            }`}
                        >
                          {period}
                        </button>
                      );
                    })}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="mb-1.5 text-center text-[10px] font-bold uppercase tracking-wide text-slate-400">
                        Hour
                      </p>
                      <div
                        ref={hourListRef}
                        className="h-44 overflow-y-auto rounded-xl border border-slate-100 bg-white [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                      >
                        {HOURS.map((h) => {
                          const selected = draftHours === h;
                          return (
                            <button
                              key={h}
                              type="button"
                              onClick={() => setDraftHours(h)}
                              className={`flex w-full items-center justify-center py-1.5 text-sm font-medium transition ${selected
                                  ? "bg-teal-600 text-white"
                                  : "text-slate-700 hover:bg-slate-50"
                                }`}
                            >
                              {pad2(h)}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div>
                      <p className="mb-1.5 text-center text-[10px] font-bold uppercase tracking-wide text-slate-400">
                        Minute
                      </p>
                      <div
                        ref={minuteListRef}
                        className="h-44 overflow-y-auto rounded-xl border border-slate-100 bg-white [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                      >
                        {MINUTES.map((m) => {
                          const selected = draftMinutes === m;
                          return (
                            <button
                              key={m}
                              type="button"
                              onClick={() => setDraftMinutes(m)}
                              className={`flex w-full items-center justify-center py-1.5 text-sm font-medium transition ${selected
                                  ? "bg-teal-600 text-white"
                                  : "text-slate-700 hover:bg-slate-50"
                                }`}
                            >
                              {pad2(m)}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 border-t border-slate-100 bg-slate-50/80 px-3 py-2.5">
                  <button
                    type="button"
                    onClick={setNow}
                    className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Now
                  </button>
                  {allowClear ? (
                    <button
                      type="button"
                      onClick={clearValue}
                      className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                    >
                      Clear
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={applyDraft}
                    className="ml-auto rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-700"
                  >
                    Apply
                  </button>
                </div>
                </motion.div>
              </div>
            </>
          ) : null}
        </AnimatePresence>,
        document.body,
      )
      : null;

  return (
    <div className={className}>
      {label ? (
        <div className="mb-1.5 block text-xs font-semibold text-slate-600">
          {label}
        </div>
      ) : null}
      <button
        ref={triggerRef}
        id={id}
        type="button"
        disabled={disabled}
        onClick={() => {
          if (!disabled) setOpen((prev) => !prev);
        }}
        className={`inline-flex h-10 w-full items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-left text-sm outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-500/20 disabled:cursor-not-allowed disabled:opacity-50 ${open ? "border-teal-400 ring-2 ring-teal-500/20" : "hover:border-slate-300"
          }`}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <FiClock className="h-4 w-4 shrink-0 text-slate-400" />
        <span
          className={`min-w-0 flex-1 truncate tabular-nums ${display ? "font-medium text-slate-800" : "text-slate-400"
            }`}
        >
          {display || placeholder}
        </span>
        {allowClear && value && !disabled ? (
          <span
            role="button"
            tabIndex={-1}
            onClick={clearValue}
            className="inline-flex h-5 w-5 items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="Clear time"
          >
            <FiX className="h-3.5 w-3.5" />
          </span>
        ) : null}
      </button>
      {panel}
    </div>
  );
}
