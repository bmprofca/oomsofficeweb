import React, { useState, useEffect, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import {
  FiGrid,
  FiUsers,
  FiUserPlus,
  FiCheckCircle,
  FiTrendingUp,
  FiPlus,
  FiMove,
  FiAlertCircle,
  FiRefreshCw,
  FiBriefcase,
  FiHome,
  FiLayers,
  FiClock,
  FiGift,
} from "react-icons/fi";
import getHeaders from "../utils/get-headers";
import API_BASE_URL from "../utils/api-controller";
import { useUserPermissions } from "../utils/permission-helper";

const CARD_ICONS = {
  "total-client": FiUsers,
  "new-client": FiUserPlus,
  "active-client": FiCheckCircle,
  "net-profit": FiTrendingUp,
  "total-staff": FiUsers,
  "task-create-today": FiPlus,
  "task-complete-today": FiCheckCircle,
  "total-ca": FiBriefcase,
  "total-firms": FiHome,
  "total-services": FiLayers,
  "pending-staff-expense": FiClock,
  "today-birthday": FiGift,
};

const TONES = {
  slate: { chip: "bg-white text-slate-600 ring-1 ring-slate-200", tile: "bg-slate-50 border-slate-200", ring: "hover:border-slate-300" },
  indigo: { chip: "bg-white text-indigo-600 ring-1 ring-indigo-100", tile: "bg-indigo-50 border-indigo-100", ring: "hover:border-indigo-200" },
  emerald: { chip: "bg-white text-emerald-600 ring-1 ring-emerald-100", tile: "bg-emerald-50 border-emerald-100", ring: "hover:border-emerald-200" },
  amber: { chip: "bg-white text-amber-600 ring-1 ring-amber-100", tile: "bg-amber-50 border-amber-100", ring: "hover:border-amber-200" },
  rose: { chip: "bg-white text-rose-600 ring-1 ring-rose-100", tile: "bg-rose-50 border-rose-100", ring: "hover:border-rose-200" },
  violet: { chip: "bg-white text-violet-600 ring-1 ring-violet-100", tile: "bg-violet-50 border-violet-100", ring: "hover:border-violet-200" },
  teal: { chip: "bg-white text-teal-600 ring-1 ring-teal-100", tile: "bg-teal-50 border-teal-100", ring: "hover:border-teal-200" },
  orange: { chip: "bg-white text-orange-600 ring-1 ring-orange-100", tile: "bg-orange-50 border-orange-100", ring: "hover:border-orange-200" },
  sky: { chip: "bg-white text-sky-600 ring-1 ring-sky-100", tile: "bg-sky-50 border-sky-100", ring: "hover:border-sky-200" },
  pink: { chip: "bg-white text-pink-600 ring-1 ring-pink-100", tile: "bg-pink-50 border-pink-100", ring: "hover:border-pink-200" },
};

const CARD_META = {
  "total-client": { tone: "slate" },
  "new-client": { tone: "indigo" },
  "active-client": { tone: "emerald" },
  "net-profit": { tone: "amber", isCurrency: true },
  "total-staff": { tone: "rose" },
  "task-create-today": { tone: "violet" },
  "task-complete-today": { tone: "teal" },
  "total-ca": { tone: "indigo" },
  "total-firms": { tone: "orange" },
  "total-services": { tone: "violet" },
  "pending-staff-expense": { tone: "amber" },
  "today-birthday": { tone: "pink" },
};

const DEFAULT_CARDS = [
  {
    id: "total-client",
    title: "Total Clients",
    value: "total_client",
    link: "/dashboard/clients/total_client",
  },
  {
    id: "new-client",
    title: "New Clients",
    value: "new_client",
    link: "/dashboard/clients/new_client",
  },
  {
    id: "active-client",
    title: "Active Clients",
    value: "active_client",
    link: "/dashboard/clients/active_client",
  },
  {
    id: "net-profit",
    title: "Net Profit",
    value: "net_profit",
    link: "/finance/report",
    isCurrency: true,
  },
  {
    id: "total-staff",
    title: "Total Staff",
    value: "total_staff",
    link: "/staff/view",
  },
  {
    id: "task-create-today",
    title: "Tasks Created",
    value: "task_created_today",
    link: "/dashboard/tasks/task_created_today",
  },
  {
    id: "task-complete-today",
    title: "Tasks Completed",
    value: "task_completed_today",
    link: "/dashboard/tasks/task_completed_today",
  },
  {
    id: "total-ca",
    title: "Total CA",
    value: "total_ca",
    link: "/office-assistance/ca-list",
  },
  {
    id: "total-firms",
    title: "Total Firms",
    value: "total_firms",
    link: "/office-assistance/groups",
  },
  {
    id: "total-services",
    title: "Total Services",
    value: "total_services",
    link: "/office-assistance/services",
  },
  {
    id: "pending-staff-expense",
    title: "Pending Staff Expenses",
    value: "pending_staff_expense",
    secondaryValue: "pending_staff_expense_amount",
    link: "/finance/voucher/staff-expenses",
  },
  {
    id: "today-birthday",
    title: "Today Birthday",
    value: "today_birthday",
    link: "/quick-stats/today-birthday",
  },
];

const getStatValue = (stats, cardValue) => {
  if (!stats) return 0;

  const getValue = (obj, key) => {
    if (!obj) return undefined;
    let val = obj[key];
    if (val === undefined && !key.endsWith("s")) val = obj[`${key}s`];
    if (val === undefined && key.endsWith("s")) val = obj[key.slice(0, -1)];
    if (val !== undefined) {
      if (val && typeof val === "object" && "value" in val) return val.value;
      return val;
    }
    return undefined;
  };

  let val = getValue(stats, cardValue);
  if (val !== undefined) return val;

  if (stats.additional_metrics) {
    val = getValue(stats.additional_metrics, cardValue);
    if (val !== undefined) return val;
  }

  return 0;
};

const resolveCardIcon = (card) => {
  if (typeof card.icon === "function") return card.icon;
  return CARD_ICONS[card.id] || FiGrid;
};

const resolveCardMeta = (card) => {
  const meta = CARD_META[card.id] || {};
  return {
    isCurrency: card.isCurrency ?? meta.isCurrency ?? false,
    tone: TONES[card.tone] || TONES[meta.tone] || TONES.slate,
  };
};

const ErrorState = ({ message, onRetry }) => (
  <div className="ui-empty">
    <div className="ui-empty-icon !bg-rose-50 !text-rose-500">
      <FiAlertCircle className="w-5 h-5" />
    </div>
    <h3 className="ui-empty-title">
      Failed to load statistics
    </h3>
    <p className="ui-empty-text mb-4">{message}</p>
    <button
      type="button"
      onClick={onRetry}
      className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm"
    >
      <FiRefreshCw className="w-4 h-4" />
      Retry
    </button>
  </div>
);

const AdditionalStatsComponent = ({
  isCustomizing = false,
  onCardDragStart = () => {},
  onCardDragOver = () => {},
  onCardDragEnd = () => {},
  draggedCard = null,
  dragOverCard = null,
  formatCurrency = (value) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Number(value) || 0),
  formatNumber = (value) =>
    new Intl.NumberFormat("en-IN").format(Number(value) || 0),
  blurEnabled = false,
  onNavigate = (link) => {
    window.location.href = link;
  },
  additionalStatsCards = [],
  setAdditionalStatsCards,
}) => {
  const { check } = useUserPermissions();
  const [localCards, setLocalCards] = useState(additionalStatsCards);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const headers = getHeaders();
      const response = await fetch(`${API_BASE_URL}/report/dashboard-summary`, {
        method: "GET",
        headers: {
          ...headers,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      if (result.success && result.data) {
        setStats(result.data);
      } else {
        throw new Error(result.message || "Failed to fetch dashboard data");
      }
    } catch (err) {
      console.error("Dashboard statistics API error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  useEffect(() => {
    setLocalCards(
      additionalStatsCards.length > 0 ? additionalStatsCards : DEFAULT_CARDS,
    );
  }, [additionalStatsCards]);

  const handleCardDropInternal = useCallback(
    (e, targetCardId) => {
      if (!isCustomizing) return;
      if (draggedCard && draggedCard !== targetCardId) {
        const draggedIndex = localCards.findIndex((c) => c.id === draggedCard);
        const targetIndex = localCards.findIndex((c) => c.id === targetCardId);
        if (draggedIndex !== -1 && targetIndex !== -1) {
          const newCards = [...localCards];
          const [removed] = newCards.splice(draggedIndex, 1);
          newCards.splice(targetIndex, 0, removed);
          setLocalCards(newCards);
          if (setAdditionalStatsCards) setAdditionalStatsCards(newCards);
        }
      }
      if (onCardDragEnd) onCardDragEnd();
    },
    [
      isCustomizing,
      draggedCard,
      localCards,
      setAdditionalStatsCards,
      onCardDragEnd,
    ],
  );

  const handleCardClick = useCallback(
    (card, e) => {
      if (isCustomizing) return;
      if (e.target.closest("button")) return;
      if (onNavigate && card.link) onNavigate(card.link);
    },
    [isCustomizing, onNavigate],
  );

  const cardsToRender = useMemo(() => {
    const source = localCards.length > 0 ? localCards : DEFAULT_CARDS;
    return source.filter(
      (card) => card.id !== "net-profit" || check("finance_balance_view"),
    );
  }, [localCards, check]);

  if (error && (!stats || Object.keys(stats).length === 0) && !loading) {
    return (
      <div className="p-4">
        <ErrorState message={error} onRetry={fetchDashboardData} />
      </div>
    );
  }

  return (
    <div className="w-full relative">
      <div className="flex items-center gap-2.5 mb-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 flex-shrink-0">
          <FiGrid className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-slate-900 leading-tight">
            Dashboard Statistics
          </h3>
          <p className="text-[11px] text-slate-500 leading-tight">Clients, team, tasks and firm-level totals</p>
        </div>

        {isCustomizing ? (
          <div className="ml-auto ui-badge ui-badge-brand">
            Drag to reorder
          </div>
        ) : (
          <button
            type="button"
            onClick={fetchDashboardData}
            className="ml-auto inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm hover:bg-slate-50 hover:text-indigo-600 disabled:opacity-60 transition-colors"
            title="Refresh statistics"
            aria-label="Refresh dashboard statistics"
            disabled={loading}
          >
            <FiRefreshCw
              className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
            />
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 auto-rows-fr relative">
        {cardsToRender.map((card) => {
          const value = getStatValue(stats, card.value);
          const IconComponent = resolveCardIcon(card);
          const meta = resolveCardMeta(card);
          const isDragged = draggedCard === card.id;
          const isDragOver = dragOverCard === card.id;

          return (
            <div
              key={card.id}
              draggable={isCustomizing}
              onDragStart={(e) =>
                onCardDragStart && onCardDragStart(e, card.id, "additionalStats")
              }
              onDragOver={(e) =>
                onCardDragOver && onCardDragOver(e, card.id, "additionalStats")
              }
              onDrop={(e) => handleCardDropInternal(e, card.id)}
              onDragEnd={onCardDragEnd}
              onClick={(e) => handleCardClick(card, e)}
              className={`relative ${
                isCustomizing ? "cursor-move select-none" : "cursor-pointer"
              } ${isDragged ? "opacity-50" : ""} ${
                isDragOver ? "ring-2 ring-indigo-400 ring-offset-2 rounded-xl" : ""
              }`}
            >
              {isCustomizing && (
                <div className="absolute -top-2 -left-2 z-10 pointer-events-none">
                  <div className="p-1 bg-indigo-600 rounded-md shadow-md">
                    <FiMove className="w-2.5 h-2.5 text-white" />
                  </div>
                </div>
              )}

              <motion.div
                className={`group relative h-full overflow-hidden rounded-xl border ${meta.tone.tile} transition-all duration-200 hover:shadow-md ${meta.tone.ring}`}
              >
                                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 truncate">
                        {card.title}
                      </div>
                      {loading ? (
                        <div className="ui-skeleton mt-2 h-6 w-20" />
                      ) : (
                        <div
                          className={`mt-1.5 flex items-baseline gap-1.5 flex-wrap font-mono text-xl font-medium tabular-nums tracking-tight text-slate-900 leading-tight ${
                            blurEnabled ? "blur-sm" : ""
                          }`}
                        >
                          <span>
                            {meta.isCurrency
                              ? formatCurrency(value)
                              : formatNumber(value)}
                          </span>
                          {card.secondaryValue ? (
                            <span className="text-xs font-medium text-slate-500">
                              · {formatCurrency(getStatValue(stats, card.secondaryValue))}
                            </span>
                          ) : null}
                        </div>
                      )}
                    </div>
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${meta.tone.chip}`}>
                      <IconComponent className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AdditionalStatsComponent;
