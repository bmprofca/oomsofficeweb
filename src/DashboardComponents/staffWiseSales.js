import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiUsers,
  FiRefreshCw,
  FiExternalLink,
  FiCheckCircle,
  FiFileText,
  FiAward,
  FiPhone,
  FiMail,
  FiHash,
} from "react-icons/fi";
import { FaIndianRupeeSign } from "react-icons/fa6";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import getHeaders from "../utils/get-headers";
import API_BASE_URL from "../utils/api-controller";
import {
  DateRangePickerField,
  toIsoDate,
} from "../components/PortalDatePicker";
import { getCurrentComplianceYear } from "../services/complianceService";

const TASK_COLOR = "#c026d3";
const DIRECT_COLOR = "#4f46e5";
const Y_AXIS_WIDTH = 148;

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

const truncateLabel = (value, max = 20) => {
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

const StaffWiseSalesSkeleton = () => (
  <div className="space-y-3">
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-2">
      {[
        "bg-emerald-50 border-emerald-100",
        "bg-fuchsia-50 border-fuchsia-100",
        "bg-indigo-50 border-indigo-100",
        "bg-amber-50 border-amber-100",
      ].map((bg, i) => (
        <div
          key={`stat-skel-${i}`}
          className={`rounded-xl border p-2.5 flex items-center gap-2.5 ${bg}`}
        >
          <SkeletonBar className="h-7 w-7 rounded-lg shrink-0" />
          <div className="space-y-1.5 flex-1 min-w-0">
            <SkeletonBar className="h-2 w-14" />
            <SkeletonBar className="h-3 w-20" />
          </div>
        </div>
      ))}
    </div>
    <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-3 space-y-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={`bar-skel-${i}`} className="flex items-center gap-3">
          <SkeletonBar className="h-3 w-28 shrink-0" />
          <SkeletonBar
            className="h-5 rounded-md"
            style={{ width: `${70 - i * 8}%` }}
          />
        </div>
      ))}
    </div>
  </div>
);

const StaffDetailTooltipBody = ({ row }) => {
  if (!row) return null;

  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-lg text-xs min-w-[200px]">
      <p className="font-semibold text-gray-800 mb-1.5">{row.fullName}</p>

      {(row.mobile || row.email) && (
        <div className="space-y-1 mb-2 pb-2 border-b border-gray-100">
          {row.mobile ? (
            <div className="flex items-center gap-1.5 text-gray-600">
              <FiPhone className="w-3 h-3 text-emerald-500 shrink-0" />
              <span>{row.mobile}</span>
            </div>
          ) : null}
          {row.email ? (
            <div className="flex items-center gap-1.5 text-gray-600 min-w-0">
              <FiMail className="w-3 h-3 text-sky-500 shrink-0" />
              <span className="truncate">{row.email}</span>
            </div>
          ) : null}
        </div>
      )}

      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-1 text-fuchsia-700">
            <span
              className="inline-block h-2 w-2 rounded-sm"
              style={{ backgroundColor: TASK_COLOR }}
            />
            Task
          </span>
          <AmountWithCount amount={row.task} count={row.taskCount} />
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-1 text-indigo-700">
            <span
              className="inline-block h-2 w-2 rounded-sm"
              style={{ backgroundColor: DIRECT_COLOR }}
            />
            Direct
          </span>
          <AmountWithCount amount={row.direct} count={row.directCount} />
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-gray-100 pt-1.5 mt-0.5">
          <span className="text-emerald-700 font-medium">Total</span>
          <AmountWithCount
            amount={row.total}
            count={row.totalCount}
            className="text-emerald-700"
          />
        </div>
      </div>
    </div>
  );
};

const ChartTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  return <StaffDetailTooltipBody row={payload[0]?.payload} />;
};

const StaffYAxisTick = ({ x, y, payload, chartDataByName }) => {
  const row = chartDataByName.get(payload?.value);
  const label = payload?.value || "";

  return (
    <g transform={`translate(${x},${y})`}>
      <foreignObject x={-Y_AXIS_WIDTH + 4} y={-14} width={Y_AXIS_WIDTH - 8} height={28}>
        <div className="relative group h-full flex items-center justify-end pr-1">
          <span
            className="text-[11px] text-gray-700 font-medium truncate max-w-full cursor-default"
            title={row?.fullName || label}
          >
            {label}
          </span>
          <div className="pointer-events-none absolute left-full top-1/2 z-50 ml-2 -translate-y-1/2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity duration-150">
            <StaffDetailTooltipBody row={row} />
          </div>
        </div>
      </foreignObject>
    </g>
  );
};

const StaffWiseSales = ({
  onViewDetails,
  refreshTrigger,
  showViewAll = true,
  showDatePicker = true,
  limit = 10,
  dateRange: controlledDateRange,
  onDateRangeChange: controlledOnDateRangeChange,
  className = "",
}) => {
  const navigate = useNavigate();
  const isControlled = controlledDateRange != null;
  const [loading, setLoading] = useState(true);
  const [staffs, setStaffs] = useState([]);
  const [summary, setSummary] = useState(null);
  const [topStaff, setTopStaff] = useState(null);
  const [internalDateRange, setInternalDateRange] = useState(
    getCurrentFinancialYearRange,
  );
  const [hiddenSeries, setHiddenSeries] = useState({
    task: false,
    direct: false,
  });

  const dateRange = isControlled ? controlledDateRange : internalDateRange;

  const fetchSalesData = useCallback(async () => {
    if (!dateRange?.from_date || !dateRange?.to_date) return;

    setLoading(true);
    try {
      const headers = getHeaders();
      const url = `${API_BASE_URL}/report/sales-top-summary?from_date=${dateRange.from_date}&to_date=${dateRange.to_date}&type=staff&limit=${limit}`;

      const response = await fetch(url, {
        method: "GET",
        headers: {
          ...headers,
          "Content-Type": "application/json",
        },
      });

      const result = await response.json();

      if (result.success && result.data?.staff_wise) {
        const staffData = result.data.staff_wise;
        setStaffs(Array.isArray(staffData.staffs) ? staffData.staffs : []);
        setSummary(staffData.summary || null);
        setTopStaff(staffData.top_staff || null);
      } else {
        setStaffs([]);
        setSummary(null);
        setTopStaff(null);
      }
    } catch (err) {
      console.error("Staff Sales API Error:", err);
      setStaffs([]);
      setSummary(null);
      setTopStaff(null);
    } finally {
      setLoading(false);
    }
  }, [dateRange?.from_date, dateRange?.to_date, limit]);

  useEffect(() => {
    fetchSalesData();
  }, [fetchSalesData, refreshTrigger]);

  const handleDateRangeChange = useCallback(
    (range) => {
      const next = {
        from_date: range?.start || "",
        to_date: range?.end || "",
      };
      if (typeof controlledOnDateRangeChange === "function") {
        controlledOnDateRangeChange(next);
        return;
      }
      setInternalDateRange(next);
    },
    [controlledOnDateRangeChange],
  );

  const datePickerValue = useMemo(
    () => ({
      start: dateRange?.from_date || "",
      end: dateRange?.to_date || "",
    }),
    [dateRange?.from_date, dateRange?.to_date],
  );

  const chartData = useMemo(
    () =>
      staffs.map((staff) => {
        const taskAmount = Number(staff.task?.amount) || 0;
        const directAmount = Number(staff.direct?.amount) || 0;
        const taskCount = Number(staff.task?.count) || 0;
        const directCount = Number(staff.direct?.count) || 0;
        const totalCount =
          Number(staff.total_count) || taskCount + directCount;
        const fullName = staff.name || staff.username || "Staff";

        return {
          name: truncateLabel(fullName, 20),
          fullName,
          mobile: staff.contact?.mobile || null,
          email: staff.contact?.email || null,
          task: taskAmount,
          direct: directAmount,
          total: Number(staff.total_amount) || taskAmount + directAmount,
          taskCount,
          directCount,
          totalCount,
          percentage: Number(staff.percentage) || 0,
        };
      }),
    [staffs],
  );

  const chartDataByName = useMemo(() => {
    const map = new Map();
    chartData.forEach((row) => map.set(row.name, row));
    return map;
  }, [chartData]);

  const chartHeight = Math.max(260, chartData.length * 48 + 56);

  const handleLegendClick = useCallback((entry) => {
    const key = entry?.dataKey;
    if (key !== "task" && key !== "direct") return;
    setHiddenSeries((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  }, []);

  const handleViewDetails = () => {
    if (typeof onViewDetails === "function") {
      onViewDetails();
      return;
    }
    navigate("/sales/staff-wise");
  };

  const renderYTick = useCallback(
    (props) => (
      <StaffYAxisTick {...props} chartDataByName={chartDataByName} />
    ),
    [chartDataByName],
  );

  return (
    <div className={`p-4 ${className}`.trim()}>
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <div className="p-2 bg-gradient-to-br from-teal-100 to-emerald-100 rounded-lg flex-shrink-0">
          <FiUsers className="w-4 h-4 text-teal-600" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-gray-800">
            Staff Wise Sales
          </h3>
          {loading ? (
            <SkeletonBar className="h-2.5 w-36 mt-1.5" />
          ) : summary ? (
            <p className="text-[11px] text-gray-500 mt-0.5 inline-flex items-center gap-1.5 flex-wrap">
              <AmountWithCount
                amount={summary.total_sales}
                count={summary.total_count || 0}
              />
              <span className="text-gray-300">|</span>
              <span>{formatCount(summary.total_staff)} staff</span>
            </p>
          ) : null}
        </div>

        <div className="flex items-center gap-2 ml-auto shrink-0 flex-wrap justify-end">
          {showDatePicker ? (
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
          ) : null}

          <button
            type="button"
            onClick={fetchSalesData}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-indigo-600 shadow-sm hover:bg-indigo-50 disabled:opacity-60 transition-colors"
            title="Refresh"
            aria-label="Refresh staff sales"
            disabled={loading}
          >
            <FiRefreshCw
              className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
            />
          </button>

          {showViewAll ? (
            <button
              type="button"
              onClick={handleViewDetails}
              className="inline-flex h-8 items-center gap-1.5 px-3 rounded-lg border border-teal-200 bg-teal-50 text-teal-700 text-xs font-semibold hover:bg-teal-100 transition-colors"
              title="View all"
            >
              View all
              <FiExternalLink className="w-3 h-3" />
            </button>
          ) : null}
        </div>
      </div>

      {loading ? (
        <StaffWiseSalesSkeleton />
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
              label="Task sales"
              value={
                <AmountWithCount
                  amount={summary?.task?.amount || 0}
                  count={summary?.task?.count || 0}
                />
              }
              icon={FiCheckCircle}
              cardBg="bg-fuchsia-50 border-fuchsia-100"
              iconBg="bg-fuchsia-100"
              iconColor="text-fuchsia-700"
            />
            <StatChip
              label="Direct sales"
              value={
                <AmountWithCount
                  amount={summary?.direct?.amount || 0}
                  count={summary?.direct?.count || 0}
                />
              }
              icon={FiFileText}
              cardBg="bg-indigo-50 border-indigo-100"
              iconBg="bg-indigo-100"
              iconColor="text-indigo-700"
            />
            <StatChip
              label="Top performer"
              value={
                topStaff ? (
                  <span className="inline-flex items-center gap-1.5 min-w-0">
                    <span className="truncate max-w-[7rem]">
                      {topStaff.name || topStaff.username}
                    </span>
                    <AmountWithCount
                      amount={topStaff.total_sales || 0}
                      count={topStaff.total_count || 0}
                    />
                  </span>
                ) : (
                  "—"
                )
              }
              icon={FiAward}
              cardBg="bg-amber-50 border-amber-100"
              iconBg="bg-amber-100"
              iconColor="text-amber-700"
            />
          </div>

          <div className="rounded-xl border border-gray-100 bg-white p-2 sm:p-3 overflow-visible">
            <ResponsiveContainer width="100%" height={chartHeight}>
              <BarChart
                layout="vertical"
                data={chartData}
                margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
                barCategoryGap="28%"
                barGap={6}
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
                  width={Y_AXIS_WIDTH}
                  tick={renderYTick}
                  interval={0}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  content={<ChartTooltip />}
                  cursor={{ fill: "rgba(99, 102, 241, 0.06)" }}
                />
                <Legend
                  verticalAlign="top"
                  height={32}
                  iconType="square"
                  iconSize={10}
                  wrapperStyle={{
                    fontSize: 11,
                    color: "#4b5563",
                    cursor: "pointer",
                    paddingBottom: 4,
                  }}
                  onClick={handleLegendClick}
                  formatter={(value, entry) => {
                    const key = entry?.dataKey;
                    const isHidden = key ? hiddenSeries[key] : false;
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
                <Bar
                  dataKey="task"
                  name="Task"
                  stackId="sales"
                  fill={TASK_COLOR}
                  hide={hiddenSeries.task}
                  radius={[0, 0, 0, 0]}
                  maxBarSize={16}
                />
                <Bar
                  dataKey="direct"
                  name="Direct"
                  stackId="sales"
                  fill={DIRECT_COLOR}
                  hide={hiddenSeries.direct}
                  radius={[0, 4, 4, 0]}
                  maxBarSize={16}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      ) : (
        <div className="text-center py-10 rounded-xl border border-dashed border-gray-200 bg-gray-50/50">
          <FiUsers className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-gray-500 text-sm">
            No staff sales found for this period
          </p>
        </div>
      )}
    </div>
  );
};

export default StaffWiseSales;
