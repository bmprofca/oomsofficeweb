import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { FiDownload, FiFileText, FiHome, FiMail, FiPhone, FiShare2, FiUser, FiX } from 'react-icons/fi';

const toTitle = (value) => (value || 'N/A').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
const txType = (transaction) => (transaction?.transaction_type || '').toLowerCase();

const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const d = new Date(dateString);
    if (Number.isNaN(d.getTime())) return String(dateString);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatTime = (dateString) => {
    if (!dateString) return '';
    const d = new Date(dateString);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
};

const getAmounts = (transaction) => {
    const key = transaction?.transaction_type;
    const amounts = key && transaction[key] ? transaction[key] : transaction?.payment || {};
    return { debit: amounts.debit ?? 0, credit: amounts.credit ?? 0, balance: amounts.balance ?? 0 };
};

const CommonParticulars = ({ transaction }) => {
    const particular = transaction?.particular || {};
    if (particular.type === 'bank' && particular.details) {
        const d = particular.details;
        return (
            <div className="bg-white rounded-lg p-3 border border-slate-200 space-y-1.5">
                <div className="flex items-center gap-2 mb-0.5">
                    <FiHome className="w-5 h-5 text-indigo-600" />
                    <span className="font-semibold text-slate-800">{d.bank || 'Bank'}</span>
                </div>
                <div className="grid grid-cols-2 gap-1.5 text-xs">
                    <div><span className="text-slate-500">Account No</span><p className="font-medium">{d.account_no || '-'}</p></div>
                    <div><span className="text-slate-500">Account Holder</span><p className="font-medium">{d.holder || '-'}</p></div>
                    <div><span className="text-slate-500">IFSC</span><p className="font-mono font-medium">{d.ifsc || '-'}</p></div>
                    <div><span className="text-slate-500">Branch</span><p className="font-medium">{d.branch || '-'}</p></div>
                </div>
                {particular.remark ? <p className="text-sm text-slate-700">{particular.remark}</p> : null}
            </div>
        );
    }
    if (particular.details && typeof particular.details === 'object') {
        return (
            <div className="bg-white rounded-lg p-3 border border-slate-200">
                <div className="space-y-1.5">
                    {Object.entries(particular.details)
                        .filter(([, val]) => val != null && val !== '')
                        .map(([key, val]) => (
                            <div key={key} className="flex justify-between text-xs gap-3">
                                <span className="text-slate-500 capitalize">{key.replace(/_/g, ' ')}</span>
                                <span className="font-medium text-slate-800 text-right">{typeof val === 'object' ? JSON.stringify(val) : String(val)}</span>
                            </div>
                        ))}
                </div>
                {particular.remark ? <p className="text-xs text-slate-700 mt-1.5">{particular.remark}</p> : null}
            </div>
        );
    }
    return <p className="text-slate-600 text-sm">{JSON.stringify(particular)}</p>;
};

const SaleParticulars = ({ transaction }) => {
    const particular = transaction?.particular || {};
    if (!Array.isArray(particular.sale_items) || particular.sale_items.length === 0) {
        return <CommonParticulars transaction={transaction} />;
    }
    return (
        <div className="bg-white rounded-lg p-3 border border-slate-200">
            <p className="text-sm font-semibold text-slate-700 mb-1.5">Sale Items</p>
            <div className="overflow-x-auto border border-slate-200 rounded-md">
                <table className="min-w-full text-xs">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-2.5 py-2 text-left font-semibold text-slate-600">Item</th>
                            <th className="px-2.5 py-2 text-right font-semibold text-slate-600">Fees</th>
                            <th className="px-2.5 py-2 text-right font-semibold text-slate-600">Tax</th>
                            <th className="px-2.5 py-2 text-right font-semibold text-slate-600">Total</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                        {particular.sale_items.map((item, idx) => (
                            <tr key={`${item.name}-${idx}`}>
                                <td className="px-2.5 py-2 text-slate-800">{item.name || `Item ${idx + 1}`}</td>
                                <td className="px-2.5 py-2 text-right text-slate-700">{item.fees ?? 0}</td>
                                <td className="px-2.5 py-2 text-right text-slate-700">
                                    {item.tax_value ?? 0} ({item.tax_rate ?? 0}%)
                                </td>
                                <td className="px-2.5 py-2 text-right font-semibold text-slate-800">{item.total ?? 0}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {particular.remark ? <p className="text-xs text-slate-700 mt-2">{particular.remark}</p> : null}
        </div>
    );
};

const PurchaseParticulars = ({ transaction }) => <CommonParticulars transaction={transaction} />;
const ReceiveParticulars = ({ transaction }) => <CommonParticulars transaction={transaction} />;
const PaymentParticulars = ({ transaction }) => <CommonParticulars transaction={transaction} />;
const ExpenseParticulars = ({ transaction }) => <CommonParticulars transaction={transaction} />;
const JournalParticulars = ({ transaction }) => <CommonParticulars transaction={transaction} />;
const OpeningBalanceParticulars = ({ transaction }) => <CommonParticulars transaction={transaction} />;

const BaseTransactionViewModal = ({ transaction, onClose, formatCurrency, particularsRenderer, onDownload, isDownloading }) => {
    const amounts = useMemo(() => getAmounts(transaction), [transaction]);
    if (!transaction) return null;

    return (
        <div className="fixed inset-0 z-[1300] bg-slate-900/45 backdrop-blur-[2px] flex items-center justify-center p-3 sm:p-4" onClick={onClose}>
            <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.985 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.985 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                className="relative w-full max-w-[min(52rem,calc(100vw-1.25rem))] sm:max-w-[min(52rem,calc(100vw-2rem))] max-h-[calc(100vh-1.25rem)] sm:max-h-[calc(100vh-2rem)] overflow-hidden bg-white rounded-2xl shadow-[0_20px_55px_rgba(15,23,42,0.22)] border border-slate-200/80 flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="bg-white px-4 sm:px-5 py-3 border-b border-slate-200 shrink-0">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-indigo-50 rounded-lg border border-indigo-100">
                                <FiFileText className="w-4 h-4 text-indigo-600" />
                            </div>
                            <div>
                                <h2 className="text-base sm:text-lg font-semibold text-slate-800">Transaction Details</h2>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                            <FiX className="w-5 h-5 text-slate-500" />
                        </button>
                    </div>
                </div>

                <div
                    className="px-4 sm:px-5 py-3 overflow-y-auto flex-1 space-y-3 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                    <div className="bg-slate-50/70 rounded-xl p-2.5 border border-slate-200">
                        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Transaction Info</h3>
                        <div className="grid grid-cols-3 gap-2 text-xs sm:text-sm">
                            <div><span className="text-slate-500">Date</span><p className="font-medium text-slate-800">{formatDate(transaction.transaction_date)} {formatTime(transaction.transaction_date)}</p></div>
                            <div><span className="text-slate-500">Type</span><p className="font-medium text-slate-800">{toTitle(transaction.transaction_type)}</p></div>
                            <div><span className="text-slate-500">Voucher No</span><p className="font-mono font-medium text-slate-800">{transaction.invoice_no || 'N/A'}</p></div>
                        </div>
                    </div>

                    <div className="bg-slate-50/70 rounded-xl p-2.5 border border-slate-200">
                        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Amounts</h3>
                        <div className="grid grid-cols-3 gap-2">
                            <div className="bg-white rounded-lg p-2.5 border border-blue-100"><p className="text-[11px] text-slate-500">Debit</p><p className="text-base font-bold text-blue-600">{formatCurrency(amounts.debit)}</p></div>
                            <div className="bg-white rounded-lg p-2.5 border border-orange-100"><p className="text-[11px] text-slate-500">Credit</p><p className="text-base font-bold text-orange-600">{formatCurrency(amounts.credit)}</p></div>
                            <div className="bg-white rounded-lg p-2.5 border border-indigo-100"><p className="text-[11px] text-slate-500">Balance</p><p className={`text-base font-bold ${(amounts.balance ?? 0) >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>{formatCurrency(amounts.balance ?? 0)}</p></div>
                        </div>
                    </div>

                    {transaction.particular ? (
                        <div className="bg-slate-50/70 rounded-xl p-2.5 border border-slate-200">
                            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Particulars {transaction.particular.type ? `(${transaction.particular.type})` : ''}</h3>
                            {particularsRenderer}
                        </div>
                    ) : null}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div className="bg-slate-50/70 rounded-xl p-2.5 border border-slate-200">
                            <h3 className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Created By</h3>
                            <div className="bg-white rounded-lg p-2.5 border border-slate-200 text-xs">
                                <p className="font-medium text-slate-800">{transaction.create_by?.name || '-'}</p>
                                <p className="text-slate-600 mt-1 inline-flex items-center gap-1"><FiPhone className="w-3.5 h-3.5 text-slate-400" />+{transaction.create_by?.country_code || ''} {transaction.create_by?.mobile || '-'}</p>
                                <p className="text-slate-600 mt-1 inline-flex items-center gap-1 break-all"><FiMail className="w-3.5 h-3.5 text-slate-400" />{transaction.create_by?.email || '-'}</p>
                                <p className="text-slate-500 mt-1">Date: {formatDate(transaction.create_date)} {formatTime(transaction.create_date)}</p>
                            </div>
                        </div>
                        <div className="bg-slate-50/70 rounded-xl p-2.5 border border-slate-200">
                            <h3 className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Modified By</h3>
                            <div className="bg-white rounded-lg p-2.5 border border-slate-200 text-xs">
                                <p className="font-medium text-slate-800">{transaction.modify_by?.name || '-'}</p>
                                <p className="text-slate-600 mt-1 inline-flex items-center gap-1"><FiPhone className="w-3.5 h-3.5 text-slate-400" />+{transaction.modify_by?.country_code || ''} {transaction.modify_by?.mobile || '-'}</p>
                                <p className="text-slate-600 mt-1 inline-flex items-center gap-1 break-all"><FiMail className="w-3.5 h-3.5 text-slate-400" />{transaction.modify_by?.email || '-'}</p>
                                <p className="text-slate-500 mt-1">Date: {formatDate(transaction.modify_date)} {formatTime(transaction.modify_date)}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="border-t border-slate-200 bg-white px-4 sm:px-5 py-2 shrink-0">
                    <div className="flex items-center justify-end gap-2">
                        <button
                            type="button"
                            onClick={() => onDownload?.(transaction)}
                            disabled={Boolean(isDownloading) || !transaction?.invoice_id}
                            className="px-3 py-2 text-xs sm:text-sm border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
                        >
                            <FiDownload className="w-4 h-4" />
                            {isDownloading ? 'Downloading...' : 'Download'}
                        </button>
                        <button
                            type="button"
                            disabled
                            className="px-3 py-2 text-xs sm:text-sm border border-slate-200 rounded-lg text-slate-400 bg-slate-50 cursor-not-allowed inline-flex items-center gap-1.5"
                        >
                            <FiShare2 className="w-4 h-4" />
                            Share
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-3 py-2 text-xs sm:text-sm bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors shadow-sm"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export const ReceiveTransactionModal = (props) => <BaseTransactionViewModal {...props} particularsRenderer={<ReceiveParticulars transaction={props.transaction} />} />;
export const PaymentTransactionModal = (props) => <BaseTransactionViewModal {...props} particularsRenderer={<PaymentParticulars transaction={props.transaction} />} />;
export const SaleTransactionModal = (props) => <BaseTransactionViewModal {...props} particularsRenderer={<SaleParticulars transaction={props.transaction} />} />;
export const PurchaseTransactionModal = (props) => <BaseTransactionViewModal {...props} particularsRenderer={<PurchaseParticulars transaction={props.transaction} />} />;
export const ExpenseTransactionModal = (props) => <BaseTransactionViewModal {...props} particularsRenderer={<ExpenseParticulars transaction={props.transaction} />} />;
export const JournalTransactionModal = (props) => <BaseTransactionViewModal {...props} particularsRenderer={<JournalParticulars transaction={props.transaction} />} />;
export const OpeningBalanceTransactionModal = (props) => <BaseTransactionViewModal {...props} particularsRenderer={<OpeningBalanceParticulars transaction={props.transaction} />} />;
export const GenericTransactionModal = (props) => <BaseTransactionViewModal {...props} particularsRenderer={<CommonParticulars transaction={props.transaction} />} />;

export const ViewTransactionModalManager = ({ transaction, onClose, formatCurrency, onDownload, isDownloading }) => {
    const type = txType(transaction);
    const modalProps = { transaction, onClose, formatCurrency, onDownload, isDownloading };
    if (!transaction) return null;

    switch (type) {
        case 'receive':
            return <ReceiveTransactionModal {...modalProps} />;
        case 'payment':
            return <PaymentTransactionModal {...modalProps} />;
        case 'sale':
            return <SaleTransactionModal {...modalProps} />;
        case 'purchase':
            return <PurchaseTransactionModal {...modalProps} />;
        case 'expense':
            return <ExpenseTransactionModal {...modalProps} />;
        case 'journal':
            return <JournalTransactionModal {...modalProps} />;
        case 'opening balance':
        case 'opening_balance':
            return <OpeningBalanceTransactionModal {...modalProps} />;
        default:
            return <GenericTransactionModal {...modalProps} />;
    }
};

export default ViewTransactionModalManager;
