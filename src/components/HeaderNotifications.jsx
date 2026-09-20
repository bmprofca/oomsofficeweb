import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  FiBell,
  FiCheck,
  FiCheckCircle,
  FiChevronDown,
  FiClipboard,
  FiLoader,
  FiRefreshCw,
  FiShare2,
  FiTrash2,
  FiAlertTriangle,
} from "react-icons/fi";
import getHeaders from "../utils/get-headers";
import API_BASE_URL from "../utils/api-controller";
import ConfirmActionModal from "./ConfirmActionModal";

const POLL_MS = 60000;
const RELATIVE_TIME_TICK_MS = 30000;

function formatRelativeTime(value, nowMs = Date.now()) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const diffMs = Math.max(0, nowMs - date.getTime());
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
  return (
    item?.type === "incoming_document" ||
    String(item?.id || "").startsWith("incoming-doc-")
  );
}

function getCollapsedMeta(item, incoming) {
  if (incoming) {
    return item.client_name || item.document_name || "Incoming";
  }
  const parts = [];
  if (item.service_name) parts.push(item.service_name);
  if (item.status) parts.push(item.status);
  if (!parts.length && item.task_id) parts.push(item.task_id);
  return parts.join(" · ") || "Task";
}

/**
 * Header bell: CA approval alerts + Incoming document uploads.
 * Badge = unread count. Read items stay in the list until deleted.
 */
export default function HeaderNotifications({
  iconButtonClass = "",
  onOpenChange,
}) {
  const navigate = useNavigate();
  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const listRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [markingAll, setMarkingAll] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [total, setTotal] = useState(0);
  const [items, setItems] = useState([]);
  const [expandedIds, setExpandedIds] = useState(() => new Set());
  const [nowTick, setNowTick] = useState(() => Date.now());
  const [confirmState, setConfirmState] = useState(null);
  // { action: 'read_one'|'read_all'|'delete_one'|'delete_all', item?, loading }

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
      setUnreadCount(Number(payload.unread_count ?? payload.count) || 0);
      setTotal(Number(payload.total) || 0);
      setItems(Array.isArray(payload.notifications) ? payload.notifications : []);
    } catch (error) {
      console.error("Failed to fetch notifications", error);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  const postNotificationAction = useCallback(async (path, body) => {
    const headers = await getHeaders();
    if (!headers) return false;
    const res = await fetch(`${API_BASE_URL}/task/notifications/${path}`, {
      method: "POST",
      headers: {
        ...headers,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const result = await res.json().catch(() => null);
    return Boolean(result?.success);
  }, []);

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

  // Keep relative timestamps fresh while the panel is open (or always lightly).
  useEffect(() => {
    const interval = setInterval(() => {
      setNowTick(Date.now());
    }, RELATIVE_TIME_TICK_MS);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const onMouseDown = (event) => {
      if (confirmState) return;
      if (triggerRef.current?.contains(event.target)) return;
      if (panelRef.current?.contains(event.target)) return;
      setOpenSafe(false);
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [open, setOpenSafe, confirmState]);

  // Stop wheel/trackpad scroll from chaining to the page behind the menu.
  useEffect(() => {
    if (!open) return undefined;
    const panel = panelRef.current;
    if (!panel) return undefined;

    const onWheel = (event) => {
      event.stopPropagation();
      const list = listRef.current;
      if (!list) {
        event.preventDefault();
        return;
      }
      const { scrollTop, scrollHeight, clientHeight } = list;
      const delta = event.deltaY;
      const canScroll = scrollHeight > clientHeight + 1;
      const atTop = scrollTop <= 0;
      const atBottom = scrollTop + clientHeight >= scrollHeight - 1;

      if (!canScroll || (delta < 0 && atTop) || (delta > 0 && atBottom)) {
        event.preventDefault();
      }
    };

    panel.addEventListener("wheel", onWheel, { passive: false });
    return () => panel.removeEventListener("wheel", onWheel);
  }, [open, items.length]);

  const markLocalRead = useCallback((ids) => {
    const idSet = new Set((ids || []).map(String));
    setItems((prev) => {
      let newlyRead = 0;
      const next = prev.map((item) => {
        if (idSet.has(String(item.id)) && !item.is_read) {
          newlyRead += 1;
          return { ...item, is_read: true };
        }
        return item;
      });
      if (newlyRead > 0) {
        setUnreadCount((c) => Math.max(0, c - newlyRead));
      }
      return next;
    });
  }, []);

  const removeLocalItems = useCallback((ids) => {
    const idSet = new Set((ids || []).map(String));
    setItems((prev) => {
      const removedUnread = prev.filter(
        (item) => idSet.has(String(item.id)) && !item.is_read,
      ).length;
      setUnreadCount((c) => Math.max(0, c - removedUnread));
      setTotal((t) => Math.max(0, t - idSet.size));
      setExpandedIds((prevExpanded) => {
        const next = new Set(prevExpanded);
        idSet.forEach((id) => next.delete(id));
        return next;
      });
      return prev.filter((item) => !idSet.has(String(item.id)));
    });
  }, []);

  const handleRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await fetchNotifications({ silent: true });
      setNowTick(Date.now());
    } finally {
      setRefreshing(false);
    }
  };

  const toggleExpanded = (event, id) => {
    event.preventDefault();
    event.stopPropagation();
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const closeConfirm = useCallback(() => {
    setConfirmState((prev) => (prev?.loading ? prev : null));
  }, []);

  const requestConfirm = useCallback((next) => {
    setConfirmState({ ...next, loading: false });
  }, []);

  const handleMarkOne = (event, item) => {
    event.preventDefault();
    event.stopPropagation();
    const id = item?.id ? String(item.id) : "";
    if (!id || item?.is_read || busyId || confirmState) return;
    requestConfirm({
      action: "read_one",
      item,
      title: "Mark as read",
      heading: "Mark this notification as read?",
      message: item?.title
        ? `"${item.title}" will be marked as read. It will stay in the list until you delete it.`
        : "This notification will be marked as read. It will stay in the list until you delete it.",
      confirmLabel: "Mark as read",
      tone: "primary",
      icon: FiCheck,
    });
  };

  const handleDeleteOne = (event, item) => {
    event.preventDefault();
    event.stopPropagation();
    const id = item?.id ? String(item.id) : "";
    if (!id || busyId || confirmState) return;
    requestConfirm({
      action: "delete_one",
      item,
      title: "Delete notification",
      heading: "Delete this notification?",
      message: item?.title
        ? `"${item.title}" will be removed from your notification list.`
        : "This notification will be removed from your list.",
      confirmLabel: "Delete",
      tone: "danger",
      icon: FiTrash2,
    });
  };

  const handleMarkAll = () => {
    if (markingAll || unreadCount === 0 || confirmState) return;
    requestConfirm({
      action: "read_all",
      title: "Mark all as read",
      heading: "Mark all notifications as read?",
      message: `${unreadCount} unread notification${unreadCount === 1 ? "" : "s"} will be marked as read. They will stay in the list until you clear them.`,
      confirmLabel: "Mark all read",
      tone: "primary",
      icon: FiCheck,
    });
  };

  const handleDeleteAll = () => {
    if (deletingAll || items.length === 0 || confirmState) return;
    requestConfirm({
      action: "delete_all",
      title: "Clear notifications",
      heading: "Clear all notifications?",
      message: `${items.length} notification${items.length === 1 ? "" : "s"} will be removed from your list. This cannot be undone from here.`,
      confirmLabel: "Clear all",
      tone: "danger",
      icon: FiTrash2,
    });
  };

  const handleConfirmAction = async () => {
    if (!confirmState || confirmState.loading) return;
    const { action, item } = confirmState;
    setConfirmState((prev) => (prev ? { ...prev, loading: true } : prev));

    try {
      if (action === "read_one") {
        const id = item?.id ? String(item.id) : "";
        if (!id) return;
        setBusyId(`read-${id}`);
        const ok = await postNotificationAction("read", {
          notification_ids: [id],
        });
        if (ok) markLocalRead([id]);
      } else if (action === "delete_one") {
        const id = item?.id ? String(item.id) : "";
        if (!id) return;
        setBusyId(`del-${id}`);
        const ok = await postNotificationAction("delete", {
          notification_ids: [id],
        });
        if (ok) removeLocalItems([id]);
      } else if (action === "read_all") {
        setMarkingAll(true);
        const ok = await postNotificationAction("read", { mark_all: true });
        if (ok) {
          setItems((prev) => prev.map((row) => ({ ...row, is_read: true })));
          setUnreadCount(0);
        }
      } else if (action === "delete_all") {
        setDeletingAll(true);
        const ok = await postNotificationAction("delete", { delete_all: true });
        if (ok) {
          setItems([]);
          setUnreadCount(0);
          setTotal(0);
          setExpandedIds(new Set());
        }
      }
      setConfirmState(null);
    } catch (error) {
      console.error("Notification confirm action failed", error);
      setConfirmState((prev) => (prev ? { ...prev, loading: false } : prev));
    } finally {
      setBusyId(null);
      setMarkingAll(false);
      setDeletingAll(false);
    }
  };

  const handleItemClick = async (item) => {
    const id = item?.id ? String(item.id) : "";
    if (id && !item?.is_read) {
      try {
        await postNotificationAction("read", { notification_ids: [id] });
        markLocalRead([id]);
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

  const badgeLabel = unreadCount > 99 ? "99+" : String(unreadCount);
  const hasItems = items.length > 0;
  const headerBtnClass =
    "inline-flex h-7 items-center justify-center rounded-md px-2 text-[10px] font-semibold leading-none transition-colors disabled:opacity-50";
  const headerIconBtnClass =
    "inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50";

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
        {unreadCount > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold leading-none text-white ring-2 ring-white">
            {badgeLabel}
          </span>
        ) : null}
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            ref={panelRef}
            key="notifications-panel"
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="absolute right-0 top-[calc(100%+10px)] z-50 w-[26rem] max-w-[calc(100vw-1rem)] origin-top-right overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_20px_50px_-20px_rgba(15,23,42,0.35)]"
            onWheel={(e) => e.stopPropagation()}
          >
            <div className="flex h-10 items-center gap-1.5 whitespace-nowrap border-b border-slate-100 px-2">
              <span className="inline-flex h-7 shrink-0 items-center text-sm font-semibold leading-none text-slate-900">
                Notifications
              </span>
              <span className="inline-flex h-7 max-w-[7.5rem] shrink-0 items-center truncate rounded-md bg-slate-100 px-2 text-[10px] font-medium leading-none text-slate-500">
                {unreadCount > 0
                  ? `${unreadCount} unread`
                  : hasItems
                    ? "All read"
                    : "Empty"}
              </span>
              <div className="ml-auto flex h-7 shrink-0 items-center gap-1">
                {hasItems ? (
                  <>
                    <button
                      type="button"
                      title="Refresh"
                      aria-label="Refresh notifications"
                      onClick={handleRefresh}
                      disabled={refreshing || markingAll || deletingAll}
                      className={headerIconBtnClass}
                    >
                      <FiRefreshCw
                        className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`}
                      />
                    </button>
                    {unreadCount > 0 ? (
                      <button
                        type="button"
                        onClick={handleMarkAll}
                        disabled={markingAll || deletingAll || refreshing}
                        className={`${headerBtnClass} text-indigo-600 hover:bg-indigo-50`}
                      >
                        {markingAll ? "…" : "Mark read"}
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={handleDeleteAll}
                      disabled={deletingAll || markingAll || refreshing}
                      className={`${headerBtnClass} text-rose-600 hover:bg-rose-50`}
                    >
                      {deletingAll ? "…" : "Clear"}
                    </button>
                  </>
                ) : null}
              </div>
            </div>

            <div
              ref={listRef}
              className="max-h-[min(24rem,60vh)] overflow-y-auto overscroll-contain [scrollbar-width:thin]"
            >
              {loading && !hasItems ? (
                <div className="flex items-center justify-center gap-2 px-2 py-10 text-xs text-slate-500">
                  <FiLoader className="h-4 w-4 animate-spin" />
                  Loading…
                </div>
              ) : !hasItems ? (
                <div className="px-2 py-8 text-center">
                  <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                    <FiBell className="h-5 w-5" />
                  </div>
                  <p className="text-sm font-medium text-slate-700">
                    No notifications
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    New updates will show up here.
                  </p>
                </div>
              ) : (
                <ul>
                  {items.map((item) => {
                    const incoming = isIncomingNotification(item);
                    const isRead = Boolean(item.is_read);
                    const id = String(item.id || "");
                    const expanded = expandedIds.has(id);
                    const title =
                      item.title ||
                      (incoming
                        ? "Incoming document uploaded"
                        : "CA approval complete");
                    const meta = getCollapsedMeta(item, incoming);

                    return (
                      <li
                        key={item.id || item.task_id || item.document_id}
                        className="border-b border-slate-100 last:border-b-0"
                      >
                        <div className={`py-1 pl-1 pr-1 ${isRead ? "opacity-80" : ""}`}>
                          <div className="flex items-center gap-0.5">
                            <button
                              type="button"
                              onClick={() => handleItemClick(item)}
                              className="flex min-w-0 flex-1 items-center gap-1.5 rounded-md py-1 pr-1 text-left transition-colors hover:bg-slate-50"
                            >
                              <span className="relative shrink-0">
                                <span
                                  className={`flex h-7 w-7 items-center justify-center rounded-md ${
                                    incoming
                                      ? "bg-sky-50 text-sky-600"
                                      : "bg-emerald-50 text-emerald-600"
                                  }`}
                                >
                                  {incoming ? (
                                    <FiShare2 className="h-3.5 w-3.5" />
                                  ) : (
                                    <FiCheckCircle className="h-3.5 w-3.5" />
                                  )}
                                </span>
                                {!isRead ? (
                                  <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-rose-500 ring-2 ring-white" />
                                ) : null}
                              </span>

                              <span className="min-w-0 flex-1">
                                <span className="flex items-center gap-1.5">
                                  <span
                                    className={`min-w-0 truncate text-[11px] leading-tight ${
                                      isRead
                                        ? "font-medium text-slate-600"
                                        : "font-semibold text-slate-800"
                                    }`}
                                  >
                                    {title}
                                  </span>
                                  <span className="shrink-0 text-[10px] text-slate-400">
                                    {formatRelativeTime(item.at, nowTick)}
                                  </span>
                                </span>
                                <span className="mt-0.5 flex min-w-0 items-center gap-1 text-[10px] text-slate-500">
                                  {incoming ? (
                                    <FiShare2 className="h-2.5 w-2.5 shrink-0" />
                                  ) : (
                                    <FiClipboard className="h-2.5 w-2.5 shrink-0" />
                                  )}
                                  <span className="truncate">{meta}</span>
                                </span>
                              </span>
                            </button>

                            <div className="flex shrink-0 items-center">
                              <button
                                type="button"
                                title={expanded ? "Collapse" : "Expand"}
                                aria-label={
                                  expanded
                                    ? "Collapse notification"
                                    : "Expand notification"
                                }
                                aria-expanded={expanded}
                                onClick={(event) => toggleExpanded(event, id)}
                                className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                              >
                                <motion.span
                                  animate={{ rotate: expanded ? 180 : 0 }}
                                  transition={{ duration: 0.2 }}
                                  className="inline-flex"
                                >
                                  <FiChevronDown className="h-3.5 w-3.5" />
                                </motion.span>
                              </button>
                              {!isRead ? (
                                <button
                                  type="button"
                                  title="Mark as read"
                                  aria-label="Mark as read"
                                  onClick={(event) => handleMarkOne(event, item)}
                                  disabled={busyId === `read-${id}`}
                                  className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-emerald-600 disabled:opacity-50"
                                >
                                  {busyId === `read-${id}` ? (
                                    <FiLoader className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <FiCheck className="h-3.5 w-3.5" />
                                  )}
                                </button>
                              ) : null}
                              <button
                                type="button"
                                title="Delete notification"
                                aria-label="Delete notification"
                                onClick={(event) => handleDeleteOne(event, item)}
                                disabled={busyId === `del-${id}`}
                                className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
                              >
                                {busyId === `del-${id}` ? (
                                  <FiLoader className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <FiTrash2 className="h-3.5 w-3.5" />
                                )}
                              </button>
                            </div>
                          </div>

                          <AnimatePresence initial={false}>
                            {expanded ? (
                              <motion.div
                                key={`details-${id}`}
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{
                                  duration: 0.22,
                                  ease: [0.22, 1, 0.36, 1],
                                }}
                                className="overflow-hidden"
                              >
                                <div className="mt-1 rounded-md bg-white/70 px-1.5 py-1.5 text-[11px] leading-relaxed text-slate-600 ring-1 ring-slate-200/70">
                                  <p>{item.message}</p>
                                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-slate-500">
                                    {incoming ? (
                                      <>
                                        {item.document_name ? (
                                          <span>Doc: {item.document_name}</span>
                                        ) : null}
                                        {item.firm_name ? (
                                          <span>Firm: {item.firm_name}</span>
                                        ) : null}
                                        {item.client_name ? (
                                          <span>Client: {item.client_name}</span>
                                        ) : null}
                                      </>
                                    ) : (
                                      <>
                                        {item.task_id ? (
                                          <span>Task: {item.task_id}</span>
                                        ) : null}
                                        {item.client_name ? (
                                          <span>Client: {item.client_name}</span>
                                        ) : null}
                                        {item.firm_name ? (
                                          <span>Firm: {item.firm_name}</span>
                                        ) : null}
                                        {item.status ? (
                                          <span>Status: {item.status}</span>
                                        ) : null}
                                      </>
                                    )}
                                  </div>
                                </div>
                              </motion.div>
                            ) : null}
                          </AnimatePresence>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {total > items.length ? (
              <div className="border-t border-slate-100 px-2 py-1.5 text-center text-[11px] text-slate-500">
                Showing {items.length} of {total}
              </div>
            ) : null}
          </motion.div>
        ) : null}
      </AnimatePresence>

      <ConfirmActionModal
        isOpen={Boolean(confirmState)}
        title={confirmState?.title || "Confirm"}
        heading={confirmState?.heading || "Are you sure?"}
        message={confirmState?.message || ""}
        confirmLabel={confirmState?.confirmLabel || "Confirm"}
        cancelLabel="Cancel"
        loading={Boolean(confirmState?.loading)}
        tone={confirmState?.tone || "danger"}
        icon={confirmState?.icon || FiAlertTriangle}
        onCancel={closeConfirm}
        onConfirm={handleConfirmAction}
      />
    </div>
  );
}
