import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
    FiCheckCircle,
    FiClock,
    FiEye,
    FiMoreVertical,
    FiRefreshCw,
    FiSearch,
    FiX,
    FiXCircle,
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import { Header, Sidebar } from '../../components/header';
import TablePagination from '../../components/TablePagination';
import ServiceRequestApproveModal from '../../components/Modals/ServiceRequestApproveModal';
import useDebouncedValue from '../../hooks/useDebouncedValue';
import {
    fetchServiceRequestList,
    rejectServiceRequest,
} from '../../services/serviceRequestService';

const MODAL_BODY_CLASS =
    'px-5 py-4 flex-1 min-h-0 overflow-y-auto overscroll-y-contain [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden';

const STATUS_TABS = [
    { id: 'all', label: 'All' },
    { id: 'pending', label: 'Pending' },
    { id: 'approved', label: 'Approved' },
    { id: 'rejected', label: 'Rejected' },
];

const formatCurrency = (charges) => {
    const n = Number(charges?.amount ?? charges?.fees);
    if (!Number.isFinite(n)) return '—';
    return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
};

const formatDate = (value) => {
    if (!value) return '—';
    const dt = new Date(value);
    if (Number.isNaN(dt.getTime())) return '—';
    return dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const StatusBadge = ({ status }) => {
    const s = String(status || '').toLowerCase();
    if (s === 'approved') {
        return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <FiCheckCircle className="w-3 h-3" /> Approved
            </span>
        );
    }
    if (s === 'rejected') {
        return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
                <FiXCircle className="w-3 h-3" /> Rejected
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            <FiClock className="w-3 h-3" /> Pending
        </span>
    );
};

const ServiceRequestList = () => {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(() => {
        const saved = localStorage.getItem('sidebarMinimized');
        return saved ? JSON.parse(saved) : false;
    });

    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearch = useDebouncedValue(searchTerm, 400);
    const [statusTab, setStatusTab] = useState('pending');
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

    const [activeMenuId, setActiveMenuId] = useState(null);
    const [menuPos, setMenuPos] = useState({ top: 0, right: 0 });
    const menuAnchorRef = useRef(null);

    const [detailRow, setDetailRow] = useState(null);
    const [approveRow, setApproveRow] = useState(null);
    const [rejectRow, setRejectRow] = useState(null);
    const [rejectRemark, setRejectRemark] = useState('');
    const [rejecting, setRejecting] = useState(false);

    const listAbortRef = useRef(null);

    const listStatus = useMemo(
        () => (statusTab === 'all' ? null : statusTab),
        [statusTab]
    );

    const loadList = useCallback(async () => {
        listAbortRef.current?.abort();
        const ac = new AbortController();
        listAbortRef.current = ac;

        setLoading(true);
        setError('');
        try {
            const result = await fetchServiceRequestList({
                page_no: pagination.page_no,
                limit: pagination.limit,
                search: debouncedSearch.trim(),
                status: listStatus,
            });
            if (ac.signal.aborted) return;

            if (!result?.success) {
                throw new Error(result?.message || 'Failed to load service requests');
            }

            setRows(Array.isArray(result.data) ? result.data : []);
            const pg = result.pagination || {};
            setPagination((prev) => ({
                ...prev,
                page_no: pg.page_no != null ? Number(pg.page_no) : prev.page_no,
                limit: pg.limit != null ? Number(pg.limit) : prev.limit,
                total: pg.total != null ? Number(pg.total) : 0,
                total_pages: pg.total_pages != null ? Number(pg.total_pages) : 1,
                is_last_page: Boolean(pg.is_last_page),
            }));
        } catch (e) {
            if (e.name === 'AbortError') return;
            console.error('Service request list:', e);
            setRows([]);
            setError(e.response?.data?.message || e.message || 'Failed to load service requests');
        } finally {
            if (listAbortRef.current === ac) setLoading(false);
        }
    }, [debouncedSearch, listStatus, pagination.page_no, pagination.limit]);

    useEffect(() => {
        setPagination((prev) => (prev.page_no !== 1 ? { ...prev, page_no: 1 } : prev));
    }, [debouncedSearch, listStatus]);

    useEffect(() => {
        loadList();
    }, [loadList]);

    useEffect(() => {
        localStorage.setItem('sidebarMinimized', JSON.stringify(isMinimized));
    }, [isMinimized]);

    useEffect(() => {
        document.body.style.overflow = mobileMenuOpen ? 'hidden' : 'auto';
        return () => {
            document.body.style.overflow = 'auto';
        };
    }, [mobileMenuOpen]);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (!e.target.closest('[data-sr-actions-menu]') && !e.target.closest('[data-sr-actions]')) {
                setActiveMenuId(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        const close = () => setActiveMenuId(null);
        window.addEventListener('scroll', close, true);
        window.addEventListener('resize', close);
        return () => {
            window.removeEventListener('scroll', close, true);
            window.removeEventListener('resize', close);
        };
    }, []);

    const activeRow = useMemo(
        () => rows.find((r) => r.request_id === activeMenuId) || null,
        [rows, activeMenuId]
    );

    const openMenu = (requestId, e) => {
        if (activeMenuId === requestId) {
            setActiveMenuId(null);
            return;
        }
        menuAnchorRef.current = e.currentTarget;
        const rect = e.currentTarget.getBoundingClientRect();
        setMenuPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
        setActiveMenuId(requestId);
    };

    const handleRejectSubmit = async () => {
        if (!rejectRow?.request_id) return;
        setRejecting(true);
        try {
            const result = await rejectServiceRequest(rejectRow.request_id, {
                office_remark: rejectRemark,
            });
            if (!result?.success) {
                throw new Error(result?.message || 'Failed to reject request');
            }
            toast.success(result.message || 'Service request rejected');
            setRejectRow(null);
            setRejectRemark('');
            await loadList();
        } catch (e) {
            toast.error(e.response?.data?.message || e.message || 'Failed to reject request');
        } finally {
            setRejecting(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50">
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

            <div className={`pt-16 transition-all duration-300 ${isMinimized ? 'md:pl-20' : 'md:pl-[260px]'}`}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="mb-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                        <div>
                            <h1 className="text-xl font-bold text-slate-900">Service Requests</h1>
                            <p className="text-sm text-slate-500 mt-1">
                                Review client service requests — approve to create a task or reject with a remark
                            </p>
                        </div>
                        {!loading && statusTab === 'pending' && !debouncedSearch && rows.length > 0 && (
                            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                                <span className="font-semibold">{rows.length}</span> pending on this page
                            </div>
                        )}
                    </div>

                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="px-4 py-3 border-b border-slate-200 space-y-3">
                            <div className="flex flex-wrap gap-2">
                                {STATUS_TABS.map((tab) => (
                                    <button
                                        key={tab.id}
                                        type="button"
                                        onClick={() => setStatusTab(tab.id)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                                            statusTab === tab.id
                                                ? 'bg-indigo-600 text-white'
                                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                        }`}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>
                            <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
                                <div className="relative flex-1 sm:max-w-md">
                                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input
                                        type="search"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        placeholder="Search client, firm, service..."
                                        className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none"
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={loadList}
                                    disabled={loading}
                                    className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                                >
                                    <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                                    Refresh
                                </button>
                            </div>
                        </div>

                        {error && !loading && (
                            <div className="mx-4 mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                                {error}
                            </div>
                        )}

                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[56rem] text-sm">
                                <thead className="bg-slate-50 border-b border-slate-200">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase w-12">#</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Date</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Client</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Firm / Service</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Amount</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Status</th>
                                        <th className="px-4 py-3 w-12" />
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading &&
                                        Array.from({ length: 5 }).map((_, i) => (
                                            <tr key={`sk-${i}`} className="border-b border-slate-100">
                                                <td colSpan={7} className="px-4 py-4">
                                                    <div className="h-4 bg-slate-100 rounded animate-pulse" />
                                                </td>
                                            </tr>
                                        ))}
                                    {!loading && rows.length === 0 && (
                                        <tr>
                                            <td colSpan={7} className="px-4 py-16 text-center text-slate-500">
                                                No service requests found
                                            </td>
                                        </tr>
                                    )}
                                    {!loading &&
                                        rows.map((row, index) => (
                                                <tr
                                                    key={row.request_id}
                                                    className="border-b border-slate-100 hover:bg-slate-50/80"
                                                >
                                                    <td className="px-4 py-3 text-slate-500 tabular-nums">
                                                        {(pagination.page_no - 1) * pagination.limit + index + 1}
                                                    </td>
                                                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                                                        {formatDate(row.create_date)}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <p className="font-medium text-slate-800">
                                                            {row.client?.name || row.client?.username || '—'}
                                                        </p>
                                                        <p className="text-xs text-slate-500">
                                                            {row.client?.email || row.client?.mobile || ''}
                                                        </p>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <p className="text-slate-800">
                                                            {row.firm?.name || '—'}
                                                        </p>
                                                        <p className="text-xs text-slate-500">
                                                            {row.service?.name || '—'}
                                                        </p>
                                                    </td>
                                                    <td className="px-4 py-3 font-medium text-slate-800">
                                                        {formatCurrency(row.charges)}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <StatusBadge status={row.status} />
                                                    </td>
                                                    <td className="px-4 py-3 text-right">
                                                        <button
                                                            type="button"
                                                            data-sr-actions
                                                            onClick={(e) => openMenu(row.request_id, e)}
                                                            className="p-2 rounded-lg text-slate-500 hover:bg-slate-100"
                                                        >
                                                            <FiMoreVertical className="w-4 h-4" />
                                                        </button>
                                                    </td>
                                                </tr>
                                        ))}
                                </tbody>
                            </table>
                        </div>

                        <TablePagination
                            page={pagination.page_no}
                            limit={pagination.limit}
                            total={pagination.total}
                            totalPages={pagination.total_pages}
                            isLastPage={pagination.is_last_page}
                            onPageChange={(p) =>
                                setPagination((prev) => ({ ...prev, page_no: p }))
                            }
                            onLimitChange={(limit) =>
                                setPagination((prev) => ({ ...prev, limit, page_no: 1 }))
                            }
                        />
                    </div>
                </div>
            </div>

            {activeMenuId &&
                activeRow &&
                createPortal(
                    <div
                        data-sr-actions-menu
                        className="fixed z-[100] min-w-[11rem] bg-white border border-slate-200 rounded-xl shadow-lg py-1"
                        style={{ top: menuPos.top, right: menuPos.right }}
                    >
                        <button
                            type="button"
                            className="flex w-full items-center gap-2 px-3.5 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
                            onClick={() => {
                                setDetailRow(activeRow);
                                setActiveMenuId(null);
                            }}
                        >
                            <FiEye className="w-4 h-4 text-slate-400" /> View details
                        </button>
                        {String(activeRow.status).toLowerCase() === 'pending' && (
                            <>
                                <button
                                    type="button"
                                    className="flex w-full items-center gap-2 px-3.5 py-2.5 text-sm text-emerald-700 hover:bg-emerald-50"
                                    onClick={() => {
                                        setApproveRow(activeRow);
                                        setActiveMenuId(null);
                                    }}
                                >
                                    <FiCheckCircle className="w-4 h-4" /> Approve
                                </button>
                                <button
                                    type="button"
                                    className="flex w-full items-center gap-2 px-3.5 py-2.5 text-sm text-red-700 hover:bg-red-50"
                                    onClick={() => {
                                        setRejectRow(activeRow);
                                        setRejectRemark('');
                                        setActiveMenuId(null);
                                    }}
                                >
                                    <FiXCircle className="w-4 h-4" /> Reject
                                </button>
                            </>
                        )}
                    </div>,
                    document.body
                )}

            <AnimatePresence>
                {detailRow && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[60] flex items-start justify-center overflow-hidden overscroll-none p-3 sm:p-4 pointer-events-none"
                    >
                        <div
                            className="absolute inset-0 bg-black/50 backdrop-blur-sm pointer-events-auto"
                            onClick={() => setDetailRow(null)}
                        />
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="relative z-[1] pointer-events-auto w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 my-2 sm:my-4 max-h-[calc(100vh-1.5rem)] sm:max-h-[calc(100vh-2rem)] overflow-hidden flex flex-col"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="px-5 py-3.5 border-b border-slate-200 flex justify-between items-start shrink-0">
                                <div>
                                    <h2 className="text-lg font-bold text-slate-900">Request details</h2>
                                    <p className="text-sm text-slate-500 mt-0.5">
                                        {formatDate(detailRow.create_date)}
                                    </p>
                                </div>
                                <button type="button" onClick={() => setDetailRow(null)} className="p-2 rounded-lg hover:bg-slate-100">
                                    <FiX className="w-5 h-5 text-slate-400" />
                                </button>
                            </div>
                            <div className={`${MODAL_BODY_CLASS} space-y-4 text-sm`}>
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Status</span>
                                    <StatusBadge status={detailRow.status} />
                                </div>
                                <div>
                                    <p className="text-slate-500 text-xs uppercase font-semibold mb-1">Client</p>
                                    <p className="font-medium">{detailRow.client?.name || '—'}</p>
                                    <p className="text-slate-500 text-xs">{detailRow.client?.email}</p>
                                    <p className="text-slate-500 text-xs">{detailRow.client?.mobile}</p>
                                </div>
                                <div>
                                    <p className="text-slate-500 text-xs uppercase font-semibold mb-1">Firm</p>
                                    <p className="font-medium">{detailRow.firm?.name || '—'}</p>
                                </div>
                                <div>
                                    <p className="text-slate-500 text-xs uppercase font-semibold mb-1">Service</p>
                                    <p className="font-medium">{detailRow.service?.name || '—'}</p>
                                    <p className="text-slate-500 text-xs">{detailRow.service?.type}</p>
                                </div>
                                <div className="grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-3 border border-slate-100">
                                    <div>
                                        <p className="text-xs text-slate-500">Fees</p>
                                        <p className="font-medium">{formatCurrency({ fees: detailRow.charges?.fees })}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500">Total</p>
                                        <p className="font-semibold text-indigo-700">{formatCurrency(detailRow.charges)}</p>
                                    </div>
                                </div>
                                {detailRow.client_remark && (
                                    <div>
                                        <p className="text-slate-500 text-xs uppercase font-semibold mb-1">Client remark</p>
                                        <p className="text-slate-700 bg-slate-50 rounded-lg p-3 border border-slate-100">
                                            {detailRow.client_remark}
                                        </p>
                                    </div>
                                )}
                                {detailRow.office_remark && (
                                    <div>
                                        <p className="text-slate-500 text-xs uppercase font-semibold mb-1">Office remark</p>
                                        <p className="text-slate-700 bg-red-50 rounded-lg p-3 border border-red-100">
                                            {detailRow.office_remark}
                                        </p>
                                    </div>
                                )}
                                {detailRow.task_id && (
                                    <div>
                                        <p className="text-slate-500 text-xs uppercase font-semibold mb-1">Linked task</p>
                                        <p className="font-mono text-emerald-700">{detailRow.task_id}</p>
                                    </div>
                                )}
                                <p className="text-xs text-slate-400">
                                    Created {formatDate(detailRow.create_date)}
                                    {detailRow.modify_date && ` · Updated ${formatDate(detailRow.modify_date)}`}
                                </p>
                            </div>
                            {String(detailRow.status).toLowerCase() === 'pending' && (
                                <div className="px-5 py-3 border-t border-slate-200 flex gap-2 justify-end shrink-0">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setRejectRow(detailRow);
                                            setRejectRemark('');
                                            setDetailRow(null);
                                        }}
                                        className="px-4 py-2 rounded-lg border border-red-200 text-red-700 text-sm font-medium hover:bg-red-50"
                                    >
                                        Reject
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setApproveRow(detailRow);
                                            setDetailRow(null);
                                        }}
                                        className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700"
                                    >
                                        Approve
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {rejectRow && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[65] flex items-start justify-center overflow-hidden overscroll-none p-3 sm:p-4 pointer-events-none"
                    >
                        <div
                            className="absolute inset-0 bg-black/50 backdrop-blur-sm pointer-events-auto"
                            onClick={() => !rejecting && setRejectRow(null)}
                        />
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="relative z-[1] pointer-events-auto w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 my-2 sm:my-4 max-h-[calc(100vh-1.5rem)] sm:max-h-[calc(100vh-2rem)] overflow-hidden flex flex-col"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="px-5 py-3.5 border-b border-slate-200 shrink-0">
                                <h2 className="text-lg font-bold text-slate-900">Reject request</h2>
                                <p className="text-sm text-slate-500 mt-0.5">
                                    {rejectRow.client?.name || rejectRow.client?.username || 'Client request'}
                                </p>
                            </div>
                            <div className={MODAL_BODY_CLASS}>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                    Office remark (optional)
                                </label>
                                <textarea
                                    value={rejectRemark}
                                    onChange={(e) => setRejectRemark(e.target.value)}
                                    rows={3}
                                    className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500/30 outline-none resize-none"
                                    placeholder="Reason for rejection..."
                                />
                            </div>
                            <div className="px-5 py-3 border-t border-slate-200 flex justify-end gap-2 shrink-0">
                                <button
                                    type="button"
                                    disabled={rejecting}
                                    onClick={() => setRejectRow(null)}
                                    className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-700"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    disabled={rejecting}
                                    onClick={handleRejectSubmit}
                                    className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-60"
                                >
                                    {rejecting ? 'Rejecting…' : 'Reject request'}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <ServiceRequestApproveModal
                isOpen={Boolean(approveRow)}
                request={approveRow}
                onClose={() => setApproveRow(null)}
                onSuccess={() => {
                    setApproveRow(null);
                    loadList();
                }}
            />
        </div>
    );
};

export default ServiceRequestList;
