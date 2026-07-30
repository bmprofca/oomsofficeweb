import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  FiCalendar,
  FiCheck,
  FiChevronRight,
  FiClock,
  FiCoffee,
  FiLoader,
  FiLogIn,
  FiLogOut,
  FiMapPin,
  FiRefreshCw,
  FiUser,
  FiX,
} from "react-icons/fi";
import { toast } from "react-hot-toast";
import API_BASE_URL from "../../utils/api-controller";
import getHeaders from "../../utils/get-headers";

const STATE_BADGE = {
  not_punched: "bg-slate-100 text-slate-700 ring-1 ring-slate-200",
  punched_in: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  on_break: "bg-amber-50 text-amber-800 ring-1 ring-amber-200",
  punched_out: "bg-rose-50 text-rose-700 ring-1 ring-rose-200",
  present: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  absent: "bg-slate-100 text-slate-600 ring-1 ring-slate-200",
  leave: "bg-sky-50 text-sky-700 ring-1 ring-sky-200",
  half_day: "bg-amber-50 text-amber-800 ring-1 ring-amber-200",
};

const STATE_LABEL = {
  not_punched: "Not punched in",
  punched_in: "Punched in",
  on_break: "On break",
  punched_out: "Punched out",
  present: "Present",
  absent: "Absent",
  leave: "Leave",
  half_day: "Half day",
};

const OFFICE_MARKED_META = {
  absent: {
    Icon: FiUser,
    title: "Marked absent",
    tone: "border-slate-200 bg-slate-50",
    iconWrap: "bg-slate-100 text-slate-600",
    description:
      "Your attendance for today was marked as absent by the office. Punch in and break actions are not available.",
  },
  leave: {
    Icon: FiCalendar,
    title: "On leave",
    tone: "border-sky-200 bg-sky-50/70",
    iconWrap: "bg-sky-100 text-sky-700",
    description:
      "Your attendance for today was marked as leave by the office. Punch in and break actions are not available.",
  },
  half_day: {
    Icon: FiClock,
    title: "Half day",
    tone: "border-amber-200 bg-amber-50/70",
    iconWrap: "bg-amber-100 text-amber-800",
    description:
      "Your attendance for today was marked as half day by the office. Punch in and break actions are not available.",
  },
};

const OFFICE_MARKED_STATES = new Set(["absent", "leave", "half_day"]);

const ACTION_META = {
  "punch-in": {
    path: "punch-in",
    label: "Punch In",
    swipeLabel: "Swipe to punch in",
    success: "Punched in successfully",
    Icon: FiLogIn,
    track: "bg-emerald-50 border-emerald-200",
    fill: "bg-emerald-500/25",
    thumb: "bg-emerald-600 text-white shadow-emerald-600/30",
    text: "text-emerald-700/80",
  },
  "punch-out": {
    path: "punch-out",
    label: "Punch Out",
    swipeLabel: "Swipe to punch out",
    success: "Punched out successfully",
    Icon: FiLogOut,
    track: "bg-rose-50 border-rose-200",
    fill: "bg-rose-500/25",
    thumb: "bg-rose-600 text-white shadow-rose-600/30",
    text: "text-rose-700/80",
  },
  "break-start": {
    path: "break/start",
    label: "Start Break",
    swipeLabel: "Swipe to start break",
    success: "Break started",
    Icon: FiCoffee,
    track: "bg-amber-50 border-amber-200",
    fill: "bg-amber-500/25",
    thumb: "bg-amber-600 text-white shadow-amber-600/30",
    text: "text-amber-800/80",
  },
  "break-end": {
    path: "break/end",
    label: "End Break",
    swipeLabel: "Swipe to end break",
    success: "Break ended",
    Icon: FiCoffee,
    track: "bg-amber-50 border-amber-200",
    fill: "bg-amber-500/25",
    thumb: "bg-amber-600 text-white shadow-amber-600/30",
    text: "text-amber-800/80",
  },
};

const SCROLL_BODY =
  "px-5 py-4 flex-1 min-h-0 overflow-y-auto overscroll-y-contain [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden";

const THUMB_SIZE = 44;
const TRACK_PAD = 4;
const CONFIRM_RATIO = 0.9;

const sk = "animate-pulse rounded-md bg-slate-200/80";

function formatTime(value) {
  if (value == null || value === "") return "—";
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
  return "—";
}

function formatDateLabel(value) {
  if (!value) return "";
  const d = new Date(`${value}T12:00:00`);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString([], {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function timeToMs(timeValue, dateStr) {
  if (timeValue == null || timeValue === "") return NaN;
  if (timeValue instanceof Date && !Number.isNaN(timeValue.getTime())) {
    return timeValue.getTime();
  }
  const raw = String(timeValue).trim();
  const m = raw.match(/(?:T|^)(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (m) {
    const day = dateStr || new Date().toISOString().slice(0, 10);
    const hh = String(Number(m[1])).padStart(2, "0");
    const mm = m[2];
    const ss = m[3] || "00";
    return new Date(`${day}T${hh}:${mm}:${ss}`).getTime();
  }
  const d = new Date(raw);
  return d.getTime();
}

function formatDuration(start, end, dateStr) {
  const startMs = timeToMs(start, dateStr);
  const endMs = end ? timeToMs(end, dateStr) : Date.now();
  if (Number.isNaN(startMs) || Number.isNaN(endMs) || endMs < startMs)
    return "—";
  const totalMinutes = Math.floor((endMs - startMs) / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours <= 0) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
}

function TimelineDot({ tone = "slate", pulse = false }) {
  const tones = {
    emerald: "bg-emerald-500 ring-emerald-100",
    rose: "bg-rose-500 ring-rose-100",
    amber: "bg-amber-500 ring-amber-100",
    slate: "bg-slate-300 ring-slate-100",
  };
  return (
    <span
      className={`relative z-[1] mt-1 inline-flex h-2.5 w-2.5 shrink-0 rounded-full ring-4 ${tones[tone] || tones.slate} ${
        pulse ? "animate-pulse" : ""
      }`}
    />
  );
}

function SkeletonBlock({ className = "" }) {
  return <div className={`${sk} ${className}`} aria-hidden="true" />;
}

function AttendanceBodySkeleton() {
  return (
    <div aria-busy="true" aria-live="polite">
      <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-3 py-2.5">
        <SkeletonBlock className="h-6 w-24 rounded-full" />
        <div className="flex items-center gap-3">
          <SkeletonBlock className="h-3.5 w-16" />
          <SkeletonBlock className="h-3.5 w-16" />
        </div>
      </div>

      <div className="relative">
        <div
          className="absolute bottom-2 left-[4px] top-2 w-px bg-slate-200"
          aria-hidden="true"
        />
        <ul className="m-0 list-none space-y-0 p-0">
          {[0, 1, 2].map((row) => (
            <li
              key={row}
              className={`relative flex gap-3 ${row < 2 ? "pb-4" : ""}`}
            >
              <span className="relative z-[1] mt-1 inline-flex h-2.5 w-2.5 shrink-0 rounded-full bg-slate-200 ring-4 ring-slate-100" />
              <div
                className={`min-w-0 flex-1 ${row < 2 ? "border-b border-slate-100 pb-4" : ""}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <SkeletonBlock className="h-4 w-20" />
                  <SkeletonBlock className="h-4 w-12" />
                </div>
                {row === 1 ? (
                  <SkeletonBlock className="mt-2 h-3.5 w-28" />
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function AttendanceFooterSkeleton() {
  return (
    <div className="flex items-center gap-2" aria-hidden="true">
      <SkeletonBlock className="h-14 w-[4.5rem] shrink-0 rounded-xl" />
      <SkeletonBlock className="h-14 min-w-0 flex-1 rounded-full" />
    </div>
  );
}

function SwipeToConfirm({
  swipeLabel,
  Icon,
  track,
  fill,
  thumb,
  text,
  loading = false,
  disabled = false,
  onConfirm,
}) {
  const trackRef = useRef(null);
  const offsetRef = useRef(0);
  const startXRef = useRef(0);
  const startOffsetRef = useRef(0);
  const confirmedRef = useRef(false);
  const draggingRef = useRef(false);

  const [offset, setOffset] = useState(0);
  const [maxOffset, setMaxOffset] = useState(0);
  const [dragging, setDragging] = useState(false);

  const measure = useCallback(() => {
    if (!trackRef.current) return;
    const nextMax = Math.max(
      0,
      trackRef.current.clientWidth - THUMB_SIZE - TRACK_PAD * 2,
    );
    setMaxOffset(nextMax);
    if (loading || confirmedRef.current) {
      offsetRef.current = nextMax;
      setOffset(nextMax);
    } else if (offsetRef.current > nextMax) {
      offsetRef.current = nextMax;
      setOffset(nextMax);
    }
  }, [loading]);

  useLayoutEffect(() => {
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [measure, swipeLabel]);

  useEffect(() => {
    confirmedRef.current = false;
    draggingRef.current = false;
    offsetRef.current = 0;
    setOffset(0);
    setDragging(false);
  }, [swipeLabel]);

  useEffect(() => {
    if (!loading) return;
    offsetRef.current = maxOffset;
    setOffset(maxOffset);
  }, [loading, maxOffset]);

  const progress = maxOffset > 0 ? offset / maxOffset : 0;
  const locked = disabled || loading;

  const endDrag = useCallback(() => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    setDragging(false);

    const current = offsetRef.current;
    if (
      !confirmedRef.current &&
      maxOffset > 0 &&
      current >= maxOffset * CONFIRM_RATIO
    ) {
      confirmedRef.current = true;
      offsetRef.current = maxOffset;
      setOffset(maxOffset);
      onConfirm?.();
      return;
    }

    if (!loading) {
      offsetRef.current = 0;
      setOffset(0);
    }
  }, [maxOffset, loading, onConfirm]);

  const onPointerDown = (event) => {
    if (locked || confirmedRef.current) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    draggingRef.current = true;
    setDragging(true);
    startXRef.current = event.clientX;
    startOffsetRef.current = offsetRef.current;
  };

  const onPointerMove = (event) => {
    if (!draggingRef.current || locked || confirmedRef.current) return;
    const delta = event.clientX - startXRef.current;
    const next = Math.min(
      maxOffset,
      Math.max(0, startOffsetRef.current + delta),
    );
    offsetRef.current = next;
    setOffset(next);
  };

  const onPointerUp = (event) => {
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    endDrag();
  };

  return (
    <div
      ref={trackRef}
      className={`relative h-14 touch-none select-none overflow-hidden rounded-full border ${track} ${
        locked ? "opacity-80" : ""
      }`}
      role="slider"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(progress * 100)}
      aria-label={swipeLabel}
      aria-disabled={locked}
    >
      <div
        className={`absolute inset-y-0 left-0 ${fill} transition-[width] duration-75`}
        style={{ width: `${TRACK_PAD + offset + THUMB_SIZE / 2}px` }}
      />

      <div
        className={`pointer-events-none absolute inset-0 flex items-center justify-center gap-1 px-14 transition-opacity ${text} ${
          progress > 0.45 ? "opacity-0" : "opacity-100"
        }`}
      >
        <span className="text-xs font-semibold tracking-wide">
          {swipeLabel}
        </span>
        <span className="inline-flex items-center opacity-70">
          <FiChevronRight className="h-3.5 w-3.5 -mr-1.5 animate-pulse" />
          <FiChevronRight className="h-3.5 w-3.5 animate-pulse" />
        </span>
      </div>

      {progress > 0.55 && !loading ? (
        <div
          className={`pointer-events-none absolute inset-0 flex items-center justify-center ${text}`}
        >
          <FiCheck className="h-4 w-4" />
        </div>
      ) : null}

      <button
        type="button"
        disabled={locked}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className={`absolute top-1/2 z-[1] flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full shadow-lg transition-[box-shadow,transform] ${thumb} ${
          dragging ? "scale-[1.04] cursor-grabbing" : "cursor-grab"
        } ${locked ? "cursor-not-allowed" : ""}`}
        style={{
          left: TRACK_PAD + offset,
          transitionProperty: dragging
            ? "box-shadow, transform"
            : "left, box-shadow, transform",
          transitionDuration: dragging ? "0ms" : "180ms",
        }}
        aria-label={swipeLabel}
      >
        {loading ? (
          <FiLoader className="h-5 w-5 animate-spin" />
        ) : (
          <Icon className="h-5 w-5" />
        )}
      </button>
    </div>
  );
}

const AttendanceModal = ({ isOpen, onClose, branchName, branchId }) => {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [pendingAction, setPendingAction] = useState(null);
  const [confirmNonce, setConfirmNonce] = useState(0);
  const [tick, setTick] = useState(0);

  const state = status?.state || "not_punched";
  const breaks = Array.isArray(status?.breaks) ? status.breaks : [];
  const isOfficeMarked =
    Boolean(status?.office_marked) || OFFICE_MARKED_STATES.has(state);
  const officeMeta = OFFICE_MARKED_META[state] || null;
  const showSkeleton = loading;
  const displayBranch =
    branchName ||
    (typeof window !== "undefined"
      ? localStorage.getItem("branch_name")
      : "") ||
    "—";
  const displayBranchId =
    branchId ||
    (typeof window !== "undefined" ? localStorage.getItem("branch_id") : "") ||
    "";

  const loadStatus = useCallback(async () => {
    setPendingAction(null);
    setLoading(true);
    try {
      const headers = await getHeaders();
      if (!headers) {
        setStatus(null);
        return;
      }
      const res = await fetch(`${API_BASE_URL}/attendance/today-status`, {
        headers,
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok || !result?.success) {
        throw new Error(result?.message || "Failed to load attendance");
      }
      setStatus(result.data || null);
    } catch (error) {
      console.error("Failed to load attendance status", error);
      toast.error(error.message || "Failed to load attendance");
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const runAction = useCallback(
    async (actionKey) => {
      const meta = ACTION_META[actionKey];
      if (!meta) return;

      setActionLoading(actionKey);
      try {
        const headers = await getHeaders();
        if (!headers) throw new Error("Missing auth headers");
        const res = await fetch(`${API_BASE_URL}/attendance/${meta.path}`, {
          method: "POST",
          headers: {
            ...headers,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ method: "manual" }),
        });
        const result = await res.json().catch(() => ({}));
        if (!res.ok || !result?.success) {
          throw new Error(
            result?.message || meta.success || "Attendance action failed",
          );
        }
        setStatus(result.data || null);
        setPendingAction(null);
        toast.success(result.message || meta.success || "Success");
        onClose?.();
      } catch (error) {
        toast.error(error.message || "Attendance action failed");
        setConfirmNonce((n) => n + 1);
      } finally {
        setActionLoading(null);
      }
    },
    [onClose],
  );

  useEffect(() => {
    if (!isOpen) {
      setPendingAction(null);
      setActionLoading(null);
      return undefined;
    }
    loadStatus();
    return undefined;
  }, [isOpen, loadStatus]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (event) => {
      if (event.key !== "Escape") return;
      if (actionLoading) return;
      if (pendingAction) {
        setPendingAction(null);
        return;
      }
      onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, actionLoading, pendingAction, onClose]);

  useEffect(() => {
    if (!isOpen) return undefined;
    if (state !== "on_break" && state !== "punched_in") return undefined;
    const id = window.setInterval(() => setTick((n) => n + 1), 30000);
    return () => window.clearInterval(id);
  }, [isOpen, state]);

  const busy = Boolean(loading || actionLoading);

  const workDuration = useMemo(() => {
    const attendance = status?.attendance;
    if (!attendance?.in_time) return "—";
    return formatDuration(
      attendance.in_time,
      attendance.out_time || null,
      status?.date,
    );
  }, [status, tick]);

  const totalBreakDuration = useMemo(() => {
    if (!breaks.length) return "0m";
    let ms = 0;
    for (const item of breaks) {
      const startMs = timeToMs(item.start_time, status?.date);
      const endMs = item.end_time
        ? timeToMs(item.end_time, status?.date)
        : Date.now();
      if (!Number.isNaN(startMs) && !Number.isNaN(endMs) && endMs >= startMs) {
        ms += endMs - startMs;
      }
    }
    const totalMinutes = Math.floor(ms / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours <= 0) return `${minutes}m`;
    return `${hours}h ${minutes}m`;
  }, [breaks, tick, status?.date]);

  const requestAction = (actionKey) => {
    if (busy) return;
    setPendingAction(actionKey);
  };

  const footerActions = (() => {
    if (showSkeleton) {
      return <AttendanceFooterSkeleton />;
    }

    if (pendingAction && ACTION_META[pendingAction]) {
      const meta = ACTION_META[pendingAction];
      return (
        <div className="flex w-full items-center gap-2">
          <button
            type="button"
            disabled={Boolean(actionLoading)}
            onClick={() => setPendingAction(null)}
            className="inline-flex shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>
          <div className="min-w-0 flex-1">
            <SwipeToConfirm
              key={`${pendingAction}-${confirmNonce}`}
              swipeLabel={meta.swipeLabel}
              Icon={meta.Icon}
              track={meta.track}
              fill={meta.fill}
              thumb={meta.thumb}
              text={meta.text}
              loading={actionLoading === pendingAction}
              disabled={Boolean(actionLoading)}
              onConfirm={() => runAction(pendingAction)}
            />
          </div>
        </div>
      );
    }

    if (state === "not_punched") {
      return (
        <button
          type="button"
          disabled={busy}
          onClick={() => requestAction("punch-in")}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <FiLogIn className="h-4 w-4" />
          Punch In
        </button>
      );
    }
    if (isOfficeMarked) {
      return (
        <button
          type="button"
          onClick={onClose}
          className="inline-flex flex-1 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Close
        </button>
      );
    }
    if (state === "on_break") {
      return (
        <button
          type="button"
          disabled={busy}
          onClick={() => requestAction("break-end")}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <FiCoffee className="h-4 w-4" />
          End Break
        </button>
      );
    }
    if (state === "punched_in") {
      return (
        <>
          <button
            type="button"
            disabled={busy}
            onClick={() => requestAction("break-start")}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-800 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FiCoffee className="h-4 w-4" />
            Start Break
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => requestAction("punch-out")}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FiLogOut className="h-4 w-4" />
            Punch Out
          </button>
        </>
      );
    }
    return (
      <button
        type="button"
        onClick={onClose}
        className="inline-flex flex-1 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
      >
        Close
      </button>
    );
  })();

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
            aria-hidden="true"
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="attendance-modal-title"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="relative z-[1] pointer-events-auto flex w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-2xl max-h-[calc(100vh-1.5rem)] sm:max-h-[calc(100vh-2rem)]"
          >
            <header className="shrink-0 border-b border-slate-100 px-5 py-3.5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2
                    id="attendance-modal-title"
                    className="m-0 text-base font-semibold text-slate-900"
                  >
                    Attendance
                  </h2>
                  {showSkeleton ? (
                    <SkeletonBlock className="mt-1.5 h-3 w-28" />
                  ) : (
                    <p className="m-0 mt-0.5 text-xs text-slate-500">
                      {formatDateLabel(status?.date) || "—"}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={loadStatus}
                    disabled={busy}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
                    title="Refresh"
                  >
                    <FiRefreshCw
                      className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                    />
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={Boolean(actionLoading)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
                    aria-label="Close"
                  >
                    <FiX className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="mt-3 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                <FiMapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                <p className="m-0 min-w-0 flex-1 truncate text-sm font-medium text-slate-800">
                  {displayBranch}
                </p>
                {displayBranchId ? (
                  <span className="shrink-0 rounded bg-white px-1.5 py-0.5 text-[10px] font-medium text-slate-500 ring-1 ring-slate-200">
                    {displayBranchId}
                  </span>
                ) : null}
              </div>
            </header>

            <div
              className={SCROLL_BODY}
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
              {showSkeleton ? (
                <AttendanceBodySkeleton />
              ) : (
                <>
                  <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-3 py-2.5">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                        STATE_BADGE[state] || STATE_BADGE.not_punched
                      }`}
                    >
                      {STATE_LABEL[state] || STATE_LABEL.not_punched}
                    </span>
                    {!isOfficeMarked ? (
                      <div className="flex items-center gap-3 text-xs text-slate-500">
                        <span>
                          Work{" "}
                          <strong className="font-semibold text-slate-800">
                            {workDuration}
                          </strong>
                        </span>
                        <span className="text-slate-300">|</span>
                        <span>
                          Break{" "}
                          <strong className="font-semibold text-slate-800">
                            {totalBreakDuration}
                          </strong>
                        </span>
                      </div>
                    ) : Number(status?.attendance?.is_approved) === 1 ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                        <FiCheck className="h-3.5 w-3.5" />
                        Approved
                      </span>
                    ) : (
                      <span className="text-xs font-medium text-slate-500">
                        Office marked
                      </span>
                    )}
                  </div>

                  {isOfficeMarked && officeMeta ? (
                    <div
                      className={`rounded-2xl border px-4 py-4 ${officeMeta.tone}`}
                    >
                      <div className="flex items-start gap-3">
                        <span
                          className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${officeMeta.iconWrap}`}
                        >
                          {React.createElement(officeMeta.Icon, {
                            className: "h-5 w-5",
                          })}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="m-0 text-sm font-semibold text-slate-900">
                            {officeMeta.title}
                          </p>
                          <p className="m-0 mt-1.5 text-sm leading-relaxed text-slate-600">
                            {officeMeta.description}
                          </p>
                          {status?.mark_status ? (
                            <p className="m-0 mt-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                              Status · {STATE_LABEL[state] || status.mark_status}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ) : (
                  <div className="relative">
                    <div
                      className="absolute bottom-2 left-[4px] top-2 w-px bg-slate-200"
                      aria-hidden="true"
                    />

                    <ul className="m-0 list-none space-y-0 p-0">
                      <li className="relative flex gap-3 pb-4">
                        <TimelineDot
                          tone={
                            status?.attendance?.in_time ? "emerald" : "slate"
                          }
                        />
                        <div className="min-w-0 flex-1 border-b border-slate-100 pb-4">
                          <div className="flex items-center justify-between gap-2">
                            <p className="m-0 text-sm font-medium text-slate-800">
                              Punch in
                            </p>
                            <p className="m-0 text-sm font-semibold tabular-nums text-slate-900">
                              {formatTime(status?.attendance?.in_time)}
                            </p>
                          </div>
                        </div>
                      </li>

                      {breaks.map((item, index) => {
                        const isOpenBreak = !item.end_time;
                        return (
                          <li
                            key={item.break_id || `${item.start_time}-${index}`}
                            className="relative flex gap-3 pb-4"
                          >
                            <TimelineDot tone="amber" pulse={isOpenBreak} />
                            <div className="min-w-0 flex-1 border-b border-slate-100 pb-4">
                              <div className="flex items-center justify-between gap-2">
                                <p className="m-0 text-sm font-medium text-slate-800">
                                  Break {index + 1}
                                  {isOpenBreak ? (
                                    <span className="ml-2 rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                                      Open
                                    </span>
                                  ) : null}
                                </p>
                                <p className="m-0 text-xs font-medium tabular-nums text-slate-500">
                                  {formatDuration(
                                    item.start_time,
                                    item.end_time,
                                    status?.date,
                                  )}
                                </p>
                              </div>
                              <p className="m-0 mt-1 text-sm tabular-nums text-slate-600">
                                {formatTime(item.start_time)}
                                <span className="mx-1.5 text-slate-300">→</span>
                                {isOpenBreak ? (
                                  <span className="font-medium text-amber-700">
                                    Now
                                  </span>
                                ) : (
                                  formatTime(item.end_time)
                                )}
                              </p>
                            </div>
                          </li>
                        );
                      })}

                      {!breaks.length ? (
                        <li className="relative flex gap-3 pb-4">
                          <TimelineDot tone="slate" />
                          <div className="min-w-0 flex-1 border-b border-slate-100 pb-4">
                            <p className="m-0 text-sm text-slate-400">
                              No breaks
                            </p>
                          </div>
                        </li>
                      ) : null}

                      <li className="relative flex gap-3">
                        <TimelineDot
                          tone={status?.attendance?.out_time ? "rose" : "slate"}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="m-0 text-sm font-medium text-slate-800">
                              Punch out
                            </p>
                            <p className="m-0 text-sm font-semibold tabular-nums text-slate-900">
                              {formatTime(status?.attendance?.out_time)}
                            </p>
                          </div>
                        </div>
                      </li>
                    </ul>
                  </div>
                  )}
                </>
              )}
            </div>

            <footer className="shrink-0 border-t border-slate-100 bg-slate-50/90 px-5 py-3">
              <div className="flex items-center gap-2">{footerActions}</div>
            </footer>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
};

export default AttendanceModal;
