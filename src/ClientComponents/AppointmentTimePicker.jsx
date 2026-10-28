import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { FiClock, FiX } from "react-icons/fi";

const parseTime = (value) => {
  const [hours = "09", minutes = "00"] = String(value || "09:00").split(":");
  const hour = Number(hours);
  return {
    hour: hour % 12 || 12,
    minute: Number(minutes) || 0,
    period: hour >= 12 ? "PM" : "AM",
  };
};

const formatTime = (hour, minute, period) => {
  const hour24 = (hour % 12) + (period === "PM" ? 12 : 0);
  return `${String(hour24).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
};

const AppointmentTimePicker = ({ value, onChange, label }) => {
  const [open, setOpen] = useState(false);
  const [selection, setSelection] = useState(() => parseTime(value));

  useEffect(() => {
    if (open) setSelection(parseTime(value));
  }, [open, value]);

  const save = () => {
    onChange(formatTime(selection.hour, selection.minute, selection.period));
    setOpen(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Choose ${label.toLowerCase()}`}
        className="flex w-full items-center justify-between rounded-lg border border-slate-300 bg-white px-3 py-2 text-left text-sm font-normal text-slate-700 transition hover:border-indigo-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
      >
        <span>{new Date(`2000-01-01T${value || "09:00"}:00`).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span>
        <FiClock className="text-slate-400" />
      </button>
      {typeof document !== "undefined" ? createPortal(
        <AnimatePresence>
          {open ? (
            <motion.div
              className="fixed inset-0 z-[10220] flex items-center justify-center bg-slate-950/45 p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onMouseDown={(event) => {
                if (event.target === event.currentTarget) setOpen(false);
              }}
              role="presentation"
            >
              <motion.section
                role="dialog"
                aria-modal="true"
                aria-labelledby="appointment-time-picker-title"
                initial={{ opacity: 0, scale: 0.96, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 8 }}
                className="w-full max-w-sm overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
              >
                <header className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                  <div>
                    <h2 id="appointment-time-picker-title" className="text-sm font-semibold text-slate-800">{label}</h2>
                    <p className="mt-1 text-xl font-bold text-indigo-700">
                      {selection.hour}:{String(selection.minute).padStart(2, "0")} {selection.period}
                    </p>
                  </div>
                  <button type="button" onClick={() => setOpen(false)} aria-label="Close time picker" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100">
                    <FiX />
                  </button>
                </header>

                <div className="grid grid-cols-[1fr_1fr_auto] gap-3 p-4">
                  <div>
                    <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">Hour</p>
                    <div className="max-h-52 space-y-1 overflow-y-auto rounded-lg bg-slate-50 p-1">
                      {Array.from({ length: 12 }, (_, index) => index + 1).map((hour) => (
                        <button
                          key={hour}
                          type="button"
                          aria-pressed={selection.hour === hour}
                          onClick={() => setSelection((current) => ({ ...current, hour }))}
                          className={`w-full rounded-md py-2 text-sm font-medium ${selection.hour === hour ? "bg-indigo-600 text-white" : "text-slate-700 hover:bg-indigo-50"}`}
                        >
                          {String(hour).padStart(2, "0")}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">Minute</p>
                    <div className="max-h-52 space-y-1 overflow-y-auto rounded-lg bg-slate-50 p-1">
                      {Array.from({ length: 60 }, (_, minute) => (
                        <button
                          key={minute}
                          type="button"
                          aria-pressed={selection.minute === minute}
                          onClick={() => setSelection((current) => ({ ...current, minute }))}
                          className={`w-full rounded-md py-2 text-sm font-medium ${selection.minute === minute ? "bg-indigo-600 text-white" : "text-slate-700 hover:bg-indigo-50"}`}
                        >
                          {String(minute).padStart(2, "0")}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">Period</p>
                    <div className="space-y-2">
                      {["AM", "PM"].map((period) => (
                        <button
                          key={period}
                          type="button"
                          aria-pressed={selection.period === period}
                          onClick={() => setSelection((current) => ({ ...current, period }))}
                          className={`block w-14 rounded-lg px-3 py-2.5 text-sm font-bold ${selection.period === period ? "bg-indigo-600 text-white" : "bg-slate-50 text-slate-700 hover:bg-indigo-50"}`}
                        >
                          {period}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <footer className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50 px-4 py-3">
                  <button type="button" onClick={() => setOpen(false)} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">Cancel</button>
                  <button type="button" onClick={save} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">Set time</button>
                </footer>
              </motion.section>
            </motion.div>
          ) : null}
        </AnimatePresence>,
        document.body,
      ) : null}
    </>
  );
};

export default AppointmentTimePicker;
