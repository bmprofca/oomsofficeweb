import React, { useState, useEffect, useCallback } from 'react';
import { Header, Sidebar } from '../components/header';
import {
    FiPlus,
    FiEdit,
    FiSettings,
    FiDollarSign,
    FiMenu,
    FiFileText,
    FiFilter,
    FiChevronRight,
    FiPrinter,
    FiTrendingUp,
    FiSearch,
    FiEye,
    FiX,
    FiCheckCircle,
    FiAlertCircle,
    FiInfo
} from 'react-icons/fi';
import { PiExportBold } from "react-icons/pi";
import { PiFilePdfDuotone, PiMicrosoftExcelLogoDuotone } from "react-icons/pi";
import { AiOutlineMail } from "react-icons/ai";
import { motion, AnimatePresence } from 'framer-motion';
import getHeaders from '../utils/get-headers';
import API_BASE_URL from '../utils/api-controller';
import Pagination from '../components/paging-nation-component';
import DatePickerComponent from '../components/DatePickerComponent';
import toast from 'react-hot-toast';

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
        { type: 'csv', icon: <FiTrendingUp className="w-6 h-6 text-blue-600" />, label: 'CSV (.csv)', description: 'Export as Comma Separated Values' },
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

// --- Modal Components (moved outside to avoid re‑creation on every render) ---
const ModalContent = ({
    isOpen,
    onClose,
    onSubmit,
    formData,
    onChange,
    onDateChange,
    loading,
    mode = 'add',
    title
}) => {
    if (!isOpen) return null;

    const handleFormSubmit = (e) => {
        e.preventDefault();
        onSubmit(e);
    };

    const modalContent = (
        <div className="bg-white rounded-xl shadow-2xl flex flex-col h-full border border-gray-300">
            <div className="flex-shrink-0 flex items-center justify-between p-4 border-b border-gray-300 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-t-xl">
                <div>
                    <h2 className="text-xl font-bold">{title}</h2>
                </div>
                <button
                    onClick={onClose}
                    className="text-white hover:text-gray-200 p-1 rounded-lg transition-colors"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
                <form onSubmit={handleFormSubmit} id={`${mode}-account-form`}>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Account Name */}
                        <div className="lg:col-span-2">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Account Name <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                name="name"
                                value={formData.name || ''}
                                onChange={onChange}
                                placeholder="Enter account name (e.g., Food, Travel, Business Capital)"
                                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-blue-400 transition-colors"
                                required
                                autoComplete="off"
                            />
                        </div>

                        {/* Remark */}
                        <div className="lg:col-span-2">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Remark
                            </label>
                            <textarea
                                name="remark"
                                value={formData.remark || ''}
                                onChange={onChange}
                                placeholder="Enter account description or remarks"
                                rows="3"
                                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-blue-400 transition-colors resize-none"
                            />
                        </div>

                        {/* Opening Balance Amount */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Opening Balance <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="number"
                                name="opening_balance_amount"
                                value={formData.opening_balance?.amount || ''}
                                onChange={onChange}
                                placeholder="Enter opening balance"
                                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-blue-400 transition-colors"
                                required
                                step="0.01"
                                autoComplete="off"
                            />
                        </div>

                        {/* Opening Balance Type */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Balance Type <span className="text-red-500">*</span>
                            </label>
                            <select
                                name="opening_balance_type"
                                value={formData.opening_balance?.type || 'credit'}
                                onChange={onChange}
                                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-blue-400 transition-colors bg-white"
                                required
                            >
                                <option value="credit">Credit (Positive Balance)</option>
                                <option value="debit">Debit (Negative Balance)</option>
                            </select>
                        </div>

                        {/* Opening Date with DatePicker */}
                        <div className="lg:col-span-2">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Opening Date <span className="text-red-500">*</span>
                            </label>
                            <DatePickerComponent
                                selectedDate={formData.opening_balance?.date || new Date()}
                                onDateChange={onDateChange}
                                placeholderText="Select opening date"
                                className="w-full"
                                dateFormat="dd/MM/yyyy"
                            />
                        </div>
                    </div>
                </form>
            </div>

            <div className="flex-shrink-0 border-t border-gray-200 bg-white p-4 rounded-b-xl">
                <div className="flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={loading}
                        className="px-6 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        form={`${mode}-account-form`}
                        disabled={loading}
                        className="px-6 py-2.5 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center min-w-[120px] justify-center"
                    >
                        {loading ? (
                            <>
                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                {mode === 'add' ? 'Creating...' : 'Updating...'}
                            </>
                        ) : (
                            mode === 'add' ? 'Create Account' : 'Update Account'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen p-4">
                <div
                    className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
                    onClick={onClose}
                />
                <div 
                    className="relative w-full max-w-4xl bg-white rounded-xl shadow-2xl h-[85vh] flex flex-col"
                    onClick={(e) => e.stopPropagation()}
                >
                    {modalContent}
                </div>
            </div>
        </div>
    );
};

const ViewDetailsModal = ({ isOpen, onClose, account, formatCurrency }) => {
    if (!isOpen || !account) return null;

    const isNegativeBalance = Number(account.balance) < 0;
    const displayBalance = isNegativeBalance ? -account.balance : account.balance;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen p-4">
                <div
                    className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
                    onClick={onClose}
                />
                <div className="relative w-full max-w-2xl bg-white rounded-xl shadow-2xl">
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-t-xl">
                        <div>
                            <h2 className="text-xl font-bold">Account Details</h2>
                            <p className="text-blue-100 text-sm mt-1">View complete account information</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-blue-200 hover:text-white p-1 rounded-lg transition-colors"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Account Name */}
                            <div className="col-span-2">
                                <label className="block text-sm font-semibold text-gray-600 mb-1">Account Name</label>
                                <div className="text-lg font-bold text-gray-900 bg-gray-50 p-3 rounded-lg border border-gray-200">
                                    {account.name}
                                </div>
                            </div>

                            {/* Remark */}
                            <div className="col-span-2">
                                <label className="block text-sm font-semibold text-gray-600 mb-1">Remark</label>
                                <div className="text-gray-700 bg-gray-50 p-3 rounded-lg border border-gray-200">
                                    {account.remark || 'No remarks provided'}
                                </div>
                            </div>

                            {/* Balance */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-600 mb-1">Current Balance</label>
                                <div className={`text-2xl font-bold p-3 rounded-lg border ${isNegativeBalance ? 'text-red-600 bg-red-50 border-red-200' : 'text-green-600 bg-green-50 border-green-200'}`}>
                                    {isNegativeBalance ? '-' : ''}₹{formatCurrency(displayBalance)}
                                </div>
                            </div>

                            {/* Status */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-600 mb-1">Status</label>
                                <div className="p-3 rounded-lg border border-gray-200">
                                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${account.status ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                        {account.status ? 'Active' : 'Inactive'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="flex justify-end p-6 border-t border-gray-200 bg-gray-50 rounded-b-xl">
                        <button
                            onClick={onClose}
                            className="px-6 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- Main Component ---
const CapitalAccounts = () => {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(() => {
        const saved = localStorage.getItem('sidebarMinimized');
        return saved ? JSON.parse(saved) : false;
    });
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showViewModal, setShowViewModal] = useState(false);
    const [loading, setLoading] = useState(false);
    const [accounts, setAccounts] = useState([]);
    const [showAddDropdown, setShowAddDropdown] = useState(false);
    const [activeRowDropdown, setActiveRowDropdown] = useState(null);
    const [exportModal, setExportModal] = useState({ open: false, type: '', data: null });
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
    const [selectedAccount, setSelectedAccount] = useState(null);

    // Export Modal State
    const [exportModalOpen, setExportModalOpen] = useState(false);
    const [exportData, setExportData] = useState([]);
    const [exportColumns, setExportColumns] = useState([]);

    // Pagination state
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 10,
        total: 0,
        total_pages: 0,
        is_last_page: false
    });

    // Form states
    const [formData, setFormData] = useState({
        name: '',
        remark: '',
        opening_balance: {
            amount: '',
            date: new Date(),
            type: 'credit'
        }
    });

    const [editFormData, setEditFormData] = useState({
        capital_id: '',
        name: '',
        remark: '',
        opening_balance: {
            amount: '',
            date: new Date(),
            type: 'credit'
        }
    });

    // Prepare data for export
    const prepareExportData = () => {
        const exportDataList = [];
        const exportColumnsConfig = [];

        const columns = [
            { header: 'S.No', key: 'sl_no', width: 10 },
            { header: 'Account Name', key: 'account_name', width: 30 },
            { header: 'Remark', key: 'remark', width: 35 },
            { header: 'Balance (₹)', key: 'balance', width: 20 },
            { header: 'Status', key: 'status', width: 15 }
        ];

        exportColumnsConfig.push(...columns);

        accounts.forEach((account, index) => {
            const isNegativeBalance = Number(account.balance) < 0;
            const displayBalance = isNegativeBalance ? -account.balance : account.balance;
            
            const row = {
                sl_no: ((pagination.page - 1) * pagination.limit) + index + 1,
                account_name: account.name || 'N/A',
                remark: account.remark || '-',
                balance: (isNegativeBalance ? '-' : '') + displayBalance,
                status: account.status ? 'Active' : 'Inactive'
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

    // Debounce search term
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchTerm(searchTerm);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    // Fetch accounts when page, limit, or search changes
    useEffect(() => {
        fetchAccountList();
    }, [pagination.page, pagination.limit, debouncedSearchTerm]);

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

    // Fetch accounts from API
    const fetchAccountList = async () => {
        setLoading(true);
        try {
            const headers = getHeaders();
            const url = `${API_BASE_URL}/transaction/capital/list?page_no=${pagination.page}&limit=${pagination.limit}&search=${debouncedSearchTerm}`;
            
            const response = await fetch(url, {
                method: 'GET',
                headers: headers
            });

            const result = await response.json();

            if (result.success) {
                setAccounts(result.data);
                setPagination({
                    page: result.meta.page_no,
                    limit: result.meta.limit,
                    total: result.meta.total,
                    total_pages: Math.ceil(result.meta.total / result.meta.limit),
                    is_last_page: result.meta.is_last_page
                });
            } else {
                console.error('Failed to fetch accounts:', result);
                alert('Failed to fetch capital accounts');
            }
        } catch (error) {
            console.error('Error fetching accounts:', error);
            alert('An error occurred while fetching capital accounts');
        } finally {
            setLoading(false);
        }
    };

    // Handle page change
    const handlePageChange = (newPage) => {
        if (newPage >= 1 && !pagination.is_last_page) {
            setPagination(prev => ({ ...prev, page: newPage }));
        }
    };

    // Handle limit change
    const handleLimitChange = (newLimit) => {
        setPagination(prev => ({ ...prev, limit: newLimit, page: 1 }));
    };

    // Handle custom page change
    const handleCustomPageChange = (pageNum) => {
        setPagination(prev => ({ ...prev, page: pageNum }));
    };

    // Format currency
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(Math.abs(amount));
    };

    // Format date
    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-IN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };

    // Calculate total capital
    const totalCapital = accounts.reduce((acc, account) => acc + account.balance, 0);

    // Handle form input changes for create
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        
        if (name === 'name') {
            setFormData(prev => ({ ...prev, name: value }));
        } else if (name === 'remark') {
            setFormData(prev => ({ ...prev, remark: value }));
        } else if (name === 'opening_balance_amount') {
            setFormData(prev => ({
                ...prev,
                opening_balance: {
                    ...prev.opening_balance,
                    amount: value
                }
            }));
        } else if (name === 'opening_balance_type') {
            setFormData(prev => ({
                ...prev,
                opening_balance: {
                    ...prev.opening_balance,
                    type: value
                }
            }));
        }
    };

    // Handle date change for create
    const handleDateChange = (date) => {
        setFormData(prev => ({
            ...prev,
            opening_balance: {
                ...prev.opening_balance,
                date: date
            }
        }));
    };

    // Handle form input changes for edit
    const handleEditInputChange = (e) => {
        const { name, value } = e.target;
        
        if (name === 'name') {
            setEditFormData(prev => ({ ...prev, name: value }));
        } else if (name === 'remark') {
            setEditFormData(prev => ({ ...prev, remark: value }));
        } else if (name === 'opening_balance_amount') {
            setEditFormData(prev => ({
                ...prev,
                opening_balance: {
                    ...prev.opening_balance,
                    amount: value
                }
            }));
        } else if (name === 'opening_balance_type') {
            setEditFormData(prev => ({
                ...prev,
                opening_balance: {
                    ...prev.opening_balance,
                    type: value
                }
            }));
        }
    };

    // Handle date change for edit
    const handleEditDateChange = (date) => {
        setEditFormData(prev => ({
            ...prev,
            opening_balance: {
                ...prev.opening_balance,
                date: date
            }
        }));
    };

    // Handle create account
    const handleCreateAccount = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        // Validation
        if (!formData.name || !formData.name.trim()) {
            alert('Please enter account name');
            return;
        }
        if (!formData.opening_balance.amount || formData.opening_balance.amount === '') {
            alert('Please enter opening balance');
            return;
        }
        if (!formData.opening_balance.date) {
            alert('Please select opening date');
            return;
        }

        // Validate amount is a valid number
        const amount = parseFloat(formData.opening_balance.amount);
        if (isNaN(amount)) {
            alert('Please enter a valid opening balance amount');
            return;
        }

        setLoading(true);

        try {
            const headers = getHeaders();
            const payload = {
                name: formData.name.trim(),
                remark: formData.remark ? formData.remark.trim() : '',
                opening_balance: {
                    amount: amount,
                    date: formData.opening_balance.date instanceof Date 
                        ? formData.opening_balance.date.toISOString().split('T')[0]
                        : formData.opening_balance.date,
                    type: formData.opening_balance.type
                }
            };

            const response = await fetch(`${API_BASE_URL}/transaction/capital/create`, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(payload)
            });

            const result = await response.json();

            if (result.success) {
                setFormData({
                    name: '',
                    remark: '',
                    opening_balance: {
                        amount: '',
                        date: new Date(),
                        type: 'credit'
                    }
                });
                setShowAddModal(false);
                await fetchAccountList();
                alert('Account created successfully!');
            } else {
                alert(result.message || 'Failed to create account');
            }
        } catch (error) {
            console.error('Error creating account:', error);
            alert('An error occurred while creating the account');
        } finally {
            setLoading(false);
        }
    };

    // Handle edit account
    const handleEditAccount = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        // Validation
        if (!editFormData.name || !editFormData.name.trim()) {
            alert('Please enter account name');
            return;
        }
        if (!editFormData.opening_balance.amount || editFormData.opening_balance.amount === '') {
            alert('Please enter opening balance');
            return;
        }
        if (!editFormData.opening_balance.date) {
            alert('Please select opening date');
            return;
        }

        // Validate amount is a valid number
        const amount = parseFloat(editFormData.opening_balance.amount);
        if (isNaN(amount)) {
            alert('Please enter a valid opening balance amount');
            return;
        }

        setLoading(true);

        try {
            const headers = getHeaders();
            const payload = {
                capital_id: editFormData.capital_id,
                name: editFormData.name.trim(),
                remark: editFormData.remark ? editFormData.remark.trim() : '',
                opening_balance: {
                    amount: amount,
                    date: editFormData.opening_balance.date instanceof Date 
                        ? editFormData.opening_balance.date.toISOString().split('T')[0]
                        : editFormData.opening_balance.date,
                    type: editFormData.opening_balance.type
                }
            };

            const response = await fetch(`${API_BASE_URL}/transaction/capital/edit`, {
                method: 'PUT',
                headers: headers,
                body: JSON.stringify(payload)
            });

            const result = await response.json();

            if (result.success) {
                setShowEditModal(false);
                await fetchAccountList();
                alert('Account updated successfully!');
            } else {
                alert(result.message || 'Failed to update account');
            }
        } catch (error) {
            console.error('Error updating account:', error);
            alert('An error occurred while updating the account');
        } finally {
            setLoading(false);
        }
    };

    // Handle view details
    const handleViewDetails = async (capitalId) => {
        setLoading(true);
        try {
            const headers = getHeaders();
            const response = await fetch(`${API_BASE_URL}/transaction/capital/details?capital_id=${capitalId}`, {
                method: 'GET',
                headers: headers
            });

            const result = await response.json();

            if (result.success) {
                setSelectedAccount(result.data);
                setShowViewModal(true);
            } else {
                alert('Failed to fetch account details');
            }
        } catch (error) {
            console.error('Error fetching account details:', error);
            alert('An error occurred while fetching account details');
        } finally {
            setLoading(false);
        }
    };

    // Handle edit button click - fetch details first
    const handleEditClick = async (capitalId) => {
        setLoading(true);
        try {
            const headers = getHeaders();
            const response = await fetch(`${API_BASE_URL}/transaction/capital/details?capital_id=${capitalId}`, {
                method: 'GET',
                headers: headers
            });

            const result = await response.json();

            if (result.success) {
                const account = result.data;
                setEditFormData({
                    capital_id: account.capital_id,
                    name: account.name,
                    remark: account.remark || '',
                    opening_balance: {
                        amount: Math.abs(account.balance).toString(),
                        date: new Date(),
                        type: account.balance < 0 ? 'debit' : 'credit'
                    }
                });
                setShowEditModal(true);
            } else {
                alert('Failed to fetch account details');
            }
        } catch (error) {
            console.error('Error fetching account details:', error);
            alert('An error occurred while fetching account details');
        } finally {
            setLoading(false);
        }
    };

    // Toggle row dropdown
    const toggleRowDropdown = (accountId) => {
        setActiveRowDropdown(activeRowDropdown === accountId ? null : accountId);
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

    // Skeleton loader component
    const SkeletonRow = () => (
        <tr className="border-b border-slate-100 animate-pulse">
            <td className="p-3 text-center">
                <div className="h-4 bg-slate-200 rounded w-6 mx-auto"></div>
            </td>
            <td className="p-3 text-center">
                <div className="h-4 bg-slate-200 rounded w-32 mx-auto"></div>
            </td>
            <td className="p-3 text-center">
                <div className="h-4 bg-slate-200 rounded w-24 mx-auto"></div>
            </td>
            <td className="p-3 text-center">
                <div className="h-6 bg-slate-200 rounded w-16 mx-auto"></div>
            </td>
            <td className="p-3 text-center">
                <div className="h-6 bg-slate-200 rounded w-10 mx-auto"></div>
            </td>
        </tr>
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
                <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    {/* Header Stats Card */}
                    <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2 }}
                        className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-4 text-white shadow-md mb-4"
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-blue-100 text-xs font-medium">Total Capital</p>
                                <h3 className="text-lg font-bold mt-1">₹{formatCurrency(totalCapital)}</h3>
                                <p className="text-blue-100 text-xs mt-1">
                                    {pagination.total} Capital Accounts
                                </p>
                            </div>
                            <FiTrendingUp className="w-5 h-5 opacity-80" />
                        </div>
                    </motion.div>

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
                                            <FiTrendingUp className="w-4 h-4 text-blue-600" />
                                        </div>
                                        <h5 className="text-lg font-bold text-slate-800">
                                            Capital Accounts
                                        </h5>
                                    </div>
                                    <p className="text-slate-600 text-xs font-medium">
                                        Manage all capital accounts and investments
                                    </p>
                                </div>

                                <div className="flex gap-2">
                                    {/* Search Input */}
                                    <div className="relative">
                                        <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                        <input
                                            type="text"
                                            placeholder="Search accounts..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-64"
                                        />
                                    </div>

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
                                                            onClick={() => handleOtherExport('print')}
                                                            className="flex items-center w-full px-3 py-2 text-sm text-slate-700 hover:bg-blue-50 transition-all duration-150 group"
                                                        >
                                                            <div className="p-1.5 bg-slate-50 rounded mr-2 group-hover:bg-slate-100 transition-colors">
                                                                <FiPrinter className="w-3.5 h-3.5 text-slate-600" />
                                                            </div>
                                                            <div className="text-left">
                                                                <div className="font-medium text-xs">Print Report</div>
                                                            </div>
                                                        </button>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>

                                    {/* Add Account Button */}
                                    <motion.button
                                        onClick={() => setShowAddModal(true)}
                                        className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white rounded-lg text-xs font-semibold transition-all duration-200 flex items-center gap-2 shadow-sm hover:shadow"
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        <FiPlus className="w-4 h-4" />
                                        Add Account
                                    </motion.button>
                                </div>
                            </div>
                        </div>

                        {/* Table Container */}
                        <div className="w-full overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="bg-gradient-to-r from-slate-50 to-slate-100">
                                        <th className="text-center p-3 font-semibold text-slate-700 text-[10px] uppercase tracking-wider w-[5%]">
                                            Sl No
                                        </th>
                                        <th className="text-center p-3 font-semibold text-slate-700 text-[10px] uppercase tracking-wider w-[30%]">
                                            Account Name
                                        </th>
                                        <th className="text-center p-3 font-semibold text-slate-700 text-[10px] uppercase tracking-wider w-[30%]">
                                            Remark
                                        </th>
                                        <th className="text-center p-3 font-semibold text-slate-700 text-[10px] uppercase tracking-wider w-[20%]">
                                            Balance
                                        </th>
                                        <th className="text-center p-3 font-semibold text-slate-700 text-[10px] uppercase tracking-wider w-[15%]">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-slate-100">
                                    {loading && accounts.length === 0 ? (
                                        [...Array(5)].map((_, index) => <SkeletonRow key={index} />)
                                    ) : accounts.length === 0 ? (
                                        <tr>
                                            <td colSpan="5" className="text-center py-8 text-slate-500">
                                                <div className="flex flex-col items-center justify-center">
                                                    <div className="p-3 bg-slate-100 rounded-full mb-3">
                                                        <FiTrendingUp className="w-8 h-8 text-slate-400" />
                                                    </div>
                                                    <p className="text-slate-600 text-sm font-medium mb-1">No capital accounts found</p>
                                                    <p className="text-slate-500 text-xs mb-4">Start by creating your first capital account</p>
                                                    <motion.button
                                                        onClick={() => setShowAddModal(true)}
                                                        className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg text-xs font-semibold hover:shadow transition-all duration-200"
                                                        whileHover={{ scale: 1.02 }}
                                                        whileTap={{ scale: 0.98 }}
                                                    >
                                                        Create Your First Capital Account
                                                    </motion.button>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        accounts.map((account, index) => {
                                            const isDropdownOpen = activeRowDropdown === account.capital_id;
                                            const isNegativeBalance = Number(account.balance) < 0;
                                            const displayBalance = isNegativeBalance ? -account.balance : account.balance;

                                            return (
                                                <motion.tr
                                                    key={account.capital_id}
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    transition={{ duration: 0.15 }}
                                                    className="hover:bg-blue-50/20 transition-colors duration-150"
                                                >
                                                    <td className="text-center p-3 align-middle">
                                                        <div className="text-slate-700 font-medium text-xs">
                                                            {(pagination.page - 1) * pagination.limit + index + 1}
                                                        </div>
                                                    </td>
                                                    <td className="text-center p-3 align-middle">
                                                        <div className="px-2">
                                                            <div className="text-slate-800 font-semibold text-xs truncate">
                                                                {account.name}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="text-center p-3 align-middle">
                                                        <div className="px-2">
                                                            <div className="text-slate-500 text-[10px] italic overflow-hidden text-ellipsis whitespace-nowrap max-w-[150px] text-center mx-auto">
                                                                {account.remark || '-'}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="text-center p-3 align-middle">
                                                        <div className={`inline-flex items-center justify-center font-bold px-3 py-1.5 rounded text-xs ${isNegativeBalance ? 'bg-gradient-to-r from-red-50 to-red-100 text-red-800' : 'bg-gradient-to-r from-green-50 to-green-100 text-green-800'}`}>
                                                            {isNegativeBalance ? '-' : ''}₹{formatCurrency(displayBalance)}
                                                        </div>
                                                    </td>
                                                    <td className="text-center p-3 align-middle">
                                                        <div className="flex items-center justify-center gap-2">
                                                            {/* View Button */}
                                                            <motion.button
                                                                onClick={() => handleViewDetails(account.capital_id)}
                                                                className="p-1.5 text-blue-600 hover:text-blue-700 rounded-lg hover:bg-blue-50 transition-colors duration-150 border border-blue-200 hover:border-blue-300"
                                                                whileHover={{ scale: 1.05 }}
                                                                whileTap={{ scale: 0.95 }}
                                                                title="View Details"
                                                            >
                                                                <FiEye className="w-3.5 h-3.5" />
                                                            </motion.button>

                                                            {/* Dropdown Button */}
                                                            <div className="dropdown-container relative">
                                                                <motion.button
                                                                    className="p-1.5 text-slate-500 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors duration-150 border border-slate-200 hover:border-blue-300"
                                                                    onClick={() => toggleRowDropdown(account.capital_id)}
                                                                    whileHover={{ scale: 1.05 }}
                                                                    whileTap={{ scale: 0.95 }}
                                                                    title="More Actions"
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
                                                                                    onClick={() => {
                                                                                        handleEditClick(account.capital_id);
                                                                                        setActiveRowDropdown(null);
                                                                                    }}
                                                                                    className="flex items-center w-full px-3 py-2 text-xs text-slate-700 hover:bg-blue-50 transition-colors duration-150"
                                                                                >
                                                                                    <div className="p-1 bg-blue-50 rounded mr-2">
                                                                                        <FiEdit className="w-3 h-3 text-blue-500" />
                                                                                    </div>
                                                                                    <div className="text-left">
                                                                                        <div className="font-medium">Edit Account</div>
                                                                                    </div>
                                                                                </button>
                                                                                <div className="border-t border-slate-100 mt-1 pt-1">
                                                                                    <a
                                                                                        href={`/view-capital-account-ledger?capital_id=${account.capital_id}`}
                                                                                        className="flex items-center w-full px-3 py-2 text-xs text-slate-700 hover:bg-blue-50 transition-colors duration-150"
                                                                                        onClick={() => setActiveRowDropdown(null)}
                                                                                    >
                                                                                        <div className="p-1 bg-green-50 rounded mr-2">
                                                                                            <FiFileText className="w-3 h-3 text-green-500" />
                                                                                        </div>
                                                                                        <div className="text-left">
                                                                                            <div className="font-medium">View Ledger</div>
                                                                                        </div>
                                                                                    </a>
                                                                                    <button
                                                                                        className="flex items-center w-full px-3 py-2 text-xs text-slate-700 hover:bg-blue-50 transition-colors duration-150"
                                                                                        onClick={() => handleOtherExport('print', account)}
                                                                                    >
                                                                                        <div className="p-1 bg-slate-50 rounded mr-2">
                                                                                            <FiPrinter className="w-3 h-3 text-slate-600" />
                                                                                        </div>
                                                                                        <div className="text-left">
                                                                                            <div className="font-medium">Print</div>
                                                                                        </div>
                                                                                    </button>
                                                                                </div>
                                                                            </div>
                                                                        </motion.div>
                                                                    )}
                                                                </AnimatePresence>
                                                            </div>
                                                        </div>
                                                    </td>
                                                </motion.tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination Component */}
                        {!loading && accounts.length > 0 && (
                            <Pagination
                                pagination={pagination}
                                onPageChange={handlePageChange}
                                onLimitChange={handleLimitChange}
                                onCustomPageChange={handleCustomPageChange}
                                loading={loading}
                                showPageInfo={true}
                                showLimitSelector={true}
                                showCustomInput={true}
                            />
                        )}
                    </motion.div>
                </div>
            </div>

            {/* Add Account Modal */}
            <ModalContent
                isOpen={showAddModal}
                onClose={() => setShowAddModal(false)}
                onSubmit={handleCreateAccount}
                formData={formData}
                onChange={handleInputChange}
                onDateChange={handleDateChange}
                loading={loading}
                mode="add"
                title="Add Capital Account"
            />

            {/* Edit Account Modal */}
            <ModalContent
                isOpen={showEditModal}
                onClose={() => setShowEditModal(false)}
                onSubmit={handleEditAccount}
                formData={editFormData}
                onChange={handleEditInputChange}
                onDateChange={handleEditDateChange}
                loading={loading}
                mode="edit"
                title="Edit Capital Account"
            />

            {/* View Details Modal */}
            <ViewDetailsModal
                isOpen={showViewModal}
                onClose={() => setShowViewModal(false)}
                account={selectedAccount}
                formatCurrency={formatCurrency}
            />

            {/* Inline Export Modal */}
            <InlineExportModal
                isOpen={exportModalOpen}
                onClose={() => { setExportModalOpen(false); setExportData([]); setExportColumns([]); }}
                exportData={exportData}
                columns={exportColumns}
                jobType="capital_accounts_report"
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

export default CapitalAccounts;