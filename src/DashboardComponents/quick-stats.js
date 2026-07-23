import React, { useState, useEffect, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import {
  FiTrendingUp,
  FiUsers,
  FiShoppingCart,
  FiCreditCard,
  FiDollarSign,
  FiCalendar,
  FiMove,
  FiShoppingBag,
  FiRefreshCw,
  FiGift,
} from "react-icons/fi";
import getHeaders from "../utils/get-headers";
import API_BASE_URL from "../utils/api-controller";
import { useUserPermissions } from "../utils/permission-helper";

const CARD_ICONS = {
  "pending-billing": FiShoppingBag,
  creditors: FiUsers,
  debtors: FiShoppingCart,
  "today-received": FiDollarSign,
  "today-payment": FiCreditCard,
  "today-birthday": FiGift,
};

const CARD_META = {
  "pending-billing": {
    showCount: true,
    showAmount: true,
    gradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  },
  creditors: {
    showCount: true,
    showAmount: true,
    gradient: "linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)",
  },
  debtors: {
    showCount: true,
    showAmount: true,
    gradient: "linear-gradient(135deg, #ef4444 0%, #ec4899 100%)",
  },
  "today-received": {
    showCount: true,
    showAmount: true,
    gradient: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
  },
  "today-payment": {
    showCount: true,
    showAmount: true,
    gradient: "linear-gradient(135deg, #f97316 0%, #f59e0b 100%)",
  },
  "today-birthday": {
    showCount: true,
    showAmount: false,
    gradient: "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
  },
};

const DEFAULT_CARDS = [
  {
    id: "pending-billing",
    title: "Pending Billing",
    value: "pending_billing",
    link: "/billing",
  },
  {
    id: "creditors",
    title: "Creditors",
    value: "creditor",
    link: "/quick-stats/creditors",
  },
  {
    id: "debtors",
    title: "Debtors",
    value: "debtor",
    link: "/quick-stats/debtors",
  },
  {
    id: "today-received",
    title: "Today Received",
    value: "today_received",
    link: "/quick-stats/today-received",
  },
  {
    id: "today-payment",
    title: "Today Payment",
    value: "today_payment",
    link: "/quick-stats/today-payment",
  },
  {
    id: "today-birthday",
    title: "Today Birthday",
    value: "today_birthday",
    link: "/quick-stats/today-birthday",
  },
];

const BALANCE_CARD_IDS = [
  "creditors",
  "debtors",
  "today-received",
  "today-payment",
];

const resolveCardIcon = (card) => {
  if (typeof card.icon === "function") return card.icon;
  return CARD_ICONS[card.id] || FiTrendingUp;
};

const resolveCardMeta = (card) => {
  const meta = CARD_META[card.id] || {};
  return {
    showCount: card.showCount ?? meta.showCount ?? true,
    showAmount: card.showAmount ?? meta.showAmount ?? false,
    gradient: card.gradient || meta.gradient || CARD_META["pending-billing"].gradient,
  };
};

const QuickStats = ({
  stats: propStats = {},
  isCustomizing = false,
  onCardDragStart,
  onCardDragOver,
  onCardDragEnd,
  draggedCard = null,
  dragOverCard = null,
  formatCurrency,
  formatNumber,
  blurEnabled = false,
  onNavigate,
  quickStatsCards = [],
  setQuickStatsCards,
  onRefresh,
}) => {
  const { check } = useUserPermissions();
  const [localCards, setLocalCards] = useState(quickStatsCards);
  const [apiStats, setApiStats] = useState({});
  const [loading, setLoading] = useState(false);

  const fetchQuickStats = useCallback(async () => {
    setLoading(true);
    try {
      const headers = getHeaders();
      const response = await fetch(`${API_BASE_URL}/report/dashboard/quick-stats`, {
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
        setApiStats({
          pending_billing: {
            count: result.data.pending_billing?.count ?? 0,
            amount: result.data.pending_billing?.total_amount ?? 0,
          },
          pending_for_billing: {
            count: result.data.pending_billing?.count ?? 0,
            amount: result.data.pending_billing?.total_amount ?? 0,
          },
          creditor: {
            count: result.data.creditors?.count || 0,
            amount: result.data.creditors?.total_amount || 0,
          },
          debtor: {
            count: result.data.debtors?.count || 0,
            amount: result.data.debtors?.total_amount || 0,
          },
          today_received: {
            count: result.data.today_received?.count || 0,
            amount: result.data.today_received?.total_amount || 0,
          },
          today_payment: {
            count: result.data.today_payment?.count || 0,
            amount: result.data.today_payment?.total_amount || 0,
          },
          today_birthday: {
            count: result.data.today_birthday?.count || 0,
            amount: 0,
          },
        });
      } else {
        throw new Error(result.message || "Failed to fetch quick stats");
      }
    } catch (err) {
      console.error("Quick Stats API Error:", err);
      setApiStats({
        pending_billing: {
          count: propStats.pending_for_billing || propStats.pending_billing || 0,
          amount: 0,
        },
        pending_for_billing: {
          count: propStats.pending_for_billing || propStats.pending_billing || 0,
          amount: 0,
        },
        creditor: { count: 0, amount: propStats.creditor || 0 },
        debtor: { count: 0, amount: propStats.debtor || 0 },
        today_received: { count: 0, amount: propStats.today_received || 0 },
        today_payment: { count: 0, amount: propStats.today_payment || 0 },
        today_birthday: { count: propStats.today_birthday || 0, amount: 0 },
      });
    } finally {
      setLoading(false);
    }
    // propStats used only as API-failure fallback
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchQuickStats();
  }, [fetchQuickStats]);

  useEffect(() => {
    setLocalCards(quickStatsCards);
  }, [quickStatsCards]);

  const handleCardDropInternal = useCallback(
    (e, targetCardId) => {
      if (!isCustomizing) return;

      if (draggedCard !== targetCardId) {
        const draggedIndex = localCards.findIndex((c) => c.id === draggedCard);
        const targetIndex = localCards.findIndex((c) => c.id === targetCardId);

        if (draggedIndex !== -1 && targetIndex !== -1) {
          const newCards = [...localCards];
          const [removed] = newCards.splice(draggedIndex, 1);
          newCards.splice(targetIndex, 0, removed);
          setLocalCards(newCards);
          if (setQuickStatsCards) {
            setQuickStatsCards(newCards);
          }
        }
      }
      if (onCardDragEnd) onCardDragEnd();
    },
    [isCustomizing, draggedCard, localCards, setQuickStatsCards, onCardDragEnd],
  );

  const handleRefresh = useCallback(() => {
    fetchQuickStats();
    if (onRefresh) onRefresh();
  }, [fetchQuickStats, onRefresh]);

  const handleCardClick = useCallback(
    (card, e) => {
      if (isCustomizing) return;
      if (e.target.closest("button")) return;
      if (onNavigate && card.link) {
        onNavigate(card.link);
      }
    },
    [isCustomizing, onNavigate],
  );

  const getStatValue = useCallback(
    (statKey) => {
      const apiStat = apiStats[statKey];
      if (apiStat !== undefined) return apiStat;

      const propValue = propStats[statKey];
      if (propValue && typeof propValue === "object") return propValue;

      return { count: 0, amount: 0 };
    },
    [apiStats, propStats],
  );

  const cardsToRender = useMemo(() => {
    const source = localCards.length > 0 ? localCards : DEFAULT_CARDS;
    return source.filter((card) => {
      if (BALANCE_CARD_IDS.includes(card.id)) {
        return check("finance_balance_view");
      }
      return true;
    });
  }, [localCards, check]);

  return (
    <div className="w-full relative">
      <div className="flex items-center gap-2 mb-3">
        <div className="p-2 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-lg flex-shrink-0">
          <FiTrendingUp className="w-4 h-4 text-blue-600" />
        </div>
        <h3 className="text-sm font-semibold text-gray-800">Quick Stats</h3>

        {isCustomizing ? (
          <div className="ml-auto text-[10px] px-2 py-0.5 bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-700 rounded-full">
            Drag to reorder
          </div>
        ) : (
          <button
            type="button"
            onClick={handleRefresh}
            className="ml-auto inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-indigo-600 shadow-sm hover:bg-indigo-50 disabled:opacity-60 transition-colors"
            title="Refresh stats"
            aria-label="Refresh quick stats"
            disabled={loading}
          >
            <FiRefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-2 auto-rows-fr relative">
        {cardsToRender.map((card) => {
          const statData = getStatValue(card.value);
          const count = Number(statData.count) || 0;
          const amount = Number(statData.amount) || 0;
          const IconComponent = resolveCardIcon(card);
          const meta = resolveCardMeta(card);
          const isDragged = draggedCard === card.id;
          const isDragOver = dragOverCard === card.id;
          const displayAmount = Math.abs(amount);

          return (
            <div
              key={card.id}
              draggable={isCustomizing}
              onDragStart={(e) =>
                onCardDragStart && onCardDragStart(e, card.id, "quickStats")
              }
              onDragOver={(e) =>
                onCardDragOver && onCardDragOver(e, card.id, "quickStats")
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
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-white/80 text-xs font-medium mb-1">
                        {card.title}
                      </div>
                      {loading ? (
                        <div className="space-y-1">
                          <div className="animate-pulse h-4 bg-white/20 rounded w-16" />
                          <div className="animate-pulse h-3 bg-white/20 rounded w-12" />
                        </div>
                      ) : (
                        <div className="space-y-1">
                          {meta.showCount && (
                            <div
                              className={`text-lg font-bold text-white leading-tight ${
                                blurEnabled ? "blur-sm" : ""
                              }`}
                            >
                              {formatNumber(count)}
                              <span className="ml-1 text-white/50 text-[10px] font-medium">
                                entries
                              </span>
                            </div>
                          )}
                          {meta.showAmount && (
                            <div
                              className={`text-sm font-semibold text-white/90 leading-tight ${
                                blurEnabled ? "blur-sm" : ""
                              }`}
                            >
                              {formatCurrency(displayAmount)}
                            </div>
                          )}
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

export default QuickStats;
