import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  FiAward,
  FiRefreshCw,
  FiDownload,
  FiUsers,
  FiPhone,
  FiMail,
  FiCheckCircle,
  FiFileText,
  FiSearch,
} from "react-icons/fi";
import { FaIndianRupeeSign } from "react-icons/fa6";
import { Sidebar, Header } from "../components/header";
import TablePagination from "../components/TablePagination";
import getHeaders from "../utils/get-headers";
import API_BASE_URL from "../utils/api-controller";
import {
  DateRangePickerField,
  toIsoDate,
} from "../components/PortalDatePicker";
import { getCurrentComplianceYear } from "../services/complianceService";

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

const AmountCountCell = ({ amount, count, amountClassName = "text-gray-800" }) => (
  <div>
    <div className={`text-sm font-semibold leading-tight ${amountClassName}`}>
      {formatCurrency(amount)}
    </div>
    <div className="text-[10px] text-gray-400 mt-0.5">
      {formatCount(count)} {Number(count) === 1 ? "sale" : "sales"}
    </div>
  </div>
);

const StatPill = ({ label, value, icon: Icon, cardBg, iconBg, iconColor }) => (
  <div
    className={`rounded-xl border shadow-sm p-3 flex items-center gap-3 min-w-0 ${cardBg}`}
  >
    <div className={`p-2 rounded-lg shrink-0 ${iconBg}`}>
      <Icon className={`w-4 h-4 ${iconColor}`} />
    </div>
    <div className="min-w-0">
      <p className="text-[11px] text-gray-600 font-medium">{label}</p>
      <p className="text-sm font-bold text-gray-800 truncate">{value}</p>
    </div>
  </div>
);

const SkeletonBar = ({ className = "" }) => (
  <div className={`rounded bg-gray-200/80 animate-pulse ${className}`} />
);

const StatsSkeleton = () => (
  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2 mb-3">
    {[
      "bg-emerald-50 border-emerald-100",
      "bg-indigo-50 border-indigo-100",
      "bg-fuchsia-50 border-fuchsia-100",
      "bg-sky-50 border-sky-100",
    ].map((cardBg, index) => (
      <div
        key={`stat-skel-${index}`}
        className={`rounded-xl border shadow-sm p-3 flex items-center gap-3 ${cardBg}`}
      >
        <SkeletonBar className="h-8 w-8 rounded-lg shrink-0" />
        <div className="min-w-0 flex-1 space-y-2">
          <SkeletonBar className="h-2.5 w-16" />
          <SkeletonBar className="h-3.5 w-28" />
        </div>
      </div>
    ))}
  </div>
);

const TableSkeleton = ({ rows = 8 }) => (
  <div className="overflow-x-auto rounded-xl border border-gray-100">
    <table className="w-full min-w-[720px]">
      <thead className="bg-gray-50 border-b border-gray-100">
        <tr>
          <th className="text-left px-3 py-2.5 font-bold text-gray-700 text-[11px] uppercase tracking-wide w-12">
            #
          </th>
          <th className="text-left px-3 py-2.5 font-bold text-gray-700 text-[11px] uppercase tracking-wide">
            Name
          </th>
          <th className="text-left px-3 py-2.5 font-bold text-gray-700 text-[11px] uppercase tracking-wide">
            Contact
          </th>
          <th className="text-right px-3 py-2.5 font-bold text-gray-700 text-[11px] uppercase tracking-wide">
            <span className="inline-flex items-center gap-1 justify-end">
              <FiCheckCircle className="w-3 h-3 text-fuchsia-500" />
              Task
            </span>
          </th>
          <th className="text-right px-3 py-2.5 font-bold text-gray-700 text-[11px] uppercase tracking-wide">
            <span className="inline-flex items-center gap-1 justify-end">
              <FiFileText className="w-3 h-3 text-indigo-500" />
              Direct
            </span>
          </th>
          <th className="text-right px-3 py-2.5 font-bold text-gray-700 text-[11px] uppercase tracking-wide">
            Total
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100">
        {Array.from({ length: rows }).map((_, index) => (
          <tr key={`row-skel-${index}`}>
            <td className="px-3 py-2.5">
              <SkeletonBar className="h-7 w-7 rounded-full" />
            </td>
            <td className="px-3 py-2.5">
              <div className="flex items-start gap-2">
                <SkeletonBar className="mt-0.5 h-7 w-7 rounded-lg shrink-0" />
                <div className="space-y-1.5 flex-1 min-w-0">
                  <SkeletonBar className="h-3.5 w-36" />
                  <SkeletonBar className="h-2.5 w-24" />
                </div>
              </div>
            </td>
            <td className="px-3 py-2.5">
              <div className="space-y-1.5">
                <SkeletonBar className="h-3.5 w-28" />
                <SkeletonBar className="h-2.5 w-36" />
              </div>
            </td>
            <td className="px-3 py-2.5">
              <div className="flex flex-col items-end gap-1.5">
                <SkeletonBar className="h-3.5 w-16" />
                <SkeletonBar className="h-2.5 w-12" />
              </div>
            </td>
            <td className="px-3 py-2.5">
              <div className="flex flex-col items-end gap-1.5">
                <SkeletonBar className="h-3.5 w-16" />
                <SkeletonBar className="h-2.5 w-12" />
              </div>
            </td>
            <td className="px-3 py-2.5">
              <div className="flex flex-col items-end gap-1.5">
                <SkeletonBar className="h-3.5 w-16" />
                <SkeletonBar className="h-2.5 w-12" />
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const TopClientsViewAll = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(() => {
    const saved = localStorage.getItem("sidebarMinimized");
    return saved ? JSON.parse(saved) : false;
  });
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState([]);
  const [summary, setSummary] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState(getCurrentFinancialYearRange);

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

  const fetchAllClients = useCallback(async () => {
    if (!dateRange.from_date || !dateRange.to_date) return;

    setLoading(true);
    try {
      const headers = getHeaders();
      const response = await fetch(
        `${API_BASE_URL}/report/top-clients-by-sales?from_date=${dateRange.from_date}&to_date=${dateRange.to_date}&limit=100&page_no=1`,
        {
          method: "GET",
          headers: {
            ...headers,
            "Content-Type": "application/json",
          },
        },
      );

      const result = await response.json();

      if (result.success && result.data) {
        setClients(result.data.clients || []);
        setSummary(result.data.summary);
      } else {
        setClients([]);
        setSummary(null);
      }
    } catch (err) {
      console.error("Error fetching clients:", err);
      setClients([]);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, [dateRange.from_date, dateRange.to_date]);

  useEffect(() => {
    fetchAllClients();
    setCurrentPage(1);
  }, [fetchAllClients]);

  const handleDateRangeChange = useCallback((range) => {
    setDateRange({
      from_date: range?.start || "",
      to_date: range?.end || "",
    });
  }, []);

  const datePickerValue = useMemo(
    () => ({
      start: dateRange.from_date,
      end: dateRange.to_date,
    }),
    [dateRange.from_date, dateRange.to_date],
  );

  const filteredClients = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return clients;

    return clients.filter((client) => {
      const name = String(client.client_info?.name || "").toLowerCase();
      const mobile = String(client.client_info?.contact?.mobile || "").toLowerCase();
      const email = String(client.client_info?.contact?.email || "").toLowerCase();
      const username = String(client.client_info?.username || "").toLowerCase();
      return (
        name.includes(term) ||
        mobile.includes(term) ||
        email.includes(term) ||
        username.includes(term)
      );
    });
  }, [clients, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredClients.length / itemsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const indexOfFirstItem = (safePage - 1) * itemsPerPage;
  const indexOfLastItem = indexOfFirstItem + itemsPerPage;
  const currentItems = filteredClients.slice(indexOfFirstItem, indexOfLastItem);

  const handlePageChange = useCallback((nextPage) => {
    setCurrentPage(nextPage);
  }, []);

  const handleLimitChange = useCallback((nextLimit) => {
    setItemsPerPage(nextLimit);
    setCurrentPage(1);
  }, []);

  const exportToCSV = () => {
    const headers = [
      "Rank",
      "Client Name",
      "Username",
      "Mobile",
      "Email",
      "Task Count",
      "Task Amount",
      "Direct Count",
      "Direct Amount",
      "Total Count",
      "Total Amount",
    ];

    const csvData = filteredClients.map((client, index) => {
      const task = client.sales_summary?.task || { count: 0, amount: 0 };
      const direct = client.sales_summary?.direct || { count: 0, amount: 0 };
      const totalAmount = client.sales_summary?.total_amount || 0;
      const totalCount =
        (Number(task.count) || 0) + (Number(direct.count) || 0);

      return [
        index + 1,
        `"${String(client.client_info?.name || "").replace(/"/g, '""')}"`,
        client.client_info?.username || "",
        `"${String(client.client_info?.contact?.mobile || "").replace(/"/g, '""')}"`,
        `"${String(client.client_info?.contact?.email || "").replace(/"/g, '""')}"`,
        task.count || 0,
        task.amount || 0,
        direct.count || 0,
        direct.amount || 0,
        totalCount,
        totalAmount,
      ];
    });

    const csvContent = [headers, ...csvData].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `top-clients-${dateRange.from_date}-to-${dateRange.to_date}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

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
        <div className="w-full px-4 sm:px-6 lg:px-8 py-4 md:py-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <div className="p-2 bg-gradient-to-br from-amber-100 to-orange-100 rounded-lg flex-shrink-0">
                  <FiAward className="w-4 h-4 text-amber-600" />
                </div>

                <div className="min-w-0 flex-1">
                  <h1 className="text-sm font-semibold text-gray-800">
                    Top Clients by Sales
                  </h1>
                  {loading ? (
                    <SkeletonBar className="h-2.5 w-40 mt-1.5" />
                  ) : summary ? (
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      {formatCurrency(summary.grand_total_sales)} ·{" "}
                      {formatCount(summary.total_clients)} clients
                    </p>
                  ) : null}
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
                    onClick={fetchAllClients}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-indigo-600 shadow-sm hover:bg-indigo-50 disabled:opacity-60 transition-colors"
                    title="Refresh"
                    aria-label="Refresh top clients"
                    disabled={loading}
                  >
                    <FiRefreshCw
                      className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
                    />
                  </button>

                  <button
                    type="button"
                    onClick={exportToCSV}
                    disabled={loading || filteredClients.length === 0}
                    className="inline-flex h-8 items-center gap-1.5 px-3 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 text-xs font-semibold hover:bg-emerald-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Export CSV"
                  >
                    <FiDownload className="w-3 h-3" />
                    Export
                  </button>
                </div>
              </div>

              {loading ? (
                <StatsSkeleton />
              ) : summary ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2 mb-3">
                  <StatPill
                    label="Total sales"
                    value={formatCurrency(summary.grand_total_sales)}
                    icon={FaIndianRupeeSign}
                    cardBg="bg-emerald-50 border-emerald-100"
                    iconBg="bg-emerald-100"
                    iconColor="text-emerald-700"
                  />
                  <StatPill
                    label="Clients"
                    value={formatCount(summary.total_clients)}
                    icon={FiUsers}
                    cardBg="bg-indigo-50 border-indigo-100"
                    iconBg="bg-indigo-100"
                    iconColor="text-indigo-700"
                  />
                  <StatPill
                    label="Task sales"
                    value={`${formatCurrency(summary.task?.amount || 0)} · ${formatCount(summary.task?.count || 0)}`}
                    icon={FiCheckCircle}
                    cardBg="bg-fuchsia-50 border-fuchsia-100"
                    iconBg="bg-fuchsia-100"
                    iconColor="text-fuchsia-700"
                  />
                  <StatPill
                    label="Direct sales"
                    value={`${formatCurrency(summary.direct?.amount || 0)} · ${formatCount(summary.direct?.count || 0)}`}
                    icon={FiFileText}
                    cardBg="bg-sky-50 border-sky-100"
                    iconBg="bg-sky-100"
                    iconColor="text-sky-700"
                  />
                </div>
              ) : null}

              <div className="relative max-w-md">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search by name, mobile or email..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="h-8 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-3 text-xs text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="p-4">
              {loading ? (
                <TableSkeleton rows={Math.min(itemsPerPage, 8)} />
              ) : (
                <div className="overflow-hidden rounded-xl border border-gray-100">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[720px]">
                      <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                          <th className="text-left px-3 py-2.5 font-bold text-gray-700 text-[11px] uppercase tracking-wide w-12">
                            #
                          </th>
                          <th className="text-left px-3 py-2.5 font-bold text-gray-700 text-[11px] uppercase tracking-wide">
                            Name
                          </th>
                          <th className="text-left px-3 py-2.5 font-bold text-gray-700 text-[11px] uppercase tracking-wide">
                            Contact
                          </th>
                          <th className="text-right px-3 py-2.5 font-bold text-gray-700 text-[11px] uppercase tracking-wide">
                            <span className="inline-flex items-center gap-1 justify-end">
                              <FiCheckCircle className="w-3 h-3 text-fuchsia-500" />
                              Task
                            </span>
                          </th>
                          <th className="text-right px-3 py-2.5 font-bold text-gray-700 text-[11px] uppercase tracking-wide">
                            <span className="inline-flex items-center gap-1 justify-end">
                              <FiFileText className="w-3 h-3 text-indigo-500" />
                              Direct
                            </span>
                          </th>
                          <th className="text-right px-3 py-2.5 font-bold text-gray-700 text-[11px] uppercase tracking-wide">
                            Total
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {currentItems.map((client, index) => {
                          const username = client.client_info?.username;
                          const rank = indexOfFirstItem + index + 1;
                          const task = client.sales_summary?.task || {
                            count: 0,
                            amount: 0,
                          };
                          const direct = client.sales_summary?.direct || {
                            count: 0,
                            amount: 0,
                          };
                          const totalAmount =
                            client.sales_summary?.total_amount || 0;
                          const totalCount =
                            (Number(task.count) || 0) +
                            (Number(direct.count) || 0);

                          return (
                            <tr
                              key={username || index}
                              className="hover:bg-gray-50/70 transition-colors"
                            >
                              <td className="px-3 py-2.5">
                                <div
                                  className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold ${
                                    rank <= 3
                                      ? "bg-amber-100 text-amber-700"
                                      : "bg-indigo-50 text-indigo-700"
                                  }`}
                                >
                                  {rank}
                                </div>
                              </td>
                              <td className="px-3 py-2.5">
                                <div className="flex items-start gap-2 min-w-0">
                                  <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                                    <FiUsers className="w-3.5 h-3.5" />
                                  </div>
                                  <div className="min-w-0">
                                    {username ? (
                                      <Link
                                        to={`/client/profile/${encodeURIComponent(username)}`}
                                        className="text-sm font-semibold text-gray-800 no-underline hover:text-indigo-600 hover:no-underline transition-colors"
                                      >
                                        {client.client_info?.name || username}
                                      </Link>
                                    ) : (
                                      <div className="text-sm font-semibold text-gray-800">
                                        {client.client_info?.name || "—"}
                                      </div>
                                    )}
                                    {(client.client_info?.guardian_name ||
                                      client.client_info?.care_of) && (
                                      <div className="text-xs text-gray-500 mt-0.5 truncate">
                                        {client.client_info?.care_of || "C/O"}:{" "}
                                        {client.client_info?.guardian_name ||
                                          "—"}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="px-3 py-2.5">
                                <div className="space-y-1">
                                  {client.client_info?.contact?.mobile &&
                                  client.client_info.contact.mobile !==
                                    "N/A" ? (
                                    <div className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
                                      <FiPhone className="w-3 h-3 text-emerald-500 shrink-0" />
                                      <span>
                                        {client.client_info.contact.mobile}
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="text-sm text-gray-400">
                                      —
                                    </span>
                                  )}
                                  {client.client_info?.contact?.email &&
                                  client.client_info.contact.email !==
                                    "N/A" ? (
                                    <div className="flex items-center gap-1.5 text-xs text-gray-500 truncate max-w-[220px]">
                                      <FiMail className="w-3 h-3 text-sky-500 shrink-0" />
                                      <span className="truncate">
                                        {client.client_info.contact.email}
                                      </span>
                                    </div>
                                  ) : null}
                                </div>
                              </td>
                              <td className="px-3 py-2.5 text-right">
                                <AmountCountCell
                                  amount={task.amount}
                                  count={task.count}
                                  amountClassName="text-fuchsia-700"
                                />
                              </td>
                              <td className="px-3 py-2.5 text-right">
                                <AmountCountCell
                                  amount={direct.amount}
                                  count={direct.count}
                                  amountClassName="text-indigo-700"
                                />
                              </td>
                              <td className="px-3 py-2.5 text-right">
                                <AmountCountCell
                                  amount={totalAmount}
                                  count={totalCount}
                                  amountClassName="text-emerald-700"
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>

                    {filteredClients.length === 0 ? (
                      <div className="text-center py-10 text-sm text-gray-500">
                        No client data found for this period
                      </div>
                    ) : null}
                  </div>

                  {filteredClients.length > 0 ? (
                    <TablePagination
                      page={safePage}
                      limit={itemsPerPage}
                      total={filteredClients.length}
                      totalPages={totalPages}
                      rowOptions={[5, 10, 20, 50, 100]}
                      defaultRows={20}
                      onPageChange={handlePageChange}
                      onLimitChange={handleLimitChange}
                      showJump
                      showFirstLast
                    />
                  ) : null}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TopClientsViewAll;
