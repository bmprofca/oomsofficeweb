import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FiCalendar,
    FiChevronLeft,
    FiChevronRight,
    FiRepeat,
    FiX,
    FiEye,
    FiEdit2,
    FiSave,
    FiMoreVertical,
    FiFileText,
    FiPlus,
    FiDollarSign,
    FiPercent,
    FiCornerDownLeft,
    FiDownload,
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import API_BASE_URL from '../utils/api-controller';
import getHeaders from '../utils/get-headers';
import { DateRangePickerField, DEFAULT_LOAN_QUICK_KEYS } from '../components/PortalDatePicker';

// ─── helpers ────────────────────────────────────────────────────────────────

const LIMIT_OPTIONS = [5, 10, 20, 50, 100];

const pad = (n) => String(n).padStart(2, '0');

const toYMD = (date) =>
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const formatDate = (iso) => {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatCurrency = (n) =>
    new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n ?? 0);

// ─── skeleton row ────────────────────────────────────────────────────────────

const SkeletonRow = () => (
    <tr className="animate-pulse border-b border-slate-100">
        {[...Array(8)].map((_, i) => (
            <td key={i} className="p-4">
                <div className={`h-3.5 bg-slate-200 rounded ${i === 2 ? 'w-40' : 'w-20'} ${i >= 5 ? 'ml-auto' : ''}`} />
            </td>
        ))}
    </tr>
);

// ─── transaction details modal ───────────────────────────────────────────────

const DetailsModal = ({ entry, onClose }) => {
    if (!entry) return null;
    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 12 }}
                transition={{ duration: 0.18 }}
                className="w-full max-w-xl bg-white rounded-2xl shadow-2xl flex flex-col"
                style={{ maxHeight: '82vh' }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* ── Fixed header ── */}
                <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 bg-gradient-to-r from-indigo-600 to-indigo-700 rounded-t-2xl">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/20 rounded-xl">
                            <FiEye className="w-4 h-4 text-white" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-white leading-tight">Transaction Details</h3>
                            <p className="text-indigo-200 text-[11px] mt-0.5 font-mono">{entry.invoice_no || '—'}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors"
                    >
                        <FiX className="w-4 h-4" />
                    </button>
                </div>

                {/* ── Scrollable body ── */}
                <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5 space-y-5">

                    {/* Amount cards */}
                    <div className="grid grid-cols-3 gap-3">
                        <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-center">
                            <p className="text-[10px] font-semibold text-blue-400 uppercase tracking-wide mb-1">Debit</p>
                            <p className="text-base font-bold text-blue-700">₹{formatCurrency(entry.payment?.debit)}</p>
                        </div>
                        <div className="bg-orange-50 border border-orange-100 rounded-xl p-3 text-center">
                            <p className="text-[10px] font-semibold text-orange-400 uppercase tracking-wide mb-1">Credit</p>
                            <p className="text-base font-bold text-orange-700">₹{formatCurrency(entry.payment?.credit)}</p>
                        </div>
                        <div className={`border rounded-xl p-3 text-center ${(entry.payment?.balance ?? 0) >= 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'}`}>
                            <p className={`text-[10px] font-semibold uppercase tracking-wide mb-1 ${(entry.payment?.balance ?? 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>Balance</p>
                            <p className={`text-base font-bold ${(entry.payment?.balance ?? 0) >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>₹{formatCurrency(entry.payment?.balance)}</p>
                        </div>
                    </div>

                    {/* Transaction info */}
                    <div className="bg-slate-50 border border-slate-100 rounded-xl overflow-hidden">
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest px-4 pt-3 pb-2">Transaction Info</p>
                        {[
                            ['Type', <span className="px-2.5 py-0.5 bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-lg capitalize">{entry.type || '—'}</span>],
                            ['Date', formatDate(entry.transaction_date)],
                            ['Remark', entry.particulars?.remark || '—'],
                        ].map(([label, value], i, arr) => (
                            <div key={label} className={`flex items-center justify-between px-4 py-2.5 ${i < arr.length - 1 ? 'border-b border-slate-100' : ''}`}>
                                <span className="text-xs font-medium text-slate-500">{label}</span>
                                <span className="text-xs font-semibold text-slate-800 text-right max-w-[60%]">{value}</span>
                            </div>
                        ))}
                    </div>

                    {/* Audit info */}
                    <div className="bg-slate-50 border border-slate-100 rounded-xl overflow-hidden">
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest px-4 pt-3 pb-2">Audit Trail</p>
                        {[
                            ['Created By', entry.create_by?.name || '—'],
                            ['Created On', formatDate(entry.create_date)],
                            ['Modified By', entry.modify_by?.name || '—'],
                            ['Modified On', formatDate(entry.modify_date)],
                        ].map(([label, value], i, arr) => (
                            <div key={label} className={`flex items-center justify-between px-4 py-2.5 ${i < arr.length - 1 ? 'border-b border-slate-100' : ''}`}>
                                <span className="text-xs font-medium text-slate-500">{label}</span>
                                <span className="text-xs font-semibold text-slate-800 text-right">{value}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ── Fixed footer ── */}
                <div className="flex-shrink-0 border-t border-slate-200 px-6 py-3 bg-slate-50 rounded-b-2xl flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-5 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 transition-colors shadow-sm"
                    >
                        Close
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

// ─── loan type → edit endpoint mapping ──────────────────────────────────────

const EDIT_ENDPOINT = {
    loan: 'loan/loan/edit',
    repayment: 'loan/repayment/edit',
    interest: 'loan/interest/edit',
};

// ─── create entry (POST) ───────────────────────────────────────────────────

const CREATE_ENDPOINT = {
    loan: 'loan/loan/create',
    repayment: 'loan/repayment/create',
    interest: 'loan/interest/create',
};

const CREATE_MODAL_TITLE = {
    loan: 'New loan',
    repayment: 'New repayment',
    interest: 'New interest',
};

// ─── edit modal ──────────────────────────────────────────────────────────────

const EditModal = ({ entry, username, onClose, onSuccess }) => {
    const debit = entry.payment?.debit ?? 0;
    const credit = entry.payment?.credit ?? 0;
    const initialAmount = debit > 0 ? debit : credit;

    const [txnDate, setTxnDate] = useState(entry.transaction_date ? entry.transaction_date.split('T')[0] : '');
    const [amount, setAmount] = useState(String(initialAmount));
    const [remark, setRemark] = useState(entry.particulars?.remark || '');
    const [saving, setSaving] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const amountNum = Number(amount);
        if (!txnDate) { toast.error('Transaction date is required'); return; }
        if (!Number.isFinite(amountNum) || amountNum <= 0) { toast.error('Amount must be a valid number greater than 0'); return; }

        const endpoint = EDIT_ENDPOINT[entry.type];
        if (!endpoint) { toast.error(`Unknown loan type: ${entry.type}`); return; }

        const headers = getHeaders();
        if (!headers) { toast.error('Authentication required. Please login again.'); return; }

        setSaving(true);
        try {
            const res = await fetch(`${API_BASE_URL}/${endpoint}`, {
                method: 'PUT',
                headers,
                body: JSON.stringify({
                    entry_id: entry.entry_id,
                    party_type: 'staff',
                    party_id: username,
                    transaction_date: txnDate,
                    amount: amountNum,
                    remark: remark.trim() || null,
                }),
            });
            const data = await res.json();
            if (data.success) {
                toast.success(data.message || 'Transaction updated successfully');
                onSuccess();
            } else {
                toast.error(data.message || 'Failed to update transaction');
            }
        } catch (err) {
            console.error('Edit loan error:', err);
            toast.error('An error occurred while updating');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 12 }}
                transition={{ duration: 0.18 }}
                className="w-full max-w-lg bg-white rounded-2xl shadow-2xl flex flex-col"
                style={{ maxHeight: '82vh' }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Fixed header */}
                <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-t-2xl">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/20 rounded-xl">
                            <FiEdit2 className="w-4 h-4 text-white" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-white leading-tight">Edit Transaction</h3>
                            <p className="text-blue-200 text-[11px] mt-0.5 font-mono">{entry.invoice_no || '—'} · <span className="capitalize">{entry.type}</span></p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors">
                        <FiX className="w-4 h-4" />
                    </button>
                </div>

                {/* Scrollable body */}
                <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
                    <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5 space-y-4">

                        {/* Transaction Date */}
                        <div>
                            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 mb-1.5">
                                <FiCalendar className="w-3.5 h-3.5 text-indigo-400" />
                                Transaction Date <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="date"
                                value={txnDate}
                                onChange={(e) => setTxnDate(e.target.value)}
                                required
                                className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-slate-50 text-slate-700"
                            />
                        </div>

                        {/* Amount */}
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                                Amount (₹) <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="number"
                                min="0.01"
                                step="0.01"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                onWheel={(e) => e.target.blur()}
                                required
                                placeholder="0.00"
                                className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-slate-50 text-slate-700 font-mono"
                            />
                        </div>

                        {/* Remark */}
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Remark</label>
                            <textarea
                                value={remark}
                                onChange={(e) => setRemark(e.target.value)}
                                rows={3}
                                placeholder="Optional note…"
                                className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-slate-50 text-slate-700 resize-none"
                            />
                        </div>

                    </div>

                    {/* Fixed footer */}
                    <div className="flex-shrink-0 border-t border-slate-200 px-6 py-3 bg-slate-50 rounded-b-2xl flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={saving}
                            className="px-5 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 transition-colors shadow-sm disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {saving ? (
                                <>
                                    <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    Saving…
                                </>
                            ) : (
                                <>
                                    <FiSave className="w-3.5 h-3.5" />
                                    Save Changes
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
};

// ─── create entry modal ──────────────────────────────────────────────────────

const CreateEntryModal = ({ loanType, username, onClose, onSuccess }) => {
    const [txnDate, setTxnDate] = useState(toYMD(new Date()));
    const [amount, setAmount] = useState('');
    const [remark, setRemark] = useState('');
    const [saving, setSaving] = useState(false);

    const endpoint = CREATE_ENDPOINT[loanType];
    const title = CREATE_MODAL_TITLE[loanType] || 'New entry';

    const handleSubmit = async (e) => {
        e.preventDefault();
        const amountNum = Number(amount);
        if (!txnDate) { toast.error('Transaction date is required'); return; }
        if (!Number.isFinite(amountNum) || amountNum <= 0) { toast.error('Amount must be a valid number greater than 0'); return; }
        if (!endpoint) { toast.error('Invalid entry type'); return; }

        const headers = getHeaders();
        if (!headers) { toast.error('Authentication required. Please login again.'); return; }

        setSaving(true);
        try {
            const res = await fetch(`${API_BASE_URL}/${endpoint}`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    party_type: 'staff',
                    party_id: username,
                    transaction_date: txnDate,
                    amount: amountNum,
                    remark: remark.trim() || null,
                }),
            });
            const data = await res.json();
            if (data.success) {
                toast.success(data.message || 'Entry created successfully');
                onSuccess();
            } else {
                toast.error(data.message || 'Failed to create entry');
            }
        } catch (err) {
            console.error('Create loan entry error:', err);
            toast.error('An error occurred while creating the entry');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div
            className="fixed inset-0 z-[10050] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 12 }}
                transition={{ duration: 0.18 }}
                className="w-full max-w-lg bg-white rounded-2xl shadow-2xl flex flex-col"
                style={{ maxHeight: '82vh' }}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-t-2xl">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/20 rounded-xl">
                            <FiPlus className="w-4 h-4 text-white" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-white leading-tight">{title}</h3>
                            <p className="text-emerald-100 text-[11px] mt-0.5 capitalize">{loanType} · staff</p>
                        </div>
                    </div>
                    <button type="button" onClick={onClose} className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors">
                        <FiX className="w-4 h-4" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
                    <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5 space-y-4">
                        <div>
                            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 mb-1.5">
                                <FiCalendar className="w-3.5 h-3.5 text-indigo-400" />
                                Transaction date <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="date"
                                value={txnDate}
                                onChange={(e) => setTxnDate(e.target.value)}
                                required
                                className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-slate-50 text-slate-700"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                                Amount (₹) <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="number"
                                min="0.01"
                                step="0.01"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                onWheel={(e) => e.target.blur()}
                                required
                                placeholder="0.00"
                                className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-slate-50 text-slate-700 font-mono"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Remark</label>
                            <textarea
                                value={remark}
                                onChange={(e) => setRemark(e.target.value)}
                                rows={3}
                                placeholder="Optional note…"
                                className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-slate-50 text-slate-700 resize-none"
                            />
                        </div>
                    </div>

                    <div className="flex-shrink-0 border-t border-slate-200 px-6 py-3 bg-slate-50 rounded-b-2xl flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={saving}
                            className="px-5 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 transition-colors shadow-sm disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="px-5 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {saving ? (
                                <>
                                    <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    Creating…
                                </>
                            ) : (
                                <>
                                    <FiPlus className="w-3.5 h-3.5" />
                                    Create
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
};

// ─── main component ──────────────────────────────────────────────────────────

const LoanTab = ({ username }) => {
    // default: current month
    const now = new Date();
    const defaultFrom = toYMD(new Date(now.getFullYear(), now.getMonth(), 1));
    const defaultTo = toYMD(now);

    const [fromDate, setFromDate] = useState(defaultFrom);
    const [toDate, setToDate] = useState(defaultTo);

    const [transactions, setTransactions] = useState([]);
    const [openingBalance, setOpeningBalance] = useState({ debit: 0, credit: 0, balance: 0 });
    const [summary, setSummary] = useState({ totalDebit: 0, totalCredit: 0, closingBalance: 0 });

    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(false);

    // pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [totalItems, setTotalItems] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [pageJumpInput, setPageJumpInput] = useState('');

    // details modal
    const [activeEntry, setActiveEntry] = useState(null);

    // edit modal
    const [editEntry, setEditEntry] = useState(null);

    // action dropdown menu
    const [showActionMenu, setShowActionMenu] = useState(null);
    const [dropdownPos, setDropdownPos] = useState(null);

    // plus-button create menu & modal
    const [showCreateMenu, setShowCreateMenu] = useState(false);
    const [createMenuPos, setCreateMenuPos] = useState(null);
    const [createLoanType, setCreateLoanType] = useState(null); // 'loan' | 'repayment' | 'interest' | null

    // prevent double-fetch refs
    const isPageEffectMount = useRef(true);
    const isInitialFetch = useRef(true);

    // ── fetch ────────────────────────────────────────────────────────────────

    const fetchLoans = useCallback(async (page = 1, limit = 10, from = fromDate, to = toDate, isInit = false) => {
        if (!username) return;

        if (isInit) setLoading(true);
        else setFetching(true);

        const headers = getHeaders();
        if (!headers) {
            toast.error('Authentication required. Please login again.');
            setLoading(false);
            setFetching(false);
            return;
        }

        try {
            const url = `${API_BASE_URL}/loan/list?from_date=${from}&to_date=${to}&party_type=staff&party_id=${username}&page_no=${page}&limit=${limit}`;
            const res = await fetch(url, { method: 'GET', headers });
            const data = await res.json();

            if (data.success) {
                setTransactions(data.data ?? []);

                const ob = data.opening_balance ?? { debit: 0, credit: 0, balance: 0 };
                setOpeningBalance(ob);

                const rows = data.data ?? [];
                const totalDebit = rows.reduce((s, r) => s + (r.payment?.debit ?? 0), 0);
                const totalCredit = rows.reduce((s, r) => s + (r.payment?.credit ?? 0), 0);
                const lastBalance = rows.length > 0 ? (rows[rows.length - 1].payment?.balance ?? 0) : ob.balance;
                setSummary({ totalDebit, totalCredit, closingBalance: lastBalance });

                const meta = data.meta ?? {};
                const total = meta.total ?? 0;
                setTotalItems(total);
                setTotalPages(Math.max(1, meta.total_pages ?? Math.ceil(total / limit)));
            } else {
                toast.error(data.message || 'Failed to load loan records');
                setTransactions([]);
            }
        } catch (err) {
            console.error('Loan fetch error:', err);
            toast.error('An error occurred while fetching loan records');
            setTransactions([]);
        } finally {
            setLoading(false);
            setFetching(false);
        }
    }, [username, fromDate, toDate]);

    // initial load
    useEffect(() => {
        if (username && isInitialFetch.current) {
            isInitialFetch.current = false;
            fetchLoans(1, itemsPerPage, fromDate, toDate, true);
        }
    }, [username]);

    // page / limit change
    useEffect(() => {
        if (isPageEffectMount.current) { isPageEffectMount.current = false; return; }
        fetchLoans(currentPage, itemsPerPage);
    }, [currentPage, itemsPerPage]);

    // ── handlers ─────────────────────────────────────────────────────────────

    const handlePageChange = (newPage) => {
        const p = Math.max(1, Math.min(totalPages, Math.floor(newPage)));
        if (p >= 1 && p <= totalPages) { setCurrentPage(p); setPageJumpInput(''); }
    };

    const handlePageJump = (e) => {
        e.preventDefault();
        const p = parseInt(pageJumpInput, 10);
        if (!isNaN(p)) handlePageChange(p);
    };

    const handleEditSuccess = () => {
        setEditEntry(null);
        fetchLoans(currentPage, itemsPerPage, fromDate, toDate);
    };

    const handleCreateSuccess = () => {
        setCreateLoanType(null);
        fetchLoans(currentPage, itemsPerPage, fromDate, toDate);
    };

    const handleExportReport = useCallback(() => {
        if (!username) {
            toast.error('Staff username required');
            return;
        }
        const headers = ['Date', 'Particulars', 'Type', 'Voucher No', 'Debit', 'Credit', 'Balance'];
        const escapeCell = (cell) => {
            const s = String(cell ?? '');
            if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
            return s;
        };
        const rows = [
            ['Opening Balance', '', '', '', openingBalance.debit ?? 0, openingBalance.credit ?? 0, openingBalance.balance ?? 0],
            ...transactions.map((entry) => [
                formatDate(entry.transaction_date),
                (entry.particulars?.remark || '').replace(/\r?\n/g, ' '),
                entry.type || '',
                entry.invoice_no || '—',
                entry.payment?.debit ?? 0,
                entry.payment?.credit ?? 0,
                entry.payment?.balance ?? 0,
            ]),
            ['Total', '', '', '', summary.totalDebit, summary.totalCredit, summary.closingBalance],
        ];
        const csv = [headers, ...rows].map((r) => r.map(escapeCell).join(',')).join('\r\n');
        const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const safeUser = String(username).replace(/[^a-zA-Z0-9_-]/g, '_');
        a.download = `loan-report-${safeUser}-${fromDate}-to-${toDate}.csv`;
        a.rel = 'noopener';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success(`Report downloaded (${transactions.length} row${transactions.length === 1 ? '' : 's'})`);
    }, [username, fromDate, toDate, transactions, openingBalance, summary]);

    const handlePlusMenuClick = (e) => {
        e.stopPropagation();
        setShowActionMenu(null);
        setDropdownPos(null);
        if (showCreateMenu) {
            setShowCreateMenu(false);
            setCreateMenuPos(null);
            return;
        }
        const rect = e.currentTarget.getBoundingClientRect();
        const MENU_HEIGHT = 140;
        const spaceBelow = window.innerHeight - rect.bottom;
        const openUpward = spaceBelow < MENU_HEIGHT;
        setCreateMenuPos({
            right: window.innerWidth - rect.right,
            top: rect.bottom + 4,
            bottom: window.innerHeight - rect.top + 4,
            openUpward,
        });
        setShowCreateMenu(true);
    };

    const openCreateModal = (type) => {
        setCreateLoanType(type);
        setShowCreateMenu(false);
        setCreateMenuPos(null);
    };

    const handleActionClick = (e, entryId) => {
        e.stopPropagation();
        setShowCreateMenu(false);
        setCreateMenuPos(null);
        if (showActionMenu === entryId) {
            setShowActionMenu(null);
            setDropdownPos(null);
            return;
        }
        const rect = e.currentTarget.getBoundingClientRect();
        const MENU_HEIGHT = 130; // approx height of 3-item menu
        const spaceBelow = window.innerHeight - rect.bottom;
        const openUpward = spaceBelow < MENU_HEIGHT;
        setDropdownPos({
            right: window.innerWidth - rect.right,
            top: rect.bottom + 4,
            bottom: window.innerHeight - rect.top + 4,
            openUpward,
        });
        setShowActionMenu(entryId);
    };

    // close dropdown on outside click
    useEffect(() => {
        if (!showActionMenu) return;
        const close = () => { setShowActionMenu(null); setDropdownPos(null); };
        document.addEventListener('click', close);
        return () => document.removeEventListener('click', close);
    }, [showActionMenu]);

    useEffect(() => {
        if (!showCreateMenu) return;
        const close = () => { setShowCreateMenu(false); setCreateMenuPos(null); };
        document.addEventListener('click', close);
        return () => document.removeEventListener('click', close);
    }, [showCreateMenu]);

    const rowOffset = (currentPage - 1) * itemsPerPage;

    // ── render ────────────────────────────────────────────────────────────────

    return (
        <div className="space-y-4">
            {/* ── Date filter card ── */}
            <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl shadow-sm border border-slate-200 px-6 py-4"
            >
                <div className="flex w-full flex-wrap items-end justify-between gap-3">
                    <div className="flex min-w-0 flex-1 flex-wrap items-end gap-3">
                        <div className="w-full max-w-[13.5rem] sm:max-w-[15rem] shrink-0">
                            <label className="mb-1 block text-xs font-medium text-slate-500">Date range</label>
                            <div className="relative w-full">
                                <FiCalendar className="pointer-events-none absolute left-3 top-1/2 z-[1] h-4 w-4 -translate-y-1/2 text-slate-400" />
                                <DateRangePickerField
                                    value={{ start: fromDate, end: toDate }}
                                    presetSource="loan"
                                    initialTab="quick"
                                    quickOptionKeys={DEFAULT_LOAN_QUICK_KEYS}
                                    defaultQuickKey="tm"
                                    placeholder="Select period"
                                    wrapperClassName="w-full"
                                    buttonClassName="w-full truncate pl-9 pr-2.5 py-2 text-left text-xs font-medium text-slate-700 sm:text-sm border border-slate-200 rounded-lg bg-white shadow-sm transition focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    onChange={({ start, end }) => {
                                        if (!start || !end) return;
                                        setFromDate(start);
                                        setToDate(end);
                                        setCurrentPage(1);
                                        fetchLoans(1, itemsPerPage, start, end);
                                    }}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex shrink-0 items-end gap-2">
                        <button
                            type="button"
                            onClick={handleExportReport}
                            disabled={!username || loading || fetching}
                            title={username ? 'Download loan report (CSV)' : 'Staff username required'}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <FiDownload className="h-4 w-4 shrink-0 text-slate-500" aria-hidden />
                            <span>Export</span>
                        </button>
                        <button
                            type="button"
                            onClick={handlePlusMenuClick}
                            disabled={!username}
                            title={username ? 'Add loan, interest, or repayment' : 'Staff username required'}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-semibold text-white shadow-md transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <FiPlus className="h-4 w-4 shrink-0" aria-hidden />
                            <span>+ Entry</span>
                        </button>
                    </div>
                </div>
            </motion.div>

            {/* ── Table card ── */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden"
            >
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-gradient-to-r from-slate-50 to-slate-100 border-y border-slate-200">
                                <th className="text-left p-4 font-semibold text-slate-600 w-14">#</th>
                                <th className="text-left p-4 font-semibold text-slate-600">Date</th>
                                <th className="text-left p-4 font-semibold text-slate-600">Particulars</th>
                                <th className="text-left p-4 font-semibold text-slate-600">Type</th>
                                <th className="text-left p-4 font-semibold text-slate-600">Voucher No</th>
                                <th className="text-right p-4 font-semibold text-slate-600">Debit</th>
                                <th className="text-right p-4 font-semibold text-slate-600">Credit</th>
                                <th className="text-right p-4 font-semibold text-slate-600">Balance</th>
                                <th className="text-center p-4 font-semibold text-slate-600 w-16">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {/* Opening Balance row */}
                            <tr className="bg-blue-50/50 font-medium">
                                <td className="p-4 text-slate-500" />
                                <td className="p-4 text-slate-800 font-semibold" colSpan="2">Opening Balance</td>
                                <td className="p-4" /><td className="p-4" />
                                <td className="p-4 text-right">
                                    {openingBalance.debit > 0
                                        ? <span className="text-sm font-semibold text-blue-600">₹{formatCurrency(openingBalance.debit)}</span>
                                        : <span className="text-sm text-slate-500">₹{formatCurrency(0)}</span>}
                                </td>
                                <td className="p-4 text-right">
                                    {openingBalance.credit > 0
                                        ? <span className="text-sm font-semibold text-orange-600">₹{formatCurrency(openingBalance.credit)}</span>
                                        : <span className="text-sm text-slate-500">₹{formatCurrency(0)}</span>}
                                </td>
                                <td className={`p-4 text-right font-bold text-sm ${(openingBalance.balance ?? 0) >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                                    ₹{formatCurrency(openingBalance.balance ?? 0)}
                                </td>
                                <td className="p-4" />
                            </tr>

                            {/* Data rows / skeleton / empty */}
                            {loading || fetching ? (
                                [...Array(5)].map((_, i) => <SkeletonRow key={i} />)
                            ) : transactions.length === 0 ? (
                                <tr>
                                    <td colSpan="9" className="text-center py-14">
                                        <div className="flex flex-col items-center justify-center gap-3">
                                            <div className="p-4 bg-slate-100 rounded-full">
                                                <FiRepeat className="w-8 h-8 text-slate-400" />
                                            </div>
                                            <p className="text-slate-600 font-medium">No loan records found</p>
                                            <p className="text-slate-400 text-xs">Try adjusting the date range</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                transactions.map((entry, index) => (
                                    <motion.tr
                                        key={entry.entry_id || index}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: index * 0.02 }}
                                        className="hover:bg-blue-50/30 transition-colors duration-150"
                                    >
                                        <td className="p-4 text-slate-500 text-xs">{rowOffset + index + 1}</td>
                                        <td className="p-4 text-slate-600 text-sm whitespace-nowrap">
                                            {formatDate(entry.transaction_date)}
                                        </td>
                                        <td className="p-4 text-slate-700 text-sm">
                                            {entry.particulars?.remark || '—'}
                                        </td>
                                        <td className="p-4">
                                            <span className="px-2.5 py-1 rounded-lg text-xs font-medium border bg-indigo-50 text-indigo-700 border-indigo-200 capitalize">
                                                {entry.type || 'N/A'}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <span className="text-sm font-mono text-slate-600">
                                                {entry.invoice_no || '—'}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right">
                                            {(entry.payment?.debit ?? 0) > 0
                                                ? <span className="text-sm font-semibold text-blue-600">₹{formatCurrency(entry.payment.debit)}</span>
                                                : <span className="text-sm text-slate-500">₹{formatCurrency(0)}</span>}
                                        </td>
                                        <td className="p-4 text-right">
                                            {(entry.payment?.credit ?? 0) > 0
                                                ? <span className="text-sm font-semibold text-orange-600">₹{formatCurrency(entry.payment.credit)}</span>
                                                : <span className="text-sm text-slate-500">₹{formatCurrency(0)}</span>}
                                        </td>
                                        <td className="p-4 text-right">
                                            <span className={`text-sm font-bold ${(entry.payment?.balance ?? 0) >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                                                ₹{formatCurrency(entry.payment?.balance ?? 0)}
                                            </span>
                                        </td>
                                        <td className="p-4 text-center">
                                            <button
                                                onClick={(e) => handleActionClick(e, entry.entry_id)}
                                                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                                                title="Actions"
                                            >
                                                <FiMoreVertical className="w-4 h-4 text-slate-500" />
                                            </button>
                                        </td>
                                    </motion.tr>
                                ))
                            )}

                            {/* Total row */}
                            <tr className="bg-slate-100 font-bold border-t-2 border-slate-300">
                                <td className="p-4 text-slate-800" colSpan="5">Total</td>
                                <td className="p-4 text-right text-blue-600">₹{formatCurrency(summary.totalDebit)}</td>
                                <td className="p-4 text-right text-orange-600">₹{formatCurrency(summary.totalCredit)}</td>
                                <td className={`p-4 text-right ${summary.closingBalance >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                                    ₹{formatCurrency(summary.closingBalance)}
                                </td>
                                <td className="p-4" />
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* ── Pagination footer ── */}
                {!loading && !fetching && totalPages > 0 && (transactions.length > 0 || totalItems > 0) && (
                    <div className="border-t border-slate-200 px-6 py-4 bg-white">
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                            {/* left: range + per-page */}
                            <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
                                <span>
                                    Showing{' '}
                                    <strong className="text-slate-800">{totalItems === 0 ? 0 : rowOffset + 1}</strong>
                                    {' '}to{' '}
                                    <strong className="text-slate-800">{Math.min(rowOffset + itemsPerPage, totalItems)}</strong>
                                    {' '}of{' '}
                                    <strong className="text-slate-800">{totalItems}</strong>
                                    {' '}entries
                                </span>
                                <span className="text-slate-300">|</span>
                                <span className="flex items-center gap-1.5">
                                    Show
                                    <select
                                        value={itemsPerPage}
                                        onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                                        className="border border-slate-200 rounded-lg px-2 py-1 text-xs font-medium text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                                    >
                                        {LIMIT_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
                                    </select>
                                    per page
                                </span>
                            </div>

                            {/* right: prev / pill / next + go-to */}
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); handlePageChange(currentPage - 1); }}
                                    disabled={currentPage <= 1}
                                    className="px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 shadow-sm"
                                >
                                    <FiChevronLeft className="w-3.5 h-3.5" />
                                    Prev
                                </button>

                                <div className="flex items-center gap-1 text-sm">
                                    <span className="inline-flex items-center justify-center min-w-[2.5rem] h-8 px-2 bg-indigo-600 text-white text-xs font-bold rounded-lg shadow-sm">
                                        {currentPage}
                                    </span>
                                    <span className="text-slate-400">/</span>
                                    <span className="text-xs font-medium text-slate-600">{totalPages}</span>
                                </div>

                                <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); handlePageChange(currentPage + 1); }}
                                    disabled={currentPage >= totalPages}
                                    className="px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 shadow-sm"
                                >
                                    Next
                                    <FiChevronRight className="w-3.5 h-3.5" />
                                </button>

                                <form onSubmit={handlePageJump} className="flex items-center gap-1 ml-1">
                                    <input
                                        type="number"
                                        min={1}
                                        max={totalPages}
                                        value={pageJumpInput}
                                        onChange={(e) => setPageJumpInput(e.target.value)}
                                        placeholder="Go"
                                        className="w-14 border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-center focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
                                    />
                                    <button type="submit" className="px-2.5 py-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors">
                                        Go
                                    </button>
                                </form>
                            </div>
                        </div>
                    </div>
                )}
            </motion.div>

            {/* Details modal */}
            {activeEntry && <DetailsModal entry={activeEntry} onClose={() => setActiveEntry(null)} />}

            {/* Edit modal */}
            {editEntry && (
                <EditModal
                    entry={editEntry}
                    username={username}
                    onClose={() => setEditEntry(null)}
                    onSuccess={handleEditSuccess}
                />
            )}

            {/* Create entry modal */}
            {createLoanType && username && (
                <CreateEntryModal
                    loanType={createLoanType}
                    username={username}
                    onClose={() => setCreateLoanType(null)}
                    onSuccess={handleCreateSuccess}
                />
            )}

            {/* Plus menu — portal (smart up/down) */}
            {createPortal(
                <AnimatePresence>
                    {showCreateMenu && createMenuPos && (
                        <motion.div
                            key="loan-create-menu"
                            style={{
                                position: 'fixed',
                                right: createMenuPos.right,
                                ...(createMenuPos.openUpward
                                    ? { bottom: createMenuPos.bottom }
                                    : { top: createMenuPos.top }),
                                width: '176px',
                                zIndex: 9999,
                            }}
                            initial={{ opacity: 0, y: createMenuPos.openUpward ? 6 : -6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: createMenuPos.openUpward ? 6 : -6 }}
                            transition={{ duration: 0.14 }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="bg-white rounded-xl shadow-xl border border-slate-200 py-1 overflow-hidden">
                                <button
                                    type="button"
                                    onClick={() => openCreateModal('loan')}
                                    className="w-full px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-indigo-50 flex items-center gap-2.5 transition-colors"
                                >
                                    <FiDollarSign className="w-4 h-4 text-indigo-500 shrink-0" aria-hidden />
                                    Loan
                                </button>
                                <button
                                    type="button"
                                    onClick={() => openCreateModal('interest')}
                                    className="w-full px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-violet-50 flex items-center gap-2.5 transition-colors"
                                >
                                    <FiPercent className="w-4 h-4 text-violet-500 shrink-0" aria-hidden />
                                    Interest
                                </button>
                                <button
                                    type="button"
                                    onClick={() => openCreateModal('repayment')}
                                    className="w-full px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-emerald-50 flex items-center gap-2.5 transition-colors"
                                >
                                    <FiCornerDownLeft className="w-4 h-4 text-emerald-500 shrink-0" aria-hidden />
                                    Repayment
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>,
                document.body
            )}

            {/* Action dropdown — portal-rendered to escape overflow clipping */}
            {(() => {
                const menuEntry = showActionMenu
                    ? transactions.find(t => t.entry_id === showActionMenu)
                    : null;

                return createPortal(
                    <AnimatePresence>
                        {menuEntry && dropdownPos && (
                            <motion.div
                                key="loan-action-menu"
                                style={{
                                    position: 'fixed',
                                    right: dropdownPos.right,
                                    ...(dropdownPos.openUpward
                                        ? { bottom: dropdownPos.bottom }
                                        : { top: dropdownPos.top }),
                                    width: '160px',
                                    zIndex: 9999,
                                }}
                                initial={{ opacity: 0, y: dropdownPos.openUpward ? 6 : -6 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: dropdownPos.openUpward ? 6 : -6 }}
                                transition={{ duration: 0.14 }}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div className="bg-white rounded-xl shadow-xl border border-slate-200 py-1 overflow-hidden">
                                    <button
                                        onClick={() => { setActiveEntry(menuEntry); setShowActionMenu(null); setDropdownPos(null); }}
                                        className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-indigo-50 flex items-center gap-2.5 transition-colors"
                                    >
                                        <FiEye className="w-3.5 h-3.5 text-indigo-500" />
                                        View
                                    </button>
                                    <button
                                        onClick={() => { setEditEntry(menuEntry); setShowActionMenu(null); setDropdownPos(null); }}
                                        className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-amber-50 flex items-center gap-2.5 transition-colors"
                                    >
                                        <FiEdit2 className="w-3.5 h-3.5 text-amber-500" />
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => { toast('Invoice feature coming soon'); setShowActionMenu(null); setDropdownPos(null); }}
                                        className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-green-50 flex items-center gap-2.5 transition-colors"
                                    >
                                        <FiFileText className="w-3.5 h-3.5 text-green-500" />
                                        Invoice
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>,
                    document.body
                );
            })()}
        </div>
    );
};

export default LoanTab;
