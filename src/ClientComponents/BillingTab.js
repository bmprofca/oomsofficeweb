import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    FiCalendar,
    FiFileText,
    FiLock,
    FiMoreVertical,
    FiPrinter,
    FiRefreshCw,
    FiXCircle,
} from 'react-icons/fi';
import { AiOutlineMail } from 'react-icons/ai';
import { FaWhatsapp } from 'react-icons/fa6';
import { PiFilePdfDuotone } from 'react-icons/pi';
import { TbFileInvoice } from 'react-icons/tb';
import toast from 'react-hot-toast';
import { checkPermissionSync, useUserPermissions } from '../utils/permission-helper';
import API_BASE_URL from '../utils/api-controller';
import getHeaders from '../utils/get-headers';
import useDebouncedValue from '../hooks/useDebouncedValue';
import TablePagination from '../components/TablePagination';
import AppDialog from '../components/AppDialog';
import EmailSelectionModal from '../components/email-selection';
import MobileSelectionModal from '../components/mobile-selection';

const BILL_LIST = '/billing/list';
const BILLING_GENERATE_BILLABLE = '/billing/generate/billable';
const BILLING_GENERATE_NONBILLABLE = '/billing/generate/nonbillable';

const STATUS_OPTIONS = [
    { value: '', label: 'All status' },
    { value: 'pending', label: 'Pending' },
    { value: 'generated', label: 'Generated' },
    { value: 'nonbillable', label: 'Non-billable' },
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

const normalizeBillingStatus = (raw) => {
    const s = String(raw || '').toLowerCase().replace(/\s+/g, ' ').trim();
    if (s === 'non billable' || s === 'non-billable' || s === 'nonbillable') return 'nonbillable';
    if (s === 'generated') return 'generated';
    return 'pending';
};

const billingStatusLabel = (status) => {
    if (status === 'nonbillable') return 'Non-billable';
    if (status === 'generated') return 'Generated';
    return 'Pending';
};

const billingStatusClass = (status) => {
    if (status === 'generated') {
        return 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border border-green-200';
    }
    if (status === 'nonbillable') {
        return 'bg-gradient-to-r from-red-100 to-pink-100 text-red-800 border border-red-200';
    }
    return 'bg-gradient-to-r from-yellow-100 to-amber-100 text-yellow-800 border border-yellow-200';
};

const normalizeBillingRow = (raw) => {
    const profile = raw.client?.profile || {};
    const charges = raw.charges || {};
    const dates = raw.dates || {};
    const firm = raw.firm || {};
    const service = raw.service || {};
    const billingStatus = normalizeBillingStatus(raw.billing_status);

    return {
        task_id: raw.task_id,
        client_name: profile.name || '—',
        firm_name: firm.firm_name || '—',
        service_name: service.name || '—',
        fees: Number(charges.fees) || 0,
        tax_rate: charges.tax_rate,
        tax_value: Number(charges.tax_value) || 0,
        total: Number(charges.total) || 0,
        create_date: dates.create_date,
        due_date: dates.due_date,
        billing_status: billingStatus,
        invoice_no: raw.invoice_no || null,
        invoice_id: raw.invoice_id || null,
        invoice_type: raw.invoice_type || raw.invoice?.type || 'sale',
        is_recurring: Boolean(raw.is_recurring),
    };
};

const SkeletonPulse = ({ className = '' }) => (
    <div className={`animate-pulse rounded-md bg-gray-200/90 ${className}`} />
);

const BillingTab = ({ clientUsername: clientUsernameProp } = {}) => {
    const { check } = useUserPermissions();
    const clientUsername =
        clientUsernameProp != null && String(clientUsernameProp).trim() !== ''
            ? String(clientUsernameProp).trim()
            : '';

    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearch = useDebouncedValue(searchTerm, 400);
    const [statusFilter, setStatusFilter] = useState('');
    const [billingRows, setBillingRows] = useState([]);
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
    const [billingActionLoading, setBillingActionLoading] = useState(false);
    const [downloadPdfLoading, setDownloadPdfLoading] = useState(null);
    const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
    const [whatsappModalOpen, setWhatsappModalOpen] = useState(false);
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
    const taskUsernameQuery = clientUsername
        ? `?username=${encodeURIComponent(clientUsername)}`
        : '';
    const canViewFees = checkPermissionSync('task_fees_view');
    const canApproveReject = check('finance_billing_approve_reject');

    const fetchBillingList = useCallback(async () => {
        if (!clientUsername) {
            setBillingRows([]);
            setPagination((prev) => ({ ...prev, total: 0, total_pages: 1, is_last_page: true }));
            setError('Client username is required to load billing.');
            return;
        }

        const headers = getHeaders();
        if (!headers) {
            setError('Authentication headers are missing. Please sign in again.');
            setBillingRows([]);
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
                username: clientUsername,
            });
            const q = debouncedSearch.trim();
            if (q) params.append('search', q);
            if (statusFilter) params.append('status', statusFilter);

            const response = await fetch(`${API_BASE_URL}${BILL_LIST}?${params.toString()}`, {
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

            setBillingRows(json.data.map(normalizeBillingRow));
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
            if (e.name === 'AbortError') return;
            console.error('Billing list fetch:', e);
            setBillingRows([]);
            setError(e.message || 'Failed to load billing list');
        } finally {
            if (listFetchAbortRef.current === ac) {
                setLoading(false);
            }
        }
    }, [clientUsername, pagination.page_no, pagination.limit, debouncedSearch, statusFilter]);

    useEffect(() => {
        setPagination((prev) => (prev.page_no !== 1 ? { ...prev, page_no: 1 } : prev));
    }, [debouncedSearch, statusFilter]);

    useEffect(() => {
        fetchBillingList();
    }, [fetchBillingList]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (!event.target.closest('.billing-tab-dropdown')) {
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
                : billingRows,
        [loading, billingRows]
    );

    const activeItem = useMemo(
        () => billingRows.find((item) => item.task_id === activeRowDropdown) || null,
        [billingRows, activeRowDropdown]
    );

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

    const toggleRowDropdown = (taskId, e) => {
        if (activeRowDropdown === taskId) {
            setActiveRowDropdown(null);
            return;
        }
        const row = billingRows.find((item) => item.task_id === taskId);
        const rect = e.currentTarget.getBoundingClientRect();
        const estimatedHeight = row?.billing_status === 'pending' ? 252 : row?.billing_status === 'generated' ? 180 : 132;
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

    const handleGenerateSingleTask = (taskId) => {
        if (billingActionLoading) return;
        setActiveRowDropdown(null);
        if (!canApproveReject) {
            toast.error('Need Access Permission');
            return;
        }
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
                        await fetchBillingList();
                        return {
                            variant: 'success',
                            title: 'Bill Generated!',
                            message: (json.message || 'Bill generated successfully.') + inv,
                        };
                    }
                    return {
                        variant: 'error',
                        title: 'Failed to Generate',
                        message: json.message || `Could not generate bill (${response.status})`,
                    };
                } catch (e) {
                    console.error('Generate single bill:', e);
                    return { variant: 'error', title: 'Error', message: e.message || 'Failed to generate bill' };
                } finally {
                    setBillingActionLoading(false);
                }
            },
        });
    };

    const handleMarkNonBillable = (taskId) => {
        if (billingActionLoading) return;
        setActiveRowDropdown(null);
        if (!canApproveReject) {
            toast.error('Need Access Permission');
            return;
        }
        showConfirm({
            variant: 'danger',
            title: 'Mark as Non-Billable',
            message: 'This task will be marked as non-billable. This cannot be undone from here.',
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
                        body: JSON.stringify({ task_ids: [taskId] }),
                    });
                    const json = await response.json().catch(() => ({}));
                    if (response.ok && json.success) {
                        await fetchBillingList();
                        return {
                            variant: 'success',
                            title: 'Done',
                            message: json.message || 'Task marked as non-billable.',
                        };
                    }
                    return {
                        variant: 'error',
                        title: 'Failed',
                        message: json.message || `Could not update task (${response.status})`,
                    };
                } catch (e) {
                    console.error('Non-billable:', e);
                    return { variant: 'error', title: 'Error', message: e.message || 'Failed to mark task as non-billable' };
                } finally {
                    setBillingActionLoading(false);
                }
            },
        });
    };

    const handleDownloadPdf = async (item) => {
        if (!item?.invoice_id) {
            showConfirm({
                variant: 'warning',
                title: 'No Invoice',
                message: 'No invoice ID found for this bill.',
                confirmText: 'OK',
                cancelText: null,
                onConfirm: async () => {},
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
                onConfirm: async () => {},
            });
        } finally {
            setDownloadPdfLoading(null);
        }
    };

    const handlePrint = () => {
        toast.success('Print queued');
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-gradient-to-br from-gray-50 to-white rounded-2xl border border-gray-100 shadow-xl p-6"
        >
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4">
                <div className="space-y-1">
                    <h3 className="text-base sm:text-lg font-bold text-slate-800 bg-gradient-to-r from-blue-600 to-indigo-700 bg-clip-text text-transparent">
                        Billing
                    </h3>
                </div>
                <button
                    type="button"
                    onClick={fetchBillingList}
                    disabled={loading}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                >
                    <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
            </div>

            <div className="flex flex-col md:flex-row gap-3 mb-6">
                <div className="flex-1">
                    <input
                        type="text"
                        placeholder="Search tasks, services, firms..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full px-4 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white outline-none transition-all"
                    />
                </div>
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-4 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white min-w-[160px] outline-none"
                >
                    {STATUS_OPTIONS.map((opt) => (
                        <option key={opt.value || 'all'} value={opt.value}>
                            {opt.label}
                        </option>
                    ))}
                </select>
            </div>

            {error && !loading && (
                <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                </div>
            )}

            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[48rem]">
                        <thead className="bg-gradient-to-r from-blue-50 to-indigo-50">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider w-12">
                                    #
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                    Service & Firm
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                    Dates
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                    Amount
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider w-14">
                                    Action
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {!loading && rowsForTable.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-12 text-center">
                                        <div className="w-16 h-16 mx-auto bg-gradient-to-r from-gray-100 to-gray-200 rounded-full flex items-center justify-center mb-4">
                                            <FiFileText className="w-8 h-8 text-slate-400" />
                                        </div>
                                        <h3 className="text-sm font-semibold text-slate-800 mb-2">No billing tasks found</h3>
                                        <p className="text-slate-600">Try adjusting your search or status filter</p>
                                    </td>
                                </tr>
                            ) : (
                                rowsForTable.map((row, index) => {
                                    if (row.__skeleton) {
                                        return (
                                            <tr key={row.task_id}>
                                                <td className="px-4 py-4"><SkeletonPulse className="h-4 w-6" /></td>
                                                <td className="px-4 py-4"><SkeletonPulse className="h-10 w-full" /></td>
                                                <td className="px-4 py-4"><SkeletonPulse className="h-6 w-32" /></td>
                                                <td className="px-4 py-4"><SkeletonPulse className="h-6 w-20" /></td>
                                                <td className="px-4 py-4"><SkeletonPulse className="h-6 w-24" /></td>
                                                <td className="px-4 py-4"><SkeletonPulse className="h-6 w-6 mx-auto" /></td>
                                            </tr>
                                        );
                                    }

                                    const serialNo = (pagination.page_no - 1) * pagination.limit + index + 1;

                                    return (
                                        <motion.tr
                                            key={row.task_id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: index * 0.03 }}
                                            className="hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-indigo-50/50 transition-all duration-300"
                                        >
                                            <td className="px-4 py-4 text-sm text-slate-600">{serialNo}</td>
                                            <td className="px-4 py-4">
                                                <div className="space-y-1">
                                                    <Link
                                                        to={`/task/${row.task_id}${taskUsernameQuery}`}
                                                        className="font-semibold text-indigo-600 hover:text-indigo-800 no-underline"
                                                    >
                                                        {row.service_name}
                                                    </Link>
                                                    <div className="text-sm text-slate-600">{row.firm_name}</div>
                                                    {row.is_recurring && (
                                                        <span className="inline-flex text-[10px] font-medium px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                                                            Compliance
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="space-y-1 text-sm text-slate-600">
                                                    <div className="flex items-center gap-1.5">
                                                        <FiCalendar className="w-3.5 h-3.5 shrink-0" />
                                                        Created: {formatDate(row.create_date)}
                                                    </div>
                                                    <div className="text-xs text-slate-500">
                                                        Due: {formatDate(row.due_date)}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4">
                                                <div>
                                                    <div
                                                        className={`text-base font-bold text-slate-800 ${!canViewFees ? 'blur-[3.5px] select-none' : ''
                                                            }`}
                                                    >
                                                        {formatCurrency(row.total)}
                                                    </div>
                                                    <div
                                                        className={`text-xs text-slate-500 ${!canViewFees ? 'blur-[3.5px] select-none' : ''
                                                            }`}
                                                    >
                                                        Fees {formatCurrency(row.fees)}
                                                        {row.tax_rate != null ? ` + ${row.tax_rate}% tax` : ''}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4">
                                                <span
                                                    className={`inline-flex px-3 py-1.5 rounded-full text-xs font-semibold ${billingStatusClass(
                                                        row.billing_status
                                                    )}`}
                                                >
                                                    {billingStatusLabel(row.billing_status)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="flex items-center justify-center">
                                                    <motion.button
                                                        type="button"
                                                        className="billing-tab-dropdown p-1.5 text-gray-400 hover:text-gray-700 rounded hover:bg-gray-100 transition-all duration-150"
                                                        onClick={(e) => toggleRowDropdown(row.task_id, e)}
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

                {(loading || billingRows.length > 0) && (
                    <TablePagination
                        showRange
                        showRows
                        showJump
                        showFirstLast
                        rowOptions={[10, 20, 50, 100]}
                        defaultRows={20}
                        className="!bg-white !from-white !to-white border-t border-gray-200 px-4 py-3"
                        page={pagination.page_no}
                        limit={pagination.limit}
                        total={pagination.total}
                        totalPages={pagination.total_pages}
                        isLastPage={pagination.is_last_page}
                        onPageChange={(page) =>
                            setPagination((prev) => ({ ...prev, page_no: page }))
                        }
                        onLimitChange={(limit) =>
                            setPagination((prev) => ({ ...prev, limit, page_no: 1 }))
                        }
                    />
                )}
            </div>

            {activeRowDropdown !== null && activeItem &&
                createPortal(
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: dropdownPos.openUpward ? 6 : -6 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ duration: 0.12 }}
                        className="billing-tab-dropdown fixed bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden"
                        style={{
                            top: dropdownPos.top,
                            bottom: dropdownPos.bottom,
                            right: dropdownPos.right,
                            width: '185px',
                            zIndex: 9999,
                        }}
                    >
                        <div className="py-1">
                            {activeItem.billing_status === 'pending' && (
                                <>
                                    <button
                                        type="button"
                                        className={`flex items-center w-full px-4 py-2.5 text-sm text-emerald-700 hover:bg-emerald-50 transition-colors duration-150 ${!canApproveReject ? 'opacity-60 cursor-not-allowed hover:bg-transparent' : ''
                                            }`}
                                        onClick={() => handleGenerateSingleTask(activeItem.task_id)}
                                    >
                                        {!canApproveReject ? (
                                            <FiLock className="w-4 h-4 mr-3 text-slate-400" />
                                        ) : (
                                            <TbFileInvoice className="w-4 h-4 mr-3 text-emerald-600" />
                                        )}
                                        Generate Bill
                                        {!canApproveReject && (
                                            <FiLock className="w-3.5 h-3.5 text-slate-400 ml-auto" />
                                        )}
                                    </button>
                                    <button
                                        type="button"
                                        className={`flex items-center w-full px-4 py-2.5 text-sm text-rose-700 hover:bg-rose-50 transition-colors duration-150 ${!canApproveReject ? 'opacity-60 cursor-not-allowed hover:bg-transparent' : ''
                                            }`}
                                        onClick={() => handleMarkNonBillable(activeItem.task_id)}
                                    >
                                        {!canApproveReject ? (
                                            <FiLock className="w-4 h-4 mr-3 text-slate-400" />
                                        ) : (
                                            <FiXCircle className="w-4 h-4 mr-3 text-rose-500" />
                                        )}
                                        Mark Non-Billable
                                        {!canApproveReject && (
                                            <FiLock className="w-3.5 h-3.5 text-slate-400 ml-auto" />
                                        )}
                                    </button>
                                    <div className="border-t border-gray-100" />
                                </>
                            )}
                            {activeItem.billing_status === 'generated' && (
                                <>
                                    <button
                                        type="button"
                                        className="flex items-center w-full px-4 py-2.5 text-sm text-indigo-700 hover:bg-indigo-50 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                                        disabled={downloadPdfLoading === activeItem.task_id}
                                        onClick={() => {
                                            setActiveRowDropdown(null);
                                            handleDownloadPdf(activeItem);
                                        }}
                                    >
                                        {downloadPdfLoading === activeItem.task_id ? (
                                            <>
                                                <FiRefreshCw className="w-4 h-4 mr-3 text-indigo-500 animate-spin" />
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
                                type="button"
                                className="flex items-center w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-150"
                                onClick={() => {
                                    setActiveRowDropdown(null);
                                    handlePrint();
                                }}
                            >
                                <FiPrinter className="w-4 h-4 mr-3" />
                                Print
                            </button>
                            <button
                                type="button"
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
                                type="button"
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
                    </motion.div>,
                    document.body
                )}

            <EmailSelectionModal
                isOpen={isEmailModalOpen}
                onClose={() => setIsEmailModalOpen(false)}
                onSubmit={() => setIsEmailModalOpen(false)}
            />
            <MobileSelectionModal
                isOpen={whatsappModalOpen}
                onClose={() => setWhatsappModalOpen(false)}
                onSubmit={() => setWhatsappModalOpen(false)}
            />

            <AppDialog dialog={dialog} onClose={closeDialog} onConfirm={handleDialogConfirm} />
        </motion.div>
    );
};

export default BillingTab;
