import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { createPortal } from "react-dom";
import {
  FiCheckCircle,
  FiClock,
  FiEye,
  FiRefreshCw,
  FiSearch,
  FiX,
  FiXCircle,
  FiInbox,
} from "react-icons/fi";
import toast from "react-hot-toast";
import { Header, Sidebar } from "../../components/header";
import TablePagination from "../../components/TablePagination";
import EmailActionMenu from "../broadcast/email/EmailActionMenu";
import ServiceRequestApproveModal from "../../components/Modals/ServiceRequestApproveModal";
import useDebouncedValue from "../../hooks/useDebouncedValue";
import {
  fetchServiceRequestList,
  rejectServiceRequest,
} from "../../services/serviceRequestService";

const contentInset = (isMinimized) => (isMinimized ? "md:pl-20" : "md:pl-[260px]");

const MODAL_BODY =
  "px-5 py-4 flex-1 min-h-0 overflow-y-auto overscroll-y-contain [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden";

const STATUS_TABS = [
  { id: "all", label: "All" },
  { id: "pending", label: "Pending" },
  { id: "approved", label: "Approved" },
  { id: "rejected", label: "Rejected" },
];

const COLUMNS = ["#", "Date", "Client", "Firm / Service", "Amount", "Status", "Actions"];
const GRID_COLS =
  "grid-cols-[40px_minmax(110px,0.9fr)_minmax(160px,1.4fr)_minmax(180px,1.6fr)_minmax(90px,0.8fr)_110px_72px]";

const formatCurrency = (charges) => {
  const n = Number(charges?.amount ?? charges?.fees);
  if (!Number.isFinite(n)) return "—";
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
};

const formatDate = (value) => {
  if (!value) return "—";
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return "—";
  return dt.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

const StatusBadge = ({ status }) => {
  const s = String(status || "").toLowerCase();
  if (s === "approved") {
    return (
      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
        <FiCheckCircle className="w-3 h-3" /> Approved
      </span>
    );
  }
  if (s === "rejected") {
    return (
      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
        <FiXCircle className="w-3 h-3" /> Rejected
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
      <FiClock className="w-3 h-3" /> Pending
    </span>
  );
};

const ServiceRequestList = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(() => {
    const saved = localStorage.getItem("sidebarMinimized");
    return saved ? JSON.parse(saved) : false;
  });

  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebouncedValue(searchTerm, 400);
  const [statusTab, setStatusTab] = useState("pending");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [pagination, setPagination] = useState({
    page_no: 1,
    limit: 20,
    total: 0,
    total_pages: 1,
    is_last_page: false,
  });

  const [detailRow, setDetailRow] = useState(null);
  const [approveRow, setApproveRow] = useState(null);
  const [rejectRow, setRejectRow] = useState(null);
  const [rejectRemark, setRejectRemark] = useState("");
  const [rejecting, setRejecting] = useState(false);
  const listAbortRef = useRef(null);

  const listStatus = useMemo(() => (statusTab === "all" ? null : statusTab), [statusTab]);

  const loadList = useCallback(async () => {
    listAbortRef.current?.abort();
    const ac = new AbortController();
    listAbortRef.current = ac;

    setLoading(true);
    setError("");
    try {
      const result = await fetchServiceRequestList({
        page_no: pagination.page_no,
        limit: pagination.limit,
        search: debouncedSearch.trim(),
        status: listStatus,
      });
      if (ac.signal.aborted) return;

      if (!result?.success) {
        throw new Error(result?.message || "Failed to load service requests");
      }

      setRows(Array.isArray(result.data) ? result.data : []);
      const pg = result.pagination || {};
      setPagination((prev) => ({
        ...prev,
        page_no: pg.page_no != null ? Number(pg.page_no) : prev.page_no,
        limit: pg.limit != null ? Number(pg.limit) : prev.limit,
        total: pg.total != null ? Number(pg.total) : 0,
        total_pages: pg.total_pages != null ? Number(pg.total_pages) : 1,
        is_last_page: Boolean(pg.is_last_page),
      }));
    } catch (e) {
      if (e.name === "AbortError") return;
      setRows([]);
      setError(e.response?.data?.message || e.message || "Failed to load service requests");
    } finally {
      if (listAbortRef.current === ac) setLoading(false);
    }
  }, [debouncedSearch, listStatus, pagination.page_no, pagination.limit]);

  useEffect(() => {
    setPagination((prev) => (prev.page_no !== 1 ? { ...prev, page_no: 1 } : prev));
  }, [debouncedSearch, listStatus]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  useEffect(() => {
    localStorage.setItem("sidebarMinimized", JSON.stringify(isMinimized));
  }, [isMinimized]);

  const handleRejectSubmit = async () => {
    if (!rejectRow?.request_id) return;
    setRejecting(true);
    try {
      const result = await rejectServiceRequest(rejectRow.request_id, {
        office_remark: rejectRemark,
      });
      if (!result?.success) {
        throw new Error(result?.message || "Failed to reject request");
      }
      toast.success(result.message || "Service request rejected");
      setRejectRow(null);
      setRejectRemark("");
      await loadList();
    } catch (e) {
      toast.error(e.response?.data?.message || e.message || "Failed to reject request");
    } finally {
      setRejecting(false);
    }
  };

  const SkeletonRow = () => (
    <div className={`grid ${GRID_COLS} items-center border-b border-gray-100 animate-pulse`}>
      {COLUMNS.map((col) => (
        <div key={col} className="p-3">
          <div className="h-3 bg-gray-200 rounded w-3/4" />
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
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

      <div className={`pt-16 transition-all duration-300 ease-in-out ${contentInset(isMinimized)}`}>
        <div className="h-full flex flex-col mx-2 sm:mx-4 md:mx-8 my-3 md:my-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-3 md:px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
              <div className="flex flex-col lg:flex-row lg:items-center gap-3">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div className="p-1.5 bg-indigo-50 rounded-lg shrink-0">
                    <FiInbox className="w-4 h-4 text-indigo-600" />
                  </div>
                  <div className="min-w-0">
                    <h1 className="text-base md:text-lg font-bold text-gray-800 m-0">Service Requests</h1>
                    <p className="text-xs text-gray-500 m-0">Approve to create a task or reject with a remark</p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full lg:w-auto">
                  <div className="flex flex-wrap gap-1.5">
                    {STATUS_TABS.map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setStatusTab(tab.id)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          statusTab === tab.id
                            ? "bg-indigo-600 text-white"
                            : "border border-gray-300 text-gray-700 hover:bg-gray-100"
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                  <div className="relative min-w-0 sm:w-56">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="search"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search client, firm, service…"
                      className="w-full pl-9 pr-3 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={loadList}
                    disabled={loading}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-60 shrink-0"
                  >
                    <FiRefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                    Refresh
                  </button>
                </div>
              </div>
            </div>

            {error && !loading ? (
              <div className="mx-3 md:mx-4 mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            <div className="overflow-x-auto">
              <div className="min-w-[960px]">
                <div className={`grid ${GRID_COLS} items-center border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white sticky top-0 z-10`}>
                  {COLUMNS.map((col, i) => (
                    <div
                      key={col}
                      className={`p-3 font-bold text-gray-700 text-[11px] uppercase tracking-wide ${
                        i === 0 ? "text-left" : "border-l border-gray-100"
                      } ${i === COLUMNS.length - 1 ? "text-right" : "text-left"}`}
                    >
                      {col}
                    </div>
                  ))}
                </div>

                {loading ? (
                  Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
                ) : rows.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-gray-500 px-4">
                    <div className="w-14 h-14 bg-gray-100 rounded-full mb-3 flex items-center justify-center">
                      <FiInbox className="w-6 h-6 text-gray-400" />
                    </div>
                    <p className="text-sm font-medium text-gray-500 m-0">No service requests found</p>
                    <p className="text-xs text-gray-400 mt-1 mb-0">Try a different status or search</p>
                  </div>
                ) : (
                  rows.map((row, index) => {
                    const pending = String(row.status).toLowerCase() === "pending";
                    return (
                      <div
                        key={row.request_id}
                        className={`grid ${GRID_COLS} items-center border-b border-gray-100 bg-white hover:bg-gray-50`}
                      >
                        <div className="p-3 text-[11px] font-bold text-gray-800">
                          {(pagination.page_no - 1) * pagination.limit + index + 1}
                        </div>
                        <div className="p-3 min-w-0 border-l border-gray-100">
                          <p className="text-sm font-medium text-gray-700 m-0">{formatDate(row.create_date)}</p>
                        </div>
                        <div className="p-3 min-w-0 border-l border-gray-100">
                          <p className="font-semibold text-gray-800 text-sm m-0 truncate">
                            {row.client?.name || row.client?.username || "—"}
                          </p>
                          <p className="text-xs text-gray-500 m-0 truncate">
                            {row.client?.email || row.client?.mobile || "—"}
                          </p>
                        </div>
                        <div className="p-3 min-w-0 border-l border-gray-100">
                          <p className="text-sm font-medium text-gray-700 m-0 truncate">{row.firm?.name || "—"}</p>
                          <p className="text-xs text-gray-500 m-0 truncate">{row.service?.name || "—"}</p>
                        </div>
                        <div className="p-3 min-w-0 border-l border-gray-100">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            {formatCurrency(row.charges)}
                          </span>
                        </div>
                        <div className="p-3 border-l border-gray-100">
                          <StatusBadge status={row.status} />
                        </div>
                        <div className="p-3 border-l border-gray-100 flex justify-end">
                          <EmailActionMenu
                            items={[
                              { label: "View details", icon: FiEye, onClick: () => setDetailRow(row) },
                              pending
                                ? { label: "Approve", icon: FiCheckCircle, onClick: () => setApproveRow(row) }
                                : null,
                              pending
                                ? {
                                    label: "Reject",
                                    icon: FiXCircle,
                                    danger: true,
                                    onClick: () => {
                                      setRejectRow(row);
                                      setRejectRemark("");
                                    },
                                  }
                                : null,
                            ]}
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <TablePagination
              page={pagination.page_no}
              limit={pagination.limit}
              total={pagination.total}
              totalPages={pagination.total_pages}
              isLastPage={pagination.is_last_page}
              onPageChange={(p) => setPagination((prev) => ({ ...prev, page_no: p }))}
              onLimitChange={(limit) => setPagination((prev) => ({ ...prev, limit, page_no: 1 }))}
            />
          </div>
        </div>
      </div>

      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {detailRow ? (
              <motion.div
                key="sr-details"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[60] flex items-center justify-center overflow-hidden overscroll-none p-3 sm:p-4 pointer-events-none"
              >
                <button
                  type="button"
                  className="absolute inset-0 bg-black/50 backdrop-blur-sm pointer-events-auto"
                  onClick={() => setDetailRow(null)}
                />
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 16 }}
                  className="relative z-[1] pointer-events-auto w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[min(calc(100vh-1.5rem),100dvh)]"
                >
                  <div className="shrink-0 flex items-center justify-between gap-3 px-5 py-3.5 border-b border-gray-200">
                    <div>
                      <h2 className="text-base font-bold text-gray-800 m-0">Request details</h2>
                      <p className="text-xs text-gray-500 m-0">{formatDate(detailRow.create_date)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setDetailRow(null)}
                      className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"
                    >
                      <FiX className="w-4 h-4" />
                    </button>
                  </div>
                  <div className={`${MODAL_BODY} space-y-3 text-sm`}>
                    <div className="flex justify-between items-center py-2.5 border-b border-gray-100">
                      <span className="text-xs font-semibold text-gray-500">Status</span>
                      <StatusBadge status={detailRow.status} />
                    </div>
                    <div className="py-2.5 border-b border-gray-100">
                      <p className="text-xs font-semibold text-gray-500 m-0 mb-1">Client</p>
                      <p className="font-semibold text-gray-800 m-0">{detailRow.client?.name || "—"}</p>
                      <p className="text-xs text-gray-500 m-0">{detailRow.client?.email}</p>
                      <p className="text-xs text-gray-500 m-0">{detailRow.client?.mobile}</p>
                    </div>
                    <div className="py-2.5 border-b border-gray-100">
                      <p className="text-xs font-semibold text-gray-500 m-0 mb-1">Firm</p>
                      <p className="font-medium text-gray-800 m-0">{detailRow.firm?.name || "—"}</p>
                    </div>
                    <div className="py-2.5 border-b border-gray-100">
                      <p className="text-xs font-semibold text-gray-500 m-0 mb-1">Service</p>
                      <p className="font-medium text-gray-800 m-0">{detailRow.service?.name || "—"}</p>
                      <p className="text-xs text-gray-500 m-0">{detailRow.service?.type}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3 rounded-lg bg-gray-50 p-3 border border-gray-100">
                      <div>
                        <p className="text-xs text-gray-500 m-0">Fees</p>
                        <p className="font-medium text-gray-800 m-0">{formatCurrency({ fees: detailRow.charges?.fees })}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 m-0">Total</p>
                        <p className="font-semibold text-indigo-700 m-0">{formatCurrency(detailRow.charges)}</p>
                      </div>
                    </div>
                    {detailRow.client_remark ? (
                      <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3 border border-gray-100 m-0">
                        {detailRow.client_remark}
                      </p>
                    ) : null}
                    {detailRow.office_remark ? (
                      <p className="text-sm text-gray-700 bg-red-50 rounded-lg p-3 border border-red-100 m-0">
                        {detailRow.office_remark}
                      </p>
                    ) : null}
                    {detailRow.task_id ? (
                      <p className="font-mono text-sm text-emerald-700 m-0">{detailRow.task_id}</p>
                    ) : null}
                  </div>
                  {String(detailRow.status).toLowerCase() === "pending" ? (
                    <div className="shrink-0 flex justify-end gap-2 px-5 py-3 border-t border-gray-200 bg-gray-50">
                      <button
                        type="button"
                        onClick={() => {
                          setRejectRow(detailRow);
                          setRejectRemark("");
                          setDetailRow(null);
                        }}
                        className="px-4 py-2 rounded-lg border border-red-200 text-red-700 text-sm font-medium hover:bg-red-50"
                      >
                        Reject
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setApproveRow(detailRow);
                          setDetailRow(null);
                        }}
                        className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700"
                      >
                        Approve
                      </button>
                    </div>
                  ) : null}
                </motion.div>
              </motion.div>
            ) : null}
          </AnimatePresence>,
          document.body,
        )}

      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {rejectRow ? (
              <motion.div
                key="sr-reject"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[65] flex items-center justify-center overflow-hidden overscroll-none p-3 sm:p-4 pointer-events-none"
              >
                <button
                  type="button"
                  className="absolute inset-0 bg-black/50 backdrop-blur-sm pointer-events-auto"
                  onClick={() => !rejecting && setRejectRow(null)}
                />
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 16 }}
                  className="relative z-[1] pointer-events-auto w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col"
                >
                  <div className="px-5 py-3.5 border-b border-gray-200 shrink-0">
                    <h2 className="text-base font-bold text-gray-800 m-0">Reject request</h2>
                    <p className="text-xs text-gray-500 m-0">
                      {rejectRow.client?.name || rejectRow.client?.username || "Client request"}
                    </p>
                  </div>
                  <div className={MODAL_BODY}>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Office remark (optional)</label>
                    <textarea
                      value={rejectRemark}
                      onChange={(e) => setRejectRemark(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                      placeholder="Reason for rejection…"
                    />
                  </div>
                  <div className="px-5 py-3 border-t border-gray-200 flex justify-end gap-2 shrink-0 bg-gray-50">
                    <button
                      type="button"
                      disabled={rejecting}
                      onClick={() => setRejectRow(null)}
                      className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={rejecting}
                      onClick={handleRejectSubmit}
                      className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-60"
                    >
                      {rejecting ? "Rejecting…" : "Reject request"}
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            ) : null}
          </AnimatePresence>,
          document.body,
        )}

      <ServiceRequestApproveModal
        isOpen={Boolean(approveRow)}
        request={approveRow}
        onClose={() => setApproveRow(null)}
        onSuccess={() => {
          setApproveRow(null);
          loadList();
        }}
      />
    </div>
  );
};

export default ServiceRequestList;
