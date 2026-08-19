import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
    FiPlus,
    FiEdit2,
    FiFileText,
    FiX,
    FiCheckCircle,
    FiAlertCircle,
    FiInfo,
    FiLock,
    FiEye,
    FiDownload,
    FiShare2,
    FiChevronDown,
    FiMoreVertical,
} from 'react-icons/fi';
import { PiExportBold } from "react-icons/pi";
import { PiFilePdfDuotone, PiMicrosoftExcelLogoDuotone } from "react-icons/pi";
import { TbCurrencyRupee } from 'react-icons/tb';
import { AiOutlineMail } from "react-icons/ai";
import { FaWhatsapp } from "react-icons/fa6";
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import EmailSelectionModal from '../components/email-selection';
import MobileSelectionModal from '../components/mobile-selection';
import { PurchaseForm } from '../components/Modals/CreateTransactions';
import { EditTransactionModalManager } from '../components/Modals/EditTransactions';
import { resolvePurchaseTaskId, ViewTransactionModalManager } from '../components/Modals/ViewTransactions';
import DocumentShareModal from '../components/Modals/DocumentShareModal';
import { DateRangePickerField } from '../components/PortalDatePicker';
import { Header, Sidebar } from '../components/header';
import TablePagination from '../components/TablePagination';
import API_BASE_URL from '../utils/api-controller';
import getHeaders from '../utils/get-headers';
import { generateAndDownloadInvoice } from '../utils/invoice-download';
import toast from 'react-hot-toast';
import { useUserPermissions } from '../utils/permission-helper';
import { buildPurchaseParticularsLabel } from '../utils/purchaseParticulars';

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
        { type: 'csv', icon: <TbCurrencyRupee className="w-6 h-6 text-blue-600" />, label: 'CSV (.csv)', description: 'Export as Comma Separated Values' },
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

const ViewPurchase = () => {
    const navigate = useNavigate();
    const { check } = useUserPermissions();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(() => {
        const saved = localStorage.getItem('sidebarMinimized');
        return saved ? JSON.parse(saved) : false;
    });
    const [fromDate, setFromDate] = useState(() => {
        const d = new Date();
        d.setDate(1);
        return d.toISOString().split('T')[0];
    });
    const [toDate, setToDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [loading, setLoading] = useState(false);
    const [purchases, setPurchases] = useState([]);
    const [purchaseFormModal, setPurchaseFormModal] = useState(false);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [editRecord, setEditRecord] = useState(null);
    const [viewModalOpen, setViewModalOpen] = useState(false);
    const [selectedPurchase, setSelectedPurchase] = useState(null);
    const [downloadingInvoice, setDownloadingInvoice] = useState(false);
    const [sharePurchase, setSharePurchase] = useState(null);
    const [showDocumentShareModal, setShowDocumentShareModal] = useState(false);
    const [summary, setSummary] = useState({
        count: 0,
        total: 0,
    });

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
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [showAll, setShowAll] = useState(false);
    const [totalItems, setTotalItems] = useState(0);
    const [isLastPage, setIsLastPage] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
    const [error, setError] = useState(null);

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

    const handlePurchaseSuccess = (purchaseData) => {
        console.log('Purchase created successfully:', purchaseData);
        fetchPurchaseData();
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

    // Prepare data for export
    const prepareExportData = () => {
        const exportDataList = [];
        const exportColumnsConfig = [];

        const columns = [
            { header: 'Sl No', key: 'sl_no', width: 10 },
            { header: 'Date', key: 'date', width: 15 },
            { header: 'Voucher No', key: 'voucher_no', width: 20 },
            { header: 'Particulars', key: 'particulars', width: 40 },
            { header: 'Purchase From', key: 'purchase_from', width: 15 },
            { header: 'Firm/Party', key: 'firm_name', width: 20 },
            { header: 'Total Amount (₹)', key: 'total_amount', width: 18 },
            { header: 'Remark', key: 'remark', width: 25 }
        ];

        exportColumnsConfig.push(...columns);

        purchases.forEach((purchase, index) => {
            const row = {
                sl_no: ((currentPage - 1) * itemsPerPage) + index + 1,
                date: purchase.date ? new Date(purchase.date).toLocaleDateString('en-GB') : 'N/A',
                voucher_no: purchase.invoice_no || 'N/A',
                particulars: purchase.particulars || 'N/A',
                purchase_from: purchase.purchase_from ? purchase.purchase_from.toUpperCase() : 'N/A',
                firm_name: purchase.firm_name || 'N/A',
                total_amount: purchase.grand_total || 0,
                remark: purchase.remark || ''
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

    // Debounce search input
    useEffect(() => {
        const timerId = setTimeout(() => {
            setDebouncedSearchTerm(searchTerm);
        }, 500);
        return () => clearTimeout(timerId);
    }, [searchTerm]);

    // Reset page when filters/search/page size change
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

    const closeActionMenu = () => {
        setShowActionMenu(null);
        actionAnchorRef.current = null;
        setActionMenuPosition(null);
    };

    const openEditModal = (record) => {
        if (!check('finance_entry_edit')) {
            toast.error('Need Access Permission');
            return;
        }
        const taskId = resolvePurchaseTaskId(record);
        if (taskId) {
            closeActionMenu();
            setViewModalOpen(false);
            setSelectedPurchase(null);
            navigate(`/task/profile/${encodeURIComponent(taskId)}/details`);
            return;
        }
        setEditRecord(record);
        setEditModalOpen(true);
        closeActionMenu();
        setViewModalOpen(false);
    };

    const closeEditModal = () => {
        setEditModalOpen(false);
        setEditRecord(null);
    };

    const handleEditSubmit = () => {
        closeEditModal();
        fetchPurchaseData(fromDate, toDate, currentPage, itemsPerPage, debouncedSearchTerm);
    };

    const closeViewModal = () => {
        setViewModalOpen(false);
        setSelectedPurchase(null);
    };

    const handleViewPurchase = (purchase) => {
        setSelectedPurchase(purchase);
        setViewModalOpen(true);
        closeActionMenu();
    };

    const handleDownloadInvoice = async (purchase) => {
        const invoiceId = purchase?.invoice_id;
        if (!invoiceId) {
            toast.error('Invoice ID not available for this purchase');
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

            await generateAndDownloadInvoice({
                invoiceId,
                type: 'purchase',
                filename: `purchase-${purchase.invoice_no || invoiceId}.pdf`,
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

    const handleOpenSharePurchase = (purchase) => {
        if (!purchase?.invoice_id) {
            toast.error('Invoice ID not available for this purchase');
            return;
        }
        const pType = String(purchase.purchase_type || purchase.purchase_from || '').toLowerCase();
        if (pType !== 'ca' && pType !== 'client') {
            toast.error('Share is available for CA purchases only');
            return;
        }
        closeActionMenu();
        setSharePurchase(purchase);
        setShowDocumentShareModal(true);
    };

    const handleSharePurchaseSend = useCallback(
        async ({ channels, mobile, email, country_code }) => {
            if (!sharePurchase?.invoice_id) {
                throw new Error('Invoice ID not available');
            }
            const response = await axios.post(
                `${API_BASE_URL}/invoice/share`,
                {
                    invoice_id: sharePurchase.invoice_id,
                    type: 'purchase',
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
        [sharePurchase]
    );

    // API call to fetch purchase data
    const fetchPurchaseData = useCallback(async (fromDateArg = null, toDateArg = null, pageNo = currentPage, limit = itemsPerPage, search = debouncedSearchTerm) => {
        setLoading(true);
        setError(null);

        try {
            const today = new Date();
            const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);

            const formatDateForAPI = (date) => {
                return date.toISOString().split('T')[0];
            };

            const from = fromDateArg || formatDateForAPI(firstDay);
            const to = toDateArg || formatDateForAPI(today);

            let url = `${API_BASE_URL}/purchase/list?page_no=${pageNo}&limit=${limit}&from_date=${from}&to_date=${to}`;

            if (search && search.trim()) {
                url += `&search=${encodeURIComponent(search.trim())}`;
            }

            const response = await fetch(url, {
                method: 'GET',
                headers: getHeaders(),
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            if (result.success) {
                const transformedData = result.data.map(item => {
                    const particulars = buildPurchaseParticularsLabel(item) || item.remark || 'No particulars';
                    return {
                        ...item,
                        date: item.transaction_date,
                        particulars,
                        purchase_from: item.purchase_type,
                        firm_name: item.task_firm_name
                            || ((item.purchase_type === 'client' || item.purchase_type === 'ca')
                                ? item.purchase_party?.name
                                : item.purchase_type === 'bank'
                                    ? (item.purchase_party?.holder || item.purchase_party?.bank)
                                    : ''),
                        total: parseFloat(item.amount || item.calculation?.grand_total || 0),
                        grand_total: parseFloat(item.calculation?.grand_total || item.amount || 0),
                    };
                });

                setPurchases(transformedData);

                if (result.stats) {
                    const statsAmount = parseFloat(result.stats.amount || 0);
                    setSummary({
                        count: Number(result.stats.count) || 0,
                        total: statsAmount,
                    });
                } else {
                    const summaryData = transformedData.reduce((acc, purchase) => ({
                        count: acc.count + 1,
                        total: acc.total + purchase.total,
                    }), { count: 0, total: 0 });
                    setSummary(summaryData);
                }

                if (result.meta) {
                    setTotalItems(result.meta.total);
                    setItemsPerPage(result.meta.limit);
                    setIsLastPage(Boolean(result.meta.is_last_page));
                    if (result.meta.is_last_page && currentPage !== result.meta.page_no) {
                        setCurrentPage(result.meta.page_no);
                    }
                }
            } else {
                console.error('API returned error:', result);
                setPurchases([]);
                setSummary({ count: 0, total: 0 });
                setError(result.message || 'Failed to fetch purchase data');
            }
        } catch (error) {
            console.error('Error fetching purchase data:', error);
            setPurchases([]);
            setSummary({ count: 0, total: 0 });
            setError(error.message || 'Network error. Please check your connection.');
        } finally {
            setLoading(false);
        }
    }, [currentPage, itemsPerPage, debouncedSearchTerm]);

    // Fetch on filters/pagination/search change
    useEffect(() => {
        fetchPurchaseData(fromDate, toDate, currentPage, itemsPerPage, debouncedSearchTerm);
    }, [fetchPurchaseData, fromDate, toDate, currentPage, itemsPerPage, debouncedSearchTerm]);

    // Handle search input change
    const handleSearchInputChange = (e) => {
        setSearchTerm(e.target.value);
    };

    // Handle page change
    const handlePageChange = (newPage) => {
        setCurrentPage(newPage);
    };

    // Handle items per page change
    const handleItemsPerPageChange = (newLimit) => {
        setItemsPerPage(newLimit);
    };

    // Format date
    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-GB');
    };

    const computeActionMenuPosition = useCallback((anchorEl, options = {}) => {
        if (!anchorEl) return null;

        const itemCount = Math.max(1, Number(options.itemCount) || 4);
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

    const handleActionClick = useCallback((e, invoiceId) => {
        e.stopPropagation();
        if (showActionMenu === invoiceId) {
            closeActionMenu();
            return;
        }
        actionAnchorRef.current = e.currentTarget;
        setActionMenuPosition(computeActionMenuPosition(e.currentTarget, { itemCount: 4 }));
        setShowActionMenu(invoiceId);
        setShowAddDropdown(false);
    }, [showActionMenu, computeActionMenuPosition]);

    const activePurchase = useMemo(
        () => purchases.find((p) => p.invoice_id === showActionMenu) || null,
        [purchases, showActionMenu]
    );

    // Close all dropdowns when clicking outside
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

    // Get current items based on pagination
    const currentItems = purchases;
    const totalPages = Math.ceil(totalItems / itemsPerPage);

    // Skeleton loader component
    const SkeletonRow = () => (
        <tr className="border-b border-slate-100 animate-pulse">
            <td className="p-3 text-center"><div className="h-4 bg-slate-200 rounded w-6 mx-auto"></div></td>
            <td className="p-3 text-center"><div className="h-4 bg-slate-200 rounded w-16 mx-auto"></div></td>
            <td className="p-3 text-center"><div className="h-4 bg-slate-200 rounded w-24 mx-auto"></div></td>
            <td className="p-3 text-center"><div className="h-4 bg-slate-200 rounded w-16 mx-auto"></div></td>
            <td className="p-3 text-center"><div className="h-6 bg-slate-200 rounded w-16 mx-auto"></div></td>
            <td className="p-3 text-center"><div className="h-6 bg-slate-200 rounded w-16 mx-auto"></div></td>
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
                    <div className="mb-4 grid grid-cols-1 gap-2 sm:gap-3 md:grid-cols-2">
                        {[...Array(2)].map((_, i) => (
                            <div key={i} className="h-[4.25rem] animate-pulse rounded-xl border border-slate-200 bg-slate-100/80 sm:h-[4.5rem]" />
                        ))}
                    </div>
                    <div className="overflow-hidden rounded-lg border border-slate-200/80 bg-slate-50/40">
                        <div className="border-b border-slate-200 px-4 py-3 sm:px-6 sm:py-4">
                            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                                <div><div className="h-6 bg-gray-200 rounded w-48 mb-2"></div><div className="h-4 bg-gray-200 rounded w-32"></div></div>
                                <div className="flex gap-3"><div className="h-10 bg-gray-200 rounded w-40"></div><div className="h-10 bg-gray-200 rounded w-32"></div></div>
                            </div>
                        </div>
                        <div className="overflow-hidden">
                            <div className="border-b border-slate-200"><table className="w-full text-sm"><thead className="bg-slate-100"><tr>{[...Array(6)].map((_, i) => (<th key={i} className="text-center p-3"><div className="h-4 bg-gray-200 rounded w-20 mx-auto"></div></th>))}</tr></thead></table></div>
                            <div className="p-4">{[...Array(6)].map((_, index) => (<div key={index} className="mb-4"><div className="h-12 bg-gray-100 rounded"></div></div>))}</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    // Show skeleton while loading and no data
    if (loading && purchases.length === 0) {
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
                <div className="h-full flex flex-col mx-2 sm:mx-4 md:mx-8 my-3 md:my-4">
                    {/* Error Alert */}
                    {error && (
                        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2"><div className="text-red-500">⚠️</div><p className="text-red-700 text-sm">{error}</p></div>
                                <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">✕</button>
                            </div>
                        </motion.div>
                    )}

                    {/* Header Stats */}
                    <div className="mb-4 grid grid-cols-1 gap-2 sm:gap-3 md:grid-cols-2">
                        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-indigo-600 via-indigo-500 to-violet-600 p-3 text-white sm:p-3.5">
                            <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                    <p className="text-[10px] font-semibold uppercase tracking-wide text-white/80 sm:text-[11px]">No. of purchases</p>
                                    <p className="mt-0.5 truncate text-sm font-bold tabular-nums sm:text-base">{summary.count}</p>
                                </div>
                                <div className="shrink-0 rounded-lg bg-white/20 p-1.5"><FiFileText className="h-3.5 w-3.5 sm:h-4 sm:w-4" /></div>
                            </div>
                        </motion.div>

                        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: 0.04 }} className="overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-violet-600 via-fuchsia-600 to-pink-600 p-3 text-white sm:p-3.5">
                            <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                    <p className="text-[10px] font-semibold uppercase tracking-wide text-white/80 sm:text-[11px]">Total amount</p>
                                    <p className="mt-0.5 truncate text-sm font-bold tabular-nums sm:text-base">₹{formatCurrency(summary.total)}</p>
                                </div>
                                <div className="shrink-0 rounded-lg bg-white/20 p-1.5"><TbCurrencyRupee className="h-3.5 w-3.5 sm:h-4 sm:w-4" /></div>
                            </div>
                        </motion.div>
                    </div>

                    {/* Purchase register — flat (no card shell) */}
                    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden rounded-lg border border-slate-200/80 bg-white/70">
                        <div className="sticky top-0 z-10 border-b border-slate-200 bg-gradient-to-r from-slate-100/90 via-white to-indigo-50/40 py-2.5 pl-3 pr-0 sm:pl-4 sm:pr-0">
                            <div className="flex w-full min-w-0 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
                                <div className="flex min-w-0 w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-3 sm:gap-y-2 lg:min-w-0 lg:flex-1 lg:flex-nowrap lg:items-center lg:gap-x-4">
                                    <h5 className="shrink-0 text-sm font-bold tracking-tight text-slate-800 sm:text-base mr-4 sm:mr-6 lg:mr-8">Purchase Register</h5>
                                    <input type="text" placeholder="Search…" value={searchTerm} onChange={handleSearchInputChange} className="h-9 w-full min-w-0 flex-1 rounded-lg border border-slate-300 px-3 text-sm transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 sm:min-w-[18rem] lg:min-w-[22rem] xl:min-w-[28rem]" />
                                    <div className="w-full min-w-0 max-w-full shrink-0 overflow-x-auto sm:min-w-[10rem] sm:max-w-[14rem] sm:overflow-x-auto lg:max-w-[14rem] xl:max-w-[16rem]">
                                        <DateRangePickerField value={{ start: fromDate, end: toDate }} onChange={(range) => { setFromDate(range?.start || ''); setToDate(range?.end || ''); }} placeholder="Select date range" mode="range" initialTab="quick" defaultQuickKey="tm" quickOptionKeys={['tw', 'lw', 'lm', 'tm', 'lf', 'fy']} showRangeHint={false} showResetButton={false} truncateRangeLabel={false} buttonClassName="w-full min-w-0 px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-600 hover:border-indigo-400 focus:outline-none transition-all" wrapperClassName="w-full min-w-0" />
                                    </div>
                                </div>
                                <div className="flex w-full shrink-0 items-center justify-end gap-2 sm:w-auto lg:pl-1">
                                    <div className="dropdown-container relative shrink-0">
                                        <motion.button type="button" onClick={(e) => { e.stopPropagation(); setShowAddDropdown(!showAddDropdown); }} className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 px-2.5 text-xs font-semibold text-white shadow-sm transition-all duration-200 hover:from-blue-700 hover:to-blue-800 hover:shadow sm:h-10 sm:px-3" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                                            <PiExportBold className="h-4 w-4 shrink-0" /><span className="whitespace-nowrap">Export</span><FiChevronDown className={`h-3.5 w-3.5 shrink-0 opacity-90 transition-transform ${showAddDropdown ? 'rotate-180' : ''}`} />
                                        </motion.button>

                                        <AnimatePresence>
                                            {showAddDropdown && (
                                                <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 5 }} className="absolute right-0 z-50 mt-1 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
                                                    <div className="py-1">
                                                        <button onClick={handleExportClick} className="flex items-center w-full px-3 py-2 text-sm text-slate-700 hover:bg-blue-50 transition-all duration-150 group">
                                                            <div className="p-1.5 bg-red-50 rounded mr-2 group-hover:bg-red-100 transition-colors"><PiFilePdfDuotone className="w-3.5 h-3.5 text-red-500" /></div>
                                                            <div className="text-left"><div className="font-medium text-xs">Export as PDF</div></div>
                                                        </button>
                                                        <button onClick={handleExportClick} className="flex items-center w-full px-3 py-2 text-sm text-slate-700 hover:bg-blue-50 transition-all duration-150 group">
                                                            <div className="p-1.5 bg-green-50 rounded mr-2 group-hover:bg-green-100 transition-colors"><PiMicrosoftExcelLogoDuotone className="w-3.5 h-3.5 text-green-500" /></div>
                                                            <div className="text-left"><div className="font-medium text-xs">Export as Excel</div></div>
                                                        </button>
                                                        <button onClick={() => setWhatsappModalOpen(true)} className="flex items-center w-full px-3 py-2 text-sm text-slate-700 hover:bg-blue-50 transition-all duration-150 group">
                                                            <div className="p-1.5 bg-green-50 rounded mr-2 group-hover:bg-green-100 transition-colors"><FaWhatsapp className="w-3.5 h-3.5 text-green-500" /></div>
                                                            <div className="text-left"><div className="font-medium text-xs">Share via WhatsApp</div></div>
                                                        </button>
                                                        <button onClick={() => setIsEmailModalOpen(true)} className="flex items-center w-full px-3 py-2 text-sm text-slate-700 hover:bg-blue-50 transition-all duration-150 group">
                                                            <div className="p-1.5 bg-blue-50 rounded mr-2 group-hover:bg-blue-100 transition-colors"><AiOutlineMail className="w-3.5 h-3.5 text-blue-500" /></div>
                                                            <div className="text-left"><div className="font-medium text-xs">Share via Email</div></div>
                                                        </button>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>

                                    <motion.button type="button" onClick={() => {
                                        if (!check('finance_entry')) {
                                            toast.error('Need Access Permission');
                                        } else {
                                            setPurchaseFormModal(true);
                                        }
                                    }} className={`mr-2 inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-emerald-700 px-2.5 text-xs font-semibold text-white shadow-sm transition-all duration-200 hover:from-emerald-700 hover:to-emerald-800 hover:shadow sm:mr-3 sm:h-10 sm:px-3 ${
                                        !check('finance_entry') ? 'opacity-60 cursor-not-allowed hover:from-emerald-600 hover:to-emerald-700' : ''
                                    }`} whileHover={check('finance_entry') ? { scale: 1.02 } : {}} whileTap={check('finance_entry') ? { scale: 0.98 } : {}}>
                                        {!check('finance_entry') ? <FiLock className="h-4 w-4 shrink-0" /> : <FiPlus className="h-4 w-4 shrink-0" />}<span className="whitespace-nowrap">Create</span>
                                    </motion.button>
                                </div>
                            </div>
                        </div>

                        {/* Table Container */}
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="bg-slate-100/90 border-b border-slate-200">
                                        <th className="text-center p-3 font-semibold text-slate-700 text-[10px] uppercase tracking-wider min-w-[60px]">Sl No</th>
                                        <th className="text-center p-3 font-semibold text-slate-700 text-[10px] uppercase tracking-wider min-w-[80px]">Date</th>
                                        <th className="text-center p-3 font-semibold text-slate-700 text-[10px] uppercase tracking-wider min-w-[200px]">Particulars</th>
                                        <th className="text-center p-3 font-semibold text-slate-700 text-[10px] uppercase tracking-wider min-w-[120px]">Voucher No</th>
                                        <th className="text-center p-3 font-semibold text-slate-700 text-[10px] uppercase tracking-wider min-w-[100px]">Total</th>
                                        <th className="text-center p-3 font-semibold text-slate-700 text-[10px] uppercase tracking-wider min-w-[80px]">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {loading ? (
                                        [...Array(5)].map((_, index) => <SkeletonRow key={index} />)
                                    ) : purchases.length === 0 ? (
                                        <tr>
                                            <td colSpan="6" className="text-center py-8 text-slate-500">
                                                <div className="flex flex-col items-center justify-center">
                                                    <div className="p-3 bg-slate-100 rounded-full mb-3"><FiFileText className="w-8 h-8 text-slate-400" /></div>
                                                    <p className="text-slate-600 text-sm font-medium mb-1">No purchase records found</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        currentItems.map((purchase, index) => {
                                            const actualIndex = (currentPage - 1) * itemsPerPage + index;

                                            return (
                                                <motion.tr
                                                    key={purchase.invoice_id}
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    transition={{ duration: 0.15 }}
                                                    className={`${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'} hover:bg-indigo-50/40 transition-colors duration-150`}
                                                >
                                                    <td className="text-center p-3 align-middle"><div className="text-slate-700 font-medium text-xs">{actualIndex + 1}</div></td>
                                                    <td className="text-center p-3 align-middle"><div className="font-medium text-slate-700 text-xs">{formatDate(purchase.date)}</div></td>
                                                    <td className="text-center p-3 align-middle">
                                                        <div className="mx-auto max-w-[260px]">
                                                            <div className="text-slate-800 font-semibold text-xs leading-snug whitespace-normal break-words">
                                                                {purchase.particulars}
                                                            </div>
                                                            {purchase.remark ? (
                                                                <div className="text-slate-500 text-[10px] text-center mt-1 italic truncate">
                                                                    "{purchase.remark}"
                                                                </div>
                                                            ) : null}
                                                        </div>
                                                    </td>
                                                    <td className="text-center p-3 align-middle"><span className="inline-flex items-center justify-center bg-slate-100 text-slate-800 font-bold px-3 py-1.5 rounded text-xs border border-slate-200">{purchase.invoice_no}</span></td>
                                                    <td className="text-center p-3 align-middle"><span className="inline-flex items-center justify-center bg-blue-50 text-blue-800 font-bold px-3 py-1.5 rounded text-xs min-w-[90px]">₹{formatCurrency(purchase.grand_total)}</span></td>
                                                    <td className="text-center p-3 align-middle">
                                                        <div className="flex justify-center">
                                                            <button
                                                                type="button"
                                                                aria-label="Actions"
                                                                className="p-1.5 text-slate-500 hover:text-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors duration-150 border border-slate-200 hover:border-indigo-300"
                                                                onClick={(e) => handleActionClick(e, purchase.invoice_id)}
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

                            {!loading && (currentItems.length > 0 || totalItems > 0) && totalPages > 0 && (
                                <TablePagination page={currentPage} limit={itemsPerPage} total={totalItems} totalPages={totalPages} isLastPage={isLastPage} rowOptions={[5, 10, 20, 50, 100]} defaultRows={10} onPageChange={handlePageChange} onLimitChange={handleItemsPerPageChange} />
                            )}
                        </div>
                    </motion.div>
                </div>
            </div>

            {/* Row actions (portal) */}
            {showActionMenu && activePurchase && actionMenuPosition && createPortal(
                <motion.div
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    className="fixed w-44 bg-white rounded-lg shadow-xl border border-slate-200 py-1 z-[99999] overflow-hidden"
                    style={{ top: actionMenuPosition.top, left: actionMenuPosition.left, height: 'auto' }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <span
                        className="absolute w-2.5 h-2.5 bg-white border-slate-200 rotate-45"
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
                        onClick={() => handleViewPurchase(activePurchase)}
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
                        onClick={() => openEditModal(activePurchase)}
                    >
                        {!check('finance_entry_edit') ? (
                            <FiLock className="w-4 h-4 text-slate-400" />
                        ) : (
                            <FiEdit2 className="w-4 h-4 text-blue-600" />
                        )}
                        Edit
                    </button>
                    <button
                        type="button"
                        disabled={downloadingInvoice}
                        onClick={() => handleDownloadInvoice(activePurchase)}
                        className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-green-50 flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {downloadingInvoice ? (
                            <div className="w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <FiDownload className="w-4 h-4 text-green-600" />
                        )}
                        {downloadingInvoice ? 'Downloading…' : 'Download'}
                    </button>
                    <button
                        type="button"
                        onClick={() => handleOpenSharePurchase(activePurchase)}
                        className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-teal-50 flex items-center gap-2 transition-colors"
                    >
                        <FiShare2 className="w-4 h-4 text-teal-600" />
                        Share
                    </button>
                </motion.div>,
                document.body
            )}

            {/* Modals */}
            <PurchaseForm isOpen={purchaseFormModal} onClose={() => setPurchaseFormModal(false)} onSuccess={handlePurchaseSuccess} mode="modal" />

            <ViewTransactionModalManager
                modalType="PURCHASE"
                isOpen={viewModalOpen}
                record={selectedPurchase}
                onClose={closeViewModal}
                formatCurrency={formatCurrency}
                canEdit={check('finance_entry_edit')}
                onEdit={(purchase) => {
                    closeViewModal();
                    openEditModal(purchase);
                }}
                onDownload={handleDownloadInvoice}
                onShare={handleOpenSharePurchase}
                isDownloading={downloadingInvoice}
            />

            <EditTransactionModalManager
                modalType="PURCHASE"
                isOpen={editModalOpen}
                onClose={closeEditModal}
                editRecord={editRecord}
                onSubmit={handleEditSubmit}
                formatCurrency={formatCurrency}
            />

            <DocumentShareModal
                isOpen={showDocumentShareModal}
                onClose={() => {
                    setShowDocumentShareModal(false);
                    setSharePurchase(null);
                }}
                title="Share Purchase Invoice"
                subtitle={
                    sharePurchase
                        ? `Invoice ${sharePurchase.invoice_no || sharePurchase.invoice_id}`
                        : undefined
                }
                recipientLabel={
                    sharePurchase?.purchase_party?.name
                        ? `To ${sharePurchase.purchase_party.name}`
                        : undefined
                }
                defaultMobile={sharePurchase?.purchase_party?.mobile || ''}
                defaultEmail={sharePurchase?.purchase_party?.email || ''}
                defaultCountryCode={sharePurchase?.purchase_party?.country_code || '91'}
                onSend={handleSharePurchaseSend}
            />

            <EmailSelectionModal isOpen={isEmailModalOpen} onClose={() => setIsEmailModalOpen(false)} onSubmit={handleEmailSubmit} />
            <MobileSelectionModal isOpen={isWhatsappModalOpen} onClose={() => setWhatsappModalOpen(false)} onSubmit={handleWhatsappSubmit} />

            {/* Inline Export Modal */}
            <InlineExportModal
                isOpen={exportModalOpen}
                onClose={() => { setExportModalOpen(false); setExportData([]); setExportColumns([]); }}
                exportData={exportData}
                columns={exportColumns}
                jobType="purchase_report"
            />

            {/* Export Confirmation Modal (for other exports) */}
            <AnimatePresence>
                {exportModal.open && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <motion.div initial={{ opacity: 0, scale: 0.9, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 10 }} className="bg-white rounded-xl p-6 max-w-sm w-full mx-auto shadow-xl">
                            <div className="text-center">
                                <div className="w-16 h-16 bg-gradient-to-r from-blue-100 to-blue-200 rounded-full flex items-center justify-center mx-auto mb-4"><PiExportBold className="w-8 h-8 text-blue-600" /></div>
                                <h3 className="text-lg font-bold text-slate-800 mb-2">Exporting {exportModal.type.toUpperCase()}</h3>
                                <p className="text-slate-600 mb-6 text-sm">Your {exportModal.type} export is being processed...</p>
                                <div className="flex justify-center space-x-2 mb-6">
                                    <div className="w-2 h-2 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full animate-bounce"></div>
                                    <div className="w-2 h-2 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                                    <div className="w-2 h-2 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                </div>
                                <div className="text-xs text-slate-500">This will only take a moment...</div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ViewPurchase;