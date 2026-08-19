import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
    FiDownload,
    FiRefreshCw,
    FiPlus,
    FiEdit2,
    FiFile,
    FiEye,
    FiBarChart2,
} from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import axios from 'axios';
import API_BASE_URL from '../utils/api-controller';
import getHeaders from '../utils/get-headers';
import { generateAndDownloadInvoice } from '../utils/invoice-download';
import { checkPermissionSync } from '../utils/permission-helper';
import { TransactionModalManager } from '../components/Modals/CreateTransactions';
import { EditTransactionModalManager } from '../components/Modals/EditTransactions';
import { DateRangePickerField, toIsoDate } from '../components/PortalDatePicker';
import TablePagination from '../components/TablePagination';
import OpeningBalanceModal from '../components/OpeningBalanceModal';
import { ViewTransactionModalManager, isTaskOriginSale, resolveSaleTaskId } from '../components/Modals/ViewTransactions';
import { buildLedgerDownloadFilename } from '../utils/ledgerFilename';
import TransactionTable, {
    getTransactionAmounts,
    formatLedgerCurrency,
    formatLedgerCurrencyPlain,
    getLedgerTransactionTypeIcon,
} from '../components/TransactionTable';

const LEDGER_EDIT_MODAL_TYPES = {
    receive: 'RECEIVE',
    payment: 'PAYMENT',
    sale: 'SALE',
    purchase: 'PURCHASE',
    journal: 'JOURNAL',
    expense: 'EXPENSE',
    discount: 'DISCOUNT',
    contra: 'CONTRA',
};

const normalizeOpeningBalance = (openingBal) => {
    if (typeof openingBal === 'object' && openingBal !== null) {
        return {
            debit: openingBal.debit ?? 0,
            credit: openingBal.credit ?? 0,
            balance: openingBal.balance ?? 0,
        };
    }
    return { debit: 0, credit: 0, balance: Number(openingBal) || 0 };
};

const calculateSummary = (transactionsData, openingBalObj) => {
    let totalCredit = openingBalObj?.credit ?? 0;
    let totalDebit = openingBalObj?.debit ?? 0;
    let closingBalance = openingBalObj?.balance ?? 0;

    transactionsData.forEach((transaction) => {
        const amounts = getTransactionAmounts(transaction);
        totalDebit += amounts.debit;
        totalCredit += amounts.credit;
        if (amounts.balance != null) closingBalance = amounts.balance;
    });

    return { totalCredit, totalDebit, closingBalance };
};

export default function LedgerTab({
    username: usernameProp,
    staffUsername,
    staffName,
    staffEmail,
    staffMobile,
    staffCountryCode = '91',
    staffData,
    onProfileRefresh,
}) {
    const navigate = useNavigate();
    const username = usernameProp || staffUsername || staffData?.username;
    const displayName = staffName || staffData?.fullName || staffData?.name || '';
    const displayEmail = staffEmail || staffData?.email || '';
    const displayMobile = staffMobile || staffData?.phone || staffData?.mobile || '';
    const displayCountryCode = staffCountryCode || staffData?.country_code || '91';

    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [fetchingTransactions, setFetchingTransactions] = useState(false);
    const [fromDate, setFromDate] = useState(() => {
        const date = new Date();
        date.setDate(1);
        return toIsoDate(date);
    });
    const [toDate, setToDate] = useState(() => toIsoDate(new Date()));
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [isLastPage, setIsLastPage] = useState(false);
    const [itemsPerPage, setItemsPerPage] = useState(20);
    const [openingBalance, setOpeningBalance] = useState({ debit: 0, credit: 0, balance: 0 });
    const [summary, setSummary] = useState({
        totalCredit: 0,
        totalDebit: 0,
        closingBalance: 0,
    });
    const [showTransactionModal, setShowTransactionModal] = useState(false);
    const [transactionType, setTransactionType] = useState('');
    const [showActionMenu, setShowActionMenu] = useState(null);
    const [actionMenuPosition, setActionMenuPosition] = useState(null);
    const actionAnchorRef = useRef(null);
    const [showAddMenu, setShowAddMenu] = useState(false);
    const [selectedBank, setSelectedBank] = useState(null);
    const [detailsTransaction, setDetailsTransaction] = useState(null);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [editRecord, setEditRecord] = useState(null);
    const [editModalType, setEditModalType] = useState('');
    const [downloadingInvoice, setDownloadingInvoice] = useState(false);
    const [showOpeningBalanceModal, setShowOpeningBalanceModal] = useState(false);
    const [openingBalanceData, setOpeningBalanceData] = useState(null);
    const [openingBalanceLoading, setOpeningBalanceLoading] = useState(false);
    const [openingBalanceSubmitting, setOpeningBalanceSubmitting] = useState(false);
    const [openingBalanceForm, setOpeningBalanceForm] = useState({
        amount: '',
        type: 'credit',
        transaction_date: toIsoDate(new Date()),
        remark: '',
    });

    useEffect(() => {
        if (!username) {
            toast.error('Staff username not found');
        }
    }, [username]);

    const fetchTransactions = useCallback(async () => {
        if (!username || !fromDate || !toDate) return;

        setFetchingTransactions(true);
        try {
            const response = await axios.get(
                `${API_BASE_URL}/transaction/list?page_no=${currentPage}&limit=${itemsPerPage}&from_date=${fromDate}&to_date=${toDate}&party_type=staff&party_id=${encodeURIComponent(username)}`,
                { headers: getHeaders() }
            );

            if (response.data?.success) {
                const openingBalObj = normalizeOpeningBalance(response.data.opening_balance);
                const rows = response.data.data || [];

                setTransactions(rows);
                setOpeningBalance(openingBalObj);
                setSummary(calculateSummary(rows, openingBalObj));

                const meta = response.data.meta || {};
                const total = meta.total ?? 0;
                const limit = meta.limit ?? itemsPerPage;
                setTotalItems(total);
                setTotalPages(Math.max(1, Math.ceil(total / limit)));
                setIsLastPage(Boolean(meta.is_last_page ?? currentPage >= Math.ceil(total / limit)));
            } else {
                throw new Error(response.data?.message || 'Failed to fetch transactions');
            }
        } catch (error) {
            console.error('Error fetching staff ledger:', error);
            toast.error(error.response?.data?.message || error.message || 'Failed to fetch transactions');
            setTransactions([]);
            const emptyOpening = { debit: 0, credit: 0, balance: 0 };
            setOpeningBalance(emptyOpening);
            setSummary(calculateSummary([], emptyOpening));
            setTotalItems(0);
            setTotalPages(1);
            setIsLastPage(true);
        } finally {
            setFetchingTransactions(false);
            setLoading(false);
        }
    }, [username, fromDate, toDate, currentPage, itemsPerPage]);

    useEffect(() => {
        setCurrentPage(1);
    }, [fromDate, toDate, itemsPerPage]);

    useEffect(() => {
        if (username && fromDate && toDate) {
            fetchTransactions();
        }
    }, [username, fromDate, toDate, fetchTransactions]);

    const handleRefresh = useCallback(() => {
        fetchTransactions();
        toast.success('Data refreshed');
    }, [fetchTransactions]);

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

    const computeActionMenuPosition = useCallback((anchorEl, itemCount = 3) => {
        if (!anchorEl) return null;

        const rect = anchorEl.getBoundingClientRect();
        const menuWidth = 160;
        const menuHeight = 8 + itemCount * 36;
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
            const txn = transactions.find((t) => t.transaction_id === showActionMenu);
            const itemCount = 2 + (txn?.downloadable ? 1 : 0);
            setActionMenuPosition(computeActionMenuPosition(actionAnchorRef.current, itemCount));
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
    }, [showActionMenu, computeActionMenuPosition, transactions]);

    const fetchOpeningBalance = useCallback(async () => {
        if (!username) return;
        setOpeningBalanceLoading(true);
        try {
            const res = await axios.get(
                `${API_BASE_URL}/transaction/get-opening-balance?party_type=staff&party_id=${encodeURIComponent(username)}`,
                { headers: getHeaders() }
            );
            if (res.data.success && res.data.data) {
                const d = res.data.data;
                setOpeningBalanceData(d);
                setOpeningBalanceForm({
                    amount: String(d.amount || ''),
                    type: d.type || 'credit',
                    transaction_date: d.transaction_date
                        ? d.transaction_date.split('T')[0]
                        : toIsoDate(new Date()),
                    remark: d.remark || '',
                });
            } else {
                setOpeningBalanceData(null);
                setOpeningBalanceForm({
                    amount: '',
                    type: 'credit',
                    transaction_date: toIsoDate(new Date()),
                    remark: '',
                });
            }
        } catch (err) {
            console.error('Fetch opening balance error:', err);
            toast.error(err.response?.data?.message || 'Failed to fetch opening balance');
            setOpeningBalanceData(null);
        } finally {
            setOpeningBalanceLoading(false);
        }
    }, [username]);

    const handleOpenOpeningBalanceModal = () => {
        setShowOpeningBalanceModal(true);
        fetchOpeningBalance();
    };

    const handleSetOpeningBalance = async (e) => {
        e.preventDefault();
        if (!username) {
            toast.error('Staff not found');
            return;
        }
        const amt = parseFloat(openingBalanceForm.amount);
        if (Number.isNaN(amt) || amt <= 0) {
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
                    party_type: 'staff',
                    party_id: username,
                    remark: openingBalanceForm.remark.trim() || undefined,
                    transaction_date: openingBalanceForm.transaction_date,
                },
                { headers: getHeaders() }
            );
            if (res.data.success) {
                toast.success(res.data.message || 'Opening balance saved successfully');
                setShowOpeningBalanceModal(false);
                fetchTransactions();
                onProfileRefresh?.();
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

    const handleExport = useCallback(
        async (format = 'pdf') => {
            if (!username) {
                toast.error('Staff username is required');
                return;
            }
            if (!fromDate || !toDate) {
                toast.error('Please select a date range');
                return;
            }

            const toastId = toast.loading(`Exporting ${format.toUpperCase()}…`);
            try {
                const headers = getHeaders();
                if (!headers) throw new Error('Authentication failed');

                const params = new URLSearchParams({
                    from_date: fromDate,
                    to_date: toDate,
                    party_type: 'staff',
                    party_id: username,
                    format,
                });

                const response = await axios.get(`${API_BASE_URL}/transaction/export?${params}`, {
                    headers,
                    responseType: 'blob',
                });

                const url = window.URL.createObjectURL(new Blob([response.data]));
                const link = document.createElement('a');
                link.href = url;
                link.setAttribute(
                    'download',
                    buildLedgerDownloadFilename({
                        name: displayName || username,
                        fromDate,
                        toDate,
                        extension: format,
                    })
                );
                document.body.appendChild(link);
                link.click();
                link.remove();
                window.URL.revokeObjectURL(url);

                toast.success(`${format.toUpperCase()} exported successfully`, { id: toastId });
            } catch (error) {
                console.error('Error exporting staff ledger:', error);
                toast.error(error.response?.data?.message || 'Failed to export ledger', { id: toastId });
            }
        },
        [username, displayName, fromDate, toDate]
    );

    const handleTransactionTypeClick = (type) => {
        setTransactionType(type);
        setShowTransactionModal(true);
        setShowAddMenu(false);
    };

    const handleCreateTransaction = async () => {
        setShowTransactionModal(false);
        setSelectedBank(null);
        fetchTransactions();
        onProfileRefresh?.();
    };

    const handleActionClick = (e, transactionId) => {
        e.stopPropagation();
        const willOpen = showActionMenu !== transactionId;
        if (willOpen) {
            const txn = transactions.find((t) => t.transaction_id === transactionId);
            const itemCount = 2 + (txn?.downloadable ? 1 : 0);
            actionAnchorRef.current = e.currentTarget;
            setShowActionMenu(transactionId);
            setActionMenuPosition(computeActionMenuPosition(e.currentTarget, itemCount));
            return;
        }
        actionAnchorRef.current = null;
        setShowActionMenu(null);
        setActionMenuPosition(null);
    };

    const handleEdit = async (transaction) => {
        setShowActionMenu(null);
        actionAnchorRef.current = null;
        setActionMenuPosition(null);
        if (!transaction?.transaction_id) return;

        if (!checkPermissionSync('finance_entry_edit')) {
            toast.error('Need Access Permission');
            return;
        }

        const rawType = String(transaction.transaction_type || '')
            .trim()
            .toLowerCase()
            .replace(/\s+/g, '_');

        if (rawType === 'opening_balance' || rawType === 'opening') {
            toast.error('Use Set Opening Balance to edit this entry');
            return;
        }

        const modalType = LEDGER_EDIT_MODAL_TYPES[rawType];
        if (!modalType) {
            toast.error('This transaction type cannot be edited from the ledger');
            return;
        }

        if (modalType === 'SALE' && isTaskOriginSale(transaction)) {
            const taskId = resolveSaleTaskId(transaction);
            if (taskId) {
                navigate(`/task/profile/${encodeURIComponent(taskId)}/details`);
                return;
            }
        }

        const toastId = toast.loading('Loading transaction…');
        try {
            const response = await axios.get(`${API_BASE_URL}/transaction/details`, {
                params: { transaction_id: transaction.transaction_id },
                headers: getHeaders(),
            });
            if (!response.data?.success || !response.data.data) {
                toast.error(response.data?.message || 'Failed to load transaction', { id: toastId });
                return;
            }

            const record = response.data.data;
            if (modalType === 'SALE' && isTaskOriginSale(record)) {
                toast.dismiss(toastId);
                const taskId = resolveSaleTaskId(record);
                if (!taskId) {
                    toast.error('This sale was created from a task. Open the related task to edit it.');
                    return;
                }
                navigate(`/task/profile/${encodeURIComponent(taskId)}/details`);
                return;
            }

            setEditModalType(modalType);
            setEditRecord(record);
            setEditModalOpen(true);
            setDetailsTransaction(null);
            toast.dismiss(toastId);
        } catch (error) {
            toast.error(
                error.response?.data?.message || error.message || 'Failed to load transaction',
                { id: toastId }
            );
        }
    };

    const closeEditModal = () => {
        setEditModalOpen(false);
        setEditRecord(null);
        setEditModalType('');
    };

    const handleEditSuccess = () => {
        closeEditModal();
        fetchTransactions();
        onProfileRefresh?.();
    };

    const handleViewInvoice = async (transaction) => {
        if (!transaction) return;

        const invoiceId = transaction.invoice_id;
        const rawType = (transaction.transaction_type || '').toLowerCase();
        const typeMap = {
            sale: 'sale',
            sale_invoice: 'sale',
            purchase: 'purchase',
            purchase_invoice: 'purchase',
        };
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
            await generateAndDownloadInvoice({
                invoiceId,
                type: invoiceType,
                filename: `invoice-${transaction.invoice_no || invoiceId}.pdf`,
                headers: getHeaders(),
            });

            toast.success('Invoice downloaded', { id: toastId });
        } catch (error) {
            console.error('Invoice download error:', error);
            toast.error(error.response?.data?.message || error.message || 'Failed to download invoice', {
                id: toastId,
            });
        } finally {
            setDownloadingInvoice(false);
        }
    };

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
    const formatCurrencyPlain = formatLedgerCurrencyPlain;
    const canViewFees = checkPermissionSync('task_fees_view');
    const subtitleParts = [
        displayName,
        displayEmail,
        displayMobile
            ? String(displayMobile).trim().startsWith('+')
                ? String(displayMobile).trim()
                : `+${displayCountryCode || '91'} ${String(displayMobile).trim()}`
            : null,
    ].filter(Boolean);

    return (
        <div className="w-full">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="mb-6 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm"
            >
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                        <h2 className="text-base font-bold text-slate-800 sm:text-lg">Staff Ledger</h2>
                        {subtitleParts.length > 0 && (
                            <p className="mt-1 truncate text-sm text-slate-500">
                                {subtitleParts.join(' · ')}
                            </p>
                        )}
                    </div>

                    <div className="flex flex-wrap items-center justify-end gap-2">
                        {canViewFees && (
                            <button
                                type="button"
                                onClick={handleOpenOpeningBalanceModal}
                                className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 shadow-sm transition-all hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-600"
                                title="Set / Edit Opening Balance"
                            >
                                <FiBarChart2 className="h-4 w-4" />
                                <span>Opening Balance</span>
                            </button>
                        )}
                        <div className="w-56 shrink-0">
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
                                buttonClassName="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-600 transition-all hover:border-indigo-400 focus:outline-none"
                                wrapperClassName="w-full"
                            />
                        </div>
                        <motion.button
                            type="button"
                            onClick={handleRefresh}
                            className="rounded-lg border border-slate-200 bg-white p-2 shadow-sm transition-all duration-200 hover:shadow"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            title="Refresh"
                        >
                            <FiRefreshCw
                                className={`h-5 w-5 text-slate-600 ${fetchingTransactions ? 'animate-spin' : ''}`}
                            />
                        </motion.button>
                        <motion.button
                            type="button"
                            onClick={() => handleExport('pdf')}
                            disabled={!canViewFees}
                            className="rounded-lg border border-slate-200 bg-white p-2 shadow-sm transition-all duration-200 hover:shadow disabled:cursor-not-allowed disabled:opacity-50"
                            whileHover={canViewFees ? { scale: 1.05 } : {}}
                            whileTap={canViewFees ? { scale: 0.95 } : {}}
                            title="Export PDF"
                        >
                            <FiDownload className="h-5 w-5 text-slate-600" />
                        </motion.button>
                        <div className="relative">
                            <motion.button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowAddMenu((prev) => !prev);
                                }}
                                className="rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 p-2 text-white shadow-sm transition-all duration-200 hover:shadow"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                title="Add Transaction"
                            >
                                <FiPlus className="h-5 w-5" />
                            </motion.button>
                            {showAddMenu && (
                                <div
                                    className="absolute right-0 z-50 mt-2 w-48 rounded-xl border border-slate-200 bg-white py-2 shadow-xl"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    {['RECEIVE', 'PAYMENT', 'SALE', 'PURCHASE', 'EXPENSE', 'JOURNAL'].map(
                                        (type) => (
                                            <button
                                                key={type}
                                                type="button"
                                                onClick={() => handleTransactionTypeClick(type)}
                                                className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-slate-700 transition-colors hover:bg-blue-50"
                                            >
                                                <span className="text-blue-600">
                                                    {getLedgerTransactionTypeIcon(type)}
                                                </span>
                                                {type.charAt(0) + type.slice(1).toLowerCase()}
                                            </button>
                                        )
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </motion.div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg"
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

                <TablePagination
                    page={currentPage}
                    limit={itemsPerPage}
                    total={totalItems}
                    totalPages={totalPages}
                    isLastPage={isLastPage}
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
                clientId={username}
                clientName={displayName}
                bankDetails={selectedBank}
                bankId={selectedBank?.bank_id}
                bankPageClientLookup={false}
                showClient={!(transactionType === 'RECEIVE' || transactionType === 'PAYMENT')}
                showBank={true}
                showSummary={!(transactionType === 'RECEIVE' || transactionType === 'PAYMENT')}
                onSubmit={handleCreateTransaction}
                formatCurrency={formatCurrency}
                summary={summary}
                partyType="staff"
                partyLabel="Staff"
            />

            <EditTransactionModalManager
                modalType={editModalType}
                isOpen={editModalOpen}
                onClose={closeEditModal}
                editRecord={editRecord}
                onSubmit={handleEditSuccess}
                formatCurrency={formatCurrencyPlain}
                summary={summary}
                partyType="staff"
                partyLabel="Staff"
            />

            {showActionMenu &&
                selectedActionTransaction &&
                actionMenuPosition &&
                createPortal(
                    <motion.div
                        initial={{ opacity: 0, scale: 0.96 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.96 }}
                        className="fixed z-[99999] w-40 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-xl"
                        style={{ top: actionMenuPosition.top, left: actionMenuPosition.left, height: 'auto' }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <span
                            className="absolute h-2.5 w-2.5 rotate-45 border-slate-200 bg-white"
                            style={{
                                left:
                                    actionMenuPosition.placement === 'left' ||
                                    actionMenuPosition.placement === 'right'
                                        ? undefined
                                        : `${actionMenuPosition.arrowX - 5}px`,
                                top:
                                    actionMenuPosition.placement === 'bottom'
                                        ? '-5px'
                                        : actionMenuPosition.placement === 'top'
                                          ? undefined
                                          : `${actionMenuPosition.arrowY - 5}px`,
                                bottom: actionMenuPosition.placement === 'top' ? '-5px' : undefined,
                                right: actionMenuPosition.placement === 'left' ? '-5px' : undefined,
                                borderTopWidth: actionMenuPosition.placement === 'bottom' ? '1px' : '0',
                                borderLeftWidth: actionMenuPosition.placement === 'bottom' ? '1px' : '0',
                                borderBottomWidth: actionMenuPosition.placement === 'top' ? '1px' : '0',
                                borderRightWidth:
                                    actionMenuPosition.placement === 'left' ||
                                    actionMenuPosition.placement === 'right'
                                        ? '1px'
                                        : '0',
                            }}
                        />
                        <button
                            type="button"
                            onClick={() => handleViewDetails(selectedActionTransaction)}
                            className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-slate-700 transition-colors hover:bg-indigo-50"
                        >
                            <FiEye className="h-4 w-4 text-indigo-600" />
                            Details
                        </button>
                        <button
                            type="button"
                            onClick={() => handleEdit(selectedActionTransaction)}
                            className={`flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-slate-700 transition-colors hover:bg-blue-50 ${
                                !checkPermissionSync('finance_entry_edit') ? 'cursor-not-allowed opacity-60 hover:bg-transparent' : ''
                            }`}
                        >
                            <FiEdit2 className="h-4 w-4 text-blue-600" />
                            {isTaskOriginSale(selectedActionTransaction) ? 'Edit (Task)' : 'Edit'}
                        </button>
                        {selectedActionTransaction.downloadable ? (
                            <button
                                type="button"
                                onClick={() => handleViewInvoice(selectedActionTransaction)}
                                disabled={downloadingInvoice}
                                className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-slate-700 transition-colors hover:bg-green-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {downloadingInvoice ? (
                                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-green-500 border-t-transparent" />
                                ) : (
                                    <FiFile className="h-4 w-4 text-green-600" />
                                )}
                                {downloadingInvoice ? 'Downloading…' : 'Download'}
                            </button>
                        ) : null}
                    </motion.div>,
                    document.body
                )}
        </div>
    );
}
