import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
    FiPlus,
    FiEdit,
    FiFileText,
    FiMenu,
    FiEye,
    FiPackage,
    FiLock,
    FiX,
} from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import Select from 'react-select';
import { Header, Sidebar } from '../components/header';
import { DateRangePickerField } from '../components/PortalDatePicker';
import TablePagination from '../components/TablePagination';
import { TransactionModalManager } from '../components/Modals/CreateTransactions';
import { EditTransactionModalManager } from '../components/Modals/EditTransactions';
import { useUserPermissions } from '../utils/permission-helper';
import API_BASE_URL from '../utils/api-controller';
import getHeaders from '../utils/get-headers';
import {
    EXPENSE_ITEM_TYPES,
    formatExpenseItemType,
    getExpenseItemTypeBadgeClass,
} from '../services/expenseItemService';

const TYPE_FILTER_OPTIONS = EXPENSE_ITEM_TYPES.map((t) => ({
    value: t.value,
    label: t.label,
}));

const selectStyles = {
    control: (base, state) => ({
        ...base,
        minHeight: '36px',
        borderColor: state.isFocused ? '#6366f1' : '#e2e8f0',
        boxShadow: state.isFocused ? '0 0 0 1px #6366f1' : 'none',
        fontSize: '12px',
        '&:hover': { borderColor: '#6366f1' },
    }),
    menu: (base) => ({ ...base, fontSize: '12px', zIndex: 30 }),
    option: (base, state) => ({
        ...base,
        fontSize: '12px',
        backgroundColor: state.isFocused ? '#eef2ff' : 'white',
    }),
    placeholder: (base) => ({ ...base, fontSize: '12px', color: '#94a3b8' }),
    singleValue: (base) => ({ ...base, fontSize: '12px' }),
};

const getExpensePartyLabel = (expense) => {
    const party = expense?.expense_party;
    if (!party) return '—';
    const d = party.details || {};
    if (party.type === 'bank') {
        return d.bank || d.holder || d.account_no || 'Bank account';
    }
    if (party.type === 'capital') {
        return d.name || d.capital_name || 'Capital account';
    }
    return party.type || '—';
};

const getExpensePartyMeta = (expense) => {
    const party = expense?.expense_party;
    if (!party?.type) return '';
    const label = party.type === 'bank' ? 'Bank' : party.type === 'capital' ? 'Capital' : party.type;
    return label;
};

const getExpenseLineItems = (expense) => {
    if (Array.isArray(expense?.items) && expense.items.length > 0) {
        return expense.items;
    }
    if (expense?.item?.item_id || expense?.item?.name) {
        return [{
            item_id: expense.item.item_id,
            amount: expense.amount,
            item: expense.item,
        }];
    }
    return [];
};

const getExpenseItemDisplayName = (expense) => {
    const lines = getExpenseLineItems(expense);
    if (lines.length === 0) return '—';
    if (lines.length === 1) return lines[0]?.item?.name || '—';
    const names = lines
        .map((line) => line?.item?.name)
        .filter(Boolean);
    if (names.length <= 2) return names.join(', ');
    return `${names.slice(0, 2).join(', ')} +${names.length - 2} more`;
};

const getExpenseItemDisplayType = (expense) => {
    const lines = getExpenseLineItems(expense);
    if (lines.length === 0) return '';
    const types = [...new Set(lines.map((line) => line?.item?.type).filter(Boolean))];
    if (types.length === 1) return types[0];
    return 'mixed';
};

const MODAL_BODY_CLASS =
    'px-5 py-4 flex-1 min-h-0 overflow-y-auto overscroll-y-contain [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden';

const MODAL_FOOTER_CLASS =
    'shrink-0 flex items-center justify-end gap-2 border-t border-slate-200 bg-slate-50/90 px-5 py-3';

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

const formatDate = (dateString) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleDateString('en-GB');
};

const DetailRow = ({ label, children }) => (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 py-2.5 last:border-0">
        <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</span>
        <span className="min-w-0 text-right text-sm text-slate-800">{children}</span>
    </div>
);

const ExpenseEntryModalShell = ({ isOpen, onClose, title, subtitle, icon: Icon, footer, children }) => {
    return createPortal(
        <AnimatePresence>
            {isOpen ? (
                <motion.div
                    key="expense-entry-modal"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.18 }}
                    className="fixed inset-0 z-[10050] flex items-start justify-center overflow-hidden overscroll-none p-3 sm:p-4 pointer-events-none"
                >
                    <div
                        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm pointer-events-auto"
                        onClick={onClose}
                        aria-hidden
                    />
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.18 }}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="expense-entry-modal-title"
                        className="relative z-[1] pointer-events-auto flex w-full max-w-lg my-2 sm:my-4 max-h-[calc(100vh-1.5rem)] sm:max-h-[calc(100vh-2rem)] flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="shrink-0 flex items-center justify-between gap-3 border-b border-emerald-500/25 bg-gradient-to-r from-emerald-600 via-emerald-600 to-teal-600 px-5 py-3.5 text-white">
                            <div className="flex min-w-0 items-center gap-3">
                                {Icon ? (
                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/20">
                                        <Icon className="h-4 w-4" aria-hidden />
                                    </div>
                                ) : null}
                                <div className="min-w-0">
                                    <h2 id="expense-entry-modal-title" className="truncate text-sm font-semibold tracking-tight">
                                        {title}
                                    </h2>
                                    {subtitle ? (
                                        <p className="mt-0.5 truncate text-[11px] text-emerald-100/90">{subtitle}</p>
                                    ) : null}
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={onClose}
                                className="shrink-0 rounded-lg p-1.5 text-white/80 transition-colors hover:bg-white/15 hover:text-white"
                                aria-label="Close"
                            >
                                <FiX className="h-4 w-4" />
                            </button>
                        </div>
                        {children}
                        {footer}
                    </motion.div>
                </motion.div>
            ) : null}
        </AnimatePresence>,
        document.body
    );
};

const getExpensePartyDetailLines = (expense) => {
    const party = expense?.expense_party;
    if (!party?.details) return [];
    const d = party.details;
    if (party.type === 'bank') {
        const lines = [];
        if (d.holder) lines.push(d.holder);
        if (d.account_no) lines.push(`A/c ${d.account_no}`);
        if (d.ifsc) lines.push(d.ifsc);
        if (d.branch) lines.push(d.branch);
        return lines;
    }
    if (party.type === 'capital') {
        return [d.name || d.capital_name].filter(Boolean);
    }
    return [];
};

const ExpenseEntryDetailsModal = ({ isOpen, expense, onClose, formatCurrency }) => {
    const lineItems = expense ? getExpenseLineItems(expense) : [];
    const itemName = getExpenseItemDisplayName(expense);
    const itemType = getExpenseItemDisplayType(expense);
    const partyMeta = getExpensePartyMeta(expense);
    const partyLines = expense ? getExpensePartyDetailLines(expense) : [];

    return (
        <ExpenseEntryModalShell
            isOpen={isOpen}
            onClose={onClose}
            icon={FiEye}
            title={expense?.invoice_no || 'Expense entry'}
            subtitle={itemName !== '—' ? itemName : 'Expense details'}
            footer={(
                <div className={MODAL_FOOTER_CLASS}>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
                    >
                        Close
                    </button>
                </div>
            )}
        >
            <div className={MODAL_BODY_CLASS}>
                {!expense ? (
                    <p className="py-8 text-center text-sm text-slate-500">No expense data available.</p>
                ) : (
                    <div className="space-y-4">
                        <div className="rounded-xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50 to-white p-4 shadow-sm">
                            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                                <span
                                    className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${getExpenseItemTypeBadgeClass(itemType)}`}
                                >
                                    {formatExpenseItemType(itemType) || '—'}
                                </span>
                                <span className="text-lg font-bold tabular-nums text-emerald-700">
                                    ₹{formatCurrency(expense.amount)}
                                </span>
                            </div>
                            <DetailRow label="Expense item">{itemName}</DetailRow>
                            {lineItems.length > 1 ? (
                                <div className="border-b border-slate-100 py-2.5 last:border-0">
                                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                                        Line items
                                    </p>
                                    <div className="space-y-2">
                                        {lineItems.map((line, index) => (
                                            <div
                                                key={`${line.item_id || 'item'}-${index}`}
                                                className="flex items-start justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50/70 px-3 py-2"
                                            >
                                                <div className="min-w-0 text-left">
                                                    <p className="truncate text-sm font-medium text-slate-800">
                                                        {line?.item?.name || '—'}
                                                    </p>
                                                    {line?.item?.type ? (
                                                        <p className="mt-0.5 text-[11px] text-slate-500">
                                                            {formatExpenseItemType(line.item.type)}
                                                        </p>
                                                    ) : null}
                                                </div>
                                                <span className="shrink-0 text-sm font-semibold tabular-nums text-emerald-700">
                                                    ₹{formatCurrency(line.amount)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : null}
                            <DetailRow label="Invoice no.">{expense.invoice_no || '—'}</DetailRow>
                            <DetailRow label="Date">
                                {formatDate(expense.expense_date || expense.transaction_date)}
                            </DetailRow>
                            <DetailRow label="Remark">
                                <span className="block max-w-[14rem] truncate" title={expense.remark || ''}>
                                    {expense.remark || '—'}
                                </span>
                            </DetailRow>
                        </div>

                        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
                            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                                Paid from
                            </p>
                            <DetailRow label="Party type">{partyMeta || '—'}</DetailRow>
                            <DetailRow label="Account">
                                <span>
                                    {getExpensePartyLabel(expense)}
                                    {partyLines.length > 0 ? (
                                        <span className="mt-0.5 block text-xs font-normal text-slate-500">
                                            {partyLines.join(' · ')}
                                        </span>
                                    ) : null}
                                </span>
                            </DetailRow>
                        </div>

                        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
                            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                                Audit trail
                            </p>
                            <DetailRow label="Created">
                                <span>
                                    {formatDateTime(expense.create_date)}
                                    {expense.create_by?.name ? (
                                        <span className="mt-0.5 block text-xs font-normal text-slate-500">
                                            by {expense.create_by.name}
                                        </span>
                                    ) : null}
                                </span>
                            </DetailRow>
                            <DetailRow label="Last modified">
                                <span>
                                    {formatDateTime(expense.modify_date)}
                                    {expense.modify_by?.name ? (
                                        <span className="mt-0.5 block text-xs font-normal text-slate-500">
                                            by {expense.modify_by.name}
                                        </span>
                                    ) : null}
                                </span>
                            </DetailRow>
                        </div>
                    </div>
                )}
            </div>
        </ExpenseEntryModalShell>
    );
};

const ViewExpenses = () => {
    const { check } = useUserPermissions();

    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(() => {
        const saved = localStorage.getItem('sidebarMinimized');
        return saved ? JSON.parse(saved) : false;
    });

    const [loading, setLoading] = useState(true);
    const [fromDate, setFromDate] = useState(() => {
        const d = new Date();
        d.setDate(1);
        return d.toISOString().split('T')[0];
    });
    const [toDate, setToDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [expenses, setExpenses] = useState([]);

    const [showCreateExpenseModal, setShowCreateExpenseModal] = useState(false);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [editRecord, setEditRecord] = useState(null);
    const [detailsOpen, setDetailsOpen] = useState(false);
    const [detailsExpense, setDetailsExpense] = useState(null);
    const [activeRowDropdown, setActiveRowDropdown] = useState(null);

    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
    const [selectedItem, setSelectedItem] = useState(null);
    const [selectedType, setSelectedType] = useState(null);

    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(20);
    const [totalRecords, setTotalRecords] = useState(0);
    const [isLastPage, setIsLastPage] = useState(false);

    const [itemOptions, setItemOptions] = useState([]);
    const [itemLoading, setItemLoading] = useState(false);

    useEffect(() => {
        const timerId = setTimeout(() => setDebouncedSearchTerm(searchTerm), 500);
        return () => clearTimeout(timerId);
    }, [searchTerm]);

    useEffect(() => {
        setCurrentPage(1);
    }, [debouncedSearchTerm, fromDate, toDate, itemsPerPage, selectedItem?.value, selectedType?.value]);

    useEffect(() => {
        localStorage.setItem('sidebarMinimized', JSON.stringify(isMinimized));
    }, [isMinimized]);

    useEffect(() => {
        document.body.style.overflow = mobileMenuOpen ? 'hidden' : '';
        return () => {
            document.body.style.overflow = '';
        };
    }, [mobileMenuOpen]);

    const fetchItems = useCallback(async (typeFilter = '') => {
        setItemLoading(true);
        try {
            const headers = getHeaders();
            const params = { page_no: 1, limit: 100 };
            if (String(typeFilter || '').trim()) {
                params.type = String(typeFilter).trim();
            }
            const response = await axios.get(`${API_BASE_URL}/expense/item/list`, {
                headers,
                params,
            });
            if (response.data?.success) {
                setItemOptions(
                    (response.data.data || []).map((item) => ({
                        value: item.item_id,
                        label: item.name,
                        type: item.type,
                    }))
                );
            } else {
                setItemOptions([]);
            }
        } catch (error) {
            console.error('Error fetching expense items:', error);
            setItemOptions([]);
        } finally {
            setItemLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchItems(selectedType?.value || '');
    }, [fetchItems, selectedType?.value]);

    useEffect(() => {
        if (!selectedItem?.value) return;
        const stillValid = itemOptions.some((opt) => opt.value === selectedItem.value);
        if (!stillValid) setSelectedItem(null);
    }, [itemOptions, selectedItem?.value]);

    const handleTypeFilterChange = (option) => {
        setSelectedType(option);
        setSelectedItem(null);
    };

    const fetchExpensesData = useCallback(async () => {
        if (!fromDate || !toDate) return;

        setLoading(true);
        try {
            const headers = getHeaders();
            const params = {
                page_no: currentPage,
                limit: itemsPerPage,
                from_date: fromDate,
                to_date: toDate,
                search: debouncedSearchTerm || '',
            };
            if (selectedItem?.value) params.item_id = selectedItem.value;
            if (selectedType?.value) params.type = selectedType.value;

            const response = await axios.get(`${API_BASE_URL}/expense/list`, { headers, params });

            if (response.data?.success) {
                const rows = response.data.data || [];
                setExpenses(rows);

                const meta = response.data.meta || {};
                const total = Number(meta.total) || 0;
                const limit = Number(meta.limit) || itemsPerPage;
                const totalPagesFromMeta =
                    meta.total_pages != null && meta.total_pages !== ''
                        ? Math.max(1, Number(meta.total_pages) || 1)
                        : Math.max(1, Math.ceil(total / (limit || 1)));

                setTotalRecords(total);
                setTotalPages(totalPagesFromMeta);
                setIsLastPage(Boolean(meta.is_last_page));
                setCurrentPage((prev) => Math.min(Math.max(1, prev), totalPagesFromMeta));
            } else {
                setExpenses([]);
                setTotalRecords(0);
                setTotalPages(1);
                setIsLastPage(true);
            }
        } catch (error) {
            console.error('Error fetching expenses:', error);
            setExpenses([]);
            setTotalRecords(0);
            setTotalPages(1);
            setIsLastPage(true);
        } finally {
            setLoading(false);
        }
    }, [
        fromDate,
        toDate,
        debouncedSearchTerm,
        currentPage,
        itemsPerPage,
        selectedItem?.value,
        selectedType?.value,
    ]);

    useEffect(() => {
        fetchExpensesData();
    }, [fetchExpensesData]);

    const formatCurrency = (amount) => {
        if (!check('finance_balance_view')) return '*.*';
        const num = parseFloat(amount);
        if (Number.isNaN(num)) return '0.00';
        return new Intl.NumberFormat('en-IN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(num);
    };

    const handlePageChange = (newPage) => {
        const n = Math.floor(Number(newPage));
        if (!Number.isFinite(n)) return;
        const maxPage = Math.max(1, totalPages);
        setCurrentPage(Math.min(Math.max(1, n), maxPage));
    };

    const emptySummary = { totalCredit: 0, totalDebit: 0, closingBalance: 0 };

    const handleExpenseSuccess = () => {
        fetchExpensesData();
    };

    const openEditModal = (record) => {
        setEditRecord(record);
        setEditModalOpen(true);
        setActiveRowDropdown(null);
    };

    const closeEditModal = () => {
        setEditModalOpen(false);
        setEditRecord(null);
    };

    const handleEditSuccess = () => {
        closeEditModal();
        handleExpenseSuccess();
    };

    const toggleRowDropdown = (expenseId) => {
        setActiveRowDropdown(activeRowDropdown === expenseId ? null : expenseId);
    };

    const openExpenseDetails = (expense) => {
        setActiveRowDropdown(null);
        setDetailsExpense(expense);
        setDetailsOpen(true);
    };

    const closeExpenseDetails = () => {
        setDetailsOpen(false);
        setDetailsExpense(null);
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (!event.target.closest('.dropdown-container')) {
                setActiveRowDropdown(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSearchChange = (e) => setSearchTerm(e.target.value);

    const currentItems = expenses;

    const SkeletonRow = () => (
        <tr className="border-b border-slate-100 animate-pulse">
            {[...Array(7)].map((_, i) => (
                <td key={i} className="p-3 text-center">
                    <div className="h-4 bg-slate-200 rounded w-16 mx-auto" />
                </td>
            ))}
        </tr>
    );

    const SkeletonLoader = () => (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
            <Header mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} isMinimized={isMinimized} setIsMinimized={setIsMinimized} />
            <Sidebar mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} isMinimized={isMinimized} setIsMinimized={setIsMinimized} />
            <div className={`pt-16 transition-all duration-300 ease-in-out ${isMinimized ? 'md:pl-20' : 'md:pl-[260px]'}`}>
                <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
                        <div className="border-b border-slate-200 px-6 py-4">
                            <div className="h-10 bg-gray-200 rounded w-full max-w-2xl" />
                        </div>
                        <div className="p-4 space-y-3">
                            {[...Array(6)].map((_, i) => (
                                <div key={i} className="h-12 bg-gray-100 rounded" />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    if (loading && expenses.length === 0) {
        return <SkeletonLoader />;
    }

    if (!check('finance_report')) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
                <Header mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} isMinimized={isMinimized} setIsMinimized={setIsMinimized} />
                <Sidebar mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} isMinimized={isMinimized} setIsMinimized={setIsMinimized} />
                <div className={`pt-16 flex items-center justify-center transition-all duration-300 h-[calc(100vh-4rem)] ${isMinimized ? 'md:pl-20' : 'md:pl-[260px]'}`}>
                    <div className="text-center p-8 bg-white rounded-2xl border border-slate-200 shadow-sm max-w-sm w-full mx-4">
                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <FiLock className="w-8 h-8 text-slate-400" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-800 mb-2">Access Denied</h3>
                        <p className="text-slate-500 text-sm">You need the Finance Report access permission to view this report.</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
            <Header mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} isMinimized={isMinimized} setIsMinimized={setIsMinimized} />
            <Sidebar mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} isMinimized={isMinimized} setIsMinimized={setIsMinimized} />

            <div className={`pt-16 transition-all duration-300 ease-in-out ${isMinimized ? 'md:pl-20' : 'md:pl-[260px]'}`}>
                <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3 }}
                        className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden"
                    >
                        <div className="sticky top-0 z-10 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white px-3 py-2.5 sm:px-4 space-y-2.5">
                            {/* Row 1 — title, search, actions */}
                            <div className="flex flex-col gap-2 min-w-0 xl:flex-row xl:items-center xl:gap-3">
                                <h5 className="shrink-0 text-sm font-bold tracking-tight text-slate-800 sm:text-base">
                                    Expense Register
                                </h5>
                                <input
                                    type="text"
                                    placeholder="Search item, remark, type, invoice, amount…"
                                    value={searchTerm}
                                    onChange={handleSearchChange}
                                    className="h-9 w-full min-w-0 flex-1 rounded-lg border border-slate-300 px-3 text-sm transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-emerald-500 xl:min-w-[12rem]"
                                />
                                <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                                    <Link to="/finance/voucher/expense-items" className="shrink-0">
                                        <motion.span
                                            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-emerald-200 bg-white px-2.5 text-xs font-semibold text-emerald-700 shadow-sm transition-all hover:bg-emerald-50 sm:h-10 sm:px-3"
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                        >
                                            <FiPackage className="h-4 w-4 shrink-0" />
                                            <span className="whitespace-nowrap">Manage Items</span>
                                        </motion.span>
                                    </Link>

                                    <motion.button
                                        type="button"
                                        onClick={() => {
                                            if (!check('finance_entry')) {
                                                toast.error('Need Access Permission');
                                            } else {
                                                setShowCreateExpenseModal(true);
                                            }
                                        }}
                                        className={`inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-emerald-700 px-2.5 text-xs font-semibold text-white shadow-sm transition-all duration-200 hover:from-emerald-700 hover:to-emerald-800 hover:shadow sm:h-10 sm:px-3 ${!check('finance_entry') ? 'opacity-60 cursor-not-allowed hover:from-emerald-600 hover:to-emerald-700' : ''
                                            }`}
                                        whileHover={check('finance_entry') ? { scale: 1.02 } : {}}
                                        whileTap={check('finance_entry') ? { scale: 0.98 } : {}}
                                    >
                                        {!check('finance_entry') ? <FiLock className="h-4 w-4 shrink-0" /> : <FiPlus className="h-4 w-4 shrink-0" />}
                                        <span className="whitespace-nowrap">Create</span>
                                    </motion.button>
                                </div>
                            </div>

                            {/* Row 2 — filters */}
                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 min-w-0">
                                <div className="min-w-0 w-full">
                                    <Select
                                        options={TYPE_FILTER_OPTIONS}
                                        value={selectedType}
                                        onChange={handleTypeFilterChange}
                                        placeholder="All types"
                                        isClearable
                                        styles={selectStyles}
                                        className="text-xs"
                                    />
                                </div>
                                <div className="min-w-0 w-full">
                                    <Select
                                        options={itemOptions}
                                        value={selectedItem}
                                        onChange={setSelectedItem}
                                        placeholder={selectedType ? 'All items in type' : 'All items'}
                                        isClearable
                                        isLoading={itemLoading}
                                        isDisabled={itemLoading}
                                        styles={selectStyles}
                                        className="text-xs"
                                    />
                                </div>
                                <div className="min-w-0 w-full sm:col-span-2 lg:col-span-1">
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
                                        buttonClassName="w-full min-w-0 px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-600 hover:border-emerald-400 focus:outline-none transition-all"
                                        wrapperClassName="w-full min-w-0"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="bg-gradient-to-r from-slate-50 to-slate-100">
                                        <th className="min-w-[50px] p-3 text-center text-[10px] font-semibold uppercase tracking-wider text-slate-700">Sl No</th>
                                        <th className="min-w-[80px] p-3 text-center text-[10px] font-semibold uppercase tracking-wider text-slate-700">Date</th>
                                        <th className="min-w-[180px] p-3 text-center text-[10px] font-semibold uppercase tracking-wider text-slate-700">Particulars</th>
                                        <th className="min-w-[110px] p-3 text-center text-[10px] font-semibold uppercase tracking-wider text-slate-700">Invoice No</th>
                                        <th className="min-w-[90px] p-3 text-center text-[10px] font-semibold uppercase tracking-wider text-slate-700">Type</th>
                                        <th className="min-w-[100px] p-3 text-center text-[10px] font-semibold uppercase tracking-wider text-slate-700">Amount</th>
                                        <th className="min-w-[70px] p-3 text-center text-[10px] font-semibold uppercase tracking-wider text-slate-700">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 bg-white">
                                    {loading ? (
                                        [...Array(5)].map((_, index) => <SkeletonRow key={index} />)
                                    ) : currentItems.length === 0 ? (
                                        <tr>
                                            <td colSpan="7" className="py-10 text-center text-slate-500">
                                                <div className="flex flex-col items-center justify-center">
                                                    <div className="mb-3 rounded-full bg-slate-100 p-3">
                                                        <FiFileText className="h-8 w-8 text-slate-400" />
                                                    </div>
                                                    <p className="mb-1 text-sm font-medium text-slate-600">No expense records found</p>
                                                    <p className="mb-4 text-xs text-slate-500">Try adjusting filters or create a new expense entry</p>
                                                    {check('finance_entry') && (
                                                        <motion.button
                                                            type="button"
                                                            onClick={() => setShowCreateExpenseModal(true)}
                                                            className="rounded-lg bg-gradient-to-r from-emerald-600 to-emerald-700 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:shadow"
                                                            whileHover={{ scale: 1.02 }}
                                                            whileTap={{ scale: 0.98 }}
                                                        >
                                                            Create expense entry
                                                        </motion.button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        currentItems.map((expense, index) => {
                                            const isDropdownOpen = activeRowDropdown === expense.expense_id;
                                            const actualIndex = (currentPage - 1) * itemsPerPage + index;
                                            const itemName = getExpenseItemDisplayName(expense);
                                            const itemType = getExpenseItemDisplayType(expense);
                                            const partyMeta = getExpensePartyMeta(expense);

                                            return (
                                                <motion.tr
                                                    key={expense.expense_id}
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    transition={{ duration: 0.15 }}
                                                    className="transition-colors duration-150 hover:bg-emerald-50/20"
                                                >
                                                    <td className="p-3 text-center align-middle">
                                                        <div className="text-xs font-medium text-slate-700">{actualIndex + 1}</div>
                                                    </td>
                                                    <td className="p-3 text-center align-middle">
                                                        <div className="text-xs font-medium text-slate-700">
                                                            {formatDate(expense.expense_date || expense.transaction_date)}
                                                        </div>
                                                    </td>
                                                    <td className="p-3 text-center align-middle">
                                                        <div className="mx-auto max-w-[200px]">
                                                            <div className="truncate text-xs font-semibold text-slate-800">{itemName}</div>
                                                            <div className="mt-1 flex flex-col items-center gap-1">
                                                                {partyMeta ? (
                                                                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-medium text-slate-600">
                                                                        {partyMeta}
                                                                    </span>
                                                                ) : null}
                                                            </div>
                                                            <div className="mx-auto mt-1 max-w-[200px] truncate text-[10px] text-slate-500">
                                                                {getExpensePartyLabel(expense)}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="p-3 text-center align-middle">
                                                        <span className="inline-flex items-center justify-center rounded border border-slate-300/50 bg-gradient-to-r from-slate-100 to-slate-200 px-3 py-1.5 text-xs font-bold text-slate-800 shadow-xs">
                                                            {expense.invoice_no || '—'}
                                                        </span>
                                                    </td>
                                                    <td className="p-3 text-center align-middle">
                                                        <span className={`inline-flex rounded-full px-2 py-1 text-[9px] font-semibold ${getExpenseItemTypeBadgeClass(itemType)}`}>
                                                            {formatExpenseItemType(itemType) || '—'}
                                                        </span>
                                                    </td>
                                                    <td className="p-3 text-center align-middle">
                                                        <button
                                                            type="button"
                                                            onClick={() => openExpenseDetails(expense)}
                                                            className="inline-flex min-w-[90px] items-center justify-center rounded bg-gradient-to-r from-emerald-50 to-emerald-100 px-3 py-1.5 text-xs font-bold text-emerald-800 shadow-xs transition-all hover:shadow"
                                                        >
                                                            ₹{formatCurrency(expense.amount)}
                                                        </button>
                                                    </td>
                                                    <td className="p-3 text-center align-middle">
                                                        <div className="dropdown-container relative flex justify-center">
                                                            <motion.button
                                                                type="button"
                                                                className="rounded-lg border border-slate-200 p-1.5 text-slate-500 transition-colors duration-150 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-600"
                                                                onClick={() => toggleRowDropdown(expense.expense_id)}
                                                                whileHover={{ scale: 1.05 }}
                                                                whileTap={{ scale: 0.95 }}
                                                            >
                                                                <FiMenu className="h-3.5 w-3.5" />
                                                            </motion.button>
                                                            <AnimatePresence>
                                                                {isDropdownOpen && (
                                                                    <motion.div
                                                                        initial={{ opacity: 0, y: 5 }}
                                                                        animate={{ opacity: 1, y: 0 }}
                                                                        exit={{ opacity: 0, y: 5 }}
                                                                        className="absolute right-0 z-50 mt-1 w-48 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl"
                                                                    >
                                                                        <div className="py-1">
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => openExpenseDetails(expense)}
                                                                                className="flex w-full items-center px-3 py-2 text-xs text-slate-700 transition-colors hover:bg-emerald-50"
                                                                            >
                                                                                <div className="mr-2 rounded bg-emerald-50 p-1"><FiEye className="h-3 w-3 text-emerald-600" /></div>
                                                                                <span className="font-medium">View Details</span>
                                                                            </button>
                                                                            <button
                                                                                type="button"
                                                                                className={`flex w-full items-center px-3 py-2 text-xs text-slate-700 transition-colors hover:bg-emerald-50 ${!check('finance_entry_edit') ? 'cursor-not-allowed opacity-60 hover:bg-transparent' : ''
                                                                                    }`}
                                                                                onClick={() => {
                                                                                    if (!check('finance_entry_edit')) {
                                                                                        toast.error('Need Access Permission');
                                                                                        return;
                                                                                    }
                                                                                    openEditModal(expense);
                                                                                }}
                                                                            >
                                                                                <div className="mr-2 rounded bg-blue-50 p-1">
                                                                                    {!check('finance_entry_edit') ? (
                                                                                        <FiLock className="h-3 w-3 text-slate-400" />
                                                                                    ) : (
                                                                                        <FiEdit className="h-3 w-3 text-blue-500" />
                                                                                    )}
                                                                                </div>
                                                                                <span className="font-medium">Edit Expense</span>
                                                                            </button>
                                                                        </div>
                                                                    </motion.div>
                                                                )}
                                                            </AnimatePresence>
                                                        </div>
                                                    </td>
                                                </motion.tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>

                            {!loading && (currentItems.length > 0 || totalRecords > 0) && totalPages > 0 && (
                                <TablePagination
                                    page={currentPage}
                                    limit={itemsPerPage}
                                    total={totalRecords}
                                    totalPages={totalPages}
                                    isLastPage={isLastPage}
                                    rowOptions={[5, 10, 20, 50, 100]}
                                    defaultRows={20}
                                    onPageChange={handlePageChange}
                                    onLimitChange={setItemsPerPage}
                                />
                            )}
                        </div>
                    </motion.div>
                </div>
            </div>

            <TransactionModalManager
                modalType="EXPENSE"
                isOpen={showCreateExpenseModal}
                onClose={() => setShowCreateExpenseModal(false)}
                onSubmit={handleExpenseSuccess}
                formatCurrency={formatCurrency}
                summary={emptySummary}
                showClient={false}
            />

            <EditTransactionModalManager
                modalType="EXPENSE"
                isOpen={editModalOpen}
                onClose={closeEditModal}
                editRecord={editRecord}
                onSubmit={handleEditSuccess}
                formatCurrency={formatCurrency}
                summary={emptySummary}
            />

            <ExpenseEntryDetailsModal
                isOpen={detailsOpen}
                expense={detailsExpense}
                onClose={closeExpenseDetails}
                formatCurrency={formatCurrency}
            />
        </div>
    );
};

export default ViewExpenses;
