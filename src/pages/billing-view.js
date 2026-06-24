import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Header, Sidebar } from '../components/header';
import {
    FiFileText,
    FiSearch,
    FiCheckCircle,
    FiXCircle,
    FiCalendar,
    FiMoreVertical,
    FiPrinter,
    FiMail,
    FiChevronDown,
    FiChevronLeft,
    FiChevronRight,
    FiClock,
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
    FiLock
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import { useUserPermissions } from '../utils/permission-helper';
import { PiExportBold } from "react-icons/pi";
import { PiFilePdfDuotone, PiMicrosoftExcelLogoDuotone } from "react-icons/pi";
import { AiOutlineMail } from "react-icons/ai";
import { FaWhatsapp } from "react-icons/fa6";
import { TbFileInvoice, TbCurrencyRupee } from "react-icons/tb";
import { MdOutlineAttachMoney, MdOutlineMoneyOffCsred, MdOutlineDashboard } from "react-icons/md";
import { HiOutlineDocumentText, HiOutlineTrendingUp } from "react-icons/hi";
import { BsThreeDots, BsArrowRight } from "react-icons/bs";
import EmailSelectionModal from '../components/email-selection';
import MobileSelectionModal from '../components/mobile-selection';
import { motion, AnimatePresence } from 'framer-motion';
import API_BASE_URL from '../utils/api-controller';
import getHeaders from '../utils/get-headers';

const BILL_LIST = '/billing/list';
const BILLING_STATUSES = ['pending', 'generated', 'nonbillable'];

const BILLING_GENERATE_BILLABLE = '/billing/generate/billable';
const BILLING_GENERATE_NONBILLABLE = '/billing/generate/nonbillable';
const BILLING_STATS = '/billing/stats';

const SKEL_ROW_COUNT = 8;

const SkeletonPulse = ({ className = '' }) => (
    <div className={`animate-pulse rounded-md bg-gray-200/90 ${className}`} />
);

const mapBillingStatusToBillType = (raw) => {
    if (raw == null || raw === '') return 'pending';
    const s = String(raw).toLowerCase().replace(/\s+/g, ' ').trim();
    if (s === 'non billable' || s === 'nonbillable') return 'nonbillable';
    if (s === 'generated') return 'generated';
    return 'pending';
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
        service_name: service.name || '—',
        service_id: service.service_id || '',
        fees: Number(charges.fees) || 0,
        charges_total: Number(charges.total) || 0,
        tax_rate: charges.tax_rate,
        tax_value: charges.tax_value,
        firm_name: firm.firm_name || '—',
        firm_id: firm.firm_id,
        name: profile.name || '—',
        client_username: raw.client?.username,
        pan: '—',
        file_no: '—',
        mobile: profile.mobile || '',
        email: profile.email || '',
        country_code: profile.country_code,
        create_date: dates.create_date,
        complete_date: dates.target_date || dates.due_date,
        due_date: dates.due_date,
        bill_status: mapBillingStatusToBillType(raw.billing_status),
        task_status: raw.status,
        completer_name: modifyBy.name || primaryStaff?.name || createBy.name || '—',
        completer_mobile: modifyBy.mobile || primaryStaff?.mobile || createBy.mobile || '',
        completer_user_type: modifyBy.username ? 'staff' : primaryStaff ? 'staff' : 'user',
        is_recurring: Boolean(raw.is_recurring),
        recurring_type: raw.recurring_type || '',
        staffs,
        has_ca: raw.has_ca,
        has_agent: raw.has_agent,
        invoice_id: raw.invoice_id || raw.invoice?.invoice_id || null,
        invoice_type: raw.invoice_type || raw.invoice?.type || 'sale',
        _raw: raw,
    };
};

// ─── Reusable in-app dialog ──────────────────────────────────────────────────

const DIALOG_CONFIG = {
    confirm: {
        iconBg: 'bg-indigo-100',
        iconRing: 'ring-indigo-200',
        iconColor: 'text-indigo-600',
        Icon: FiInfo,
        accentGradient: 'from-indigo-500 to-violet-500',
        confirmBtnClass:
            'bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500',
    },
    warning: {
        iconBg: 'bg-amber-100',
        iconRing: 'ring-amber-200',
        iconColor: 'text-amber-600',
        Icon: FiAlertCircle,
        accentGradient: 'from-amber-500 to-orange-500',
        confirmBtnClass:
            'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 focus:ring-amber-500',
    },
    danger: {
        iconBg: 'bg-rose-100',
        iconRing: 'ring-rose-200',
        iconColor: 'text-rose-600',
        Icon: FiAlertCircle,
        accentGradient: 'from-rose-500 to-pink-500',
        confirmBtnClass:
            'bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-700 hover:to-pink-700 focus:ring-rose-500',
    },
    success: {
        iconBg: 'bg-emerald-100',
        iconRing: 'ring-emerald-200',
        iconColor: 'text-emerald-600',
        Icon: FiCheckCircle,
        accentGradient: 'from-emerald-500 to-teal-500',
        confirmBtnClass:
            'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 focus:ring-emerald-500',
    },
    error: {
        iconBg: 'bg-rose-100',
        iconRing: 'ring-rose-200',
        iconColor: 'text-rose-600',
        Icon: FiXCircle,
        accentGradient: 'from-rose-500 to-pink-500',
        confirmBtnClass:
            'bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-700 hover:to-pink-700 focus:ring-rose-500',
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
                        transition={{ type: 'spring', damping: 28, stiffness: 380 }}
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
                                        dialog.confirmText || 'OK'
                                    )}
                                </motion.button>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>,
        document.body
    );
};

// ─────────────────────────────────────────────────────────────────────────────

const BillDisplay = () => {
    const { check } = useUserPermissions();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(() => {
        const saved = localStorage.getItem('sidebarMinimized');
        return saved ? JSON.parse(saved) : false;
    });
    /** Local input value; list API uses `searchQuery`, updated on keyup (and paste) */
    const [searchInput, setSearchInput] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const listFetchAbortRef = useRef(null);
    const listFetchSeqRef = useRef(0);

    // Bill type tabs state - default to 'pending' as requested
    const [selectedBillType, setSelectedBillType] = useState('pending');

    // Bill type cards data - Only 3 cards: Pending, Generated, Non-Billable
    const billTypeCards = [
        {
            value: 'pending',
            label: 'Pending',
            icon: FiClock,
            color: 'orange',
            bgColor: 'from-orange-50 to-amber-50',
            borderColor: 'border-orange-200',
            textColor: 'text-orange-700',
            hoverColor: 'hover:from-orange-100 hover:to-amber-100',
            activeColor: 'from-orange-500 to-amber-500',
            description: 'Awaiting billing',
            gradient: 'bg-gradient-to-r from-orange-500 to-amber-500',
            cardGradient: 'bg-gradient-to-br from-orange-500/5 via-orange-400/3 to-amber-500/5',
            lightGradient: 'bg-gradient-to-br from-orange-50/80 via-amber-50/50 to-yellow-50/30',
            countColor: 'bg-gradient-to-r from-orange-500 to-amber-500',
            chartColor: '#f97316',
            subDescription: 'Need action',
            iconBg: 'bg-gradient-to-br from-orange-500/15 to-amber-500/15',
        },
        {
            value: 'generated',
            label: 'Generated',
            icon: HiOutlineDocumentText,
            color: 'green',
            bgColor: 'from-emerald-50 to-teal-50',
            borderColor: 'border-emerald-200',
            textColor: 'text-emerald-700',
            hoverColor: 'hover:from-emerald-100 hover:to-teal-100',
            activeColor: 'from-emerald-500 to-teal-500',
            description: 'Bills created',
            gradient: 'bg-gradient-to-r from-emerald-500 to-teal-500',
            cardGradient: 'bg-gradient-to-br from-emerald-500/5 via-emerald-400/3 to-teal-500/5',
            lightGradient: 'bg-gradient-to-br from-emerald-50/80 via-teal-50/50 to-cyan-50/30',
            countColor: 'bg-gradient-to-r from-emerald-500 to-teal-500',
            chartColor: '#10b981',
            subDescription: 'Ready for payment',
            iconBg: 'bg-gradient-to-br from-emerald-500/15 to-teal-500/15',
        },
        {
            value: 'nonbillable',
            label: 'Non-Billable',
            icon: MdOutlineMoneyOffCsred,
            color: 'red',
            bgColor: 'from-rose-50 to-pink-50',
            borderColor: 'border-rose-200',
            textColor: 'text-rose-700',
            hoverColor: 'hover:from-rose-100 hover:to-pink-100',
            activeColor: 'from-rose-500 to-pink-500',
            description: 'Marked non-billable',
            gradient: 'bg-gradient-to-r from-rose-500 to-pink-500',
            cardGradient: 'bg-gradient-to-br from-rose-500/5 via-rose-400/3 to-pink-500/5',
            lightGradient: 'bg-gradient-to-br from-rose-50/80 via-pink-50/50 to-red-50/30',
            countColor: 'bg-gradient-to-r from-rose-500 to-pink-500',
            chartColor: '#f43f5e',
            subDescription: 'Write off',
            iconBg: 'bg-gradient-to-br from-rose-500/15 to-pink-500/15',
        }
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

    // State for dropdown menus
    const [showExportDropdown, setShowExportDropdown] = useState(false);
    const [activeRowDropdown, setActiveRowDropdown] = useState(null);
    const [dropdownPos, setDropdownPos] = useState({ top: 0, right: 0 });
    const [exportModal, setExportModal] = useState({ open: false, type: '', data: null });

    const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
    const [isWhatsappModalOpen, setWhatsappModalOpen] = useState(false);

    // ── In-app dialog (replaces window.alert / window.confirm) ──────────────
    const [dialog, setDialog] = useState({
        open: false,
        variant: 'confirm',
        title: '',
        message: '',
        confirmText: 'Confirm',
        cancelText: 'Cancel',
        onConfirm: null,
        loading: false,
    });

    const showConfirm = ({ variant = 'warning', title, message, confirmText = 'Confirm', cancelText = 'Cancel', onConfirm }) => {
        setDialog({ open: true, variant, title, message, confirmText, cancelText, onConfirm, loading: false });
    };

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
                confirmText: 'Close',
                cancelText: null,
                onConfirm: null,
                loading: false,
            });
        } else {
            setDialog((prev) => ({ ...prev, open: false, loading: false, onConfirm: null }));
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
                        page_no: '1',
                        limit: '1',
                        status,
                    });
                    return fetch(`${API_BASE_URL}${BILL_LIST}?${params.toString()}`, {
                        method: 'GET',
                        headers,
                    }).then((r) => r.json());
                })
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
            console.error('Billing tab counts:', e);
        }
    }, []);

    const fetchBillingList = useCallback(
        async (tab, pageNo) => {
            const headers = getHeaders();
            if (!headers) {
                setListError('Missing authentication. Please sign in again.');
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
                const status = String(tab || '').toLowerCase();
                if (!BILLING_STATUSES.includes(status)) {
                    throw new Error('Unknown billing list status');
                }
                const params = new URLSearchParams({
                    page_no: String(pageNo),
                    limit: String(pagination.limit),
                    status,
                });
                const q = searchQuery.trim();
                if (q) params.append('search', q);

                const response = await fetch(`${API_BASE_URL}${BILL_LIST}?${params.toString()}`, {
                    method: 'GET',
                    headers,
                    signal: ac.signal,
                });
                const json = await response.json();

                if (!response.ok) {
                    throw new Error(json?.message || `Request failed (${response.status})`);
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
                    setListError(json?.message || 'Unexpected response from server');
                }
            } catch (e) {
                if (e.name === 'AbortError') return;
                console.error('Billing list fetch:', e);
                setBillingData([]);
                setListError(e.message || 'Failed to load billing list');
            } finally {
                if (seq === listFetchSeqRef.current) {
                    setLoading(false);
                }
            }
        },
        [searchQuery, pagination.limit]
    );

    const filterKey = searchQuery.trim();
    const prevFilterKeyRef = useRef(null);

    useEffect(() => {
        fetchTabCounts();
    }, [fetchTabCounts]);

    useEffect(() => {
        const filtersChanged =
            prevFilterKeyRef.current !== null && prevFilterKeyRef.current !== filterKey;
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

    const allTabsCount =
        countsByTab.pending + countsByTab.generated + countsByTab.nonbillable;

    const updatedBillTypeCards = billTypeCards.map((card) => ({
        ...card,
        count: countsByTab[card.value] ?? 0,
    }));

    const displayData = billingData;
    const tableColCount = selectedBillType === 'pending' ? 6 : 5;
    const showPendingColumns = selectedBillType === 'pending';

    // Persist sidebar minimized state
    useEffect(() => {
        localStorage.setItem('sidebarMinimized', JSON.stringify(isMinimized));
    }, [isMinimized]);

    // Lock body scroll when mobile sidebar is open
    useEffect(() => {
        if (mobileMenuOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'auto';
        }
        return () => {
            document.body.style.overflow = 'auto';
        };
    }, [mobileMenuOpen]);

    // Format date for display
    const formatDate = (dateString) => {
        if (dateString == null || dateString === '') return '—';
        const date = new Date(dateString);
        if (Number.isNaN(date.getTime())) return '—';
        const day = String(date.getDate()).padStart(2, '0');
        const month = date.toLocaleString('en-US', { month: 'short' });
        const year = date.getFullYear();
        return `${day} ${month} ${year}`;
    };

    // Get previous period for recurring tasks
    const getPreviousPeriod = (type, due_date) => {
        if (!due_date) return 'INVALID';

        const date = new Date(due_date);
        const month = date.getMonth() + 1;

        if (type === 'monthly') {
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const previousMonthIndex = (date.getMonth() - 1 + 12) % 12;
            return months[previousMonthIndex];
        } else if (type === 'quarterly') {
            const currentQuarter = Math.ceil(month / 3);
            const previousQuarter = currentQuarter === 1 ? 4 : currentQuarter - 1;

            const quarters = {
                1: "Jan - Mar",
                2: "Apr - Jun",
                3: "Jul - Sep",
                4: "Oct - Dec"
            };

            return quarters[previousQuarter];
        } else if (type === 'half yearly') {
            let currentHalf, previousHalf;

            if (month >= 4 && month <= 9) {
                currentHalf = "Apr - Sep";
                previousHalf = "Oct - Mar";
            } else {
                currentHalf = "Oct - Mar";
                previousHalf = "Apr - Sep";
            }

            return previousHalf;
        } else if (type === 'yearly') {
            const year = date.getFullYear();
            const startFY = month <= 3 ? year - 1 : year;
            const endFY = String(startFY + 1).slice(-2);

            return `FY ${startFY}-${endFY}`;
        }
        return 'INVALID';
    };

    // Handle individual toggle selection
    const handleToggleSelect = (taskId) => {
        setSelectedItems(prev => {
            if (prev.includes(taskId)) {
                return prev.filter(id => id !== taskId);
            } else {
                return [...prev, taskId];
            }
        });
    };

    // Handle select all
    const handleSelectAll = () => {
        if (selectAll) {
            setSelectedItems([]);
        } else {
            setSelectedItems(displayData.map(item => item.task_id));
        }
        setSelectAll(!selectAll);
    };

    const handleGenerateBill = () => {
        if (selectedItems.length === 0 || billingActionLoading) return;
        const count = selectedItems.length;
        const snapshotIds = [...selectedItems];
        showConfirm({
            variant: 'warning',
            title: 'Generate Bill',
            message: `You are about to generate invoice${count !== 1 ? 's' : ''} for ${count} selected task${count !== 1 ? 's' : ''}. This action cannot be undone.`,
            confirmText: 'Generate',
            cancelText: 'Cancel',
            onConfirm: async () => {
                const headers = getHeaders();
                if (!headers) {
                    return { variant: 'error', title: 'Authentication Error', message: 'Missing authentication. Please sign in again.' };
                }
                setBillingActionLoading(true);
                try {
                    const response = await fetch(`${API_BASE_URL}${BILLING_GENERATE_BILLABLE}`, {
                        method: 'POST',
                        headers: { ...headers, 'Content-Type': 'application/json' },
                        body: JSON.stringify({ task_ids: snapshotIds }),
                    });
                    const json = await response.json().catch(() => ({}));
                    if (response.ok && json.success) {
                        const inv = json.data?.invoice_no ? ` Invoice No: ${json.data.invoice_no}.` : '';
                        setSelectedItems([]);
                        setSelectAll(false);
                        fetchTabCounts();
                        fetchBillingList(selectedBillType, pagination.page_no);
                        return {
                            variant: 'success',
                            title: 'Bill Generated!',
                            message: (json.message || 'Bill generated successfully.') + inv,
                        };
                    } else {
                        return {
                            variant: 'error',
                            title: 'Failed to Generate',
                            message: json.message || `Could not generate bill (${response.status})`,
                        };
                    }
                } catch (e) {
                    console.error('Generate bill:', e);
                    return { variant: 'error', title: 'Error', message: e.message || 'Failed to generate bill' };
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
            variant: 'danger',
            title: 'Mark as Non-Billable',
            message: `${count} task${count !== 1 ? 's' : ''} will be marked as non-billable. This cannot be undone from here.`,
            confirmText: 'Mark Non-Billable',
            cancelText: 'Cancel',
            onConfirm: async () => {
                const headers = getHeaders();
                if (!headers) {
                    return { variant: 'error', title: 'Authentication Error', message: 'Missing authentication. Please sign in again.' };
                }
                setBillingActionLoading(true);
                try {
                    const response = await fetch(`${API_BASE_URL}${BILLING_GENERATE_NONBILLABLE}`, {
                        method: 'POST',
                        headers: { ...headers, 'Content-Type': 'application/json' },
                        body: JSON.stringify({ task_ids: snapshotIds }),
                    });
                    const json = await response.json().catch(() => ({}));
                    if (response.ok && json.success) {
                        setSelectedItems([]);
                        setSelectAll(false);
                        fetchTabCounts();
                        fetchBillingList(selectedBillType, pagination.page_no);
                        return {
                            variant: 'success',
                            title: 'Done',
                            message: json.message || 'Tasks marked as non-billable.',
                        };
                    } else {
                        return {
                            variant: 'error',
                            title: 'Failed',
                            message: json.message || `Could not update tasks (${response.status})`,
                        };
                    }
                } catch (e) {
                    console.error('Non-billable:', e);
                    return { variant: 'error', title: 'Error', message: e.message || 'Failed to mark tasks as non-billable' };
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
            variant: 'warning',
            title: 'Generate Bill',
            message: 'An invoice will be created for this task. This action cannot be undone.',
            confirmText: 'Generate',
            cancelText: 'Cancel',
            onConfirm: async () => {
                const headers = getHeaders();
                if (!headers) {
                    return { variant: 'error', title: 'Authentication Error', message: 'Missing authentication. Please sign in again.' };
                }
                setBillingActionLoading(true);
                try {
                    const response = await fetch(`${API_BASE_URL}${BILLING_GENERATE_BILLABLE}`, {
                        method: 'POST',
                        headers: { ...headers, 'Content-Type': 'application/json' },
                        body: JSON.stringify({ task_ids: [taskId] }),
                    });
                    const json = await response.json().catch(() => ({}));
                    if (response.ok && json.success) {
                        const inv = json.data?.invoice_no ? ` Invoice No: ${json.data.invoice_no}.` : '';
                        fetchTabCounts();
                        fetchBillingList(selectedBillType, pagination.page_no);
                        return {
                            variant: 'success',
                            title: 'Bill Generated!',
                            message: (json.message || 'Bill generated successfully.') + inv,
                        };
                    } else {
                        return {
                            variant: 'error',
                            title: 'Failed to Generate',
                            message: json.message || `Could not generate bill (${response.status})`,
                        };
                    }
                } catch (e) {
                    console.error('Generate single bill:', e);
                    return { variant: 'error', title: 'Error', message: e.message || 'Failed to generate bill' };
                } finally {
                    setBillingActionLoading(false);
                }
            },
        });
    };

    const handleDownloadPdf = async (item) => {
        if (!item.invoice_id) {
            showConfirm({
                variant: 'warning',
                title: 'No Invoice',
                message: 'No invoice ID found for this bill.',
                confirmText: 'OK',
                cancelText: null,
                onConfirm: async () => { },
            });
            return;
        }
        setDownloadPdfLoading(item.task_id);
        try {
            const headers = getHeaders();
            if (!headers) throw new Error('Missing authentication.');
            const response = await fetch(`${API_BASE_URL}/invoice/generate`, {
                method: 'POST',
                headers: { ...headers, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    invoice_id: item.invoice_id,
                    type: item.invoice_type || 'sale',
                    response: 'pdf',
                }),
            });
            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                throw new Error(err?.message || `Request failed (${response.status})`);
            }
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `invoice-${item.invoice_id}.pdf`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
        } catch (e) {
            console.error('Download PDF:', e);
            showConfirm({
                variant: 'danger',
                title: 'Download Failed',
                message: e.message || 'Failed to download invoice PDF.',
                confirmText: 'OK',
                cancelText: null,
                onConfirm: async () => { },
            });
        } finally {
            setDownloadPdfLoading(null);
        }
    };

    const getBillTypeColor = (type) => {
        const colors = {
            pending: 'orange',
            generated: 'green',
            nonbillable: 'red'
        };
        return colors[type] || 'gray';
    };

    const getBillTypeIcon = (type) => {
        const icons = {
            pending: FiClock,
            generated: HiOutlineDocumentText,
            nonbillable: MdOutlineMoneyOffCsred
        };
        return icons[type] || FiFileText;
    };

    // Handle export
    const handleExport = (type, data = null) => {
        setExportModal({ open: true, type, data });

        // Simulate export process
        setTimeout(() => {
            setExportModal({ open: false, type: '', data: null });
            showConfirm({
                variant: 'success',
                title: 'Export Complete',
                message: `Your ${type.toUpperCase()} file has been exported successfully.`,
                confirmText: 'Close',
                cancelText: null,
                onConfirm: null,
            });
        }, 1500);
    };

    const handleEmailSubmit = (email) => {
        setIsEmailModalOpen(false);
        console.log('Selected email:', email);
    };

    const handleWhatsappSubmit = (number) => {
        setWhatsappModalOpen(false);
        console.log('Selected number:', number);
    };

    // Toggle row dropdown — captures button position for fixed portal.
    // Auto-detects whether to open upward or downward based on available viewport space.
    const toggleRowDropdown = (taskId, e) => {
        if (activeRowDropdown === taskId) {
            setActiveRowDropdown(null);
        } else {
            const rect = e.currentTarget.getBoundingClientRect();
            // Pending tab has 6 items (~248px), other tabs have 3 items (~132px)
            const estimatedHeight = showPendingColumns ? 252 : 136;
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
            if (!event.target.closest('.dropdown-container')) {
                setShowExportDropdown(false);
                setActiveRowDropdown(null);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Close row dropdown on any scroll
    useEffect(() => {
        const handleScroll = () => setActiveRowDropdown(null);
        window.addEventListener('scroll', handleScroll, true);
        return () => window.removeEventListener('scroll', handleScroll, true);
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
    }, [pagination.page_no, selectedBillType]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 ">
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

            {/* Main content */}
            <div className={`pt-16 transition-all duration-300 ease-in-out ${isMinimized ? 'md:pl-20' : 'md:pl-[260px]'}`}>
                <div className="px-4 sm:px-6 lg:px-8 py-4">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4 }}
                        className="flex flex-col space-y-6"
                        style={{
                            paddingBottom:
                                selectedBillType === 'pending' && selectedItems.length > 0
                                    ? '7.5rem'
                                    : '0',
                        }}
                    >
                        {/* Header Section */}
                        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-xl relative z-10 overflow-hidden">
                            <div className="border-b border-gray-200/60 px-6 py-4 bg-gradient-to-r from-gray-50 to-white">
                                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                                    <div className="flex-1 min-w-0">
                                        <h5 className="text-xl font-bold text-gray-900 mb-1 truncate">
                                            Billing
                                        </h5>
                                        <p className="text-xs text-gray-500">
                                            {pagination.total} task{pagination.total !== 1 ? 's' : ''} in this list
                                        </p>
                                    </div>

                                    <div className="w-full lg:w-auto">
                                        <div className="flex flex-col lg:flex-row gap-3">
                                            <div className="flex gap-2">
                                                <div className="relative flex-1 lg:flex-none lg:w-64">
                                                    <input
                                                        type="text"
                                                        value={searchInput}
                                                        onChange={(e) => setSearchInput(e.target.value)}
                                                        onKeyUp={(e) => setSearchQuery(e.currentTarget.value)}
                                                        onPaste={(e) => {
                                                            const el = e.currentTarget;
                                                            requestAnimationFrame(() =>
                                                                setSearchQuery(el.value)
                                                            );
                                                        }}
                                                        placeholder="Search…"
                                                        className="pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white outline-none transition-all w-full"
                                                    />
                                                    <FiSearch className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                                                </div>

                                                {/* Export Dropdown */}
                                                {/* Export Dropdown */}
                                                <div className="dropdown-container relative">
                                                    <motion.button
                                                        onClick={() => setShowExportDropdown(!showExportDropdown)}
                                                        className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-2 shadow-lg hover:shadow-xl whitespace-nowrap"
                                                        whileHover={{ scale: 1.02, y: -1 }}
                                                        whileTap={{ scale: 0.98 }}
                                                    >
                                                        <PiExportBold className="w-4 h-4" />
                                                        <span className="hidden sm:inline">Export</span>
                                                        <FiChevronDown className={`w-4 h-4 transition-transform ${showExportDropdown ? 'rotate-180' : ''}`} />
                                                    </motion.button>

                                                    <AnimatePresence>
                                                        {showExportDropdown && (
                                                            <motion.div
                                                                initial={{ opacity: 0, y: -10 }}
                                                                animate={{ opacity: 1, y: 0 }}
                                                                exit={{ opacity: 0, y: -10 }}
                                                                className="fixed lg:absolute right-0 lg:right-auto mt-2 w-56 bg-white rounded-xl shadow-2xl border border-gray-200 z-[9999] overflow-hidden"
                                                                style={{
                                                                    top: 'calc(100% + 8px)',
                                                                    left: 'auto',
                                                                    right: '0'
                                                                }}
                                                            >
                                                                <div className="py-1">
                                                                    <button
                                                                        onClick={() => handleExport('pdf')}
                                                                        className="flex items-center w-full px-4 py-3 text-sm text-gray-700 hover:bg-indigo-50 transition-colors duration-150"
                                                                    >
                                                                        <PiFilePdfDuotone className="w-4 h-4 mr-3 text-red-500" />
                                                                        Export as PDF
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleExport('excel')}
                                                                        className="flex items-center w-full px-4 py-3 text-sm text-gray-700 hover:bg-indigo-50 transition-colors duration-150"
                                                                    >
                                                                        <PiMicrosoftExcelLogoDuotone className="w-4 h-4 mr-3 text-green-500" />
                                                                        Export as Excel
                                                                    </button>
                                                                    <div className="border-t border-gray-100">
                                                                        <button
                                                                            onClick={() => setWhatsappModalOpen(true)}
                                                                            className="flex items-center w-full px-4 py-3 text-sm text-gray-700 hover:bg-indigo-50 transition-colors duration-150"
                                                                        >
                                                                            <FaWhatsapp className="w-4 h-4 mr-3 text-green-500" />
                                                                            Share via WhatsApp
                                                                        </button>
                                                                        <button
                                                                            onClick={() => setIsEmailModalOpen(true)}
                                                                            className="flex items-center w-full px-4 py-3 text-sm text-gray-700 hover:bg-indigo-50 transition-colors duration-150"
                                                                        >
                                                                            <AiOutlineMail className="w-4 h-4 mr-3 text-blue-500" />
                                                                            Share via Email
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </motion.div>
                                                        )}
                                                    </AnimatePresence>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Cards Section - Only 3 cards: Pending, Generated, Non-Billable */}
                        <div className="grid grid-cols-3 gap-3 relative z-0">
                            {updatedBillTypeCards.map((card) => {
                                const Icon = card.icon;
                                const isActive = selectedBillType === card.value;
                                return (
                                    <motion.div
                                        key={card.value}
                                        whileHover={{ y: -2 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => {
                                            if (card.value === selectedBillType) return;
                                            setSelectedBillType(card.value);
                                            setPagination((p) => ({ ...p, page_no: 1 }));
                                            setSelectedItems([]);
                                            setSelectAll(false);
                                            setBillingData([]);
                                        }}
                                        className={`relative cursor-pointer overflow-hidden rounded-2xl border transition-all duration-200 ${isActive
                                            ? `border ${card.borderColor} shadow-lg shadow-${card.color}-500/10 ring-1 ring-${card.color}-200`
                                            : 'border-gray-200 shadow-sm hover:shadow-md'
                                            } ${card.lightGradient} backdrop-blur-sm`}
                                    >
                                        <div className={`absolute inset-0 ${card.cardGradient}`}></div>

                                        {isActive && (
                                            <div className="absolute top-0 right-0 w-2 h-2">
                                                <motion.div
                                                    initial={{ scale: 0 }}
                                                    animate={{ scale: 1 }}
                                                    className={`w-2 h-2 rounded-full ${card.gradient}`}
                                                />
                                            </div>
                                        )}

                                        <div className="relative p-3">
                                            <div className="flex items-center justify-between gap-2 mb-2">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <div
                                                        className={`w-7 h-7 rounded-lg ${card.iconBg} flex items-center justify-center flex-shrink-0`}
                                                    >
                                                        <Icon className={`w-3.5 h-3.5 ${card.textColor}`} />
                                                    </div>
                                                    <h3
                                                        className={`text-xs font-semibold ${card.textColor} truncate`}
                                                    >
                                                        {card.label}
                                                    </h3>
                                                </div>
                                                <div
                                                    className={`text-xs px-2 py-0.5 rounded-full ${card.countColor} text-white font-bold flex-shrink-0`}
                                                >
                                                    {card.count}
                                                </div>
                                            </div>
                                            <p className="text-[10px] text-gray-500 leading-tight mb-2">
                                                {card.subDescription}
                                            </p>
                                            <div className="w-full bg-gray-200/50 rounded-full h-1">
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{
                                                        width: `${allTabsCount > 0 ? (card.count / allTabsCount) * 100 : 0}%`,
                                                    }}
                                                    transition={{ duration: 0.8, ease: 'easeOut' }}
                                                    className={`h-1 rounded-full ${card.gradient}`}
                                                />
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>

                        {/* Table Section */}
                        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                            {/* Table Header */}
                            <div className="border-b border-gray-200">
                                <div className="px-4 py-3 bg-gray-50 flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <h3 className="text-sm font-semibold text-gray-700">
                                            {selectedBillType === 'pending'
                                                ? 'Pending Bills'
                                                : selectedBillType === 'generated'
                                                    ? 'Generated Bills'
                                                    : 'Non-Billable Items'}{' '}
                                            ({pagination.total})
                                        </h3>
                                        {showPendingColumns && selectedItems.length > 0 && (
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 flex items-center justify-center bg-indigo-100 text-indigo-700 rounded-md text-xs font-bold">
                                                    {selectedItems.length}
                                                </div>
                                                <span className="text-sm text-gray-600">selected</span>
                                            </div>
                                        )}
                                    </div>
                                    {showPendingColumns && (
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={handleSelectAll}
                                                className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
                                            >
                                                <div
                                                    className={`relative w-8 h-4 rounded-full transition-colors duration-300 ${selectAll ? 'bg-indigo-600' : 'bg-gray-300'}`}
                                                >
                                                    <motion.div
                                                        className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow ${selectAll ? 'left-4' : 'left-0.5'}`}
                                                        layout
                                                        transition={{
                                                            type: 'spring',
                                                            stiffness: 500,
                                                            damping: 30,
                                                        }}
                                                    />
                                                    {selectAll && (
                                                        <div className="absolute inset-0 flex items-center justify-center">
                                                            <FiCheckCircle className="w-1.5 h-1.5 text-white absolute left-1" />
                                                        </div>
                                                    )}
                                                </div>
                                                <span>Select All</span>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full min-w-full">
                                    <thead className="bg-gray-50">
                                        <tr className="border-b border-gray-200">
                                            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider w-14">
                                                #
                                            </th>
                                            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider min-w-[200px]">
                                                Task
                                            </th>
                                            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider min-w-[140px]">
                                                Dates
                                            </th>
                                            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider min-w-[180px]">
                                                Client
                                            </th>
                                            {showPendingColumns && (
                                                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider min-w-[160px]">
                                                    Completed By
                                                </th>
                                            )}
                                            <th className="text-center py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider w-32">
                                                Action
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {loading ? (
                                            Array.from({ length: SKEL_ROW_COUNT }).map((_, i) => (
                                                <tr key={`skel-${i}`} className="border-b border-gray-100">
                                                    <td className="py-3 px-4">
                                                        <SkeletonPulse className="h-6 w-10" />
                                                    </td>
                                                    <td className="py-3 px-4">
                                                        <div className="flex items-start gap-3">
                                                            <SkeletonPulse className="w-8 h-8 rounded-md flex-shrink-0" />
                                                            <div className="flex-1 space-y-2">
                                                                <SkeletonPulse className="h-4 w-36" />
                                                                <SkeletonPulse className="h-3 w-20" />
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="py-3 px-4">
                                                        <div className="space-y-2">
                                                            <SkeletonPulse className="h-3 w-28" />
                                                            <SkeletonPulse className="h-3 w-24" />
                                                        </div>
                                                    </td>
                                                    <td className="py-3 px-4">
                                                        <div className="space-y-2">
                                                            <SkeletonPulse className="h-4 w-24" />
                                                            <SkeletonPulse className="h-3 w-32" />
                                                            <SkeletonPulse className="h-3 w-20" />
                                                        </div>
                                                    </td>
                                                    {showPendingColumns && (
                                                        <td className="py-3 px-4">
                                                            <div className="space-y-2">
                                                                <SkeletonPulse className="h-4 w-24" />
                                                                <SkeletonPulse className="h-3 w-20" />
                                                                <SkeletonPulse className="h-5 w-12 rounded" />
                                                            </div>
                                                        </td>
                                                    )}
                                                    <td className="py-3 px-4">
                                                        <div className="flex justify-center">
                                                            <SkeletonPulse className="h-7 w-7 rounded" />
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : displayData.length === 0 ? (
                                            <tr>
                                                <td colSpan={tableColCount} className="py-12 text-center">
                                                    <div className="flex flex-col items-center justify-center">
                                                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                                                            <TbFileInvoice className="w-8 h-8 text-gray-400" />
                                                        </div>
                                                        <p className="text-gray-500 font-medium mb-2">
                                                            {listError ? listError : 'No records found'}
                                                        </p>
                                                        <p className="text-gray-400 text-sm">
                                                            {listError
                                                                ? 'Check your connection or try again later.'
                                                                : 'Try adjusting your search or filters'}
                                                        </p>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : (
                                            displayData.map((item, index) => {
                                                const recurringPeriod = item.is_recurring && item.recurring_type ?
                                                    getPreviousPeriod(item.recurring_type, item.due_date) : '';
                                                const rowNum =
                                                    (pagination.page_no - 1) * pagination.limit + index + 1;
                                                const isSelected = selectedItems.includes(item.task_id);
                                                const billStatusColor = getBillTypeColor(item.bill_status);
                                                const Icon = getBillTypeIcon(item.bill_status);

                                                return (
                                                    <motion.tr
                                                        key={item.task_id}
                                                        initial={{ opacity: 0 }}
                                                        animate={{ opacity: 1 }}
                                                        className={`group hover:bg-gray-50/50 transition-colors duration-150 ${showPendingColumns && isSelected ? 'bg-indigo-50/50' : ''}`}
                                                    >
                                                        <td className="py-3 px-4">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-6 h-6 flex items-center justify-center bg-gray-100 rounded text-xs font-medium text-gray-700 flex-shrink-0">
                                                                    {rowNum}
                                                                </div>
                                                                {showPendingColumns && (
                                                                    <motion.button
                                                                        onClick={() => handleToggleSelect(item.task_id)}
                                                                        className={`relative w-7 h-3.5 rounded-full transition-colors duration-300 flex-shrink-0 ${isSelected ? 'bg-indigo-600' : 'bg-gray-300'}`}
                                                                        whileTap={{ scale: 0.95 }}
                                                                    >
                                                                        <motion.div
                                                                            className={`absolute top-0.5 w-2.5 h-2.5 bg-white rounded-full shadow ${isSelected ? 'left-3.5' : 'left-0.5'}`}
                                                                            layout
                                                                            transition={{
                                                                                type: 'spring',
                                                                                stiffness: 500,
                                                                                damping: 30,
                                                                            }}
                                                                        />
                                                                        {isSelected && (
                                                                            <div className="absolute inset-0 flex items-center justify-center">
                                                                                <FiCheckCircle className="w-1.5 h-1.5 text-white absolute left-1" />
                                                                            </div>
                                                                        )}
                                                                    </motion.button>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="py-3 px-4">
                                                            <div className="flex items-start gap-3">
                                                                <div className={`w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 ${billStatusColor === 'orange' ? 'bg-orange-100' :
                                                                    billStatusColor === 'green' ? 'bg-emerald-100' :
                                                                        billStatusColor === 'red' ? 'bg-rose-100' :
                                                                            'bg-indigo-100'
                                                                    }`}>
                                                                    <Icon className={`w-4 h-4 ${billStatusColor === 'orange' ? 'text-orange-600' :
                                                                        billStatusColor === 'green' ? 'text-emerald-600' :
                                                                            billStatusColor === 'red' ? 'text-rose-600' :
                                                                                'text-indigo-600'
                                                                        }`} />
                                                                </div>
                                                                <div className="min-w-0 flex-1">
                                                                    <div className="flex items-center gap-2 mb-1">
                                                                        <h4 className="font-medium text-gray-900 text-sm truncate">
                                                                            {item.service_name}
                                                                        </h4>
                                                                        {item.is_recurring && (
                                                                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-rose-100 text-rose-800">
                                                                                R
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <span className="text-emerald-700 font-bold text-sm">
                                                                        ₹
                                                                        {Number(
                                                                            item.charges_total || item.fees
                                                                        ).toLocaleString(undefined, {
                                                                            maximumFractionDigits: 2,
                                                                        })}
                                                                    </span>
                                                                    {item.is_recurring && recurringPeriod && (
                                                                        <p className="text-xs text-gray-500 mt-0.5 truncate">
                                                                            {recurringPeriod}
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="py-3 px-4">
                                                            <div className="space-y-1">
                                                                <div className="flex items-center gap-2 text-sm">
                                                                    <FiCalendar className="w-3 h-3 text-gray-400 flex-shrink-0" />
                                                                    <span className="text-gray-700">
                                                                        <span className="text-gray-400 text-xs mr-1">
                                                                            Created
                                                                        </span>
                                                                        {formatDate(item.create_date)}
                                                                    </span>
                                                                </div>
                                                                <div className="flex items-center gap-2 text-sm">
                                                                    <FiCheckCircle className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                                                                    <span className="text-emerald-600">
                                                                        <span className="text-gray-400 text-xs mr-1">
                                                                            Target
                                                                        </span>
                                                                        {formatDate(item.complete_date)}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="py-3 px-4">
                                                            <div>
                                                                <h4 className="font-medium text-gray-900 text-sm mb-1 truncate">
                                                                    {item.name}
                                                                </h4>
                                                                <p className="text-gray-500 text-xs truncate mb-1">
                                                                    {item.firm_name}
                                                                </p>
                                                                <p className="text-gray-500 text-xs truncate">
                                                                    {item.email || item.mobile || '—'}
                                                                </p>
                                                            </div>
                                                        </td>
                                                        {showPendingColumns && (
                                                            <td className="py-3 px-4">
                                                                <div className="space-y-1">
                                                                    <h4 className="font-medium text-gray-900 text-sm truncate">
                                                                        {item.completer_name}
                                                                    </h4>
                                                                    <p className="text-gray-600 text-sm truncate">
                                                                        {item.completer_mobile}
                                                                    </p>
                                                                    <span
                                                                        className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${item.completer_user_type === 'manager'
                                                                            ? 'bg-purple-100 text-purple-800'
                                                                            : 'bg-blue-100 text-blue-800'
                                                                            }`}
                                                                    >
                                                                        {String(
                                                                            item.completer_user_type || 'staff'
                                                                        ).toUpperCase()}
                                                                    </span>
                                                                </div>
                                                            </td>
                                                        )}
                                                        <td className="py-3 px-4">
                                                            <div className="flex items-center justify-center">
                                                                <motion.button
                                                                    className="p-1.5 text-gray-400 hover:text-gray-700 rounded hover:bg-gray-100 transition-all duration-150 cursor-pointer"
                                                                    onClick={(e) => toggleRowDropdown(item.task_id, e)}
                                                                    whileHover={{ scale: 1.1 }}
                                                                    whileTap={{ scale: 0.9 }}
                                                                >
                                                                    <FiMoreVertical className="w-4 h-4" />
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

                            <div className="border-t border-gray-200 px-4 py-3 bg-gray-50 flex flex-wrap items-center justify-between gap-3">
                                <div className="flex flex-wrap items-center gap-4">
                                    <p className="text-xs text-gray-600">
                                        Page {pagination.page_no} of {pagination.total_pages} · {pagination.total} total
                                    </p>
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-xs text-gray-500">Show</span>
                                        <select
                                            value={pagination.limit}
                                            onChange={(e) =>
                                                setPagination((p) => ({
                                                    ...p,
                                                    limit: Number(e.target.value),
                                                    page_no: 1,
                                                }))
                                            }
                                            className="text-xs border border-gray-300 rounded-md px-1.5 py-1 bg-white focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none cursor-pointer"
                                        >
                                            {[5, 10, 20, 50, 100].map((n) => (
                                                <option key={n} value={n}>{n}</option>
                                            ))}
                                        </select>
                                        <span className="text-xs text-gray-500">per page</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <motion.button
                                        type="button"
                                        disabled={pagination.page_no <= 1 || loading}
                                        onClick={() =>
                                            setPagination((p) => ({
                                                ...p,
                                                page_no: Math.max(1, p.page_no - 1),
                                            }))
                                        }
                                        className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        <FiChevronLeft className="w-4 h-4" />
                                        Previous
                                    </motion.button>
                                    <motion.button
                                        type="button"
                                        disabled={pagination.is_last_page || loading}
                                        onClick={() =>
                                            setPagination((p) => ({
                                                ...p,
                                                page_no: p.page_no + 1,
                                            }))
                                        }
                                        className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        Next
                                        <FiChevronRight className="w-4 h-4" />
                                    </motion.button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>

            {/* Portal: Row action dropdown — rendered outside overflow container to avoid clipping */}
            {activeRowDropdown !== null &&
                createPortal(
                    (() => {
                        const activeItem = displayData.find(
                            (item) => item.task_id === activeRowDropdown
                        );
                        if (!activeItem) return null;
                        const isItemSelected = selectedItems.includes(activeItem.task_id);
                        return (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: dropdownPos.openUpward ? 6 : -6 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                transition={{ duration: 0.12 }}
                                className="dropdown-container fixed bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden"
                                style={{
                                    top: dropdownPos.top,
                                    bottom: dropdownPos.bottom,
                                    right: dropdownPos.right,
                                    width: '185px',
                                    zIndex: 9999,
                                }}
                            >
                                <div className="py-1">
                                    {showPendingColumns && (
                                        <>
                                            <button
                                                className="flex items-center w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-150"
                                                onClick={() => {
                                                    setActiveRowDropdown(null);
                                                    handleToggleSelect(activeItem.task_id);
                                                }}
                                            >
                                                {isItemSelected ? (
                                                    <>
                                                        <FiXCircle className="w-4 h-4 mr-3 text-red-500" />
                                                        Deselect
                                                    </>
                                                ) : (
                                                    <>
                                                        <FiCheckCircle className="w-4 h-4 mr-3 text-emerald-500" />
                                                        Select
                                                    </>
                                                )}
                                            </button>
                                            <button
                                                className={`flex items-center w-full px-4 py-2.5 text-sm text-emerald-700 hover:bg-emerald-50 transition-colors duration-150 ${
                                                    !check('finance_billing_approve_reject') ? 'opacity-60 cursor-not-allowed hover:bg-transparent' : ''
                                                }`}
                                                onClick={() => {
                                                    if (!check('finance_billing_approve_reject')) {
                                                        toast.error('Need Access Permission');
                                                    } else {
                                                        handleGenerateSingleTask(activeItem.task_id);
                                                    }
                                                }}
                                            >
                                                {!check('finance_billing_approve_reject') ? (
                                                    <FiLock className="w-4 h-4 mr-3 text-slate-400" />
                                                ) : (
                                                    <TbFileInvoice className="w-4 h-4 mr-3 text-emerald-600" />
                                                )}
                                                Generate Bill
                                                {!check('finance_billing_approve_reject') && (
                                                    <FiLock className="w-3.5 h-3.5 text-slate-400 ml-auto" />
                                                )}
                                            </button>
                                            <div className="border-t border-gray-100" />
                                        </>
                                    )}
                                    {selectedBillType === 'generated' && (
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
                                                        <svg className="animate-spin w-4 h-4 mr-3 text-indigo-500" fill="none" viewBox="0 0 24 24">
                                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
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
                                            handleExport('print', activeItem);
                                        }}
                                    >
                                        <FiPrinter className="w-4 h-4 mr-3" />
                                        Print
                                    </button>
                                    <button
                                        className="flex items-center w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-150"
                                        onClick={() => {
                                            setActiveRowDropdown(null);
                                            setWhatsappModalOpen(true);
                                        }}
                                    >
                                        <FaWhatsapp className="w-4 h-4 mr-3 text-emerald-500" />
                                        WhatsApp
                                    </button>
                                    <button
                                        className="flex items-center w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-150"
                                        onClick={() => {
                                            setActiveRowDropdown(null);
                                            setIsEmailModalOpen(true);
                                        }}
                                    >
                                        <AiOutlineMail className="w-4 h-4 mr-3 text-blue-500" />
                                        Email
                                    </button>
                                </div>
                            </motion.div>
                        );
                    })(),
                    document.body
                )}

            {/* Compact selection bar — pending tab only; stays above sidebar (z-45) */}
            <AnimatePresence>
                {selectedBillType === 'pending' && selectedItems.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 24 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 24 }}
                        transition={{ type: 'spring', damping: 26, stiffness: 320 }}
                        className="fixed bottom-0 left-0 right-0 z-[46] max-h-[min(42vh,240px)] overflow-y-auto overflow-x-hidden rounded-t-2xl border-t border-indigo-100/90 bg-white/95 pb-[max(0.35rem,env(safe-area-inset-bottom))] shadow-[0_-6px_28px_-8px_rgba(15,23,42,0.18)] backdrop-blur-md"
                        style={{
                            left: isMinimized ? '80px' : '260px',
                            transition: 'left 0.3s ease',
                        }}
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
                                            {selectedItems.length !== 1 ? 's' : ''} selected
                                        </p>
                                        <p className="mt-1 flex gap-1.5 text-[11px] leading-snug text-amber-900/90 sm:text-xs">
                                            <FiInfo
                                                className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600"
                                                aria-hidden
                                            />
                                            <span>
                                                Only tasks on <strong>this page</strong> can be selected.
                                                Generate bill / non-billable applies to the loaded rows only—go to
                                                other pages to include more tasks.
                                            </span>
                                        </p>
                                    </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-2 sm:shrink-0 sm:justify-end">
                                    <motion.button
                                        type="button"
                                        disabled={billingActionLoading}
                                        onClick={() => {
                                            if (!check('finance_billing_approve_reject')) {
                                                toast.error('Need Access Permission');
                                            } else {
                                                handleGenerateBill();
                                            }
                                        }}
                                        className={`inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:from-emerald-700 hover:to-teal-700 sm:px-3.5 sm:text-sm ${
                                            !check('finance_billing_approve_reject') ? 'opacity-60 cursor-not-allowed hover:from-emerald-600 hover:to-teal-600' : ''
                                        }`}
                                        whileTap={{ scale: billingActionLoading ? 1 : 0.97 }}
                                    >
                                        {billingActionLoading ? (
                                            <FiRefreshCw className="h-4 w-4 animate-spin" />
                                        ) : !check('finance_billing_approve_reject') ? (
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
                                            if (!check('finance_billing_approve_reject')) {
                                                toast.error('Need Access Permission');
                                            } else {
                                                handleMarkNonBillable();
                                            }
                                        }}
                                        className={`inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-rose-600 to-pink-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:from-rose-700 hover:to-pink-700 sm:text-sm ${
                                            !check('finance_billing_approve_reject') ? 'opacity-60 cursor-not-allowed hover:from-rose-600 hover:to-pink-600' : ''
                                        }`}
                                        whileTap={{ scale: billingActionLoading ? 1 : 0.97 }}
                                    >
                                        {!check('finance_billing_approve_reject') ? (
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

            {/* Modals */}
            <EmailSelectionModal
                isOpen={isEmailModalOpen}
                onClose={() => setIsEmailModalOpen(false)}
                onSubmit={handleEmailSubmit}
            />

            <MobileSelectionModal
                isOpen={isWhatsappModalOpen}
                onClose={() => setWhatsappModalOpen(false)}
                onSubmit={handleWhatsappSubmit}
            />

            {/* Professional in-app dialog — replaces window.alert / window.confirm */}
            <AppDialog
                dialog={dialog}
                onClose={closeDialog}
                onConfirm={handleDialogConfirm}
            />

            {/* Export Confirmation Modal */}
            <AnimatePresence>
                {exportModal.open && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                        style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white rounded-2xl p-6 max-w-sm w-full mx-auto shadow-xl overflow-hidden"
                        >
                            <div className="text-center">
                                <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                    className="w-16 h-16 bg-gradient-to-r from-indigo-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-4"
                                >
                                    <PiExportBold className="w-8 h-8 text-indigo-600" />
                                </motion.div>
                                <h3 className="text-lg font-bold text-gray-900 mb-2">
                                    Exporting {exportModal.type.toUpperCase()}
                                </h3>
                                <p className="text-gray-600 mb-6 text-sm">
                                    Your {exportModal.type} export is being processed...
                                </p>
                                <div className="flex justify-center space-x-2 mb-4">
                                    <motion.div
                                        className="w-2.5 h-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full"
                                        animate={{ scale: [1, 1.5, 1] }}
                                        transition={{ duration: 0.6, repeat: Infinity }}
                                    ></motion.div>
                                    <motion.div
                                        className="w-2.5 h-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full"
                                        animate={{ scale: [1, 1.5, 1] }}
                                        transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
                                    ></motion.div>
                                    <motion.div
                                        className="w-2.5 h-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full"
                                        animate={{ scale: [1, 1.5, 1] }}
                                        transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
                                    ></motion.div>
                                </div>
                                <p className="text-xs text-gray-500">
                                    This will only take a moment
                                </p>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default BillDisplay;