import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";
import {
  FiArrowLeft,
  FiBriefcase,
  FiMail,
  FiPhone,
  FiRefreshCw,
  FiRotateCcw,
  FiSearch,
  FiTrash2,
  FiUser,
} from "react-icons/fi";
import { Header, Sidebar } from "../../components/header";
import TablePagination from "../../components/TablePagination";
import ConfirmActionModal from "../../components/ConfirmActionModal";
import API_BASE_URL from "../../utils/api-controller";
import getHeaders from "../../utils/get-headers";
import useDebouncedValue from "../../hooks/useDebouncedValue";

const contentInset = (isMinimized) => (isMinimized ? "md:pl-20" : "md:pl-[260px]");

const formatPhone = (row) => {
  if (!row) return "—";
  const code = row.country_code ? `+${String(row.country_code).replace(/^\+/, "")}` : "";
  const mobile = row.mobile || "";
  if (!mobile) return "—";
  return code ? `${code} ${mobile}` : mobile;
};

const COLUMNS = ["#", "Client", "PAN", "Contact", "Firms", "Deleted", "Actions"];
const GRID_COLS =
  "grid-cols-[40px_minmax(170px,1.5fr)_minmax(110px,0.9fr)_minmax(160px,1.3fr)_80px_minmax(140px,1fr)_100px]";

const DeletedClients = () => {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(() => {
    const saved = localStorage.getItem("sidebarMinimized");
    return saved ? JSON.parse(saved) : false;
  });

  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebouncedValue(searchTerm, 400);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    total_pages: 1,
    is_last_page: true,
  });

  const [restoreModal, setRestoreModal] = useState({
    open: false,
    client: null,
    loading: false,
    error: null,
  });

  useEffect(() => {
    localStorage.setItem("sidebarMinimized", JSON.stringify(isMinimized));
  }, [isMinimized]);

  const fetchDeletedClients = useCallback(
    async (page = 1, limit = pagination.limit) => {
      const headers = getHeaders();
      if (!headers) {
        toast.error("Please log in again");
        return;
      }

      setLoading(true);
      setError("");
      try {
        const response = await axios.get(`${API_BASE_URL}/client/deleted/list`, {
          headers,
          params: {
            page,
            limit,
            search: debouncedSearch || undefined,
          },
        });

        if (!response.data?.success) {
          throw new Error(response.data?.message || "Failed to load deleted clients");
        }

        setClients(Array.isArray(response.data.data) ? response.data.data : []);
        setPagination({
          page: response.data.pagination?.page || page,
          limit: response.data.pagination?.limit || limit,
          total: response.data.pagination?.total || 0,
          total_pages: response.data.pagination?.total_pages || 1,
          is_last_page: Boolean(response.data.pagination?.is_last_page),
        });
      } catch (err) {
        const message =
          err.response?.data?.message || err.message || "Failed to load deleted clients";
        setError(message);
        setClients([]);
        toast.error(message);
      } finally {
        setLoading(false);
      }
    },
    [debouncedSearch, pagination.limit],
  );

  useEffect(() => {
    fetchDeletedClients(1, pagination.limit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  const openRestoreModal = (client) => {
    setRestoreModal({ open: true, client, loading: false, error: null });
  };

  const closeRestoreModal = () => {
    if (restoreModal.loading) return;
    setRestoreModal({ open: false, client: null, loading: false, error: null });
  };

  const handleRestore = async () => {
    const username = String(restoreModal.client?.username || "").trim();
    if (!username) {
      setRestoreModal((prev) => ({ ...prev, error: "Client username is missing" }));
      return;
    }

    const headers = getHeaders();
    if (!headers) {
      setRestoreModal((prev) => ({ ...prev, error: "Please log in again" }));
      return;
    }

    setRestoreModal((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const response = await axios.post(`${API_BASE_URL}/client/restore`, { username }, { headers });

      if (!response.data?.success) {
        throw new Error(response.data?.message || "Failed to restore client");
      }

      toast.success(response.data?.message || "Client restored successfully");
      setRestoreModal({ open: false, client: null, loading: false, error: null });
      setClients((prev) => prev.filter((c) => c.username !== username));
      fetchDeletedClients(pagination.page, pagination.limit);
    } catch (err) {
      const apiErrors = err.response?.data?.errors;
      const message =
        (Array.isArray(apiErrors) && apiErrors.length ? apiErrors.join(". ") : null) ||
        err.response?.data?.message ||
        err.message ||
        "Failed to restore client";
      setRestoreModal((prev) => ({ ...prev, loading: false, error: message }));
    }
  };

  const restoreName =
    restoreModal.client?.name || restoreModal.client?.username || "this client";

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
                  <button
                    type="button"
                    onClick={() => navigate("/staff/office-assistance")}
                    className="w-9 h-9 rounded-lg border border-gray-200 bg-white flex items-center justify-center text-gray-500 hover:text-indigo-600 hover:border-indigo-200 shrink-0"
                    aria-label="Back to Office Assistance"
                  >
                    <FiArrowLeft className="w-4 h-4" />
                  </button>
                  <div className="p-1.5 bg-rose-50 rounded-lg shrink-0">
                    <FiTrash2 className="w-4 h-4 text-rose-600" />
                  </div>
                  <div className="min-w-0">
                    <h1 className="text-base md:text-lg font-bold text-gray-800 m-0">Deleted Clients</h1>
                    <p className="text-xs text-gray-500 m-0">Restore after create-style validation</p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full lg:w-auto">
                  <div className="relative min-w-0 sm:w-56">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search deleted clients…"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => fetchDeletedClients(pagination.page, pagination.limit)}
                    disabled={loading}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 shrink-0"
                  >
                    <FiRefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                    Refresh
                  </button>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <div className="min-w-[920px]">
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
                ) : error ? (
                  <div className="flex flex-col items-center justify-center py-12 px-4">
                    <p className="text-sm font-medium text-red-600 m-0">{error}</p>
                    <button
                      type="button"
                      onClick={() => fetchDeletedClients(1, pagination.limit)}
                      className="mt-3 text-sm font-medium text-indigo-600 hover:underline"
                    >
                      Try again
                    </button>
                  </div>
                ) : clients.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-gray-500 px-4">
                    <div className="w-14 h-14 bg-gray-100 rounded-full mb-3 flex items-center justify-center">
                      <FiUser className="w-6 h-6 text-gray-400" />
                    </div>
                    <p className="text-sm font-medium text-gray-500 m-0">No deleted clients found</p>
                    <p className="text-xs text-gray-400 mt-1 mb-0">Try adjusting your search</p>
                  </div>
                ) : (
                  clients.map((client, index) => (
                    <div
                      key={client.username || client.id}
                      className={`grid ${GRID_COLS} items-center border-b border-gray-100 bg-white hover:bg-gray-50`}
                    >
                      <div className="p-3 text-[11px] font-bold text-gray-800">
                        {(pagination.page - 1) * pagination.limit + index + 1}
                      </div>
                      <div className="p-3 min-w-0 border-l border-gray-100">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 bg-gradient-to-br from-rose-500 to-rose-600 rounded-lg shadow-sm flex items-center justify-center shrink-0">
                            <FiUser className="w-3.5 h-3.5 text-white" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-800 text-sm m-0 truncate">
                              {client.name || "—"}
                            </p>
                            <p className="text-xs text-gray-500 m-0 truncate">{client.username || "—"}</p>
                          </div>
                        </div>
                      </div>
                      <div className="p-3 min-w-0 border-l border-gray-100">
                        <p className="text-sm font-medium text-gray-700 font-mono m-0 truncate">
                          {client.pan_number || "—"}
                        </p>
                      </div>
                      <div className="p-3 min-w-0 border-l border-gray-100">
                        <p className="flex items-center gap-1.5 text-sm font-medium text-gray-700 m-0">
                          <FiPhone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          {formatPhone(client)}
                        </p>
                        <p className="flex items-center gap-1.5 text-xs text-gray-500 m-0 mt-0.5 truncate">
                          <FiMail className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          {client.email || "—"}
                        </p>
                      </div>
                      <div className="p-3 min-w-0 border-l border-gray-100">
                        <span className="inline-flex items-center gap-1 text-sm font-medium text-gray-700">
                          <FiBriefcase className="w-3.5 h-3.5 text-gray-400" />
                          {Array.isArray(client.firms) ? client.firms.length : 0}
                        </span>
                      </div>
                      <div className="p-3 min-w-0 border-l border-gray-100">
                        <p className="text-sm font-medium text-gray-700 m-0">{client.deleted_date || "—"}</p>
                        {client.deleted_by ? (
                          <p className="text-xs text-gray-500 m-0 truncate">by {client.deleted_by}</p>
                        ) : null}
                      </div>
                      <div className="p-3 border-l border-gray-100 flex justify-end">
                        <button
                          type="button"
                          onClick={() => openRestoreModal(client)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
                        >
                          <FiRotateCcw className="w-3.5 h-3.5" />
                          Restore
                        </button>
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
              page={pagination.page}
              limit={pagination.limit}
              total={pagination.total}
              totalPages={pagination.total_pages}
              isLastPage={pagination.is_last_page}
              onPageChange={(page) => fetchDeletedClients(page, pagination.limit)}
              onLimitChange={(limit) => {
                setPagination((prev) => ({ ...prev, limit, page: 1 }));
                fetchDeletedClients(1, limit);
              }}
            />
          </div>
        </div>
      </div>

      <ConfirmActionModal
        isOpen={restoreModal.open}
        title="Restore Client"
        heading={`Restore ${restoreName}?`}
        message={
          restoreModal.error
            ? restoreModal.error
            : "This will re-activate the client after the same checks used when creating a client (PAN uniqueness, required profile, address, and firm details)."
        }
        confirmLabel="Restore"
        cancelLabel="Cancel"
        loading={restoreModal.loading}
        tone={restoreModal.error ? "warning" : "primary"}
        icon={FiRotateCcw}
        onCancel={closeRestoreModal}
        onConfirm={handleRestore}
      />
    </div>
  );
};

export default DeletedClients;
