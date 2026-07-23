import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FiAward,
  FiRefreshCw,
  FiUsers,
  FiPhone,
  FiMail,
  FiExternalLink,
  FiCheckCircle,
  FiFileText,
} from "react-icons/fi";
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
  const fyStart = new Date(startYear, 3, 1); // Apr 1
  const fyEnd = new Date(startYear + 1, 2, 31); // Mar 31
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

const TopClients = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [topClients, setTopClients] = useState([]);
  const [summary, setSummary] = useState(null);
  const [dateRange, setDateRange] = useState(getCurrentFinancialYearRange);

  const fetchTopClients = useCallback(async () => {
    if (!dateRange.from_date || !dateRange.to_date) return;

    setLoading(true);
    try {
      const headers = getHeaders();
      const response = await fetch(
        `${API_BASE_URL}/report/top-clients-by-sales?from_date=${dateRange.from_date}&to_date=${dateRange.to_date}&limit=10&page_no=1`,
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
        setTopClients(result.data.clients || []);
        setSummary(result.data.summary);
      } else {
        setTopClients([]);
        setSummary(null);
      }
    } catch (err) {
      console.error("Error fetching top clients:", err);
      setTopClients([]);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, [dateRange.from_date, dateRange.to_date]);

  useEffect(() => {
    fetchTopClients();
  }, [fetchTopClients]);

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

  return (
    <div className="p-4">
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <div className="p-2 bg-gradient-to-br from-amber-100 to-orange-100 rounded-lg flex-shrink-0">
          <FiAward className="w-4 h-4 text-amber-600" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-gray-800">
            Top 10 Clients by Sales
          </h3>
          {summary ? (
            <p className="text-[11px] text-gray-500 mt-0.5">
              {formatCurrency(summary.grand_total_sales)} ·{" "}
              {formatCount(summary.total_clients)} clients
            </p>
          ) : null}
        </div>

        <div className="flex items-center gap-2 ml-auto shrink-0">
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
            onClick={fetchTopClients}
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
            onClick={() => navigate("/clients/top")}
            className="inline-flex h-8 items-center gap-1.5 px-3 rounded-lg border border-amber-200 bg-amber-50 text-amber-700 text-xs font-semibold hover:bg-amber-100 transition-colors"
            title="View all"
          >
            View all
            <FiExternalLink className="w-3 h-3" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-indigo-600" />
        </div>
      ) : (
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
              {topClients.map((client, index) => {
                const username = client.client_info?.username;
                const rank = client.rank || index + 1;
                const task = client.sales_summary?.task || { count: 0, amount: 0 };
                const direct = client.sales_summary?.direct || {
                  count: 0,
                  amount: 0,
                };
                const totalAmount = client.sales_summary?.total_amount || 0;
                const totalCount =
                  (Number(task.count) || 0) + (Number(direct.count) || 0);

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
                              onClick={(e) => e.stopPropagation()}
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
                              {client.client_info?.guardian_name || "—"}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="space-y-1">
                        {client.client_info?.contact?.mobile &&
                        client.client_info.contact.mobile !== "N/A" ? (
                          <div className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
                            <FiPhone className="w-3 h-3 text-emerald-500 shrink-0" />
                            <span>{client.client_info.contact.mobile}</span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">—</span>
                        )}
                        {client.client_info?.contact?.email &&
                        client.client_info.contact.email !== "N/A" ? (
                          <div className="flex items-center gap-1.5 text-xs text-gray-500 truncate max-w-[200px]">
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

          {topClients.length === 0 && !loading ? (
            <div className="text-center py-10 text-sm text-gray-500">
              No client data found for this period
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default TopClients;
