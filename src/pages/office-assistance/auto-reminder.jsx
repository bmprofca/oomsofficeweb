import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  FiPlus,
  FiTrash2,
  FiSearch,
  FiClock,
  FiUsers,
  FiCalendar,
  FiRefreshCw,
  FiX,
  FiSend,
  FiLoader,
  FiUser,
  FiMail,
  FiPhone,
  FiSmartphone,
  FiEdit2,
  FiMoreVertical,
  FiAlertTriangle,
} from "react-icons/fi";
import { FaWhatsapp } from "react-icons/fa6";
import { TbCurrencyRupee } from "react-icons/tb";
import { motion, AnimatePresence } from "framer-motion";
import { Header, Sidebar } from "../../components/header";
import getHeaders from "../../utils/get-headers";
import API_BASE_URL from "../../utils/api-controller";
import toast from "react-hot-toast";
import CustomSelect from "../../components/CustomSelect";
import { optionByValue } from "../../utils/customSelectHelpers";
import TablePagination from "../../components/TablePagination";
import { DateRangePickerField } from "../../components/PortalDatePicker";
import AnimatedCheckbox from "../../components/AnimatedCheckbox";

const CLIENT_PARTY_SEARCH_LIMIT = 20;
const MENU_Z = 99999;
const MENU_GAP = 6;
const MENU_PAD = 8;
const SEARCH_DEBOUNCE_MS = 350;

const formatCurrency = (amount) =>
  new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(Number(amount) || 0));

const mapSearchPartyClientOption = (item) => {
  if (!item?.party_type || !item?.party_id) return null;
  if (String(item.party_type).trim().toLowerCase() !== "client") return null;
  const partyId = String(item.party_id).trim();
  const details = item.client || {};
  return {
    party_id: partyId,
    username: partyId,
    name: details.name || partyId,
    email: details.email || "",
    mobile: details.mobile || "",
    country_code: details.country_code || "",
    balance: item.balance ?? 0,
    userType: "client",
  };
};

const loadClientPartyOptions = (excludeUsernames = []) => {
  const exclude = new Set(
    (excludeUsernames || []).map((u) => String(u || "").trim()).filter(Boolean)
  );
  return async (search = "", page = 1) => {
    const headers = getHeaders();
    if (!headers) throw new Error("Authentication headers missing");
    const pageNum = Math.max(1, Number(page) || 1);
    const response = await fetch(`${API_BASE_URL}/transaction/search-party`, {
      method: "POST",
      headers: {
        ...headers,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        search: String(search || "").trim(),
        party_types: ["client"],
        page_no: pageNum,
        limit: CLIENT_PARTY_SEARCH_LIMIT,
      }),
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok || json.success === false) {
      throw new Error(json.message || "Failed to search clients");
    }
    const options = (Array.isArray(json.data) ? json.data : [])
      .map(mapSearchPartyClientOption)
      .filter(Boolean)
      .filter((opt) => !exclude.has(String(opt.username)));
    const isLast = json.meta?.is_last_page;
    const hasMore =
      isLast === false ||
      (isLast == null &&
        pageNum * CLIENT_PARTY_SEARCH_LIMIT < Number(json.meta?.total || 0));
    return { options, hasMore: Boolean(hasMore) };
  };
};

const getClientOptionLabel = (item) =>
  item?.name || item?.label || item?.username || "—";
const getClientOptionValue = (item) =>
  item?.username || item?.party_id || item?.value || "";

const balanceColorClass = (balance) =>
  Number(balance) > 0 ? "text-emerald-600" : "text-rose-600";

const renderClientPartyOption = (item) => {
  const mobile = item?.mobile
    ? item.country_code
      ? `+${item.country_code} ${item.mobile}`
      : String(item.mobile)
    : "";
  const meta = [mobile, item?.email].filter(Boolean).join(" · ") || "—";
  return (
    <div className="flex w-full min-w-0 items-center gap-2 text-sm">
      <div className="min-w-0 flex-1">
        <p className="m-0 truncate text-sm font-semibold leading-none text-slate-800">
          {item?.name || "—"}
        </p>
        <p className="m-0 truncate text-[11px] leading-tight text-slate-500">
          {meta}
        </p>
      </div>
      <span
        className={`shrink-0 text-xs font-semibold tabular-nums ${balanceColorClass(item?.balance)}`}
      >
        ₹{formatCurrency(item?.balance)}
      </span>
    </div>
  );
};

const SelectedClientCard = ({ client, onRemove }) => {
  const mobile = client?.mobile
    ? client.country_code
      ? `+${client.country_code} ${client.mobile}`
      : String(client.mobile)
    : "—";
  return (
    <div className="rounded-lg border border-indigo-200/80 bg-indigo-50/60 shadow-sm">
      <div className="flex items-start gap-2.5 px-3 py-2.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-indigo-100 text-xs font-bold text-indigo-700 ring-1 ring-white/80">
          {(client?.name || "C").trim().charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="m-0 truncate text-sm font-semibold text-slate-800">
            {client?.name || client?.username || "—"}
          </p>
          <div className="mt-1 space-y-0.5 text-[11px] text-slate-600">
            <p className="m-0 flex items-center gap-1.5 truncate">
              <FiPhone className="h-3 w-3 shrink-0 text-slate-400" />
              <span className="truncate">{mobile}</span>
            </p>
            <p className="m-0 flex items-center gap-1.5 truncate">
              <FiMail className="h-3 w-3 shrink-0 text-slate-400" />
              <span className="truncate">{client?.email || "—"}</span>
            </p>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span
            className={`text-sm font-semibold tabular-nums ${balanceColorClass(client?.balance)}`}
          >
            ₹{formatCurrency(client?.balance)}
          </span>
          {onRemove ? (
            <button
              type="button"
              onClick={onRemove}
              className="rounded-md p-0.5 text-slate-400 transition hover:bg-indigo-100 hover:text-rose-600"
              title="Remove"
            >
              <FiX className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
};

const DAY_OPTIONS = [
  { value: "0", label: "Sunday" },
  { value: "1", label: "Monday" },
  { value: "2", label: "Tuesday" },
  { value: "3", label: "Wednesday" },
  { value: "4", label: "Thursday" },
  { value: "5", label: "Friday" },
  { value: "6", label: "Saturday" },
];

const FREQUENCY_OPTIONS = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

const MONTH_DAY_OPTIONS = [
  ...Array.from({ length: 28 }, (_, i) => ({
    value: String(i + 1),
    label: String(i + 1),
  })),
  { value: "last", label: "Last day of month" },
];

const CHANNEL_META = [
  {
    id: "whatsapp",
    label: "WhatsApp",
    icon: FaWhatsapp,
    selected: "border-emerald-400 bg-emerald-50 text-emerald-800",
  },
  {
    id: "email",
    label: "Email",
    icon: FiMail,
    selected: "border-sky-400 bg-sky-50 text-sky-800",
  },
  {
    id: "sms",
    label: "SMS",
    icon: FiSmartphone,
    selected: "border-violet-400 bg-violet-50 text-violet-800",
  },
];

const emptyScheduleForm = () => ({
  type: "daily",
  day: "1",
  date: "1",
  hour: "09",
  minute: "00",
});

const pad2 = (value) => String(value ?? "0").padStart(2, "0");

const buildScheduleConfig = (form) => {
  const time = `${pad2(form.hour)}:${pad2(form.minute)}`;
  if (form.type === "daily") return { time };
  if (form.type === "weekly") {
    return { time, day_of_week: Number(form.day) };
  }
  if (form.date === "last") {
    return { time, last_day_of_month: true };
  }
  return { time, day_of_month: Number(form.date) || 1 };
};

const scheduleFormFromRow = (row) => {
  const config = row?.schedule_config || {};
  let hour = "09";
  let minute = "00";
  if (config.time) {
    const [h, m] = String(config.time).split(":");
    hour = pad2(h || "09");
    minute = pad2(m || "00");
  }
  let day = "1";
  if (config.day_of_week !== undefined && config.day_of_week !== null) {
    day = String(config.day_of_week === 7 ? 0 : config.day_of_week);
  }
  let date = "1";
  if (config.last_day_of_month) date = "last";
  else if (config.day_of_month) date = String(config.day_of_month);

  return {
    type: row?.schedule_type || "daily",
    day,
    date,
    hour,
    minute,
  };
};

const formatHumanTime = (value) => {
  if (!value) return "—";
  try {
    const d = new Date(String(value).replace(" ", "T"));
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return String(value);
  }
};

const parseScheduleTime = (timeStr) => {
  if (!timeStr) return { hour: 9, minute: 0 };
  const [h, m] = String(timeStr).split(":").map(Number);
  return { hour: Number.isFinite(h) ? h : 9, minute: Number.isFinite(m) ? m : 0 };
};

const atScheduleTime = (date, hour, minute) => {
  const d = new Date(date);
  d.setSeconds(0, 0);
  d.setHours(hour, minute, 0, 0);
  return d;
};

const isMatchingWeekdayOfMonth = (year, month, day, scheduleConfig) => {
  const date = new Date(year, month, day);
  const currentDayOfWeek = date.getDay();
  const weekOfMonth = Math.ceil(day / 7);
  const isLastWeek = day > new Date(year, month + 1, 0).getDate() - 7;
  const scheduledDayOfWeek =
    Number(scheduleConfig.day_of_week) === 7 ? 0 : Number(scheduleConfig.day_of_week);
  const scheduledWeekOfMonth = scheduleConfig.week_of_month;

  if (scheduledDayOfWeek !== currentDayOfWeek) return false;
  if (scheduledWeekOfMonth === "last") return isLastWeek;
  return weekOfMonth === Number(scheduledWeekOfMonth);
};

const isScheduleDayMatch = (scheduleType, config, date) => {
  const dayOfWeek = date.getDay();
  const dayOfMonth = date.getDate();
  const month = date.getMonth();
  const year = date.getFullYear();

  switch (scheduleType) {
    case "daily":
      if (config.days?.length) {
        const normalizedDays = config.days.map((d) => (d === 0 || d === 7 ? 0 : Number(d)));
        return normalizedDays.includes(dayOfWeek);
      }
      return true;
    case "weekly": {
      if (config.day_of_week === undefined || config.day_of_week === null) return false;
      const scheduledDay = config.day_of_week === 7 ? 0 : Number(config.day_of_week);
      return dayOfWeek === scheduledDay;
    }
    case "monthly":
      if (config.day_of_month) {
        return dayOfMonth === Number(config.day_of_month);
      }
      if (config.week_of_month && config.day_of_week !== undefined) {
        return isMatchingWeekdayOfMonth(year, month, dayOfMonth, config);
      }
      if (config.last_day_of_month) {
        const lastDay = new Date(year, month + 1, 0).getDate();
        return dayOfMonth === lastDay;
      }
      return false;
    default:
      return false;
  }
};

const getNextScheduleRunAt = (scheduleType, config, from = new Date()) => {
  if (!scheduleType || !config?.time) return null;
  const { hour, minute } = parseScheduleTime(config.time);
  const now = new Date(from);
  now.setSeconds(0, 0);

  for (let dayOffset = 0; dayOffset <= 400; dayOffset += 1) {
    const candidateDate = new Date(now);
    candidateDate.setDate(candidateDate.getDate() + dayOffset);
    if (!isScheduleDayMatch(scheduleType, config, candidateDate)) continue;

    const runAt = atScheduleTime(candidateDate, hour, minute);
    if (runAt.getTime() > now.getTime()) return runAt;
  }

  return null;
};

const formatScheduleWaitTime = (target, now = new Date()) => {
  const diffMs = target.getTime() - now.getTime();
  if (diffMs <= 0) return "Due now";
  if (diffMs < 60_000) return "Less than 1 min";

  const totalMinutes = Math.ceil(diffMs / 60_000);
  const days = Math.floor(totalMinutes / (24 * 60));
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
  const mins = totalMinutes % 60;

  const parts = [];
  if (days > 0) parts.push(`${days} day${days === 1 ? "" : "s"}`);
  if (hours > 0) parts.push(`${hours} hr`);
  if (mins > 0 || parts.length === 0) parts.push(`${mins} min${mins === 1 ? "" : "s"}`);

  return parts.join(" ");
};

const ScheduleWaitLabel = ({ scheduleType, scheduleConfig }) => {
  const [waitLabel, setWaitLabel] = useState("");

  useEffect(() => {
    const update = () => {
      const nextRun = getNextScheduleRunAt(scheduleType, scheduleConfig);
      setWaitLabel(nextRun ? formatScheduleWaitTime(nextRun) : "");
    };

    update();
    const timer = setInterval(update, 30_000);
    return () => clearInterval(timer);
  }, [scheduleType, scheduleConfig]);

  if (!waitLabel) return null;

  return (
    <p className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-amber-700">
      <FiClock className="h-3 w-3 shrink-0" />
      <span>{waitLabel}</span>
    </p>
  );
};

const ChannelChips = ({ channels = [] }) => (
  <div className="flex flex-wrap gap-1">
    {CHANNEL_META.filter((c) => channels.includes(c.id)).map((c) => {
      const Icon = c.icon;
      return (
        <span
          key={c.id}
          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${c.selected}`}
        >
          <Icon className="h-3 w-3" />
          {c.label}
        </span>
      );
    })}
    {!channels.length ? (
      <span className="text-xs text-gray-400">No channels</span>
    ) : null}
  </div>
);

const ScheduleFields = ({ form, onChange, disabled = false }) => {
  const timeValue = `${pad2(form.hour)}:${pad2(form.minute)}`;
  return (
    <div className="space-y-3">
      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
          Frequency
        </label>
        <CustomSelect
          options={FREQUENCY_OPTIONS}
          value={optionByValue(FREQUENCY_OPTIONS, form.type)}
          onChange={(opt) => onChange("type", opt?.value || "daily")}
          placeholder="Select frequency"
          isClearable={false}
          isDisabled={disabled}
        />
      </div>

      {form.type === "weekly" ? (
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
            Day of week
          </label>
          <CustomSelect
            options={DAY_OPTIONS}
            value={optionByValue(DAY_OPTIONS, form.day)}
            onChange={(opt) => onChange("day", opt?.value ?? "1")}
            placeholder="Select day"
            isClearable={false}
            isDisabled={disabled}
          />
        </div>
      ) : null}

      {form.type === "monthly" ? (
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
            Day of month
          </label>
          <CustomSelect
            options={MONTH_DAY_OPTIONS}
            value={optionByValue(MONTH_DAY_OPTIONS, form.date)}
            onChange={(opt) => onChange("date", opt?.value || "1")}
            placeholder="Select date"
            isClearable={false}
            isDisabled={disabled}
          />
        </div>
      ) : null}

      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
          Send at
        </label>
        <input
          type="time"
          step={60}
          value={timeValue}
          disabled={disabled}
          onChange={(e) => {
            const raw = String(e.target.value || "09:00");
            const [h = "09", m = "00"] = raw.split(":");
            onChange("time", { hour: pad2(h), minute: pad2(m) });
          }}
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:bg-gray-50 disabled:text-gray-400"
        />
      </div>
    </div>
  );
};

const ChannelPicker = ({ selected, onToggle }) => (
  <div className="space-y-2">
    {CHANNEL_META.map((channel) => {
      const Icon = channel.icon;
      const active = selected.includes(channel.id);
      return (
        <div
          key={channel.id}
          role="button"
          tabIndex={0}
          onClick={() => onToggle(channel.id)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onToggle(channel.id);
            }
          }}
          className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 transition ${
            active
              ? "border-indigo-300 bg-indigo-50/70"
              : "border-gray-200 bg-white hover:border-gray-300"
          }`}
        >
          <span onClick={(e) => e.stopPropagation()}>
            <AnimatedCheckbox
              checked={active}
              onChange={() => onToggle(channel.id)}
              ariaLabel={channel.label}
            />
          </span>
          <Icon
            className={`h-4 w-4 shrink-0 ${
              active ? "text-indigo-600" : "text-gray-400"
            }`}
          />
          <span
            className={`text-sm font-medium ${
              active ? "text-indigo-900" : "text-gray-700"
            }`}
          >
            {channel.label}
          </span>
        </div>
      );
    })}
  </div>
);

const ActionMenu = ({ items }) => {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const btnRef = useRef(null);
  const menuRef = useRef(null);
  const visibleItems = (items || []).filter(Boolean);

  const calcPos = useCallback(() => {
    const btn = btnRef.current;
    const menu = menuRef.current;
    if (!btn) return;
    const r = btn.getBoundingClientRect();
    const mH = menu?.offsetHeight || Math.max(44, visibleItems.length * 36 + 8);
    const mW = menu?.offsetWidth || 168;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const candidates = [
      { top: r.top - mH - MENU_GAP, left: r.right - mW },
      { top: r.bottom + MENU_GAP, left: r.right - mW },
      { top: r.top, left: r.right + MENU_GAP },
      { top: r.top, left: r.left - mW - MENU_GAP },
    ];

    const fits = (p) =>
      p.top >= MENU_PAD &&
      p.left >= MENU_PAD &&
      p.top + mH <= vh - MENU_PAD &&
      p.left + mW <= vw - MENU_PAD;

    const chosen = candidates.find(fits) || candidates[1];
    setPos({
      top: Math.min(Math.max(MENU_PAD, chosen.top), vh - MENU_PAD - mH),
      left: Math.min(Math.max(MENU_PAD, chosen.left), vw - MENU_PAD - mW),
    });
  }, [visibleItems.length]);

  useEffect(() => {
    if (!open) return undefined;
    const raf = requestAnimationFrame(() => calcPos());
    return () => cancelAnimationFrame(raf);
  }, [open, calcPos]);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (
        !btnRef.current?.contains(e.target) &&
        !menuRef.current?.contains(e.target)
      ) {
        setOpen(false);
      }
    };
    const onClose = () => setOpen(false);
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    window.addEventListener("scroll", onClose, true);
    window.addEventListener("resize", calcPos);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("scroll", onClose, true);
      window.removeEventListener("resize", calcPos);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, calcPos]);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
        aria-label="Actions"
      >
        <FiMoreVertical className="h-3.5 w-3.5" />
      </button>

      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {open ? (
              <motion.div
                ref={menuRef}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.12 }}
                style={{
                  position: "fixed",
                  top: pos.top,
                  left: pos.left,
                  zIndex: MENU_Z,
                  height: "auto",
                }}
                className="w-44 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-xl"
              >
                {visibleItems.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    disabled={item.disabled}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (item.disabled) return;
                      setOpen(false);
                      item.onClick?.();
                    }}
                    className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition-colors ${
                      item.danger
                        ? "text-red-600 hover:bg-red-50"
                        : "text-gray-700 hover:bg-gray-50"
                    } disabled:cursor-not-allowed disabled:opacity-40`}
                  >
                    {item.icon}
                    {item.label}
                  </button>
                ))}
              </motion.div>
            ) : null}
          </AnimatePresence>,
          document.body
        )}
    </>
  );
};

const ConfirmModal = ({
  open,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  loading = false,
  tone = "indigo",
  icon: Icon = FiAlertTriangle,
  onConfirm,
  onCancel,
}) => {
  if (!open) return null;

  const tones = {
    danger: {
      wrap: "bg-red-100",
      icon: "text-red-600",
      btn: "bg-red-600 hover:bg-red-700",
    },
    indigo: {
      wrap: "bg-indigo-100",
      icon: "text-indigo-600",
      btn: "bg-indigo-600 hover:bg-indigo-700",
    },
    emerald: {
      wrap: "bg-emerald-100",
      icon: "text-emerald-600",
      btn: "bg-emerald-600 hover:bg-emerald-700",
    },
    amber: {
      wrap: "bg-amber-100",
      icon: "text-amber-600",
      btn: "bg-amber-600 hover:bg-amber-700",
    },
  };
  const palette = tones[tone] || tones.indigo;

  return createPortal(
    <div
      className="fixed inset-0 z-[10090] flex items-center justify-center overflow-y-auto bg-black/50 p-4 backdrop-blur-sm"
      onClick={onCancel}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.97 }}
        transition={{ duration: 0.15 }}
        className="flex w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-6">
          <div
            className={`mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full ${palette.wrap}`}
          >
            <Icon className={`h-6 w-6 ${palette.icon}`} />
          </div>
          <h4 className="mb-2 text-center text-base font-semibold text-gray-900">
            {title}
          </h4>
          <p className="text-center text-sm leading-relaxed text-gray-600">
            {message}
          </p>
        </div>
        <div className="flex shrink-0 gap-2 border-t border-gray-100 bg-gray-50 px-6 py-4">
          {cancelText ? (
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="flex-1 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 disabled:opacity-50"
            >
              {cancelText}
            </button>
          ) : null}
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-colors disabled:opacity-50 ${palette.btn}`}
          >
            {loading ? (
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : null}
            {confirmText}
          </button>
        </div>
      </motion.div>
    </div>,
    document.body
  );
};

const SkeletonBone = ({ className = "" }) => (
  <div className={`animate-pulse rounded bg-gray-200 ${className}`} />
);

const ClientsTableSkeleton = ({ rows = 6 }) => (
  <>
    {Array.from({ length: rows }).map((_, i) => (
      <tr key={`sk-${i}`} className="animate-pulse">
        <td className="w-12 p-3">
          <div className="flex justify-center">
            <SkeletonBone className="h-[18px] w-[18px] rounded-[4px]" />
          </div>
        </td>
        <td className="px-3 py-3">
          <SkeletonBone className="h-3 w-6" />
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <SkeletonBone className="h-8 w-8 rounded-full" />
            <div className="space-y-1.5">
              <SkeletonBone className="h-3.5 w-28" />
              <SkeletonBone className="h-3 w-20" />
            </div>
          </div>
        </td>
        <td className="px-4 py-3">
          <SkeletonBone className="mb-1 h-3 w-16" />
          <SkeletonBone className="h-3 w-24" />
        </td>
        <td className="px-4 py-3">
          <SkeletonBone className="h-5 w-28 rounded-full" />
        </td>
        <td className="px-4 py-3">
          <SkeletonBone className="h-3.5 w-16" />
        </td>
        <td className="px-4 py-3">
          <SkeletonBone className="ml-auto h-6 w-6 rounded" />
        </td>
      </tr>
    ))}
  </>
);

const StatCard = ({ title, value, sub, icon: Icon, tone }) => {
  const tones = {
    indigo: "bg-indigo-50 text-indigo-600 border-indigo-100",
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
    sky: "bg-sky-50 text-sky-600 border-sky-100",
  };
  return (
    <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2.5 shadow-sm">
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md border ${tones[tone] || tones.indigo}`}
      >
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="min-w-0">
        <p className="m-0 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
          {title}
        </p>
        <p className="m-0 text-base font-bold leading-tight text-gray-800">
          {value}
        </p>
        {sub ? (
          <p className="m-0 truncate text-[10px] text-gray-500">{sub}</p>
        ) : null}
      </div>
    </div>
  );
};

const AutoReminder = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(() => {
    const saved = localStorage.getItem("sidebarMinimized");
    return saved ? JSON.parse(saved) : false;
  });

  useEffect(() => {
    localStorage.setItem("sidebarMinimized", JSON.stringify(isMinimized));
  }, [isMinimized]);

  const contentInset = isMinimized ? "md:pl-20" : "md:pl-[260px]";

  const [activeTab, setActiveTab] = useState("clients");
  const [initialLoading, setInitialLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState([]);
  const [pagination, setPagination] = useState({
    page_no: 1,
    limit: 10,
    total: 0,
    total_pages: 1,
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [stats, setStats] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingRow, setEditingRow] = useState(null);
  const [audienceMode, setAudienceMode] = useState("client");
  const [selectAllClients, setSelectAllClients] = useState(false);
  const [selectedClientOptions, setSelectedClientOptions] = useState([]);
  const [clientPickerValue, setClientPickerValue] = useState(null);
  const [groupOptions, setGroupOptions] = useState([]);
  const [selectedGroupOption, setSelectedGroupOption] = useState(null);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [scheduleForm, setScheduleForm] = useState(emptyScheduleForm());
  const [channels, setChannels] = useState([]);
  const [saving, setSaving] = useState(false);
  const [processingId, setProcessingId] = useState(null);

  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsPage, setLogsPage] = useState(1);
  const [logsLimit, setLogsLimit] = useState(10);
  const [logsTotal, setLogsTotal] = useState(0);
  const [logDateRange, setLogDateRange] = useState({ start: "", end: "" });

  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    title: "",
    message: "",
    confirmText: "Confirm",
    cancelText: "Cancel",
    tone: "indigo",
    icon: FiAlertTriangle,
    loading: false,
    onConfirm: null,
  });

  const searchSkipRef = useRef(true);
  const paginationRef = useRef(pagination);
  paginationRef.current = pagination;

  const apiFetch = useCallback(async (path, options = {}) => {
    const headers = getHeaders();
    if (!headers) throw new Error("Not authenticated");
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        ...headers,
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || result.success === false) {
      throw new Error(result.message || "Request failed");
    }
    return result;
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const result = await apiFetch("/autopay/stats");
      setStats(result.data || null);
    } catch (error) {
      console.error(error);
    }
  }, [apiFetch]);

  const fetchClients = useCallback(
    async (page = 1, limit = 10, query = "") => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page_no: String(page),
          limit: String(limit),
          active_only: "1",
        });
        if (String(query || "").trim()) {
          params.set("query", String(query).trim());
        }
        const result = await apiFetch(`/autopay/client/list?${params}`);
        setClients(Array.isArray(result.data) ? result.data : []);
        setPagination({
          page_no: result.pagination?.page_no || page,
          limit: result.pagination?.limit || limit,
          total: result.pagination?.total || 0,
          total_pages: result.pagination?.total_pages || 1,
        });
        setSelectedIds([]);
      } catch (error) {
        toast.error(error.message || "Failed to load enrolled clients");
      } finally {
        setLoading(false);
        setInitialLoading(false);
      }
    },
    [apiFetch]
  );

  const fetchLogs = useCallback(async () => {
    setLogsLoading(true);
    try {
      const params = new URLSearchParams({
        page_no: String(logsPage),
        limit: String(logsLimit),
      });
      if (logDateRange.start && logDateRange.end) {
        params.set("start_date", logDateRange.start);
        params.set("end_date", logDateRange.end);
      }
      const result = await apiFetch(`/autopay/logs?${params}`);
      setLogs(Array.isArray(result.data) ? result.data : []);
      setLogsTotal(result.pagination?.total || 0);
    } catch (error) {
      toast.error(error.message || "Failed to load logs");
    } finally {
      setLogsLoading(false);
    }
  }, [apiFetch, logDateRange.end, logDateRange.start, logsLimit, logsPage]);

  const fetchUserGroups = useCallback(async () => {
    setLoadingGroups(true);
    try {
      const result = await apiFetch("/group/list?page=1&limit=100");
      const rows = Array.isArray(result.data)
        ? result.data
        : Array.isArray(result.data?.groups)
          ? result.data.groups
          : [];
      setGroupOptions(
        rows.map((g) => {
          const count =
            Number(g.firm_count ?? g.statistics?.total_firms_in_group ?? 0) || 0;
          const name = g.name || g.group_name || `Group ${g.group_id}`;
          return {
            value: g.group_id,
            label: `${name} (${count} firm${count === 1 ? "" : "s"})`,
            firm_count: count,
            group: g,
          };
        })
      );
    } catch (error) {
      console.error(error);
      toast.error(error.message || "Failed to load groups");
      setGroupOptions([]);
    } finally {
      setLoadingGroups(false);
    }
  }, [apiFetch]);

  useEffect(() => {
    fetchClients(1, paginationRef.current.limit, "");
    fetchStats();
  }, [fetchClients, fetchStats]);

  useEffect(() => {
    if (searchSkipRef.current) {
      searchSkipRef.current = false;
      return undefined;
    }
    const timer = setTimeout(() => {
      fetchClients(1, paginationRef.current.limit, searchQuery);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchQuery, fetchClients]);

  useEffect(() => {
    if (activeTab === "logs") fetchLogs();
  }, [activeTab, fetchLogs]);

  useEffect(() => {
    if (showAddModal) fetchUserGroups();
  }, [showAddModal, fetchUserGroups]);

  const closeConfirm = () =>
    setConfirmDialog((prev) => ({
      ...prev,
      open: false,
      loading: false,
      onConfirm: null,
    }));

  const openConfirm = ({
    title,
    message,
    confirmText = "Confirm",
    cancelText = "Cancel",
    tone = "indigo",
    icon = FiAlertTriangle,
    onConfirm,
  }) => {
    setConfirmDialog({
      open: true,
      title,
      message,
      confirmText,
      cancelText,
      tone,
      icon,
      loading: false,
      onConfirm,
    });
  };

  const handleConfirm = async () => {
    if (!confirmDialog.onConfirm) {
      closeConfirm();
      return;
    }
    setConfirmDialog((prev) => ({ ...prev, loading: true }));
    try {
      await confirmDialog.onConfirm();
      closeConfirm();
    } catch (error) {
      setConfirmDialog((prev) => ({ ...prev, loading: false }));
      toast.error(error.message || "Action failed");
    }
  };

  const resetAddForm = () => {
    setAudienceMode("client");
    setSelectAllClients(false);
    setSelectedClientOptions([]);
    setClientPickerValue(null);
    setSelectedGroupOption(null);
    setScheduleForm(emptyScheduleForm());
    setChannels([]);
  };

  const handleScheduleChange = (field, value) => {
    if (field === "time" && value && typeof value === "object") {
      setScheduleForm((prev) => ({
        ...prev,
        hour: pad2(value.hour),
        minute: pad2(value.minute),
      }));
      return;
    }
    setScheduleForm((prev) => ({ ...prev, [field]: value }));
  };

  const toggleChannel = (id) => {
    setChannels((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const switchAudienceMode = (mode) => {
    setAudienceMode(mode);
    setSelectAllClients(false);
    setSelectedClientOptions([]);
    setClientPickerValue(null);
    setSelectedGroupOption(null);
  };

  const handlePickClient = (option) => {
    if (!option) {
      setClientPickerValue(null);
      return;
    }
    const username = getClientOptionValue(option);
    if (!username) return;
    setSelectedClientOptions((prev) => {
      if (prev.some((c) => getClientOptionValue(c) === username)) return prev;
      return [...prev, option];
    });
    setClientPickerValue(null);
  };

  const removeSelectedClient = (username) => {
    setSelectedClientOptions((prev) =>
      prev.filter((c) => getClientOptionValue(c) !== username)
    );
  };

  const selectedClientUsernames = useMemo(
    () =>
      selectedClientOptions
        .map((c) => getClientOptionValue(c))
        .filter(Boolean),
    [selectedClientOptions]
  );

  const clientLoadOptions = useMemo(
    () => loadClientPartyOptions(selectedClientUsernames),
    [selectedClientUsernames]
  );

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (audienceMode === "group" && !selectedGroupOption?.value) {
      toast.error("Select a group");
      return;
    }
    if (
      audienceMode === "client" &&
      !selectAllClients &&
      !selectedClientOptions.length
    ) {
      toast.error("Select at least one client or choose Select all");
      return;
    }
    if (!channels.length) {
      toast.error("Select at least one channel");
      return;
    }
    setSaving(true);
    try {
      const body =
        audienceMode === "group"
          ? {
              group_id: selectedGroupOption.value,
              schedule_type: scheduleForm.type,
              schedule_config: buildScheduleConfig(scheduleForm),
              channels,
              is_active: 1,
            }
          : selectAllClients
            ? {
                select_all_clients: true,
                schedule_type: scheduleForm.type,
                schedule_config: buildScheduleConfig(scheduleForm),
                channels,
                is_active: 1,
              }
            : {
                usernames: selectedClientOptions
                  .map((opt) => getClientOptionValue(opt) || opt?.username)
                  .filter(Boolean),
                schedule_type: scheduleForm.type,
                schedule_config: buildScheduleConfig(scheduleForm),
                channels,
                is_active: 1,
              };

      const result = await apiFetch("/autopay/client/add", {
        method: "POST",
        body: JSON.stringify(body),
      });
      const added = result.data?.added || 0;
      const updated = result.data?.updated || 0;
      if (!added && !updated) {
        toast.error("No clients were enrolled");
        return;
      }
      toast.success(
        [added ? `Added ${added}` : null, updated ? `Updated ${updated}` : null]
          .filter(Boolean)
          .join(", ")
      );
      setShowAddModal(false);
      resetAddForm();
      fetchClients(1, pagination.limit, searchQuery);
      fetchStats();
    } catch (error) {
      toast.error(error.message || "Failed to enroll clients");
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (row) => {
    setEditingRow(row);
    setScheduleForm(scheduleFormFromRow(row));
    setChannels(Array.isArray(row.channels) ? [...row.channels] : ["email"]);
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingRow?.reminder_id) return;
    if (!channels.length) {
      toast.error("Select at least one channel");
      return;
    }
    setSaving(true);
    try {
      await apiFetch("/autopay/client/update", {
        method: "PUT",
        body: JSON.stringify({
          reminder_id: editingRow.reminder_id,
          schedule_type: scheduleForm.type,
          schedule_config: buildScheduleConfig(scheduleForm),
          channels,
        }),
      });
      toast.success("Reminder config updated");
      setShowEditModal(false);
      setEditingRow(null);
      fetchClients(pagination.page_no, pagination.limit, searchQuery);
      fetchStats();
    } catch (error) {
      toast.error(error.message || "Failed to update");
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = (row) => {
    openConfirm({
      title: "Remove client",
      message: `Remove ${row.name || row.username} from auto payment reminder?`,
      confirmText: "Remove",
      tone: "danger",
      icon: FiTrash2,
      onConfirm: async () => {
        await apiFetch(`/autopay/client/${row.reminder_id}`, {
          method: "DELETE",
        });
        toast.success("Client removed");
        fetchClients(pagination.page_no, pagination.limit, searchQuery);
        fetchStats();
      },
    });
  };

  const handleSendNow = (row) => {
    openConfirm({
      title: "Send reminder",
      message: `Send payment reminder to ${row.name || row.username} now? Reminder is sent only if balance is positive.`,
      confirmText: "Send now",
      tone: "emerald",
      icon: FiSend,
      onConfirm: async () => {
        setProcessingId(row.reminder_id);
        try {
          await apiFetch(`/autopay/process/client/${row.reminder_id}`, {
            method: "POST",
          });
          toast.success("Reminder processed");
          fetchStats();
          if (activeTab === "logs") fetchLogs();
        } finally {
          setProcessingId(null);
        }
      },
    });
  };

  const handleProcessAll = () => {
    openConfirm({
      title: "Run all reminders",
      message:
        "Send payment reminders to all enrolled clients now? Messages are sent only when balance is greater than zero.",
      confirmText: "Run now",
      tone: "indigo",
      icon: FiRefreshCw,
      onConfirm: async () => {
        const toastId = toast.loading("Running reminders…");
        try {
          await apiFetch("/autopay/process/all", { method: "POST" });
          toast.success("Reminders processed", { id: toastId });
          fetchStats();
          if (activeTab === "logs") fetchLogs();
        } catch (error) {
          toast.error(error.message || "Failed to run reminders", {
            id: toastId,
          });
          throw error;
        }
      },
    });
  };

  const handleSendSelected = () => {
    if (!selectedIds.length) {
      toast.error("Select at least one client");
      return;
    }
    openConfirm({
      title: "Send selected reminders",
      message: `Send payment reminders to ${selectedIds.length} selected client${selectedIds.length === 1 ? "" : "s"}? Messages are sent only when balance is greater than zero.`,
      confirmText: "Send selected",
      tone: "emerald",
      icon: FiSend,
      onConfirm: async () => {
        const toastId = toast.loading("Sending selected reminders…");
        try {
          await apiFetch("/autopay/process/selected", {
            method: "POST",
            body: JSON.stringify({ reminder_ids: selectedIds }),
          });
          toast.success("Selected reminders processed", { id: toastId });
          setSelectedIds([]);
          fetchStats();
          if (activeTab === "logs") fetchLogs();
        } catch (error) {
          toast.error(error.message || "Failed to send selected", {
            id: toastId,
          });
          throw error;
        }
      },
    });
  };

  const pageIds = clients.map((c) => c.reminder_id).filter(Boolean);
  const allPageSelected =
    pageIds.length > 0 && pageIds.every((id) => selectedIds.includes(id));

  const toggleSelectAll = () => {
    if (allPageSelected) {
      setSelectedIds((prev) => prev.filter((id) => !pageIds.includes(id)));
    } else {
      setSelectedIds((prev) => [...new Set([...prev, ...pageIds])]);
    }
  };

  const toggleSelectOne = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header
          mobileMenuOpen={mobileMenuOpen}
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
        <div
          className={`pt-16 transition-all duration-300 ease-in-out ${contentInset}`}
        >
          <div className="mx-2 my-3 flex h-full flex-col sm:mx-4 md:mx-8 md:my-4">
            <SkeletonBone className="mb-4 h-7 w-56" />
            <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <SkeletonBone key={i} className="h-14 rounded-lg" />
              ))}
            </div>
            <SkeletonBone className="mb-4 h-8 w-64 rounded-lg" />
            <SkeletonBone className="h-80 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Header
        mobileMenuOpen={mobileMenuOpen}
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

      <div
        className={`pt-16 transition-all duration-300 ease-in-out ${contentInset}`}
      >
        <div className="mx-2 my-3 flex h-full flex-col sm:mx-4 md:mx-8 md:my-4">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h1 className="text-2xl font-bold text-gray-900">
              Auto Payment Reminder
            </h1>
            <div className="flex flex-wrap gap-2">
              {selectedIds.length ? (
                <button
                  type="button"
                  onClick={handleSendSelected}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                >
                  <FiSend className="h-3.5 w-3.5" />
                  Send selected ({selectedIds.length})
                </button>
              ) : null}
              <button
                type="button"
                onClick={handleProcessAll}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
              >
                <FiRefreshCw className="h-3.5 w-3.5" />
                Run all reminders
              </button>
              <button
                type="button"
                onClick={() => {
                  resetAddForm();
                  setShowAddModal(true);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700"
              >
                <FiPlus className="h-3.5 w-3.5" />
                Add client
              </button>
            </div>
          </div>

          {stats ? (
            <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <StatCard
                title="Enrolled clients"
                value={stats.clients?.active || 0}
                sub={`${stats.clients?.inactive || 0} inactive`}
                icon={FiUsers}
                tone="indigo"
              />
              <StatCard
                title="Today sent"
                value={stats.today_runs?.total_sent || 0}
                sub={`Skipped ${stats.today_runs?.total_skipped || 0} · Failed ${stats.today_runs?.total_failed || 0}`}
                icon={FiSend}
                tone="emerald"
              />
              <StatCard
                title="Today runs"
                value={stats.today_runs?.total_runs || 0}
                sub={`${stats.today_runs?.successful || 0} ok · ${stats.today_runs?.failed || 0} failed`}
                icon={FiCalendar}
                tone="sky"
              />
            </div>
          ) : null}

          <div className="mb-4 inline-flex rounded-lg border border-gray-200/50 bg-gray-100 p-1">
            {[
              { id: "clients", label: "Enrolled clients", icon: FiUsers },
              { id: "logs", label: "Logs", icon: FiClock },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`inline-flex items-center gap-2 rounded-md px-4 py-1.5 text-xs font-semibold transition ${
                    activeTab === tab.id
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-500 hover:text-gray-900"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          <AnimatePresence mode="wait">
            {activeTab === "clients" ? (
              <motion.div
                key="clients"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm"
              >
                <div className="flex flex-col gap-3 border-b border-gray-200 bg-gray-50/50 px-3 py-3 sm:flex-row sm:items-center sm:justify-between md:px-4">
                  <h3 className="m-0 text-sm font-semibold text-gray-800">
                    Enrolled clients
                  </h3>
                  <div className="relative">
                    <FiSearch className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    <input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search name, mobile…"
                      className="w-56 rounded-lg border border-gray-300 py-2 pl-9 pr-8 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    />
                    {searchQuery ? (
                      <button
                        type="button"
                        onClick={() => setSearchQuery("")}
                        className="absolute right-2 top-2 rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                        aria-label="Clear search"
                      >
                        <FiX className="h-4 w-4" />
                      </button>
                    ) : null}
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="w-12 shrink-0 p-3">
                          <div className="flex justify-center">
                            <AnimatedCheckbox
                              checked={allPageSelected}
                              indeterminate={
                                selectedIds.length > 0 && !allPageSelected
                              }
                              onChange={toggleSelectAll}
                              disabled={!pageIds.length || loading}
                              ariaLabel="Select all on page"
                            />
                          </div>
                        </th>
                        <th className="px-3 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-gray-600">
                          #
                        </th>
                        <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-gray-600">
                          Client
                        </th>
                        <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-gray-600">
                          Schedule
                        </th>
                        <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-gray-600">
                          Channels
                        </th>
                        <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-gray-600">
                          Balance
                        </th>
                        <th className="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-wide text-gray-600">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {loading ? (
                        <ClientsTableSkeleton />
                      ) : clients.length === 0 ? (
                        <tr>
                          <td
                            colSpan={7}
                            className="px-4 py-12 text-center text-sm text-gray-500"
                          >
                            No enrolled clients yet. Click Add client to start.
                          </td>
                        </tr>
                      ) : (
                        clients.map((row, index) => {
                          const sn =
                            (pagination.page_no - 1) * pagination.limit +
                            index +
                            1;
                          const checked = selectedIds.includes(row.reminder_id);
                          return (
                            <tr
                              key={row.reminder_id}
                              className="hover:bg-gray-50/80"
                            >
                              <td className="w-12 shrink-0 p-3">
                                <div className="flex justify-center">
                                  <AnimatedCheckbox
                                    checked={checked}
                                    onChange={() =>
                                      toggleSelectOne(row.reminder_id)
                                    }
                                    ariaLabel={`Select ${row.name || row.username}`}
                                  />
                                </div>
                              </td>
                              <td className="px-3 py-3 text-[11px] font-bold text-gray-700">
                                {sn}
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
                                    <FiUser className="h-3.5 w-3.5" />
                                  </div>
                                  <div>
                                    <p className="text-sm font-semibold text-gray-800">
                                      {row.name || row.username}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      {row.mobile || row.username}
                                    </p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <p className="text-xs font-medium capitalize text-indigo-700">
                                  {row.schedule_type}
                                </p>
                                <p className="mt-0.5 text-xs text-gray-500">
                                  {row.schedule_display || "—"}
                                </p>
                                <ScheduleWaitLabel
                                  scheduleType={row.schedule_type}
                                  scheduleConfig={row.schedule_config}
                                />
                              </td>
                              <td className="px-4 py-3">
                                <ChannelChips channels={row.channels || []} />
                              </td>
                              <td className="px-4 py-3">
                                <span
                                  className={`inline-flex items-center gap-0.5 text-sm font-semibold ${balanceColorClass(row.balance)}`}
                                >
                                  <TbCurrencyRupee className="h-3.5 w-3.5" />
                                  {formatCurrency(row.balance)}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <ActionMenu
                                  items={[
                                    {
                                      label:
                                        processingId === row.reminder_id
                                          ? "Sending…"
                                          : "Send now",
                                      icon:
                                        processingId === row.reminder_id ? (
                                          <FiLoader className="h-3.5 w-3.5 animate-spin text-emerald-500" />
                                        ) : (
                                          <FiSend className="h-3.5 w-3.5 text-emerald-500" />
                                        ),
                                      disabled:
                                        processingId === row.reminder_id,
                                      onClick: () => handleSendNow(row),
                                    },
                                    {
                                      label: "Edit config",
                                      icon: (
                                        <FiEdit2 className="h-3.5 w-3.5 text-indigo-500" />
                                      ),
                                      onClick: () => openEdit(row),
                                    },
                                    {
                                      label: "Remove",
                                      icon: (
                                        <FiTrash2 className="h-3.5 w-3.5" />
                                      ),
                                      danger: true,
                                      onClick: () => handleRemove(row),
                                    },
                                  ]}
                                />
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="border-t border-gray-100 px-4 py-3">
                  <TablePagination
                    page={pagination.page_no}
                    totalPages={pagination.total_pages}
                    total={pagination.total}
                    limit={pagination.limit}
                    onPageChange={(page) =>
                      fetchClients(page, pagination.limit, searchQuery)
                    }
                    onLimitChange={(limit) =>
                      fetchClients(1, limit, searchQuery)
                    }
                  />
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="logs"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm"
              >
                <div className="flex flex-col gap-3 border-b border-gray-200 bg-gray-50/50 px-3 py-3 sm:flex-row sm:items-center sm:justify-between md:px-4">
                  <h3 className="m-0 text-sm font-semibold text-gray-800">
                    Run logs
                  </h3>
                  <div className="flex flex-wrap items-center gap-2">
                    <DateRangePickerField
                      value={{
                        start: logDateRange.start,
                        end: logDateRange.end,
                      }}
                      onChange={(range) => {
                        setLogDateRange({
                          start: range?.start || "",
                          end: range?.end || "",
                        });
                        setLogsPage(1);
                      }}
                      placeholder="Filter by date"
                      mode="range"
                      buttonClassName="min-w-[12rem] px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-700 hover:border-indigo-400"
                    />
                    <button
                      type="button"
                      onClick={fetchLogs}
                      className="rounded-lg bg-gray-100 px-3 py-2 text-sm text-gray-700 hover:bg-gray-200"
                    >
                      Refresh
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-gray-600">
                          #
                        </th>
                        <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-gray-600">
                          When
                        </th>
                        <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-gray-600">
                          Client
                        </th>
                        <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-gray-600">
                          Status
                        </th>
                        <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-gray-600">
                          Counts
                        </th>
                        <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-gray-600">
                          Message
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {logsLoading ? (
                        Array.from({ length: 6 }).map((_, i) => (
                          <tr key={`log-sk-${i}`} className="animate-pulse">
                            {Array.from({ length: 6 }).map((__, j) => (
                              <td key={j} className="px-4 py-3">
                                <SkeletonBone className="h-3.5 w-24" />
                              </td>
                            ))}
                          </tr>
                        ))
                      ) : logs.length === 0 ? (
                        <tr>
                          <td
                            colSpan={6}
                            className="px-4 py-12 text-center text-sm text-gray-500"
                          >
                            No logs yet.
                          </td>
                        </tr>
                      ) : (
                        logs.map((log, index) => {
                          const sn = (logsPage - 1) * logsLimit + index + 1;
                          return (
                            <tr
                              key={log.log_id}
                              className="hover:bg-gray-50/80"
                            >
                              <td className="px-3 py-3 text-[11px] font-bold text-gray-700">
                                {sn}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-700">
                                {formatHumanTime(log.run_date)}
                              </td>
                              <td className="px-4 py-3">
                                <p className="m-0 text-sm font-semibold text-gray-800">
                                  {log.client_name || log.username || "—"}
                                </p>
                              </td>
                              <td className="px-4 py-3">
                                <span
                                  className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize ${
                                    log.status === "completed"
                                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                      : log.status === "skipped"
                                        ? "border-amber-200 bg-amber-50 text-amber-700"
                                        : "border-rose-200 bg-rose-50 text-rose-700"
                                  }`}
                                >
                                  {log.status}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-xs text-gray-600">
                                Sent {log.sent_count || 0} · Skip{" "}
                                {log.skipped_count || 0} · Fail{" "}
                                {log.failed_count || 0}
                              </td>
                              <td className="max-w-xs truncate px-4 py-3 text-xs text-gray-500">
                                {log.error_message || log.message || "—"}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="border-t border-gray-100 px-4 py-3">
                  <TablePagination
                    page={logsPage}
                    totalPages={Math.ceil(logsTotal / logsLimit) || 1}
                    total={logsTotal}
                    limit={logsLimit}
                    onPageChange={setLogsPage}
                    onLimitChange={(limit) => {
                      setLogsLimit(limit);
                      setLogsPage(1);
                    }}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Add client modal */}
      <AnimatePresence>
        {showAddModal ? (
          <motion.div
            key="add-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none fixed inset-0 z-[10080] flex items-center justify-center overflow-hidden overscroll-none p-3 sm:p-4"
          >
            <div
              className="pointer-events-auto absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => !saving && setShowAddModal(false)}
            />
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="pointer-events-auto relative z-[1] flex max-h-[calc(100vh-1.5rem)] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl sm:max-h-[calc(100vh-2rem)]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex shrink-0 items-center justify-between gap-2 border-b border-indigo-500/20 bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-3.5 text-white">
                <div>
                  <p className="m-0 text-[10px] font-semibold uppercase tracking-wide text-white/80">
                    Auto payment reminder
                  </p>
                  <h2 className="m-0 text-sm font-semibold">
                    Add clients + config
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => !saving && setShowAddModal(false)}
                  className="rounded-lg p-1.5 text-white/80 hover:bg-white/15"
                >
                  <FiX className="h-4 w-4" />
                </button>
              </div>

              <form
                onSubmit={handleAddSubmit}
                className="flex min-h-0 flex-1 flex-col overflow-hidden"
              >
                <div
                  className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-5 py-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                  style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
                >
                  <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:min-h-[28rem] lg:gap-6">
                    <div className="rounded-xl border border-gray-200 bg-white p-4">
                      <p className="mb-3 m-0 text-sm font-semibold text-gray-800">
                        Audience
                      </p>
                      <div className="mb-4 inline-flex rounded-lg border border-gray-200 bg-gray-100 p-1">
                        {[
                          { id: "client", label: "Client" },
                          { id: "group", label: "Group" },
                        ].map((tab) => (
                          <button
                            key={tab.id}
                            type="button"
                            disabled={saving}
                            onClick={() => switchAudienceMode(tab.id)}
                            className={`rounded-md px-4 py-1.5 text-xs font-semibold transition ${
                              audienceMode === tab.id
                                ? "bg-white text-indigo-700 shadow-sm"
                                : "text-gray-500 hover:text-gray-800"
                            }`}
                          >
                            {tab.label}
                          </button>
                        ))}
                      </div>

                      {audienceMode === "client" ? (
                        <div className="space-y-3">
                          <div
                            className={`flex items-start gap-3 rounded-lg border px-3 py-2.5 transition ${
                              selectAllClients
                                ? "border-indigo-300 bg-indigo-50/70"
                                : "border-gray-200 bg-white hover:border-gray-300"
                            }`}
                          >
                            <span className="mt-0.5">
                              <AnimatedCheckbox
                                checked={selectAllClients}
                                disabled={saving}
                                ariaLabel="Select all clients"
                                onChange={() => {
                                  const next = !selectAllClients;
                                  setSelectAllClients(next);
                                  if (next) {
                                    setSelectedClientOptions([]);
                                    setClientPickerValue(null);
                                  }
                                }}
                              />
                            </span>
                            <span className="min-w-0">
                              <span className="block text-sm font-semibold text-gray-800">
                                Select all clients
                              </span>
                              <span className="mt-0.5 block text-[11px] text-gray-500">
                                Server enrolls every active client in this
                                branch. Individual picks are cleared.
                              </span>
                            </span>
                          </div>

                          {!selectAllClients ? (
                            <>
                              <div>
                                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                                  Select client
                                </label>
                                <CustomSelect
                                  loadOptions={clientLoadOptions}
                                  defaultOptions
                                  value={clientPickerValue}
                                  onChange={handlePickClient}
                                  getOptionLabel={getClientOptionLabel}
                                  getOptionValue={getClientOptionValue}
                                  renderOption={renderClientPartyOption}
                                  placeholder="Search client by name, mobile, email…"
                                  searchPlaceholder="Name, mobile, email…"
                                  noOptionsMessage="No clients found"
                                  isClearable
                                  isDisabled={saving}
                                />
                              </div>
                              {selectedClientOptions.length ? (
                                <div className="space-y-2">
                                  <p className="m-0 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                                    Selected ({selectedClientOptions.length})
                                  </p>
                                  <div className="max-h-64 space-y-2 overflow-y-auto pr-0.5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                                    {selectedClientOptions.map((client) => (
                                      <SelectedClientCard
                                        key={getClientOptionValue(client)}
                                        client={client}
                                        onRemove={() =>
                                          removeSelectedClient(
                                            getClientOptionValue(client)
                                          )
                                        }
                                      />
                                    ))}
                                  </div>
                                </div>
                              ) : null}
                            </>
                          ) : (
                            <div className="rounded-lg border border-dashed border-indigo-200 bg-indigo-50/60 px-3 py-3 text-xs text-indigo-800">
                              All branch clients will be resolved and enrolled
                              on the server when you save.
                            </div>
                          )}
                        </div>
                      ) : (
                        <div>
                          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                            Select group
                          </label>
                          <CustomSelect
                            options={groupOptions}
                            value={selectedGroupOption}
                            onChange={setSelectedGroupOption}
                            isLoading={loadingGroups}
                            placeholder={
                              loadingGroups
                                ? "Loading groups…"
                                : "Select a firm group…"
                            }
                            searchPlaceholder="Search groups…"
                            noOptionsMessage="No groups found"
                            isClearable
                            isDisabled={saving || loadingGroups}
                          />
                          <div className="mt-3 rounded-lg border border-dashed border-indigo-200 bg-indigo-50/60 px-3 py-3 text-xs text-indigo-800">
                            Clients are resolved from group firms on the server.
                            Duplicate clients across firms are enrolled once.
                            Existing configs are overwritten.
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="space-y-4 rounded-xl border border-gray-200 bg-gray-50/60 p-4">
                      <div>
                        <p className="mb-3 m-0 text-sm font-semibold text-gray-800">
                          Reminder config
                        </p>
                        <ScheduleFields
                          form={scheduleForm}
                          onChange={handleScheduleChange}
                          disabled={saving}
                        />
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-medium text-gray-700">
                          Channels
                        </label>
                        <ChannelPicker
                          selected={channels}
                          onToggle={toggleChannel}
                        />
                        <p className="mt-2 text-[11px] text-gray-400">
                          Select at least one channel. SMS needs an active SMS
                          payment-reminder setup.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex shrink-0 justify-end gap-2 border-t border-gray-100 bg-slate-50/80 px-5 py-3">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => setShowAddModal(false)}
                    className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
                  >
                    {saving ? (
                      <FiLoader className="h-4 w-4 animate-spin" />
                    ) : (
                      <FiPlus className="h-4 w-4" />
                    )}
                    Save reminder
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Edit config modal */}
      <AnimatePresence>
        {showEditModal && editingRow ? (
          <motion.div
            key="edit-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none fixed inset-0 z-[10080] flex items-center justify-center overflow-hidden overscroll-none p-3 sm:p-4"
          >
            <div
              className="pointer-events-auto absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => !saving && setShowEditModal(false)}
            />
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="pointer-events-auto relative z-[1] flex max-h-[calc(100vh-1.5rem)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex shrink-0 items-center justify-between border-b border-indigo-500/20 bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-3.5 text-white">
                <div>
                  <p className="m-0 text-[10px] font-semibold uppercase tracking-wide text-white/80">
                    Edit reminder
                  </p>
                  <h2 className="m-0 truncate text-sm font-semibold">
                    {editingRow.name || editingRow.username}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => !saving && setShowEditModal(false)}
                  className="rounded-lg p-1.5 text-white/80 hover:bg-white/15"
                >
                  <FiX className="h-4 w-4" />
                </button>
              </div>
              <form
                onSubmit={handleEditSubmit}
                className="flex min-h-0 flex-1 flex-col overflow-hidden"
              >
                <div
                  className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                  style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
                >
                  <ScheduleFields
                    form={scheduleForm}
                    onChange={handleScheduleChange}
                    disabled={saving}
                  />
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Channels
                    </label>
                    <ChannelPicker
                      selected={channels}
                      onToggle={toggleChannel}
                    />
                  </div>
                </div>
                <div className="flex shrink-0 justify-end gap-2 border-t border-gray-100 bg-slate-50/80 px-5 py-3">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => setShowEditModal(false)}
                    className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
                  >
                    Save changes
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <ConfirmModal
        open={confirmDialog.open}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText={confirmDialog.confirmText}
        cancelText={confirmDialog.cancelText}
        tone={confirmDialog.tone}
        icon={confirmDialog.icon}
        loading={confirmDialog.loading}
        onConfirm={handleConfirm}
        onCancel={closeConfirm}
      />
    </div>
  );
};

export default AutoReminder;
