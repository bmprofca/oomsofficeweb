// pages/TransactionHistory.jsx
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { Header, Sidebar } from '../../components/header';
import {
    FiBarChart2,
    FiRepeat,
    FiDownload,
    FiShare2,
    FiRefreshCw,
    FiPlus,
    FiUser,
    FiDollarSign,
    FiFileText,
    FiShoppingBag,
    FiTruck,
    FiEdit2,
    FiFile,
    FiEye
} from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import API_BASE_URL from '../../utils/api-controller';
import getHeaders from '../../utils/get-headers';
import axios from 'axios';
import TransactionTable, {
    getTransactionAmounts,
    formatLedgerCurrency,
} from '../../components/TransactionTable';
import { DateRangePickerField } from '../../components/PortalDatePicker';
import TablePagination from '../../components/TablePagination';
import OpeningBalanceModal from '../../components/OpeningBalanceModal';
import { ViewTransactionModalManager } from '../../components/Modals/ViewTransactions';
import { TransactionModalManager } from '../../components/Modals/CreateTransactions';

/** @param {Record<string, unknown> | null} details */
function isLedgerCash(details) {
    return Boolean(details && String(details.type ?? '').toLowerCase() === 'cash');
}

/** Subtitle below "Transaction History" plus accessible title (cash: holder only).
 * @param {Record<string, unknown> | null} details */
function formatLedgerHeaderLines(details) {
    if (!details) {
        return { line: '', title: '' };
    }
    if (isLedgerCash(details)) {
        const holder = String(details.holder ?? '').trim() || 'Cash account';
        return { line: holder, title: holder };
    }
    const bank = String(details.bank ?? '').trim();
    const accountNo = String(details.account_no ?? '').trim();
    const branch = String(details.branch ?? '').trim();
    const line = `${bank}${accountNo ? ` - ${accountNo}` : ''}${branch ? ` (${branch})` : ''}`.trim() || 'Bank account';
    const title = `${bank}${accountNo ? ` - ${accountNo}` : ''}${branch ? ` (${branch})` : ''}`.trim();
    return { line, title };
}

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
    const [openingBalance, setOpeningBalance] = useState(0);
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
    const [showAddMenu, setShowAddMenu] = useState(false);

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

    // Close row action menu & add-transaction menu when clicking outside
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

    // Calculate transaction summary (same shape as shared TransactionTable helpers)
    const calculateSummary = (transactionsData, openingBal) => {
        let totalCredit = 0;
        let totalDebit = 0;
        let closingBalance = openingBal;

        transactionsData.forEach((transaction) => {
            const amounts = getTransactionAmounts(transaction);
            totalDebit += amounts.debit;
            totalCredit += amounts.credit;
            if (amounts.balance !== undefined && amounts.balance !== null) {
                closingBalance = amounts.balance;
            }
        });

        setSummary({
            totalCredit,
            totalDebit,
            closingBalance
        });
    };

    const fetchOpeningBalance = useCallback(async () => {
        if (!bankId) return;
        setOpeningBalanceLoading(true);
        try {
            const res = await axios.get(
                `${API_BASE_URL}/transaction/get-opening-balance?party_type=bank&party_id=${encodeURIComponent(bankId)}`,
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
    }, [bankId]);

    const handleOpenOpeningBalanceModal = () => {
        setShowOpeningBalanceModal(true);
        fetchOpeningBalance();
    };

    const handleSetOpeningBalance = async (e) => {
        e.preventDefault();
        if (!bankId) {
            toast.error('Bank not found');
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
                    party_type: 'bank',
                    party_id: bankId,
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

    const handleShare = useCallback(async () => {
        const url = window.location.href;
        const ledgerLabel = bankDetails
            ? (isLedgerCash(bankDetails)
                ? (String(bankDetails.holder ?? '').trim() || 'Cash account')
                : String(bankDetails.bank ?? '').trim() || 'Bank account')
            : '';
        const title = bankDetails
            ? `Transaction History — ${ledgerLabel}`
            : 'Transaction History';
        const text = bankDetails
            ? (isLedgerCash(bankDetails)
                ? `${String(bankDetails.holder ?? '').trim() || 'Cash account'} · Cash`
                : `${bankDetails.bank} - ${bankDetails.account_no} (${bankDetails.branch})`)
            : 'Bank transaction history';

        try {
            if (typeof navigator !== 'undefined' && navigator.share) {
                await navigator.share({ title, text, url });
                return;
            }
            if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(url);
                toast.success('Link copied to clipboard');
                return;
            }
            toast.error('Sharing is not supported in this browser');
        } catch (err) {
            if (err?.name === 'AbortError') return;
            try {
                if (navigator.clipboard?.writeText) {
                    await navigator.clipboard.writeText(url);
                    toast.success('Link copied to clipboard');
                } else {
                    toast.error('Could not share or copy link');
                }
            } catch {
                toast.error('Could not share or copy link');
            }
        }
    }, [bankDetails]);

    // Handle transaction type click
    const handleTransactionTypeClick = (type) => {
        setShowAddMenu(false);
        setTransactionType(type);
        setShowTransactionModal(true);
    };

    // Handle create transaction (Receive/Payment/etc. may simulate; CONTRA is saved inside CreateTransactions)
    const handleCreateTransaction = async (type, formData) => {
        try {
            if (type !== 'CONTRA') {
                console.log('Creating transaction:', type, formData);
                await new Promise(resolve => setTimeout(resolve, 1000));
                toast.success(`${type} transaction created successfully`);
            }

            setShowTransactionModal(false);
            fetchTransactions();
            if (type === 'CONTRA') {
                fetchBankDetails();
            }
        } catch (error) {
            console.error('Error creating transaction:', error);
            toast.error(`Failed to create ${type} transaction`);
        }
    };

    // Handle action click (viewport-aware menu via portal)
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

    const selectedActionTransaction = useMemo(
        () => transactions.find((t) => t.transaction_id === showActionMenu),
        [transactions, showActionMenu]
    );

    const openingBalanceForTable = useMemo(() => {
        const ob = typeof openingBalance === 'number' ? openingBalance : 0;
        return {
            debit: ob > 0 ? ob : 0,
            credit: ob < 0 ? Math.abs(ob) : 0,
            balance: ob,
        };
    }, [openingBalance]);

    // Handle edit
    const handleEdit = (transaction) => {
        console.log('Edit transaction:', transaction);
        toast.success('Edit functionality coming soon');
        setShowActionMenu(null);
        actionAnchorRef.current = null;
        setActionMenuPosition(null);
    };

    const handleViewInvoice = async (transaction) => {
        if (!transaction) return;

        const invoiceId = transaction.invoice_id;
        const rawType = (transaction.transaction_type || '').toLowerCase();
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

    const formatCurrency = formatLedgerCurrency;

    const ledgerHeader = useMemo(() => formatLedgerHeaderLines(bankDetails), [bankDetails]);

    // Get transaction type icon
    const getTransactionTypeIcon = (type) => {
        switch (type) {
            case 'RECEIVE': return <FiUser className="w-5 h-5" />;
            case 'PAYMENT': return <FiDollarSign className="w-5 h-5" />;
            case 'SALE': return <FiShoppingBag className="w-5 h-5" />;
            case 'PURCHASE': return <FiTruck className="w-5 h-5" />;
            case 'EXPENSE': return <FiFileText className="w-5 h-5" />;
            case 'CONTRA': return <FiRepeat className="w-5 h-5" />;
            default: return <FiPlus className="w-5 h-5" />;
        }
    };

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

            {/* Main Content Area */}
            <div className={`pt-16 transition-all duration-300 ease-in-out ${isMinimized ? 'md:pl-20' : 'md:pl-[260px]'}`}>
                <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden"
                    >
                        <div className="border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white px-4 sm:px-5 py-4">
                            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
                                <div className="min-w-0 flex-1">
                                    <h1 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight">Transaction History</h1>
                                    {bankDetails ? (
                                        <p className="text-sm text-slate-500 mt-0.5 truncate" title={ledgerHeader.title}>
                                            {ledgerHeader.line}
                                        </p>
                                    ) : null}
                                </div>
                                <div className="flex flex-wrap items-center gap-2 lg:justify-end shrink-0">
                                    <button
                                        type="button"
                                        onClick={handleOpenOpeningBalanceModal}
                                        className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all shadow-sm whitespace-nowrap"
                                        title="Set / Edit Opening Balance"
                                    >
                                        <FiBarChart2 className="w-4 h-4" />
                                        <span className="hidden sm:inline">Opening Balance</span>
                                        <span className="sm:hidden">Opening</span>
                                    </button>
                                    <div className="w-full min-[480px]:w-56 shrink-0">
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
                                        type="button"
                                        onClick={handleRefresh}
                                        className="p-2 bg-white rounded-lg shadow-sm hover:shadow transition-all duration-200 border border-slate-200"
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        title="Refresh"
                                    >
                                        <FiRefreshCw className="w-5 h-5 text-slate-600" />
                                    </motion.button>
                                    <motion.button
                                        type="button"
                                        onClick={() => handleExport('pdf')}
                                        className="p-2 bg-white rounded-lg shadow-sm hover:shadow transition-all duration-200 border border-slate-200"
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        title="Export PDF"
                                    >
                                        <FiDownload className="w-5 h-5 text-slate-600" />
                                    </motion.button>
                                    <motion.button
                                        type="button"
                                        onClick={handleShare}
                                        className="p-2 bg-white rounded-lg shadow-sm hover:shadow transition-all duration-200 border border-slate-200"
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        title="Share"
                                    >
                                        <FiShare2 className="w-5 h-5 text-slate-600" />
                                    </motion.button>
                                    <div className="relative">
                                        <motion.button
                                            type="button"
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
                                                className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-[60]"
                                                onClick={(e) => e.stopPropagation()}
                                                role="menu"
                                            >
                                                {['RECEIVE', 'PAYMENT', 'SALE', 'PURCHASE', 'EXPENSE', 'CONTRA'].map((type) => (
                                                    <button
                                                        key={type}
                                                        type="button"
                                                        role="menuitem"
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
                        </div>

                        <TransactionTable
                            transactions={transactions}
                            loading={loading}
                            fetching={fetchingTransactions}
                            openingBalance={openingBalanceForTable}
                            summary={summary}
                            currentPage={currentPage}
                            itemsPerPage={itemsPerPage}
                            onActionClick={handleActionClick}
                        />

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

                    <TransactionModalManager
                        modalType={transactionType}
                        isOpen={showTransactionModal}
                        onClose={() => setShowTransactionModal(false)}
                        bankDetails={bankDetails}
                        bankId={bankId}
                        bankPageClientLookup={transactionType === 'RECEIVE' || transactionType === 'PAYMENT'}
                        showClient={!(transactionType === 'RECEIVE' || transactionType === 'PAYMENT')}
                        showSummary={
                            transactionType !== 'RECEIVE' &&
                            transactionType !== 'PAYMENT' &&
                            transactionType !== 'CONTRA'
                        }
                        onSubmit={handleCreateTransaction}
                        formatCurrency={formatCurrency}
                        summary={summary}
                        showFromBank={transactionType !== 'CONTRA'}
                        fromBankId={transactionType === 'CONTRA' ? (bankId || '') : ''}
                        fromBankDetails={transactionType === 'CONTRA' ? bankDetails : null}
                    />

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
                                type="button"
                                onClick={() => handleViewDetails(selectedActionTransaction)}
                                className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-indigo-50 flex items-center gap-2 transition-colors"
                            >
                                <FiEye className="w-4 h-4 text-indigo-600" />
                                Details
                            </button>
                            <button
                                type="button"
                                onClick={() => handleEdit(selectedActionTransaction)}
                                className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-blue-50 flex items-center gap-2 transition-colors"
                            >
                                <FiEdit2 className="w-4 h-4 text-blue-600" />
                                Edit
                            </button>
                            <button
                                type="button"
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
            </div>
        </div>
    );
};

export default TransactionHistory;