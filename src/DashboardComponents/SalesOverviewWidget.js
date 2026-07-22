import React, { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  FiAlertCircle,
  FiCheckCircle,
  FiCreditCard,
  FiFileText,
  FiLayers,
  FiPercent,
  FiRefreshCw,
  FiShoppingBag,
  FiTrendingUp,
  FiUser,
} from "react-icons/fi";
import CustomSelect from "../components/CustomSelect";
import getHeaders from "../utils/get-headers";
import API_BASE_URL from "../utils/api-controller";
import { useUserPermissions } from "../utils/permission-helper";
import { getCurrentComplianceYear } from "../services/complianceService";

const buildFinancialYearOptions = () => {
  const currentStart = Number(getCurrentComplianceYear().split("-")[0]);
  return Array.from({ length: 3 }, (_, index) => {
    const start = currentStart - index;
    const end = start + 1;
    const value = `${start}-${end}`;
    return {
      value,
      label: `FY ${start}-${String(end).slice(-2)}`,
    };
  });
};

const DEFAULT_BREAKDOWN = {
  task: { count: 0, amount: 0 },
  client: { count: 0, amount: 0 },
  bank: { count: 0, amount: 0 },
  other: { count: 0, amount: 0 },
};

const DEFAULT_STATS = {
  invoice_count: 0,
  sale_amount: 0,
  gst_amount: 0,
  task_sale_count: 0,
  sale_breakdown: DEFAULT_BREAKDOWN,
  previous_financial_year: null,
  previous_fy_sale_amount: 0,
  sale_amount_growth_percent: null,
  previous_fy_label: null,
};

const METRIC_CONFIG = [
  {
    key: "invoice_count",
    label: "Sale invoices",
    icon: FiFileText,
    gradient: "linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%)",
    captionKey: "invoice",
  },
  {
    key: "sale_amount",
    label: "Sale amount",
    icon: FiShoppingBag,
    gradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    type: "currency",
    captionKey: "sale_amount",
  },
  {
    key: "gst_amount",
    label: "GST amount",
    icon: FiPercent,
    gradient: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
    type: "currency",
    captionKey: "gst",
  },
];

const SALE_SOURCE_CONFIG = [
  {
    key: "task",
    label: "Task",
    icon: FiCheckCircle,
    gradient: "from-fuchsia-500 to-pink-600",
    dot: "bg-fuchsia-500",
  },
  {
    key: "client",
    label: "Client",
    icon: FiUser,
    gradient: "from-indigo-500 to-violet-600",
    dot: "bg-indigo-500",
  },
  {
    key: "bank",
    label: "Bank",
    icon: FiCreditCard,
    gradient: "from-cyan-500 to-blue-600",
    dot: "bg-cyan-500",
  },
  {
    key: "other",
    label: "Others",
    icon: FiLayers,
    gradient: "from-slate-500 to-slate-700",
    dot: "bg-slate-500",
    caption: "CA, agent, staff & more",
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05, delayChildren: 0.06 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 320, damping: 28 },
  },
};

const formatCount = (value) =>
  new Intl.NumberFormat("en-IN").format(Number(value) || 0);

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);

const formatMetricValue = (metric, value, canViewAmounts, maskedAmount) => {
  if (metric.type === "currency" && !canViewAmounts) return maskedAmount;
  if (metric.type === "currency") return formatCurrency(value);
  return formatCount(value);
};

const getMetricCaption = (
  metric,
  stats,
  canViewAmounts,
  gstShare,
  taskShare,
) => {
  switch (metric.captionKey) {
    case "invoice":
      if (!stats.invoice_count) return "No invoices this FY";
      return `${formatCount(stats.task_sale_count)} task-linked (${taskShare}%)`;
    case "sale_amount":
      if (!canViewAmounts) return "Amount hidden";
      if (!stats.invoice_count) return "No invoices to average";
      return `Avg ${formatCurrency(stats.sale_amount / stats.invoice_count)} / invoice`;
    case "gst":
      if (!canViewAmounts) return "Amount hidden";
      if (!stats.sale_amount) return "No GST collected yet";
      return `${gstShare}% of total sales`;
    default:
      return "";
  }
};

const SalesOverviewHeader = ({
  financialYearOptions,
  selectedYearOption,
  onYearChange,
  onRefresh,
  refreshing,
}) => (
  <div className="border-b border-gray-100 px-4 py-4 md:px-6 md:py-5">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
          <FiTrendingUp className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h3 className="text-lg font-bold text-gray-900 tracking-tight">
            Sales Overview
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Financial year performance at a glance
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <div className="w-full sm:w-44">
          <CustomSelect
            options={financialYearOptions}
            value={selectedYearOption}
            onChange={onYearChange}
            placeholder="Financial year"
            isSearchable={false}
            isClearable={false}
          />
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={refreshing}
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-white text-indigo-600 shadow-sm hover:bg-indigo-50 disabled:opacity-60 transition-colors"
          title="Refresh"
          aria-label="Refresh sales overview"
        >
          <FiRefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
        </button>
      </div>
    </div>
  </div>
);

const InsightPill = ({ dotColor, children }) => (
  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/70 px-2.5 py-1 text-[10px] font-medium text-gray-600">
    <span className={`h-1.5 w-1.5 rounded-full ${dotColor}`} />
    {children}
  </span>
);

const QuickStatCard = ({
  metric,
  value,
  caption,
  canViewAmounts,
  maskedAmount,
}) => {
  const Icon = metric.icon;

  return (
    <motion.div
      variants={itemVariants}
      whileHover={{ scale: 1.005 }}
      transition={{ duration: 0.2 }}
      className="relative overflow-hidden rounded-xl shadow-md hover:shadow-lg transition-all duration-300 h-full"
      style={{ background: metric.gradient }}
    >
      <div className="p-3">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0">
            <div className="text-white/80 text-xs font-medium mb-1">
              {metric.label}
            </div>
            <motion.div
              key={`${metric.key}-${value}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <div className="text-lg font-bold text-white leading-tight truncate">
                {formatMetricValue(metric, value, canViewAmounts, maskedAmount)}
              </div>
              <div className="text-white/50 text-[10px] leading-tight mt-1">
                {caption}
              </div>
            </motion.div>
          </div>
          <div className="p-1.5 bg-white/20 backdrop-blur-sm rounded-lg flex-shrink-0 ml-2">
            <Icon className="w-4 h-4 text-white" />
          </div>
        </div>
      </div>
      <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-white/0 via-white/20 to-white/0 hover:translate-x-full transition-transform duration-700 pointer-events-none" />
    </motion.div>
  );
};

const SaleSourceRow = ({ source, data, canViewAmounts, maskedAmount, totalCount }) => {
  const Icon = source.icon;
  const count = data?.count || 0;
  const amount = data?.amount || 0;
  const share = totalCount > 0 ? Math.round((count / totalCount) * 100) : 0;

  return (
    <div className="flex items-center gap-3 rounded-lg bg-white/80 px-3 py-2.5 border border-white/60">
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${source.gradient} text-white shadow-sm`}
      >
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold text-gray-700">{source.label}</p>
          <p className="text-xs font-bold text-gray-900">{formatCount(count)}</p>
        </div>
        <div className="mt-1 flex items-center justify-between gap-2 text-[10px] text-gray-400">
          <span>
            {source.key === "other" && source.caption
              ? `${share}% · ${source.caption}`
              : `${share}% of sales`}
          </span>
          <span className="font-medium text-gray-500">
            {canViewAmounts ? formatCurrency(amount) : maskedAmount}
          </span>
        </div>
        <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-gray-100">
          <div
            className={`h-full rounded-full bg-gradient-to-r ${source.gradient}`}
            style={{ width: `${Math.max(share, count > 0 ? 4 : 0)}%` }}
          />
        </div>
      </div>
    </div>
  );
};

const AmountBreakdown = ({
  gstShare,
  gstAmount,
  preTaxAmount,
  canViewAmounts,
  formatCurrencyFn,
}) => {
  if (!canViewAmounts) return null;

  return (
    <div className="mt-4 rounded-xl border border-indigo-100 bg-white/80 p-3 backdrop-blur-sm">
      <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wide text-gray-500 mb-2">
        <span>Amount breakdown</span>
        <span className="normal-case tracking-normal font-normal text-gray-400">
          GST vs pre-tax
        </span>
      </div>
      <div className="flex h-2 overflow-hidden rounded-full bg-gray-100">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.max(gstShare, 0)}%` }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="bg-emerald-500"
          title={`GST ${gstShare}%`}
        />
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.max(100 - gstShare, 0)}%` }}
          transition={{ duration: 0.7, delay: 0.08, ease: "easeOut" }}
          className="bg-indigo-500"
          title="Pre-tax portion"
        />
      </div>
      <div className="mt-2 flex flex-wrap gap-3 text-[10px] text-gray-500">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          GST {formatCurrencyFn(gstAmount)}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-indigo-500" />
          Pre-tax {formatCurrencyFn(preTaxAmount)}
        </span>
      </div>
    </div>
  );
};

const SalesOverviewBodySkeleton = () => (
  <div className="p-4 bg-gray-50/50 animate-pulse">
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 lg:gap-3">
      <div className="lg:col-span-4">
        <div className="h-full rounded-xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-violet-700 p-4 shadow-md">
          <div className="h-3 w-28 rounded bg-white/30" />
          <div className="mt-2 h-10 w-48 rounded bg-white/40" />
          <div className="mt-2 h-4 w-36 rounded bg-white/25" />
          <div className="mt-1 h-3 w-24 rounded bg-white/20" />
          <div className="mt-3 flex flex-wrap gap-2">
            <div className="h-6 w-28 rounded-full bg-white/25" />
            <div className="h-6 w-32 rounded-full bg-white/25" />
          </div>
          <div className="mt-4 rounded-xl border border-white/20 bg-white/15 p-3 space-y-2">
            <div className="flex justify-between">
              <div className="h-3 w-24 rounded bg-white/25" />
              <div className="h-3 w-20 rounded bg-white/20" />
            </div>
            <div className="h-2 rounded-full bg-white/20" />
            <div className="flex gap-3">
              <div className="h-3 w-16 rounded bg-white/20" />
              <div className="h-3 w-20 rounded bg-white/20" />
            </div>
          </div>
        </div>
      </div>

      <div className="lg:col-span-8 space-y-2">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="rounded-xl bg-gray-200 p-3 min-h-[88px] shadow-md"
            />
          ))}
        </div>
        <div className="rounded-xl border border-gray-100 bg-gradient-to-br from-fuchsia-50 via-white to-indigo-50 p-3 shadow-sm">
          <div className="h-4 w-28 rounded bg-gray-200 mb-2.5" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="flex items-center gap-3 rounded-lg bg-white/80 px-3 py-2.5 border border-white/60"
              >
                <div className="h-8 w-8 rounded-lg bg-gray-200 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="flex justify-between">
                    <div className="h-3 w-12 rounded bg-gray-200" />
                    <div className="h-3 w-8 rounded bg-gray-200" />
                  </div>
                  <div className="flex justify-between">
                    <div className="h-2.5 w-16 rounded bg-gray-100" />
                    <div className="h-2.5 w-14 rounded bg-gray-100" />
                  </div>
                  <div className="h-1 rounded-full bg-gray-100" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  </div>
);

const formatPreviousFyLabel = (fyLabel) => {
  if (!fyLabel) return "";
  const [start, end] = String(fyLabel).split("-");
  if (!start || !end) return fyLabel;
  return `FY ${start}-${String(end).slice(-2)}`;
};

const GrowthIndicator = ({ stats }) => {
  if (!stats.previous_financial_year) return null;

  const previousLabel =
    stats.previous_fy_label ||
    formatPreviousFyLabel(stats.previous_financial_year);

  if (stats.sale_amount_growth_percent == null) {
    if (stats.sale_amount > 0 && stats.previous_fy_sale_amount === 0) {
      return (
        <p className="mt-2 text-sm font-semibold text-emerald-200">
          New vs {previousLabel}
        </p>
      );
    }
    return null;
  }

  const growth = stats.sale_amount_growth_percent;
  const isPositive = growth > 0;
  const isNeutral = growth === 0;

  return (
    <p
      className={`mt-2 text-sm font-semibold ${
        isNeutral
          ? "text-indigo-100"
          : isPositive
            ? "text-emerald-200"
            : "text-rose-200"
      }`}
    >
      {isNeutral ? "—" : isPositive ? "↑" : "↓"}{" "}
      {isNeutral ? "No change" : `${Math.abs(growth)}%`} vs {previousLabel}
    </p>
  );
};

const SalesOverviewBody = ({
  stats,
  canViewAmounts,
  maskedAmount,
  gstShare,
  taskShare,
  avgInvoiceValue,
  preTaxAmount,
  totalSourceCount,
  selectedYearOption,
  selectedFinancialYear,
  formatCurrency,
}) => (
  <div className="p-4 bg-gray-50/50">
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 lg:gap-3">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="lg:col-span-4"
      >
        <div className="h-full rounded-xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-violet-700 p-4 shadow-md">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-indigo-100">
            Total sale amount
          </p>
          <motion.p
            key={stats.sale_amount}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="mt-2 text-3xl md:text-4xl font-bold tracking-tight text-white"
          >
            {canViewAmounts ? formatCurrency(stats.sale_amount) : maskedAmount}
          </motion.p>
          <GrowthIndicator stats={stats} />
          <p className="mt-1 text-xs text-indigo-100/80">
            {selectedYearOption?.label || selectedFinancialYear}
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            {stats.invoice_count > 0 ? (
              <InsightPill dotColor="bg-fuchsia-400">
                {taskShare}% task-linked
              </InsightPill>
            ) : null}
            {canViewAmounts && stats.invoice_count > 0 ? (
              <InsightPill dotColor="bg-indigo-300">
                Avg {formatCurrency(avgInvoiceValue)} / invoice
              </InsightPill>
            ) : null}
          </div>

          {canViewAmounts && stats.sale_amount > 0 ? (
            <AmountBreakdown
              gstShare={gstShare}
              gstAmount={stats.gst_amount}
              preTaxAmount={preTaxAmount}
              canViewAmounts={canViewAmounts}
              formatCurrencyFn={formatCurrency}
            />
          ) : null}
        </div>
      </motion.div>

      <div className="lg:col-span-8 space-y-2">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 sm:grid-cols-3 gap-2 auto-rows-fr"
        >
          {METRIC_CONFIG.map((metric) => (
            <QuickStatCard
              key={metric.key}
              metric={metric}
              value={stats[metric.key]}
              caption={getMetricCaption(
                metric,
                stats,
                canViewAmounts,
                gstShare,
                taskShare,
              )}
              canViewAmounts={canViewAmounts}
              maskedAmount={maskedAmount}
            />
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.35 }}
          className="rounded-xl border border-gray-100 bg-gradient-to-br from-fuchsia-50 via-white to-indigo-50 p-3 shadow-sm"
        >
          <p className="text-xs font-bold text-gray-800 mb-2.5">
            Sales by source
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {SALE_SOURCE_CONFIG.map((source) => (
              <SaleSourceRow
                key={source.key}
                source={source}
                data={stats.sale_breakdown?.[source.key]}
                canViewAmounts={canViewAmounts}
                maskedAmount={maskedAmount}
                totalCount={totalSourceCount}
              />
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  </div>
);

const SalesOverviewWidget = () => {
  const { check } = useUserPermissions();
  const canViewAmounts = check("finance_balance_view");

  const financialYearOptions = useMemo(() => buildFinancialYearOptions(), []);
  const defaultFinancialYear =
    financialYearOptions[0]?.value || getCurrentComplianceYear();

  const [selectedFinancialYear, setSelectedFinancialYear] =
    useState(defaultFinancialYear);
  const [stats, setStats] = useState(DEFAULT_STATS);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const selectedYearOption = useMemo(
    () =>
      financialYearOptions.find(
        (option) => option.value === selectedFinancialYear,
      ) ||
      financialYearOptions[0] ||
      null,
    [financialYearOptions, selectedFinancialYear],
  );

  const fetchSalesOverview = useCallback(async (financialYear, isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const headers = getHeaders();
      const params = new URLSearchParams({ financial_year: financialYear });
      const response = await fetch(
        `${API_BASE_URL}/report/dashboard-summary-core?${params.toString()}`,
        { method: "GET", headers },
      );

      const responseData = await response.json();

      if (!response.ok || !responseData.success) {
        throw new Error(responseData.message || "Failed to fetch sales overview");
      }

      const data = responseData.data || {};
      const breakdown = data.sale_breakdown || {};
      const formatted = data.formatted || {};
      setStats({
        invoice_count: data.invoice_count || 0,
        sale_amount: data.sale_amount || 0,
        gst_amount: data.gst_amount || 0,
        task_sale_count: data.task_sale_count || 0,
        sale_breakdown: {
          task: breakdown.task || DEFAULT_BREAKDOWN.task,
          client: breakdown.client || DEFAULT_BREAKDOWN.client,
          bank: breakdown.bank || DEFAULT_BREAKDOWN.bank,
          other: breakdown.other || DEFAULT_BREAKDOWN.other,
        },
        previous_financial_year: data.previous_financial_year || null,
        previous_fy_sale_amount: data.previous_fy_sale_amount || 0,
        sale_amount_growth_percent:
          data.sale_amount_growth_percent ?? null,
        previous_fy_label: formatted.previous_fy_label || null,
      });
    } catch (err) {
      console.error("Error fetching sales overview:", err);
      setError(err.message || "Failed to fetch sales overview");
      setStats(DEFAULT_STATS);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchSalesOverview(selectedFinancialYear);
  }, [fetchSalesOverview, selectedFinancialYear]);

  const maskedAmount = "₹ •••••";

  const gstShare = useMemo(() => {
    if (!canViewAmounts || !stats.sale_amount) return 0;
    return Math.min(100, Math.round((stats.gst_amount / stats.sale_amount) * 100));
  }, [canViewAmounts, stats.gst_amount, stats.sale_amount]);

  const taskShare = useMemo(() => {
    if (!stats.invoice_count) return 0;
    return Math.min(100, Math.round((stats.task_sale_count / stats.invoice_count) * 100));
  }, [stats.invoice_count, stats.task_sale_count]);

  const avgInvoiceValue = useMemo(() => {
    if (!stats.invoice_count) return 0;
    return stats.sale_amount / stats.invoice_count;
  }, [stats.invoice_count, stats.sale_amount]);

  const preTaxAmount = useMemo(
    () => Math.max(0, stats.sale_amount - stats.gst_amount),
    [stats.sale_amount, stats.gst_amount],
  );

  const totalSourceCount = useMemo(
    () =>
      Object.values(stats.sale_breakdown || {}).reduce(
        (sum, item) => sum + (item?.count || 0),
        0,
      ),
    [stats.sale_breakdown],
  );

  const handleYearChange = useCallback((option) => {
    if (option?.value) setSelectedFinancialYear(option.value);
  }, []);

  const handleRefresh = useCallback(() => {
    fetchSalesOverview(selectedFinancialYear, true);
  }, [fetchSalesOverview, selectedFinancialYear]);

  const showBodySkeleton = loading || refreshing;

  if (error && !showBodySkeleton) {
    return (
      <div className="bg-white">
        <SalesOverviewHeader
          financialYearOptions={financialYearOptions}
          selectedYearOption={selectedYearOption}
          onYearChange={handleYearChange}
          onRefresh={() => fetchSalesOverview(selectedFinancialYear)}
          refreshing={false}
        />
        <div className="px-4 py-10 md:px-6 text-center bg-gray-50/50">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="inline-flex items-center justify-center w-14 h-14 bg-red-50 rounded-full mb-4"
          >
            <FiAlertCircle className="w-7 h-7 text-red-500" />
          </motion.div>
          <h3 className="text-base font-semibold text-gray-800 mb-1.5">
            Unable to load sales overview
          </h3>
          <p className="text-sm text-gray-500 mb-4 max-w-md mx-auto">{error}</p>
          <button
            type="button"
            onClick={() => fetchSalesOverview(selectedFinancialYear)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg shadow-sm text-sm hover:bg-indigo-700 transition-colors"
          >
            <FiRefreshCw className="w-4 h-4" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white">
      <SalesOverviewHeader
        financialYearOptions={financialYearOptions}
        selectedYearOption={selectedYearOption}
        onYearChange={handleYearChange}
        onRefresh={handleRefresh}
        refreshing={refreshing}
      />

      {showBodySkeleton ? (
        <SalesOverviewBodySkeleton />
      ) : (
        <SalesOverviewBody
          stats={stats}
          canViewAmounts={canViewAmounts}
          maskedAmount={maskedAmount}
          gstShare={gstShare}
          taskShare={taskShare}
          avgInvoiceValue={avgInvoiceValue}
          preTaxAmount={preTaxAmount}
          totalSourceCount={totalSourceCount}
          selectedYearOption={selectedYearOption}
          selectedFinancialYear={selectedFinancialYear}
          formatCurrency={formatCurrency}
        />
      )}
    </div>
  );
};

export default SalesOverviewWidget;
