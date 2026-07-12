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
    FiUser,
    FiBriefcase,
    FiPhone,
    FiMail,
    FiMail as FiMailIcon,
    FiCalendar as FiCalendarIcon,
    FiClock,
    FiX,
    FiLock,
    FiCheckSquare,
    FiFileText,
    FiBookOpen,
    FiClipboard,
    FiFolder,
    FiMoreVertical,
    FiFilter,
    FiSend
} from 'react-icons/fi';
import { Sidebar, Header } from '../components/header';
import TablePagination from '../components/TablePagination';
import getHeaders from '../utils/get-headers';
import API_BASE_URL from '../utils/api-controller';
import toast from 'react-hot-toast';

const FirmsDetailsModal = ({ isOpen, onClose, firms, clientName }) => {
    if (!isOpen || !firms || firms.length === 0) return null;

    const formatFirmDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        });
    };

    const formatAddress = (address) => {
        if (!address) return 'N/A';
        const parts = [
            address.address_line_1,
            address.address_line_2,
            address.city,
            address.state,
            address.pincode,
            address.country,
        ].filter(Boolean);
        return parts.join(', ') || 'N/A';
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                >
                    <motion.div
                        className="bg-white rounded-xl shadow-2xl w-full max-w-4xl mx-auto max-h-[90vh] overflow-hidden"
                        initial={{ scale: 0.95, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 20 }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                                    <FiBriefcase className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold">Firms Details</h3>
                                    <p className="text-blue-100 text-sm">{clientName}</p>
                                </div>
                            </div>
                            <button onClick={onClose} className="text-white hover:text-blue-200 p-2 rounded-lg hover:bg-white/10">
                                <FiX className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto max-h-[70vh] space-y-4">
                            {firms.map((firm, index) => (
                                <div key={firm.firm_id || index} className="border border-gray-200 rounded-xl p-4 bg-gray-50">
                                    <div className="flex items-start gap-3">
                                        <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                                            <FiBriefcase className="w-5 h-5 text-white" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <h4 className="font-bold text-gray-900">{firm.firm_name || 'Unnamed Firm'}</h4>
                                            <p className="text-xs text-gray-500 mt-1">Created: {formatFirmDate(firm.create_date)}</p>
                                            <div className="grid grid-cols-2 gap-2 mt-3 text-sm">
                                                {firm.pan_no && <div><span className="text-gray-500">PAN:</span> {firm.pan_no}</div>}
                                                {firm.gst_no && <div><span className="text-gray-500">GST:</span> {firm.gst_no}</div>}
                                            </div>
                                            {firm.address && (
                                                <p className="text-sm text-gray-600 mt-2">{formatAddress(firm.address)}</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="px-6 py-3 border-t bg-gray-50 text-sm text-gray-600">
                            Total: {firms.length} firm{firms.length !== 1 ? 's' : ''}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

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
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [balanceAfterInput, setBalanceAfterInput] = useState('');
    const [debouncedBalanceAfter, setDebouncedBalanceAfter] = useState(0);
    const [showFilterDropdown, setShowFilterDropdown] = useState(false);
    const [meta, setMeta] = useState({ debtor_count: 0, debtor_balance: 0, creditor_count: 0, creditor_balance: 0 });
    const [activeRowDropdown, setActiveRowDropdown] = useState(null);
    const [firmsModal, setFirmsModal] = useState({ open: false, firms: [], clientName: '' });

    // Multi-Select State
    const [selectedDebtors, setSelectedDebtors] = useState(new Set());
    const [selectAll, setSelectAll] = useState(false);

    // Payment Reminder Modal State
    const [paymentReminderModal, setPaymentReminderModal] = useState({
        isOpen: false,
        type: 'single', // 'single' or 'bulk'
        username: null,
        name: null,
        debtorList: []
    });
    const [sendingReminder, setSendingReminder] = useState(false);

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

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (!event.target.closest('.dropdown-container')) {
                setActiveRowDropdown(null);
                setShowFilterDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Update selectAll when selectedDebtors changes
    useEffect(() => {
        const debtorsList = data?.list || [];
        if (debtorsList.length > 0 && selectedDebtors.size === debtorsList.length) {
            setSelectAll(true);
        } else {
            setSelectAll(false);
        }
    }, [selectedDebtors, data]);

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
        switch (type) {
            case 'pending-billing': return 'pending_billing';
            case 'creditors': return 'creditors';
            case 'debtors': return 'debtors';
            case 'today-received': return 'today_received';
            case 'today-payment': return 'today_payment';
            case 'today-birthday': return 'today_birthday';
            default: return type;
        }
    };

    const isClientBalanceList = type === 'debtors' || type === 'creditors';

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchTerm.trim());
        }, 400);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    useEffect(() => {
        const timer = setTimeout(() => {
            const parsed = Math.max(0, Number(balanceAfterInput) || 0);
            setDebouncedBalanceAfter(parsed);
        }, 400);
        return () => clearTimeout(timer);
    }, [balanceAfterInput]);

    const fetchDetails = async (pageNo = 1, limit = 10) => {
        try {
            setLoading(true);
            setError(null);

            const apiType = getTypeParam();
            const headers = getHeaders();
            const searchQuery = isClientBalanceList && debouncedSearch
                ? `&search=${encodeURIComponent(debouncedSearch)}`
                : '';
            const balanceQuery = type === 'debtors'
                ? `&balance_after=${debouncedBalanceAfter || 0}`
                : '';
            const response = await fetch(
                `${API_BASE_URL}/report/dashboard/details?type=${apiType}&page_no=${pageNo}&limit=${limit}${searchQuery}${balanceQuery}`,
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
                if (result.data.meta) {
                    setMeta(result.data.meta);
                }
                // Clear selections when data changes
                setSelectedDebtors(new Set());
                setSelectAll(false);
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
        setSearchTerm('');
        setDebouncedSearch('');
        setBalanceAfterInput('');
        setDebouncedBalanceAfter(0);
        setMeta({ debtor_count: 0, debtor_balance: 0, creditor_count: 0, creditor_balance: 0 });
        setPagination(prev => ({ ...prev, page_no: 1 }));
    }, [type]);

    useEffect(() => {
        fetchDetails(1, pagination.limit);
    }, [type, debouncedSearch, debouncedBalanceAfter]);

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= pagination.total_pages) {
            fetchDetails(newPage, pagination.limit);
        }
    };

    const handleLimitChange = (newLimit) => {
        const limit = Math.min(100, Math.max(1, Number(newLimit) || 10));
        setPagination((prev) => ({ ...prev, limit, page_no: 1 }));
        fetchDetails(1, limit);
    };

    const renderListPagination = () => (
        pagination.total > 0 ? (
            <TablePagination
                page={pagination.page_no}
                limit={pagination.limit}
                total={pagination.total}
                totalPages={pagination.total_pages}
                isLastPage={pagination.is_last_page}
                rowOptions={[10, 20, 50, 100]}
                defaultRows={10}
                onPageChange={handlePageChange}
                onLimitChange={handleLimitChange}
            />
        ) : null
    );

    const handleRefresh = () => {
        fetchDetails();
    };

    const handleClearSearch = () => {
        setSearchTerm('');
        setDebouncedSearch('');
        setPagination(prev => ({ ...prev, page_no: 1 }));
    };

    const handleClearFilters = () => {
        setBalanceAfterInput('');
        setDebouncedBalanceAfter(0);
        setPagination(prev => ({ ...prev, page_no: 1 }));
    };

    const toggleRowDropdown = (username) => {
        setActiveRowDropdown(activeRowDropdown === username ? null : username);
    };

    const getLastUpdatedFirm = (firms) => {
        if (!firms || firms.length === 0) return null;
        const sortedFirms = [...firms].sort((a, b) => {
            const dateA = a.modify_date || a.create_date;
            const dateB = b.modify_date || b.create_date;
            return new Date(dateB) - new Date(dateA);
        });
        return sortedFirms[0];
    };

    const openFirmsModal = (firms, clientName) => {
        setFirmsModal({ open: true, firms: firms || [], clientName: clientName || '' });
    };

    const closeFirmsModal = () => {
        setFirmsModal({ open: false, firms: [], clientName: '' });
    };

    const renderFirmsCell = (item) => {
        const lastFirm = getLastUpdatedFirm(item.firms);
        const firmCount = item.firms?.length || 0;

        if (firmCount === 0) {
            return <div className="text-sm text-gray-500 italic">No firms</div>;
        }

        return (
            <div
                className="cursor-pointer hover:bg-gray-100 transition-colors text-center p-2 rounded-lg"
                onClick={() => openFirmsModal(item.firms, item.name)}
            >
                <div className="font-medium text-gray-800 text-sm mb-1 truncate">{lastFirm?.firm_name || 'N/A'}</div>
                <div className="space-y-1">
                    <div className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                        {firmCount} firm{firmCount !== 1 ? 's' : ''}
                    </div>
                    {firmCount > 1 && (
                        <div className="text-xs text-blue-600 font-medium">
                            +{firmCount - 1} more firm{firmCount - 1 > 1 ? 's' : ''}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    // Multi-Select Handlers
    const handleSelectDebtor = (username) => {
        const newSelected = new Set(selectedDebtors);
        if (newSelected.has(username)) {
            newSelected.delete(username);
        } else {
            newSelected.add(username);
        }
        setSelectedDebtors(newSelected);
    };

    const handleSelectAll = () => {
        const debtorsList = data?.list || [];
        if (selectAll) {
            setSelectedDebtors(new Set());
        } else {
            const allUsernames = debtorsList.map(item => item.username).filter(Boolean);
            setSelectedDebtors(new Set(allUsernames));
        }
        setSelectAll(!selectAll);
    };

    const clearSelection = () => {
        setSelectedDebtors(new Set());
        setSelectAll(false);
    };

    // Send Single Payment Reminder
    const sendSinglePaymentReminder = async (username, name) => {
        setSendingReminder(true);
        const headers = getHeaders();

        try {
            const response = await fetch(`${API_BASE_URL}/payment-reminder/payment-reminder/send`, {
                method: 'POST',
                headers: {
                    ...headers,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username })
            });

            const result = await response.json();

            if (result.success) {
                if (result.data.reminder_sent) {
                    toast.success(`✅ Payment reminder sent to ${name || username}`);
                } else {
                    toast(`ℹ️ ${name || username} has no debit balance. Reminder not sent.`, {
                        icon: 'ℹ️',
                        duration: 4000
                    });
                }
            } else {
                toast.error(result.message || 'Failed to send reminder');
            }
        } catch (error) {
            console.error('Error sending reminder:', error);
            toast.error(error.message || 'Failed to send payment reminder');
        } finally {
            setSendingReminder(false);
            setPaymentReminderModal({ isOpen: false, type: 'single', username: null, name: null, debtorList: [] });
        }
    };

    // Send Bulk Payment Reminders
    const sendBulkPaymentReminders = async (debtorList) => {
        setSendingReminder(true);
        const headers = getHeaders();
        const usernames = debtorList.map(d => d.username);

        try {
            const response = await fetch(`${API_BASE_URL}/payment-reminder/payment-reminder/bulk-send`, {
                method: 'POST',
                headers: {
                    ...headers,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ usernames })
            });

            const result = await response.json();

            if (result.success) {
                const data = result.data;
                toast.success(`✅ Reminders sent! Sent: ${data.sent} | Skipped: ${data.skipped} | Failed: ${data.failed}`, {
                    duration: 5000
                });

                // Show detailed results
                if (data.skipped > 0) {
                    const skippedUsers = data.details
                        .filter(d => d.status === 'skipped')
                        .map(d => d.username)
                        .join(', ');
                    if (skippedUsers) {
                        toast(`Skipped (no debit): ${skippedUsers}`, { icon: 'ℹ️', duration: 5000 });
                    }
                }
                if (data.failed > 0) {
                    const failedUsers = data.details
                        .filter(d => d.status === 'failed')
                        .map(d => d.username)
                        .join(', ');
                    if (failedUsers) {
                        toast.error(`Failed: ${failedUsers}`, { duration: 5000 });
                    }
                }

                // Clear selection after successful send
                clearSelection();
            } else {
                toast.error(result.message || 'Failed to send reminders');
            }
        } catch (error) {
            console.error('Error sending bulk reminders:', error);
            toast.error(error.message || 'Failed to send payment reminders');
        } finally {
            setSendingReminder(false);
            setPaymentReminderModal({ isOpen: false, type: 'single', username: null, name: null, debtorList: [] });
        }
    };

    // Open Modal Functions
    const openSingleReminderModal = (username, name) => {
        setPaymentReminderModal({
            isOpen: true,
            type: 'single',
            username,
            name,
            debtorList: []
        });
    };

    const openBulkReminderModal = () => {
        const debtorsList = data?.list || [];
        const selectedDebtorsList = debtorsList.filter(item => selectedDebtors.has(item.username));

        if (selectedDebtorsList.length === 0) {
            toast.error('Please select at least one debtor');
            return;
        }

        setPaymentReminderModal({
            isOpen: true,
            type: 'bulk',
            username: null,
            name: null,
            debtorList: selectedDebtorsList
        });
    };

    const closeReminderModal = () => {
        setPaymentReminderModal({ isOpen: false, type: 'single', username: null, name: null, debtorList: [] });
    };

    const handleMenuAction = (username, path) => {
        navigate(`/client/profile/${username}/${path}`);
        setActiveRowDropdown(null);
    };

    const getMenuItems = () => [
        { icon: <FiUser className="w-4 h-4" />, label: 'Profile', path: 'basic-details' },
        { icon: <FiBriefcase className="w-4 h-4" />, label: 'Firms', path: 'firms' },
        { icon: <FiLock className="w-4 h-4" />, label: 'Password', path: 'password' },
        { icon: <FiCheckSquare className="w-4 h-4" />, label: 'Tasks', path: 'task' },
        { icon: <FiFileText className="w-4 h-4" />, label: 'Billing', path: 'billing' },
        { icon: <FiBookOpen className="w-4 h-4" />, label: 'Ledger', path: 'ledger' },
        { icon: <FiClipboard className="w-4 h-4" />, label: 'Notes', path: 'notes' },
        { icon: <FiFolder className="w-4 h-4" />, label: 'Documents', path: 'documents' }
    ];

    const getPageTitle = () => {
        switch (type) {
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
        switch (type) {
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
        switch (type) {
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
        switch (type) {
            case 'pending-billing': return 'from-indigo-500 to-purple-600';
            case 'creditors': return 'from-cyan-500 to-blue-600';
            case 'debtors': return 'from-red-500 to-pink-600';
            case 'today-received': return 'from-green-500 to-emerald-600';
            case 'today-payment': return 'from-orange-500 to-amber-600';
            case 'today-birthday': return 'from-purple-500 to-violet-600';
            default: return 'from-indigo-500 to-purple-600';
        }
    };

    const debtorColumns = [
        { id: 'name', label: 'Client Details', flex: '1.5' },
        { id: 'mobile', label: 'Mobile', flex: '1' },
        { id: 'firms', label: 'Firms', flex: '1.2' },
        { id: 'balance', label: 'Balance', flex: '1' },
        { id: 'last_payment', label: 'Last Payment', flex: '1.2' },
        { id: 'actions', label: 'Actions', flex: '0.8' },
    ];

    const creditorColumns = [
        { id: 'name', label: 'Client Details', flex: '1.5' },
        { id: 'mobile', label: 'Mobile', flex: '1' },
        { id: 'firms', label: 'Firms', flex: '1.2' },
        { id: 'balance', label: 'Balance', flex: '1' },
        { id: 'actions', label: 'Actions', flex: '0.8' },
    ];

    const renderRowActionMenu = (item, showReminder = false) => {
        const menuItems = getMenuItems();
        return (
            <div className="relative dropdown-container flex justify-center">
                <motion.button
                    onClick={() => toggleRowDropdown(item.username)}
                    className="w-8 h-8 flex items-center justify-center rounded bg-gray-100 hover:bg-gray-200 transition-colors border border-gray-300"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                >
                    <FiMoreVertical className="w-4 h-4 text-gray-700" />
                </motion.button>
                <AnimatePresence>
                    {activeRowDropdown === item.username && (
                        <motion.div
                            className="absolute right-0 mt-1 w-56 bg-white rounded-lg shadow-xl border border-gray-200 z-50 overflow-hidden"
                            initial={{ opacity: 0, y: -8, scale: 0.96 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -8, scale: 0.96 }}
                            transition={{ duration: 0.15 }}
                        >
                            <div className="py-1">
                                {showReminder && (
                                    <>
                                        <button
                                            onClick={() => {
                                                setActiveRowDropdown(null);
                                                openSingleReminderModal(item.username, item.name);
                                            }}
                                            className="flex items-center w-full px-4 py-2 text-sm text-purple-600 hover:bg-purple-50 transition-colors"
                                        >
                                            <FiMailIcon className="mr-3 text-purple-600 w-4 h-4" />
                                            Payment Reminder
                                        </button>
                                        <div className="border-t my-1" />
                                    </>
                                )}
                                <button
                                    onClick={() => {
                                        setActiveRowDropdown(null);
                                        navigate(`/client/profile/${item.username}`);
                                    }}
                                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 transition-colors"
                                >
                                    <FiEye className="mr-3 text-blue-600 w-4 h-4" />
                                    View Details
                                </button>
                                {menuItems.map((menuItem, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => handleMenuAction(item.username, menuItem.path)}
                                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                    >
                                        <span className="mr-3 text-gray-500">{menuItem.icon}</span>
                                        {menuItem.label}
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        );
    };

    const renderBalanceListTable = (variant = 'debtors') => {
        const isDebtor = variant === 'debtors';
        const columns = isDebtor ? debtorColumns : creditorColumns;
        const listLabel = isDebtor ? 'Debtors' : 'Creditors';
        const emptyMessage = isDebtor ? 'No debtors found' : 'No creditors found';
        const tableMinWidth = isDebtor ? '1100px' : '960px';
        const metaCount = isDebtor ? (meta.debtor_count || pagination.total) : (meta.creditor_count || pagination.total);
        const balanceBadgeClass = isDebtor
            ? 'bg-green-50 text-green-700 border-green-200'
            : 'bg-red-50 text-red-700 border-red-200';
        const list = data?.list || [];

        const SkeletonRow = () => (
            <div className="flex items-center border-b border-gray-100 animate-pulse p-3">
                <div className="w-12 flex-shrink-0"><div className="h-4 bg-gray-200 rounded w-8" /></div>
                <div className="w-12 flex-shrink-0 border-l border-gray-100 p-3"><div className="h-4 bg-gray-200 rounded w-4 mx-auto" /></div>
                {columns.map((col) => (
                    <div key={col.id} className="flex-1 p-3 border-l border-gray-100" style={{ flex: col.flex }}>
                        <div className="h-3 bg-gray-200 rounded w-3/4 mx-auto" />
                    </div>
                ))}
            </div>
        );

        const MobileListCard = ({ item, index }) => {
            const isSelected = selectedDebtors.has(item.username);
            return (
                <motion.div
                    className={`bg-white border border-gray-200 rounded-lg p-3 mb-2 md:hidden ${isSelected ? 'ring-2 ring-blue-200' : ''}`}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" className="sr-only peer" checked={isSelected} onChange={() => handleSelectDebtor(item.username)} />
                                <div className={`w-8 h-4 ${isSelected ? 'bg-blue-600' : 'bg-gray-300'} rounded-full peer after:content-[''] after:absolute after:top-[1px] after:left-[1px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all ${isSelected ? 'after:translate-x-full' : ''}`} />
                            </label>
                            <div className="font-bold text-gray-800 text-sm w-4">{index + 1}</div>
                            <div className="w-7 h-7 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                                <FiUser className="w-3.5 h-3.5 text-white" />
                            </div>
                            <div>
                                <div className="font-semibold text-gray-800 text-sm">{item.name || 'N/A'}</div>
                                <div className="text-xs text-gray-500">{item.guardian_name || 'N/A'}</div>
                            </div>
                        </div>
                        {renderRowActionMenu(item, isDebtor)}
                    </div>
                    <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2 text-gray-700">
                            <FiPhone className="w-3 h-3 text-gray-400" />
                            <span>{item.mobile || 'N/A'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-700">
                            <FiBriefcase className="w-3 h-3 text-gray-400" />
                            <button
                                type="button"
                                className="text-left text-blue-600 hover:underline"
                                onClick={() => openFirmsModal(item.firms, item.name)}
                            >
                                {(item.firms?.length || 0) > 0
                                    ? `${getLastUpdatedFirm(item.firms)?.firm_name || 'Firm'}${item.firms.length > 1 ? ` (+${item.firms.length - 1})` : ''}`
                                    : 'No firms'}
                            </button>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className={`font-semibold ${isDebtor ? 'text-green-600' : 'text-red-600'}`}>
                                {formatCurrency(Math.abs(item.balance))}
                            </span>
                            {isDebtor && (
                                <span className="text-xs text-gray-500">{item.last_transaction?.period || 'No payment'}</span>
                            )}
                        </div>
                    </div>
                </motion.div>
            );
        };

        return (
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                <div className="md:hidden border-b border-gray-200 bg-white px-3 py-2 sticky top-0 z-10">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <input type="checkbox" checked={selectAll} onChange={handleSelectAll} className="w-4 h-4 text-blue-600 rounded border-gray-400" />
                            <span className="font-semibold text-gray-800 text-sm">{listLabel}</span>
                        </div>
                        <span className="text-xs text-gray-600">{formatNumber(metaCount)} {listLabel.toLowerCase()}</span>
                    </div>
                </div>

                <div className="flex-1 min-h-0 overflow-auto">
                    {loading ? (
                        <div style={{ minWidth: tableMinWidth }}>
                            {Array.from({ length: 6 }).map((_, index) => <SkeletonRow key={index} />)}
                        </div>
                    ) : error ? (
                        <div className="flex items-center justify-center py-12 text-gray-500 px-4">
                            <div className="text-center">
                                <FiAlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
                                <p className="text-gray-700 font-medium">{error}</p>
                                <button onClick={() => fetchDetails()} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">Retry</button>
                            </div>
                        </div>
                    ) : list.length === 0 ? (
                        <div className="flex items-center justify-center py-12 text-gray-500 px-4">
                            <div className="text-center">
                                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                    <FiUser className="w-6 h-6 text-gray-400" />
                                </div>
                                <p className="text-gray-500 font-medium text-sm">{emptyMessage}</p>
                                <p className="text-gray-400 text-xs mt-1">Try adjusting your search{isDebtor ? ' or filters' : ''}</p>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="md:hidden px-3 py-1">
                                {list.map((item, index) => (
                                    <MobileListCard key={item.username || index} item={item} index={index} />
                                ))}
                            </div>

                            <div className="hidden md:block" style={{ minWidth: tableMinWidth }}>
                                <div className="border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white sticky top-0 z-10">
                                    <div className="flex items-center bg-white">
                                        <div className="w-12 p-3 flex-shrink-0 flex justify-center">
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input type="checkbox" className="sr-only peer" checked={selectAll} onChange={handleSelectAll} />
                                                <div className={`w-8 h-4 ${selectAll ? 'bg-blue-600' : 'bg-gray-300'} rounded-full peer after:content-[''] after:absolute after:top-[1px] after:left-[1px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all ${selectAll ? 'after:translate-x-full' : ''}`} />
                                            </label>
                                        </div>
                                        <div className="w-12 p-3 font-bold text-gray-700 text-xs flex-shrink-0 text-center border-l border-gray-100">SL No</div>
                                        {columns.map((column) => (
                                            <div
                                                key={column.id}
                                                className="p-3 font-semibold text-gray-700 text-xs flex-shrink-0 text-center border-l border-gray-100"
                                                style={{ flex: column.flex, minWidth: column.id === 'name' ? '180px' : column.id === 'firms' ? '160px' : '120px' }}
                                            >
                                                <div className="truncate">{column.label}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {list.map((item, index) => {
                                    const isSelected = selectedDebtors.has(item.username);
                                    return (
                                        <motion.div
                                            key={item.username || index}
                                            className={`flex items-center border-b border-gray-100 hover:bg-gray-50 transition-colors bg-white ${isSelected ? 'bg-blue-50/40' : ''}`}
                                            initial={{ opacity: 0, y: 5 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: index * 0.02 }}
                                        >
                                            <div className="w-12 p-3 flex-shrink-0 flex justify-center">
                                                <label className="relative inline-flex items-center cursor-pointer">
                                                    <input type="checkbox" className="sr-only peer" checked={isSelected} onChange={() => handleSelectDebtor(item.username)} />
                                                    <div className={`w-8 h-4 ${isSelected ? 'bg-blue-600' : 'bg-gray-300'} rounded-full peer after:content-[''] after:absolute after:top-[1px] after:left-[1px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all ${isSelected ? 'after:translate-x-full' : ''}`} />
                                                </label>
                                            </div>
                                            <div className="w-12 p-3 flex-shrink-0 text-center border-l border-gray-100">
                                                <span className="font-bold text-gray-800 text-xs">{((pagination.page_no - 1) * pagination.limit) + index + 1}</span>
                                            </div>
                                            <div className="p-3 min-w-0 border-l border-gray-100 flex-shrink-0" style={{ flex: '1.5', minWidth: '180px' }}>
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-sm flex-shrink-0">
                                                        <FiUser className="w-4 h-4 text-white" />
                                                    </div>
                                                    <div className="min-w-0 flex-1 text-left cursor-pointer hover:text-blue-600" onClick={() => navigate(`/client/profile/${item.username}`)}>
                                                        <div className="font-semibold text-gray-800 text-sm truncate">{item.name || 'N/A'}</div>
                                                        <div className="text-xs text-gray-500 truncate">{item.guardian_name || 'N/A'}</div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="p-3 min-w-0 text-center border-l border-gray-100 flex-shrink-0" style={{ flex: '1', minWidth: '120px' }}>
                                                <div className="flex items-center justify-center text-gray-700 font-medium text-sm gap-2">
                                                    <FiPhone className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                                    <span className="truncate">{item.mobile || 'N/A'}</span>
                                                </div>
                                            </div>
                                            <div className="p-3 min-w-0 border-l border-gray-100 flex-shrink-0" style={{ flex: '1.2', minWidth: '160px' }}>
                                                {renderFirmsCell(item)}
                                            </div>
                                            <div className="p-3 min-w-0 text-center border-l border-gray-100 flex-shrink-0" style={{ flex: '1', minWidth: '120px' }}>
                                                <div className={`inline-flex items-center px-3 py-1 rounded text-sm font-semibold border ${balanceBadgeClass}`}>
                                                    {formatCurrency(Math.abs(item.balance))}
                                                </div>
                                            </div>
                                            {isDebtor && (
                                                <div className="p-3 min-w-0 text-center border-l border-gray-100 flex-shrink-0" style={{ flex: '1.2', minWidth: '140px' }}>
                                                    <div className="text-sm text-gray-700 font-medium">{item.last_transaction?.date ? formatDate(item.last_transaction.date) : 'N/A'}</div>
                                                    <div className="text-xs text-gray-500">{item.last_transaction?.period || 'No payment'}</div>
                                                </div>
                                            )}
                                            <div className="p-3 min-w-0 border-l border-gray-100 flex-shrink-0" style={{ flex: '0.8', minWidth: '72px' }}>
                                                {renderRowActionMenu(item, isDebtor)}
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        </>
                    )}
                </div>

                {!loading && !error && pagination.total > 0 && renderListPagination()}
            </div>
        );
    };

    const renderBalanceListPage = (variant) => {
        const isDebtor = variant === 'debtors';
        const pageTitle = isDebtor ? 'Debtors List' : 'Creditors List';
        const pageDescription = isDebtor
            ? 'Clients with outstanding receivable balances'
            : 'Clients with outstanding payable balances';
        const searchPlaceholder = isDebtor ? 'Search debtors...' : 'Search creditors...';
        const countLabel = isDebtor ? 'Debtors' : 'Creditors';
        const countValue = isDebtor ? (meta.debtor_count || 0) : (meta.creditor_count || 0);
        const balanceValue = isDebtor ? (meta.debtor_balance || 0) : (meta.creditor_balance || 0);
        const countBadgeClass = isDebtor ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-cyan-50 text-cyan-700 border-cyan-100';
        const balanceBadgeClass = isDebtor ? 'bg-green-50 text-green-700 border-green-100' : 'bg-red-50 text-red-700 border-red-100';

        return (
            <div className="min-h-screen bg-gray-50">
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

                <div className={`pt-16 transition-all duration-300 ease-in-out min-w-0 ${isMinimized ? 'md:pl-20' : 'md:pl-[260px]'}`}>
                    <div className="h-full flex flex-col min-w-0">
                        <motion.div
                            className="bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col min-h-0 mx-2 sm:mx-4 md:mx-8 my-3 md:my-4 overflow-hidden"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3 }}
                        >
                            <div className="border-b border-gray-200 px-3 md:px-4 py-3 bg-gradient-to-r from-gray-50 to-white">
                                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-2 md:gap-3">
                                    <div className="w-full md:w-auto">
                                        <h5 className="text-base md:text-lg font-bold text-gray-800 mb-0.5">{pageTitle}</h5>
                                        <p className="text-gray-500 text-xs">{pageDescription}</p>
                                        <div className="mt-2 flex flex-wrap gap-2">
                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold border ${countBadgeClass}`}>
                                                {countLabel}: {formatNumber(countValue)}
                                            </span>
                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold border ${balanceBadgeClass}`}>
                                                Total Balance: {formatCurrency(balanceValue)}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2 w-full lg:w-auto">
                                        <div className="flex-1 md:flex-none md:min-w-[220px] lg:min-w-[260px]">
                                            <div className="relative">
                                                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                                <input
                                                    type="text"
                                                    placeholder={searchPlaceholder}
                                                    value={searchTerm}
                                                    onChange={(e) => {
                                                        setSearchTerm(e.target.value);
                                                        setPagination(prev => ({ ...prev, page_no: 1 }));
                                                    }}
                                                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-gray-700 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                />
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            {isDebtor && (
                                                <div className="dropdown-container relative">
                                                    <motion.button
                                                        onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                                                        className="px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 font-medium flex items-center gap-2 shadow-sm text-sm"
                                                        whileHover={{ scale: 1.05 }}
                                                        whileTap={{ scale: 0.95 }}
                                                    >
                                                        <FiFilter className="w-4 h-4" />
                                                        <span className="hidden sm:inline">Filter</span>
                                                    </motion.button>
                                                    <AnimatePresence>
                                                        {showFilterDropdown && (
                                                            <motion.div
                                                                className="absolute right-0 mt-2 w-64 max-w-[calc(100vw-1.5rem)] bg-white rounded-lg shadow-xl border border-gray-200 z-[60] p-3"
                                                                initial={{ opacity: 0, y: -8, scale: 0.96 }}
                                                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                                                exit={{ opacity: 0, y: -8, scale: 0.96 }}
                                                            >
                                                                <label className="block text-xs font-semibold text-gray-600 mb-1">
                                                                    Minimum Balance (₹)
                                                                </label>
                                                                <input
                                                                    type="number"
                                                                    min="0"
                                                                    step="1"
                                                                    placeholder="0 = all debtors"
                                                                    value={balanceAfterInput}
                                                                    onChange={(e) => {
                                                                        setBalanceAfterInput(e.target.value);
                                                                        setPagination(prev => ({ ...prev, page_no: 1 }));
                                                                    }}
                                                                    className="w-full px-2 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                                                />
                                                                <p className="text-[11px] text-gray-500 mt-1">Show debtors with balance equal to or above this amount.</p>
                                                                <div className="flex justify-between gap-2 mt-3">
                                                                    <button onClick={handleClearFilters} className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded hover:bg-gray-100">Reset</button>
                                                                    <button onClick={() => setShowFilterDropdown(false)} className="w-full px-2 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700">Apply</button>
                                                                </div>
                                                            </motion.div>
                                                        )}
                                                    </AnimatePresence>
                                                </div>
                                            )}

                                            {isDebtor && selectedDebtors.size > 0 && (
                                                <motion.button
                                                    onClick={openBulkReminderModal}
                                                    className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium flex items-center gap-2"
                                                    whileHover={{ scale: 1.05 }}
                                                    whileTap={{ scale: 0.95 }}
                                                >
                                                    <FiMailIcon className="w-4 h-4" />
                                                    <span className="hidden sm:inline">Reminder ({selectedDebtors.size})</span>
                                                </motion.button>
                                            )}

                                            <motion.button
                                                onClick={handleRefresh}
                                                disabled={loading}
                                                className="w-9 h-9 flex items-center justify-center rounded-full bg-white border border-gray-300 hover:bg-gray-100 transition shadow-sm disabled:opacity-50"
                                                whileHover={{ scale: 1.08 }}
                                                whileTap={{ scale: 0.95 }}
                                            >
                                                <FiRefreshCw className={`w-4 h-4 text-gray-700 ${loading ? 'animate-spin' : ''}`} />
                                            </motion.button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex-1 flex flex-col overflow-hidden min-h-0 min-w-0">
                                {renderBalanceListTable(variant)}
                            </div>
                        </motion.div>
                    </div>
                </div>

                {isDebtor && <PaymentReminderConfirmationModal />}
                <FirmsDetailsModal
                    isOpen={firmsModal.open}
                    onClose={closeFirmsModal}
                    firms={firmsModal.firms}
                    clientName={firmsModal.clientName}
                />
            </div>
        );
    };

    const renderContent = () => {
        if (type === 'debtors' || type === 'creditors') {
            return null;
        }

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

        switch (type) {
            default:
                return <div className="text-center py-8 text-gray-500">No data available</div>;
        }
    };

    // Payment Reminder Confirmation Modal
    const PaymentReminderConfirmationModal = () => {
        if (!paymentReminderModal.isOpen) return null;

        const isBulk = paymentReminderModal.type === 'bulk';
        const debtorCount = paymentReminderModal.debtorList.length;
        const totalAmount = isBulk ? paymentReminderModal.debtorList.reduce((sum, d) => sum + Math.abs(d.balance || 0), 0) : 0;

        const handleSend = () => {
            if (isBulk) {
                sendBulkPaymentReminders(paymentReminderModal.debtorList);
            } else {
                sendSinglePaymentReminder(paymentReminderModal.username, paymentReminderModal.name);
            }
        };

        return (
            <AnimatePresence>
                <motion.div
                    className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[200] p-4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={closeReminderModal}
                >
                    <motion.div
                        className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-auto overflow-hidden"
                        initial={{ scale: 0.95, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 20 }}
                        transition={{ duration: 0.2 }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white px-6 py-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                                        {isBulk ? <FiUsers className="w-5 h-5" /> : <FiMailIcon className="w-5 h-5" />}
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold">
                                            {isBulk ? 'Bulk Payment Reminder' : 'Payment Reminder'}
                                        </h3>
                                        <p className="text-purple-100 text-sm">
                                            {isBulk ? `Send to ${debtorCount} debtor(s)` : 'Send reminder to debtor'}
                                        </p>
                                    </div>
                                </div>
                                <motion.button
                                    onClick={closeReminderModal}
                                    className="text-white hover:text-purple-200 transition-colors p-2 rounded-lg hover:bg-white/10"
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                >
                                    <FiX className="w-5 h-5" />
                                </motion.button>
                            </div>
                        </div>

                        <div className="p-6">
                            <div className="text-center mb-6">
                                <div className={`w-16 h-16 ${isBulk ? 'bg-blue-100' : 'bg-purple-100'} rounded-full flex items-center justify-center mx-auto mb-4`}>
                                    {isBulk ? <FiUsers className="w-8 h-8 text-blue-600" /> : <FiMailIcon className="w-8 h-8 text-purple-600" />}
                                </div>

                                {isBulk ? (
                                    <>
                                        <h4 className="text-lg font-semibold text-gray-800 mb-2">
                                            Send to {debtorCount} Debtor(s)
                                        </h4>
                                        <div className="max-h-48 overflow-y-auto mb-4 border rounded-lg">
                                            {paymentReminderModal.debtorList.map((debtor, idx) => (
                                                <div key={idx} className="flex justify-between items-center p-2 border-b last:border-b-0">
                                                    <div>
                                                        <p className="font-medium text-gray-800 text-sm">{debtor.name}</p>
                                                        <p className="text-xs text-gray-500">@{debtor.username}</p>
                                                    </div>
                                                    <p className="text-sm font-semibold text-green-600">
                                                        {formatCurrency(Math.abs(debtor.balance))}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="bg-gray-50 rounded-lg p-3 mb-4">
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm text-gray-600">Total Outstanding:</span>
                                                <span className="text-lg font-bold text-green-600">{formatCurrency(totalAmount)}</span>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <h4 className="text-lg font-semibold text-gray-800 mb-2">
                                            Send Payment Reminder
                                        </h4>
                                        <p className="text-gray-600 text-sm">
                                            Are you sure you want to send a payment reminder to:
                                        </p>
                                        <p className="font-semibold text-purple-600 mt-2">
                                            {paymentReminderModal.name || paymentReminderModal.username}
                                        </p>
                                        <p className="text-xs text-gray-500 mt-1">
                                            @{paymentReminderModal.username}
                                        </p>
                                    </>
                                )}
                            </div>

                            <div className="bg-amber-50 rounded-lg p-3 mb-6 border border-amber-200">
                                <div className="flex items-start gap-2">
                                    <FiAlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                                    <div className="text-xs text-amber-800">
                                        <p className="font-medium mb-1">Note:</p>
                                        <ul className="list-disc list-inside space-y-1">
                                            <li>Reminder will only be sent if the client has a debit balance</li>
                                            <li>The email will contain their outstanding amount</li>
                                            <li>Check logs in payment reminder section for status</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <motion.button
                                    onClick={closeReminderModal}
                                    className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 font-medium text-sm"
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    Cancel
                                </motion.button>
                                <motion.button
                                    onClick={handleSend}
                                    disabled={sendingReminder}
                                    className="flex-1 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg font-medium text-sm flex items-center justify-center gap-2 hover:from-purple-700 hover:to-purple-800 disabled:opacity-50"
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    {sendingReminder ? (
                                        <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                                            Sending...
                                        </>
                                    ) : (
                                        <>
                                            <FiSend className="w-4 h-4" />
                                            {isBulk ? `Send to ${debtorCount} Debtor(s)` : 'Send Reminder'}
                                        </>
                                    )}
                                </motion.button>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            </AnimatePresence>
        );
    };

    if (type === 'debtors' || type === 'creditors') {
        return renderBalanceListPage(type);
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

            <div className={`pt-16 transition-all duration-300 ease-in-out w-full ${isMinimized ? 'md:pl-20' : 'md:pl-[260px]'}`}>
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
                                    {/* Bulk Payment Reminder Button */}
                                    {selectedDebtors.size > 0 && (
                                        <motion.button
                                            onClick={openBulkReminderModal}
                                            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg flex items-center gap-2 text-sm font-medium hover:from-purple-700 hover:to-purple-800 shadow-md"
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                        >
                                            <FiMailIcon className="w-4 h-4" />
                                            Send Reminder ({selectedDebtors.size})
                                        </motion.button>
                                    )}

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

                    {/* Search Bar (debtors / creditors) */}
                    {isClientBalanceList && (
                        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <div className="relative">
                                        <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                                        <input
                                            type="text"
                                            placeholder="Search by name, mobile, firm name..."
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
                                {selectedDebtors.size > 0 && (
                                    <button
                                        onClick={clearSelection}
                                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
                                    >
                                        <FiX className="w-4 h-4" /> Clear Selection
                                    </button>
                                )}
                            </div>

                            {/* Selection Summary */}
                            {selectedDebtors.size > 0 && (
                                <div className="mt-4 p-3 bg-purple-50 rounded-lg border border-purple-200 flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                        <FiUsers className="w-4 h-4 text-purple-600" />
                                        <span className="text-sm text-purple-800">
                                            {selectedDebtors.size} debtor(s) selected
                                        </span>
                                    </div>
                                    <button
                                        onClick={openBulkReminderModal}
                                        className="px-3 py-1.5 bg-purple-600 text-white rounded-lg text-xs font-medium hover:bg-purple-700 transition-colors flex items-center gap-1"
                                    >
                                        <FiMailIcon className="w-3 h-3" />
                                        Send Reminder
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Main Content */}
                    <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                        {renderContent()}
                    </div>
                </div>
            </div>

            {/* Payment Reminder Confirmation Modal */}
            <PaymentReminderConfirmationModal />
        </div>
    );
};

export default QuickStatsDetailsPage;