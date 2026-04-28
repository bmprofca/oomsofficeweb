import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import {
    FiRepeat,
    FiDownload,
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
    FiEye,
    FiMail,
    FiPhone,
    FiUserCheck,
    FiBarChart2
} from 'react-icons/fi';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import API_BASE_URL from '../utils/api-controller';
import getHeaders from '../utils/get-headers';
import axios from 'axios';
import { TransactionModalManager } from '../finance/bank/client-transaction-modal';
import { DateRangePickerField } from '../components/PortalDatePicker';
import TablePagination from '../components/TablePagination';


const ClientLedger = () => {
    const { username } = useParams();
    const navigate = useNavigate();

    const [clientProfile, setClientProfile] = useState(null);
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [fetchingTransactions, setFetchingTransactions] = useState(false);
    const [fromDate, setFromDate] = useState(() => {
        const date = new Date();
        date.setDate(1);
        return date.toISOString().split('T')[0];
    });
    const [toDate, setToDate] = useState(() => {
        return new Date().toISOString().split('T')[0];
    });
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [itemsPerPage, setItemsPerPage] = useState(20);
    const [openingBalance, setOpeningBalance] = useState({ debit: 0, credit: 0, balance: 0 });
    const [summary, setSummary] = useState({
        totalCredit: 0,
        totalDebit: 0,
        closingBalance: 0
    });
    const [showTransactionModal, setShowTransactionModal] = useState(false);
    const [transactionType, setTransactionType] = useState('');
    const [showActionMenu, setShowActionMenu] = useState(null);
    const [actionMenuPosition, setActionMenuPosition] = useState(null);
    const actionAnchorRef = useRef(null);
    const [showAddMenu, setShowAddMenu] = useState(false);
    const [selectedBank, setSelectedBank] = useState(null);
    const [detailsTransaction, setDetailsTransaction] = useState(null);
    const [showOpeningBalanceModal, setShowOpeningBalanceModal] = useState(false);
    const [openingBalanceData, setOpeningBalanceData] = useState(null);
    const [openingBalanceLoading, setOpeningBalanceLoading] = useState(false);
    const [openingBalanceSubmitting, setOpeningBalanceSubmitting] = useState(false);
    const [openingBalanceForm, setOpeningBalanceForm] = useState({
        amount: '',
        type: 'credit',
        transaction_date: new Date().toISOString().split('T')[0],
        remark: ''
    });

    // Fetch client profile and ledger transactions
    useEffect(() => {
        if (username) {
            fetchClientProfile();
            fetchTransactions();
        } else {
            toast.error('Client username not found');
            navigate(-1);
        }
    }, [username]);

    // Reset to page 1 when date filters or limit change
    useEffect(() => {
        setCurrentPage(1);
    }, [fromDate, toDate, itemsPerPage]);

    // Fetch transactions when page, limit, fromDate, toDate, or clientProfile (for party_id) changes
    useEffect(() => {
        if (username) {
            fetchTransactions();
        }
    }, [currentPage, itemsPerPage, fromDate, toDate, clientProfile?.id]);

    // Close action menu when clicking outside
    useEffect(() => {
        const handleClickOutside = () => {
            setShowActionMenu(null);
            actionAnchorRef.current = null;
            setActionMenuPosition(null);
            setShowAddMenu(false);
        };
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    const computeActionMenuPosition = useCallback((anchorEl) => {
        if (!anchorEl) return null;

        const rect = anchorEl.getBoundingClientRect();
        const menuWidth = 160;
        const menuHeight = 120;
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

    useEffect(() => {
        if (!showActionMenu || !actionAnchorRef.current) return undefined;

        const updatePosition = () => {
            setActionMenuPosition(computeActionMenuPosition(actionAnchorRef.current));
        };

        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                setShowActionMenu(null);
                actionAnchorRef.current = null;
                setActionMenuPosition(null);
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

    // Fetch client profile details
    const fetchClientProfile = async () => {
        try {
            const response = await axios.get(
                `${API_BASE_URL}/client/profile/${username}`,
                { headers: getHeaders() }
            );

            if (response.data.success) {
                setClientProfile(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching client profile:', error);
            toast.error('Failed to fetch client details');
        }
    };

    // Fetch transactions for client ledger
    const fetchTransactions = async () => {
        setFetchingTransactions(true);
        const partyId = clientProfile?.id ?? username;
        try {
            const response = await axios.get(
                `${API_BASE_URL}/transaction/list?page_no=${currentPage}&limit=${itemsPerPage}&from_date=${fromDate}&to_date=${toDate}&party_type=client&party_id=${encodeURIComponent(partyId)}`,
                { headers: getHeaders() }
            );

            if (response.data.success) {
                const openingBal = response.data.opening_balance;
                const openingBalObj = typeof openingBal === 'object' && openingBal !== null
                    ? { debit: openingBal.debit ?? 0, credit: openingBal.credit ?? 0, balance: openingBal.balance ?? 0 }
                    : { debit: 0, credit: 0, balance: openingBal ?? 0 };

                setTransactions(response.data.data || []);
                setOpeningBalance(openingBalObj);
                const meta = response.data.meta || {};
                const total = meta.total ?? 0;
                const limit = meta.limit ?? itemsPerPage;
                setTotalItems(total);
                setTotalPages(Math.max(1, Math.ceil(total / limit)));

                calculateSummary(response.data.data || [], openingBalObj.balance);
            }
        } catch (error) {
            console.error('Error fetching transactions:', error);
            toast.error('Failed to fetch transactions');
            setTransactions([]);
            setOpeningBalance({ debit: 0, credit: 0, balance: 0 });
            calculateSummary([], 0);
        } finally {
            setFetchingTransactions(false);
            setLoading(false);
        }
    };

    // Calculate transaction summary (supports new API: payment/sale/etc with debit/credit/balance)
    const calculateSummary = (transactionsData, openingBal) => {
        let totalCredit = 0;
        let totalDebit = 0;
        let closingBalance = openingBal;

        transactionsData.forEach(transaction => {
            const amounts = getTransactionAmounts(transaction);
            totalDebit += amounts.debit;
            totalCredit += amounts.credit;
            if (amounts.balance != null) closingBalance = amounts.balance;
        });

        setSummary({
            totalCredit,
            totalDebit,
            closingBalance
        });
    };

    // Get debit/credit/balance from transaction (new API: type-specific object e.g. payment, sale)
    const getTransactionAmounts = (transaction) => {
        const key = transaction.transaction_type;
        const amounts = key && transaction[key] ? transaction[key] : transaction.payment || {};
        return {
            debit: amounts.debit ?? 0,
            credit: amounts.credit ?? 0,
            balance: amounts.balance
        };
    };


    // Handle refresh
    const handleRefresh = useCallback(() => {
        fetchTransactions();
        toast.success('Data refreshed');
    }, []);

    // Fetch opening balance (get-opening-balance API)
    const fetchOpeningBalance = useCallback(async () => {
        const partyId = clientProfile?.id ?? username;
        if (!partyId) return;
        setOpeningBalanceLoading(true);
        try {
            const res = await axios.get(
                `${API_BASE_URL}/transaction/get-opening-balance?party_type=client&party_id=${encodeURIComponent(partyId)}`,
                { headers: getHeaders() }
            );
            if (res.data.success && res.data.data) {
                const d = res.data.data;
                setOpeningBalanceData(d);
                setOpeningBalanceForm({
                    amount: String(d.amount || ''),
                    type: d.type || 'credit',
                    transaction_date: d.transaction_date ? d.transaction_date.split('T')[0] : new Date().toISOString().split('T')[0],
                    remark: d.remark || ''
                });
            } else {
                setOpeningBalanceData(null);
                setOpeningBalanceForm({
                    amount: '',
                    type: 'credit',
                    transaction_date: new Date().toISOString().split('T')[0],
                    remark: ''
                });
            }
        } catch (err) {
            console.error('Fetch opening balance error:', err);
            toast.error(err.response?.data?.message || 'Failed to fetch opening balance');
            setOpeningBalanceData(null);
        } finally {
            setOpeningBalanceLoading(false);
        }
    }, [username, clientProfile?.id]);

    // Open opening balance modal
    const handleOpenOpeningBalanceModal = () => {
        setShowOpeningBalanceModal(true);
        fetchOpeningBalance();
    };

    // Set/Update opening balance (set-opening-balance API)
    const handleSetOpeningBalance = async (e) => {
        e.preventDefault();
        const partyId = clientProfile?.id ?? username;
        if (!partyId) {
            toast.error('Client not found');
            return;
        }
        const amt = parseFloat(openingBalanceForm.amount);
        if (isNaN(amt) || amt <= 0) {
            toast.error('Please enter a valid amount');
            return;
        }
        setOpeningBalanceSubmitting(true);
        try {
            const res = await axios.post(
                `${API_BASE_URL}/transaction/set-opening-balance`,
                {
                    amount: amt,
                    type: openingBalanceForm.type,
                    party_type: 'client',
                    party_id: partyId,
                    remark: openingBalanceForm.remark.trim() || undefined,
                    transaction_date: openingBalanceForm.transaction_date
                },
                { headers: getHeaders() }
            );
            if (res.data.success) {
                toast.success(res.data.message || 'Opening balance saved successfully');
                setShowOpeningBalanceModal(false);
                fetchTransactions();
            } else {
                toast.error(res.data.message || 'Failed to set opening balance');
            }
        } catch (err) {
            console.error('Set opening balance error:', err);
            toast.error(err.response?.data?.message || 'Failed to set opening balance');
        } finally {
            setOpeningBalanceSubmitting(false);
        }
    };

    // Handle export
    const handleExport = useCallback((type) => {
        toast.success(`${type.toUpperCase()} export started...`);
    }, []);

    // Handle transaction type click - MODIFIED
    const handleTransactionTypeClick = (type) => {
        // Don't check for selectedBank - let the modal handle bank selection
        setTransactionType(type);
        setShowTransactionModal(true);
        setShowAddMenu(false);
    };
    // Handle create transaction
    const handleCreateTransaction = async (type, formData) => {
        try {
            console.log('Creating transaction:', type, formData);
            await new Promise(resolve => setTimeout(resolve, 1000));
            toast.success(`${type} transaction created successfully`);
            setShowTransactionModal(false);
            setSelectedBank(null); // Clear selected bank on successful transaction
            fetchTransactions();
        } catch (error) {
            console.error('Error creating transaction:', error);
            toast.error(`Failed to create ${type} transaction`);
        }
    };

    // Handle action click
    const handleActionClick = (e, transactionId) => {
        e.stopPropagation();
        const willOpen = showActionMenu !== transactionId;
        if (willOpen) {
            actionAnchorRef.current = e.currentTarget;
            setShowActionMenu(transactionId);
            setActionMenuPosition(computeActionMenuPosition(e.currentTarget));
            return;
        }
        actionAnchorRef.current = null;
        setShowActionMenu(null);
        setActionMenuPosition(null);
    };

    // Handle edit
    const handleEdit = (transaction) => {
        console.log('Edit transaction:', transaction);
        toast.success('Edit functionality coming soon');
        setShowActionMenu(null);
        actionAnchorRef.current = null;
        setActionMenuPosition(null);
    };

    // Handle view invoice
    const handleViewInvoice = (transaction) => {
        console.log('View invoice:', transaction);
        toast.success('View invoice functionality coming soon');
        setShowActionMenu(null);
        actionAnchorRef.current = null;
        setActionMenuPosition(null);
    };

    // Handle view details
    const handleViewDetails = (transaction) => {
        setDetailsTransaction(transaction);
        setShowActionMenu(null);
        actionAnchorRef.current = null;
        setActionMenuPosition(null);
    };

    const selectedActionTransaction = useMemo(
        () => transactions.find((t) => t.transaction_id === showActionMenu),
        [transactions, showActionMenu]
    );

    // Format currency
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(Math.abs(amount || 0));
    };

    // Format date
    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    // Format time
    const formatTime = (dateString) => {
        return new Date(dateString).toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Get transaction type color (debit=blue, credit=orange)
    const getTransactionTypeColor = (transaction) => {
        const amounts = getTransactionAmounts(transaction);
        if (amounts.debit > 0) return 'text-blue-600 bg-blue-50 border-blue-200';
        if (amounts.credit > 0) return 'text-orange-600 bg-orange-50 border-orange-200';
        return 'text-slate-600 bg-slate-50 border-slate-200';
    };

    // Get payment mode icon
    const getPaymentModeIcon = (mode) => {
        switch (mode?.toLowerCase()) {
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

    // Get transaction type icon
    const getTransactionTypeIcon = (type) => {
        switch (type) {
            case 'RECEIVE': return <FiUser className="w-5 h-5" />;
            case 'PAYMENT': return <FiDollarSign className="w-5 h-5" />;
            case 'SALE': return <FiShoppingBag className="w-5 h-5" />;
            case 'PURCHASE': return <FiTruck className="w-5 h-5" />;
            case 'EXPENSE': return <FiFileText className="w-5 h-5" />;
            case 'JOURNAL': return <FiRepeat className="w-5 h-5" />;
            default: return <FiPlus className="w-5 h-5" />;
        }
    };

    // Get particulars display (new API: particular.type + particular.details + particular.remark, fallback to transaction_type + remark)
    const getParticularsDisplay = (transaction) => {
        const particular = transaction.particular;
        const remark = particular?.remark;
        if (particular?.type === 'bank' && particular?.details) {
            const d = particular.details;
            return (
                <div className="flex flex-col min-w-0">
                    <div className="font-medium text-slate-800">{d.bank || 'Bank'}</div>
                    <div className="text-xs text-slate-500">
                        {[d.account_no, d.holder, d.ifsc, d.branch].filter(Boolean).join(' • ')}
                    </div>
                    {remark && (
                        <div className="text-xs text-slate-600 mt-1 truncate max-w-[200px]" title={remark}>
                            {remark}
                        </div>
                    )}
                </div>
            );
        }
        if (transaction.create_by && particular?.type) {
            return (
                <div className="flex flex-col min-w-0">
                    <div className="font-medium text-slate-800">{transaction.create_by.name || 'Company'}</div>
                    <div className="text-xs text-slate-500">{transaction.create_by.email || ''}</div>
                    {remark && (
                        <div className="text-xs text-slate-600 mt-1 truncate max-w-[200px]" title={remark}>
                            {remark}
                        </div>
                    )}
                </div>
            );
        }
        // No particulars (e.g. opening balance) – show transaction type + remark
        const txType = (transaction.transaction_type || '')
            .replace(/_/g, ' ')
            .replace(/\b\w/g, (c) => c.toUpperCase());
        return (
            <div className="flex flex-col min-w-0">
                <div className="font-medium text-slate-800">{txType || 'N/A'}</div>
                {remark && (
                    <div className="text-xs text-slate-600 mt-1 truncate max-w-[200px]" title={remark}>
                        {remark}
                    </div>
                )}
            </div>
        );
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
        <div className="w-full">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white rounded-2xl shadow-sm border border-slate-200 px-5 py-4 mb-6"
            >
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                        <h1 className="text-xl sm:text-2xl font-bold text-slate-800">Client Ledger</h1>
                        {clientProfile && (
                            <p className="text-sm text-slate-500 mt-1 truncate">
                                {clientProfile.name} &middot; {clientProfile.email}
                                {clientProfile.mobile && ` · +${clientProfile.country_code || '91'} ${clientProfile.mobile}`}
                            </p>
                        )}
                    </div>

                    <div className="flex flex-wrap items-center justify-end gap-2">
                        <button
                            type="button"
                            onClick={handleOpenOpeningBalanceModal}
                            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all shadow-sm whitespace-nowrap shrink-0"
                            title="Set / Edit Opening Balance"
                        >
                            <FiBarChart2 className="w-4 h-4" />
                            <span>Opening Balance</span>
                        </button>
                        <div className="shrink-0 w-56">
                            <DateRangePickerField
                                value={{ start: fromDate, end: toDate }}
                                onChange={(range) => {
                                    setFromDate(range?.start || '');
                                    setToDate(range?.end || '');
                                }}
                                placeholder="Select date range"
                                mode="range"
                                initialTab="quick"
                                defaultQuickKey="tm"
                                quickOptionKeys={['tw', 'lw', 'lm', 'tm', 'lf', 'fy']}
                                showRangeHint={false}
                                showResetButton={false}
                                buttonClassName="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-600 hover:border-indigo-400 focus:outline-none transition-all"
                                wrapperClassName="w-full"
                            />
                        </div>
                        <motion.button
                            onClick={handleRefresh}
                            className="p-2 bg-white rounded-lg shadow-sm hover:shadow transition-all duration-200 border border-slate-200"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            title="Refresh"
                        >
                            <FiRefreshCw className="w-5 h-5 text-slate-600" />
                        </motion.button>
                        <motion.button
                            onClick={() => handleExport('pdf')}
                            className="p-2 bg-white rounded-lg shadow-sm hover:shadow transition-all duration-200 border border-slate-200"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            title="Export PDF"
                        >
                            <FiDownload className="w-5 h-5 text-slate-600" />
                        </motion.button>
                        <div className="relative">
                            <motion.button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowAddMenu((prev) => !prev);
                                }}
                                className="p-2 bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg shadow-sm hover:shadow transition-all duration-200 text-white"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                title="Add Transaction"
                            >
                                <FiPlus className="w-5 h-5" />
                            </motion.button>
                            {showAddMenu && (
                                <div
                                    className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    {['RECEIVE', 'PAYMENT', 'SALE', 'PURCHASE', 'EXPENSE', 'JOURNAL'].map((type) => (
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
                            )}
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Transactions Table Card */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
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
                            {/* Opening Balance Row - Always Show debit, credit, balance */}
                            <tr className="bg-slate-100 font-medium">
                                <td className="p-4 text-slate-600"></td>
                                <td className="p-4 text-slate-800" colSpan="2">Opening Balance</td>
                                <td className="p-4"></td>
                                <td className="p-4"></td>
                                <td className="p-4 text-right">
                                    {openingBalance.debit > 0 ? (
                                        <span className="text-sm font-semibold text-blue-600">₹{formatCurrency(openingBalance.debit)}</span>
                                    ) : (
                                        <span className="text-sm text-slate-600">₹{formatCurrency(0)}</span>
                                    )}
                                </td>
                                <td className="p-4 text-right">
                                    {openingBalance.credit > 0 ? (
                                        <span className="text-sm font-semibold text-orange-600">₹{formatCurrency(openingBalance.credit)}</span>
                                    ) : (
                                        <span className="text-sm text-slate-600">₹{formatCurrency(0)}</span>
                                    )}
                                </td>
                                <td className={`p-4 text-right font-bold ${(openingBalance.balance ?? 0) >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                                    ₹{formatCurrency(openingBalance.balance ?? 0)}
                                </td>
                                <td className="p-4"></td>
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
                                transactions.map((transaction, index) => (
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
                                            <div className="flex flex-col">
                                                <span className={`px-3 py-1 rounded-lg text-xs font-medium border w-fit ${getTransactionTypeColor(transaction)}`}>
                                                    {(transaction.transaction_type || 'N/A').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <span className="text-sm font-mono text-slate-600">
                                                {transaction.invoice_no || 'N/A'}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right">
                                            {(() => {
                                                const amounts = getTransactionAmounts(transaction);
                                                return amounts.debit > 0 ? (
                                                    <span className="text-sm font-semibold text-blue-600">₹{formatCurrency(amounts.debit)}</span>
                                                ) : (
                                                    <span className="text-sm text-slate-600">₹{formatCurrency(0)}</span>
                                                );
                                            })()}
                                        </td>
                                        <td className="p-4 text-right">
                                            {(() => {
                                                const amounts = getTransactionAmounts(transaction);
                                                return amounts.credit > 0 ? (
                                                    <span className="text-sm font-semibold text-orange-600">₹{formatCurrency(amounts.credit)}</span>
                                                ) : (
                                                    <span className="text-sm text-slate-600">₹{formatCurrency(0)}</span>
                                                );
                                            })()}
                                        </td>
                                        <td className="p-4 text-right">
                                            <span className={`text-sm font-bold ${((getTransactionAmounts(transaction).balance) ?? 0) >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                                                ₹{formatCurrency(getTransactionAmounts(transaction).balance ?? 0)}
                                            </span>
                                        </td>
                                        <td className="p-4 text-center">
                                            <button
                                                onClick={(e) => handleActionClick(e, transaction.transaction_id)}
                                                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                                            >
                                                <FiMoreVertical className="w-5 h-5 text-slate-600" />
                                            </button>

                                        </td>
                                    </motion.tr>
                                ))
                            )}

                            {/* Total Row - Always Show */}
                            <tr className="bg-slate-100 font-bold border-t-2 border-slate-300">
                                <td className="p-4 text-slate-800" colSpan="5">Total</td>
                                <td className="p-4 text-right text-blue-600">₹{formatCurrency(summary.totalDebit)}</td>
                                <td className="p-4 text-right text-orange-600">₹{formatCurrency(summary.totalCredit)}</td>
                                <td className={`p-4 text-right ${summary.closingBalance >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                                    ₹{formatCurrency(summary.closingBalance)}
                                </td>
                                <td className="p-4"></td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <TablePagination
                    page={currentPage}
                    limit={itemsPerPage}
                    total={totalItems}
                    totalPages={totalPages}
                    rowOptions={[5, 10, 20, 50, 100]}
                    defaultRows={20}
                    onPageChange={setCurrentPage}
                    onLimitChange={setItemsPerPage}
                />
            </motion.div>

            {/* Opening Balance Modal */}
            {showOpeningBalanceModal && (
                <div
                    className="fixed inset-0 z-[100] bg-black/50 flex items-start justify-center p-3 sm:p-4 backdrop-blur-sm overflow-y-auto"
                    onClick={() => !openingBalanceSubmitting && setShowOpeningBalanceModal(false)}
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="relative w-full max-w-md my-2 sm:my-4 max-h-[calc(100vh-1.5rem)] sm:max-h-[calc(100vh-2rem)] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="bg-gradient-to-r from-indigo-600 via-indigo-700 to-indigo-800 px-5 py-3.5 shrink-0">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-white/20 rounded-xl">
                                        <FiBarChart2 className="w-6 h-6 text-white" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-white">
                                            {openingBalanceData ? 'Edit' : 'Set'} Opening Balance
                                        </h2>
                                        <p className="text-indigo-200 text-sm mt-0.5">
                                            {clientProfile?.name || username}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => !openingBalanceSubmitting && setShowOpeningBalanceModal(false)}
                                    className="p-2 hover:bg-white/20 rounded-xl transition-colors"
                                >
                                    <FiX className="w-6 h-6 text-white" />
                                </button>
                            </div>
                        </div>

                        {openingBalanceLoading ? (
                            <div className="px-5 py-4 flex-1 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                                <div className="py-12 flex justify-center">
                                    <svg className="animate-spin h-10 w-10 text-indigo-600" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                </div>
                            </div>
                        ) : (
                            <form onSubmit={handleSetOpeningBalance} className="flex flex-1 flex-col min-h-0">
                                <div className="px-5 py-4 space-y-4 flex-1 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Amount (₹) *</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0.01"
                                            required
                                            value={openingBalanceForm.amount}
                                            onChange={(e) => setOpeningBalanceForm(f => ({ ...f, amount: e.target.value }))}
                                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                            placeholder="0.00"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Type *</label>
                                        <select
                                            value={openingBalanceForm.type}
                                            onChange={(e) => setOpeningBalanceForm(f => ({ ...f, type: e.target.value }))}
                                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                        >
                                            <option value="credit">Credit (Client owes you)</option>
                                            <option value="debit">Debit (You owe client)</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Transaction Date *</label>
                                        <input
                                            type="date"
                                            required
                                            value={openingBalanceForm.transaction_date}
                                            onChange={(e) => setOpeningBalanceForm(f => ({ ...f, transaction_date: e.target.value }))}
                                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Remark</label>
                                        <textarea
                                            rows={3}
                                            value={openingBalanceForm.remark}
                                            onChange={(e) => setOpeningBalanceForm(f => ({ ...f, remark: e.target.value }))}
                                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
                                            placeholder="Optional note..."
                                        />
                                    </div>

                                    {openingBalanceData && (
                                        <p className="text-xs text-slate-500">
                                            Current: ₹{formatCurrency(openingBalanceData.amount)} ({openingBalanceData.type})
                                            {openingBalanceData.invoice_no && ` • ${openingBalanceData.invoice_no}`}
                                        </p>
                                    )}
                                </div>
                                <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 shrink-0">
                                    <div className="flex gap-3">
                                        <button
                                            type="button"
                                            onClick={() => !openingBalanceSubmitting && setShowOpeningBalanceModal(false)}
                                            className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-slate-700 font-medium hover:bg-slate-50 transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={openingBalanceSubmitting || !openingBalanceForm.amount || parseFloat(openingBalanceForm.amount) <= 0}
                                            className="flex-1 px-4 py-2.5 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                        >
                                            {openingBalanceSubmitting ? (
                                                <span className="flex items-center justify-center gap-2">
                                                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                                    </svg>
                                                    Saving...
                                                </span>
                                            ) : (
                                                openingBalanceData ? 'Update' : 'Set Opening Balance'
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </form>
                        )}
                    </motion.div>
                </div>
            )}

            {/* Transaction Details Modal */}
            {detailsTransaction && (
                <div
                    className="fixed inset-0 z-[100] bg-black/50 flex items-start justify-center p-3 sm:p-4 backdrop-blur-sm overflow-y-auto"
                    onClick={() => setDetailsTransaction(null)}
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="relative w-full max-w-2xl my-2 sm:my-4 max-h-[calc(100vh-1.5rem)] sm:max-h-[calc(100vh-2rem)] overflow-hidden bg-white rounded-2xl shadow-2xl flex flex-col"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="bg-gradient-to-r from-indigo-600 via-indigo-700 to-indigo-800 px-5 py-3.5 shrink-0">
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
                                            {(detailsTransaction.transaction_type || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())} • {detailsTransaction.invoice_no || 'N/A'}
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
                        <div className="px-5 py-4 overflow-y-auto flex-1 space-y-6 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                            {/* Basic Info */}
                            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Transaction Info</h3>
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                    <div><span className="text-slate-500">Date</span><p className="font-medium text-slate-800">{formatDate(detailsTransaction.transaction_date)} {formatTime(detailsTransaction.transaction_date)}</p></div>
                                    <div><span className="text-slate-500">Voucher No</span><p className="font-mono font-medium text-slate-800">{detailsTransaction.invoice_no || 'N/A'}</p></div>
                                    <div><span className="text-slate-500">Type</span><p className="font-medium text-slate-800">{(detailsTransaction.transaction_type || 'N/A').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</p></div>
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
                                            <div className="bg-white rounded-lg p-3 border border-blue-100">
                                                <p className="text-xs text-slate-500 mb-1">Debit</p>
                                                <p className="text-lg font-bold text-blue-600">₹{formatCurrency(amt.debit)}</p>
                                            </div>
                                            <div className="bg-white rounded-lg p-3 border border-orange-100">
                                                <p className="text-xs text-slate-500 mb-1">Credit</p>
                                                <p className="text-lg font-bold text-orange-600">₹{formatCurrency(amt.credit)}</p>
                                            </div>
                                            <div className="bg-white rounded-lg p-3 border border-indigo-100">
                                                <p className="text-xs text-slate-500 mb-1">Balance</p>
                                                <p className={`text-lg font-bold ${(amt.balance ?? 0) >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>₹{formatCurrency(amt.balance ?? 0)}</p>
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
                                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                                            <div><span className="text-slate-500">Name</span><p className="font-medium">{detailsTransaction.create_by.name || '-'}</p></div>
                                            <div><span className="text-slate-500">Username</span><p className="font-mono font-medium">{detailsTransaction.create_by.username || '-'}</p></div>
                                            {detailsTransaction.create_by.email && <div className="col-span-2 flex items-center gap-2"><FiMail className="w-4 h-4 text-slate-400" /><span className="text-slate-600">{detailsTransaction.create_by.email}</span></div>}
                                            {detailsTransaction.create_by.mobile && <div className="col-span-2 flex items-center gap-2"><FiPhone className="w-4 h-4 text-slate-400" /><span className="text-slate-600">+{detailsTransaction.create_by.country_code || ''} {detailsTransaction.create_by.mobile}</span></div>}
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
                                            <FiUserCheck className="w-5 h-5 text-amber-600" />
                                        </div>
                                        <div className="text-sm">
                                            <p className="font-medium">{detailsTransaction.modify_by.name || '-'}</p>
                                            <p className="text-slate-500 text-xs">{detailsTransaction.modify_by.email || detailsTransaction.modify_by.username || ''}</p>
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
                        <div className="border-t border-slate-200 bg-slate-50 px-5 py-3 shrink-0">
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

            {/* Transaction Modal Manager - MODIFIED */}
            <TransactionModalManager
                modalType={transactionType}
                isOpen={showTransactionModal}
                onClose={() => {
                    setShowTransactionModal(false);
                }}
                clientId={username}
                clientName={clientProfile?.name}
                bankDetails={selectedBank}
                bankId={selectedBank?.bank_id}
                showClient={false}
                showBank={true}
                showSummary={false}
                onSubmit={handleCreateTransaction}
                formatCurrency={formatCurrency}
                summary={summary}
            />

            {/* Viewport-aware Action Menu Popover */}
            {showActionMenu && selectedActionTransaction && actionMenuPosition && createPortal(
                <motion.div
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    className="fixed w-40 bg-white rounded-lg shadow-xl border border-slate-200 py-1 z-[99999]"
                    style={{ top: actionMenuPosition.top, left: actionMenuPosition.left }}
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
                        onClick={() => handleViewDetails(selectedActionTransaction)}
                        className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-indigo-50 flex items-center gap-2 transition-colors"
                    >
                        <FiEye className="w-4 h-4 text-indigo-600" />
                        Details
                    </button>
                    <button
                        onClick={() => handleEdit(selectedActionTransaction)}
                        className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-blue-50 flex items-center gap-2 transition-colors"
                    >
                        <FiEdit2 className="w-4 h-4 text-blue-600" />
                        Edit
                    </button>
                    <button
                        onClick={() => handleViewInvoice(selectedActionTransaction)}
                        className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-blue-50 flex items-center gap-2 transition-colors"
                    >
                        <FiFile className="w-4 h-4 text-green-600" />
                        Invoice
                    </button>
                </motion.div>,
                document.body
            )}
        </div>
    );
};

export default ClientLedger;