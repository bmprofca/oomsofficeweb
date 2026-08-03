import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import toast from "react-hot-toast";
import {
  FiCalendar,
  FiCheck,
  FiCheckCircle,
  FiClock,
  FiRefreshCw,
  FiX,
} from "react-icons/fi";
import API_BASE_URL from "../utils/api-controller";
import getHeaders from "../utils/get-headers";
import { MonthPickerField } from "../components/PortalMonthPicker";
import AttendanceMarkModal from "../components/Modals/AttendanceMarkModal";
import ConfirmActionModal from "../components/ConfirmActionModal";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const STATUS_META = {
  present: {
    label: "Present",
    cell: "bg-emerald-50 text-emerald-800 hover:bg-emerald-100",
    chip: "bg-emerald-50 text-emerald-700 border-emerald-200",
    Icon: FiCheck,
  },
  punched_in: {
    label: "Punched in",
    cell: "bg-emerald-50 text-emerald-800 hover:bg-emerald-100",
    chip: "bg-emerald-50 text-emerald-700 border-emerald-200",
    Icon: FiCheck,
  },
  punched_out: {
    label: "Punched out",
    cell: "bg-emerald-50 text-emerald-800 hover:bg-emerald-100",
    chip: "bg-emerald-50 text-emerald-700 border-emerald-200",
    Icon: FiCheck,
  },
  on_break: {
    label: "On break",
    cell: "bg-amber-50 text-amber-900 hover:bg-amber-100",
    chip: "bg-amber-50 text-amber-800 border-amber-200",
    Icon: FiClock,
  },
  half_day: {
    label: "Half day",
    cell: "bg-amber-50 text-amber-900 hover:bg-amber-100",
    chip: "bg-amber-50 text-amber-800 border-amber-200",
    Icon: FiClock,
  },
  leave: {
    label: "Leave",
    cell: "bg-sky-50 text-sky-800 hover:bg-sky-100",
    chip: "bg-sky-50 text-sky-700 border-sky-200",
    Icon: FiCalendar,
  },
  absent: {
    label: "Absent",
    cell: "bg-rose-50 text-rose-800 hover:bg-rose-100",
    chip: "bg-rose-50 text-rose-700 border-rose-200",
    Icon: FiX,
  },
  not_marked: {
    label: "Not marked",
    cell: "bg-white text-slate-600 hover:bg-slate-50",
    chip: "bg-slate-50 text-slate-600 border-slate-200",
    Icon: FiCalendar,
  },
};

function toYmdLocal(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function statusLabel(state) {
  return STATUS_META[state]?.label || "Not marked";
}

function isSelectableDay(record) {
  return Boolean(record?.attendance) && !record?.is_approved;
}

/** Compact duration: 8h15, 8h, 16m */
function formatCompactMinutes(mins) {
  const n = Math.round(Number(mins));
  if (!Number.isFinite(n) || n < 0) return null;
  const h = Math.floor(n / 60);
  const m = n % 60;
  if (h > 0 && m > 0) return `${h}h${String(m).padStart(2, "0")}`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

function timeToMinutes(value) {
  if (!value || typeof value !== "string") return null;
  const parts = value.split(":").map(Number);
  if (parts.length < 2 || parts.some((p) => !Number.isFinite(p))) return null;
  return parts[0] * 60 + parts[1];
}

/** Short cell stats: WT, OT, FN (important only). */
function getDayCellStats(record) {
  const att = record?.attendance;
  if (!att) return [];

  let worked = att.worked_minutes != null ? Number(att.worked_minutes) : null;
  if (
    (!Number.isFinite(worked) || worked <= 0) &&
    att.in_time &&
    att.out_time
  ) {
    const start = timeToMinutes(att.in_time);
    const end = timeToMinutes(att.out_time);
    if (start != null && end != null && end >= start) worked = end - start;
  }

  const stats = [];
  const wt = formatCompactMinutes(worked);
  if (wt && Number(worked) > 0) {
    stats.push({ key: "wt", label: "WT", value: wt, className: "text-slate-600" });
  }

  const extra = Number(att.extra_minutes) || 0;
  if (extra > 0) {
    const ot = formatCompactMinutes(extra);
    if (ot) {
      stats.push({
        key: "ot",
        label: "OT",
        value: ot,
        className: "text-emerald-700",
      });
    }
  }

  const less = Number(att.less_minutes) || 0;
  if (less > 0) {
    const fn = formatCompactMinutes(less);
    if (fn) {
      stats.push({
        key: "fn",
        label: "FN",
        value: fn,
        className: "text-rose-700",
      });
    }
  }

  return stats;
}

function dayCellTitle(cell, state, stats) {
  const parts = [`${cell.date}`, statusLabel(state)];
  stats.forEach((s) => parts.push(`${s.label} ${s.value}`));
  if (cell.record?.is_approved) parts.push("Approved");
  return parts.join(" · ");
}

const AnimatedCheckbox = ({
  checked,
  indeterminate = false,
  onChange,
  ariaLabel,
  disabled = false,
}) => {
  const inputRef = useRef(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.indeterminate = indeterminate;
    }
  }, [indeterminate, checked]);

  const isActive = checked || indeterminate;

  return (
    <label
      className={`relative inline-flex items-center group ${
        disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"
      }`}
      onClick={(e) => e.stopPropagation()}
    >
      <input
        ref={inputRef}
        type="checkbox"
        className="sr-only"
        checked={checked}
        onChange={onChange}
        aria-label={ariaLabel}
        disabled={disabled}
      />
      <motion.span
        className={`flex h-[16px] w-[16px] items-center justify-center rounded-[3px] border-2 transition-colors duration-200 ${
          isActive
            ? "border-indigo-600 bg-indigo-600 shadow-sm shadow-indigo-200"
            : "border-gray-300 bg-white group-hover:border-indigo-400"
        }`}
        animate={{ scale: isActive ? [1, 1.12, 1] : 1 }}
        transition={{ duration: 0.18 }}
        whileTap={disabled ? {} : { scale: 0.92 }}
      >
        <AnimatePresence initial={false} mode="wait">
          {indeterminate ? (
            <motion.span
              key="dash"
              className="block h-0.5 w-2 rounded-full bg-white"
              initial={{ opacity: 0, scaleX: 0.4 }}
              animate={{ opacity: 1, scaleX: 1 }}
              exit={{ opacity: 0, scaleX: 0.4 }}
              transition={{ duration: 0.12 }}
            />
          ) : checked ? (
            <motion.svg
              key="check"
              viewBox="0 0 12 12"
              className="h-2.5 w-2.5 text-white"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              transition={{ duration: 0.15 }}
            >
              <path
                d="M2.5 6l2.2 2.2 4.8-4.8"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </motion.svg>
          ) : null}
        </AnimatePresence>
      </motion.span>
    </label>
  );
};

const PageSkeleton = () => (
  <div className="w-full rounded-lg border border-gray-200 bg-white overflow-hidden" aria-busy="true">
    <div className="flex flex-wrap items-end justify-between gap-3 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white px-3 py-2.5">
      <div className="w-full sm:w-48 space-y-1.5">
        <div className="h-3 w-12 animate-pulse rounded bg-slate-200/90" />
        <div className="h-9 w-full animate-pulse rounded-lg bg-slate-200/90" />
      </div>
      <div className="flex flex-wrap gap-1.5">
        {Array.from({ length: 4 }, (_, i) => (
          <div
            key={`sum-sk-${i}`}
            className="h-8 w-[5.5rem] animate-pulse rounded-md bg-slate-200/90"
          />
        ))}
      </div>
    </div>
    <div className="border-b border-gray-100 px-3 py-2">
      <div className="h-7 w-40 animate-pulse rounded-md bg-slate-200/90" />
    </div>
    <div className="px-2 py-2 sm:px-2.5">
      <div className="mb-0.5 grid grid-cols-7 gap-px">
        {WEEKDAYS.map((d) => (
          <div
            key={d}
            className="py-1 text-center text-[11px] font-bold uppercase tracking-wide text-gray-400"
          >
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg border border-slate-200 bg-slate-200">
        {Array.from({ length: 35 }, (_, i) => (
          <div
            key={`cell-sk-${i}`}
            className="h-[5.5rem] animate-pulse bg-slate-100 sm:h-24"
          />
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {Array.from({ length: 8 }, (_, i) => (
          <div
            key={`leg-sk-${i}`}
            className="h-5 w-16 animate-pulse rounded bg-slate-200/90"
          />
        ))}
      </div>
    </div>
  </div>
);

const StaffAttendanceTab = ({
  username: usernameProp,
  staffName,
  staffData,
  variants,
}) => {
  const username = usernameProp || "";
  const now = new Date();
  const [monthValue, setMonthValue] = useState({
    month: now.getMonth() + 1,
    year: now.getFullYear(),
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [monthData, setMonthData] = useState(null);
  const [markDay, setMarkDay] = useState(null);
  const [markLoading, setMarkLoading] = useState(false);
  const [selectedDates, setSelectedDates] = useState([]);
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);
  const [bulkApproving, setBulkApproving] = useState(false);

  const fetchMonth = useCallback(async () => {
    if (!username || !monthValue?.month || !monthValue?.year) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        username,
        year: String(monthValue.year),
        month: String(monthValue.month),
      });
      const response = await fetch(
        `${API_BASE_URL}/attendance/staff-month?${params}`,
        { method: "GET", headers: getHeaders() },
      );
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to load attendance");
      }
      setMonthData(data.data);
      setSelectedDates([]);
    } catch (err) {
      setMonthData(null);
      setError(err.message || "Failed to load attendance");
      toast.error(err.message || "Failed to load attendance");
    } finally {
      setLoading(false);
    }
  }, [username, monthValue]);

  useEffect(() => {
    fetchMonth();
  }, [fetchMonth]);

  const dayMap = useMemo(() => {
    const map = new Map();
    (monthData?.days || []).forEach((day) => {
      if (day?.date) map.set(String(day.date).slice(0, 10), day);
    });
    return map;
  }, [monthData]);

  const approvableDates = useMemo(
    () =>
      (monthData?.days || [])
        .filter((d) => isSelectableDay(d))
        .map((d) => String(d.date).slice(0, 10)),
    [monthData],
  );

  const calendarCells = useMemo(() => {
    const year = monthValue.year;
    const month = monthValue.month;
    const daysInMonth = new Date(year, month, 0).getDate();
    const firstDow = (new Date(year, month - 1, 1).getDay() + 6) % 7;
    const cells = [];
    for (let i = 0; i < firstDow; i += 1) {
      cells.push({ key: `pad-${i}`, type: "pad" });
    }
    for (let day = 1; day <= daysInMonth; day += 1) {
      const ymd = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      cells.push({
        key: ymd,
        type: "day",
        day,
        date: ymd,
        record: dayMap.get(ymd) || null,
      });
    }
    while (cells.length % 7 !== 0) {
      cells.push({ key: `pad-end-${cells.length}`, type: "pad" });
    }
    return cells;
  }, [monthValue, dayMap]);

  const summary = monthData?.summary || {
    present: 0,
    absent: 0,
    leave: 0,
    half_day: 0,
    not_marked: 0,
  };

  const summaryCards = [
    {
      key: "present",
      label: "Present",
      value: summary.present || 0,
      meta: STATUS_META.present,
    },
    {
      key: "absent",
      label: "Absent",
      value: summary.absent || 0,
      meta: STATUS_META.absent,
    },
    {
      key: "half_day",
      label: "Half day",
      value: summary.half_day || 0,
      meta: STATUS_META.half_day,
    },
    {
      key: "leave",
      label: "Leave",
      value: summary.leave || 0,
      meta: STATUS_META.leave,
    },
  ];

  const staffProfile = monthData?.staff || {
    username,
    name: staffName || staffData?.fullName || username,
    designation: staffData?.designation || "",
    mobile: staffData?.phone || "",
    country_code: staffData?.country_code || "",
    email: staffData?.email || "",
    image: staffData?.image || "",
  };

  const todayYmd = toYmdLocal(new Date());
  const allSelected =
    approvableDates.length > 0 &&
    selectedDates.length === approvableDates.length;
  const someSelected =
    selectedDates.length > 0 && selectedDates.length < approvableDates.length;

  const toggleDate = (date) => {
    setSelectedDates((prev) =>
      prev.includes(date) ? prev.filter((d) => d !== date) : [...prev, date],
    );
  };

  const handleSelectAll = () => {
    if (allSelected) {
      setSelectedDates([]);
      return;
    }
    setSelectedDates(approvableDates);
  };

  const openMark = (cell) => {
    if (!cell || cell.type !== "day" || !username) return;
    const record = cell.record;
    setMarkDay({
      date: cell.date,
      row: {
        ...staffProfile,
        username,
        state: record?.state || "not_marked",
        is_approved: Boolean(record?.is_approved),
        attendance: record?.attendance || null,
        breaks: record?.breaks || [],
        break_count: record?.break_count || 0,
        open_break: record?.open_break || null,
        active_salary: record?.active_salary || null,
      },
    });
  };

  const submitMark = async (body) => {
    setMarkLoading(true);
    try {
      const headers = getHeaders();
      if (!headers) throw new Error("Missing auth headers");
      const res = await fetch(`${API_BASE_URL}/attendance/manage/mark`, {
        method: "POST",
        headers: {
          ...headers,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok || !result?.success) {
        throw new Error(result?.message || "Failed to mark attendance");
      }
      toast.success(result.message || "Attendance marked");
      setMarkDay(null);
      await fetchMonth();
    } catch (err) {
      toast.error(err.message || "Failed to mark attendance");
    } finally {
      setMarkLoading(false);
    }
  };

  const submitBulkApprove = async () => {
    if (!username || selectedDates.length === 0 || bulkApproving) return;
    setBulkApproving(true);
    try {
      const headers = getHeaders();
      if (!headers) throw new Error("Missing auth headers");

      let approved = 0;
      let failed = 0;
      for (const date of selectedDates) {
        const res = await fetch(`${API_BASE_URL}/attendance/manage/approve`, {
          method: "POST",
          headers: {
            ...headers,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            username,
            date,
            is_approved: 1,
          }),
        });
        const result = await res.json().catch(() => ({}));
        if (res.ok && result?.success) approved += 1;
        else failed += 1;
      }

      if (approved > 0 && failed === 0) {
        toast.success(
          `Approved ${approved} day${approved === 1 ? "" : "s"}`,
        );
      } else if (approved > 0) {
        toast.success(`Approved ${approved}, skipped ${failed}`);
      } else {
        throw new Error("Failed to approve selected days");
      }

      setBulkConfirmOpen(false);
      setSelectedDates([]);
      await fetchMonth();
    } catch (err) {
      toast.error(err.message || "Failed to bulk approve");
    } finally {
      setBulkApproving(false);
    }
  };

  const showSkeleton = loading && !monthData;

  return (
    <motion.div
      variants={variants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="space-y-2"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="m-0 text-base font-bold text-gray-800 md:text-lg">
          Attendance
        </h2>
        <button
          type="button"
          onClick={fetchMonth}
          disabled={!username || loading}
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-50"
          title="Refresh"
          aria-label="Refresh"
        >
          <FiRefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {!username ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Staff username is missing.
        </div>
      ) : null}

      {error && !showSkeleton ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      ) : null}

      {showSkeleton ? (
        <PageSkeleton />
      ) : (
        <div className="w-full rounded-lg border border-gray-200 bg-white overflow-hidden">
          <div className="flex flex-col gap-2.5 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white px-3 py-2.5 sm:flex-row sm:items-end sm:justify-between">
            <div className="w-full sm:w-48 shrink-0">
              <MonthPickerField
                label="Month"
                value={monthValue}
                onChange={setMonthValue}
                placeholder="Select month"
                showResetButton={false}
                minYear={now.getFullYear() - 5}
                maxYear={now.getFullYear() + 1}
                buttonClassName="w-full h-9 text-sm border border-slate-200 rounded-lg bg-white outline-none transition focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 px-2.5"
              />
            </div>
            <div className="flex flex-wrap items-center gap-1.5 sm:justify-end">
              {summaryCards.map((card) => {
                const Icon = card.meta.Icon;
                return (
                  <div
                    key={card.key}
                    className={`inline-flex h-9 items-center gap-1.5 rounded-md border px-2.5 ${card.meta.chip}`}
                  >
                    <Icon className="h-3 w-3 shrink-0" />
                    <span className="text-[10px] font-semibold uppercase tracking-wide">
                      {card.label}
                    </span>
                    <span className="text-xs font-bold tabular-nums">
                      {card.value}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 px-3 py-2">
            <div className="flex items-center gap-2">
              <AnimatedCheckbox
                checked={allSelected}
                indeterminate={someSelected}
                onChange={handleSelectAll}
                disabled={approvableDates.length === 0 || loading}
                ariaLabel="Select all unapproved dates"
              />
              <span className="text-xs text-gray-600">
                Select unapproved
                {approvableDates.length > 0
                  ? ` (${approvableDates.length})`
                  : ""}
              </span>
            </div>
            {selectedDates.length > 0 ? (
              <button
                type="button"
                onClick={() => setBulkConfirmOpen(true)}
                disabled={bulkApproving}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-teal-200 bg-teal-50 px-3 text-xs font-semibold text-teal-800 hover:bg-teal-100 disabled:opacity-50"
              >
                <FiCheckCircle className="h-3.5 w-3.5" />
                Approve {selectedDates.length}
              </button>
            ) : null}
          </div>

          <div className="px-2 py-2 sm:px-2.5">
            <div className="mb-0.5 grid grid-cols-7 gap-px">
              {WEEKDAYS.map((d) => (
                <div
                  key={d}
                  className="py-1 text-center text-[11px] font-bold uppercase tracking-wide text-gray-500"
                >
                  {d}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg border border-slate-200 bg-slate-200">
              {calendarCells.map((cell) => {
                if (cell.type === "pad") {
                  return (
                    <div
                      key={cell.key}
                      className="h-[5.5rem] bg-slate-50/80 sm:h-24"
                    />
                  );
                }
                const state = cell.record?.state || "not_marked";
                const meta = STATUS_META[state] || STATUS_META.not_marked;
                const isToday = cell.date === todayYmd;
                const selectable = isSelectableDay(cell.record);
                const isSelected = selectedDates.includes(cell.date);
                const stats = getDayCellStats(cell.record);
                const shortLabel =
                  state === "not_marked"
                    ? ""
                    : state === "half_day"
                      ? "Half"
                      : state === "punched_in" ||
                          state === "punched_out" ||
                          state === "on_break" ||
                          state === "present"
                        ? "P"
                        : state === "leave"
                          ? "L"
                          : state === "absent"
                            ? "A"
                            : "";

                return (
                  <button
                    key={cell.key}
                    type="button"
                    onClick={() => openMark(cell)}
                    title={dayCellTitle(cell, state, stats)}
                    className={`relative flex h-[5.5rem] flex-col items-stretch justify-start gap-1 px-1.5 pb-1.5 pt-1.5 text-left transition sm:h-24 sm:px-2 ${meta.cell} ${
                      isToday ? "z-[1] ring-2 ring-inset ring-teal-500" : ""
                    } ${isSelected ? "z-[1] ring-2 ring-inset ring-indigo-400" : ""}`}
                  >
                    {selectable ? (
                      <span className="absolute left-1 top-1 z-[1]">
                        <AnimatedCheckbox
                          checked={isSelected}
                          onChange={() => toggleDate(cell.date)}
                          ariaLabel={`Select ${cell.date}`}
                        />
                      </span>
                    ) : null}
                    {cell.record?.is_approved ? (
                      <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-teal-500" />
                    ) : null}
                    <div
                      className={`flex items-baseline gap-1.5 ${
                        selectable ? "pl-5" : ""
                      }`}
                    >
                      <span className="text-sm font-bold tabular-nums leading-none sm:text-base">
                        {cell.day}
                      </span>
                      {shortLabel ? (
                        <span className="text-[10px] font-semibold uppercase leading-none opacity-75 sm:text-xs">
                          {shortLabel}
                        </span>
                      ) : null}
                    </div>
                    {stats.length > 0 ? (
                      <div className="mt-auto flex min-w-0 flex-col gap-0.5 leading-tight">
                        {stats.map((s) => (
                          <span
                            key={s.key}
                            className={`truncate text-[10px] font-semibold tabular-nums sm:text-xs ${s.className}`}
                          >
                            {s.label} {s.value}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </button>
                );
              })}
            </div>

            <div className="mt-2.5 flex flex-wrap gap-1.5 text-[11px] text-gray-500">
              {[
                ["present", "Present"],
                ["half_day", "Half"],
                ["leave", "Leave"],
                ["absent", "Absent"],
                ["not_marked", "Open"],
              ].map(([key, label]) => (
                <span
                  key={key}
                  className={`inline-flex items-center rounded border px-1.5 py-0.5 ${STATUS_META[key].chip}`}
                >
                  <span className="font-semibold">{label}</span>
                </span>
              ))}
              <span className="inline-flex items-center rounded border border-slate-200 bg-white px-1.5 py-0.5 font-semibold text-slate-600">
                WT
              </span>
              <span className="inline-flex items-center rounded border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 font-semibold text-emerald-700">
                OT
              </span>
              <span className="inline-flex items-center rounded border border-rose-200 bg-rose-50 px-1.5 py-0.5 font-semibold text-rose-700">
                FN
              </span>
              <span className="inline-flex items-center gap-1 text-gray-400">
                <span className="h-1.5 w-1.5 rounded-full bg-teal-500" />
                Approved
              </span>
            </div>
          </div>
        </div>
      )}

      <AttendanceMarkModal
        isOpen={Boolean(markDay)}
        row={markDay?.row || null}
        date={markDay?.date || ""}
        loading={markLoading}
        onClose={() => {
          if (!markLoading) setMarkDay(null);
        }}
        onSubmit={submitMark}
      />

      <ConfirmActionModal
        isOpen={bulkConfirmOpen}
        title="Bulk approve"
        heading="Approve selected days?"
        message={`Approve attendance for ${selectedDates.length} selected day${selectedDates.length === 1 ? "" : "s"}. Days with an open break will be skipped.`}
        confirmLabel="Approve"
        cancelLabel="Cancel"
        loading={bulkApproving}
        tone="primary"
        icon={FiCheckCircle}
        onCancel={() => {
          if (!bulkApproving) setBulkConfirmOpen(false);
        }}
        onConfirm={submitBulkApprove}
      />
    </motion.div>
  );
};

export default StaffAttendanceTab;
