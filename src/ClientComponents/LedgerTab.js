import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import {
    FiDownload,
    FiRefreshCw,
    FiPlus,
    FiEdit2,
    FiFile,
    FiEye,
    FiBarChart2
} from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import API_BASE_URL from '../utils/api-controller';
import getHeaders from '../utils/get-headers';
import axios from 'axios';
import { checkPermissionSync } from '../utils/permission-helper';
import { TransactionModalManager } from '../components/Modals/CreateTransactions';
import { DateRangePickerField } from '../components/PortalDatePicker';
import TablePagination from '../components/TablePagination';
import OpeningBalanceModal from '../components/OpeningBalanceModal';
import { ViewTransactionModalManager } from '../components/Modals/ViewTransactions';
import TransactionTable, {
    getTransactionAmounts,
    formatLedgerCurrency,
    formatLedgerDate,
    getLedgerTransactionTypeIcon,
} from '../components/TransactionTable';


const ClientLedger = ({
    username: usernameProp,
    clientUsername,
    clientId,
    clientName: clientNameProp,
}) => {
    const params = useParams();
    const navigate = useNavigate();
    // Prefer explicit props (task profile, etc.) then route param (client profile)
    const username = usernameProp || clientUsername || clientId || params.username;

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

    const formatCurrency = formatLedgerCurrency;
    const formatDate = formatLedgerDate;

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
                        <h2 className="text-base sm:text-lg font-bold text-slate-800">Client Ledger</h2>
                        {clientProfile ? (
                            <p className="text-sm text-slate-500 mt-1 truncate">
                                {clientProfile.name} &middot; {clientProfile.email}
                                {clientProfile.mobile && ` · +${clientProfile.country_code || '91'} ${clientProfile.mobile}`}
                            </p>
                        ) : clientNameProp ? (
                            <p className="text-sm text-slate-500 mt-1 truncate">{clientNameProp}</p>
                        ) : null}
                    </div>

                    <div className="flex flex-wrap items-center justify-end gap-2">
                        {checkPermissionSync('task_fees_view') && (
                            <button
                                type="button"
                                onClick={handleOpenOpeningBalanceModal}
                                className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all shadow-sm whitespace-nowrap shrink-0"
                                title="Set / Edit Opening Balance"
                            >
                                <FiBarChart2 className="w-4 h-4" />
                                <span>Opening Balance</span>
                            </button>
                        )}
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
                            disabled={!checkPermissionSync('task_fees_view')}
                            className="p-2 bg-white rounded-lg shadow-sm hover:shadow transition-all duration-200 border border-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            whileHover={checkPermissionSync('task_fees_view') ? { scale: 1.05 } : {}}
                            whileTap={checkPermissionSync('task_fees_view') ? { scale: 0.95 } : {}}
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
                                            <span className="text-blue-600">{getLedgerTransactionTypeIcon(type)}</span>
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
                <TransactionTable
                    transactions={transactions}
                    loading={loading}
                    fetching={fetchingTransactions}
                    openingBalance={openingBalance}
                    summary={summary}
                    currentPage={currentPage}
                    itemsPerPage={itemsPerPage}
                    onActionClick={handleActionClick}
                />

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

            {/* Same TransactionModalManager wiring as bank transaction-history (modals render via portal in CreateTransactions BaseModal). */}
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
                bankPageClientLookup={false}
                showClient={!(transactionType === 'RECEIVE' || transactionType === 'PAYMENT')}
                showBank={true}
                showSummary={!(transactionType === 'RECEIVE' || transactionType === 'PAYMENT')}
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