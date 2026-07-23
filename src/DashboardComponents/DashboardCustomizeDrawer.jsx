import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Reorder, motion } from "framer-motion";
import {
  FiEye,
  FiEyeOff,
  FiGrid,
  FiLayout,
  FiRefreshCw,
  FiX,
} from "react-icons/fi";

const AUTO_SCROLL_EDGE = 56;
const AUTO_SCROLL_MAX_STEP = 16;

const WIDGET_META = {
  "sales-overview": {
    description:
      "Sale invoices, amount, GST, and sales breakdown by task, client, bank, and other sources.",
    iconBg: "from-indigo-500 to-purple-600",
    ring: "ring-indigo-100",
    badge: "bg-indigo-100 text-indigo-700",
  },
  "quick-stats": {
    description:
      "At-a-glance counts for billing, creditors, debtors, payments, and today's birthdays.",
    iconBg: "from-sky-500 to-blue-600",
    ring: "ring-sky-100",
    badge: "bg-sky-100 text-sky-700",
  },
  "task-summary": {
    description:
      "Task pipeline breakdown — overdue, due today, in progress, and completed items.",
    iconBg: "from-amber-500 to-orange-600",
    ring: "ring-amber-100",
    badge: "bg-amber-100 text-amber-700",
  },
  "service-wise-sales": {
    description:
      "Sales distribution by service type with share percentages for the selected period.",
    iconBg: "from-violet-500 to-purple-600",
    ring: "ring-violet-100",
    badge: "bg-violet-100 text-violet-700",
  },
  "staff-wise-sales": {
    description:
      "Staff contribution to sales — compare performance across team members.",
    iconBg: "from-teal-500 to-emerald-600",
    ring: "ring-teal-100",
    badge: "bg-teal-100 text-teal-700",
  },
  "top-clients": {
    description:
      "Top clients ranked by sales volume with period filters and firm details.",
    iconBg: "from-rose-500 to-pink-600",
    ring: "ring-rose-100",
    badge: "bg-rose-100 text-rose-700",
  },
  "additional-stats": {
    description:
      "Client, staff, CA, agent, firm, service, and task KPIs in a compact card grid.",
    iconBg: "from-cyan-500 to-blue-600",
    ring: "ring-cyan-100",
    badge: "bg-cyan-100 text-cyan-700",
  },
};

const getWidgetMeta = (widget) =>
  WIDGET_META[widget.id] || {
    description: widget.description || "Dashboard widget.",
    iconBg: "from-gray-400 to-gray-500",
    ring: "ring-gray-100",
    badge: "bg-gray-100 text-gray-600",
  };

const WidgetRow = React.memo(function WidgetRow({
  widget,
  isHidden = false,
  onToggleVisibility,
  onDragStart,
  onDragEnd,
}) {
  const WidgetIcon = widget.icon || FiGrid;
  const meta = getWidgetMeta(widget);

  const rowBody = (
    <>
      <div
        className={`p-2 rounded-lg bg-gradient-to-br ${meta.iconBg} shadow-sm flex-shrink-0`}
      >
        <WidgetIcon className="w-4 h-4 text-white" />
      </div>

      <div className="flex-1 min-w-0 pointer-events-none select-none">
        <div className="flex items-center gap-2 flex-wrap">
          <div
            className={`font-medium text-sm truncate ${
              isHidden ? "text-gray-600" : "text-gray-800"
            }`}
          >
            {widget.title}
          </div>
          <span
            className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium capitalize ${meta.badge}`}
          >
            {widget.category}
          </span>
        </div>
        <p className="text-[11px] text-gray-500 mt-0.5 leading-snug line-clamp-2">
          {meta.description}
        </p>
      </div>

      <button
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          onToggleVisibility(widget.id);
        }}
        className={`p-2 rounded-lg flex-shrink-0 transition-colors ${
          isHidden
            ? "bg-indigo-600 hover:bg-indigo-700 text-white"
            : "bg-rose-50 hover:bg-rose-100 text-rose-500 hover:text-rose-600"
        }`}
        title={isHidden ? "Show widget" : "Hide widget"}
        aria-label={isHidden ? `Show ${widget.title}` : `Hide ${widget.title}`}
      >
        {isHidden ? (
          <FiEye className="w-4 h-4" />
        ) : (
          <FiEyeOff className="w-4 h-4" />
        )}
      </button>
    </>
  );

  if (isHidden) {
    return (
      <div className="flex items-start gap-2.5 p-2.5 rounded-xl border bg-gray-50/80 border-gray-100">
        {rowBody}
      </div>
    );
  }

  return (
    <Reorder.Item
      value={widget}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={`group flex items-start gap-2.5 p-2.5 rounded-xl border bg-white border-gray-200 hover:shadow-md ${meta.ring} hover:ring-2 list-none cursor-grab active:cursor-grabbing touch-none select-none`}
      whileDrag={{
        scale: 1.02,
        boxShadow: "0 12px 28px rgba(99, 102, 241, 0.18)",
        zIndex: 50,
        cursor: "grabbing",
      }}
      transition={{ layout: { type: "spring", stiffness: 420, damping: 32 } }}
    >
      {rowBody}
    </Reorder.Item>
  );
});

const DashboardCustomizeDrawer = ({
  isOpen,
  onClose,
  onReset,
  visibleWidgets,
  hiddenWidgets,
  onCommitOrder,
  onToggleVisibility,
}) => {
  const [orderedItems, setOrderedItems] = useState(visibleWidgets);
  const orderedRef = useRef(visibleWidgets);
  const isDraggingRef = useRef(false);
  const scrollContainerRef = useRef(null);
  const pointerYRef = useRef(0);
  const autoScrollFrameRef = useRef(null);

  useEffect(() => {
    if (!isDraggingRef.current) {
      setOrderedItems(visibleWidgets);
      orderedRef.current = visibleWidgets;
    }
  }, [visibleWidgets]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen, onClose]);

  const stopAutoScroll = useCallback(() => {
    if (autoScrollFrameRef.current) {
      cancelAnimationFrame(autoScrollFrameRef.current);
      autoScrollFrameRef.current = null;
    }
  }, []);

  const autoScrollStep = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container || !isDraggingRef.current) {
      stopAutoScroll();
      return;
    }

    const rect = container.getBoundingClientRect();
    const y = pointerYRef.current;

    if (y < rect.top + AUTO_SCROLL_EDGE) {
      const intensity = (rect.top + AUTO_SCROLL_EDGE - y) / AUTO_SCROLL_EDGE;
      container.scrollTop -= Math.ceil(AUTO_SCROLL_MAX_STEP * intensity);
    } else if (y > rect.bottom - AUTO_SCROLL_EDGE) {
      const intensity = (y - (rect.bottom - AUTO_SCROLL_EDGE)) / AUTO_SCROLL_EDGE;
      container.scrollTop += Math.ceil(AUTO_SCROLL_MAX_STEP * intensity);
    }

    autoScrollFrameRef.current = requestAnimationFrame(autoScrollStep);
  }, [stopAutoScroll]);

  const handlePointerMove = useCallback((event) => {
    pointerYRef.current = event.clientY;
  }, []);

  const handleDragStart = useCallback((event) => {
    if (event?.clientY != null) {
      pointerYRef.current = event.clientY;
    }
    isDraggingRef.current = true;
    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    stopAutoScroll();
    autoScrollFrameRef.current = requestAnimationFrame(autoScrollStep);
  }, [autoScrollStep, handlePointerMove, stopAutoScroll]);

  const handleDragEnd = useCallback(() => {
    isDraggingRef.current = false;
    window.removeEventListener("pointermove", handlePointerMove);
    stopAutoScroll();
    onCommitOrder(orderedRef.current);
  }, [handlePointerMove, onCommitOrder, stopAutoScroll]);

  useEffect(() => {
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      stopAutoScroll();
    };
  }, [handlePointerMove, stopAutoScroll]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const container = scrollContainerRef.current;
    if (!container) return undefined;

    const onWheel = (event) => {
      if (!isDraggingRef.current) return;
      event.preventDefault();
      container.scrollTop += event.deltaY;
    };

    container.addEventListener("wheel", onWheel, { passive: false });

    return () => {
      container.removeEventListener("wheel", onWheel);
    };
  }, [isOpen, orderedItems.length, hiddenWidgets.length]);

  const handleReorder = useCallback((newOrder) => {
    orderedRef.current = newOrder;
    setOrderedItems(newOrder);
  }, []);

  if (typeof document === "undefined" || !isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[10000] overflow-hidden overscroll-none pointer-events-none"
      role="presentation"
    >
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/40 pointer-events-auto cursor-default"
        onClick={onClose}
        aria-label="Close customize dashboard"
      />

      <motion.aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="dashboard-customize-title"
        initial={{ x: "-100%" }}
        animate={{ x: 0 }}
        transition={{ type: "spring", stiffness: 380, damping: 36 }}
        className="absolute left-0 top-0 flex h-screen max-h-dvh w-full max-w-[380px] flex-col overflow-hidden border-r border-gray-200 bg-white shadow-2xl pointer-events-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 border-b border-indigo-500/20 bg-gradient-to-r from-indigo-600 via-purple-600 to-violet-600 px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="rounded-lg bg-white/20 p-2">
                <FiLayout className="h-4 w-4 text-white" />
              </div>
              <div className="min-w-0">
                <h2
                  id="dashboard-customize-title"
                  className="text-sm font-semibold leading-tight text-white"
                >
                  Customize Dashboard
                </h2>
                <p className="mt-0.5 text-[11px] leading-snug text-indigo-100">
                  Drag any widget row to reorder · eye icon to show or hide
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <button
                type="button"
                onClick={onReset}
                className="inline-flex items-center gap-1 rounded-md bg-white/15 px-2 py-1 text-xs text-white transition-colors hover:bg-white/25"
              >
                <FiRefreshCw className="h-3 w-3" />
                Reset
              </button>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-white/90 transition-colors hover:bg-white/15"
                aria-label="Close"
              >
                <FiX className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <div
          ref={scrollContainerRef}
          className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-y-contain p-3 space-y-4"
        >
          <section>
            <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-gray-800">
              <span className="rounded-md bg-indigo-100 p-1">
                <FiGrid className="h-3 w-3 text-indigo-600" />
              </span>
              Active widgets
              <span className="text-xs font-normal text-gray-400">
                ({orderedItems.length})
              </span>
            </h3>

            {orderedItems.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/50 py-6 text-center text-gray-500">
                <FiGrid className="mx-auto mb-2 h-7 w-7 text-gray-300" />
                <p className="text-sm font-medium">No active widgets</p>
                <p className="mt-1 text-xs text-gray-400">
                  Show widgets from the hidden section below
                </p>
              </div>
            ) : (
              <Reorder.Group
                axis="y"
                values={orderedItems}
                onReorder={handleReorder}
                className="space-y-2"
              >
                {orderedItems.map((widget) => (
                  <WidgetRow
                    key={widget.id}
                    widget={widget}
                    onToggleVisibility={onToggleVisibility}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                  />
                ))}
              </Reorder.Group>
            )}
          </section>

          {hiddenWidgets.length > 0 ? (
            <section>
              <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-gray-800">
                <span className="rounded-md bg-gray-100 p-1">
                  <FiEyeOff className="h-3 w-3 text-gray-500" />
                </span>
                Hidden widgets
                <span className="text-xs font-normal text-gray-400">
                  ({hiddenWidgets.length})
                </span>
              </h3>
              <div className="space-y-2">
                {hiddenWidgets.map((widget) => (
                  <WidgetRow
                    key={widget.id}
                    widget={widget}
                    isHidden
                    onToggleVisibility={onToggleVisibility}
                  />
                ))}
              </div>
            </section>
          ) : null}
        </div>
      </motion.aside>
    </div>,
    document.body,
  );
};

export default DashboardCustomizeDrawer;
