import React, { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
// Force rebuild cache
import { Sidebar, Header } from "../components/header";
import { useNavigate } from "react-router-dom";
import {
  FiUsers,
  FiDollarSign,
  FiUserCheck,
  FiUserPlus,
  FiFileText,
  FiPlus,
  FiLock,
  FiSearch,
  FiX,
  FiUser,
  FiLoader,
  FiCheckCircle,
  FiTrash2,
  FiClock,
  FiMoreVertical,
  FiEdit,
  FiEye,
  FiSettings,
  FiGrid,
  FiMail,
  FiPhone,
  FiTrendingUp,
  FiTrendingDown,
  FiMessageSquare,
  FiPrinter,
  FiFilter,
  FiMoreHorizontal,
  FiArrowRight,
  FiArrowLeft,
  FiCalendar,
  FiBriefcase,
  FiMove,
  FiSave,
  FiList,
  FiRefreshCw,
  FiExternalLink,
  FiAlertCircle,
  FiCheckSquare,
  FiFile,
  FiArchive,
  FiBell,
} from "react-icons/fi";
import { PiExportBold } from "react-icons/pi";
import { PiFilePdfDuotone, PiMicrosoftExcelLogoDuotone } from "react-icons/pi";
import { AiOutlineMail } from "react-icons/ai";
import { FaFileCsv } from "react-icons/fa";
import DeleteConfirmationModal from "../components/delete-confirmation";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import API_BASE_URL from "../utils/api-controller";
import getHeaders from "../utils/get-headers";
import TablePagination from "../components/TablePagination";
import ExportModal from "../ClientComponents/ExportModal";
import toast from "react-hot-toast";
import { useUserPermissions } from "../utils/permission-helper";
import ClientPaymentReminderModal from "../components/Modals/ClientPaymentReminderModal";
import FirmsDetailsModal from "../components/Modals/FirmsDetailsModal";

// Import DnD Kit
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const AnimatedCheckbox = ({
  checked,
  indeterminate = false,
  onChange,
  ariaLabel,
  disabled = false,
}) => {
  const inputRef = useRef(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.indeterminate = indeterminate;
    }
  }, [indeterminate, checked]);

  const isActive = checked || indeterminate;

  return (
    <label
      className={`relative inline-flex items-center group ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
    >
      <input
        ref={inputRef}
        type="checkbox"
        className="sr-only"
        checked={checked}
        onChange={onChange}
        aria-label={ariaLabel}
        disabled={disabled}
      />
      <motion.span
        className={`flex h-[18px] w-[18px] items-center justify-center rounded-[4px] border-2 transition-colors duration-200 ${
          isActive
            ? "border-indigo-600 bg-indigo-600 shadow-sm shadow-indigo-200"
            : "border-gray-300 bg-white group-hover:border-indigo-400"
        }`}
        animate={{ scale: isActive ? [1, 1.12, 1] : 1 }}
        transition={{ duration: 0.18 }}
        whileTap={disabled ? {} : { scale: 0.92 }}
      >
        <AnimatePresence initial={false} mode="wait">
          {indeterminate ? (
            <motion.span
              key="dash"
              className="block h-0.5 w-2 rounded-full bg-white"
              initial={{ opacity: 0, scaleX: 0.4 }}
              animate={{ opacity: 1, scaleX: 1 }}
              exit={{ opacity: 0, scaleX: 0.4 }}
              transition={{ duration: 0.12 }}
            />
          ) : checked ? (
            <motion.svg
              key="check"
              viewBox="0 0 12 12"
              className="h-3 w-3 text-white"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              transition={{ duration: 0.15 }}
            >
              <path
                d="M2.5 6l2.2 2.2 4.8-4.8"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </motion.svg>
          ) : null}
        </AnimatePresence>
      </motion.span>
    </label>
  );
};

const ClientActionMenuItems = ({
  client,
  onClose,
  navigate,
  check,
  onDelete,
}) => {
  const username = client?.username;
  const go = (tab) => {
    onClose?.();
    if (!username) return;
    navigate(
      tab
        ? `/client/profile/${encodeURIComponent(username)}/${tab}`
        : `/client/profile/${encodeURIComponent(username)}`,
    );
  };

  const itemClass =
    "flex w-full items-center px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50";

  return (
    <div className="py-1">
      <button type="button" onClick={() => go()} className={itemClass}>
        <FiEye className="mr-3 h-4 w-4 text-blue-600" />
        View Details
      </button>
      <button type="button" onClick={() => go("task")} className={itemClass}>
        <FiCheckSquare className="mr-3 h-4 w-4 text-indigo-600" />
        Tasks
      </button>
      <button type="button" onClick={() => go("billing")} className={itemClass}>
        <FiFileText className="mr-3 h-4 w-4 text-emerald-600" />
        Billing
      </button>
      <button type="button" onClick={() => go("notes")} className={itemClass}>
        <FiFile className="mr-3 h-4 w-4 text-amber-600" />
        Notes
      </button>
      <button
        type="button"
        onClick={() => go("documents")}
        className={itemClass}
      >
        <FiArchive className="mr-3 h-4 w-4 text-violet-600" />
        Documents
      </button>

      <div className="my-1 border-t border-gray-100" />

      <button
        type="button"
        onClick={() => {
          onClose?.();
        }}
        className={itemClass}
      >
        <FiMessageSquare className="mr-3 h-4 w-4 text-purple-600" />
        Send Message
      </button>

      <div className="my-1 border-t border-gray-100" />

      {check("client_delete") ? (
        <button
          type="button"
          onClick={() => {
            onClose?.();
            onDelete?.();
          }}
          className="flex w-full items-center px-4 py-2 text-sm text-red-600 transition-colors hover:bg-red-50"
        >
          <FiTrash2 className="mr-3 h-4 w-4" />
          Delete Client
        </button>
      ) : (
        <button
          type="button"
          disabled
          className="flex w-full cursor-not-allowed items-center bg-gray-50 px-4 py-2 text-sm text-gray-400 opacity-60"
        >
          <FiLock className="mr-3 h-4 w-4 text-gray-400" />
          Delete Client
        </button>
      )}
    </div>
  );
};

// Status Change Modal Component (keep your existing code)
const StatusChangeModal = ({
  isOpen,
  onClose,
  clientId,
  currentStatus,
  onStatusChange,
  statusOptions,
}) => {
  const [selectedStatus, setSelectedStatus] = useState(currentStatus);

  if (!isOpen) return null;

  const getStatusColor = (status) => {
    switch (status) {
      case "ACTIVE":
        return "bg-green-100 text-green-700 border-green-300";
      case "INACTIVE":
        return "bg-red-100 text-red-700 border-red-300";
      case "PENDING":
        return "bg-yellow-100 text-yellow-700 border-yellow-300";
      default:
        return "bg-gray-100 text-gray-700 border-gray-300";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "ACTIVE":
        return <FiCheckCircle className="w-4 h-4" />;
      case "INACTIVE":
        return <FiX className="w-4 h-4" />;
      case "PENDING":
        return <FiClock className="w-4 h-4" />;
      default:
        return <FiClock className="w-4 h-4" />;
    }
  };

  const handleConfirm = () => {
    onStatusChange(clientId, selectedStatus);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="bg-white rounded-xl shadow-2xl w-full max-w-sm mx-auto overflow-hidden"
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                    <FiCheckCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold">Change Status</h3>
                    <p className="text-blue-100 text-xs">
                      Update client status
                    </p>
                  </div>
                </div>
                <motion.button
                  onClick={onClose}
                  className="text-white hover:text-blue-200 transition-colors p-1 rounded-lg hover:bg-white/10"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <FiX className="w-4 h-4" />
                </motion.button>
              </div>
            </div>

            <div className="p-4 border-b border-gray-200">
              <div className="mb-3">
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Current Status
                </label>
                <div
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border ${getStatusColor(currentStatus)}`}
                >
                  {getStatusIcon(currentStatus)}
                  <span className="font-medium text-sm">
                    {statusOptions.find((s) => s.value === currentStatus)
                      ?.name || currentStatus}
                  </span>
                </div>
              </div>

              <div className="mb-2">
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Select New Status
                </label>
                <div className="space-y-1.5">
                  {statusOptions.map((status) => (
                    <motion.button
                      key={status.value}
                      onClick={() => setSelectedStatus(status.value)}
                      className={`w-full flex items-center justify-between p-2.5 rounded-lg border transition-all ${selectedStatus === status.value ? "ring-1 ring-blue-500 ring-offset-1 " : ""} ${getStatusColor(status.value)}`}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                    >
                      <div className="flex items-center gap-2">
                        {getStatusIcon(status.value)}
                        <span className="font-medium text-sm">
                          {status.name}
                        </span>
                      </div>
                      {selectedStatus === status.value && (
                        <FiCheckCircle className="w-4 h-4" />
                      )}
                    </motion.button>
                  ))}
                </div>
              </div>
            </div>

            <div className="px-4 py-3 bg-gray-50 flex justify-end gap-2">
              <motion.button
                onClick={onClose}
                className="px-3 py-1.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 font-medium text-sm"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Cancel
              </motion.button>
              <motion.button
                onClick={handleConfirm}
                className="px-3 py-1.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 font-medium text-sm"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Update
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// View Mode Toggle Component (keep your existing code)
const TableViewSwitch = ({ viewMode, setViewMode }) => {
  return (
    <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
      <motion.button
        onClick={() => setViewMode("table")}
        className={`flex items-center gap-2 px-3 py-2 rounded-md transition-all ${viewMode === "table" ? "bg-white shadow-sm text-blue-600" : "text-gray-600 hover:text-gray-800"}`}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <FiList className="w-4 h-4" />
        <span className="text-xs font-medium hidden sm:inline">Table</span>
      </motion.button>

      <motion.button
        onClick={() => setViewMode("card")}
        className={`flex items-center gap-2 px-3 py-2 rounded-md transition-all ${viewMode === "card" ? "bg-white shadow-sm text-blue-600" : "text-gray-600 hover:text-gray-800"}`}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <FiGrid className="w-4 h-4" />
        <span className="text-xs font-medium hidden sm:inline">Cards</span>
      </motion.button>
    </div>
  );
};

// Shared fetch error state for client list
const ClientFetchError = ({ message, onRetry }) => (
  <div className="flex items-center justify-center py-12 px-4">
    <div className="text-center max-w-md">
      <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
        <FiAlertCircle className="w-7 h-7 text-red-500" />
      </div>
      <p className="text-gray-800 font-semibold text-sm mb-1">
        Unable to load clients
      </p>
      <p className="text-gray-500 text-xs mb-4">{message}</p>
      {onRetry && (
        <motion.button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
        >
          <FiRefreshCw className="w-4 h-4" />
          Try again
        </motion.button>
      )}
    </div>
  </div>
);

const getFetchErrorMessage = (error) => {
  if (
    error?.code === "ECONNABORTED" ||
    String(error?.message || "")
      .toLowerCase()
      .includes("timeout")
  ) {
    return "Request timed out. Please check your connection and try again.";
  }
  if (!error?.response) {
    return "Unable to reach the server. Please check your network connection or try again later.";
  }
  return (
    error.response?.data?.message ||
    `Server error (${error.response.status}). Please try again later.`
  );
};

// Client Table Component (keep your existing code but remove the actions dropdown payment reminder - we'll add it in the main component)
const ClientTable = ({
  clients,
  selectedClients,
  handleClientSelect,
  selectAll,
  handleSelectAll,
  columnConfig,
  renderCellContent,
  loading,
  fetchError,
  onRetryFetch,
  toggleRowDropdown,
  activeRowDropdown,
  setActiveRowDropdown,
  handleStatusChange,
  openStatusModal,
  navigate,
  handleExport,
  showFirmsModal,
  openClientPaymentReminderModal,
  onDeleteClient,
}) => {
  const { check } = useUserPermissions();
  const SkeletonRow = () => (
    <div className="flex items-center border-b border-gray-100 animate-pulse p-3">
      <div className="w-8 md:w-10 flex-shrink-0 mr-2">
        <div className="h-4 bg-gray-200 rounded w-4"></div>
      </div>
      <div className="w-8 flex-shrink-0 mr-3">
        <div className="h-4 bg-gray-200 rounded w-4"></div>
      </div>
      {columnConfig.map((column, index) => (
        <div key={index} className="hidden md:block flex-1 p-2">
          <div className="space-y-1">
            {column.items &&
              column.items.map((item, itemIndex) => (
                <div
                  key={itemIndex}
                  className="min-h-[1.25rem] flex items-center justify-center"
                >
                  <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                </div>
              ))}
          </div>
        </div>
      ))}
    </div>
  );

  const MobileClientCard = ({
    client,
    index,
    handleExport,
    showFirmsModal,
  }) => {
    const getLastUpdatedFirm = () => {
      if (!client.firms || client.firms.length === 0) return null;

      const sortedFirms = [...client.firms].sort((a, b) => {
        const dateA = a.modify_date || a.create_date;
        const dateB = b.modify_date || b.create_date;
        return new Date(dateB) - new Date(dateA);
      });

      return sortedFirms[0];
    };

    const lastFirm = getLastUpdatedFirm();

    return (
      <motion.div
        className="bg-white border border-gray-200 rounded-lg p-3 mb-2 md:hidden"
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <AnimatedCheckbox
              checked={selectedClients.has(client._id)}
              onChange={() => handleClientSelect(client._id)}
              ariaLabel={`Select ${client.name || "client"}`}
            />
            <div className="font-bold text-gray-800 text-sm w-4">
              {index + 1}
            </div>
            <div className="w-7 h-7 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
              <FiUser className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-gray-800 text-sm truncate">
                {client.name || "N/A"}
              </div>
              <div className="text-xs text-gray-500 truncate leading-tight">
                {client.guardian_name || "N/A"}
              </div>
              {client.pan_number ? (
                <div className="text-xs text-gray-500 font-mono truncate leading-tight">
                  PAN: {client.pan_number}
                </div>
              ) : null}
            </div>
          </div>
          <div className="relative dropdown-container">
            <motion.button
              onClick={(e) => {
                e.stopPropagation();
                toggleRowDropdown(client._id, e);
              }}
              className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              <div className="flex flex-col items-center justify-center space-y-0.5">
                <div className="w-1 h-1 rounded-full bg-gray-600"></div>
                <div className="w-1 h-1 rounded-full bg-gray-600"></div>
                <div className="w-1 h-1 rounded-full bg-gray-600"></div>
              </div>
            </motion.button>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-gray-700 text-sm">
              <FiPhone className="w-3 h-3 text-gray-400" />
              <span>{client.mobile || "N/A"}</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() =>
                  navigate(
                    `/client/profile/${encodeURIComponent(client.username)}/ledger`,
                  )
                }
                className={`text-sm font-semibold ${client.balance < 0 ? "text-red-600" : "text-green-600"}`}
                title="View ledger"
              >
                {check("task_fees_view") ? (
                  `${Number(client.balance || 0) < 0 ? "-" : ""}₹${Math.abs(client.balance || 0).toLocaleString()}`
                ) : (
                  <span className="blur-[3.5px] select-none">₹99,999</span>
                )}
              </button>
              {Number(client.balance) > 0 && (
                <button
                  type="button"
                  onClick={() => openClientPaymentReminderModal(client)}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white shadow-sm shadow-violet-200 transition hover:brightness-110"
                  title="Send payment reminder"
                  aria-label={`Send payment reminder to ${client.name || client.username}`}
                >
                  <FiBell className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 text-gray-700 text-sm">
            <FiUsers className="w-3 h-3 text-gray-400" />
            <span>{client.firms?.length || 0} firms</span>
          </div>

          {lastFirm && (
            <div className="text-xs text-gray-700 bg-gray-50 rounded p-2 border border-gray-200">
              <div className="font-semibold mb-1">Latest Firm:</div>
              <div>{lastFirm.firm_name || "N/A"}</div>
            </div>
          )}
        </div>
      </motion.div>
    );
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="hidden md:block border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white sticky top-0 z-10">
        <div className="flex items-center min-w-max bg-white">
          <div className="w-12 p-3 flex-shrink-0 flex justify-center">
            <AnimatedCheckbox
              checked={selectAll}
              indeterminate={
                selectedClients.size > 0 &&
                selectedClients.size < clients.length
              }
              onChange={handleSelectAll}
              ariaLabel="Select all clients"
            />
          </div>

          <div className="w-12 p-3 font-bold text-gray-700 text-xs flex-shrink-0 text-center border-l border-gray-100">
            #
          </div>

          {columnConfig.map((column) => (
            <div
              key={column.id}
              className="p-3 font-semibold text-gray-700 text-xs flex-1 min-w-0 text-center border-l border-gray-100"
              style={{
                flex:
                  column.id === "1"
                    ? "1.5"
                    : column.id === "3"
                      ? "1.2"
                      : column.id === "5"
                        ? "0.8"
                        : column.id === "6"
                          ? "0.8"
                          : "1",
              }}
            >
              <div className="truncate">{column.name}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="md:hidden border-b border-gray-200 bg-white px-3 py-2 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AnimatedCheckbox
              checked={selectAll}
              indeterminate={
                selectedClients.size > 0 &&
                selectedClients.size < clients.length
              }
              onChange={handleSelectAll}
              ariaLabel="Select all clients"
            />
            <span className="font-semibold text-gray-800 text-sm">Clients</span>
          </div>
          <span className="text-xs text-gray-600">
            {clients.length} clients
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        {loading ? (
          <div className="md:min-w-max">
            {Array.from({ length: 6 }).map((_, index) => (
              <SkeletonRow key={index} />
            ))}
          </div>
        ) : fetchError ? (
          <ClientFetchError message={fetchError} onRetry={onRetryFetch} />
        ) : clients.length === 0 ? (
          <div className="flex items-center justify-center py-8 text-gray-500 px-4">
            <div className="text-center">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <FiUser className="w-6 h-6 text-gray-400" />
              </div>
              <p className="text-gray-500 font-medium text-sm">
                No clients found
              </p>
              <p className="text-gray-400 text-xs mt-1">
                Try adjusting your search or filters
              </p>
            </div>
          </div>
        ) : (
          <div className="md:min-w-max">
            <div className="md:hidden px-3 py-1">
              {clients.map((client, index) => (
                <MobileClientCard
                  key={client._id}
                  client={client}
                  index={index}
                  handleExport={handleExport}
                  showFirmsModal={showFirmsModal}
                />
              ))}
            </div>

            <div className="hidden md:block">
              {clients.map((client, index) => (
                <motion.div
                  key={client._id}
                  className="flex items-center border-b border-gray-100 hover:bg-gray-50 transition-colors group bg-white"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                >
                  <div className="w-12 p-3 flex-shrink-0 flex justify-center">
                    <AnimatedCheckbox
                      checked={selectedClients.has(client._id)}
                      onChange={() => handleClientSelect(client._id)}
                      ariaLabel={`Select ${client.name || "client"}`}
                    />
                  </div>

                  <div className="w-12 p-3 flex-shrink-0 text-center border-l border-gray-100">
                    <span className="font-bold text-gray-800 text-xs">
                      {index + 1}
                    </span>
                  </div>

                  {columnConfig.map((column) => (
                    <div
                      key={column.id}
                      className="p-3 min-w-0 text-center border-l border-gray-100"
                      style={{
                        flex:
                          column.id === "1"
                            ? "1.5"
                            : column.id === "3"
                              ? "1.2"
                              : column.id === "5"
                                ? "0.8"
                                : column.id === "6"
                                  ? "0.8"
                                  : "1",
                      }}
                    >
                      <div className="flex items-center justify-center">
                        {renderCellContent(
                          client,
                          column.items && column.items[0]
                            ? column.items[0].id
                            : "name",
                          openStatusModal,
                          showFirmsModal,
                          openClientPaymentReminderModal,
                        )}
                      </div>
                    </div>
                  ))}
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Client Cards Component (keep your existing code)
const ClientCards = ({
  clients,
  selectedClients,
  handleClientSelect,
  columnConfig,
  renderCellContent,
  loading,
  fetchError,
  onRetryFetch,
  toggleRowDropdown,
  activeRowDropdown,
  setActiveRowDropdown,
  handleStatusChange,
  statusOptions,
  openStatusModal,
  navigate,
  handleExport,
  showFirmsModal,
  openClientPaymentReminderModal,
  onDeleteClient,
}) => {
  const { check } = useUserPermissions();
  const getStatusColor = (status) => {
    switch (status) {
      case "ACTIVE":
        return "bg-green-100 text-green-700";
      case "INACTIVE":
        return "bg-red-100 text-red-700";
      case "PENDING":
        return "bg-yellow-100 text-yellow-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const formatBalance = (balance) => {
    if (!check("task_fees_view")) {
      return <span className="blur-[3.5px] select-none">₹99,999</span>;
    }
    const amount = Number(balance || 0);
    return `${amount < 0 ? "-" : ""}₹${Math.abs(amount).toLocaleString()}`;
  };

  const getLastUpdatedFirm = (firms) => {
    if (!firms || firms.length === 0) return null;

    const sortedFirms = [...firms].sort((a, b) => {
      const dateA = a.modify_date || a.create_date;
      const dateB = b.modify_date || b.create_date;
      return new Date(dateB) - new Date(dateA);
    });

    return sortedFirms[0];
  };

  const SkeletonCard = () => (
    <div className="bg-white rounded-lg border border-gray-200 p-4 animate-pulse">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="h-3 bg-gray-200 rounded w-24 mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-20"></div>
        </div>
        <div className="h-5 bg-gray-200 rounded w-16"></div>
      </div>
      <div className="space-y-2">
        <div className="h-3 bg-gray-200 rounded w-full"></div>
        <div className="h-3 bg-gray-200 rounded w-3/4"></div>
        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
      </div>
    </div>
  );

  return (
    <div className="p-3 md:p-4">
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <SkeletonCard key={index} />
          ))}
        </div>
      ) : fetchError ? (
        <ClientFetchError message={fetchError} onRetry={onRetryFetch} />
      ) : clients.length === 0 ? (
        <div className="flex items-center justify-center py-8 text-gray-500 px-4">
          <div className="text-center">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <FiUser className="w-6 h-6 text-gray-400" />
            </div>
            <p className="text-gray-500 font-medium text-sm">
              No clients found
            </p>
            <p className="text-gray-400 text-xs mt-1">
              Try adjusting your search or filters
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {clients.map((client, index) => {
            const lastFirm = getLastUpdatedFirm(client.firms);

            return (
              <motion.div
                key={client._id}
                className={`bg-white rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all duration-200 overflow-hidden ${selectedClients.has(client._id) ? "ring-2 ring-blue-500" : ""}`}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
              >
                <div className="p-3 border-b border-gray-100">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <AnimatedCheckbox
                          checked={selectedClients.has(client._id)}
                          onChange={() => handleClientSelect(client._id)}
                          ariaLabel={`Select ${client.name || "client"}`}
                        />
                        <div className="font-bold text-gray-800 text-xs w-4">
                          {index + 1}
                        </div>
                        <div className="w-7 h-7 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-sm flex-shrink-0">
                          <FiUser className="w-3.5 h-3.5 text-white" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-semibold text-gray-800 text-xs truncate">
                            {client.name || "N/A"}
                          </h3>
                        </div>
                      </div>
                      <h4 className="font-bold text-gray-800 text-sm truncate leading-tight">
                        {client.guardian_name || "N/A"}
                      </h4>
                      {client.pan_number ? (
                        <p className="text-xs text-gray-500 font-mono truncate leading-tight">
                          PAN: {client.pan_number}
                        </p>
                      ) : null}
                      <p className="text-gray-600 text-xs truncate">
                        {client.firms?.length || 0} firms
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <div className="relative dropdown-container">
                        <motion.button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleRowDropdown(client._id, e);
                          }}
                          className="w-6 h-6 flex flex-col items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors space-y-0.5"
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <div className="w-1 h-1 rounded-full bg-gray-600"></div>
                          <div className="w-1 h-1 rounded-full bg-gray-600"></div>
                          <div className="w-1 h-1 rounded-full bg-gray-600"></div>
                        </motion.button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-3">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 text-gray-700 text-xs">
                        <FiPhone className="w-3 h-3 text-gray-400" />
                        <span>{client.mobile || "N/A"}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() =>
                            navigate(
                              `/client/profile/${encodeURIComponent(client.username)}/ledger`,
                            )
                          }
                          className={`text-xs font-semibold ${(client.balance || 0) < 0 ? "text-red-600" : "text-green-600"}`}
                          title="View ledger"
                        >
                          {formatBalance(client.balance)}
                        </button>
                        {Number(client.balance) > 0 && (
                          <button
                            type="button"
                            onClick={() =>
                              openClientPaymentReminderModal(client)
                            }
                            className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white shadow-sm shadow-violet-200 transition hover:brightness-110"
                            title="Send payment reminder"
                            aria-label={`Send payment reminder to ${client.name || client.username}`}
                          >
                            <FiBell className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="text-xs text-gray-700">
                      <div className="font-medium mb-1">
                        Firms ({client.firms?.length || 0}):
                      </div>
                      {lastFirm && (
                        <div
                          className="text-xs bg-gray-50 rounded p-1 border border-gray-200 mb-1 cursor-pointer hover:bg-gray-100 transition-colors"
                          onClick={() =>
                            showFirmsModal(client.firms, client.name)
                          }
                        >
                          <div className="font-semibold">
                            {lastFirm.firm_name || "N/A"}
                          </div>
                        </div>
                      )}

                      {client.firms && client.firms.length > 1 && (
                        <div
                          className="text-blue-600 font-medium text-xs mt-1 cursor-pointer hover:text-blue-700 transition-colors"
                          onClick={() =>
                            showFirmsModal(client.firms, client.name)
                          }
                        >
                          +{client.firms.length - 1} more firm
                          {client.firms.length - 1 > 1 ? "s" : ""}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// Main ViewClients Component
const ViewClients = () => {
  const { check } = useUserPermissions();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(() => {
    const saved = localStorage.getItem("sidebarMinimized");
    return saved ? JSON.parse(saved) : false;
  });
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [selectedGroup, setSelectedGroup] = useState("");
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [columnConfig, setColumnConfig] = useState([]);
  const [selectedClients, setSelectedClients] = useState(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [selectAllAcrossPages, setSelectAllAcrossPages] = useState(false);
  const [activeRowDropdown, setActiveRowDropdown] = useState(null);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [exportModal, setExportModal] = useState({
    open: false,
    type: "",
    data: null,
  });
  const navigate = useNavigate();
  const [deleteModal, SetDeleteModal] = useState(false);
  const [deleteOtp, SetDeleteOtp] = useState("");
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [activeDragId, setActiveDragId] = useState(null);
  const [activeItemDragId, setActiveItemDragId] = useState(null);
  const [viewMode, setViewMode] = useState("table");
  const [isMobile, setIsMobile] = useState(false);
  const [statusModal, setStatusModal] = useState({
    open: false,
    clientId: null,
    currentStatus: "",
  });
  const [firmsModal, setFirmsModal] = useState({
    open: false,
    firms: [],
    clientName: "",
  });

  const [clientPaymentReminder, setClientPaymentReminder] = useState({
    open: false,
    clients: [],
    isAll: false,
  });

  // Export Modal State
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportData, setExportData] = useState([]);
  const [exportColumns, setExportColumns] = useState([]);

  // Pagination state based on API structure
  const [clients, setClients] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    total_pages: 1,
    is_last_page: true,
  });
  const [dropdownPos, setDropdownPos] = useState({
    top: undefined,
    bottom: undefined,
    right: 0,
    openUpward: false,
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  useEffect(() => {
    if (selectAllAcrossPages) {
      setSelectAll(true);
      return;
    }
    setSelectAll(
      clients.length > 0 &&
        clients.every((client) => selectedClients.has(client._id)),
    );
  }, [clients, selectedClients, selectAllAcrossPages]);

  // Fetch clients with API pagination
  const fetchClients = useCallback(
    async (page = 1, limit = 20) => {
      const headers = getHeaders();
      if (!headers) {
        setFetchError(
          "Authentication headers are missing. Please sign in again.",
        );
        setClients([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setFetchError(null);

        const params = new URLSearchParams({
          search: searchQuery,
          page: page.toString(),
          limit: limit.toString(),
          ...(selectedStatus && { status: selectedStatus }),
          ...(selectedGroup && { group: selectedGroup }),
        });

        const response = await axios.get(
          `${API_BASE_URL}/client/list?${params}`,
          {
            headers: headers,
            timeout: 10000,
          },
        );

        if (response.data) {
          let clientsData = [];
          let paginationData = {
            page: 1,
            limit: limit,
            total: 0,
            total_pages: 1,
            is_last_page: true,
          };

          if (response.data.pagination && Array.isArray(response.data.data)) {
            clientsData = response.data.data;
            paginationData = response.data.pagination;
          } else if (
            response.data.data &&
            response.data.data.pagination &&
            Array.isArray(response.data.data.clients)
          ) {
            clientsData = response.data.data.clients;
            paginationData = response.data.data.pagination;
          } else if (Array.isArray(response.data)) {
            clientsData = response.data;
            paginationData = {
              page: 1,
              limit: limit,
              total: response.data.length,
              total_pages: Math.ceil(response.data.length / limit),
              is_last_page: true,
            };
          }

          const transformedClients = clientsData.map((client, index) => {
            return {
              _id:
                client.profile_id ||
                client._id ||
                client.id ||
                `temp-${index}-${Date.now()}`,
              id:
                client.profile_id ||
                client._id ||
                client.id ||
                `temp-${index}-${Date.now()}`,
              username:
                client.username ||
                client.email ||
                client.user_name ||
                `user${index + 1}`,
              name:
                client.name ||
                client.full_name ||
                client.client_name ||
                `Client ${index + 1}`,
              guardian_name:
                client.guardian_name ||
                client.father_name ||
                client.guardian ||
                "N/A",
              pan_number:
                client.pan_number || client.pan || client.pan_no || "",
              mobile:
                client.mobile || client.phone || client.contact_number || "N/A",
              status:
                client.status === "1" ||
                client.status === "ACTIVE" ||
                client.active
                  ? "ACTIVE"
                  : "INACTIVE",
              balance:
                parseFloat(client.balance) ||
                parseFloat(client.outstanding) ||
                0,
              firms: client.firms || [],
              firm_count: client.firms ? client.firms.length : 0,
            };
          });

          setClients(transformedClients);
          setPagination(paginationData);
          setFetchError(null);
        } else {
          setClients([]);
          setFetchError("Invalid response from server. Please try again.");
        }
      } catch (error) {
        console.error("Error fetching clients:", error);
        setClients([]);
        setPagination({
          page: 1,
          limit,
          total: 0,
          total_pages: 1,
          is_last_page: true,
        });
        setFetchError(getFetchErrorMessage(error));
      } finally {
        setLoading(false);
      }
    },
    [searchQuery, selectedStatus, selectedGroup],
  );

  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkIfMobile();
    window.addEventListener("resize", checkIfMobile);

    return () => {
      window.removeEventListener("resize", checkIfMobile);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem("sidebarMinimized", JSON.stringify(isMinimized));
  }, [isMinimized]);

  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [mobileMenuOpen]);

  useEffect(() => {
    fetchClients(1, pagination.limit);
  }, [searchQuery, selectedStatus, selectedGroup]);

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > pagination.total_pages) return;
    fetchClients(newPage, pagination.limit);
  };

  const handleLimitChange = (newLimit) => {
    setPagination((prev) => ({ ...prev, limit: newLimit, page: 1 }));
    fetchClients(1, newLimit);
  };

  const availableFields = [
    { id: "id", label: "ID", type: "text" },
    { id: "username", label: "Username", type: "text" },
    { id: "name", label: "Client Name", type: "text" },
    { id: "guardian_name", label: "Guardian Name", type: "text" },
    { id: "mobile", label: "Mobile", type: "text" },
    { id: "balance", label: "Balance", type: "currency" },
    { id: "firm_count", label: "Firm Count", type: "number" },
    { id: "firms", label: "Firms", type: "array" },
    { id: "pan", label: "PAN", type: "text" },
    { id: "file_no", label: "File No", type: "text" },
    { id: "actions", label: "Actions", type: "actions" },
  ];

  const defaultColumnConfig = [
    {
      id: "1",
      name: "Client Details",
      items: [{ id: "name", label: "Client Name" }],
    },
    {
      id: "2",
      name: "Mobile",
      items: [{ id: "mobile", label: "Mobile" }],
    },
    {
      id: "3",
      name: "Firms",
      items: [{ id: "firms", label: "Firms" }],
    },
    {
      id: "4",
      name: "Balance",
      items: [{ id: "balance", label: "Balance" }],
    },
    {
      id: "6",
      name: "Actions",
      items: [{ id: "actions", label: "Actions" }],
      fixed: true,
    },
  ];

  useEffect(() => {
    const savedConfig = localStorage.getItem("clientColumnConfig");
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig);
        const withoutStatus = (Array.isArray(parsed) ? parsed : []).filter(
          (col) =>
            col?.name !== "Status" &&
            !(col?.items || []).some((item) => item.id === "status"),
        );
        setColumnConfig(
          withoutStatus.length > 0 ? withoutStatus : defaultColumnConfig,
        );
      } catch {
        setColumnConfig(defaultColumnConfig);
      }
    } else {
      setColumnConfig(defaultColumnConfig);
    }
  }, []);

  const saveColumnConfig = (config) => {
    setColumnConfig(config);
    localStorage.setItem("clientColumnConfig", JSON.stringify(config));
  };

  const [statusOptions] = useState([
    { value: "ACTIVE", name: "Active" },
    { value: "INACTIVE", name: "Inactive" },
    { value: "PENDING", name: "Pending" },
  ]);

  const [groupOptions] = useState([
    { value: "gst", name: "GST" },
    { value: "itr", name: "ITR" },
    { value: "company", name: "Company" },
  ]);

  // Prepare data for export - Uses existing clients state
  const prepareExportData = () => {
    const exportDataList = [];
    const exportColumnsConfig = [];

    // Use already fetched clients data from state
    const clientsToExport =
      selectedClients.size > 0
        ? clients.filter((client) => selectedClients.has(client._id))
        : clients;

    // Build columns from visible column config
    const visibleColumns = columnConfig;

    visibleColumns.forEach((col) => {
      col.items.forEach((item) => {
        if (item.id === "actions") return;

        exportColumnsConfig.push({
          header: item.label,
          key: item.id,
          width: 20,
        });
      });
    });

    // Build data rows from clients state
    clientsToExport.forEach((client) => {
      const row = {};

      visibleColumns.forEach((col) => {
        col.items.forEach((item) => {
          if (item.id === "actions") return;

          let value = "";
          switch (item.id) {
            case "name":
              value = client.name || "N/A";
              break;
            case "mobile":
              value = client.mobile || "N/A";
              break;
            case "firms":
              // Get firm names from the firms array
              value = client.firms?.map((f) => f.firm_name).join(", ") || "N/A";
              break;
            case "balance":
              value = check("task_fees_view") ? client.balance || 0 : "----";
              break;
            case "status":
              value =
                client.status === "ACTIVE"
                  ? "Active"
                  : client.status === "INACTIVE"
                    ? "Inactive"
                    : "Pending";
              break;
            case "guardian_name":
              value = client.guardian_name || "N/A";
              break;
            case "username":
              value = client.username || "N/A";
              break;
            case "email":
              value = client.email || "N/A";
              break;
            case "pan_number":
              value = client.pan_number || "N/A";
              break;
            case "city":
              value = client.city || "N/A";
              break;
            case "state":
              value = client.state || "N/A";
              break;
            case "pincode":
              value = client.pincode || "N/A";
              break;
            default:
              value = client[item.id] || "-";
          }
          row[item.id] = value;
        });
      });
      exportDataList.push(row);
    });

    return { data: exportDataList, columns: exportColumnsConfig };
  };

  const handleExportClick = () => {
    const { data, columns } = prepareExportData();

    if (data.length === 0) {
      toast.error("No data to export");
      return;
    }

    setExportData(data);
    setExportColumns(columns);
    setExportModalOpen(true);
  };

  const handleExport = (type, data = null) => {
    handleExportClick();
  };

  const handleClientSelect = (clientId) => {
    const newSelected = selectAllAcrossPages
      ? new Set(clients.map((client) => client._id))
      : new Set(selectedClients);
    if (selectAllAcrossPages) setSelectAllAcrossPages(false);
    if (newSelected.has(clientId)) {
      newSelected.delete(clientId);
    } else {
      newSelected.add(clientId);
    }
    setSelectedClients(newSelected);

    if (clients.length > 0) {
      const allSelected = newSelected.size === clients.length;
      setSelectAll(allSelected);
    }
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedClients(new Set());
    } else {
      const allClientIds = new Set(clients.map((client) => client._id));
      setSelectedClients(allClientIds);
    }
    setSelectAllAcrossPages(false);
    setSelectAll(!selectAll);
  };

  const formatBalance = (balance) => {
    if (!check("task_fees_view")) {
      return <span className="blur-[3.5px] select-none">₹99,999</span>;
    }
    const amount = Number(balance || 0);
    return `${amount < 0 ? "-" : ""}₹${Math.abs(amount).toLocaleString()}`;
  };

  const handleStatusChange = (clientId, newStatus) => {
    setClients((prev) =>
      prev.map((client) =>
        client._id === clientId ? { ...client, status: newStatus } : client,
      ),
    );
  };

  const openStatusModal = (clientId, currentStatus) => {
    setStatusModal({
      open: true,
      clientId,
      currentStatus,
    });
  };

  const closeStatusModal = () => {
    setStatusModal({
      open: false,
      clientId: null,
      currentStatus: "",
    });
  };

  const openFirmsModal = (firms, clientName) => {
    setFirmsModal({
      open: true,
      firms,
      clientName,
    });
  };

  const closeFirmsModal = () => {
    setFirmsModal({
      open: false,
      firms: [],
      clientName: "",
    });
  };

  const openPaymentReminderModal = () => {
    if (selectAllAcrossPages) {
      setClientPaymentReminder({ open: true, clients: [], isAll: true });
      return;
    }

    const eligibleClients = clients.filter(
      (client) => selectedClients.has(client._id) && Number(client.balance) > 0,
    );
    if (eligibleClients.length === 0) {
      toast.error("Select at least one client with a positive balance");
      return;
    }
    setClientPaymentReminder({
      open: true,
      clients: eligibleClients,
      isAll: false,
    });
  };

  const openClientPaymentReminderModal = (client) => {
    if (!client || Number(client.balance) <= 0) return;
    setClientPaymentReminder({ open: true, clients: [client], isAll: false });
  };

  const closeClientPaymentReminderModal = () => {
    setClientPaymentReminder({ open: false, clients: [], isAll: false });
  };

  const effectiveSelectedClients = selectAllAcrossPages
    ? new Set(clients.map((client) => client._id))
    : selectedClients;
  const selectedClientCount = selectAllAcrossPages
    ? pagination.total
    : selectedClients.size;

  const toggleRowDropdown = (clientId, e) => {
    if (activeRowDropdown === clientId) {
      setActiveRowDropdown(null);
      return;
    }

    const rect = e?.currentTarget?.getBoundingClientRect?.();
    if (rect) {
      const estimatedHeight = 280;
      const spaceBelow = window.innerHeight - rect.bottom;
      const openUpward = spaceBelow < estimatedHeight + 8;
      setDropdownPos({
        top: openUpward ? undefined : rect.bottom + 4,
        bottom: openUpward ? window.innerHeight - rect.top + 4 : undefined,
        right: window.innerWidth - rect.right,
        openUpward,
      });
    }

    setActiveRowDropdown(clientId);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest(".dropdown-container")) {
        setActiveRowDropdown(null);
        setShowExportDropdown(false);
        setShowFilterDropdown(false);
        setShowMoreMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const getStatusColor = (status) => {
    switch (status) {
      case "ACTIVE":
        return "bg-green-100 text-green-700";
      case "INACTIVE":
        return "bg-red-100 text-red-700";
      case "PENDING":
        return "bg-yellow-100 text-yellow-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case "ACTIVE":
        return "Active";
      case "INACTIVE":
        return "Inactive";
      case "PENDING":
        return "Pending";
      default:
        return status;
    }
  };

  const getLastUpdatedFirm = (firms) => {
    if (!firms || firms.length === 0) return null;

    const sortedFirms = [...firms].sort((a, b) => {
      const dateA = a.modify_date || a.create_date;
      const dateB = b.modify_date || b.create_date;
      return new Date(dateB) - new Date(dateA);
    });

    return sortedFirms[0];
  };

  const renderCellContent = (
    client,
    fieldId,
    openStatusModal,
    showFirmsModal,
    openClientPaymentReminderModal,
  ) => {
    switch (fieldId) {
      case "name":
        return (
          <div className="flex items-center gap-3 w-full">
            <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-sm">
              <FiUser className="w-4 h-4 text-white" />
            </div>
            <div
              className="min-w-0 flex-1 text-left cursor-pointer hover:text-blue-600 transition-colors"
              onClick={() => navigate(`/client/profile/${client.username}`)}
            >
              <div className="font-semibold text-gray-800 text-sm truncate">
                {client.name || "N/A"}
              </div>
              <div className="text-xs text-gray-500 truncate leading-tight">
                {client.guardian_name || "N/A"}
              </div>
              {client.pan_number ? (
                <div className="text-xs text-gray-500 truncate leading-tight font-mono">
                  PAN: {client.pan_number}
                </div>
              ) : null}
            </div>
          </div>
        );
      case "mobile":
        return (
          <div className="flex items-center justify-center text-gray-700 font-medium text-sm gap-2">
            <FiPhone className="w-4 h-4 text-gray-400" />
            {client.mobile || "N/A"}
          </div>
        );
      case "balance":
        return (
          <div className="flex items-center justify-center">
            <button
              type="button"
              onClick={() =>
                navigate(
                  `/client/profile/${encodeURIComponent(client.username)}/ledger`,
                )
              }
              className={`inline-flex items-center px-3 py-1 rounded text-sm font-semibold transition-colors hover:opacity-90 ${
                (client.balance || 0) < 0
                  ? "bg-red-50 text-red-700 border border-red-200 hover:bg-red-100"
                  : "bg-green-50 text-green-700 border border-green-200 hover:bg-green-100"
              }`}
              title="View ledger"
            >
              {formatBalance(client.balance)}
            </button>
            {Number(client.balance) > 0 && (
              <button
                type="button"
                onClick={() => openClientPaymentReminderModal(client)}
                className="ml-1 inline-flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white shadow-sm shadow-violet-200 transition hover:-translate-y-0.5 hover:shadow-md"
                title="Send payment reminder"
                aria-label={`Send payment reminder to ${client.name || client.username}`}
              >
                <FiBell className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        );
      case "firms":
        const lastFirm = getLastUpdatedFirm(client.firms);
        const firmCount = client.firms?.length || 0;

        return (
          <div className="text-center">
            {firmCount > 0 ? (
              <div
                className="cursor-pointer hover:bg-gray-100 transition-colors text-center p-2"
                onClick={() => showFirmsModal(client.firms, client.name)}
              >
                <div className="font-medium text-gray-800 text-sm mb-1">
                  {lastFirm?.firm_name || "N/A"}
                </div>
                <div className="space-y-1">
                  <div
                    className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200`}
                  >
                    {firmCount} firm{firmCount !== 1 ? "s" : ""}
                  </div>
                  {client.firms.length > 1 && (
                    <div className="text-xs text-blue-600 font-medium">
                      +{client.firms.length - 1} more firm
                      {client.firms.length - 1 > 1 ? "s" : ""}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-sm text-gray-500 italic">No firms</div>
            )}
          </div>
        );
      case "status":
        return (
          <div
            className={`inline-flex items-center justify-center px-2 py-1 rounded text-xs font-medium ${getStatusColor(client.status)}`}
          >
            {getStatusText(client.status)}
          </div>
        );
      case "actions":
        return (
          <div className="relative dropdown-container flex justify-center">
            <motion.button
              onClick={(e) => {
                e.stopPropagation();
                toggleRowDropdown(client._id, e);
              }}
              className="w-8 h-8 flex items-center justify-center rounded
                           bg-gray-100 hover:bg-gray-200 transition-colors border border-gray-300"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <FiMoreVertical className="w-4 h-4 text-gray-700" />
            </motion.button>
          </div>
        );
      default:
        return (
          <span className="text-gray-700 font-medium text-sm">
            {client[fieldId] || "-"}
          </span>
        );
    }
  };

  const SettingsModal = React.memo(() => {
    const [localColumnConfig, setLocalColumnConfig] = useState(columnConfig);
    const [localActiveDragId, setLocalActiveDragId] = useState(null);
    const [localActiveItemDragId, setLocalActiveItemDragId] = useState(null);
    const [editingColumnId, setEditingColumnId] = useState(null);
    const [tempColumnName, setTempColumnName] = useState("");

    const resetModalState = useCallback(() => {
      if (settingsModalOpen) {
        setLocalColumnConfig(JSON.parse(JSON.stringify(columnConfig)));
        setLocalActiveDragId(null);
        setLocalActiveItemDragId(null);
        setEditingColumnId(null);
        setTempColumnName("");
      }
    }, [columnConfig, settingsModalOpen]);

    useEffect(() => {
      resetModalState();
    }, [resetModalState]);

    const handleModalDragEnd = (event) => {
      const { active, over } = event;

      if (!over || active.id === over.id) {
        setLocalActiveDragId(null);
        return;
      }

      const oldIndex = localColumnConfig.findIndex(
        (col) => col.id === active.id,
      );
      const newIndex = localColumnConfig.findIndex((col) => col.id === over.id);

      if (oldIndex === -1 || newIndex === -1) {
        setLocalActiveDragId(null);
        return;
      }

      const sourceColumn = localColumnConfig[oldIndex];
      const targetColumn = localColumnConfig[newIndex];

      const firstFixedIndex = localColumnConfig.findIndex((col) => col.fixed);

      if (sourceColumn.fixed) {
        setLocalActiveDragId(null);
        return;
      }

      if (newIndex >= firstFixedIndex && newIndex < localColumnConfig.length) {
        if (firstFixedIndex > 0) {
          const newConfig = arrayMove(
            localColumnConfig,
            oldIndex,
            firstFixedIndex - 1,
          );
          setLocalColumnConfig(newConfig);
        }
      } else {
        const newConfig = arrayMove(localColumnConfig, oldIndex, newIndex);
        setLocalColumnConfig(newConfig);
      }

      setLocalActiveDragId(null);
    };

    const handleModalItemDragEnd = (event, columnIndex) => {
      const { active, over } = event;

      if (active.id !== over.id) {
        const newConfig = [...localColumnConfig];
        const columnItems = newConfig[columnIndex].items;
        const oldIndex = columnItems.findIndex((item) => item.id === active.id);
        const newIndex = columnItems.findIndex((item) => item.id === over.id);

        newConfig[columnIndex].items = arrayMove(
          columnItems,
          oldIndex,
          newIndex,
        );
        setLocalColumnConfig(newConfig);
      }

      setLocalActiveItemDragId(null);
    };

    const addItemToColumnInModal = (columnIndex, fieldId) => {
      const field = availableFields.find((f) => f.id === fieldId);
      if (!field) return;

      const newConfig = [...localColumnConfig];
      if (newConfig[columnIndex].items.length < 5) {
        newConfig[columnIndex].items.push({
          id: field.id,
          label: field.label,
        });
        setLocalColumnConfig(newConfig);
      }
    };

    const removeItemFromColumnInModal = (columnIndex, itemIndex) => {
      const newConfig = [...localColumnConfig];
      newConfig[columnIndex].items.splice(itemIndex, 1);
      setLocalColumnConfig(newConfig);
    };

    const addNewColumnInModal = () => {
      const newConfig = [...localColumnConfig];
      const newColumnId = `col-${Date.now()}`;

      const firstFixedIndex = newConfig.findIndex((col) => col.fixed);
      const insertIndex =
        firstFixedIndex >= 0 ? firstFixedIndex : newConfig.length;

      newConfig.splice(insertIndex, 0, {
        id: newColumnId,
        name: `New Column`,
        items: [],
        fixed: false,
      });
      setLocalColumnConfig(newConfig);

      setEditingColumnId(newColumnId);
      setTempColumnName("New Column");
    };

    const startEditingColumn = (columnId, currentName) => {
      setEditingColumnId(columnId);
      setTempColumnName(currentName);
    };

    const saveColumnName = (columnId) => {
      if (!tempColumnName.trim()) {
        setEditingColumnId(null);
        return;
      }

      const newConfig = localColumnConfig.map((col) =>
        col.id === columnId ? { ...col, name: tempColumnName.trim() } : col,
      );
      setLocalColumnConfig(newConfig);
      setEditingColumnId(null);
    };

    const cancelEditingColumn = () => {
      setEditingColumnId(null);
      setTempColumnName("");
    };

    const saveModalChanges = () => {
      saveColumnConfig(localColumnConfig);
      setSettingsModalOpen(false);
    };

    const resetToDefaultInModal = () => {
      setLocalColumnConfig(JSON.parse(JSON.stringify(defaultColumnConfig)));
      setEditingColumnId(null);
      setTempColumnName("");
    };

    const ModalSortableColumn = React.memo(({ column, index }) => {
      const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
      } = useSortable({
        id: column.id,
        disabled:
          column.fixed ||
          index >= localColumnConfig.findIndex((col) => col.fixed),
      });

      const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 1000 : 1,
        cursor:
          column.fixed ||
          index >= localColumnConfig.findIndex((col) => col.fixed)
            ? "not-allowed"
            : "move",
      };

      const firstFixedIndex = localColumnConfig.findIndex((col) => col.fixed);
      const isDraggable = !column.fixed && index < firstFixedIndex;

      return (
        <motion.div
          ref={setNodeRef}
          style={style}
          {...(isDraggable ? attributes : {})}
          {...(isDraggable ? listeners : {})}
          className={`border-2 rounded-xl p-4 transition-all duration-200 ${
            column.fixed
              ? "bg-blue-50 border-blue-300 shadow-sm cursor-not-allowed"
              : !isDraggable
                ? "bg-gray-50 border-gray-200 cursor-not-allowed"
                : "bg-white border-gray-200 hover:shadow-md hover:border-gray-300 cursor-move"
          }`}
          whileHover={{ scale: isDraggable ? 1.02 : 1 }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              {isDraggable && (
                <div className="cursor-grab active:cursor-grabbing">
                  <FiMove className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                {editingColumnId === column.id ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={tempColumnName}
                      onChange={(e) => setTempColumnName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveColumnName(column.id);
                        if (e.key === "Escape") cancelEditingColumn();
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm font-bold text-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      autoFocus
                      placeholder="Column name"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => saveColumnName(column.id)}
                        className="flex-1 px-3 py-1.5 bg-green-500 text-white rounded text-xs font-medium hover:bg-green-600 transition-colors flex items-center justify-center gap-1"
                      >
                        <FiCheckCircle className="w-3 h-3" />
                      </button>
                      <button
                        onClick={cancelEditingColumn}
                        className="flex-1 px-3 py-1.5 bg-red-500 text-white rounded text-xs font-medium hover:bg-red-600 transition-colors flex items-center justify-center gap-1"
                      >
                        <FiX className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <h3 className="font-bold text-gray-800 text-sm truncate">
                        {column.name}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        {column.fixed && (
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium flex-shrink-0">
                            Fixed
                          </span>
                        )}
                        <span className="text-xs text-gray-500">
                          {column.items.length} item
                          {column.items.length !== 1 ? "s" : ""}
                        </span>
                      </div>
                    </div>
                    {!column.fixed && (
                      <button
                        onClick={() =>
                          startEditingColumn(column.id, column.name)
                        }
                        className="text-gray-500 hover:text-gray-700 p-1 hover:bg-gray-100 rounded flex-shrink-0 ml-2"
                        title="Edit column name"
                      >
                        <FiEdit className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
            {!column.fixed &&
              column.items.length === 0 &&
              editingColumnId !== column.id && (
                <button
                  onClick={() => {
                    const newConfig = [...localColumnConfig];
                    newConfig.splice(index, 1);
                    setLocalColumnConfig(newConfig);
                  }}
                  className="text-red-500 hover:text-red-700 transition-colors duration-200 p-1.5 rounded hover:bg-red-50 ml-2 flex-shrink-0"
                >
                  <FiX className="w-4 h-4" />
                </button>
              )}
          </div>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={(event) => setLocalActiveItemDragId(event.active.id)}
            onDragEnd={(event) => handleModalItemDragEnd(event, index)}
            onDragCancel={() => setLocalActiveItemDragId(null)}
          >
            <SortableContext
              items={column.items.map((item) => item.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2 mb-3 min-h-[60px]">
                {column.items &&
                  column.items.map((item, itemIndex) => (
                    <ModalSortableItem
                      key={item.id}
                      item={item}
                      columnIndex={index}
                      itemIndex={itemIndex}
                      columnId={column.id}
                      removeItem={removeItemFromColumnInModal}
                    />
                  ))}
              </div>
            </SortableContext>

            <DragOverlay>
              {localActiveItemDragId ? (
                <div className="bg-white border border-blue-400 shadow-lg rounded-lg px-3 py-2">
                  <div className="flex items-center gap-2">
                    <FiMove className="w-3 h-3 text-blue-400" />
                    <span className="font-medium text-gray-700 text-sm">
                      {availableFields.find(
                        (f) => f.id === localActiveItemDragId,
                      )?.label || "Item"}
                    </span>
                  </div>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>

          {!column.fixed &&
            column.items &&
            column.items.length < 5 &&
            editingColumnId !== column.id && (
              <select
                value=""
                onChange={(e) => {
                  if (e.target.value) {
                    addItemToColumnInModal(index, e.target.value);
                    e.target.value = "";
                  }
                }}
                className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white"
              >
                <option value="">Add field...</option>
                {availableFields
                  .filter((field) => field.id !== "actions")
                  .filter(
                    (field) =>
                      !localColumnConfig.some(
                        (col) =>
                          col.items &&
                          col.items.some((item) => item.id === field.id),
                      ) ||
                      localColumnConfig[index].items.some(
                        (item) => item.id === field.id,
                      ),
                  )
                  .map((field) => (
                    <option key={field.id} value={field.id}>
                      {field.label}
                    </option>
                  ))}
              </select>
            )}

          {!column.fixed &&
            column.items &&
            column.items.length === 0 &&
            editingColumnId !== column.id && (
              <div className="text-center py-4 text-gray-400 text-sm">
                <p>Drag fields here or select from dropdown</p>
              </div>
            )}
        </motion.div>
      );
    });

    const ModalSortableItem = React.memo(
      ({ item, columnIndex, itemIndex, columnId, removeItem }) => {
        const {
          attributes,
          listeners,
          setNodeRef,
          transform,
          transition,
          isDragging,
        } = useSortable({ id: item.id });

        const style = {
          transform: CSS.Transform.toString(transform),
          transition,
          opacity: isDragging ? 0.5 : 1,
          zIndex: isDragging ? 1000 : 1,
        };

        return (
          <motion.div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            className={`flex items-center justify-between bg-white border px-3 py-2 rounded-lg text-sm transition-all duration-200
                        ${isDragging ? "shadow-lg border-blue-400" : "border-gray-200 hover:bg-gray-50 hover:border-gray-300"}`}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: itemIndex * 0.05 }}
          >
            <div className="flex items-center gap-2">
              <FiMove className="w-3 h-3 text-gray-400" />
              <span className="font-medium text-gray-700">{item.label}</span>
            </div>
            <motion.button
              onClick={() => removeItem(columnIndex, itemIndex)}
              className="text-red-500 hover:text-red-700 transition-colors duration-200 p-1 rounded hover:bg-red-50"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <FiX className="w-3 h-3" />
            </motion.button>
          </motion.div>
        );
      },
    );

    const DraggableField = React.memo(({ field }) => {
      const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
      } = useSortable({ id: field.id });

      const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 1000 : 1,
      };

      return (
        <motion.div
          ref={setNodeRef}
          style={style}
          {...attributes}
          {...listeners}
          className="bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-300 rounded-lg px-4 py-3 text-sm font-medium text-gray-700 transition-all duration-200 hover:shadow-md hover:border-gray-400 hover:from-white hover:to-gray-50 cursor-move text-center"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <div className="flex items-center justify-center gap-2">
            <FiMove className="w-3 h-3 text-gray-400" />
            {field.label}
          </div>
        </motion.div>
      );
    });

    return (
      <AnimatePresence>
        {settingsModalOpen && (
          <motion.div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSettingsModalOpen(false)}
          >
            <motion.div
              className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 flex justify-between items-center shrink-0">
                <div>
                  <h2 className="text-xl font-bold">Table Settings</h2>
                  <p className="text-blue-100 text-sm mt-1">
                    Configure table columns
                  </p>
                </div>
                <motion.button
                  onClick={() => setSettingsModalOpen(false)}
                  className="text-white hover:text-blue-200 transition-colors duration-200 p-1 rounded-lg hover:bg-blue-500"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <FiX className="w-6 h-6" />
                </motion.button>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragStart={(event) => setLocalActiveDragId(event.active.id)}
                  onDragEnd={handleModalDragEnd}
                  onDragCancel={() => setLocalActiveDragId(null)}
                >
                  <SortableContext
                    items={localColumnConfig.map((column) => column.id)}
                    strategy={horizontalListSortingStrategy}
                  >
                    <div className="grid grid-cols-1 lg:grid-cols-6 gap-4 mb-6">
                      {localColumnConfig.map((column, index) => (
                        <ModalSortableColumn
                          key={column.id}
                          column={column}
                          index={index}
                        />
                      ))}
                    </div>
                  </SortableContext>

                  <DragOverlay>
                    {localActiveDragId ? (
                      <div className="bg-white border-2 border-blue-300 shadow-xl rounded-xl p-4 w-48">
                        <div className="flex items-center gap-2 mb-3">
                          <FiMove className="w-4 h-4 text-blue-400" />
                          <h3 className="font-bold text-gray-800 text-sm">
                            {localColumnConfig.find(
                              (col) => col.id === localActiveDragId,
                            )?.name || "Column"}
                          </h3>
                        </div>
                        <div className="text-xs text-gray-500">
                          {localColumnConfig.find(
                            (col) => col.id === localActiveDragId,
                          )?.items?.length || 0}{" "}
                          items
                        </div>
                      </div>
                    ) : null}
                  </DragOverlay>
                </DndContext>

                <div className="mb-6">
                  <motion.button
                    onClick={addNewColumnInModal}
                    className="px-4 py-3 bg-gradient-to-r from-gray-100 to-gray-200 border-2 border-dashed border-gray-300 rounded-xl text-gray-700 font-medium hover:from-gray-200 hover:to-gray-300 transition-all duration-200 flex items-center gap-2"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <FiPlus className="w-4 h-4" />
                    Add New Column
                  </motion.button>
                </div>

                <div className="border-t pt-6">
                  <h3 className="font-bold text-gray-800 text-sm mb-4 flex items-center gap-2">
                    <FiGrid className="w-4 h-4 text-blue-600" />
                    Available Fields (Drag to columns)
                  </h3>
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={(event) => {
                      const { active, over } = event;
                      if (over && active.id !== over.id) {
                        const columnIndex = localColumnConfig.findIndex(
                          (col) => col.id === over.id,
                        );
                        if (
                          columnIndex !== -1 &&
                          !localColumnConfig[columnIndex].fixed
                        ) {
                          addItemToColumnInModal(columnIndex, active.id);
                        }
                      }
                    }}
                  >
                    <SortableContext
                      items={availableFields
                        .filter((field) => field.id !== "actions")
                        .filter(
                          (field) =>
                            !localColumnConfig.some(
                              (col) =>
                                col.items &&
                                col.items.some((item) => item.id === field.id),
                            ),
                        )
                        .map((field) => field.id)}
                      strategy={horizontalListSortingStrategy}
                    >
                      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                        {availableFields
                          .filter((field) => field.id !== "actions")
                          .filter(
                            (field) =>
                              !localColumnConfig.some(
                                (col) =>
                                  col.items &&
                                  col.items.some(
                                    (item) => item.id === field.id,
                                  ),
                              ),
                          )
                          .map((field) => (
                            <DraggableField key={field.id} field={field} />
                          ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                </div>
              </div>

              <div className="border-t px-6 py-4 bg-gray-50 shrink-0">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <motion.button
                    onClick={resetToDefaultInModal}
                    className="inline-flex items-center justify-center px-6 py-3 text-sm font-medium
                                                 border border-gray-300 rounded-lg text-gray-700
                                                 hover:bg-gray-200 transition-all duration-200 hover:shadow-sm gap-2"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <FiRefreshCw className="w-4 h-4" />
                    Reset to Default
                  </motion.button>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <motion.button
                      onClick={() => setSettingsModalOpen(false)}
                      className="inline-flex items-center justify-center px-6 py-3 text-sm font-medium
                                                       border border-gray-300 rounded-lg text-gray-700
                                                       hover:bg-gray-200 transition-all duration-200 hover:shadow-sm"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      Cancel
                    </motion.button>

                    <motion.button
                      onClick={saveModalChanges}
                      className="inline-flex items-center justify-center px-6 py-3 text-sm font-medium
                                                       bg-gradient-to-r from-blue-600 to-blue-700 text-white
                                                       rounded-lg hover:from-blue-700 hover:to-blue-800
                                                       transition-all duration-200 hover:shadow-md shadow-sm gap-2"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <FiSave className="w-4 h-4" />
                      Save Changes
                    </motion.button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  });

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
        className={`pt-16 transition-all duration-300 ease-in-out ${isMinimized ? "md:pl-20" : "md:pl-[260px]"}`}
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
                <div className="w-full md:w-auto">
                  <h5 className="text-base md:text-lg font-bold text-gray-800 mb-0.5">
                    Client Management
                  </h5>
                  <p className="text-gray-500 text-xs">
                    Manage your clients efficiently with multiple view options
                  </p>
                </div>

                <div className="flex flex-col lg:flex-row gap-2 w-full lg:w-auto">
                  <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2 w-full">
                    <div className="flex items-center gap-2">
                      <div className="md:hidden w-full">
                        <TableViewSwitch
                          viewMode={viewMode}
                          setViewMode={setViewMode}
                        />
                      </div>
                      <div className="hidden md:block">
                        <TableViewSwitch
                          viewMode={viewMode}
                          setViewMode={setViewMode}
                        />
                      </div>

                      <div className="flex-1 md:flex-none md:min-w-[200px] lg:min-w-[250px]">
                        <div className="relative">
                          <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                          <input
                            type="text"
                            placeholder="Search clients..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm text-sm bg-white"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="dropdown-container relative">
                        <motion.button
                          onClick={() =>
                            setShowFilterDropdown(!showFilterDropdown)
                          }
                          className="px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all duration-200 text-gray-700 font-medium flex items-center gap-2 shadow-sm text-sm"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <FiFilter className="w-4 h-4" />
                          <span className="hidden sm:inline">Filter</span>
                        </motion.button>

                        <AnimatePresence>
                          {showFilterDropdown && (
                            <motion.div
                              className="absolute right-0 md:left-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-200 z-50 p-3"
                              initial={{ opacity: 0, y: -8, scale: 0.96 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: -8, scale: 0.96 }}
                              transition={{ duration: 0.15 }}
                            >
                              <div className="mb-3">
                                <label className="block text-xs font-semibold text-gray-600 mb-1">
                                  Status
                                </label>
                                <select
                                  value={selectedStatus}
                                  onChange={(e) =>
                                    setSelectedStatus(e.target.value)
                                  }
                                  className="w-full px-2 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                >
                                  <option value="">All Status</option>
                                  {statusOptions.map((status) => (
                                    <option
                                      key={status.value}
                                      value={status.value}
                                    >
                                      {status.name}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <div className="mb-3">
                                <label className="block text-xs font-semibold text-gray-600 mb-1">
                                  Group
                                </label>
                                <select
                                  value={selectedGroup}
                                  onChange={(e) =>
                                    setSelectedGroup(e.target.value)
                                  }
                                  className="w-full px-2 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                >
                                  <option value="">All Groups</option>
                                  {groupOptions.map((group) => (
                                    <option
                                      key={group.value}
                                      value={group.value}
                                    >
                                      {group.name}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <div className="flex justify-between gap-2">
                                <button
                                  onClick={() => {
                                    setSelectedStatus("");
                                    setSelectedGroup("");
                                  }}
                                  className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded hover:bg-gray-100"
                                >
                                  Reset
                                </button>
                                <button
                                  onClick={() => {
                                    setShowFilterDropdown(false);
                                    fetchClients(1, pagination.limit);
                                  }}
                                  className="w-full px-2 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                                >
                                  Apply
                                </button>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      <motion.button
                        disabled={!check("client_create")}
                        onClick={() =>
                          check("client_create") && navigate("/client/create")
                        }
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 shadow-sm whitespace-nowrap ${
                          check("client_create")
                            ? "bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white"
                            : "bg-gray-100 border border-gray-200 text-gray-400 cursor-not-allowed opacity-60"
                        }`}
                        whileHover={
                          check("client_create") ? { scale: 1.05 } : {}
                        }
                        whileTap={check("client_create") ? { scale: 0.95 } : {}}
                        title={
                          check("client_create")
                            ? "Add Client"
                            : "Locked (No permission)"
                        }
                      >
                        {check("client_create") ? (
                          <FiUserPlus className="w-4 h-4" />
                        ) : (
                          <FiLock className="w-4 h-4" />
                        )}
                      </motion.button>

                      <div className="relative dropdown-container">
                        <motion.button
                          onClick={() => setShowMoreMenu(!showMoreMenu)}
                          className="w-9 h-9 flex items-center justify-center rounded-full bg-white border border-gray-300 hover:bg-gray-100 transition shadow-sm"
                          whileHover={{ scale: 1.08 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <FiMoreVertical className="w-4 h-4 text-gray-700" />
                        </motion.button>

                        <AnimatePresence>
                          {showMoreMenu && (
                            <motion.div
                              className="absolute right-0 mt-2 w-52 bg-white rounded-lg shadow-xl border border-gray-200 z-50 overflow-hidden"
                              initial={{ opacity: 0, y: -8 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -8 }}
                            >
                              <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">
                                Export
                              </div>

                              <button
                                onClick={() => handleExportClick()}
                                className="flex items-center w-full px-3 py-2 text-sm text-gray-700 hover:bg-blue-50"
                              >
                                <PiFilePdfDuotone className="w-4 h-4 mr-2 text-red-500" />
                                Export as PDF
                              </button>

                              <button
                                onClick={() => handleExportClick()}
                                className="flex items-center w-full px-3 py-2 text-sm text-gray-700 hover:bg-blue-50"
                              >
                                <PiMicrosoftExcelLogoDuotone className="w-4 h-4 mr-2 text-green-500" />
                                Export as Excel
                              </button>

                              <button
                                onClick={() => handleExportClick()}
                                className="flex items-center w-full px-3 py-2 text-sm text-gray-700 hover:bg-blue-50"
                              >
                                <FaFileCsv className="w-4 h-4 mr-2 text-blue-500" />
                                Export as CSV
                              </button>

                              <div className="h-px bg-gray-200 my-1" />

                              <button
                                onClick={() => {
                                  if (viewMode === "table") {
                                    setSettingsModalOpen(true);
                                    setShowMoreMenu(false);
                                  }
                                }}
                                className={`flex items-center w-full px-3 py-2 text-sm ${viewMode === "table" ? "text-gray-700 hover:bg-gray-100" : "text-gray-400 cursor-not-allowed"}`}
                                disabled={viewMode !== "table"}
                              >
                                <FiSettings className="w-4 h-4 mr-2" />
                                Settings{" "}
                                {viewMode !== "table" && "(Table view only)"}
                              </button>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {selectAll && pagination.total > clients.length && (
              <div className="border-b border-indigo-200 bg-indigo-50 px-3 py-2 text-center text-xs text-indigo-800">
                {selectAllAcrossPages ? (
                  <>
                    All {pagination.total.toLocaleString()} clients are
                    selected.{" "}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedClients(new Set());
                        setSelectAll(false);
                        setSelectAllAcrossPages(false);
                      }}
                      className="font-semibold underline hover:text-indigo-950"
                    >
                      Clear selection
                    </button>
                  </>
                ) : (
                  <>
                    All {clients.length.toLocaleString()} clients on this page
                    are selected.{" "}
                    <button
                      type="button"
                      onClick={() => setSelectAllAcrossPages(true)}
                      className="font-semibold underline hover:text-indigo-950"
                    >
                      Select all {pagination.total.toLocaleString()} clients
                    </button>
                  </>
                )}
              </div>
            )}

            <div className="flex-1 flex flex-col overflow-hidden">
              {viewMode === "table" ? (
                <ClientTable
                  clients={clients}
                  selectedClients={effectiveSelectedClients}
                  handleClientSelect={handleClientSelect}
                  selectAll={selectAll}
                  handleSelectAll={handleSelectAll}
                  columnConfig={columnConfig}
                  renderCellContent={renderCellContent}
                  loading={loading}
                  fetchError={fetchError}
                  onRetryFetch={() =>
                    fetchClients(pagination.page, pagination.limit)
                  }
                  toggleRowDropdown={toggleRowDropdown}
                  activeRowDropdown={activeRowDropdown}
                  setActiveRowDropdown={setActiveRowDropdown}
                  handleStatusChange={handleStatusChange}
                  openStatusModal={openStatusModal}
                  navigate={navigate}
                  handleExport={handleExport}
                  showFirmsModal={openFirmsModal}
                  openClientPaymentReminderModal={
                    openClientPaymentReminderModal
                  }
                  onDeleteClient={() => SetDeleteModal(true)}
                />
              ) : (
                <ClientCards
                  clients={clients}
                  selectedClients={effectiveSelectedClients}
                  handleClientSelect={handleClientSelect}
                  columnConfig={columnConfig}
                  renderCellContent={renderCellContent}
                  loading={loading}
                  fetchError={fetchError}
                  onRetryFetch={() =>
                    fetchClients(pagination.page, pagination.limit)
                  }
                  toggleRowDropdown={toggleRowDropdown}
                  activeRowDropdown={activeRowDropdown}
                  setActiveRowDropdown={setActiveRowDropdown}
                  handleStatusChange={handleStatusChange}
                  statusOptions={statusOptions}
                  openStatusModal={openStatusModal}
                  navigate={navigate}
                  handleExport={handleExport}
                  showFirmsModal={openFirmsModal}
                  openClientPaymentReminderModal={
                    openClientPaymentReminderModal
                  }
                  onDeleteClient={() => SetDeleteModal(true)}
                />
              )}
            </div>

            <TablePagination
              page={pagination.page}
              limit={pagination.limit}
              total={pagination.total}
              totalPages={Math.max(
                1,
                pagination.total_pages ||
                  Math.ceil((pagination.total || 0) / (pagination.limit || 20)),
              )}
              isLastPage={pagination.is_last_page}
              rowOptions={[5, 10, 20, 50, 100]}
              defaultRows={20}
              onPageChange={handlePageChange}
              onLimitChange={handleLimitChange}
              showJump
              showFirstLast
            />
          </motion.div>
        </div>
      </div>

      {/* Floating Action Bar */}
      <AnimatePresence>
        {selectedClientCount > 0 && (
          <motion.div
            className="fixed bottom-4 right-4 md:bottom-6 md:right-6 z-50"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex flex-col md:flex-row items-center gap-2 md:gap-3">
              <motion.button
                onClick={openPaymentReminderModal}
                className="px-3 py-2.5 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg text-sm font-semibold hover:from-purple-700 hover:to-purple-800 flex items-center gap-2 shadow-xl"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <FiMail className="w-4 h-4" />
                <span className="hidden sm:inline">Payment Reminder</span>
                <span className="sm:hidden">({selectedClientCount})</span>
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Portal: Row action dropdown — outside overflow so it isn't clipped */}
      {activeRowDropdown !== null &&
        createPortal(
          (() => {
            const activeClient = clients.find(
              (client) => client._id === activeRowDropdown,
            );
            if (!activeClient) return null;
            return (
              <motion.div
                initial={{
                  opacity: 0,
                  scale: 0.95,
                  y: dropdownPos.openUpward ? 6 : -6,
                }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.12 }}
                className="dropdown-container fixed bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden"
                style={{
                  top: dropdownPos.top,
                  bottom: dropdownPos.bottom,
                  right: dropdownPos.right,
                  width: "224px",
                  zIndex: 9999,
                }}
              >
                <ClientActionMenuItems
                  client={activeClient}
                  navigate={navigate}
                  check={check}
                  onClose={() => setActiveRowDropdown(null)}
                  onDelete={() => {
                    setActiveRowDropdown(null);
                    SetDeleteModal(true);
                  }}
                />
              </motion.div>
            );
          })(),
          document.body,
        )}

      {/* Modals */}
      <SettingsModal />
      <ClientPaymentReminderModal
        isOpen={clientPaymentReminder.open}
        onClose={closeClientPaymentReminderModal}
        onSuccess={() => {
          setSelectedClients(new Set());
          setSelectAll(false);
          setSelectAllAcrossPages(false);
        }}
        clients={clientPaymentReminder.clients}
        isAll={clientPaymentReminder.isAll}
      />
      <StatusChangeModal
        isOpen={statusModal.open}
        onClose={closeStatusModal}
        clientId={statusModal.clientId}
        currentStatus={statusModal.currentStatus}
        onStatusChange={handleStatusChange}
        statusOptions={statusOptions}
      />
      <FirmsDetailsModal
        isOpen={firmsModal.open}
        onClose={closeFirmsModal}
        firms={firmsModal.firms}
        clientName={firmsModal.clientName}
      />

      <AnimatePresence>
        {exportModal.open && (
          <motion.div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white rounded-lg p-4 max-w-sm w-full mx-auto"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
              <div className="text-center">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <PiExportBold className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="text-base font-semibold text-gray-800 mb-2">
                  Exporting {exportModal.type.toUpperCase()}
                </h3>
                <p className="text-gray-600 mb-4 text-sm">
                  Your {exportModal.type} export is being processed...
                </p>
                <div className="flex justify-center space-x-2">
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
                  <div
                    className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"
                    style={{ animationDelay: "0.1s" }}
                  ></div>
                  <div
                    className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"
                    style={{ animationDelay: "0.2s" }}
                  ></div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Export Modal */}
      <ExportModal
        isOpen={exportModalOpen}
        onClose={() => {
          setExportModalOpen(false);
          setExportData([]);
          setExportColumns([]);
        }}
        exportData={exportData}
        columns={exportColumns}
        jobType="client_report"
      />

      {deleteModal && (
        <DeleteConfirmationModal
          title="Client Delete"
          onConfirm={(res) => {
            SetDeleteModal(false);
          }}
        />
      )}
    </div>
  );
};

export default ViewClients;
