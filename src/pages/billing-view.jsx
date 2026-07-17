import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { Header, Sidebar } from "../components/header";
import TablePagination from "../components/TablePagination";
import CustomSelect from "../components/CustomSelect";
import { optionByValue } from "../utils/customSelectHelpers";
import {
  FiSearch,
  FiCheckCircle,
  FiXCircle,
  FiMoreVertical,
  FiClock,
  FiCalendar,
  FiCheckSquare,
  FiDollarSign,
  FiFilePlus,
  FiDownload,
  FiSend,
  FiCheck,
  FiAlertCircle,
  FiFile,
  FiPercent,
  FiUser,
  FiBriefcase,
  FiHash,
  FiCreditCard,
  FiRepeat,
  FiEdit,
  FiEye,
  FiShare2,
  FiRefreshCw,
  FiInfo,
  FiLock,
} from "react-icons/fi";
import toast from "react-hot-toast";
import { useUserPermissions } from "../utils/permission-helper";
import { PiFilePdfDuotone } from "react-icons/pi";
import { TbFileInvoice, TbCurrencyRupee } from "react-icons/tb";
import {
  MdOutlineAttachMoney,
  MdOutlineMoneyOffCsred,
  MdOutlineDashboard,
} from "react-icons/md";
import { HiOutlineDocumentText, HiOutlineTrendingUp } from "react-icons/hi";
import { BsThreeDots, BsArrowRight } from "react-icons/bs";
import { motion, AnimatePresence } from "framer-motion";
import API_BASE_URL from "../utils/api-controller";
import getHeaders from "../utils/get-headers";

const BILL_LIST = "/billing/list";
const BILLING_STATUSES = ["pending", "generated", "nonbillable"];

const BILLING_GENERATE_BILLABLE = "/billing/generate/billable";
const BILLING_GENERATE_NONBILLABLE = "/billing/generate/nonbillable";
const BILLING_STATS = "/billing/stats";

const formatIndianNumber = (value) =>
  new Intl.NumberFormat("en-IN").format(Number(value) || 0);

const TABLE_LINK_CLASS =
  "text-sm font-semibold text-indigo-600 no-underline decoration-transparent hover:text-indigo-700 hover:no-underline hover:decoration-transparent transition-colors";

const TABLE_CELL_TEXT = "text-sm font-medium text-gray-700";

const formatClientMobile = (mobile) => {
  if (!mobile) return "—";
  return String(mobile).trim();
};

const formatGuardianLine = (careOf, guardianName) => {
  if (!guardianName) return null;
  const prefix = String(careOf || "C/O").trim() || "C/O";
  return `${prefix}: ${guardianName}`;
};

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
        className={`flex items-center justify-center w-[18px] h-[18px] rounded-[4px] border-2 transition-colors duration-200 ${
          isActive
            ? "bg-indigo-600 border-indigo-600 shadow-sm shadow-indigo-200"
            : "bg-white border-gray-300 group-hover:border-indigo-400"
        }`}
        animate={{ scale: isActive ? [1, 1.12, 1] : 1 }}
        transition={{ duration: 0.18 }}
        whileTap={disabled ? {} : { scale: 0.92 }}
      >
        <AnimatePresence initial={false} mode="wait">
          {indeterminate ? (
            <motion.span
              key="dash"
              className="block w-2 h-0.5 bg-white rounded-full"
              initial={{ opacity: 0, scaleX: 0.4 }}
              animate={{ opacity: 1, scaleX: 1 }}
              exit={{ opacity: 0, scaleX: 0.4 }}
              transition={{ duration: 0.12 }}
            />
          ) : checked ? (
            <motion.svg
              key="check"
              viewBox="0 0 12 12"
              className="w-3 h-3 text-white"
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

const SkeletonPulse = ({ className = "" }) => (
  <div className={`animate-pulse rounded-md bg-gray-200/90 ${className}`} />
);

const mapBillingStatusToBillType = (raw) => {
  if (raw == null || raw === "") return "pending";
  const s = String(raw).toLowerCase().replace(/\s+/g, " ").trim();
  if (s === "non billable" || s === "nonbillable") return "nonbillable";
  if (s === "generated") return "generated";
  return "pending";
};

const normalizeBillingRow = (raw) => {
  const profile = raw.client?.profile || {};
  const charges = raw.charges || {};
  const dates = raw.dates || {};
  const firm = raw.firm || {};
  const service = raw.service || {};
  const modifyBy = raw.modify_by || {};
  const createBy = raw.create_by || {};
  const staffs = Array.isArray(raw.staffs) ? raw.staffs : [];
  const primaryStaff = staffs[0];

  return {
    id: raw.task_id,
    task_id: raw.task_id,
    service_name: service.name || "—",
    service_id: service.service_id || "",
    fees: Number(charges.fees) || 0,
    charges_total: Number(charges.total) || 0,
    tax_rate: charges.tax_rate,
    tax_value: charges.tax_value,
    firm_name: firm.firm_name || "—",
    firm_id: firm.firm_id,
    firm_username: firm.username || "",
    firm_type: firm.firm_type || "",
    firm_pan: firm.pan_no || "",
    firm_file_no: firm.file_no || "",
    firm_gst: firm.gst_no || "",
    firm_cin: firm.cin_no || "",
    firm_tan: firm.tan_no || "",
    firm_address: firm.address || "",
    name: profile.name || "—",
    client_username: raw.client?.username,
    care_of: profile.care_of || "",
    guardian_name: profile.guardian_name || "",
    mobile: profile.mobile || "",
    email: profile.email || "",
    country_code: profile.country_code,
    create_date: dates.create_date,
    complete_date: dates.complete_date || dates.target_date || null,
    due_date: dates.due_date,
    bill_status: mapBillingStatusToBillType(raw.billing_status),
    task_status: raw.status,
    completer_name: modifyBy.name || primaryStaff?.name || createBy.name || "—",
    completer_username:
      modifyBy.username || primaryStaff?.username || createBy.username || "",
    completer_mobile:
      modifyBy.mobile || primaryStaff?.mobile || createBy.mobile || "",
    completer_user_type: modifyBy.username
      ? "staff"
      : primaryStaff
        ? "staff"
        : "user",
    is_recurring: Boolean(raw.is_recurring),
    recurring_type: raw.recurring_type || "",
    staffs,
    has_ca: raw.has_ca,
    has_agent: raw.has_agent,
    invoice_id: raw.invoice_id || raw.invoice?.invoice_id || null,
    invoice_no: raw.invoice_no || "",
    invoice_type: raw.invoice_type || raw.invoice?.type || "sale",
    billing_status_label: raw.billing_status || "",
    create_by_name: createBy.name || "",
    create_by_username: createBy.username || "",
    modify_by_name: modifyBy.name || "",
    modify_by_username: modifyBy.username || "",
    ca: raw.ca || null,
    agent: raw.agent || null,
    _raw: raw,
  };
};

// ─── Reusable in-app dialog ──────────────────────────────────────────────────

const DIALOG_CONFIG = {
  confirm: {
    iconBg: "bg-indigo-100",
    iconRing: "ring-indigo-200",
    iconColor: "text-indigo-600",
    Icon: FiInfo,
    accentGradient: "from-indigo-500 to-violet-500",
    confirmBtnClass: "bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500",
  },
  warning: {
    iconBg: "bg-amber-100",
    iconRing: "ring-amber-200",
    iconColor: "text-amber-600",
    Icon: FiAlertCircle,
    accentGradient: "from-amber-500 to-orange-500",
    confirmBtnClass:
      "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 focus:ring-amber-500",
  },
  danger: {
    iconBg: "bg-rose-100",
    iconRing: "ring-rose-200",
    iconColor: "text-rose-600",
    Icon: FiAlertCircle,
    accentGradient: "from-rose-500 to-pink-500",
    confirmBtnClass:
      "bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-700 hover:to-pink-700 focus:ring-rose-500",
  },
  success: {
    iconBg: "bg-emerald-100",
    iconRing: "ring-emerald-200",
    iconColor: "text-emerald-600",
    Icon: FiCheckCircle,
    accentGradient: "from-emerald-500 to-teal-500",
    confirmBtnClass:
      "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 focus:ring-emerald-500",
  },
  error: {
    iconBg: "bg-rose-100",
    iconRing: "ring-rose-200",
    iconColor: "text-rose-600",
    Icon: FiXCircle,
    accentGradient: "from-rose-500 to-pink-500",
    confirmBtnClass:
      "bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-700 hover:to-pink-700 focus:ring-rose-500",
  },
};

const AppDialog = ({ dialog, onClose, onConfirm }) => {
  const cfg = DIALOG_CONFIG[dialog.variant] || DIALOG_CONFIG.confirm;
  const { Icon } = cfg;

  return createPortal(
    <AnimatePresence>
      {dialog.open && (
        <motion.div
          key="app-dialog-root"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-[10000] flex items-center justify-center p-4"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
            onClick={!dialog.loading ? onClose : undefined}
          />

          {/* Card */}
          <motion.div
            key="app-dialog-card"
            initial={{ opacity: 0, scale: 0.9, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 16 }}
            transition={{ type: "spring", damping: 28, stiffness: 380 }}
            className="relative w-full max-w-[420px] bg-white rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top accent bar */}
            <div
              className={`h-1 w-full bg-gradient-to-r ${cfg.accentGradient}`}
            />

            <div className="px-6 pt-5 pb-6">
              {/* Icon + text */}
              <div className="flex gap-4">
                <div
                  className={`mt-0.5 flex-shrink-0 w-11 h-11 rounded-xl ${cfg.iconBg} ring-4 ${cfg.iconRing} flex items-center justify-center`}
                >
                  <Icon className={`w-5 h-5 ${cfg.iconColor}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-[15px] font-bold text-gray-900 leading-snug">
                    {dialog.title}
                  </h3>
                  <p className="mt-1.5 text-sm text-gray-500 leading-relaxed">
                    {dialog.message}
                  </p>
                </div>
              </div>

              {/* Divider */}
              <div className="mt-5 border-t border-gray-100" />

              {/* Actions */}
              <div className="mt-4 flex items-center justify-end gap-2.5">
                {dialog.cancelText && (
                  <button
                    type="button"
                    disabled={dialog.loading}
                    onClick={onClose}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {dialog.cancelText}
                  </button>
                )}
                <motion.button
                  type="button"
                  disabled={dialog.loading}
                  onClick={onConfirm}
                  whileTap={{ scale: dialog.loading ? 1 : 0.97 }}
                  className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-60 disabled:cursor-not-allowed transition-all ${cfg.confirmBtnClass}`}
                >
                  {dialog.loading ? (
                    <>
                      <FiRefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Processing…
                    </>
                  ) : (
                    dialog.confirmText || "OK"
                  )}
                </motion.button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
};

const DetailField = ({ label, children }) => (
  <div className="grid grid-cols-1 gap-0.5 border-b border-gray-100 py-2 sm:grid-cols-[140px_1fr] sm:gap-3">
    <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
      {label}
    </dt>
    <dd className="text-sm text-gray-800">{children ?? "—"}</dd>
  </div>
);

const formatDateDisplay = (dateString) => {
  if (dateString == null || dateString === "") return "—";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "—";
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

const BillingDetailsModal = ({ item, onClose }) => {
  if (!item) return null;

  const raw = item._raw || {};
  const guardianLine = formatGuardianLine(item.care_of, item.guardian_name);

  return createPortal(
    <AnimatePresence>
      <motion.div
        key="billing-details-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[10000] flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 24, scale: 0.98 }}
          transition={{ type: "spring", damping: 28, stiffness: 320 }}
          className="flex max-h-[min(92vh,720px)] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-white px-4 py-3 sm:px-5">
            <div>
              <h3 className="text-base font-bold text-gray-900">Bill Details</h3>
              <p className="text-xs text-gray-500">Task #{item.task_id}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
              aria-label="Close"
            >
              <FiXCircle className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-3 sm:px-5">
            <section className="mb-4">
              <h4 className="mb-1 text-xs font-bold uppercase tracking-wide text-indigo-600">
                Task & Billing
              </h4>
              <dl>
                <DetailField label="Service">{item.service_name}</DetailField>
                <DetailField label="Task status">{raw.status || item.task_status || "—"}</DetailField>
                <DetailField label="Billing status">
                  {item.billing_status_label || item.bill_status || "—"}
                </DetailField>
                <DetailField label="Fees">
                  ₹
                  {Number(item.fees).toLocaleString("en-IN", {
                    maximumFractionDigits: 2,
                  })}
                </DetailField>
                {item.tax_rate != null && (
                  <DetailField label="GST">
                    {item.tax_rate}% — ₹
                    {Number(item.tax_value || 0).toLocaleString("en-IN", {
                      maximumFractionDigits: 2,
                    })}
                  </DetailField>
                )}
                <DetailField label="Total">
                  ₹
                  {Number(item.charges_total || item.fees).toLocaleString("en-IN", {
                    maximumFractionDigits: 2,
                  })}
                </DetailField>
                {item.is_recurring && (
                  <DetailField label="Compliance">
                    Recurring compliance task
                  </DetailField>
                )}
                {item.invoice_no ? (
                  <DetailField label="Invoice no">{item.invoice_no}</DetailField>
                ) : null}
                {item.invoice_id ? (
                  <DetailField label="Invoice ID">{item.invoice_id}</DetailField>
                ) : null}
              </dl>
            </section>

            <section className="mb-4">
              <h4 className="mb-1 text-xs font-bold uppercase tracking-wide text-indigo-600">
                Dates
              </h4>
              <dl>
                <DetailField label="Created">{formatDateDisplay(item.create_date)}</DetailField>
                <DetailField label="Due">{formatDateDisplay(item.due_date)}</DetailField>
                <DetailField label="Completed">
                  {formatDateDisplay(item.complete_date)}
                </DetailField>
              </dl>
            </section>

            <section className="mb-4">
              <h4 className="mb-1 text-xs font-bold uppercase tracking-wide text-indigo-600">
                Client
              </h4>
              <dl>
                <DetailField label="Name">{item.name}</DetailField>
                {item.client_username ? (
                  <DetailField label="Username">{item.client_username}</DetailField>
                ) : null}
                {guardianLine ? (
                  <DetailField label="Guardian">{guardianLine}</DetailField>
                ) : null}
                <DetailField label="Mobile">
                  {formatClientMobile(item.mobile)}
                </DetailField>
                {item.email ? (
                  <DetailField label="Email">{item.email}</DetailField>
                ) : null}
              </dl>
            </section>

            <section className="mb-4">
              <h4 className="mb-1 text-xs font-bold uppercase tracking-wide text-indigo-600">
                Firm
              </h4>
              <dl>
                <DetailField label="Firm name">{item.firm_name}</DetailField>
                {item.firm_file_no ? (
                  <DetailField label="File no">{item.firm_file_no}</DetailField>
                ) : null}
                {item.firm_type ? (
                  <DetailField label="Type">{item.firm_type}</DetailField>
                ) : null}
                {item.firm_pan ? (
                  <DetailField label="PAN">{item.firm_pan}</DetailField>
                ) : null}
                {item.firm_gst ? (
                  <DetailField label="GST">{item.firm_gst}</DetailField>
                ) : null}
                {item.firm_cin ? (
                  <DetailField label="CIN">{item.firm_cin}</DetailField>
                ) : null}
                {item.firm_tan ? (
                  <DetailField label="TAN">{item.firm_tan}</DetailField>
                ) : null}
                {item.firm_address ? (
                  <DetailField label="Address">{item.firm_address}</DetailField>
                ) : null}
              </dl>
            </section>

            {(item.staffs?.length > 0 || item.completer_name) && (
              <section className="mb-4">
                <h4 className="mb-1 text-xs font-bold uppercase tracking-wide text-indigo-600">
                  Staff
                </h4>
                <dl>
                  {item.staffs?.length > 0 ? (
                    <DetailField label="Assigned">
                      <ul className="space-y-1">
                        {item.staffs.map((s) => (
                          <li key={s.username || s.assign_id}>
                            {s.name}
                            {s.mobile ? ` · ${s.mobile}` : ""}
                          </li>
                        ))}
                      </ul>
                    </DetailField>
                  ) : null}
                  {item.completer_name && item.completer_name !== "—" ? (
                    <DetailField label="Completed by">
                      {item.completer_name}
                      {item.completer_mobile ? ` · ${item.completer_mobile}` : ""}
                    </DetailField>
                  ) : null}
                </dl>
              </section>
            )}

            {(item.has_ca || item.has_agent || item.ca || item.agent) && (
              <section className="mb-4">
                <h4 className="mb-1 text-xs font-bold uppercase tracking-wide text-indigo-600">
                  CA / Agent
                </h4>
                <dl>
                  {item.ca?.name ? (
                    <DetailField label="CA">{item.ca.name}</DetailField>
                  ) : null}
                  {item.agent?.name ? (
                    <DetailField label="Agent">{item.agent.name}</DetailField>
                  ) : null}
                </dl>
              </section>
            )}

            <section>
              <h4 className="mb-1 text-xs font-bold uppercase tracking-wide text-indigo-600">
                Audit
              </h4>
              <dl>
                {item.create_by_name ? (
                  <DetailField label="Created by">{item.create_by_name}</DetailField>
                ) : null}
                {item.modify_by_name ? (
                  <DetailField label="Modified by">{item.modify_by_name}</DetailField>
                ) : null}
              </dl>
            </section>
          </div>

          <div className="border-t border-gray-200 px-4 py-3 sm:px-5">
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700"
            >
              Close
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body,
  );
};

// ─────────────────────────────────────────────────────────────────────────────

const BillDisplay = () => {
  const { check } = useUserPermissions();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(() => {
    const saved = localStorage.getItem("sidebarMinimized");
    return saved ? JSON.parse(saved) : false;
  });
  /** Local input value; list API uses `searchQuery`, updated on keyup (and paste) */
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedService, setSelectedService] = useState("");
  const [selectedStaff, setSelectedStaff] = useState("");
  const [services, setServices] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(false);
  const listFetchAbortRef = useRef(null);
  const listFetchSeqRef = useRef(0);

  // Bill type tabs state - default to 'pending' as requested
  const [selectedBillType, setSelectedBillType] = useState("pending");

  // Bill type cards data - Only 3 cards: Pending, Generated, Non-Billable
  const billTypeCards = [
    {
      value: "pending",
      label: "Pending",
      icon: FiClock,
      color: "orange",
      bgColor: "from-orange-50 to-amber-50",
      borderColor: "border-orange-200",
      textColor: "text-orange-700",
      hoverColor: "hover:from-orange-100 hover:to-amber-100",
      activeColor: "from-orange-500 to-amber-500",
      description: "Awaiting billing",
      gradient: "bg-gradient-to-r from-orange-500 to-amber-500",
      cardGradient:
        "bg-gradient-to-br from-orange-500/5 via-orange-400/3 to-amber-500/5",
      lightGradient:
        "bg-gradient-to-br from-orange-50/80 via-amber-50/50 to-yellow-50/30",
      countColor: "bg-gradient-to-r from-orange-500 to-amber-500",
      chartColor: "#f97316",
      subDescription: "Need action",
      iconBg: "bg-gradient-to-br from-orange-500/15 to-amber-500/15",
    },
    {
      value: "generated",
      label: "Generated",
      icon: HiOutlineDocumentText,
      color: "green",
      bgColor: "from-emerald-50 to-teal-50",
      borderColor: "border-emerald-200",
      textColor: "text-emerald-700",
      hoverColor: "hover:from-emerald-100 hover:to-teal-100",
      activeColor: "from-emerald-500 to-teal-500",
      description: "Bills created",
      gradient: "bg-gradient-to-r from-emerald-500 to-teal-500",
      cardGradient:
        "bg-gradient-to-br from-emerald-500/5 via-emerald-400/3 to-teal-500/5",
      lightGradient:
        "bg-gradient-to-br from-emerald-50/80 via-teal-50/50 to-cyan-50/30",
      countColor: "bg-gradient-to-r from-emerald-500 to-teal-500",
      chartColor: "#10b981",
      subDescription: "Ready for payment",
      iconBg: "bg-gradient-to-br from-emerald-500/15 to-teal-500/15",
    },
    {
      value: "nonbillable",
      label: "Non-Billable",
      icon: MdOutlineMoneyOffCsred,
      color: "red",
      bgColor: "from-rose-50 to-pink-50",
      borderColor: "border-rose-200",
      textColor: "text-rose-700",
      hoverColor: "hover:from-rose-100 hover:to-pink-100",
      activeColor: "from-rose-500 to-pink-500",
      description: "Marked non-billable",
      gradient: "bg-gradient-to-r from-rose-500 to-pink-500",
      cardGradient:
        "bg-gradient-to-br from-rose-500/5 via-rose-400/3 to-pink-500/5",
      lightGradient:
        "bg-gradient-to-br from-rose-50/80 via-pink-50/50 to-red-50/30",
      countColor: "bg-gradient-to-r from-rose-500 to-pink-500",
      chartColor: "#f43f5e",
      subDescription: "Write off",
      iconBg: "bg-gradient-to-br from-rose-500/15 to-pink-500/15",
    },
  ];

  // Billing list from API (current tab)
  const [billingData, setBillingData] = useState([]);
  const [pagination, setPagination] = useState({
    page_no: 1,
    limit: 20,
    total: 0,
    total_pages: 1,
    is_last_page: true,
  });
  const [listError, setListError] = useState(null);
  const [countsByTab, setCountsByTab] = useState({
    pending: 0,
    generated: 0,
    nonbillable: 0,
  });
  // Selected items state
  const [selectedItems, setSelectedItems] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [billingActionLoading, setBillingActionLoading] = useState(false);
  const [downloadPdfLoading, setDownloadPdfLoading] = useState(null); // task_id being downloaded

  const [activeRowDropdown, setActiveRowDropdown] = useState(null);
  const [detailsItem, setDetailsItem] = useState(null);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, right: 0 });

  // ── In-app dialog (replaces window.alert / window.confirm) ──────────────
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

  const showConfirm = ({
    variant = "warning",
    title,
    message,
    confirmText = "Confirm",
    cancelText = "Cancel",
    onConfirm,
  }) => {
    setDialog({
      open: true,
      variant,
      title,
      message,
      confirmText,
      cancelText,
      onConfirm,
      loading: false,
    });
  };

  const closeDialog = () => {
    setDialog((prev) => ({
      ...prev,
      open: false,
      loading: false,
      onConfirm: null,
    }));
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
      setDialog((prev) => ({
        ...prev,
        open: false,
        loading: false,
        onConfirm: null,
      }));
    }
  };
  // ─────────────────────────────────────────────────────────────────────────

  const fetchTabCounts = useCallback(async () => {
    const headers = getHeaders();
    if (!headers) return;
    try {
      const results = await Promise.all(
        BILLING_STATUSES.map((status) => {
          const params = new URLSearchParams({
            page_no: "1",
            limit: "1",
            status,
          });
          return fetch(`${API_BASE_URL}${BILL_LIST}?${params.toString()}`, {
            method: "GET",
            headers,
          }).then((r) => r.json());
        }),
      );
      setCountsByTab((prev) => {
        const next = { ...prev };
        results.forEach((json, i) => {
          if (json?.success && json.pagination != null) {
            next[BILLING_STATUSES[i]] = Number(json.pagination.total) || 0;
          }
        });
        return next;
      });
    } catch (e) {
      console.error("Billing tab counts:", e);
    }
  }, []);

  const fetchBillingList = useCallback(
    async (tab, pageNo, filters = {}) => {
      const headers = getHeaders();
      if (!headers) {
        setListError("Missing authentication. Please sign in again.");
        setBillingData([]);
        return;
      }
      listFetchAbortRef.current?.abort();
      const ac = new AbortController();
      listFetchAbortRef.current = ac;
      const seq = ++listFetchSeqRef.current;

      setLoading(true);
      setListError(null);
      try {
        const status = String(tab || "").toLowerCase();
        if (!BILLING_STATUSES.includes(status)) {
          throw new Error("Unknown billing list status");
        }
        const params = new URLSearchParams({
          page_no: String(pageNo),
          limit: String(pagination.limit),
          status,
        });
        const q = (filters.search ?? searchQuery).trim();
        if (q) params.append("search", q);
        const serviceId = filters.serviceId ?? selectedService;
        const completedBy = filters.completedBy ?? selectedStaff;
        if (serviceId) params.append("service_id", serviceId);
        if (completedBy) params.append("completed_by", completedBy);

        const response = await fetch(
          `${API_BASE_URL}${BILL_LIST}?${params.toString()}`,
          {
            method: "GET",
            headers,
            signal: ac.signal,
          },
        );
        const json = await response.json();

        if (!response.ok) {
          throw new Error(
            json?.message || `Request failed (${response.status})`,
          );
        }

        if (json.success && Array.isArray(json.data)) {
          const rows = json.data.map(normalizeBillingRow);
          setBillingData(rows);
          const pg = json.pagination || {};
          setPagination((prev) => ({
            ...prev,
            page_no: pg.page_no != null ? Number(pg.page_no) : pageNo,
            limit: pg.limit != null ? Number(pg.limit) : prev.limit,
            total: pg.total != null ? Number(pg.total) : rows.length,
            total_pages: pg.total_pages != null ? Number(pg.total_pages) : 1,
            is_last_page: Boolean(pg.is_last_page),
          }));
        } else {
          setBillingData([]);
          setListError(json?.message || "Unexpected response from server");
        }
      } catch (e) {
        if (e.name === "AbortError") return;
        console.error("Billing list fetch:", e);
        setBillingData([]);
        setListError(e.message || "Failed to load billing list");
      } finally {
        if (seq === listFetchSeqRef.current) {
          setLoading(false);
        }
      }
    },
    [searchQuery, pagination.limit, selectedService, selectedStaff],
  );

  const fetchFilterOptions = useCallback(async () => {
    const headers = getHeaders();
    if (!headers) return;
    try {
      const [servicesRes, staffRes] = await Promise.all([
        fetch(
          `${API_BASE_URL}/service/list?page_no=1&limit=100`,
          { method: "GET", headers },
        ).then((r) => r.json()),
        fetch(
          `${API_BASE_URL}/settings/staff/list?page=1&limit=100&status=active`,
          { method: "GET", headers },
        ).then((r) => r.json()),
      ]);
      if (servicesRes?.success && Array.isArray(servicesRes.data)) {
        setServices(servicesRes.data);
      }
      if (staffRes?.success && Array.isArray(staffRes.data)) {
        setStaffList(staffRes.data);
      }
    } catch (e) {
      console.error("Billing filter options:", e);
    }
  }, []);

  const serviceOptions = useMemo(
    () => [
      { value: "", label: "All Services" },
      ...services.map((service) => ({
        value: service.service_id,
        label: service.name,
      })),
    ],
    [services],
  );

  const staffSelectOptions = useMemo(
    () => [
      { value: "", label: "All Staff" },
      ...staffList.map((staff) => {
        const name = staff.profile?.name || staff.username || "Staff";
        const mobile = staff.profile?.mobile || staff.mobile || "";
        return {
          value: staff.username,
          label: mobile ? `${name} · ${mobile}` : name,
        };
      }),
    ],
    [staffList],
  );

  const handleRefreshPage = () => {
    fetchTabCounts();
    fetchBillingList(selectedBillType, pagination.page_no);
  };

  const handleClearFilters = () => {
    setSearchInput("");
    setSearchQuery("");
    setSelectedService("");
    setSelectedStaff("");
    setPagination((p) => ({ ...p, page_no: 1 }));
  };

  const hasActiveFilters =
    Boolean(searchQuery.trim()) || Boolean(selectedService) || Boolean(selectedStaff);

  const filterKey = `${searchQuery.trim()}|${selectedService}|${selectedStaff}`;
  const prevFilterKeyRef = useRef(null);

  useEffect(() => {
    fetchTabCounts();
    fetchFilterOptions();
  }, [fetchTabCounts, fetchFilterOptions]);

  useEffect(() => {
    const filtersChanged =
      prevFilterKeyRef.current !== null &&
      prevFilterKeyRef.current !== filterKey;
    if (filtersChanged) {
      prevFilterKeyRef.current = filterKey;
      if (pagination.page_no !== 1) {
        setPagination((p) => ({ ...p, page_no: 1 }));
        return;
      }
    } else if (prevFilterKeyRef.current === null) {
      prevFilterKeyRef.current = filterKey;
    }
    fetchBillingList(selectedBillType, pagination.page_no);
  }, [selectedBillType, pagination.page_no, filterKey, fetchBillingList]);

  const updatedBillTypeCards = billTypeCards.map((card) => ({
    ...card,
    count: countsByTab[card.value] ?? 0,
  }));

  const showPendingColumns = selectedBillType === "pending";
  const displayData = billingData;
  const tableColCount = showPendingColumns ? 7 : 6;
  const skeletonRowCount = Math.max(
    1,
    Math.min(100, Number(pagination.limit) || 20),
  );
  const isSelectionIndeterminate =
    selectedItems.length > 0 && selectedItems.length < displayData.length;

  // Persist sidebar minimized state
  useEffect(() => {
    localStorage.setItem("sidebarMinimized", JSON.stringify(isMinimized));
  }, [isMinimized]);

  // Lock body scroll when mobile sidebar is open
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

  // Format date for display
  const formatDate = (dateString) => {
    if (dateString == null || dateString === "") return "—";
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return "—";
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const DateLine = ({ icon: Icon, iconClass, title, value }) => (
    <div
      className={`flex items-center gap-1.5 ${TABLE_CELL_TEXT}`}
      title={title}
    >
      <Icon className={`h-3.5 w-3.5 shrink-0 ${iconClass}`} aria-hidden />
      <span className="whitespace-nowrap tabular-nums">{formatDate(value)}</span>
    </div>
  );

  // Get previous period for recurring tasks
  const getPreviousPeriod = (type, due_date) => {
    if (!due_date) return "INVALID";

    const date = new Date(due_date);
    const month = date.getMonth() + 1;

    if (type === "monthly") {
      const months = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];
      const previousMonthIndex = (date.getMonth() - 1 + 12) % 12;
      return months[previousMonthIndex];
    } else if (type === "quarterly") {
      const currentQuarter = Math.ceil(month / 3);
      const previousQuarter = currentQuarter === 1 ? 4 : currentQuarter - 1;

      const quarters = {
        1: "Jan - Mar",
        2: "Apr - Jun",
        3: "Jul - Sep",
        4: "Oct - Dec",
      };

      return quarters[previousQuarter];
    } else if (type === "half yearly") {
      let currentHalf, previousHalf;

      if (month >= 4 && month <= 9) {
        currentHalf = "Apr - Sep";
        previousHalf = "Oct - Mar";
      } else {
        currentHalf = "Oct - Mar";
        previousHalf = "Apr - Sep";
      }

      return previousHalf;
    } else if (type === "yearly") {
      const year = date.getFullYear();
      const startFY = month <= 3 ? year - 1 : year;
      const endFY = String(startFY + 1).slice(-2);

      return `FY ${startFY}-${endFY}`;
    }
    return "INVALID";
  };

  // Handle individual toggle selection
  const handleToggleSelect = (taskId) => {
    setSelectedItems((prev) => {
      if (prev.includes(taskId)) {
        return prev.filter((id) => id !== taskId);
      } else {
        return [...prev, taskId];
      }
    });
  };

  // Handle select all
  const handleSelectAll = () => {
    if (selectAll && !isSelectionIndeterminate) {
      setSelectedItems([]);
      setSelectAll(false);
    } else {
      setSelectedItems(displayData.map((item) => item.task_id));
      setSelectAll(true);
    }
  };

  const handleGenerateBill = () => {
    if (selectedItems.length === 0 || billingActionLoading) return;
    const count = selectedItems.length;
    const snapshotIds = [...selectedItems];
    showConfirm({
      variant: "warning",
      title: "Generate Bill",
      message: `You are about to generate invoice${count !== 1 ? "s" : ""} for ${count} selected task${count !== 1 ? "s" : ""}. This action cannot be undone.`,
      confirmText: "Generate",
      cancelText: "Cancel",
      onConfirm: async () => {
        const headers = getHeaders();
        if (!headers) {
          return {
            variant: "error",
            title: "Authentication Error",
            message: "Missing authentication. Please sign in again.",
          };
        }
        setBillingActionLoading(true);
        try {
          const response = await fetch(
            `${API_BASE_URL}${BILLING_GENERATE_BILLABLE}`,
            {
              method: "POST",
              headers: { ...headers, "Content-Type": "application/json" },
              body: JSON.stringify({ task_ids: snapshotIds }),
            },
          );
          const json = await response.json().catch(() => ({}));
          if (response.ok && json.success) {
            const inv = json.data?.invoice_no
              ? ` Invoice No: ${json.data.invoice_no}.`
              : "";
            setSelectedItems([]);
            setSelectAll(false);
            fetchTabCounts();
            fetchBillingList(selectedBillType, pagination.page_no);
            return {
              variant: "success",
              title: "Bill Generated!",
              message: (json.message || "Bill generated successfully.") + inv,
            };
          } else {
            return {
              variant: "error",
              title: "Failed to Generate",
              message:
                json.message || `Could not generate bill (${response.status})`,
            };
          }
        } catch (e) {
          console.error("Generate bill:", e);
          return {
            variant: "error",
            title: "Error",
            message: e.message || "Failed to generate bill",
          };
        } finally {
          setBillingActionLoading(false);
        }
      },
    });
  };

  const handleMarkNonBillable = () => {
    if (selectedItems.length === 0 || billingActionLoading) return;
    const count = selectedItems.length;
    const snapshotIds = [...selectedItems];
    showConfirm({
      variant: "danger",
      title: "Mark as Non-Billable",
      message: `${count} task${count !== 1 ? "s" : ""} will be marked as non-billable. This cannot be undone from here.`,
      confirmText: "Mark Non-Billable",
      cancelText: "Cancel",
      onConfirm: async () => {
        const headers = getHeaders();
        if (!headers) {
          return {
            variant: "error",
            title: "Authentication Error",
            message: "Missing authentication. Please sign in again.",
          };
        }
        setBillingActionLoading(true);
        try {
          const response = await fetch(
            `${API_BASE_URL}${BILLING_GENERATE_NONBILLABLE}`,
            {
              method: "POST",
              headers: { ...headers, "Content-Type": "application/json" },
              body: JSON.stringify({ task_ids: snapshotIds }),
            },
          );
          const json = await response.json().catch(() => ({}));
          if (response.ok && json.success) {
            setSelectedItems([]);
            setSelectAll(false);
            fetchTabCounts();
            fetchBillingList(selectedBillType, pagination.page_no);
            return {
              variant: "success",
              title: "Done",
              message: json.message || "Tasks marked as non-billable.",
            };
          } else {
            return {
              variant: "error",
              title: "Failed",
              message:
                json.message || `Could not update tasks (${response.status})`,
            };
          }
        } catch (e) {
          console.error("Non-billable:", e);
          return {
            variant: "error",
            title: "Error",
            message: e.message || "Failed to mark tasks as non-billable",
          };
        } finally {
          setBillingActionLoading(false);
        }
      },
    });
  };

  const handleGenerateSingleTask = (taskId) => {
    if (billingActionLoading) return;
    setActiveRowDropdown(null);
    showConfirm({
      variant: "warning",
      title: "Generate Bill",
      message:
        "An invoice will be created for this task. This action cannot be undone.",
      confirmText: "Generate",
      cancelText: "Cancel",
      onConfirm: async () => {
        const headers = getHeaders();
        if (!headers) {
          return {
            variant: "error",
            title: "Authentication Error",
            message: "Missing authentication. Please sign in again.",
          };
        }
        setBillingActionLoading(true);
        try {
          const response = await fetch(
            `${API_BASE_URL}${BILLING_GENERATE_BILLABLE}`,
            {
              method: "POST",
              headers: { ...headers, "Content-Type": "application/json" },
              body: JSON.stringify({ task_ids: [taskId] }),
            },
          );
          const json = await response.json().catch(() => ({}));
          if (response.ok && json.success) {
            const inv = json.data?.invoice_no
              ? ` Invoice No: ${json.data.invoice_no}.`
              : "";
            fetchTabCounts();
            fetchBillingList(selectedBillType, pagination.page_no);
            return {
              variant: "success",
              title: "Bill Generated!",
              message: (json.message || "Bill generated successfully.") + inv,
            };
          } else {
            return {
              variant: "error",
              title: "Failed to Generate",
              message:
                json.message || `Could not generate bill (${response.status})`,
            };
          }
        } catch (e) {
          console.error("Generate single bill:", e);
          return {
            variant: "error",
            title: "Error",
            message: e.message || "Failed to generate bill",
          };
        } finally {
          setBillingActionLoading(false);
        }
      },
    });
  };

  const handleMarkSingleNonBillable = (taskId) => {
    if (billingActionLoading) return;
    setActiveRowDropdown(null);
    showConfirm({
      variant: "danger",
      title: "Mark as Non-Billable",
      message:
        "This task will be marked as non-billable. This cannot be undone from here.",
      confirmText: "Mark Non-Billable",
      cancelText: "Cancel",
      onConfirm: async () => {
        const headers = getHeaders();
        if (!headers) {
          return {
            variant: "error",
            title: "Authentication Error",
            message: "Missing authentication. Please sign in again.",
          };
        }
        setBillingActionLoading(true);
        try {
          const response = await fetch(
            `${API_BASE_URL}${BILLING_GENERATE_NONBILLABLE}`,
            {
              method: "POST",
              headers: { ...headers, "Content-Type": "application/json" },
              body: JSON.stringify({ task_ids: [taskId] }),
            },
          );
          const json = await response.json().catch(() => ({}));
          if (response.ok && json.success) {
            fetchTabCounts();
            fetchBillingList(selectedBillType, pagination.page_no);
            return {
              variant: "success",
              title: "Done",
              message: json.message || "Task marked as non-billable.",
            };
          } else {
            return {
              variant: "error",
              title: "Failed",
              message:
                json.message || `Could not update task (${response.status})`,
            };
          }
        } catch (e) {
          console.error("Single non-billable:", e);
          return {
            variant: "error",
            title: "Error",
            message: e.message || "Failed to mark as non-billable",
          };
        } finally {
          setBillingActionLoading(false);
        }
      },
    });
  };

  const handleDownloadPdf = async (item) => {
    if (!item.invoice_id) {
      showConfirm({
        variant: "warning",
        title: "No Invoice",
        message: "No invoice ID found for this bill.",
        confirmText: "OK",
        cancelText: null,
        onConfirm: async () => {},
      });
      return;
    }
    setDownloadPdfLoading(item.task_id);
    try {
      const headers = getHeaders();
      if (!headers) throw new Error("Missing authentication.");
      const response = await fetch(`${API_BASE_URL}/invoice/generate`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          invoice_id: item.invoice_id,
          type: item.invoice_type || "sale",
          response: "pdf",
        }),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err?.message || `Request failed (${response.status})`);
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `invoice-${item.invoice_id}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Download PDF:", e);
      showConfirm({
        variant: "danger",
        title: "Download Failed",
        message: e.message || "Failed to download invoice PDF.",
        confirmText: "OK",
        cancelText: null,
        onConfirm: async () => {},
      });
    } finally {
      setDownloadPdfLoading(null);
    }
  };

  // Toggle row dropdown — captures button position for fixed portal.
  // Auto-detects whether to open upward or downward based on available viewport space.
  const toggleRowDropdown = (taskId, e) => {
    if (activeRowDropdown === taskId) {
      setActiveRowDropdown(null);
    } else {
      const rect = e.currentTarget.getBoundingClientRect();
      const estimatedHeight =
        selectedBillType === "pending"
          ? 188
          : selectedBillType === "generated"
            ? 132
            : 88;
      const spaceBelow = window.innerHeight - rect.bottom;
      const openUpward = spaceBelow < estimatedHeight + 8;
      setDropdownPos({
        top: openUpward ? undefined : rect.bottom + 4,
        bottom: openUpward ? window.innerHeight - rect.top + 4 : undefined,
        right: window.innerWidth - rect.right,
        openUpward,
      });
      setActiveRowDropdown(taskId);
    }
  };

  // Close all dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest(".dropdown-container")) {
        setActiveRowDropdown(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Close row dropdown on any scroll
  useEffect(() => {
    const handleScroll = () => setActiveRowDropdown(null);
    window.addEventListener("scroll", handleScroll, true);
    return () => window.removeEventListener("scroll", handleScroll, true);
  }, []);

  // Update select all state when individual toggles change
  useEffect(() => {
    if (selectedItems.length === 0) {
      setSelectAll(false);
    } else if (selectedItems.length === displayData.length) {
      setSelectAll(true);
    }
  }, [selectedItems, displayData.length]);

  useEffect(() => {
    setSelectedItems([]);
    setSelectAll(false);
  }, [pagination.page_no, selectedBillType, filterKey]);

  const contentInset = isMinimized ? "md:pl-20" : "md:pl-[260px]";

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
        className={`pt-16 transition-all duration-300 ease-in-out ${contentInset}`}
      >
        <div className="flex h-full flex-col">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="mx-2 my-3 flex h-full flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm sm:mx-4 md:mx-8 md:my-4"
            style={{
              paddingBottom:
                selectedBillType === "pending" && selectedItems.length > 0
                  ? "7.5rem"
                  : "0",
            }}
          >
            {/* Page title + status tabs */}
            <div className="border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white px-3 py-2.5 sm:px-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <h1 className="shrink-0 text-base font-bold text-gray-800">
                  Billing
                </h1>

                <div className="flex w-full gap-1 rounded-lg bg-gray-100 p-1 sm:max-w-md sm:ml-auto">
                  {updatedBillTypeCards.map((card) => {
                    const Icon = card.icon;
                    const isActive = selectedBillType === card.value;
                    const activeTabClass =
                      card.value === "pending"
                        ? "bg-white text-orange-700 shadow-sm ring-1 ring-orange-200"
                        : card.value === "generated"
                          ? "bg-white text-emerald-700 shadow-sm ring-1 ring-emerald-200"
                          : "bg-white text-rose-700 shadow-sm ring-1 ring-rose-200";

                    return (
                      <button
                        key={card.value}
                        type="button"
                        onClick={() => {
                          if (card.value === selectedBillType) return;
                          setSelectedBillType(card.value);
                          setPagination((p) => ({ ...p, page_no: 1 }));
                          setSelectedItems([]);
                          setSelectAll(false);
                          setBillingData([]);
                        }}
                        className={`flex min-w-0 flex-1 items-center justify-center gap-1 rounded-md px-2 py-1.5 text-xs font-semibold transition-all ${
                          isActive
                            ? activeTabClass
                            : "text-gray-600 hover:bg-white/70 hover:text-gray-800"
                        }`}
                      >
                        <Icon className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{card.label}</span>
                        <span
                          className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums ${
                            isActive
                              ? card.value === "pending"
                                ? "bg-orange-100 text-orange-700"
                                : card.value === "generated"
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-rose-100 text-rose-700"
                              : "bg-gray-200/80 text-gray-600"
                          }`}
                        >
                          {formatIndianNumber(card.count)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="border-b border-gray-200">
                <div className="flex flex-col gap-2 bg-gray-50 px-3 py-2 sm:px-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="text-sm font-semibold text-gray-800">
                      {selectedBillType === "pending"
                        ? "Pending Bills"
                        : selectedBillType === "generated"
                          ? "Generated Bills"
                          : "Non-Billable Items"}{" "}
                      ({formatIndianNumber(pagination.total)})
                    </h3>
                    {showPendingColumns && selectedItems.length > 0 && (
                      <div className="flex items-center gap-2">
                        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-100 text-xs font-bold text-indigo-700">
                          {formatIndianNumber(selectedItems.length)}
                        </div>
                        <span className="text-sm font-medium text-gray-600">
                          selected
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="w-52 min-w-[13rem]">
                      <CustomSelect
                        options={serviceOptions}
                        value={optionByValue(serviceOptions, selectedService)}
                        onChange={(option) => {
                          setSelectedService(option?.value || "");
                          setPagination((p) => ({ ...p, page_no: 1 }));
                        }}
                        placeholder="All Services"
                        isClearable
                      />
                    </div>
                    <div className="w-56 min-w-[14rem]">
                      <CustomSelect
                        options={staffSelectOptions}
                        value={optionByValue(staffSelectOptions, selectedStaff)}
                        onChange={(option) => {
                          setSelectedStaff(option?.value || "");
                          setPagination((p) => ({ ...p, page_no: 1 }));
                        }}
                        placeholder="Completed By"
                        isClearable
                      />
                    </div>
                    <div className="relative w-44 min-w-[11rem]">
                      <input
                        type="text"
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        onKeyUp={(e) =>
                          setSearchQuery(e.currentTarget.value)
                        }
                        onPaste={(e) => {
                          const el = e.currentTarget;
                          requestAnimationFrame(() => setSearchQuery(el.value));
                        }}
                        placeholder="Search…"
                        className="h-10 w-full rounded-lg border border-gray-300 bg-white py-0 pl-8 pr-3 text-sm text-gray-700 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
                      />
                      <FiSearch className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                    </div>
                    <button
                      type="button"
                      onClick={handleRefreshPage}
                      disabled={loading}
                      title="Refresh"
                      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <FiRefreshCw
                        className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                      />
                    </button>
                    {hasActiveFilters && (
                      <button
                        type="button"
                        onClick={handleClearFilters}
                        className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-600 transition hover:bg-gray-50"
                      >
                        Clear filters
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full table-fixed">
                  <thead className="bg-gradient-to-r from-gray-50 to-white">
                    <tr className="border-b border-gray-200">
                      {showPendingColumns && (
                        <th className="w-9 px-1 py-3 text-center">
                          <AnimatedCheckbox
                            checked={selectAll}
                            indeterminate={isSelectionIndeterminate}
                            onChange={handleSelectAll}
                            ariaLabel="Select all rows"
                          />
                        </th>
                      )}
                      <th className="w-8 px-1 py-3 text-center text-[11px] font-bold uppercase tracking-wide text-gray-700">
                        #
                      </th>
                      <th className="w-[28%] px-3 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-gray-700">
                        Task
                      </th>
                      <th className="w-[11%] px-2 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-gray-700">
                        Dates
                      </th>
                      <th className="w-[26%] px-3 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-gray-700">
                        Client
                      </th>
                      <th className="w-[18%] px-3 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-gray-700">
                        Firm
                      </th>
                      <th className="w-12 px-1 py-3 text-center text-[11px] font-bold uppercase tracking-wide text-gray-700">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {loading ? (
                      Array.from({ length: skeletonRowCount }).map((_, i) => (
                        <tr
                          key={`skel-${i}`}
                          className={`border-b border-gray-200 ${i % 2 === 0 ? "bg-white" : "bg-gray-50/60"}`}
                        >
                          {showPendingColumns && (
                            <td className="px-2 py-3">
                              <SkeletonPulse className="mx-auto h-4 w-4" />
                            </td>
                          )}
                          <td className="px-2 py-3">
                            <SkeletonPulse className="mx-auto h-6 w-8" />
                          </td>
                          <td className="px-3 py-3">
                            <div className="space-y-2">
                              <SkeletonPulse className="h-4 w-full max-w-[160px]" />
                              <SkeletonPulse className="h-3 w-20" />
                            </div>
                          </td>
                          <td className="px-3 py-3">
                            <div className="space-y-2">
                              <SkeletonPulse className="h-3 w-full max-w-[120px]" />
                              <SkeletonPulse className="h-3 w-full max-w-[120px]" />
                              <SkeletonPulse className="h-3 w-full max-w-[120px]" />
                            </div>
                          </td>
                          <td className="px-3 py-3">
                            <div className="space-y-2">
                              <SkeletonPulse className="h-4 w-full max-w-[140px]" />
                              <SkeletonPulse className="h-3 w-full max-w-[120px]" />
                            </div>
                          </td>
                          <td className="px-3 py-3">
                            <div className="space-y-2">
                              <SkeletonPulse className="h-4 w-full max-w-[120px]" />
                              <SkeletonPulse className="h-3 w-full max-w-[100px]" />
                            </div>
                          </td>
                          <td className="px-2 py-3">
                            <SkeletonPulse className="mx-auto h-7 w-7 rounded" />
                          </td>
                        </tr>
                      ))
                    ) : displayData.length === 0 ? (
                      <tr>
                        <td
                          colSpan={tableColCount}
                          className="py-12 text-center"
                        >
                          <div className="flex flex-col items-center justify-center">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                              <TbFileInvoice className="w-8 h-8 text-gray-400" />
                            </div>
                            <p className="mb-2 text-sm font-medium text-gray-500">
                              {listError ? listError : "No records found"}
                            </p>
                            <p className="text-xs text-gray-400">
                              {listError
                                ? "Check your connection or try again later."
                                : "Try adjusting your search or filters"}
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      displayData.map((item, index) => {
                        const recurringPeriod =
                          item.is_recurring && item.recurring_type
                            ? getPreviousPeriod(
                                item.recurring_type,
                                item.due_date,
                              )
                            : "";
                        const rowNum =
                          (pagination.page_no - 1) * pagination.limit +
                          index +
                          1;
                        const isSelected = selectedItems.includes(item.task_id);

                        return (
                          <motion.tr
                            key={item.task_id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className={`group border-b border-gray-200 transition-colors duration-150 ${
                              showPendingColumns && isSelected
                                ? "bg-indigo-50/60 hover:bg-indigo-50/80"
                                : index % 2 === 0
                                  ? "bg-white hover:bg-gray-50"
                                  : "bg-gray-50/60 hover:bg-gray-100/70"
                            }`}
                          >
                            {showPendingColumns && (
                              <td className="px-1 py-3 text-center">
                                <AnimatedCheckbox
                                  checked={isSelected}
                                  onChange={() =>
                                    handleToggleSelect(item.task_id)
                                  }
                                  ariaLabel={`Select task ${item.task_id}`}
                                />
                              </td>
                            )}
                            <td className="px-1 py-3 text-center">
                              <span className="text-sm font-bold tabular-nums text-gray-800">
                                {formatIndianNumber(rowNum)}
                              </span>
                            </td>
                            <td className="px-3 py-3 align-top">
                              <div className="flex min-w-0 flex-col gap-1">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  {item.is_recurring && (
                                    <span
                                      className="inline-flex shrink-0 items-center rounded bg-rose-100 px-1.5 py-0.5 text-sm font-semibold text-rose-800"
                                      title="Compliance service"
                                    >
                                      C
                                    </span>
                                  )}
                                  <Link
                                    to={`/task/${item.task_id}`}
                                    className={`break-words ${TABLE_LINK_CLASS}`}
                                  >
                                    {item.service_name}
                                  </Link>
                                </div>
                                <span className="inline-flex w-fit items-center gap-1 rounded border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-sm font-semibold text-indigo-700">
                                  ₹
                                  {Number(
                                    item.charges_total || item.fees,
                                  ).toLocaleString("en-IN", {
                                    maximumFractionDigits: 2,
                                  })}
                                </span>
                                {item.is_recurring && recurringPeriod && (
                                  <p className={`break-words ${TABLE_CELL_TEXT}`}>
                                    {recurringPeriod}
                                  </p>
                                )}
                              </div>
                            </td>
                            <td className="px-2 py-3 align-top">
                              <div className="flex flex-col gap-1">
                                <DateLine
                                  icon={FiClock}
                                  iconClass="text-blue-500"
                                  title="Create date"
                                  value={item.create_date}
                                />
                                <DateLine
                                  icon={FiCalendar}
                                  iconClass="text-orange-500"
                                  title="Due date"
                                  value={item.due_date}
                                />
                                <DateLine
                                  icon={FiCheckCircle}
                                  iconClass="text-emerald-500"
                                  title="Complete date"
                                  value={item.complete_date}
                                />
                              </div>
                            </td>
                            <td className="px-3 py-3 align-top">
                              <div className="flex min-w-0 flex-col">
                                {item.client_username ? (
                                  <Link
                                    to={`/client/profile/${item.client_username}`}
                                    className={`mb-1 break-words ${TABLE_LINK_CLASS}`}
                                  >
                                    {item.name}
                                  </Link>
                                ) : (
                                  <p className="mb-1 break-words text-sm font-semibold text-gray-800">
                                    {item.name}
                                  </p>
                                )}
                                <div className="flex flex-col gap-0 leading-tight">
                                  {formatGuardianLine(
                                    item.care_of,
                                    item.guardian_name,
                                  ) ? (
                                    <p
                                      className={`m-0 break-words ${TABLE_CELL_TEXT}`}
                                    >
                                      {formatGuardianLine(
                                        item.care_of,
                                        item.guardian_name,
                                      )}
                                    </p>
                                  ) : null}
                                  <p
                                    className={`m-0 break-words ${TABLE_CELL_TEXT}`}
                                  >
                                    {formatClientMobile(item.mobile)}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="px-3 py-3 align-top">
                              <div className="flex min-w-0 flex-col gap-0 leading-tight">
                                <p className="m-0 break-words text-sm font-semibold text-gray-800">
                                  {item.firm_name}
                                </p>
                                {item.firm_file_no ? (
                                  <p className={`m-0 break-words ${TABLE_CELL_TEXT}`}>
                                    File: {item.firm_file_no}
                                  </p>
                                ) : null}
                                {item.firm_pan ? (
                                  <p className={`m-0 break-words ${TABLE_CELL_TEXT}`}>
                                    PAN: {item.firm_pan}
                                  </p>
                                ) : null}
                              </div>
                            </td>
                            <td className="px-2 py-3 align-top">
                              <div className="flex items-center justify-center">
                                <motion.button
                                  className="cursor-pointer rounded p-1.5 text-gray-400 transition-all duration-150 hover:bg-gray-100 hover:text-gray-700"
                                  onClick={(e) =>
                                    toggleRowDropdown(item.task_id, e)
                                  }
                                  whileHover={{ scale: 1.1 }}
                                  whileTap={{ scale: 0.9 }}
                                >
                                  <FiMoreVertical className="h-4 w-4" />
                                </motion.button>
                              </div>
                            </td>
                          </motion.tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              <TablePagination
                page={pagination.page_no}
                limit={pagination.limit}
                total={pagination.total}
                totalPages={Math.max(
                  1,
                  pagination.total_pages ||
                    Math.ceil(
                      (pagination.total || 0) / (pagination.limit || 20),
                    ),
                )}
                isLastPage={pagination.is_last_page}
                rowOptions={[5, 10, 20, 50, 100]}
                defaultRows={20}
                onPageChange={(nextPage) =>
                  setPagination((prev) => ({ ...prev, page_no: nextPage }))
                }
                onLimitChange={(nextLimit) =>
                  setPagination((prev) => ({
                    ...prev,
                    limit: nextLimit,
                    page_no: 1,
                  }))
                }
                showJump
                showFirstLast
              />
            </div>
          </motion.div>
        </div>
      </div>

      {/* Portal: Row action dropdown — rendered outside overflow container to avoid clipping */}
      {activeRowDropdown !== null &&
        createPortal(
          (() => {
            const activeItem = displayData.find(
              (item) => item.task_id === activeRowDropdown,
            );
            if (!activeItem) return null;
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
                  width: "185px",
                  zIndex: 9999,
                }}
              >
                <div className="py-1">
                  {showPendingColumns && (
                    <>
                      <button
                        className={`flex items-center w-full px-4 py-2.5 text-sm text-emerald-700 hover:bg-emerald-50 transition-colors duration-150 ${
                          !check("finance_billing_approve_reject")
                            ? "opacity-60 cursor-not-allowed hover:bg-transparent"
                            : ""
                        }`}
                        onClick={() => {
                          if (!check("finance_billing_approve_reject")) {
                            toast.error("Need Access Permission");
                          } else {
                            handleGenerateSingleTask(activeItem.task_id);
                          }
                        }}
                      >
                        {!check("finance_billing_approve_reject") ? (
                          <FiLock className="w-4 h-4 mr-3 text-slate-400" />
                        ) : (
                          <TbFileInvoice className="w-4 h-4 mr-3 text-emerald-600" />
                        )}
                        Generate Bill
                        {!check("finance_billing_approve_reject") && (
                          <FiLock className="w-3.5 h-3.5 text-slate-400 ml-auto" />
                        )}
                      </button>
                      <button
                        className={`flex items-center w-full px-4 py-2.5 text-sm text-rose-700 hover:bg-rose-50 transition-colors duration-150 ${
                          !check("finance_billing_approve_reject")
                            ? "opacity-60 cursor-not-allowed hover:bg-transparent"
                            : ""
                        }`}
                        onClick={() => {
                          if (!check("finance_billing_approve_reject")) {
                            toast.error("Need Access Permission");
                          } else {
                            handleMarkSingleNonBillable(activeItem.task_id);
                          }
                        }}
                      >
                        {!check("finance_billing_approve_reject") ? (
                          <FiLock className="w-4 h-4 mr-3 text-slate-400" />
                        ) : (
                          <MdOutlineMoneyOffCsred className="w-4 h-4 mr-3 text-rose-600" />
                        )}
                        Non Billable
                        {!check("finance_billing_approve_reject") && (
                          <FiLock className="w-3.5 h-3.5 text-slate-400 ml-auto" />
                        )}
                      </button>
                      <div className="border-t border-gray-100" />
                    </>
                  )}
                  {selectedBillType === "generated" && (
                    <>
                      <button
                        className="flex items-center w-full px-4 py-2.5 text-sm text-indigo-700 hover:bg-indigo-50 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={downloadPdfLoading === activeItem.task_id}
                        onClick={() => {
                          setActiveRowDropdown(null);
                          handleDownloadPdf(activeItem);
                        }}
                      >
                        {downloadPdfLoading === activeItem.task_id ? (
                          <>
                            <svg
                              className="animate-spin w-4 h-4 mr-3 text-indigo-500"
                              fill="none"
                              viewBox="0 0 24 24"
                            >
                              <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                              />
                              <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8v8H4z"
                              />
                            </svg>
                            Downloading…
                          </>
                        ) : (
                          <>
                            <PiFilePdfDuotone className="w-4 h-4 mr-3 text-indigo-500" />
                            Download
                          </>
                        )}
                      </button>
                      <div className="border-t border-gray-100" />
                    </>
                  )}
                  <button
                    className="flex items-center w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-150"
                    onClick={() => {
                      setActiveRowDropdown(null);
                      setDetailsItem(activeItem);
                    }}
                  >
                    <FiEye className="w-4 h-4 mr-3 text-indigo-500" />
                    Details
                  </button>
                </div>
              </motion.div>
            );
          })(),
          document.body,
        )}

      {/* Compact selection bar — pending tab only; stays above sidebar (z-45) */}
      <AnimatePresence>
        {selectedBillType === "pending" && selectedItems.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ type: "spring", damping: 26, stiffness: 320 }}
            className={`fixed bottom-0 left-0 right-0 z-[46] max-h-[min(42vh,240px)] overflow-y-auto overflow-x-hidden rounded-t-2xl border-t border-indigo-100/90 bg-white/95 pb-[max(0.35rem,env(safe-area-inset-bottom))] shadow-[0_-6px_28px_-8px_rgba(15,23,42,0.18)] backdrop-blur-md transition-[left] duration-300 ease-in-out ${
              isMinimized ? "md:left-20" : "md:left-[260px]"
            }`}
          >
            <div className="px-3 py-2 sm:px-4 sm:py-2.5">
              <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                <div className="flex min-w-0 items-start gap-2">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 text-xs font-bold text-white shadow-sm">
                    {selectedItems.length}
                  </div>
                  <div className="min-w-0 pt-0.5">
                    <p className="text-sm font-semibold text-slate-900">
                      {selectedItems.length} task
                      {selectedItems.length !== 1 ? "s" : ""} selected
                    </p>
                    <p className="mt-1 flex gap-1.5 text-[11px] leading-snug text-amber-900/90 sm:text-xs">
                      <FiInfo
                        className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600"
                        aria-hidden
                      />
                      <span>
                        Only tasks on <strong>this page</strong> can be
                        selected. Generate bill / non-billable applies to the
                        loaded rows only—go to other pages to include more
                        tasks.
                      </span>
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 sm:shrink-0 sm:justify-end">
                  <motion.button
                    type="button"
                    disabled={billingActionLoading}
                    onClick={() => {
                      if (!check("finance_billing_approve_reject")) {
                        toast.error("Need Access Permission");
                      } else {
                        handleGenerateBill();
                      }
                    }}
                    className={`inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:from-emerald-700 hover:to-teal-700 sm:px-3.5 sm:text-sm ${
                      !check("finance_billing_approve_reject")
                        ? "opacity-60 cursor-not-allowed hover:from-emerald-600 hover:to-teal-600"
                        : ""
                    }`}
                    whileTap={{ scale: billingActionLoading ? 1 : 0.97 }}
                  >
                    {billingActionLoading ? (
                      <FiRefreshCw className="h-4 w-4 animate-spin" />
                    ) : !check("finance_billing_approve_reject") ? (
                      <FiLock className="h-4 w-4" />
                    ) : (
                      <TbFileInvoice className="h-4 w-4" />
                    )}
                    Generate bill
                  </motion.button>
                  <motion.button
                    type="button"
                    disabled={billingActionLoading}
                    onClick={() => {
                      if (!check("finance_billing_approve_reject")) {
                        toast.error("Need Access Permission");
                      } else {
                        handleMarkNonBillable();
                      }
                    }}
                    className={`inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-rose-600 to-pink-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:from-rose-700 hover:to-pink-700 sm:text-sm ${
                      !check("finance_billing_approve_reject")
                        ? "opacity-60 cursor-not-allowed hover:from-rose-600 hover:to-pink-600"
                        : ""
                    }`}
                    whileTap={{ scale: billingActionLoading ? 1 : 0.97 }}
                  >
                    {!check("finance_billing_approve_reject") ? (
                      <FiLock className="h-4 w-4" />
                    ) : (
                      <MdOutlineMoneyOffCsred className="h-4 w-4" />
                    )}
                    Non-billable
                  </motion.button>
                  <motion.button
                    type="button"
                    disabled={billingActionLoading}
                    onClick={() => {
                      setSelectedItems([]);
                      setSelectAll(false);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 sm:text-sm"
                    whileTap={{ scale: billingActionLoading ? 1 : 0.97 }}
                  >
                    <FiXCircle className="h-4 w-4 text-slate-500" />
                    Clear
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Professional in-app dialog — replaces window.alert / window.confirm */}
      <AppDialog
        dialog={dialog}
        onClose={closeDialog}
        onConfirm={handleDialogConfirm}
      />

      <BillingDetailsModal
        item={detailsItem}
        onClose={() => setDetailsItem(null)}
      />
    </div>
  );
};

export default BillDisplay;
