import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FiArrowLeft,
    FiRefreshCw,
    FiAlertCircle,
    FiUsers,
    FiDollarSign,
    FiCreditCard,
    FiShoppingBag,
    FiGift,
    FiEye,
    FiDownload,
    FiSearch,
    FiChevronLeft,
    FiChevronRight,
    FiUser,
    FiBriefcase,
    FiPhone,
    FiMail,
    FiCalendar as FiCalendarIcon,
    FiClock,
    FiX
} from 'react-icons/fi';
import { Sidebar, Header } from '../components/header';
import getHeaders from '../utils/get-headers';
import API_BASE_URL from '../utils/api-controller';

const QuickStatsDetailsPage = () => {
    const { type } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const locationState = location.state || {};
    
    // Sidebar state
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(() => {
        const saved = localStorage.getItem('sidebarMinimized');
        return saved ? JSON.parse(saved) : false;
    });
    
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [pagination, setPagination] = useState({
        page_no: 1,
        limit: 10,
        total: 0,
        total_pages: 1,
        is_last_page: false
    });
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedRows, setExpandedRows] = useState(new Set());

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

    const formatCurrency = (value) => {
        const amount = parseFloat(value) || 0;
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 2
        }).format(amount);
    };

    const formatNumber = (value) => {
        const num = parseInt(value) || 0;
        return new Intl.NumberFormat('en-IN').format(num);
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-IN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getTypeParam = () => {
        switch(type) {
            case 'pending-billing': return 'pending_billing';
            case 'creditors': return 'creditors';
            case 'debtors': return 'debtors';
            case 'today-received': return 'today_received';
            case 'today-payment': return 'today_payment';
            case 'today-birthday': return 'today_birthday';
            default: return type;
        }
    };

    const fetchDetails = async (pageNo = 1, limit = 10) => {
        try {
            setLoading(true);
            setError(null);
            
            const apiType = getTypeParam();
            const headers = getHeaders();
            const response = await fetch(
                `${API_BASE_URL}/report/dashboard/details?type=${apiType}&page_no=${pageNo}&limit=${limit}${searchTerm ? `&search=${encodeURIComponent(searchTerm)}` : ''}`,
                {
                    method: 'GET',
                    headers: {
                        ...headers,
                        'Content-Type': 'application/json',
                    },
                }
            );

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();

            if (result.success) {
                setData(result.data);
                if (result.data.pagination) {
                    setPagination(result.data.pagination);
                }
            } else {
                throw new Error(result.message || 'Failed to fetch details');
            }
        } catch (err) {
            console.error('Details API Error:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDetails();
    }, [type, searchTerm]);

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= pagination.total_pages) {
            fetchDetails(newPage, pagination.limit);
        }
    };

    const handleRefresh = () => {
        fetchDetails();
    };

    const handleClearSearch = () => {
        setSearchTerm('');
        setPagination(prev => ({ ...prev, page_no: 1 }));
    };

    const toggleRowExpand = (rowId) => {
        const newExpanded = new Set(expandedRows);
        if (newExpanded.has(rowId)) {
            newExpanded.delete(rowId);
        } else {
            newExpanded.add(rowId);
        }
        setExpandedRows(newExpanded);
    };

    const getPageTitle = () => {
        switch(type) {
            case 'pending-billing': return 'Pending Billing';
            case 'creditors': return 'Creditors List';
            case 'debtors': return 'Debtors List';
            case 'today-received': return "Today's Receipts";
            case 'today-payment': return "Today's Payments";
            case 'today-birthday': return "Today's Birthdays";
            default: return locationState.title || 'Details';
        }
    };

    const getPageDescription = () => {
        switch(type) {
            case 'pending-billing': return 'List of all pending billing invoices';
            case 'creditors': return 'List of all creditors with outstanding balances';
            case 'debtors': return 'List of all debtors with receivable balances';
            case 'today-received': return 'All payments received today';
            case 'today-payment': return 'All payments made today';
            case 'today-birthday': return 'Clients celebrating birthday today';
            default: return 'Detailed information';
        }
    };

    const getIcon = () => {
        switch(type) {
            case 'pending-billing': return <FiShoppingBag className="w-6 h-6" />;
            case 'creditors': return <FiUsers className="w-6 h-6" />;
            case 'debtors': return <FiDollarSign className="w-6 h-6" />;
            case 'today-received': return <FiDollarSign className="w-6 h-6" />;
            case 'today-payment': return <FiCreditCard className="w-6 h-6" />;
            case 'today-birthday': return <FiGift className="w-6 h-6" />;
            default: return <FiUsers className="w-6 h-6" />;
        }
    };

    const getGradient = () => {
        switch(type) {
            case 'pending-billing': return 'from-indigo-500 to-purple-600';
            case 'creditors': return 'from-cyan-500 to-blue-600';
            case 'debtors': return 'from-red-500 to-pink-600';
            case 'today-received': return 'from-green-500 to-emerald-600';
            case 'today-payment': return 'from-orange-500 to-amber-600';
            case 'today-birthday': return 'from-purple-500 to-violet-600';
            default: return 'from-indigo-500 to-purple-600';
        }
    };

    const renderPendingBillingTable = () => {
        const list = data?.list || [];
        
        if (list.length === 0) {
            return (
                <div className="text-center py-12">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                        <FiShoppingBag className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="text-gray-500">No pending bills found</p>
                </div>
            );
        }

        return (
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="w-10 p-4"></th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice No</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mobile</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {list.map((item, index) => (
                            <React.Fragment key={item.id || index}>
                                <tr className="hover:bg-gray-50 transition-colors">
                                    <td className="p-4">
                                        <button
                                            onClick={() => toggleRowExpand(item.id || index)}
                                            className="p-1 hover:bg-gray-100 rounded transition-colors"
                                        >
                                            {expandedRows.has(item.id || index) ? 
                                                <FiChevronRight className="w-4 h-4 transform rotate-90" /> : 
                                                <FiChevronRight className="w-4 h-4" />
                                            }
                                        </button>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        {item.invoice_no || 'N/A'}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm font-medium text-gray-900">{item.client_name}</div>
                                        <div className="text-xs text-gray-500">{item.email || 'No email'}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {item.mobile}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right">
                                        <span className="text-sm font-semibold text-orange-600">
                                            {formatCurrency(item.amount)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {formatDate(item.date)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                        <button 
                                            onClick={() => navigate(`/billing/${item.id || item.invoice_no}`)}
                                            className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition-colors text-sm"
                                        >
                                            <FiEye className="w-3 h-3" />
                                            View Bill
                                        </button>
                                    </td>
                                </tr>
                                <AnimatePresence>
                                    {expandedRows.has(item.id || index) && (
                                        <motion.tr
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            className="bg-gray-50"
                                        >
                                            <td colSpan={7} className="px-6 py-4">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div className="bg-white p-4 rounded-lg shadow-sm">
                                                        <h4 className="font-semibold text-gray-700 mb-2">Additional Details</h4>
                                                        <div className="space-y-1 text-sm">
                                                            <p><span className="text-gray-500">Description:</span> {item.description || 'N/A'}</p>
                                                            <p><span className="text-gray-500">Created By:</span> {item.created_by || 'N/A'}</p>
                                                        </div>
                                                    </div>
                                                    <div className="bg-white p-4 rounded-lg shadow-sm">
                                                        <h4 className="font-semibold text-gray-700 mb-2">Timeline</h4>
                                                        <div className="space-y-1 text-sm">
                                                            <p><span className="text-gray-500">Due Date:</span> {formatDate(item.due_date)}</p>
                                                            <p><span className="text-gray-500">Created Date:</span> {formatDate(item.created_date)}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                        </motion.tr>
                                    )}
                                </AnimatePresence>
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    const renderCreditorsTable = () => {
        const list = data?.list || [];
        
        if (list.length === 0) {
            return (
                <div className="text-center py-12">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                        <FiUsers className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="text-gray-500">No creditors found</p>
                </div>
            );
        }

        return (
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="w-10 p-4"></th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Firm Details</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mobile</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Balance</th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {list.map((item, index) => (
                            <React.Fragment key={item.username || index}>
                                <tr className="hover:bg-gray-50 transition-colors">
                                    <td className="p-4">
                                        <button
                                            onClick={() => toggleRowExpand(item.username || index)}
                                            className="p-1 hover:bg-gray-100 rounded transition-colors"
                                        >
                                            {expandedRows.has(item.username || index) ? 
                                                <FiChevronRight className="w-4 h-4 transform rotate-90" /> : 
                                                <FiChevronRight className="w-4 h-4" />
                                            }
                                        </button>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm font-medium text-gray-900">{item.name}</div>
                                        <div className="text-xs text-gray-500">{item.email || 'No email'}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm text-gray-900">{item.firm?.firm_name || 'Individual'}</div>
                                        <div className="text-xs text-gray-500">
                                            {item.firm?.gst_no && <span>GST: {item.firm.gst_no}</span>}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {item.mobile}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right">
                                        <span className="text-sm font-semibold text-red-600">
                                            {formatCurrency(Math.abs(item.balance))}
                                        </span>
                                        <div className="text-xs text-gray-500">{item.balance_type}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                        <button 
                                            onClick={() => navigate(`/client/details/${item.username}`)}
                                            className="inline-flex items-center gap-1 px-3 py-1 bg-cyan-100 text-cyan-700 rounded-lg hover:bg-cyan-200 transition-colors text-sm"
                                        >
                                            <FiEye className="w-3 h-3" />
                                            View
                                        </button>
                                    </td>
                                </tr>
                                <AnimatePresence>
                                    {expandedRows.has(item.username || index) && (
                                        <motion.tr
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            className="bg-gray-50"
                                        >
                                            <td colSpan={6} className="px-6 py-4">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div className="bg-white p-4 rounded-lg shadow-sm">
                                                        <h4 className="font-semibold text-gray-700 mb-2">Firm Details</h4>
                                                        <div className="space-y-1 text-sm">
                                                            <p><span className="text-gray-500">Firm Name:</span> {item.firm?.firm_name || 'N/A'}</p>
                                                            <p><span className="text-gray-500">PAN No:</span> {item.firm?.pan_no || 'N/A'}</p>
                                                            <p><span className="text-gray-500">GST No:</span> {item.firm?.gst_no || 'N/A'}</p>
                                                        </div>
                                                    </div>
                                                    <div className="bg-white p-4 rounded-lg shadow-sm">
                                                        <h4 className="font-semibold text-gray-700 mb-2">Contact Details</h4>
                                                        <div className="space-y-1 text-sm">
                                                            <p><span className="text-gray-500">Guardian Name:</span> {item.guardian_name || 'N/A'}</p>
                                                            <p><span className="text-gray-500">Care Of:</span> {item.care_of || 'N/A'}</p>
                                                            <p><span className="text-gray-500">Country Code:</span> {item.country_code || 'N/A'}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                        </motion.tr>
                                    )}
                                </AnimatePresence>
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    const renderDebtorsTable = () => {
        const list = data?.list || [];
        
        if (list.length === 0) {
            return (
                <div className="text-center py-12">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                        <FiDollarSign className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="text-gray-500">No debtors found</p>
                </div>
            );
        }

        return (
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="w-10 p-4"></th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Firm Details</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Balance</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Transaction</th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {list.map((item, index) => (
                            <React.Fragment key={item.username || index}>
                                <tr className="hover:bg-gray-50 transition-colors">
                                    <td className="p-4">
                                        <button
                                            onClick={() => toggleRowExpand(item.username || index)}
                                            className="p-1 hover:bg-gray-100 rounded transition-colors"
                                        >
                                            {expandedRows.has(item.username || index) ? 
                                                <FiChevronRight className="w-4 h-4 transform rotate-90" /> : 
                                                <FiChevronRight className="w-4 h-4" />
                                            }
                                        </button>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm font-medium text-gray-900">{item.name}</div>
                                        <div className="text-xs text-gray-500">{item.email || 'No email'}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm text-gray-900">{item.firm?.firm_name || 'Individual'}</div>
                                        <div className="text-xs text-gray-500">
                                            {item.firm?.gst_no && <span>GST: {item.firm.gst_no}</span>}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="text-sm font-semibold text-green-600">
                                            {formatCurrency(Math.abs(item.balance))}
                                        </span>
                                        <div className="text-xs text-gray-500">{item.balance_type}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {item.last_transaction ? (
                                            <>
                                                <div className="text-sm text-gray-900">{formatDate(item.last_transaction.date)}</div>
                                                <div className="text-xs text-gray-500">{item.last_transaction.period}</div>
                                            </>
                                        ) : (
                                            <span className="text-sm text-gray-400">No transactions</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                        <button 
                                            onClick={() => navigate(`/client/details/${item.username}`)}
                                            className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm"
                                        >
                                            <FiEye className="w-3 h-3" />
                                            View
                                        </button>
                                    </td>
                                </tr>
                                <AnimatePresence>
                                    {expandedRows.has(item.username || index) && (
                                        <motion.tr
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            className="bg-gray-50"
                                        >
                                            <td colSpan={6} className="px-6 py-4">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div className="bg-white p-4 rounded-lg shadow-sm">
                                                        <h4 className="font-semibold text-gray-700 mb-2">Firm Details</h4>
                                                        <div className="space-y-1 text-sm">
                                                            <p><span className="text-gray-500">Firm Name:</span> {item.firm?.firm_name || 'N/A'}</p>
                                                            <p><span className="text-gray-500">PAN No:</span> {item.firm?.pan_no || 'N/A'}</p>
                                                            <p><span className="text-gray-500">GST No:</span> {item.firm?.gst_no || 'N/A'}</p>
                                                        </div>
                                                    </div>
                                                    <div className="bg-white p-4 rounded-lg shadow-sm">
                                                        <h4 className="font-semibold text-gray-700 mb-2">Contact Details</h4>
                                                        <div className="space-y-1 text-sm">
                                                            <p><span className="text-gray-500">Guardian Name:</span> {item.guardian_name || 'N/A'}</p>
                                                            <p><span className="text-gray-500">Care Of:</span> {item.care_of || 'N/A'}</p>
                                                            <p><span className="text-gray-500">Country Code:</span> {item.country_code || 'N/A'}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                        </motion.tr>
                                    )}
                                </AnimatePresence>
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    const renderTransactionsTable = () => {
        const transactions = data?.list?.transactions || [];
        const summary = data?.list?.summary;
        const isPayment = type === 'today-payment';

        if (transactions.length === 0) {
            return (
                <div className="text-center py-12">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                        {isPayment ? <FiCreditCard className="w-8 h-8 text-gray-400" /> : <FiDollarSign className="w-8 h-8 text-gray-400" />}
                    </div>
                    <p className="text-gray-500">No transactions found</p>
                </div>
            );
        }

        return (
            <>
                {summary && (
                    <div className="mb-6 p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg mx-6 mt-6">
                        <div className="flex justify-between items-center">
                            <div>
                                <p className="text-sm text-gray-600">Total Transactions</p>
                                <p className="text-2xl font-bold text-gray-900">{formatNumber(summary.total_count)}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Total Amount</p>
                                <p className={`text-2xl font-bold ${isPayment ? 'text-orange-600' : 'text-green-600'}`}>
                                    {formatCurrency(summary.total_amount)}
                                </p>
                            </div>
                        </div>
                    </div>
                )}
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="w-10 p-4"></th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Particulars</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Voucher No</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    {isPayment ? 'Paid By' : 'Received By'}
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {transactions.map((item, index) => (
                                <React.Fragment key={item.voucher_no || index}>
                                    <tr className="hover:bg-gray-50 transition-colors">
                                        <td className="p-4">
                                            <button
                                                onClick={() => toggleRowExpand(item.voucher_no || index)}
                                                className="p-1 hover:bg-gray-100 rounded transition-colors"
                                            >
                                                {expandedRows.has(item.voucher_no || index) ? 
                                                    <FiChevronRight className="w-4 h-4 transform rotate-90" /> : 
                                                    <FiChevronRight className="w-4 h-4" />
                                                }
                                            </button>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {formatDate(item.date || item.paid_at || item.received_at)}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-900">{item.particulars}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.voucher_no}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                            <span className={`text-sm font-semibold ${isPayment ? 'text-orange-600' : 'text-green-600'}`}>
                                                {formatCurrency(item.amount)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {item.paid_by || item.received_by || 'N/A'}
                                        </td>
                                    </tr>
                                    <AnimatePresence>
                                        {expandedRows.has(item.voucher_no || index) && (
                                            <motion.tr
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                                exit={{ opacity: 0, height: 0 }}
                                                className="bg-gray-50"
                                            >
                                                <td colSpan={6} className="px-6 py-4">
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        <div className="bg-white p-4 rounded-lg shadow-sm">
                                                            <h4 className="font-semibold text-gray-700 mb-2">Transaction Details</h4>
                                                            <div className="space-y-1 text-sm">
                                                                <p><span className="text-gray-500">Mode:</span> {item.mode || 'N/A'}</p>
                                                                <p><span className="text-gray-500">Reference:</span> {item.reference_no || 'N/A'}</p>
                                                                <p><span className="text-gray-500">Narration:</span> {item.narration || 'N/A'}</p>
                                                            </div>
                                                        </div>
                                                        <div className="bg-white p-4 rounded-lg shadow-sm">
                                                            <h4 className="font-semibold text-gray-700 mb-2">Timeline</h4>
                                                            <div className="space-y-1 text-sm">
                                                                <p><span className="text-gray-500">Transaction Time:</span> {formatDate(item.paid_at || item.received_at)}</p>
                                                                <p><span className="text-gray-500">Record Created:</span> {formatDate(item.created_at)}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                            </motion.tr>
                                        )}
                                    </AnimatePresence>
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                </div>
            </>
        );
    };

    const renderBirthdaysTable = () => {
        const list = data?.list || [];
        
        if (list.length === 0) {
            return (
                <div className="text-center py-12">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                        <FiGift className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="text-gray-500">No birthdays found for today</p>
                </div>
            );
        }

        return (
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="w-10 p-4"></th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mobile</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Birth Date</th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {list.map((item, index) => (
                            <React.Fragment key={item.username || index}>
                                <tr className="hover:bg-gray-50 transition-colors">
                                    <td className="p-4">
                                        <button
                                            onClick={() => toggleRowExpand(item.username || index)}
                                            className="p-1 hover:bg-gray-100 rounded transition-colors"
                                        >
                                            {expandedRows.has(item.username || index) ? 
                                                <FiChevronRight className="w-4 h-4 transform rotate-90" /> : 
                                                <FiChevronRight className="w-4 h-4" />
                                            }
                                        </button>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm font-medium text-gray-900">{item.name}</div>
                                        <div className="text-xs text-gray-500">Age: {item.age || 'N/A'}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.mobile}</td>
                                    <td className="px-6 py-4 text-sm text-gray-500">{item.email || 'No email'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {item.birth_date ? formatDate(item.birth_date) : 'N/A'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                        <button 
                                            onClick={() => navigate(`/client/details/${item.username}`)}
                                            className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors text-sm"
                                        >
                                            <FiEye className="w-3 h-3" />
                                            View
                                        </button>
                                    </td>
                                </tr>
                                <AnimatePresence>
                                    {expandedRows.has(item.username || index) && (
                                        <motion.tr
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            className="bg-gray-50"
                                        >
                                            <td colSpan={6} className="px-6 py-4">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div className="bg-white p-4 rounded-lg shadow-sm">
                                                        <h4 className="font-semibold text-gray-700 mb-2">Personal Details</h4>
                                                        <div className="space-y-1 text-sm">
                                                            <p><span className="text-gray-500">Guardian Name:</span> {item.guardian_name || 'N/A'}</p>
                                                            <p><span className="text-gray-500">Care Of:</span> {item.care_of || 'N/A'}</p>
                                                            <p><span className="text-gray-500">Country Code:</span> {item.country_code || 'N/A'}</p>
                                                        </div>
                                                    </div>
                                                    <div className="bg-white p-4 rounded-lg shadow-sm">
                                                        <h4 className="font-semibold text-gray-700 mb-2">Additional Info</h4>
                                                        <div className="space-y-1 text-sm">
                                                            <p><span className="text-gray-500">Birth Year:</span> {item.birth_year || 'N/A'}</p>
                                                            <p><span className="text-gray-500">Member Since:</span> {formatDate(item.created_date)}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                        </motion.tr>
                                    )}
                                </AnimatePresence>
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    const renderContent = () => {
        if (loading) {
            return (
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                </div>
            );
        }

        if (error) {
            return (
                <div className="text-center py-12">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
                        <FiAlertCircle className="w-8 h-8 text-red-500" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to Load Data</h3>
                    <p className="text-gray-600 mb-4">{error}</p>
                    <button
                        onClick={() => fetchDetails()}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                        <FiRefreshCw className="w-4 h-4" />
                        Retry
                    </button>
                </div>
            );
        }

        switch(type) {
            case 'pending-billing':
                return renderPendingBillingTable();
            case 'creditors':
                return renderCreditorsTable();
            case 'debtors':
                return renderDebtorsTable();
            case 'today-received':
            case 'today-payment':
                return renderTransactionsTable();
            case 'today-birthday':
                return renderBirthdaysTable();
            default:
                return <div className="text-center py-8 text-gray-500">No data available</div>;
        }
    };

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

            <div className={`pt-16 transition-all duration-300 ease-in-out w-full ${isMinimized ? 'md:pl-20' : 'md:pl-72'}`}>
                <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
                    {/* Header */}
                    <div className="mb-6">
                        <button
                            onClick={() => navigate(-1)}
                            className="mb-4 text-indigo-600 hover:text-indigo-800 flex items-center gap-2 transition-colors"
                        >
                            <FiArrowLeft className="w-4 h-4" /> Back to Dashboard
                        </button>
                        
                        <div className="bg-white rounded-2xl shadow-xl p-6">
                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                                <div>
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className={`p-3 bg-gradient-to-br ${getGradient()} rounded-xl`}>
                                            {getIcon()}
                                        </div>
                                        <div>
                                            <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
                                                {getPageTitle()}
                                            </h1>
                                            <p className="text-gray-500">
                                                {getPageDescription()}
                                            </p>
                                        </div>
                                    </div>
                                    {pagination.total > 0 && (
                                        <div className="mt-4 flex flex-wrap gap-4 text-sm">
                                            <span className="px-3 py-1 bg-gray-100 rounded-full">
                                                Total: {formatNumber(pagination.total)}
                                            </span>
                                            <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full">
                                                Page: {pagination.page_no} of {pagination.total_pages}
                                            </span>
                                        </div>
                                    )}
                                </div>
                                
                                <div className="flex items-center gap-3">
                                    <motion.button 
                                        onClick={handleRefresh}
                                        disabled={loading}
                                        className="p-3 bg-white border border-gray-200 rounded-xl hover:shadow-lg transition-all duration-300 disabled:opacity-50"
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                    >
                                        <FiRefreshCw className={`w-5 h-5 text-gray-600 ${loading ? 'animate-spin' : ''}`} />
                                    </motion.button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Search Bar */}
                    <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
                        <div className="flex gap-4">
                            <div className="flex-1">
                                <div className="relative">
                                    <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                                    <input
                                        type="text"
                                        placeholder="Search by name, mobile, firm name, invoice number..."
                                        value={searchTerm}
                                        onChange={(e) => {
                                            setSearchTerm(e.target.value);
                                            setPagination(prev => ({ ...prev, page_no: 1 }));
                                        }}
                                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                                    />
                                </div>
                            </div>
                            {searchTerm && (
                                <button
                                    onClick={handleClearSearch}
                                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
                                >
                                    <FiX className="w-4 h-4" /> Clear
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                        {renderContent()}
                    </div>

                    {/* Pagination */}
                    {!loading && !error && pagination.total_pages > 1 && (
                        <div className="mt-6 flex justify-center items-center gap-2">
                            <button
                                onClick={() => handlePageChange(pagination.page_no - 1)}
                                disabled={pagination.page_no === 1}
                                className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors flex items-center gap-2"
                            >
                                <FiChevronLeft className="w-4 h-4" />
                                Previous
                            </button>
                            <span className="px-4 py-2 text-gray-700">
                                Page {pagination.page_no} of {pagination.total_pages}
                            </span>
                            <button
                                onClick={() => handlePageChange(pagination.page_no + 1)}
                                disabled={pagination.is_last_page}
                                className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors flex items-center gap-2"
                            >
                                Next
                                <FiChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default QuickStatsDetailsPage;