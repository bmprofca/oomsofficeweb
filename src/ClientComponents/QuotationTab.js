import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FiAlertCircle,
    FiDownload,
    FiEdit2,
    FiEye,
    FiFileText,
    FiLink,
    FiMail,
    FiMessageCircle,
    FiMoreVertical,
    FiPlus,
    FiRefreshCw,
    FiShare2,
    FiTrash2,
    FiX,
} from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import API_BASE_URL from '../utils/api-controller';
import getHeaders from '../utils/get-headers';
import useDebouncedValue from '../hooks/useDebouncedValue';
import TablePagination from '../components/TablePagination';

const STATUS_OPTIONS = [
    { value: '', label: 'All status' },
    { value: 'pending', label: 'Pending' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' },
];

const ACTION_MENU_WIDTH = 188;
const ACTION_MENU_ESTIMATED_HEIGHT = 150;
const ACTION_MENU_EDGE_GAP = 6;

const computeActionMenuPosition = (buttonEl) => {
    const rect = buttonEl.getBoundingClientRect();
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;

    let left = rect.left;
    if (left + ACTION_MENU_WIDTH > viewportW - 8) {
        left = viewportW - ACTION_MENU_WIDTH - 8;
    }
    left = Math.max(8, left);

    const downTop = rect.bottom + ACTION_MENU_EDGE_GAP;
    const canOpenDown = downTop + ACTION_MENU_ESTIMATED_HEIGHT <= viewportH - 8;
    if (canOpenDown) {
        return { placement: 'down', top: downTop, left };
    }

    return {
        placement: 'up',
        bottom: viewportH - rect.top + ACTION_MENU_EDGE_GAP,
        left,
    };
};

const statusBadgeClass = (rawStatus) => {
    const status = String(rawStatus || '').toLowerCase();
    if (status === 'approved') return 'bg-green-100 text-green-700 border border-green-200';
    if (status === 'rejected') return 'bg-red-100 text-red-700 border border-red-200';
    return 'bg-amber-100 text-amber-700 border border-amber-200';
};

const labelStatus = (rawStatus) => {
    const status = String(rawStatus || '').toLowerCase();
    if (!status) return 'Pending';
    return status.charAt(0).toUpperCase() + status.slice(1);
};

const formatDateTime = (value) => {
    if (!value) return 'N/A';
    const dt = new Date(value);
    if (Number.isNaN(dt.getTime())) return String(value);
    return dt.toLocaleString();
};

const formatMoney = (value) => {
    const n = Number(value);
    if (!Number.isFinite(n)) return value || 'N/A';
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(n);
};

const getQuotationId = (row) =>
    row?.quotation_id || row?.id || row?.quotation_no || row?.quote_no || row?.quoteNo;

const getQuotationItems = (row) => {
    if (Array.isArray(row?.items)) return row.items;
    if (Array.isArray(row?.quotation_items)) return row.quotation_items;
    if (Array.isArray(row?.item_list)) return row.item_list;
    return [];
};

const getQuotationUsername = (row) =>
    row?.username ||
    row?.user_name ||
    row?.client_username ||
    row?.client?.username ||
    '';

const getServiceNameFromItem = (item) =>
    item?.service?.name || item?.service_name || item?.item_name || item?.name || item?.description || 'N/A';

const getAmountParts = (amountObj) => ({
    fees:
        amountObj?.fees ??
        amountObj?.fee ??
        amountObj?.subtotal ??
        amountObj?.sub_total ??
        '-',
    tax:
        amountObj?.tax_value ??
        amountObj?.tax ??
        amountObj?.tax_total ??
        amountObj?.gst_amount ??
        '-',
    total:
        amountObj?.total ??
        amountObj?.grand_total ??
        amountObj?.final_total ??
        '-',
});

const RowActionMenu = ({
    open,
    anchorEl,
    onClose,
    onViewDetails,
    onShare,
    onEdit,
    onApprove,
    onReject,
    canApprove,
    canReject,
}) => {
    const [coords, setCoords] = useState(null);
    const menuRef = useRef(null);

    useEffect(() => {
        if (!open || !anchorEl) {
            setCoords(null);
            return;
        }
        const update = () => setCoords(computeActionMenuPosition(anchorEl));
        update();
        window.addEventListener('resize', update);
        window.addEventListener('scroll', update, true);
        return () => {
            window.removeEventListener('resize', update);
            window.removeEventListener('scroll', update, true);
        };
    }, [open, anchorEl]);

    useEffect(() => {
        if (!open) return;
        const handleOutside = (event) => {
            if (anchorEl?.contains?.(event.target)) return;
            if (menuRef.current?.contains?.(event.target)) return;
            onClose();
        };
        document.addEventListener('mousedown', handleOutside);
        return () => document.removeEventListener('mousedown', handleOutside);
    }, [open, anchorEl, onClose]);

    if (typeof document === 'undefined') return null;

    return createPortal(
        <AnimatePresence>
            {open && coords && (
                <motion.div
                    ref={menuRef}
                    role="menu"
                    initial={{ opacity: 0, y: -6, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.96 }}
                    transition={{ duration: 0.15 }}
                    style={{
                        position: 'fixed',
                        ...(coords.placement === 'up'
                            ? { bottom: coords.bottom, left: coords.left }
                            : { top: coords.top, left: coords.left }),
                        width: ACTION_MENU_WIDTH,
                        zIndex: 2147483647,
                    }}
                    className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl ring-1 ring-black/5"
                >
                    <div className="py-1">
                        <button
                            type="button"
                            onClick={onViewDetails}
                            className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                        >
                            <FiEye className="h-4 w-4 text-indigo-600" />
                            View details
                        </button>
                        <button
                            type="button"
                            onClick={onShare}
                            className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                        >
                            <FiShare2 className="h-4 w-4 text-violet-600" />
                            Share quotation
                        </button>
                        <button
                            type="button"
                            onClick={onEdit}
                            className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                        >
                            <FiEdit2 className="h-4 w-4 text-amber-600" />
                            Edit quotation
                        </button>
                        <button
                            type="button"
                            onClick={onApprove}
                            disabled={!canApprove}
                            className={`flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm font-medium transition-colors ${
                                canApprove ? 'text-slate-700 hover:bg-slate-50' : 'text-slate-400 cursor-not-allowed'
                            }`}
                        >
                            <FiRefreshCw className={`h-4 w-4 ${canApprove ? 'text-emerald-600' : 'text-slate-300'}`} />
                            Approve
                        </button>
                        <button
                            type="button"
                            onClick={onReject}
                            disabled={!canReject}
                            className={`flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm font-medium transition-colors ${
                                canReject ? 'text-slate-700 hover:bg-slate-50' : 'text-slate-400 cursor-not-allowed'
                            }`}
                        >
                            <FiRefreshCw className={`h-4 w-4 ${canReject ? 'text-red-600' : 'text-slate-300'}`} />
                            Reject
                        </button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>,
        document.body
    );
};

const QuotationItemsModal = ({ quotation, onClose }) => {
    const items = getQuotationItems(quotation);
    const createdAt = quotation?.create_date || quotation?.created_at || quotation?.date;
    const quoteAmount = getAmountParts(quotation?.amount);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-start justify-center p-3 sm:p-4 z-50 backdrop-blur-sm overflow-y-auto"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.95, y: 12 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 12 }}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl my-2 sm:my-4 max-h-[calc(100vh-1.5rem)] sm:max-h-[calc(100vh-2rem)] overflow-hidden flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-5 py-3.5 text-white flex items-center justify-between shrink-0">
                    <div>
                        <h3 className="text-lg font-semibold">Quotation Services</h3>
                        <p className="text-xs text-blue-100 mt-1">Created: {formatDateTime(createdAt)}</p>
                </div>
                    <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-white/10">
                        <FiX className="w-5 h-5" />
                    </button>
            </div>

                <div
                    className="px-5 py-4 overflow-y-auto flex-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                    <div className="mb-4 rounded-xl border border-indigo-200 bg-indigo-50 p-3">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
                            <p><span className="text-indigo-700/80">Fees:</span> <span className="text-indigo-900 font-medium">{formatMoney(quoteAmount.fees)}</span></p>
                            <p><span className="text-indigo-700/80">Tax:</span> <span className="text-indigo-900 font-medium">{formatMoney(quoteAmount.tax)}</span></p>
                            <p><span className="text-indigo-700/80">Total:</span> <span className="text-indigo-900 font-semibold">{formatMoney(quoteAmount.total)}</span></p>
                        </div>
                        </div>
                    {items.length === 0 ? (
                        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                            No quotation services found for this quotation.
                    </div>
                    ) : (
                        <div className="overflow-x-auto rounded-xl border border-slate-200">
                            <table className="w-full min-w-[34rem]">
                                <thead className="bg-slate-50 border-b border-slate-200">
                                    <tr>
                                        <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase">#</th>
                                        <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase">Service</th>
                                        <th className="px-3 py-2.5 text-right text-xs font-semibold text-slate-600 uppercase">Fees</th>
                                        <th className="px-3 py-2.5 text-right text-xs font-semibold text-slate-600 uppercase">Tax</th>
                                        <th className="px-3 py-2.5 text-right text-xs font-semibold text-slate-600 uppercase">Total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200">
                                    {items.map((item, idx) => {
                                        const name = getServiceNameFromItem(item);
                                        const serviceAmount = getAmountParts(item?.service?.amount);
                                        const itemAmount = getAmountParts(item?.amount);
                                        const fees =
                                            serviceAmount.fees ??
                                            item?.fees ??
                                            item?.fee ??
                                            itemAmount.fees ??
                                            item?.rate ??
                                            item?.unit_price ??
                                            quoteAmount.fees;
                                        const tax =
                                            serviceAmount.tax ??
                                            item?.tax ??
                                            item?.tax_amount ??
                                            itemAmount.tax ??
                                            quoteAmount.tax;
                                        const total =
                                            serviceAmount.total ??
                                            item?.total ??
                                            item?.total_amount ??
                                            item?.line_total ??
                                            itemAmount.total ??
                                            quoteAmount.total;
                                        return (
                                            <tr key={`${idx}-${name}`} className="hover:bg-slate-50/70">
                                                <td className="px-3 py-2.5 text-sm text-slate-600">{idx + 1}</td>
                                                <td className="px-3 py-2.5 text-sm font-medium text-slate-800">{name}</td>
                                                <td className="px-3 py-2.5 text-sm text-slate-700 text-right">{formatMoney(fees)}</td>
                                                <td className="px-3 py-2.5 text-sm text-slate-700 text-right">{formatMoney(tax)}</td>
                                                <td className="px-3 py-2.5 text-sm text-slate-900 font-semibold text-right">{formatMoney(total)}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
                
                <div className="px-5 py-3 border-t border-slate-200 bg-slate-50/50 flex justify-end shrink-0">
                    <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl bg-slate-700 text-white text-sm font-medium hover:bg-slate-800">
                        Close
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
};

const QuotationDetailsModal = ({ quotation, onClose }) => {
    const items = getQuotationItems(quotation);
    const client = quotation?.client || {};
    const firm = quotation?.firm || {};
    const amount = getAmountParts(quotation?.amount || {});
    const createdBy = quotation?.create_by || {};
    const modifiedBy = quotation?.modify_by || {};

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-start justify-center p-3 sm:p-4 z-50 backdrop-blur-sm overflow-y-auto"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.95, y: 12 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 12 }}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl my-2 sm:my-4 max-h-[calc(100vh-1.5rem)] sm:max-h-[calc(100vh-2rem)] overflow-hidden flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-600 px-5 py-3.5 text-white flex items-center justify-between shrink-0">
                        <div>
                        <h3 className="text-lg font-semibold">Quotation Details</h3>
                        <p className="text-xs text-blue-100 mt-1">
                            Created: {formatDateTime(quotation?.create_date)}
                        </p>
                        </div>
                    <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-white/10">
                        <FiX className="w-5 h-5" />
                    </button>
                        </div>

                <div
                    className="px-5 py-4 overflow-y-auto flex-1 space-y-5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                            <h4 className="text-sm font-semibold text-slate-700 mb-3">Client Information</h4>
                            <div className="space-y-2 text-sm">
                                <p><span className="text-slate-500">Name:</span> <span className="text-slate-800 font-medium">{client?.name || 'N/A'}</span></p>
                                <p><span className="text-slate-500">Email:</span> <span className="text-slate-800">{client?.email || 'N/A'}</span></p>
                                <p><span className="text-slate-500">Mobile:</span> <span className="text-slate-800">{client?.mobile || 'N/A'}</span></p>
                                <p><span className="text-slate-500">PAN:</span> <span className="text-slate-800">{client?.pan_number || 'N/A'}</span></p>
                    </div>
                </div>
                
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                            <h4 className="text-sm font-semibold text-slate-700 mb-3">Firm Information</h4>
                            <div className="space-y-2 text-sm">
                                <p><span className="text-slate-500">Firm Name:</span> <span className="text-slate-800 font-medium">{firm?.firm_name || 'N/A'}</span></p>
                                <p><span className="text-slate-500">PAN:</span> <span className="text-slate-800">{firm?.pan_no || 'N/A'}</span></p>
                                <p><span className="text-slate-500">Type:</span> <span className="text-slate-800">{firm?.firm_type || 'N/A'}</span></p>
                                <p>
                                    <span className="text-slate-500">Status:</span>{' '}
                                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusBadgeClass(quotation?.status)}`}>
                                        {labelStatus(quotation?.status)}
                                    </span>
                                </p>
                        </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4">
                            <h4 className="text-sm font-semibold text-indigo-800 mb-3">Amount Summary</h4>
                            <div className="space-y-2 text-sm">
                                <p><span className="text-indigo-700/80">Fees:</span> <span className="text-indigo-900 font-medium">{formatMoney(amount.fees)}</span></p>
                                <p><span className="text-indigo-700/80">Tax:</span> <span className="text-indigo-900 font-medium">{formatMoney(amount.tax)}</span></p>
                                <p className="pt-1 border-t border-indigo-200"><span className="text-indigo-700/80">Total:</span> <span className="text-indigo-900 font-semibold">{formatMoney(amount.total)}</span></p>
                    </div>
                </div>
                
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                            <h4 className="text-sm font-semibold text-slate-700 mb-3">Audit Details</h4>
                            <div className="space-y-2 text-sm">
                                <p><span className="text-slate-500">Created at:</span> <span className="text-slate-800">{formatDateTime(quotation?.create_date)}</span></p>
                                <p><span className="text-slate-500">Created by:</span> <span className="text-slate-800">{createdBy?.name || 'N/A'}</span></p>
                                <p><span className="text-slate-500">Updated at:</span> <span className="text-slate-800">{formatDateTime(quotation?.modify_date)}</span></p>
                                <p><span className="text-slate-500">Updated by:</span> <span className="text-slate-800">{modifiedBy?.name || 'N/A'}</span></p>
                        </div>
                        </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 overflow-hidden">
                        <div className="bg-slate-50 border-b border-slate-200 px-4 py-3">
                            <h4 className="text-sm font-semibold text-slate-700">
                                Services ({items.length})
                            </h4>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[34rem]">
                                <thead className="bg-white border-b border-slate-200">
                                    <tr>
                                        <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase">#</th>
                                        <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase">Service</th>
                                        <th className="px-3 py-2.5 text-right text-xs font-semibold text-slate-600 uppercase">Fees</th>
                                        <th className="px-3 py-2.5 text-right text-xs font-semibold text-slate-600 uppercase">Tax</th>
                                        <th className="px-3 py-2.5 text-right text-xs font-semibold text-slate-600 uppercase">Total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200">
                                    {items.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="px-3 py-6 text-center text-sm text-slate-500">
                                                No services available.
                                            </td>
                                        </tr>
                                    ) : (
                                        items.map((item, idx) => {
                                            const name = getServiceNameFromItem(item);
                                            const serviceAmount = getAmountParts(item?.service?.amount);
                                            const itemAmount = getAmountParts(item?.amount);
                                            const fees =
                                                serviceAmount.fees ??
                                                item?.fees ??
                                                item?.fee ??
                                                itemAmount.fees ??
                                                item?.rate ??
                                                item?.unit_price ??
                                                amount.fees;
                                            const tax =
                                                serviceAmount.tax ??
                                                item?.tax ??
                                                item?.tax_amount ??
                                                itemAmount.tax ??
                                                amount.tax;
                                            const total =
                                                serviceAmount.total ??
                                                item?.total ??
                                                item?.total_amount ??
                                                item?.line_total ??
                                                itemAmount.total ??
                                                amount.total;
                                            return (
                                                <tr key={`${idx}-${name}`} className="hover:bg-slate-50/70">
                                                    <td className="px-3 py-2.5 text-sm text-slate-600">{idx + 1}</td>
                                                    <td className="px-3 py-2.5 text-sm font-medium text-slate-800">{name}</td>
                                                    <td className="px-3 py-2.5 text-sm text-slate-700 text-right">{formatMoney(fees)}</td>
                                                    <td className="px-3 py-2.5 text-sm text-slate-700 text-right">{formatMoney(tax)}</td>
                                                    <td className="px-3 py-2.5 text-sm text-slate-900 font-semibold text-right">{formatMoney(total)}</td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                </div>
            </div>

                <div className="px-5 py-3 border-t border-slate-200 bg-slate-50/50 flex justify-end shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-5 py-2.5 rounded-xl bg-slate-700 text-white text-sm font-medium hover:bg-slate-800"
                    >
                        Close
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
};

const newCreateItem = () => ({
    service_id: '',
    fees: '',
    tax_rate: '',
});

const newEditItem = () => ({
    service_id: '',
    fees: '',
    tax_rate: '',
});

const getFirmOptionLabel = (firm) => {
    const name = firm?.firm_name || 'Unnamed firm';
    const pan = firm?.pan_no || 'N/A';
    return `${name} - ${pan}`;
};

const SearchableServiceSelect = ({ services, value, onChange, loading }) => {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const rootRef = useRef(null);
    const inputRef = useRef(null);
    const menuRef = useRef(null);
    const [menuCoords, setMenuCoords] = useState(null);

    const selectedService = useMemo(
        () => services.find((s) => String(s.service_id) === String(value)) || null,
        [services, value]
    );

    useEffect(() => {
        if (selectedService) {
            setQuery(selectedService.name || selectedService.service_name || '');
        } else if (!value) {
            setQuery('');
        }
    }, [selectedService, value]);

    useEffect(() => {
        const onDown = (event) => {
            if (rootRef.current?.contains(event.target) || menuRef.current?.contains(event.target)) {
                return;
            }
            if (!rootRef.current?.contains(event.target)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', onDown);
        return () => document.removeEventListener('mousedown', onDown);
    }, []);

    useEffect(() => {
        if (!open || !inputRef.current) {
            setMenuCoords(null);
            return;
        }
        const update = () => {
            const rect = inputRef.current.getBoundingClientRect();
            setMenuCoords({
                left: rect.left,
                top: rect.bottom + 4,
                width: rect.width,
                maxHeight: Math.max(180, window.innerHeight - rect.bottom - 16),
            });
        };
        update();
        window.addEventListener('resize', update);
        window.addEventListener('scroll', update, true);
        return () => {
            window.removeEventListener('resize', update);
            window.removeEventListener('scroll', update, true);
        };
    }, [open]);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return services;
        return services.filter((s) =>
            String(s.name || s.service_name || '')
                .toLowerCase()
                .includes(q)
        );
    }, [services, query]);

    return (
        <div ref={rootRef} className="relative">
                    <input
                ref={inputRef}
                        type="text"
                value={query}
                onFocus={() => setOpen(true)}
                onChange={(e) => {
                    setQuery(e.target.value);
                    setOpen(true);
                    if (!e.target.value.trim()) onChange('');
                }}
                placeholder={loading ? 'Loading services...' : 'Search service'}
                className="w-full h-9 rounded-lg border border-slate-200 px-2.5 pr-8 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            />
            {value && (
                <button
                    type="button"
                    onClick={() => {
                        onChange('');
                        setQuery('');
                        setOpen(false);
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                    title="Clear selection"
                >
                    <FiX className="h-3.5 w-3.5" />
                </button>
            )}
            {open &&
                menuCoords &&
                typeof document !== 'undefined' &&
                createPortal(
                    <div
                        ref={menuRef}
                        style={{
                            position: 'fixed',
                            left: menuCoords.left,
                            top: menuCoords.top,
                            width: menuCoords.width,
                            maxHeight: menuCoords.maxHeight,
                            zIndex: 2147483647,
                        }}
                        className="overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-2xl"
                    >
                        {filtered.length > 0 ? (
                            filtered.map((service) => (
                                <button
                                    key={service.service_id}
                                    type="button"
                                    onClick={() => {
                                        onChange(service.service_id);
                                        setQuery(service.name || service.service_name || '');
                                        setOpen(false);
                                    }}
                                    className="w-full px-2.5 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                                >
                                    {service.name || service.service_name || 'Unnamed service'}
                                </button>
                            ))
                        ) : (
                            <p className="px-2.5 py-2 text-sm text-slate-500">No services found</p>
                        )}
                    </div>,
                    document.body
                )}
                </div>
    );
};

const SearchableFirmSelect = ({ firms, value, onChange, loading }) => {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const rootRef = useRef(null);
    const inputRef = useRef(null);
    const menuRef = useRef(null);
    const [menuCoords, setMenuCoords] = useState(null);

    const selectedFirm = useMemo(
        () => firms.find((f) => String(f.firm_id) === String(value)) || null,
        [firms, value]
    );

    useEffect(() => {
        if (selectedFirm) {
            setQuery(getFirmOptionLabel(selectedFirm));
        } else if (!value) {
            setQuery('');
        }
    }, [selectedFirm, value]);

    useEffect(() => {
        const onDown = (event) => {
            if (rootRef.current?.contains(event.target) || menuRef.current?.contains(event.target)) {
                return;
            }
            if (!rootRef.current?.contains(event.target)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', onDown);
        return () => document.removeEventListener('mousedown', onDown);
    }, []);

    useEffect(() => {
        if (!open || !inputRef.current) {
            setMenuCoords(null);
            return;
        }
        const update = () => {
            const rect = inputRef.current.getBoundingClientRect();
            setMenuCoords({
                left: rect.left,
                top: rect.bottom + 4,
                width: rect.width,
                maxHeight: Math.max(180, window.innerHeight - rect.bottom - 16),
            });
        };
        update();
        window.addEventListener('resize', update);
        window.addEventListener('scroll', update, true);
        return () => {
            window.removeEventListener('resize', update);
            window.removeEventListener('scroll', update, true);
        };
    }, [open]);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return firms;
        return firms.filter((f) =>
            getFirmOptionLabel(f).toLowerCase().includes(q)
        );
    }, [firms, query]);

    return (
        <div ref={rootRef} className="relative">
            <input
                ref={inputRef}
                type="text"
                value={query}
                onFocus={() => setOpen(true)}
                onChange={(e) => {
                    setQuery(e.target.value);
                    setOpen(true);
                    if (!e.target.value.trim()) onChange('');
                }}
                placeholder={loading ? 'Loading firms...' : 'Search firm'}
                className="w-full h-10 rounded-lg border border-slate-200 px-3 pr-8 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            />
            {value && (
                <button
                    type="button"
                    onClick={() => {
                        onChange('');
                        setQuery('');
                        setOpen(false);
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                    title="Clear selection"
                >
                    <FiX className="h-3.5 w-3.5" />
                </button>
            )}
            {open &&
                menuCoords &&
                typeof document !== 'undefined' &&
                createPortal(
                    <div
                        ref={menuRef}
                        style={{
                            position: 'fixed',
                            left: menuCoords.left,
                            top: menuCoords.top,
                            width: menuCoords.width,
                            maxHeight: menuCoords.maxHeight,
                            zIndex: 2147483647,
                        }}
                        className="overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-2xl"
                    >
                        {filtered.length > 0 ? (
                            filtered.map((firm) => (
                                <button
                                    key={firm.firm_id}
                                    type="button"
                                    onClick={() => {
                                        onChange(firm.firm_id);
                                        setQuery(getFirmOptionLabel(firm));
                                        setOpen(false);
                                    }}
                                    className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                                >
                                    {getFirmOptionLabel(firm)}
                                </button>
                            ))
                        ) : (
                            <p className="px-3 py-2 text-sm text-slate-500">No firms found</p>
                        )}
                    </div>,
                    document.body
                )}
        </div>
    );
};

const QuotationTab = ({ clientUsername }) => {
    const [quotations, setQuotations] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [search, setSearch] = useState('');
    const [status, setStatus] = useState('');
    const [firmIdFilter, setFirmIdFilter] = useState('');
    const [firms, setFirms] = useState([]);
    const [firmsLoading, setFirmsLoading] = useState(false);
    const [activeMenuId, setActiveMenuId] = useState(null);
    const [activeMenuRow, setActiveMenuRow] = useState(null);
    const [activeMenuAnchorEl, setActiveMenuAnchorEl] = useState(null);

    const [pagination, setPagination] = useState({
        page_no: 1,
        limit: 20,
        total_records: 0,
        total_pages: 1,
    });

    const [activeQuotation, setActiveQuotation] = useState(null);
    const [showItemsModal, setShowItemsModal] = useState(false);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);
    const [downloadingQuotation, setDownloadingQuotation] = useState(false);
    const [statusConfirmState, setStatusConfirmState] = useState({
        open: false,
        quotation: null,
        nextStatus: '',
    });
    const [changingStatus, setChangingStatus] = useState(false);
    const [services, setServices] = useState([]);
    const [servicesLoading, setServicesLoading] = useState(false);
    const [creatingQuotation, setCreatingQuotation] = useState(false);
    const [createForm, setCreateForm] = useState({
        firm_id: '',
        items: [newCreateItem()],
    });
    const [editingQuotation, setEditingQuotation] = useState(false);
    const [editForm, setEditForm] = useState({
        quotation_id: '',
        username: '',
        firm_id: '',
        items: [newEditItem()],
    });

    const debouncedSearch = useDebouncedValue(search, 350);
    const debouncedFirmId = useDebouncedValue(firmIdFilter, 250);

    const effectiveUsername = useMemo(
        () => String(clientUsername || localStorage.getItem('user_username') || '').trim(),
        [clientUsername]
    );

    const fetchFirms = useCallback(async () => {
        if (!effectiveUsername) return;
        const headers = getHeaders();
        if (!headers) return;
        setFirmsLoading(true);
        try {
            const response = await axios.get(
                `${API_BASE_URL}/client/details/firms/list?username=${encodeURIComponent(effectiveUsername)}`,
                { headers }
            );
            if (response.data?.success) {
                const rows = Array.isArray(response.data?.data?.firms) ? response.data.data.firms : [];
                setFirms(rows);
            } else {
                setFirms([]);
            }
        } catch (err) {
            console.error('Firm list error:', err);
            setFirms([]);
        } finally {
            setFirmsLoading(false);
        }
    }, [effectiveUsername]);

    const fetchServices = useCallback(async () => {
        const headers = getHeaders();
        if (!headers) return;
        setServicesLoading(true);
        try {
            const response = await axios.get(`${API_BASE_URL}/service/list`, { headers });
            if (response.data?.success && Array.isArray(response.data.data)) {
                setServices(response.data.data);
            } else {
                setServices([]);
            }
        } catch (err) {
            console.error('Service list error:', err);
            setServices([]);
        } finally {
            setServicesLoading(false);
        }
    }, []);

    const fetchQuotations = useCallback(async ({ page_no, limit, searchText, statusValue, firmIdValue }) => {
        const headers = getHeaders();
        if (!headers) {
            setError('Authentication headers are missing. Please sign in again.');
            setQuotations([]);
            return;
        }
        if (!effectiveUsername) {
            setError('Username is required to fetch quotations.');
            setQuotations([]);
            return;
        }

        setLoading(true);
        setError('');
        try {
            const params = new URLSearchParams();
            params.set('page_no', String(Math.max(1, Number(page_no) || 1)));
            params.set('limit', String(Math.min(100, Math.max(1, Number(limit) || 20))));
            params.set('username', effectiveUsername);
            if (String(searchText || '').trim()) params.set('search', String(searchText).trim());
            if (String(statusValue || '').trim()) params.set('status', String(statusValue).trim());
            if (String(firmIdValue || '').trim()) params.set('firm_id', String(firmIdValue).trim());

            const response = await axios.get(`${API_BASE_URL}/quotation/list?${params.toString()}`, { headers });
            const result = response.data || {};
            if (!result.success) {
                throw new Error(result.message || 'Failed to fetch quotations');
            }

            const rows = Array.isArray(result.data) ? result.data : [];
            setQuotations(rows);
            setPagination({
                page_no: Math.max(1, Number(result.page_no) || Math.max(1, Number(page_no) || 1)),
                limit: Math.max(1, Number(result.limit) || Math.max(1, Number(limit) || 20)),
                total_records: Math.max(0, Number(result.total_records) || 0),
                total_pages: Math.max(1, Number(result.total_pages) || 1),
            });
        } catch (err) {
            console.error('Quotation list error:', err);
            setError(err.response?.data?.message || err.message || 'Failed to load quotations');
            setQuotations([]);
        } finally {
            setLoading(false);
        }
    }, [effectiveUsername]);

    useEffect(() => {
        fetchFirms();
    }, [fetchFirms]);

    useEffect(() => {
        fetchServices();
    }, [fetchServices]);

    useEffect(() => {
        setActiveMenuId(null);
        setActiveMenuRow(null);
        setActiveMenuAnchorEl(null);
    }, [quotations]);

    useEffect(() => {
        fetchQuotations({
            page_no: pagination.page_no,
            limit: pagination.limit,
            searchText: debouncedSearch,
            statusValue: status,
            firmIdValue: debouncedFirmId,
        });
    }, [pagination.page_no, pagination.limit, debouncedSearch, status, debouncedFirmId, fetchQuotations]);

    useEffect(() => {
        setPagination((prev) => ({ ...prev, page_no: 1 }));
    }, [debouncedSearch, status, debouncedFirmId]);

    const handleResetFilters = () => {
        setSearch('');
        setStatus('');
        setFirmIdFilter('');
        setPagination((prev) => ({ ...prev, page_no: 1 }));
    };

    const rowsForTable = useMemo(() => (loading ? Array.from({ length: 6 }, (_, i) => ({ __skeleton: true, id: `s-${i}` })) : quotations), [loading, quotations]);
    const createTotals = useMemo(() => {
        const fees = createForm.items.reduce((sum, item) => {
            const n = Number(item.fees);
            return sum + (Number.isFinite(n) ? n : 0);
        }, 0);
        const tax = createForm.items.reduce((sum, item) => {
            const feesNum = Number(item.fees);
            const rateNum = Number(item.tax_rate);
            if (!Number.isFinite(feesNum) || !Number.isFinite(rateNum)) return sum;
            return sum + (feesNum * rateNum) / 100;
        }, 0);
        const total = fees + tax;
        return { fees, tax, total };
    }, [createForm.items]);
    const isCreateFormValid = useMemo(() => {
        const resolvedFirmId = createForm.firm_id || (firms.length === 1 ? firms[0]?.firm_id : '');
        if (!resolvedFirmId) return false;
        if (!Array.isArray(createForm.items) || createForm.items.length === 0) return false;
        return createForm.items.every((item) => {
            const sid = String(item.service_id || '').trim();
            const fees = Number(item.fees);
            const rate = Number(item.tax_rate);
            return Boolean(sid) && Number.isFinite(fees) && fees >= 0 && Number.isFinite(rate) && rate >= 0;
        });
    }, [createForm, firms]);
    const editTotals = useMemo(() => {
        const fees = editForm.items.reduce((sum, item) => {
            const n = Number(item.fees);
            return sum + (Number.isFinite(n) ? n : 0);
        }, 0);
        const tax = editForm.items.reduce((sum, item) => {
            const feesNum = Number(item.fees);
            const rateNum = Number(item.tax_rate);
            if (!Number.isFinite(feesNum) || !Number.isFinite(rateNum)) return sum;
            return sum + (feesNum * rateNum) / 100;
        }, 0);
        const total = fees + tax;
        return { fees, tax, total };
    }, [editForm.items]);
    const isEditFormValid = useMemo(() => {
        if (!String(editForm.quotation_id || '').trim()) return false;
        if (!String(editForm.username || '').trim()) return false;
        if (!String(editForm.firm_id || '').trim()) return false;
        if (!Array.isArray(editForm.items) || editForm.items.length === 0) return false;
        return editForm.items.every((item) => {
            const sid = String(item.service_id || '').trim();
            const fees = Number(item.fees);
            const rate = Number(item.tax_rate);
            return Boolean(sid) && Number.isFinite(fees) && fees >= 0 && Number.isFinite(rate) && rate >= 0;
        });
    }, [editForm]);

    const resetEditForm = () => {
        setEditForm({
            quotation_id: '',
            username: '',
            firm_id: '',
            items: [newEditItem()],
        });
    };

    const toEditItems = (row) => {
        const rowAmount = getAmountParts(row?.amount || {});
        const mapped = getQuotationItems(row)
            .map((item) => {
                const serviceAmount = getAmountParts(item?.service?.amount);
                const itemAmount = getAmountParts(item?.amount);
                const serviceId = item?.service_id || item?.service?.service_id || item?.service?.id || '';
                const rawFees =
                    item?.fees ??
                    item?.fee ??
                    item?.amount?.fee ??
                    item?.amount?.fees ??
                    item?.service?.fees ??
                    serviceAmount.fees ??
                    itemAmount.fees ??
                    rowAmount.fees ??
                    '';
                const rawTaxRate =
                    item?.tax_rate ??
                    item?.amount?.tax_rate ??
                    item?.service?.tax_rate ??
                    item?.service?.amount?.tax_rate ??
                    item?.tax ??
                    item?.gst_rate ??
                    item?.gst ??
                    '';
                const rawTaxValue =
                    item?.tax_value ??
                    item?.tax_amount ??
                    item?.amount?.tax_value ??
                    item?.amount?.tax_amount ??
                    itemAmount.tax ??
                    serviceAmount.tax ??
                    '';

                const feesNum = Number(rawFees);
                const taxRateNum = Number(rawTaxRate);
                const taxValueNum = Number(rawTaxValue);
                let resolvedTaxRate = '';
                if (Number.isFinite(taxRateNum) && rawTaxRate !== '') {
                    resolvedTaxRate = String(rawTaxRate);
                } else if (Number.isFinite(feesNum) && feesNum > 0 && Number.isFinite(taxValueNum)) {
                    resolvedTaxRate = String((taxValueNum * 100) / feesNum);
                } else if (Number.isFinite(feesNum) && feesNum === 0 && Number.isFinite(taxValueNum) && taxValueNum === 0) {
                    resolvedTaxRate = '0';
                }

                return {
                    service_id: String(serviceId || '').trim(),
                    fees: rawFees === '' || rawFees === '-' ? '' : String(rawFees),
                    tax_rate: resolvedTaxRate === '' || resolvedTaxRate === '-' ? '' : String(resolvedTaxRate),
                };
            })
            .filter((item) => item.service_id);
        return mapped.length ? mapped : [newEditItem()];
    };

    const handleEditQuotation = (row) => {
        const quotationId = String(getQuotationId(row) || '').trim();
        if (!quotationId) {
            toast.error('Quotation id is missing for edit');
            return;
        }
        const username = String(getQuotationUsername(row) || effectiveUsername || '').trim();
        const rowFirmId =
            row?.firm_id ||
            row?.firm?.firm_id ||
            row?.firm?.id ||
            '';

        setEditForm({
            quotation_id: quotationId,
            username,
            firm_id: rowFirmId ? String(rowFirmId) : '',
            items: toEditItems(row),
        });
        setShowEditModal(true);
        setActiveMenuId(null);
        setActiveMenuRow(null);
        setActiveMenuAnchorEl(null);
    };

    const openStatusChangeConfirm = (row, nextStatus) => {
        const normalized = String(nextStatus || '').toLowerCase();
        if (normalized !== 'approved' && normalized !== 'rejected') return;
        const currentStatus = String(row?.status || '').toLowerCase();
        if (currentStatus === normalized) return;
        setStatusConfirmState({
            open: true,
            quotation: row || null,
            nextStatus: normalized,
        });
        setActiveMenuId(null);
        setActiveMenuRow(null);
        setActiveMenuAnchorEl(null);
    };

    const handleConfirmStatusChange = async () => {
        const quotation = statusConfirmState.quotation;
        const nextStatus = String(statusConfirmState.nextStatus || '').toLowerCase();
        const quotationId = String(getQuotationId(quotation) || '').trim();
        if (!quotationId) {
            toast.error('Quotation id is missing');
            return;
        }
        if (nextStatus !== 'approved' && nextStatus !== 'rejected') {
            toast.error('Invalid status selected');
            return;
        }
        const headers = getHeaders();
        if (!headers) {
            toast.error('Authentication headers are missing. Please sign in again.');
            return;
        }

        setChangingStatus(true);
        const loadingToast = toast.loading(`Updating status to ${nextStatus}...`);
        try {
            const response = await axios.put(
                `${API_BASE_URL}/quotation/change-status`,
                { quotation_id: quotationId, status: nextStatus },
                { headers }
            );
            const result = response.data || {};
            toast.dismiss(loadingToast);
            if (!result.success) {
                throw new Error(result.message || 'Failed to update quotation status');
            }
            toast.success(result.message || 'Quotation status updated successfully');
            setStatusConfirmState({ open: false, quotation: null, nextStatus: '' });
            await fetchQuotations({
                page_no: pagination.page_no,
                limit: pagination.limit,
                searchText: debouncedSearch,
                statusValue: status,
                firmIdValue: debouncedFirmId,
            });
        } catch (err) {
            toast.dismiss(loadingToast);
            toast.error(err.response?.data?.message || err.message || 'Failed to update quotation status');
        } finally {
            setChangingStatus(false);
        }
    };

    const handleOpenShareModal = (row) => {
        setActiveQuotation(row || null);
        setShowShareModal(true);
        setActiveMenuId(null);
        setActiveMenuRow(null);
        setActiveMenuAnchorEl(null);
    };

    const handleDownloadQuotation = async () => {
        const quotationId = String(getQuotationId(activeQuotation) || '').trim();
        if (!quotationId) {
            toast.error('Quotation id is missing for download');
            return;
        }
        const headers = getHeaders();
        if (!headers) {
            toast.error('Authentication headers are missing. Please sign in again.');
            return;
        }

        setDownloadingQuotation(true);
        const loadingToast = toast.loading('Preparing quotation PDF...');
        try {
            const response = await axios.post(
                `${API_BASE_URL}/quotation/download`,
                { quotation_id: quotationId },
                { headers }
            );
            const result = response.data || {};
            const fileUrl = result?.data?.url;
            const fileName = result?.data?.filename || `${quotationId}.pdf`;
            if (!result.success || !fileUrl) {
                throw new Error(result.message || 'Failed to generate quotation PDF');
            }

            const fileResponse = await axios.get(fileUrl, { responseType: 'blob' });
            const blobUrl = window.URL.createObjectURL(fileResponse.data);
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(blobUrl);
            toast.dismiss(loadingToast);
            toast.success(result.message || 'Quotation PDF downloaded');
        } catch (err) {
            toast.dismiss(loadingToast);
            toast.error(err.response?.data?.message || err.message || 'Unable to download quotation PDF');
        } finally {
            setDownloadingQuotation(false);
        }
    };

    const resetCreateForm = () => {
        setCreateForm({
            firm_id: '',
            items: [newCreateItem()],
        });
    };

    const handleEditItemFieldChange = (index, field, value) => {
        setEditForm((prev) => {
            const nextItems = [...prev.items];
            nextItems[index] = { ...nextItems[index], [field]: value };
            if (field === 'service_id') {
                const selected = services.find((s) => String(s.service_id) === String(value));
                if (selected) {
                    const defaultFees = selected?.fees ?? selected?.amount?.fees ?? '';
                    const defaultTax = selected?.tax_rate ?? selected?.tax ?? selected?.gst_rate ?? selected?.gst ?? '';
                    nextItems[index].fees = defaultFees === '' ? '' : String(defaultFees);
                    nextItems[index].tax_rate = defaultTax === '' ? '' : String(defaultTax);
                } else if (!String(value || '').trim()) {
                    nextItems[index].fees = '';
                    nextItems[index].tax_rate = '';
                }
            }
            return { ...prev, items: nextItems };
        });
    };

    const addEditItemRow = () => {
        setEditForm((prev) => ({ ...prev, items: [...prev.items, newEditItem()] }));
    };

    const removeEditItemRow = (index) => {
        setEditForm((prev) => {
            const next = prev.items.filter((_, idx) => idx !== index);
            return { ...prev, items: next.length ? next : [newEditItem()] };
        });
    };

    const handleCreateItemFieldChange = (index, field, value) => {
        setCreateForm((prev) => {
            const nextItems = [...prev.items];
            nextItems[index] = { ...nextItems[index], [field]: value };

            if (field === 'service_id') {
                const selected = services.find((s) => String(s.service_id) === String(value));
                if (selected) {
                    const defaultFees = selected?.fees ?? selected?.amount?.fees ?? '';
                    const defaultTax = selected?.tax_rate ?? selected?.tax ?? selected?.gst_rate ?? selected?.gst ?? '';
                    nextItems[index].fees = defaultFees === '' ? '' : String(defaultFees);
                    nextItems[index].tax_rate = defaultTax === '' ? '' : String(defaultTax);
                } else if (!String(value || '').trim()) {
                    nextItems[index].fees = '';
                    nextItems[index].tax_rate = '';
                }
            }

            return { ...prev, items: nextItems };
        });
    };

    const addCreateItemRow = () => {
        setCreateForm((prev) => ({ ...prev, items: [...prev.items, newCreateItem()] }));
    };

    const removeCreateItemRow = (index) => {
        setCreateForm((prev) => {
            const next = prev.items.filter((_, idx) => idx !== index);
            return { ...prev, items: next.length ? next : [newCreateItem()] };
        });
    };

    const handleCreateQuotation = async (e) => {
        e.preventDefault();
        if (!effectiveUsername) {
            toast.error('Username is missing. Please reload.');
            return;
        }
        const resolvedFirmId = createForm.firm_id || (firms.length === 1 ? firms[0]?.firm_id : '');
        if (!resolvedFirmId) {
            toast.error('Please select a firm');
            return;
        }

        const cleanedItems = createForm.items
            .map((item) => ({
                service_id: String(item.service_id || '').trim(),
                fees: Number(item.fees),
                tax_rate: Number(item.tax_rate),
            }))
            .filter((item) => item.service_id && Number.isFinite(item.fees) && Number.isFinite(item.tax_rate));

        if (!cleanedItems.length) {
            toast.error('Add at least one valid service row');
            return;
        }

        const payload = {
            username: effectiveUsername,
            firm_id: resolvedFirmId,
            items: cleanedItems,
        };

        const headers = getHeaders();
        if (!headers) {
            toast.error('Authentication headers are missing. Please sign in again.');
            return;
        }

        setCreatingQuotation(true);
        const loadingToast = toast.loading('Creating quotation...');
        try {
            const response = await axios.post(`${API_BASE_URL}/quotation/create`, payload, { headers });
            const result = response.data || {};
            toast.dismiss(loadingToast);
            if (!result.success) {
                throw new Error(result.message || 'Failed to create quotation');
            }

            toast.success(result.message || 'Quotation created successfully');
            setShowCreateModal(false);
            resetCreateForm();
            await fetchQuotations({
                page_no: pagination.page_no,
                limit: pagination.limit,
                searchText: debouncedSearch,
                statusValue: status,
                firmIdValue: debouncedFirmId,
            });
        } catch (err) {
            toast.dismiss(loadingToast);
            toast.error(err.response?.data?.message || err.message || 'Failed to create quotation');
        } finally {
            setCreatingQuotation(false);
        }
    };

    const handleUpdateQuotation = async (e) => {
        e.preventDefault();
        const quotationId = String(editForm.quotation_id || '').trim();
        const username = String(editForm.username || '').trim();
        if (!quotationId) {
            toast.error('Quotation id is required');
            return;
        }
        if (!username) {
            toast.error('Client username is required');
            return;
        }
        if (!String(editForm.firm_id || '').trim()) {
            toast.error('Please select a firm');
            return;
        }
        if (!Array.isArray(editForm.items) || editForm.items.length === 0) {
            toast.error('Add at least one item');
            return;
        }

        const cleanedItems = editForm.items
            .map((item) => ({
                service_id: String(item.service_id || '').trim(),
                fees: Number(item.fees),
                tax_rate: Number(item.tax_rate),
            }))
            .filter((item) => item.service_id && Number.isFinite(item.fees) && item.fees >= 0 && Number.isFinite(item.tax_rate) && item.tax_rate >= 0);
        if (!cleanedItems.length || cleanedItems.length !== editForm.items.length) {
            toast.error('Please fill all item rows with valid service, fees and tax rate');
            return;
        }

        const headers = getHeaders();
        if (!headers) {
            toast.error('Authentication headers are missing. Please sign in again.');
            return;
        }

        const payload = {
            quotation_id: quotationId,
            username,
            firm_id: String(editForm.firm_id || '').trim(),
            items: cleanedItems,
        };

        setEditingQuotation(true);
        const loadingToast = toast.loading('Updating quotation...');
        try {
            const response = await axios.put(`${API_BASE_URL}/quotation/edit`, payload, { headers });
            const result = response.data || {};
            toast.dismiss(loadingToast);
            if (!result.success) {
                throw new Error(result.message || 'Failed to update quotation');
            }

            toast.success(result.message || 'Quotation updated successfully');
            setShowEditModal(false);
            resetEditForm();
            await fetchQuotations({
                page_no: pagination.page_no,
                limit: pagination.limit,
                searchText: debouncedSearch,
                statusValue: status,
                firmIdValue: debouncedFirmId,
            });
        } catch (err) {
            toast.dismiss(loadingToast);
            toast.error(err.response?.data?.message || err.message || 'Failed to update quotation');
        } finally {
            setEditingQuotation(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -14 }}
            className="bg-gradient-to-br from-slate-50 via-white to-slate-50/30 p-4 sm:p-6"
        >
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
                <div className="border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white px-4 py-3 sm:px-5">
                    <div>
                        <h2 className="text-lg font-bold text-slate-800">Quotation List</h2>
                    </div>

                    <div className="mt-3 flex flex-col gap-2 md:flex-row md:items-center md:gap-2">
                        <div className="relative md:flex-1">
                            <input
                                type="search"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search quotation, client, description..."
                                className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-800 placeholder:text-slate-400 [appearance:textfield] [&::-webkit-search-decoration]:appearance-none [&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-results-button]:appearance-none [&::-webkit-search-results-decoration]:appearance-none focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                            />
                        </div>

                    <select
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                            className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm md:w-[9.5rem] lg:w-[10rem] focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                        >
                            {STATUS_OPTIONS.map((opt) => (
                                <option key={opt.value || 'all'} value={opt.value}>
                                    {opt.label}
                                </option>
                            ))}
                    </select>

                        <select
                            value={firmIdFilter}
                            onChange={(e) => setFirmIdFilter(e.target.value)}
                            className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm md:w-[12rem] lg:w-[13rem] focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                        >
                            <option value="">{firmsLoading ? 'Loading firms...' : 'All firms'}</option>
                            {firms.map((firm) => (
                                <option key={firm.firm_id} value={firm.firm_id}>
                                    {firm.firm_name || 'Unnamed firm'}
                                </option>
                            ))}
                        </select>

                        <button
                            type="button"
                            onClick={() =>
                                fetchQuotations({
                                    page_no: pagination.page_no,
                                    limit: pagination.limit,
                                    searchText: debouncedSearch,
                                    statusValue: status,
                                    firmIdValue: debouncedFirmId,
                                })
                            }
                            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 md:w-auto"
                        >
                            <FiRefreshCw className="h-4 w-4" />
                            Refresh
                        </button>

                        <button
                            type="button"
                            onClick={() => setShowCreateModal(true)}
                            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-indigo-600 to-indigo-700 px-3.5 text-sm font-semibold text-white shadow-sm hover:from-indigo-700 hover:to-indigo-800 md:w-auto"
                        >
                            <FiPlus className="h-4 w-4" />
                            Create
                        </button>
                </div>
            </div>

                {error && (
                    <div className="mx-4 mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-start gap-2 sm:mx-5">
                        <FiAlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                        <div className="flex-1">
                            <p className="font-medium">Unable to load quotations</p>
                            <p className="mt-0.5">{error}</p>
                        </div>
                    </div>
                )}

                <div className="overflow-x-auto mt-4">
                    <table className="w-full min-w-[58rem]">
                        <thead className="border-y border-slate-200 bg-slate-50/80">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">#</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Created Details</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Firm Details</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Amount</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Service</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Status</th>
                                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-600">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {!loading && !error && quotations.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-14 text-center">
                                        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                                            <FiFileText className="h-6 w-6 text-slate-400" />
                                        </div>
                                        <p className="text-sm font-medium text-slate-700">No quotations found</p>
                                        <p className="mt-1 text-xs text-slate-500">Try changing search text or filters.</p>
                                    </td>
                                </tr>
                            ) : (
                                rowsForTable.map((row, idx) => {
                                    if (row.__skeleton) {
                                        return (
                                            <tr key={row.id}>
                                                {Array.from({ length: 7 }).map((_, cIdx) => (
                                                    <td key={`${row.id}-${cIdx}`} className="px-4 py-4">
                                                        <div className="h-4 w-full max-w-[10rem] animate-pulse rounded bg-slate-200" />
                                                    </td>
                                                ))}
                                            </tr>
                                        );
                                    }

                                    const qId = getQuotationId(row);
                                    const menuKey = qId || `row-${idx}`;
                                    const firmName = row?.firm_name || row?.firm?.firm_name || 'N/A';
                                    const panNo = row?.pan_no || row?.firm?.pan_no || 'N/A';
                                    const amount =
                                        row?.amount?.total ??
                                        row?.amount?.grand_total ??
                                        row?.amount?.fees ??
                                        row?.amount?.subtotal ??
                                        row?.total_amount ??
                                        row?.amount ??
                                        row?.quotation_amount ??
                                        '-';
                                    const statusValue = row?.status || 'pending';
                                    const createdAt = row?.create_date || row?.created_at || row?.date;
                                    const quantity = getQuotationItems(row).length;
                                    const serialNo = (pagination.page_no - 1) * pagination.limit + idx + 1;
                                    const createdBy =
                                        row?.created_by_name ||
                                        row?.create_by?.name ||
                                        row?.created_by?.name ||
                                        row?.created_by ||
                                        row?.create_by ||
                                        'N/A';

                                    return (
                                        <tr key={menuKey} className="hover:bg-slate-50/70">
                                            <td className="px-4 py-3.5 text-sm font-medium text-slate-700">{serialNo}</td>
                                            <td className="px-4 py-3.5">
                                                <div className="mt-1 text-xs text-slate-500">
                                                    Date: {formatDateTime(createdAt)}
                                                </div>
                                                <div className="mt-0.5 text-xs text-slate-500">
                                                    Created by: {createdBy}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3.5">
                                                <div className="text-sm font-medium text-slate-800">{firmName}</div>
                                                <div className="mt-1 text-xs text-slate-500">PAN No: {panNo}</div>
                                            </td>
                                            <td className="px-4 py-3.5 text-sm font-semibold text-slate-800">{formatMoney(amount)}</td>
                                            <td className="px-4 py-3.5">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setActiveQuotation(row);
                                                        setShowItemsModal(true);
                                                    }}
                                                    className="inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-100 transition-colors"
                                                >
                                                    {quantity} {quantity === 1 ? 'service' : 'services'}
                                                </button>
                                            </td>
                                            <td className="px-4 py-3.5">
                                                <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusBadgeClass(statusValue)}`}>
                                                    {labelStatus(statusValue)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3.5 text-right">
                                                <div className="relative inline-block text-left" data-quotation-actions>
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            if (activeMenuId === menuKey) {
                                                                setActiveMenuId(null);
                                                                setActiveMenuRow(null);
                                                                setActiveMenuAnchorEl(null);
                                                                return;
                                                            }
                                                            setActiveMenuId(menuKey);
                                                            setActiveMenuRow(row);
                                                            setActiveMenuAnchorEl(e.currentTarget);
                                                        }}
                                                        className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50"
                                                        title="More actions"
                                                    >
                                                        <FiMoreVertical className="h-4 w-4" />
                                                    </button>
                                                    </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                                                        </div>

                <TablePagination
                    showRange
                    showRows
                    showJump
                    showFirstLast
                    rowOptions={[10, 20, 50, 100]}
                    defaultRows={20}
                    page={pagination.page_no}
                    limit={pagination.limit}
                    total={pagination.total_records}
                    totalPages={pagination.total_pages}
                    onPageChange={(nextPage) => setPagination((prev) => ({ ...prev, page_no: nextPage }))}
                    onLimitChange={(nextLimit) => setPagination((prev) => ({ ...prev, page_no: 1, limit: nextLimit }))}
                />
                                                    </div>

            <RowActionMenu
                open={Boolean(activeMenuId && activeMenuRow && activeMenuAnchorEl)}
                anchorEl={activeMenuAnchorEl}
                onClose={() => {
                    setActiveMenuId(null);
                    setActiveMenuRow(null);
                    setActiveMenuAnchorEl(null);
                }}
                onViewDetails={() => {
                    setActiveQuotation(activeMenuRow);
                    setShowDetailsModal(true);
                    setActiveMenuId(null);
                    setActiveMenuRow(null);
                    setActiveMenuAnchorEl(null);
                }}
                onShare={() => handleOpenShareModal(activeMenuRow)}
                onEdit={() => handleEditQuotation(activeMenuRow)}
                onApprove={() => openStatusChangeConfirm(activeMenuRow, 'approved')}
                onReject={() => openStatusChangeConfirm(activeMenuRow, 'rejected')}
                canApprove={String(activeMenuRow?.status || '').toLowerCase() !== 'approved'}
                canReject={String(activeMenuRow?.status || '').toLowerCase() !== 'rejected'}
            />

            <AnimatePresence>
                {statusConfirmState.open && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 flex items-center justify-center p-3 sm:p-4 z-50 backdrop-blur-sm"
                        onClick={() => {
                            if (changingStatus) return;
                            setStatusConfirmState({ open: false, quotation: null, nextStatus: '' });
                        }}
                    >
                        <motion.div
                            initial={{ scale: 0.95, y: 10 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.95, y: 10 }}
                            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="px-5 py-4 border-b border-slate-200 bg-slate-50">
                                <h3 className="text-lg font-semibold text-slate-800">Confirm Status Change</h3>
                                                </div>
                            <div className="px-5 py-4 space-y-3">
                                <p className="text-sm text-slate-700">
                                    Are you sure you want to{' '}
                                    <span className="font-semibold">
                                        {statusConfirmState.nextStatus === 'approved' ? 'approve' : 'reject'}
                                    </span>{' '}
                                    this quotation?
                                </p>
                                            </div>
                            <div className="px-5 py-3 border-t border-slate-200 bg-slate-50/60 flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setStatusConfirmState({ open: false, quotation: null, nextStatus: '' })}
                                    disabled={changingStatus}
                                    className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleConfirmStatusChange}
                                    disabled={changingStatus}
                                    className={`px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-60 ${
                                        statusConfirmState.nextStatus === 'approved'
                                            ? 'bg-emerald-600 hover:bg-emerald-700'
                                            : 'bg-red-600 hover:bg-red-700'
                                    }`}
                                >
                                    {changingStatus
                                        ? 'Updating...'
                                        : statusConfirmState.nextStatus === 'approved'
                                            ? 'Confirm Approve'
                                            : 'Confirm Reject'}
                                </button>
                                            </div>
                        </motion.div>
                    </motion.div>
                )}
                {showCreateModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 flex items-start justify-center p-3 sm:p-4 z-50 backdrop-blur-sm overflow-y-auto"
                        onClick={() => {
                            if (creatingQuotation) return;
                            setShowCreateModal(false);
                        }}
                    >
                        <motion.div
                            initial={{ scale: 0.95, y: 12 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.95, y: 12 }}
                            className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl my-2 sm:my-4 max-h-[calc(100vh-1.5rem)] sm:max-h-[calc(100vh-2rem)] overflow-hidden flex flex-col"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-600 px-5 py-3.5 text-white flex items-center justify-between shrink-0">
                                <div>
                                    <h3 className="text-lg font-semibold">Create Quotation</h3>
                                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (creatingQuotation) return;
                                        setShowCreateModal(false);
                                    }}
                                    className="p-2 rounded-lg hover:bg-white/10"
                                >
                                    <FiX className="w-5 h-5" />
                                </button>
                            </div>

                            <form onSubmit={handleCreateQuotation} className="flex flex-col flex-1 overflow-hidden">
                                <div
                                    className="px-5 py-4 overflow-y-auto flex-1 space-y-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                                >
                                                <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-1">Firm *</label>
                                        {firms.length === 1 ? (
                                            <div className="h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 flex items-center">
                                                {getFirmOptionLabel(firms[0])}
                                                </div>
                                        ) : (
                                            <SearchableFirmSelect
                                                firms={firms}
                                                value={createForm.firm_id}
                                                loading={firmsLoading}
                                                onChange={(val) => setCreateForm((prev) => ({ ...prev, firm_id: val }))}
                                            />
                                        )}
                                            </div>

                                    <div className="rounded-xl border border-slate-200 overflow-hidden">
                                        <div className="flex items-center justify-between bg-slate-50 border-b border-slate-200 px-4 py-3">
                                            <h4 className="text-sm font-semibold text-slate-700">Services</h4>
                                            <button
                                                type="button"
                                                onClick={addCreateItemRow}
                                                className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-100"
                                            >
                                                <FiPlus className="h-3.5 w-3.5" />
                                                Add row
                                            </button>
                                            </div>

                                        <div className="overflow-x-auto">
                                            <table className="w-full min-w-[42rem]">
                                                <thead className="bg-white border-b border-slate-200">
                                                    <tr>
                                                        <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase">#</th>
                                                        <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase">Service *</th>
                                                        <th className="px-3 py-2.5 text-right text-xs font-semibold text-slate-600 uppercase">Fees *</th>
                                                        <th className="px-3 py-2.5 text-right text-xs font-semibold text-slate-600 uppercase">Tax Rate (%) *</th>
                                                        <th className="px-3 py-2.5 text-right text-xs font-semibold text-slate-600 uppercase">Action</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-200">
                                                    {createForm.items.map((item, idx) => (
                                                        <tr key={`create-item-${idx}`} className="hover:bg-slate-50/60">
                                                            <td className="px-3 py-2.5 text-sm text-slate-600">{idx + 1}</td>
                                                            <td className="px-3 py-2.5">
                                                                <SearchableServiceSelect
                                                                    services={services}
                                                                    value={item.service_id}
                                                                    loading={servicesLoading}
                                                                    onChange={(val) => handleCreateItemFieldChange(idx, 'service_id', val)}
                                                                />
                                        </td>
                                                            <td className="px-3 py-2.5">
                                                                <input
                                                                    type="number"
                                                                    min="0"
                                                                    step="0.01"
                                                                    value={item.fees}
                                                                    onChange={(e) => handleCreateItemFieldChange(idx, 'fees', e.target.value)}
                                                                    onWheel={(e) => e.currentTarget.blur()}
                                                                    className="w-full h-9 rounded-lg border border-slate-200 px-2.5 text-sm text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                                                                    placeholder="0"
                                                                    required
                                                                />
                                                            </td>
                                                            <td className="px-3 py-2.5">
                                                                <input
                                                                    type="number"
                                                                    min="0"
                                                                    step="0.01"
                                                                    value={item.tax_rate}
                                                                    onChange={(e) => handleCreateItemFieldChange(idx, 'tax_rate', e.target.value)}
                                                                    onWheel={(e) => e.currentTarget.blur()}
                                                                    className="w-full h-9 rounded-lg border border-slate-200 px-2.5 text-sm text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                                                                    placeholder="0"
                                                                    required
                                                                />
                                                            </td>
                                                            <td className="px-3 py-2.5 text-right">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => removeCreateItemRow(idx)}
                                                                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
                                                                    title="Remove row"
                                                                >
                                                                    <FiTrash2 className="h-4 w-4" />
                                                                </button>
                                        </td>
                                                        </tr>
                                                    ))}
                        </tbody>
                    </table>
                                        </div>
                                    </div>
                </div>

                                <div className="px-5 py-3 border-t border-slate-200 bg-slate-50/50 flex justify-end gap-3 shrink-0">
                                    <div className="mr-auto rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-1.5">
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-4 gap-y-0.5 text-xs sm:text-sm">
                                            <div className="flex items-center gap-1">
                                                <span className="text-indigo-700/80">Fees:</span>
                                                <span className="text-indigo-900 font-medium">{formatMoney(createTotals.fees)}</span>
                            </div>
                                            <div className="flex items-center gap-1">
                                                <span className="text-indigo-700/80">Tax:</span>
                                                <span className="text-indigo-900 font-medium">{formatMoney(createTotals.tax)}</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <span className="text-indigo-700/80">Total:</span>
                                                <span className="text-indigo-900 font-semibold">{formatMoney(createTotals.total)}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (creatingQuotation) return;
                                            setShowCreateModal(false);
                                        }}
                                        className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={creatingQuotation || !isCreateFormValid}
                                        className="px-5 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60"
                                    >
                                        {creatingQuotation ? 'Creating...' : 'Create quotation'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
                {showEditModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 flex items-start justify-center p-3 sm:p-4 z-50 backdrop-blur-sm overflow-y-auto"
                        onClick={() => {
                            if (editingQuotation) return;
                            setShowEditModal(false);
                            resetEditForm();
                        }}
                    >
                        <motion.div
                            initial={{ scale: 0.95, y: 12 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.95, y: 12 }}
                            className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl my-2 sm:my-4 max-h-[calc(100vh-1.5rem)] sm:max-h-[calc(100vh-2rem)] overflow-hidden flex flex-col"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-600 px-5 py-3.5 text-white flex items-center justify-between shrink-0">
                                <div>
                                    <h3 className="text-lg font-semibold">Edit Quotation</h3>
                            </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (editingQuotation) return;
                                        setShowEditModal(false);
                                        resetEditForm();
                                    }}
                                    className="p-2 rounded-lg hover:bg-white/10"
                                >
                                    <FiX className="w-5 h-5" />
                                </button>
                        </div>

                            <form onSubmit={handleUpdateQuotation} className="flex flex-col flex-1 overflow-hidden">
                                <div
                                    className="px-5 py-4 overflow-y-auto flex-1 space-y-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                                >
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-1">Firm *</label>
                                        <SearchableFirmSelect
                                            firms={firms}
                                            value={editForm.firm_id}
                                            loading={firmsLoading}
                                            onChange={(val) => setEditForm((prev) => ({ ...prev, firm_id: val }))}
                                        />
                    </div>

                                    <div className="rounded-xl border border-slate-200 overflow-hidden">
                                        <div className="flex items-center justify-between bg-slate-50 border-b border-slate-200 px-4 py-3">
                                            <h4 className="text-sm font-semibold text-slate-700">Services</h4>
                                            <button
                                                type="button"
                                                onClick={addEditItemRow}
                                                className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-100"
                                            >
                                                <FiPlus className="h-3.5 w-3.5" />
                                                Add row
                                            </button>
                                        </div>
                                        <div className="overflow-x-auto">
                                            <table className="w-full min-w-[58rem]">
                                                <thead className="bg-white border-b border-slate-200">
                                                    <tr>
                                                        <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase">#</th>
                                                        <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase">Service *</th>
                                                        <th className="px-3 py-2.5 text-right text-xs font-semibold text-slate-600 uppercase">Fees *</th>
                                                        <th className="px-3 py-2.5 text-right text-xs font-semibold text-slate-600 uppercase">Tax Rate (%) *</th>
                                                        <th className="px-3 py-2.5 text-right text-xs font-semibold text-slate-600 uppercase">Tax Value</th>
                                                        <th className="px-3 py-2.5 text-right text-xs font-semibold text-slate-600 uppercase">Total</th>
                                                        <th className="px-3 py-2.5 text-right text-xs font-semibold text-slate-600 uppercase">Action</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-200">
                                                    {editForm.items.length === 0 ? (
                                                        <tr>
                                                            <td colSpan={7} className="px-3 py-8 text-center text-sm text-slate-500">
                                                                No items added. Click Add row.
                                                            </td>
                                                        </tr>
                                                    ) : (
                                                        editForm.items.map((item, idx) => {
                                                            const feesNum = Number(item.fees);
                                                            const taxRateNum = Number(item.tax_rate);
                                                            const taxValue = Number.isFinite(feesNum) && Number.isFinite(taxRateNum) ? (feesNum * taxRateNum) / 100 : 0;
                                                            const lineTotal = (Number.isFinite(feesNum) ? feesNum : 0) + taxValue;
                                                            return (
                                                                <tr key={`edit-item-${idx}`} className="hover:bg-slate-50/60">
                                                                    <td className="px-3 py-2.5 text-sm text-slate-600">{idx + 1}</td>
                                                                    <td className="px-3 py-2.5">
                                                                        <SearchableServiceSelect
                                                                            services={services}
                                                                            value={item.service_id}
                                                                            loading={servicesLoading}
                                                                            onChange={(val) => handleEditItemFieldChange(idx, 'service_id', val)}
                                                                        />
                                                                    </td>
                                                                    <td className="px-3 py-2.5">
                                                                        <input
                                                                            type="number"
                                                                            min="0"
                                                                            step="0.01"
                                                                            value={item.fees}
                                                                            onChange={(e) => handleEditItemFieldChange(idx, 'fees', e.target.value)}
                                                                            onWheel={(e) => e.currentTarget.blur()}
                                                                            className="w-full h-9 rounded-lg border border-slate-200 px-2.5 text-sm text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                                                                            placeholder="0"
                                                                            required
                                                                        />
                                                                    </td>
                                                                    <td className="px-3 py-2.5">
                                                                        <input
                                                                            type="number"
                                                                            min="0"
                                                                            step="0.01"
                                                                            value={item.tax_rate}
                                                                            onChange={(e) => handleEditItemFieldChange(idx, 'tax_rate', e.target.value)}
                                                                            onWheel={(e) => e.currentTarget.blur()}
                                                                            className="w-full h-9 rounded-lg border border-slate-200 px-2.5 text-sm text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                                                                            placeholder="0"
                                                                            required
                                                                        />
                                                                    </td>
                                                                    <td className="px-3 py-2.5 text-sm text-slate-700 text-right">{formatMoney(taxValue)}</td>
                                                                    <td className="px-3 py-2.5 text-sm text-slate-900 font-semibold text-right">{formatMoney(lineTotal)}</td>
                                                                    <td className="px-3 py-2.5 text-right">
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => removeEditItemRow(idx)}
                                                                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
                                                                            title="Remove row"
                                                                        >
                                                                            <FiTrash2 className="h-4 w-4" />
                                                                        </button>
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
            </div>

                                <div className="px-5 py-3 border-t border-slate-200 bg-slate-50/50 flex justify-end gap-3 shrink-0">
                                    <div className="mr-auto rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-1.5">
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-4 gap-y-0.5 text-xs sm:text-sm">
                                            <div className="flex items-center gap-1">
                                                <span className="text-indigo-700/80">Fees:</span>
                                                <span className="text-indigo-900 font-medium">{formatMoney(editTotals.fees)}</span>
                        </div>
                                            <div className="flex items-center gap-1">
                                                <span className="text-indigo-700/80">Tax:</span>
                                                <span className="text-indigo-900 font-medium">{formatMoney(editTotals.tax)}</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <span className="text-indigo-700/80">Total:</span>
                                                <span className="text-indigo-900 font-semibold">{formatMoney(editTotals.total)}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (editingQuotation) return;
                                            setShowEditModal(false);
                                            resetEditForm();
                                        }}
                                        className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={editingQuotation || !isEditFormValid}
                                        className="px-5 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60"
                                    >
                                        {editingQuotation ? 'Saving...' : 'Save changes'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
                {showDetailsModal && activeQuotation && (
                    <QuotationDetailsModal
                        quotation={activeQuotation}
                        onClose={() => {
                            setShowDetailsModal(false);
                            setActiveQuotation(null);
                        }}
                    />
                )}
                {showItemsModal && activeQuotation && (
                    <QuotationItemsModal
                        quotation={activeQuotation}
                        onClose={() => {
                            setShowItemsModal(false);
                            setActiveQuotation(null);
                        }}
                    />
                )}
                {showShareModal && activeQuotation && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 flex items-start justify-center p-3 sm:p-4 z-50 backdrop-blur-sm overflow-y-auto"
                        onClick={() => {
                            if (downloadingQuotation) return;
                            setShowShareModal(false);
                            setActiveQuotation(null);
                        }}
                    >
                        <motion.div
                            initial={{ scale: 0.95, y: 12 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.95, y: 12 }}
                            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg my-2 sm:my-4 overflow-hidden flex flex-col"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-3.5 text-white flex items-center justify-between shrink-0">
                        <div>
                                    <h3 className="text-lg font-semibold">Share Quotation</h3>
                        </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (downloadingQuotation) return;
                                        setShowShareModal(false);
                                        setActiveQuotation(null);
                                    }}
                                    className="p-2 rounded-lg hover:bg-white/10"
                                >
                                    <FiX className="w-5 h-5" />
                                </button>
                    </div>
                            <div className="px-5 py-4 space-y-4">
                                <div>
                                    <p className="text-sm font-semibold text-slate-700">Sharing options</p>
                                    <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2">
                                        <button
                                            type="button"
                                            disabled
                                            className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-left text-slate-500 cursor-not-allowed"
                                        >
                                            <div className="flex items-center gap-2.5">
                                                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                                                    <FiMail className="h-4 w-4" />
                                                </span>
                                                <div>
                                                    <p className="text-sm font-semibold">Email</p>
                                                    <p className="text-[11px]">Coming soon</p>
                                                </div>
                                            </div>
                                        </button>
                                        <button
                                            type="button"
                                            disabled
                                            className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-left text-slate-500 cursor-not-allowed"
                                        >
                                            <div className="flex items-center gap-2.5">
                                                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                                                    <FiMessageCircle className="h-4 w-4" />
                                                </span>
                                                <div>
                                                    <p className="text-sm font-semibold">WhatsApp</p>
                                                    <p className="text-[11px]">Coming soon</p>
                    </div>
                </div>
                                        </button>
                                        <button
                                            type="button"
                                            disabled
                                            className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-left text-slate-500 cursor-not-allowed"
                                        >
                                            <div className="flex items-center gap-2.5">
                                                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-violet-100 text-violet-600">
                                                    <FiLink className="h-4 w-4" />
                                                </span>
                                                <div>
                                                    <p className="text-sm font-semibold">Copy link</p>
                                                    <p className="text-[11px]">Coming soon</p>
                                                </div>
                                            </div>
                                        </button>
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={handleDownloadQuotation}
                                    disabled={downloadingQuotation}
                                    className="inline-flex w-full items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60"
                                >
                                    <FiDownload className="h-4 w-4" />
                                    {downloadingQuotation ? 'Downloading...' : 'Download PDF'}
                                </button>
                            </div>
                            <div className="px-5 py-3 border-t border-slate-200 bg-slate-50/60 flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (downloadingQuotation) return;
                                        setShowShareModal(false);
                                        setActiveQuotation(null);
                                    }}
                                    className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50"
                                >
                                    Close
                                </button>
            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default QuotationTab;