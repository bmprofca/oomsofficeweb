import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiBell,
  FiCheck,
  FiCheckCircle,
  FiClipboard,
  FiLoader,
  FiShare2,
} from "react-icons/fi";
import getHeaders from "../utils/get-headers";
import API_BASE_URL from "../utils/api-controller";

const POLL_MS = 60000;

function formatRelativeTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
  });
}

function isIncomingNotification(item) {
  return item?.type === "incoming_document" || String(item?.id || "").startsWith("incoming-doc-");
}

/**
 * Header bell: CA approval alerts + Incoming document uploads.
 */
export default function HeaderNotifications({
  iconButtonClass = "",
  onOpenChange,
}) {
  const navigate = useNavigate();
  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [markingId, setMarkingId] = useState(null);
  const [markingAll, setMarkingAll] = useState(false);
  const [count, setCount] = useState(0);
  const [items, setItems] = useState([]);

  const setOpenSafe = useCallback(
    (next) => {
      setOpen((prev) => {
        const value = typeof next === "function" ? next(prev) : next;
        onOpenChange?.(value);
        return value;
      });
    },
    [onOpenChange],
  );

  const fetchNotifications = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const headers = await getHeaders();
      if (!headers) return;
      const res = await fetch(`${API_BASE_URL}/task/notifications?limit=20`, {
        headers,
      });
      const result = await res.json();
      if (!result?.success) return;
      const payload = result.data || {};
      setCount(Number(payload.count) || 0);
      setItems(Array.isArray(payload.notifications) ? payload.notifications : []);
    } catch (error) {
      console.error("Failed to fetch notifications", error);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  const markAsRead = useCallback(
    async ({ notificationIds, markAll = false } = {}) => {
      const headers = await getHeaders();
      if (!headers) return false;
      const body = markAll
        ? { mark_all: true }
        : { notification_ids: notificationIds || [] };
      const res = await fetch(`${API_BASE_URL}/task/notifications/read`, {
        method: "POST",
        headers: {
          ...headers,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      const result = await res.json().catch(() => null);
      return Boolean(result?.success);
    },
    [],
  );

  useEffect(() => {
    fetchNotifications({ silent: true });
    const interval = setInterval(
      () => fetchNotifications({ silent: true }),
      POLL_MS,
    );
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  useEffect(() => {
    if (!open) return undefined;
    fetchNotifications();
  }, [open, fetchNotifications]);

  useEffect(() => {
    if (!open) return undefined;
    const onMouseDown = (event) => {
      if (triggerRef.current?.contains(event.target)) return;
      if (panelRef.current?.contains(event.target)) return;
      setOpenSafe(false);
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [open, setOpenSafe]);

  const removeLocalItems = useCallback((ids) => {
    const idSet = new Set((ids || []).map(String));
    setItems((prev) => prev.filter((item) => !idSet.has(String(item.id))));
    setCount((prev) => Math.max(0, prev - idSet.size));
  }, []);

  const handleMarkOne = async (event, item) => {
    event.preventDefault();
    event.stopPropagation();
    const id = item?.id ? String(item.id) : "";
    if (!id || markingId) return;
    setMarkingId(id);
    try {
      const ok = await markAsRead({ notificationIds: [id] });
      if (ok) removeLocalItems([id]);
    } catch (error) {
      console.error("Failed to mark notification as read", error);
    } finally {
      setMarkingId(null);
    }
  };

  const handleMarkAll = async () => {
    if (markingAll || items.length === 0) return;
    setMarkingAll(true);
    try {
      const ok = await markAsRead({ markAll: true });
      if (ok) {
        setItems([]);
        setCount(0);
      }
    } catch (error) {
      console.error("Failed to mark all notifications as read", error);
    } finally {
      setMarkingAll(false);
    }
  };

  const handleItemClick = async (item) => {
    const id = item?.id ? String(item.id) : "";
    if (id) {
      try {
        await markAsRead({ notificationIds: [id] });
        removeLocalItems([id]);
      } catch (_) {
        /* navigation should still proceed */
      }
    }

    setOpenSafe(false);

    if (item?.path) {
      navigate(item.path);
      return;
    }

    if (isIncomingNotification(item) && item?.username) {
      navigate(
        `/client/profile/${encodeURIComponent(String(item.username).trim())}/documents?docTab=sharable`,
      );
      return;
    }

    const taskId = item?.task_id ? String(item.task_id).trim() : "";
    if (taskId) {
      navigate(`/task/profile/${encodeURIComponent(taskId)}/details`);
    }
  };

  const badgeLabel = count > 99 ? "99+" : String(count);

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        className={`${iconButtonClass} relative`}
        aria-label="Notifications"
        aria-expanded={open}
        onClick={() => {
          setOpenSafe((v) => !v);
        }}
      >
        <FiBell className="h-4 w-4" />
        {count > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold leading-none text-white ring-2 ring-white">
            {badgeLabel}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          ref={panelRef}
          className="absolute right-0 top-[calc(100%+10px)] z-50 w-80 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_20px_50px_-20px_rgba(15,23,42,0.35)]"
        >
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900">Notifications</p>
              <p className="text-xs text-slate-500">
                {count > 0
                  ? `${count} unread update${count === 1 ? "" : "s"}`
                  : "Important updates and alerts"}
              </p>
            </div>
            {items.length > 0 ? (
              <button
                type="button"
                onClick={handleMarkAll}
                disabled={markingAll}
                className="shrink-0 rounded-md px-2 py-1 text-[10px] font-semibold text-indigo-600 transition-colors hover:bg-indigo-50 disabled:opacity-50"
              >
                {markingAll ? "Marking…" : "Mark all read"}
              </button>
            ) : (
              <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-indigo-600">
                Live
              </span>
            )}
          </div>

          <div className="max-h-[min(24rem,60vh)] overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {loading && items.length === 0 ? (
              <div className="flex items-center justify-center gap-2 px-4 py-10 text-xs text-slate-500">
                <FiLoader className="h-4 w-4 animate-spin" />
                Loading…
              </div>
            ) : items.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                  <FiBell className="h-5 w-5" />
                </div>
                <p className="text-sm font-medium text-slate-700">
                  You&apos;re all caught up
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  No unread notifications right now.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {items.map((item) => {
                  const incoming = isIncomingNotification(item);
                  return (
                    <li key={item.id || item.task_id || item.document_id}>
                      <div className="flex items-start gap-1 px-2 py-2">
                        <button
                          type="button"
                          onClick={() => handleItemClick(item)}
                          className="flex min-w-0 flex-1 items-start gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-indigo-50/60"
                        >
                          <span
                            className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                              incoming
                                ? "bg-sky-50 text-sky-600"
                                : "bg-emerald-50 text-emerald-600"
                            }`}
                          >
                            {incoming ? (
                              <FiShare2 className="h-4 w-4" />
                            ) : (
                              <FiCheckCircle className="h-4 w-4" />
                            )}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-start justify-between gap-2">
                              <span className="text-xs font-semibold text-slate-800">
                                {item.title ||
                                  (incoming
                                    ? "Incoming document uploaded"
                                    : "CA approval complete")}
                              </span>
                              <span className="shrink-0 text-[10px] text-slate-400">
                                {formatRelativeTime(item.at)}
                              </span>
                            </span>
                            <span className="mt-0.5 block text-[11px] leading-relaxed text-slate-600">
                              {item.message}
                            </span>
                            <span className="mt-1.5 inline-flex items-center gap-1 rounded-md bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
                              {incoming ? (
                                <>
                                  <FiShare2 className="h-3 w-3" />
                                  Incoming
                                  {item.client_name ? (
                                    <span className="text-sky-600">
                                      · {item.client_name}
                                    </span>
                                  ) : null}
                                </>
                              ) : (
                                <>
                                  <FiClipboard className="h-3 w-3" />
                                  {item.task_id}
                                  {item.status ? (
                                    <span className="text-amber-600">
                                      · {item.status}
                                    </span>
                                  ) : null}
                                </>
                              )}
                            </span>
                          </span>
                        </button>
                        <button
                          type="button"
                          title="Mark as read"
                          aria-label="Mark as read"
                          onClick={(event) => handleMarkOne(event, item)}
                          disabled={markingId === item.id}
                          className="mt-2 shrink-0 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-emerald-600 disabled:opacity-50"
                        >
                          {markingId === item.id ? (
                            <FiLoader className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <FiCheck className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {count > items.length ? (
            <div className="border-t border-slate-100 px-4 py-2 text-center text-[11px] text-slate-500">
              Showing {items.length} of {count}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
