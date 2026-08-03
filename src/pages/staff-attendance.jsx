import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  FiCalendar,
  FiCheck,
  FiCheckCircle,
  FiClipboard,
  FiChevronLeft,
  FiChevronRight,
  FiClock,
  FiCoffee,
  FiLoader,
  FiLogIn,
  FiLogOut,
  FiRefreshCw,
  FiSearch,
  FiSettings,
  FiUser,
  FiUsers,
  FiX,
} from "react-icons/fi";
import { toast } from "react-hot-toast";
import { Header, Sidebar } from "../components/header";
import { DatePickerField } from "../components/PortalDatePicker";
import TablePagination from "../components/TablePagination";
import AttendanceMarkModal from "../components/Modals/AttendanceMarkModal";
import ConfirmActionModal from "../components/ConfirmActionModal";
import API_BASE_URL from "../utils/api-controller";
import getHeaders from "../utils/get-headers";
import { resolveProfileImageUrl } from "../utils/user-profile-storage";

const ATTENDANCE_TZ = "Asia/Kolkata";
const DEFAULT_LIMIT = 100;

/** Same animated checkbox as client-view.jsx */
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
        className={`flex h-[18px] w-[18px] items-center justify-center rounded-[4px] border-2 transition-colors duration-200 ${
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
              className="h-3 w-3 text-white"
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

const STATE_META = {
  not_marked: {
    label: "Not Marked",
    badge: "bg-slate-50 text-slate-500 ring-slate-200",
    Icon: FiUser,
    title: "Not marked will be treated as absent",
  },
  absent: {
    label: "Absent",
    badge: "bg-slate-100 text-slate-600 ring-slate-200",
    Icon: FiUser,
  },
  present: {
    label: "Present",
    badge: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    Icon: FiCheck,
  },
  punched_in: {
    label: "Punched in",
    badge: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    Icon: FiLogIn,
  },
  on_break: {
    label: "On break",
    badge: "bg-amber-50 text-amber-800 ring-amber-200",
    Icon: FiCoffee,
  },
  punched_out: {
    label: "Punched out",
    badge: "bg-rose-50 text-rose-700 ring-rose-200",
    Icon: FiLogOut,
  },
  half_day: {
    label: "Half day",
    badge: "bg-amber-50 text-amber-800 ring-amber-200",
    Icon: FiClock,
  },
  leave: {
    label: "Leave",
    badge: "bg-sky-50 text-sky-700 ring-sky-200",
    Icon: FiCalendar,
  },
};

const sk = "animate-pulse rounded-md bg-slate-200/80";

function getTodayDateString(timeZone = ATTENDANCE_TZ) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function shiftDateString(dateStr, days) {
  const [y, m, d] = String(dateStr).split("-").map(Number);
  if (!y || !m || !d) return getTodayDateString();
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

function formatDisplayDate(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(`${dateStr}T12:00:00`);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString([], {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Format MySQL TIME / legacy timestamp to display time. */
function formatTime(value) {
  if (value == null || value === "") return "";
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  const raw = String(value).trim();
  const iso = raw.match(/T(\d{2}):(\d{2})/);
  if (iso) return `${iso[1]}:${iso[2]}`;
  const m = raw.match(/^(\d{1,2}):(\d{2})(?::\d{2})?/);
  if (m) return `${String(Number(m[1])).padStart(2, "0")}:${m[2]}`;
  const d = new Date(raw);
  if (!Number.isNaN(d.getTime())) {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  return "";
}

/** Local mobile without country code. */
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

function TableSkeleton({ rows = 8 }) {
  return (
    <div className="overflow-x-auto" aria-busy="true">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-slate-50/80 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          <tr>
            <th className="w-16 px-4 py-3">#</th>
            <th className="px-4 py-3">Staff</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Punch in</th>
            <th className="hidden px-4 py-3 sm:table-cell">Punch out</th>
            <th className="hidden px-4 py-3 md:table-cell">Breaks</th>
            <th className="hidden px-4 py-3 lg:table-cell">Approval</th>
            <th className="w-12 px-4 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {Array.from({ length: rows }).map((_, index) => (
            <tr key={index}>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className={`${sk} h-3.5 w-6`} />
                  <div className={`${sk} h-3.5 w-7 rounded-full`} />
                </div>
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className={`${sk} h-10 w-10 rounded-full`} />
                  <div className={`${sk} h-3.5 w-36`} />
                </div>
              </td>
              <td className="px-4 py-3">
                <div className={`${sk} h-6 w-24 rounded-full`} />
              </td>
              <td className="px-4 py-3">
                <div className={`${sk} h-3.5 w-14`} />
              </td>
              <td className="hidden px-4 py-3 sm:table-cell">
                <div className={`${sk} h-3.5 w-14`} />
              </td>
              <td className="hidden px-4 py-3 md:table-cell">
                <div className={`${sk} h-3.5 w-10`} />
              </td>
              <td className="hidden px-4 py-3 lg:table-cell">
                <div className={`${sk} h-6 w-20 rounded-full`} />
              </td>
              <td className="px-4 py-3">
                <div className={`${sk} h-7 w-7 rounded-lg`} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TableRowSkeleton() {
  return (
    <tr className="bg-amber-50/40">
      <td className="px-4 py-3">
        <div className={`${sk} h-3.5 w-6`} />
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className={`${sk} h-10 w-10 rounded-full`} />
          <div className="space-y-2">
            <div className={`${sk} h-3.5 w-32`} />
            <div className={`${sk} h-3 w-20`} />
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <div className={`${sk} h-6 w-24 rounded-full`} />
      </td>
      <td className="px-4 py-3">
        <div className={`${sk} h-3.5 w-14`} />
      </td>
      <td className="hidden px-4 py-3 sm:table-cell">
        <div className={`${sk} h-3.5 w-14`} />
      </td>
      <td className="hidden px-4 py-3 md:table-cell">
        <div className={`${sk} h-3.5 w-12`} />
      </td>
      <td className="hidden px-4 py-3 lg:table-cell">
        <div className={`${sk} h-6 w-20 rounded-full`} />
      </td>
      <td className="px-4 py-3 text-right">
        <div className={`ml-auto ${sk} h-7 w-7 rounded-lg`} />
      </td>
    </tr>
  );
}

function StaffAttendancePage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(() => {
    const saved = localStorage.getItem("sidebarMinimized");
    return saved ? JSON.parse(saved) : false;
  });

  const [selectedDate, setSelectedDate] = useState(() => getTodayDateString());
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_LIMIT);
  const [loading, setLoading] = useState(true);
  const [payload, setPayload] = useState(null);
  const [markRow, setMarkRow] = useState(null);
  const [markLoading, setMarkLoading] = useState(false);
  const [updatingUsername, setUpdatingUsername] = useState("");
  const [selectedItems, setSelectedItems] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);
  const [bulkApproving, setBulkApproving] = useState(false);
  const [bulkApplyOvertime, setBulkApplyOvertime] = useState(true);
  const [bulkApplyFine, setBulkApplyFine] = useState(true);

  const contentInset = isMinimized ? "md:pl-20" : "md:pl-[260px]";
  const today = getTodayDateString();
  const isToday = selectedDate === today;
  const staff = Array.isArray(payload?.staff) ? payload.staff : [];
  const pagination = payload?.pagination || {
    page: 1,
    limit: DEFAULT_LIMIT,
    total: 0,
    totalPages: 1,
    is_last_page: true,
  };
  const summary = payload?.summary || {
    total: 0,
    present: 0,
    absent: 0,
    punched_in: 0,
    on_break: 0,
    punched_out: 0,
    leave: 0,
    half_day: 0,
    approved: 0,
  };

  const loadDayList = useCallback(
    async ({
      date,
      searchTerm = "",
      pageNum = 1,
      pageLimit = DEFAULT_LIMIT,
      showSkeleton = true,
    } = {}) => {
      if (showSkeleton) setLoading(true);
      try {
        const headers = await getHeaders();
        if (!headers) throw new Error("Missing auth headers");

        const params = new URLSearchParams({
          date,
          page: String(pageNum),
          limit: String(pageLimit),
        });
        if (searchTerm) params.set("search", searchTerm);

        const res = await fetch(
          `${API_BASE_URL}/attendance/day-list?${params}`,
          { headers },
        );
        const result = await res.json().catch(() => ({}));
        if (!res.ok || !result?.success) {
          throw new Error(result?.message || "Failed to load attendance");
        }
        setPayload(result.data || null);
        if (result.data?.pagination?.page) {
          setPage(result.data.pagination.page);
        }
      } catch (error) {
        console.error("Attendance day list error", error);
        toast.error(error.message || "Failed to load attendance");
        setPayload(null);
      } finally {
        if (showSkeleton) setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    loadDayList({
      date: selectedDate,
      searchTerm: search,
      pageNum: page,
      pageLimit: limit,
    });
  }, [selectedDate, search, page, limit, loadDayList]);

  useEffect(() => {
    setSelectedItems([]);
    setSelectAll(false);
    setBulkConfirmOpen(false);
  }, [selectedDate, search, page, limit]);

  useEffect(() => {
    if (selectedItems.length === 0) {
      setSelectAll(false);
    } else if (staff.length > 0 && selectedItems.length === staff.length) {
      setSelectAll(true);
    } else {
      setSelectAll(false);
    }
  }, [selectedItems, staff.length]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const next = searchInput.trim();
      setSearch((prev) => {
        if (prev === next) return prev;
        setPage(1);
        return next;
      });
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const handleToggleSelect = useCallback((username) => {
    const id = String(username || "");
    if (!id) return;
    setSelectedItems((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectAll) {
      setSelectedItems([]);
      setSelectAll(false);
      return;
    }
    setSelectedItems(staff.map((row) => String(row.username)).filter(Boolean));
    setSelectAll(true);
  }, [selectAll, staff]);

  const submitBulkApprove = useCallback(async () => {
    if (selectedItems.length === 0 || bulkApproving) return;
    setBulkApproving(true);
    try {
      const headers = await getHeaders();
      if (!headers) throw new Error("Missing auth headers");
      const res = await fetch(
        `${API_BASE_URL}/attendance/manage/bulk-approve`,
        {
          method: "POST",
          headers: {
            ...headers,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            usernames: selectedItems,
            date: selectedDate,
            apply_overtime: bulkApplyOvertime,
            apply_fine: bulkApplyFine,
          }),
        },
      );
      const result = await res.json().catch(() => ({}));
      if (!res.ok || !result?.success) {
        throw new Error(result?.message || "Failed to bulk approve");
      }
      const done = Number(result?.data?.done ?? 0);
      const notDone = Number(result?.data?.not_done ?? 0);
      toast.success(
        result.message || `Approved ${done} staff. Skipped ${notDone} staff.`,
      );
      setBulkConfirmOpen(false);
      setSelectedItems([]);
      setSelectAll(false);
      await loadDayList({
        date: selectedDate,
        searchTerm: search,
        pageNum: page,
        pageLimit: limit,
        showSkeleton: false,
      });
    } catch (error) {
      toast.error(error.message || "Failed to bulk approve");
    } finally {
      setBulkApproving(false);
    }
  }, [
    selectedItems,
    bulkApproving,
    selectedDate,
    search,
    page,
    limit,
    loadDayList,
    bulkApplyOvertime,
    bulkApplyFine,
  ]);

  const summaryCards = useMemo(
    () => [
      {
        key: "total",
        label: "Staff",
        value: summary.total,
        tone: "text-violet-800 bg-violet-50 border-violet-200",
        iconTone: "bg-violet-100 text-violet-700",
        Icon: FiUsers,
      },
      {
        key: "present",
        label: "Present",
        value: summary.present,
        tone: "text-emerald-800 bg-emerald-50 border-emerald-200",
        iconTone: "bg-emerald-100 text-emerald-700",
        Icon: FiCheck,
      },
      {
        key: "absent",
        label: "Absent",
        value: summary.absent,
        tone: "text-rose-800 bg-rose-50 border-rose-200",
        iconTone: "bg-rose-100 text-rose-700",
        Icon: FiX,
      },
      {
        key: "half_day",
        label: "Half day",
        value: summary.half_day || 0,
        tone: "text-amber-800 bg-amber-50 border-amber-200",
        iconTone: "bg-amber-100 text-amber-700",
        Icon: FiClock,
      },
      {
        key: "leave",
        label: "Leave",
        value: summary.leave || 0,
        tone: "text-sky-800 bg-sky-50 border-sky-200",
        iconTone: "bg-sky-100 text-sky-700",
        Icon: FiCalendar,
      },
    ],
    [summary],
  );

  const submitMark = useCallback(
    async (body) => {
      setUpdatingUsername(body?.username || "");
      setMarkLoading(true);
      try {
        const headers = await getHeaders();
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
        setMarkRow(null);
        await loadDayList({
          date: selectedDate,
          searchTerm: search,
          pageNum: page,
          pageLimit: limit,
          showSkeleton: false,
        });
      } catch (error) {
        toast.error(error.message || "Failed to mark attendance");
      } finally {
        setMarkLoading(false);
        setUpdatingUsername("");
      }
    },
    [loadDayList, selectedDate, search, page, limit],
  );

  const serialBase = (pagination.page - 1) * pagination.limit;

  return (
    <div className="min-h-screen bg-slate-50/80">
      <Header
        setMobileMenuOpen={setMobileMenuOpen}
        isMinimized={isMinimized}
        setIsMinimized={setIsMinimized}
      />
      <Sidebar
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
        isMinimized={isMinimized}
        setIsMinimized={setIsMinimized}
      />

      <main
        className={`pt-16 transition-all duration-300 ease-in-out ${contentInset}`}
      >
        <div className="mx-3 sm:mx-4 py-4 sm:py-5">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="m-0 flex items-center gap-2 text-xl font-semibold text-slate-900 sm:text-2xl">
                <FiClock className="h-5 w-5 text-teal-600" />
                Attendance
              </h1>
              <p className="m-0 mt-1 text-sm text-slate-500">
                {formatDisplayDate(selectedDate)}
                {isToday ? " · Today" : ""}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setPage(1);
                  setSelectedDate((d) => shiftDateString(d, -1));
                }}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                title="Previous day"
              >
                <FiChevronLeft className="h-4 w-4" />
              </button>

              <DatePickerField
                value={selectedDate}
                onChange={(next) => {
                  const value = typeof next === "string" ? next : next?.date;
                  if (value) {
                    setPage(1);
                    setSelectedDate(value);
                  }
                }}
                hideTabs
                showResetButton={false}
                maxSelectableDate={today}
                placeholder="Select date"
                wrapperClassName="w-auto"
                buttonClassName="h-10 w-auto whitespace-nowrap rounded-xl border border-slate-200 bg-white px-3 text-slate-800 hover:bg-slate-50"
              />

              <button
                type="button"
                disabled={isToday}
                onClick={() => {
                  setPage(1);
                  setSelectedDate((d) => shiftDateString(d, 1));
                }}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                title="Next day"
              >
                <FiChevronRight className="h-4 w-4" />
              </button>

              {!isToday ? (
                <button
                  type="button"
                  onClick={() => {
                    setPage(1);
                    setSelectedDate(today);
                  }}
                  className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-teal-200 bg-teal-50 px-3 text-sm font-semibold text-teal-800 hover:bg-teal-100"
                >
                  <FiCalendar className="h-3.5 w-3.5" />
                  Today
                </button>
              ) : null}

              <button
                type="button"
                onClick={() =>
                  loadDayList({
                    date: selectedDate,
                    searchTerm: search,
                    pageNum: page,
                    pageLimit: limit,
                  })
                }
                disabled={loading || markLoading}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                title="Refresh"
              >
                <FiRefreshCw
                  className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                />
              </button>
            </div>
          </div>

          <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
            {summaryCards.map((card) => (
              <div
                key={card.key}
                className={`rounded-2xl border px-3 py-3 ${card.tone}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="m-0 text-[11px] font-semibold uppercase tracking-wide opacity-70">
                      {card.label}
                    </p>
                    {loading ? (
                      <div className={`${sk} mt-2 h-7 w-10`} />
                    ) : (
                      <p className="m-0 mt-1 text-xl font-semibold tabular-nums">
                        {card.value}
                      </p>
                    )}
                  </div>
                  <span
                    className={`inline-flex h-9 w-9 items-center justify-center rounded-xl ${card.iconTone}`}
                  >
                    <card.Icon className="h-4 w-4" />
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                  <FiUsers className="h-4 w-4 text-slate-400" />
                  Staff list
                </div>
                {selectedItems.length > 0 ? (
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-100 text-xs font-bold text-indigo-700">
                      {selectedItems.length}
                    </div>
                    <span className="text-sm text-gray-600">selected</span>
                  </div>
                ) : null}
                <AnimatePresence>
                  {selectedItems.length > 0 ? (
                    <motion.button
                      type="button"
                      initial={{ opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.96 }}
                      onClick={() => {
                        setBulkApplyOvertime(true);
                        setBulkApplyFine(true);
                        setBulkConfirmOpen(true);
                      }}
                      disabled={bulkApproving}
                      className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-indigo-600 px-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
                    >
                      <FiCheckCircle className="h-4 w-4" />
                      Bulk approve
                    </motion.button>
                  ) : null}
                </AnimatePresence>
              </div>
              <div className="relative w-full sm:max-w-xs">
                <FiSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search name or designation…"
                  className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-9 text-sm text-slate-800 outline-none transition focus:border-teal-400 focus:bg-white focus:ring-2 focus:ring-teal-500/20"
                />
                {searchInput ? (
                  <button
                    type="button"
                    onClick={() => setSearchInput("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                    aria-label="Clear search"
                  >
                    <FiX className="h-3.5 w-3.5" />
                  </button>
                ) : null}
              </div>
            </div>

            {loading ? (
              <TableSkeleton />
            ) : staff.length === 0 ? (
              <div className="px-4 py-16 text-center">
                <div className="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 text-slate-400">
                  {loading ? (
                    <FiLoader className="h-5 w-5 animate-spin" />
                  ) : (
                    <FiUsers className="h-5 w-5" />
                  )}
                </div>
                <p className="m-0 text-sm font-semibold text-slate-800">
                  No staff found
                </p>
                <p className="m-0 mt-1 text-xs text-slate-500">
                  {search
                    ? "Try a different search."
                    : "No active staff mapped to this branch."}
                </p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-slate-50/80 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="w-16 px-4 py-3 font-semibold">
                          <div className="flex items-center gap-2">
                            <AnimatedCheckbox
                              checked={selectAll}
                              indeterminate={
                                selectedItems.length > 0 &&
                                selectedItems.length < staff.length
                              }
                              onChange={handleSelectAll}
                              disabled={staff.length === 0}
                              ariaLabel="Select all staff"
                            />
                            <span>#</span>
                          </div>
                        </th>
                        <th className="px-4 py-3 font-semibold">Staff</th>
                        <th className="px-4 py-3 font-semibold">Status</th>
                        <th className="px-4 py-3 font-semibold">Punch in</th>
                        <th className="hidden px-4 py-3 font-semibold sm:table-cell">
                          Punch out
                        </th>
                        <th className="hidden px-4 py-3 font-semibold md:table-cell">
                          Breaks
                        </th>
                        <th className="hidden px-4 py-3 font-semibold lg:table-cell">
                          Approval
                        </th>
                        <th className="w-12 px-4 py-3 font-semibold">
                          <span
                            className="inline-flex items-center justify-center"
                            title="Manage"
                          >
                            <FiSettings className="h-3.5 w-3.5" aria-hidden />
                            <span className="sr-only">Manage</span>
                          </span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {staff.map((row, index) => {
                        const meta =
                          STATE_META[row.state] || STATE_META.not_marked;
                        const StatusIcon = meta.Icon;
                        const localMobile = formatLocalMobile(
                          row.mobile,
                          row.country_code,
                        );
                        const imageUrl = resolveProfileImageUrl(row.image);
                        const rowBusy =
                          markLoading && updatingUsername === row.username;
                        const isSelected = selectedItems.includes(row.username);
                        if (rowBusy) {
                          return <TableRowSkeleton key={row.username} />;
                        }
                        return (
                          <motion.tr
                            key={row.username}
                            className={`group transition-colors duration-150 hover:bg-teal-50/40 ${
                              isSelected
                                ? "bg-indigo-50/50"
                                : index % 2 === 0
                                  ? "bg-white"
                                  : "bg-slate-50/55"
                            }`}
                          >
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <AnimatedCheckbox
                                  checked={isSelected}
                                  onChange={() =>
                                    handleToggleSelect(row.username)
                                  }
                                  ariaLabel={`Select ${row.name || "staff"}`}
                                />
                                <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded bg-gray-100 text-xs font-medium tabular-nums text-gray-700">
                                  {serialBase + index + 1}
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                {imageUrl ? (
                                  <img
                                    src={imageUrl}
                                    alt=""
                                    className="h-10 w-10 rounded-full object-cover ring-1 ring-slate-200"
                                  />
                                ) : (
                                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-teal-50 text-xs font-semibold text-teal-700 ring-1 ring-teal-100">
                                    {getInitials(row.name)}
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <Link
                                    to={`/staff/view/profile/${encodeURIComponent(row.username)}`}
                                    className="block truncate font-semibold text-slate-900 no-underline hover:text-teal-700 hover:no-underline"
                                  >
                                    {row.name}
                                  </Link>
                                  {localMobile ? (
                                    <p className="m-0 mt-0.5 truncate text-xs tabular-nums text-slate-500">
                                      {localMobile}
                                    </p>
                                  ) : null}
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span
                                title={meta.title || undefined}
                                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${meta.badge}`}
                              >
                                <StatusIcon className="h-3.5 w-3.5" />
                                {meta.label}
                              </span>
                            </td>
                            <td className="px-4 py-3 tabular-nums text-slate-800">
                              {formatTime(row.attendance?.in_time)}
                            </td>
                            <td className="hidden px-4 py-3 tabular-nums text-slate-800 sm:table-cell">
                              {formatTime(row.attendance?.out_time)}
                            </td>
                            <td className="hidden px-4 py-3 text-slate-700 md:table-cell">
                              {row.break_count > 0 ? (
                                <span className="inline-flex items-center gap-1 text-xs font-medium">
                                  <FiCoffee className="h-3.5 w-3.5 text-amber-600" />
                                  {row.break_count}
                                  {row.open_break ? (
                                    <span className="text-amber-700">
                                      · open
                                    </span>
                                  ) : null}
                                </span>
                              ) : null}
                            </td>
                            <td className="hidden px-4 py-3 lg:table-cell">
                              {row.state === "not_marked" ||
                              !row.attendance ? null : row.is_approved ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
                                  <FiCheck className="h-3.5 w-3.5" />
                                  Approved
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
                                  Pending
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <button
                                type="button"
                                onClick={() => setMarkRow(row)}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-teal-600 transition hover:bg-teal-50"
                                aria-label={`Manage attendance for ${row.name}`}
                                title="Manage attendance"
                              >
                                <FiClipboard className="h-4 w-4" />
                              </button>
                            </td>
                          </motion.tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <TablePagination
                  page={pagination.page}
                  limit={limit}
                  total={pagination.total}
                  totalPages={pagination.totalPages}
                  isLastPage={pagination.is_last_page}
                  defaultRows={DEFAULT_LIMIT}
                  onPageChange={setPage}
                  onLimitChange={(next) => {
                    setLimit(next);
                    setPage(1);
                  }}
                />
              </>
            )}
          </div>
        </div>
      </main>

      <AttendanceMarkModal
        isOpen={Boolean(markRow)}
        row={markRow}
        date={selectedDate}
        loading={markLoading}
        onClose={() => {
          if (!markLoading) setMarkRow(null);
        }}
        onSubmit={submitMark}
      />

      <ConfirmActionModal
        isOpen={bulkConfirmOpen}
        title="Bulk approve"
        heading="Approve selected attendance?"
        message={`Approve ${selectedItems.length} selected staff for ${formatDisplayDate(selectedDate)}. Only staff with both punch in and punch out will be approved; others will be skipped.`}
        confirmLabel="Approve"
        cancelLabel="Cancel"
        loading={bulkApproving}
        tone="primary"
        icon={FiCheckCircle}
        onCancel={() => {
          if (!bulkApproving) setBulkConfirmOpen(false);
        }}
        onConfirm={submitBulkApprove}
      >
        <div className="space-y-2">
          <p className="m-0 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Apply for eligible staff
          </p>
          <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-emerald-100 bg-emerald-50/60 px-3.5 py-3">
            <div className="min-w-0 text-left">
              <p className="m-0 text-sm font-semibold text-slate-800">
                Overtime
              </p>
              <p className="m-0 text-xs text-slate-500">
                Pay extra when worked more than expected hours
              </p>
            </div>
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              checked={bulkApplyOvertime}
              disabled={bulkApproving}
              onChange={(e) => setBulkApplyOvertime(e.target.checked)}
            />
          </label>
          <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-rose-100 bg-rose-50/60 px-3.5 py-3">
            <div className="min-w-0 text-left">
              <p className="m-0 text-sm font-semibold text-slate-800">Fine</p>
              <p className="m-0 text-xs text-slate-500">
                Deduct when worked less than expected hours
              </p>
            </div>
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500"
              checked={bulkApplyFine}
              disabled={bulkApproving}
              onChange={(e) => setBulkApplyFine(e.target.checked)}
            />
          </label>
        </div>
      </ConfirmActionModal>
    </div>
  );
}

export default StaffAttendancePage;
