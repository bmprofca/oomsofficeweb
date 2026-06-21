// pages/client/ClientLedgerTab.jsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FiDollarSign,
    FiCalendar,
    FiDownload,
    FiShare2,
    FiEdit,
    FiX,
    FiRefreshCw,
    FiChevronLeft,
    FiChevronRight,
    FiSearch,
    FiAlertCircle,
    FiUser,
    FiFileText,
    FiPlus
} from 'react-icons/fi';
import axios from 'axios';
import getHeaders from "../utils/get-headers";
import API_BASE_URL from "../utils/api-controller";
import toast from 'react-hot-toast';
import { checkPermissionSync } from '../utils/permission-helper';

const ClientLedgerTab = ({ 
    taskId,
    task_id,
    clientId, // Required: client username from task data
    clientName // Optional: client name for display
}) => {
    // Use either taskId or task_id
    const effectiveTaskId = taskId || task_id;
    
    console.log('ClientLedgerTab initialized with:', {
        taskId: effectiveTaskId,
        clientId,
        clientName
    });
    
    const [ledgerData, setLedgerData] = useState({
        period: "N/A - N/A",
        entries: [],
        openingBalance: 0,
        totalDebit: 0,
        totalCredit: 0,
        closingBalance: 0
    });
    
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [showDateModal, setShowDateModal] = useState(false);
    const [pagination, setPagination] = useState({
        page_no: 1,
        limit: 20,
        total: 0,
        total_pages: 1,
        is_last_page: true
    });
    
    // Date range state (last 30 days by default)
    const [dateRange, setDateRange] = useState({
        startDate: '',
        endDate: ''
    });
    
    const [tempDateRange, setTempDateRange] = useState({
        startDate: '',
        endDate: ''
    });

    // Filter state
    const [filters, setFilters] = useState({
        search: '',
        type: ''
    });

    // Transaction types for filter
    const transactionTypes = [
        { value: '', label: 'All Types' },
        { value: 'RECEIVE', label: 'Receive' },
        { value: 'PAYMENT', label: 'Payment' },
        { value: 'SALE', label: 'Sale' },
        { value: 'PURCHASE', label: 'Purchase' },
        { value: 'EXPENSE', label: 'Expense' },
        { value: 'CONTRA', label: 'Contra' }
    ];

    // Initialize date range to last 30 days
    useEffect(() => {
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - 30);
        
        const startStr = start.toISOString().split('T')[0];
        const endStr = end.toISOString().split('T')[0];
        
        setDateRange({
            startDate: startStr,
            endDate: endStr
        });
        setTempDateRange({
            startDate: startStr,
            endDate: endStr
        });
    }, []);

    // Fetch ledger data from API
    const fetchLedger = async (page = 1) => {
        if (!clientId) {
            setError('Client ID is required. Please select a client first.');
            return;
        }

        setLoading(true);
        setError(null);
        
        try {
            const headers = getHeaders();
            if (!headers) throw new Error('Authentication failed');
            
            // Build query parameters
            const params = new URLSearchParams({
                page_no: page,
                limit: pagination.limit,
                from_date: dateRange.startDate,
                to_date: dateRange.endDate,
                party_type: 'client',
                party_id: clientId
            });

            // Add task_id if available
            if (effectiveTaskId) {
                params.append('task_id', effectiveTaskId);
            }

            // Add filters if present
            if (filters.search) {
                params.append('search', filters.search);
            }
            if (filters.type) {
                params.append('transaction_type', filters.type);
            }

            console.log('Fetching ledger from:', `${API_BASE_URL}/transaction/list?${params}`);

            const response = await axios.get(
                `${API_BASE_URL}/transaction/list?${params}`,
                { headers }
            );
            
            console.log('Ledger response:', response.data);

            if (response.data?.success) {
                const transactions = response.data.data || [];
                const openingBal = response.data.opening_balance || 0;
                
                // Calculate totals
                let totalDebit = 0;
                let totalCredit = 0;
                let closingBalance = openingBal;

                transactions.forEach(transaction => {
                    if (transaction.type === "0") { // Debit
                        totalDebit += transaction.amount;
                    } else if (transaction.type === "1") { // Credit
                        totalCredit += transaction.amount;
                    }
                    closingBalance = transaction.new_balance;
                });

                setLedgerData({
                    period: `${formatDateForDisplay(dateRange.startDate)} - ${formatDateForDisplay(dateRange.endDate)}`,
                    entries: transactions,
                    openingBalance: openingBal,
                    totalDebit: totalDebit,
                    totalCredit: totalCredit,
                    closingBalance: closingBalance
                });

                // Set pagination from response meta
                setPagination({
                    page_no: response.data.meta?.page_no || page,
                    limit: response.data.meta?.limit || 20,
                    total: response.data.meta?.total || transactions.length,
                    total_pages: response.data.meta?.total_pages || 1,
                    is_last_page: response.data.meta?.is_last_page || true
                });
            } else {
                setError(response.data?.message || 'Failed to fetch ledger');
            }
        } catch (error) {
            console.error('Error fetching ledger:', error);
            console.error('Error response:', error.response?.data);
            setError(error.response?.data?.message || error.message);
        } finally {
            setLoading(false);
        }
    };

    // Export ledger data
    const handleExport = async (format) => {
        if (!clientId) {
            toast.error('Client ID is required');
            return;
        }

        try {
            const headers = getHeaders();
            if (!headers) throw new Error('Authentication failed');

            const params = new URLSearchParams({
                from_date: dateRange.startDate,
                to_date: dateRange.endDate,
                party_type: 'client',
                party_id: clientId,
                format: format
            });

            if (effectiveTaskId) {
                params.append('task_id', effectiveTaskId);
            }

            console.log(`Exporting ${format} from:`, `${API_BASE_URL}/transaction/export?${params}`);

            const response = await axios.get(
                `${API_BASE_URL}/transaction/export?${params}`,
                { 
                    headers,
                    responseType: 'blob' // Important for file download
                }
            );

            // Create download link
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `ledger_${clientId}_${dateRange.startDate}_to_${dateRange.endDate}.${format}`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);

            toast.success(`${format.toUpperCase()} exported successfully`);
        } catch (error) {
            console.error('Error exporting ledger:', error);
            setError(error.response?.data?.message || error.message);
            toast.error('Failed to export ledger');
        }
    };

    // Fetch on mount and when dependencies change
    useEffect(() => {
        if (clientId && dateRange.startDate && dateRange.endDate) {
            fetchLedger(1);
        }
    }, [clientId, dateRange.startDate, dateRange.endDate, filters.type, filters.search]);

    // Refresh data
    const handleRefresh = () => {
        fetchLedger(pagination.page_no);
        toast.success('Data refreshed');
    };

    const formatDateForDisplay = (dateStr) => {
        if (!dateStr) return 'N/A';
        try {
            const date = new Date(dateStr);
            return date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            });
        } catch (e) {
            return dateStr;
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        try {
            return new Date(dateString).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        } catch (e) {
            return '-';
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(Math.abs(amount || 0));
    };

    const handleDateUpdate = () => {
        setDateRange(tempDateRange);
        setShowDateModal(false);
        toast.success('Date range updated');
    };

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= pagination.total_pages) {
            fetchLedger(newPage);
        }
    };

    const clearFilters = () => {
        setFilters({
            search: '',
            type: ''
        });
        toast.success('Filters cleared');
    };

    const getTransactionTypeColor = (type, transactionType) => {
        if (type === "0") { // Debit
            return 'text-blue-600 bg-blue-50 border-blue-200';
        } else if (type === "1") { // Credit
            return 'text-orange-600 bg-orange-50 border-orange-200';
        }
        return 'text-gray-600 bg-gray-50 border-gray-200';
    };

    const getTransactionTypeLabel = (transaction) => {
        if (transaction.transaction_type) {
            return transaction.transaction_type.toUpperCase();
        }
        return transaction.type === "0" ? 'DEBIT' : 'CREDIT';
    };

    const getParticularsDisplay = (transaction) => {
        if (transaction.create_by) {
            return (
                <div className="flex flex-col">
                    <div className="font-medium text-gray-900">{transaction.create_by.name || 'Company'}</div>
                    <div className="text-xs text-gray-500">{transaction.create_by.email || ''}</div>
                </div>
            );
        }
        return <span className="text-sm text-gray-500">N/A</span>;
    };

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                    <h2 className="text-xl font-semibold text-gray-900">Client Ledger</h2>
                    <p className="text-sm text-gray-500 mt-1">
                        {clientName && `Client: ${clientName}`}
                        {clientId && !clientName && `Client ID: ${clientId}`}
                        {effectiveTaskId && ` • Task ID: ${effectiveTaskId}`}
                        {pagination.total > 0 && ` • Total: ${pagination.total} entries`}
                    </p>
                    {!clientId && (
                        <p className="text-xs text-red-500 mt-1">
                            ⚠️ No client selected. Please select a client to view ledger.
                        </p>
                    )}
                </div>
                
                {/* Filters and Actions */}
                <div className="flex flex-wrap gap-2">
                    {/* Refresh Button */}
                    <button
                        onClick={handleRefresh}
                        disabled={loading || !clientId}
                        className="p-2 text-gray-600 hover:text-gray-900 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Refresh"
                    >
                        <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>

                    {/* Date Range Display */}
                    <button
                        onClick={() => setShowDateModal(true)}
                        disabled={!clientId}
                        className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-xl text-sm hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <FiCalendar className="w-4 h-4 text-gray-500" />
                        <span className="text-gray-700">
                            {ledgerData.period}
                        </span>
                        <FiEdit className="w-3 h-3 text-gray-400" />
                    </button>

                    {/* Search */}
                    <div className="relative">
                        <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Search..."
                            value={filters.search}
                            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                            disabled={!clientId}
                            className="pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent w-40 outline-none transition-all duration-200 disabled:bg-gray-50 disabled:cursor-not-allowed"
                        />
                    </div>

                    {/* Type Filter */}
                    <select
                        value={filters.type}
                        onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
                        disabled={!clientId}
                        className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200 disabled:bg-gray-50 disabled:cursor-not-allowed"
                    >
                        {transactionTypes.map(option => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>

                    {/* Clear Filters */}
                    {(filters.search || filters.type) && (
                        <button
                            onClick={clearFilters}
                            disabled={!clientId}
                            className="px-3 py-2 text-gray-600 hover:text-gray-900 border border-gray-200 rounded-xl text-sm hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Clear
                        </button>
                    )}

                    {/* Export Buttons */}
                    <button
                        onClick={() => handleExport('pdf')}
                        disabled={!clientId || ledgerData.entries.length === 0 || !checkPermissionSync('task_fees_view')}
                        className="p-2 text-gray-600 hover:text-gray-900 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Export PDF"
                    >
                        <FiDownload className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => handleExport('excel')}
                        disabled={!clientId || ledgerData.entries.length === 0 || !checkPermissionSync('task_fees_view')}
                        className="p-2 text-gray-600 hover:text-gray-900 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Export Excel"
                    >
                        <FiShare2 className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-sm text-gray-500 mb-1">Opening Balance</p>
                    <p className={`text-xl font-bold ${ledgerData.openingBalance >= 0 ? 'text-blue-600' : 'text-orange-600'} ${!checkPermissionSync('task_fees_view') ? 'blur-[3.5px] select-none' : ''}`}>
                        ₹{formatCurrency(ledgerData.openingBalance)}
                        {ledgerData.openingBalance >= 0 ? 
                            <span className="text-xs ml-1 text-blue-600">(Receivable)</span> : 
                            <span className="text-xs ml-1 text-orange-600">(Payable)</span>
                        }
                    </p>
                </div>

                <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-sm text-gray-500 mb-1">Total Debit</p>
                    <p className={`text-xl font-bold text-blue-600 ${!checkPermissionSync('task_fees_view') ? 'blur-[3.5px] select-none' : ''}`}>
                        ₹{formatCurrency(ledgerData.totalDebit)}
                    </p>
                </div>

                <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-sm text-gray-500 mb-1">Total Credit</p>
                    <p className={`text-xl font-bold text-orange-600 ${!checkPermissionSync('task_fees_view') ? 'blur-[3.5px] select-none' : ''}`}>
                        ₹{formatCurrency(ledgerData.totalCredit)}
                    </p>
                </div>

                <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-sm text-gray-500 mb-1">Closing Balance</p>
                    <p className={`text-xl font-bold ${ledgerData.closingBalance >= 0 ? 'text-blue-600' : 'text-orange-600'} ${!checkPermissionSync('task_fees_view') ? 'blur-[3.5px] select-none' : ''}`}>
                        ₹{formatCurrency(ledgerData.closingBalance)}
                        {ledgerData.closingBalance >= 0 ? 
                            <span className="text-xs ml-1 text-blue-600">(Receivable)</span> : 
                            <span className="text-xs ml-1 text-orange-600">(Payable)</span>
                        }
                    </p>
                </div>
            </div>

            {/* Error Display */}
            {error && !loading && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
                    <FiAlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                    <p className="text-red-600 flex-1">{error}</p>
                    <button 
                        onClick={() => fetchLedger(1)}
                        className="text-sm text-red-600 hover:text-red-700 font-medium"
                    >
                        Retry
                    </button>
                </div>
            )}

            {/* Table */}
            <div className="overflow-x-auto">
                {loading ? (
                    <div className="text-center py-12">
                        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 mb-4">
                            <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                        <p className="text-gray-600">Loading ledger entries...</p>
                    </div>
                ) : !clientId ? (
                    <div className="text-center py-12">
                        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 mb-4">
                            <FiUser className="w-5 h-5 text-gray-400" />
                        </div>
                        <p className="text-gray-600 mb-2">No client selected</p>
                        <p className="text-sm text-gray-500">Please select a client to view ledger</p>
                    </div>
                ) : (
                    <>
                        <table className="w-full text-sm text-left text-gray-700">
                            <thead className="bg-gray-50 text-gray-900">
                                <tr>
                                    <th className="px-4 py-3 font-semibold rounded-l-xl">#</th>
                                    <th className="px-4 py-3 font-semibold">Date</th>
                                    <th className="px-4 py-3 font-semibold">Particulars</th>
                                    <th className="px-4 py-3 font-semibold">Type</th>
                                    <th className="px-4 py-3 font-semibold">Voucher No</th>
                                    <th className="px-4 py-3 font-semibold text-right">Debit</th>
                                    <th className="px-4 py-3 font-semibold text-right">Credit</th>
                                    <th className="px-4 py-3 font-semibold text-right rounded-r-xl">Balance</th>
                                </tr>
                            </thead>
                            <tbody>
                                {/* Opening Balance Row */}
                                <tr className="bg-blue-50/50 font-medium border-b border-gray-200">
                                    <td className="px-4 py-3 text-gray-600"></td>
                                    <td className="px-4 py-3 text-gray-800" colSpan="3">Opening Balance</td>
                                    <td className="px-4 py-3"></td>
                                    <td className="px-4 py-3 text-right text-gray-400">-</td>
                                    <td className="px-4 py-3 text-right text-gray-400">-</td>
                                    <td className={`px-4 py-3 text-right font-bold ${ledgerData.openingBalance >= 0 ? 'text-blue-600' : 'text-orange-600'} ${!checkPermissionSync('task_fees_view') ? 'blur-[3.5px] select-none' : ''}`}>
                                        ₹{formatCurrency(ledgerData.openingBalance)}
                                    </td>
                                </tr>

                                <AnimatePresence>
                                    {ledgerData.entries.map((entry, index) => (
                                        <motion.tr
                                            key={entry.transaction_id || index}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            transition={{ delay: index * 0.02 }}
                                            className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                                        >
                                            <td className="px-4 py-3">
                                                {((pagination.page_no - 1) * pagination.limit) + index + 1}
                                            </td>
                                            <td className="px-4 py-3">
                                                {formatDate(entry.transaction_date)}
                                            </td>
                                            <td className="px-4 py-3">
                                                {getParticularsDisplay(entry)}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`px-3 py-1 rounded-lg text-xs font-medium border ${getTransactionTypeColor(entry.type, entry.transaction_type)}`}>
                                                    {getTransactionTypeLabel(entry)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="text-sm font-mono text-gray-600">
                                                    {entry.invoice_no || 'N/A'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                {entry.type === "0" ? (
                                                    <span className={`text-sm font-semibold text-blue-600 ${!checkPermissionSync('task_fees_view') ? 'blur-[3.5px] select-none' : ''}`}>
                                                        ₹{formatCurrency(entry.amount)}
                                                    </span>
                                                ) : (
                                                    <span className="text-sm text-gray-400">-</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                {entry.type === "1" ? (
                                                    <span className={`text-sm font-semibold text-orange-600 ${!checkPermissionSync('task_fees_view') ? 'blur-[3.5px] select-none' : ''}`}>
                                                        ₹{formatCurrency(entry.amount)}
                                                    </span>
                                                ) : (
                                                    <span className="text-sm text-gray-400">-</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <span className={`text-sm font-bold ${entry.new_balance >= 0 ? 'text-blue-600' : 'text-orange-600'} ${!checkPermissionSync('task_fees_view') ? 'blur-[3.5px] select-none' : ''}`}>
                                                    ₹{formatCurrency(entry.new_balance)}
                                                </span>
                                            </td>
                                        </motion.tr>
                                    ))}
                                </AnimatePresence>

                                {/* Total Row */}
                                <tr className="bg-gray-100 font-bold border-t-2 border-gray-300">
                                    <td className="px-4 py-3 text-gray-800" colSpan="5">Total</td>
                                    <td className={`px-4 py-3 text-right text-blue-600 ${!checkPermissionSync('task_fees_view') ? 'blur-[3.5px] select-none' : ''}`}>₹{formatCurrency(ledgerData.totalDebit)}</td>
                                    <td className={`px-4 py-3 text-right text-orange-600 ${!checkPermissionSync('task_fees_view') ? 'blur-[3.5px] select-none' : ''}`}>₹{formatCurrency(ledgerData.totalCredit)}</td>
                                    <td className={`px-4 py-3 text-right ${ledgerData.closingBalance >= 0 ? 'text-blue-600' : 'text-orange-600'} ${!checkPermissionSync('task_fees_view') ? 'blur-[3.5px] select-none' : ''}`}>
                                        ₹{formatCurrency(ledgerData.closingBalance)}
                                    </td>
                                </tr>
                            </tbody>
                        </table>

                        {ledgerData.entries.length === 0 && !loading && !error && (
                            <div className="text-center py-12">
                                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 mb-4">
                                    <FiDollarSign className="w-5 h-5 text-gray-400" />
                                </div>
                                <p className="text-gray-600 mb-2">No transactions found</p>
                                <p className="text-sm text-gray-500">Try adjusting your filters or date range</p>
                            </div>
                        )}

                        {/* Pagination */}
                        {pagination.total_pages > 1 && (
                            <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
                                <p className="text-sm text-gray-600">
                                    Showing {((pagination.page_no - 1) * pagination.limit) + 1} to {Math.min(pagination.page_no * pagination.limit, pagination.total)} of {pagination.total} entries
                                </p>
                                <div className="flex items-center gap-2">
                                    <motion.button
                                        onClick={() => handlePageChange(pagination.page_no - 1)}
                                        disabled={pagination.page_no === 1 || loading}
                                        className={`p-2 rounded-lg transition-colors ${
                                            pagination.page_no === 1 || loading
                                                ? 'text-gray-300 cursor-not-allowed' 
                                                : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                                        }`}
                                        whileHover={pagination.page_no !== 1 && !loading ? { scale: 1.05 } : {}}
                                        whileTap={pagination.page_no !== 1 && !loading ? { scale: 0.95 } : {}}
                                    >
                                        <FiChevronLeft className="w-4 h-4" />
                                    </motion.button>
                                    <span className="px-3 py-1 bg-blue-600 text-white rounded-lg text-sm">
                                        {pagination.page_no}
                                    </span>
                                    <motion.button
                                        onClick={() => handlePageChange(pagination.page_no + 1)}
                                        disabled={pagination.is_last_page || loading}
                                        className={`p-2 rounded-lg transition-colors ${
                                            pagination.is_last_page || loading
                                                ? 'text-gray-300 cursor-not-allowed' 
                                                : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                                        }`}
                                        whileHover={!pagination.is_last_page && !loading ? { scale: 1.05 } : {}}
                                        whileTap={!pagination.is_last_page && !loading ? { scale: 0.95 } : {}}
                                    >
                                        <FiChevronRight className="w-4 h-4" />
                                    </motion.button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Date Range Modal */}
            <AnimatePresence>
                {showDateModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
                        onClick={(e) => e.target === e.currentTarget && setShowDateModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
                        >
                            {/* Header */}
                            <div className="px-6 py-4 border-b bg-blue-50">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-lg font-semibold text-gray-900">
                                        Update Date Range
                                    </h3>
                                    <button
                                        onClick={() => setShowDateModal(false)}
                                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
                                    >
                                        <FiX className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            {/* Content */}
                            <div className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Start Date
                                    </label>
                                    <input
                                        type="date"
                                        value={tempDateRange.startDate}
                                        onChange={(e) => setTempDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                                        className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200"
                                        max={tempDateRange.endDate}
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        End Date
                                    </label>
                                    <input
                                        type="date"
                                        value={tempDateRange.endDate}
                                        onChange={(e) => setTempDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                                        className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200"
                                        min={tempDateRange.startDate}
                                        max={new Date().toISOString().split('T')[0]}
                                    />
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3">
                                <button
                                    onClick={() => setShowDateModal(false)}
                                    className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium transition-colors"
                                >
                                    Cancel
                                </button>
                                <motion.button
                                    onClick={handleDateUpdate}
                                    disabled={!tempDateRange.startDate || !tempDateRange.endDate}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    Update
                                </motion.button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ClientLedgerTab;