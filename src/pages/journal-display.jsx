import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
    FiPlus,
    FiEdit,
    FiFileText,
    FiMoreVertical,
    FiChevronDown,
    FiPrinter,
    FiX,
    FiCheckCircle,
    FiAlertCircle,
    FiInfo,
    FiEye,
    FiLock,
    FiSearch,
    FiDownload,
} from 'react-icons/fi';
import { PiExportBold } from "react-icons/pi";
import { PiFilePdfDuotone, PiMicrosoftExcelLogoDuotone } from "react-icons/pi";
import { AiOutlineMail } from "react-icons/ai";
import { TransactionModalManager } from '../components/Modals/CreateTransactions';
import { EditTransactionModalManager } from '../components/Modals/EditTransactions';
import { DateRangePickerField } from '../components/PortalDatePicker';
import TablePagination from '../components/TablePagination';
import { motion, AnimatePresence } from 'framer-motion';
import { Header, Sidebar } from '../components/header';
import API_BASE_URL from '../utils/api-controller';
import getHeaders from '../utils/get-headers';
import { generateAndDownloadInvoice } from '../utils/invoice-download';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useUserPermissions } from '../utils/permission-helper';

const formatDisplayDate = (dateString) => {
    if (!dateString) return '—';
    const raw = String(dateString).trim();
    if (/^\d{2}\/\d{2}\/\d{4}/.test(raw)) return raw.slice(0, 10);
    const iso = raw.slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
        const [year, month, day] = iso.split('-');
        return `${day}/${month}/${year}`;
    }
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return '—';
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
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

const DetailRow = ({ label, children }) => (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 py-2.5 last:border-0">
        <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</span>
        <span className="min-w-0 text-right text-sm text-slate-800">{children}</span>
    </div>
);

const JournalEntryModalShell = ({ isOpen, onClose, title, subtitle, icon: Icon, footer, children }) => {
    return createPortal(
        <AnimatePresence>
            {isOpen ? (
                <motion.div
                    key="journal-entry-modal"
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
                        aria-labelledby="journal-entry-modal-title"
                        className="relative z-[1] pointer-events-auto flex w-full max-w-lg my-2 sm:my-4 max-h-[calc(100vh-1.5rem)] sm:max-h-[calc(100vh-2rem)] flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="shrink-0 flex items-center justify-between gap-3 border-b border-blue-500/25 bg-gradient-to-r from-blue-600 via-blue-600 to-indigo-600 px-5 py-3.5 text-white">
                            <div className="flex min-w-0 items-center gap-3">
                                {Icon ? (
                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/20">
                                        <Icon className="h-4 w-4" aria-hidden />
                                    </div>
                                ) : null}
                                <div className="min-w-0">
                                    <h2 id="journal-entry-modal-title" className="truncate text-sm font-semibold tracking-tight">
                                        {title}
                                    </h2>
                                    {subtitle ? (
                                        <p className="mt-0.5 truncate text-[11px] text-blue-100/90">{subtitle}</p>
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

const getJournalPartyLabel = (party, getTypeLabel) => {
    if (!party) return '—';
    const d = party.details || {};
    if (party.type === 'bank') {
        const isCash = String(d.type || '').toLowerCase() === 'cash';
        if (isCash) return d.holder || 'Cash';
        return d.bank || d.holder || d.name || 'Bank account';
    }
    if (party.type === 'capital') {
        return d.name || d.capital_name || 'Capital account';
    }
    return d.name || d.username || getTypeLabel(party.type);
};

const getJournalPartyTypeKey = (party) => {
    if (!party?.type) return '';
    if (party.type === 'bank' && String(party.details?.type || '').toLowerCase() === 'cash') return 'cash';
    return party.type;
};

const getJournalPartyDetailLines = (party) => {
    if (!party?.details) return [];
    const d = party.details;
    if (party.type === 'bank') {
        if (String(d.type || '').toLowerCase() === 'cash') return [];
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
    if (d.email) return [d.email];
    if (d.mobile) return [d.mobile];
    return [];
};

const JournalPartyCell = ({ party, fallbackName, fallbackType, getAccountTypeColor, getTypeLabel }) => {
    const d = party?.details || {};
    const partyType = party?.type || fallbackType || '';
    const isBank = partyType === 'bank';
    const isCash = isBank && String(d.type || '').toLowerCase() === 'cash';
    const title = isBank
        ? (isCash ? (d.holder || 'Cash') : (d.bank || d.holder || fallbackName || 'Bank account'))
        : (fallbackName || d.name || getTypeLabel?.(partyType) || '—');
    const badgeType = isCash ? 'cash' : partyType;

    return (
        <div className="px-2">
            <div className="text-slate-800 font-semibold text-xs truncate" title={title}>{title}</div>
            {badgeType ? (
                <div className="mt-1 flex items-center justify-center gap-1">
                    <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-medium capitalize whitespace-nowrap ${getAccountTypeColor(badgeType)}`}>
                        {badgeType}
                    </span>
                </div>
            ) : null}
        </div>
    );
};

const JournalEntryDetailsModal = ({
    isOpen,
    journal,
    onClose,
    formatCurrency,
    getTypeLabel,
    getAccountTypeColor,
    onEdit,
    canEdit = true,
}) => {
    const fromLabel = getJournalPartyLabel(journal?.payment_from, getTypeLabel);
    const toLabel = getJournalPartyLabel(journal?.payment_to, getTypeLabel);
    const fromLines = getJournalPartyDetailLines(journal?.payment_from);
    const toLines = getJournalPartyDetailLines(journal?.payment_to);
    const fromTypeKey = getJournalPartyTypeKey(journal?.payment_from);
    const toTypeKey = getJournalPartyTypeKey(journal?.payment_to);

    return (
        <JournalEntryModalShell
            isOpen={isOpen}
            onClose={onClose}
            icon={FiEye}
            title={journal?.invoice_no || 'Journal entry'}
            subtitle="Journal entry details"
            footer={(
                <div className={MODAL_FOOTER_CLASS}>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
                    >
                        Close
                    </button>
                    {typeof onEdit === 'function' ? (
                        <button
                            type="button"
                            onClick={() => {
                                if (!canEdit) {
                                    toast.error('Need Access Permission');
                                    return;
                                }
                                onEdit(journal);
                            }}
                            disabled={!canEdit}
                            className={`inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-medium text-white hover:bg-blue-700 ${
                                !canEdit ? 'cursor-not-allowed opacity-60 hover:bg-blue-600' : ''
                            }`}
                        >
                            {!canEdit ? <FiLock className="h-3.5 w-3.5" /> : <FiEdit className="h-3.5 w-3.5" />}
                            Edit Journal
                        </button>
                    ) : null}
                </div>
            )}
        >
            <div className={MODAL_BODY_CLASS}>
                {!journal ? (
                    <p className="py-8 text-center text-sm text-slate-500">No journal data available.</p>
                ) : (
                    <div className="space-y-4">
                        <div className="rounded-xl border border-blue-200/80 bg-gradient-to-br from-blue-50 to-white p-4 shadow-sm">
                            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                                <span className="inline-flex rounded-full bg-blue-100 px-2.5 py-0.5 text-[11px] font-semibold text-blue-700">
                                    Journal
                                </span>
                                <span className="text-lg font-bold tabular-nums text-blue-700">
                                    ₹{formatCurrency(journal.amount)}
                                </span>
                            </div>
                            <DetailRow label="Voucher no.">{journal.invoice_no || '—'}</DetailRow>
                            <DetailRow label="Date">{formatDisplayDate(journal.transaction_date)}</DetailRow>
                            <DetailRow label="Remark">
                                <span className="block max-w-[14rem] whitespace-pre-wrap break-words text-right">
                                    {journal.remark || '—'}
                                </span>
                            </DetailRow>
                        </div>

                        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
                            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                                Payment from
                            </p>
                            <DetailRow label="Party type">
                                {fromTypeKey ? (
                                    <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${getAccountTypeColor(fromTypeKey)}`}>
                                        {fromTypeKey}
                                    </span>
                                ) : '—'}
                            </DetailRow>
                            <DetailRow label="Account">
                                <span>
                                    {fromLabel}
                                    {fromLines.length > 0 ? (
                                        <span className="mt-0.5 block text-xs font-normal text-slate-500">
                                            {fromLines.join(' · ')}
                                        </span>
                                    ) : null}
                                </span>
                            </DetailRow>
                        </div>

                        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
                            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                                Payment to
                            </p>
                            <DetailRow label="Party type">
                                {toTypeKey ? (
                                    <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${getAccountTypeColor(toTypeKey)}`}>
                                        {toTypeKey}
                                    </span>
                                ) : '—'}
                            </DetailRow>
                            <DetailRow label="Account">
                                <span>
                                    {toLabel}
                                    {toLines.length > 0 ? (
                                        <span className="mt-0.5 block text-xs font-normal text-slate-500">
                                            {toLines.join(' · ')}
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
                                    {formatDateTime(journal.create_date)}
                                    {journal.create_by?.name ? (
                                        <span className="mt-0.5 block text-xs font-normal text-slate-500">
                                            by {journal.create_by.name}
                                        </span>
                                    ) : null}
                                </span>
                            </DetailRow>
                            <DetailRow label="Last modified">
                                <span>
                                    {formatDateTime(journal.modify_date)}
                                    {journal.modify_by?.name ? (
                                        <span className="mt-0.5 block text-xs font-normal text-slate-500">
                                            by {journal.modify_by.name}
                                        </span>
                                    ) : null}
                                </span>
                            </DetailRow>
                        </div>
                    </div>
                )}
            </div>
        </JournalEntryModalShell>
    );
};

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
                                className={`w-full flex items-center justify-between p-4 rounded-lg border-2 transition-all ${exporting && selectedFormat === option.type
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

const ViewJournal = () => {
    const { check } = useUserPermissions();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(() => {
        const saved = localStorage.getItem('sidebarMinimized');
        return saved ? JSON.parse(saved) : false;
    });
    const [loading, setLoading] = useState(false);
    const [journals, setJournals] = useState([]);
    const [journalFormModal, setJournalEntryModal] = useState(false);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [editRecord, setEditRecord] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

    // State for dropdown menus
    const [showAddDropdown, setShowAddDropdown] = useState(false);
    const [showActionMenu, setShowActionMenu] = useState(null);
    const [actionMenuPosition, setActionMenuPosition] = useState(null);
    const actionAnchorRef = useRef(null);
    const [detailsOpen, setDetailsOpen] = useState(false);
    const [detailsJournal, setDetailsJournal] = useState(null);
    const [downloadingInvoice, setDownloadingInvoice] = useState(false);
    const [exportModal, setExportModal] = useState({ open: false, type: '', data: null });

    // Export Modal State
    const [exportModalOpen, setExportModalOpen] = useState(false);
    const [exportData, setExportData] = useState([]);
    const [exportColumns, setExportColumns] = useState([]);

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [totalItems, setTotalItems] = useState(0);
    const [isLastPage, setIsLastPage] = useState(false);

    // Date state
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');

    // Debounce search term
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchTerm(searchTerm);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    useEffect(() => {
        setCurrentPage(1);
    }, [debouncedSearchTerm, fromDate, toDate]);

    // Fetch data when dependencies change
    useEffect(() => {
        if (fromDate && toDate) {
            fetchJournalData();
        }
    }, [currentPage, debouncedSearchTerm, fromDate, toDate]);

    // Prepare data for export
    const prepareExportData = () => {
        const exportDataList = [];
        const exportColumnsConfig = [];

        const columns = [
            { header: 'Sl No', key: 'sl_no', width: 10 },
            { header: 'Date', key: 'date', width: 15 },
            { header: 'Voucher No', key: 'voucher_no', width: 20 },
            { header: 'Payment From', key: 'from', width: 25 },
            { header: 'Payment To', key: 'to', width: 25 },
            { header: 'Amount (₹)', key: 'amount', width: 18 },
        ];

        exportColumnsConfig.push(...columns);

        journals.forEach((journal, index) => {
            const row = {
                sl_no: ((currentPage - 1) * itemsPerPage) + index + 1,
                date: formatDisplayDate(journal.date) || 'N/A',
                voucher_no: journal.invoice_no || 'N/A',
                from: journal.from || 'N/A',
                to: journal.to || 'N/A',
                amount: journal.amount || 0,
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

    // Handle other exports (print)
    const handleOtherExport = (type, data = null) => {
        setExportModal({ open: true, type, data });

        setTimeout(() => {
            setExportModal({ open: false, type: '', data: null });
            toast.success(`${type.toUpperCase()} export completed successfully!`);
        }, 1500);
    };

    const handleJournalSuccess = (type) => {
        if (type === 'JOURNAL') {
            fetchJournalData();
        }
    };

    const openEditModal = (journal) => {
        setEditRecord(journal?.raw_data || journal);
        setEditModalOpen(true);
        setShowActionMenu(null);
        actionAnchorRef.current = null;
        setActionMenuPosition(null);
        setDetailsOpen(false);
        setDetailsJournal(null);
    };

    const closeEditModal = () => {
        setEditModalOpen(false);
        setEditRecord(null);
    };

    const handleEditSuccess = () => {
        closeEditModal();
        handleJournalSuccess('JOURNAL');
    };

    // Format currency
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(parseFloat(amount));
    };

    // API call to fetch journal data
    const fetchJournalData = async () => {
        setLoading(true);

        try {
            const headers = await getHeaders();
            const url = `${API_BASE_URL}/transaction/report/journal`;

            const params = {
                page_no: currentPage,
                limit: itemsPerPage,
                from_date: fromDate,
                to_date: toDate
            };

            if (debouncedSearchTerm.trim()) {
                params.search = debouncedSearchTerm.trim();
            }

            const response = await axios.get(url, {
                headers,
                params
            });

            if (response.data.success) {
                const journalData = transformApiData(response.data.data);
                setJournals(journalData);
                setTotalItems(response.data.meta.total);
                setIsLastPage(response.data.meta.is_last_page);
            }
        } catch (error) {
            console.error('Error fetching journal data:', error);
            toast.error('Failed to fetch journal entries. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Transform API response to match the component's expected format
    const transformApiData = (apiData) => {
        return apiData.map((item) => ({
            journal_id: item.transaction_id,
            invoice_id: item.invoice_id,
            date: item.transaction_date,
            from: getJournalPartyLabel(item.payment_from, getTypeLabel),
            from_type: item.payment_from?.type || '',
            to: getJournalPartyLabel(item.payment_to, getTypeLabel),
            to_type: item.payment_to?.type || '',
            invoice_no: item.invoice_no,
            amount: parseFloat(item.amount),
            remark: item.remark || '',
            raw_data: item
        }));
    };

    // Helper function to get type label when details are not available
    const getTypeLabel = (type) => {
        const typeLabels = {
            'client': 'Client Account',
            'vendor': 'Vendor Account',
            'cash': 'Cash Account',
            'bank': 'Bank Account',
            'capital': 'Capital Account',
            'asset': 'Asset Account',
            'expense': 'Expense Account',
            'income': 'Income Account',
            'sales': 'Sales Account',
            'business': 'Business Account',
            'loan': 'Loan Account'
        };
        return typeLabels[type] || type || 'Unknown Account';
    };

    // Format date for API (YYYY-MM-DD)
    const formatDateForAPI = (date) => {
        return date.toLocaleDateString('en-CA');
    };

    // Handle search input change
    const handleSearchChange = (e) => {
        setSearchTerm(e.target.value);
    };

    // Initialize with current month date range (1st through last day of month)
    useEffect(() => {
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);

        setFromDate(formatDateForAPI(firstDay));
        setToDate(formatDateForAPI(lastDay));
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

    const handleViewInvoice = async (journal) => {
        const record = journal?.raw_data || journal;
        const invoiceId = record?.invoice_id || journal?.invoice_id;

        if (!invoiceId) {
            toast.error('Invoice ID not available for this entry');
            return;
        }

        setShowActionMenu(null);
        actionAnchorRef.current = null;
        setActionMenuPosition(null);
        setDownloadingInvoice(true);

        const toastId = toast.loading('Generating invoice…');
        try {
            const headers = getHeaders();
            if (!headers) {
                toast.error('Please log in again to download the invoice', { id: toastId });
                return;
            }

            await generateAndDownloadInvoice({
                invoiceId,
                type: 'journal',
                filename: `invoice-${record?.invoice_no || journal?.invoice_no || invoiceId}.pdf`,
                headers,
            });

            toast.success('Invoice downloaded', { id: toastId });
        } catch (error) {
            console.error('Invoice download error:', error);
            const message = error.response?.data?.message || error.message || 'Failed to download invoice';
            toast.error(message, { id: toastId });
        } finally {
            setDownloadingInvoice(false);
        }
    };

    const formatDate = (dateString) => formatDisplayDate(dateString);

    const getJournalActionItemCount = (journal) => (journal?.invoice_id ? 3 : 2);

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
            placement = preferred.reduce(
                (best, p) => (space[p] > space[best] ? p : best),
                'bottom',
            );
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

    const closeActionMenu = useCallback(() => {
        setShowActionMenu(null);
        actionAnchorRef.current = null;
        setActionMenuPosition(null);
    }, []);

    const handleActionClick = useCallback((e, journalId) => {
        e.stopPropagation();
        if (showActionMenu === journalId) {
            closeActionMenu();
            return;
        }
        const journal = journals.find((j) => j.journal_id === journalId);
        actionAnchorRef.current = e.currentTarget;
        setActionMenuPosition(
            computeActionMenuPosition(e.currentTarget, { itemCount: getJournalActionItemCount(journal) })
        );
        setShowActionMenu(journalId);
        setShowAddDropdown(false);
    }, [showActionMenu, computeActionMenuPosition, closeActionMenu, journals]);

    const activeJournal = useMemo(
        () => journals.find((j) => j.journal_id === showActionMenu) || null,
        [journals, showActionMenu]
    );

    const activeJournalHasInvoice = Boolean(activeJournal?.invoice_id);

    const openJournalDetails = (journal) => {
        closeActionMenu();
        setDetailsJournal(journal?.raw_data || journal);
        setDetailsOpen(true);
    };

    const closeJournalDetails = () => {
        setDetailsOpen(false);
        setDetailsJournal(null);
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (!event.target.closest('.dropdown-container')) {
                setShowAddDropdown(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    useEffect(() => {
        const handleClickOutside = () => {
            closeActionMenu();
        };

        document.addEventListener('click', handleClickOutside);
        return () => {
            document.removeEventListener('click', handleClickOutside);
        };
    }, [closeActionMenu]);

    useEffect(() => {
        if (!showActionMenu || !actionAnchorRef.current) return undefined;

        const updatePosition = () => {
            setActionMenuPosition(
                computeActionMenuPosition(actionAnchorRef.current, {
                    itemCount: getJournalActionItemCount(activeJournal),
                })
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
    }, [showActionMenu, activeJournal, computeActionMenuPosition, closeActionMenu]);

    const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
    const handlePageChange = (newPage) => {
        const n = Math.floor(Number(newPage));
        if (!Number.isFinite(n)) return;
        const maxPage = Math.max(1, totalPages);
        setCurrentPage(Math.min(Math.max(1, n), maxPage));
    };

    // Get account type color
    const getAccountTypeColor = (type) => {
        switch (type) {
            case 'cash': return 'bg-yellow-100 text-yellow-700';
            case 'bank': return 'bg-blue-100 text-blue-700';
            case 'asset': return 'bg-purple-100 text-purple-700';
            case 'client': return 'bg-green-100 text-green-700';
            case 'vendor': return 'bg-orange-100 text-orange-700';
            case 'capital': return 'bg-indigo-100 text-indigo-700';
            case 'sales': return 'bg-teal-100 text-teal-700';
            case 'income': return 'bg-emerald-100 text-emerald-700';
            case 'expense': return 'bg-red-100 text-red-700';
            case 'business': return 'bg-sky-100 text-sky-700';
            case 'loan': return 'bg-gray-100 text-gray-700';
            default: return 'bg-slate-100 text-slate-700';
        }
    };

    // Skeleton loader component
    const SkeletonRow = () => (
        <tr className="border-b border-slate-100 animate-pulse">
            <td className="p-3 text-center"><div className="h-4 bg-slate-200 rounded w-6 mx-auto"></div></td>
            <td className="p-3 text-center"><div className="h-4 bg-slate-200 rounded w-16 mx-auto"></div></td>
            <td className="p-3 text-center"><div className="h-4 bg-slate-200 rounded w-16 mx-auto"></div></td>
            <td className="p-3 text-center"><div className="h-4 bg-slate-200 rounded w-24 mx-auto"></div></td>
            <td className="p-3 text-center"><div className="h-4 bg-slate-200 rounded w-24 mx-auto"></div></td>
            <td className="p-3 text-center"><div className="h-6 bg-slate-200 rounded w-16 mx-auto"></div></td>
            <td className="p-3 text-center"><div className="h-6 bg-slate-200 rounded w-10 mx-auto"></div></td>
        </tr>
    );

    // Skeleton Loading Component for full page
    const SkeletonLoader = () => (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
            <Header mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} isMinimized={isMinimized} setIsMinimized={setIsMinimized} />
            <Sidebar mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} isMinimized={isMinimized} setIsMinimized={setIsMinimized} />
            <div className={`pt-16 transition-all duration-300 ease-in-out ${isMinimized ? 'md:pl-20' : 'md:pl-[260px]'}`}>
                <div className="h-full flex flex-col mx-2 sm:mx-4 md:mx-8 my-3 md:my-4">
                    <div className="overflow-hidden rounded-lg border border-slate-200/80 bg-white/70">
                        <div className="border-b border-slate-200 px-6 py-4">
                            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                                <div><div className="h-6 bg-gray-200 rounded w-48 mb-2"></div><div className="h-4 bg-gray-200 rounded w-32"></div></div>
                                <div className="flex gap-3"><div className="h-10 bg-gray-200 rounded w-40"></div><div className="h-10 bg-gray-200 rounded w-32"></div></div>
                            </div>
                        </div>
                        <div className="overflow-hidden">
                            <div className="border-b border-slate-200">
                                <table className="w-full text-sm">
                                    <thead className="bg-gradient-to-r from-slate-50 to-slate-100">
                                        <tr>{[...Array(7)].map((_, i) => (<th key={i} className="text-center p-3"><div className="h-4 bg-gray-200 rounded w-20 mx-auto"></div></th>))}</tr>
                                    </thead>
                                </table>
                            </div>
                            <div className="p-4">{[...Array(6)].map((_, index) => (<div key={index} className="mb-4"><div className="h-12 bg-gray-100 rounded"></div></div>))}</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

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
                <div className="h-full flex flex-col mx-2 sm:mx-4 md:mx-8 my-3 md:my-4">
                    <motion.div
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.25 }}
                        className="overflow-hidden rounded-lg border border-slate-200/80 bg-white/70"
                    >
                        <div className="sticky top-0 z-10 border-b border-slate-200 bg-gradient-to-r from-slate-100/90 via-white to-indigo-50/40 py-2.5 pl-3 pr-0 sm:pl-4 sm:pr-0">
                            <div className="flex w-full min-w-0 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
                                <div className="flex min-w-0 w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-3 sm:gap-y-2 lg:min-w-0 lg:flex-1 lg:flex-nowrap lg:items-center lg:gap-x-4">
                                    <h5 className="shrink-0 text-sm font-bold tracking-tight text-slate-800 sm:text-base mr-4 sm:mr-6 lg:mr-8">
                                        Journal Register
                                    </h5>
                                    <div className="relative w-full min-w-0 flex-1 sm:min-w-[18rem] lg:min-w-[22rem] xl:min-w-[28rem]">
                                        <FiSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                        <input
                                            type="text"
                                            placeholder="Search…"
                                            value={searchTerm}
                                            onChange={handleSearchChange}
                                            className="h-9 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                    <div className="w-full min-w-0 max-w-full shrink-0 overflow-x-auto sm:min-w-[10rem] sm:max-w-[14rem] sm:overflow-x-auto lg:max-w-[14rem] xl:max-w-[16rem]">
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
                                            buttonClassName="w-full min-w-0 px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-600 hover:border-indigo-400 focus:outline-none transition-all"
                                            wrapperClassName="w-full min-w-0"
                                        />
                                    </div>
                                </div>
                                <div className="flex w-full shrink-0 items-center justify-end gap-2 sm:w-auto lg:pl-1">
                                    <div className="dropdown-container relative shrink-0">
                                        <motion.button
                                            type="button"
                                            onClick={() => setShowAddDropdown(!showAddDropdown)}
                                            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 px-2.5 text-xs font-semibold text-white shadow-sm transition-all duration-200 hover:from-blue-700 hover:to-blue-800 hover:shadow sm:h-10 sm:px-3"
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                        >
                                            <PiExportBold className="h-4 w-4 shrink-0" />
                                            <span className="whitespace-nowrap">Export</span>
                                            <FiChevronDown className={`h-3.5 w-3.5 shrink-0 opacity-90 transition-transform ${showAddDropdown ? 'rotate-180' : ''}`} />
                                        </motion.button>
                                        <AnimatePresence>
                                            {showAddDropdown && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: 5 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, y: 5 }}
                                                    className="absolute right-0 z-50 mt-1 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"
                                                >
                                                    <div className="py-1">
                                                        <button
                                                            type="button"
                                                            onClick={handleExportClick}
                                                            className="flex w-full items-center px-3 py-2 text-sm text-slate-700 transition-all duration-150 hover:bg-blue-50 group"
                                                        >
                                                            <div className="mr-2 rounded bg-red-50 p-1.5 group-hover:bg-red-100 transition-colors">
                                                                <PiFilePdfDuotone className="w-3.5 h-3.5 text-red-500" />
                                                            </div>
                                                            <div className="text-left">
                                                                <div className="text-xs font-medium">Export as PDF</div>
                                                            </div>
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={handleExportClick}
                                                            className="flex w-full items-center px-3 py-2 text-sm text-slate-700 transition-all duration-150 hover:bg-blue-50 group"
                                                        >
                                                            <div className="mr-2 rounded bg-green-50 p-1.5 group-hover:bg-green-100 transition-colors">
                                                                <PiMicrosoftExcelLogoDuotone className="w-3.5 h-3.5 text-green-500" />
                                                            </div>
                                                            <div className="text-left">
                                                                <div className="text-xs font-medium">Export as Excel</div>
                                                            </div>
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleOtherExport('print')}
                                                            className="flex w-full items-center px-3 py-2 text-sm text-slate-700 transition-all duration-150 hover:bg-blue-50 group"
                                                        >
                                                            <div className="mr-2 rounded bg-slate-50 p-1.5 group-hover:bg-slate-100 transition-colors">
                                                                <FiPrinter className="w-3.5 h-3.5 text-slate-600" />
                                                            </div>
                                                            <div className="text-left">
                                                                <div className="text-xs font-medium">Print Report</div>
                                                            </div>
                                                        </button>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                    <motion.button
                                        type="button"
                                        onClick={() => setJournalEntryModal(true)}
                                        className="mr-2 inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-emerald-700 px-2.5 text-xs font-semibold text-white shadow-sm transition-all duration-200 hover:from-emerald-700 hover:to-emerald-800 hover:shadow sm:mr-3 sm:h-10 sm:px-3"
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        <FiPlus className="h-4 w-4 shrink-0" />
                                        <span className="whitespace-nowrap">Create</span>
                                    </motion.button>
                                </div>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="border-b border-slate-200 bg-slate-100/90">
                                        <th className="min-w-[50px] p-3 text-center text-[10px] font-semibold uppercase tracking-wider text-slate-700">#</th>
                                        <th className="min-w-[80px] p-3 text-center text-[10px] font-semibold uppercase tracking-wider text-slate-700">Date</th>
                                        <th className="min-w-[110px] p-3 text-center text-[10px] font-semibold uppercase tracking-wider text-slate-700">Voucher No</th>
                                        <th className="min-w-[180px] p-3 text-center text-[10px] font-semibold uppercase tracking-wider text-slate-700">Payment From</th>
                                        <th className="min-w-[180px] p-3 text-center text-[10px] font-semibold uppercase tracking-wider text-slate-700">Payment To</th>
                                        <th className="min-w-[100px] p-3 text-center text-[10px] font-semibold uppercase tracking-wider text-slate-700">Amount</th>
                                        <th className="min-w-[70px] p-3 text-center text-[10px] font-semibold uppercase tracking-wider text-slate-700">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-slate-100">
                                    {loading ? (
                                        [...Array(5)].map((_, idx) => <SkeletonRow key={idx} />)
                                    ) : journals.length === 0 ? (
                                        <tr>
                                            <td colSpan="7" className="text-center py-8 text-slate-500">
                                                <div className="flex flex-col items-center justify-center">
                                                    <div className="p-3 bg-slate-100 rounded-full mb-3">
                                                        <FiFileText className="w-8 h-8 text-slate-400" />
                                                    </div>
                                                    <p className="text-slate-600 text-sm font-medium mb-1">No journal entries found</p>
                                                    <p className="text-slate-500 text-xs">
                                                        {searchTerm ? 'Try adjusting your search or date filter' : 'Start by creating your first journal entry'}
                                                    </p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        journals.map((journal, index) => {
                                            const serialNumber = (currentPage - 1) * itemsPerPage + index + 1;

                                            return (
                                                <motion.tr
                                                    key={journal.journal_id}
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    transition={{ duration: 0.15 }}
                                                    className={`${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'} transition-colors duration-150 hover:bg-indigo-50/40`}
                                                >
                                                    <td className="text-center p-3 align-middle"><div className="text-slate-700 font-medium text-xs">{serialNumber}</div></td>
                                                    <td className="text-center p-3 align-middle"><div className="font-medium text-slate-700 text-xs">{formatDate(journal.date)}</div></td>
                                                    <td className="text-center p-3 align-middle"><span className="inline-flex items-center justify-center bg-gradient-to-r from-slate-100 to-slate-200 text-slate-800 font-bold px-3 py-1.5 rounded text-xs border border-slate-300/50">{journal.invoice_no}</span></td>
                                                    <td className="text-center p-3 align-middle">
                                                        <JournalPartyCell
                                                            party={journal.raw_data?.payment_from}
                                                            fallbackName={journal.from}
                                                            fallbackType={journal.from_type}
                                                            getAccountTypeColor={getAccountTypeColor}
                                                            getTypeLabel={getTypeLabel}
                                                        />
                                                    </td>
                                                    <td className="text-center p-3 align-middle">
                                                        <JournalPartyCell
                                                            party={journal.raw_data?.payment_to}
                                                            fallbackName={journal.to}
                                                            fallbackType={journal.to_type}
                                                            getAccountTypeColor={getAccountTypeColor}
                                                            getTypeLabel={getTypeLabel}
                                                        />
                                                    </td>
                                                    <td className="text-center p-3 align-middle">
                                                        <button
                                                            type="button"
                                                            onClick={() => openJournalDetails(journal)}
                                                            className="inline-flex min-w-[90px] items-center justify-center rounded bg-gradient-to-r from-green-50 to-green-100 px-3 py-1.5 text-xs font-bold text-green-800 shadow-xs transition-all hover:shadow"
                                                        >
                                                            ₹{formatCurrency(journal.amount)}
                                                        </button>
                                                    </td>
                                                    <td className="text-center p-3 align-middle">
                                                        <div className="flex justify-center">
                                                            <button
                                                                type="button"
                                                                aria-label="Actions"
                                                                className="p-1.5 text-slate-500 hover:text-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors duration-150 border border-slate-200 hover:border-indigo-300"
                                                                onClick={(e) => handleActionClick(e, journal.journal_id)}
                                                            >
                                                                <FiMoreVertical className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </motion.tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {!loading && (journals.length > 0 || totalItems > 0) && totalPages > 0 && (
                            <TablePagination
                                page={currentPage}
                                limit={itemsPerPage}
                                total={totalItems}
                                totalPages={totalPages}
                                isLastPage={isLastPage}
                                rowOptions={[5, 10, 20, 50, 100]}
                                defaultRows={10}
                                onPageChange={handlePageChange}
                                onLimitChange={setItemsPerPage}
                            />
                        )}
                    </motion.div>
                </div>
            </div>

            {showActionMenu && activeJournal && actionMenuPosition && createPortal(
                <motion.div
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    className="fixed w-44 bg-white rounded-lg shadow-xl border border-slate-200 py-1 z-[99999] overflow-hidden"
                    style={{
                        top: actionMenuPosition.top,
                        left: actionMenuPosition.left,
                        height: 'auto',
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <span
                        className="absolute w-2.5 h-2.5 bg-white border-slate-200 rotate-45"
                        style={{
                            left:
                                actionMenuPosition.placement === 'left' ||
                                actionMenuPosition.placement === 'right'
                                    ? undefined
                                    : `${actionMenuPosition.arrowX - 5}px`,
                            top:
                                actionMenuPosition.placement === 'bottom'
                                    ? '-5px'
                                    : actionMenuPosition.placement === 'top'
                                        ? undefined
                                        : `${actionMenuPosition.arrowY - 5}px`,
                            bottom: actionMenuPosition.placement === 'top' ? '-5px' : undefined,
                            right: actionMenuPosition.placement === 'left' ? '-5px' : undefined,
                            borderTopWidth: actionMenuPosition.placement === 'bottom' ? '1px' : '0',
                            borderLeftWidth: actionMenuPosition.placement === 'bottom' ? '1px' : '0',
                            borderBottomWidth: actionMenuPosition.placement === 'top' ? '1px' : '0',
                            borderRightWidth:
                                actionMenuPosition.placement === 'left'
                                    ? '1px'
                                    : actionMenuPosition.placement === 'right'
                                        ? '1px'
                                        : '0',
                        }}
                    />
                    <button
                        type="button"
                        onClick={() => openJournalDetails(activeJournal)}
                        className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-indigo-50 flex items-center gap-2 transition-colors"
                    >
                        <FiEye className="w-4 h-4 text-indigo-600" />
                        Details
                    </button>
                    <button
                        type="button"
                        className={`w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-blue-50 flex items-center gap-2 transition-colors ${
                            !check('finance_entry_edit') ? 'cursor-not-allowed opacity-60 hover:bg-transparent' : ''
                        }`}
                        onClick={() => {
                            if (!check('finance_entry_edit')) {
                                toast.error('Need Access Permission');
                                return;
                            }
                            openEditModal(activeJournal);
                        }}
                    >
                        {!check('finance_entry_edit') ? (
                            <FiLock className="w-4 h-4 text-slate-400" />
                        ) : (
                            <FiEdit className="w-4 h-4 text-blue-600" />
                        )}
                        Edit
                    </button>
                    {activeJournalHasInvoice ? (
                        <button
                            type="button"
                            disabled={downloadingInvoice}
                            onClick={() => handleViewInvoice(activeJournal)}
                            className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-green-50 flex items-center gap-2 transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            <FiDownload className="w-4 h-4 text-green-600" />
                            {downloadingInvoice ? 'Downloading…' : 'Download'}
                        </button>
                    ) : null}
                </motion.div>,
                document.body
            )}

            {/* Modals */}
            <JournalEntryDetailsModal
                isOpen={detailsOpen}
                journal={detailsJournal}
                onClose={closeJournalDetails}
                formatCurrency={formatCurrency}
                getTypeLabel={getTypeLabel}
                getAccountTypeColor={getAccountTypeColor}
                canEdit={check('finance_entry_edit')}
                onEdit={openEditModal}
            />

            <TransactionModalManager
                modalType="JOURNAL"
                isOpen={journalFormModal}
                onClose={() => setJournalEntryModal(false)}
                onSubmit={handleJournalSuccess}
                formatCurrency={formatCurrency}
                summary={{ totalCredit: 0, totalDebit: 0 }}
                showSummary={true}
                showFromClient={true}
                showToClient={true}
            />

            <EditTransactionModalManager
                modalType="JOURNAL"
                isOpen={editModalOpen}
                onClose={closeEditModal}
                editRecord={editRecord}
                onSubmit={handleEditSuccess}
                formatCurrency={formatCurrency}
                summary={{ totalCredit: 0, totalDebit: 0 }}
                showSummary={true}
            />

            {/* Inline Export Modal */}
            <InlineExportModal
                isOpen={exportModalOpen}
                onClose={() => { setExportModalOpen(false); setExportData([]); setExportColumns([]); }}
                exportData={exportData}
                columns={exportColumns}
                jobType="journal_report"
            />

            {/* Export Confirmation Modal */}
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

export default ViewJournal;