import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  FiActivity,
  FiAlertTriangle,
  FiCalendar,
  FiCheck,
  FiCheckCircle,
  FiCoffee,
  FiClock,
  FiLoader,
  FiLogIn,
  FiLogOut,
  FiUser,
  FiUserX,
  FiX,
  FiZap,
} from "react-icons/fi";
import Timepicker from "../Timepicker";
import { resolveProfileImageUrl } from "../../utils/user-profile-storage";

const ToggleSwitch = ({
  enabled,
  onChange,
  label,
  disabled,
  onColor = "bg-teal-600",
}) => (
  <button
    type="button"
    role="switch"
    aria-checked={enabled}
    aria-label={label}
    disabled={disabled}
    onClick={() => onChange?.(!enabled)}
    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${
      enabled ? onColor : "bg-slate-200"
    }`}
  >
    <span
      className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
        enabled ? "translate-x-5" : "translate-x-0.5"
      }`}
    />
  </button>
);

const MARK_OPTIONS = [
  {
    id: "absent",
    label: "Absent",
    db: "absent",
    Icon: FiUserX,
    active:
      "border-slate-500 bg-slate-600 text-white ring-slate-300 shadow-sm shadow-slate-200",
    inactive:
      "border-slate-200 bg-slate-100 text-slate-700 hover:border-slate-300 hover:bg-slate-200",
  },
  {
    id: "present",
    label: "Present",
    db: "present",
    Icon: FiCheckCircle,
    active:
      "border-emerald-500 bg-emerald-600 text-white ring-emerald-300 shadow-sm shadow-emerald-200",
    inactive:
      "border-emerald-100 bg-emerald-50 text-emerald-800 hover:border-emerald-300",
  },
  {
    id: "half_day",
    label: "Half Day",
    db: "half day",
    Icon: FiClock,
    active:
      "border-amber-500 bg-amber-500 text-white ring-amber-300 shadow-sm shadow-amber-200",
    inactive:
      "border-amber-100 bg-amber-50 text-amber-900 hover:border-amber-300",
  },
  {
    id: "leave",
    label: "Leave",
    db: "leave",
    Icon: FiCalendar,
    active:
      "border-sky-500 bg-sky-600 text-white ring-sky-300 shadow-sm shadow-sky-200",
    inactive: "border-sky-100 bg-sky-50 text-sky-800 hover:border-sky-300",
  },
];

function toInputTime(value) {
  if (value == null || value === "") return "";
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const h = String(value.getHours()).padStart(2, "0");
    const m = String(value.getMinutes()).padStart(2, "0");
    return `${h}:${m}`;
  }
  const raw = String(value).trim();
  const iso = raw.match(/T(\d{2}):(\d{2})/);
  if (iso) return `${iso[1]}:${iso[2]}`;
  const m = raw.match(/^(\d{1,2}):(\d{2})(?::\d{2})?/);
  if (!m) return "";
  return `${String(Number(m[1])).padStart(2, "0")}:${m[2]}`;
}

function formatLocalMobile(mobile, countryCode) {
  let digits = String(mobile || "").replace(/\D/g, "");
  if (!digits) return "";
  const cc = String(countryCode || "").replace(/\D/g, "");
  if (cc && digits.startsWith(cc) && digits.length > cc.length) {
    digits = digits.slice(cc.length);
  } else if (digits.startsWith("91") && digits.length > 10) {
    digits = digits.slice(2);
  }
  return digits;
}

function getInitials(name) {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return "ST";
}

function formatDateLabel(dateStr) {
  if (!dateStr) return "";
  const d = new Date(`${dateStr}T12:00:00`);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString([], {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatTimeLabel(value) {
  const raw = toInputTime(value);
  if (!raw) return "";
  const [hoursRaw, minutesRaw] = raw.split(":");
  const hours = Number(hoursRaw);
  const minutes = Number(minutesRaw);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return raw;
  const suffix = hours >= 12 ? "PM" : "AM";
  const h12 = hours % 12 || 12;
  return `${String(h12).padStart(2, "0")}:${String(minutes).padStart(2, "0")} ${suffix}`;
}

function timeToMinutes(value) {
  const raw = toInputTime(value);
  if (!raw) return null;
  const [hoursRaw, minutesRaw] = raw.split(":");
  const hours = Number(hoursRaw);
  const minutes = Number(minutesRaw);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  return hours * 60 + minutes;
}

function formatDurationLabel(totalMinutes) {
  if (!Number.isFinite(totalMinutes) || totalMinutes <= 0) return "";
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0 && minutes > 0) return `${hours} hr ${minutes}m`;
  if (hours > 0) return `${hours} hr`;
  return `${minutes}m`;
}

function currentStatusLabel(row) {
  const status = String(row?.attendance?.status || "").toLowerCase();
  if (status === "half day") return "Half Day";
  if (status === "present") return "Present";
  if (status === "absent") return "Absent";
  if (status === "leave") return "Leave";
  if (row?.state === "not_marked") return "Not Marked";
  if (row?.state === "punched_in") return "Punched in";
  if (row?.state === "on_break") return "On break";
  if (row?.state === "punched_out") return "Punched out";
  if (row?.state === "half_day") return "Half Day";
  if (row?.state === "leave") return "Leave";
  if (row?.state === "present") return "Present";
  if (row?.state === "absent") return "Absent";
  return "Not Marked";
}

function resolveInitialMark(row) {
  const status = String(row?.attendance?.status || "").toLowerCase();
  if (
    status === "present" ||
    status === "absent" ||
    status === "leave" ||
    status === "half day"
  ) {
    return status === "half day" ? "half_day" : status;
  }
  if (row?.state === "leave") return "leave";
  if (row?.state === "half_day") return "half_day";
  if (row?.state === "absent") return "absent";
  if (
    row?.attendance?.in_time ||
    ["punched_in", "on_break", "punched_out", "present"].includes(row?.state)
  ) {
    return "present";
  }
  // not_marked → preselect Absent (treated as absent)
  return "absent";
}

/** Prefer punched times; else active salary shift (if assigned). */
function resolvePunchTimes(row) {
  const existingIn = toInputTime(row?.attendance?.in_time);
  const existingOut = toInputTime(row?.attendance?.out_time);
  const shiftIn = toInputTime(row?.active_salary?.working_hours_start);
  const shiftOut = toInputTime(row?.active_salary?.working_hours_end);
  return {
    inTime: existingIn || shiftIn || "",
    outTime: existingOut || shiftOut || "",
  };
}

function daysInMonthFromDate(dateStr) {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;
  const [y, m] = dateStr.split("-").map(Number);
  if (!y || !m) return null;
  return new Date(y, m, 0).getDate();
}

function formatInr(value, { maxFractionDigits = 2 } = {}) {
  if (!Number.isFinite(value)) return "—";
  return `₹${Number(value).toLocaleString("en-IN", {
    maximumFractionDigits: maxFractionDigits,
    minimumFractionDigits: Number.isInteger(value)
      ? 0
      : Math.min(2, maxFractionDigits),
  })}`;
}

/**
 * Calendar-day wage from active monthly salary ÷ days in that month.
 * Present can include OT / fine when expected minutes exist and toggles are on.
 */
function resolveDayWage(
  row,
  dateStr,
  markId,
  { inTime, outTime, overtimeEnabled, fineEnabled } = {},
) {
  const amount = Number(row?.active_salary?.amount);
  const days = daysInMonthFromDate(dateStr);
  if (!Number.isFinite(amount) || amount <= 0 || !days) return null;

  const daily = amount / days;
  let multiplier = 0;
  let label = "No day wage";
  if (markId === "present") {
    multiplier = 1;
    label = "Full day wage";
  } else if (markId === "half_day") {
    multiplier = 0.5;
    label = "Half day wage";
  } else if (markId === "leave") {
    multiplier = 1;
    label = "Leave · full day wage";
  } else {
    multiplier = 0;
    label = "Absent · no day wage";
  }

  const baseWage = daily * multiplier;
  const expectedMinsRaw = Number(row?.active_salary?.expected_minutes);
  const expectedHoursRaw = Number(row?.active_salary?.expected_hours);
  const expectedMinutes =
    Number.isFinite(expectedMinsRaw) && expectedMinsRaw > 0
      ? expectedMinsRaw
      : Number.isFinite(expectedHoursRaw) && expectedHoursRaw > 0
        ? Math.round(expectedHoursRaw * 60)
        : null;
  const hasExpected = expectedMinutes != null && expectedMinutes > 0;
  const start = timeToMinutes(inTime);
  const end = timeToMinutes(outTime);
  const worked =
    markId === "present" && start != null && end != null && end >= start
      ? end - start
      : null;

  const salaryOtAllowed = Boolean(row?.active_salary?.overtime_enabled);
  const salaryFineAllowed = Boolean(row?.active_salary?.fine_enabled);

  let extraMinutes = 0;
  let lessMinutes = 0;
  let otAmount = 0;
  let fineAmount = 0;
  let showOvertime = false;
  let showFine = false;
  const perMinute = hasExpected ? daily / expectedMinutes : null;

  if (
    markId === "present" &&
    hasExpected &&
    worked != null &&
    perMinute != null
  ) {
    extraMinutes = Math.max(0, worked - expectedMinutes);
    lessMinutes = Math.max(0, expectedMinutes - worked);
    // Only show OT/fine when the staff salary allows them
    showOvertime = salaryOtAllowed && extraMinutes > 0;
    showFine = salaryFineAllowed && lessMinutes > 0;
    if (showOvertime && overtimeEnabled) {
      otAmount = extraMinutes * perMinute;
    }
    if (showFine && fineEnabled) {
      fineAmount = lessMinutes * perMinute;
    }
  }

  const netWage = baseWage + otAmount - fineAmount;

  return {
    monthly: amount,
    daysInMonth: days,
    daily,
    wage: baseWage,
    netWage,
    multiplier,
    label,
    salaryType: row.active_salary?.salary_type || "fixed",
    expectedHours: hasExpected ? expectedMinutes / 60 : null,
    perHour: hasExpected ? daily / (expectedMinutes / 60) : null,
    workedMinutes: worked,
    extraMinutes,
    lessMinutes,
    showOvertime,
    showFine,
    otAmount,
    fineAmount,
    overtimeEnabled: Boolean(overtimeEnabled),
    fineEnabled: Boolean(fineEnabled),
  };
}

/**
 * Mark attendance modal — Absent / Present / Half Day / Leave.
 * Present shows Timepicker in/out. Follows CLIENT/context/modal.md.
 */
const AttendanceMarkModal = ({
  isOpen,
  row,
  date,
  loading = false,
  onClose,
  onSubmit,
}) => {
  const [mark, setMark] = useState("absent");
  const [inTime, setInTime] = useState("");
  const [outTime, setOutTime] = useState("");
  const [overtimeEnabled, setOvertimeEnabled] = useState(false);
  const [fineEnabled, setFineEnabled] = useState(false);

  useEffect(() => {
    if (!isOpen || !row) return;
    const nextMark = resolveInitialMark(row);
    setMark(nextMark);
    const times = resolvePunchTimes(row);
    setInTime(times.inTime);
    setOutTime(times.outTime);
    const att = row.attendance;
    setOvertimeEnabled(
      att?.overtime_enabled != null
        ? Boolean(att.overtime_enabled)
        : Boolean(row.active_salary?.overtime_enabled),
    );
    setFineEnabled(
      att?.fine_enabled != null
        ? Boolean(att.fine_enabled)
        : Boolean(row.active_salary?.fine_enabled),
    );
  }, [isOpen, row]);

  useEffect(() => {
    if (!isOpen || loading) return undefined;
    const onKey = (event) => {
      if (event.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, loading, onClose]);

  const staffName = row?.name || "Staff";
  const imageUrl = resolveProfileImageUrl(row?.image);
  const localMobile = formatLocalMobile(row?.mobile, row?.country_code);
  const option = useMemo(
    () => MARK_OPTIONS.find((item) => item.id === mark),
    [mark],
  );
  const existingIn = toInputTime(row?.attendance?.in_time);
  const existingOut = toInputTime(row?.attendance?.out_time);
  const breaks = Array.isArray(row?.breaks) ? row.breaks : [];
  const showSuggestedIn = Boolean(
    existingIn && inTime && existingIn !== inTime,
  );
  const showSuggestedOut = Boolean(
    existingOut && outTime && existingOut !== outTime,
  );
  const workedMinutes = useMemo(() => {
    const start = timeToMinutes(inTime);
    const end = timeToMinutes(outTime);
    if (start == null || end == null || end < start) return null;
    return Math.max(0, end - start);
  }, [inTime, outTime]);

  const wageInfo = useMemo(
    () =>
      resolveDayWage(row, date, mark, {
        inTime,
        outTime,
        overtimeEnabled,
        fineEnabled,
      }),
    [row, date, mark, inTime, outTime, overtimeEnabled, fineEnabled],
  );

  const selectMark = (nextMark) => {
    setMark(nextMark);
    if (nextMark !== "present" || !row) return;
    const times = resolvePunchTimes(row);
    setInTime((prev) => prev || times.inTime);
    setOutTime((prev) => prev || times.outTime);
  };

  const handleSave = () => {
    if (!option) return;
    const payload = {
      username: row.username,
      date,
      status: option.db,
    };
    if (mark === "present") {
      payload.in_time = inTime || null;
      payload.out_time = outTime || null;
      payload.overtime_enabled = Boolean(
        wageInfo?.showOvertime && overtimeEnabled,
      );
      payload.fine_enabled = Boolean(wageInfo?.showFine && fineEnabled);
    }
    onSubmit?.(payload);
  };

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && row ? (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center overflow-hidden overscroll-none p-3 sm:p-4 pointer-events-none">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm pointer-events-auto"
            aria-hidden="true"
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="attendance-mark-title"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="relative z-[1] pointer-events-auto flex w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl max-h-[calc(100vh-1.5rem)] sm:max-h-[calc(100vh-2rem)]"
          >
            <header className="shrink-0 border-b border-slate-100 px-4 py-3.5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt=""
                      className="h-11 w-11 shrink-0 rounded-full object-cover ring-1 ring-slate-200"
                    />
                  ) : (
                    <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-teal-50 text-sm font-semibold text-teal-700 ring-1 ring-teal-100">
                      {getInitials(staffName)}
                    </div>
                  )}
                  <div className="min-w-0">
                    <h2
                      id="attendance-mark-title"
                      className="m-0 truncate text-base font-semibold text-slate-900"
                    >
                      Mark attendance
                    </h2>
                    <p className="m-0 mt-0.5 truncate text-sm font-medium text-slate-800">
                      {staffName}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500">
                      {localMobile ? (
                        <span className="tabular-nums">{localMobile}</span>
                      ) : null}
                      {row.designation ? (
                        <>
                          {localMobile ? <span aria-hidden>·</span> : null}
                          <span className="truncate">{row.designation}</span>
                        </>
                      ) : null}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
                  aria-label="Close"
                >
                  <FiX className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                {date ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200">
                    <FiCalendar className="h-3.5 w-3.5" />
                    {formatDateLabel(date)}
                  </span>
                ) : null}
                <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 px-2.5 py-1 text-xs font-medium text-teal-700 ring-1 ring-teal-100">
                  <FiUser className="h-3.5 w-3.5" />
                  {currentStatusLabel(row)}
                </span>
                {row.attendance ? (
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${
                      row.is_approved
                        ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                        : "bg-slate-100 text-slate-600 ring-slate-200"
                    }`}
                  >
                    {row.is_approved ? "Approved" : "Pending"}
                  </span>
                ) : null}
              </div>
            </header>

            <div className="px-4 py-4 flex-1 min-h-0 overflow-y-auto overscroll-y-contain [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              {wageInfo ? (
                <div className="mb-4 flex items-center gap-2.5 rounded-xl border border-teal-100 bg-teal-50/70 px-3 py-2">
                  <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-teal-600 text-xs font-bold text-white">
                    ₹
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="m-0 truncate text-xs font-semibold text-teal-900">
                        Day wage
                        <span className="font-medium text-teal-700/80">
                          {" "}
                          · {wageInfo.label}
                        </span>
                      </p>
                      <p
                        className={`m-0 shrink-0 text-sm font-semibold tabular-nums ${
                          wageInfo.netWage > 0
                            ? "text-teal-800"
                            : "text-slate-400"
                        }`}
                      >
                        {formatInr(wageInfo.netWage)}
                      </p>
                    </div>
                    <p className="m-0 mt-0.5 truncate text-[11px] tabular-nums text-slate-500">
                      {formatInr(wageInfo.monthly)} / {wageInfo.daysInMonth}d →{" "}
                      {formatInr(wageInfo.daily)}
                      /day
                      {mark === "half_day" ? " · ×½" : ""}
                      {wageInfo.otAmount > 0
                        ? ` · +OT ${formatInr(wageInfo.otAmount)}`
                        : ""}
                      {wageInfo.fineAmount > 0
                        ? ` · −Fine ${formatInr(wageInfo.fineAmount)}`
                        : ""}
                    </p>
                  </div>
                </div>
              ) : null}

              <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                {MARK_OPTIONS.map((item) => {
                  const selected = mark === item.id;
                  const Icon = item.Icon;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      disabled={loading}
                      onClick={() => selectMark(item.id)}
                      className={`relative flex items-center gap-2 rounded-xl border px-2.5 py-2.5 text-sm font-semibold ring-1 transition disabled:opacity-50 ${
                        selected ? item.active : item.inactive
                      }`}
                    >
                      <span
                        className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                          selected ? "bg-white/20" : "bg-white/70"
                        }`}
                      >
                        <Icon className="h-3.5 w-3.5" />
                      </span>
                      <span className="min-w-0 flex-1 text-left leading-none">
                        {item.label}
                      </span>
                      {selected ? (
                        <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-white/25">
                          <FiCheck className="h-3 w-3" />
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>

              {(existingIn || existingOut) && mark !== "present" ? (
                <div className="mt-4 flex flex-wrap gap-3 rounded-xl border border-slate-100 bg-slate-50/80 px-3.5 py-3 text-xs text-slate-600">
                  {existingIn ? (
                    <span className="inline-flex items-center gap-1.5">
                      <FiLogIn className="h-3.5 w-3.5 text-emerald-600" />
                      In {existingIn}
                    </span>
                  ) : null}
                  {existingOut ? (
                    <span className="inline-flex items-center gap-1.5">
                      <FiLogOut className="h-3.5 w-3.5 text-rose-600" />
                      Out {existingOut}
                    </span>
                  ) : null}
                  <span className="text-slate-400">Cleared if not Present</span>
                </div>
              ) : null}

              {mark === "present" ? (
                <div className="mt-4 space-y-3 rounded-xl border border-emerald-100 bg-emerald-50/40 p-3.5">
                  <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wide text-emerald-800/80">
                    <FiClock className="h-3.5 w-3.5" />
                    Punch times
                    {workedMinutes ? (
                      <span className="inline-flex items-center rounded-full bg-white px-2 py-1 text-[11px] font-semibold normal-case tracking-normal text-emerald-700 ring-1 ring-emerald-200">
                        {formatDurationLabel(workedMinutes)}
                      </span>
                    ) : null}
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <Timepicker
                        id="mark-in-time"
                        label="In time"
                        value={inTime}
                        onChange={setInTime}
                        disabled={loading}
                        allowClear={false}
                        placeholder="Select in time"
                      />
                      {showSuggestedIn ? (
                        <button
                          type="button"
                          onClick={() => setInTime(existingIn)}
                          className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 text-[11px] font-medium text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
                        >
                          <FiLogIn className="h-3 w-3 text-emerald-600" />
                          Punched at {formatTimeLabel(existingIn)}
                        </button>
                      ) : null}
                    </div>
                    <div>
                      <Timepicker
                        id="mark-out-time"
                        label="Out time"
                        value={outTime}
                        onChange={setOutTime}
                        disabled={loading}
                        allowClear={false}
                        placeholder="Select out time"
                      />
                      {showSuggestedOut ? (
                        <button
                          type="button"
                          onClick={() => setOutTime(existingOut)}
                          className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 text-[11px] font-medium text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
                        >
                          <FiLogOut className="h-3 w-3 text-rose-600" />
                          Punched out at {formatTimeLabel(existingOut)}
                        </button>
                      ) : null}
                    </div>
                  </div>

                  {wageInfo?.showOvertime || wageInfo?.showFine ? (
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {wageInfo.showOvertime ? (
                        <div className="rounded-xl border border-emerald-100 bg-white/90 p-3">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex min-w-0 items-center gap-2">
                              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                                <FiZap className="h-4 w-4" />
                              </span>
                              <div className="min-w-0">
                                <p className="m-0 text-sm font-semibold text-slate-800">
                                  Overtime
                                </p>
                                <p className="m-0 text-[11px] text-slate-500 tabular-nums">
                                  +{formatDurationLabel(wageInfo.extraMinutes)}{" "}
                                  ·{" "}
                                  {formatInr(
                                    wageInfo.otAmount ||
                                      (wageInfo.extraMinutes / 60) *
                                        (wageInfo.perHour || 0),
                                  )}
                                </p>
                              </div>
                            </div>
                            <ToggleSwitch
                              enabled={overtimeEnabled}
                              label="Apply overtime"
                              disabled={loading}
                              onColor="bg-emerald-600"
                              onChange={setOvertimeEnabled}
                            />
                          </div>
                          <p className="m-0 mt-2 text-[11px] leading-relaxed text-slate-500">
                            {overtimeEnabled
                              ? "Extra time will be paid at the hourly rate."
                              : "Extra time will not be paid."}
                          </p>
                        </div>
                      ) : null}
                      {wageInfo.showFine ? (
                        <div className="rounded-xl border border-rose-100 bg-white/90 p-3">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex min-w-0 items-center gap-2">
                              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-rose-100 text-rose-700">
                                <FiAlertTriangle className="h-4 w-4" />
                              </span>
                              <div className="min-w-0">
                                <p className="m-0 text-sm font-semibold text-slate-800">
                                  Fine
                                </p>
                                <p className="m-0 text-[11px] text-slate-500 tabular-nums">
                                  −{formatDurationLabel(wageInfo.lessMinutes)} ·{" "}
                                  {formatInr(
                                    wageInfo.fineAmount ||
                                      (wageInfo.lessMinutes / 60) *
                                        (wageInfo.perHour || 0),
                                  )}
                                </p>
                              </div>
                            </div>
                            <ToggleSwitch
                              enabled={fineEnabled}
                              label="Apply fine"
                              disabled={loading}
                              onColor="bg-rose-600"
                              onChange={setFineEnabled}
                            />
                          </div>
                          <p className="m-0 mt-2 text-[11px] leading-relaxed text-slate-500">
                            {fineEnabled
                              ? "Shortfall will be deducted at the hourly rate."
                              : "Shortfall will not be deducted."}
                          </p>
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  <div className="space-y-2 rounded-xl border border-emerald-100 bg-white/80 p-3">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
                      <FiCoffee className="h-3.5 w-3.5 text-amber-600" />
                      Break records
                    </div>
                    {breaks.length > 0 ? (
                      <div className="space-y-2">
                        {breaks.map((item, index) => (
                          <div
                            key={
                              item.break_id ||
                              `${item.start_time || "break"}-${index}`
                            }
                            className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs"
                          >
                            <span className="inline-flex items-center gap-1.5 font-medium text-slate-700">
                              <FiActivity className="h-3.5 w-3.5 text-slate-400" />
                              Break {index + 1}
                            </span>
                            <div className="text-right">
                              <div className="tabular-nums text-slate-600">
                                {formatTimeLabel(item.start_time) || "--"} to{" "}
                                {formatTimeLabel(item.end_time) || "Open"}
                              </div>
                              {formatDurationLabel(
                                Math.max(
                                  0,
                                  (timeToMinutes(item.end_time) ?? 0) -
                                    (timeToMinutes(item.start_time) ?? 0),
                                ),
                              ) ? (
                                <div className="mt-0.5 text-[11px] font-medium text-amber-700">
                                  {formatDurationLabel(
                                    Math.max(
                                      0,
                                      (timeToMinutes(item.end_time) ?? 0) -
                                        (timeToMinutes(item.start_time) ?? 0),
                                    ),
                                  )}
                                </div>
                              ) : null}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="m-0 text-sm text-slate-500">
                        No break records for this day.
                      </p>
                    )}
                  </div>
                </div>
              ) : null}
            </div>

            <footer className="shrink-0 border-t border-slate-100 bg-slate-50/90 px-4 py-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={loading}
                  onClick={onClose}
                  className="inline-flex flex-1 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={
                    loading || (mark === "present" && (!inTime || !outTime))
                  }
                  onClick={handleSave}
                  className="inline-flex flex-[1.3] items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? (
                    <FiLoader className="h-4 w-4 animate-spin" />
                  ) : (
                    <FiCheckCircle className="h-4 w-4" />
                  )}
                  Save
                </button>
              </div>
            </footer>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
};

export default AttendanceMarkModal;
