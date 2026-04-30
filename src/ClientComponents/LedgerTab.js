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
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import API_BASE_URL from '../utils/api-controller';
import getHeaders from '../utils/get-headers';
import axios from 'axios';
import { TransactionModalManager } from '../finance/bank/client-transaction-modal';
import { DateRangePickerField } from '../components/PortalDatePicker';
import TablePagination from '../components/TablePagination';
import OpeningBalanceModal from '../components/OpeningBalanceModal';
import { ViewTransactionModalManager } from '../components/ViewTransactionModal';


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
    const [downloadingInvoice, setDownloadingInvoice] = useState(false);
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

                calculateSummary(response.data.data || [], openingBalObj);
            }
        } catch (error) {
            console.error('Error fetching transactions:', error);
            toast.error('Failed to fetch transactions');
            setTransactions([]);
            setOpeningBalance({ debit: 0, credit: 0, balance: 0 });
            calculateSummary([], { debit: 0, credit: 0, balance: 0 });
        } finally {
            setFetchingTransactions(false);
            setLoading(false);
        }
    };

    // Calculate transaction summary (supports new API: payment/sale/etc with debit/credit/balance)
    const calculateSummary = (transactionsData, openingBalObj) => {
        let totalCredit = openingBalObj?.credit ?? 0;
        let totalDebit = openingBalObj?.debit ?? 0;
        let closingBalance = openingBalObj?.balance ?? 0;

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

    // Handle invoice download — POST /invoice/generate, response is a PDF blob
    const handleViewInvoice = async (transaction) => {
        if (!transaction) return;

        const invoiceId = transaction.invoice_id;
        const rawType = (transaction.transaction_type || '').toLowerCase();
        // Map ledger transaction types to invoice API type values
        const typeMap = { sale: 'sale', sale_invoice: 'sale', purchase: 'purchase', purchase_invoice: 'purchase' };
        const invoiceType = typeMap[rawType] ?? rawType;

        if (!invoiceId) {
            toast.error('Invoice ID not available for this transaction');
            return;
        }

        setShowActionMenu(null);
        actionAnchorRef.current = null;
        setActionMenuPosition(null);
        setDownloadingInvoice(true);

        const toastId = toast.loading('Generating invoice…');
        try {
            const response = await axios.post(
                `${API_BASE_URL}/invoice/generate`,
                { invoice_id: invoiceId, type: invoiceType, response: 'pdf' },
                { headers: getHeaders(), responseType: 'blob' }
            );

            // Build a filename from invoice_no if available
            const filename = `invoice-${transaction.invoice_no || invoiceId}.pdf`;

            const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);

            toast.success('Invoice downloaded', { id: toastId });
        } catch (error) {
            console.error('Invoice download error:', error);
            const message = error.response?.data?.message || error.message || 'Failed to download invoice';
            toast.error(message, { id: toastId });
        } finally {
            setDownloadingInvoice(false);
        }
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
        if ((transaction.transaction_type || '').toLowerCase() === 'sale' && Array.isArray(particular?.sale_items)) {
            const items = particular.sale_items.filter((item) => item?.name);
            const firstItemName = items[0]?.name || 'Sale item';
            const itemsLabel = items.length > 1
                ? `${firstItemName}, ... (+${items.length - 1})`
                : firstItemName;

            return (
                <div className="flex flex-col min-w-0">
                    <div className="font-medium text-slate-800 truncate" title={itemsLabel}>
                        {itemsLabel}
                    </div>
                    {remark && (
                        <div className="text-xs text-slate-600 mt-1 truncate max-w-[200px]" title={remark}>
                            {remark}
                        </div>
                    )}
                </div>
            );
        }
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
                                        <span className="text-sm font-semibold text-blue-600">{formatCurrency(openingBalance.debit)}</span>
                                    ) : (
                                        <span className="text-sm text-slate-600">{formatCurrency(0)}</span>
                                    )}
                                </td>
                                <td className="p-4 text-right">
                                    {openingBalance.credit > 0 ? (
                                        <span className="text-sm font-semibold text-orange-600">{formatCurrency(openingBalance.credit)}</span>
                                    ) : (
                                        <span className="text-sm text-slate-600">{formatCurrency(0)}</span>
                                    )}
                                </td>
                                <td className={`p-4 text-right font-bold ${(openingBalance.balance ?? 0) >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                                    {formatCurrency(openingBalance.balance ?? 0)}
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
                                                    <span className="text-sm font-semibold text-blue-600">{formatCurrency(amounts.debit)}</span>
                                                ) : (
                                                    <span className="text-sm text-slate-600">{formatCurrency(0)}</span>
                                                );
                                            })()}
                                        </td>
                                        <td className="p-4 text-right">
                                            {(() => {
                                                const amounts = getTransactionAmounts(transaction);
                                                return amounts.credit > 0 ? (
                                                    <span className="text-sm font-semibold text-orange-600">{formatCurrency(amounts.credit)}</span>
                                                ) : (
                                                    <span className="text-sm text-slate-600">{formatCurrency(0)}</span>
                                                );
                                            })()}
                                        </td>
                                        <td className="p-4 text-right">
                                            <span className={`text-sm font-bold ${((getTransactionAmounts(transaction).balance) ?? 0) >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                                                {formatCurrency(getTransactionAmounts(transaction).balance ?? 0)}
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
                                <td className="p-4 text-right text-blue-600">{formatCurrency(summary.totalDebit)}</td>
                                <td className="p-4 text-right text-orange-600">{formatCurrency(summary.totalCredit)}</td>
                                <td className={`p-4 text-right ${summary.closingBalance >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                                    {formatCurrency(summary.closingBalance)}
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

            <OpeningBalanceModal
                isOpen={showOpeningBalanceModal}
                onClose={() => setShowOpeningBalanceModal(false)}
                isLoading={openingBalanceLoading}
                isSubmitting={openingBalanceSubmitting}
                openingBalanceData={openingBalanceData}
                openingBalanceForm={openingBalanceForm}
                setOpeningBalanceForm={setOpeningBalanceForm}
                onSubmit={handleSetOpeningBalance}
                formatCurrency={formatCurrency}
            />

            <AnimatePresence>
                {detailsTransaction && (
                    <ViewTransactionModalManager
                        transaction={detailsTransaction}
                        onClose={() => setDetailsTransaction(null)}
                        formatCurrency={formatCurrency}
                        onDownload={handleViewInvoice}
                        isDownloading={downloadingInvoice}
                    />
                )}
            </AnimatePresence>

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
                        disabled={downloadingInvoice}
                        className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-green-50 flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {downloadingInvoice ? (
                            <div className="w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <FiFile className="w-4 h-4 text-green-600" />
                        )}
                        {downloadingInvoice ? 'Downloading…' : 'Invoice'}
                    </button>
                </motion.div>,
                document.body
            )}
        </div>
    );
};

export default ClientLedger;