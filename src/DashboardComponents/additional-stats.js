import React, { useState, useEffect, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import {
  FiGrid,
  FiUsers,
  FiUserPlus,
  FiCheckCircle,
  FiTrendingUp,
  FiUserCheck,
  FiPlus,
  FiMove,
  FiAlertCircle,
  FiRefreshCw,
  FiBriefcase,
  FiHome,
  FiLayers,
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
  "present-today": FiUserCheck,
  "task-create-today": FiPlus,
  "task-complete-today": FiCheckCircle,
  "total-ca": FiBriefcase,
  "total-agent": FiUserPlus,
  "total-firms": FiHome,
  "total-services": FiLayers,
};

const CARD_META = {
  "total-client": {
    gradient: "linear-gradient(135deg, #4b5563 0%, #374151 100%)",
  },
  "new-client": {
    gradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  },
  "active-client": {
    gradient: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
  },
  "net-profit": {
    gradient: "linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)",
    isCurrency: true,
  },
  "total-staff": {
    gradient: "linear-gradient(135deg, #ef4444 0%, #e11d48 100%)",
  },
  "present-today": {
    gradient: "linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)",
  },
  "task-create-today": {
    gradient: "linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)",
  },
  "task-complete-today": {
    gradient: "linear-gradient(135deg, #14b8a6 0%, #0f766e 100%)",
  },
  "total-ca": {
    gradient: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)",
  },
  "total-agent": {
    gradient: "linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)",
  },
  "total-firms": {
    gradient: "linear-gradient(135deg, #f97316 0%, #ea580c 100%)",
  },
  "total-services": {
    gradient: "linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)",
  },
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
    id: "present-today",
    title: "Present Today",
    value: "present_today",
    link: "/staff/attendance",
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
    link: "/staff/office-assistance/ca-list",
  },
  {
    id: "total-agent",
    title: "Total Agent",
    value: "total_agent",
    link: "/settings/agent-list",
  },
  {
    id: "total-firms",
    title: "Total Firms",
    value: "total_firms",
    link: "/staff/office-assistance/group-firms",
  },
  {
    id: "total-services",
    title: "Total Services",
    value: "total_services",
    link: "/staff/office-assistance/services",
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
    gradient:
      card.gradient || meta.gradient || CARD_META["total-client"].gradient,
  };
};

const ErrorState = ({ message, onRetry }) => (
  <div className="text-center py-10">
    <div className="inline-flex items-center justify-center w-14 h-14 bg-red-100 rounded-full mb-3">
      <FiAlertCircle className="w-7 h-7 text-red-500" />
    </div>
    <h3 className="text-base font-semibold text-gray-900 mb-1.5">
      Failed to load statistics
    </h3>
    <p className="text-sm text-gray-600 mb-4">{message}</p>
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
    <div className="w-full relative p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="p-2 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-lg flex-shrink-0">
          <FiGrid className="w-4 h-4 text-indigo-600" />
        </div>
        <h3 className="text-sm font-semibold text-gray-800">
          Dashboard Statistics
        </h3>

        {isCustomizing ? (
          <div className="ml-auto text-[10px] px-2 py-0.5 bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-700 rounded-full">
            Drag to reorder
          </div>
        ) : (
          <button
            type="button"
            onClick={fetchDashboardData}
            className="ml-auto inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-indigo-600 shadow-sm hover:bg-indigo-50 disabled:opacity-60 transition-colors"
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-2 auto-rows-fr relative">
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
                isDragOver ? "scale-105 transition-transform duration-200" : ""
              }`}
            >
              {isCustomizing && (
                <div className="absolute -top-2 -left-2 z-10 pointer-events-none">
                  <div className="p-1 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg shadow-lg">
                    <FiMove className="w-2.5 h-2.5 text-white" />
                  </div>
                </div>
              )}

              <motion.div
                className="relative overflow-hidden rounded-xl shadow-md hover:shadow-lg transition-all duration-300 h-full"
                style={{ background: meta.gradient }}
                whileHover={{
                  scale: isCustomizing ? 1 : 1.005,
                  transition: { duration: 0.2 },
                }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="p-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="text-white/80 text-xs font-medium mb-1">
                        {card.title}
                      </div>
                      {loading ? (
                        <div className="animate-pulse h-5 bg-white/20 rounded w-16" />
                      ) : (
                        <div
                          className={`text-lg font-bold text-white leading-tight ${
                            blurEnabled ? "blur-sm" : ""
                          }`}
                        >
                          {meta.isCurrency
                            ? formatCurrency(value)
                            : formatNumber(value)}
                        </div>
                      )}
                    </div>
                    <div className="p-1.5 bg-white/20 backdrop-blur-sm rounded-lg flex-shrink-0 ml-2">
                      <IconComponent className="w-4 h-4 text-white" />
                    </div>
                  </div>
                </div>
                <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-white/0 via-white/20 to-white/0 hover:translate-x-full transition-transform duration-700 pointer-events-none" />
              </motion.div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AdditionalStatsComponent;
