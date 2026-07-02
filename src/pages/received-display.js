import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
    FiSearch,
    FiPlus,
    FiEdit,
    FiFileText,
    FiMenu,
    FiEye,
    FiChevronRight,
    FiCreditCard,
    FiX,
    FiCheckCircle,
    FiAlertCircle,
    FiInfo,
    FiLock
} from 'react-icons/fi';
import { PiExportBold } from "react-icons/pi";
import { PiFilePdfDuotone, PiMicrosoftExcelLogoDuotone } from "react-icons/pi";
import { AiOutlineMail } from "react-icons/ai";
import { FaWhatsapp } from "react-icons/fa6";
import { TbCurrencyRupee } from 'react-icons/tb';
import { motion, AnimatePresence } from 'framer-motion';
import { Header, Sidebar } from '../components/header';
import EmailSelectionModal from '../components/email-selection';
import MobileSelectionModal from '../components/mobile-selection';
import { TransactionModalManager } from '../components/Modals/CreateTransactions';
import { EditTransactionModalManager } from '../components/Modals/EditTransactions';
import { DateRangePickerField } from '../components/PortalDatePicker';
import TablePagination from '../components/TablePagination';
import API_BASE_URL from "../utils/api-controller";
import getHeaders from "../utils/get-headers";
import toast from 'react-hot-toast';
import { useUserPermissions } from '../utils/permission-helper';

const ACTIONS_MENU_WIDTH = 192;
const ACTIONS_MENU_HEIGHT = 140;

const EMPTY_STATS = { count: 0, amount: 0 };

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
    const [fromDate, setFromDate] = useState(() => {
        const today = new Date();
        return new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    });
    const [toDate, setToDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [received, setReceived] = useState([]);
    const [receivedFormModal, setPaymentReceivedModal] = useState(false);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [editRecord, setEditRecord] = useState(null);
    const [detailsOpen, setDetailsOpen] = useState(false);
    const [detailsRecord, setDetailsRecord] = useState(null);
    const [stats, setStats] = useState(EMPTY_STATS);

    // State for dropdown menus
    const [showAddDropdown, setShowAddDropdown] = useState(false);
    const [activeRowDropdown, setActiveRowDropdown] = useState(null);
    const [dropdownPos, setDropdownPos] = useState({ top: 0, left: undefined, right: 0, bottom: undefined, openUpward: false });
    const actionAnchorRef = useRef(null);
    const dropdownModeRef = useRef('button');
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
        const timer = setTimeout(() => setDebouncedSearchTerm(searchTerm.trim()), 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    useEffect(() => {
        setCurrentPage(1);
    }, [debouncedSearchTerm, fromDate, toDate, itemsPerPage]);

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

    const openDetails = (record) => {
        setDetailsRecord(record);
        setDetailsOpen(true);
        setActiveRowDropdown(null);
        actionAnchorRef.current = null;
    };

    const closeDetails = () => {
        setDetailsOpen(false);
        setDetailsRecord(null);
    };

    const openEditModal = (record) => {
        setEditRecord(record);
        setEditModalOpen(true);
        setActiveRowDropdown(null);
        actionAnchorRef.current = null;
    };

    const closeEditModal = () => {
        setEditModalOpen(false);
        setEditRecord(null);
    };

    const handleEditSuccess = () => {
        closeEditModal();
        handleReceivedSuccess();
    };

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

    // Get edit link and invoice link based on payment_from type
    const getActionLinks = (item) => {
        let editLink = '';
        let invoiceLink = '';
        const partyType = item.payment_from?.type || '';

        switch (partyType) {
            case 'client':
                editLink = `/edit-received-client?redirect=${window.location.href}&invoice_id=${item.invoice_id}`;
                invoiceLink = `/preview-invoice-received?invoice_id=${item.invoice_id}`;
                break;
            case 'ca':
                editLink = `/edit-received-ca?redirect=${window.location.href}&invoice_id=${item.invoice_id}`;
                invoiceLink = `/preview-invoice-received?invoice_id=${item.invoice_id}`;
                break;
            case 'staff':
                editLink = `/edit-received-staff?redirect=${window.location.href}&invoice_id=${item.invoice_id}`;
                invoiceLink = `/preview-invoice-received?invoice_id=${item.invoice_id}`;
                break;
            case 'agent':
                editLink = `/edit-received-agent?redirect=${window.location.href}&invoice_id=${item.invoice_id}`;
                invoiceLink = `/preview-invoice-received?invoice_id=${item.invoice_id}`;
                break;
            case 'capital':
                editLink = `/edit-received-client-capital?redirect=${window.location.href}&payment_id=${item.transaction_id}`;
                break;
            default:
                editLink = '#';
                invoiceLink = '#';
        }

        return { editLink, invoiceLink };
    };

    const updateDropdownPosition = useCallback((anchorEl) => {
        if (!anchorEl) return;
        const rect = anchorEl.getBoundingClientRect();
        const margin = 8;
        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceAbove = rect.top;
        const openUpward = spaceBelow < ACTIONS_MENU_HEIGHT + margin && spaceAbove > spaceBelow;

        let top;
        let bottom;
        if (openUpward) {
            top = undefined;
            bottom = Math.max(margin, window.innerHeight - rect.top + 4);
        } else {
            top = Math.min(rect.bottom + 4, window.innerHeight - ACTIONS_MENU_HEIGHT - margin);
            bottom = undefined;
        }

        const right = Math.max(
            margin,
            Math.min(window.innerWidth - rect.right, window.innerWidth - ACTIONS_MENU_WIDTH - margin)
        );

        setDropdownPos({ top, bottom, right, left: undefined, openUpward });
    }, []);

    const openActionsFromButton = (e, transactionId) => {
        e.stopPropagation();
        if (activeRowDropdown === transactionId) {
            setActiveRowDropdown(null);
            actionAnchorRef.current = null;
            return;
        }
        dropdownModeRef.current = 'button';
        actionAnchorRef.current = e.currentTarget;
        updateDropdownPosition(e.currentTarget);
        setActiveRowDropdown(transactionId);
    };

    const openActionsFromContextMenu = (e, transactionId) => {
        e.preventDefault();
        e.stopPropagation();
        dropdownModeRef.current = 'pointer';
        actionAnchorRef.current = null;
        const margin = 8;
        const left = Math.min(e.clientX, window.innerWidth - ACTIONS_MENU_WIDTH - margin);
        const top = Math.min(e.clientY, window.innerHeight - ACTIONS_MENU_HEIGHT - margin);
        setDropdownPos({
            top: Math.max(margin, top),
            left: Math.max(margin, left),
            right: undefined,
            bottom: undefined,
            openUpward: false,
        });
        setActiveRowDropdown(transactionId);
    };

    const activeReceivedItem = useMemo(
        () => received.find((item) => item.transaction_id === activeRowDropdown) || null,
        [received, activeRowDropdown]
    );

    // Close export dropdown when clicking outside
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
        const handleClickOutside = (event) => {
            if (
                !event.target.closest('[data-received-actions-menu]') &&
                !event.target.closest('[data-received-actions-trigger]')
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
                actionAnchorRef.current = null;
            }
        };

        window.addEventListener('scroll', handleScrollOrResize, true);
        window.addEventListener('resize', handleScrollOrResize);
        return () => {
            window.removeEventListener('scroll', handleScrollOrResize, true);
            window.removeEventListener('resize', handleScrollOrResize);
        };
    }, [activeRowDropdown, updateDropdownPosition]);

    const StatCardSkeleton = () => (
        <div className="animate-pulse rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-2 h-3 w-24 rounded bg-slate-200" />
            <div className="h-6 w-20 rounded bg-slate-200" />
        </div>
    );

    // Skeleton loader component
    const SkeletonRow = () => (
        <tr className="animate-pulse border-b border-slate-100">
            <td className="p-2.5 text-center"><div className="mx-auto h-4 w-6 rounded bg-slate-200" /></td>
            <td className="p-2.5 text-center"><div className="mx-auto h-4 w-16 rounded bg-slate-200" /></td>
            <td className="p-2.5"><div className="mx-auto h-4 w-24 rounded bg-slate-200" /></td>
            <td className="p-2.5 text-center"><div className="mx-auto h-4 w-16 rounded bg-slate-200" /></td>
            <td className="p-2.5 text-center"><div className="mx-auto h-6 w-16 rounded bg-slate-200" /></td>
            <td className="p-2.5"><div className="mx-auto h-4 w-20 rounded bg-slate-200" /></td>
            <td className="p-2.5 text-center"><div className="mx-auto h-8 w-8 rounded bg-slate-200" /></td>
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
                <div className="mx-auto max-w-full px-4 py-6 sm:px-6 lg:px-8">
                    <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {listLoading && received.length === 0 ? (
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
                                    className="rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 p-4 text-white shadow-md"
                                >
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-xs font-medium text-blue-100">Received entries</p>
                                            <h3 className="mt-1 text-lg font-bold tabular-nums">{stats.count}</h3>
                                        </div>
                                        <FiFileText className="h-5 w-5 shrink-0 opacity-80" />
                                    </div>
                                </motion.div>

                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.2, delay: 0.05 }}
                                    className="rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 p-4 text-white shadow-md"
                                >
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-xs font-medium text-emerald-100">Total received</p>
                                            <h3 className="mt-1 text-lg font-bold tabular-nums">₹{formatCurrency(stats.amount)}</h3>
                                        </div>
                                        <TbCurrencyRupee className="h-5 w-5 shrink-0 opacity-80" />
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

                    <motion.div
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg"
                    >
                        <div className="sticky top-0 z-10 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white px-3 py-2.5 sm:px-4">
                            <div className="flex min-w-0 flex-col gap-2 xl:flex-row xl:items-center xl:justify-between xl:gap-3">
                                <div className="flex shrink-0 items-center gap-2">
                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-100">
                                        <FiCreditCard className="h-4 w-4 text-blue-600" />
                                    </div>
                                    <h5 className="shrink-0 text-sm font-bold tracking-tight text-slate-800 sm:text-base">
                                        Received Register
                                    </h5>
                                </div>

                                <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end sm:gap-2">
                                    <div className="relative ml-auto w-full min-w-0 sm:ml-0 sm:w-60">
                                        <FiSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                        <input
                                            type="text"
                                            placeholder="Search invoice, remark…"
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="h-9 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                                            buttonClassName="w-full h-9 min-w-0 px-3 bg-white border border-slate-200 rounded-lg text-sm text-slate-600 hover:border-blue-400 focus:outline-none transition-all"
                                            wrapperClassName="w-full min-w-0"
                                        />
                                    </div>

                                    <div className="dropdown-container relative shrink-0">
                                        <motion.button
                                            type="button"
                                            onClick={() => setShowAddDropdown(!showAddDropdown)}
                                            className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition-all hover:bg-slate-50 sm:h-10 sm:w-auto sm:px-4"
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                        >
                                            <PiExportBold className="h-4 w-4 shrink-0" />
                                            <span>Export</span>
                                            <FiChevronRight className={`h-3.5 w-3.5 shrink-0 transition-transform ${showAddDropdown ? 'rotate-90' : ''}`} />
                                        </motion.button>

                                        <AnimatePresence>
                                            {showAddDropdown && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: 5 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, y: 5 }}
                                                    className="absolute right-0 z-50 mt-1 w-56 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl"
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
                                        className={`inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-emerald-700 px-3 text-sm font-semibold text-white shadow-sm transition-all hover:from-emerald-700 hover:to-emerald-800 sm:h-10 sm:px-4 ${
                                            !check('finance_entry') ? 'cursor-not-allowed opacity-60 hover:from-emerald-600 hover:to-emerald-700' : ''
                                        }`}
                                        whileHover={check('finance_entry') ? { scale: 1.02 } : {}}
                                        whileTap={check('finance_entry') ? { scale: 0.98 } : {}}
                                    >
                                        {!check('finance_entry') ? <FiLock className="h-4 w-4 shrink-0" /> : <FiPlus className="h-4 w-4 shrink-0" />}
                                        <span className="whitespace-nowrap">Add Received</span>
                                    </motion.button>
                                </div>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full table-fixed text-sm">
                                <thead>
                                    <tr className="bg-gradient-to-r from-slate-50 to-slate-100">
                                        <th className="w-[4%] p-2.5 text-center text-xs font-semibold uppercase tracking-wider text-slate-700">#</th>
                                        <th className="w-[10%] p-2.5 text-center text-xs font-semibold uppercase tracking-wider text-slate-700">Date</th>
                                        <th className="w-[26%] p-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-700">Particulars</th>
                                        <th className="w-[12%] p-2.5 text-center text-xs font-semibold uppercase tracking-wider text-slate-700">Voucher</th>
                                        <th className="w-[12%] p-2.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-700">Amount</th>
                                        <th className="w-[20%] p-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-700">Received At</th>
                                        <th className="w-[10%] p-2.5 text-center text-xs font-semibold uppercase tracking-wider text-slate-700">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 bg-white">
                                    {listLoading && received.length === 0 ? (
                                        [...Array(5)].map((_, index) => <SkeletonRow key={index} />)
                                    ) : received.length === 0 ? (
                                        <tr>
                                            <td colSpan="7" className="text-center py-8 text-slate-500">
                                                <div className="flex flex-col items-center justify-center">
                                                    <div className="p-3 bg-slate-100 rounded-full mb-3">
                                                        <FiFileText className="w-8 h-8 text-slate-400" />
                                                    </div>
                                                    <p className="text-slate-600 text-sm font-medium mb-1">No received records found</p>
                                                    <p className="text-slate-500 text-xs mb-4">Start by creating your first received entry</p>
                                                    <motion.button
                                                        onClick={() => {
                                                            if (!check('finance_entry')) {
                                                                toast.error('Need Access Permission');
                                                            } else {
                                                                setPaymentReceivedModal(true);
                                                            }
                                                        }}
                                                        className={`px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg text-xs font-semibold hover:shadow transition-all duration-200 ${
                                                            !check('finance_entry') ? 'opacity-60 cursor-not-allowed hover:from-blue-600 hover:to-blue-700' : ''
                                                        }`}
                                                        whileHover={check('finance_entry') ? { scale: 1.02 } : {}}
                                                        whileTap={check('finance_entry') ? { scale: 0.98 } : {}}
                                                    >
                                                        {!check('finance_entry') ? <FiLock className="w-3.5 h-3.5 mr-1 inline-block shrink-0" /> : null}
                                                        Create Your First Received Entry
                                                    </motion.button>
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
                                                    className="transition-colors duration-150 hover:bg-blue-50/30"
                                                    onContextMenu={(e) => openActionsFromContextMenu(e, item.transaction_id)}
                                                >
                                                    <td className="p-2.5 text-center align-middle">
                                                        <span className="font-medium text-slate-700">
                                                            {(currentPage - 1) * itemsPerPage + index + 1}
                                                        </span>
                                                    </td>
                                                    <td className="p-2.5 text-center align-middle">
                                                        <span className="font-medium text-slate-700">
                                                            {formatDisplayDate(item.transaction_date)}
                                                        </span>
                                                    </td>
                                                    <td className="p-2.5 align-middle">
                                                        <div className="min-w-0">
                                                            <div className="font-semibold text-slate-800">
                                                                {partyInfo.displayName}
                                                            </div>
                                                            <div className="mt-0.5">
                                                                <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${partyInfo.bgColor} ${partyInfo.textColor}`}>
                                                                    {partyInfo.type}
                                                                </span>
                                                            </div>
                                                            {item.remark ? (
                                                                <div className="mt-0.5 truncate text-xs italic text-slate-500" title={item.remark}>
                                                                    {item.remark}
                                                                </div>
                                                            ) : null}
                                                        </div>
                                                    </td>
                                                    <td className="p-2.5 text-center align-middle">
                                                        <span className="inline-flex rounded-lg border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-800">
                                                            {item.invoice_no}
                                                        </span>
                                                    </td>
                                                    <td className="p-2.5 text-right align-middle">
                                                        <span className="text-sm font-bold tabular-nums text-emerald-700">
                                                            ₹{formatCurrency(item.amount)}
                                                        </span>
                                                    </td>
                                                    <td className="p-2.5 align-middle">
                                                        <div className="min-w-0">
                                                            <div className="truncate text-sm font-medium text-slate-800" title={receivedAtInfo.displayName}>
                                                                {receivedAtInfo.displayName}
                                                            </div>
                                                            {receivedAtInfo.subtitle ? (
                                                                <div className="mt-0.5 truncate text-xs text-slate-500" title={receivedAtInfo.subtitle}>
                                                                    {receivedAtInfo.subtitle}
                                                                </div>
                                                            ) : null}
                                                            <div className="mt-0.5">
                                                                <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${receivedAtInfo.bgColor} ${receivedAtInfo.textColor}`}>
                                                                    {receivedAtInfo.badgeLabel}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="p-2.5 text-center align-middle">
                                                        <motion.button
                                                            type="button"
                                                            data-received-actions-trigger
                                                            className="rounded-lg border border-slate-200 p-2 text-slate-500 transition-colors duration-150 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600"
                                                            onClick={(e) => openActionsFromButton(e, item.transaction_id)}
                                                            whileHover={{ scale: 1.05 }}
                                                            whileTap={{ scale: 0.95 }}
                                                        >
                                                            <FiMenu className="h-4 w-4" />
                                                        </motion.button>
                                                    </td>
                                                </motion.tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>

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
                    </motion.div>
                </div>
            </div>

            {activeRowDropdown && activeReceivedItem && createPortal(
                <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    data-received-actions-menu
                    className="fixed z-[10040] w-48 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-xl"
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
                        className="flex w-full items-center px-3 py-2 text-sm text-slate-700 transition-colors hover:bg-blue-50"
                        onClick={() => openDetails(activeReceivedItem)}
                    >
                        <FiEye className="mr-2 h-4 w-4 text-blue-600" />
                        View Details
                    </button>
                    <button
                        type="button"
                        className={`flex w-full items-center px-3 py-2 text-sm text-slate-700 transition-colors hover:bg-blue-50 ${
                            !check('finance_entry_edit') ? 'cursor-not-allowed opacity-60 hover:bg-transparent' : ''
                        }`}
                        onClick={() => {
                            if (!check('finance_entry_edit')) {
                                toast.error('Need Access Permission');
                                return;
                            }
                            openEditModal(activeReceivedItem);
                        }}
                    >
                        <FiEdit className="mr-2 h-4 w-4 text-blue-500" />
                        Edit Received
                    </button>
                    {getActionLinks(activeReceivedItem).invoiceLink ? (
                        <a
                            href={getActionLinks(activeReceivedItem).invoiceLink}
                            className="flex w-full items-center px-3 py-2 text-sm text-slate-700 no-underline transition-colors hover:bg-blue-50"
                            onClick={() => {
                                setActiveRowDropdown(null);
                                actionAnchorRef.current = null;
                            }}
                        >
                            <FiFileText className="mr-2 h-4 w-4 text-purple-500" />
                            View Invoice
                        </a>
                    ) : null}
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