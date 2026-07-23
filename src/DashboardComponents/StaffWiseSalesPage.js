import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  FiBriefcase,
  FiHash,
  FiLayers,
  FiRefreshCw,
  FiUsers,
} from "react-icons/fi";
import { FaIndianRupeeSign } from "react-icons/fa6";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Sidebar, Header } from "../components/header";
import StaffWiseSales from "./staffWiseSales";
import getHeaders from "../utils/get-headers";
import API_BASE_URL from "../utils/api-controller";
import {
  DateRangePickerField,
  toIsoDate,
} from "../components/PortalDatePicker";
import { getCurrentComplianceYear } from "../services/complianceService";

const STAFF_COLORS = [
  "#0f766e",
  "#4f46e5",
  "#c026d3",
  "#ea580c",
  "#0891b2",
  "#ca8a04",
  "#be123c",
  "#7c3aed",
];
const OTHERS_COLOR = "#94a3b8";
const SERVICE_Y_WIDTH = 160;

const getCurrentFinancialYearRange = () => {
  const [startYear] = getCurrentComplianceYear().split("-").map(Number);
  const today = new Date();
  const fyStart = new Date(startYear, 3, 1);
  const fyEnd = new Date(startYear + 1, 2, 31);
  const toDate = today < fyEnd ? today : fyEnd;
  return {
    from_date: toIsoDate(fyStart),
    to_date: toIsoDate(toDate),
  };
};

const formatCurrency = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(amount) || 0);

const formatCount = (value) =>
  new Intl.NumberFormat("en-IN").format(Number(value) || 0);

const truncateLabel = (value, max = 22) => {
  const text = String(value || "");
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
};

const AmountWithCount = ({ amount, count, className = "" }) => (
  <span
    className={`inline-flex items-center gap-1.5 tabular-nums whitespace-nowrap ${className}`}
  >
    <span className="font-semibold">{formatCurrency(amount)}</span>
    <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-gray-500 bg-gray-100 rounded px-1 py-0.5">
      <FiHash className="w-2.5 h-2.5 shrink-0" aria-hidden />
      {formatCount(count)}
    </span>
  </span>
);

const StatChip = ({ label, value, icon: Icon, cardBg, iconBg, iconColor }) => (
  <div
    className={`rounded-xl border shadow-sm p-2.5 flex items-center gap-2.5 min-w-0 ${cardBg}`}
  >
    <div className={`p-1.5 rounded-lg shrink-0 ${iconBg}`}>
      <Icon className={`w-3.5 h-3.5 ${iconColor}`} />
    </div>
    <div className="min-w-0">
      <p className="text-[10px] text-gray-600 font-medium leading-tight">{label}</p>
      <div className="text-xs font-bold text-gray-800 truncate leading-tight mt-0.5">
        {value}
      </div>
    </div>
  </div>
);

const SkeletonBar = ({ className = "", style }) => (
  <div
    className={`rounded bg-gray-200/80 animate-pulse ${className}`}
    style={style}
  />
);

const ServiceContributionSkeleton = () => (
  <div className="space-y-3">
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={`svc-stat-${i}`}
          className="rounded-xl border border-slate-100 bg-slate-50 p-2.5 flex items-center gap-2.5"
        >
          <SkeletonBar className="h-7 w-7 rounded-lg shrink-0" />
          <div className="space-y-1.5 flex-1">
            <SkeletonBar className="h-2 w-14" />
            <SkeletonBar className="h-3 w-20" />
          </div>
        </div>
      ))}
    </div>
    <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-4 space-y-4">
      {Array.from({ length: 7 }).map((_, i) => (
        <div key={`svc-bar-${i}`} className="flex items-center gap-3">
          <SkeletonBar className="h-3 w-32 shrink-0" />
          <SkeletonBar
            className="h-5 rounded-md"
            style={{ width: `${75 - i * 7}%` }}
          />
        </div>
      ))}
    </div>
  </div>
);

const ServiceContributionTooltip = ({ active, payload, staffSeries }) => {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  if (!row) return null;

  const lines = staffSeries
    .map((staff, index) => {
      const amount = Number(row[staff.username]) || 0;
      const count = Number(row[`${staff.username}__count`]) || 0;
      if (amount <= 0) return null;
      return (
        <div
          key={staff.username}
          className="flex items-center justify-between gap-4"
        >
          <span className="inline-flex items-center gap-1.5 text-gray-600">
            <span
              className="inline-block h-2 w-2 rounded-sm"
              style={{ backgroundColor: STAFF_COLORS[index % STAFF_COLORS.length] }}
            />
            {staff.name}
          </span>
          <AmountWithCount amount={amount} count={count} />
        </div>
      );
    })
    .filter(Boolean);

  const othersAmount = Number(row.others) || 0;
  const othersCount = Number(row.others__count) || 0;

  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2.5 shadow-lg text-xs min-w-[220px] max-w-[300px]">
      <p className="font-semibold text-gray-800 mb-2">{row.fullName}</p>
      <div className="space-y-1.5">
        {lines}
        {othersAmount > 0 ? (
          <div className="flex items-center justify-between gap-4">
            <span className="inline-flex items-center gap-1.5 text-gray-500">
              <span
                className="inline-block h-2 w-2 rounded-sm"
                style={{ backgroundColor: OTHERS_COLOR }}
              />
              Others
            </span>
            <AmountWithCount amount={othersAmount} count={othersCount} />
          </div>
        ) : null}
        <div className="flex items-center justify-between gap-4 border-t border-gray-100 pt-1.5 mt-0.5">
          <span className="text-teal-700 font-medium">Service total</span>
          <AmountWithCount
            amount={row.total}
            count={row.totalCount}
            className="text-teal-700"
          />
        </div>
      </div>
    </div>
  );
};

const ServiceStaffContribution = ({ dateRange, refreshKey }) => {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [staffSeries, setStaffSeries] = useState([]);
  const [services, setServices] = useState([]);
  const [hiddenKeys, setHiddenKeys] = useState({});

  const fetchContribution = useCallback(async () => {
    if (!dateRange?.from_date || !dateRange?.to_date) return;

    setLoading(true);
    try {
      const headers = getHeaders();
      const url = `${API_BASE_URL}/report/staff-service-sales-contribution?from_date=${dateRange.from_date}&to_date=${dateRange.to_date}&service_limit=12&staff_limit=6`;
      const response = await fetch(url, {
        method: "GET",
        headers: {
          ...headers,
          "Content-Type": "application/json",
        },
      });
      const result = await response.json();

      if (result.success && result.data) {
        setSummary(result.data.summary || null);
        setStaffSeries(
          Array.isArray(result.data.staff_series)
            ? result.data.staff_series
            : [],
        );
        setServices(
          Array.isArray(result.data.services) ? result.data.services : [],
        );
        setHiddenKeys({});
      } else {
        setSummary(null);
        setStaffSeries([]);
        setServices([]);
      }
    } catch (err) {
      console.error("Service staff contribution error:", err);
      setSummary(null);
      setStaffSeries([]);
      setServices([]);
    } finally {
      setLoading(false);
    }
  }, [dateRange?.from_date, dateRange?.to_date]);

  useEffect(() => {
    fetchContribution();
  }, [fetchContribution, refreshKey]);

  const chartData = useMemo(
    () =>
      services.map((service) => {
        const fullName = service.service_name || "Service";
        const row = {
          name: truncateLabel(fullName, 22),
          fullName,
          total: Number(service.total_amount) || 0,
          totalCount: Number(service.total_count) || 0,
          others: Number(service.others?.amount) || 0,
          others__count: Number(service.others?.count) || 0,
        };

        staffSeries.forEach((staff) => {
          const cell = service.by_staff?.[staff.username];
          row[staff.username] = Number(cell?.amount) || 0;
          row[`${staff.username}__count`] = Number(cell?.count) || 0;
        });

        return row;
      }),
    [services, staffSeries],
  );

  const chartHeight = Math.max(320, chartData.length * 46 + 72);
  const hasOthers = chartData.some((row) => Number(row.others) > 0);

  const handleLegendClick = useCallback((entry) => {
    const key = entry?.dataKey;
    if (!key) return;
    setHiddenKeys((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  }, []);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="p-2 bg-gradient-to-br from-violet-100 to-indigo-100 rounded-lg flex-shrink-0">
            <FiLayers className="w-4 h-4 text-violet-600" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold text-gray-800">
              Service-wise Staff Contribution
            </h2>
            {loading ? (
              <SkeletonBar className="h-2.5 w-44 mt-1.5" />
            ) : summary ? (
              <p className="text-[11px] text-gray-500 mt-0.5 inline-flex items-center gap-1.5 flex-wrap">
                <AmountWithCount
                  amount={summary.total_sales}
                  count={summary.total_count || 0}
                />
                <span className="text-gray-300">|</span>
                <span>{formatCount(summary.total_services)} services</span>
                <span className="text-gray-300">|</span>
                <span>{formatCount(summary.total_staff)} staff</span>
              </p>
            ) : (
              <p className="text-[11px] text-gray-500 mt-0.5">
                How each staff contributes within top services
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={fetchContribution}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-indigo-600 shadow-sm hover:bg-indigo-50 disabled:opacity-60 transition-colors"
            title="Refresh"
            aria-label="Refresh service contribution"
            disabled={loading}
          >
            <FiRefreshCw
              className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
            />
          </button>
        </div>
      </div>

      <div className="p-4">
        {loading ? (
          <ServiceContributionSkeleton />
        ) : chartData.length > 0 ? (
          <>
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-2 mb-3">
              <StatChip
                label="Total sales"
                value={
                  <AmountWithCount
                    amount={summary?.total_sales || 0}
                    count={summary?.total_count || 0}
                  />
                }
                icon={FaIndianRupeeSign}
                cardBg="bg-emerald-50 border-emerald-100"
                iconBg="bg-emerald-100"
                iconColor="text-emerald-700"
              />
              <StatChip
                label="Services"
                value={formatCount(summary?.total_services || 0)}
                icon={FiBriefcase}
                cardBg="bg-violet-50 border-violet-100"
                iconBg="bg-violet-100"
                iconColor="text-violet-700"
              />
              <StatChip
                label="Staff involved"
                value={formatCount(summary?.total_staff || 0)}
                icon={FiUsers}
                cardBg="bg-indigo-50 border-indigo-100"
                iconBg="bg-indigo-100"
                iconColor="text-indigo-700"
              />
              <StatChip
                label="Top service"
                value={
                  services[0] ? (
                    <span className="inline-flex items-center gap-1.5 min-w-0">
                      <span className="truncate max-w-[7rem]">
                        {services[0].service_name}
                      </span>
                      <AmountWithCount
                        amount={services[0].total_amount}
                        count={services[0].total_count}
                      />
                    </span>
                  ) : (
                    "—"
                  )
                }
                icon={FiLayers}
                cardBg="bg-amber-50 border-amber-100"
                iconBg="bg-amber-100"
                iconColor="text-amber-700"
              />
            </div>

            <div className="rounded-xl border border-gray-100 bg-gradient-to-br from-slate-50/80 via-white to-violet-50/40 p-2 sm:p-3">
              <ResponsiveContainer width="100%" height={chartHeight}>
                <BarChart
                  layout="vertical"
                  data={chartData}
                  margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
                  barCategoryGap="26%"
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    horizontal={false}
                    stroke="#e5e7eb"
                  />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 10, fill: "#6b7280" }}
                    tickFormatter={(value) =>
                      value >= 100000
                        ? `₹${(value / 100000).toFixed(1)}L`
                        : value >= 1000
                          ? `₹${(value / 1000).toFixed(0)}k`
                          : `₹${value}`
                    }
                    axisLine={{ stroke: "#e5e7eb" }}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={SERVICE_Y_WIDTH}
                    tick={{ fontSize: 11, fill: "#374151" }}
                    interval={0}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    content={
                      <ServiceContributionTooltip staffSeries={staffSeries} />
                    }
                    cursor={{ fill: "rgba(124, 58, 237, 0.06)" }}
                  />
                  <Legend
                    verticalAlign="top"
                    height={36}
                    iconType="square"
                    iconSize={10}
                    wrapperStyle={{
                      fontSize: 11,
                      color: "#4b5563",
                      cursor: "pointer",
                      paddingBottom: 6,
                    }}
                    onClick={handleLegendClick}
                    formatter={(value, entry) => {
                      const key = entry?.dataKey;
                      const isHidden = key ? hiddenKeys[key] : false;
                      return (
                        <span
                          className={`select-none ${
                            isHidden
                              ? "text-gray-400 line-through opacity-60"
                              : "text-gray-600"
                          }`}
                          title={
                            isHidden
                              ? `Click to show ${value}`
                              : `Click to hide ${value}`
                          }
                        >
                          {value}
                        </span>
                      );
                    }}
                  />
                  {staffSeries.map((staff, index) => (
                    <Bar
                      key={staff.username}
                      dataKey={staff.username}
                      name={staff.name}
                      stackId="service"
                      fill={STAFF_COLORS[index % STAFF_COLORS.length]}
                      hide={Boolean(hiddenKeys[staff.username])}
                      maxBarSize={16}
                      radius={
                        index === staffSeries.length - 1 && !hasOthers
                          ? [0, 4, 4, 0]
                          : [0, 0, 0, 0]
                      }
                    />
                  ))}
                  {hasOthers ? (
                    <Bar
                      dataKey="others"
                      name="Others"
                      stackId="service"
                      fill={OTHERS_COLOR}
                      hide={Boolean(hiddenKeys.others)}
                      maxBarSize={16}
                      radius={[0, 4, 4, 0]}
                    />
                  ) : null}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        ) : (
          <div className="text-center py-12 rounded-xl border border-dashed border-gray-200 bg-gray-50/50">
            <FiLayers className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500 text-sm">
              No service contribution data for this period
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

const StaffWiseSalesPage = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(() => {
    const saved = localStorage.getItem("sidebarMinimized");
    return saved ? JSON.parse(saved) : false;
  });
  const [dateRange, setDateRange] = useState(getCurrentFinancialYearRange);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    localStorage.setItem("sidebarMinimized", JSON.stringify(isMinimized));
  }, [isMinimized]);

  useEffect(() => {
    if (!mobileMenuOpen) return undefined;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  const datePickerValue = useMemo(
    () => ({
      start: dateRange.from_date,
      end: dateRange.to_date,
    }),
    [dateRange.from_date, dateRange.to_date],
  );

  const handleDateRangeChange = useCallback((range) => {
    setDateRange({
      from_date: range?.start || "",
      to_date: range?.end || "",
    });
  }, []);

  const handleRefreshAll = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
  }, []);

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
        className={`pt-16 transition-all duration-300 ease-in-out w-full ${
          isMinimized ? "md:pl-20" : "md:pl-[260px]"
        }`}
      >
        <div className="w-full px-4 sm:px-6 lg:px-8 py-4 md:py-6 space-y-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="p-2 bg-gradient-to-br from-teal-100 to-emerald-100 rounded-lg flex-shrink-0">
                <FiUsers className="w-4 h-4 text-teal-600" />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-sm font-semibold text-gray-800">
                  Staff Wise Sales
                </h1>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  Staff performance and service contribution for the selected
                  period
                </p>
              </div>

              <div className="flex items-center gap-2 ml-auto shrink-0 flex-wrap justify-end">
                <div className="w-52 sm:w-56">
                  <DateRangePickerField
                    value={datePickerValue}
                    onChange={handleDateRangeChange}
                    placeholder="Select date range"
                    mode="range"
                    initialTab="quick"
                    defaultQuickKey="fy"
                    quickOptionKeys={["tw", "lw", "lm", "tm", "lf", "fy"]}
                    showRangeHint={false}
                    showResetButton={false}
                    truncateRangeLabel={false}
                    buttonClassName="w-full h-8 min-w-0 px-3 bg-white border border-gray-200 rounded-lg text-xs text-gray-700 hover:border-indigo-400 focus:outline-none transition-all"
                    wrapperClassName="w-full min-w-0"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleRefreshAll}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-indigo-600 shadow-sm hover:bg-indigo-50 transition-colors"
                  title="Refresh all"
                  aria-label="Refresh all charts"
                >
                  <FiRefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <StaffWiseSales
              showViewAll={false}
              showDatePicker={false}
              limit={20}
              dateRange={dateRange}
              refreshTrigger={refreshKey}
            />
          </div>

          <ServiceStaffContribution
            dateRange={dateRange}
            refreshKey={refreshKey}
          />
        </div>
      </div>
    </div>
  );
};

export default StaffWiseSalesPage;
