import React from 'react';
import { motion } from 'framer-motion';
import { checkPermissionSync } from '../utils/permission-helper';
import {
    FiRepeat,
    FiUser,
    FiFileText,
    FiShoppingBag,
    FiTruck,
    FiPlus,
    FiHome,
    FiGlobe,
    FiCreditCard,
    FiMoreVertical,
} from 'react-icons/fi';

const InrIcon = ({ className = 'w-5 h-5' }) => (
    <span className={`inline-flex items-center justify-center font-semibold leading-none ${className}`} aria-hidden>
        ₹
    </span>
);

/** Debit/credit/balance from API row (type-specific key e.g. payment, sale). */
export function getTransactionAmounts(transaction) {
    const key = transaction.transaction_type;
    const amounts = key && transaction[key] ? transaction[key] : transaction.payment || {};
    return {
        debit: amounts.debit ?? 0,
        credit: amounts.credit ?? 0,
        balance: amounts.balance,
    };
}

export function formatLedgerCurrency(amount) {
    if (!checkPermissionSync('task_fees_view')) {
        return '----';
    }
    const formatted = new Intl.NumberFormat('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(Math.abs(amount || 0));
    return `₹${formatted}`;
}

/** Plain INR amount (no symbol) for modals that already prefix ₹. */
export function formatLedgerCurrencyPlain(amount) {
    if (!checkPermissionSync('task_fees_view')) {
        return '----';
    }
    return new Intl.NumberFormat('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(Math.abs(amount || 0));
}

export function formatLedgerDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });
}

function getTransactionTypeColor(transaction) {
    const amounts = getTransactionAmounts(transaction);
    if (amounts.debit > 0) return 'text-blue-600 bg-blue-50 border-blue-200';
    if (amounts.credit > 0) return 'text-orange-600 bg-orange-50 border-orange-200';
    return 'text-slate-600 bg-slate-50 border-slate-200';
}

function getParticularsDisplay(transaction) {
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
}

function SkeletonRow({ showActionColumn }) {
    const actionCell = showActionColumn ? (
        <td className="p-4 text-center"><div className="h-8 bg-slate-200 rounded w-8 mx-auto" /></td>
    ) : null;
    return (
        <tr className="border-b border-slate-100 animate-pulse">
            <td className="p-4"><div className="h-4 bg-slate-200 rounded w-8" /></td>
            <td className="p-4"><div className="h-4 bg-slate-200 rounded w-24" /></td>
            <td className="p-4"><div className="h-4 bg-slate-200 rounded w-32" /></td>
            <td className="p-4"><div className="h-4 bg-slate-200 rounded w-20" /></td>
            <td className="p-4"><div className="h-4 bg-slate-200 rounded w-24" /></td>
            <td className="p-4 text-right"><div className="h-4 bg-slate-200 rounded w-20 ml-auto" /></td>
            <td className="p-4 text-right"><div className="h-4 bg-slate-200 rounded w-20 ml-auto" /></td>
            <td className="p-4 text-right"><div className="h-4 bg-slate-200 rounded w-20 ml-auto" /></td>
            {actionCell}
        </tr>
    );
}

/**
 * Ledger-style transaction table: opening balance row, data rows, totals row.
 * Use with your own card wrapper and TablePagination as needed.
 */
export default function TransactionTable({
    transactions = [],
    loading = false,
    fetching = false,
    openingBalance = { debit: 0, credit: 0, balance: 0 },
    summary = { totalDebit: 0, totalCredit: 0, closingBalance: 0 },
    currentPage = 1,
    itemsPerPage = 20,
    onActionClick,
    showActionColumn = true,
    emptyTitle = 'No transactions found',
    emptySubtitle = 'No transactions available for the selected date range',
    className = '',
    tableClassName = 'w-full text-sm',
}) {
    const busy = loading || fetching;
    const colSpanEmpty = showActionColumn ? 9 : 8;
    const colSpanTotal = showActionColumn ? 5 : 5;

    return (
        <div className={`overflow-x-auto ${className}`.trim()}>
            <table className={tableClassName}>
                <thead>
                    <tr className="bg-gradient-to-r from-slate-50 to-slate-100 border-y border-slate-200">
                        <th className="text-left p-4 font-semibold text-slate-600 w-16">#</th>
                        <th className="text-left p-4 font-semibold text-slate-600">Date</th>
                        <th className="text-left p-4 font-semibold text-slate-600">Particulars</th>
                        <th className="text-left p-4 font-semibold text-slate-600">Type</th>
                        <th className="text-left p-4 font-semibold text-slate-600">Voucher</th>
                        <th className="text-right p-4 font-semibold text-slate-600">Debit</th>
                        <th className="text-right p-4 font-semibold text-slate-600">Credit</th>
                        <th className="text-right p-4 font-semibold text-slate-600">Balance</th>
                        {showActionColumn && (
                            <th className="text-center p-4 font-semibold text-slate-600 w-20">Action</th>
                        )}
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    <tr className="bg-slate-100 font-medium">
                        <td className="p-4 text-slate-600" />
                        <td className="p-4 text-slate-800" colSpan="2">Opening Balance</td>
                        <td className="p-4" />
                        <td className="p-4" />
                        <td className="p-4 text-right">
                            {openingBalance.debit > 0 ? (
                                <span className="text-sm font-semibold text-blue-600">{formatLedgerCurrency(openingBalance.debit)}</span>
                            ) : (
                                <span className="text-sm text-slate-600">{formatLedgerCurrency(0)}</span>
                            )}
                        </td>
                        <td className="p-4 text-right">
                            {openingBalance.credit > 0 ? (
                                <span className="text-sm font-semibold text-orange-600">{formatLedgerCurrency(openingBalance.credit)}</span>
                            ) : (
                                <span className="text-sm text-slate-600">{formatLedgerCurrency(0)}</span>
                            )}
                        </td>
                        <td className={`p-4 text-right font-bold ${(openingBalance.balance ?? 0) >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                            {formatLedgerCurrency(openingBalance.balance ?? 0)}
                        </td>
                        {showActionColumn && <td className="p-4" />}
                    </tr>

                    {busy ? (
                        [...Array(5)].map((_, index) => (
                            <SkeletonRow key={index} showActionColumn={showActionColumn} />
                        ))
                    ) : transactions.length === 0 ? (
                        <tr>
                            <td colSpan={colSpanEmpty} className="text-center py-12">
                                <div className="flex flex-col items-center justify-center">
                                    <div className="p-4 bg-slate-100 rounded-full mb-4">
                                        <FiRepeat className="w-8 h-8 text-slate-400" />
                                    </div>
                                    <p className="text-slate-600 text-lg font-medium mb-2">{emptyTitle}</p>
                                    <p className="text-slate-500 text-sm">{emptySubtitle}</p>
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
                                    {formatLedgerDate(transaction.transaction_date)}
                                </td>
                                <td className="p-4">{getParticularsDisplay(transaction)}</td>
                                <td className="p-4">
                                    <div className="flex flex-col">
                                        <span className={`px-3 py-1 rounded-lg text-xs font-medium border w-fit ${getTransactionTypeColor(transaction)}`}>
                                            {(transaction.transaction_type || 'N/A').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
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
                                            <span className="text-sm font-semibold text-blue-600">{formatLedgerCurrency(amounts.debit)}</span>
                                        ) : (
                                            <span className="text-sm text-slate-600">{formatLedgerCurrency(0)}</span>
                                        );
                                    })()}
                                </td>
                                <td className="p-4 text-right">
                                    {(() => {
                                        const amounts = getTransactionAmounts(transaction);
                                        return amounts.credit > 0 ? (
                                            <span className="text-sm font-semibold text-orange-600">{formatLedgerCurrency(amounts.credit)}</span>
                                        ) : (
                                            <span className="text-sm text-slate-600">{formatLedgerCurrency(0)}</span>
                                        );
                                    })()}
                                </td>
                                <td className="p-4 text-right">
                                    <span className={`text-sm font-bold ${((getTransactionAmounts(transaction).balance) ?? 0) >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                                        {formatLedgerCurrency(getTransactionAmounts(transaction).balance ?? 0)}
                                    </span>
                                </td>
                                {showActionColumn && (
                                    <td className="p-4 text-center">
                                        <button
                                            type="button"
                                            onClick={(e) => onActionClick?.(e, transaction.transaction_id)}
                                            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                                        >
                                            <FiMoreVertical className="w-5 h-5 text-slate-600" />
                                        </button>
                                    </td>
                                )}
                            </motion.tr>
                        ))
                    )}

                    <tr className="bg-slate-100 font-bold border-t-2 border-slate-300">
                        <td className="p-4 text-slate-800" colSpan={colSpanTotal}>Total</td>
                        <td className="p-4 text-right text-blue-600">{formatLedgerCurrency(summary.totalDebit)}</td>
                        <td className="p-4 text-right text-orange-600">{formatLedgerCurrency(summary.totalCredit)}</td>
                        <td className={`p-4 text-right ${summary.closingBalance >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                            {formatLedgerCurrency(summary.closingBalance)}
                        </td>
                        {showActionColumn && <td className="p-4" />}
                    </tr>
                </tbody>
            </table>
        </div>
    );
}

/** Icons for add-transaction menus (same set as typical ledger UIs). */
export function getLedgerTransactionTypeIcon(type) {
    switch (type) {
        case 'RECEIVE': return <FiUser className="w-5 h-5" />;
        case 'PAYMENT': return <InrIcon className="w-5 h-5" />;
        case 'SALE': return <FiShoppingBag className="w-5 h-5" />;
        case 'PURCHASE': return <FiTruck className="w-5 h-5" />;
        case 'EXPENSE': return <FiFileText className="w-5 h-5" />;
        case 'JOURNAL': return <FiRepeat className="w-5 h-5" />;
        default: return <FiPlus className="w-5 h-5" />;
    }
}

export function getLedgerPaymentModeIcon(mode) {
    switch (mode?.toLowerCase()) {
        case 'cash':
            return <InrIcon className="w-4 h-4 text-green-600" />;
        case 'bank':
            return <FiHome className="w-4 h-4 text-blue-600" />;
        case 'cheque':
            return <FiFileText className="w-4 h-4 text-purple-600" />;
        case 'online':
            return <FiGlobe className="w-4 h-4 text-indigo-600" />;
        case 'card':
            return <FiCreditCard className="w-4 h-4 text-orange-600" />;
        default:
            return <InrIcon className="w-4 h-4 text-slate-600" />;
    }
}
