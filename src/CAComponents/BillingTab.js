import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    FiBriefcase,
    FiCalendar,
    FiFileText,
    FiMoreVertical,
    FiRefreshCw,
    FiSearch,
    FiUser,
    FiXCircle,
} from 'react-icons/fi';
import { TbFileInvoice, TbReceipt } from 'react-icons/tb';
import { HiOutlineCurrencyRupee } from 'react-icons/hi2';
import toast from 'react-hot-toast';
import { checkPermissionSync, useUserPermissions } from '../utils/permission-helper';
import API_BASE_URL from '../utils/api-controller';
import getHeaders from '../utils/get-headers';
import useDebouncedValue from '../hooks/useDebouncedValue';
import TablePagination from '../components/TablePagination';
import AppDialog from '../components/AppDialog';
import CustomSelect from '../components/CustomSelect';
import { optionByValue } from '../utils/customSelectHelpers';
import CaPurchaseGenerateModal from '../components/Modals/CaPurchaseGenerateModal';

const CA_BILLING_LIST = '/task/ca-billing/list';
const CA_BILLING_GENERATE = '/task/ca-billing/generate';
const CA_BILLING_CANCEL = '/task/ca-billing/cancel';

const STATUS_OPTIONS = [
    { value: '0', label: 'Pending' },
    { value: '1', label: 'Generated' },
    { value: '2', label: 'Cancelled' },
];

const formatDate = (value) => {
    if (!value) return '—';
    const dt = new Date(value);
    if (Number.isNaN(dt.getTime())) return '—';
    const day = String(dt.getDate()).padStart(2, '0');
    const month = dt.toLocaleString('en-US', { month: 'short' });
    const year = dt.getFullYear();
    return `${day} ${month} ${year}`;
};

const formatCurrency = (value) => {
    const n = Number(value);
    if (!Number.isFinite(n)) return '—';
    return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
};

const statusLabel = (status) => {
    if (status === 1) return 'Generated';
    if (status === 2) return 'Cancelled';
    return 'Pending';
};

const statusClass = (status) => {
    if (status === 1) {
        return 'bg-emerald-50 text-emerald-800 border border-emerald-200';
    }
    if (status === 2) {
        return 'bg-rose-50 text-rose-800 border border-rose-200';
    }
    return 'bg-amber-50 text-amber-800 border border-amber-200';
};

const normalizeRow = (raw) => {
    const profile = raw.client?.profile || {};
    const charges = raw.charges || {};
    const dates = raw.dates || {};
    const firm = raw.firm || {};
    const service = raw.service || {};
    const isCaPurchased = Number(raw.is_ca_purchased) || 0;
    return {
        task_id: raw.task_id,
        client_name: profile.name || raw.client?.username || '—',
        client_username: raw.client?.username || '',
        firm_name: firm.firm_name || '—',
        service_name: service.name || '—',
        service_fees: Number(charges.fees) || 0,
        purchase_amount:
            isCaPurchased === 1 && raw.purchase_amount != null
                ? Number(raw.purchase_amount)
                : null,
        purchase_invoice_no: isCaPurchased === 1 ? raw.purchase_invoice_no || null : null,
        create_date: dates.create_date,
        due_date: dates.due_date,
        is_ca_purchased: isCaPurchased,
    };
};

const SkeletonPulse = ({ className = '' }) => (
    <div className={`animate-pulse rounded-md bg-slate-200/90 ${className}`} />
);

export default function BillingTab({ caUsername: caUsernameProp } = {}) {
    const { check } = useUserPermissions();
    const caUsername =
        caUsernameProp != null && String(caUsernameProp).trim() !== ''
            ? String(caUsernameProp).trim()
            : '';

    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearch = useDebouncedValue(searchTerm, 400);
    const [statusFilter, setStatusFilter] = useState('0');
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [pagination, setPagination] = useState({
        page_no: 1,
        limit: 20,
        total: 0,
        total_pages: 1,
        is_last_page: false,
    });
    const [activeRowDropdown, setActiveRowDropdown] = useState(null);
    const [dropdownPos, setDropdownPos] = useState({ top: 0, right: 0, openUpward: false });
    const [actionLoading, setActionLoading] = useState(false);
    const [generateModal, setGenerateModal] = useState({
        open: false,
        row: null,
    });
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

    const listFetchAbortRef = useRef(null);
    const canViewFees = checkPermissionSync('task_fees_view');
    const canApproveReject = check('finance_billing_approve_reject');
    const showPurchaseAmountColumn = String(statusFilter) === '1';
    const tableColSpan = showPurchaseAmountColumn ? 7 : 6;

    const fetchList = useCallback(async () => {
        if (!caUsername) {
            setRows([]);
            setPagination((prev) => ({ ...prev, total: 0, total_pages: 1, is_last_page: true }));
            setError('CA username is required to load billing.');
            return;
        }

        const headers = getHeaders();
        if (!headers) {
            setError('Authentication headers are missing. Please sign in again.');
            setRows([]);
            return;
        }

        listFetchAbortRef.current?.abort();
        const ac = new AbortController();
        listFetchAbortRef.current = ac;

        setLoading(true);
        setError('');
        try {
            const params = new URLSearchParams({
                page_no: String(pagination.page_no),
                limit: String(pagination.limit),
                username: caUsername,
                status: statusFilter === '' ? '0' : String(statusFilter),
            });
            const q = debouncedSearch.trim();
            if (q) params.append('search', q);

            const response = await fetch(`${API_BASE_URL}${CA_BILLING_LIST}?${params.toString()}`, {
                method: 'GET',
                headers,
                signal: ac.signal,
            });
            const json = await response.json();

            if (!response.ok) {
                throw new Error(json?.message || `Request failed (${response.status})`);
            }
            if (!json.success || !Array.isArray(json.data)) {
                throw new Error(json?.message || 'Unexpected response from server');
            }

            setRows(json.data.map(normalizeRow));
            const pg = json.pagination || {};
            setPagination((prev) => ({
                ...prev,
                page_no: pg.page_no != null ? Number(pg.page_no) : prev.page_no,
                limit: pg.limit != null ? Number(pg.limit) : prev.limit,
                total: pg.total != null ? Number(pg.total) : json.data.length,
                total_pages: pg.total_pages != null ? Number(pg.total_pages) : 1,
                is_last_page: Boolean(pg.is_last_page),
            }));
        } catch (e) {
            if (e?.name === 'AbortError') return;
            console.error('CA billing list:', e);
            setError(e.message || 'Failed to load CA billing list');
            setRows([]);
        } finally {
            if (listFetchAbortRef.current === ac) {
                setLoading(false);
            }
        }
    }, [caUsername, pagination.page_no, pagination.limit, debouncedSearch, statusFilter]);

    useEffect(() => {
        setPagination((prev) => (prev.page_no !== 1 ? { ...prev, page_no: 1 } : prev));
    }, [debouncedSearch, statusFilter]);

    useEffect(() => {
        fetchList();
    }, [fetchList]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (!event.target.closest('.ca-billing-tab-dropdown')) {
                setActiveRowDropdown(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        const handleScroll = () => setActiveRowDropdown(null);
        window.addEventListener('scroll', handleScroll, true);
        return () => window.removeEventListener('scroll', handleScroll, true);
    }, []);

    const rowsForTable = useMemo(
        () =>
            loading
                ? Array.from({ length: 6 }, (_, i) => ({ __skeleton: true, task_id: `sk-${i}` }))
                : rows,
        [loading, rows]
    );

    const activeItem = useMemo(
        () => rows.find((item) => item.task_id === activeRowDropdown) || null,
        [rows, activeRowDropdown]
    );

    const showConfirm = ({
        variant = 'warning',
        title,
        message,
        confirmText = 'Confirm',
        cancelText = 'Cancel',
        onConfirm,
    }) => {
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

    const toggleRowDropdown = (taskId, e) => {
        if (activeRowDropdown === taskId) {
            setActiveRowDropdown(null);
            return;
        }
        const row = rows.find((item) => item.task_id === taskId);
        const rect = e.currentTarget.getBoundingClientRect();
        const estimatedHeight = row?.is_ca_purchased === 0 ? 160 : 80;
        const spaceBelow = window.innerHeight - rect.bottom;
        const openUpward = spaceBelow < estimatedHeight + 8;
        setDropdownPos({
            top: openUpward ? undefined : rect.bottom + 4,
            bottom: openUpward ? window.innerHeight - rect.top + 4 : undefined,
            right: window.innerWidth - rect.right,
            openUpward,
        });
        setActiveRowDropdown(taskId);
    };

    const handleGenerate = (taskId) => {
        if (actionLoading) return;
        setActiveRowDropdown(null);
        if (!canApproveReject) {
            toast.error('Need Access Permission');
            return;
        }
        const row = rows.find((item) => item.task_id === taskId);
        if (!row) return;
        setGenerateModal({ open: true, row });
    };

    const closeGenerateModal = () => {
        if (actionLoading) return;
        setGenerateModal({ open: false, row: null });
    };

    const submitGeneratePurchase = async (amountNum) => {
        const row = generateModal.row;
        if (!row?.task_id) return { success: false, error: 'Task not found' };

        const headers = getHeaders();
        if (!headers) {
            toast.error('Missing authentication. Please sign in again.');
            return { success: false, error: 'Missing authentication. Please sign in again.' };
        }

        setActionLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}${CA_BILLING_GENERATE}`, {
                method: 'POST',
                headers: { ...headers, 'Content-Type': 'application/json' },
                body: JSON.stringify({ task_id: row.task_id, amount: amountNum }),
            });
            const json = await response.json().catch(() => ({}));
            if (response.ok && json.success) {
                const inv = json.data?.purchase?.invoice_no
                    ? ` Invoice No: ${json.data.purchase.invoice_no}.`
                    : '';
                setGenerateModal({ open: false, row: null });
                await fetchList();
                setDialog({
                    open: true,
                    variant: 'success',
                    title: 'Purchase Generated!',
                    message: (json.message || 'CA purchase generated successfully.') + inv,
                    confirmText: 'Close',
                    cancelText: null,
                    onConfirm: null,
                    loading: false,
                });
                return { success: true };
            }
            return {
                success: false,
                error: json.message || `Could not generate purchase (${response.status})`,
            };
        } catch (e) {
            console.error('CA billing generate:', e);
            return { success: false, error: e.message || 'Failed to generate purchase' };
        } finally {
            setActionLoading(false);
        }
    };

    const handleCancel = (taskId) => {
        if (actionLoading) return;
        setActiveRowDropdown(null);
        if (!canApproveReject) {
            toast.error('Need Access Permission');
            return;
        }
        showConfirm({
            variant: 'danger',
            title: 'Cancel CA Purchase',
            message: 'This task will be marked as cancelled for CA purchase. No invoice will be created.',
            confirmText: 'Cancel Purchase',
            cancelText: 'Keep Pending',
            onConfirm: async () => {
                const headers = getHeaders();
                if (!headers) {
                    return {
                        variant: 'error',
                        title: 'Authentication Error',
                        message: 'Missing authentication. Please sign in again.',
                    };
                }
                setActionLoading(true);
                try {
                    const response = await fetch(`${API_BASE_URL}${CA_BILLING_CANCEL}`, {
                        method: 'POST',
                        headers: { ...headers, 'Content-Type': 'application/json' },
                        body: JSON.stringify({ task_id: taskId }),
                    });
                    const json = await response.json().catch(() => ({}));
                    if (response.ok && json.success) {
                        await fetchList();
                        return {
                            variant: 'success',
                            title: 'Cancelled',
                            message: json.message || 'CA purchase cancelled successfully.',
                        };
                    }
                    return {
                        variant: 'error',
                        title: 'Failed',
                        message: json.message || `Could not cancel (${response.status})`,
                    };
                } catch (e) {
                    console.error('CA billing cancel:', e);
                    return { variant: 'error', title: 'Error', message: e.message || 'Failed to cancel' };
                } finally {
                    setActionLoading(false);
                }
            },
        });
    };

    if (!caUsername) {
        return (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-6 text-center text-sm text-amber-800">
                CA username is required to load billing.
            </div>
        );
    }

    return (
        <div className="w-full">
            <div className="overflow-hidden rounded-2xl border border-indigo-100 bg-white shadow-sm">
                {/* Card header */}
                <div className="border-b border-indigo-100 bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 px-4 py-4 sm:px-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-start gap-3 min-w-0">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/20 text-white ring-1 ring-white/30 backdrop-blur-sm">
                                <TbReceipt className="h-5 w-5" />
                            </div>
                            <div className="min-w-0">
                                <h3 className="text-base font-semibold text-white tracking-tight">CA Billing</h3>
                                <p className="mt-0.5 text-xs text-indigo-100">
                                    Generate or cancel purchases for tasks assigned to this CA
                                </p>
                            </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/15 px-2.5 py-1.5 text-xs font-medium text-white ring-1 ring-white/25">
                                <FiFileText className="h-3.5 w-3.5" />
                                {loading ? '…' : pagination.total} tasks
                            </span>
                            <button
                                type="button"
                                onClick={fetchList}
                                disabled={loading}
                                className="inline-flex items-center gap-2 rounded-xl bg-white px-3.5 py-2 text-sm font-medium text-indigo-700 shadow-sm transition hover:bg-indigo-50 disabled:opacity-60"
                            >
                                <FiRefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                                Refresh
                            </button>
                        </div>
                    </div>

                    <div className="mt-4 flex flex-col gap-2.5 md:flex-row md:items-center">
                        <div className="relative flex-1">
                            <FiSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-indigo-200" />
                            <input
                                type="text"
                                placeholder="Search tasks, services, firms, clients..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full rounded-xl border-0 bg-white/15 py-2.5 pl-9 pr-3 text-sm text-white placeholder:text-indigo-200 outline-none ring-1 ring-white/25 focus:bg-white/20 focus:ring-2 focus:ring-white/40"
                            />
                        </div>
                        <div className="min-w-[160px] rounded-xl bg-white/95 p-0.5 shadow-sm">
                            <CustomSelect
                                options={STATUS_OPTIONS}
                                value={optionByValue(STATUS_OPTIONS, statusFilter)}
                                onChange={(opt) => setStatusFilter(opt?.value ?? '0')}
                                getOptionLabel={(opt) => opt.label}
                                getOptionValue={(opt) => opt.value}
                                placeholder="Status"
                                searchPlaceholder="Search status..."
                                isClearable={false}
                            />
                        </div>
                    </div>
                </div>

                {error && !loading && (
                    <div className="mx-4 mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 sm:mx-5">
                        {error}
                    </div>
                )}

                <div className="overflow-x-auto">
                    <table className={`w-full ${showPurchaseAmountColumn ? 'min-w-[52rem]' : 'min-w-[44rem]'}`}>
                        <thead>
                            <tr className="border-b border-slate-100 bg-slate-50/90">
                                <th className="w-12 px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                                    #
                                </th>
                                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                                    <span className="inline-flex items-center gap-1.5">
                                        <FiBriefcase className="h-3.5 w-3.5 text-indigo-500" />
                                        Service & Firm
                                    </span>
                                </th>
                                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                                    <span className="inline-flex items-center gap-1.5">
                                        <FiUser className="h-3.5 w-3.5 text-violet-500" />
                                        Client
                                    </span>
                                </th>
                                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                                    <span className="inline-flex items-center gap-1.5">
                                        <FiCalendar className="h-3.5 w-3.5 text-sky-500" />
                                        Dates
                                    </span>
                                </th>
                                {showPurchaseAmountColumn && (
                                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                                        <span className="inline-flex items-center gap-1.5">
                                            <HiOutlineCurrencyRupee className="h-3.5 w-3.5 text-emerald-600" />
                                            Purchase amount
                                        </span>
                                    </th>
                                )}
                                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                                    Status
                                </th>
                                <th className="w-14 px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                                    Action
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {!loading && rowsForTable.length === 0 ? (
                                <tr>
                                    <td colSpan={tableColSpan} className="px-6 py-14 text-center">
                                        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-50 to-violet-100 text-indigo-500">
                                            <TbReceipt className="h-7 w-7" />
                                        </div>
                                        <h3 className="mb-1 text-sm font-semibold text-slate-800">
                                            No CA billing tasks found
                                        </h3>
                                        <p className="text-xs text-slate-500">
                                            Try adjusting your search or status filter
                                        </p>
                                    </td>
                                </tr>
                            ) : (
                                rowsForTable.map((row, index) => {
                                    if (row.__skeleton) {
                                        return (
                                            <tr key={row.task_id}>
                                                <td className="px-4 py-4">
                                                    <SkeletonPulse className="h-4 w-6" />
                                                </td>
                                                <td className="px-4 py-4">
                                                    <SkeletonPulse className="h-10 w-full" />
                                                </td>
                                                <td className="px-4 py-4">
                                                    <SkeletonPulse className="h-6 w-28" />
                                                </td>
                                                <td className="px-4 py-4">
                                                    <SkeletonPulse className="h-6 w-32" />
                                                </td>
                                                {showPurchaseAmountColumn && (
                                                    <td className="px-4 py-4">
                                                        <SkeletonPulse className="h-6 w-20" />
                                                    </td>
                                                )}
                                                <td className="px-4 py-4">
                                                    <SkeletonPulse className="h-6 w-24" />
                                                </td>
                                                <td className="px-4 py-4">
                                                    <SkeletonPulse className="mx-auto h-6 w-6" />
                                                </td>
                                            </tr>
                                        );
                                    }

                                    const serialNo = (pagination.page_no - 1) * pagination.limit + index + 1;

                                    return (
                                        <motion.tr
                                            key={row.task_id}
                                            initial={{ opacity: 0, y: 8 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: index * 0.02 }}
                                            className="transition-colors hover:bg-indigo-50/40"
                                        >
                                            <td className="px-4 py-3.5 text-sm tabular-nums text-slate-500">
                                                {serialNo}
                                            </td>
                                            <td className="px-4 py-3.5">
                                                <div className="space-y-0.5">
                                                    <Link
                                                        to={`/task/${row.task_id}${
                                                            row.client_username
                                                                ? `?username=${encodeURIComponent(row.client_username)}`
                                                                : ''
                                                        }`}
                                                        className="font-semibold text-indigo-600 no-underline hover:text-indigo-800"
                                                    >
                                                        {row.service_name}
                                                    </Link>
                                                    <div className="flex items-center gap-1 text-sm text-slate-600">
                                                        <FiBriefcase className="h-3 w-3 shrink-0 text-slate-400" />
                                                        {row.firm_name}
                                                    </div>
                                                    <div className="text-[11px] text-slate-400">{row.task_id}</div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3.5">
                                                <div className="flex items-center gap-2 text-sm text-slate-700">
                                                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
                                                        <FiUser className="h-3.5 w-3.5" />
                                                    </span>
                                                    <span className="truncate">{row.client_name}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3.5">
                                                <div className="space-y-1 text-sm text-slate-600">
                                                    <div className="flex items-center gap-1.5">
                                                        <FiCalendar className="h-3.5 w-3.5 shrink-0 text-sky-500" />
                                                        {formatDate(row.create_date)}
                                                    </div>
                                                    <div className="pl-5 text-xs text-slate-500">
                                                        Due {formatDate(row.due_date)}
                                                    </div>
                                                </div>
                                            </td>
                                            {showPurchaseAmountColumn && (
                                                <td className="px-4 py-3.5">
                                                    <div>
                                                        <div
                                                            className={`text-base font-bold tabular-nums text-emerald-700 ${
                                                                !canViewFees ? 'blur-[3.5px] select-none' : ''
                                                            }`}
                                                        >
                                                            {formatCurrency(row.purchase_amount)}
                                                        </div>
                                                        {row.purchase_invoice_no ? (
                                                            <div className="mt-0.5 inline-flex items-center gap-1 text-xs text-slate-500">
                                                                <TbFileInvoice className="h-3 w-3" />
                                                                {row.purchase_invoice_no}
                                                            </div>
                                                        ) : null}
                                                    </div>
                                                </td>
                                            )}
                                            <td className="px-4 py-3.5">
                                                <span
                                                    className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusClass(
                                                        row.is_ca_purchased
                                                    )}`}
                                                >
                                                    {statusLabel(row.is_ca_purchased)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3.5">
                                                <div className="flex items-center justify-center">
                                                    {row.is_ca_purchased === 0 ? (
                                                        <motion.button
                                                            type="button"
                                                            className="ca-billing-tab-dropdown rounded-lg p-1.5 text-slate-400 transition hover:bg-indigo-50 hover:text-indigo-600"
                                                            onClick={(e) => toggleRowDropdown(row.task_id, e)}
                                                            whileHover={{ scale: 1.08 }}
                                                            whileTap={{ scale: 0.95 }}
                                                        >
                                                            <FiMoreVertical className="h-4 w-4" />
                                                        </motion.button>
                                                    ) : (
                                                        <span className="text-xs text-slate-300">—</span>
                                                    )}
                                                </div>
                                            </td>
                                        </motion.tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {(loading || rows.length > 0) && (
                    <TablePagination
                        showRange
                        showRows
                        showJump
                        showFirstLast
                        rowOptions={[10, 20, 50, 100]}
                        defaultRows={20}
                        className="!bg-slate-50/80 !from-slate-50 !to-slate-50 border-t border-slate-100 px-4 py-3"
                        page={pagination.page_no}
                        limit={pagination.limit}
                        total={pagination.total}
                        totalPages={pagination.total_pages}
                        isLastPage={pagination.is_last_page}
                        onPageChange={(page) => setPagination((prev) => ({ ...prev, page_no: page }))}
                        onLimitChange={(limit) => setPagination((prev) => ({ ...prev, limit, page_no: 1 }))}
                    />
                )}
            </div>

            {activeRowDropdown &&
                activeItem &&
                createPortal(
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: dropdownPos.openUpward ? 6 : -6 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ duration: 0.12 }}
                        className="ca-billing-tab-dropdown fixed z-[10040] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl"
                        style={{
                            top: dropdownPos.top,
                            bottom: dropdownPos.bottom,
                            right: dropdownPos.right,
                            width: 200,
                        }}
                    >
                        {activeItem.is_ca_purchased === 0 && (
                            <>
                                <button
                                    type="button"
                                    disabled={actionLoading}
                                    onClick={() => handleGenerate(activeItem.task_id)}
                                    className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-indigo-700 hover:bg-indigo-50 disabled:opacity-50"
                                >
                                    <TbFileInvoice className="h-4 w-4" />
                                    Generate purchase
                                </button>
                                <button
                                    type="button"
                                    disabled={actionLoading}
                                    onClick={() => handleCancel(activeItem.task_id)}
                                    className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                                >
                                    <FiXCircle className="h-4 w-4" />
                                    Cancel
                                </button>
                            </>
                        )}
                    </motion.div>,
                    document.body
                )}

            <CaPurchaseGenerateModal
                isOpen={Boolean(generateModal.open)}
                row={generateModal.row}
                onClose={closeGenerateModal}
                onSubmit={submitGeneratePurchase}
                submitting={actionLoading}
                canViewFees={canViewFees}
            />

            <AppDialog dialog={dialog} onClose={closeDialog} onConfirm={handleDialogConfirm} />
        </div>
    );
}
