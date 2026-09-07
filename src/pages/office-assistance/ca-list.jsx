import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiMail,
  FiPhone,
  FiPlus,
  FiRefreshCw,
  FiSearch,
  FiUser,
  FiUserCheck,
  FiUserX,
} from "react-icons/fi";
import { Header, Sidebar } from "../../components/header";
import TablePagination from "../../components/TablePagination";
import EmailActionMenu from "../broadcast/email/EmailActionMenu";
import AppDialog from "../../components/AppDialog";
import CaCreateModal from "../../components/Modals/CaCreateModal";
import useDebouncedValue from "../../hooks/useDebouncedValue";
import { changeCaStatus, fetchCaList } from "../../services/caService";

const contentInset = (isMinimized) => (isMinimized ? "md:pl-20" : "md:pl-[260px]");

const rowKey = (row) => row?.username || String(row?.id ?? "");

const formatPhone = (row) => {
  if (!row) return "—";
  const code = row.country_code ? `+${String(row.country_code).replace(/^\+/, "")}` : "";
  const mobile = row.mobile || "";
  if (!mobile) return "—";
  return code ? `${code} ${mobile}` : mobile;
};

const formatCurrency = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
};

const COLUMNS = ["#", "CA", "Contact", "Balance", "Status", "Actions"];
const GRID_COLS = "grid-cols-[40px_minmax(180px,1.6fr)_minmax(180px,1.4fr)_minmax(100px,0.8fr)_92px_72px]";

const CAList = () => {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(() => {
    const saved = localStorage.getItem("sidebarMinimized");
    return saved ? JSON.parse(saved) : false;
  });

  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebouncedValue(searchTerm, 400);
  const [caRows, setCaRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    total_pages: 1,
    is_last_page: false,
  });

  const [showAddModal, setShowAddModal] = useState(false);
  const [dialog, setDialog] = useState({
    open: false,
    variant: "confirm",
    title: "",
    message: "",
    confirmText: "Confirm",
    cancelText: "Cancel",
    onConfirm: null,
    loading: false,
  });

  const listAbortRef = useRef(null);

  const loadCaList = useCallback(async () => {
    listAbortRef.current?.abort();
    const ac = new AbortController();
    listAbortRef.current = ac;

    setLoading(true);
    setError("");
    try {
      const result = await fetchCaList({
        search: debouncedSearch,
        page: pagination.page,
        limit: pagination.limit,
      });
      if (ac.signal.aborted) return;

      if (!result?.success) {
        throw new Error(result?.message || "Failed to fetch CA list");
      }

      setCaRows(Array.isArray(result.data) ? result.data : []);
      const meta = result.pagination || result.meta || {};
      setPagination((prev) => ({
        ...prev,
        page: meta.page != null ? Number(meta.page) : prev.page,
        limit: meta.limit != null ? Number(meta.limit) : prev.limit,
        total: meta.total != null ? Number(meta.total) : 0,
        total_pages: meta.total_pages != null ? Number(meta.total_pages) : 1,
        is_last_page: Boolean(meta.is_last_page),
      }));
    } catch (e) {
      if (e.name === "AbortError") return;
      setCaRows([]);
      setError(e.response?.data?.message || e.message || "Failed to load CA list");
    } finally {
      if (listAbortRef.current === ac) setLoading(false);
    }
  }, [debouncedSearch, pagination.page, pagination.limit]);

  useEffect(() => {
    setPagination((prev) => (prev.page !== 1 ? { ...prev, page: 1 } : prev));
  }, [debouncedSearch]);

  useEffect(() => {
    loadCaList();
  }, [loadCaList]);

  useEffect(() => {
    localStorage.setItem("sidebarMinimized", JSON.stringify(isMinimized));
  }, [isMinimized]);

  const closeDialog = () => {
    setDialog((prev) => ({ ...prev, open: false, loading: false, onConfirm: null }));
  };

  const handleDialogConfirm = async () => {
    if (!dialog.onConfirm) {
      closeDialog();
      return;
    }
    setDialog((prev) => ({ ...prev, loading: true }));
    const result = await dialog.onConfirm();
    if (result?.variant) {
      setDialog({
        open: true,
        variant: result.variant,
        title: result.title,
        message: result.message,
        confirmText: "Close",
        cancelText: null,
        onConfirm: null,
        loading: false,
      });
    } else {
      closeDialog();
    }
  };

  const handleToggleStatus = (row) => {
    if (!row?.username) return;
    const nextStatus = row.status ? "deactive" : "active";
    const label = nextStatus === "active" ? "activate" : "deactivate";
    setDialog({
      open: true,
      variant: nextStatus === "deactive" ? "warning" : "confirm",
      title: `${nextStatus === "active" ? "Activate" : "Deactivate"} CA`,
      message: `Are you sure you want to ${label} ${row.name || "this CA"}?`,
      confirmText: nextStatus === "active" ? "Activate" : "Deactivate",
      cancelText: "Cancel",
      loading: false,
      onConfirm: async () => {
        try {
          const result = await changeCaStatus(row.username, nextStatus);
          if (result?.success) {
            await loadCaList();
            return {
              variant: "success",
              title: "Status Updated",
              message: result.message || "CA status updated successfully.",
            };
          }
          return {
            variant: "error",
            title: "Update Failed",
            message: result?.message || "Could not update CA status.",
          };
        } catch (e) {
          return {
            variant: "error",
            title: "Error",
            message: e.response?.data?.message || e.message || "Failed to update CA status.",
          };
        }
      },
    });
  };

  const openProfile = (row) => {
    if (!row?.username) return;
    navigate(`/staff/office-assistance/ca-profile/${encodeURIComponent(row.username)}/tasks`, {
      state: { caRow: row },
    });
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
                    <FiUser className="w-4 h-4 text-indigo-600" />
                  </div>
                  <div className="min-w-0">
                    <h1 className="text-base md:text-lg font-bold text-gray-800 m-0">Chartered Accountants</h1>
                    <p className="text-xs text-gray-500 m-0">Create and manage CAs for this branch</p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full lg:w-auto">
                  <div className="relative min-w-0 sm:w-56">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search name, mobile, email…"
                      className="w-full pl-9 pr-3 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={loadCaList}
                    disabled={loading}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-60 shrink-0"
                  >
                    <FiRefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                    Refresh
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddModal(true)}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shrink-0"
                  >
                    <FiPlus className="w-4 h-4" />
                    Add
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
              <div className="min-w-[820px]">
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
                ) : caRows.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-gray-500 px-4">
                    <div className="w-14 h-14 bg-gray-100 rounded-full mb-3 flex items-center justify-center">
                      <FiUser className="w-6 h-6 text-gray-400" />
                    </div>
                    <p className="text-sm font-medium text-gray-500 m-0">No CAs found</p>
                    <p className="text-xs text-gray-400 mt-1 mb-3">Create a new chartered accountant</p>
                    <button
                      type="button"
                      onClick={() => setShowAddModal(true)}
                      className="px-3 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
                    >
                      Create CA
                    </button>
                  </div>
                ) : (
                  caRows.map((row, index) => (
                    <div
                      key={rowKey(row) || `row-${index}`}
                      className={`grid ${GRID_COLS} items-center border-b border-gray-100 bg-white hover:bg-gray-50`}
                    >
                      <div className="p-3 text-[11px] font-bold text-gray-800">
                        {(pagination.page - 1) * pagination.limit + index + 1}
                      </div>
                      <div className="p-3 min-w-0 border-l border-gray-100">
                        <button
                          type="button"
                          onClick={() => openProfile(row)}
                          className="flex items-center gap-2 text-left group"
                        >
                          {row.image ? (
                            <img
                              src={row.image}
                              alt=""
                              className="w-7 h-7 rounded-lg object-cover border border-gray-200 shrink-0"
                            />
                          ) : (
                            <div className="w-7 h-7 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg shadow-sm flex items-center justify-center shrink-0">
                              <FiUser className="w-3.5 h-3.5 text-white" />
                            </div>
                          )}
                          <p className="font-semibold text-gray-800 text-sm group-hover:text-indigo-600 m-0 truncate">
                            {row.name || "—"}
                          </p>
                        </button>
                      </div>
                      <div className="p-3 min-w-0 border-l border-gray-100">
                        <p className="flex items-center gap-1.5 text-sm font-medium text-gray-700 m-0">
                          <FiPhone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          {formatPhone(row)}
                        </p>
                        <p className="flex items-center gap-1.5 text-xs text-gray-500 m-0 mt-0.5 truncate">
                          <FiMail className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          {row.email || "—"}
                        </p>
                      </div>
                      <div className="p-3 min-w-0 border-l border-gray-100">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                          {formatCurrency(row.balance)}
                        </span>
                      </div>
                      <div className="p-3 border-l border-gray-100">
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                            row.status ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {row.status ? "Active" : "Inactive"}
                        </span>
                      </div>
                      <div className="p-3 border-l border-gray-100 flex justify-end">
                        <EmailActionMenu
                          items={[
                            { label: "View profile", icon: FiUser, onClick: () => openProfile(row) },
                            row.status
                              ? { label: "Deactivate", icon: FiUserX, warning: true, onClick: () => handleToggleStatus(row) }
                              : { label: "Activate", icon: FiUserCheck, onClick: () => handleToggleStatus(row) },
                          ]}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <TablePagination
              showRange
              showRows
              showJump
              showFirstLast
              rowOptions={[10, 20, 50, 100]}
              defaultRows={20}
              page={pagination.page}
              limit={pagination.limit}
              total={pagination.total}
              totalPages={pagination.total_pages}
              isLastPage={pagination.is_last_page}
              onPageChange={(page) => setPagination((prev) => ({ ...prev, page }))}
              onLimitChange={(limit) => setPagination((prev) => ({ ...prev, limit, page: 1 }))}
            />
          </div>
        </div>
      </div>

      <CaCreateModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={() => loadCaList()}
      />

      <AppDialog dialog={dialog} onClose={closeDialog} onConfirm={handleDialogConfirm} />
    </div>
  );
};

export default CAList;
