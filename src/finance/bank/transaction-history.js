// pages/TransactionHistory.jsx
import React, { useState, useEffect, useCallback, forwardRef, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Header, Sidebar } from '../../components/header';
import {
    FiArrowLeft,
    FiCalendar,
    FiRepeat,
    FiDownload,
    FiPrinter,
    FiX,
    FiRefreshCw,
    FiPlus,
    FiUser,
    FiDollarSign,
    FiFileText,
    FiShoppingBag,
    FiTruck,
    FiHome,
    FiGlobe,
    FiCreditCard,
    FiMoreVertical,
    FiEdit2,
    FiFile,
    FiEye
} from 'react-icons/fi';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import API_BASE_URL from '../../utils/api-controller';
import getHeaders from '../../utils/get-headers';
import axios from 'axios';
import { TransactionModalManager } from './bank-modals';
import DatePicker from 'react-datepicker';
import { Calendar, X, ChevronDown } from 'lucide-react';
import "react-datepicker/dist/react-datepicker.css";

// Custom input component for date range
const CustomInput = forwardRef(({ value, onClick, placeholder, onClear, isOpen }, ref) => (
    <div className="relative group" onClick={onClick} ref={ref}>
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Calendar className="h-4 w-4 text-indigo-500" />
        </div>
        <input
            type="text"
            readOnly
            className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white text-gray-900 text-sm cursor-pointer hover:border-indigo-400 transition-all"
            placeholder={placeholder}
            value={value}
        />
        <div className="absolute inset-y-0 right-0 pr-2 flex items-center">
            {value && value !== 'Select date range' && (
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        onClear();
                    }}
                    className="flex items-center text-gray-400 hover:text-red-500 transition-colors mr-1"
                >
                    <X className="h-4 w-4" />
                </button>
            )}
            <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
    </div>
));

// DateRangePicker Component - Compact version with dropdown
const DateRangePicker = ({
    startDate,
    endDate,
    onStartDateChange,
    onEndDateChange,
    minDate,
    maxDate
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [localStartDate, setLocalStartDate] = useState(startDate ? new Date(startDate + 'T12:00:00') : null);
    const [localEndDate, setLocalEndDate] = useState(endDate ? new Date(endDate + 'T12:00:00') : null);
    const [showCustomPicker, setShowCustomPicker] = useState(false);
    const dropdownRef = useRef(null);
    const startDatePickerRef = useRef(null);
    const endDatePickerRef = useRef(null);

    // Quick date filters
    const quickDateFilters = [
        { label: 'Current Month', type: 'currentMonth' },
        { label: 'Last 7 Days', type: 'last7Days' },
        { label: 'Last Month', type: 'lastMonth' },
        { label: 'Last 3 Months', type: 'last3Months' },
        { label: 'Last 6 Months', type: 'last6Months' },
        { label: 'Last Year', type: 'lastYear' },
    ];
    
    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            const isCalendarPopper = event.target.closest('.react-datepicker-popper');
            
            if (dropdownRef.current && !dropdownRef.current.contains(event.target) && !isCalendarPopper) {
                setIsOpen(false);
                setShowCustomPicker(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Update local state when props change
    useEffect(() => {
        setLocalStartDate(startDate ? new Date(startDate + 'T12:00:00') : null);
        setLocalEndDate(endDate ? new Date(endDate + 'T12:00:00') : null);
    }, [startDate, endDate]);

    const formatRangeDisplay = () => {
        if (!startDate && !endDate) return 'Select date range';
        
        const format = (dateStr) => {
            if (!dateStr) return '';
            const d = new Date(dateStr + 'T12:00:00');
            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            return `${monthNames[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
        };
        
        if (startDate && endDate) {
            return `${format(startDate)} – ${format(endDate)}`;
        }
        return 'Select date range';
    };

    const formatDateString = (date) => {
        if (!date) return '';
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    };
    
    const handleQuickDateFilter = (filter) => {
        const today = new Date();
        today.setHours(12, 0, 0, 0);
        let startDate = new Date(today);
        let endDate = new Date(today);

        if (filter.type === 'currentMonth') {
            startDate = new Date(today.getFullYear(), today.getMonth(), 1);
            endDate = today;
        } else if (filter.type === 'last7Days') {
            startDate.setDate(today.getDate() - 7);
            endDate = today;
        } else if (filter.type === 'lastMonth') {
            const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
            startDate = new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1);
            endDate = new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0);
        } else if (filter.type === 'last3Months') {
            startDate.setMonth(today.getMonth() - 3);
            endDate = today;
        } else if (filter.type === 'last6Months') {
            startDate.setMonth(today.getMonth() - 6);
            endDate = today;
        } else if (filter.type === 'lastYear') {
            startDate.setMonth(today.getMonth() - 12);
            endDate = today;
        }

        setLocalStartDate(startDate);
        setLocalEndDate(endDate);
        
        onStartDateChange(startDate.toISOString().split('T')[0]);
        onEndDateChange(endDate.toISOString().split('T')[0]);
        setIsOpen(false);
        setShowCustomPicker(false);
    };
    
    const handleApplyDate = () => {
        if (localStartDate && localEndDate) {
            const [s, e] = [localStartDate, localEndDate].sort((a, b) => a - b);
            onStartDateChange(s.toISOString().split('T')[0]);
            onEndDateChange(e.toISOString().split('T')[0]);
            setIsOpen(false);
            setShowCustomPicker(false);
        }
    };

    const clearDates = () => {
        setLocalStartDate(null);
        setLocalEndDate(null);
        onStartDateChange('');
        onEndDateChange('');
        setIsOpen(false);
        setShowCustomPicker(false);
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <style>{`
                .datepicker-popper-custom {
                    z-index: 9999 !important;
                }
                .react-datepicker-popper {
                    z-index: 99999 !important;
                }
                .react-datepicker {
                    font-family: inherit;
                    border: 2px solid #e5e7eb;
                    border-radius: 0.75rem;
                    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
                    overflow: hidden;
                }
                .react-datepicker__header {
                    background: linear-gradient(to right, #eef2ff, #f5f3ff);
                    border-bottom: 1px solid #e5e7eb;
                    padding-top: 0.75rem;
                }
                .react-datepicker__current-month {
                    color: #374151;
                    font-weight: 600;
                    font-size: 0.9rem;
                    margin-bottom: 0.5rem;
                }
                .react-datepicker__day-names {
                    display: flex;
                    justify-content: space-around;
                    padding: 0.5rem 0;
                    margin: 0;
                }
                .react-datepicker__day-name {
                    color: #6b7280;
                    font-weight: 600;
                    font-size: 0.7rem;
                    width: 2rem;
                    line-height: 2rem;
                    margin: 0;
                    text-transform: uppercase;
                }
                .react-datepicker__month {
                    margin: 0.5rem;
                }
                .react-datepicker__week {
                    display: flex;
                    justify-content: space-around;
                }
                .react-datepicker__day {
                    width: 2rem;
                    height: 2rem;
                    line-height: 2rem;
                    margin: 0.125rem;
                    border-radius: 0.375rem;
                    color: #374151;
                    font-weight: 500;
                    font-size: 0.85rem;
                    transition: all 0.15s ease;
                }
                .react-datepicker__day:hover {
                    background-color: #eef2ff;
                    color: #4f46e5;
                }
                .react-datepicker__day--selected,
                .react-datepicker__day--in-range,
                .react-datepicker__day--in-selecting-range {
                    background-color: #4f46e5 !important;
                    color: white !important;
                    font-weight: 600;
                }
                .react-datepicker__day--range-start,
                .react-datepicker__day--range-end {
                    background-color: #4338ca !important;
                }
                .react-datepicker__day--keyboard-selected {
                    background-color: #eef2ff;
                    color: #4f46e5;
                }
                .react-datepicker__day--today {
                    font-weight: 700;
                    color: #4f46e5;
                    background-color: #eef2ff;
                }
                .react-datepicker__day--disabled {
                    color: #d1d5db;
                    cursor: not-allowed;
                }
                .react-datepicker__day--disabled:hover {
                    background-color: transparent;
                }
                .react-datepicker__day--outside-month {
                    color: #d1d5db;
                }
                .react-datepicker__navigation {
                    top: 0.75rem;
                }
                .react-datepicker__navigation-icon::before {
                    border-color: #6b7280;
                }
                .react-datepicker__navigation:hover .react-datepicker__navigation-icon::before {
                    border-color: #4f46e5;
                }
            `}</style>

            {/* Compact Dropdown Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center justify-between w-full px-4 py-3 bg-white border border-slate-200 rounded-xl shadow-sm hover:border-indigo-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
            >
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg shadow-sm">
                        <Calendar className="h-5 w-5 text-white" />
                    </div>
                    <div className="text-left">
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Date range</p>
                        <p className="text-sm font-semibold text-slate-800">{formatRangeDisplay()}</p>
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    {(startDate || endDate) && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                clearDates();
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                            title="Clear"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    )}
                    <ChevronDown className={`h-5 w-5 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                </div>
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="absolute left-0 mt-2 w-[min(420px,95vw)] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-[9999]">
                    {/* Quick filters */}
                    <div className="p-4 bg-gradient-to-r from-slate-50 to-indigo-50/30 border-b border-slate-100">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Quick select</p>
                        <div className="flex flex-wrap gap-2">
                            {quickDateFilters.map((filter, index) => (
                                <button
                                    key={index}
                                    onClick={() => handleQuickDateFilter(filter)}
                                    className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-indigo-500 hover:text-white hover:border-indigo-500 transition-all duration-150 shadow-sm"
                                >
                                    {filter.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Custom Range Toggle */}
                    <div className="flex items-center justify-between px-4 pt-3">
                        <span className="text-xs font-medium text-slate-500">Custom Range</span>
                        <button
                            onClick={() => setShowCustomPicker(!showCustomPicker)}
                            className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                        >
                            {showCustomPicker ? 'Hide' : 'Show'}
                        </button>
                    </div>

                    {/* Custom Date Range Selection */}
                    {showCustomPicker && (
                        <div className="space-y-3 p-4">
                            {/* From Date */}
                            <div className="relative" ref={startDatePickerRef}>
                                <label className="block text-xs font-medium text-gray-600 mb-1">
                                    From Date
                                </label>
                                <DatePicker
                                    selected={localStartDate}
                                    onChange={(date) => setLocalStartDate(date)}
                                    customInput={
                                        <div className="relative cursor-pointer">
                                            <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                                                <Calendar className="h-3 w-3 text-indigo-500" />
                                            </div>
                                            <input
                                                type="text"
                                                value={localStartDate ? formatDateString(localStartDate) : ''}
                                                readOnly
                                                className="w-full pl-8 pr-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 bg-white text-gray-900 cursor-pointer"
                                                placeholder="DD/MM/YYYY"
                                            />
                                        </div>
                                    }
                                    dateFormat="dd/MM/yyyy"
                                    minDate={minDate ? new Date(minDate) : null}
                                    maxDate={localEndDate || (maxDate ? new Date(maxDate) : new Date())}
                                    popperClassName="!z-[99999]"
                                    popperPlacement="bottom-start"
                                    shouldCloseOnSelect={true}
                                    withPortal={false}
                                />
                            </div>
                            
                            {/* To Date */}
                            <div className="relative" ref={endDatePickerRef}>
                                <label className="block text-xs font-medium text-gray-600 mb-1">
                                    To Date
                                </label>
                                <DatePicker
                                    selected={localEndDate}
                                    onChange={(date) => setLocalEndDate(date)}
                                    customInput={
                                        <div className="relative cursor-pointer">
                                            <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                                                <Calendar className="h-3 w-3 text-indigo-500" />
                                            </div>
                                            <input
                                                type="text"
                                                value={localEndDate ? formatDateString(localEndDate) : ''}
                                                readOnly
                                                className="w-full pl-8 pr-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 bg-white text-gray-900 cursor-pointer"
                                                placeholder="DD/MM/YYYY"
                                            />
                                        </div>
                                    }
                                    dateFormat="dd/MM/yyyy"
                                    minDate={localStartDate || (minDate ? new Date(minDate) : null)}
                                    maxDate={maxDate ? new Date(maxDate) : new Date()}
                                    popperClassName="!z-[99999]"
                                    popperPlacement="bottom-start"
                                    shouldCloseOnSelect={true}
                                    withPortal={false}
                                />
                            </div>
                        </div>
                    )}

                    {/* Footer */}
                    <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-t border-slate-200">
                        <span className="text-xs text-slate-500">
                            {localStartDate && localEndDate
                                ? `${localStartDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} – ${localEndDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`
                                : 'Select start and end dates'}
                        </span>
                        <button
                            type="button"
                            onClick={handleApplyDate}
                            disabled={!localStartDate || !localEndDate}
                            className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            Apply
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

const TransactionHistory = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const queryParams = new URLSearchParams(location.search);
    const bankId = queryParams.get('bank_id');

    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(() => {
        const saved = localStorage.getItem('sidebarMinimized');
        return saved ? JSON.parse(saved) : false;
    });
    const [bankDetails, setBankDetails] = useState(null);
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [fetchingTransactions, setFetchingTransactions] = useState(false);
    const [fromDate, setFromDate] = useState(() => {
        const date = new Date();
        date.setMonth(date.getMonth() - 1);
        return date.toISOString().split('T')[0];
    });
    const [toDate, setToDate] = useState(() => {
        return new Date().toISOString().split('T')[0];
    });
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [itemsPerPage, setItemsPerPage] = useState(20);
    const LIMIT_OPTIONS = [5, 10, 20, 50, 100];
    const [pageJumpInput, setPageJumpInput] = useState('');
    const [openingBalance, setOpeningBalance] = useState(0);
    const [summary, setSummary] = useState({
        totalCredit: 0,
        totalDebit: 0,
        closingBalance: 0
    });
    const [showTransactionModal, setShowTransactionModal] = useState(false);
    const [transactionType, setTransactionType] = useState('');
    const [showActionMenu, setShowActionMenu] = useState(null);
    const [detailsTransaction, setDetailsTransaction] = useState(null);

    // Fetch bank details and initial transactions
    useEffect(() => {
        if (bankId) {
            fetchBankDetails();
            fetchTransactions();
        } else {
            toast.error('Bank ID not found');
            navigate('/finance/voucher/bank-list');
        }
    }, [bankId]);

    // Reset to page 1 when date filters or limit change
    useEffect(() => {
        setCurrentPage(1);
    }, [fromDate, toDate, itemsPerPage]);

    // Fetch transactions when page, limit, fromDate, or toDate changes
    useEffect(() => {
        if (bankId) {
            fetchTransactions();
        }
    }, [currentPage, itemsPerPage, fromDate, toDate]);

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

    // Close action menu when clicking outside
    useEffect(() => {
        const handleClickOutside = () => {
            setShowActionMenu(null);
        };
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    // Fetch bank details
    const fetchBankDetails = async () => {
        try {
            const response = await axios.get(
                `${API_BASE_URL}/transaction/bank/details?bank_id=${bankId}`,
                { headers: getHeaders() }
            );

            if (response.data.success) {
                setBankDetails(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching bank details:', error);
            toast.error('Failed to fetch bank details');
        }
    };

    // Fetch transactions
    const fetchTransactions = async () => {
        setFetchingTransactions(true);
        try {
            const response = await axios.get(
                `${API_BASE_URL}/transaction/list?page_no=${currentPage}&limit=${itemsPerPage}&from_date=${fromDate}&to_date=${toDate}&party_type=bank&party_id=${bankId}`,
                { headers: getHeaders() }
            );

            if (response.data.success) {
                // Map the data to match the expected structure
                const mappedTransactions = (response.data.data || []).map(transaction => ({
                    ...transaction,
                    transaction_date: transaction.transaction_date,
                    transaction_type: transaction.transaction_type,
                    // Map payment data
                    type: transaction.payment?.debit > 0 ? "0" : (transaction.payment?.credit > 0 ? "1" : ""),
                    amount: transaction.payment?.debit > 0 ? transaction.payment.debit : (transaction.payment?.credit > 0 ? transaction.payment.credit : 0),
                    old_balance: transaction.payment?.balance ? (transaction.payment.balance - (transaction.payment?.debit > 0 ? transaction.payment.debit : -transaction.payment.credit)) : 0,
                    new_balance: transaction.payment?.balance || 0,
                    invoice_no: transaction.invoice_no,
                    invoice_id: transaction.invoice_id,
                    create_by: transaction.create_by,
                    modify_by: transaction.modify_by,
                    particular: transaction.particular
                }));
                
                setTransactions(mappedTransactions);
                
                // Set opening balance from response
                if (response.data.opening_balance) {
                    const openingBal = response.data.opening_balance.balance || 0;
                    setOpeningBalance(openingBal);
                    setSummary(prev => ({
                        ...prev,
                        closingBalance: openingBal
                    }));
                }
                
                const meta = response.data.meta || {};
                const total = meta.total ?? 0;
                const limit = meta.limit ?? itemsPerPage;
                setTotalItems(total);
                setTotalPages(Math.max(1, Math.ceil(total / limit)));
                
                // Calculate summary from mapped transactions
                calculateSummary(mappedTransactions, response.data.opening_balance?.balance || 0);
            }
        } catch (error) {
            console.error('Error fetching transactions:', error);
            toast.error('Failed to fetch transactions');
            setTransactions([]);
            calculateSummary([], 0);
        } finally {
            setFetchingTransactions(false);
            setLoading(false);
        }
    };

    // Calculate transaction summary
    const calculateSummary = (transactionsData, openingBal) => {
        let totalCredit = 0; // Money Out (Credit)
        let totalDebit = 0; // Money In (Debit)
        let closingBalance = openingBal;

        transactionsData.forEach(transaction => {
            // From payment object: debit = Money In, credit = Money Out
            if (transaction.payment?.debit > 0) {
                totalDebit += transaction.payment.debit;
            }
            if (transaction.payment?.credit > 0) {
                totalCredit += transaction.payment.credit;
            }
            // Update closing balance from last transaction
            if (transaction.payment?.balance !== undefined) {
                closingBalance = transaction.payment.balance;
            }
        });

        setSummary({
            totalCredit,
            totalDebit,
            closingBalance
        });
    };

    // Handle search
    const handleSearch = useCallback(() => {
        setCurrentPage(1);
        fetchTransactions();
    }, [fromDate, toDate]);

    // Handle refresh
    const handleRefresh = useCallback(() => {
        fetchTransactions();
        toast.success('Data refreshed');
    }, []);

    // Handle export
    const handleExport = useCallback((type) => {
        toast.success(`${type.toUpperCase()} export started...`);
        // Implement export logic here
    }, []);

    // Handle print
    const handlePrint = useCallback(() => {
        window.print();
    }, []);

    // Handle transaction type click
    const handleTransactionTypeClick = (type) => {
        setTransactionType(type);
        setShowTransactionModal(true);
    };

    // Handle create transaction
    const handleCreateTransaction = async (type, formData) => {
        try {
            // Here you would implement the API call to create the transaction
            console.log('Creating transaction:', type, formData);
            
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            toast.success(`${type} transaction created successfully`);
            setShowTransactionModal(false);
            fetchTransactions(); // Refresh the list
        } catch (error) {
            console.error('Error creating transaction:', error);
            toast.error(`Failed to create ${type} transaction`);
        }
    };

    // Handle action click
    const handleActionClick = (e, transactionId) => {
        e.stopPropagation();
        setShowActionMenu(showActionMenu === transactionId ? null : transactionId);
    };

    // Handle edit
    const handleEdit = (transaction) => {
        console.log('Edit transaction:', transaction);
        toast.success('Edit functionality coming soon');
        setShowActionMenu(null);
    };

    // Handle view invoice
    const handleViewInvoice = (transaction) => {
        console.log('View invoice:', transaction);
        toast.success('View invoice functionality coming soon');
        setShowActionMenu(null);
    };

    // Handle view details
    const handleViewDetails = (transaction) => {
        setDetailsTransaction(transaction);
        setShowActionMenu(null);
    };

    // Format currency
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(Math.abs(amount || 0));
    };

    // Format date
    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    // Format time
    const formatTime = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Get transaction amounts
    const getTransactionAmounts = (transaction) => {
        return {
            debit: transaction.payment?.debit ?? 0,
            credit: transaction.payment?.credit ?? 0,
            balance: transaction.payment?.balance ?? 0
        };
    };

    // Get transaction type color based on transaction_type
    const getTransactionTypeColor = (transaction) => {
        const type = transaction.transaction_type?.toUpperCase() || '';
        switch(type) {
            case 'RECEIVE':
                return 'text-green-600 bg-green-50 border-green-200';
            case 'PAYMENT':
                return 'text-red-600 bg-red-50 border-red-200';
            case 'CONTRA':
                return 'text-purple-600 bg-purple-50 border-purple-200';
            case 'SALE':
                return 'text-blue-600 bg-blue-50 border-blue-200';
            case 'PURCHASE':
                return 'text-orange-600 bg-orange-50 border-orange-200';
            case 'EXPENSE':
                return 'text-amber-600 bg-amber-50 border-amber-200';
            default:
                return 'text-slate-600 bg-slate-50 border-slate-200';
        }
    };

    // Get transaction type display name
    const getTransactionTypeDisplay = (transaction) => {
        const type = transaction.transaction_type?.toUpperCase() || '';
        switch(type) {
            case 'RECEIVE':
                return 'Receive';
            case 'PAYMENT':
                return 'Payment';
            case 'CONTRA':
                return 'Contra';
            case 'SALE':
                return 'Sale';
            case 'PURCHASE':
                return 'Purchase';
            case 'EXPENSE':
                return 'Expense';
            default:
                return type.charAt(0) + type.slice(1).toLowerCase() || 'N/A';
        }
    };

    // Get payment mode icon
    const getPaymentModeIcon = (mode) => {
        switch(mode?.toLowerCase()) {
            case 'cash': 
                return <FiDollarSign className="w-4 h-4 text-green-600" />;
            case 'bank': 
                return <FiHome className="w-4 h-4 text-blue-600" />;
            case 'cheque': 
                return <FiFileText className="w-4 h-4 text-purple-600" />;
            case 'online': 
                return <FiGlobe className="w-4 h-4 text-indigo-600" />;
            case 'card': 
                return <FiCreditCard className="w-4 h-4 text-orange-600" />;
            default: 
                return <FiDollarSign className="w-4 h-4 text-slate-600" />;
        }
    };

    // Handle page change
    const handlePageChange = (newPage) => {
        const page = Math.max(1, Math.min(totalPages, Math.floor(newPage)));
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
            setPageJumpInput('');
        }
    };

    // Handle page jump
    const handlePageJump = (e) => {
        e.preventDefault();
        const page = parseInt(pageJumpInput, 10);
        if (!isNaN(page)) {
            handlePageChange(page);
        }
    };

    // Get transaction type icon
    const getTransactionTypeIcon = (type) => {
        switch(type) {
            case 'RECEIVE': return <FiUser className="w-5 h-5" />;
            case 'PAYMENT': return <FiDollarSign className="w-5 h-5" />;
            case 'SALE': return <FiShoppingBag className="w-5 h-5" />;
            case 'PURCHASE': return <FiTruck className="w-5 h-5" />;
            case 'EXPENSE': return <FiFileText className="w-5 h-5" />;
            case 'CONTRA': return <FiRepeat className="w-5 h-5" />;
            default: return <FiPlus className="w-5 h-5" />;
        }
    };

    // Get particulars display with proper details from API response
    const getParticularsDisplay = (transaction) => {
        // Check if particular exists
        if (transaction.particular) {
            // Handle bank/contra transactions with bank details
            if (transaction.particular.type === 'bank' && transaction.particular.details) {
                const details = transaction.particular.details;
                return (
                    <div className="flex flex-col min-w-0">
                        <div className="font-medium text-slate-800">
                            {details.bank || 'N/A'}
                        </div>
                        <div className="text-xs text-slate-500">
                            A/C: {details.account_no || 'N/A'} | {details.holder || 'N/A'}
                        </div>
                        <div className="text-xs text-slate-500">
                            {details.branch || 'N/A'} ({details.ifsc || 'N/A'})
                        </div>
                        {transaction.particular.remark && (
                            <div className="text-xs text-slate-400 mt-1 italic truncate max-w-[200px]" title={transaction.particular.remark}>
                                Note: {transaction.particular.remark}
                            </div>
                        )}
                    </div>
                );
            }
            
            // Handle customer/supplier transactions with person details
            if (transaction.particular.details && (transaction.particular.details.name || transaction.particular.details.email)) {
                const details = transaction.particular.details;
                return (
                    <div className="flex flex-col min-w-0">
                        <div className="font-medium text-slate-800">{details.name || 'N/A'}</div>
                        <div className="text-xs text-slate-500">{details.email || ''}</div>
                        {details.mobile && (
                            <div className="text-xs text-slate-500">
                                +{details.country_code || ''} {details.mobile}
                            </div>
                        )}
                        {transaction.particular.remark && (
                            <div className="text-xs text-slate-400 mt-1 italic truncate max-w-[200px]" title={transaction.particular.remark}>
                                Note: {transaction.particular.remark}
                            </div>
                        )}
                    </div>
                );
            }
            
            // Fallback to remark only if no details
            if (transaction.particular.remark) {
                return (
                    <div className="flex flex-col min-w-0">
                        <div className="font-medium text-slate-800">Contra Transfer</div>
                        <div className="text-xs text-slate-400 italic truncate max-w-[200px]" title={transaction.particular.remark}>
                            Note: {transaction.particular.remark}
                        </div>
                    </div>
                );
            }
        }
        
        // Fallback to create_by if particular not available
        if (transaction.create_by) {
            return (
                <div className="flex flex-col min-w-0">
                    <div className="font-medium text-slate-800">{transaction.create_by.name || 'N/A'}</div>
                    <div className="text-xs text-slate-500">{transaction.create_by.email || ''}</div>
                    {transaction.create_by.mobile && (
                        <div className="text-xs text-slate-500">
                            +{transaction.create_by.country_code || ''} {transaction.create_by.mobile}
                        </div>
                    )}
                </div>
            );
        }
        
        return <span className="text-sm text-slate-500">N/A</span>;
    };

    // Loading skeleton
    const SkeletonRow = () => (
        <tr className="border-b border-slate-100 animate-pulse">
            <td className="p-4"><div className="h-4 bg-slate-200 rounded w-8"></div></td>
            <td className="p-4"><div className="h-4 bg-slate-200 rounded w-24"></div></td>
            <td className="p-4"><div className="h-4 bg-slate-200 rounded w-32"></div></td>
            <td className="p-4"><div className="h-4 bg-slate-200 rounded w-20"></div></td>
            <td className="p-4"><div className="h-4 bg-slate-200 rounded w-24"></div></td>
            <td className="p-4 text-right"><div className="h-4 bg-slate-200 rounded w-20 ml-auto"></div></td>
            <td className="p-4 text-right"><div className="h-4 bg-slate-200 rounded w-20 ml-auto"></div></td>
            <td className="p-4 text-right"><div className="h-4 bg-slate-200 rounded w-20 ml-auto"></div></td>
            <td className="p-4 text-center"><div className="h-8 bg-slate-200 rounded w-8 mx-auto"></div></td>
        </tr>
    );

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
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

            {/* Transaction Modal Manager */}
            <TransactionModalManager
                modalType={transactionType}
                isOpen={showTransactionModal}
                onClose={() => setShowTransactionModal(false)}
                bankDetails={bankDetails}
                bankId={bankId}
                onSubmit={handleCreateTransaction}
                formatCurrency={formatCurrency}
                summary={summary}  
            />

            {/* Transaction Details Modal */}
            {detailsTransaction && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
                    onClick={() => setDetailsTransaction(null)}
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="relative w-full max-w-2xl max-h-[90vh] overflow-hidden bg-white rounded-2xl shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="sticky top-0 z-10 bg-gradient-to-r from-indigo-600 via-indigo-700 to-indigo-800 px-6 py-5">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-white/20 rounded-xl">
                                        <FiFileText className="w-6 h-6 text-white" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-white">
                                            Transaction Details
                                        </h2>
                                        <p className="text-indigo-200 text-sm mt-0.5">
                                            {getTransactionTypeDisplay(detailsTransaction)} • {detailsTransaction.invoice_no || 'N/A'}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setDetailsTransaction(null)}
                                    className="p-2 hover:bg-white/20 rounded-xl transition-colors"
                                >
                                    <FiX className="w-6 h-6 text-white" />
                                </button>
                            </div>
                        </div>

                        {/* Modal Body */}
                        <div className="overflow-y-auto p-6 space-y-6 max-h-[calc(90vh-180px)]">
                            {/* Basic Info */}
                            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Transaction Info</h3>
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                    <div><span className="text-slate-500">Date</span><p className="font-medium text-slate-800">{formatDate(detailsTransaction.transaction_date)} {formatTime(detailsTransaction.transaction_date)}</p></div>
                                    <div><span className="text-slate-500">Voucher No</span><p className="font-mono font-medium text-slate-800">{detailsTransaction.invoice_no || 'N/A'}</p></div>
                                    <div><span className="text-slate-500">Type</span><p className="font-medium text-slate-800">{getTransactionTypeDisplay(detailsTransaction)}</p></div>
                                    <div className="col-span-2"><span className="text-slate-500">Transaction ID</span><p className="font-mono text-xs text-slate-600 break-all">{detailsTransaction.transaction_id || 'N/A'}</p></div>
                                </div>
                            </div>

                            {/* Amounts */}
                            {(() => {
                                const amt = getTransactionAmounts(detailsTransaction);
                                return (
                                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                                        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Amounts</h3>
                                        <div className="grid grid-cols-3 gap-4">
                                            <div className="bg-white rounded-lg p-3 border border-green-100">
                                                <p className="text-xs text-slate-500 mb-1">Debit (Money In)</p>
                                                <p className="text-lg font-bold text-green-600">₹{formatCurrency(amt.debit)}</p>
                                            </div>
                                            <div className="bg-white rounded-lg p-3 border border-red-100">
                                                <p className="text-xs text-slate-500 mb-1">Credit (Money Out)</p>
                                                <p className="text-lg font-bold text-red-600">₹{formatCurrency(amt.credit)}</p>
                                            </div>
                                            <div className="bg-white rounded-lg p-3 border border-indigo-100">
                                                <p className="text-xs text-slate-500 mb-1">Balance</p>
                                                <p className={`text-lg font-bold ${amt.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>₹{formatCurrency(amt.balance)}</p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* Particulars - Dynamic based on type */}
                            {detailsTransaction.particular && (
                                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                                    <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">
                                        Particulars {detailsTransaction.particular.type && `(${detailsTransaction.particular.type})`}
                                    </h3>
                                    {detailsTransaction.particular.type === 'bank' && detailsTransaction.particular.details ? (
                                        <div className="bg-white rounded-lg p-4 border border-indigo-100 space-y-2">
                                            <div className="flex items-center gap-2 mb-3">
                                                <FiHome className="w-5 h-5 text-indigo-600" />
                                                <span className="font-semibold text-slate-800">{detailsTransaction.particular.details.bank || 'Bank'}</span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2 text-sm">
                                                <div><span className="text-slate-500">Account No</span><p className="font-medium">{detailsTransaction.particular.details.account_no || '-'}</p></div>
                                                <div><span className="text-slate-500">Account Holder</span><p className="font-medium">{detailsTransaction.particular.details.holder || '-'}</p></div>
                                                <div><span className="text-slate-500">IFSC</span><p className="font-mono font-medium">{detailsTransaction.particular.details.ifsc || '-'}</p></div>
                                                <div><span className="text-slate-500">Branch</span><p className="font-medium">{detailsTransaction.particular.details.branch || '-'}</p></div>
                                                <div><span className="text-slate-500">Type</span><p className="font-medium capitalize">{detailsTransaction.particular.details.type || '-'}</p></div>
                                            </div>
                                            {detailsTransaction.particular.remark && (
                                                <div className="pt-2 mt-2 border-t border-slate-100">
                                                    <span className="text-slate-500 text-xs">Remark</span>
                                                    <p className="text-sm text-slate-700 mt-0.5">{detailsTransaction.particular.remark}</p>
                                                </div>
                                            )}
                                        </div>
                                    ) : detailsTransaction.particular.details && typeof detailsTransaction.particular.details === 'object' ? (
                                        <div className="bg-white rounded-lg p-4 border border-slate-200">
                                            <div className="space-y-2">
                                                {Object.entries(detailsTransaction.particular.details)
                                                    .filter(([, val]) => val != null && val !== '')
                                                    .map(([key, val]) => (
                                                        <div key={key} className="flex justify-between text-sm">
                                                            <span className="text-slate-500 capitalize">{key.replace(/_/g, ' ')}</span>
                                                            <span className="font-medium text-slate-800">{typeof val === 'object' ? JSON.stringify(val) : String(val)}</span>
                                                        </div>
                                                    ))}
                                            </div>
                                            {detailsTransaction.particular.remark && (
                                                <div className="pt-2 mt-2 border-t border-slate-100">
                                                    <span className="text-slate-500 text-xs">Remark</span>
                                                    <p className="text-sm text-slate-700 mt-0.5">{detailsTransaction.particular.remark}</p>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <p className="text-slate-600 text-sm">{JSON.stringify(detailsTransaction.particular)}</p>
                                    )}
                                </div>
                            )}

                            {/* Created By */}
                            {detailsTransaction.create_by && (
                                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                                    <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Created By</h3>
                                    <div className="flex items-center gap-3 bg-white rounded-lg p-4 border border-slate-200">
                                        <div className="p-2 bg-indigo-100 rounded-full">
                                            <FiUser className="w-5 h-5 text-indigo-600" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-slate-800">{detailsTransaction.create_by.name || '-'}</p>
                                            <p className="text-sm text-slate-500">{detailsTransaction.create_by.email || detailsTransaction.create_by.username || ''}</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Modified By - if different from create_by */}
                            {detailsTransaction.modify_by && JSON.stringify(detailsTransaction.modify_by) !== JSON.stringify(detailsTransaction.create_by) && (
                                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                                    <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Modified By</h3>
                                    <div className="flex items-center gap-3 bg-white rounded-lg p-4 border border-slate-200">
                                        <div className="p-2 bg-amber-100 rounded-full">
                                            <FiEdit2 className="w-5 h-5 text-amber-600" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-slate-800">{detailsTransaction.modify_by.name || '-'}</p>
                                            <p className="text-sm text-slate-500">{detailsTransaction.modify_by.email || detailsTransaction.modify_by.username || ''}</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Timestamps */}
                            <div className="flex gap-4 text-xs text-slate-500">
                                {detailsTransaction.create_date && <span>Created: {formatDate(detailsTransaction.create_date)} {formatTime(detailsTransaction.create_date)}</span>}
                                {detailsTransaction.modify_date && <span>Modified: {formatDate(detailsTransaction.modify_date)} {formatTime(detailsTransaction.modify_date)}</span>}
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="sticky bottom-0 border-t border-slate-200 bg-slate-50 px-6 py-4">
                            <button
                                onClick={() => setDetailsTransaction(null)}
                                className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}

            {/* Main Content Area */}
            <div className={`pt-16 transition-all duration-300 ease-in-out ${isMinimized ? 'md:pl-20' : 'md:pl-72'}`}>
                <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    
                    {/* Header with Back Button */}
                    <div className="mb-6 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <motion.button
                                onClick={() => navigate('/finance/voucher/bank-list')}
                                className="p-2 bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-200 border border-slate-200"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                <FiArrowLeft className="w-5 h-5 text-slate-600" />
                            </motion.button>
                            <div>
                                <h1 className="text-2xl font-bold text-slate-800">Transaction History</h1>
                                {bankDetails && (
                                    <p className="text-sm text-slate-500 mt-1">
                                        {bankDetails.bank} - {bankDetails.account_no} ({bankDetails.branch})
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-2">
                            <motion.button
                                onClick={handleRefresh}
                                className="p-2 bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-200 border border-slate-200"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                title="Refresh"
                            >
                                <FiRefreshCw className="w-5 h-5 text-slate-600" />
                            </motion.button>
                            <motion.button
                                onClick={() => handleExport('pdf')}
                                className="p-2 bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-200 border border-slate-200"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                title="Export PDF"
                            >
                                <FiDownload className="w-5 h-5 text-slate-600" />
                            </motion.button>
                            <motion.button
                                onClick={handlePrint}
                                className="p-2 bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-200 border border-slate-200"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                title="Print"
                            >
                                <FiPrinter className="w-5 h-5 text-slate-600" />
                            </motion.button>
                            <div className="relative group">
                                <motion.button
                                    className="p-2 bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 text-white"
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    title="Add Transaction"
                                >
                                    <FiPlus className="w-5 h-5" />
                                </motion.button>
                                
                                {/* Dropdown Menu */}
                                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-200 py-2 hidden group-hover:block z-50">
                                    {['RECEIVE', 'PAYMENT', 'SALE', 'PURCHASE', 'EXPENSE', 'CONTRA'].map((type) => (
                                        <button
                                            key={type}
                                            onClick={() => handleTransactionTypeClick(type)}
                                            className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-blue-50 flex items-center gap-3 transition-colors"
                                        >
                                            <span className="text-blue-600">{getTransactionTypeIcon(type)}</span>
                                            {type.charAt(0) + type.slice(1).toLowerCase()}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                        <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="bg-white rounded-xl p-4 shadow-lg border border-slate-200"
                        >
                            <p className="text-sm text-slate-500 mb-1">Opening</p>
                            <p className={`text-xl font-bold ${openingBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                ₹{formatCurrency(openingBalance)}
                                {openingBalance < 0 && <span className="text-xs ml-1">(OD)</span>}
                            </p>
                        </motion.div>

                        <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="bg-white rounded-xl p-4 shadow-lg border border-slate-200"
                        >
                            <p className="text-sm text-slate-500 mb-1">Money In</p>
                            <p className="text-xl font-bold text-green-600">
                                ₹{formatCurrency(summary.totalDebit)}
                            </p>
                        </motion.div>

                        <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="bg-white rounded-xl p-4 shadow-lg border border-slate-200"
                        >
                            <p className="text-sm text-slate-500 mb-1">Money Out</p>
                            <p className="text-xl font-bold text-red-600">
                                ₹{formatCurrency(summary.totalCredit)}
                            </p>
                        </motion.div>

                        <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                            className="bg-white rounded-xl p-4 shadow-lg border border-slate-200"
                        >
                            <p className="text-sm text-slate-500 mb-1">Closing</p>
                            <p className={`text-xl font-bold ${summary.closingBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                ₹{formatCurrency(summary.closingBalance)}
                                {summary.closingBalance < 0 && <span className="text-xs ml-1">(OD)</span>}
                            </p>
                        </motion.div>
                    </div>

                    {/* Date Filter Card - Compact Version */}
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                        className="bg-white rounded-xl shadow-lg border border-slate-200 p-3 mb-6"
                    >
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                                <FiCalendar className="text-blue-600 w-4 h-4" />
                                <span className="text-xs font-medium text-slate-700">Date Range:</span>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                {/* DateRangePicker Component */}
                                <div className="min-w-[280px] flex-1 max-w-md">
                                    <DateRangePicker
                                        startDate={fromDate}
                                        endDate={toDate}
                                        onStartDateChange={setFromDate}
                                        onEndDateChange={setToDate}
                                    />
                                </div>
                                <button
                                    onClick={handleSearch}
                                    disabled={fetchingTransactions}
                                    className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg text-xs font-medium hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 transition-all duration-200 flex items-center gap-1"
                                >
                                    {fetchingTransactions ? (
                                        <>
                                            <svg className="animate-spin h-3 w-3 text-white" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            <span>Loading...</span>
                                        </>
                                    ) : (
                                        'Apply'
                                    )}
                                </button>
                                {(fromDate || toDate) && (
                                    <button
                                        onClick={() => {
                                            const date = new Date();
                                            date.setMonth(date.getMonth() - 1);
                                            setFromDate(date.toISOString().split('T')[0]);
                                            setToDate(new Date().toISOString().split('T')[0]);
                                        }}
                                        className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                                        title="Clear filter"
                                    >
                                        <FiX className="w-5 h-5" />
                                    </button>
                                )}
                            </div>
                        </div>
                    </motion.div>

                    {/* Transactions Table Card */}
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6 }}
                        className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden"
                    >
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-gradient-to-r from-slate-50 to-slate-100 border-y border-slate-200">
                                        <th className="text-left p-4 font-semibold text-slate-600 w-16">#</th>
                                        <th className="text-left p-4 font-semibold text-slate-600">Date</th>
                                        <th className="text-left p-4 font-semibold text-slate-600">Particulars</th>
                                        <th className="text-left p-4 font-semibold text-slate-600">Type</th>
                                        <th className="text-left p-4 font-semibold text-slate-600">Voucher No</th>
                                        <th className="text-right p-4 font-semibold text-slate-600">Debit</th>
                                        <th className="text-right p-4 font-semibold text-slate-600">Credit</th>
                                        <th className="text-right p-4 font-semibold text-slate-600">Balance</th>
                                        <th className="text-center p-4 font-semibold text-slate-600 w-20">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {/* Opening Balance Row - Always Show */}
                                    <tr className="bg-blue-50/50 font-medium">
                                        <td className="p-4 text-slate-600"> </td>
                                        <td className="p-4 text-slate-800" colSpan="2">Opening Balance</td>
                                        <td className="p-4"> </td>
                                        <td className="p-4"> </td>
                                        <td className="p-4 text-right">
                                            {openingBalance > 0 ? (
                                                <span className="text-sm font-semibold text-green-600">₹{formatCurrency(openingBalance)}</span>
                                            ) : openingBalance < 0 ? (
                                                <span className="text-sm font-semibold text-red-600">₹{formatCurrency(openingBalance)}</span>
                                            ) : (
                                                <span className="text-sm text-slate-600">₹{formatCurrency(0)}</span>
                                            )}
                                        </td>
                                        <td className="p-4 text-right">
                                            <span className="text-sm text-slate-600">₹{formatCurrency(0)}</span>
                                        </td>
                                        <td className={`p-4 text-right font-bold ${openingBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            ₹{formatCurrency(openingBalance)}
                                        </td>
                                        <td className="p-4"> </td>
                                    </tr>

                                    {loading || fetchingTransactions ? (
                                        [...Array(5)].map((_, index) => <SkeletonRow key={index} />)
                                    ) : transactions.length === 0 ? (
                                        <tr>
                                            <td colSpan="9" className="text-center py-12">
                                                <div className="flex flex-col items-center justify-center">
                                                    <div className="p-4 bg-slate-100 rounded-full mb-4">
                                                        <FiRepeat className="w-8 h-8 text-slate-400" />
                                                    </div>
                                                    <p className="text-slate-600 text-lg font-medium mb-2">No transactions found</p>
                                                    <p className="text-slate-500 text-sm">No transactions available for the selected date range</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        transactions.map((transaction, index) => {
                                            const amounts = getTransactionAmounts(transaction);
                                            
                                            return (
                                                <motion.tr
                                                    key={transaction.transaction_id || index}
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    transition={{ delay: index * 0.02 }}
                                                    className="hover:bg-blue-50/30 transition-colors duration-150"
                                                >
                                                    <td className="p-4 text-slate-600">{(currentPage - 1) * itemsPerPage + index + 1}</td>
                                                    <td className="p-3 text-slate-600 text-sm">
                                                        {formatDate(transaction.transaction_date)}
                                                    </td>
                                                    <td className="p-4">
                                                        {getParticularsDisplay(transaction)}
                                                    </td>
                                                    <td className="p-4">
                                                        <span className={`px-3 py-1 rounded-lg text-xs font-medium border w-fit ${getTransactionTypeColor(transaction)}`}>
                                                            {getTransactionTypeDisplay(transaction)}
                                                        </span>
                                                    </td>
                                                    <td className="p-4">
                                                        <span className="text-sm font-mono text-slate-600">
                                                            {transaction.invoice_no || 'N/A'}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 text-right">
                                                        {amounts.debit > 0 ? (
                                                            <span className="text-sm font-semibold text-green-600">
                                                                ₹{formatCurrency(amounts.debit)}
                                                            </span>
                                                        ) : (
                                                            <span className="text-sm text-slate-600">₹{formatCurrency(0)}</span>
                                                        )}
                                                    </td>
                                                    <td className="p-4 text-right">
                                                        {amounts.credit > 0 ? (
                                                            <span className="text-sm font-semibold text-red-600">
                                                                ₹{formatCurrency(amounts.credit)}
                                                            </span>
                                                        ) : (
                                                            <span className="text-sm text-slate-600">₹{formatCurrency(0)}</span>
                                                        )}
                                                    </td>
                                                    <td className="p-4 text-right">
                                                        <span className={`text-sm font-bold ${amounts.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                            ₹{formatCurrency(amounts.balance)}
                                                            {amounts.balance < 0 && <span className="text-xs ml-1">(OD)</span>}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 text-center relative">
                                                        <button
                                                            onClick={(e) => handleActionClick(e, transaction.transaction_id)}
                                                            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                                                        >
                                                            <FiMoreVertical className="w-5 h-5 text-slate-600" />
                                                        </button>
                                                        
                                                        {/* Action Menu */}
                                                        {showActionMenu === transaction.transaction_id && (
                                                            <div className="absolute right-0 mt-2 w-40 bg-white rounded-lg shadow-xl border border-slate-200 py-1 z-50">
                                                                <button
                                                                    onClick={() => handleViewDetails(transaction)}
                                                                    className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-indigo-50 flex items-center gap-2 transition-colors"
                                                                >
                                                                    <FiEye className="w-4 h-4 text-indigo-600" />
                                                                    Details
                                                                </button>
                                                                <button
                                                                    onClick={() => handleEdit(transaction)}
                                                                    className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-blue-50 flex items-center gap-2 transition-colors"
                                                                >
                                                                    <FiEdit2 className="w-4 h-4 text-blue-600" />
                                                                    Edit
                                                                </button>
                                                                <button
                                                                    onClick={() => handleViewInvoice(transaction)}
                                                                    className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-blue-50 flex items-center gap-2 transition-colors"
                                                                >
                                                                    <FiFile className="w-4 h-4 text-green-600" />
                                                                    Invoice
                                                                </button>
                                                            </div>
                                                        )}
                                                    </td>
                                                </motion.tr>
                                            );
                                        })
                                    )}

                                    {/* Total Row - Always Show */}
                                    {transactions.length > 0 && (
                                        <tr className="bg-slate-100 font-bold border-t-2 border-slate-300">
                                            <td className="p-4 text-slate-800" colSpan="5">Total</td>
                                            <td className="p-4 text-right text-green-600">₹{formatCurrency(summary.totalDebit)}</td>
                                            <td className="p-4 text-right text-red-600">₹{formatCurrency(summary.totalCredit)}</td>
                                            <td className={`p-4 text-right ${summary.closingBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                ₹{formatCurrency(summary.closingBalance)}
                                            </td>
                                            <td className="p-4"> </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {!loading && !fetchingTransactions && (transactions.length > 0 || totalItems > 0) && totalPages > 0 && (
                            <div className="border-t border-slate-200 px-6 py-4 bg-white">
                                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                                    <div className="flex flex-wrap items-center gap-4">
                                        <div className="text-sm text-slate-600">
                                            Showing {totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} entries
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <label htmlFor="limit-select" className="text-sm text-slate-500">Show</label>
                                            <select
                                                id="limit-select"
                                                value={itemsPerPage}
                                                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                                                className="px-2 py-1.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white text-slate-700"
                                            >
                                                {LIMIT_OPTIONS.map((n) => (
                                                    <option key={n} value={n}>{n}</option>
                                                ))}
                                            </select>
                                            <span className="text-sm text-slate-500">per page</span>
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-3">
                                        <div className="flex items-center gap-1">
                                            <button
                                                type="button"
                                                onClick={(e) => { e.stopPropagation(); handlePageChange(currentPage - 1); }}
                                                disabled={currentPage <= 1}
                                                className="px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white"
                                            >
                                                Previous
                                            </button>
                                            <span className="px-3 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg min-w-[2.5rem] text-center">
                                                {currentPage}
                                            </span>
                                            <span className="text-slate-400 text-sm px-1">/</span>
                                            <span className="px-2 py-2 text-sm font-medium text-slate-600">
                                                {totalPages}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={(e) => { e.stopPropagation(); handlePageChange(currentPage + 1); }}
                                                disabled={currentPage >= totalPages}
                                                className="px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white"
                                            >
                                                Next
                                            </button>
                                        </div>
                                        <form onSubmit={handlePageJump} className="flex items-center gap-2">
                                            <span className="text-sm text-slate-500">Go to</span>
                                            <input
                                                type="number"
                                                min={1}
                                                max={totalPages}
                                                value={pageJumpInput}
                                                onChange={(e) => setPageJumpInput(e.target.value)}
                                                placeholder={String(currentPage)}
                                                className="w-14 px-2 py-1.5 text-sm text-center border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                            />
                                            <button
                                                type="submit"
                                                className="px-2 py-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors"
                                            >
                                                Go
                                            </button>
                                        </form>
                                    </div>
                                </div>
                            </div>
                        )}
                    </motion.div>
                </div>
            </div>
        </div>
    );
};

export default TransactionHistory;