import React, { useState, useEffect } from 'react';
import {
    FiSearch,
    FiPlus,
    FiEdit,
    FiFileText,
    FiMenu,
    FiPrinter,
    FiMail,
    FiMessageSquare,
    FiChevronRight,
    FiTrendingUp,
    FiFilter,
    FiChevronDown,
    FiChevronUp,
    FiChevronLeft,
    FiChevronRight as FiChevronRightIcon,
    FiDollarSign,
    FiCreditCard,
    FiUsers,
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
import { motion, AnimatePresence } from 'framer-motion';
import { Header, Sidebar } from '../components/header';
import EmailSelectionModal from '../components/email-selection';
import MobileSelectionModal from '../components/mobile-selection';
import { TransactionModalManager } from '../components/Modals/CreateTransactions';
import { EditTransactionModalManager } from '../components/Modals/EditTransactions';
import DateFilter from '../components/DateFilter';
import API_BASE_URL from "../utils/api-controller";
import getHeaders from "../utils/get-headers";
import toast from 'react-hot-toast';
import { useUserPermissions } from '../utils/permission-helper';

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
        { type: 'csv', icon: <FiDollarSign className="w-6 h-6 text-blue-600" />, label: 'CSV (.csv)', description: 'Export as Comma Separated Values' },
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
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [dateRange, setDateRange] = useState('');
    const [fromToDate, setFromToDate] = useState('');
    const [received, setReceived] = useState([]);
    const [receivedFormModal, setPaymentReceivedModal] = useState(false);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [editRecord, setEditRecord] = useState(null);
    const [totalAmount, setTotalAmount] = useState(0);

    // State for dropdown menus
    const [showAddDropdown, setShowAddDropdown] = useState(false);
    const [activeRowDropdown, setActiveRowDropdown] = useState(null);
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
    const [itemsPerPage] = useState(10);
    const [showAll, setShowAll] = useState(false);
    const [totalRecords, setTotalRecords] = useState(0);
    const [isLastPage, setIsLastPage] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedDateFilter, setSelectedDateFilter] = useState(null);

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

    // Initialize with current month date range
    useEffect(() => {
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        const lastDay = today;

        const formatDate = (date) => {
            return date.toISOString().split('T')[0];
        };

        const from = formatDate(firstDay);
        const to = formatDate(lastDay);

        const displayFrom = firstDay.toLocaleDateString('en-GB');
        const displayTo = lastDay.toLocaleDateString('en-GB');
        
        setDateRange(`${displayFrom} - ${displayTo}`);
        setFromToDate(`From ${displayFrom} to ${displayTo}`);
        fetchReceivedData(from, to);
    }, []);

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

    // Format date for display
    const formatDisplayDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-GB');
    };

    // Prepare data for export
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
            const bankInfo = item.payment_to?.details?.bank || 'N/A';
            const creatorInfo = item.create_by?.name || 'N/A';
            
            const row = {
                sl_no: showAll ? index + 1 : ((currentPage - 1) * itemsPerPage) + index + 1,
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
    const fetchReceivedData = async (fromDate, toDate, page = 1, search = '') => {
        setLoading(true);
        setError(null);
        
        try {
            const limit = showAll ? 10000 : itemsPerPage;
            
            const url = `${API_BASE_URL}/transaction/report/receive?page_no=${page}&limit=${limit}&from_date=${fromDate}&to_date=${toDate}${search ? `&search=${search}` : ''}`;
            
            const headers = await getHeaders();
            const response = await fetch(url, {
                method: 'GET',
                headers: headers
            });
            
            const result = await response.json();
            
            if (result.success) {
                setReceived(result.data || []);
                setTotalRecords(result.meta?.total || 0);
                setIsLastPage(result.meta?.is_last_page || false);
                
                const total = (result.data || []).reduce((acc, item) => {
                    const amount = parseFloat(item.amount) || 0;
                    return acc + amount;
                }, 0);
                setTotalAmount(total);
            } else {
                setError(result.message || 'Failed to fetch received data');
                setReceived([]);
                setTotalAmount(0);
            }
        } catch (err) {
            console.error('Error fetching received data:', err);
            setError('Network error: Failed to fetch received data');
            setReceived([]);
            setTotalAmount(0);
        } finally {
            setLoading(false);
        }
    };

    // Handle search
    const handleSearch = () => {
        if (!dateRange) return;
        
        const [displayFrom, displayTo] = dateRange.split(' - ');
        
        const from = convertToAPIDate(displayFrom);
        const to = convertToAPIDate(displayTo);
        
        setFromToDate(`From ${displayFrom} to ${displayTo}`);
        setCurrentPage(1);
        fetchReceivedData(from, to, 1, searchTerm);
    };

    // Convert display date (DD/MM/YYYY) to API date (YYYY-MM-DD)
    const convertToAPIDate = (displayDate) => {
        if (!displayDate) return '';
        const parts = displayDate.split('/');
        if (parts.length === 3) {
            return `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
        return displayDate;
    };

    // Handle date filter change
    const handleDateFilterChange = (filter) => {
        console.log('Selected filter:', filter);
        if (filter.range) {
            setDateRange(filter.range);
            setSelectedDateFilter(filter);
            
            const [displayFrom, displayTo] = filter.range.split(' - ');
            setFromToDate(`From ${displayFrom} to ${displayTo}`);
            
            const from = convertToAPIDate(displayFrom);
            const to = convertToAPIDate(displayTo);
            
            setCurrentPage(1);
            fetchReceivedData(from, to, 1, searchTerm);
        }
    };

    // Handle search term change
    const handleSearchTermChange = (e) => {
        setSearchTerm(e.target.value);
    };

    // Handle search on Enter key
    const handleSearchKeyPress = (e) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    };

    // Handle page change
    const handlePageChange = (newPage) => {
        setCurrentPage(newPage);
        if (dateRange) {
            const [displayFrom, displayTo] = dateRange.split(' - ');
            const from = convertToAPIDate(displayFrom);
            const to = convertToAPIDate(displayTo);
            fetchReceivedData(from, to, newPage, searchTerm);
        }
    };

    // Handle show all toggle
    const handleShowAll = () => {
        setShowAll(true);
        if (dateRange) {
            const [displayFrom, displayTo] = dateRange.split(' - ');
            const from = convertToAPIDate(displayFrom);
            const to = convertToAPIDate(displayTo);
            fetchReceivedData(from, to, 1, searchTerm);
        }
    };

    // Handle show less (back to pagination)
    const handleShowLess = () => {
        setShowAll(false);
        setCurrentPage(1);
        if (dateRange) {
            const [displayFrom, displayTo] = dateRange.split(' - ');
            const from = convertToAPIDate(displayFrom);
            const to = convertToAPIDate(displayTo);
            fetchReceivedData(from, to, 1, searchTerm);
        }
    };

    const emptySummary = { totalCredit: 0, totalDebit: 0, closingBalance: 0 };

    const handleReceivedSuccess = () => {
        if (dateRange) {
            const [displayFrom, displayTo] = dateRange.split(' - ');
            const from = convertToAPIDate(displayFrom);
            const to = convertToAPIDate(displayTo);
            fetchReceivedData(from, to, currentPage, searchTerm);
        }
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

    // Get party type display info
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

    // Get bank type info
    const getBankTypeInfo = (item) => {
        const bankDetails = item.payment_to?.details || {};
        const bankType = bankDetails.type || '';
        
        let bgColor = '';
        let textColor = '';
        
        switch (bankType) {
            case 'savings':
                bgColor = 'bg-blue-100';
                textColor = 'text-blue-700';
                break;
            case 'current':
                bgColor = 'bg-emerald-100';
                textColor = 'text-emerald-700';
                break;
            default:
                bgColor = 'bg-slate-100';
                textColor = 'text-slate-700';
        }
        
        return { bankType, bgColor, textColor, bankName: bankDetails.bank || '', accountNo: bankDetails.account_no || '' };
    };

    // Get creator type info
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
        
        return { type, bgColor, textColor, name: creator.name || '', mobile: creator.mobile || '' };
    };

    // Toggle row dropdown
    const toggleRowDropdown = (transactionId) => {
        setActiveRowDropdown(activeRowDropdown === transactionId ? null : transactionId);
    };

    // Close all dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (!event.target.closest('.dropdown-container')) {
                setShowAddDropdown(false);
                setActiveRowDropdown(null);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Calculate total pages
    const totalPages = Math.ceil(totalRecords / itemsPerPage);
    const currentItems = received;
    const paginatedTotal = currentItems.reduce((acc, item) => {
        const amount = parseFloat(item.amount) || 0;
        return acc + amount;
    }, 0);

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
                <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200">
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
                                        <tr>{[...Array(8)].map((_, i) => (<th key={i} className="text-center p-3"><div className="h-4 bg-gray-200 rounded w-20 mx-auto"></div></th>))}</tr>
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

    // Show skeleton while loading
    if (loading) {
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
                <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    {/* Header Stats Card - Smaller */}
                    <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2 }}
                        className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-4 text-white shadow-md mb-4"
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-blue-100 text-xs font-medium">Total Received</p>
                                <h3 className="text-lg font-bold mt-1">₹{formatCurrency(totalAmount)}</h3>
                            </div>
                            <FiCreditCard className="w-5 h-5 opacity-80" />
                        </div>
                    </motion.div>

                    {/* Error Message */}
                    {error && (
                        <motion.div 
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4"
                        >
                            <p className="text-red-600 text-sm">{error}</p>
                        </motion.div>
                    )}

                    {/* Main Card */}
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3 }}
                        className="bg-white rounded-xl shadow-lg border border-slate-200"
                    >
                        {/* Card Header */}
                        <div className="border-b border-slate-200 px-6 py-4 bg-gradient-to-r from-slate-50 to-white sticky top-0 z-10">
                            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <div className="p-1.5 bg-blue-100 rounded-lg">
                                            <FiDollarSign className="w-4 h-4 text-blue-600" />
                                        </div>
                                        <h5 className="text-lg font-bold text-slate-800">
                                            Received Register
                                        </h5>
                                    </div>
                                    {fromToDate && (
                                        <div className="flex items-center gap-1 text-slate-600">
                                            <FiFilter className="w-3 h-3" />
                                            <p className="text-xs font-medium">
                                                {fromToDate}
                                            </p>
                                        </div>
                                    )}
                                </div>

                                <div className="flex flex-col lg:flex-row gap-3 w-full lg:w-auto">
                                    {/* Search Input */}
                                    <div className="relative w-full lg:w-64">
                                        <input
                                            type="text"
                                            placeholder="Search by invoice no, party, remark..."
                                            value={searchTerm}
                                            onChange={handleSearchTermChange}
                                            onKeyPress={handleSearchKeyPress}
                                            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        />
                                        <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                                    </div>

                                    {/* Date Filter Component */}
                                    <div className="w-full lg:w-auto">
                                        <DateFilter onChange={handleDateFilterChange} />
                                    </div>

                                    <div className="flex gap-2">
                                        {/* Export Dropdown */}
                                        <div className="dropdown-container relative">
                                            <motion.button
                                                onClick={() => setShowAddDropdown(!showAddDropdown)}
                                                className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg text-xs font-semibold transition-all duration-200 flex items-center gap-2 shadow-sm hover:shadow"
                                                whileHover={{ scale: 1.02 }}
                                                whileTap={{ scale: 0.98 }}
                                            >
                                                <PiExportBold className="w-4 h-4" />
                                                Export
                                                <FiChevronRight className={`w-3 h-3 transition-transform ${showAddDropdown ? 'rotate-90' : ''}`} />
                                            </motion.button>

                                            <AnimatePresence>
                                                {showAddDropdown && (
                                                    <motion.div
                                                        initial={{ opacity: 0, y: 5 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        exit={{ opacity: 0, y: 5 }}
                                                        className="absolute right-0 mt-1 w-56 bg-white rounded-lg shadow-xl border border-slate-200 z-50 overflow-hidden"
                                                    >
                                                        <div className="py-1">
                                                            <button
                                                                onClick={handleExportClick}
                                                                className="flex items-center w-full px-3 py-2 text-sm text-slate-700 hover:bg-blue-50 transition-all duration-150 group"
                                                            >
                                                                <div className="p-1.5 bg-red-50 rounded mr-2 group-hover:bg-red-100 transition-colors">
                                                                    <PiFilePdfDuotone className="w-3.5 h-3.5 text-red-500" />
                                                                </div>
                                                                <div className="text-left">
                                                                    <div className="font-medium text-xs">Export as PDF</div>
                                                                </div>
                                                            </button>
                                                            <button
                                                                onClick={handleExportClick}
                                                                className="flex items-center w-full px-3 py-2 text-sm text-slate-700 hover:bg-blue-50 transition-all duration-150 group"
                                                            >
                                                                <div className="p-1.5 bg-green-50 rounded mr-2 group-hover:bg-green-100 transition-colors">
                                                                    <PiMicrosoftExcelLogoDuotone className="w-3.5 h-3.5 text-green-500" />
                                                                </div>
                                                                <div className="text-left">
                                                                    <div className="font-medium text-xs">Export as Excel</div>
                                                                </div>
                                                            </button>
                                                            <button
                                                                onClick={() => setWhatsappModalOpen(true)}
                                                                className="flex items-center w-full px-3 py-2 text-sm text-slate-700 hover:bg-blue-50 transition-all duration-150 group"
                                                            >
                                                                <div className="p-1.5 bg-green-50 rounded mr-2 group-hover:bg-green-100 transition-colors">
                                                                    <FaWhatsapp className="w-3.5 h-3.5 text-green-500" />
                                                                </div>
                                                                <div className="text-left">
                                                                    <div className="font-medium text-xs">Share via WhatsApp</div>
                                                                </div>
                                                            </button>
                                                            <button
                                                                onClick={() => setIsEmailModalOpen(true)}
                                                                className="flex items-center w-full px-3 py-2 text-sm text-slate-700 hover:bg-blue-50 transition-all duration-150 group"
                                                            >
                                                                <div className="p-1.5 bg-blue-50 rounded mr-2 group-hover:bg-blue-100 transition-colors">
                                                                    <AiOutlineMail className="w-3.5 h-3.5 text-blue-500" />
                                                                </div>
                                                                <div className="text-left">
                                                                    <div className="font-medium text-xs">Share via Email</div>
                                                                </div>
                                                            </button>
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>

                                        <motion.button
                                            onClick={() => {
                                                if (!check('finance_entry')) {
                                                    toast.error('Need Access Permission');
                                                } else {
                                                    setPaymentReceivedModal(true);
                                                }
                                            }}
                                            className={`px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white rounded-lg text-xs font-semibold transition-all duration-200 flex items-center gap-2 shadow-sm hover:shadow ${
                                                !check('finance_entry') ? 'opacity-60 cursor-not-allowed hover:from-emerald-600 hover:to-emerald-700' : ''
                                            }`}
                                            whileHover={check('finance_entry') ? { scale: 1.02 } : {}}
                                            whileTap={check('finance_entry') ? { scale: 0.98 } : {}}
                                        >
                                            {!check('finance_entry') ? <FiLock className="w-4 h-4 shrink-0" /> : <FiPlus className="w-4 h-4" />}
                                            Add Received
                                        </motion.button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Table Container */}
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="bg-gradient-to-r from-slate-50 to-slate-100">
                                        <th className="text-center p-3 font-semibold text-slate-700 text-[10px] uppercase tracking-wider min-w-[60px]">Sl No</th>
                                        <th className="text-center p-3 font-semibold text-slate-700 text-[10px] uppercase tracking-wider min-w-[80px]">Date</th>
                                        <th className="text-center p-3 font-semibold text-slate-700 text-[10px] uppercase tracking-wider min-w-[200px]">Particulars</th>
                                        <th className="text-center p-3 font-semibold text-slate-700 text-[10px] uppercase tracking-wider min-w-[120px]">Voucher No</th>
                                        <th className="text-center p-3 font-semibold text-slate-700 text-[10px] uppercase tracking-wider min-w-[100px]">Amount</th>
                                        <th className="text-center p-3 font-semibold text-slate-700 text-[10px] uppercase tracking-wider min-w-[150px]">Received At</th>
                                        <th className="text-center p-3 font-semibold text-slate-700 text-[10px] uppercase tracking-wider min-w-[150px]">Received By</th>
                                        <th className="text-center p-3 font-semibold text-slate-700 text-[10px] uppercase tracking-wider min-w-[80px]">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-slate-100">
                                    {received.length === 0 ? (
                                        <tr>
                                            <td colSpan="8" className="text-center py-8 text-slate-500">
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
                                        currentItems.map((item, index) => {
                                            const { editLink, invoiceLink } = getActionLinks(item);
                                            const isDropdownOpen = activeRowDropdown === item.transaction_id;
                                            const actualIndex = showAll ? index : (currentPage - 1) * itemsPerPage + index;
                                            const partyInfo = getPartyTypeInfo(item);
                                            const bankInfo = getBankTypeInfo(item);
                                            const creatorInfo = getCreatorTypeInfo(item);

                                            return (
                                                <motion.tr
                                                    key={item.transaction_id}
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    transition={{ duration: 0.15 }}
                                                    className="hover:bg-blue-50/20 transition-colors duration-150"
                                                >
                                                    <td className="text-center p-3 align-middle">
                                                        <div className="text-slate-700 font-medium text-xs">
                                                            {actualIndex + 1}
                                                        </div>
                                                    </td>
                                                    <td className="text-center p-3 align-middle">
                                                        <div className="font-medium text-slate-700 text-xs">
                                                            {formatDisplayDate(item.transaction_date)}
                                                        </div>
                                                    </td>
                                                    <td className="text-center p-3 align-middle">
                                                        <div className="mx-auto max-w-[180px]">
                                                            <div className="text-slate-800 font-semibold text-xs">
                                                                {partyInfo.displayName}
                                                            </div>
                                                            <div className="flex justify-center mt-1">
                                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium capitalize ${partyInfo.bgColor} ${partyInfo.textColor}`}>
                                                                    {partyInfo.type}
                                                                </span>
                                                            </div>
                                                            {item.remark && (
                                                                <div className="text-slate-500 text-[10px] text-center mt-1 italic truncate">
                                                                    "{item.remark}"
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="text-center p-3 align-middle">
                                                        <span className="inline-flex items-center justify-center bg-gradient-to-r from-slate-100 to-slate-200 text-slate-800 font-bold px-3 py-1.5 rounded text-xs border border-slate-300/50 shadow-xs">
                                                            {item.invoice_no}
                                                        </span>
                                                    </td>
                                                    <td className="text-center p-3 align-middle">
                                                        <span className="inline-flex items-center justify-center bg-gradient-to-r from-green-50 to-green-100 text-green-800 font-bold px-3 py-1.5 rounded text-xs min-w-[90px] shadow-xs">
                                                            ₹{formatCurrency(item.amount)}
                                                        </span>
                                                    </td>
                                                    <td className="text-center p-3 align-middle">
                                                        <div className="mx-auto max-w-[140px]">
                                                            <div className="text-slate-800 text-xs font-medium">
                                                                {bankInfo.bankName || item.payment_to?.details?.bank || 'N/A'}
                                                            </div>
                                                            {bankInfo.accountNo && (
                                                                <div className="text-slate-500 text-[10px] mt-0.5">
                                                                    {bankInfo.accountNo}
                                                                </div>
                                                            )}
                                                            <div className="flex justify-center mt-1">
                                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium capitalize ${bankInfo.bgColor} ${bankInfo.textColor}`}>
                                                                    {bankInfo.bankType || 'bank'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="text-center p-3 align-middle">
                                                        <div className="mx-auto max-w-[140px]">
                                                            <div className="text-slate-800 text-xs font-medium">
                                                                {creatorInfo.name}
                                                            </div>
                                                            <div className="flex flex-col items-center gap-1 mt-1">
                                                                <div className="text-slate-600 text-[10px]">
                                                                    {creatorInfo.mobile}
                                                                </div>
                                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium capitalize ${creatorInfo.bgColor} ${creatorInfo.textColor}`}>
                                                                    {creatorInfo.type}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="text-center p-3 align-middle">
                                                        <div className="dropdown-container relative flex justify-center">
                                                            <motion.button
                                                                className="p-1.5 text-slate-500 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors duration-150 border border-slate-200 hover:border-blue-300"
                                                                onClick={() => toggleRowDropdown(item.transaction_id)}
                                                                whileHover={{ scale: 1.05 }}
                                                                whileTap={{ scale: 0.95 }}
                                                            >
                                                                <FiMenu className="w-3.5 h-3.5" />
                                                            </motion.button>
                                                            <AnimatePresence>
                                                                {isDropdownOpen && (
                                                                    <motion.div
                                                                        initial={{ opacity: 0, y: 5 }}
                                                                        animate={{ opacity: 1, y: 0 }}
                                                                        exit={{ opacity: 0, y: 5 }}
                                                                        className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-xl border border-slate-200 z-50 overflow-hidden"
                                                                    >
                                                                        <div className="py-1">
                                                                            <button
                                                                                type="button"
                                                                                className={`flex items-center w-full px-3 py-2 text-xs text-slate-700 hover:bg-blue-50 transition-colors duration-150 ${
                                                                                    !check('finance_entry_edit') ? 'opacity-60 cursor-not-allowed hover:bg-transparent' : ''
                                                                                }`}
                                                                                onClick={() => {
                                                                                    if (!check('finance_entry_edit')) {
                                                                                        toast.error('Need Access Permission');
                                                                                        return;
                                                                                    }
                                                                                    openEditModal(item);
                                                                                }}
                                                                            >
                                                                                <div className="p-1 bg-blue-50 rounded mr-2">
                                                                                    {!check('finance_entry_edit') ? (
                                                                                        <FiLock className="w-3 h-3 text-slate-400" />
                                                                                    ) : (
                                                                                        <FiEdit className="w-3 h-3 text-blue-500" />
                                                                                    )}
                                                                                </div>
                                                                                <div className="text-left">
                                                                                    <div className="font-medium">Edit Received</div>
                                                                                </div>
                                                                            </button>
                                                                            {invoiceLink && (
                                                                                <a
                                                                                    href={invoiceLink}
                                                                                    className="flex items-center w-full px-3 py-2 text-xs text-slate-700 hover:bg-blue-50 transition-colors duration-150"
                                                                                    onClick={() => setActiveRowDropdown(null)}
                                                                                >
                                                                                    <div className="p-1 bg-purple-50 rounded mr-2">
                                                                                        <FiFileText className="w-3 h-3 text-purple-500" />
                                                                                    </div>
                                                                                    <div className="text-left">
                                                                                        <div className="font-medium">View Invoice</div>
                                                                                    </div>
                                                                                </a>
                                                                            )}
                                                                            <div className="border-t border-slate-100 mt-1 pt-1">
                                                                                <button
                                                                                    className="flex items-center w-full px-3 py-2 text-xs text-slate-700 hover:bg-blue-50 transition-colors duration-150"
                                                                                    onClick={() => handleOtherExport('print', item)}
                                                                                >
                                                                                    <div className="p-1 bg-slate-50 rounded mr-2">
                                                                                        <FiPrinter className="w-3 h-3 text-slate-600" />
                                                                                    </div>
                                                                                    <div className="text-left">
                                                                                        <div className="font-medium">Print</div>
                                                                                    </div>
                                                                                </button>
                                                                                <button
                                                                                    className="flex items-center w-full px-3 py-2 text-xs text-slate-700 hover:bg-blue-50 transition-colors duration-150"
                                                                                    onClick={() => handleOtherExport('whatsapp', item)}
                                                                                >
                                                                                    <div className="p-1 bg-green-50 rounded mr-2">
                                                                                        <FaWhatsapp className="w-3 h-3 text-green-500" />
                                                                                    </div>
                                                                                    <div className="text-left">
                                                                                        <div className="font-medium">WhatsApp</div>
                                                                                    </div>
                                                                                </button>
                                                                                <button
                                                                                    className="flex items-center w-full px-3 py-2 text-xs text-slate-700 hover:bg-blue-50 transition-colors duration-150"
                                                                                    onClick={() => handleOtherExport('email', item)}
                                                                                >
                                                                                    <div className="p-1 bg-blue-50 rounded mr-2">
                                                                                        <FiMail className="w-3 h-3 text-blue-500" />
                                                                                    </div>
                                                                                    <div className="text-left">
                                                                                        <div className="font-medium">Email</div>
                                                                                    </div>
                                                                                </button>
                                                                            </div>
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

                            {/* Pagination Controls */}
                            {!showAll && totalRecords > itemsPerPage && (
                                <div className="border-t border-slate-200 bg-gradient-to-r from-slate-50 to-slate-100">
                                    <div className="flex flex-col sm:flex-row justify-between items-center px-4 py-3 gap-3">
                                        <div className="text-xs text-slate-600">
                                            Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalRecords)} of {totalRecords} entries
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => handlePageChange(currentPage - 1)}
                                                disabled={currentPage === 1}
                                                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
                                            >
                                                <FiChevronLeft className="w-3 h-3" />
                                                Previous
                                            </button>
                                            <div className="flex items-center gap-1">
                                                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                                    let pageNumber;
                                                    if (totalPages <= 5) {
                                                        pageNumber = i + 1;
                                                    } else if (currentPage <= 3) {
                                                        pageNumber = i + 1;
                                                    } else if (currentPage >= totalPages - 2) {
                                                        pageNumber = totalPages - 4 + i;
                                                    } else {
                                                        pageNumber = currentPage - 2 + i;
                                                    }
                                                    
                                                    return (
                                                        <button
                                                            key={pageNumber}
                                                            onClick={() => handlePageChange(pageNumber)}
                                                            className={`w-8 h-8 text-xs font-medium rounded-lg transition-colors ${
                                                                currentPage === pageNumber
                                                                    ? 'bg-blue-600 text-white'
                                                                    : 'border border-slate-300 bg-white hover:bg-slate-50 text-slate-700'
                                                            }`}
                                                        >
                                                            {pageNumber}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                            <button
                                                onClick={() => handlePageChange(currentPage + 1)}
                                                disabled={isLastPage}
                                                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
                                            >
                                                Next
                                                <FiChevronRightIcon className="w-3 h-3" />
                                            </button>
                                        </div>
                                        <button
                                            onClick={handleShowAll}
                                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 bg-white hover:bg-slate-50 transition-colors"
                                        >
                                            Show All
                                            <FiChevronDown className="w-3 h-3" />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Show Less Button when showing all */}
                            {showAll && totalRecords > itemsPerPage && (
                                <div className="border-t border-slate-200 bg-gradient-to-r from-slate-50 to-slate-100">
                                    <div className="flex justify-center px-4 py-3">
                                        <button
                                            onClick={handleShowLess}
                                            className="flex items-center gap-1 px-4 py-2 text-xs font-medium rounded-lg border border-slate-300 bg-white hover:bg-slate-50 transition-colors shadow-sm"
                                        >
                                            Show Less
                                            <FiChevronUp className="w-3 h-3" />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </div>
            </div>

            {/* Modals */}
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