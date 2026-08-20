import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";
import { motion } from "framer-motion";
import {
  FiArrowLeft,
  FiBriefcase,
  FiLoader,
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

const formatPhone = (row) => {
  if (!row) return "—";
  const code = row.country_code
    ? `+${String(row.country_code).replace(/^\+/, "")}`
    : "";
  const mobile = row.mobile || "";
  if (!mobile) return "—";
  return code ? `${code} ${mobile}` : mobile;
};

const COLUMNS = [
  { id: "client", name: "Client", flex: "1.5" },
  { id: "pan", name: "PAN", flex: "1" },
  { id: "contact", name: "Contact", flex: "1.2" },
  { id: "firms", name: "Firms", flex: "0.7" },
  { id: "deleted", name: "Deleted", flex: "1" },
  { id: "action", name: "Action", flex: "0.9" },
];

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
          throw new Error(
            response.data?.message || "Failed to load deleted clients",
          );
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
          err.response?.data?.message ||
          err.message ||
          "Failed to load deleted clients";
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
    setRestoreModal({
      open: true,
      client,
      loading: false,
      error: null,
    });
  };

  const closeRestoreModal = () => {
    if (restoreModal.loading) return;
    setRestoreModal({
      open: false,
      client: null,
      loading: false,
      error: null,
    });
  };

  const handleRestore = async () => {
    const username = String(restoreModal.client?.username || "").trim();
    if (!username) {
      setRestoreModal((prev) => ({
        ...prev,
        error: "Client username is missing",
      }));
      return;
    }

    const headers = getHeaders();
    if (!headers) {
      setRestoreModal((prev) => ({
        ...prev,
        error: "Please log in again",
      }));
      return;
    }

    setRestoreModal((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const response = await axios.post(
        `${API_BASE_URL}/client/restore`,
        { username },
        { headers },
      );

      if (!response.data?.success) {
        throw new Error(response.data?.message || "Failed to restore client");
      }

      toast.success(response.data?.message || "Client restored successfully");
      setRestoreModal({
        open: false,
        client: null,
        loading: false,
        error: null,
      });
      setClients((prev) => prev.filter((c) => c.username !== username));
      fetchDeletedClients(pagination.page, pagination.limit);
    } catch (err) {
      const apiErrors = err.response?.data?.errors;
      const message =
        (Array.isArray(apiErrors) && apiErrors.length
          ? apiErrors.join(". ")
          : null) ||
        err.response?.data?.message ||
        err.message ||
        "Failed to restore client";
      setRestoreModal((prev) => ({
        ...prev,
        loading: false,
        error: message,
      }));
    }
  };

  const serialBase = (pagination.page - 1) * pagination.limit;
  const restoreName =
    restoreModal.client?.name || restoreModal.client?.username || "this client";

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

      <div
        className={`pt-16 transition-all duration-300 ease-in-out ${
          isMinimized ? "md:pl-20" : "md:pl-[260px]"
        }`}
      >
        <div className="h-full flex flex-col">
          <motion.div
            className="mx-2 my-3 flex h-full flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm sm:mx-4 md:mx-8 md:my-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="border-b border-gray-200 px-3 md:px-4 py-3 bg-gradient-to-r from-gray-50 to-white">
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-2 md:gap-3">
                <div className="w-full md:w-auto flex items-start gap-2.5 min-w-0">
                  <button
                    type="button"
                    onClick={() => navigate("/staff/office-assistance")}
                    className="mt-0.5 w-9 h-9 rounded-lg border border-gray-200 bg-white flex items-center justify-center text-gray-500 hover:text-indigo-600 hover:border-indigo-200 transition-colors shrink-0"
                    aria-label="Back to Office Assistance"
                  >
                    <FiArrowLeft className="w-4 h-4" />
                  </button>
                  <div className="min-w-0">
                    <h5 className="text-base md:text-lg font-bold text-gray-800 mb-0.5">
                      Deleted Clients
                    </h5>
                    <p className="text-gray-500 text-xs">
                      Soft-deleted clients · restore after create-style
                      validation
                    </p>
                  </div>
                </div>

                <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2 w-full lg:w-auto">
                  <div className="flex-1 md:flex-none md:min-w-[200px] lg:min-w-[250px]">
                    <div className="relative">
                      <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        type="text"
                        placeholder="Search deleted clients..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm text-sm bg-white"
                      />
                    </div>
                  </div>

                  <motion.button
                    type="button"
                    onClick={() =>
                      fetchDeletedClients(pagination.page, pagination.limit)
                    }
                    disabled={loading}
                    className="px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all duration-200 text-gray-700 font-medium flex items-center justify-center gap-2 shadow-sm text-sm disabled:opacity-50"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <FiRefreshCw
                      className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
                    />
                    <span className="hidden sm:inline">Refresh</span>
                  </motion.button>
                </div>
              </div>
            </div>

            <div className="flex-1 flex flex-col overflow-hidden min-h-[420px]">
              <div className="hidden md:block border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white sticky top-0 z-10">
                <div className="flex items-center min-w-max bg-white">
                  <div className="w-12 p-3 font-bold text-gray-700 text-xs flex-shrink-0 text-center">
                    #
                  </div>
                  {COLUMNS.map((column) => (
                    <div
                      key={column.id}
                      className="p-3 font-semibold text-gray-700 text-xs flex-1 min-w-0 text-center border-l border-gray-100"
                      style={{ flex: column.flex }}
                    >
                      <div className="truncate">{column.name}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="md:hidden border-b border-gray-200 bg-white px-3 py-2 sticky top-0 z-10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FiTrash2 className="w-4 h-4 text-rose-500" />
                    <span className="font-semibold text-gray-800 text-sm">
                      Deleted Clients
                    </span>
                  </div>
                  <span className="text-xs text-gray-600">
                    {pagination.total} total
                  </span>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto overflow-x-hidden">
                {loading ? (
                  <div className="md:min-w-max">
                    {Array.from({ length: 6 }).map((_, index) => (
                      <div
                        key={index}
                        className="flex items-center border-b border-gray-100 animate-pulse p-3"
                      >
                        <div className="w-12 flex-shrink-0 mr-2">
                          <div className="h-3 bg-gray-200 rounded w-4 mx-auto" />
                        </div>
                        {COLUMNS.map((column) => (
                          <div
                            key={column.id}
                            className="hidden md:block flex-1 p-2"
                            style={{ flex: column.flex }}
                          >
                            <div className="h-3 bg-gray-200 rounded w-3/4 mx-auto" />
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                ) : error ? (
                  <div className="flex items-center justify-center py-12 px-4">
                    <div className="text-center">
                      <p className="text-sm font-medium text-red-600">
                        {error}
                      </p>
                      <button
                        type="button"
                        onClick={() =>
                          fetchDeletedClients(1, pagination.limit)
                        }
                        className="mt-3 text-sm text-indigo-600 hover:underline"
                      >
                        Try again
                      </button>
                    </div>
                  </div>
                ) : clients.length === 0 ? (
                  <div className="flex items-center justify-center py-12 text-gray-500 px-4">
                    <div className="text-center">
                      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <FiUser className="w-6 h-6 text-gray-400" />
                      </div>
                      <p className="text-gray-500 font-medium text-sm">
                        No deleted clients found
                      </p>
                      <p className="text-gray-400 text-xs mt-1">
                        Try adjusting your search
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="md:hidden px-3 py-2 space-y-2">
                      {clients.map((client, index) => (
                        <motion.div
                          key={client.username || client.id}
                          className="bg-white border border-gray-200 rounded-lg p-3"
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                        >
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="font-bold text-gray-800 text-sm w-5 shrink-0">
                                {serialBase + index + 1}
                              </div>
                              <div className="w-7 h-7 bg-gradient-to-br from-rose-500 to-rose-600 rounded-lg flex items-center justify-center shrink-0">
                                <FiUser className="w-3.5 h-3.5 text-white" />
                              </div>
                              <div className="min-w-0">
                                <div className="font-semibold text-gray-800 text-sm truncate">
                                  {client.name || "N/A"}
                                </div>
                                <div className="text-xs text-gray-500 truncate">
                                  {client.guardian_name || "—"}
                                </div>
                                {client.pan_number ? (
                                  <div className="text-xs text-gray-500 font-mono truncate">
                                    PAN: {client.pan_number}
                                  </div>
                                ) : null}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => openRestoreModal(client)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 shrink-0"
                            >
                              <FiRotateCcw className="w-3.5 h-3.5" />
                              Restore
                            </button>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                            <div className="flex items-center gap-1.5 truncate">
                              <FiPhone className="w-3 h-3 text-gray-400 shrink-0" />
                              <span className="truncate">
                                {formatPhone(client)}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 truncate">
                              <FiBriefcase className="w-3 h-3 text-gray-400 shrink-0" />
                              <span>
                                {Array.isArray(client.firms)
                                  ? client.firms.length
                                  : 0}{" "}
                                firms
                              </span>
                            </div>
                            <div className="col-span-2 flex items-center gap-1.5 truncate">
                              <FiMail className="w-3 h-3 text-gray-400 shrink-0" />
                              <span className="truncate">
                                {client.email || "—"}
                              </span>
                            </div>
                            <div className="col-span-2 text-gray-500">
                              Deleted: {client.deleted_date || "—"}
                              {client.deleted_by
                                ? ` · by ${client.deleted_by}`
                                : ""}
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>

                    <div className="hidden md:block md:min-w-max">
                      {clients.map((client, index) => (
                        <motion.div
                          key={client.username || client.id}
                          className="flex items-center border-b border-gray-100 hover:bg-gray-50 transition-colors group bg-white"
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.03 }}
                        >
                          <div className="w-12 p-3 flex-shrink-0 text-center">
                            <span className="font-bold text-gray-800 text-xs">
                              {serialBase + index + 1}
                            </span>
                          </div>

                          <div
                            className="p-3 min-w-0 text-center border-l border-gray-100"
                            style={{ flex: "1.5" }}
                          >
                            <div className="font-semibold text-gray-800 text-sm truncate">
                              {client.name || "—"}
                            </div>
                            <div className="text-xs text-gray-400 truncate mt-0.5">
                              {client.username}
                            </div>
                          </div>

                          <div
                            className="p-3 min-w-0 text-center border-l border-gray-100"
                            style={{ flex: "1" }}
                          >
                            <span className="font-mono text-xs text-gray-700">
                              {client.pan_number || "—"}
                            </span>
                          </div>

                          <div
                            className="p-3 min-w-0 text-center border-l border-gray-100"
                            style={{ flex: "1.2" }}
                          >
                            <div className="text-sm text-gray-700 truncate">
                              {formatPhone(client)}
                            </div>
                            <div className="text-xs text-gray-400 truncate mt-0.5">
                              {client.email || "—"}
                            </div>
                          </div>

                          <div
                            className="p-3 min-w-0 text-center border-l border-gray-100"
                            style={{ flex: "0.7" }}
                          >
                            <span className="text-sm text-gray-700">
                              {Array.isArray(client.firms)
                                ? client.firms.length
                                : 0}
                            </span>
                          </div>

                          <div
                            className="p-3 min-w-0 text-center border-l border-gray-100"
                            style={{ flex: "1" }}
                          >
                            <div className="text-sm text-gray-700">
                              {client.deleted_date || "—"}
                            </div>
                            {client.deleted_by ? (
                              <div className="text-xs text-gray-400 mt-0.5 truncate">
                                by {client.deleted_by}
                              </div>
                            ) : null}
                          </div>

                          <div
                            className="p-3 min-w-0 text-center border-l border-gray-100"
                            style={{ flex: "0.9" }}
                          >
                            <button
                              type="button"
                              onClick={() => openRestoreModal(client)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                            >
                              <FiRotateCcw className="w-3.5 h-3.5" />
                              Restore
                            </button>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            {pagination.total > 0 ? (
              <div className="border-t border-gray-200 px-3 md:px-4 py-2 bg-white">
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
                  onPageChange={(page) =>
                    fetchDeletedClients(page, pagination.limit)
                  }
                  onLimitChange={(limit) => {
                    setPagination((prev) => ({ ...prev, limit, page: 1 }));
                    fetchDeletedClients(1, limit);
                  }}
                />
              </div>
            ) : null}
          </motion.div>
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
