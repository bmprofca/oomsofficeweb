import React, { useState, useEffect } from 'react';
import {
    FiSearch,
    FiPlus,
    FiSettings,
    FiEdit,
    FiFileText,
    FiDollarSign,
    FiUsers,
    FiUser,
    FiCreditCard,
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
    FiChevronRight as FiChevronRightIcon
} from 'react-icons/fi';
import { PiExportBold } from "react-icons/pi";
import { PiFilePdfDuotone, PiMicrosoftExcelLogoDuotone } from "react-icons/pi";
import { AiOutlineMail } from "react-icons/ai";
import { FaWhatsapp } from "react-icons/fa6";
import { motion, AnimatePresence } from 'framer-motion';
import EmailSelectionModal from '../components/email-selection';
import MobileSelectionModal from '../components/mobile-selection';
import PurchaseForm from '../components/purchase-form';
import DateFilter from '../components/DateFilter';
import { Header, Sidebar } from '../components/header';
import API_BASE_URL from '../utils/api-controller';
import getHeaders from '../utils/get-headers';

const ViewPurchase = () => {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(() => {
        const saved = localStorage.getItem('sidebarMinimized');
        return saved ? JSON.parse(saved) : false;
    });
    const [dateRange, setDateRange] = useState('');
    const [fromToDate, setFromToDate] = useState('');
    const [loading, setLoading] = useState(false);
    const [purchases, setPurchases] = useState([]);
    const [purchaseFormModal, setPurchaseFormModal] = useState(false);
    const [summary, setSummary] = useState({
        total: 0,
        tax: 0,
        grand_total: 0
    });

    // State for dropdown menus
    const [showAddDropdown, setShowAddDropdown] = useState(false);
    const [activeRowDropdown, setActiveRowDropdown] = useState(null);
    const [exportModal, setExportModal] = useState({ open: false, type: '', data: null });

    const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
    const [selectedEmail, setSelectedEmail] = useState('');

    const [isWhatsappModalOpen, setWhatsappModalOpen] = useState(false);
    const [selectedWhatsapp, setSelectedWhatsapp] = useState('');

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [showAll, setShowAll] = useState(false);
    const [totalItems, setTotalItems] = useState(0);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedDateFilter, setSelectedDateFilter] = useState(null);
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
        // Refresh the purchase list
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

    const handleExport = (type, data = null) => {
        setExportModal({ open: true, type, data });
        
        // Simulate export process
        setTimeout(() => {
            setExportModal({ open: false, type: '', data: null });
            alert(`${type.toUpperCase()} export completed successfully!`);
        }, 1500);
    };

    // Initialize with current month date range
    useEffect(() => {
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        
        const formatDateForAPI = (date) => {
            return date.toISOString().split('T')[0];
        };
        
        const formatDateForDisplay = (date) => {
            return date.toLocaleDateString('en-GB', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            }).replace(/\//g, '/');
        };

        const fromDate = formatDateForAPI(firstDay);
        const toDate = formatDateForAPI(today);
        const fromDisplay = formatDateForDisplay(firstDay);
        const toDisplay = formatDateForDisplay(today);

        setDateRange(`${fromDisplay} - ${toDisplay}`);
        setFromToDate(`From ${fromDisplay} to ${toDisplay}`);
        fetchPurchaseData(fromDate, toDate, 1, itemsPerPage, '');
    }, []);

    // Format currency
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount);
    };

    // API call to fetch purchase data
    const fetchPurchaseData = async (fromDate = null, toDate = null, pageNo = currentPage, limit = itemsPerPage, search = searchTerm) => {
        setLoading(true);
        setError(null);
        
        try {
            // Get current date if not provided
            const today = new Date();
            const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
            
            const formatDateForAPI = (date) => {
                return date.toISOString().split('T')[0];
            };
            
            const from = fromDate || formatDateForAPI(firstDay);
            const to = toDate || formatDateForAPI(today);
            
            // Build URL with query parameters
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
                // Transform API data to match component structure
                const transformedData = result.data.map(item => ({
                    invoice_id: item.invoice_id,
                    invoice_no: item.invoice_no,
                    date: item.transaction_date,
                    particulars: item.remark || 'No particulars',
                    purchase_from: item.purchase_type,
                    firm_name: item.purchase_type === 'client' ? item.purchase_party?.name : 
                              item.purchase_type === 'bank' ? item.purchase_party?.holder : '',
                    remark: item.remark,
                    total: parseFloat(item.calculation?.subtotal || 0),
                    tax: parseFloat(item.calculation?.gst_value || 0),
                    grand_total: parseFloat(item.calculation?.grand_total || 0),
                    task_id: null,
                    purchase_party: item.purchase_party,
                    calculation: item.calculation
                }));
                
                setPurchases(transformedData);
                
                // Calculate summary from stats
                if (result.stats) {
                    setSummary({
                        total: result.stats.amount || 0,
                        tax: result.stats.tax || 0,
                        grand_total: result.stats.amount || 0
                    });
                } else {
                    // Fallback calculation
                    const summaryData = transformedData.reduce((acc, purchase) => ({
                        total: acc.total + purchase.total,
                        tax: acc.tax + purchase.tax,
                        grand_total: acc.grand_total + purchase.grand_total
                    }), { total: 0, tax: 0, grand_total: 0 });
                    setSummary(summaryData);
                }
                
                // Update pagination info
                if (result.meta) {
                    setTotalItems(result.meta.total);
                    setItemsPerPage(result.meta.limit);
                    // Check if we're on the last page
                    if (result.meta.is_last_page && currentPage !== result.meta.page_no) {
                        setCurrentPage(result.meta.page_no);
                    }
                }
            } else {
                console.error('API returned error:', result);
                setPurchases([]);
                setSummary({ total: 0, tax: 0, grand_total: 0 });
                setError(result.message || 'Failed to fetch purchase data');
            }
        } catch (error) {
            console.error('Error fetching purchase data:', error);
            setPurchases([]);
            setSummary({ total: 0, tax: 0, grand_total: 0 });
            setError(error.message || 'Network error. Please check your connection.');
        } finally {
            setLoading(false);
        }
    };

    // Handle search
    const handleSearch = () => {
        const [fromDisplay, toDisplay] = dateRange.split(' - ');
        
        // Parse dates from display format to API format
        const parseDate = (dateStr) => {
            const [day, month, year] = dateStr.split('/');
            return `${year}-${month}-${day}`;
        };
        
        const fromDate = parseDate(fromDisplay);
        const toDate = parseDate(toDisplay);
        
        setFromToDate(`From ${fromDisplay} to ${toDisplay}`);
        setCurrentPage(1); // Reset to first page on search
        fetchPurchaseData(fromDate, toDate, 1, itemsPerPage, searchTerm);
    };

    // Handle date filter change
    const handleDateFilterChange = (filter) => {
        console.log('Selected filter:', filter);
        setSelectedDateFilter(filter);
        
        if (filter.range) {
            setDateRange(filter.range);
            const [fromDisplay, toDisplay] = filter.range.split(' - ');
            
            // Parse dates from display format to API format
            const parseDate = (dateStr) => {
                const [day, month, year] = dateStr.split('/');
                return `${year}-${month}-${day}`;
            };
            
            const fromDate = parseDate(fromDisplay);
            const toDate = parseDate(toDisplay);
            
            setFromToDate(`From ${fromDisplay} to ${toDisplay}`);
            setCurrentPage(1); // Reset to first page on date change
            fetchPurchaseData(fromDate, toDate, 1, itemsPerPage, searchTerm);
        }
    };

    // Handle search input change
    const handleSearchInputChange = (e) => {
        setSearchTerm(e.target.value);
    };

    // Handle search on enter key
    const handleSearchKeyPress = (e) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    };

    // Handle page change
    const handlePageChange = (newPage) => {
        setCurrentPage(newPage);
        
        const [fromDisplay, toDisplay] = dateRange.split(' - ');
        const parseDate = (dateStr) => {
            const [day, month, year] = dateStr.split('/');
            return `${year}-${month}-${day}`;
        };
        
        const fromDate = parseDate(fromDisplay);
        const toDate = parseDate(toDisplay);
        
        fetchPurchaseData(fromDate, toDate, newPage, itemsPerPage, searchTerm);
    };

    // Handle items per page change
    const handleItemsPerPageChange = (newLimit) => {
        setItemsPerPage(newLimit);
        setCurrentPage(1);
        
        const [fromDisplay, toDisplay] = dateRange.split(' - ');
        const parseDate = (dateStr) => {
            const [day, month, year] = dateStr.split('/');
            return `${year}-${month}-${day}`;
        };
        
        const fromDate = parseDate(fromDisplay);
        const toDate = parseDate(toDisplay);
        
        fetchPurchaseData(fromDate, toDate, 1, newLimit, searchTerm);
    };

    // Handle refresh
    const handleRefresh = () => {
        const [fromDisplay, toDisplay] = dateRange.split(' - ');
        const parseDate = (dateStr) => {
            const [day, month, year] = dateStr.split('/');
            return `${year}-${month}-${day}`;
        };
        
        const fromDate = parseDate(fromDisplay);
        const toDate = parseDate(toDisplay);
        
        fetchPurchaseData(fromDate, toDate, currentPage, itemsPerPage, searchTerm);
    };

    // Get edit link and invoice link based on purchase_from
    const getActionLinks = (purchase) => {
        let editLink = '';
        let invoiceLink = '';

        switch (purchase.purchase_from) {
            case 'ca':
                editLink = `/edit-purchase-ca?redirect=${window.location.href}&invoice_id=${purchase.invoice_id}`;
                invoiceLink = `/preview-invoice-purchase?invoice_id=${purchase.invoice_id}`;
                break;
            case 'client':
                editLink = `/edit-purchase-client?redirect=${window.location.href}&invoice_id=${purchase.invoice_id}`;
                invoiceLink = `/preview-invoice-purchase?invoice_id=${purchase.invoice_id}`;
                break;
            case 'bank':
            case 'cash':
            case 'savings':
            case 'current':
            case 'loan':
                editLink = `/edit-purchase-bank?redirect=${window.location.href}&invoice_id=${purchase.invoice_id}`;
                invoiceLink = `/preview-invoice-purchase?invoice_id=${purchase.invoice_id}`;
                break;
            case 'capital':
                editLink = `/edit-purchase-capital?redirect=${window.location.href}&invoice_id=${purchase.invoice_id}`;
                invoiceLink = `/preview-invoice-purchase?invoice_id=${purchase.invoice_id}`;
                break;
            default:
                editLink = '#';
                invoiceLink = '#';
        }

        return { editLink, invoiceLink };
    };

    // Format date
    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-GB');
    };

    // Toggle row dropdown
    const toggleRowDropdown = (invoiceId) => {
        setActiveRowDropdown(activeRowDropdown === invoiceId ? null : invoiceId);
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

    // Get current items based on pagination (for display, but API handles pagination)
    const currentItems = purchases;
    const totalPages = Math.ceil(totalItems / itemsPerPage);

    // Calculate paginated summary (for current page)
    const paginatedSummary = currentItems.reduce((acc, purchase) => ({
        total: acc.total + purchase.total,
        tax: acc.tax + purchase.tax,
        grand_total: acc.grand_total + purchase.grand_total
    }), { total: 0, tax: 0, grand_total: 0 });

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
                <div className="h-4 bg-slate-200 rounded w-24 mx-auto"></div>
            </td>
            <td className="p-3 text-center">
                <div className="h-4 bg-slate-200 rounded w-16 mx-auto"></div>
            </td>
            <td className="p-3 text-center">
                <div className="h-6 bg-slate-200 rounded w-16 mx-auto"></div>
            </td>
            <td className="p-3 text-center">
                <div className="h-6 bg-slate-200 rounded w-16 mx-auto"></div>
            </td>
            <td className="p-3 text-center">
                <div className="h-6 bg-slate-200 rounded w-16 mx-auto"></div>
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

    // Show skeleton while loading and no data
    if (loading && purchases.length === 0) {
        return <SkeletonLoader />;
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
                    {/* Error Alert */}
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4"
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="text-red-500">⚠️</div>
                                    <p className="text-red-700 text-sm">{error}</p>
                                </div>
                                <button
                                    onClick={() => setError(null)}
                                    className="text-red-500 hover:text-red-700"
                                >
                                    ✕
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {/* Header Stats Cards - Smaller */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                        <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.2 }}
                            className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-4 text-white shadow-md"
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-blue-100 text-xs font-medium">Total Value</p>
                                    <h3 className="text-lg font-bold mt-1">₹{formatCurrency(summary.total)}</h3>
                                </div>
                                <FiDollarSign className="w-5 h-5 opacity-80" />
                            </div>
                        </motion.div>

                        <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.2, delay: 0.1 }}
                            className="bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-lg p-4 text-white shadow-md"
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-emerald-100 text-xs font-medium">Total Tax</p>
                                    <h3 className="text-lg font-bold mt-1">₹{formatCurrency(summary.tax)}</h3>
                                </div>
                                <FiTrendingUp className="w-5 h-5 opacity-80" />
                            </div>
                        </motion.div>

                        <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.2, delay: 0.2 }}
                            className="bg-gradient-to-r from-violet-500 to-violet-600 rounded-lg p-4 text-white shadow-md"
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-violet-100 text-xs font-medium">Grand Total</p>
                                    <h3 className="text-lg font-bold mt-1">₹{formatCurrency(summary.grand_total)}</h3>
                                </div>
                                <FiCreditCard className="w-5 h-5 opacity-80" />
                            </div>
                        </motion.div>
                    </div>

                    {/* Search and Filter Bar */}
                    <div className="mb-4 flex gap-2">
                        <div className="relative flex-1">
                            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                            <input
                                type="text"
                                placeholder="Search by invoice no, particulars, firm name..."
                                value={searchTerm}
                                onChange={handleSearchInputChange}
                                onKeyPress={handleSearchKeyPress}
                                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                            />
                        </div>
                        <button
                            onClick={handleSearch}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                        >
                            Search
                        </button>
                        <button
                            onClick={handleRefresh}
                            className="px-4 py-2 bg-slate-600 text-white rounded-lg text-sm font-medium hover:bg-slate-700 transition-colors"
                        >
                            Refresh
                        </button>
                    </div>

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
                                            Purchase Register
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
                                            onClick={() => setPurchaseFormModal(true)}
                                            className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white rounded-lg text-xs font-semibold transition-all duration-200 flex items-center gap-2 shadow-sm hover:shadow"
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                        >
                                            <FiPlus className="w-4 h-4" />
                                            Add Purchase
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
                                        <th className="text-center p-3 font-semibold text-slate-700 text-[10px] uppercase tracking-wider min-w-[60px]">
                                            Sl No
                                        </th>
                                        <th className="text-center p-3 font-semibold text-slate-700 text-[10px] uppercase tracking-wider min-w-[80px]">
                                            Date
                                        </th>
                                        <th className="text-center p-3 font-semibold text-slate-700 text-[10px] uppercase tracking-wider min-w-[200px]">
                                            Particulars
                                        </th>
                                        <th className="text-center p-3 font-semibold text-slate-700 text-[10px] uppercase tracking-wider min-w-[120px]">
                                            Voucher No
                                        </th>
                                        <th className="text-center p-3 font-semibold text-slate-700 text-[10px] uppercase tracking-wider min-w-[100px]">
                                            T Value
                                        </th>
                                        <th className="text-center p-3 font-semibold text-slate-700 text-[10px] uppercase tracking-wider min-w-[100px]">
                                            Tax
                                        </th>
                                        <th className="text-center p-3 font-semibold text-slate-700 text-[10px] uppercase tracking-wider min-w-[100px]">
                                            Total
                                        </th>
                                        <th className="text-center p-3 font-semibold text-slate-700 text-[10px] uppercase tracking-wider min-w-[80px]">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-slate-100">
                                    {loading ? (
                                        // Show skeleton rows while loading
                                        [...Array(5)].map((_, index) => (
                                            <SkeletonRow key={index} />
                                        ))
                                    ) : purchases.length === 0 ? (
                                        <tr>
                                            <td colSpan="8" className="text-center py-8 text-slate-500">
                                                <div className="flex flex-col items-center justify-center">
                                                    <div className="p-3 bg-slate-100 rounded-full mb-3">
                                                        <FiFileText className="w-8 h-8 text-slate-400" />
                                                    </div>
                                                    <p className="text-slate-600 text-sm font-medium mb-1">No purchase records found</p>
                                                    <p className="text-slate-500 text-xs mb-4">Start by creating your first purchase entry</p>
                                                    <motion.button
                                                        onClick={() => setPurchaseFormModal(true)}
                                                        className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg text-xs font-semibold hover:shadow transition-all duration-200"
                                                        whileHover={{ scale: 1.02 }}
                                                        whileTap={{ scale: 0.98 }}
                                                    >
                                                        Create Your First Purchase
                                                    </motion.button>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        currentItems.map((purchase, index) => {
                                            const { editLink, invoiceLink } = getActionLinks(purchase);
                                            const showFirm = purchase.purchase_from && purchase.firm_name;
                                            const isDropdownOpen = activeRowDropdown === purchase.invoice_id;
                                            const actualIndex = (currentPage - 1) * itemsPerPage + index;

                                            return (
                                                <motion.tr
                                                    key={purchase.invoice_id}
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
                                                            {formatDate(purchase.date)}
                                                        </div>
                                                    </td>
                                                    <td className="text-center p-3 align-middle">
                                                        <div className="mx-auto max-w-[180px]">
                                                            <div className="text-slate-800 font-semibold text-xs">
                                                                {purchase.particulars}
                                                            </div>
                                                            <div className="flex flex-col items-center gap-1 mt-1">
                                                                {purchase.purchase_from && (
                                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium capitalize ${
                                                                        purchase.purchase_from === 'client' ? 'bg-blue-100 text-blue-700' :
                                                                        purchase.purchase_from === 'ca' ? 'bg-purple-100 text-purple-700' :
                                                                        purchase.purchase_from === 'bank' ? 'bg-amber-100 text-amber-700' :
                                                                        purchase.purchase_from === 'capital' ? 'bg-emerald-100 text-emerald-700' :
                                                                        'bg-slate-100 text-slate-700'
                                                                    }`}>
                                                                        {purchase.purchase_from}
                                                                    </span>
                                                                )}
                                                                {showFirm && (
                                                                    <span className="flex items-center justify-center gap-1 text-slate-600 text-[10px] bg-slate-100 px-2 py-0.5 rounded">
                                                                        <FiUsers className="w-2.5 h-2.5" />
                                                                        {purchase.firm_name}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            {purchase.remark && (
                                                                <div className="text-slate-500 text-[10px] text-center mt-1 italic truncate">
                                                                    "{purchase.remark}"
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="text-center p-3 align-middle">
                                                        <span className="inline-flex items-center justify-center bg-gradient-to-r from-slate-100 to-slate-200 text-slate-800 font-bold px-3 py-1.5 rounded text-xs border border-slate-300/50 shadow-xs">
                                                            {purchase.invoice_no}
                                                        </span>
                                                    </td>
                                                    <td className="text-center p-3 align-middle">
                                                        <span className="inline-flex items-center justify-center bg-gradient-to-r from-green-50 to-green-100 text-green-800 font-bold px-3 py-1.5 rounded text-xs min-w-[90px] shadow-xs">
                                                            ₹{formatCurrency(purchase.total)}
                                                        </span>
                                                    </td>
                                                    <td className="text-center p-3 align-middle">
                                                        <span className="inline-flex items-center justify-center bg-gradient-to-r from-amber-50 to-amber-100 text-amber-800 font-bold px-3 py-1.5 rounded text-xs min-w-[90px] shadow-xs">
                                                            ₹{formatCurrency(purchase.tax)}
                                                        </span>
                                                    </td>
                                                    <td className="text-center p-3 align-middle">
                                                        <span className="inline-flex items-center justify-center bg-gradient-to-r from-blue-50 to-blue-100 text-blue-800 font-bold px-3 py-1.5 rounded text-xs min-w-[90px] shadow-xs">
                                                            ₹{formatCurrency(purchase.grand_total)}
                                                        </span>
                                                    </td>
                                                    <td className="text-center p-3 align-middle">
                                                        <div className="dropdown-container relative flex justify-center">
                                                            <motion.button
                                                                className="p-1.5 text-slate-500 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors duration-150 border border-slate-200 hover:border-blue-300"
                                                                onClick={() => toggleRowDropdown(purchase.invoice_id)}
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
                                                                                href={editLink}
                                                                                className="flex items-center w-full px-3 py-2 text-xs text-slate-700 hover:bg-blue-50 transition-colors duration-150"
                                                                                onClick={() => setActiveRowDropdown(null)}
                                                                            >
                                                                                <div className="p-1 bg-blue-50 rounded mr-2">
                                                                                    <FiEdit className="w-3 h-3 text-blue-500" />
                                                                                </div>
                                                                                <div className="text-left">
                                                                                    <div className="font-medium">Edit Purchase</div>
                                                                                </div>
                                                                            </a>
                                                                            <div className="border-t border-slate-100 mt-1 pt-1">
                                                                                <button
                                                                                    className="flex items-center w-full px-3 py-2 text-xs text-slate-700 hover:bg-blue-50 transition-colors duration-150"
                                                                                    onClick={() => handleExport('print', purchase)}
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
                                                                                    onClick={() => handleExport('whatsapp', purchase)}
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
                                                                                    onClick={() => handleExport('email', purchase)}
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
                            {!loading && purchases.length > 0 && totalPages > 1 && (
                                <div className="border-t border-slate-200 bg-gradient-to-r from-slate-50 to-slate-100">
                                    <div className="flex flex-col sm:flex-row justify-between items-center px-4 py-3 gap-3">
                                        <div className="text-xs text-slate-600">
                                            Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} entries
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
                                                disabled={currentPage === totalPages}
                                                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
                                            >
                                                Next
                                                <FiChevronRightIcon className="w-3 h-3" />
                                            </button>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <select
                                                value={itemsPerPage}
                                                onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
                                                className="px-2 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                                            >
                                                <option value={5}>5 per page</option>
                                                <option value={10}>10 per page</option>
                                                <option value={20}>20 per page</option>
                                                <option value={50}>50 per page</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </div>
            </div>

            {/* Modals */}
            <PurchaseForm
                isOpen={purchaseFormModal}
                onClose={() => setPurchaseFormModal(false)}
                onSuccess={handlePurchaseSuccess}
                mode="modal"
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

export default ViewPurchase;