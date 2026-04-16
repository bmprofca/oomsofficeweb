import React, { useState, useEffect, useRef } from 'react';
import { Header, Sidebar } from '../components/header';
import {
    FiSearch,
    FiPlus,
    FiSettings,
    FiEdit,
    FiDollarSign,
    FiRepeat,
    FiMenu,
    FiChevronRight,
    FiTrendingUp,
    FiFilter,
    FiChevronDown,
    FiChevronUp,
    FiChevronLeft,
    FiChevronRight as FiChevronRightIcon,
    FiCreditCard,
    FiPrinter,
    FiX
} from 'react-icons/fi';
import { PiExportBold } from "react-icons/pi";
import { PiFilePdfDuotone, PiMicrosoftExcelLogoDuotone } from "react-icons/pi";
import { motion, AnimatePresence } from 'framer-motion';
import ContraTransfer from '../components/contra';
import DateFilter from '../components/DateFilter';
import API_BASE_URL from '../utils/api-controller';
import getHeaders from '../utils/get-headers';
import axios from 'axios';

const ViewContra = () => {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(() => {
        const saved = localStorage.getItem('sidebarMinimized');
        return saved ? JSON.parse(saved) : false;
    });
    const [dateRange, setDateRange] = useState('');
    const [fromToDate, setFromToDate] = useState('');
    const [loading, setLoading] = useState(false);
    const [contras, setContras] = useState([]);
    const [contraFormModal, setContraTransferModal] = useState(false);
    const [totalAmount, setTotalAmount] = useState(0);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

    // State for dropdown menus
    const [showAddDropdown, setShowAddDropdown] = useState(false);
    const [activeRowDropdown, setActiveRowDropdown] = useState(null);
    const [exportModal, setExportModal] = useState({ open: false, type: '', data: null });

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);
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

    // Fetch data when dependencies change
    useEffect(() => {
        if (fromDate && toDate) {
            fetchContraData();
        }
    }, [currentPage, debouncedSearchTerm, fromDate, toDate]);

    const handleContraSuccess = (contraData) => {
        console.log('Contra entry created successfully:', contraData);
        alert('Contra entry confirmed! Refreshing data...');
        fetchContraData(); // Refresh the list
    };

    const handleExport = (type, data = null) => {
        setExportModal({ open: true, type, data });
        
        // Simulate export process
        setTimeout(() => {
            setExportModal({ open: false, type: '', data: null });
            alert(`${type.toUpperCase()} export completed successfully!`);
        }, 1500);
    };

    // Format currency
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(parseFloat(amount));
    };

    // API call to fetch contra data
    const fetchContraData = async () => {
        setLoading(true);
        
        try {
            const headers = await getHeaders();
            const url = `${API_BASE_URL}/transaction/report/contra`;
            
            const params = {
                page_no: currentPage,
                limit: itemsPerPage,
                from_date: fromDate,
                to_date: toDate
            };
            
            // Add search parameter if search term exists
            if (debouncedSearchTerm.trim()) {
                params.search = debouncedSearchTerm.trim();
            }
            
            const response = await axios.get(url, {
                headers,
                params
            });
            
            if (response.data.success) {
                const contraData = transformApiData(response.data.data);
                setContras(contraData);
                
                // Update pagination info
                setTotalItems(response.data.meta.total);
                setIsLastPage(response.data.meta.is_last_page);
                
                // Calculate total amount from current page
                const total = contraData.reduce((acc, item) => acc + item.amount, 0);
                setTotalAmount(total);
            }
        } catch (error) {
            console.error('Error fetching contra data:', error);
            alert('Failed to fetch contra entries. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Transform API response to match the component's expected format
    const transformApiData = (apiData) => {
        return apiData.map((item, index) => {
            // Extract from bank details from payment_from
            const fromBank = item.payment_from?.details || {};
            // Extract to bank details from payment_to
            const toBank = item.payment_to?.details || {};
            
            return {
                contra_id: item.transaction_id,
                invoice_id: item.invoice_id,
                invoice_no: item.invoice_no,
                date: formatDateForDisplay(item.transaction_date),
                // From Bank Details (payment_from)
                out_bank: fromBank.bank || 'N/A',
                out_account: fromBank.account_no || 'N/A',
                out_holder: fromBank.holder || 'N/A',
                out_type: fromBank.type || 'N/A',
                out_ifsc: fromBank.ifsc || 'N/A',
                out_branch: fromBank.branch || 'N/A',
                // To Bank Details (payment_to)
                in_bank: toBank.bank || 'N/A',
                in_account: toBank.account_no || 'N/A',
                in_holder: toBank.holder || 'N/A',
                in_type: toBank.type || 'N/A',
                in_ifsc: toBank.ifsc || 'N/A',
                in_branch: toBank.branch || 'N/A',
                amount: parseFloat(item.amount),
                remark: item.remark || '',
                raw_data: item // Keep raw data for reference
            };
        });
    };

    // Format date from API to display format
    const formatDateForDisplay = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };

    // Format date for API (YYYY-MM-DD)
    const formatDateForAPI = (date) => {
        return date.toLocaleDateString('en-CA'); // YYYY-MM-DD format
    };

    // Handle search input change
    const handleSearchChange = (e) => {
        setSearchTerm(e.target.value);
    };

    // Clear search
    const clearSearch = () => {
        setSearchTerm('');
        setDebouncedSearchTerm('');
        setCurrentPage(1);
    };

    // Handle date filter change
    const handleDateFilterChange = (filter) => {
        console.log('Selected filter:', filter);
        if (filter.range) {
            setDateRange(filter.range);
            const [from, to] = filter.range.split(' - ');
            
            // Parse dates for API format
            const parseDate = (dateStr) => {
                const [day, month, year] = dateStr.split('/');
                return `${year}-${month}-${day}`;
            };
            
            const fromDateFormatted = parseDate(from);
            const toDateFormatted = parseDate(to);
            
            setFromDate(fromDateFormatted);
            setToDate(toDateFormatted);
            setFromToDate(`From ${from} to ${to}`);
            setCurrentPage(1); // Reset to first page on date change
        }
    };

    // Initialize with current month date range
    useEffect(() => {
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        
        const from = formatDateForAPI(firstDay);
        const to = formatDateForAPI(today);
        
        setFromDate(from);
        setToDate(to);
        
        // Format for display
        const formatDisplayDate = (date) => {
            return date.toLocaleDateString('en-GB', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
        };
        
        const fromDisplay = formatDisplayDate(firstDay);
        const toDisplay = formatDisplayDate(today);
        
        setDateRange(`${fromDisplay} - ${toDisplay}`);
        setFromToDate(`From ${fromDisplay} to ${toDisplay}`);
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

    // Format date
    const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-GB');
    };

    // Toggle row dropdown
    const toggleRowDropdown = (contraId) => {
        setActiveRowDropdown(activeRowDropdown === contraId ? null : contraId);
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

    // Pagination handlers
    const goToNextPage = () => {
        if (!isLastPage) {
            setCurrentPage(prev => prev + 1);
        }
    };

    const goToPrevPage = () => {
        if (currentPage > 1) {
            setCurrentPage(prev => prev - 1);
        }
    };

    // Get account type color for bank type
    const getBankTypeColor = (type) => {
        switch(type?.toLowerCase()) {
            case 'savings': return 'bg-blue-100 text-blue-700';
            case 'current': return 'bg-emerald-100 text-emerald-700';
            case 'salary': return 'bg-purple-100 text-purple-700';
            case 'fixed': return 'bg-orange-100 text-orange-700';
            default: return 'bg-slate-100 text-slate-700';
        }
    };

    // Skeleton loader component
    const SkeletonRow = () => (
        <tr className="border-b border-slate-100 animate-pulse">
            <td className="p-3 text-center">
                <div className="h-4 bg-slate-200 rounded w-6 mx-auto"></div>
            </td>
            <td className="p-3 text-center">
                <div className="h-4 bg-slate-200 rounded w-16 mx-auto"></div>
            </td>
            <td className="p-3 text-center">
                <div className="h-4 bg-slate-200 rounded w-16 mx-auto"></div>
            </td>
            <td className="p-3 text-center">
                <div className="h-4 bg-slate-200 rounded w-24 mx-auto"></div>
            </td>
            <td className="p-3 text-center">
                <div className="h-4 bg-slate-200 rounded w-24 mx-auto"></div>
            </td>
            <td className="p-3 text-center">
                <div className="h-6 bg-slate-200 rounded w-16 mx-auto"></div>
            </td>
            <td className="p-3 text-center">
                <div className="h-6 bg-slate-200 rounded w-20 mx-auto"></div>
            </td>
            <td className="p-3 text-center">
                <div className="h-6 bg-slate-200 rounded w-10 mx-auto"></div>
            </td>
        </tr>
    );

    // Skeleton Loading Component for full page
    const SkeletonLoader = () => (
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
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200">
                        {/* Skeleton Header */}
                        <div className="border-b border-slate-200 px-6 py-4">
                            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                                <div>
                                    <div className="h-6 bg-gray-200 rounded w-48 mb-2"></div>
                                    <div className="h-4 bg-gray-200 rounded w-32"></div>
                                </div>
                                <div className="flex gap-3">
                                    <div className="h-10 bg-gray-200 rounded w-40"></div>
                                    <div className="h-10 bg-gray-200 rounded w-32"></div>
                                </div>
                            </div>
                        </div>

                        {/* Skeleton Table */}
                        <div className="overflow-hidden">
                            <div className="border-b border-slate-200">
                                <table className="w-full text-sm">
                                    <thead className="bg-gradient-to-r from-slate-50 to-slate-100">
                                        <tr>
                                            {[...Array(8)].map((_, i) => (
                                                <th key={i} className="text-center p-3">
                                                    <div className="h-4 bg-gray-200 rounded w-20 mx-auto"></div>
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                </table>
                            </div>

                            <div className="p-4">
                                {[...Array(6)].map((_, index) => (
                                    <div key={index} className="mb-4">
                                        <div className="h-12 bg-gray-100 rounded"></div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    // Show skeleton while loading
    if (loading && contras.length === 0) {
        return <SkeletonLoader />;
    }

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
                                <p className="text-blue-100 text-xs font-medium">Total Transfer Amount (Current Page)</p>
                                <h3 className="text-lg font-bold mt-1">₹{formatCurrency(totalAmount)}</h3>
                                <p className="text-blue-100 text-xs mt-1">
                                    Total Records: {totalItems}
                                </p>
                            </div>
                            <FiRepeat className="w-5 h-5 opacity-80" />
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
                                            <FiRepeat className="w-4 h-4 text-blue-600" />
                                        </div>
                                        <h5 className="text-lg font-bold text-slate-800">
                                            Contra Register
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
                                    {/* Search Bar */}
                                    <div className="relative w-full lg:w-64">
                                        <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                                        <input
                                            type="text"
                                            placeholder="Search by invoice no, bank name, remark..."
                                            value={searchTerm}
                                            onChange={handleSearchChange}
                                            className="w-full pl-9 pr-8 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        />
                                        {searchTerm && (
                                            <button
                                                onClick={clearSearch}
                                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                            >
                                                <FiX className="w-4 h-4" />
                                            </button>
                                        )}
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
                                                                onClick={() => handleExport('pdf')}
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
                                                                onClick={() => handleExport('excel')}
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
                                                                onClick={() => handleExport('print')}
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

                                        <motion.button
                                            onClick={() => setContraTransferModal(true)}
                                            className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white rounded-lg text-xs font-semibold transition-all duration-200 flex items-center gap-2 shadow-sm hover:shadow"
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                        >
                                            <FiPlus className="w-4 h-4" />
                                            Add Contra
                                        </motion.button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Table Container */}
                        <div className="w-full overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead className="bg-gradient-to-r from-slate-50 to-slate-100 sticky top-0">
                                    <tr>
                                        <th className="text-center p-3 font-semibold text-slate-700 text-[10px] uppercase tracking-wider w-[5%]">
                                            Sl No
                                        </th>
                                        <th className="text-center p-3 font-semibold text-slate-700 text-[10px] uppercase tracking-wider w-[8%]">
                                            Date
                                        </th>
                                        <th className="text-center p-3 font-semibold text-slate-700 text-[10px] uppercase tracking-wider w-[10%]">
                                            Voucher No
                                        </th>
                                        <th className="text-center p-3 font-semibold text-slate-700 text-[10px] uppercase tracking-wider w-[20%]">
                                            From Bank (Payment From)
                                        </th>
                                        <th className="text-center p-3 font-semibold text-slate-700 text-[10px] uppercase tracking-wider w-[20%]">
                                            To Bank (Payment To)
                                        </th>
                                        <th className="text-center p-3 font-semibold text-slate-700 text-[10px] uppercase tracking-wider w-[10%]">
                                            Amount
                                        </th>
                                        <th className="text-center p-3 font-semibold text-slate-700 text-[10px] uppercase tracking-wider w-[17%]">
                                            Remark
                                        </th>
                                        <th className="text-center p-3 font-semibold text-slate-700 text-[10px] uppercase tracking-wider w-[10%]">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-slate-100">
                                    {loading ? (
                                        // Show skeleton rows while loading
                                        [...Array(5)].map((_, idx) => (
                                            <SkeletonRow key={idx} />
                                        ))
                                    ) : contras.length === 0 ? (
                                        <tr>
                                            <td colSpan="8" className="text-center py-8 text-slate-500">
                                                <div className="flex flex-col items-center justify-center">
                                                    <div className="p-3 bg-slate-100 rounded-full mb-3">
                                                        <FiRepeat className="w-8 h-8 text-slate-400" />
                                                    </div>
                                                    <p className="text-slate-600 text-sm font-medium mb-1">No contra records found</p>
                                                    <p className="text-slate-500 text-xs mb-4">
                                                        {searchTerm ? 'Try adjusting your search or date filter' : 'Start by creating your first contra entry'}
                                                    </p>
                                                    {!searchTerm && (
                                                        <motion.button
                                                            onClick={() => setContraTransferModal(true)}
                                                            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg text-xs font-semibold hover:shadow transition-all duration-200"
                                                            whileHover={{ scale: 1.02 }}
                                                            whileTap={{ scale: 0.98 }}
                                                        >
                                                            Create Your First Contra Entry
                                                        </motion.button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        contras.map((contra, index) => {
                                            const isDropdownOpen = activeRowDropdown === contra.contra_id;
                                            const serialNumber = (currentPage - 1) * itemsPerPage + index + 1;
                                            
                                            return (
                                                <motion.tr
                                                    key={contra.contra_id}
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    transition={{ duration: 0.15 }}
                                                    className="hover:bg-blue-50/20 transition-colors duration-150"
                                                >
                                                    <td className="text-center p-3 align-middle">
                                                        <div className="text-slate-700 font-medium text-xs">
                                                            {serialNumber}
                                                        </div>
                                                    </td>
                                                    <td className="text-center p-3 align-middle">
                                                        <div className="font-medium text-slate-700 text-xs">
                                                            {formatDate(contra.date)}
                                                        </div>
                                                    </td>
                                                    <td className="text-center p-3 align-middle">
                                                        <span className="inline-flex items-center justify-center bg-gradient-to-r from-slate-100 to-slate-200 text-slate-800 font-bold px-3 py-1.5 rounded text-xs border border-slate-300/50">
                                                            {contra.invoice_no}
                                                        </span>
                                                    </td>
                                                    {/* From Bank Column - payment_from data */}
                                                    <td className="text-center p-3 align-middle">
                                                        <div className="px-2">
                                                            <div className="text-slate-800 font-semibold text-xs truncate" title={contra.out_bank}>
                                                                {contra.out_bank}
                                                            </div>
                                                            <div className="flex flex-col items-center gap-1 mt-1">
                                                                <div className="text-slate-600 text-[10px] truncate" title={contra.out_account}>
                                                                    A/C: {contra.out_account}
                                                                </div>
                                                                <div className="flex items-center gap-1 flex-wrap justify-center">
                                                                    <span className="text-slate-500 text-[10px] truncate max-w-[80px]" title={contra.out_holder}>
                                                                        {contra.out_holder}
                                                                    </span>
                                                                    <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-medium capitalize whitespace-nowrap ${getBankTypeColor(contra.out_type)}`}>
                                                                        {contra.out_type}
                                                                    </span>
                                                                </div>
                                                                {contra.out_ifsc && contra.out_ifsc !== 'N/A' && (
                                                                    <div className="text-slate-400 text-[8px] truncate">
                                                                        IFSC: {contra.out_ifsc}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    {/* To Bank Column - payment_to data */}
                                                    <td className="text-center p-3 align-middle">
                                                        <div className="px-2">
                                                            <div className="text-slate-800 font-semibold text-xs truncate" title={contra.in_bank}>
                                                                {contra.in_bank}
                                                            </div>
                                                            <div className="flex flex-col items-center gap-1 mt-1">
                                                                <div className="text-slate-600 text-[10px] truncate" title={contra.in_account}>
                                                                    A/C: {contra.in_account}
                                                                </div>
                                                                <div className="flex items-center gap-1 flex-wrap justify-center">
                                                                    <span className="text-slate-500 text-[10px] truncate max-w-[80px]" title={contra.in_holder}>
                                                                        {contra.in_holder}
                                                                    </span>
                                                                    <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-medium capitalize whitespace-nowrap ${getBankTypeColor(contra.in_type)}`}>
                                                                        {contra.in_type}
                                                                    </span>
                                                                </div>
                                                                {contra.in_ifsc && contra.in_ifsc !== 'N/A' && (
                                                                    <div className="text-slate-400 text-[8px] truncate">
                                                                        IFSC: {contra.in_ifsc}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="text-center p-3 align-middle">
                                                        <span className="inline-flex items-center justify-center bg-gradient-to-r from-green-50 to-green-100 text-green-800 font-bold px-3 py-1.5 rounded text-xs">
                                                            ₹{formatCurrency(contra.amount)}
                                                        </span>
                                                    </td>
                                                    <td className="text-center p-3 align-middle">
                                                        <div className="px-2">
                                                            <div className="text-slate-500 text-[10px] italic truncate" title={contra.remark}>
                                                                {contra.remark || '-'}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="text-center p-3 align-middle">
                                                        <div className="dropdown-container relative flex justify-center">
                                                            <motion.button
                                                                className="p-1.5 text-slate-500 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors duration-150 border border-slate-200 hover:border-blue-300"
                                                                onClick={() => toggleRowDropdown(contra.contra_id)}
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
                                                                            <a 
                                                                                href={`/edit-contra-entry?redirect=${window.location.href}&contra_id=${contra.contra_id}`}
                                                                                className="flex items-center w-full px-3 py-2 text-xs text-slate-700 hover:bg-blue-50 transition-colors duration-150"
                                                                                onClick={() => setActiveRowDropdown(null)}
                                                                            >
                                                                                <div className="p-1 bg-blue-50 rounded mr-2">
                                                                                    <FiEdit className="w-3 h-3 text-blue-500" />
                                                                                </div>
                                                                                <div className="text-left">
                                                                                    <div className="font-medium">Edit Contra</div>
                                                                                </div>
                                                                            </a>
                                                                            <div className="border-t border-slate-100 mt-1 pt-1">
                                                                                <button
                                                                                    className="flex items-center w-full px-3 py-2 text-xs text-slate-700 hover:bg-blue-50 transition-colors duration-150"
                                                                                    onClick={() => handleExport('print', contra)}
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
                                                    </td>
                                                </motion.tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {!loading && contras.length > 0 && (
                            <div className="border-t border-slate-200 px-6 py-4 bg-slate-50 flex flex-col sm:flex-row justify-between items-center gap-3">
                                <div className="text-xs text-slate-600">
                                    Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} entries
                                </div>
                                <div className="flex items-center gap-2">
                                    <motion.button
                                        onClick={goToPrevPage}
                                        disabled={currentPage === 1}
                                        className={`p-2 rounded-lg border transition-all duration-200 ${
                                            currentPage === 1
                                                ? 'border-slate-200 text-slate-300 cursor-not-allowed'
                                                : 'border-slate-300 text-slate-600 hover:bg-blue-50 hover:border-blue-300'
                                        }`}
                                        whileHover={currentPage !== 1 ? { scale: 1.05 } : {}}
                                        whileTap={currentPage !== 1 ? { scale: 0.95 } : {}}
                                    >
                                        <FiChevronLeft className="w-4 h-4" />
                                    </motion.button>
                                    <span className="px-3 py-1 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-700">
                                        Page {currentPage} of {Math.ceil(totalItems / itemsPerPage)}
                                    </span>
                                    <motion.button
                                        onClick={goToNextPage}
                                        disabled={isLastPage}
                                        className={`p-2 rounded-lg border transition-all duration-200 ${
                                            isLastPage
                                                ? 'border-slate-200 text-slate-300 cursor-not-allowed'
                                                : 'border-slate-300 text-slate-600 hover:bg-blue-50 hover:border-blue-300'
                                        }`}
                                        whileHover={!isLastPage ? { scale: 1.05 } : {}}
                                        whileTap={!isLastPage ? { scale: 0.95 } : {}}
                                    >
                                        <FiChevronRightIcon className="w-4 h-4" />
                                    </motion.button>
                                </div>
                            </div>
                        )}
                    </motion.div>
                </div>
            </div>

            {/* Modals */}
            <ContraTransfer
                isOpen={contraFormModal}
                onClose={() => setContraTransferModal(false)}
                onSuccess={handleContraSuccess}
                mode="modal"
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

export default ViewContra;