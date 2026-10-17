import React, { useState, useEffect, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import {
  FiTrendingUp,
  FiUsers,
  FiShoppingCart,
  FiCreditCard,
  FiMove,
  FiShoppingBag,
  FiRefreshCw,
  FiBriefcase,
} from "react-icons/fi";
import { TbCurrencyRupee } from "react-icons/tb";
import getHeaders from "../utils/get-headers";
import API_BASE_URL from "../utils/api-controller";
import { useUserPermissions } from "../utils/permission-helper";

const CARD_ICONS = {
  "pending-billing": FiShoppingBag,
  creditors: FiUsers,
  debtors: FiShoppingCart,
  "today-received": TbCurrencyRupee,
  "today-payment": FiCreditCard,
  "ca-report": FiBriefcase,
};

/** Accent tones: white KPI tiles with a coloured icon chip + top accent line. */
const TONES = {
  indigo: { chip: "bg-white text-indigo-600 ring-1 ring-indigo-100", tile: "bg-indigo-50 border-indigo-100", ring: "hover:border-indigo-200" },
  sky: { chip: "bg-white text-sky-600 ring-1 ring-sky-100", tile: "bg-sky-50 border-sky-100", ring: "hover:border-sky-200" },
  rose: { chip: "bg-white text-rose-600 ring-1 ring-rose-100", tile: "bg-rose-50 border-rose-100", ring: "hover:border-rose-200" },
  emerald: { chip: "bg-white text-emerald-600 ring-1 ring-emerald-100", tile: "bg-emerald-50 border-emerald-100", ring: "hover:border-emerald-200" },
  amber: { chip: "bg-white text-amber-600 ring-1 ring-amber-100", tile: "bg-amber-50 border-amber-100", ring: "hover:border-amber-200" },
  violet: { chip: "bg-white text-violet-600 ring-1 ring-violet-100", tile: "bg-violet-50 border-violet-100", ring: "hover:border-violet-200" },
};

const CARD_META = {
  "pending-billing": { showCount: true, showAmount: true, tone: "indigo" },
  creditors: { showCount: true, showAmount: true, tone: "sky" },
  debtors: { showCount: true, showAmount: true, tone: "rose" },
  "today-received": { showCount: true, showAmount: true, tone: "emerald" },
  "today-payment": { showCount: true, showAmount: true, tone: "amber" },
  "ca-report": { showCount: false, showAmount: false, showCaReport: true, tone: "violet" },
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
    link: "/finance/voucher/received?today=true",
  },
  {
    id: "today-payment",
    title: "Today Payment",
    value: "today_payment",
    link: "/finance/voucher/payment?today=true",
  },
  {
    id: "ca-report",
    title: "CA Report",
    value: "ca_report",
    link: null,
  },
];

const QUICK_STATS_EXCLUDED_IDS = new Set(["today-birthday", "pending-for-ca"]);

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
    showCaReport: card.showCaReport ?? meta.showCaReport ?? false,
    tone: TONES[card.tone] || TONES[meta.tone] || TONES.indigo,
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
          ca_report: {
            sent: result.data.ca_report?.sent || 0,
            complete: result.data.ca_report?.complete || 0,
            count:
              (result.data.ca_report?.sent || 0) +
              (result.data.ca_report?.complete || 0),
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
        ca_report: {
          sent: propStats.ca_report?.sent || 0,
          complete: propStats.ca_report?.complete || 0,
          count: 0,
          amount: 0,
        },
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
      if (e.target.closest("button") || e.target.closest("a")) return;
      // CA Report uses row links (Sent / Complete), not full-card navigation
      if (card.id === "ca-report" || card.showCaReport) return;
      if (onNavigate && card.link) {
        onNavigate(card.link);
      }
    },
    [isCustomizing, onNavigate],
  );

  const handleCaReportLink = useCallback(
    (e, approval) => {
      e.preventDefault();
      e.stopPropagation();
      if (isCustomizing) return;
      if (onNavigate) {
        onNavigate(`/task/view?ca_approval=${encodeURIComponent(approval)}`);
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
      if (QUICK_STATS_EXCLUDED_IDS.has(card.id)) return false;
      if (BALANCE_CARD_IDS.includes(card.id)) {
        return check("finance_balance_view");
      }
      return true;
    });
  }, [localCards, check]);

  return (
    <div className="w-full relative">
      <div className="flex items-center gap-2.5 mb-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 flex-shrink-0">
          <FiTrendingUp className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-slate-900 leading-tight">Quick Stats</h3>
          <p className="text-[11px] text-slate-500 leading-tight">Live snapshot of money in, money out and pending work</p>
        </div>

        {isCustomizing ? (
          <div className="ml-auto ui-badge ui-badge-brand">
            Drag to reorder
          </div>
        ) : (
          <button
            type="button"
            onClick={handleRefresh}
            className="ml-auto inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm hover:bg-slate-50 hover:text-indigo-600 disabled:opacity-60 transition-colors"
            title="Refresh stats"
            aria-label="Refresh quick stats"
            disabled={loading}
          >
            <FiRefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 auto-rows-fr relative">
        {cardsToRender.map((card) => {
          const statData = getStatValue(card.value);
          const count = Number(statData.count) || 0;
          const amount = Number(statData.amount) || 0;
          const IconComponent = resolveCardIcon(card);
          const meta = resolveCardMeta(card);
          const isDragged = draggedCard === card.id;
          const isDragOver = dragOverCard === card.id;
          const displayAmount = Math.abs(amount);

          const isCaReport = meta.showCaReport || card.id === "ca-report";

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
                isCustomizing
                  ? "cursor-move select-none"
                  : isCaReport
                    ? "cursor-default"
                    : "cursor-pointer"
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
                        <div className="mt-2 space-y-1.5">
                          <div className="ui-skeleton h-5 w-20" />
                          <div className="ui-skeleton h-3.5 w-14" />
                        </div>
                      ) : isCaReport ? (
                        <div
                          className={`mt-2 space-y-1 ${blurEnabled ? "blur-sm" : ""}`}
                        >
                          <button
                            type="button"
                            onClick={(e) => handleCaReportLink(e, "sent")}
                            disabled={isCustomizing}
                            className="flex w-full items-baseline justify-between gap-2 rounded-md px-1 -mx-1 text-left leading-tight transition-colors hover:bg-slate-50 disabled:pointer-events-none"
                          >
                            <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                              Sent
                            </span>
                            <span className="text-base font-bold tabular-nums text-slate-900">
                              {formatNumber(Number(statData.sent) || 0)}
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleCaReportLink(e, "complete")}
                            disabled={isCustomizing}
                            className="flex w-full items-baseline justify-between gap-2 rounded-md px-1 -mx-1 text-left leading-tight transition-colors hover:bg-slate-50 disabled:pointer-events-none"
                          >
                            <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                              Complete
                            </span>
                            <span className="text-base font-bold tabular-nums text-slate-900">
                              {formatNumber(Number(statData.complete) || 0)}
                            </span>
                          </button>
                        </div>
                      ) : (
                        <div className="mt-1.5">
                          {meta.showAmount && (
                            <div
                              className={`font-mono text-xl font-medium tabular-nums tracking-tight text-slate-900 leading-tight ${
                                blurEnabled ? "blur-sm" : ""
                              }`}
                            >
                              {formatCurrency(displayAmount)}
                            </div>
                          )}
                          {meta.showCount && !meta.showAmount && (
                            <div
                              className={`font-mono text-xl font-medium tabular-nums tracking-tight text-slate-900 leading-tight ${
                                blurEnabled ? "blur-sm" : ""
                              }`}
                            >
                              {formatNumber(count)}
                            </div>
                          )}
                          {meta.showCount && meta.showAmount && (
                            <div
                              className={`mt-1 text-xs font-medium text-slate-500 leading-tight ${
                                blurEnabled ? "blur-sm" : ""
                              }`}
                            >
                              <span className="font-semibold tabular-nums text-slate-700">{formatNumber(count)}</span>
                              <span className="ml-1">{count === 1 ? "entry" : "entries"}</span>
                            </div>
                          )}
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

export default QuickStats;
