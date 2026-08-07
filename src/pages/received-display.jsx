import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
    FiSearch,
    FiPlus,
    FiEdit2,
    FiFileText,
    FiMoreVertical,
    FiEye,
    FiChevronRight,
    FiX,
    FiCheckCircle,
    FiAlertCircle,
    FiInfo,
    FiLock,
    FiDownload,
    FiShare2,
} from 'react-icons/fi';
import { PiExportBold } from "react-icons/pi";
import { PiFilePdfDuotone, PiMicrosoftExcelLogoDuotone } from "react-icons/pi";
import { AiOutlineMail } from "react-icons/ai";
import { FaWhatsapp } from "react-icons/fa6";
import { TbCurrencyRupee } from 'react-icons/tb';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { Header, Sidebar } from '../components/header';
import EmailSelectionModal from '../components/email-selection';
import MobileSelectionModal from '../components/mobile-selection';
import { TransactionModalManager } from '../components/Modals/CreateTransactions';
import { EditTransactionModalManager } from '../components/Modals/EditTransactions';
import DocumentShareModal from '../components/Modals/DocumentShareModal';
import { DateRangePickerField } from '../components/PortalDatePicker';
import TablePagination from '../components/TablePagination';
import API_BASE_URL from "../utils/api-controller";
import getHeaders from "../utils/get-headers";
import toast from 'react-hot-toast';
import { useUserPermissions } from '../utils/permission-helper';

const EMPTY_STATS = { count: 0, amount: 0 };

const toLocalIsoDate = (date = new Date()) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};

const getInitialDateRange = () => {
    const preferToday =
        typeof window !== 'undefined' &&
        new URLSearchParams(window.location.search).get('today') === 'true';
    const today = new Date();
    const todayIso = toLocalIsoDate(today);
    if (preferToday) {
        return { fromDate: todayIso, toDate: todayIso };
    }
    return {
        fromDate: toLocalIsoDate(new Date(today.getFullYear(), today.getMonth(), 1)),
        toDate: todayIso,
    };
};

const formatDisplayDate = (dateString) => {
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

const getPartyTypeInfo = (item) => {
    const type = item.payment_from?.type || '';
    const details = item.payment_from?.details || {};

    let displayName = '';
    let bgColor = '';
    let textColor = '';

    switch (type) {
        case 'client':
            displayName = details.name || 'Client';
            bgColor = 'bg-blue-100';
            textColor = 'text-blue-700';
            break;
        case 'ca':
            displayName = details.name || 'CA';
            bgColor = 'bg-purple-100';
            textColor = 'text-purple-700';
            break;
        case 'capital':
            displayName = 'Capital';
            bgColor = 'bg-emerald-100';
            textColor = 'text-emerald-700';
            break;
        case 'agent':
            displayName = details.name || 'Agent';
            bgColor = 'bg-amber-100';
            textColor = 'text-amber-700';
            break;
        case 'bank':
            displayName = details.bank || 'Bank';
            bgColor = 'bg-violet-100';
            textColor = 'text-violet-700';
            break;
        case 'staff':
            displayName = details.name || 'Staff';
            bgColor = 'bg-rose-100';
            textColor = 'text-rose-700';
            break;
        default:
            displayName = type || 'Other';
            bgColor = 'bg-slate-100';
            textColor = 'text-slate-700';
    }

    return { displayName, bgColor, textColor, type };
};

const getReceivedAtBadgeStyle = (accountType) => {
    switch (String(accountType || '').toLowerCase()) {
        case 'savings':
            return { bgColor: 'bg-emerald-100', textColor: 'text-emerald-700' };
        case 'current':
            return { bgColor: 'bg-blue-100', textColor: 'text-blue-700' };
        case 'loan':
            return { bgColor: 'bg-orange-100', textColor: 'text-orange-700' };
        case 'cash':
            return { bgColor: 'bg-amber-100', textColor: 'text-amber-700' };
        case 'capital':
            return { bgColor: 'bg-indigo-100', textColor: 'text-indigo-700' };
        default:
            return { bgColor: 'bg-slate-100', textColor: 'text-slate-700' };
    }
};

const getReceivedAtInfo = (item) => {
    const partyType = item.payment_to?.type || '';
    const details = item.payment_to?.details || {};
    const accountType = String(details.type || '').toLowerCase();

    if (partyType === 'capital') {
        return {
            displayName: details.name || 'Capital account',
            subtitle: '',
            badgeLabel: 'capital',
            ...getReceivedAtBadgeStyle('capital'),
        };
    }

    if (partyType === 'bank') {
        const isCash = accountType === 'cash';
        return {
            displayName: isCash ? (details.holder || 'Cash account') : (details.bank || details.holder || 'Bank account'),
            subtitle: isCash ? '' : (details.account_no || ''),
            badgeLabel: isCash ? 'cash' : (accountType || 'bank'),
            ...getReceivedAtBadgeStyle(isCash ? 'cash' : accountType),
        };
    }

    return {
        displayName: partyType || '—',
        subtitle: '',
        badgeLabel: partyType || '—',
        bgColor: 'bg-slate-100',
        textColor: 'text-slate-700',
    };
};

const getBankTypeInfo = (item) => {
    const info = getReceivedAtInfo(item);
    return {
        bankType: info.badgeLabel,
        bgColor: info.bgColor,
        textColor: info.textColor,
        bankName: info.displayName,
        accountNo: info.subtitle,
        holder: item.payment_to?.details?.holder || '',
        isCash: String(item.payment_to?.details?.type || '').toLowerCase() === 'cash',
    };
};

const getCreatorTypeInfo = (item) => {
    const creator = item.create_by || {};
    const username = creator.username || '';

    let type = 'employee';
    let bgColor = 'bg-emerald-100';
    let textColor = 'text-emerald-700';

    if (username === 'admin' || username.includes('admin')) {
        type = 'admin';
        bgColor = 'bg-red-100';
        textColor = 'text-red-700';
    } else if (username.includes('manager')) {
        type = 'manager';
        bgColor = 'bg-blue-100';
        textColor = 'text-blue-700';
    }

    return { type, bgColor, textColor, name: creator.name || '', mobile: creator.mobile || '', email: creator.email || '' };
};

const getReceivedAtLabel = (item) => getReceivedAtInfo(item).displayName;

const ReceivedDetailsModal = ({ isOpen, record, onClose, formatCurrency }) => (
    createPortal(
        <AnimatePresence>
            {isOpen && record ? (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
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
                        role="dialog"
                        aria-modal="true"
                        className="relative z-[1] pointer-events-auto my-2 flex w-full max-w-lg max-h-[min(calc(100vh-1.5rem),100dvh)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl sm:my-4 sm:max-h-[min(calc(100vh-2rem),100dvh)]"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-blue-500/25 bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-2.5 text-white">
                            <div className="flex min-w-0 items-center gap-2">
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/15">
                                    <FiEye className="h-3.5 w-3.5" aria-hidden />
                                </div>
                                <h2 className="truncate text-sm font-semibold">{record.invoice_no || 'Received entry'}</h2>
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
                        <div className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain px-5 py-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                            {(() => {
                                const partyInfo = getPartyTypeInfo(record);
                                const bankInfo = getBankTypeInfo(record);
                                const creatorInfo = getCreatorTypeInfo(record);

                                return (
                                    <>
                                        <div className="rounded-xl border border-blue-200/80 bg-gradient-to-br from-blue-50 to-white p-4 shadow-sm">
                                            <div className="mb-3 flex items-center justify-between gap-2">
                                                <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize ${partyInfo.bgColor} ${partyInfo.textColor}`}>
                                                    {partyInfo.type}
                                                </span>
                                                <span className="text-lg font-bold tabular-nums text-emerald-700">
                                                    ₹{formatCurrency(record.amount)}
                                                </span>
                                            </div>
                                            <DetailRow label="Party">{partyInfo.displayName}</DetailRow>
                                            <DetailRow label="Date">{formatDisplayDate(record.transaction_date)}</DetailRow>
                                            <DetailRow label="Voucher no.">{record.invoice_no || '—'}</DetailRow>
                                            <DetailRow label="Remark">
                                                <span className="block max-w-[14rem] truncate" title={record.remark || ''}>
                                                    {record.remark || '—'}
                                                </span>
                                            </DetailRow>
                                        </div>

                                        <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                                            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Received at</p>
                                            <DetailRow label="Account">{getReceivedAtLabel(record)}</DetailRow>
                                            {bankInfo.accountNo ? (
                                                <DetailRow label="Account no.">{bankInfo.accountNo}</DetailRow>
                                            ) : null}
                                            <DetailRow label="Type">
                                                <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${bankInfo.bgColor} ${bankInfo.textColor}`}>
                                                    {bankInfo.bankType || '—'}
                                                </span>
                                            </DetailRow>
                                        </div>

                                        <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                                            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Received by</p>
                                            <DetailRow label="Name">{creatorInfo.name || '—'}</DetailRow>
                                            {creatorInfo.mobile ? <DetailRow label="Mobile">{creatorInfo.mobile}</DetailRow> : null}
                                            {creatorInfo.email ? <DetailRow label="Email">{creatorInfo.email}</DetailRow> : null}
                                            <DetailRow label="Role">
                                                <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${creatorInfo.bgColor} ${creatorInfo.textColor}`}>
                                                    {creatorInfo.type}
                                                </span>
                                            </DetailRow>
                                        </div>

                                        <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                                            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Audit trail</p>
                                            <DetailRow label="Created">
                                                <span>
                                                    {formatDateTime(record.create_date)}
                                                    {record.create_by?.name ? (
                                                        <span className="mt-0.5 block text-xs font-normal text-slate-500">
                                                            by {record.create_by.name}
                                                        </span>
                                                    ) : null}
                                                </span>
                                            </DetailRow>
                                            <DetailRow label="Last modified">
                                                <span>
                                                    {formatDateTime(record.modify_date)}
                                                    {record.modify_by?.name ? (
                                                        <span className="mt-0.5 block text-xs font-normal text-slate-500">
                                                            by {record.modify_by.name}
                                                        </span>
                                                    ) : null}
                                                </span>
                                            </DetailRow>
                                        </div>
                                    </>
                                );
                            })()}
                        </div>
                        <div className="flex shrink-0 justify-end border-t border-slate-200 bg-slate-50/90 px-5 py-3">
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

// Inline Export Modal Component
const InlineExportModal = ({ isOpen, onClose, exportData, columns, jobType }) => {
    const [exporting, setExporting] = useState(false);
    const [exportStatus, setExportStatus] = useState(null);
    const [selectedFormat, setSelectedFormat] = useState(null);

    const getUserEmail = () => {
        try {
            const userEmail = localStorage.getItem('user_email');
            if (userEmail && userEmail !== 'undefined' && userEmail !== 'null') {
                return userEmail;
            }
            const userData = localStorage.getItem('user');
            if (userData) {
                const user = JSON.parse(userData);
                if (user.email) return user.email;
                if (user.user_email) return user.user_email;
            }
            return null;
        } catch (error) {
            console.error('Error getting user email:', error);
            return null;
        }
    };

    const userEmail = getUserEmail();

    const handleExport = async (fileType) => {
        if (!exportData || exportData.length === 0) {
            toast.error('No data to export');
            return;
        }

        if (!userEmail) {
            toast.error('User email not found. Please login again.');
            return;
        }

        setSelectedFormat(fileType);
        setExporting(true);
        setExportStatus('processing');

        try {
            const headers = await getHeaders();
            
            const payload = {
                job_type: jobType,
                file_type: fileType,
                recipient_email: userEmail,
                email_subject: `${jobType.replace('_', ' ').toUpperCase()} Export - ${new Date().toLocaleString()}`,
                email_message: `<p>Your ${jobType.replace('_', ' ')} export is ready.</p>
                                <p><strong>File Format:</strong> ${fileType.toUpperCase()}</p>
                                <p><strong>Total Records:</strong> ${exportData.length}</p>
                                <p><strong>Generated on:</strong> ${new Date().toLocaleString()}</p>`,
                data: exportData,
                columns: columns,
                filters: {
                    export_date: new Date().toISOString(),
                    total_records: exportData.length
                }
            };

            const response = await fetch(`${API_BASE_URL}/export/request`, {
                method: 'POST',
                headers: { ...headers, 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const result = await response.json();

            if (result.success) {
                setExportStatus('success');
                toast.success(`Export started! You will receive the ${fileType.toUpperCase()} file via email at ${userEmail}`);
                setTimeout(() => {
                    onClose();
                    setExportStatus(null);
                    setSelectedFormat(null);
                    setExporting(false);
                }, 2000);
            } else {
                throw new Error(result.message || 'Export failed');
            }
        } catch (error) {
            console.error('Export error:', error);
            setExportStatus('error');
            toast.error(error.message || 'Failed to start export');
            setTimeout(() => {
                setExportStatus(null);
                setSelectedFormat(null);
                setExporting(false);
            }, 2000);
        }
    };

    const exportOptions = [
        { type: 'excel', icon: <PiMicrosoftExcelLogoDuotone className="w-6 h-6 text-green-600" />, label: 'Excel (.xlsx)', description: 'Export as Microsoft Excel spreadsheet' },
        { type: 'csv', icon: <FiFileText className="w-6 h-6 text-blue-600" />, label: 'CSV (.csv)', description: 'Export as Comma Separated Values' },
        { type: 'pdf', icon: <PiFilePdfDuotone className="w-6 h-6 text-red-600" />, label: 'PDF (.pdf)', description: 'Export as Portable Document Format' }
    ];

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[200] p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-auto overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                                <PiExportBold className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold">Export Data</h3>
                                <p className="text-indigo-100 text-sm">Choose your preferred format</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-white p-2 rounded-lg hover:bg-white/10 transition-colors"
                            disabled={exporting}
                        >
                            <FiX className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="p-6">
                    {/* Email Info */}
                    <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="flex items-center gap-2">
                            <AiOutlineMail className="w-4 h-4 text-blue-600" />
                            <span className="text-sm text-blue-800">
                                Export will be sent to: <strong>{userEmail || 'Not found'}</strong>
                            </span>
                        </div>
                        {!userEmail && (
                            <div className="mt-2 text-xs text-red-600">
                                Please make sure you are logged in with a valid email address.
                            </div>
                        )}
                    </div>

                    {/* Data Summary */}
                    <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Total Records:</span>
                            <span className="font-semibold text-gray-800">{exportData?.length || 0}</span>
                        </div>
                        <div className="flex justify-between text-sm mt-1">
                            <span className="text-gray-600">Columns:</span>
                            <span className="font-semibold text-gray-800">{columns?.length || 0}</span>
                        </div>
                    </div>

                    {/* Export Options */}
                    <div className="space-y-3">
                        {exportOptions.map((option) => (
                            <button
                                key={option.type}
                                onClick={() => handleExport(option.type)}
                                disabled={exporting || !userEmail}
                                className={`w-full flex items-center justify-between p-4 rounded-lg border-2 transition-all ${
                                    exporting && selectedFormat === option.type
                                        ? 'border-indigo-500 bg-indigo-50'
                                        : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50'
                                } ${(exporting || !userEmail) && selectedFormat !== option.type ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-gray-50">
                                        {option.icon}
                                    </div>
                                    <div className="text-left">
                                        <div className="font-medium text-gray-800">{option.label}</div>
                                        <div className="text-xs text-gray-500">{option.description}</div>
                                    </div>
                                </div>
                                {exporting && selectedFormat === option.type && (
                                    <div className="flex items-center gap-2">
                                        {exportStatus === 'processing' && <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>}
                                        {exportStatus === 'success' && <FiCheckCircle className="w-5 h-5 text-green-600" />}
                                        {exportStatus === 'error' && <FiAlertCircle className="w-5 h-5 text-red-600" />}
                                    </div>
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Info Message */}
                    <div className="mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                        <div className="flex items-start gap-2">
                            <FiInfo className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                            <p className="text-xs text-yellow-700">
                                Export will be processed in the background. You will receive the file via email once completed.
                                Duplicate export requests are not allowed while an export is already in progress.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 font-medium text-sm transition-colors"
                        disabled={exporting}
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};

const ViewReceived = () => {
    const { check } = useUserPermissions();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(() => {
        const saved = localStorage.getItem('sidebarMinimized');
        return saved ? JSON.parse(saved) : false;
    });
    const [listLoading, setListLoading] = useState(true);
    const [error, setError] = useState(null);
    const [fromDate, setFromDate] = useState(() => getInitialDateRange().fromDate);
    const [toDate, setToDate] = useState(() => getInitialDateRange().toDate);
    const [received, setReceived] = useState([]);
    const [receivedFormModal, setPaymentReceivedModal] = useState(false);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [editRecord, setEditRecord] = useState(null);
    const [detailsOpen, setDetailsOpen] = useState(false);
    const [detailsRecord, setDetailsRecord] = useState(null);
    const [downloadingInvoice, setDownloadingInvoice] = useState(false);
    const [shareReceived, setShareReceived] = useState(null);
    const [showDocumentShareModal, setShowDocumentShareModal] = useState(false);
    const [stats, setStats] = useState(EMPTY_STATS);

    // State for dropdown menus
    const [showAddDropdown, setShowAddDropdown] = useState(false);
    const [showActionMenu, setShowActionMenu] = useState(null);
    const [actionMenuPosition, setActionMenuPosition] = useState(null);
    const actionAnchorRef = useRef(null);
    const [exportModal, setExportModal] = useState({ open: false, type: '', data: null });

    // Export Modal State
    const [exportModalOpen, setExportModalOpen] = useState(false);
    const [exportData, setExportData] = useState([]);
    const [exportColumns, setExportColumns] = useState([]);

    const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
    const [selectedEmail, setSelectedEmail] = useState('');

    const [isWhatsappModalOpen, setWhatsappModalOpen] = useState(false);
    const [selectedWhatsapp, setSelectedWhatsapp] = useState('');

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(20);
    const [totalRecords, setTotalRecords] = useState(0);
    const [isLastPage, setIsLastPage] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
    const searchDebounceRef = useRef(null);

    const scheduleSearchUpdate = useCallback((value) => {
        const trimmed = String(value ?? '').trim();
        setSearchTerm(value ?? '');
        if (searchDebounceRef.current) {
            clearTimeout(searchDebounceRef.current);
        }
        searchDebounceRef.current = setTimeout(() => {
            setDebouncedSearchTerm(trimmed);
            setCurrentPage(1);
        }, 300);
    }, []);

    const flushSearchUpdate = useCallback((value) => {
        if (searchDebounceRef.current) {
            clearTimeout(searchDebounceRef.current);
            searchDebounceRef.current = null;
        }
        const trimmed = String(value ?? '').trim();
        setSearchTerm(value ?? '');
        setDebouncedSearchTerm(trimmed);
        setCurrentPage(1);
    }, []);

    const handleDateRangeChange = useCallback((range) => {
        setFromDate(range?.start || '');
        setToDate(range?.end || '');
        setCurrentPage(1);
    }, []);

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

    useEffect(() => {
        return () => {
            if (searchDebounceRef.current) {
                clearTimeout(searchDebounceRef.current);
            }
        };
    }, []);

    useEffect(() => {
        setCurrentPage(1);
    }, [itemsPerPage]);

    // Format currency
    const formatCurrency = (amount) => {
        if (!check('finance_balance_view')) {
            return '*.*';
        }
        return new Intl.NumberFormat('en-IN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount);
    };

    const prepareExportData = () => {
        const exportDataList = [];
        const exportColumnsConfig = [];

        const columns = [
            { header: 'Sl No', key: 'sl_no', width: 10 },
            { header: 'Date', key: 'date', width: 15 },
            { header: 'Particulars', key: 'particulars', width: 25 },
            { header: 'Voucher No', key: 'voucher_no', width: 20 },
            { header: 'Amount (₹)', key: 'amount', width: 18 },
            { header: 'Received At', key: 'received_at', width: 20 },
            { header: 'Received By', key: 'received_by', width: 20 },
            { header: 'Remark', key: 'remark', width: 25 }
        ];

        exportColumnsConfig.push(...columns);

        received.forEach((item, index) => {
            const partyInfo = item.payment_from?.details?.name || item.payment_from?.details?.bank || 'N/A';
            const bankInfo = getReceivedAtLabel(item);
            const creatorInfo = item.create_by?.name || 'N/A';
            
            const row = {
                sl_no: ((currentPage - 1) * itemsPerPage) + index + 1,
                date: formatDisplayDate(item.transaction_date),
                particulars: partyInfo,
                voucher_no: item.invoice_no || 'N/A',
                amount: parseFloat(item.amount) || 0,
                received_at: bankInfo,
                received_by: creatorInfo,
                remark: item.remark || ''
            };
            exportDataList.push(row);
        });

        return { data: exportDataList, columns: exportColumnsConfig };
    };

    // Handle export click for modal
    const handleExportClick = () => {
        const { data, columns } = prepareExportData();
        
        if (data.length === 0) {
            toast.error('No data to export');
            return;
        }

        setExportData(data);
        setExportColumns(columns);
        setExportModalOpen(true);
    };

    // Handle other exports (print, whatsapp, email)
    const handleOtherExport = (type, data = null) => {
        setExportModal({ open: true, type, data });
        
        setTimeout(() => {
            setExportModal({ open: false, type: '', data: null });
            toast.success(`${type.toUpperCase()} export completed successfully!`);
        }, 1500);
    };

    // Fetch received data from API
    const fetchReceivedData = useCallback(async () => {
        if (!fromDate || !toDate) return;

        setListLoading(true);
        setError(null);

        try {
            const params = new URLSearchParams({
                page_no: String(currentPage),
                limit: String(itemsPerPage),
                from_date: fromDate,
                to_date: toDate,
            });
            if (debouncedSearchTerm) {
                params.set('search', debouncedSearchTerm);
            }

            const headers = await getHeaders();
            const response = await fetch(
                `${API_BASE_URL}/transaction/report/receive?${params.toString()}`,
                { method: 'GET', headers }
            );

            const result = await response.json();

            if (result.success) {
                setReceived(result.data || []);
                setTotalRecords(result.meta?.total || 0);
                setIsLastPage(result.meta?.is_last_page || false);
                setStats({
                    count: Number(result.stats?.count) || 0,
                    amount: Number(result.stats?.amount) || 0,
                });
            } else {
                setError(result.message || 'Failed to fetch received data');
                setReceived([]);
                setStats(EMPTY_STATS);
            }
        } catch (err) {
            console.error('Error fetching received data:', err);
            setError('Network error: Failed to fetch received data');
            setReceived([]);
            setStats(EMPTY_STATS);
        } finally {
            setListLoading(false);
        }
    }, [fromDate, toDate, currentPage, itemsPerPage, debouncedSearchTerm]);

    useEffect(() => {
        fetchReceivedData();
    }, [fetchReceivedData]);

    const handlePageChange = (newPage) => {
        setCurrentPage(newPage);
    };

    const handleLimitChange = (newLimit) => {
        setItemsPerPage(newLimit);
        setCurrentPage(1);
    };

    const emptySummary = { totalCredit: 0, totalDebit: 0, closingBalance: 0 };

    const handleReceivedSuccess = () => {
        fetchReceivedData();
    };

    const closeActionMenu = () => {
        setShowActionMenu(null);
        actionAnchorRef.current = null;
        setActionMenuPosition(null);
    };

    const openDetails = (record) => {
        setDetailsRecord(record);
        setDetailsOpen(true);
        closeActionMenu();
    };

    const closeDetails = () => {
        setDetailsOpen(false);
        setDetailsRecord(null);
    };

    const openEditModal = (record) => {
        if (!check('finance_entry_edit')) {
            toast.error('Need Access Permission');
            return;
        }
        setEditRecord(record);
        setEditModalOpen(true);
        closeActionMenu();
    };

    const closeEditModal = () => {
        setEditModalOpen(false);
        setEditRecord(null);
    };

    const handleEditSuccess = () => {
        closeEditModal();
        handleReceivedSuccess();
    };

    const handleDownloadInvoice = async (record) => {
        const invoiceId = record?.invoice_id;
        if (!invoiceId) {
            toast.error('Invoice ID not available for this receipt');
            return;
        }

        closeActionMenu();
        setDownloadingInvoice(true);
        const toastId = toast.loading('Generating invoice…');
        try {
            const headers = getHeaders();
            if (!headers) {
                toast.error('Please log in again to download the invoice', { id: toastId });
                return;
            }

            const response = await axios.post(
                `${API_BASE_URL}/invoice/generate`,
                { invoice_id: invoiceId, type: 'receive', response: 'pdf' },
                { headers, responseType: 'blob' }
            );

            const filename = `receive-${record.invoice_no || invoiceId}.pdf`;
            const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
            toast.success('Invoice downloaded', { id: toastId });
        } catch (error) {
            console.error('Invoice download error:', error);
            let message = error.message || 'Failed to download invoice';
            if (error.response?.data instanceof Blob) {
                try {
                    const text = await error.response.data.text();
                    const parsed = JSON.parse(text);
                    message = parsed.message || message;
                } catch {
                    // keep default
                }
            } else if (error.response?.data?.message) {
                message = error.response.data.message;
            }
            toast.error(message, { id: toastId });
        } finally {
            setDownloadingInvoice(false);
        }
    };

    const handleOpenShareReceived = (record) => {
        if (!record?.invoice_id) {
            toast.error('Invoice ID not available for this receipt');
            return;
        }
        const partyType = String(record.payment_from?.type || '').toLowerCase();
        if (partyType !== 'client') {
            toast.error('Share is available for client receipts only');
            return;
        }
        closeActionMenu();
        setShareReceived(record);
        setShowDocumentShareModal(true);
    };

    const handleShareReceivedSend = useCallback(
        async ({ channels, mobile, email, country_code }) => {
            if (!shareReceived?.invoice_id) {
                throw new Error('Invoice ID not available');
            }
            const response = await axios.post(
                `${API_BASE_URL}/invoice/share`,
                {
                    invoice_id: shareReceived.invoice_id,
                    type: 'receive',
                    channels,
                    mobile,
                    email,
                    country_code,
                },
                { headers: getHeaders() }
            );
            if (!response.data?.success) {
                throw new Error(response.data?.message || 'Failed to share invoice');
            }
            return response.data;
        },
        [shareReceived]
    );

    const handleEmailSubmit = (email) => {
        setSelectedEmail(email);
        setIsEmailModalOpen(false);
        console.log('Selected email:', email);
    };

    const handleWhatsappSubmit = (number) => {
        setSelectedWhatsapp(number);
        setWhatsappModalOpen(false);
        console.log('Selected number:', number);
    };

    const computeActionMenuPosition = useCallback((anchorEl, options = {}) => {
        if (!anchorEl) return null;

        const itemCount = Math.max(1, Number(options.itemCount) || 2);
        const rect = anchorEl.getBoundingClientRect();
        const menuWidth = 176;
        const menuHeight = 8 + itemCount * 36;
        const gap = 8;
        const margin = 8;
        const vw = window.innerWidth;
        const vh = window.innerHeight;

        const space = {
            top: rect.top - margin,
            bottom: vh - rect.bottom - margin,
            right: vw - rect.right - margin,
            left: rect.left - margin,
        };

        const fits = {
            top: space.top >= menuHeight + gap,
            bottom: space.bottom >= menuHeight + gap,
            right: space.right >= menuWidth + gap,
            left: space.left >= menuWidth + gap,
        };

        const preferred = ['top', 'bottom', 'right', 'left'];
        let placement = preferred.find((p) => fits[p]);

        if (!placement) {
            placement = preferred.reduce((best, p) => (space[p] > space[best] ? p : best), 'bottom');
        }

        let top = 0;
        let left = 0;

        if (placement === 'top') {
            top = rect.top - menuHeight - gap;
            left = rect.left + rect.width / 2 - menuWidth / 2;
        } else if (placement === 'bottom') {
            top = rect.bottom + gap;
            left = rect.left + rect.width / 2 - menuWidth / 2;
        } else if (placement === 'right') {
            top = rect.top + rect.height / 2 - menuHeight / 2;
            left = rect.right + gap;
        } else {
            top = rect.top + rect.height / 2 - menuHeight / 2;
            left = rect.left - menuWidth - gap;
        }

        const clampedLeft = Math.max(margin, Math.min(left, vw - menuWidth - margin));
        const clampedTop = Math.max(margin, Math.min(top, vh - menuHeight - margin));
        const anchorCenterX = rect.left + rect.width / 2;
        const anchorCenterY = rect.top + rect.height / 2;

        return {
            top: clampedTop,
            left: clampedLeft,
            placement,
            arrowX: Math.max(12, Math.min(menuWidth - 12, anchorCenterX - clampedLeft)),
            arrowY: Math.max(12, Math.min(menuHeight - 12, anchorCenterY - clampedTop)),
        };
    }, []);

    const handleActionClick = useCallback((e, transactionId) => {
        e.stopPropagation();
        if (showActionMenu === transactionId) {
            closeActionMenu();
            return;
        }
        actionAnchorRef.current = e.currentTarget;
        setActionMenuPosition(computeActionMenuPosition(e.currentTarget, { itemCount: 4 }));
        setShowActionMenu(transactionId);
        setShowAddDropdown(false);
    }, [showActionMenu, computeActionMenuPosition]);

    const activeReceivedItem = useMemo(
        () => received.find((item) => item.transaction_id === showActionMenu) || null,
        [received, showActionMenu]
    );

    // Close export / action menus when clicking outside
    useEffect(() => {
        const handleClickOutside = () => {
            setShowAddDropdown(false);
            closeActionMenu();
        };

        document.addEventListener('click', handleClickOutside);
        return () => {
            document.removeEventListener('click', handleClickOutside);
        };
    }, []);

    useEffect(() => {
        if (!showActionMenu || !actionAnchorRef.current) return undefined;

        const updatePosition = () => {
            setActionMenuPosition(
                computeActionMenuPosition(actionAnchorRef.current, { itemCount: 4 })
            );
        };

        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                closeActionMenu();
            }
        };

        updatePosition();
        window.addEventListener('resize', updatePosition);
        window.addEventListener('scroll', updatePosition, true);
        document.addEventListener('keydown', handleEscape);

        return () => {
            window.removeEventListener('resize', updatePosition);
            window.removeEventListener('scroll', updatePosition, true);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [showActionMenu, computeActionMenuPosition]);

    const StatCardSkeleton = () => (
        <div className="h-[4.25rem] animate-pulse rounded-xl border border-slate-200 bg-slate-100/80 sm:h-[4.5rem]" />
    );

    // Skeleton loader component
    const SkeletonRow = () => (
        <tr className="animate-pulse border-b border-slate-100">
            <td className="p-3 text-center"><div className="mx-auto h-4 w-6 rounded bg-slate-200" /></td>
            <td className="p-3 text-center"><div className="mx-auto h-4 w-16 rounded bg-slate-200" /></td>
            <td className="p-3 text-center"><div className="mx-auto h-4 w-24 rounded bg-slate-200" /></td>
            <td className="p-3 text-center"><div className="mx-auto h-4 w-16 rounded bg-slate-200" /></td>
            <td className="p-3 text-center"><div className="mx-auto h-6 w-16 rounded bg-slate-200" /></td>
            <td className="p-3 text-center"><div className="mx-auto h-4 w-20 rounded bg-slate-200" /></td>
            <td className="p-3 text-center"><div className="mx-auto h-8 w-8 rounded bg-slate-200" /></td>
        </tr>
    );

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
            {/* Fixed Header */}
            <Header
                mobileMenuOpen={mobileMenuOpen}
                setMobileMenuOpen={setMobileMenuOpen}
                isMinimized={isMinimized}
                setIsMinimized={setIsMinimized}
            />
            
            {/* Fixed Sidebar */}
            <Sidebar
                mobileMenuOpen={mobileMenuOpen}
                setMobileMenuOpen={setMobileMenuOpen}
                isMinimized={isMinimized}
                setIsMinimized={setIsMinimized}
            />

            {/* Main Content Area - Full Page Scroll */}
            <div className={`pt-16 transition-all duration-300 ease-in-out ${isMinimized ? 'md:pl-20' : 'md:pl-[260px]'}`}>
                <div className="h-full flex flex-col mx-2 sm:mx-4 md:mx-8 my-3 md:my-4">
                    <div className="mb-4 grid grid-cols-1 gap-2 sm:gap-3 sm:grid-cols-2">
                        {listLoading && received.length === 0 ? (
                            <>
                                <StatCardSkeleton />
                                <StatCardSkeleton />
                            </>
                        ) : (
                            <>
                                <motion.div
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-indigo-600 via-indigo-500 to-violet-600 p-3 text-white sm:p-3.5"
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0 flex-1">
                                            <p className="text-[10px] font-semibold uppercase tracking-wide text-white/80 sm:text-[11px]">Received entries</p>
                                            <p className="mt-0.5 truncate text-sm font-bold tabular-nums sm:text-base">{stats.count}</p>
                                        </div>
                                        <div className="shrink-0 rounded-lg bg-white/20 p-1.5"><FiFileText className="h-3.5 w-3.5 sm:h-4 sm:w-4" /></div>
                                    </div>
                                </motion.div>

                                <motion.div
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.2, delay: 0.04 }}
                                    className="overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-emerald-600 via-teal-500 to-cyan-600 p-3 text-white sm:p-3.5"
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0 flex-1">
                                            <p className="text-[10px] font-semibold uppercase tracking-wide text-white/80 sm:text-[11px]">Total received</p>
                                            <p className="mt-0.5 truncate text-sm font-bold tabular-nums sm:text-base">₹{formatCurrency(stats.amount)}</p>
                                        </div>
                                        <div className="shrink-0 rounded-lg bg-white/20 p-1.5"><TbCurrencyRupee className="h-3.5 w-3.5 sm:h-4 sm:w-4" /></div>
                                    </div>
                                </motion.div>
                            </>
                        )}
                    </div>

                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4"
                        >
                            <p className="text-sm text-red-600">{error}</p>
                        </motion.div>
                    )}

                    {/* Received register — flat (no card shell) */}
                    <motion.div
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.25 }}
                        className="overflow-hidden rounded-lg border border-slate-200/80 bg-white/70"
                    >
                        <div className="sticky top-0 z-10 border-b border-slate-200 bg-gradient-to-r from-slate-100/90 via-white to-indigo-50/40 py-2.5 pl-3 pr-0 sm:pl-4 sm:pr-0">
                            <div className="flex w-full min-w-0 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
                                <div className="flex min-w-0 w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-3 sm:gap-y-2 lg:min-w-0 lg:flex-1 lg:flex-nowrap lg:items-center lg:gap-x-4">
                                    <h5 className="mr-4 shrink-0 text-sm font-bold tracking-tight text-slate-800 sm:mr-6 sm:text-base lg:mr-8">
                                        Received Register
                                    </h5>
                                    <div className="relative w-full min-w-0 flex-1 sm:min-w-[18rem] lg:min-w-[22rem] xl:min-w-[28rem]">
                                        <FiSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                        <input
                                            type="text"
                                            placeholder="Search…"
                                            value={searchTerm}
                                            onChange={(e) => scheduleSearchUpdate(e.target.value)}
                                            onKeyUp={(e) => {
                                                if (e.key === 'Enter') {
                                                    flushSearchUpdate(e.currentTarget.value);
                                                    return;
                                                }
                                                scheduleSearchUpdate(e.currentTarget.value);
                                            }}
                                            className="h-9 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                    <div className="w-full min-w-0 max-w-full shrink-0 overflow-x-auto sm:min-w-[10rem] sm:max-w-[14rem] lg:max-w-[14rem] xl:max-w-[16rem]">
                                        <DateRangePickerField
                                            value={{ start: fromDate, end: toDate }}
                                            onChange={handleDateRangeChange}
                                            placeholder="Select date range"
                                            mode="range"
                                            initialTab="quick"
                                            defaultQuickKey="tm"
                                            quickOptionKeys={['tw', 'lw', 'lm', 'tm', 'lf', 'fy']}
                                            showRangeHint={false}
                                            showResetButton={false}
                                            truncateRangeLabel={false}
                                            buttonClassName="w-full min-w-0 px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-600 hover:border-indigo-400 focus:outline-none transition-all"
                                            wrapperClassName="w-full min-w-0"
                                        />
                                    </div>
                                </div>

                                <div className="flex w-full shrink-0 items-center justify-end gap-2 sm:w-auto lg:pl-1">
                                    <div className="dropdown-container relative shrink-0">
                                        <motion.button
                                            type="button"
                                            onClick={(e) => { e.stopPropagation(); setShowAddDropdown(!showAddDropdown); }}
                                            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 px-2.5 text-xs font-semibold text-white shadow-sm transition-all duration-200 hover:from-blue-700 hover:to-blue-800 hover:shadow sm:h-10 sm:px-3"
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                        >
                                            <PiExportBold className="h-4 w-4 shrink-0" />
                                            <span className="whitespace-nowrap">Export</span>
                                            <FiChevronRight className={`h-3.5 w-3.5 shrink-0 transition-transform ${showAddDropdown ? 'rotate-90' : ''}`} />
                                        </motion.button>

                                        <AnimatePresence>
                                            {showAddDropdown && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: 5 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, y: 5 }}
                                                    className="absolute right-0 z-50 mt-1 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <div className="py-1">
                                                        <button type="button" onClick={handleExportClick} className="flex w-full items-center px-3 py-2 text-sm text-slate-700 hover:bg-blue-50">
                                                            <div className="mr-2 rounded bg-red-50 p-1.5"><PiFilePdfDuotone className="h-3.5 w-3.5 text-red-500" /></div>
                                                            <span className="text-xs font-medium">Export as PDF</span>
                                                        </button>
                                                        <button type="button" onClick={handleExportClick} className="flex w-full items-center px-3 py-2 text-sm text-slate-700 hover:bg-blue-50">
                                                            <div className="mr-2 rounded bg-green-50 p-1.5"><PiMicrosoftExcelLogoDuotone className="h-3.5 w-3.5 text-green-500" /></div>
                                                            <span className="text-xs font-medium">Export as Excel</span>
                                                        </button>
                                                        <button type="button" onClick={() => setWhatsappModalOpen(true)} className="flex w-full items-center px-3 py-2 text-sm text-slate-700 hover:bg-blue-50">
                                                            <div className="mr-2 rounded bg-green-50 p-1.5"><FaWhatsapp className="h-3.5 w-3.5 text-green-500" /></div>
                                                            <span className="text-xs font-medium">Share via WhatsApp</span>
                                                        </button>
                                                        <button type="button" onClick={() => setIsEmailModalOpen(true)} className="flex w-full items-center px-3 py-2 text-sm text-slate-700 hover:bg-blue-50">
                                                            <div className="mr-2 rounded bg-blue-50 p-1.5"><AiOutlineMail className="h-3.5 w-3.5 text-blue-500" /></div>
                                                            <span className="text-xs font-medium">Share via Email</span>
                                                        </button>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>

                                    <motion.button
                                        type="button"
                                        onClick={() => {
                                            if (!check('finance_entry')) {
                                                toast.error('Need Access Permission');
                                            } else {
                                                setPaymentReceivedModal(true);
                                            }
                                        }}
                                        className={`mr-2 inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-emerald-700 px-2.5 text-xs font-semibold text-white shadow-sm transition-all duration-200 hover:from-emerald-700 hover:to-emerald-800 hover:shadow sm:mr-3 sm:h-10 sm:px-3 ${
                                            !check('finance_entry') ? 'cursor-not-allowed opacity-60 hover:from-emerald-600 hover:to-emerald-700' : ''
                                        }`}
                                        whileHover={check('finance_entry') ? { scale: 1.02 } : {}}
                                        whileTap={check('finance_entry') ? { scale: 0.98 } : {}}
                                    >
                                        {!check('finance_entry') ? <FiLock className="h-4 w-4 shrink-0" /> : <FiPlus className="h-4 w-4 shrink-0" />}
                                        <span className="whitespace-nowrap">Create</span>
                                    </motion.button>
                                </div>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="border-b border-slate-200 bg-slate-100/90">
                                        <th className="min-w-[60px] p-3 text-center text-[10px] font-semibold uppercase tracking-wider text-slate-700">Sl No</th>
                                        <th className="min-w-[80px] p-3 text-center text-[10px] font-semibold uppercase tracking-wider text-slate-700">Date</th>
                                        <th className="min-w-[200px] p-3 text-center text-[10px] font-semibold uppercase tracking-wider text-slate-700">Particulars</th>
                                        <th className="min-w-[120px] p-3 text-center text-[10px] font-semibold uppercase tracking-wider text-slate-700">Voucher No</th>
                                        <th className="min-w-[100px] p-3 text-center text-[10px] font-semibold uppercase tracking-wider text-slate-700">Amount</th>
                                        <th className="min-w-[160px] p-3 text-center text-[10px] font-semibold uppercase tracking-wider text-slate-700">Received At</th>
                                        <th className="min-w-[80px] p-3 text-center text-[10px] font-semibold uppercase tracking-wider text-slate-700">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {listLoading && received.length === 0 ? (
                                        [...Array(5)].map((_, index) => <SkeletonRow key={index} />)
                                    ) : received.length === 0 ? (
                                        <tr>
                                            <td colSpan="7" className="py-8 text-center text-slate-500">
                                                <div className="flex flex-col items-center justify-center">
                                                    <div className="mb-3 rounded-full bg-slate-100 p-3">
                                                        <FiFileText className="h-8 w-8 text-slate-400" />
                                                    </div>
                                                    <p className="mb-1 text-sm font-medium text-slate-600">No received records found</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        received.map((item, index) => {
                                            const partyInfo = getPartyTypeInfo(item);
                                            const receivedAtInfo = getReceivedAtInfo(item);

                                            return (
                                                <motion.tr
                                                    key={item.transaction_id}
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    transition={{ duration: 0.15 }}
                                                    className={`${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'} transition-colors duration-150 hover:bg-indigo-50/40`}
                                                >
                                                    <td className="p-3 text-center align-middle">
                                                        <div className="text-xs font-medium text-slate-700">
                                                            {(currentPage - 1) * itemsPerPage + index + 1}
                                                        </div>
                                                    </td>
                                                    <td className="p-3 text-center align-middle">
                                                        <div className="text-xs font-medium text-slate-700">
                                                            {formatDisplayDate(item.transaction_date)}
                                                        </div>
                                                    </td>
                                                    <td className="p-3 text-center align-middle">
                                                        <div className="mx-auto max-w-[200px]">
                                                            <div className="text-xs font-semibold text-slate-800">
                                                                {partyInfo.displayName}
                                                            </div>
                                                            <div className="mt-1 flex flex-col items-center gap-1">
                                                                <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${partyInfo.bgColor} ${partyInfo.textColor}`}>
                                                                    {partyInfo.type}
                                                                </span>
                                                            </div>
                                                            {item.remark ? (
                                                                <div className="mt-1 truncate text-[10px] italic text-slate-500" title={item.remark}>
                                                                    {item.remark}
                                                                </div>
                                                            ) : null}
                                                        </div>
                                                    </td>
                                                    <td className="p-3 text-center align-middle">
                                                        <span className="inline-flex items-center justify-center rounded border border-slate-200 bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-800">
                                                            {item.invoice_no}
                                                        </span>
                                                    </td>
                                                    <td className="p-3 text-center align-middle">
                                                        <span className="inline-flex min-w-[90px] items-center justify-center rounded bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800">
                                                            ₹{formatCurrency(item.amount)}
                                                        </span>
                                                    </td>
                                                    <td className="p-3 text-center align-middle">
                                                        <div className="mx-auto max-w-[160px]">
                                                            <div className="truncate text-xs font-medium text-slate-800" title={receivedAtInfo.displayName}>
                                                                {receivedAtInfo.displayName}
                                                            </div>
                                                            {receivedAtInfo.subtitle ? (
                                                                <div className="mt-0.5 truncate text-[10px] text-slate-500" title={receivedAtInfo.subtitle}>
                                                                    {receivedAtInfo.subtitle}
                                                                </div>
                                                            ) : null}
                                                            <div className="mt-1">
                                                                <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${receivedAtInfo.bgColor} ${receivedAtInfo.textColor}`}>
                                                                    {receivedAtInfo.badgeLabel}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="p-3 text-center align-middle">
                                                        <div className="flex justify-center">
                                                            <button
                                                                type="button"
                                                                aria-label="Actions"
                                                                className="rounded-lg border border-slate-200 p-1.5 text-slate-500 transition-colors duration-150 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600"
                                                                onClick={(e) => handleActionClick(e, item.transaction_id)}
                                                            >
                                                                <FiMoreVertical className="h-4 w-4" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </motion.tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>

                            {!error && (received.length > 0 || totalRecords > 0) && (
                                <TablePagination
                                    page={currentPage}
                                    limit={itemsPerPage}
                                    total={totalRecords}
                                    totalPages={Math.max(1, Math.ceil(totalRecords / (itemsPerPage || 1)))}
                                    isLastPage={isLastPage}
                                    rowOptions={[10, 20, 50, 100]}
                                    defaultRows={20}
                                    onPageChange={handlePageChange}
                                    onLimitChange={handleLimitChange}
                                />
                            )}
                        </div>
                    </motion.div>
                </div>
            </div>

            {showActionMenu && activeReceivedItem && actionMenuPosition && createPortal(
                <motion.div
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    className="fixed z-[99999] w-44 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-xl"
                    style={{ top: actionMenuPosition.top, left: actionMenuPosition.left, height: 'auto' }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <span
                        className="absolute h-2.5 w-2.5 rotate-45 border-slate-200 bg-white"
                        style={{
                            left: actionMenuPosition.placement === 'left' || actionMenuPosition.placement === 'right'
                                ? undefined
                                : `${actionMenuPosition.arrowX - 5}px`,
                            top: actionMenuPosition.placement === 'bottom' ? '-5px' : actionMenuPosition.placement === 'top' ? undefined : `${actionMenuPosition.arrowY - 5}px`,
                            bottom: actionMenuPosition.placement === 'top' ? '-5px' : undefined,
                            right: actionMenuPosition.placement === 'left' ? '-5px' : undefined,
                            borderTopWidth: actionMenuPosition.placement === 'bottom' ? '1px' : '0',
                            borderLeftWidth: actionMenuPosition.placement === 'bottom' ? '1px' : '0',
                            borderBottomWidth: actionMenuPosition.placement === 'top' ? '1px' : '0',
                            borderRightWidth: actionMenuPosition.placement === 'left' ? '1px' : actionMenuPosition.placement === 'right' ? '1px' : '0',
                        }}
                    />
                    <button
                        type="button"
                        onClick={() => openDetails(activeReceivedItem)}
                        className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-slate-700 transition-colors hover:bg-indigo-50"
                    >
                        <FiEye className="h-4 w-4 text-indigo-600" />
                        Details
                    </button>
                    <button
                        type="button"
                        className={`flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-slate-700 transition-colors hover:bg-blue-50 ${
                            !check('finance_entry_edit') ? 'cursor-not-allowed opacity-60 hover:bg-transparent' : ''
                        }`}
                        onClick={() => openEditModal(activeReceivedItem)}
                    >
                        {!check('finance_entry_edit') ? (
                            <FiLock className="h-4 w-4 text-slate-400" />
                        ) : (
                            <FiEdit2 className="h-4 w-4 text-blue-600" />
                        )}
                        Edit
                    </button>
                    <button
                        type="button"
                        disabled={downloadingInvoice}
                        onClick={() => handleDownloadInvoice(activeReceivedItem)}
                        className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-slate-700 transition-colors hover:bg-green-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {downloadingInvoice ? (
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-green-500 border-t-transparent" />
                        ) : (
                            <FiDownload className="h-4 w-4 text-green-600" />
                        )}
                        {downloadingInvoice ? 'Downloading…' : 'Download'}
                    </button>
                    <button
                        type="button"
                        onClick={() => handleOpenShareReceived(activeReceivedItem)}
                        className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-slate-700 transition-colors hover:bg-teal-50"
                    >
                        <FiShare2 className="h-4 w-4 text-teal-600" />
                        Share
                    </button>
                </motion.div>,
                document.body
            )}

            {/* Modals */}
            <ReceivedDetailsModal
                isOpen={detailsOpen}
                record={detailsRecord}
                onClose={closeDetails}
                formatCurrency={formatCurrency}
            />

            <TransactionModalManager
                modalType="RECEIVE"
                isOpen={receivedFormModal}
                onClose={() => setPaymentReceivedModal(false)}
                onSubmit={handleReceivedSuccess}
                formatCurrency={formatCurrency}
                summary={emptySummary}
            />

            <EditTransactionModalManager
                modalType="RECEIVE"
                isOpen={editModalOpen}
                onClose={closeEditModal}
                editRecord={editRecord}
                onSubmit={handleEditSuccess}
                formatCurrency={formatCurrency}
                summary={emptySummary}
            />

            <DocumentShareModal
                isOpen={showDocumentShareModal}
                onClose={() => {
                    setShowDocumentShareModal(false);
                    setShareReceived(null);
                }}
                title="Share Receipt Invoice"
                subtitle={
                    shareReceived
                        ? `Invoice ${shareReceived.invoice_no || shareReceived.invoice_id}`
                        : undefined
                }
                recipientLabel={
                    shareReceived?.payment_from?.details?.name
                        ? `To ${shareReceived.payment_from.details.name}`
                        : undefined
                }
                defaultMobile={
                    shareReceived?.payment_from?.details?.mobile ||
                    shareReceived?.payment_from?.mobile ||
                    ''
                }
                defaultEmail={
                    shareReceived?.payment_from?.details?.email ||
                    shareReceived?.payment_from?.email ||
                    ''
                }
                defaultCountryCode={
                    shareReceived?.payment_from?.details?.country_code ||
                    shareReceived?.payment_from?.country_code ||
                    '91'
                }
                onSend={handleShareReceivedSend}
            />

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

            {/* Inline Export Modal */}
            <InlineExportModal
                isOpen={exportModalOpen}
                onClose={() => { setExportModalOpen(false); setExportData([]); setExportColumns([]); }}
                exportData={exportData}
                columns={exportColumns}
                jobType="received_report"
            />

            {/* Export Confirmation Modal (for other exports) */}
            <AnimatePresence>
                {exportModal.open && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 10 }}
                            className="bg-white rounded-xl p-6 max-w-sm w-full mx-auto shadow-xl"
                        >
                            <div className="text-center">
                                <div className="w-16 h-16 bg-gradient-to-r from-blue-100 to-blue-200 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <PiExportBold className="w-8 h-8 text-blue-600" />
                                </div>
                                <h3 className="text-lg font-bold text-slate-800 mb-2">
                                    Exporting {exportModal.type.toUpperCase()}
                                </h3>
                                <p className="text-slate-600 mb-6 text-sm">
                                    Your {exportModal.type} export is being processed...
                                </p>
                                <div className="flex justify-center space-x-2 mb-6">
                                    <div className="w-2 h-2 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full animate-bounce"></div>
                                    <div className="w-2 h-2 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                                    <div className="w-2 h-2 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                </div>
                                <div className="text-xs text-slate-500">
                                    This will only take a moment...
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ViewReceived;