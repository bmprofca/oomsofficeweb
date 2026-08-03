import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  FiX,
  FiCalendar,
  FiClock,
  FiCoffee,
  FiZap,
  FiAlertTriangle,
  FiCheck,
  FiEdit2,
  FiEye,
  FiPlus,
} from "react-icons/fi";
import {
  DatePickerField,
  isDatePickerPortalOpen,
  fmt,
} from "../PortalDatePicker";
import Timepicker from "../Timepicker";

const InrIcon = ({ className = "h-3.5 w-3.5" }) => (
  <span
    className={`inline-flex items-center justify-center font-semibold leading-none ${className}`}
    aria-hidden
  >
    ₹
  </span>
);

const WEEK_DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const emptyForm = {
  salary_type: "fixed",
  monthly_salary: "",
  monthly_working_minutes: "",
  effective_from: "",
  working_hours_start: "09:00:00",
  working_hours_end: "18:00:00",
  expected_minutes: String(8 * 60),
  grace_period_minutes: "15",
  overtime_enabled: false,
  fine_enabled: false,
  day_off_days: [],
  allowed_break_minutes: "30",
};

const INPUT_CLASS =
  "w-full h-10 text-sm border border-slate-200 rounded-xl bg-white outline-none transition focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 disabled:bg-slate-50 disabled:text-slate-500";

const INPUT_PAD = "px-3";
/** Prefixed amount fields — explicit pl/pr, never combine with px-* */
const INPUT_PAD_PREFIX = "pl-8 pr-3";

const LABEL_CLASS =
  "mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-600";

const SELECT_CLASS =
  "h-10 min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-2.5 text-sm outline-none transition focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 disabled:bg-slate-50 disabled:text-slate-500";

/** Allow digits and at most one decimal point (for amounts). */
function sanitizeDecimalInput(raw, { allowDecimal = true } = {}) {
  let next = String(raw ?? "").replace(/[^\d.]/g, "");
  if (!allowDecimal) {
    return next.replace(/\./g, "");
  }
  const firstDot = next.indexOf(".");
  if (firstDot === -1) return next;
  return (
    next.slice(0, firstDot + 1) + next.slice(firstDot + 1).replace(/\./g, "")
  );
}

function toDateInput(value) {
  if (!value) return "";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value.slice(0, 10);
  }
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function toTimeHHmm(value) {
  if (!value) return "";
  const raw = String(value);
  const m = raw.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return "";
  return `${String(Number(m[1])).padStart(2, "0")}:${m[2]}`;
}

function toTimeHHmmss(hhmm) {
  if (!hhmm) return "";
  const m = String(hhmm).match(/^(\d{1,2}):(\d{2})/);
  if (!m) return "";
  return `${String(Number(m[1])).padStart(2, "0")}:${m[2]}:00`;
}

/** Daily duration between shift start/end in minutes (supports overnight). */
function dailyShiftMinutes(start, end) {
  const toMinutes = (t) => {
    const m = String(t || "").match(/^(\d{1,2}):(\d{2})/);
    if (!m) return null;
    return Number(m[1]) * 60 + Number(m[2]);
  };
  const s = toMinutes(start);
  const e = toMinutes(end);
  if (s == null || e == null) return null;
  let diff = e - s;
  if (diff <= 0) diff += 24 * 60;
  return diff;
}

/** Monthly minutes = daily shift duration × 30. */
function monthlyMinutesFromShifts(start, end) {
  const daily = dailyShiftMinutes(start, end);
  if (daily == null || daily <= 0) return "";
  return String(daily * 30);
}

function hoursToMinutes(hoursValue, fallbackMinutes = 0) {
  if (hoursValue == null || hoursValue === "") return fallbackMinutes;
  const h = Number(hoursValue);
  if (!Number.isFinite(h) || h < 0) return fallbackMinutes;
  return Math.round(h * 60);
}

function parseMinutesValue(value, fallback = 0) {
  const n = parseInt(value, 10);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

function splitMinutes(total) {
  const safe = Math.max(0, parseMinutesValue(total, 0));
  return { hours: Math.floor(safe / 60), minutes: safe % 60 };
}

function joinMinutes(hours, minutes) {
  const h = Math.max(0, Number(hours) || 0);
  const m = Math.min(59, Math.max(0, Number(minutes) || 0));
  return String(h * 60 + m);
}

function formatLockedDate(iso) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return "—";
  return fmt(new Date(y, m - 1, d));
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

function assignmentToForm(row) {
  if (!row) return { ...emptyForm };
  const isFlexible = (row.salary_type || "fixed") === "flexible";
  const expectedMinutes =
    row.working_hours?.expected_minutes != null
      ? Number(row.working_hours.expected_minutes)
      : hoursToMinutes(row.working_hours?.expected_hours, 8 * 60);
  const monthlyMinutes =
    row.working_hours?.monthly_working_minutes != null
      ? Number(row.working_hours.monthly_working_minutes)
      : row.monthly_working_minutes != null
        ? Number(row.monthly_working_minutes)
        : hoursToMinutes(row.monthly_working_hours, 0);
  return {
    salary_type: row.salary_type || "fixed",
    monthly_salary:
      row.monthly_salary != null ? String(row.monthly_salary) : "",
    monthly_working_minutes: monthlyMinutes > 0 ? String(monthlyMinutes) : "",
    effective_from: toDateInput(row.effective_from),
    working_hours_start: row.working_hours?.start
      ? toTimeHHmmss(toTimeHHmm(row.working_hours.start))
      : emptyForm.working_hours_start,
    working_hours_end: row.working_hours?.end
      ? toTimeHHmmss(toTimeHHmm(row.working_hours.end))
      : emptyForm.working_hours_end,
    expected_minutes: String(expectedMinutes || 8 * 60),
    grace_period_minutes:
      row.working_hours?.grace_period_minutes != null
        ? String(row.working_hours.grace_period_minutes)
        : emptyForm.grace_period_minutes,
    overtime_enabled: isFlexible ? false : !!row.overtime_settings?.enabled,
    fine_enabled: isFlexible ? false : !!row.fine_settings?.enabled,
    day_off_days: [],
    allowed_break_minutes: String(
      row.break_settings?.allowed_break_minutes ?? 30,
    ),
  };
}

function ToggleField({
  label,
  icon: Icon,
  iconClassName = "text-slate-400",
  enabled,
  onChange,
  disabled,
  onColor = "bg-teal-600",
}) {
  return (
    <div>
      <label className={LABEL_CLASS}>
        {Icon ? <Icon className={`h-3.5 w-3.5 ${iconClassName}`} /> : null}
        {label}
      </label>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange?.()}
        className={`${INPUT_CLASS} ${INPUT_PAD} flex w-full items-center justify-between gap-3 text-left disabled:cursor-default`}
      >
        <span
          className={`text-sm font-medium ${
            enabled ? "text-slate-800" : "text-slate-500"
          }`}
        >
          {enabled ? "Enabled" : "Disabled"}
        </span>
        <span
          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
            enabled ? onColor : "bg-slate-200"
          }`}
          aria-hidden
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
              enabled ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </span>
      </button>
    </div>
  );
}

function DurationField({
  label,
  icon: Icon,
  iconClassName = "text-slate-400",
  totalMinutes,
  onChange,
  disabled,
  maxHours = 23,
}) {
  const { hours, minutes } = splitMinutes(totalMinutes);
  const hourOptions = Array.from({ length: maxHours + 1 }, (_, i) => i);
  const minuteOptions = Array.from({ length: 60 }, (_, i) => i);

  return (
    <div>
      <label className={LABEL_CLASS}>
        {Icon ? <Icon className={`h-3.5 w-3.5 ${iconClassName}`} /> : null}
        {label}
      </label>
      <div className="flex items-center gap-2">
        <select
          className={SELECT_CLASS}
          value={hours}
          disabled={disabled}
          onChange={(e) => onChange(joinMinutes(e.target.value, minutes))}
          aria-label={`${label} hours`}
        >
          {hourOptions.map((h) => (
            <option key={h} value={h}>
              {h} hr
            </option>
          ))}
        </select>
        <select
          className={SELECT_CLASS}
          value={minutes}
          disabled={disabled}
          onChange={(e) => onChange(joinMinutes(hours, e.target.value))}
          aria-label={`${label} minutes`}
        >
          {minuteOptions.map((m) => (
            <option key={m} value={m}>
              {String(m).padStart(2, "0")} min
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

function NumberTextField({
  label,
  icon: Icon,
  iconClassName = "text-slate-400",
  value,
  onChange,
  disabled,
  placeholder,
  allowDecimal = true,
  prefix,
}) {
  return (
    <div>
      <label className={LABEL_CLASS}>
        {Icon ? <Icon className={`h-3.5 w-3.5 ${iconClassName}`} /> : null}
        {label}
      </label>
      <div className="relative">
        {prefix ? (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400">
            {prefix}
          </span>
        ) : null}
        <input
          type="text"
          inputMode="decimal"
          autoComplete="off"
          disabled={disabled}
          value={value}
          placeholder={placeholder}
          onChange={(e) =>
            onChange(sanitizeDecimalInput(e.target.value, { allowDecimal }))
          }
          className={`${INPUT_CLASS} ${prefix ? INPUT_PAD_PREFIX : INPUT_PAD}`}
        />
      </div>
    </div>
  );
}

function isTimePickerPortalOpen() {
  if (typeof document === "undefined") return false;
  return Boolean(document.querySelector('[data-timepicker-portal="true"]'));
}

/**
 * Create / edit / view salary assignment modal.
 * mode: 'create' | 'edit' | 'view'
 */
export default function SalaryAssignmentModal({
  isOpen,
  mode = "create",
  username,
  staffName,
  assignment = null,
  dayOffDays = [],
  onClose,
  onSubmit,
  onEdit,
  saving = false,
}) {
  const [form, setForm] = useState(emptyForm);
  const isView = mode === "view";
  const isEdit = mode === "edit";
  const fieldsDisabled = isView || saving;
  const canSwitchToEdit =
    isView &&
    typeof onEdit === "function" &&
    assignment &&
    assignment.status !== "expired";
  const displayName =
    staffName || assignment?.staff_name || username || "Staff";

  useEffect(() => {
    if (!isOpen) return;
    const offs = Array.isArray(dayOffDays) ? [...dayOffDays] : [];
    if (mode === "create") {
      const d = new Date();
      const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      setForm({ ...emptyForm, effective_from: today, day_off_days: offs });
    } else {
      setForm({ ...assignmentToForm(assignment), day_off_days: offs });
    }
    // Only re-hydrate when opening / switching mode / assignment — not on every dayOffDays identity change while typing
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, mode, assignment?.assignment_id || assignment?.salary_id]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e) => {
      if (e.key !== "Escape" || saving) return;
      if (isDatePickerPortalOpen() || isTimePickerPortalOpen()) return;
      onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, saving, onClose]);

  const updateForm = (patch) => setForm((prev) => ({ ...prev, ...patch }));

  const setShiftAndRecalc = (field, hhmm) => {
    const nextTime = toTimeHHmmss(hhmm) || emptyForm[field];
    setForm((prev) => {
      const next = { ...prev, [field]: nextTime };
      if (prev.salary_type === "flexible" && !isView) {
        const start =
          field === "working_hours_start" ? nextTime : prev.working_hours_start;
        const end =
          field === "working_hours_end" ? nextTime : prev.working_hours_end;
        const calc = monthlyMinutesFromShifts(start, end);
        if (calc) next.monthly_working_minutes = calc;
      }
      return next;
    });
  };

  const setSalaryType = (typeId) => {
    setForm((prev) => {
      if (typeId === "flexible") {
        const calc = monthlyMinutesFromShifts(
          prev.working_hours_start,
          prev.working_hours_end,
        );
        return {
          ...prev,
          salary_type: "flexible",
          overtime_enabled: false,
          fine_enabled: false,
          day_off_days: [],
          monthly_working_minutes: calc || prev.monthly_working_minutes,
        };
      }
      return { ...prev, salary_type: typeId };
    });
  };

  const toggleDayOff = (day) => {
    if (fieldsDisabled) return;
    setForm((prev) => {
      const has = prev.day_off_days.includes(day);
      return {
        ...prev,
        day_off_days: has
          ? prev.day_off_days.filter((d) => d !== day)
          : [...prev.day_off_days, day],
      };
    });
  };
  const ModeIcon =
    mode === "create" ? FiPlus : mode === "edit" ? FiEdit2 : FiEye;
  const actionTitle =
    mode === "create"
      ? "Assign Salary"
      : mode === "edit"
        ? "Edit Salary"
        : "Salary Details";
  const headerTitle = `${actionTitle} | ${displayName}`;
  const headerAccent =
    mode === "create"
      ? "from-teal-500 to-emerald-600"
      : mode === "edit"
        ? "from-sky-500 to-indigo-600"
        : "from-slate-500 to-slate-700";

  const handleSave = () => {
    if (isView) return;
    onSubmit?.(form);
  };

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {isOpen ? (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center overflow-hidden overscroll-none p-3 sm:p-4 pointer-events-none">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm pointer-events-auto"
            onClick={() => {
              if (
                saving ||
                isDatePickerPortalOpen() ||
                isTimePickerPortalOpen()
              )
                return;
              onClose?.();
            }}
            aria-hidden="true"
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="salary-assignment-title"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="relative z-[1] pointer-events-auto flex w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl max-h-[calc(100vh-1.5rem)] sm:max-h-[calc(100vh-2rem)]"
          >
            <header className="shrink-0 border-b border-slate-100 bg-gradient-to-r from-slate-50 via-white to-teal-50/40 px-5 py-3.5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div
                    className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${headerAccent} text-sm font-bold text-white shadow-md shadow-teal-900/10`}
                  >
                    {getInitials(displayName)}
                  </div>
                  <div className="min-w-0 flex items-center gap-2">
                    <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-teal-50 text-teal-700 ring-1 ring-teal-100">
                      <ModeIcon className="h-3 w-3" />
                    </span>
                    <h2
                      id="salary-assignment-title"
                      className="m-0 truncate text-base font-semibold text-slate-900"
                    >
                      {headerTitle}
                    </h2>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={saving}
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
                  aria-label="Close"
                >
                  <FiX className="h-5 w-5" />
                </button>
              </div>
            </header>

            <div
              className="px-5 py-4 flex-1 min-h-0 overflow-y-auto overscroll-y-contain [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden space-y-5"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
              <div>
                <label className={LABEL_CLASS}>Salary type</label>
                <div className="inline-flex w-full sm:w-auto rounded-xl border border-slate-200 bg-slate-50/80 p-1 gap-1">
                  {[
                    {
                      id: "fixed",
                      title: "Fixed",
                      Icon: InrIcon,
                      active:
                        "bg-teal-600 text-white shadow-sm shadow-teal-600/25",
                    },
                    {
                      id: "flexible",
                      title: "Flexible",
                      Icon: FiClock,
                      active:
                        "bg-indigo-600 text-white shadow-sm shadow-indigo-600/25",
                    },
                  ].map((opt) => {
                    const selected = form.salary_type === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        disabled={fieldsDisabled}
                        onClick={() => setSalaryType(opt.id)}
                        className={`inline-flex flex-1 sm:flex-none items-center justify-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors disabled:cursor-default ${
                          selected
                            ? opt.active
                            : "text-slate-600 hover:bg-white hover:text-slate-900"
                        }`}
                      >
                        <opt.Icon className="h-3.5 w-3.5" />
                        {opt.title}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <NumberTextField
                  label="Monthly amount"
                  icon={InrIcon}
                  iconClassName="text-teal-600"
                  prefix="₹"
                  value={form.monthly_salary}
                  onChange={(v) => updateForm({ monthly_salary: v })}
                  disabled={fieldsDisabled}
                  placeholder="30000"
                  allowDecimal
                />

                <div>
                  <label className={LABEL_CLASS}>
                    <FiCalendar className="h-3.5 w-3.5 text-sky-600" />
                    Effective from
                  </label>
                  {isView ? (
                    <div
                      className={`${INPUT_CLASS} ${INPUT_PAD} flex items-center bg-slate-50 text-slate-700`}
                    >
                      {formatLockedDate(form.effective_from)}
                    </div>
                  ) : (
                    <DatePickerField
                      value={form.effective_from}
                      onChange={(value) =>
                        updateForm({ effective_from: value || "" })
                      }
                      placeholder="Select date"
                      mode="single"
                      hideTabs
                      showResetButton={false}
                      quickOptionKeys={["td", "tom", "n7", "eom"]}
                      defaultQuickKey="td"
                      wrapperClassName="w-full block"
                      buttonClassName={`${INPUT_CLASS} ${INPUT_PAD}`}
                    />
                  )}
                </div>

                <Timepicker
                  id="salary-shift-start"
                  label="Shift start"
                  value={toTimeHHmm(form.working_hours_start)}
                  onChange={(hhmm) =>
                    setShiftAndRecalc("working_hours_start", hhmm)
                  }
                  disabled={fieldsDisabled}
                  allowClear={false}
                  placeholder="Select start"
                />
                <Timepicker
                  id="salary-shift-end"
                  label="Shift end"
                  value={toTimeHHmm(form.working_hours_end)}
                  onChange={(hhmm) =>
                    setShiftAndRecalc("working_hours_end", hhmm)
                  }
                  disabled={fieldsDisabled}
                  allowClear={false}
                  placeholder="Select end"
                />

                <DurationField
                  label="Break time"
                  icon={FiCoffee}
                  iconClassName="text-amber-600"
                  totalMinutes={form.allowed_break_minutes}
                  onChange={(v) => updateForm({ allowed_break_minutes: v })}
                  disabled={fieldsDisabled}
                  maxHours={4}
                />

                {form.salary_type === "flexible" && (
                  <DurationField
                    label="Monthly working time"
                    icon={FiClock}
                    iconClassName="text-indigo-600"
                    totalMinutes={form.monthly_working_minutes}
                    onChange={(v) => updateForm({ monthly_working_minutes: v })}
                    disabled={fieldsDisabled}
                    maxHours={400}
                  />
                )}
                {form.salary_type === "fixed" && (
                  <>
                    <DurationField
                      label="Expected working time / day"
                      icon={FiClock}
                      iconClassName="text-amber-600"
                      totalMinutes={form.expected_minutes}
                      onChange={(v) => updateForm({ expected_minutes: v })}
                      disabled={fieldsDisabled}
                      maxHours={16}
                    />
                    <DurationField
                      label="Grace time"
                      icon={FiClock}
                      iconClassName="text-slate-500"
                      totalMinutes={form.grace_period_minutes}
                      onChange={(v) => updateForm({ grace_period_minutes: v })}
                      disabled={fieldsDisabled}
                      maxHours={2}
                    />
                    <ToggleField
                      label="Overtime"
                      icon={FiZap}
                      iconClassName="text-emerald-600"
                      enabled={form.overtime_enabled}
                      disabled={fieldsDisabled}
                      onColor="bg-emerald-600"
                      onChange={() =>
                        updateForm({ overtime_enabled: !form.overtime_enabled })
                      }
                    />
                    <ToggleField
                      label="Fine"
                      icon={FiAlertTriangle}
                      iconClassName="text-rose-600"
                      enabled={form.fine_enabled}
                      disabled={fieldsDisabled}
                      onColor="bg-rose-600"
                      onChange={() =>
                        updateForm({ fine_enabled: !form.fine_enabled })
                      }
                    />
                    <div className="sm:col-span-2 lg:col-span-3">
                      <label className={LABEL_CLASS}>
                        <FiCalendar className="h-3.5 w-3.5 text-violet-600" />
                        Day off (paid leave)
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                        {WEEK_DAYS.map((day) => {
                          const selected = form.day_off_days.includes(day);
                          return (
                            <button
                              key={day}
                              type="button"
                              disabled={fieldsDisabled}
                              onClick={() => toggleDayOff(day)}
                              className={`rounded-xl border px-2 py-2.5 text-xs font-semibold transition-colors disabled:cursor-default ${
                                selected
                                  ? "border-violet-500 bg-violet-50 text-violet-700 ring-1 ring-violet-200"
                                  : "border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                              }`}
                            >
                              {day.slice(0, 3)}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            <footer className="shrink-0 border-t border-slate-100 bg-slate-50/60 px-5 py-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-50"
              >
                {isView ? "Close" : "Cancel"}
              </button>
              {canSwitchToEdit && (
                <button
                  type="button"
                  onClick={() => onEdit(assignment)}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 shadow-sm shadow-sky-600/20"
                >
                  <FiEdit2 className="h-4 w-4" />
                  Edit
                </button>
              )}
              {!isView && (
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 shadow-sm shadow-teal-600/20 disabled:opacity-50"
                >
                  <FiCheck className="h-4 w-4" />
                  {saving ? "Saving…" : isEdit ? "Save changes" : "Assign"}
                </button>
              )}
            </footer>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
