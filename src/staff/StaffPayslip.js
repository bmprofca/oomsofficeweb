import React, { useState, useEffect, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import {
  FiRefreshCw,
  FiFileText,
  FiCheckCircle,
  FiCalendar,
  FiRotateCcw,
  FiDownload,
} from "react-icons/fi";
import API_BASE_URL from "../utils/api-controller";
import getHeaders from "../utils/get-headers";
import TablePagination from "../components/TablePagination";
import {
  MonthPickerField,
  formatMonthLabel,
} from "../components/PortalMonthPicker";
import PayslipPreviewModal from "../components/Modals/PayslipPreviewModal";

const INPUT_CLASS =
  "w-full h-9 text-sm border border-slate-200 rounded-lg bg-white outline-none transition focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 px-3";

const formatCurrency = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  })}`;

const formatDate = (value) => {
  if (!value) return "—";
  const raw = String(value);
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
    const [y, m, d] = raw.slice(0, 10).split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("en-IN");
  }
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return raw.slice(0, 10);
  return d.toLocaleDateString("en-IN");
};

const StaffPayslip = ({ username: usernameProp, staffName, variants }) => {
  const username = usernameProp || "";
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const [payslips, setPayslips] = useState([]);
  const [summary, setSummary] = useState({ count: 0, total_amount: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const defaultGenMonth =
    currentMonth > 1
      ? { month: currentMonth - 1, year: currentYear }
      : { month: 12, year: currentYear - 1 };
  const [genMonthValue, setGenMonthValue] = useState(defaultGenMonth);

  const [modalOpen, setModalOpen] = useState(false);
  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);

  const fetchList = useCallback(async () => {
    if (!username) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `${API_BASE_URL}/salary/payslip/list?username=${encodeURIComponent(
          username,
        )}`,
        { method: "GET", headers: getHeaders() },
      );
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to load payslips");
      }
      setPayslips(data.data?.payslips || []);
      setSummary(
        data.data?.summary || {
          count: 0,
          total_amount: 0,
        },
      );
      setPage(1);
    } catch (err) {
      setError(err.message);
      setPayslips([]);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [username]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const totalPages = Math.max(1, Math.ceil(payslips.length / limit) || 1);
  const pagedPayslips = useMemo(() => {
    const start = (page - 1) * limit;
    return payslips.slice(start, start + limit);
  }, [payslips, page, limit]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const closeModal = useCallback(() => {
    if (generating) return;
    setModalOpen(false);
    setPreview(null);
  }, [generating]);

  const openPreview = async (monthOverride = null) => {
    if (!username) {
      toast.error("Staff username missing");
      return;
    }
    const target = monthOverride || genMonthValue;
    if (!target?.month || !target?.year) {
      toast.error("Select a month first");
      return;
    }
    if (monthOverride) setGenMonthValue(monthOverride);

    setModalOpen(true);
    setPreviewLoading(true);
    setPreview(null);
    try {
      const response = await fetch(`${API_BASE_URL}/salary/payslip/preview`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          username,
          month: target.month,
          year: target.year,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to preview salary");
      }
      setPreview(data.data);
    } catch (err) {
      toast.error(err.message);
      setModalOpen(false);
      setPreview(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleDownload = async (row) => {
    if (!row?.payslip_id) return;
    const loadingToast = toast.loading("Preparing payslip PDF…");
    setDownloadingId(row.payslip_id);
    try {
      const response = await fetch(
        `${API_BASE_URL}/salary/payslip/download?payslip_id=${encodeURIComponent(
          row.payslip_id,
        )}`,
        { method: "GET", headers: getHeaders() },
      );
      const contentType = response.headers.get("content-type") || "";
      if (!response.ok || !contentType.includes("application/pdf")) {
        let message = "Failed to download payslip";
        try {
          const errData = await response.json();
          message = errData.message || message;
        } catch {
          /* ignore */
        }
        throw new Error(message);
      }
      const blob = await response.blob();
      const monthLabel = (
        row.month_name ||
        formatMonthLabel(row) ||
        String(row.month)
      ).replace(/\s+/g, "-");
      const filename = `Payslip-${monthLabel}-${row.year}.pdf`;
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Payslip downloaded", { id: loadingToast });
    } catch (err) {
      toast.error(err.message || "Failed to download payslip", { id: loadingToast });
    } finally {
      setDownloadingId(null);
    }
  };

  const handleConfirmGenerate = async () => {
    if (!username || !genMonthValue?.month || !genMonthValue?.year) return;
    if (!(Number(preview?.amount) > 0)) {
      toast.error("No payable amount to post");
      return;
    }

    const isRegen = Boolean(preview?.already_generated);
    const loadingToast = toast.loading(
      isRegen ? "Updating ledger…" : "Generating salary…",
    );
    setGenerating(true);
    try {
      const response = await fetch(`${API_BASE_URL}/salary/payslip/generate`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          username,
          month: genMonthValue.month,
          year: genMonthValue.year,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to generate salary");
      }
      toast.success(
        data.message || (isRegen ? "Ledger updated" : "Salary generated"),
        { id: loadingToast },
      );
      setModalOpen(false);
      setPreview(null);
      await fetchList();
    } catch (err) {
      toast.error(err.message || "Failed to generate salary", { id: loadingToast });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <motion.div
      variants={variants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="space-y-3"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-base md:text-lg font-bold text-gray-800 m-0">
            Payslip
          </h2>
          <p className="text-xs text-gray-500 mt-0.5 m-0">
            Generate monthly salary and credit the ledger
            {staffName ? ` · ${staffName}` : ""}.
          </p>
        </div>
        <button
          type="button"
          onClick={fetchList}
          disabled={!username || loading}
          className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-50 shrink-0"
          title="Refresh"
        >
          <FiRefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {!username && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Staff username is missing. Open this tab from a staff profile.
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      )}

      <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
        <div className="px-3 md:px-4 py-2.5 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-gray-800 m-0">
            Generate salary
          </h3>
          <span className="text-[11px] text-gray-500 hidden sm:inline">
            Reserved expense “Salary”
          </span>
        </div>
        <div className="px-3 md:px-4 py-3">
          <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
            <div className="sm:w-56 shrink-0">
              <MonthPickerField
                label="Month"
                value={genMonthValue}
                onChange={setGenMonthValue}
                placeholder="Select month"
                buttonClassName={INPUT_CLASS}
                showResetButton={false}
                minYear={currentYear - 5}
                maxYear={currentYear + 1}
              />
            </div>
            <button
              type="button"
              onClick={() => openPreview()}
              disabled={!username || previewLoading || generating}
              className="h-9 inline-flex items-center justify-center gap-1.5 rounded-lg bg-teal-600 px-4 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50 sm:ml-auto"
            >
              <FiFileText className="w-3.5 h-3.5" />
              {previewLoading ? "Loading…" : "Preview & generate"}
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
        <div className="px-3 md:px-4 py-2.5 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <h3 className="text-sm font-semibold text-gray-800 m-0">
            Generated payslips
          </h3>
          <p className="text-xs text-gray-500 m-0 tabular-nums">
            {summary.count || 0} · {formatCurrency(summary.total_amount)}
          </p>
        </div>

        {loading && payslips.length === 0 ? (
          <div className="py-8 text-center text-sm text-gray-500">Loading…</div>
        ) : payslips.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm font-medium text-gray-500 m-0">
              No payslips generated yet
            </p>
            <p className="text-xs text-gray-400 mt-1 m-0">
              Preview a month above to post salary to the ledger.
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full font-sans">
                <thead className="bg-gradient-to-r from-gray-50 to-white border-b border-gray-200">
                  <tr>
                    <th className="px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-wide text-gray-700">
                      Month
                    </th>
                    <th className="px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-wide text-gray-700">
                      Amount
                    </th>
                    <th className="px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-wide text-gray-700">
                      Txn date
                    </th>
                    <th className="px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-wide text-gray-700">
                      Invoice
                    </th>
                    <th className="px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-wide text-gray-700">
                      Status
                    </th>
                    <th className="px-3 py-2.5 text-right text-[11px] font-bold uppercase tracking-wide text-gray-700">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pagedPayslips.map((row) => (
                    <tr
                      key={row.payslip_id}
                      className="border-b border-gray-100 bg-white hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-3 py-2.5 text-sm font-medium text-gray-700">
                        <span className="inline-flex items-center gap-1.5">
                          <FiCalendar className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          {row.month_name || formatMonthLabel(row)} {row.year}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="inline-flex text-xs font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 tabular-nums">
                          {formatCurrency(row.amount)}
                        </span>
                        {row.needs_regenerate && row.payable_amount != null ? (
                          <span className="ml-1.5 text-[11px] text-amber-700 tabular-nums">
                            → {formatCurrency(row.payable_amount)}
                          </span>
                        ) : null}
                      </td>
                      <td className="px-3 py-2.5 text-sm font-medium text-gray-700">
                        {formatDate(row.payslip_date)}
                      </td>
                      <td className="px-3 py-2.5 text-xs font-mono text-gray-700">
                        {row.invoice_no || (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">
                          <FiCheckCircle className="w-3 h-3" />
                          Generated
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex justify-end">
                          {row.needs_regenerate ? (
                            <button
                              type="button"
                              onClick={() =>
                                openPreview({
                                  month: Number(row.month),
                                  year: Number(row.year),
                                })
                              }
                              disabled={previewLoading || generating}
                              className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-800 hover:bg-amber-100 disabled:opacity-50"
                              title="Payable amount changed — regenerate"
                            >
                              <FiRotateCcw className="w-3.5 h-3.5" />
                              Regenerate
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleDownload(row)}
                              disabled={downloadingId === row.payslip_id}
                              className="inline-flex items-center gap-1 rounded-lg border border-teal-200 bg-teal-50 px-2 py-1 text-xs font-medium text-teal-800 hover:bg-teal-100 disabled:opacity-50"
                              title="Download payslip PDF"
                            >
                              <FiDownload
                                className={`w-3.5 h-3.5 ${
                                  downloadingId === row.payslip_id
                                    ? "animate-pulse"
                                    : ""
                                }`}
                              />
                              {downloadingId === row.payslip_id
                                ? "Downloading…"
                                : "Download"}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <TablePagination
              page={page}
              limit={limit}
              total={payslips.length}
              totalPages={totalPages}
              defaultRows={10}
              rowOptions={[5, 10, 20]}
              onPageChange={setPage}
              onLimitChange={(next) => {
                setLimit(next);
                setPage(1);
              }}
            />
          </>
        )}
      </div>

      <PayslipPreviewModal
        isOpen={modalOpen}
        preview={preview}
        loading={previewLoading}
        generating={generating}
        onClose={closeModal}
        onConfirm={handleConfirmGenerate}
      />
    </motion.div>
  );
};

export default StaffPayslip;
