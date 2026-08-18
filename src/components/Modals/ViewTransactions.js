import React, { useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
    FiBriefcase,
    FiDownload,
    FiEdit2,
    FiFileText,
    FiHome,
    FiLayers,
    FiMail,
    FiMessageSquare,
    FiPhone,
    FiShare2,
    FiUsers,
    FiX,
} from 'react-icons/fi';
import { TbCurrencyRupee } from 'react-icons/tb';
import toast from 'react-hot-toast';

const toTitle = (value) => (value || 'N/A').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
const txType = (transaction) => (transaction?.transaction_type || '').toLowerCase();

const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const d = new Date(dateString);
    if (Number.isNaN(d.getTime())) return String(dateString);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatDateGb = (dateString) => {
    if (!dateString) return 'N/A';
    const d = new Date(dateString);
    if (Number.isNaN(d.getTime())) return String(dateString);
    return d.toLocaleDateString('en-GB');
};

const formatTime = (dateString) => {
    if (!dateString) return '';
    const d = new Date(dateString);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
};

const defaultFormatCurrency = (amount) => {
    const numAmount = parseFloat(amount);
    if (Number.isNaN(numAmount)) return '0.00';
    return new Intl.NumberFormat('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(numAmount);
};

const getAmounts = (transaction) => {
    const key = transaction?.transaction_type;
    const amounts = key && transaction[key] ? transaction[key] : transaction?.payment || {};
    return { debit: amounts.debit ?? 0, credit: amounts.credit ?? 0, balance: amounts.balance ?? 0 };
};

const formatPartyMobile = (party) => {
    if (!party || party.mobile == null || String(party.mobile).trim() === '') return '';
    const mobile = String(party.mobile).trim();
    const raw = party.country_code == null ? '' : String(party.country_code).trim();
    if (!raw) return mobile;
    if (/^\d+$/.test(raw)) return `+${raw} ${mobile}`;
    return `${raw} · ${mobile}`;
};

const PARTY_TYPE_LABELS = {
    client: 'Client',
    bank: 'Bank',
    cash: 'Cash',
    savings: 'Savings',
    current: 'Current',
    loan: 'Loan',
    capital: 'Capital',
    ca: 'CA',
    staff: 'Staff',
    agent: 'Agent',
};

const getPartyTypeLabel = (type) => PARTY_TYPE_LABELS[type] || toTitle(type);

const partyTypeBadgeClass = (type) => {
    if (type === 'client') return 'bg-blue-100 text-blue-700';
    if (type === 'ca') return 'bg-purple-100 text-purple-700';
    if (type === 'bank') return 'bg-amber-100 text-amber-700';
    return 'bg-slate-100 text-slate-700';
};

const DetailRow = ({ label, children, last = false }) => (
    <div className={`flex items-start justify-between gap-3 py-2 text-sm ${last ? '' : 'border-b border-slate-100'}`}>
        <span className="shrink-0 text-slate-500">{label}</span>
        <div className="min-w-0 text-right font-medium text-slate-800">{children}</div>
    </div>
);

const SectionCard = ({ title, icon: Icon, iconClass = 'text-slate-500', children, className = '' }) => (
    <section className={`rounded-xl border border-slate-200 bg-white p-4 shadow-sm ${className}`}>
        {title ? (
            <div className="mb-2.5 flex items-center gap-2">
                {Icon ? <Icon className={`h-3.5 w-3.5 ${iconClass}`} aria-hidden /> : null}
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{title}</p>
            </div>
        ) : null}
        {children}
    </section>
);

const footerBtnSecondary =
    'inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs sm:text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
const footerBtnPrimary =
    'inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 px-3 py-2 text-xs sm:text-sm font-medium text-white transition-colors shadow-sm disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:bg-blue-600';

/**
 * Viewport-safe shell per CLIENT/context/modal.md
 * — fade only, fixed header/footer, scrollable body, portal to document.body
 */
const ViewModalShell = ({
    isOpen,
    onClose,
    title,
    subtitle = null,
    titleIcon: TitleIcon = FiFileText,
    headerClassName = 'border-b border-blue-500/25 bg-gradient-to-r from-blue-500 to-blue-600',
    maxWidth = 'max-w-2xl',
    footer = null,
    children,
    zIndexClass = 'z-[10050]',
}) => {
    useEffect(() => {
        if (!isOpen) return undefined;
        const onKey = (e) => {
            if (e.key === 'Escape') onClose?.();
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [isOpen, onClose]);

    if (typeof document === 'undefined') return null;

    return createPortal(
        <AnimatePresence>
            {isOpen ? (
                <motion.div
                    key="view-tx-overlay"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className={`fixed inset-0 ${zIndexClass} flex items-center justify-center overflow-hidden overscroll-none p-3 sm:p-4 pointer-events-none`}
                >
                    <div
                        className="absolute inset-0 bg-slate-900/55 backdrop-blur-sm pointer-events-auto"
                        onClick={onClose}
                        aria-hidden
                    />
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        role="dialog"
                        aria-modal="true"
                        aria-label={typeof title === 'string' ? title : 'Details'}
                        className={`relative z-[1] pointer-events-auto flex w-full ${maxWidth} max-h-[min(calc(100vh-1.5rem),100dvh)] sm:max-h-[min(calc(100vh-2rem),100dvh)] flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-2xl`}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className={`flex shrink-0 items-center justify-between gap-3 px-5 py-3.5 text-white ${headerClassName}`}>
                            <div className="flex min-w-0 items-center gap-2.5">
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/15">
                                    <TitleIcon className="h-3.5 w-3.5" aria-hidden />
                                </div>
                                <div className="min-w-0">
                                    <h2 className="truncate text-sm font-semibold sm:text-[15px]">{title}</h2>
                                    {subtitle ? <p className="truncate text-[11px] text-white/80">{subtitle}</p> : null}
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={onClose}
                                className="rounded-lg p-1.5 text-white/85 hover:bg-white/15 hover:text-white transition-colors"
                                aria-label="Close"
                            >
                                <FiX className="h-4 w-4" />
                            </button>
                        </div>

                        <div
                            className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain px-5 py-4 space-y-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                        >
                            {children}
                        </div>

                        {footer ? (
                            <div className="shrink-0 border-t border-slate-200 bg-slate-50/90 px-5 py-3">
                                {footer}
                            </div>
                        ) : null}
                    </motion.div>
                </motion.div>
            ) : null}
        </AnimatePresence>,
        document.body
    );
};

/* ─── Ledger particulars (transaction ledger rows) ───────────────────────── */

const CommonParticulars = ({ transaction }) => {
    const particular = transaction?.particular || {};
    if (particular.type === 'bank' && particular.details) {
        const d = particular.details;
        return (
            <div className="rounded-lg border border-slate-200 bg-white p-3 space-y-1.5">
                <div className="flex items-center gap-2 mb-0.5">
                    <FiHome className="w-4 h-4 text-indigo-600" />
                    <span className="font-semibold text-slate-800 text-sm">{d.bank || 'Bank'}</span>
                </div>
                <DetailRow label="Account No">{d.account_no || '-'}</DetailRow>
                <DetailRow label="Holder">{d.holder || '-'}</DetailRow>
                <DetailRow label="IFSC"><span className="font-mono">{d.ifsc || '-'}</span></DetailRow>
                <DetailRow label="Branch" last>{d.branch || '-'}</DetailRow>
                {particular.remark ? <p className="pt-1 text-xs text-slate-600">{particular.remark}</p> : null}
            </div>
        );
    }
    if (particular.details && typeof particular.details === 'object') {
        const entries = Object.entries(particular.details).filter(([, val]) => val != null && val !== '');
        return (
            <div className="rounded-lg border border-slate-200 bg-white p-3">
                {entries.map(([key, val], idx) => (
                    <DetailRow key={key} label={key.replace(/_/g, ' ')} last={idx === entries.length - 1}>
                        {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                    </DetailRow>
                ))}
                {particular.remark ? <p className="pt-1.5 text-xs text-slate-600">{particular.remark}</p> : null}
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
        <div className="overflow-x-auto rounded-lg border border-slate-200">
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
            {particular.remark ? <p className="px-2.5 py-2 text-xs text-slate-600">{particular.remark}</p> : null}
        </div>
    );
};

const PurchaseParticulars = ({ transaction }) => {
    const particular = transaction?.particular || {};
    const summary =
        (particular.summary && String(particular.summary).trim()) ||
        (() => {
            const items = Array.isArray(particular.purchase_items)
                ? particular.purchase_items.map((item) => String(item?.name || '').trim()).filter(Boolean)
                : [];
            const firmName = particular.firm_name ? String(particular.firm_name).trim() : '';
            const taskId =
                particular.task_id != null && String(particular.task_id).trim() !== ''
                    ? String(particular.task_id).trim()
                    : '';
            const partyName =
                particular?.details?.name ||
                particular?.details?.holder ||
                particular?.details?.bank ||
                '';
            const parts = ['Purchase'];
            if (firmName) parts.push(`for firm ${firmName}`);
            else if (partyName) parts.push(`for ${partyName}`);
            if (items.length) parts.push(`for service ${items.join(', ')}`);
            let label = parts.join(' ');
            if (taskId) label = `${label} (TASK)`;
            return label === 'Purchase' || label === 'Purchase (TASK)' ? '' : label;
        })();

    if (!summary) {
        return <CommonParticulars transaction={transaction} />;
    }
    return (
        <p className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm leading-relaxed text-slate-800">
            {summary}
        </p>
    );
};
const ReceiveParticulars = ({ transaction }) => <CommonParticulars transaction={transaction} />;
const PaymentParticulars = ({ transaction }) => <CommonParticulars transaction={transaction} />;
const ExpenseParticulars = ({ transaction }) => <CommonParticulars transaction={transaction} />;
const JournalParticulars = ({ transaction }) => <CommonParticulars transaction={transaction} />;
const OpeningBalanceParticulars = ({ transaction }) => <CommonParticulars transaction={transaction} />;

const BaseTransactionViewModal = ({
    transaction,
    onClose,
    formatCurrency,
    particularsRenderer,
    onDownload,
    onShare,
    isDownloading,
}) => {
    const amounts = useMemo(() => getAmounts(transaction), [transaction]);
    if (!transaction) return null;

    const canDownload =
        typeof onDownload === 'function' &&
        transaction?.downloadable !== false &&
        Boolean(transaction?.invoice_id);
    const canShare = typeof onShare === 'function';

    return (
        <ViewModalShell
            isOpen
            onClose={onClose}
            title="Transaction Details"
            subtitle={transaction.invoice_no ? `Voucher ${transaction.invoice_no}` : null}
            titleIcon={FiFileText}
            maxWidth="max-w-2xl"
            zIndexClass="z-[1300]"
            footer={(
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                        {canDownload ? (
                            <button
                                type="button"
                                onClick={() => onDownload(transaction)}
                                disabled={Boolean(isDownloading)}
                                className={footerBtnSecondary}
                            >
                                <FiDownload className="w-3.5 h-3.5 text-emerald-600" />
                                {isDownloading ? 'Downloading…' : 'Download'}
                            </button>
                        ) : null}
                        {canShare ? (
                            <button type="button" onClick={() => onShare(transaction)} className={footerBtnSecondary}>
                                <FiShare2 className="w-3.5 h-3.5 text-teal-600" />
                                Share
                            </button>
                        ) : null}
                    </div>
                    <button type="button" onClick={onClose} className={footerBtnPrimary}>
                        Close
                    </button>
                </div>
            )}
        >
            <SectionCard title="Transaction info">
                <DetailRow label="Date">
                    {formatDate(transaction.transaction_date)} {formatTime(transaction.transaction_date)}
                </DetailRow>
                <DetailRow label="Type">{toTitle(transaction.transaction_type)}</DetailRow>
                <DetailRow label="Voucher no." last>
                    <span className="font-mono">{transaction.invoice_no || 'N/A'}</span>
                </DetailRow>
            </SectionCard>

            <div className="grid grid-cols-3 gap-2">
                <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-3 text-center">
                    <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">Debit</p>
                    <p className="mt-0.5 text-sm font-bold tabular-nums text-blue-700">{formatCurrency(amounts.debit)}</p>
                </div>
                <div className="rounded-xl border border-orange-100 bg-orange-50/60 p-3 text-center">
                    <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">Credit</p>
                    <p className="mt-0.5 text-sm font-bold tabular-nums text-orange-600">{formatCurrency(amounts.credit)}</p>
                </div>
                <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-3 text-center">
                    <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">Balance</p>
                    <p className={`mt-0.5 text-sm font-bold tabular-nums ${(amounts.balance ?? 0) >= 0 ? 'text-blue-700' : 'text-orange-600'}`}>
                        {formatCurrency(amounts.balance ?? 0)}
                    </p>
                </div>
            </div>

            {transaction.particular ? (
                <SectionCard title={`Particulars${transaction.particular.type ? ` · ${transaction.particular.type}` : ''}`}>
                    {particularsRenderer}
                </SectionCard>
            ) : null}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <SectionCard title="Created by" icon={FiUsers} iconClass="text-slate-400">
                    <p className="text-sm font-medium text-slate-800">{transaction.create_by?.name || '—'}</p>
                    <p className="mt-1 text-xs text-slate-600 inline-flex items-center gap-1">
                        <FiPhone className="w-3 h-3 text-slate-400" />
                        +{transaction.create_by?.country_code || ''} {transaction.create_by?.mobile || '—'}
                    </p>
                    <p className="mt-1 text-xs text-slate-600 inline-flex items-center gap-1 break-all">
                        <FiMail className="w-3 h-3 text-slate-400" />
                        {transaction.create_by?.email || '—'}
                    </p>
                    <p className="mt-1.5 text-[11px] text-slate-400">
                        {formatDate(transaction.create_date)} {formatTime(transaction.create_date)}
                    </p>
                </SectionCard>
                <SectionCard title="Modified by" icon={FiUsers} iconClass="text-slate-400">
                    <p className="text-sm font-medium text-slate-800">{transaction.modify_by?.name || '—'}</p>
                    <p className="mt-1 text-xs text-slate-600 inline-flex items-center gap-1">
                        <FiPhone className="w-3 h-3 text-slate-400" />
                        +{transaction.modify_by?.country_code || ''} {transaction.modify_by?.mobile || '—'}
                    </p>
                    <p className="mt-1 text-xs text-slate-600 inline-flex items-center gap-1 break-all">
                        <FiMail className="w-3 h-3 text-slate-400" />
                        {transaction.modify_by?.email || '—'}
                    </p>
                    <p className="mt-1.5 text-[11px] text-slate-400">
                        {formatDate(transaction.modify_date)} {formatTime(transaction.modify_date)}
                    </p>
                </SectionCard>
            </div>
        </ViewModalShell>
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

/* ─── Register detail views (sale / purchase / receive list rows) ────────── */

const getSalePartyDetails = (sale) => {
    if (sale?.sale_type === 'client' && sale.sale_party) {
        const sp = sale.sale_party;
        return {
            name: sp.name,
            email: sp.email,
            mobile: formatPartyMobile(sp),
        };
    }
    if (sale?.sale_type === 'bank' && sale.sale_party) {
        return {
            name: sale.sale_party.holder,
            bank: sale.sale_party.bank,
            account_no: sale.sale_party.account_no,
            ifsc: sale.sale_party.ifsc,
            branch: sale.sale_party.branch,
            type: sale.sale_party.type,
        };
    }
    return null;
};

/** Resolve linked task id from list row (`task_id`) or `sale_items.remark` (`task:…`). */
export const resolveSaleTaskId = (sale) => {
    if (!sale) return '';
    if (sale.task_id != null && String(sale.task_id).trim() !== '') {
        return String(sale.task_id).trim();
    }
    if (sale.particular?.task_id != null && String(sale.particular.task_id).trim() !== '') {
        return String(sale.particular.task_id).trim();
    }
    const items = Array.isArray(sale.items)
        ? sale.items
        : Array.isArray(sale.particular?.sale_items)
            ? sale.particular.sale_items
            : [];
    for (let i = 0; i < items.length; i++) {
        const remark = items[i]?.remark != null ? String(items[i].remark).trim() : '';
        if (/^task:/i.test(remark)) {
            const tid = remark.replace(/^task:/i, '').trim();
            if (tid) return tid;
        }
    }
    return '';
};

export const isTaskOriginSale = (sale) =>
    Boolean(
        sale?.is_task === true ||
        sale?.is_task === 1 ||
        String(sale?.is_task ?? '').trim() === '1' ||
        Boolean(resolveSaleTaskId(sale))
    );

/**
 * Sale register details (list/API shape from GET /sale/list).
 */
export const SaleDetailsModal = ({
    isOpen,
    record,
    onClose,
    formatCurrency: formatCurrencyProp,
    onEdit,
    canEdit = true,
    onDownload,
    onShare,
    isDownloading = false,
}) => {
    if (!isOpen || !record) return null;

    const formatMoney = formatCurrencyProp || defaultFormatCurrency;
    const partyDetails = getSalePartyDetails(record);
    const calculation = record.calculation || {};
    const lineItems = Array.isArray(record.items) ? record.items : [];
    const firm = record.firm && typeof record.firm === 'object' ? record.firm : null;
    const hasFirmDetails = Boolean(firm && (firm.firm_name || firm.firm_type || firm.pan_no || firm.gst_no));
    const fromTask = isTaskOriginSale(record);
    const editLabel = fromTask ? 'Edit (Task)' : 'Edit Sale';
    const grandTotal = calculation.grand_total ?? record.amount ?? 0;
    const canDownload = typeof onDownload === 'function' && Boolean(record.invoice_id);
    const canShare = typeof onShare === 'function' && Boolean(record.invoice_id);

    const handleEdit = () => {
        if (!canEdit) {
            toast.error('Need Access Permission');
            return;
        }
        onEdit?.(record);
    };

    return (
        <ViewModalShell
            isOpen={isOpen}
            onClose={onClose}
            title="Sale Details"
            subtitle={record.invoice_no ? `Invoice ${record.invoice_no}` : null}
            titleIcon={FiFileText}
            maxWidth="max-w-2xl"
            footer={(
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                        {canDownload ? (
                            <button
                                type="button"
                                onClick={() => onDownload(record)}
                                disabled={Boolean(isDownloading)}
                                className={footerBtnSecondary}
                            >
                                <FiDownload className="w-3.5 h-3.5 text-emerald-600" />
                                {isDownloading ? 'Downloading…' : 'Download'}
                            </button>
                        ) : null}
                        {canShare ? (
                            <button type="button" onClick={() => onShare(record)} className={footerBtnSecondary}>
                                <FiShare2 className="w-3.5 h-3.5 text-teal-600" />
                                Share
                            </button>
                        ) : null}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 ml-auto">
                        <button type="button" onClick={onClose} className={footerBtnSecondary}>
                            Close
                        </button>
                        {typeof onEdit === 'function' ? (
                            <button
                                type="button"
                                onClick={handleEdit}
                                className={footerBtnPrimary}
                                disabled={!canEdit}
                            >
                                <FiEdit2 className="w-3.5 h-3.5" />
                                {editLabel}
                            </button>
                        ) : null}
                    </div>
                </div>
            )}
        >
            {/* Summary strip */}
            <div className="rounded-xl border border-blue-200/80 bg-gradient-to-br from-blue-50 via-white to-slate-50 p-4 shadow-sm">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${partyTypeBadgeClass(record.sale_type)}`}>
                            {getPartyTypeLabel(record.sale_type)}
                        </span>
                        {fromTask ? (
                            <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800">
                                Task
                            </span>
                        ) : (
                            <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-600">
                                Direct
                            </span>
                        )}
                    </div>
                    <p className="text-xl font-bold tabular-nums text-blue-700">₹{formatMoney(grandTotal)}</p>
                </div>
                <DetailRow label="Date">{formatDateGb(record.transaction_date)}</DetailRow>
                <DetailRow label="Invoice no.">
                    <span className="font-mono">{record.invoice_no || '—'}</span>
                </DetailRow>
                <DetailRow label="Party" last>
                    {partyDetails?.name || '—'}
                </DetailRow>
            </div>

            <SectionCard title="Party" icon={FiUsers} iconClass="text-blue-500">
                {partyDetails ? (
                    <>
                        <DetailRow label="Name">{partyDetails.name || '—'}</DetailRow>
                        {partyDetails.email ? <DetailRow label="Email">{partyDetails.email}</DetailRow> : null}
                        {partyDetails.mobile ? <DetailRow label="Mobile">{partyDetails.mobile}</DetailRow> : null}
                        {partyDetails.bank ? <DetailRow label="Bank">{partyDetails.bank}</DetailRow> : null}
                        {partyDetails.account_no ? (
                            <DetailRow label="Account no.">
                                <span className="font-mono">{partyDetails.account_no}</span>
                            </DetailRow>
                        ) : null}
                        {partyDetails.ifsc ? (
                            <DetailRow label="IFSC" last={!partyDetails.branch}>
                                <span className="font-mono">{partyDetails.ifsc}</span>
                            </DetailRow>
                        ) : null}
                        {partyDetails.branch ? <DetailRow label="Branch" last>{partyDetails.branch}</DetailRow> : null}
                        {!partyDetails.email && !partyDetails.mobile && !partyDetails.bank && !partyDetails.account_no && !partyDetails.ifsc && !partyDetails.branch ? (
                            <DetailRow label="Type" last>{getPartyTypeLabel(record.sale_type)}</DetailRow>
                        ) : null}
                    </>
                ) : (
                    <p className="text-sm text-slate-500">No party details available</p>
                )}
            </SectionCard>

            {record.sale_type === 'client' && hasFirmDetails ? (
                <SectionCard title="Firm" icon={FiBriefcase} iconClass="text-violet-500">
                    <DetailRow label="Name">{firm?.firm_name || '—'}</DetailRow>
                    <DetailRow label="Type">
                        <span className="capitalize">{String(firm?.firm_type || '—').replace(/_/g, ' ')}</span>
                    </DetailRow>
                    <DetailRow label="PAN">
                        <span className="font-mono">{firm?.pan_no || '—'}</span>
                    </DetailRow>
                    <DetailRow label="GST" last>
                        <span className="font-mono">{firm?.gst_no || '—'}</span>
                    </DetailRow>
                </SectionCard>
            ) : null}

            {lineItems.length > 0 ? (
                <SectionCard title="Services & items" icon={FiLayers} iconClass="text-indigo-500">
                    <div className="-mx-1 overflow-x-auto rounded-lg border border-slate-100">
                        <table className="w-full min-w-[520px] text-sm">
                            <thead>
                                <tr className="bg-slate-50 text-left text-[10px] uppercase tracking-wide text-slate-500">
                                    <th className="px-3 py-2 font-semibold">Service</th>
                                    <th className="px-3 py-2 font-semibold text-right">Fees</th>
                                    <th className="px-3 py-2 font-semibold text-right">Tax %</th>
                                    <th className="px-3 py-2 font-semibold text-right">Tax</th>
                                    <th className="px-3 py-2 font-semibold text-right">Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {lineItems.map((row) => {
                                    const svc = row.service || {};
                                    return (
                                        <tr key={row.item_id || `${row.service_id}-${row.fees}`} className="text-slate-800">
                                            <td className="px-3 py-2">
                                                <div className="font-medium text-slate-900 text-[13px]">{svc.name || '—'}</div>
                                                {svc.sac_code ? (
                                                    <div className="text-[11px] text-slate-500">SAC {svc.sac_code}</div>
                                                ) : null}
                                            </td>
                                            <td className="px-3 py-2 text-right tabular-nums text-[13px]">₹{formatMoney(row.fees ?? 0)}</td>
                                            <td className="px-3 py-2 text-right tabular-nums text-[13px] text-slate-600">
                                                {row.tax_perc != null ? `${row.tax_perc}%` : '—'}
                                            </td>
                                            <td className="px-3 py-2 text-right tabular-nums text-[13px]">₹{formatMoney(row.tax_value ?? 0)}</td>
                                            <td className="px-3 py-2 text-right font-semibold tabular-nums text-[13px]">
                                                ₹{formatMoney(row.total ?? 0)}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </SectionCard>
            ) : null}

            <SectionCard title="Financials" icon={TbCurrencyRupee} iconClass="text-emerald-600">
                <DetailRow label="Subtotal">₹{formatMoney(calculation.subtotal ?? record.amount ?? 0)}</DetailRow>
                <DetailRow label="Tax rate">
                    {calculation.tax_rate != null ? `${String(calculation.tax_rate).replace(/\.00$/, '')}%` : '—'}
                </DetailRow>
                <DetailRow label="GST">₹{formatMoney(calculation.gst_value ?? 0)}</DetailRow>
                <DetailRow label="Discount">₹{formatMoney(calculation.discount_value ?? 0)}</DetailRow>
                {(calculation.additional_charge != null && Number(calculation.additional_charge) !== 0) ? (
                    <DetailRow label="Additional">₹{formatMoney(calculation.additional_charge)}</DetailRow>
                ) : null}
                <DetailRow label="Grand total" last>
                    <span className="text-base font-bold tabular-nums text-blue-700">₹{formatMoney(grandTotal)}</span>
                </DetailRow>
            </SectionCard>

            {record.remark ? (
                <SectionCard title="Remark" icon={FiMessageSquare} iconClass="text-purple-500">
                    <p className="text-sm leading-relaxed text-slate-700">{record.remark}</p>
                </SectionCard>
            ) : null}
        </ViewModalShell>
    );
};

/**
 * Purchase register details (list/API shape from GET /purchase/list).
 */
export const resolvePurchaseTaskId = (purchase) => {
    if (!purchase) return '';
    if (purchase.task_id != null && String(purchase.task_id).trim() !== '') {
        return String(purchase.task_id).trim();
    }
    const particularTask = purchase?.particular?.task_id;
    if (particularTask != null && String(particularTask).trim() !== '') {
        return String(particularTask).trim();
    }
    return '';
};

export const PurchaseDetailsModal = ({
    isOpen,
    record,
    onClose,
    formatCurrency: formatCurrencyProp,
    onEdit,
    canEdit = true,
    onDownload,
    onShare,
    isDownloading = false,
}) => {
    if (!isOpen || !record) return null;

    const formatMoney = formatCurrencyProp || defaultFormatCurrency;
    const calculation = record.calculation || {};
    const lineItems = Array.isArray(record.items) ? record.items : [];
    const purchaseType = String(record.purchase_type || record.purchase_from || '').toLowerCase();
    const party = record.purchase_party || {};
    const grandTotal = calculation.grand_total ?? record.amount ?? record.grand_total ?? record.total ?? 0;
    const canDownload = typeof onDownload === 'function' && Boolean(record.invoice_id);
    const canShare =
        typeof onShare === 'function' &&
        Boolean(record.invoice_id) &&
        (purchaseType === 'ca' || purchaseType === 'client');
    const taskId = resolvePurchaseTaskId(record);
    const fromTask = Boolean(taskId);
    const editLabel = fromTask ? 'Edit (Task)' : 'Edit Purchase';
    const partyName =
        purchaseType === 'bank'
            ? (party.holder || party.bank || '—')
            : (party.name || '—');
    const particularsLabel =
        (record.particulars && String(record.particulars).trim()) ||
        (() => {
            const serviceNames = lineItems
                .map((row) => String(row?.service?.name || '').trim())
                .filter(Boolean);
            const firm = record.task_firm_name || '';
            const parts = ['Purchase'];
            if (firm) parts.push(`for firm ${firm}`);
            else if (partyName && partyName !== '—') parts.push(`for ${partyName}`);
            if (serviceNames.length) parts.push(`for service ${serviceNames.join(', ')}`);
            let label = parts.join(' ');
            if (fromTask) label = `${label} (TASK)`;
            return label === 'Purchase' || label === 'Purchase (TASK)' ? '' : label;
        })();

    const handleEdit = () => {
        if (!canEdit) {
            toast.error('Need Access Permission');
            return;
        }
        onEdit?.(record);
    };

    return (
        <ViewModalShell
            isOpen={isOpen}
            onClose={onClose}
            title="Purchase Details"
            subtitle={record.invoice_no ? `Invoice ${record.invoice_no}` : null}
            titleIcon={FiFileText}
            headerClassName="border-b border-violet-500/25 bg-gradient-to-r from-violet-500 to-purple-600"
            maxWidth="max-w-2xl"
            footer={(
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                        {canDownload ? (
                            <button
                                type="button"
                                onClick={() => onDownload(record)}
                                disabled={Boolean(isDownloading)}
                                className={footerBtnSecondary}
                            >
                                <FiDownload className="w-3.5 h-3.5 text-emerald-600" />
                                {isDownloading ? 'Downloading…' : 'Download'}
                            </button>
                        ) : null}
                        {canShare ? (
                            <button type="button" onClick={() => onShare(record)} className={footerBtnSecondary}>
                                <FiShare2 className="w-3.5 h-3.5 text-teal-600" />
                                Share
                            </button>
                        ) : null}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 ml-auto">
                        <button type="button" onClick={onClose} className={footerBtnSecondary}>
                            Close
                        </button>
                        {typeof onEdit === 'function' ? (
                            <button
                                type="button"
                                onClick={handleEdit}
                                className={footerBtnPrimary}
                                disabled={!canEdit}
                            >
                                <FiEdit2 className="w-3.5 h-3.5" />
                                {editLabel}
                            </button>
                        ) : null}
                    </div>
                </div>
            )}
        >
            <div className="rounded-xl border border-violet-200/80 bg-gradient-to-br from-violet-50 via-white to-slate-50 p-4 shadow-sm">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize ${partyTypeBadgeClass(purchaseType)}`}>
                        {getPartyTypeLabel(purchaseType)}
                    </span>
                    <p className="text-xl font-bold tabular-nums text-violet-700">₹{formatMoney(grandTotal)}</p>
                </div>
                <DetailRow label="Date">{formatDateGb(record.transaction_date || record.date)}</DetailRow>
                <DetailRow label="Invoice no.">
                    <span className="font-mono">{record.invoice_no || '—'}</span>
                </DetailRow>
                {particularsLabel ? (
                    <DetailRow label="Particulars">
                        <span className="text-left leading-snug">{particularsLabel}</span>
                    </DetailRow>
                ) : null}
                <DetailRow label="Party" last>{partyName}</DetailRow>
            </div>

            <SectionCard title="Party" icon={FiUsers} iconClass="text-violet-500">
                <DetailRow label="Name">{partyName}</DetailRow>
                {party.email ? <DetailRow label="Email">{party.email}</DetailRow> : null}
                {party.mobile ? <DetailRow label="Mobile">{formatPartyMobile(party) || party.mobile}</DetailRow> : null}
                {party.bank ? <DetailRow label="Bank">{party.bank}</DetailRow> : null}
                {party.account_no ? (
                    <DetailRow label="Account no.">
                        <span className="font-mono">{party.account_no}</span>
                    </DetailRow>
                ) : null}
                {party.ifsc ? (
                    <DetailRow label="IFSC" last={!party.branch}>
                        <span className="font-mono">{party.ifsc}</span>
                    </DetailRow>
                ) : null}
                {party.branch ? <DetailRow label="Branch" last>{party.branch}</DetailRow> : null}
                {!party.email && !party.mobile && !party.bank && !party.account_no ? (
                    <DetailRow label="Type" last>{getPartyTypeLabel(purchaseType)}</DetailRow>
                ) : null}
            </SectionCard>

            {lineItems.length > 0 ? (
                <SectionCard title="Services & items" icon={FiLayers} iconClass="text-indigo-500">
                    <div className="-mx-1 overflow-x-auto rounded-lg border border-slate-100">
                        <table className="w-full min-w-[420px] text-sm">
                            <thead>
                                <tr className="bg-slate-50 text-left text-[10px] uppercase tracking-wide text-slate-500">
                                    <th className="px-3 py-2 font-semibold">Service</th>
                                    <th className="px-3 py-2 font-semibold text-right">Amount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {lineItems.map((row) => {
                                    const svc = row.service || {};
                                    return (
                                        <tr key={row.item_id || `${row.service_id}-${row.fees}`} className="text-slate-800">
                                            <td className="px-3 py-2">
                                                <div className="font-medium text-slate-900 text-[13px]">{svc.name || '—'}</div>
                                                {svc.sac_code ? (
                                                    <div className="text-[11px] text-slate-500">SAC {svc.sac_code}</div>
                                                ) : null}
                                            </td>
                                            <td className="px-3 py-2 text-right font-semibold tabular-nums text-[13px]">
                                                ₹{formatMoney(row.fees ?? row.amount ?? row.total ?? 0)}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </SectionCard>
            ) : null}

            <SectionCard title="Financials" icon={TbCurrencyRupee} iconClass="text-emerald-600">
                <DetailRow label="Subtotal">
                    ₹{formatMoney(calculation.subtotal ?? grandTotal)}
                </DetailRow>
                <DetailRow label="Grand total" last>
                    <span className="text-base font-bold tabular-nums text-violet-700">₹{formatMoney(grandTotal)}</span>
                </DetailRow>
            </SectionCard>

            {record.remark ? (
                <SectionCard title="Remark" icon={FiMessageSquare} iconClass="text-purple-500">
                    <p className="text-sm leading-relaxed text-slate-700">
                        {record.remark}
                    </p>
                </SectionCard>
            ) : null}
        </ViewModalShell>
    );
};

/** Placeholder for register types not yet ported (receive, payment, …). */
const UnsupportedRegisterDetailsModal = ({ isOpen, typeLabel, onClose }) => {
    useEffect(() => {
        if (!isOpen) return;
        toast(`${typeLabel} details view is not available yet.`);
        onClose?.();
    }, [isOpen, typeLabel, onClose]);

    return null;
};

/**
 * Unified view modal manager.
 *
 * Register: modalType + record + onDownload / onShare / onEdit
 * Ledger:   transaction + onDownload / onShare
 */
export const ViewTransactionModalManager = ({
    modalType,
    isOpen = true,
    record = null,
    transaction = null,
    onClose,
    formatCurrency,
    onEdit,
    canEdit = true,
    onDownload,
    onShare,
    isDownloading,
}) => {
    const typeKey = String(modalType || '').trim().toUpperCase();

    if (typeKey) {
        if (!isOpen || !record) return null;

        switch (typeKey) {
            case 'SALE':
                return (
                    <SaleDetailsModal
                        isOpen={isOpen}
                        record={record}
                        onClose={onClose}
                        formatCurrency={formatCurrency}
                        onEdit={onEdit}
                        canEdit={canEdit}
                        onDownload={onDownload}
                        onShare={onShare}
                        isDownloading={isDownloading}
                    />
                );
            case 'PURCHASE':
                return (
                    <PurchaseDetailsModal
                        isOpen={isOpen}
                        record={record}
                        onClose={onClose}
                        formatCurrency={formatCurrency}
                        onEdit={onEdit}
                        canEdit={canEdit}
                        onDownload={onDownload}
                        onShare={onShare}
                        isDownloading={isDownloading}
                    />
                );
            case 'RECEIVE':
                return <UnsupportedRegisterDetailsModal isOpen={isOpen} typeLabel="Receive" onClose={onClose} />;
            case 'PAYMENT':
                return <UnsupportedRegisterDetailsModal isOpen={isOpen} typeLabel="Payment" onClose={onClose} />;
            case 'EXPENSE':
                return <UnsupportedRegisterDetailsModal isOpen={isOpen} typeLabel="Expense" onClose={onClose} />;
            case 'JOURNAL':
                return <UnsupportedRegisterDetailsModal isOpen={isOpen} typeLabel="Journal" onClose={onClose} />;
            case 'CONTRA':
                return <UnsupportedRegisterDetailsModal isOpen={isOpen} typeLabel="Contra" onClose={onClose} />;
            case 'DISCOUNT':
                return <UnsupportedRegisterDetailsModal isOpen={isOpen} typeLabel="Discount" onClose={onClose} />;
            default:
                return null;
        }
    }

    if (!transaction) return null;

    const type = txType(transaction);
    const modalProps = { transaction, onClose, formatCurrency, onDownload, onShare, isDownloading };

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
