import React, { useState, useEffect, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiCheckCircle, FiCircle, FiSend, FiMail as FiMailIcon } from 'react-icons/fi';
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
    FiX,
    FiMenu,
    FiUserPlus,
    FiLock,
    FiCheckSquare,
    FiFileText,
    FiBookOpen,
    FiClipboard,
    FiFolder
} from 'react-icons/fi';
import { Sidebar, Header } from '../components/header';
import getHeaders from '../utils/get-headers';
import API_BASE_URL from '../utils/api-controller';
import toast from 'react-hot-toast';

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
    const [openMenuId, setOpenMenuId] = useState(null);
    const menuRef = useRef(null);

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

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setOpenMenuId(null);
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

    const toggleMenu = (menuId, event) => {
        event.stopPropagation();
        setOpenMenuId(openMenuId === menuId ? null : menuId);
    };

    const handleMenuAction = (username, path) => {
        navigate(`/client/profile/${username}/${path}`);
        setOpenMenuId(null);
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

    const renderDebtorsTable = () => {
        const list = data?.list || [];
        
        if (list.length === 0) {
            return (
                <div className="text-center py-12">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                        <FiDollarSign className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="text-gray-500 font-medium">No debtors found</p>
                </div>
            );
        }

        const menuItems = getMenuItems();

        // Mobile Debtor Card Component
        const MobileDebtorCard = ({ item, index }) => {
            const isSelected = selectedDebtors.has(item.username);
            
            return (
                <motion.div
                    className={`bg-white border border-gray-200 rounded-xl p-4 mb-3 md:hidden ${isSelected ? 'ring-2 ring-purple-500 bg-purple-50/10' : ''}`}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={isSelected}
                                    onChange={() => handleSelectDebtor(item.username)}
                                />
                                <div className={`w-8 h-4 ${isSelected ? 'bg-purple-600' : 'bg-gray-300'} peer-focus:outline-none rounded-full peer after:content-[''] after:absolute after:top-[1px] after:left-[1px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all ${isSelected ? 'after:translate-x-full' : ''}`}></div>
                            </label>
                            <span className="font-bold text-gray-800 text-xs">{index + 1}</span>
                            <div className="w-8 h-8 bg-purple-50 text-purple-600 rounded-lg flex items-center justify-center">
                                <FiUser className="w-4 h-4" />
                            </div>
                            <div>
                                <p className="font-semibold text-gray-800 text-xs truncate max-w-[120px]">{item.name}</p>
                                <p className="text-[10px] text-gray-400">@{item.username}</p>
                            </div>
                        </div>
                        <button
                            onClick={() => toggleRowExpand(item.username || index)}
                            className="p-1 hover:bg-gray-100 rounded transition-colors text-gray-500"
                        >
                            {expandedRows.has(item.username || index) ? (
                                <FiChevronRight className="w-4 h-4 transform rotate-90" />
                            ) : (
                                <FiChevronRight className="w-4 h-4" />
                            )}
                        </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs mt-2 border-t border-gray-100 pt-3">
                        <div>
                            <span className="text-gray-400 block text-[10px] uppercase font-semibold tracking-wider">Firm</span>
                            <span className="text-gray-700 font-medium truncate block mt-0.5">{item.firm?.firm_name || 'Individual'}</span>
                        </div>
                        <div>
                            <span className="text-gray-400 block text-[10px] uppercase font-semibold tracking-wider">Balance</span>
                            <span className="text-green-600 font-bold block mt-0.5">{formatCurrency(Math.abs(item.balance))} ({item.balance_type})</span>
                        </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 mt-4 pt-3 border-t border-gray-100">
                        <button
                            onClick={() => openSingleReminderModal(item.username, item.name)}
                            disabled={sendingReminder}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 bg-purple-50 text-purple-700 border border-purple-100 rounded-lg hover:bg-purple-100 transition-colors text-xs font-semibold disabled:opacity-50"
                        >
                            <FiMailIcon className="w-3.5 h-3.5" />
                            Reminder
                        </button>
                        
                        <div className="relative flex-1">
                            <button
                                onClick={(e) => toggleMenu(item.username || index, e)}
                                className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 bg-gray-50 text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors text-xs font-semibold"
                            >
                                <FiMenu className="w-3.5 h-3.5" />
                                Menu
                            </button>
                            <AnimatePresence>
                                {openMenuId === (item.username || index) && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                        className="absolute right-0 bottom-full mb-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 z-50 py-1"
                                    >
                                        {menuItems.map((menuItem, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => handleMenuAction(item.username, menuItem.path)}
                                                className="w-full px-4 py-2.5 text-left text-xs text-gray-700 hover:bg-gray-100 transition-colors flex items-center gap-3 font-medium"
                                            >
                                                {menuItem.icon}
                                                {menuItem.label}
                                            </button>
                                        ))}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </motion.div>
            );
        };

        return (
            <div className="flex-1 flex flex-col overflow-hidden border border-gray-200 bg-white rounded-xl shadow-xs">
                {/* Mobile Cards (shown on mobile, hidden on desktop) */}
                <div className="md:hidden p-3 bg-gray-50/50">
                    {list.map((item, index) => (
                        <MobileDebtorCard key={item.username || index} item={item} index={index} />
                    ))}
                </div>

                {/* Desktop Grid-based Table (hidden on mobile, shown on desktop) */}
                <div className="hidden md:block overflow-x-auto custom-scroll">
                    <div className="min-w-[1000px] flex flex-col bg-white">
                        
                        {/* Table Header */}
                        <div className="border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white sticky top-0 z-10 flex items-center bg-white">
                            {/* Checkbox */}
                            <div className="w-12 p-3 flex-shrink-0 flex justify-start">
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="sr-only peer"
                                        checked={selectAll}
                                        onChange={handleSelectAll}
                                    />
                                    <div className={`w-8 h-4 ${selectAll ? 'bg-purple-600' : 'bg-gray-300'} peer-focus:outline-none rounded-full peer after:content-[''] after:absolute after:top-[1px] after:left-[1px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all ${selectAll ? 'after:translate-x-full' : ''}`}></div>
                                </label>
                            </div>

                            {/* Expand Chevron Column Header Placeholder */}
                            <div className="w-12 p-3 flex-shrink-0 border-l border-gray-100 text-left"></div>

                            {/* SL No Header */}
                            <div className="w-12 p-3 font-bold text-gray-700 text-[11px] uppercase tracking-wide flex-shrink-0 text-left border-l border-gray-100">
                                SL
                            </div>

                            {/* Dynamic Column Headers */}
                            <div className="flex-[1.5] p-3 font-bold text-gray-700 text-[11px] uppercase tracking-wide text-left border-l border-gray-100">
                                Name
                            </div>
                            <div className="flex-[1.5] p-3 font-bold text-gray-700 text-[11px] uppercase tracking-wide text-left border-l border-gray-100">
                                Firm Details
                            </div>
                            <div className="flex-[1] p-3 font-bold text-gray-700 text-[11px] uppercase tracking-wide text-left border-l border-gray-100">
                                Balance
                            </div>
                            <div className="flex-[1.2] p-3 font-bold text-gray-700 text-[11px] uppercase tracking-wide text-left border-l border-gray-100">
                                Last Transaction
                            </div>
                            <div className="flex-[1.2] p-3 font-bold text-gray-700 text-[11px] uppercase tracking-wide text-center border-l border-gray-100">
                                Actions
                            </div>
                        </div>

                        {/* Table Body */}
                        <div className="divide-y divide-gray-100">
                            {list.map((item, index) => {
                                const isSelected = selectedDebtors.has(item.username);
                                const isExpanded = expandedRows.has(item.username || index);

                                return (
                                    <React.Fragment key={item.username || index}>
                                        <motion.div
                                            className={`flex items-center hover:bg-gray-50 transition-colors group bg-white ${
                                                isSelected ? 'bg-purple-50/30' : ''
                                            }`}
                                            initial={{ opacity: 0, y: 5 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: index * 0.02 }}
                                        >
                                            {/* Checkbox */}
                                            <div className="w-12 p-3 flex-shrink-0 flex justify-start">
                                                <label className="relative inline-flex items-center cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        className="sr-only peer"
                                                        checked={isSelected}
                                                        onChange={() => handleSelectDebtor(item.username)}
                                                    />
                                                    <div className={`w-8 h-4 ${isSelected ? 'bg-purple-600' : 'bg-gray-300'} peer-focus:outline-none rounded-full peer after:content-[''] after:absolute after:top-[1px] after:left-[1px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all ${isSelected ? 'after:translate-x-full' : ''}`}></div>
                                                </label>
                                            </div>

                                            {/* Expand Button */}
                                            <div className="w-12 p-3 flex-shrink-0 flex justify-center border-l border-gray-100">
                                                <button
                                                    onClick={() => toggleRowExpand(item.username || index)}
                                                    className="p-1 hover:bg-gray-100 rounded transition-colors text-gray-500"
                                                >
                                                    {isExpanded ? (
                                                        <FiChevronRight className="w-4 h-4 transform rotate-90 transition-transform duration-200" />
                                                    ) : (
                                                        <FiChevronRight className="w-4 h-4 transition-transform duration-200" />
                                                    )}
                                                </button>
                                            </div>

                                            {/* SL No */}
                                            <div className="w-12 p-3 flex-shrink-0 text-left border-l border-gray-100">
                                                <span className="font-bold text-gray-800 text-[11px]">{index + 1}</span>
                                            </div>

                                            {/* Name */}
                                            <div className="flex-[1.5] p-3 text-left border-l border-gray-100 min-w-0">
                                                <div className="text-xs font-semibold text-gray-800 truncate">{item.name}</div>
                                                <div className="text-[10px] text-gray-400 truncate mt-0.5">{item.email || 'No email'}</div>
                                            </div>

                                            {/* Firm Details */}
                                            <div className="flex-[1.5] p-3 text-left border-l border-gray-100 min-w-0">
                                                <div className="text-xs text-gray-700 font-medium truncate">{item.firm?.firm_name || 'Individual'}</div>
                                                {item.firm?.gst_no && (
                                                    <div className="text-[10px] text-gray-400 mt-0.5 truncate">GST: {item.firm.gst_no}</div>
                                                )}
                                            </div>

                                            {/* Balance */}
                                            <div className="flex-[1] p-3 text-left border-l border-gray-100 min-w-0">
                                                <span className="text-xs font-bold text-green-600">
                                                    {formatCurrency(Math.abs(item.balance))}
                                                </span>
                                                <div className="text-[10px] text-gray-400 mt-0.5 capitalize">{item.balance_type}</div>
                                            </div>

                                            {/* Last Transaction */}
                                            <div className="flex-[1.2] p-3 text-left border-l border-gray-100 min-w-0">
                                                {item.last_transaction ? (
                                                    <>
                                                        <div className="text-xs text-gray-700 font-medium">{formatDate(item.last_transaction.date)}</div>
                                                        <div className="text-[10px] text-gray-400 mt-0.5">{item.last_transaction.period}</div>
                                                    </>
                                                ) : (
                                                    <span className="text-xs text-gray-400">No transactions</span>
                                                )}
                                            </div>

                                            {/* Action Buttons */}
                                            <div className="flex-[1.2] p-3 text-center border-l border-gray-100 relative min-w-0 flex items-center justify-center gap-2">
                                                <button
                                                    onClick={() => openSingleReminderModal(item.username, item.name)}
                                                    disabled={sendingReminder}
                                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-purple-50 text-purple-700 border border-purple-100 hover:bg-purple-100 transition-colors text-[11px] font-semibold rounded-lg disabled:opacity-50"
                                                >
                                                    {sendingReminder && paymentReminderModal.type === 'single' && paymentReminderModal.username === item.username ? (
                                                        <div className="animate-spin rounded-full h-3 w-3 border-2 border-purple-600 border-t-transparent"></div>
                                                    ) : (
                                                        <FiMailIcon className="w-3.5 h-3.5" />
                                                    )}
                                                    Reminder
                                                </button>
                                                
                                                <div className="relative">
                                                    <button
                                                        onClick={(e) => toggleMenu(item.username || index, e)}
                                                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100 transition-colors text-[11px] font-semibold rounded-lg"
                                                    >
                                                        <FiMenu className="w-3.5 h-3.5" />
                                                        Menu
                                                    </button>
                                                    <AnimatePresence>
                                                        {openMenuId === (item.username || index) && (
                                                            <motion.div
                                                                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                                                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                                                className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 z-50 py-1"
                                                            >
                                                                {menuItems.map((menuItem, idx) => (
                                                                    <button
                                                                        key={idx}
                                                                        onClick={() => handleMenuAction(item.username, menuItem.path)}
                                                                        className="w-full px-4 py-2.5 text-left text-xs text-gray-700 hover:bg-gray-100 transition-colors flex items-center gap-3 font-medium"
                                                                    >
                                                                        {menuItem.icon}
                                                                        {menuItem.label}
                                                                    </button>
                                                                ))}
                                                            </motion.div>
                                                        )}
                                                    </AnimatePresence>
                                                </div>
                                            </div>
                                        </motion.div>

                                        {/* Expanded Details Panel */}
                                        <AnimatePresence>
                                            {isExpanded && (
                                                <motion.div
                                                    initial={{ opacity: 0, height: 0 }}
                                                    animate={{ opacity: 1, height: 'auto' }}
                                                    exit={{ opacity: 0, height: 0 }}
                                                    className="bg-gray-50/50 border-b border-gray-150 p-4 border-l-4 border-l-purple-500"
                                                >
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
                                                            <h4 className="font-bold text-gray-800 text-xs mb-3 uppercase tracking-wider flex items-center gap-1.5">
                                                                <FiBriefcase className="w-3.5 h-3.5 text-indigo-500" /> Firm Details
                                                            </h4>
                                                            <div className="space-y-1.5 text-xs text-gray-600">
                                                                <p><span className="text-gray-400 font-medium">Firm Name:</span> {item.firm?.firm_name || 'N/A'}</p>
                                                                <p><span className="text-gray-400 font-medium">PAN No:</span> {item.firm?.pan_no || 'N/A'}</p>
                                                                <p><span className="text-gray-400 font-medium">GST No:</span> {item.firm?.gst_no || 'N/A'}</p>
                                                            </div>
                                                        </div>
                                                        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
                                                            <h4 className="font-bold text-gray-800 text-xs mb-3 uppercase tracking-wider flex items-center gap-1.5">
                                                                <FiUser className="w-3.5 h-3.5 text-indigo-500" /> Contact Details
                                                            </h4>
                                                            <div className="space-y-1.5 text-xs text-gray-600">
                                                                <p><span className="text-gray-400 font-medium">Guardian Name:</span> {item.guardian_name || 'N/A'}</p>
                                                                <p><span className="text-gray-400 font-medium">Care Of:</span> {item.care_of || 'N/A'}</p>
                                                                <p><span className="text-gray-400 font-medium">Country Code:</span> {item.country_code || 'N/A'}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </React.Fragment>
                                );
                            })}
                        </div>
                    </div>
                </div>
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
            case 'debtors':
                return renderDebtorsTable();
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

                    {/* Search Bar */}
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

            {/* Payment Reminder Confirmation Modal */}
            <PaymentReminderConfirmationModal />
        </div>
    );
};

export default QuickStatsDetailsPage;