import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
    FiPlus,
    FiEdit,
    FiFileText,
    FiMenu,
    FiEye,
    FiTag,
    FiSearch,
    FiX,
    FiMail,
    FiPhone,
} from 'react-icons/fi';
import { TbCurrencyRupee } from 'react-icons/tb';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Header, Sidebar } from '../components/header';
import { DateRangePickerField } from '../components/PortalDatePicker';
import TablePagination from '../components/TablePagination';
import { TransactionModalManager } from '../components/Modals/CreateTransactions';
import { EditTransactionModalManager } from '../components/Modals/EditTransactions';
import API_BASE_URL from '../utils/api-controller';
import getHeaders from '../utils/get-headers';

const ACTIONS_MENU_WIDTH = 176;
const ACTIONS_MENU_HEIGHT = 96;

const formatCareOfSubtitle = (party) => {
    if (!party || typeof party !== 'object') return '';
    const prefix = String(party.guardian_type || party.care_of || '').trim();
    const guardianName = String(party.guardian_name || '').trim();
    if (prefix && guardianName) {
        const cleanPrefix = prefix.replace(/:\s*$/, '').trim();
        return `${cleanPrefix} ${guardianName}`;
    }
    if (guardianName) return guardianName;
    if (prefix) return prefix;
    return '';
};

const getDiscountPartyProfilePath = (row) => {
    const type = row?.discount_party?.type || row?.party_type;
    const username = row?.discount_party?.details?.username || row?.party_id;
    if (!type || !username) return null;

    const encoded = encodeURIComponent(username);
    switch (type) {
        case 'client':
            return `/client/profile/${encoded}`;
        case 'ca':
            return `/staff/office-assistance/ca-profile/${encoded}/profile`;
        case 'agent':
            return `/settings/agent-profile/${encoded}/profile`;
        case 'staff':
            return `/staff/view/profile/profile?username=${encoded}`;
        default:
            return null;
    }
};

const getDiscountPartyLabel = (row) => {
    const party = row?.discount_party;
    if (!party?.details) return row?.party_id || '—';
    const d = party.details;
    if (party.type === 'bank') {
        return d.bank || d.holder || d.account_no || 'Bank account';
    }
    if (party.type === 'capital') {
        return d.name || d.capital_name || 'Capital account';
    }
    return d.name || d.username || row.party_id || '—';
};

const getDiscountPartyContactLines = (row) => {
    const party = row?.discount_party;
    if (!party?.details) return [];
    const d = party.details;
    const lines = [];

    if (party.type === 'bank') {
        if (d.holder && d.holder !== getDiscountPartyLabel(row)) lines.push(d.holder);
        if (d.account_no) lines.push(`A/c ${d.account_no}`);
        if (d.ifsc) lines.push(d.ifsc);
        return lines;
    }

    if (d.email) lines.push(d.email);
    if (d.mobile) {
        lines.push(d.country_code ? `+${d.country_code} ${d.mobile}` : String(d.mobile));
    }
    if (party.type === 'capital' && d.remark) lines.push(d.remark);
    return lines;
};

const getPartyTypeBadgeClass = (type) => {
    switch (type) {
        case 'client':
            return 'bg-blue-100 text-blue-700';
        case 'ca':
            return 'bg-purple-100 text-purple-700';
        case 'staff':
            return 'bg-teal-100 text-teal-700';
        case 'agent':
            return 'bg-amber-100 text-amber-800';
        default:
            return 'bg-slate-100 text-slate-700';
    }
};

const formatPartyTypeLabel = (type) => {
    if (type === 'ca') return 'CA';
    if (!type) return '—';
    return type.charAt(0).toUpperCase() + type.slice(1);
};

const formatCurrency = (amount) => {
    const value = Number(amount);
    if (!Number.isFinite(value)) return '0.00';
    return new Intl.NumberFormat('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(value);
};

const formatDate = (dateString) => {
    if (!dateString) return '—';
    const raw = String(dateString).trim().slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
        const [year, month, day] = raw.split('-');
        return `${day}/${month}/${year}`;
    }
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return '—';
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
};

const formatDateTime = (value) => {
    if (!value) return '—';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};

const DetailRow = ({ label, children }) => (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 py-2.5 last:border-0">
        <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</span>
        <span className="min-w-0 text-right text-sm text-slate-800">{children}</span>
    </div>
);

const DiscountDetailsModal = ({ isOpen, discount, onClose }) => (
    createPortal(
        <AnimatePresence>
            {isOpen && discount ? (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[10050] flex items-center justify-center overflow-hidden p-3 sm:p-4"
                >
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} aria-hidden />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.96 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.96 }}
                        role="dialog"
                        aria-modal="true"
                        className="relative z-[1] flex w-full max-w-lg max-h-[calc(100vh-2rem)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="shrink-0 flex items-center justify-between gap-2 border-b border-amber-500/25 bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-2.5 text-white">
                            <div className="flex min-w-0 items-center gap-2">
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/15">
                                    <FiEye className="h-3.5 w-3.5" aria-hidden />
                                </div>
                                <h2 className="truncate text-sm font-semibold">{discount.invoice_no || 'Discount entry'}</h2>
                            </div>
                            <button
                                type="button"
                                onClick={onClose}
                                className="rounded-lg p-1.5 text-white/80 hover:bg-white/15 hover:text-white"
                                aria-label="Close"
                            >
                                <FiX className="h-4 w-4" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto px-5 py-4">
                            <div className="rounded-xl border border-amber-200/80 bg-gradient-to-br from-amber-50 to-white p-4 shadow-sm">
                                <div className="mb-3 flex items-center justify-between gap-2">
                                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${getPartyTypeBadgeClass(discount.discount_party?.type || discount.party_type)}`}>
                                        {formatPartyTypeLabel(discount.discount_party?.type || discount.party_type)}
                                    </span>
                                    <span className="text-lg font-bold tabular-nums text-amber-700">
                                        ₹{formatCurrency(discount.amount)}
                                    </span>
                                </div>
                                <DetailRow label="Party">{getDiscountPartyLabel(discount)}</DetailRow>
                                {formatCareOfSubtitle(discount.discount_party?.details) ? (
                                    <DetailRow label="Care of">{formatCareOfSubtitle(discount.discount_party?.details)}</DetailRow>
                                ) : null}
                                {getDiscountPartyContactLines(discount).map((line) => (
                                    <DetailRow key={line} label="Contact">{line}</DetailRow>
                                ))}
                                <DetailRow label="Invoice no.">{discount.invoice_no || '—'}</DetailRow>
                                <DetailRow label="Date">{formatDate(discount.discount_date || discount.transaction_date)}</DetailRow>
                                <DetailRow label="Remark">
                                    <span className="block max-w-[14rem] truncate" title={discount.remark || ''}>
                                        {discount.remark || '—'}
                                    </span>
                                </DetailRow>
                            </div>
                            <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Audit trail</p>
                                <DetailRow label="Created">
                                    <span>
                                        {formatDateTime(discount.create_date)}
                                        {discount.create_by?.name ? (
                                            <span className="mt-0.5 block text-xs font-normal text-slate-500">
                                                by {discount.create_by.name}
                                            </span>
                                        ) : null}
                                    </span>
                                </DetailRow>
                                <DetailRow label="Last modified">
                                    <span>
                                        {formatDateTime(discount.modify_date)}
                                        {discount.modify_by?.name ? (
                                            <span className="mt-0.5 block text-xs font-normal text-slate-500">
                                                by {discount.modify_by.name}
                                            </span>
                                        ) : null}
                                    </span>
                                </DetailRow>
                            </div>
                        </div>
                        <div className="shrink-0 flex justify-end border-t border-slate-200 bg-slate-50/90 px-5 py-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                            >
                                Close
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            ) : null}
        </AnimatePresence>,
        document.body
    )
);

const StatCardSkeleton = () => (
    <div className="animate-pulse rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-2 h-3 w-24 rounded bg-slate-200" />
        <div className="h-6 w-20 rounded bg-slate-200" />
    </div>
);

const SkeletonRow = () => (
    <tr className="border-b border-slate-100 animate-pulse">
        <td className="p-3 text-center"><div className="mx-auto h-4 w-6 rounded bg-slate-200" /></td>
        <td className="p-3 text-center"><div className="mx-auto h-4 w-16 rounded bg-slate-200" /></td>
        <td className="p-3 text-center"><div className="mx-auto h-4 w-20 rounded bg-slate-200" /></td>
        <td className="p-3"><div className="mx-auto h-4 w-32 rounded bg-slate-200" /></td>
        <td className="p-3"><div className="mx-auto h-4 w-28 rounded bg-slate-200" /></td>
        <td className="p-3 text-center"><div className="mx-auto h-5 w-14 rounded-full bg-slate-200" /></td>
        <td className="p-3 text-right"><div className="ml-auto h-4 w-16 rounded bg-slate-200" /></td>
        <td className="p-3 text-center"><div className="mx-auto h-8 w-8 rounded bg-slate-200" /></td>
    </tr>
);

const DiscountVoucherDetails = () => {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(() => {
        const saved = localStorage.getItem('sidebarMinimized');
        return saved ? JSON.parse(saved) : false;
    });

    const [listLoading, setListLoading] = useState(true);
    const [discounts, setDiscounts] = useState([]);
    const [stats, setStats] = useState({ count: 0, amount: 0 });

    const [fromDate, setFromDate] = useState(() => {
        const d = new Date();
        d.setDate(1);
        return d.toISOString().split('T')[0];
    });
    const [toDate, setToDate] = useState(() => new Date().toISOString().split('T')[0]);

    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(20);
    const [totalPages, setTotalPages] = useState(1);
    const [totalRecords, setTotalRecords] = useState(0);
    const [isLastPage, setIsLastPage] = useState(false);

    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [editRecord, setEditRecord] = useState(null);
    const [detailsOpen, setDetailsOpen] = useState(false);
    const [detailsRecord, setDetailsRecord] = useState(null);
    const [activeRowDropdown, setActiveRowDropdown] = useState(null);
    const [dropdownPos, setDropdownPos] = useState({ top: 0, left: undefined, right: 0, bottom: undefined, openUpward: false });
    const actionAnchorRef = useRef(null);
    const dropdownModeRef = useRef('button');

    const emptySummary = { totalCredit: 0, totalDebit: 0 };

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearchTerm(searchTerm), 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    useEffect(() => {
        setCurrentPage(1);
    }, [debouncedSearchTerm, fromDate, toDate, itemsPerPage]);

    useEffect(() => {
        localStorage.setItem('sidebarMinimized', JSON.stringify(isMinimized));
    }, [isMinimized]);

    useEffect(() => {
        document.body.style.overflow = mobileMenuOpen ? 'hidden' : '';
        return () => {
            document.body.style.overflow = '';
        };
    }, [mobileMenuOpen]);

    const fetchDiscounts = useCallback(async () => {
        if (!fromDate || !toDate) return;

        setListLoading(true);
        try {
            const headers = getHeaders();
            const params = {
                page_no: currentPage,
                limit: itemsPerPage,
                from_date: fromDate,
                to_date: toDate,
            };
            if (debouncedSearchTerm.trim()) {
                params.search = debouncedSearchTerm.trim();
            }

            const response = await axios.get(`${API_BASE_URL}/expense/discount/list`, { headers, params });

            if (response.data?.success) {
                const rows = response.data.data || [];
                setDiscounts(rows);
                setStats({
                    count: Number(response.data.stats?.count) || 0,
                    amount: Number(response.data.stats?.amount) || 0,
                });

                const pagination = response.data.pagination || {};
                const total = Number(pagination.total) || 0;
                const limit = Number(pagination.limit) || itemsPerPage;
                setTotalRecords(total);
                setTotalPages(Math.max(1, Math.ceil(total / (limit || 1))));
                setIsLastPage(Boolean(pagination.is_last_page));
            } else {
                setDiscounts([]);
                setStats({ count: 0, amount: 0 });
                setTotalRecords(0);
                setTotalPages(1);
                setIsLastPage(true);
            }
        } catch (error) {
            console.error('Error fetching discounts:', error);
            toast.error('Failed to load discount entries');
            setDiscounts([]);
            setStats({ count: 0, amount: 0 });
            setTotalRecords(0);
            setTotalPages(1);
            setIsLastPage(true);
        } finally {
            setListLoading(false);
        }
    }, [fromDate, toDate, currentPage, itemsPerPage, debouncedSearchTerm]);

    useEffect(() => {
        fetchDiscounts();
    }, [fetchDiscounts]);

    const handlePageChange = (page) => {
        setCurrentPage(page);
    };

    const handleDiscountSuccess = () => {
        fetchDiscounts();
    };

    const openEditModal = (row) => {
        setEditRecord(row);
        setEditModalOpen(true);
        setActiveRowDropdown(null);
        actionAnchorRef.current = null;
    };

    const closeEditModal = () => {
        setEditModalOpen(false);
        setEditRecord(null);
    };

    const openDetails = (row) => {
        setDetailsRecord(row);
        setDetailsOpen(true);
        setActiveRowDropdown(null);
        actionAnchorRef.current = null;
    };

    const closeDetails = () => {
        setDetailsOpen(false);
        setDetailsRecord(null);
    };

    const updateDropdownPosition = useCallback((anchorEl) => {
        if (!anchorEl) return;
        const rect = anchorEl.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        const openUpward = spaceBelow < ACTIONS_MENU_HEIGHT + 8;
        setDropdownPos({
            top: openUpward ? undefined : rect.bottom + 4,
            left: undefined,
            bottom: openUpward ? window.innerHeight - rect.top + 4 : undefined,
            right: window.innerWidth - rect.right,
            openUpward,
        });
    }, []);

    const openActionsFromButton = (e, discountId) => {
        e.stopPropagation();
        if (activeRowDropdown === discountId) {
            setActiveRowDropdown(null);
            actionAnchorRef.current = null;
            return;
        }
        dropdownModeRef.current = 'button';
        actionAnchorRef.current = e.currentTarget;
        updateDropdownPosition(e.currentTarget);
        setActiveRowDropdown(discountId);
    };

    const openActionsFromContextMenu = (e, discountId) => {
        e.preventDefault();
        e.stopPropagation();
        dropdownModeRef.current = 'pointer';
        actionAnchorRef.current = null;
        const margin = 8;
        const left = Math.min(e.clientX, window.innerWidth - ACTIONS_MENU_WIDTH - margin);
        const top = Math.min(e.clientY, window.innerHeight - ACTIONS_MENU_HEIGHT - margin);
        setDropdownPos({
            top,
            left,
            right: undefined,
            bottom: undefined,
            openUpward: false,
        });
        setActiveRowDropdown(discountId);
    };

    const activeDiscount = useMemo(
        () => discounts.find((d) => d.discount_id === activeRowDropdown) || null,
        [discounts, activeRowDropdown]
    );

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (
                !event.target.closest('[data-discount-actions-menu]') &&
                !event.target.closest('[data-discount-actions-trigger]')
            ) {
                setActiveRowDropdown(null);
                actionAnchorRef.current = null;
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (!activeRowDropdown) return undefined;

        const handleScrollOrResize = () => {
            if (dropdownModeRef.current === 'button' && actionAnchorRef.current) {
                updateDropdownPosition(actionAnchorRef.current);
                return;
            }
            if (dropdownModeRef.current === 'pointer') {
                setActiveRowDropdown(null);
            }
        };

        window.addEventListener('scroll', handleScrollOrResize, true);
        window.addEventListener('resize', handleScrollOrResize);
        return () => {
            window.removeEventListener('scroll', handleScrollOrResize, true);
            window.removeEventListener('resize', handleScrollOrResize);
        };
    }, [activeRowDropdown, updateDropdownPosition]);

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

            <div className={`pt-16 transition-all duration-300 ease-in-out ${isMinimized ? 'md:pl-20' : 'md:pl-[260px]'}`}>
                <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {listLoading && discounts.length === 0 ? (
                            <>
                                <StatCardSkeleton />
                                <StatCardSkeleton />
                            </>
                        ) : (
                            <>
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 p-4 text-white shadow-md"
                                >
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-xs font-medium text-amber-100">Discount entries</p>
                                            <h3 className="mt-1 text-lg font-bold tabular-nums">{stats.count}</h3>
                                        </div>
                                        <FiTag className="h-5 w-5 shrink-0 opacity-80" />
                                    </div>
                                </motion.div>

                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.2, delay: 0.05 }}
                                    className="rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 p-4 text-white shadow-md"
                                >
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-xs font-medium text-orange-100">Total discount</p>
                                            <h3 className="mt-1 text-lg font-bold tabular-nums">₹{formatCurrency(stats.amount)}</h3>
                                        </div>
                                        <TbCurrencyRupee className="h-5 w-5 shrink-0 opacity-80" />
                                    </div>
                                </motion.div>
                            </>
                        )}
                    </div>

                    <motion.div
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg"
                    >
                        <div className="sticky top-0 z-10 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white px-3 py-2.5 sm:px-4">
                            <div className="flex min-w-0 flex-col gap-2 xl:flex-row xl:items-center xl:justify-between xl:gap-3">
                                <div className="flex shrink-0 items-center gap-2">
                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100">
                                        <FiTag className="h-4 w-4 text-amber-600" />
                                    </div>
                                    <h5 className="shrink-0 text-sm font-bold tracking-tight text-slate-800 sm:text-base">
                                        Discount Register
                                    </h5>
                                </div>
                                <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end sm:gap-2">
                                    <div className="relative ml-auto w-full min-w-0 sm:ml-0 sm:w-60">
                                        <FiSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                        <input
                                            type="text"
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            placeholder="Search invoice, party, remark, amount…"
                                            className="h-9 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-amber-500"
                                        />
                                    </div>
                                    <div className="w-full min-w-0 sm:w-56">
                                        <DateRangePickerField
                                            value={{ start: fromDate, end: toDate }}
                                            onChange={(range) => {
                                                setFromDate(range?.start || '');
                                                setToDate(range?.end || '');
                                            }}
                                            placeholder="Select date range"
                                            mode="range"
                                            initialTab="quick"
                                            defaultQuickKey="tm"
                                            quickOptionKeys={['tw', 'lw', 'lm', 'tm', 'lf', 'fy']}
                                            showRangeHint={false}
                                            showResetButton={false}
                                            truncateRangeLabel={false}
                                            buttonClassName="w-full h-9 min-w-0 px-3 bg-white border border-slate-200 rounded-lg text-sm text-slate-600 hover:border-amber-400 focus:outline-none transition-all"
                                            wrapperClassName="w-full min-w-0"
                                        />
                                    </div>
                                    <motion.button
                                        type="button"
                                        onClick={() => setShowCreateModal(true)}
                                        className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-amber-600 to-amber-700 px-3 text-sm font-semibold text-white shadow-sm transition-all hover:from-amber-700 hover:to-amber-800 sm:h-10 sm:px-4"
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        <FiPlus className="h-4 w-4 shrink-0" />
                                        <span className="whitespace-nowrap">Add Discount</span>
                                    </motion.button>
                                </div>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[820px] text-sm">
                                <thead>
                                    <tr className="bg-gradient-to-r from-slate-50 to-slate-100">
                                        <th className="w-12 p-2.5 text-center text-xs font-semibold uppercase tracking-wider text-slate-700">#</th>
                                        <th className="w-28 p-2.5 text-center text-xs font-semibold uppercase tracking-wider text-slate-700">Date</th>
                                        <th className="w-28 p-2.5 text-center text-xs font-semibold uppercase tracking-wider text-slate-700">Invoice</th>
                                        <th className="min-w-[180px] p-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-700">Party</th>
                                        <th className="min-w-[180px] p-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-700">Contact</th>
                                        <th className="w-24 p-2.5 text-center text-xs font-semibold uppercase tracking-wider text-slate-700">Type</th>
                                        <th className="w-28 p-2.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-700">Amount</th>
                                        <th className="w-16 p-2.5 text-center text-xs font-semibold uppercase tracking-wider text-slate-700">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 bg-white">
                                    {listLoading ? (
                                        [...Array(6)].map((_, i) => <SkeletonRow key={`sk-${i}`} />)
                                    ) : discounts.length === 0 ? (
                                        <tr>
                                            <td colSpan={8} className="py-12 text-center text-slate-500">
                                                <div className="flex flex-col items-center gap-3">
                                                    <div className="rounded-full bg-slate-100 p-3">
                                                        <FiTag className="h-8 w-8 text-slate-400" />
                                                    </div>
                                                    <p className="text-sm font-medium text-slate-600">No discount entries found</p>
                                                    <p className="text-xs text-slate-500">Try adjusting the date range or create a new discount</p>
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowCreateModal(true)}
                                                        className="mt-1 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700"
                                                    >
                                                        Add Discount
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        discounts.map((row, index) => {
                                            const slNo = (currentPage - 1) * itemsPerPage + index + 1;
                                            const partyType = row.discount_party?.type || row.party_type;
                                            const contactLines = getDiscountPartyContactLines(row);
                                            const profilePath = getDiscountPartyProfilePath(row);
                                            const careOfLine = formatCareOfSubtitle(row.discount_party?.details);

                                            return (
                                                <motion.tr
                                                    key={row.discount_id}
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    transition={{ duration: 0.15 }}
                                                    className="transition-colors hover:bg-amber-50/25"
                                                    onContextMenu={(e) => openActionsFromContextMenu(e, row.discount_id)}
                                                >
                                                    <td className="p-2.5 text-center align-middle text-sm tabular-nums text-slate-600">{slNo}</td>
                                                    <td className="whitespace-nowrap p-2.5 text-center align-middle text-sm text-slate-700">
                                                        {formatDate(row.discount_date || row.transaction_date)}
                                                    </td>
                                                    <td className="p-2.5 text-center align-middle">
                                                        <span className="inline-flex rounded bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-800">
                                                            {row.invoice_no || '—'}
                                                        </span>
                                                    </td>
                                                    <td className="min-w-0 p-2.5 align-middle">
                                                        {profilePath ? (
                                                            <Link
                                                                to={profilePath}
                                                                className="block truncate text-sm font-semibold text-slate-800 no-underline transition-colors hover:text-amber-700"
                                                                title={getDiscountPartyLabel(row)}
                                                                onClick={(e) => e.stopPropagation()}
                                                            >
                                                                {getDiscountPartyLabel(row)}
                                                            </Link>
                                                        ) : (
                                                            <div className="truncate text-sm font-semibold text-slate-800" title={getDiscountPartyLabel(row)}>
                                                                {getDiscountPartyLabel(row)}
                                                            </div>
                                                        )}
                                                        {careOfLine ? (
                                                            <div className="mt-0.5 truncate text-xs text-slate-500" title={careOfLine}>
                                                                {careOfLine}
                                                            </div>
                                                        ) : null}
                                                    </td>
                                                    <td className="min-w-0 p-2.5 align-middle">
                                                        {contactLines.length > 0 ? (
                                                            <div className="space-y-0.5">
                                                                {contactLines.slice(0, 2).map((line) => (
                                                                    <div
                                                                        key={line}
                                                                        className="flex items-center gap-1 truncate text-xs text-slate-600"
                                                                        title={line}
                                                                    >
                                                                        {line.includes('@') ? (
                                                                            <FiMail className="h-3 w-3 shrink-0 text-slate-400" />
                                                                        ) : line.startsWith('+') || line.startsWith('A/c') ? (
                                                                            <FiPhone className="h-3 w-3 shrink-0 text-slate-400" />
                                                                        ) : null}
                                                                        <span className="truncate">{line}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <span className="text-xs text-slate-400">—</span>
                                                        )}
                                                    </td>
                                                    <td className="p-2.5 text-center align-middle">
                                                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${getPartyTypeBadgeClass(partyType)}`}>
                                                            {formatPartyTypeLabel(partyType)}
                                                        </span>
                                                    </td>
                                                    <td className="p-2.5 text-right align-middle">
                                                        <button
                                                            type="button"
                                                            onClick={() => openDetails(row)}
                                                            className="text-sm font-semibold tabular-nums text-amber-700 hover:underline"
                                                        >
                                                            ₹{formatCurrency(row.amount)}
                                                        </button>
                                                    </td>
                                                    <td className="p-2.5 text-center align-middle">
                                                        <button
                                                            type="button"
                                                            data-discount-actions-trigger
                                                            className="rounded-lg border border-slate-200 p-1.5 text-slate-500 transition-colors hover:border-amber-300 hover:bg-amber-50 hover:text-amber-600"
                                                            onClick={(e) => openActionsFromButton(e, row.discount_id)}
                                                            aria-label="Row actions"
                                                        >
                                                            <FiMenu className="h-4 w-4" />
                                                        </button>
                                                    </td>
                                                </motion.tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {!listLoading && discounts.length > 0 && (
                            <TablePagination
                                page={currentPage}
                                limit={itemsPerPage}
                                total={totalRecords}
                                totalPages={totalPages}
                                isLastPage={isLastPage}
                                rowOptions={[10, 20, 50, 100]}
                                defaultRows={20}
                                onPageChange={handlePageChange}
                                onLimitChange={setItemsPerPage}
                            />
                        )}
                    </motion.div>
                </div>
            </div>

            {activeRowDropdown && activeDiscount && createPortal(
                <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    data-discount-actions-menu
                    className="fixed z-[10040] w-44 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-xl"
                    style={{
                        top: dropdownPos.top,
                        bottom: dropdownPos.bottom,
                        right: dropdownPos.right,
                        left: dropdownPos.left,
                        minWidth: ACTIONS_MENU_WIDTH,
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                >
                    <button
                        type="button"
                        className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-700 transition-colors hover:bg-amber-50"
                        onClick={() => openDetails(activeDiscount)}
                    >
                        <FiFileText className="h-4 w-4 text-amber-600" />
                        View Details
                    </button>
                    <button
                        type="button"
                        className="flex w-full items-center gap-2 border-t border-slate-100 px-3 py-2 text-sm text-slate-700 transition-colors hover:bg-amber-50"
                        onClick={() => openEditModal(activeDiscount)}
                    >
                        <FiEdit className="h-4 w-4 text-blue-600" />
                        Edit
                    </button>
                </motion.div>,
                document.body
            )}

            <TransactionModalManager
                modalType="DISCOUNT"
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onSubmit={handleDiscountSuccess}
                formatCurrency={formatCurrency}
                summary={emptySummary}
            />

            <EditTransactionModalManager
                modalType="DISCOUNT"
                isOpen={editModalOpen}
                onClose={closeEditModal}
                editRecord={editRecord}
                onSubmit={handleDiscountSuccess}
                formatCurrency={formatCurrency}
                summary={emptySummary}
            />

            <DiscountDetailsModal
                isOpen={detailsOpen}
                discount={detailsRecord}
                onClose={closeDetails}
            />
        </div>
    );
};

export default DiscountVoucherDetails;
