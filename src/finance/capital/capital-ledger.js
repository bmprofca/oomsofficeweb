import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Header, Sidebar } from '../../components/header';
import {
    FiArrowLeft,
    FiBarChart2,
    FiEye,
    FiFile,
    FiRefreshCw,
    FiTrendingUp,
} from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import axios from 'axios';
import API_BASE_URL from '../../utils/api-controller';
import getHeaders from '../../utils/get-headers';
import { checkPermissionSync } from '../../utils/permission-helper';
import { DateRangePickerField } from '../../components/PortalDatePicker';
import TablePagination from '../../components/TablePagination';
import OpeningBalanceModal from '../../components/OpeningBalanceModal';
import { ViewTransactionModalManager } from '../../components/Modals/ViewTransactions';
import TransactionTable, {
    getTransactionAmounts,
    formatLedgerCurrency,
} from '../../components/TransactionTable';

const CAPITAL_API_BASE = `${API_BASE_URL}/capital`;

const CapitalLedger = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { capitalId: capitalIdParam } = useParams();
    const capitalId = capitalIdParam ? decodeURIComponent(capitalIdParam) : '';
    const accountNameFromState = location.state?.accountName || '';

    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(() => {
        const saved = localStorage.getItem('sidebarMinimized');
        return saved ? JSON.parse(saved) : false;
    });
    const [accountDetails, setAccountDetails] = useState(null);
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [fetchingTransactions, setFetchingTransactions] = useState(false);
    const [fromDate, setFromDate] = useState(() => {
        const date = new Date();
        date.setMonth(date.getMonth() - 1);
        return date.toISOString().split('T')[0];
    });
    const [toDate, setToDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [isLastPage, setIsLastPage] = useState(true);
    const [itemsPerPage, setItemsPerPage] = useState(20);
    const [openingBalance, setOpeningBalance] = useState({ debit: 0, credit: 0, balance: 0 });
    const [summary, setSummary] = useState({
        totalCredit: 0,
        totalDebit: 0,
        closingBalance: 0,
    });
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
        remark: '',
    });

    const accountTitle = accountDetails?.name || accountNameFromState || 'Capital account';

    const calculateSummary = useCallback((transactionsData, openingBalObj) => {
        let totalCredit = openingBalObj?.credit ?? 0;
        let totalDebit = openingBalObj?.debit ?? 0;
        let closingBalance = openingBalObj?.balance ?? 0;

        transactionsData.forEach((transaction) => {
            const amounts = getTransactionAmounts(transaction);
            totalDebit += amounts.debit;
            totalCredit += amounts.credit;
            if (amounts.balance != null) closingBalance = amounts.balance;
        });

        setSummary({
            totalCredit,
            totalDebit,
            closingBalance,
        });
    }, []);

    const fetchAccountDetails = useCallback(async () => {
        if (!capitalId) return;
        try {
            const response = await axios.get(
                `${CAPITAL_API_BASE}/details?capital_id=${encodeURIComponent(capitalId)}`,
                { headers: getHeaders() }
            );
            if (response.data.success) {
                setAccountDetails(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching capital account:', error);
            toast.error('Failed to fetch capital account details');
        }
    }, [capitalId]);

    const fetchTransactions = useCallback(async () => {
        if (!capitalId || !fromDate || !toDate) return;
        setFetchingTransactions(true);
        try {
            const response = await axios.get(
                `${API_BASE_URL}/transaction/list?page_no=${currentPage}&limit=${itemsPerPage}&from_date=${fromDate}&to_date=${toDate}&party_type=capital&party_id=${encodeURIComponent(capitalId)}`,
                { headers: getHeaders() }
            );

            if (response.data.success) {
                const openingBal = response.data.opening_balance;
                const openingBalObj = typeof openingBal === 'object' && openingBal !== null
                    ? {
                        debit: openingBal.debit ?? 0,
                        credit: openingBal.credit ?? 0,
                        balance: openingBal.balance ?? 0,
                    }
                    : { debit: 0, credit: 0, balance: openingBal ?? 0 };

                setTransactions(response.data.data || []);
                setOpeningBalance(openingBalObj);

                const meta = response.data.meta || {};
                const total = meta.total ?? 0;
                const limit = meta.limit ?? itemsPerPage;
                setTotalItems(total);
                setTotalPages(Math.max(1, Math.ceil(total / limit)));
                setIsLastPage(Boolean(meta.is_last_page));

                calculateSummary(response.data.data || [], openingBalObj);
            }
        } catch (error) {
            console.error('Error fetching capital ledger:', error);
            toast.error(error.response?.data?.message || 'Failed to fetch transactions');
            setTransactions([]);
            setOpeningBalance({ debit: 0, credit: 0, balance: 0 });
            calculateSummary([], { debit: 0, credit: 0, balance: 0 });
        } finally {
            setFetchingTransactions(false);
            setLoading(false);
        }
    }, [capitalId, currentPage, itemsPerPage, fromDate, toDate, calculateSummary]);

    useEffect(() => {
        if (!capitalId) {
            toast.error('Capital account not found');
            navigate('/finance/voucher/capital-account');
            return;
        }
        fetchAccountDetails();
    }, [capitalId, navigate, fetchAccountDetails]);

    useEffect(() => {
        setCurrentPage(1);
    }, [fromDate, toDate, itemsPerPage]);

    useEffect(() => {
        if (capitalId) {
            fetchTransactions();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentPage, itemsPerPage, fromDate, toDate, capitalId]);

    useEffect(() => {
        localStorage.setItem('sidebarMinimized', JSON.stringify(isMinimized));
    }, [isMinimized]);

    useEffect(() => {
        document.body.style.overflow = mobileMenuOpen ? 'hidden' : 'auto';
        return () => {
            document.body.style.overflow = 'auto';
        };
    }, [mobileMenuOpen]);

    useEffect(() => {
        const handleClickOutside = () => {
            setShowActionMenu(null);
            actionAnchorRef.current = null;
            setActionMenuPosition(null);
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

    const fetchOpeningBalance = useCallback(async () => {
        if (!capitalId) return;
        setOpeningBalanceLoading(true);
        try {
            const res = await axios.get(
                `${API_BASE_URL}/transaction/get-opening-balance?party_type=capital&party_id=${encodeURIComponent(capitalId)}`,
                { headers: getHeaders() }
            );
            if (res.data.success && res.data.data) {
                const d = res.data.data;
                setOpeningBalanceData(d);
                setOpeningBalanceForm({
                    amount: String(d.amount || ''),
                    type: d.type || 'credit',
                    transaction_date: d.transaction_date ? d.transaction_date.split('T')[0] : new Date().toISOString().split('T')[0],
                    remark: d.remark || '',
                });
            } else {
                setOpeningBalanceData(null);
                setOpeningBalanceForm({
                    amount: '',
                    type: 'credit',
                    transaction_date: new Date().toISOString().split('T')[0],
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
    }, [capitalId]);

    const handleOpenOpeningBalanceModal = () => {
        setShowOpeningBalanceModal(true);
        fetchOpeningBalance();
    };

    const handleSetOpeningBalance = async (e) => {
        e.preventDefault();
        if (!capitalId) {
            toast.error('Capital account not found');
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
                    party_type: 'capital',
                    party_id: capitalId,
                    remark: openingBalanceForm.remark.trim() || undefined,
                    transaction_date: openingBalanceForm.transaction_date,
                },
                { headers: getHeaders() }
            );
            if (res.data.success) {
                toast.success(res.data.message || 'Opening balance saved successfully');
                setShowOpeningBalanceModal(false);
                fetchTransactions();
                fetchAccountDetails();
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

    const handleRefresh = () => {
        fetchTransactions();
        fetchAccountDetails();
        toast.success('Ledger refreshed');
    };

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

    const handleViewDetails = (transaction) => {
        setDetailsTransaction(transaction);
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

    const formatCurrency = formatLedgerCurrency;

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

            <div className={`pt-16 transition-all duration-300 ease-in-out ${isMinimized ? 'md:pl-20' : 'md:pl-[260px]'}`}>
                <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden"
                    >
                        <div className="border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white px-4 sm:px-5 py-4">
                            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                                <div className="flex min-w-0 items-center gap-3">
                                    <button
                                        type="button"
                                        onClick={() => navigate('/finance/voucher/capital-account')}
                                        className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600"
                                        title="Back to capital accounts"
                                    >
                                        <FiArrowLeft className="h-4 w-4" />
                                    </button>
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                            <FiTrendingUp className="h-4 w-4 shrink-0 text-blue-600" />
                                            <h1 className="truncate text-lg font-bold text-slate-800 sm:text-xl">
                                                Capital Ledger
                                            </h1>
                                        </div>
                                        <p className="mt-0.5 truncate text-sm text-slate-500" title={accountTitle}>
                                            {accountTitle}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                                    {checkPermissionSync('task_fees_view') && (
                                        <button
                                            type="button"
                                            onClick={handleOpenOpeningBalanceModal}
                                            className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-600 shadow-sm transition-all hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-600"
                                            title="Set / Edit Opening Balance"
                                        >
                                            <FiBarChart2 className="h-4 w-4" />
                                            <span className="hidden sm:inline">Opening Balance</span>
                                        </button>
                                    )}
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
                                            buttonClassName="w-full h-10 px-3.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-600 hover:border-indigo-400 focus:outline-none transition-all"
                                            wrapperClassName="w-full"
                                        />
                                    </div>
                                    <motion.button
                                        type="button"
                                        onClick={handleRefresh}
                                        className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:shadow"
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        title="Refresh"
                                    >
                                        <FiRefreshCw className="h-5 w-5 text-slate-600" />
                                    </motion.button>
                                </div>
                            </div>
                        </div>

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
                </div>
            </div>

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

            {showActionMenu && selectedActionTransaction && actionMenuPosition && createPortal(
                <motion.div
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    className="fixed z-[99999] w-40 rounded-lg border border-slate-200 bg-white py-1 shadow-xl"
                    style={{ top: actionMenuPosition.top, left: actionMenuPosition.left }}
                    onClick={(e) => e.stopPropagation()}
                >
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
                        onClick={() => handleViewInvoice(selectedActionTransaction)}
                        disabled={downloadingInvoice}
                        className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-slate-700 transition-colors hover:bg-green-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {downloadingInvoice ? (
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-green-500 border-t-transparent" />
                        ) : (
                            <FiFile className="h-4 w-4 text-green-600" />
                        )}
                        {downloadingInvoice ? 'Downloading…' : 'Invoice'}
                    </button>
                </motion.div>,
                document.body
            )}
        </div>
    );
};

export default CapitalLedger;
