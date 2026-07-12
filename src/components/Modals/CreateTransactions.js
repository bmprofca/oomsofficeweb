// Client ledger transaction create modals (Receive, Payment, Sale, …)
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { IoTrash, IoAdd } from "react-icons/io5";
import { FiX, FiUser, FiDollarSign, FiShoppingBag, FiTruck, FiFileText, FiRepeat, FiPlus, FiTrash2, FiMail, FiPhone, FiCreditCard, FiHome, FiArrowRight, FiArrowLeft, FiChevronLeft, FiChevronRight, FiMessageSquare, FiMessageCircle, FiSearch, FiChevronDown } from 'react-icons/fi';
import toast from 'react-hot-toast';
import API_BASE_URL from '../../utils/api-controller';
import getHeaders from '../../utils/get-headers';
import axios from 'axios';
import { DatePickerField, isDatePickerPortalOpen } from '../PortalDatePicker';
import CustomSelect from '../CustomSelect';
import { optionByValue } from '../../utils/customSelectHelpers';

const appSettings = {
    company_name: 'Professional Accounting Services',
    gst_applicable: true,
    default_gst_rate: 18,
    currency: 'INR',
};

const sanitizeDecimalInput = (value, maxDecimals = 2) => {
    const normalized = String(value ?? '').replace(/,/g, '.').replace(/[^\d.]/g, '');
    const [whole = '', ...rest] = normalized.split('.');
    const fractionRaw = rest.join('');
    if (rest.length === 0) return whole;
    const fraction = fractionRaw.slice(0, maxDecimals);
    return `${whole}.${fraction}`;
};

const parseDecimalValue = (value) => parseFloat(value || 0) || 0;
const DEFAULT_NOTIFICATION_CHANNEL_STATUS = {
    sms: { available: true, reason: '' },
    whatsapp: { available: true, reason: '' },
    email: { available: true, reason: '' },
};

const ensureChannelStatusShape = (channels) => ({
    sms: channels?.sms || { available: true, reason: '' },
    whatsapp: channels?.whatsapp || { available: true, reason: '' },
    email: channels?.email || { available: true, reason: '' },
});

const toIsoDateOnly = (value) => {
    if (!value) return new Date().toISOString().split('T')[0];
    const s = String(value);
    return s.length >= 10 ? s.slice(0, 10) : s;
};

const mapBankPartyToSelection = (party) => {
    const d = party?.details || {};
    const bankId = d.bank_id || (party?.type === 'bank' ? party?.id : null);
    if (!bankId) return null;
    return {
        bank_id: bankId,
        bank: d.bank || d.holder || 'Bank',
        holder: d.holder,
        account_no: d.account_no,
        balance: d.balance ?? 0,
        type: d.type,
    };
};

const mapUserPartyToFirm = (party) => {
    const d = party?.details || {};
    const type = party?.type || 'client';
    if (type === 'capital') {
        return {
            username: d.capital_id || d.username || '',
            name: d.name || 'Capital',
            email: d.email || '',
            mobile: d.mobile || '',
            balance: d.balance ?? 0,
            userType: 'capital',
        };
    }
    if (type === 'expense') {
        return {
            username: d.item_id || d.party_id || '',
            party_id: d.item_id || d.party_id || '',
            name: d.name || 'Expense',
            email: d.email || '',
            mobile: d.mobile || '',
            balance: d.balance ?? 0,
            userType: 'expense',
            remark: d.remark ?? null,
        };
    }
    return {
        username: d.username || '',
        name: d.name || d.username || '',
        email: d.email || '',
        mobile: d.mobile || '',
        balance: d.balance ?? 0,
        userType: type,
    };
};

const mapUserPartyToJournal = (party) => {
    const type = party?.type || 'client';
    const d = party?.details || {};
    if (type === 'bank') {
        const bankId = d.bank_id || party?.id || '';
        return {
            bank_id: bankId,
            party_id: bankId,
            username: bankId,
            name: getBankPrimaryLabel({ bank: d.bank, holder: d.holder, type: d.type }) || bankId,
            balance: d.balance ?? 0,
            userType: 'bank',
            holder: d.holder,
            account_no: d.account_no,
        };
    }
    const firm = mapUserPartyToFirm(party);
    const partyId = type === 'capital'
        ? (d.capital_id || firm.party_id || firm.username)
        : type === 'expense'
            ? (d.item_id || firm.party_id || firm.username)
            : (firm.username || firm.party_id);
    return {
        ...firm,
        party_id: partyId,
        username: type === 'capital' || type === 'expense' ? partyId : (firm.username || partyId),
        userType: firm.userType || type,
    };
};

const formatPlainInrAmount = (value) =>
    new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(parseDecimalValue(value));

const SEARCH_DEBOUNCE_MS = 280;

const ComboboxSearchSpinner = ({ className = '' }) => (
    <span
        className={`inline-block h-3.5 w-3.5 shrink-0 rounded-full border-2 border-slate-200 border-t-slate-500 animate-spin ${className}`}
        aria-hidden
    />
);

/** Close popover when pointer down occurs outside container (mousedown runs before input blur). */
const useClickOutside = (ref, onOutside, enabled = true) => {
    const onOutsideRef = useRef(onOutside);
    useEffect(() => {
        onOutsideRef.current = onOutside;
    }, [onOutside]);

    useEffect(() => {
        if (!enabled) return undefined;
        const handlePointerDown = (event) => {
            const el = ref.current;
            if (!el || el.contains(event.target)) return;
            onOutsideRef.current();
        };
        document.addEventListener('mousedown', handlePointerDown);
        return () => document.removeEventListener('mousedown', handlePointerDown);
    }, [ref, enabled]);
};
const getBalanceColorClass = (balance) => (parseDecimalValue(balance) > 0 ? 'text-red-600' : 'text-green-600');

/** Bank list API often omits `bank` for cash — show holder as the main label. */
const getBankPrimaryLabel = (bank) => {
    if (!bank || typeof bank !== 'object') return '—';
    const name = String(bank.bank ?? '').trim();
    if (name) return name;
    return String(bank.holder ?? '').trim() || '—';
};

const hasBankInstitutionName = (bank) => Boolean(bank && typeof bank === 'object' && String(bank.bank ?? '').trim());

/** Second line under title: holder when bank name exists; otherwise type hint (e.g. Cash). */
const getBankSecondaryLabel = (bank) => {
    if (!bank || typeof bank !== 'object') return '—';
    if (hasBankInstitutionName(bank)) {
        return String(bank.holder ?? '').trim() || '—';
    }
    const t = String(bank.type ?? '').toLowerCase();
    if (t === 'cash') return 'Cash';
    return bank.type ? String(bank.type) : '—';
};

const PARTY_TYPE_LABELS = {
    client: 'Client',
    ca: 'CA',
    agent: 'Agent',
    staff: 'Staff',
    bank: 'Bank',
    capital: 'Capital',
    expense: 'Expense',
    admin: 'Admin',
    user: 'Client',
};

const resolvePartyTypeKey = (party, fallbackType = '') => {
    if (!party && !fallbackType) return '';
    const raw = party?.userType ?? party?.type ?? fallbackType ?? '';
    const key = String(raw).trim().toLowerCase();
    if (!key) return '';
    if (key === 'user') return 'client';
    return key;
};

const getPartyTypeLabel = (party, fallbackType = '') => {
    const key = resolvePartyTypeKey(party, fallbackType);
    if (!key) return '';
    return PARTY_TYPE_LABELS[key] || key.charAt(0).toUpperCase() + key.slice(1);
};

const PartyTypeBadge = ({ party, fallbackType = '', className = '' }) => {
    const label = getPartyTypeLabel(party, fallbackType);
    if (!label) return null;
    return (
        <span
            className={`shrink-0 text-[10px] font-medium leading-none text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded ${className}`}
        >
            {label}
        </span>
    );
};

const MODAL_ACCENT_STYLES = {
    payment: {
        header: 'bg-red-50 border-red-100',
        iconWrap: 'bg-red-100 text-red-600',
        primaryBtn: 'bg-red-600 hover:bg-red-700 focus:ring-red-500/40',
    },
    receive: {
        header: 'bg-blue-50 border-blue-100',
        iconWrap: 'bg-blue-100 text-blue-600',
        primaryBtn: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500/40',
    },
    sale: {
        header: 'bg-indigo-50 border-indigo-100',
        iconWrap: 'bg-indigo-100 text-indigo-600',
        primaryBtn: 'bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500/40',
    },
    purchase: {
        header: 'bg-purple-50 border-purple-100',
        iconWrap: 'bg-purple-100 text-purple-600',
        primaryBtn: 'bg-purple-600 hover:bg-purple-700 focus:ring-purple-500/40',
    },
    journal: {
        header: 'bg-indigo-50 border-indigo-100',
        iconWrap: 'bg-indigo-100 text-indigo-600',
        primaryBtn: 'bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500/40',
    },
    contra: {
        header: 'bg-teal-50 border-teal-100',
        iconWrap: 'bg-teal-100 text-teal-600',
        primaryBtn: 'bg-teal-600 hover:bg-teal-700 focus:ring-teal-500/40',
    },
    expense: {
        header: 'bg-emerald-50 border-emerald-100',
        iconWrap: 'bg-emerald-100 text-emerald-600',
        primaryBtn: 'bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500/40',
    },
    discount: {
        header: 'bg-amber-50 border-amber-100',
        iconWrap: 'bg-amber-100 text-amber-600',
        primaryBtn: 'bg-amber-600 hover:bg-amber-700 focus:ring-amber-500/40',
    },
};

const getCompactFieldClass = (accent = 'blue') => {
    const ring = accent === 'red'
        ? 'focus:ring-red-500/25 focus:border-red-400'
        : accent === 'indigo'
            ? 'focus:ring-indigo-500/25 focus:border-indigo-400'
            : accent === 'purple'
                ? 'focus:ring-purple-500/25 focus:border-purple-400'
                : accent === 'teal'
                    ? 'focus:ring-teal-500/25 focus:border-teal-400'
                    : accent === 'emerald'
                        ? 'focus:ring-emerald-500/25 focus:border-emerald-400'
                        : accent === 'amber'
                            ? 'focus:ring-amber-500/25 focus:border-amber-400'
                            : 'focus:ring-blue-500/25 focus:border-blue-400';
    return `w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 ${ring}`;
};

const COMPACT_LABEL = 'block text-xs font-medium text-slate-600 mb-1';

const PREVIEW_SHELL = 'rounded-md border border-slate-200 overflow-hidden bg-white';
const PREVIEW_HEAD = 'flex items-center gap-1.5 px-2 py-1.5';
const PREVIEW_META_GRID = 'grid grid-cols-3 divide-x divide-slate-100 border-t border-slate-100 bg-slate-50/80';
const PREVIEW_META_CELL = 'px-1.5 py-1 min-w-0';
const PREVIEW_META_LABEL = 'text-[10px] leading-none text-slate-500';
const PREVIEW_META_VALUE = 'text-xs leading-tight text-slate-800 truncate mt-0.5';

const getComboboxOpenClass = (open, focusAccent = 'blue') => {
    if (!open) return 'border-slate-200 shadow-sm';
    if (focusAccent === 'red') {
        return 'border-red-300 ring-2 ring-red-500/15 shadow-md';
    }
    if (focusAccent === 'indigo') {
        return 'border-indigo-300 ring-2 ring-indigo-500/15 shadow-md';
    }
    if (focusAccent === 'purple') {
        return 'border-purple-300 ring-2 ring-purple-500/15 shadow-md';
    }
    if (focusAccent === 'teal') {
        return 'border-teal-300 ring-2 ring-teal-500/15 shadow-md';
    }
    if (focusAccent === 'emerald') {
        return 'border-emerald-300 ring-2 ring-emerald-500/15 shadow-md';
    }
    if (focusAccent === 'amber') {
        return 'border-amber-300 ring-2 ring-amber-500/15 shadow-md';
    }
    return 'border-blue-300 ring-2 ring-blue-500/15 shadow-md';
};

const ClientSearchSkeletonRows = ({ rows = 4 }) => (
    <>
        {Array.from({ length: rows }, (_, i) => (
            <div
                key={`client-sk-${i}`}
                className="flex items-center gap-2 px-2.5 py-1.5 border-b border-slate-100 last:border-0 animate-pulse"
            >
                <div className="flex-1 min-w-0">
                    <div className="h-3.5 bg-slate-200 rounded w-[52%] leading-none" />
                    <div className="h-3 bg-slate-100 rounded w-[85%] leading-none -mt-px" />
                </div>
                <div className="h-3.5 bg-slate-200 rounded w-14 shrink-0" />
            </div>
        ))}
    </>
);

const BankSearchSkeletonRows = ({ rows = 4 }) => (
    <>
        {Array.from({ length: rows }, (_, i) => (
            <div
                key={`bank-sk-${i}`}
                className="flex items-center gap-2 px-2.5 py-1.5 border-b border-slate-100 last:border-0 animate-pulse"
            >
                <div className="flex-1 min-w-0">
                    <div className="h-3.5 bg-slate-200 rounded w-[52%] leading-none" />
                    <div className="h-3 bg-slate-100 rounded w-[85%] leading-none -mt-px" />
                </div>
                <div className="h-3.5 bg-slate-200 rounded w-14 shrink-0" />
            </div>
        ))}
    </>
);

/** Compact client preview after selection (payment / receive). — defined after ClientSearchAvatar */
const AnimatedCheckbox = ({ checked, indeterminate = false, onChange, ariaLabel, disabled = false }) => {
    const inputRef = useRef(null);

    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.indeterminate = indeterminate;
        }
    }, [indeterminate, checked]);

    const isActive = checked || indeterminate;

    return (
        <label className={`relative inline-flex items-center group ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
            <input
                ref={inputRef}
                type="checkbox"
                className="sr-only"
                checked={checked}
                onChange={onChange}
                aria-label={ariaLabel}
                disabled={disabled}
            />
            <motion.span
                className={`flex items-center justify-center w-[18px] h-[18px] rounded-[4px] border-2 transition-colors duration-200 ${isActive
                    ? 'bg-indigo-600 border-indigo-600 shadow-sm shadow-indigo-200'
                    : (disabled ? 'bg-slate-100 border-slate-200' : 'bg-white border-gray-300 group-hover:border-indigo-400')
                    }`}
                animate={{ scale: isActive ? [1, 1.12, 1] : 1 }}
                transition={{ duration: 0.18 }}
            >
                <AnimatePresence initial={false} mode="wait">
                    {indeterminate ? (
                        <motion.span
                            key="dash"
                            className="block w-2 h-0.5 bg-white rounded-full"
                            initial={{ opacity: 0, scaleX: 0.4 }}
                            animate={{ opacity: 1, scaleX: 1 }}
                            exit={{ opacity: 0, scaleX: 0.4 }}
                            transition={{ duration: 0.12 }}
                        />
                    ) : checked ? (
                        <motion.svg
                            key="check"
                            viewBox="0 0 12 12"
                            className="w-3 h-3 text-white"
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.5 }}
                            transition={{ duration: 0.15 }}
                        >
                            <path
                                d="M2.5 6l2.2 2.2 4.8-4.8"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.8"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </motion.svg>
                    ) : null}
                </AnimatePresence>
            </motion.span>
        </label>
    );
};

/** Footer notification toggles — UI only until API wiring. */
const TransactionNotifyCheckboxes = ({
    sendSms,
    setSendSms,
    sendWhatsApp,
    setSendWhatsApp,
    sendEmail,
    setSendEmail,
    channelStatus = null,
    loading = false,
}) => (
    (() => {
        const smsStatus = channelStatus?.sms || { available: true, reason: '' };
        const whatsappStatus = channelStatus?.whatsapp || { available: true, reason: '' };
        const emailStatus = channelStatus?.email || { available: true, reason: '' };
        const smsDisabled = loading || !smsStatus.available;
        const whatsappDisabled = loading || !whatsappStatus.available;
        const emailDisabled = loading || !emailStatus.available;
        const smsTitle = smsDisabled ? (smsStatus.reason || (loading ? 'Checking SMS availability...' : 'SMS unavailable')) : 'Send SMS notification';
        const whatsappTitle = whatsappDisabled ? (whatsappStatus.reason || (loading ? 'Checking WhatsApp availability...' : 'WhatsApp unavailable')) : 'Send WhatsApp notification';
        const emailTitle = emailDisabled ? (emailStatus.reason || (loading ? 'Checking email availability...' : 'Email unavailable')) : 'Send email notification';

        return (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Notify</span>
                <label className={`inline-flex items-center gap-2 select-none ${smsDisabled ? 'cursor-not-allowed' : 'cursor-pointer'}`} title={smsTitle}>
                    <AnimatedCheckbox
                        checked={sendSms}
                        onChange={(e) => {
                            if (smsDisabled) return;
                            setSendSms(e.target.checked);
                        }}
                        ariaLabel="Send SMS notification"
                        disabled={smsDisabled}
                    />
                    <FiMessageSquare className={`w-3.5 h-3.5 ${smsDisabled ? 'text-slate-400' : 'text-sky-600'}`} aria-hidden />
                    <span className={`text-xs ${smsDisabled ? 'text-slate-400' : 'text-slate-600'}`}>SMS</span>
                </label>
                <label className={`inline-flex items-center gap-2 select-none ${whatsappDisabled ? 'cursor-not-allowed' : 'cursor-pointer'}`} title={whatsappTitle}>
                    <AnimatedCheckbox
                        checked={sendWhatsApp}
                        onChange={(e) => {
                            if (whatsappDisabled) return;
                            setSendWhatsApp(e.target.checked);
                        }}
                        ariaLabel="Send WhatsApp notification"
                        disabled={whatsappDisabled}
                    />
                    <FiMessageCircle className={`w-3.5 h-3.5 ${whatsappDisabled ? 'text-slate-400' : 'text-emerald-600'}`} aria-hidden />
                    <span className={`text-xs ${whatsappDisabled ? 'text-slate-400' : 'text-slate-600'}`}>WhatsApp</span>
                </label>
                <label className={`inline-flex items-center gap-2 select-none ${emailDisabled ? 'cursor-not-allowed' : 'cursor-pointer'}`} title={emailTitle}>
                    <AnimatedCheckbox
                        checked={sendEmail}
                        onChange={(e) => {
                            if (emailDisabled) return;
                            setSendEmail(e.target.checked);
                        }}
                        ariaLabel="Send email notification"
                        disabled={emailDisabled}
                    />
                    <FiMail className={`w-3.5 h-3.5 ${emailDisabled ? 'text-slate-400' : 'text-slate-600'}`} aria-hidden />
                    <span className={`text-xs ${emailDisabled ? 'text-slate-400' : 'text-slate-600'}`}>Email</span>
                </label>
            </div>
        );
    })()
);

// Base Modal Component
const BaseModal = ({
    isOpen,
    onClose,
    title,
    children,
    footer,
    maxWidth = 'max-w-3xl',
    closeOnOverlayClick = true,
    closeOnEsc = true,
    headerTrailing = null,
    titleIcon = null,
    accent = null,
    compact = false,
    bodyScroll = true,
}) => {
    const [overlayBounce, setOverlayBounce] = useState(false);
    const bounceTimerRef = useRef(null);

    useEffect(() => {
        if (!isOpen || !closeOnEsc) return;
        const handleEscape = (e) => {
            if (e.key !== 'Escape') return;
            if (isDatePickerPortalOpen()) return;
            onClose?.();
        };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [isOpen, closeOnEsc, onClose]);

    useEffect(() => () => {
        if (bounceTimerRef.current) clearTimeout(bounceTimerRef.current);
    }, []);

    useEffect(() => {
        if (!isOpen) setOverlayBounce(false);
    }, [isOpen]);

    const handleOverlayClick = () => {
        if (closeOnOverlayClick) {
            onClose?.();
            return;
        }
        setOverlayBounce(true);
        if (bounceTimerRef.current) clearTimeout(bounceTimerRef.current);
        bounceTimerRef.current = setTimeout(() => setOverlayBounce(false), 450);
    };

    const accentStyle = MODAL_ACCENT_STYLES[accent] || null;
    const headerPad = compact ? 'px-4 py-2.5' : 'px-5 py-3.5';
    const bodyPad = compact ? 'px-4 py-3' : 'px-5 py-4';
    const footerPad = compact ? 'px-4 py-2.5' : 'px-5 py-3';
    const titleSize = compact ? 'text-base font-semibold' : 'text-lg sm:text-xl font-bold';
    const shellRadius = compact ? 'rounded-xl' : 'rounded-2xl';
    const shellMaxH = 'max-h-[calc(100vh-1.5rem)] sm:max-h-[calc(100vh-2rem)]';
    const modalTransition = { duration: 0.2, ease: 'easeOut' };

    /* Portal to document.body so fixed positioning is viewport-based. Nested layouts
       (e.g. Framer Motion with transform) otherwise create a containing block and distort
       size, fonts, and hit targets — common on client-profile → LedgerTab. */
    return createPortal(
        <AnimatePresence>
            {isOpen ? (
                <>
                    <motion.div
                        key="base-modal-backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={modalTransition}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[10050]"
                        onClick={handleOverlayClick}
                    />
                    <motion.div
                        key="base-modal-shell"
                        initial={{ opacity: 0, scale: 0.96 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.96 }}
                        transition={modalTransition}
                        className="fixed inset-0 z-[10051] pointer-events-none flex items-center justify-center p-3 sm:p-4"
                    >
                        <motion.div
                            animate={overlayBounce ? { x: [0, -10, 10, -8, 8, -4, 4, 0] } : { x: 0 }}
                            transition={{ duration: 0.42, ease: 'easeInOut' }}
                            className={`w-full ${maxWidth} ${shellMaxH} overflow-hidden bg-white ${shellRadius} shadow-2xl pointer-events-auto flex flex-col text-sm text-slate-900 antialiased`}
                        >
                            <div className={`flex flex-wrap justify-between items-center gap-x-3 gap-y-2 ${headerPad} border-b shrink-0 ${accentStyle ? accentStyle.header : 'bg-slate-50 border-slate-200'}`}>
                                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                    {titleIcon ? (
                                        <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${accentStyle ? accentStyle.iconWrap : 'bg-slate-100 text-slate-600'}`}>
                                            {titleIcon}
                                        </div>
                                    ) : null}
                                    <h2 className={`${titleSize} text-slate-800 truncate`}>{title}</h2>
                                </div>
                                <div className="flex flex-wrap items-center justify-end gap-2 shrink-0 w-full sm:w-auto">
                                    {headerTrailing}
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        className={`${compact ? 'p-1.5' : 'p-2'} hover:bg-white/60 rounded-md transition-colors`}
                                    >
                                        <FiX className={`${compact ? 'w-5 h-5' : 'w-6 h-6'} text-slate-500`} />
                                    </button>
                                </div>
                            </div>
                            <div
                                className={`${bodyPad} ${bodyScroll ? 'overflow-y-auto flex-1 min-h-0' : 'overflow-visible shrink-0'} [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden`}
                                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                            >
                                {children}
                            </div>
                            {footer ? (
                                <div className={`${footerPad} border-t border-slate-200 bg-white shrink-0`}>
                                    {footer}
                                </div>
                            ) : null}
                        </motion.div>
                    </motion.div>
                </>
            ) : null}
        </AnimatePresence>,
        document.body
    );
};

/** Care-of / guardian line, e.g. `S/O: FATHER NAME` (same idea as client profile). */
const formatClientCareOfSubtitle = (p) => {
    if (!p || typeof p !== 'object') return '';
    const prefix = String(p.guardian_type || p.care_of || '').trim();
    const gname = String(p.guardian_name || '').trim();
    if (prefix && gname) {
        const cleanPrefix = prefix.replace(/:\s*$/, '').trim();
        return `${cleanPrefix}: ${gname}`;
    }
    if (gname) return gname;
    if (prefix) return prefix;
    return '';
};

/** Selected bank card — compact bar matching client preview. */
const SaleBankPreviewCard = ({ bank, onChangeBank, formatMoney, readOnly = false, variant = 'receive' }) => {
    if (!bank) return null;
    const title = getBankPrimaryLabel(bank);
    const subtitle = getBankSecondaryLabel(bank);
    const balance = bank.balance ?? 0;
    const isCashLedger = String(bank.type ?? '').toLowerCase() === 'cash';
    const account_no = bank.account_no ?? bank.account ?? '';
    const ifsc = bank.ifsc ?? '';
    const branch = bank.branch ?? '';

    const metaParts = [subtitle !== '—' ? subtitle : '', ifsc, account_no ? `••${String(account_no).slice(-4)}` : '', branch]
        .map((v) => String(v || '').trim())
        .filter(Boolean);
    if (metaParts.length === 0 && isCashLedger) metaParts.push('Cash ledger');
    const metaLine = metaParts.length > 0 ? metaParts.join(' · ') : '—';

    const isPayment = variant === 'payment';
    const isPurchase = variant === 'purchase';
    const isContra = variant === 'contra';
    const isExpense = variant === 'expense';
    const shellClass = isPayment
        ? 'border-red-200/80 bg-red-50/60'
        : isPurchase
            ? 'border-purple-200/80 bg-purple-50/60'
            : isContra
                ? 'border-teal-200/80 bg-teal-50/60'
                : isExpense
                    ? 'border-emerald-200/80 bg-emerald-50/60'
                    : 'border-indigo-200/80 bg-indigo-50/60';
    const repeatHover = isPayment
        ? 'text-slate-400 hover:text-red-600 hover:bg-red-100/80'
        : isPurchase
            ? 'text-slate-400 hover:text-purple-600 hover:bg-purple-100/80'
            : isContra
                ? 'text-slate-400 hover:text-teal-600 hover:bg-teal-100/80'
                : isExpense
                    ? 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-100/80'
                    : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-100/80';

    return (
        <div className={`rounded-md border ${shellClass} shadow-sm`}>
            <div className="flex items-center gap-2 px-2.5 py-1.5">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate leading-none">{title}</p>
                        <PartyTypeBadge party={{ userType: 'bank' }} />
                    </div>
                    <p className="text-xs text-slate-500 truncate leading-none -mt-px" title={metaLine}>
                        {metaLine}
                    </p>
                </div>
                <p className={`text-sm font-semibold tabular-nums leading-none shrink-0 ${getBalanceColorClass(balance)}`}>
                    ₹{formatMoney(balance)}
                </p>
                {!readOnly && (
                    <button
                        type="button"
                        onClick={onChangeBank}
                        title="Change bank"
                        className={`p-0.5 rounded-md transition-colors shrink-0 ${repeatHover}`}
                    >
                        <FiRepeat className="w-3.5 h-3.5" />
                    </button>
                )}
            </div>
        </div>
    );
};

/** Selected client card — compact bar (payment / receive / sale modals). */
const SaleClientPreviewCard = ({
    party,
    name: nameFallback,
    detailLine: detailLineFallback,
    summary,
    formatMoney,
    onChangeClient,
    readOnly = false,
    variant = 'sale',
}) => {
    const p = party && typeof party === 'object' ? party : {};
    const displayName = (p.name != null && String(p.name).trim() !== '') ? String(p.name).trim() : (nameFallback || '—');
    const careOfSubtitle = formatClientCareOfSubtitle(p);
    const mobileRaw = p.contact ?? p.mobile
        ? (p.country_code ? `+${p.country_code} ${p.contact ?? p.mobile}` : String(p.contact ?? p.mobile))
        : '';
    const metaParts = [
        careOfSubtitle || (detailLineFallback && String(detailLineFallback).trim()) || '',
        mobileRaw,
        p.email,
        p.pan_no ?? p.pan_number,
    ]
        .map((v) => (v != null ? String(v).trim() : ''))
        .filter(Boolean);
    const metaLine = metaParts.length > 0 ? metaParts.join(' · ') : '—';

    const partyBalanceRaw = p.balance;
    const partyBalanceKnown = partyBalanceRaw != null && partyBalanceRaw !== '';
    const partyBalance = partyBalanceKnown ? parseDecimalValue(partyBalanceRaw) : null;

    const isSale = variant === 'sale';
    const isPurchase = variant === 'purchase';
    const shellClass = isPurchase
        ? 'border-purple-200/80 bg-purple-50/60'
        : isSale
            ? 'border-indigo-200/80 bg-indigo-50/60'
            : 'border-indigo-200/80 bg-indigo-50/60';
    const repeatHover = isPurchase
        ? 'text-slate-400 hover:text-purple-600 hover:bg-purple-100/80'
        : isSale
            ? 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-100/80'
            : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50';

    return (
        <div className={`rounded-md border ${shellClass} shadow-sm`}>
            <div className="flex items-center gap-2 px-2.5 py-1.5">
                <ClientSearchAvatar
                    client={partyRowToSearchClientShape(p, displayName)}
                    sizeClass="w-6 h-6"
                    textClass="text-[9px]"
                    roundedClass="rounded-md ring-1 ring-white/80"
                />
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate leading-none">{displayName}</p>
                        <PartyTypeBadge party={p} />
                    </div>
                    <p className="text-xs text-slate-500 truncate leading-none -mt-px" title={metaLine}>
                        {metaLine}
                    </p>
                </div>
                {summary != null && typeof summary === 'object' ? (
                    <div className="text-right shrink-0">
                        <p className="text-[10px] text-green-600 font-semibold tabular-nums leading-none">
                            Cr. ₹{formatMoney(summary?.totalCredit || 0)}
                        </p>
                        <p className="text-[10px] text-red-600 font-semibold tabular-nums leading-none -mt-px">
                            Dr. ₹{formatMoney(summary?.totalDebit || 0)}
                        </p>
                    </div>
                ) : partyBalanceKnown ? (
                    <p className={`text-sm font-semibold tabular-nums leading-none shrink-0 ${getBalanceColorClass(partyBalance)}`}>
                        ₹{formatPlainInrAmount(partyBalance)}
                    </p>
                ) : null}
                {!readOnly && onChangeClient ? (
                    <button
                        type="button"
                        onClick={onChangeClient}
                        title="Change client"
                        className={`p-0.5 rounded-md transition-colors shrink-0 ${repeatHover}`}
                    >
                        <FiRepeat className="w-3.5 h-3.5" />
                    </button>
                ) : null}
            </div>
        </div>
    );
};

const partyRowToSearchClientShape = (party, displayName) => ({
    name: displayName || party?.name,
    username: party?.username,
    mobile: party?.contact ?? party?.mobile,
    email: party?.email,
    pan_number: party?.pan_no ?? party?.pan_number,
    country_code: party?.country_code,
    profile: party?.profile,
    profile_photo: party?.profile_photo,
    profile_image: party?.profile_image,
    photo_url: party?.photo_url,
    image: party?.image,
    avatar: party?.avatar,
    photo: party?.photo,
});

// Bank Search Component — combobox dropdown with infinite scroll
const BankSearchOptionRow = ({ bank, formatBalance, itemHover, onSelect, isSelected }) => {
    const primaryLabel = getBankPrimaryLabel(bank);
    const secondaryLabel = getBankSecondaryLabel(bank);
    const isCashLedger = String(bank.type ?? '').toLowerCase() === 'cash';
    const metaParts = [
        secondaryLabel !== '—' ? secondaryLabel : '',
        bank.ifsc,
        bank.account_no ? `••${String(bank.account_no).slice(-4)}` : '',
        bank.branch,
    ]
        .map((v) => (v != null ? String(v).trim() : ''))
        .filter(Boolean);
    if (metaParts.length === 0 && isCashLedger) metaParts.push('Cash ledger');
    const metaLine = metaParts.length > 0 ? metaParts.join(' · ') : '—';

    return (
        <button
            type="button"
            onClick={onSelect}
            className={`w-full flex items-center gap-2 px-2.5 py-1.5 text-left border-b border-slate-100 last:border-0 transition-colors ${itemHover} ${isSelected ? 'bg-indigo-50' : ''}`}
        >
            <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-800 truncate leading-none">{primaryLabel}</p>
                <p className="text-xs text-slate-500 truncate leading-none -mt-px" title={metaLine}>
                    {metaLine}
                </p>
            </div>
            <div className="shrink-0 text-right pl-1 max-w-[6rem]">
                <p className={`text-sm font-semibold tabular-nums leading-none truncate ${getBalanceColorClass(bank.balance)}`}>
                    ₹{formatBalance(bank.balance)}
                </p>
            </div>
        </button>
    );
};

const BankSearchDropdown = ({ onSelect, selectedBankId, excludeBankId, compact = true, focusAccent = 'blue' }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [banks, setBanks] = useState([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const wrapperRef = useRef(null);
    const inputRef = useRef(null);
    const isLoadingMore = useRef(false);
    const hasMoreRef = useRef(false);
    const pageRef = useRef(1);
    const searchTermRef = useRef('');
    const searchRequestIdRef = useRef(0);
    const formatBalance = (value) => {
        const amount = parseDecimalValue(value);
        return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(amount);
    };

    const fetchBanks = useCallback(async (search = '', pageNum = 1) => {
        const requestId = ++searchRequestIdRef.current;
        const isFirstPage = pageNum === 1;

        if (isFirstPage) {
            setSearchLoading(true);
        } else {
            setLoadingMore(true);
            isLoadingMore.current = true;
        }

        try {
            const q = encodeURIComponent(String(search ?? '').trim());
            const response = await axios.get(
                `${API_BASE_URL}/transaction/bank/list?page_no=${pageNum}&limit=10&search=${q}`,
                { headers: getHeaders() }
            );
            if (requestId !== searchRequestIdRef.current) return;

            if (response.data.success) {
                const bankData = response.data.data || [];
                const filteredBanks = excludeBankId
                    ? bankData.filter((b) => b.bank_id !== excludeBankId)
                    : bankData;
                if (isFirstPage) {
                    setBanks(filteredBanks);
                } else {
                    setBanks((prev) => [...prev, ...filteredBanks]);
                }
                const isLast = response.data.meta?.is_last_page ?? true;
                hasMoreRef.current = !isLast;
                setHasMore(!isLast);
            }
        } catch (error) {
            if (requestId !== searchRequestIdRef.current) return;
            console.error('Error fetching banks:', error);
            toast.error('Failed to fetch banks');
            if (isFirstPage) setBanks([]);
            hasMoreRef.current = false;
            setHasMore(false);
        } finally {
            if (requestId !== searchRequestIdRef.current) return;
            if (isFirstPage) setSearchLoading(false);
            else {
                setLoadingMore(false);
                isLoadingMore.current = false;
            }
        }
    }, [excludeBankId]);

    useEffect(() => {
        searchTermRef.current = searchTerm;
    }, [searchTerm]);

    useEffect(() => {
        if (!showDropdown) return;
        setSearchLoading(true);
        setBanks([]);
        const t = setTimeout(() => {
            pageRef.current = 1;
            fetchBanks(searchTerm, 1);
        }, SEARCH_DEBOUNCE_MS);
        return () => clearTimeout(t);
    }, [searchTerm, showDropdown, fetchBanks]);

    // Click-outside: close dropdown
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleListScroll = useCallback((e) => {
        const el = e.currentTarget;
        if (isLoadingMore.current || !hasMoreRef.current || searchLoading) return;
        if (el.scrollTop + el.clientHeight >= el.scrollHeight - 40) {
            isLoadingMore.current = true;
            const nextPage = pageRef.current + 1;
            pageRef.current = nextPage;
            fetchBanks(searchTermRef.current, nextPage);
        }
    }, [fetchBanks, searchLoading]);

    const handleSelect = (bank) => {
        onSelect(bank);
        setSearchTerm(getBankPrimaryLabel(bank));
        setShowDropdown(false);
    };

    const handleSearchChange = (value) => {
        setSearchTerm(value);
        setShowDropdown(true);
        setSearchLoading(true);
        setBanks([]);
    };

    const itemHover = focusAccent === 'red' ? 'hover:bg-red-50' : 'hover:bg-slate-50';
    const listOpen = showDropdown;
    const listMaxH = compact ? 'max-h-56' : 'max-h-60';
    const showListSpinner = searchLoading;
    const showEmptyState = !searchLoading && !loadingMore && banks.length === 0;

    return (
        <div className="relative" ref={wrapperRef}>
            <div className={`rounded-md border bg-white overflow-hidden transition-all ${getComboboxOpenClass(listOpen, focusAccent)}`}>
                <div className="flex items-center gap-2 px-2.5 py-1.5">
                    <FiSearch className="w-3.5 h-3.5 text-slate-400 shrink-0" aria-hidden />
                    <input
                        ref={inputRef}
                        type="text"
                        value={searchTerm}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        onFocus={() => setShowDropdown(true)}
                        placeholder="Bank name, account, or IFSC…"
                        className="flex-1 min-w-0 border-0 bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-0 py-0.5"
                        autoComplete="off"
                    />
                    {showListSpinner ? (
                        <ComboboxSearchSpinner />
                    ) : (
                        <FiChevronDown
                            className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-200 ${listOpen ? 'rotate-180' : ''}`}
                            aria-hidden
                        />
                    )}
                </div>
                {listOpen && (
                    <div
                        className={`border-t border-slate-100 ${listMaxH} overflow-y-auto`}
                        onScroll={handleListScroll}
                    >
                        {searchLoading ? (
                            <BankSearchSkeletonRows rows={5} />
                        ) : (
                            <>
                                {banks.map((bank) => (
                                    <BankSearchOptionRow
                                        key={bank.bank_id}
                                        bank={bank}
                                        formatBalance={formatBalance}
                                        itemHover={itemHover}
                                        isSelected={selectedBankId === bank.bank_id}
                                        onSelect={() => handleSelect(bank)}
                                    />
                                ))}
                                {loadingMore && <BankSearchSkeletonRows rows={2} />}
                            </>
                        )}
                        {showEmptyState && (
                            <p className="px-2.5 py-3 text-xs text-center text-slate-500">No banks found</p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

const USER_SEARCH_LIMIT = 20;
const TRANSACTION_PARTY_SEARCH_LIMIT = 10;
const RECEIVE_PARTY_SEARCH_TYPES = ['client', 'ca', 'agent', 'staff', 'capital'];
const PAYMENT_PARTY_SEARCH_TYPES = ['client', 'ca', 'agent', 'staff', 'capital', 'expense'];
const JOURNAL_PARTY_SEARCH_TYPES = ['client', 'ca', 'agent', 'staff', 'capital', 'bank', 'expense'];
const SALE_PARTY_SEARCH_TYPES = ['client', 'ca', 'staff', 'agent', 'bank', 'capital'];

const normalizeLockedPartyType = (lockedPartyType, lockedSaleType) => {
    if (lockedPartyType) return lockedPartyType;
    if (lockedSaleType === 'bank') return 'bank';
    if (lockedSaleType === 'user') return 'client';
    return null;
};

const mapFixedPartyToSelection = (fixedParty, lockedPartyType) => {
    const userType = normalizeLockedPartyType(fixedParty?.party_type || fixedParty?.userType, null)
        || lockedPartyType
        || 'client';
    const partyId = String(fixedParty?.id || fixedParty?.party_id || fixedParty?.username || '').trim();
    return {
        party_id: partyId,
        username: fixedParty?.username || partyId,
        bank_id: userType === 'bank' ? partyId : fixedParty?.bank_id,
        name: fixedParty?.name || partyId,
        email: fixedParty?.email || '',
        mobile: fixedParty?.contact || fixedParty?.mobile || '',
        balance: fixedParty?.balance,
        userType,
        metaLine: fixedParty?.metaLine || '',
        holder: fixedParty?.holder,
        account_no: fixedParty?.account || fixedParty?.account_no,
        ifsc: fixedParty?.ifsc,
        branch: fixedParty?.branch,
    };
};

const mapSearchPartyItemToTransactionOption = (item) => {
    if (!item?.party_type || !item?.party_id) return null;
    const partyType = String(item.party_type).trim();
    const partyId = String(item.party_id).trim();
    const balance = item.balance ?? 0;

    if (partyType === 'bank') {
        const bank = item.bank || {};
        const title = String(bank.bank ?? '').trim() || String(bank.holder ?? '').trim() || partyId;
        const metaParts = [
            bank.holder,
            bank.account_no ? `••${String(bank.account_no).slice(-4)}` : '',
            bank.ifsc,
        ]
            .map((v) => (v != null ? String(v).trim() : ''))
            .filter(Boolean);
        return {
            party_id: partyId,
            bank_id: partyId,
            username: partyId,
            name: title,
            holder: bank.holder ?? null,
            account_no: bank.account_no ?? null,
            ifsc: bank.ifsc ?? null,
            bank: bank.bank ?? null,
            type: bank.type ?? null,
            balance,
            userType: 'bank',
            metaLine: metaParts.length > 0 ? metaParts.join(' · ') : '',
        };
    }

    if (partyType === 'capital') {
        const capital = item.capital || {};
        return {
            party_id: partyId,
            username: partyId,
            name: capital.name || partyId,
            email: '',
            mobile: '',
            balance,
            userType: 'capital',
            remark: capital.remark ?? null,
        };
    }

    if (partyType === 'expense') {
        const expense = item.expense || {};
        const metaParts = [expense.type, expense.remark]
            .map((v) => (v != null ? String(v).trim() : ''))
            .filter(Boolean);
        return {
            party_id: partyId,
            username: partyId,
            name: expense.name || partyId,
            email: '',
            mobile: '',
            balance,
            userType: 'expense',
            remark: expense.remark ?? null,
            metaLine: metaParts.length > 0 ? metaParts.join(' · ') : '',
        };
    }

    const details = item[partyType] || {};
    const metaLineParts = [
        details.designation,
        details.mobile
            ? (details.country_code ? `+${details.country_code} ${details.mobile}` : String(details.mobile))
            : '',
        details.email,
    ]
        .map((v) => (v != null ? String(v).trim() : ''))
        .filter(Boolean);

    return {
        party_id: partyId,
        username: partyId,
        name: details.name || partyId,
        email: details.email || '',
        mobile: details.mobile || '',
        country_code: details.country_code,
        designation: details.designation || '',
        balance,
        userType: partyType,
        metaLine: metaLineParts.join(' · '),
    };
};

const fetchTransactionPartySearchPage = async ({ search = '', pageNo = 1, partyTypes = [] } = {}) => {
    const headers = getHeaders();
    if (!headers) {
        throw new Error('Authentication headers missing');
    }
    const response = await axios.post(
        `${API_BASE_URL}/transaction/search-party`,
        {
            search: String(search ?? '').trim(),
            party_types: partyTypes,
            page_no: pageNo,
            limit: TRANSACTION_PARTY_SEARCH_LIMIT,
        },
        { headers }
    );
    if (!response.data?.success) {
        throw new Error(response.data?.message || 'Failed to search parties');
    }
    const list = (response.data.data || [])
        .map(mapSearchPartyItemToTransactionOption)
        .filter(Boolean);
    const isLast = response.data.meta?.is_last_page ?? true;
    return { list, isLast };
};

const resolveTransactionPartySelection = (party, defaultType = 'client') => {
    if (!party) return { party_id: '', party_type: defaultType, name: '' };
    const partyType = party.userType || defaultType;
    let partyId = '';
    if (partyType === 'bank') {
        partyId = String(party.bank_id || party.party_id || party.username || '').trim();
    } else if (partyType === 'capital' || partyType === 'expense') {
        partyId = String(party.party_id || party.username || '').trim();
    } else {
        partyId = String(party.username || party.party_id || '').trim();
    }
    return {
        party_id: partyId,
        party_type: partyType,
        name: party.name || partyId,
    };
};

const transactionPartyKey = (party, fallbackType = 'client') => {
    const resolved = resolveTransactionPartySelection(party, party?.userType || fallbackType);
    if (!resolved.party_id) return '';
    return `${resolved.party_type}:${resolved.party_id}`;
};

const fetchPresetTransactionParty = async (partyId, partyType, partyTypes = JOURNAL_PARTY_SEARCH_TYPES) => {
    const id = String(partyId || '').trim();
    if (!id) return null;
    const type = String(partyType || 'client').trim();
    const { list } = await fetchTransactionPartySearchPage({
        search: id,
        pageNo: 1,
        partyTypes,
    });
    const match = (list || []).find(
        (row) => row.userType === type && (String(row.party_id) === id || String(row.username) === id)
    );
    return match || (list || []).find((row) => String(row.party_id) === id || String(row.username) === id) || null;
};

const fetchClientSearchPage = async ({ search = '', pageNo = 1, excludeUsername = '' } = {}) => {
    const headers = getHeaders();
    if (!headers) {
        throw new Error('Authentication headers missing');
    }
    const q = String(search ?? '').trim();
    const response = await axios.get(
        `${API_BASE_URL}/client/list?page=${pageNo}&limit=${USER_SEARCH_LIMIT}&search=${encodeURIComponent(q)}`,
        { headers }
    );
    if (!response.data?.success) {
        throw new Error(response.data?.message || 'Failed to fetch clients');
    }
    let list = response.data.data || [];
    const exclude = String(excludeUsername || '').trim();
    if (exclude) {
        list = list.filter((row) => String(row.username) !== exclude);
    }
    const isLast = response.data.pagination?.is_last_page ?? true;
    return { list, isLast };
};

const mapClientToSalePartyOption = (client) => ({
    id: client.client_id || client.username,
    type: 'user',
    name: client.name || client.firm_name,
    email: client.email,
    contact: client.mobile,
    gst_no: client.gst_no,
    pan_no: client.pan_number,
    username: client.username,
    address: client.address,
    city: client.city,
    state: client.state,
    pincode: client.pincode,
    balance: client.balance,
    profile: client.profile ?? client.profile_photo ?? client.profile_image,
    profile_photo: client.profile_photo,
    profile_image: client.profile_image,
    photo_url: client.photo_url,
    image: client.image,
    avatar: client.avatar,
    photo: client.photo,
    country_code: client.country_code,
    care_of: client.care_of,
    guardian_name: client.guardian_name,
    guardian_type: client.guardian_type,
    firms: Array.isArray(client.firms)
        ? client.firms.map((firm) => ({
            firm_id: firm.firm_id,
            firm_name: firm.firm_name,
            pan_no: firm.pan_no,
            file_no: firm.file_no,
            firm_type: firm.firm_type,
            gst_no: firm.gst_no,
            username: firm.username,
            status: firm.status,
            address: firm.address,
        }))
        : [],
});

const CA_SEARCH_LIMIT = 20;

const fetchCaSearchPage = async ({ search = '', page = 1 } = {}) => {
    const headers = getHeaders();
    if (!headers) {
        throw new Error('Authentication headers missing');
    }
    const q = String(search ?? '').trim();
    const response = await axios.get(`${API_BASE_URL}/ca/list`, {
        headers,
        params: {
            page,
            limit: CA_SEARCH_LIMIT,
            ...(q ? { search: q } : {}),
        },
    });
    if (!response.data?.success) {
        throw new Error(response.data?.message || 'Failed to fetch CA list');
    }
    const list = response.data.data || [];
    const isLast = response.data.pagination?.is_last_page ?? true;
    return { list, isLast };
};

const mapCaToPurchasePartyOption = (ca) => ({
    id: ca.username || ca.id,
    type: 'ca',
    name: ca.name || ca.username,
    email: ca.email,
    contact: ca.mobile,
    pan_no: ca.pan_number,
    username: ca.username,
    balance: ca.balance,
    profile: ca.image,
    profile_photo: ca.image,
    image: ca.image,
    country_code: ca.country_code,
    care_of: ca.care_of,
    guardian_name: ca.guardian_name,
});

const JOURNAL_PARTY_TYPE_LABELS = PARTY_TYPE_LABELS;

const JOURNAL_PARTY_EMPTY_LABELS = {
    client: 'No clients found',
    agent: 'No agents found',
    ca: 'No CAs found',
    staff: 'No staff found',
    bank: 'No banks found',
    capital: 'No capital accounts found',
};

const resolveJournalPartyId = (party, type) =>
    resolveTransactionPartySelection(party, type || party?.userType || 'client').party_id;

const journalPartyKey = (party, fallbackType = 'client') =>
    transactionPartyKey(party, party?.userType || fallbackType);

const mapRowToJournalParty = (row, userType) => {
    if (!row) return null;
    return {
        username: row.username,
        party_id: row.username,
        name: row.name || row.username,
        email: row.email || '',
        mobile: row.mobile || '',
        pan_number: row.pan_number || '',
        balance: row.balance ?? 0,
        country_code: row.country_code,
        care_of: row.care_of,
        guardian_name: row.guardian_name,
        profile_photo: row.profile_photo ?? row.image,
        image: row.image,
        profile: row.profile ?? row.image,
        userType,
    };
};

const fetchAgentSearchPage = async ({ search = '', page = 1 } = {}) => {
    const headers = getHeaders();
    if (!headers) {
        throw new Error('Authentication headers missing');
    }
    const q = String(search ?? '').trim();
    const response = await axios.get(`${API_BASE_URL}/agent/list`, {
        headers,
        params: {
            page,
            limit: USER_SEARCH_LIMIT,
            ...(q ? { search: q } : {}),
        },
    });
    if (!response.data?.success) {
        throw new Error(response.data?.message || 'Failed to fetch agent list');
    }
    const list = response.data.data || [];
    const isLast = response.data.pagination?.is_last_page ?? true;
    return { list, isLast };
};

const fetchJournalPartySearchPage = async (partyType, { search = '', page = 1 } = {}) => {
    if (partyType === 'agent') {
        return fetchAgentSearchPage({ search, page });
    }
    if (partyType === 'ca') {
        return fetchCaSearchPage({ search, page });
    }
    return fetchClientSearchPage({ search, pageNo: page });
};

const fetchPresetJournalParty = async (username, userType) => {
    const u = String(username || '').trim();
    if (!u) return null;
    const type = userType === 'agent' || userType === 'ca' ? userType : 'client';
    const { list } = await fetchJournalPartySearchPage(type, { search: u, page: 1 });
    const match = (list || []).find((row) => String(row.username) === u) || list[0];
    return mapRowToJournalParty(match, type);
};

const getClientProfileImageUrl = (client) => {
    if (!client) return null;
    const flatCandidates = [
        client.profile_photo,
        client.profile_image,
        client.photo_url,
        client.profile_url,
        client.avatar,
        client.photo,
        client.image,
    ];
    for (const u of flatCandidates) {
        if (u != null && String(u).trim()) return String(u).trim();
    }
    const p = client.profile;
    if (typeof p === 'string' && p.trim()) return p.trim();
    if (p && typeof p === 'object') {
        const u = p.image ?? p.url ?? p.photo ?? p.profile_photo ?? p.avatar;
        if (u != null && String(u).trim()) return String(u).trim();
    }
    return null;
};

/** Profile image from `client.profile`, or first letter of name if missing / broken. */
const ClientSearchAvatar = ({ client, sizeClass = 'w-10 h-10', textClass = 'text-base', roundedClass = 'rounded-xl' }) => {
    const [imgFailed, setImgFailed] = useState(false);
    const [imgLoading, setImgLoading] = useState(false);
    const url = getClientProfileImageUrl(client);
    const initial = (client?.name || 'C').trim().charAt(0).toUpperCase();
    const showImg = Boolean(url) && !imgFailed;

    useEffect(() => {
        setImgFailed(false);
        setImgLoading(Boolean(url));
    }, [client?.username, client?.profile, client?.image, client?.profile_photo, url]);

    return (
        <div
            className={`relative flex-shrink-0 ${sizeClass} ${roundedClass} bg-indigo-100 overflow-hidden flex items-center justify-center font-bold text-indigo-600 ${textClass}`}
        >
            {showImg ? (
                <>
                    {imgLoading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-indigo-100">
                            <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-indigo-300 border-t-indigo-600" />
                        </div>
                    )}
                    <img
                        src={url}
                        alt=""
                        className={`w-full h-full object-cover transition-opacity duration-200 ${imgLoading ? 'opacity-0' : 'opacity-100'}`}
                        onLoad={() => setImgLoading(false)}
                        onError={() => {
                            setImgFailed(true);
                            setImgLoading(false);
                        }}
                    />
                </>
            ) : (
                <span className="select-none">{initial}</span>
            )}
        </div>
    );
};

const TransactionClientPreviewCard = ({
    client,
    formatCurrency,
    variant = 'receive',
    readOnly = false,
    onChange,
    careSubtitle = '',
    partyType = '',
}) => {
    if (!client) return null;
    const fmtBal = (v) => (typeof formatCurrency === 'function' ? formatCurrency(v ?? 0) : String(v ?? 0));
    const careLine = careSubtitle
        || [client.care_of, client.guardian_name]
            .filter((s) => s != null && String(s).trim() !== '')
            .map((s) => String(s).trim())
            .join(' · ')
        || '';
    const mobileRaw = client.mobile
        ? (client.country_code ? `+${client.country_code} ${client.mobile}` : String(client.mobile))
        : '';
    const metaParts = [careLine, mobileRaw, client.email, client.pan_number]
        .map((v) => (v != null ? String(v).trim() : ''))
        .filter(Boolean);
    const metaLine = metaParts.length > 0 ? metaParts.join(' · ') : '—';

    const isPayment = variant === 'payment';
    const shellClass = isPayment
        ? 'border-red-200/80 bg-red-50/60'
        : 'border-indigo-200/80 bg-indigo-50/60';
    const repeatHover = isPayment
        ? 'text-slate-400 hover:text-red-600 hover:bg-red-100/80'
        : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-100/80';

    return (
        <div className={`rounded-md border ${shellClass} shadow-sm`}>
            <div className="flex items-center gap-2 px-2.5 py-1.5">
                <ClientSearchAvatar
                    client={client}
                    sizeClass="w-6 h-6"
                    textClass="text-[9px]"
                    roundedClass="rounded-md ring-1 ring-white/80"
                />
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate leading-none">{client.name || '—'}</p>
                        <PartyTypeBadge party={client} fallbackType={partyType} />
                    </div>
                    <p className="text-xs text-slate-500 truncate leading-none -mt-px" title={metaLine}>
                        {metaLine}
                    </p>
                </div>
                <p className={`text-sm font-semibold tabular-nums leading-none shrink-0 ${getBalanceColorClass(client.balance)}`}>
                    ₹{fmtBal(client.balance)}
                </p>
                {!readOnly && onChange ? (
                    <button
                        type="button"
                        onClick={onChange}
                        title="Change client"
                        className={`p-0.5 rounded-md transition-colors shrink-0 ${repeatHover}`}
                    >
                        <FiRepeat className="w-3.5 h-3.5" />
                    </button>
                ) : null}
            </div>
        </div>
    );
};

/** Compact row for client search dropdown — name + one meta line + balance. */
const ClientSearchOptionRow = ({ client, formatBalance, itemHover, onSelect, showPartyType = false }) => {
    const mobileRaw = client.mobile
        ? (client.country_code ? `+${client.country_code} ${client.mobile}` : String(client.mobile))
        : '';
    const metaParts = client.metaLine
        ? [client.metaLine]
        : [mobileRaw, client.email, client.pan_number, client.designation, client.remark]
            .map((v) => (v != null ? String(v).trim() : ''))
            .filter(Boolean);
    const metaLine = metaParts.length > 0 ? metaParts.join(' · ') : '—';
    const partyTypeLabel = PARTY_TYPE_LABELS[client.userType] || getPartyTypeLabel(client);

    return (
        <button
            type="button"
            onClick={onSelect}
            className={`w-full flex items-center gap-2 px-2.5 py-1.5 text-left border-b border-slate-100 last:border-0 transition-colors ${itemHover}`}
        >
            <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate leading-none">{client.name || '—'}</p>
                    {showPartyType && client.userType ? (
                        <span className="shrink-0 text-[10px] font-medium text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded">
                            {partyTypeLabel}
                        </span>
                    ) : null}
                </div>
                <p className="text-xs text-slate-500 truncate leading-none -mt-px" title={metaLine}>
                    {metaLine}
                </p>
            </div>
            <div className="shrink-0 text-right pl-1 max-w-[6rem]">
                <p className={`text-sm font-semibold tabular-nums leading-none truncate ${getBalanceColorClass(client.balance)}`}>
                    ₹{formatBalance(client.balance)}
                </p>
            </div>
        </button>
    );
};

/** Client list for Receive/Payment/Journal (GET /client/list). */
const useFirmClientSearch = (enabled, excludeUsername = '', options = {}) => {
    const { fetchOnFocusOnly = false } = options;
    const [searchTerm, setSearchTerm] = useState('');
    const [firms, setFirms] = useState([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(false);
    const [selectedFirm, setSelectedFirm] = useState(null);
    const [showDropdown, setShowDropdown] = useState(false);
    const dropdownActiveRef = useRef(false);
    const exclude = String(excludeUsername || '').trim();
    const pageRef = useRef(1);
    const hasMoreRef = useRef(false);
    const isLoadingMoreRef = useRef(false);
    const searchTermRef = useRef('');
    const searchRequestIdRef = useRef(0);

    const searchClients = useCallback(async (term, pageNum = 1, append = false) => {
        const requestId = ++searchRequestIdRef.current;
        const isFirstPage = pageNum === 1 && !append;

        if (isFirstPage) {
            setSearchLoading(true);
        } else {
            setLoadingMore(true);
            isLoadingMoreRef.current = true;
        }

        try {
            const { list, isLast } = await fetchClientSearchPage({
                search: term,
                pageNo: pageNum,
                excludeUsername: exclude,
            });
            if (requestId !== searchRequestIdRef.current) return;

            if (append) {
                setFirms((prev) => [...prev, ...list]);
            } else {
                setFirms(list);
            }
            hasMoreRef.current = !isLast;
            setHasMore(!isLast);
            if (dropdownActiveRef.current) {
                setShowDropdown(true);
            }
        } catch (error) {
            if (requestId !== searchRequestIdRef.current) return;
            console.error('Error searching clients:', error);
            toast.error(error.response?.data?.message || error.message || 'Failed to search clients');
            if (!append) {
                setFirms([]);
                if (dropdownActiveRef.current) {
                    setShowDropdown(false);
                }
            }
            hasMoreRef.current = false;
            setHasMore(false);
        } finally {
            if (requestId !== searchRequestIdRef.current) return;
            setSearchLoading(false);
            setLoadingMore(false);
            isLoadingMoreRef.current = false;
        }
    }, [exclude]);

    useEffect(() => {
        if (exclude && selectedFirm && String(selectedFirm.username) === exclude) {
            setSelectedFirm(null);
            setSearchTerm('');
            setFirms([]);
            dropdownActiveRef.current = false;
            setShowDropdown(false);
        }
    }, [exclude, selectedFirm]);

    useEffect(() => {
        searchTermRef.current = searchTerm;
    }, [searchTerm]);

    useEffect(() => {
        if (!enabled || selectedFirm) return;
        const q = String(searchTerm || '').trim();
        // fetchOnFocusOnly: skip idle empty query until user opens the list; still search when clearing text while open
        if (fetchOnFocusOnly && q === '' && !dropdownActiveRef.current) return;

        setSearchLoading(true);
        setFirms([]);

        const debounceTimer = setTimeout(() => {
            pageRef.current = 1;
            searchClients(searchTerm, 1, false);
        }, SEARCH_DEBOUNCE_MS);

        return () => clearTimeout(debounceTimer);
    }, [searchTerm, selectedFirm, enabled, searchClients, fetchOnFocusOnly]);

    const openDropdown = useCallback(() => {
        dropdownActiveRef.current = true;
        setShowDropdown(true);
    }, []);

    const dismissDropdown = useCallback(() => {
        dropdownActiveRef.current = false;
        setShowDropdown(false);
    }, []);

    const loadClientsOnFocus = useCallback(() => {
        openDropdown();
        const q = String(searchTermRef.current || '').trim();
        if (q === '') {
            pageRef.current = 1;
            setSearchLoading(true);
            setFirms([]);
            searchClients('', 1, false);
        }
    }, [searchClients, openDropdown]);

    const handleListScroll = useCallback((e) => {
        const el = e.currentTarget;
        if (isLoadingMoreRef.current || !hasMoreRef.current || searchLoading) return;
        if (el.scrollTop + el.clientHeight >= el.scrollHeight - 40) {
            isLoadingMoreRef.current = true;
            const nextPage = pageRef.current + 1;
            pageRef.current = nextPage;
            searchClients(searchTermRef.current, nextPage, true);
        }
    }, [searchClients, searchLoading]);

    const clearSelection = useCallback(() => {
        setSelectedFirm(null);
        setSearchTerm('');
        pageRef.current = 1;
        searchTermRef.current = '';
        dropdownActiveRef.current = true;
        setSearchLoading(true);
        setFirms([]);
        searchClients('', 1, false);
    }, [searchClients]);

    const reset = useCallback(() => {
        searchRequestIdRef.current += 1;
        setSearchTerm('');
        setFirms([]);
        setSelectedFirm(null);
        dropdownActiveRef.current = false;
        setShowDropdown(false);
        setSearchLoading(false);
        setLoadingMore(false);
        pageRef.current = 1;
        hasMoreRef.current = false;
        setHasMore(false);
        searchTermRef.current = '';
        if (enabled && !fetchOnFocusOnly) {
            searchClients('', 1, false);
        }
    }, [enabled, searchClients, fetchOnFocusOnly]);

    return {
        searchTerm,
        setSearchTerm,
        firms,
        setFirms,
        selectedFirm,
        setSelectedFirm,
        showDropdown,
        setShowDropdown,
        openDropdown,
        dismissDropdown,
        searchLoading,
        loadingMore,
        hasMore,
        handleListScroll,
        clearSelection,
        loadClientsOnFocus,
        reset,
    };
};

/** Multi-party search for Receive/Payment/Journal modals (POST /transaction/search-party). */
const useTransactionPartySearch = (partyTypes, enabled, options = {}) => {
    const { fetchOnFocusOnly = false, excludeParty = null } = options;
    const excludeKey = excludeParty ? transactionPartyKey(excludeParty) : '';
    const [searchTerm, setSearchTerm] = useState('');
    const [firms, setFirms] = useState([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(false);
    const [selectedFirm, setSelectedFirm] = useState(null);
    const [showDropdown, setShowDropdown] = useState(false);
    const dropdownActiveRef = useRef(false);
    const pageRef = useRef(1);
    const hasMoreRef = useRef(false);
    const isLoadingMoreRef = useRef(false);
    const searchTermRef = useRef('');
    const searchRequestIdRef = useRef(0);

    const searchParties = useCallback(async (term, pageNum = 1, append = false) => {
        const requestId = ++searchRequestIdRef.current;
        const isFirstPage = pageNum === 1 && !append;

        if (isFirstPage) {
            setSearchLoading(true);
        } else {
            setLoadingMore(true);
            isLoadingMoreRef.current = true;
        }

        try {
            const { list, isLast } = await fetchTransactionPartySearchPage({
                search: term,
                pageNo: pageNum,
                partyTypes,
            });
            if (requestId !== searchRequestIdRef.current) return;

            let nextList = list;
            if (excludeKey) {
                nextList = list.filter((party) => transactionPartyKey(party) !== excludeKey);
            }

            if (append) {
                setFirms((prev) => [...prev, ...nextList]);
            } else {
                setFirms(nextList);
            }
            hasMoreRef.current = !isLast;
            setHasMore(!isLast);
            if (dropdownActiveRef.current) {
                setShowDropdown(true);
            }
        } catch (error) {
            if (requestId !== searchRequestIdRef.current) return;
            console.error('Error searching receive parties:', error);
            toast.error(error.response?.data?.message || error.message || 'Failed to search parties');
            if (!append) {
                setFirms([]);
                if (dropdownActiveRef.current) {
                    setShowDropdown(false);
                }
            }
            hasMoreRef.current = false;
            setHasMore(false);
        } finally {
            if (requestId !== searchRequestIdRef.current) return;
            setSearchLoading(false);
            setLoadingMore(false);
            isLoadingMoreRef.current = false;
        }
    }, [partyTypes, excludeKey]);

    useEffect(() => {
        if (!excludeKey || !selectedFirm) return;
        if (transactionPartyKey(selectedFirm) === excludeKey) {
            setSelectedFirm(null);
            setSearchTerm('');
            setFirms([]);
            dropdownActiveRef.current = false;
            setShowDropdown(false);
        }
    }, [excludeKey, selectedFirm]);

    useEffect(() => {
        searchTermRef.current = searchTerm;
    }, [searchTerm]);

    useEffect(() => {
        if (!enabled || selectedFirm) return;
        const q = String(searchTerm || '').trim();
        if (fetchOnFocusOnly && q === '' && !dropdownActiveRef.current) return;

        setSearchLoading(true);
        setFirms([]);

        const debounceTimer = setTimeout(() => {
            pageRef.current = 1;
            searchParties(searchTerm, 1, false);
        }, SEARCH_DEBOUNCE_MS);

        return () => clearTimeout(debounceTimer);
    }, [searchTerm, selectedFirm, enabled, searchParties, fetchOnFocusOnly, partyTypes]);

    const openDropdown = useCallback(() => {
        dropdownActiveRef.current = true;
        setShowDropdown(true);
    }, []);

    const dismissDropdown = useCallback(() => {
        dropdownActiveRef.current = false;
        setShowDropdown(false);
    }, []);

    const loadPartiesOnFocus = useCallback(() => {
        openDropdown();
        const q = String(searchTermRef.current || '').trim();
        if (q === '') {
            pageRef.current = 1;
            setSearchLoading(true);
            setFirms([]);
            searchParties('', 1, false);
        }
    }, [searchParties, openDropdown]);

    const handleListScroll = useCallback((e) => {
        const el = e.currentTarget;
        if (isLoadingMoreRef.current || !hasMoreRef.current || searchLoading) return;
        if (el.scrollTop + el.clientHeight >= el.scrollHeight - 40) {
            isLoadingMoreRef.current = true;
            const nextPage = pageRef.current + 1;
            pageRef.current = nextPage;
            searchParties(searchTermRef.current, nextPage, true);
        }
    }, [searchParties, searchLoading]);

    const clearSelection = useCallback(() => {
        setSelectedFirm(null);
        setSearchTerm('');
        pageRef.current = 1;
        searchTermRef.current = '';
        dropdownActiveRef.current = true;
        setSearchLoading(true);
        setFirms([]);
        searchParties('', 1, false);
    }, [searchParties]);

    const reset = useCallback(() => {
        searchRequestIdRef.current += 1;
        setSearchTerm('');
        setFirms([]);
        setSelectedFirm(null);
        dropdownActiveRef.current = false;
        setShowDropdown(false);
        setSearchLoading(false);
        setLoadingMore(false);
        pageRef.current = 1;
        hasMoreRef.current = false;
        setHasMore(false);
        searchTermRef.current = '';
    }, []);

    return {
        searchTerm,
        setSearchTerm,
        firms,
        setFirms,
        selectedFirm,
        setSelectedFirm,
        showDropdown,
        setShowDropdown,
        openDropdown,
        dismissDropdown,
        searchLoading,
        loadingMore,
        hasMore,
        handleListScroll,
        clearSelection,
        loadPartiesOnFocus,
        reset,
    };
};

/** Client / Agent / CA search for journal transfers. */
const useJournalPartySearch = (partyType, enabled, excludeParty = null, options = {}) => {
    const { fetchOnFocusOnly = false } = options;
    const [searchTerm, setSearchTerm] = useState('');
    const [parties, setParties] = useState([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(false);
    const [selectedParty, setSelectedParty] = useState(null);
    const [showDropdown, setShowDropdown] = useState(false);
    const dropdownActiveRef = useRef(false);
    const excludeType = String(excludeParty?.userType || '').trim();
    const excludeUsername = String(excludeParty?.username || '').trim();
    const pageRef = useRef(1);
    const hasMoreRef = useRef(false);
    const isLoadingMoreRef = useRef(false);
    const searchTermRef = useRef('');
    const searchRequestIdRef = useRef(0);

    const searchParties = useCallback(async (term, pageNum = 1, append = false) => {
        const requestId = ++searchRequestIdRef.current;
        const isFirstPage = pageNum === 1 && !append;

        if (isFirstPage) {
            setSearchLoading(true);
        } else {
            setLoadingMore(true);
            isLoadingMoreRef.current = true;
        }

        try {
            const { list, isLast } = await fetchJournalPartySearchPage(partyType, {
                search: term,
                page: pageNum,
            });
            if (requestId !== searchRequestIdRef.current) return;

            let mapped = (list || []).map((row) => mapRowToJournalParty(row, partyType));
            if (excludeUsername) {
                mapped = mapped.filter(
                    (p) => !(String(p.userType) === excludeType && String(p.username) === excludeUsername)
                );
            }

            if (append) {
                setParties((prev) => [...prev, ...mapped]);
            } else {
                setParties(mapped);
            }
            hasMoreRef.current = !isLast;
            setHasMore(!isLast);
            if (dropdownActiveRef.current) {
                setShowDropdown(true);
            }
        } catch (error) {
            if (requestId !== searchRequestIdRef.current) return;
            console.error(`Error searching ${partyType} parties:`, error);
            toast.error(error.response?.data?.message || error.message || `Failed to search ${JOURNAL_PARTY_TYPE_LABELS[partyType] || 'users'}`);
            if (!append) {
                setParties([]);
                if (dropdownActiveRef.current) {
                    setShowDropdown(false);
                }
            }
            hasMoreRef.current = false;
            setHasMore(false);
        } finally {
            if (requestId !== searchRequestIdRef.current) return;
            setSearchLoading(false);
            setLoadingMore(false);
            isLoadingMoreRef.current = false;
        }
    }, [partyType, excludeType, excludeUsername]);

    useEffect(() => {
        if (excludeUsername && selectedParty
            && String(selectedParty.username) === excludeUsername
            && String(selectedParty.userType || partyType) === excludeType) {
            setSelectedParty(null);
            setSearchTerm('');
            setParties([]);
            dropdownActiveRef.current = false;
            setShowDropdown(false);
        }
    }, [excludeType, excludeUsername, selectedParty, partyType]);

    useEffect(() => {
        searchTermRef.current = searchTerm;
    }, [searchTerm]);

    useEffect(() => {
        if (!enabled || selectedParty) return;
        const q = String(searchTerm || '').trim();
        if (fetchOnFocusOnly && q === '' && !dropdownActiveRef.current) return;

        setSearchLoading(true);
        setParties([]);

        const debounceTimer = setTimeout(() => {
            pageRef.current = 1;
            searchParties(searchTerm, 1, false);
        }, SEARCH_DEBOUNCE_MS);

        return () => clearTimeout(debounceTimer);
    }, [searchTerm, selectedParty, enabled, searchParties, fetchOnFocusOnly, partyType]);

    const openDropdown = useCallback(() => {
        dropdownActiveRef.current = true;
        setShowDropdown(true);
    }, []);

    const dismissDropdown = useCallback(() => {
        dropdownActiveRef.current = false;
        setShowDropdown(false);
    }, []);

    const loadPartiesOnFocus = useCallback(() => {
        openDropdown();
        const q = String(searchTermRef.current || '').trim();
        if (q === '') {
            pageRef.current = 1;
            setSearchLoading(true);
            setParties([]);
            searchParties('', 1, false);
        }
    }, [searchParties, openDropdown]);

    const handleListScroll = useCallback((e) => {
        const el = e.currentTarget;
        if (isLoadingMoreRef.current || !hasMoreRef.current || searchLoading) return;
        if (el.scrollTop + el.clientHeight >= el.scrollHeight - 40) {
            isLoadingMoreRef.current = true;
            const nextPage = pageRef.current + 1;
            pageRef.current = nextPage;
            searchParties(searchTermRef.current, nextPage, true);
        }
    }, [searchParties, searchLoading]);

    const clearSelection = useCallback(() => {
        setSelectedParty(null);
        setSearchTerm('');
        pageRef.current = 1;
        searchTermRef.current = '';
        dropdownActiveRef.current = true;
        setSearchLoading(true);
        setParties([]);
        searchParties('', 1, false);
    }, [searchParties]);

    const reset = useCallback(() => {
        searchRequestIdRef.current += 1;
        setSearchTerm('');
        setParties([]);
        setSelectedParty(null);
        dropdownActiveRef.current = false;
        setShowDropdown(false);
        setSearchLoading(false);
        setLoadingMore(false);
        pageRef.current = 1;
        hasMoreRef.current = false;
        setHasMore(false);
        searchTermRef.current = '';
    }, []);

    return {
        searchTerm,
        setSearchTerm,
        parties,
        setParties,
        selectedParty,
        setSelectedParty,
        showDropdown,
        setShowDropdown,
        openDropdown,
        dismissDropdown,
        searchLoading,
        loadingMore,
        hasMore,
        handleListScroll,
        clearSelection,
        loadPartiesOnFocus,
        reset,
    };
};

const JournalPartyTypeToggle = ({ value, onChange, disabled = false }) => (
    <div className="flex rounded-md border border-slate-200 bg-white p-0.5 w-fit" role="group" aria-label="User type">
        {['client', 'agent', 'ca'].map((type) => (
            <button
                key={type}
                type="button"
                disabled={disabled}
                onClick={() => onChange(type)}
                className={`px-2.5 py-1 text-xs font-medium rounded transition-colors disabled:opacity-50 ${value === type ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
                    }`}
            >
                {JOURNAL_PARTY_TYPE_LABELS[type]}
            </button>
        ))}
    </div>
);

const JournalPartySearchFields = ({
    variant = 'receive',
    label = 'From user',
    partyType = 'client',
    onPartyTypeChange,
    showTypeToggle = true,
    lockedParty = null,
    readOnly = false,
    searchTerm,
    setSearchTerm,
    parties,
    setParties,
    showDropdown,
    setShowDropdown,
    openDropdown,
    dismissDropdown,
    searchLoading,
    loadingMore = false,
    handleListScroll,
    clearSelection,
    onSearchFocus,
    selectedParty,
    setSelectedParty,
    formatCurrency,
    hideSearchHint = false,
    compact = false,
    focusAccent = 'indigo',
}) => {
    const wrapperRef = useRef(null);
    const closeDropdown = dismissDropdown || (() => setShowDropdown(false));
    const revealDropdown = openDropdown || (() => setShowDropdown(true));
    const showSearchUi = !lockedParty && !selectedParty;
    const labelClass = compact ? COMPACT_LABEL : 'block text-sm font-medium text-slate-700 mb-1';
    const rootSpace = compact ? 'space-y-1.5' : 'space-y-2';
    const listMaxH = compact ? 'max-h-56' : 'max-h-60';

    useClickOutside(wrapperRef, closeDropdown, showSearchUi && showDropdown);

    const itemHover = variant === 'payment' ? 'hover:bg-red-50' : 'hover:bg-indigo-50';
    const fmtBal = (v) => (typeof formatCurrency === 'function' ? formatCurrency(v ?? 0) : String(v ?? 0));
    const previewParty = lockedParty || selectedParty;
    const listOpen = showSearchUi && showDropdown;
    const emptyLabel = JOURNAL_PARTY_EMPTY_LABELS[partyType] || 'No users found';

    if (lockedParty) {
        return (
            <div className={rootSpace}>
                <label className={labelClass}>
                    {label} {!readOnly && <span className="text-red-500">*</span>}
                </label>
                <TransactionClientPreviewCard
                    client={lockedParty}
                    formatCurrency={formatCurrency}
                    variant={variant}
                    readOnly={readOnly}
                    partyType={lockedParty?.userType || partyType}
                />
            </div>
        );
    }

    const handleChangeParty = () => {
        if (typeof clearSelection === 'function') {
            clearSelection();
            return;
        }
        setSelectedParty(null);
        setSearchTerm('');
        setParties([]);
        closeDropdown();
    };

    return (
        <div className={rootSpace}>
            <label className={labelClass}>
                {label} {!readOnly && <span className="text-red-500">*</span>}
            </label>
            {showTypeToggle && typeof onPartyTypeChange === 'function' ? (
                <JournalPartyTypeToggle value={partyType} onChange={onPartyTypeChange} />
            ) : null}
            {showSearchUi ? (
                <>
                    {!hideSearchHint && (
                        <p className="text-[10px] text-slate-500 mb-1">Search by name, mobile, email, or PAN.</p>
                    )}
                    <div ref={wrapperRef}>
                        <div className={`rounded-md border bg-white overflow-hidden transition-all ${getComboboxOpenClass(listOpen, focusAccent)}`}>
                            <div className="flex items-center gap-2 px-2.5 py-1.5">
                                <FiSearch className="w-3.5 h-3.5 text-slate-400 shrink-0" aria-hidden />
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => {
                                        revealDropdown();
                                        setSearchTerm(e.target.value);
                                    }}
                                    onFocus={() => {
                                        if (selectedParty) return;
                                        if (typeof onSearchFocus === 'function') {
                                            onSearchFocus();
                                            return;
                                        }
                                        if (parties.length > 0) revealDropdown();
                                    }}
                                    placeholder={`Search ${JOURNAL_PARTY_TYPE_LABELS[partyType] || 'user'}…`}
                                    className="flex-1 min-w-0 border-0 bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-0 py-0.5"
                                    autoComplete="off"
                                />
                                {searchLoading && listOpen ? (
                                    <ComboboxSearchSpinner />
                                ) : (
                                    <FiChevronDown
                                        className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-200 ${listOpen ? 'rotate-180' : ''}`}
                                        aria-hidden
                                    />
                                )}
                            </div>
                            {listOpen && (
                                <div
                                    className={`border-t border-slate-100 ${listMaxH} overflow-y-auto`}
                                    onScroll={handleListScroll}
                                >
                                    {searchLoading ? (
                                        <ClientSearchSkeletonRows rows={5} />
                                    ) : (
                                        <>
                                            {parties.map((client) => (
                                                <ClientSearchOptionRow
                                                    key={`${partyType}-${client.username}`}
                                                    client={client}
                                                    formatBalance={fmtBal}
                                                    itemHover={itemHover}
                                                    onSelect={() => {
                                                        setSelectedParty({ ...client, userType: partyType });
                                                        setSearchTerm(client.name || '');
                                                        closeDropdown();
                                                        setParties([]);
                                                    }}
                                                />
                                            ))}
                                            {loadingMore && <ClientSearchSkeletonRows rows={2} />}
                                        </>
                                    )}
                                    {!searchLoading && !loadingMore && parties.length === 0 && (
                                        <p className="px-2.5 py-3 text-xs text-center text-slate-500">{emptyLabel}</p>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </>
            ) : null}
            {previewParty ? (
                <TransactionClientPreviewCard
                    client={previewParty}
                    formatCurrency={formatCurrency}
                    variant={variant}
                    readOnly={readOnly}
                    onChange={!readOnly && !lockedParty ? handleChangeParty : undefined}
                    partyType={previewParty?.userType || partyType}
                />
            ) : null}
        </div>
    );
};

const FirmClientSearchFields = ({
    variant = 'receive',
    label = 'Client',
    lockedFirm = null,
    readOnly = false,
    searchTerm,
    setSearchTerm,
    firms,
    setFirms,
    showDropdown,
    setShowDropdown,
    openDropdown,
    dismissDropdown,
    searchLoading,
    loadingMore = false,
    handleListScroll,
    clearSelection,
    onSearchFocus,
    selectedFirm,
    setSelectedFirm,
    formatCurrency,
    hideSearchHint = false,
    compact = false,
    focusAccent = 'blue',
    searchPlaceholder = 'Name, mobile, email, or PAN',
    searchHint = 'Search by name, mobile, email, or PAN.',
    emptyMessage = 'No clients found',
    showPartyType = false,
    getRowKey = (client) => client.username,
}) => {
    const wrapperRef = useRef(null);
    const closeDropdown = dismissDropdown || (() => setShowDropdown(false));
    const revealDropdown = openDropdown || (() => setShowDropdown(true));
    const showSearchUi = !lockedFirm && !selectedFirm;
    const labelClass = compact ? COMPACT_LABEL : 'block text-sm font-medium text-slate-700 mb-1';
    const rootSpace = compact ? 'space-y-1.5' : 'space-y-2';
    const listMaxH = compact ? 'max-h-56' : 'max-h-60';

    useClickOutside(wrapperRef, closeDropdown, showSearchUi && showDropdown);

    const itemHover = variant === 'payment' ? 'hover:bg-red-50' : 'hover:bg-blue-50';
    const fmtBal = (v) => (typeof formatCurrency === 'function' ? formatCurrency(v ?? 0) : String(v ?? 0));
    const previewFirm = lockedFirm || selectedFirm;
    const listOpen = showSearchUi && showDropdown;

    if (lockedFirm) {
        return (
            <div className={rootSpace}>
                <label className={labelClass}>
                    {label} {!readOnly && <span className="text-red-500">*</span>}
                </label>
                <TransactionClientPreviewCard
                    client={lockedFirm}
                    formatCurrency={formatCurrency}
                    variant={variant}
                    readOnly={readOnly}
                    partyType={lockedFirm?.userType || ''}
                />
            </div>
        );
    }

    const handleChangeClient = () => {
        if (typeof clearSelection === 'function') {
            clearSelection();
            return;
        }
        setSelectedFirm(null);
        setSearchTerm('');
        setFirms([]);
        closeDropdown();
    };

    return (
        <div className={rootSpace}>
            <label className={labelClass}>
                {label} {!readOnly && <span className="text-red-500">*</span>}
            </label>
            {showSearchUi ? (
                <>
                    {!hideSearchHint && (
                        <p className="text-[10px] text-slate-500 mb-1">{searchHint}</p>
                    )}
                    <div ref={wrapperRef}>
                        <div className={`rounded-md border bg-white overflow-hidden transition-all ${getComboboxOpenClass(listOpen, focusAccent)}`}>
                            <div className="flex items-center gap-2 px-2.5 py-1.5">
                                <FiSearch className="w-3.5 h-3.5 text-slate-400 shrink-0" aria-hidden />
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => {
                                        revealDropdown();
                                        setSearchTerm(e.target.value);
                                    }}
                                    onFocus={() => {
                                        if (selectedFirm) return;
                                        if (typeof onSearchFocus === 'function') {
                                            onSearchFocus();
                                            return;
                                        }
                                        if (firms.length > 0) revealDropdown();
                                    }}
                                    placeholder={searchPlaceholder}
                                    className="flex-1 min-w-0 border-0 bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-0 py-0.5"
                                    autoComplete="off"
                                />
                                {searchLoading && listOpen ? (
                                    <ComboboxSearchSpinner />
                                ) : (
                                    <FiChevronDown
                                        className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-200 ${listOpen ? 'rotate-180' : ''}`}
                                        aria-hidden
                                    />
                                )}
                            </div>
                            {listOpen && (
                                <div
                                    className={`border-t border-slate-100 ${listMaxH} overflow-y-auto`}
                                    onScroll={handleListScroll}
                                >
                                    {searchLoading ? (
                                        <ClientSearchSkeletonRows rows={5} />
                                    ) : (
                                        <>
                                            {firms.map((client) => (
                                                <ClientSearchOptionRow
                                                    key={getRowKey(client)}
                                                    client={client}
                                                    formatBalance={fmtBal}
                                                    itemHover={itemHover}
                                                    showPartyType={showPartyType}
                                                    onSelect={() => {
                                                        setSelectedFirm(client);
                                                        setSearchTerm(client.name || '');
                                                        closeDropdown();
                                                        setFirms([]);
                                                    }}
                                                />
                                            ))}
                                            {loadingMore && <ClientSearchSkeletonRows rows={2} />}
                                        </>
                                    )}
                                    {!searchLoading && !loadingMore && firms.length === 0 && (
                                        <p className="px-2.5 py-3 text-xs text-center text-slate-500">{emptyMessage}</p>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </>
            ) : null}
            {previewFirm ? (
                <TransactionClientPreviewCard
                    client={previewFirm}
                    formatCurrency={formatCurrency}
                    variant={variant}
                    readOnly={readOnly}
                    onChange={!readOnly && !lockedFirm ? handleChangeClient : undefined}
                    partyType={previewFirm?.userType || ''}
                />
            ) : null}
        </div>
    );
};

// Receive Modal - API Integrated with Bank Search
export const ReceiveModal = ({ isOpen, onClose, bankDetails, bankId, onSubmit, formatCurrency, summary, clientUsername, clientName, showClient = true, showBank = true, showSummary = true, bankPageClientLookup = false, partyType = 'client', partyLabel = 'client', editRecord = null }) => {
    const [loading, setLoading] = useState(false);
    const [selectedBank, setSelectedBank] = useState(bankDetails || (bankId ? { bank_id: bankId, bank: 'Selected Bank' } : null));
    const [showBankSearch, setShowBankSearch] = useState(false);
    const [transactionDate, setTransactionDate] = useState(new Date().toISOString().split('T')[0]);
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [sendEmail, setSendEmail] = useState(true);
    const [sendSms, setSendSms] = useState(true);
    const [sendWhatsApp, setSendWhatsApp] = useState(true);
    const [notificationLoading, setNotificationLoading] = useState(false);
    const [channelStatus, setChannelStatus] = useState(DEFAULT_NOTIFICATION_CHANNEL_STATUS);
    const hasPresetClient = Boolean(String(clientUsername || '').trim());
    const hasPresetBank = Boolean(String(bankId || '').trim());
    const shouldShowClientSelector = bankPageClientLookup || !hasPresetClient;
    const shouldShowBankSelector = !hasPresetBank;
    const firmLookup = useTransactionPartySearch(RECEIVE_PARTY_SEARCH_TYPES, Boolean(shouldShowClientSelector), { fetchOnFocusOnly: true });
    const receiveFieldClass = getCompactFieldClass('blue');
    const todayIso = useMemo(() => new Date().toISOString().split('T')[0], []);
    const isEditMode = Boolean(editRecord?.transaction_id);

    useEffect(() => {
        if (!isOpen) return;
        if (isEditMode) {
            setTransactionDate(toIsoDateOnly(editRecord.transaction_date));
            setAmount(String(editRecord.amount ?? ''));
            setDescription(editRecord.remark || '');
            setLoading(false);
            const toBank = mapBankPartyToSelection(editRecord.payment_to);
            const fromFirm = mapUserPartyToFirm(editRecord.payment_from);
            if (toBank && !hasPresetBank) setSelectedBank(toBank);
            if (fromFirm?.username && shouldShowClientSelector) firmLookup.setSelectedFirm(fromFirm);
            return;
        }
        setSelectedBank(bankDetails || (bankId ? { bank_id: bankId, bank: 'Selected Bank' } : null));
        setShowBankSearch(false);
        setTransactionDate(new Date().toISOString().split('T')[0]);
        setAmount('');
        setDescription('');
        setLoading(false);
        setSendEmail(true);
        setSendSms(true);
        setSendWhatsApp(true);
        if (shouldShowClientSelector) firmLookup.reset();
    }, [isOpen, shouldShowClientSelector, isEditMode, editRecord]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (!isOpen || isEditMode) return undefined;
        let cancelled = false;

        const loadNotificationAvailability = async () => {
            setNotificationLoading(true);
            try {
                const response = await axios.get(
                    `${API_BASE_URL}/utils/notification-availability`,
                    {
                        params: { type: 'receive' },
                        headers: getHeaders(),
                    }
                );

                const channels = ensureChannelStatusShape(response.data?.data?.channels);
                if (cancelled) return;
                setChannelStatus(channels);
                if (!channels.sms.available) setSendSms(false);
                if (!channels.whatsapp.available) setSendWhatsApp(false);
                if (!channels.email.available) setSendEmail(false);
            } catch (error) {
                if (cancelled) return;
                setChannelStatus({
                    sms: { available: false, reason: 'Failed to check SMS availability' },
                    whatsapp: { available: false, reason: 'Failed to check WhatsApp availability' },
                    email: { available: false, reason: 'Failed to check email availability' },
                });
                setSendSms(false);
                setSendWhatsApp(false);
                setSendEmail(false);
            } finally {
                if (!cancelled) setNotificationLoading(false);
            }
        };

        loadNotificationAvailability();
        return () => {
            cancelled = true;
        };
    }, [isOpen, isEditMode]);

    const resolveReceiveBank = useCallback(() => {
        if (hasPresetBank) {
            return bankDetails || (bankId ? { bank_id: bankId, bank: 'Selected Bank' } : null);
        }
        return selectedBank;
    }, [hasPresetBank, bankDetails, bankId, selectedBank]);

    const submitReceive = useCallback(async () => {
        if (loading) return;

        const effectiveBank = resolveReceiveBank();
        if (!effectiveBank?.bank_id) {
            toast.error('Please select a bank');
            return;
        }

        if (!hasPresetClient && !firmLookup.selectedFirm) {
            toast.error('Please select a party');
            return;
        }

        const parsedAmount = parseDecimalValue(amount);
        const date = transactionDate;
        const remarkText = String(description || '').trim();

        if (!parsedAmount || parsedAmount <= 0) {
            toast.error('Please enter a valid amount');
            return;
        }

        if (!date) {
            toast.error('Please select a date');
            return;
        }

        setLoading(true);

        const selectedParty = firmLookup.selectedFirm;
        const resolved = hasPresetClient
            ? { party_id: clientUsername, party_type: partyType, name: clientName }
            : resolveTransactionPartySelection(selectedParty);
        const resolvedParty1 = resolved.party_id;
        const resolvedName = resolved.name;
        const resolvedParty1Type = resolved.party_type;
        const party2BankId = effectiveBank.bank_id;

        const payload = {
            amount: parsedAmount,
            party1_id: resolvedParty1,
            party1_type: resolvedParty1Type,
            party2_id: party2BankId,
            party2_type: 'bank',
            remark: remarkText || `Payment received from ${resolvedName}`,
            transaction_date: date,
            notification: {
                email: sendEmail,
                sms: sendSms,
                whatsapp: sendWhatsApp,
            },
        };

        try {
            const response = isEditMode
                ? await axios.put(
                    `${API_BASE_URL}/transaction/payment/receive/edit`,
                    { ...payload, transaction_id: editRecord.transaction_id },
                    { headers: getHeaders() }
                )
                : await axios.post(
                    `${API_BASE_URL}/transaction/payment/receive`,
                    payload,
                    { headers: getHeaders() }
                );

            if (response.data.success) {
                toast.success(response.data.message || (isEditMode ? 'Payment receive updated successfully' : 'Payment received successfully'));
                if (onSubmit) {
                    onSubmit('RECEIVE', response.data.data);
                }
                onClose();
                if (!hasPresetBank) {
                    setSelectedBank(bankDetails || null);
                    setShowBankSearch(false);
                }
            } else {
                toast.error(response.data.message || 'Failed to receive payment');
            }
        } catch (error) {
            console.error('Error creating receive transaction:', error);
            const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to create receive transaction';
            toast.error(errorMessage);
        } finally {
            setLoading(false);
        }
    }, [
        loading,
        resolveReceiveBank,
        hasPresetClient,
        firmLookup.selectedFirm,
        partyLabel,
        amount,
        transactionDate,
        description,
        clientUsername,
        clientName,
        partyType,
        hasPresetBank,
        bankDetails,
        onSubmit,
        onClose,
        isEditMode,
        editRecord,
        sendEmail,
        sendSms,
        sendWhatsApp,
    ]);

    const handleSubmit = (e) => {
        e.preventDefault();
        submitReceive();
    };

    const hasSelectedBank = Boolean(resolveReceiveBank()?.bank_id);
    const isReceiveFormValid =
        hasSelectedBank &&
        Boolean(transactionDate) &&
        parseDecimalValue(amount) > 0 &&
        (hasPresetClient || Boolean(firmLookup.selectedFirm));
    const selectedClientDisplayName = hasPresetClient ? clientName : (firmLookup.selectedFirm?.name || 'Selected party');
    const effectiveReceiveBank = resolveReceiveBank();
    const selectedBankDisplayName = effectiveReceiveBank
        ? getBankPrimaryLabel(effectiveReceiveBank)
        : (bankId ? `Bank #${bankId}` : '—');
    const shouldShowReceiveSummary = showSummary && hasSelectedBank && (hasPresetClient || Boolean(firmLookup.selectedFirm));

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            title={isEditMode ? 'Edit Receive Payment' : 'Receive Payment'}
            maxWidth="max-w-3xl"
            compact
            closeOnOverlayClick={false}
            accent="receive"
            titleIcon={<span className="text-base font-bold leading-none" aria-hidden>₹</span>}
            footer={(
                <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
                    {!isEditMode && (
                        <TransactionNotifyCheckboxes
                            sendSms={sendSms}
                            setSendSms={setSendSms}
                            sendWhatsApp={sendWhatsApp}
                            setSendWhatsApp={setSendWhatsApp}
                            sendEmail={sendEmail}
                            setSendEmail={setSendEmail}
                            channelStatus={channelStatus}
                            loading={notificationLoading}
                        />
                    )}
                    <div className={`flex items-center justify-end gap-2 shrink-0 ${isEditMode ? 'w-full' : ''}`}>
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={loading}
                            className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 rounded-md text-xs font-medium hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-500/30 disabled:opacity-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            disabled={loading || !isReceiveFormValid}
                            onClick={submitReceive}
                            className="px-3 py-1.5 bg-blue-600 text-white rounded-md text-xs font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/40 disabled:opacity-50 disabled:cursor-not-allowed transition-colors inline-flex items-center justify-center min-w-[110px]"
                        >
                            {loading ? 'Processing…' : (isEditMode ? 'Update Payment' : 'Receive Payment')}
                        </button>
                    </div>
                </div>
            )}
        >
            <form id="receive-form" onSubmit={handleSubmit} noValidate className="space-y-3">
                {showBank && shouldShowBankSelector && (
                    <div>
                        <label className={COMPACT_LABEL}>
                            Bank Account <span className="text-red-500">*</span>
                        </label>
                        {(!selectedBank || showBankSearch) ? (
                            <BankSearchDropdown
                                compact
                                focusAccent="blue"
                                onSelect={(bank) => {
                                    setSelectedBank(bank);
                                    setShowBankSearch(false);
                                }}
                                selectedBankId={selectedBank?.bank_id}
                            />
                        ) : (
                            <SaleBankPreviewCard
                                bank={selectedBank}
                                onChangeBank={() => setShowBankSearch(true)}
                                formatMoney={formatCurrency}
                                variant="receive"
                            />
                        )}
                    </div>
                )}
                {shouldShowClientSelector && (
                    <FirmClientSearchFields
                        variant="receive"
                        label="From"
                        formatCurrency={formatCurrency}
                        compact
                        hideSearchHint
                        focusAccent="blue"
                        searchPlaceholder="Search client, CA, agent, staff, or capital"
                        searchHint="Search client, CA, agent, staff, or capital."
                        emptyMessage="No parties found"
                        showPartyType
                        getRowKey={(party) => `${party.userType || 'client'}:${party.party_id || party.username}`}
                        searchTerm={firmLookup.searchTerm}
                        setSearchTerm={firmLookup.setSearchTerm}
                        firms={firmLookup.firms}
                        setFirms={firmLookup.setFirms}
                        showDropdown={firmLookup.showDropdown}
                        setShowDropdown={firmLookup.setShowDropdown}
                        openDropdown={firmLookup.openDropdown}
                        dismissDropdown={firmLookup.dismissDropdown}
                        searchLoading={firmLookup.searchLoading}
                        loadingMore={firmLookup.loadingMore}
                        handleListScroll={firmLookup.handleListScroll}
                        clearSelection={firmLookup.clearSelection}
                        onSearchFocus={firmLookup.loadPartiesOnFocus}
                        selectedFirm={firmLookup.selectedFirm}
                        setSelectedFirm={firmLookup.setSelectedFirm}
                    />
                )}

                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className={COMPACT_LABEL}>
                            Date <span className="text-red-500">*</span>
                        </label>
                        <DatePickerField
                            value={transactionDate}
                            onChange={(d) => {
                                const picked = String(d || '').trim();
                                if (!picked) {
                                    setTransactionDate('');
                                    return;
                                }
                                setTransactionDate(picked > todayIso ? todayIso : picked);
                            }}
                            mode="single"
                            hideTabs={true}
                            showResetButton={false}
                            placeholder="Select date"
                            buttonClassName={receiveFieldClass}
                            maxSelectableDate={todayIso}
                        />
                    </div>
                    <div>
                        <label className={COMPACT_LABEL}>
                            Amount <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            name="amount"
                            placeholder="0.00"
                            inputMode="decimal"
                            value={amount}
                            onChange={(e) => setAmount(sanitizeDecimalInput(e.target.value, 2))}
                            className={receiveFieldClass}
                        />
                    </div>
                </div>

                <div>
                    <label className={COMPACT_LABEL}>Description / Remark</label>
                    <textarea
                        name="description"
                        placeholder="Optional note"
                        rows="2"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className={`${receiveFieldClass} resize-none`}
                    />
                </div>

                {shouldShowReceiveSummary && (
                    <div className="rounded-md bg-blue-50 border border-blue-100 px-3 py-2 space-y-1">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-700/80">Summary</p>
                        <div className="flex items-center justify-between gap-2 text-xs">
                            <span className="text-slate-600">Receive from</span>
                            <span className="font-medium text-blue-700 truncate">{selectedClientDisplayName}</span>
                        </div>
                        <div className="flex items-center justify-between gap-2 text-xs">
                            <span className="text-slate-600">To bank</span>
                            <span className="font-medium text-slate-800 truncate">{selectedBankDisplayName}</span>
                        </div>
                    </div>
                )}
            </form>
        </BaseModal>
    );
};

// Payment Modal - API Integrated with Bank Search
export const PaymentModal = ({ isOpen, onClose, bankDetails, bankId, onSubmit, formatCurrency, summary, clientUsername, clientName, showClient = true, showBank = true, showSummary = true, bankPageClientLookup = false, partyType = 'client', partyLabel = 'client', editRecord = null }) => {
    const [loading, setLoading] = useState(false);
    const [selectedBank, setSelectedBank] = useState(bankDetails || (bankId ? { bank_id: bankId, bank: 'Selected Bank' } : null));
    const [showBankSearch, setShowBankSearch] = useState(false);
    const [transactionDate, setTransactionDate] = useState(new Date().toISOString().split('T')[0]);
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [sendEmail, setSendEmail] = useState(true);
    const [sendSms, setSendSms] = useState(true);
    const [sendWhatsApp, setSendWhatsApp] = useState(true);
    const [notificationLoading, setNotificationLoading] = useState(false);
    const [channelStatus, setChannelStatus] = useState(DEFAULT_NOTIFICATION_CHANNEL_STATUS);
    const hasPresetClient = Boolean(String(clientUsername || '').trim());
    const hasPresetBank = Boolean(String(bankId || '').trim());
    const shouldShowClientSelector = bankPageClientLookup || !hasPresetClient;
    const shouldShowBankSelector = !hasPresetBank;
    const firmLookup = useTransactionPartySearch(PAYMENT_PARTY_SEARCH_TYPES, Boolean(shouldShowClientSelector), { fetchOnFocusOnly: true });
    const paymentFieldClass = getCompactFieldClass('red');
    const todayIso = useMemo(() => new Date().toISOString().split('T')[0], []);
    const isEditMode = Boolean(editRecord?.transaction_id);

    // Reset all fields every time the modal opens
    useEffect(() => {
        if (!isOpen) return;
        if (isEditMode) {
            setTransactionDate(toIsoDateOnly(editRecord.transaction_date));
            setAmount(String(editRecord.amount ?? ''));
            setDescription(editRecord.remark || '');
            setLoading(false);
            const fromBank = mapBankPartyToSelection(editRecord.payment_from);
            const toFirm = mapUserPartyToFirm(editRecord.payment_to);
            if (fromBank && !hasPresetBank) setSelectedBank(fromBank);
            if (toFirm?.username && shouldShowClientSelector) firmLookup.setSelectedFirm(toFirm);
            return;
        }
        setSelectedBank(bankDetails || (bankId ? { bank_id: bankId, bank: 'Selected Bank' } : null));
        setShowBankSearch(false);
        setTransactionDate(new Date().toISOString().split('T')[0]);
        setAmount('');
        setDescription('');
        setLoading(false);
        setSendEmail(true);
        setSendSms(true);
        setSendWhatsApp(true);
        if (shouldShowClientSelector) firmLookup.reset();
    }, [isOpen, shouldShowClientSelector, isEditMode, editRecord]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (!isOpen || isEditMode) return undefined;
        let cancelled = false;

        const loadNotificationAvailability = async () => {
            setNotificationLoading(true);
            try {
                const response = await axios.get(
                    `${API_BASE_URL}/utils/notification-availability`,
                    {
                        params: { type: 'payment' },
                        headers: getHeaders(),
                    }
                );

                const channels = ensureChannelStatusShape(response.data?.data?.channels);
                if (cancelled) return;
                setChannelStatus(channels);
                if (!channels.sms.available) setSendSms(false);
                if (!channels.whatsapp.available) setSendWhatsApp(false);
                if (!channels.email.available) setSendEmail(false);
            } catch (error) {
                if (cancelled) return;
                setChannelStatus({
                    sms: { available: false, reason: 'Failed to check SMS availability' },
                    whatsapp: { available: false, reason: 'Failed to check WhatsApp availability' },
                    email: { available: false, reason: 'Failed to check email availability' },
                });
                setSendSms(false);
                setSendWhatsApp(false);
                setSendEmail(false);
            } finally {
                if (!cancelled) setNotificationLoading(false);
            }
        };

        loadNotificationAvailability();
        return () => {
            cancelled = true;
        };
    }, [isOpen, isEditMode]);

    const resolvePaymentBank = useCallback(() => {
        if (hasPresetBank) {
            return bankDetails || (bankId ? { bank_id: bankId, bank: 'Selected Bank' } : null);
        }
        return selectedBank;
    }, [hasPresetBank, bankDetails, bankId, selectedBank]);

    const submitPayment = useCallback(async () => {
        if (loading) return;

        const effectiveBank = resolvePaymentBank();
        if (!effectiveBank?.bank_id) {
            toast.error('Please select a bank');
            return;
        }

        if (!hasPresetClient && !firmLookup.selectedFirm) {
            toast.error('Please select a party');
            return;
        }

        const parsedAmount = parseDecimalValue(amount);
        const date = transactionDate;
        const remarkText = String(description || '').trim();

        if (!parsedAmount || parsedAmount <= 0) {
            toast.error('Please enter a valid amount');
            return;
        }

        if (!date) {
            toast.error('Please select a date');
            return;
        }

        setLoading(true);

        const selectedParty = firmLookup.selectedFirm;
        const resolved = hasPresetClient
            ? { party_id: clientUsername, party_type: partyType, name: clientName }
            : resolveTransactionPartySelection(selectedParty);
        const resolvedParty2 = resolved.party_id;
        const resolvedName = resolved.name;
        const resolvedParty2Type = resolved.party_type;
        const party1BankId = effectiveBank.bank_id;

        const payload = {
            amount: parsedAmount,
            party1_id: party1BankId,
            party1_type: 'bank',
            party2_id: resolvedParty2,
            party2_type: resolvedParty2Type,
            remark: remarkText || `Payment made to ${resolvedName}`,
            transaction_date: date,
            notification: {
                email: sendEmail,
                sms: sendSms,
                whatsapp: sendWhatsApp,
            },
        };

        try {
            const response = isEditMode
                ? await axios.put(
                    `${API_BASE_URL}/transaction/payment/payment/edit`,
                    { ...payload, transaction_id: editRecord.transaction_id },
                    { headers: getHeaders() }
                )
                : await axios.post(
                    `${API_BASE_URL}/transaction/payment/payment`,
                    payload,
                    { headers: getHeaders() }
                );

            if (response.data.success) {
                toast.success(response.data.message || (isEditMode ? 'Payment updated successfully' : 'Payment made successfully'));
                if (onSubmit) {
                    onSubmit('PAYMENT', response.data.data);
                }
                onClose();
                if (!hasPresetBank) {
                    setSelectedBank(bankDetails || null);
                    setShowBankSearch(false);
                }
            } else {
                toast.error(response.data.message || 'Payment failed');
            }
        } catch (error) {
            console.error('Error creating payment transaction:', error);
            const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to create payment transaction';
            toast.error(errorMessage);
        } finally {
            setLoading(false);
        }
    }, [
        loading,
        resolvePaymentBank,
        hasPresetClient,
        firmLookup.selectedFirm,
        partyLabel,
        amount,
        transactionDate,
        description,
        clientUsername,
        clientName,
        partyType,
        hasPresetBank,
        bankDetails,
        onSubmit,
        onClose,
        isEditMode,
        editRecord,
        sendEmail,
        sendSms,
        sendWhatsApp,
    ]);

    const handleSubmit = (e) => {
        e.preventDefault();
        submitPayment();
    };

    const hasSelectedBank = Boolean(resolvePaymentBank()?.bank_id);
    const isPaymentFormValid =
        hasSelectedBank &&
        Boolean(transactionDate) &&
        parseDecimalValue(amount) > 0 &&
        (hasPresetClient || Boolean(firmLookup.selectedFirm));
    const selectedClientDisplayName = hasPresetClient ? clientName : (firmLookup.selectedFirm?.name || 'Selected party');
    const effectivePaymentBank = resolvePaymentBank();
    const selectedBankDisplayName = effectivePaymentBank
        ? getBankPrimaryLabel(effectivePaymentBank)
        : (bankId ? `Bank #${bankId}` : '—');
    const shouldShowPaymentSummary = showSummary && (hasPresetBank || Boolean(selectedBank)) && (hasPresetClient || Boolean(firmLookup.selectedFirm));

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            title={isEditMode ? 'Edit Payment' : 'Make Payment'}
            maxWidth="max-w-3xl"
            compact
            closeOnOverlayClick={false}
            accent="payment"
            titleIcon={<span className="text-base font-bold leading-none" aria-hidden>₹</span>}
            footer={(
                <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
                    {!isEditMode && (
                        <TransactionNotifyCheckboxes
                            sendSms={sendSms}
                            setSendSms={setSendSms}
                            sendWhatsApp={sendWhatsApp}
                            setSendWhatsApp={setSendWhatsApp}
                            sendEmail={sendEmail}
                            setSendEmail={setSendEmail}
                            channelStatus={channelStatus}
                            loading={notificationLoading}
                        />
                    )}
                    <div className={`flex items-center justify-end gap-2 shrink-0 ${isEditMode ? 'w-full' : ''}`}>
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={loading}
                            className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 rounded-md text-xs font-medium hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-500/30 disabled:opacity-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            disabled={loading || !isPaymentFormValid}
                            onClick={submitPayment}
                            className="px-3 py-1.5 bg-red-600 text-white rounded-md text-xs font-medium hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500/40 disabled:opacity-50 disabled:cursor-not-allowed transition-colors inline-flex items-center justify-center min-w-[110px]"
                        >
                            {loading ? 'Processing…' : (isEditMode ? 'Update Payment' : 'Make Payment')}
                        </button>
                    </div>
                </div>
            )}
        >
            <form id="payment-form" onSubmit={handleSubmit} noValidate className="space-y-3">
                {showBank && shouldShowBankSelector && (
                    <div>
                        <label className={COMPACT_LABEL}>
                            Bank Account <span className="text-red-500">*</span>
                        </label>
                        {(!selectedBank || showBankSearch) ? (
                            <BankSearchDropdown
                                compact
                                focusAccent="red"
                                onSelect={(bank) => {
                                    setSelectedBank(bank);
                                    setShowBankSearch(false);
                                }}
                                selectedBankId={selectedBank?.bank_id}
                            />
                        ) : (
                            <SaleBankPreviewCard
                                bank={selectedBank}
                                onChangeBank={() => setShowBankSearch(true)}
                                formatMoney={formatCurrency}
                                variant="payment"
                            />
                        )}
                    </div>
                )}
                {shouldShowClientSelector && (
                    <FirmClientSearchFields
                        variant="payment"
                        label="To"
                        formatCurrency={formatCurrency}
                        compact
                        hideSearchHint
                        focusAccent="red"
                        searchPlaceholder="Search client, CA, agent, staff, capital, or expense"
                        searchHint="Search client, CA, agent, staff, capital, or expense."
                        emptyMessage="No parties found"
                        showPartyType
                        getRowKey={(party) => `${party.userType || 'client'}:${party.party_id || party.username}`}
                        searchTerm={firmLookup.searchTerm}
                        setSearchTerm={firmLookup.setSearchTerm}
                        firms={firmLookup.firms}
                        setFirms={firmLookup.setFirms}
                        showDropdown={firmLookup.showDropdown}
                        setShowDropdown={firmLookup.setShowDropdown}
                        openDropdown={firmLookup.openDropdown}
                        dismissDropdown={firmLookup.dismissDropdown}
                        searchLoading={firmLookup.searchLoading}
                        loadingMore={firmLookup.loadingMore}
                        handleListScroll={firmLookup.handleListScroll}
                        clearSelection={firmLookup.clearSelection}
                        onSearchFocus={firmLookup.loadPartiesOnFocus}
                        selectedFirm={firmLookup.selectedFirm}
                        setSelectedFirm={firmLookup.setSelectedFirm}
                    />
                )}

                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className={COMPACT_LABEL}>
                            Date <span className="text-red-500">*</span>
                        </label>
                        <DatePickerField
                            value={transactionDate}
                            onChange={(d) => {
                                const picked = String(d || '').trim();
                                if (!picked) {
                                    setTransactionDate('');
                                    return;
                                }
                                setTransactionDate(picked > todayIso ? todayIso : picked);
                            }}
                            mode="single"
                            hideTabs={true}
                            showResetButton={false}
                            placeholder="Select date"
                            buttonClassName={paymentFieldClass}
                            maxSelectableDate={todayIso}
                        />
                    </div>
                    <div>
                        <label className={COMPACT_LABEL}>
                            Amount <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            name="amount"
                            placeholder="0.00"
                            inputMode="decimal"
                            value={amount}
                            onChange={(e) => setAmount(sanitizeDecimalInput(e.target.value, 2))}
                            className={paymentFieldClass}
                        />
                    </div>
                </div>

                <div>
                    <label className={COMPACT_LABEL}>Description / Remark</label>
                    <textarea
                        name="description"
                        placeholder="Optional note"
                        rows="2"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className={`${paymentFieldClass} resize-none`}
                    />
                </div>

                {shouldShowPaymentSummary && (
                    <div className="rounded-md bg-red-50 border border-red-100 px-3 py-2 space-y-1">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-red-700/80">Summary</p>
                        <div className="flex items-center justify-between gap-2 text-xs">
                            <span className="text-slate-600">Payment from</span>
                            <span className="font-medium text-slate-800 truncate">{selectedBankDisplayName}</span>
                        </div>
                        <div className="flex items-center justify-between gap-2 text-xs">
                            <span className="text-slate-600">Payment to</span>
                            <span className="font-medium text-red-700 truncate">{selectedClientDisplayName}</span>
                        </div>
                    </div>
                )}
            </form>
        </BaseModal>
    );
};

/**
 * Sale invoice form — modal or inline.
 *
 * Party behaviour:
 * - Voucher-style: omit `lockedPartyType`, keep `hidePartySelector` false — user searches party via /transaction/search-party.
 * - Ledger-style: set `lockedPartyType`, `hidePartySelector`, and `fixedParty` — party is implied; no search UI.
 *
 * @typedef {Object} SaleFormFixedParty
 * @property {string|number} id — firm/client id or bank_id for API
 * @property {string} [name] — display name
 * @property {string} [username] — required for user sale API when id is firm id
 * @property {string} [email] — optional display
 * @property {string} [contact] — optional display
 * @property {string} [account] — bank display
 * @property {string} [holder] — bank display
 *
 * @param {Object} props
 * @param {boolean} [props.isOpen]
 * @param {() => void} [props.onClose]
 * @param {(data: object) => void} [props.onSuccess]
 * @param {string} [props.initialPartyId] — seed party id when selector is shown
 * @param {'modal'|'inline'} [props.mode]
 * @param {'client'|'ca'|'staff'|'agent'|'bank'|'capital'|null} [props.lockedPartyType] — lock party type when selector hidden
 * @param {'user'|'bank'|null} [props.lockedSaleType] — deprecated alias for lockedPartyType
 * @param {boolean} [props.hidePartySelector] — hide search/dropdown; use `fixedParty` + id for submit
 * @param {SaleFormFixedParty|null} [props.fixedParty] — party row when selector hidden (name, id, username, …)
 * @param {boolean} [props.showFixedPartyBanner] — when selector hidden, show summary card (default true)
 * @param {string} [props.fixedPartyBannerTitle] — e.g. "Client" / "Bank account"
 * @param {string} [props.partyBannerSubtitle] — extra line under name
 * @param {string} [props.modalTitle] — BaseModal title (modal mode)
 * @param {string} [props.modalMaxWidth] — BaseModal max width class
 * @param {boolean} [props.closeOnOverlayClick]
 * @param {boolean} [props.showNotificationToggles] — email / WhatsApp in footer
 * @param {React.ReactNode} [props.aboveForm] — inserted above the party/date block
 * @param {React.ReactNode} [props.belowPartySection] — between party block and services
 * @param {string} [props.formClassName] — appended to `<form>` class (modal adds space-y-5 by default)
 * @param {string} [props.submitButtonLabel] — override primary submit label (modal footer)
 */
export const SaleForm = ({
    isOpen = false,
    onClose = () => { },
    onSuccess = () => { },
    initialPartyId = '',
    mode = 'modal',
    defaultSaleType = 'user',
    lockedSaleType = null,
    lockedPartyType: lockedPartyTypeProp = null,
    hidePartySelector = false,
    fixedParty = null,
    showSaleTypeToggle: _showSaleTypeToggle,
    showFixedPartyBanner = true,
    fixedPartyBannerTitle,
    partyBannerSubtitle = '',
    modalTitle = 'Create Sale Invoice',
    modalMaxWidth = 'max-w-4xl',
    closeOnOverlayClick = false,
    showNotificationToggles = true,
    aboveForm = null,
    belowPartySection = null,
    formClassName = '',
    submitButtonLabel = '',
    summary = null,
    formatCurrency: formatCurrencyProp = null,
}) => {
    const lockedPartyType = normalizeLockedPartyType(lockedPartyTypeProp, lockedSaleType);
    const shouldShowPartySelector = !hidePartySelector;
    const partyLookup = useTransactionPartySearch(
        SALE_PARTY_SEARCH_TYPES,
        Boolean(shouldShowPartySelector && isOpen),
        { fetchOnFocusOnly: true }
    );
    const lockedPartySelection = useMemo(
        () => (hidePartySelector && fixedParty ? mapFixedPartyToSelection(fixedParty, lockedPartyType) : null),
        [hidePartySelector, fixedParty, lockedPartyType]
    );

    const [formData, setFormData] = useState({
        payment_date: new Date().toISOString().split('T')[0],
        invoice_number: `INV-${Date.now().toString().slice(-6)}`,
        items: [{ service_id: '', description: '', price: '', amount: 0, remark: '' }],
        subtotal: 0,
        discount: '',
        discount_type: 'percentage',
        sgst_rate: appSettings.gst_applicable ? appSettings.default_gst_rate / 2 : 0,
        cgst_rate: appSettings.gst_applicable ? appSettings.default_gst_rate / 2 : 0,
        sgst_amount: 0,
        cgst_amount: 0,
        round_off: 0,
        grand_total: 0,
        notes: '',
        remark: '',
        tax_rate: appSettings.default_gst_rate,
        additional_charge: '',
        apply_round_off: false
    });

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [sendEmail, setSendEmail] = useState(true);
    const [sendSms, setSendSms] = useState(true);
    const [sendWhatsApp, setSendWhatsApp] = useState(true);
    const [serviceOptions, setServiceOptions] = useState([]);
    const [isLoadingServices, setIsLoadingServices] = useState(false);
    const [clientFirms, setClientFirms] = useState([]);
    const [selectedSaleFirmId, setSelectedSaleFirmId] = useState('');

    const todayIso = useMemo(() => new Date().toISOString().split('T')[0], []);

    const bannerTitle = fixedPartyBannerTitle
        ?? (lockedPartyType
            ? `${getPartyTypeLabel({ userType: lockedPartyType }, lockedPartyType)} (sale)`
            : 'Party');

    useEffect(() => {
        if (isOpen) {
            fetchServices();
        }
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;
        partyLookup.reset();
        setClientFirms([]);
        setSelectedSaleFirmId('');
        setFormData({
            payment_date: new Date().toISOString().split('T')[0],
            invoice_number: `INV-${Date.now().toString().slice(-6)}`,
            items: [{ service_id: '', description: '', price: '', amount: 0, remark: '' }],
            subtotal: 0,
            discount: '',
            discount_type: 'percentage',
            sgst_rate: appSettings.gst_applicable ? appSettings.default_gst_rate / 2 : 0,
            cgst_rate: appSettings.gst_applicable ? appSettings.default_gst_rate / 2 : 0,
            sgst_amount: 0,
            cgst_amount: 0,
            round_off: 0,
            grand_total: 0,
            notes: '',
            remark: '',
            tax_rate: appSettings.default_gst_rate,
            additional_charge: '',
            apply_round_off: false
        });
    }, [isOpen, initialPartyId, hidePartySelector, fixedParty?.id, fixedParty?.username, lockedPartyType]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        const party = partyLookup.selectedFirm;
        setSelectedSaleFirmId('');
        if (!party || party.userType !== 'client') {
            setClientFirms([]);
            return undefined;
        }
        const username = String(party.username || party.party_id || '').trim();
        if (!username) {
            setClientFirms([]);
            return undefined;
        }
        let cancelled = false;
        (async () => {
            try {
                const response = await axios.get(`${API_BASE_URL}/client/details/firms/list`, {
                    headers: getHeaders(),
                    params: { username },
                });
                if (!cancelled && response.data?.success) {
                    setClientFirms(response.data.data?.firms || []);
                } else if (!cancelled) {
                    setClientFirms([]);
                }
            } catch (error) {
                if (!cancelled) setClientFirms([]);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [partyLookup.selectedFirm]);

    const fetchServices = async () => {
        setIsLoadingServices(true);
        try {
            const response = await fetch(`${API_BASE_URL}/service/list?type=general&search=&page_no=1&limit=100&added_only=true`, {
                method: 'GET',
                headers: getHeaders()
            });
            const data = await response.json();
            if (data.success) {
                setServiceOptions(data.data.map(service => ({
                    service_id: service.service_id,
                    name: service.name,
                    fees: parseFloat(service.fees),
                    category: service.category_name,
                    duration: service.is_recurring ? 'Compliance' : 'One-time',
                    gst_rate: parseFloat(service.gst_rate),
                    sac_code: service.sac_code,
                    remark: service.remark
                })));
            }
        } catch (error) {
            console.error('Error fetching services:', error);
        } finally {
            setIsLoadingServices(false);
        }
    };

    const getSelectedParty = () => {
        if (hidePartySelector && lockedPartySelection) {
            return lockedPartySelection;
        }
        return partyLookup.selectedFirm;
    };

    const selectedSaleFirms = clientFirms;

    const saleFirmSelectOptions = useMemo(
        () =>
            selectedSaleFirms.map((firm) => ({
                value: String(firm.firm_id),
                label: `${firm.firm_name || '—'} • ${firm.pan_no || '—'} • ${firm.file_no || '—'} • ${firm.firm_type || '—'}`,
                searchText: `${firm.firm_name || ''} ${firm.pan_no || ''} ${firm.file_no || ''} ${firm.firm_type || ''} ${firm.gst_no || ''}`,
            })),
        [selectedSaleFirms]
    );

    const selectedSaleFirm = useMemo(
        () => selectedSaleFirms.find((f) => String(f.firm_id) === String(selectedSaleFirmId)),
        [selectedSaleFirms, selectedSaleFirmId]
    );

    const addItem = () => {
        setFormData(prev => ({
            ...prev,
            items: [
                ...prev.items,
                { service_id: '', description: '', price: '', amount: 0, remark: '' }
            ]
        }));
    };

    const removeItem = (index) => {
        if (formData.items.length > 1) {
            setFormData(prev => ({
                ...prev,
                items: prev.items.filter((_, i) => i !== index)
            }));
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        if (name === 'additional_charge' || name === 'discount') {
            setFormData((prev) => ({
                ...prev,
                [name]: sanitizeDecimalInput(value, 2),
            }));
            return;
        }
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleItemChange = (index, field, value) => {
        const updatedItems = formData.items.map((item, i) => {
            if (i === index) {
                if (field === 'price') {
                    const sanitized = sanitizeDecimalInput(String(value), 2);
                    const amount = sanitized === '' ? 0 : parseDecimalValue(sanitized);
                    return {
                        ...item,
                        price: sanitized,
                        amount,
                    };
                }
                return { ...item, [field]: value };
            }
            return item;
        });

        setFormData(prev => ({ ...prev, items: updatedItems }));
    };

    const handleServiceChange = (index, serviceId) => {
        if (!serviceId) {
            const updatedItems = formData.items.map((item, i) =>
                i === index
                    ? { ...item, service_id: '', description: '', price: '', amount: 0, remark: '' }
                    : item
            );
            setFormData(prev => ({ ...prev, items: updatedItems }));
            return;
        }
        const service = serviceOptions.find(s => String(s.service_id) === String(serviceId));
        if (service) {
            const feeStr = sanitizeDecimalInput(String(service.fees), 2);
            const feeNum = parseDecimalValue(feeStr);
            const updatedItems = formData.items.map((item, i) =>
                i === index ? {
                    ...item,
                    service_id: service.service_id,
                    price: feeStr,
                    amount: feeNum,
                    description: '',
                    remark: service.remark || ''
                } : item
            );

            setFormData(prev => ({
                ...prev,
                items: updatedItems
            }));
        }
    };

    const serviceSelectOptions = useMemo(
        () =>
            serviceOptions.map((s) => ({
                value: String(s.service_id),
                label: `${s.name} — ₹${Number(s.fees).toFixed(2)}`,
                searchText: `${s.name} ${s.category || ''} ${s.remark || ''}`,
            })),
        [serviceOptions]
    );

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (isSubmitting) return;

        const selectedParty = getSelectedParty();
        const resolvedParty = resolveTransactionPartySelection(selectedParty);
        if (!resolvedParty.party_id) return;

        const hasValidItems = formData.items.some(
            (item) => item.service_id && parseDecimalValue(item.price) > 0
        );
        if (!hasValidItems) {
            alert('Please add at least one valid service item');
            return;
        }

        if (hidePartySelector && (!fixedParty || fixedParty.id == null || fixedParty.id === '')) {
            alert('Sale form is misconfigured: hidePartySelector requires fixedParty with id.');
            return;
        }

        setIsSubmitting(true);
        try {
            const basePayload = {
                transaction_date: formData.payment_date,
                remark: formData.notes || formData.remark,
                tax_rate: formData.tax_rate,
                items: formData.items
                    .filter((item) => item.service_id && parseDecimalValue(item.price) > 0)
                    .map((item) => ({
                        service_id: item.service_id,
                        fees: parseDecimalValue(item.price),
                        remark: item.remark || item.description
                    })),
                additional_charge: parseDecimalValue(formData.additional_charge),
                round_off: formData.apply_round_off,
                party_id: resolvedParty.party_id,
                party_type: resolvedParty.party_type,
            };

            const discountNum = parseDecimalValue(formData.discount);
            if (discountNum > 0) {
                basePayload.discount_type = formData.discount_type;
                if (formData.discount_type === 'percentage') {
                    basePayload.discount_perc_rate = discountNum;
                } else {
                    basePayload.discount_value = discountNum;
                }
            } else {
                basePayload.discount_type = 'not applicable';
            }

            if (resolvedParty.party_type === 'client' && selectedSaleFirmId) {
                basePayload.firm_id = selectedSaleFirmId;
            }

            const response = await fetch(`${API_BASE_URL}/sale/create`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify(basePayload)
            });

            const data = await response.json();

            if (data.success) {
                const msg =
                    typeof data.message === 'string' && data.message.trim()
                        ? data.message.trim()
                        : 'Invoice created successfully';
                toast.success(msg);
                const submissionData = {
                    ...formData,
                    party_type: resolvedParty.party_type,
                    party_id: resolvedParty.party_id,
                    selected_party: selectedParty,
                    timestamp: new Date().toISOString(),
                    company: appSettings.company_name,
                    api_response: data,
                    notifications: {
                        email: sendEmail,
                        sms: sendSms,
                        whatsapp: sendWhatsApp
                    }
                };
                onSuccess(submissionData);
                if (mode === 'modal') onClose();
            } else {
                throw new Error(data.message || 'Failed to create sale');
            }
        } catch (error) {
            console.error('Error submitting form:', error);
            toast.error(error.message || 'Error creating sale. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };
    useEffect(() => {
        let subtotal = 0;
        formData.items.forEach(item => {
            subtotal += Number(item.amount) || 0;
        });
        // Keep subtotal with 2 decimal places
        subtotal = Math.round(subtotal * 100) / 100;

        const discountVal = parseDecimalValue(formData.discount);
        let discountAmount = 0;
        if (discountVal > 0) {
            if (formData.discount_type === 'percentage') {
                discountAmount = subtotal * (discountVal / 100);
            } else {
                discountAmount = discountVal;
            }
            // Round discount to 2 decimal places
            discountAmount = Math.round(discountAmount * 100) / 100;
        }

        const amountAfterDiscount = Math.max(0, subtotal - discountAmount);

        const sgst_amount = Math.round((amountAfterDiscount * (Number(formData.sgst_rate) / 100)) * 100) / 100;
        const cgst_amount = Math.round((amountAfterDiscount * (Number(formData.cgst_rate) / 100)) * 100) / 100;

        let grand_total = amountAfterDiscount + sgst_amount + cgst_amount + parseDecimalValue(formData.additional_charge);
        // Keep grand total with 2 decimal places before round off
        grand_total = Math.round(grand_total * 100) / 100;

        let round_off = 0;
        // Only apply round off if the toggle is checked
        if (formData.apply_round_off) {
            round_off = Math.round(grand_total) - grand_total;
            round_off = Math.round(round_off * 100) / 100;
            grand_total = Math.round(grand_total);
        }

        setFormData(prev => ({
            ...prev,
            subtotal,
            sgst_amount,
            cgst_amount,
            round_off,
            grand_total
        }));
    }, [formData.items, formData.discount, formData.discount_type, formData.sgst_rate, formData.cgst_rate, formData.additional_charge, formData.apply_round_off]);

    const formatSaleMoneyDefault = (amount) =>
        new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount);
    const formatMoney = typeof formatCurrencyProp === 'function' ? formatCurrencyProp : formatSaleMoneyDefault;

    const getServiceDetails = (serviceId) => {
        return serviceOptions.find(s => s.service_id === serviceId);
    };

    const saleFormId = 'sale-create-form';

    const formClassMerged = [mode === 'modal' ? 'space-y-3' : 'space-y-5', formClassName].filter(Boolean).join(' ').trim();
    const isCompactModal = mode === 'modal';
    const saleFieldClass = getCompactFieldClass(isCompactModal ? 'indigo' : 'blue');
    const saleLabelClass = isCompactModal ? COMPACT_LABEL : 'block text-sm font-medium text-slate-700 mb-1';
    const partyReady = hidePartySelector && fixedParty?.id != null && fixedParty.id !== ''
        ? true
        : Boolean(partyLookup.selectedFirm);

    const saleFormElement = (
        <>
            {aboveForm}
            <form id={saleFormId} onSubmit={handleSubmit} noValidate={isCompactModal} className={formClassMerged || undefined}>
                <div className={isCompactModal ? 'space-y-3' : 'space-y-5 mb-6'}>
                    {isCompactModal && (
                        <div>
                            <label className={COMPACT_LABEL}>
                                Sale date <span className="text-red-500">*</span>
                            </label>
                            <DatePickerField
                                value={formData.payment_date}
                                onChange={(value) => {
                                    const picked = String(value || '').trim();
                                    if (!picked) {
                                        setFormData((prev) => ({ ...prev, payment_date: '' }));
                                        return;
                                    }
                                    setFormData((prev) => ({
                                        ...prev,
                                        payment_date: picked > todayIso ? todayIso : picked,
                                    }));
                                }}
                                mode="single"
                                hideTabs={true}
                                showResetButton={false}
                                placeholder="Select date"
                                buttonClassName={saleFieldClass}
                                maxSelectableDate={todayIso}
                            />
                        </div>
                    )}

                    {shouldShowPartySelector ? (
                        <div className={isCompactModal ? 'space-y-2' : 'space-y-3'}>
                            <FirmClientSearchFields
                                variant="receive"
                                label="Party"
                                formatCurrency={formatMoney}
                                compact={isCompactModal}
                                hideSearchHint={isCompactModal}
                                focusAccent={isCompactModal ? 'indigo' : 'blue'}
                                searchPlaceholder="Search client, CA, staff, agent, bank, or capital"
                                searchHint="Search client, CA, staff, agent, bank, or capital."
                                emptyMessage="No parties found"
                                showPartyType
                                getRowKey={(party) => `${party.userType || 'client'}:${party.party_id || party.username || party.bank_id}`}
                                searchTerm={partyLookup.searchTerm}
                                setSearchTerm={partyLookup.setSearchTerm}
                                firms={partyLookup.firms}
                                setFirms={partyLookup.setFirms}
                                showDropdown={partyLookup.showDropdown}
                                setShowDropdown={partyLookup.setShowDropdown}
                                openDropdown={partyLookup.openDropdown}
                                dismissDropdown={partyLookup.dismissDropdown}
                                searchLoading={partyLookup.searchLoading}
                                loadingMore={partyLookup.loadingMore}
                                handleListScroll={partyLookup.handleListScroll}
                                clearSelection={partyLookup.clearSelection}
                                onSearchFocus={partyLookup.loadPartiesOnFocus}
                                selectedFirm={partyLookup.selectedFirm}
                                setSelectedFirm={partyLookup.setSelectedFirm}
                            />
                            {partyLookup.selectedFirm?.userType === 'client' && selectedSaleFirms.length > 0 && (
                                <div className={`rounded-md border border-slate-200 bg-white ${isCompactModal ? 'p-2.5' : 'p-3'}`}>
                                    <CustomSelect
                                        label="Firm (optional)"
                                        options={saleFirmSelectOptions}
                                        value={optionByValue(saleFirmSelectOptions, selectedSaleFirmId || null)}
                                        onChange={(opt) => setSelectedSaleFirmId(opt ? String(opt.value) : '')}
                                        getOptionLabel={(opt) => opt.label}
                                        getOptionValue={(opt) => opt.value}
                                        placeholder="Select firm for this sale"
                                        searchPlaceholder="Search firm by name, PAN, file no, type"
                                        noOptionsMessage="No firms available"
                                        isClearable
                                    />
                                    {selectedSaleFirm && !isCompactModal && (
                                        <div className="mt-3 rounded-lg border border-slate-100 bg-slate-50 p-3 text-xs text-slate-700">
                                            <div className="font-semibold text-slate-800">{selectedSaleFirm.firm_name || '—'}</div>
                                            <div className="mt-1 grid grid-cols-1 gap-1 sm:grid-cols-2">
                                                <p><span className="text-slate-500">PAN:</span> <span className="font-mono">{selectedSaleFirm.pan_no || '—'}</span></p>
                                                <p><span className="text-slate-500">File No:</span> {selectedSaleFirm.file_no || '—'}</p>
                                                <p><span className="text-slate-500">Type:</span> {selectedSaleFirm.firm_type || '—'}</p>
                                                <p><span className="text-slate-500">GST:</span> {selectedSaleFirm.gst_no || '—'}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ) : null}

                    {hidePartySelector && showFixedPartyBanner && fixedParty && (
                        <div>
                            <label className={saleLabelClass}>{bannerTitle}</label>
                            <TransactionClientPreviewCard
                                client={getSelectedParty()}
                                formatCurrency={formatMoney}
                                variant="receive"
                                readOnly
                                partyType={lockedPartyType || lockedPartySelection?.userType || ''}
                            />
                            {partyBannerSubtitle ? (
                                <p className="mt-1 text-xs text-slate-500">{partyBannerSubtitle}</p>
                            ) : null}
                        </div>
                    )}

                    {!isCompactModal && (
                        <div className="max-w-md">
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Date <span className="text-red-500">*</span>
                            </label>
                            <DatePickerField
                                value={formData.payment_date}
                                onChange={(value) => setFormData(prev => ({ ...prev, payment_date: value || '' }))}
                                mode="single"
                                hideTabs={true}
                                showResetButton={false}
                                placeholder="Select date"
                                buttonClassName="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-sm text-left"
                            />
                        </div>
                    )}
                </div>

                {belowPartySection}

                {/* Services Section */}
                <div className={isCompactModal ? 'mb-3' : 'mb-6'}>
                    <div className={`flex justify-between items-center ${isCompactModal ? 'mb-2' : 'mb-4'}`}>
                        <div>
                            <h3 className={`${isCompactModal ? 'text-sm font-semibold' : 'text-base font-bold'} text-gray-900`}>Services & Items</h3>
                            {!isCompactModal && (
                                <p className="text-xs text-gray-600 mt-0.5">Add services and items for this invoice</p>
                            )}
                        </div>
                        <button
                            type="button"
                            onClick={addItem}
                            disabled={isLoadingServices}
                            className={`inline-flex items-center bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:ring-offset-1 transition-colors disabled:opacity-50 ${isCompactModal ? 'px-2 py-1 text-xs' : 'px-3 py-2 text-sm shadow-sm'}`}
                        >
                            <FiPlus className={`${isCompactModal ? 'w-3 h-3 mr-1' : 'w-3.5 h-3.5 mr-1.5'}`} aria-hidden />
                            Add Service
                        </button>
                    </div>

                    <div className={`overflow-hidden border border-gray-300 rounded-md ${isCompactModal ? '' : 'shadow-sm'} text-sm`}>
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className={isCompactModal ? 'bg-slate-50' : 'bg-gradient-to-r from-gray-50 to-gray-100'}>
                                <tr>
                                    <th className={`${isCompactModal ? 'px-2 py-1.5' : 'px-3 py-2.5'} text-left text-[11px] font-semibold text-gray-700 uppercase tracking-wider`}>Service</th>
                                    <th className={`${isCompactModal ? 'px-2 py-1.5' : 'px-3 py-2.5'} text-left text-[11px] font-semibold text-gray-700 uppercase tracking-wider`}>Description</th>
                                    <th className={`${isCompactModal ? 'px-2 py-1.5' : 'px-3 py-2.5'} text-right text-[11px] font-semibold text-gray-700 uppercase tracking-wider`}>Price</th>
                                    <th className={`${isCompactModal ? 'px-2 py-1.5' : 'px-3 py-2.5'} text-center text-[11px] font-semibold text-gray-700 uppercase tracking-wider`}>Action</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {formData.items.map((item, index) => (
                                    <tr key={index} className="hover:bg-gray-50 transition-colors duration-150">
                                        <td className={`${isCompactModal ? 'px-2 py-1.5' : 'px-3 py-2.5'} min-w-[180px]`}>
                                            <CustomSelect
                                                options={serviceSelectOptions}
                                                value={optionByValue(serviceSelectOptions, item.service_id !== '' && item.service_id != null ? String(item.service_id) : null)}
                                                onChange={(opt) => handleServiceChange(index, opt ? opt.value : '')}
                                                getOptionLabel={(opt) => opt.label}
                                                getOptionValue={(opt) => opt.value}
                                                placeholder={isLoadingServices ? 'Loading services…' : 'Select service'}
                                                searchPlaceholder="Search services…"
                                                isDisabled={isLoadingServices}
                                                isClearable={false}
                                            />
                                        </td>
                                        <td className={isCompactModal ? 'px-2 py-1.5' : 'px-3 py-2.5'}>
                                            <input
                                                type="text"
                                                className={`w-full border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors ${isCompactModal ? 'px-2 py-1' : 'px-2.5 py-1.5'}`}
                                                placeholder="Description"
                                                value={item.description}
                                                onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                                            />
                                        </td>
                                        <td className={isCompactModal ? 'px-2 py-1.5' : 'px-3 py-2.5'}>
                                            <input
                                                type="text"
                                                name={`sale-price-${index}`}
                                                inputMode="decimal"
                                                autoComplete="off"
                                                className={`w-full border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors text-right ${isCompactModal ? 'px-2 py-1' : 'px-2.5 py-1.5'}`}
                                                placeholder="0.00"
                                                value={item.price ?? ''}
                                                onChange={(e) => handleItemChange(index, 'price', e.target.value)}
                                                required
                                            />
                                        </td>
                                        <td className={`${isCompactModal ? 'px-2 py-1.5' : 'px-3 py-2.5'} text-center`}>
                                            <button
                                                type="button"
                                                onClick={() => removeItem(index)}
                                                disabled={formData.items.length <= 1}
                                                className="inline-flex items-center px-2 py-1 bg-red-50 text-red-600 rounded border border-red-200 text-xs font-medium hover:bg-red-100 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                <IoTrash className="w-3 h-3" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Additional Fields Section */}
                <div className={`grid grid-cols-1 ${isCompactModal ? 'lg:grid-cols-2 gap-3 mb-3' : 'lg:grid-cols-2 gap-4 mb-6'}`}>
                    <div className={`bg-white rounded-md border border-gray-200 ${isCompactModal ? 'p-2.5' : 'p-4 shadow-sm'}`}>
                        {!isCompactModal && (
                            <div className="flex items-center mb-3">
                                <div className="p-1.5 bg-indigo-100 text-indigo-600 rounded mr-2">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <h4 className="text-sm font-bold text-gray-900">Additional Settings</h4>
                            </div>
                        )}
                        {isCompactModal && (
                            <p className={`${COMPACT_LABEL} mb-1.5`}>Additional settings</p>
                        )}
                        <div className={isCompactModal ? 'space-y-2' : 'space-y-3'}>
                            <div>
                                <label className={isCompactModal ? COMPACT_LABEL : 'block text-xs font-medium text-gray-700 mb-1.5'}>Additional Charge (₹)</label>
                                <input
                                    type="text"
                                    inputMode="decimal"
                                    autoComplete="off"
                                    className={`w-full border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 ${isCompactModal ? `${saleFieldClass} py-1.5` : 'px-3 py-1.5'}`}
                                    name="additional_charge"
                                    value={formData.additional_charge ?? ''}
                                    onChange={handleInputChange}
                                    placeholder="0.00"
                                />
                                {!isCompactModal && (
                                    <p className="text-xs text-gray-500 mt-1">Additional charge will be added after GST calculation</p>
                                )}
                            </div>
                            <div className="flex items-center justify-between">
                                <span className={`${isCompactModal ? 'text-xs' : 'text-xs font-medium'} text-gray-700`}>Apply Round Off</span>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="sr-only peer"
                                        checked={formData.apply_round_off}
                                        onChange={(e) => setFormData(prev => ({ ...prev, apply_round_off: e.target.checked }))}
                                    />
                                    <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* Notes Section */}
                    <div className={`bg-white rounded-md border border-gray-200 ${isCompactModal ? 'p-2.5' : 'p-4 shadow-sm'}`}>
                        {!isCompactModal && (
                            <div className="flex items-center mb-3">
                                <div className="p-1.5 bg-indigo-100 text-indigo-600 rounded mr-2">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                </div>
                                <h4 className="text-sm font-bold text-gray-900">Notes</h4>
                            </div>
                        )}
                        <label className={isCompactModal ? COMPACT_LABEL : 'sr-only'}>Notes</label>
                        <textarea
                            className={`w-full border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 resize-none text-sm ${isCompactModal ? `${saleFieldClass} h-20 py-1.5` : 'h-28 px-3 py-2 bg-gray-50'}`}
                            placeholder="Notes"
                            name="notes"
                            value={formData.notes}
                            onChange={handleInputChange}
                        />
                    </div>
                </div>

                {/* Discount and Totals Section */}
                <div className={`grid grid-cols-1 ${isCompactModal ? 'lg:grid-cols-3 gap-3' : 'lg:grid-cols-3 gap-4'}`}>
                    {/* Discount Section */}
                    <div className={`bg-white rounded-md border border-gray-200 ${isCompactModal ? 'p-2.5' : 'p-4 shadow-sm'}`}>
                        {!isCompactModal && (
                            <div className="flex items-center mb-3">
                                <div className="p-1.5 bg-indigo-100 text-indigo-600 rounded mr-2">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <h4 className="text-sm font-bold text-gray-900">Discount</h4>
                            </div>
                        )}
                        {isCompactModal && <p className={`${COMPACT_LABEL} mb-1.5`}>Discount</p>}
                        <div className={isCompactModal ? 'space-y-2' : 'space-y-3'}>
                            <div>
                                <label className={isCompactModal ? COMPACT_LABEL : 'block text-xs font-medium text-gray-700 mb-1.5'}>Discount Type</label>
                                <select
                                    className={`w-full border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 ${isCompactModal ? saleFieldClass : 'px-3 py-1.5'}`}
                                    name="discount_type"
                                    value={formData.discount_type}
                                    onChange={handleInputChange}
                                >
                                    <option value="percentage">Percentage (%)</option>
                                    <option value="flat">Flat Amount (₹)</option>
                                </select>
                            </div>
                            <div>
                                <label className={isCompactModal ? COMPACT_LABEL : 'block text-xs font-medium text-gray-700 mb-1.5'}>
                                    {formData.discount_type === 'percentage' ? 'Percentage (%)' : 'Amount (₹)'}
                                </label>
                                <input
                                    type="text"
                                    inputMode="decimal"
                                    autoComplete="off"
                                    className={`w-full border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 ${isCompactModal ? saleFieldClass : 'px-3 py-1.5'}`}
                                    name="discount"
                                    value={formData.discount ?? ''}
                                    onChange={handleInputChange}
                                    placeholder="0"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Totals Section */}
                    <div className={`lg:col-span-2 rounded-md border ${isCompactModal ? 'p-2.5 border-indigo-100 bg-indigo-50/40' : 'p-4 border-indigo-100 bg-gradient-to-br from-indigo-50 to-white shadow-sm'}`}>
                        {!isCompactModal && (
                            <div className="flex items-center mb-4">
                                <div className="p-1.5 bg-indigo-600 text-white rounded mr-2">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                    </svg>
                                </div>
                                <h4 className="text-sm font-bold text-gray-900">Summary</h4>
                            </div>
                        )}
                        {isCompactModal && <p className={`${COMPACT_LABEL} mb-1.5 text-indigo-700/80`}>Summary</p>}
                        <div className={`space-y-1 ${isCompactModal ? 'text-xs' : 'text-sm space-y-2'}`}>
                            <div className="flex justify-between items-center py-1">
                                <span className="text-gray-600">Subtotal:</span>
                                <span className="font-semibold text-gray-900">{formatMoney(formData.subtotal)}</span>
                            </div>

                            {parseDecimalValue(formData.discount) > 0 && (
                                <div className="flex justify-between items-center py-1 text-red-600">
                                    <span>Discount:</span>
                                    <span className="font-semibold">-{formatMoney(
                                        formData.discount_type === 'percentage'
                                            ? formData.subtotal * (parseDecimalValue(formData.discount) / 100)
                                            : parseDecimalValue(formData.discount)
                                    )}</span>
                                </div>
                            )}

                            {appSettings.gst_applicable && (
                                <>
                                    <div className="flex justify-between items-center py-1">
                                        <span className="text-gray-600">SGST ({formData.sgst_rate}%):</span>
                                        <span className="font-semibold text-gray-900">{formatMoney(formData.sgst_amount)}</span>
                                    </div>
                                    <div className="flex justify-between items-center py-1">
                                        <span className="text-gray-600">CGST ({formData.cgst_rate}%):</span>
                                        <span className="font-semibold text-gray-900">{formatMoney(formData.cgst_amount)}</span>
                                    </div>
                                </>
                            )}

                            {parseDecimalValue(formData.additional_charge) > 0 && (
                                <div className="flex justify-between items-center py-1">
                                    <span className="text-gray-600">Additional Charge:</span>
                                    <span className="font-semibold text-gray-900">{formatMoney(parseDecimalValue(formData.additional_charge))}</span>
                                </div>
                            )}

                            {Math.abs(formData.round_off) > 0.01 && (
                                <div className="flex justify-between items-center py-1">
                                    <span className="text-gray-600">Round Off:</span>
                                    <span className={`font-semibold ${formData.round_off > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {formatMoney(formData.round_off)}
                                    </span>
                                </div>
                            )}

                            {mode !== 'modal' && (
                                <div className="pt-2 mt-1 border-t border-gray-200">
                                    <div className="flex justify-between items-center font-bold text-gray-900 bg-indigo-50 px-3 py-2 rounded">
                                        <span>Grand Total:</span>
                                        <span className="text-indigo-700 text-base">{formatMoney(formData.grand_total)}</span>
                                    </div>
                                </div>
                            )}

                            {isCompactModal && (
                                <div className="pt-1.5 mt-1 border-t border-indigo-100/80">
                                    <div className="flex justify-between items-center font-semibold text-slate-900">
                                        <span>Grand Total</span>
                                        <span className="text-indigo-700 tabular-nums">{formatMoney(formData.grand_total)}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {isCompactModal && partyReady && (() => {
                    const summaryParty = getSelectedParty();
                    const summaryName = summaryParty?.name || fixedParty?.name || '—';
                    if (!summaryName || summaryName === '—') return null;
                    return (
                        <div className="rounded-md bg-indigo-50 border border-indigo-100 px-3 py-2 space-y-1">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-indigo-700/80">Invoice</p>
                            <div className="flex items-center justify-between gap-2 text-xs">
                                <span className="text-slate-600">Sale to</span>
                                <span className="font-medium text-slate-800 truncate">{summaryName}</span>
                            </div>
                            <div className="flex items-center justify-between gap-2 text-xs sm:hidden">
                                <span className="text-slate-600">Grand total</span>
                                <span className="font-semibold text-indigo-700 tabular-nums">{formatMoney(formData.grand_total)}</span>
                            </div>
                        </div>
                    );
                })()}
            </form>
        </>
    );

    const formContent = (
        <div className="bg-white rounded-xl shadow-2xl flex flex-col h-full border border-gray-200">
            {/* Header with Toggle Buttons — inline / embedded layout only */}
            <div className="flex-shrink-0 flex items-center justify-between p-3 border-b border-gray-200 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-t-xl">
                <div className="flex items-center space-x-3">
                    <div className="p-1.5 bg-white/10 rounded-lg">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                    </div>
                    <div>
                        <h2 className="text-lg font-bold">Create Sale Invoice</h2>
                        <p className="text-indigo-100 text-xs hidden sm:block">{appSettings.company_name}</p>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-5 bg-gray-50">
                {saleFormElement}
            </div>

            {mode !== 'modal' && (
                <div className="flex-shrink-0 border-t border-gray-200 bg-white p-4 rounded-b-xl shadow-lg">
                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                        {showNotificationToggles && (
                            <div className="w-full lg:w-auto">
                                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                                    <span className="text-xs font-semibold text-gray-700 whitespace-nowrap">Send Invoice:</span>
                                    <div className="flex items-center gap-4">
                                        <label className="flex items-center cursor-pointer">
                                            <div className="relative">
                                                <input
                                                    type="checkbox"
                                                    checked={sendEmail}
                                                    onChange={(e) => setSendEmail(e.target.checked)}
                                                    className="sr-only"
                                                />
                                                <div className={`w-9 h-5 rounded-full transition-colors duration-200 ${sendEmail ? 'bg-indigo-600' : 'bg-gray-300'}`}></div>
                                                <div className={`absolute left-0.5 top-0.5 w-4 h-4 rounded-full bg-white transition-transform duration-200 transform ${sendEmail ? 'translate-x-4' : ''}`}></div>
                                            </div>
                                            <div className="ml-2 flex items-center">
                                                <FiMail className="w-4 h-4 text-gray-600 mr-1.5" aria-hidden />
                                                <span className="text-xs text-gray-700 font-medium">Email</span>
                                            </div>
                                        </label>

                                        <label className="flex items-center cursor-pointer">
                                            <div className="relative">
                                                <input
                                                    type="checkbox"
                                                    checked={sendSms}
                                                    onChange={(e) => setSendSms(e.target.checked)}
                                                    className="sr-only"
                                                />
                                                <div className={`w-9 h-5 rounded-full transition-colors duration-200 ${sendSms ? 'bg-sky-600' : 'bg-gray-300'}`}></div>
                                                <div className={`absolute left-0.5 top-0.5 w-4 h-4 rounded-full bg-white transition-transform duration-200 transform ${sendSms ? 'translate-x-4' : ''}`}></div>
                                            </div>
                                            <div className="ml-2 flex items-center">
                                                <FiMessageSquare className="w-4 h-4 text-sky-600 mr-1.5" aria-hidden />
                                                <span className="text-xs text-gray-700 font-medium">SMS</span>
                                            </div>
                                        </label>

                                        <label className="flex items-center cursor-pointer">
                                            <div className="relative">
                                                <input
                                                    type="checkbox"
                                                    checked={sendWhatsApp}
                                                    onChange={(e) => setSendWhatsApp(e.target.checked)}
                                                    className="sr-only"
                                                />
                                                <div className={`w-9 h-5 rounded-full transition-colors duration-200 ${sendWhatsApp ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                                                <div className={`absolute left-0.5 top-0.5 w-4 h-4 rounded-full bg-white transition-transform duration-200 transform ${sendWhatsApp ? 'translate-x-4' : ''}`}></div>
                                            </div>
                                            <div className="ml-2 flex items-center">
                                                <FiMessageCircle className="w-4 h-4 text-emerald-600 mr-1.5" aria-hidden />
                                                <span className="text-xs text-gray-700 font-medium">WhatsApp</span>
                                            </div>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full lg:w-auto">
                            <div className="hidden lg:block px-3 py-1.5 bg-gradient-to-r from-indigo-50 to-indigo-100 rounded border border-indigo-200">
                                <div className="text-xs text-indigo-700 font-semibold">
                                    Total: <span className="text-sm">{formatMoney(formData.grand_total)}</span>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    type="submit"
                                    disabled={isSubmitting || !partyReady || !formData.items.some((item) => item.service_id && parseDecimalValue(item.price) > 0)}
                                    className="px-5 py-2 text-xs font-medium text-white bg-gradient-to-r from-indigo-600 to-indigo-700 border border-transparent rounded-lg hover:from-indigo-700 hover:to-indigo-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 shadow hover:shadow-md min-w-[140px] flex items-center justify-center"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <svg className="animate-spin -ml-1 mr-2 h-3 w-3 text-white" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Creating...
                                        </>
                                    ) : (
                                        <>
                                            <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            Create Sale
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

    if (mode === 'modal') {
        const hasSaleLineReady = formData.items.some(
            (item) => item.service_id && parseDecimalValue(item.price) > 0
        );
        const isSaleSubmitDisabled = isSubmitting || !partyReady || !hasSaleLineReady;
        const defaultSubmitLabel = 'Create Sale';
        const saleAccentBtn = MODAL_ACCENT_STYLES.sale.primaryBtn;

        const triggerSaleSubmit = () => {
            handleSubmit({ preventDefault: () => { } });
        };

        return (
            <BaseModal
                isOpen={isOpen}
                onClose={onClose}
                title={modalTitle}
                maxWidth={modalMaxWidth}
                compact
                closeOnOverlayClick={false}
                accent="sale"
                titleIcon={<FiShoppingBag className="w-4 h-4" aria-hidden />}
                footer={(
                    <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between w-full">
                        {showNotificationToggles ? (
                            <TransactionNotifyCheckboxes
                                sendSms={sendSms}
                                setSendSms={setSendSms}
                                sendWhatsApp={sendWhatsApp}
                                setSendWhatsApp={setSendWhatsApp}
                                sendEmail={sendEmail}
                                setSendEmail={setSendEmail}
                            />
                        ) : (
                            <div />
                        )}
                        <div className="flex flex-wrap items-center justify-end gap-2 shrink-0">
                            <div className="text-xs text-right mr-1 hidden sm:block">
                                <span className="text-slate-500">Total </span>
                                <span className="font-semibold tabular-nums text-slate-900">{formatMoney(formData.grand_total)}</span>
                            </div>
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={isSubmitting}
                                className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 rounded-md text-xs font-medium hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-500/30 disabled:opacity-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                disabled={isSaleSubmitDisabled}
                                onClick={triggerSaleSubmit}
                                className={`px-3 py-1.5 text-white rounded-md text-xs font-medium focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors inline-flex items-center justify-center min-w-[110px] ${saleAccentBtn}`}
                            >
                                {isSubmitting ? 'Creating…' : (submitButtonLabel || defaultSubmitLabel)}
                            </button>
                        </div>
                    </div>
                )}
            >
                {saleFormElement}
            </BaseModal>
        );
    }

    return formContent;
};

// SaleModal — ledger context locks party; omit client + bank props for voucher-style (full party UI).
export const SaleModal = ({
    isOpen,
    onClose,
    onSubmit,
    formatCurrency: _formatCurrency,
    clientUsername,
    clientName,
    clientId,
    bankId,
    bankName,
    ...saleFormProps
}) => {
    const hasClient = Boolean(clientId || clientUsername);
    const hasBank = Boolean(bankId);
    const lockedPartyType = hasClient ? 'client' : hasBank ? 'bank' : null;
    const hidePartySelector = Boolean(lockedPartyType);
    const fixedParty = hasClient
        ? {
            id: clientId || clientUsername,
            username: clientUsername,
            name: clientName || clientUsername || String(clientId || clientUsername || ''),
            party_type: 'client',
        }
        : hasBank
            ? { id: bankId, name: bankName || 'Bank', party_type: 'bank' }
            : null;

    return (
        <SaleForm
            isOpen={isOpen}
            onClose={onClose}
            onSuccess={(data) => onSubmit && onSubmit('SALE', data)}
            initialPartyId={fixedParty ? String(fixedParty.id) : ''}
            mode="modal"
            lockedPartyType={lockedPartyType}
            hidePartySelector={hidePartySelector}
            showFixedPartyBanner={!lockedPartyType}
            fixedParty={fixedParty}
            modalTitle={
                hasClient
                    ? 'Sale to Client'
                    : hasBank
                        ? 'Sale from Bank'
                        : 'Create Sale Invoice'
            }
            {...saleFormProps}
            formatCurrency={_formatCurrency}
        />
    );
};

/** Spread into `<SaleForm />` on a client ledger page (party known; no search UI). */
export const saleFormLedgerClientProps = ({ clientId, clientUsername, clientName, partyBannerSubtitle = '' }) => ({
    lockedPartyType: 'client',
    hidePartySelector: true,
    fixedParty: {
        id: clientId || clientUsername,
        username: clientUsername,
        name: clientName || clientUsername || String(clientId || clientUsername || ''),
        party_type: 'client',
    },
    ...(partyBannerSubtitle ? { partyBannerSubtitle } : {}),
});

/** Spread into `<SaleForm />` on a bank ledger page (bank known; no search UI). */
export const saleFormLedgerBankProps = ({ bankId, bankName, partyBannerSubtitle = '' }) => ({
    lockedPartyType: 'bank',
    hidePartySelector: true,
    fixedParty: {
        id: bankId,
        name: bankName || 'Bank',
        party_type: 'bank',
    },
    ...(partyBannerSubtitle ? { partyBannerSubtitle } : {}),
});

export const PurchaseForm = ({
    isOpen = false,
    onClose = () => { },
    onSuccess = () => { },
    mode = 'modal',
    initialPartyId = '',
    defaultPurchaseType = 'ca',
    lockedPurchaseType = null,
    hidePartySelector = false,
    fixedParty = null,
    showFixedPartyBanner = true,
    showPurchaseTypeToggle,
    modalTitle = 'Create Purchase Bill',
    modalMaxWidth = 'max-w-4xl',
    closeOnOverlayClick = false,
    showNotificationToggles = false,
    formClassName = '',
    submitButtonLabel = '',
}) => {
    const [purchaseType, setPurchaseType] = useState(lockedPurchaseType || defaultPurchaseType);
    const [formData, setFormData] = useState({
        party_id: initialPartyId || '',
        transaction_date: new Date().toISOString().split('T')[0],
        remark: '',
        tax_rate: appSettings.default_gst_rate,
        items: [{ service_id: '', fees: '', remark: '' }],
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [serviceOptions, setServiceOptions] = useState([]);
    const [isLoadingServices, setIsLoadingServices] = useState(false);
    const [userOptions, setUserOptions] = useState([]);
    const [isLoadingParties, setIsLoadingParties] = useState(false);
    const [showPartyDropdown, setShowPartyDropdown] = useState(false);
    const [userSearchTerm, setUserSearchTerm] = useState('');
    const [userLoadingMore, setUserLoadingMore] = useState(false);
    const userPageRef = useRef(1);
    const userHasMoreRef = useRef(false);
    const userLoadingMoreRef = useRef(false);
    const userSearchTermRef = useRef('');
    const userSearchRequestIdRef = useRef(0);
    const [selectedPurchaseUser, setSelectedPurchaseUser] = useState(null);
    const [purchaseBankPickerOpen, setPurchaseBankPickerOpen] = useState(true);
    const [purchaseBankRow, setPurchaseBankRow] = useState(null);
    const purchasePartySearchRef = useRef(null);
    const partyDropdownActiveRef = useRef(false);

    const closePartyDropdown = useCallback(() => {
        partyDropdownActiveRef.current = false;
        setShowPartyDropdown(false);
    }, []);

    useClickOutside(purchasePartySearchRef, closePartyDropdown, showPartyDropdown);

    const todayIso = useMemo(() => new Date().toISOString().split('T')[0], []);

    const effectivePurchaseType = lockedPurchaseType ?? purchaseType;
    const typeToggleVisible = showPurchaseTypeToggle !== undefined ? showPurchaseTypeToggle : lockedPurchaseType == null;

    useEffect(() => {
        if (lockedPurchaseType) setPurchaseType(lockedPurchaseType);
    }, [lockedPurchaseType]);

    useEffect(() => {
        if (!isOpen) return;
        const presetPartyId = hidePartySelector && fixedParty?.id != null && fixedParty.id !== ''
            ? String(fixedParty.id)
            : (initialPartyId ? String(initialPartyId) : '');
        setFormData({
            party_id: presetPartyId,
            transaction_date: new Date().toISOString().split('T')[0],
            remark: '',
            tax_rate: appSettings.default_gst_rate,
            items: [{ service_id: '', fees: '', remark: '' }],
        });
        setIsSubmitting(false);
        setUserSearchTerm('');
        setUserOptions([]);
        partyDropdownActiveRef.current = false;
        setShowPartyDropdown(false);
        setSelectedPurchaseUser(null);
        setPurchaseBankPickerOpen(!presetPartyId);
        setPurchaseBankRow(null);
        if (lockedPurchaseType) setPurchaseType(lockedPurchaseType);
        else setPurchaseType(defaultPurchaseType);
        fetchServices();
    }, [isOpen, hidePartySelector, fixedParty?.id, initialPartyId, lockedPurchaseType, defaultPurchaseType]);

    useEffect(() => {
        userSearchTermRef.current = userSearchTerm;
    }, [userSearchTerm]);

    useEffect(() => {
        if (hidePartySelector && effectivePurchaseType === 'ca') return;
        if (effectivePurchaseType !== 'ca') return;
        if (formData.party_id) return;
        partyDropdownActiveRef.current = true;
        setIsLoadingParties(true);
        setUserOptions([]);
        const delayDebounce = setTimeout(() => {
            userPageRef.current = 1;
            fetchCas(false);
        }, SEARCH_DEBOUNCE_MS);
        return () => clearTimeout(delayDebounce);
    }, [userSearchTerm, hidePartySelector, formData.party_id, effectivePurchaseType]);

    const handlePurchaseTypeChange = (type) => {
        if (lockedPurchaseType) return;
        setPurchaseType(type);
        setFormData((prev) => ({ ...prev, party_id: '' }));
        setUserSearchTerm('');
        setShowPartyDropdown(false);
        setUserOptions([]);
        setSelectedPurchaseUser(null);
        setPurchaseBankPickerOpen(true);
        setPurchaseBankRow(null);
    };

    const fetchServices = async () => {
        setIsLoadingServices(true);
        try {
            const response = await fetch(`${API_BASE_URL}/service/list?type=general&search=&page_no=1&limit=100&added_only=true`, {
                method: 'GET',
                headers: getHeaders()
            });
            const data = await response.json();
            if (data.success) {
                setServiceOptions((data.data || []).map((service) => ({
                    service_id: service.service_id,
                    name: service.name,
                    fees: parseDecimalValue(service.fees),
                    category: service.category_name,
                    remark: service.remark,
                })));
            } else {
                setServiceOptions([]);
            }
        } catch (error) {
            console.error('Error fetching services:', error);
            setServiceOptions([]);
        } finally {
            setIsLoadingServices(false);
        }
    };

    const fetchCas = async (append = false) => {
        const q = String(userSearchTermRef.current || '').trim();
        const pageNum = append ? userPageRef.current + 1 : 1;
        const requestId = ++userSearchRequestIdRef.current;
        const isFirstPage = !append;

        if (isFirstPage) {
            userPageRef.current = 1;
            setIsLoadingParties(true);
        } else {
            setUserLoadingMore(true);
            userLoadingMoreRef.current = true;
        }
        try {
            const { list, isLast } = await fetchCaSearchPage({ search: q, page: pageNum });
            if (requestId !== userSearchRequestIdRef.current) return;
            const opts = list.map(mapCaToPurchasePartyOption);
            if (append) {
                userPageRef.current = pageNum;
                setUserOptions((prev) => [...prev, ...opts]);
            } else {
                setUserOptions(opts);
                if (partyDropdownActiveRef.current) {
                    setShowPartyDropdown(true);
                }
            }
            userHasMoreRef.current = !isLast;
            setSelectedPurchaseUser((prev) => {
                if (!prev) return prev;
                const fresh = opts.find((o) => String(o.id) === String(prev.id));
                return fresh ?? prev;
            });
        } catch (error) {
            if (requestId !== userSearchRequestIdRef.current) return;
            console.error('Error fetching CAs:', error);
            if (!append) {
                setUserOptions([]);
                if (partyDropdownActiveRef.current) {
                    setShowPartyDropdown(false);
                }
            }
            userHasMoreRef.current = false;
        } finally {
            if (requestId !== userSearchRequestIdRef.current) return;
            setIsLoadingParties(false);
            setUserLoadingMore(false);
            userLoadingMoreRef.current = false;
        }
    };

    const loadCasOnFocus = useCallback(() => {
        partyDropdownActiveRef.current = true;
        setShowPartyDropdown(true);
        const q = String(userSearchTermRef.current || '').trim();
        if (q === '' && userOptions.length === 0) {
            userPageRef.current = 1;
            setIsLoadingParties(true);
            setUserOptions([]);
            fetchCas(false);
        }
    }, [userOptions.length]);

    const handleUserListScroll = useCallback((e) => {
        const el = e.currentTarget;
        if (userLoadingMoreRef.current || !userHasMoreRef.current || isLoadingParties) return;
        if (el.scrollTop + el.clientHeight >= el.scrollHeight - 40) {
            fetchCas(true);
        }
    }, [isLoadingParties]);

    const getSelectedParty = () => {
        if (hidePartySelector && fixedParty && fixedParty.id != null && fixedParty.id !== '') {
            const id = String(fixedParty.id);
            return {
                ...fixedParty,
                id,
                type: effectivePurchaseType === 'bank' ? 'bank' : 'ca',
                name: fixedParty.name || String(fixedParty.id),
                username: fixedParty.username || id,
                email: fixedParty.email,
                contact: fixedParty.contact,
                pan_no: fixedParty.pan_no ?? fixedParty.pan_number,
                account: fixedParty.account ?? fixedParty.account_no,
                holder: fixedParty.holder,
            };
        }
        if (effectivePurchaseType === 'ca' && selectedPurchaseUser && String(selectedPurchaseUser.id) === String(formData.party_id)) {
            return selectedPurchaseUser;
        }
        return userOptions.find((u) => String(u.id) === String(formData.party_id));
    };

    const bankCardFromSearchOrParty = () => {
        if (purchaseBankRow && String(purchaseBankRow.bank_id ?? purchaseBankRow.id) === String(formData.party_id)) {
            return purchaseBankRow;
        }
        const p = getSelectedParty();
        if (!p || effectivePurchaseType !== 'bank' || !formData.party_id) return null;
        return {
            bank: p.name,
            holder: p.holder,
            account_no: p.account ?? p.account_no,
            ifsc: p.ifsc,
            branch: p.branch,
            balance: p.balance,
        };
    };

    const handlePartySelect = (partyId) => {
        const id = String(partyId);
        if (effectivePurchaseType === 'ca') {
            const row = userOptions.find((p) => String(p.id) === id);
            setSelectedPurchaseUser(row ?? null);
        } else {
            setSelectedPurchaseUser(null);
        }
        setFormData((prev) => ({ ...prev, party_id: id }));
        setShowPartyDropdown(false);
        setUserSearchTerm('');
    };

    const addItem = () => {
        setFormData((prev) => ({
            ...prev,
            items: [...prev.items, { service_id: '', fees: '', remark: '' }],
        }));
    };

    const removeItem = (index) => {
        if (formData.items.length <= 1) return;
        setFormData((prev) => ({
            ...prev,
            items: prev.items.filter((_, i) => i !== index),
        }));
    };

    const handleItemChange = (index, field, value) => {
        setFormData((prev) => ({
            ...prev,
            items: prev.items.map((item, i) => {
                if (i !== index) return item;
                if (field === 'fees') return { ...item, fees: sanitizeDecimalInput(String(value), 2) };
                return { ...item, [field]: value };
            }),
        }));
    };

    const handleServiceChange = (index, serviceId) => {
        if (!serviceId) {
            handleItemChange(index, 'service_id', '');
            return;
        }
        const service = serviceOptions.find((s) => String(s.service_id) === String(serviceId));
        if (!service) return;
        setFormData((prev) => ({
            ...prev,
            items: prev.items.map((item, i) => (
                i === index
                    ? {
                        ...item,
                        service_id: service.service_id,
                        fees: sanitizeDecimalInput(String(service.fees), 2),
                        remark: item.remark || service.remark || '',
                    }
                    : item
            )),
        }));
    };

    const serviceSelectOptions = useMemo(
        () => serviceOptions.map((s) => ({
            value: String(s.service_id),
            label: `${s.name} — ₹${Number(s.fees).toFixed(2)}`,
            searchText: `${s.name} ${s.category || ''} ${s.remark || ''}`,
        })),
        [serviceOptions]
    );

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (isSubmitting) return;

        const partyIdOk = hidePartySelector && fixedParty?.id != null && fixedParty.id !== ''
            ? true
            : Boolean(formData.party_id);
        if (!partyIdOk) {
            toast.error(effectivePurchaseType === 'bank' ? 'Please select a bank' : 'Please select a CA');
            return;
        }

        const hasValidItems = formData.items.some(
            (item) => item.service_id && parseDecimalValue(item.fees) > 0
        );
        if (!hasValidItems) {
            toast.error('Please add at least one valid service item');
            return;
        }

        const selectedParty = getSelectedParty();
        if (effectivePurchaseType === 'ca') {
            if (!selectedParty?.username && !selectedParty?.id) {
                toast.error('CA information is missing');
                return;
            }
        } else if (!selectedParty?.id) {
            toast.error('Bank information is missing');
            return;
        }

        setIsSubmitting(true);
        try {
            const basePayload = {
                transaction_date: formData.transaction_date,
                remark: formData.remark || undefined,
                tax_rate: parseDecimalValue(formData.tax_rate),
                items: formData.items
                    .filter((item) => item.service_id && parseDecimalValue(item.fees) > 0)
                    .map((item) => ({
                        service_id: item.service_id,
                        fees: parseDecimalValue(item.fees),
                        remark: item.remark || undefined,
                    })),
            };

            let endpoint = '';
            let payload = {};

            if (effectivePurchaseType === 'ca') {
                endpoint = `${API_BASE_URL}/purchase/create/user`;
                payload = {
                    ...basePayload,
                    username: selectedParty.username || selectedParty.id,
                    user_type: 'ca',
                };
            } else {
                endpoint = `${API_BASE_URL}/purchase/create/bank`;
                payload = {
                    ...basePayload,
                    bank_id: selectedParty.id,
                };
            }

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify(payload),
            });
            const data = await response.json();
            if (!data.success) throw new Error(data.message || 'Failed to create purchase');

            toast.success(
                typeof data.message === 'string' && data.message.trim()
                    ? data.message.trim()
                    : 'Purchase created successfully'
            );

            const submissionData = {
                ...formData,
                purchase_type: effectivePurchaseType,
                selected_party: selectedParty,
                timestamp: new Date().toISOString(),
                api_response: data,
            };
            onSuccess(submissionData);
            if (mode === 'modal') onClose();
        } catch (error) {
            console.error('Error submitting purchase form:', error);
            toast.error(error.message || 'Error creating purchase. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const purchaseFormId = 'purchase-create-form';
    const formClassMerged = [mode === 'modal' ? 'space-y-3' : 'space-y-5', formClassName].filter(Boolean).join(' ').trim();
    const isCompactModal = mode === 'modal';
    const purchaseFieldClass = getCompactFieldClass(isCompactModal ? 'purple' : 'purple');
    const purchaseLabelClass = isCompactModal ? COMPACT_LABEL : 'block text-sm font-medium text-slate-700 mb-1';
    const purchasePartyListOpen = showPartyDropdown && !formData.party_id;
    const partyReady = hidePartySelector && fixedParty?.id != null && fixedParty.id !== ''
        ? true
        : Boolean(formData.party_id);
    const selectedParty = getSelectedParty();
    const purchaseTotal = formData.items.reduce(
        (sum, item) => sum + parseDecimalValue(item.fees),
        0
    );
    const formatPurchaseMoney = (amount) =>
        new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(parseDecimalValue(amount));
    const hasPurchaseLineReady = formData.items.some(
        (item) => item.service_id && parseDecimalValue(item.fees) > 0
    );

    const purchaseFormElement = (
        <form id={purchaseFormId} onSubmit={handleSubmit} noValidate={isCompactModal} className={formClassMerged || undefined}>
            <div className={isCompactModal ? 'space-y-3' : 'space-y-5 mb-6'}>
                {typeToggleVisible && (
                    <div className="flex rounded-md border border-slate-200 bg-white p-0.5 w-fit" role="group" aria-label="Purchase party type">
                        <button
                            type="button"
                            onClick={() => handlePurchaseTypeChange('ca')}
                            className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${effectivePurchaseType === 'ca' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}
                        >
                            CA
                        </button>
                        <button
                            type="button"
                            onClick={() => handlePurchaseTypeChange('bank')}
                            className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${effectivePurchaseType === 'bank' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}
                        >
                            Bank
                        </button>
                    </div>
                )}

                {!hidePartySelector && effectivePurchaseType === 'ca' && (
                    <div className={isCompactModal ? 'space-y-1.5' : 'space-y-3'}>
                        <label className={purchaseLabelClass}>
                            CA <span className="text-red-500">*</span>
                        </label>
                        {!formData.party_id ? (
                            <>
                                {!isCompactModal && (
                                    <p className="text-xs text-slate-500 mb-1.5">
                                        Search by name, mobile, email, or PAN.
                                    </p>
                                )}
                                <div ref={purchasePartySearchRef}>
                                    <div className={`rounded-md border bg-white overflow-hidden transition-all ${getComboboxOpenClass(purchasePartyListOpen, isCompactModal ? 'purple' : 'purple')}`}>
                                        <div className="flex items-center gap-2 px-2.5 py-1.5">
                                            <FiSearch className="w-3.5 h-3.5 text-slate-400 shrink-0" aria-hidden />
                                            <input
                                                type="text"
                                                value={userSearchTerm}
                                                onChange={(e) => {
                                                    partyDropdownActiveRef.current = true;
                                                    setUserSearchTerm(e.target.value);
                                                    setShowPartyDropdown(true);
                                                    setIsLoadingParties(true);
                                                    setUserOptions([]);
                                                }}
                                                onFocus={loadCasOnFocus}
                                                placeholder="Search by name, mobile, email..."
                                                className="flex-1 min-w-0 border-0 bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-0 py-0.5"
                                                autoComplete="off"
                                            />
                                            {isLoadingParties && purchasePartyListOpen ? (
                                                <ComboboxSearchSpinner />
                                            ) : (
                                                <FiChevronDown
                                                    className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-200 ${purchasePartyListOpen ? 'rotate-180' : ''}`}
                                                    aria-hidden
                                                />
                                            )}
                                        </div>
                                        {purchasePartyListOpen && (
                                            <div
                                                className={`border-t border-slate-100 ${isCompactModal ? 'max-h-56' : 'max-h-60'} overflow-y-auto`}
                                                onScroll={handleUserListScroll}
                                            >
                                                {isLoadingParties ? (
                                                    <ClientSearchSkeletonRows rows={5} />
                                                ) : (
                                                    <>
                                                        {userOptions.map((party) => (
                                                            <ClientSearchOptionRow
                                                                key={party.id}
                                                                client={{
                                                                    name: party.name,
                                                                    mobile: party.contact,
                                                                    email: party.email,
                                                                    pan_number: party.pan_no,
                                                                    country_code: party.country_code,
                                                                    balance: party.balance,
                                                                    username: party.username,
                                                                    profile: party.profile,
                                                                    profile_photo: party.profile_photo,
                                                                    image: party.image,
                                                                }}
                                                                formatBalance={formatPlainInrAmount}
                                                                itemHover={isCompactModal ? 'hover:bg-purple-50' : 'hover:bg-purple-50'}
                                                                onSelect={() => handlePartySelect(party.id)}
                                                            />
                                                        ))}
                                                        {userLoadingMore && <ClientSearchSkeletonRows rows={2} />}
                                                    </>
                                                )}
                                                {!isLoadingParties && !userLoadingMore && userOptions.length === 0 && (
                                                    <p className="px-2.5 py-3 text-xs text-center text-slate-500">No CAs found</p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </>
                        ) : (
                            <SaleClientPreviewCard
                                party={selectedParty}
                                summary={null}
                                formatMoney={formatPlainInrAmount}
                                variant="purchase"
                                onChangeClient={() => {
                                    setFormData((prev) => ({ ...prev, party_id: '' }));
                                    setSelectedPurchaseUser(null);
                                    setUserSearchTerm('');
                                    setUserOptions([]);
                                    setShowPartyDropdown(false);
                                }}
                            />
                        )}
                    </div>
                )}

                {!hidePartySelector && effectivePurchaseType === 'bank' && (
                    <div className={isCompactModal ? 'space-y-1.5' : 'space-y-2'}>
                        <label className={purchaseLabelClass}>
                            Bank Account <span className="text-red-500">*</span>
                        </label>
                        {(!formData.party_id || purchaseBankPickerOpen) ? (
                            <BankSearchDropdown
                                compact={isCompactModal}
                                focusAccent="purple"
                                onSelect={(bank) => {
                                    setFormData((prev) => ({ ...prev, party_id: String(bank.bank_id) }));
                                    setPurchaseBankRow(bank);
                                    setPurchaseBankPickerOpen(false);
                                }}
                                selectedBankId={formData.party_id || undefined}
                            />
                        ) : (
                            <SaleBankPreviewCard
                                bank={bankCardFromSearchOrParty()}
                                onChangeBank={() => setPurchaseBankPickerOpen(true)}
                                formatMoney={formatPlainInrAmount}
                                variant="purchase"
                            />
                        )}
                    </div>
                )}

                {hidePartySelector && showFixedPartyBanner && fixedParty && (
                    <div>
                        {effectivePurchaseType === 'ca' ? (
                            <SaleClientPreviewCard
                                party={selectedParty}
                                summary={null}
                                formatMoney={formatPlainInrAmount}
                                variant="purchase"
                                readOnly
                            />
                        ) : (
                            <SaleBankPreviewCard
                                bank={{
                                    bank: fixedParty.name,
                                    holder: fixedParty.holder || '—',
                                    account_no: fixedParty.account || fixedParty.account_no || '—',
                                    ifsc: fixedParty.ifsc || '—',
                                    branch: fixedParty.branch || '—',
                                    balance: fixedParty.balance ?? 0,
                                }}
                                formatMoney={formatPlainInrAmount}
                                variant="purchase"
                                readOnly
                            />
                        )}
                    </div>
                )}

                <div className={`grid grid-cols-1 gap-3 ${isCompactModal ? 'sm:grid-cols-2' : 'sm:grid-cols-2 gap-4'}`}>
                    <div>
                        <label className={purchaseLabelClass}>
                            Purchase date <span className="text-red-500">*</span>
                        </label>
                        <DatePickerField
                            value={formData.transaction_date}
                            onChange={(value) => {
                                const picked = String(value || '').trim();
                                if (!picked) {
                                    setFormData((prev) => ({ ...prev, transaction_date: '' }));
                                    return;
                                }
                                setFormData((prev) => ({
                                    ...prev,
                                    transaction_date: picked > todayIso ? todayIso : picked,
                                }));
                            }}
                            mode="single"
                            hideTabs={true}
                            showResetButton={false}
                            placeholder="Select date"
                            buttonClassName={isCompactModal ? purchaseFieldClass : 'w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500'}
                            maxSelectableDate={todayIso}
                        />
                    </div>
                    <div>
                        <label className={purchaseLabelClass}>
                            Tax Rate (%) <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            inputMode="decimal"
                            value={String(formData.tax_rate ?? '')}
                            onChange={(e) => setFormData((prev) => ({ ...prev, tax_rate: sanitizeDecimalInput(e.target.value, 2) }))}
                            className={isCompactModal ? purchaseFieldClass : 'w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500'}
                        />
                    </div>
                </div>
            </div>

            <div className={isCompactModal ? 'mb-3' : 'mb-6'}>
                <div className={`flex justify-between items-center ${isCompactModal ? 'mb-2' : 'mb-4'}`}>
                    <h3 className={`${isCompactModal ? 'text-sm font-semibold' : 'text-base font-bold'} text-gray-900`}>
                        Purchase Items
                    </h3>
                    <button
                        type="button"
                        onClick={addItem}
                        disabled={isLoadingServices}
                        className={`inline-flex items-center bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none focus:ring-1 focus:ring-purple-500 focus:ring-offset-1 transition-colors disabled:opacity-50 ${isCompactModal ? 'px-2 py-1 text-xs' : 'px-3 py-2 text-sm shadow-sm'}`}
                    >
                        <FiPlus className={`${isCompactModal ? 'w-3 h-3 mr-1' : 'w-3.5 h-3.5 mr-1.5'}`} aria-hidden />
                        Add Item
                    </button>
                </div>

                {isCompactModal ? (
                    <div className="overflow-hidden border border-gray-300 rounded-md text-sm">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-2 py-1.5 text-left text-[11px] font-semibold text-gray-700 uppercase tracking-wider">Service</th>
                                    <th className="px-2 py-1.5 text-left text-[11px] font-semibold text-gray-700 uppercase tracking-wider">Remark</th>
                                    <th className="px-2 py-1.5 text-right text-[11px] font-semibold text-gray-700 uppercase tracking-wider">Fees</th>
                                    <th className="px-2 py-1.5 text-center text-[11px] font-semibold text-gray-700 uppercase tracking-wider">Action</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {formData.items.map((item, index) => (
                                    <tr key={index} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-2 py-1.5 min-w-[180px]">
                                            <CustomSelect
                                                options={serviceSelectOptions}
                                                value={optionByValue(serviceSelectOptions, item.service_id ? String(item.service_id) : null)}
                                                onChange={(opt) => handleServiceChange(index, opt ? String(opt.value) : '')}
                                                getOptionLabel={(opt) => opt.label}
                                                getOptionValue={(opt) => opt.value}
                                                placeholder={isLoadingServices ? 'Loading…' : 'Select service'}
                                                searchPlaceholder="Search services…"
                                                noOptionsMessage={isLoadingServices ? 'Loading…' : 'No services found'}
                                            />
                                        </td>
                                        <td className="px-2 py-1.5">
                                            <input
                                                type="text"
                                                value={item.remark}
                                                onChange={(e) => handleItemChange(index, 'remark', e.target.value)}
                                                placeholder="Remark"
                                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
                                            />
                                        </td>
                                        <td className="px-2 py-1.5">
                                            <input
                                                type="text"
                                                inputMode="decimal"
                                                value={item.fees}
                                                onChange={(e) => handleItemChange(index, 'fees', e.target.value)}
                                                placeholder="0.00"
                                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 text-right"
                                            />
                                        </td>
                                        <td className="px-2 py-1.5 text-center">
                                            <button
                                                type="button"
                                                onClick={() => removeItem(index)}
                                                disabled={formData.items.length <= 1}
                                                className="inline-flex items-center px-2 py-1 bg-red-50 text-red-600 rounded border border-red-200 text-xs font-medium hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                <IoTrash className="w-3 h-3" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="rounded-xl border border-slate-200 bg-white">
                        <div className="space-y-3 p-4">
                            {formData.items.map((item, index) => (
                                <div key={index} className="grid grid-cols-1 gap-3 rounded-lg border border-slate-100 p-3 sm:grid-cols-12">
                                    <div className="sm:col-span-5">
                                        <label className="mb-1 block text-xs font-medium text-slate-500">Service</label>
                                        <CustomSelect
                                            options={serviceSelectOptions}
                                            value={optionByValue(serviceSelectOptions, item.service_id ? String(item.service_id) : null)}
                                            onChange={(opt) => handleServiceChange(index, opt ? String(opt.value) : '')}
                                            getOptionLabel={(opt) => opt.label}
                                            getOptionValue={(opt) => opt.value}
                                            placeholder={isLoadingServices ? 'Loading services...' : 'Select service'}
                                            searchPlaceholder="Search service..."
                                            noOptionsMessage={isLoadingServices ? 'Loading...' : 'No services found'}
                                        />
                                    </div>
                                    <div className="sm:col-span-3">
                                        <label className="mb-1 block text-xs font-medium text-slate-500">Fees</label>
                                        <input
                                            type="text"
                                            inputMode="decimal"
                                            value={item.fees}
                                            onChange={(e) => handleItemChange(index, 'fees', e.target.value)}
                                            placeholder="0.00"
                                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                                        />
                                    </div>
                                    <div className="sm:col-span-3">
                                        <label className="mb-1 block text-xs font-medium text-slate-500">Item Remark</label>
                                        <input
                                            type="text"
                                            value={item.remark}
                                            onChange={(e) => handleItemChange(index, 'remark', e.target.value)}
                                            placeholder="Optional remark"
                                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                                        />
                                    </div>
                                    <div className="flex items-end sm:col-span-1">
                                        {formData.items.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => removeItem(index)}
                                                className="w-full rounded-lg border border-red-200 p-2 text-red-600 hover:bg-red-50"
                                                title="Remove item"
                                            >
                                                <IoTrash className="mx-auto h-4 w-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <div className={isCompactModal ? 'space-y-3' : 'space-y-4'}>
                <div>
                    <label className={purchaseLabelClass}>Remark</label>
                    <textarea
                        value={formData.remark}
                        onChange={(e) => setFormData((prev) => ({ ...prev, remark: e.target.value }))}
                        rows={isCompactModal ? 2 : 2}
                        placeholder="Any remark"
                        className={isCompactModal ? `${purchaseFieldClass} resize-none` : 'w-full rounded-lg border-2 border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500'}
                    />
                </div>

                {isCompactModal && purchaseTotal > 0 && (
                    <div className="rounded-md border border-purple-100 bg-purple-50/40 p-2.5">
                        <p className={`${COMPACT_LABEL} mb-1.5 text-purple-700/80`}>Summary</p>
                        <div className="flex justify-between items-center text-xs">
                            <span className="text-slate-600">Subtotal</span>
                            <span className="font-semibold text-slate-900 tabular-nums">{formatPurchaseMoney(purchaseTotal)}</span>
                        </div>
                    </div>
                )}

                {isCompactModal && partyReady && (() => {
                    const summaryName = effectivePurchaseType === 'bank'
                        ? (getBankPrimaryLabel(bankCardFromSearchOrParty() || {}) || selectedParty?.name || fixedParty?.name || '—')
                        : (selectedParty?.name || fixedParty?.name || '—');
                    if (!summaryName || summaryName === '—') return null;
                    return (
                        <div className="rounded-md bg-purple-50 border border-purple-100 px-3 py-2 space-y-1">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-purple-700/80">Purchase</p>
                            <div className="flex items-center justify-between gap-2 text-xs">
                                <span className="text-slate-600">{effectivePurchaseType === 'bank' ? 'Purchase from bank' : 'Purchase from CA'}</span>
                                <span className="font-medium text-slate-800 truncate">{summaryName}</span>
                            </div>
                            {purchaseTotal > 0 && (
                                <div className="flex items-center justify-between gap-2 text-xs sm:hidden">
                                    <span className="text-slate-600">Subtotal</span>
                                    <span className="font-semibold text-purple-700 tabular-nums">{formatPurchaseMoney(purchaseTotal)}</span>
                                </div>
                            )}
                        </div>
                    );
                })()}
            </div>
        </form>
    );

    if (mode !== 'modal') return purchaseFormElement;

    const isPurchaseSubmitDisabled = isSubmitting || !partyReady || !hasPurchaseLineReady;
    const defaultSubmitLabel = 'Create Purchase Bill';
    const purchaseAccentBtn = MODAL_ACCENT_STYLES.purchase.primaryBtn;

    const triggerPurchaseSubmit = () => {
        handleSubmit({ preventDefault: () => { } });
    };

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            title={modalTitle}
            maxWidth={modalMaxWidth}
            compact
            closeOnOverlayClick={false}
            accent="purchase"
            titleIcon={<FiTruck className="w-4 h-4" aria-hidden />}
            footer={(
                <div className="flex flex-wrap items-center justify-end gap-2 w-full shrink-0">
                    {purchaseTotal > 0 && (
                        <div className="text-xs text-right mr-1 hidden sm:block">
                            <span className="text-slate-500">Total </span>
                            <span className="font-semibold tabular-nums text-slate-900">{formatPurchaseMoney(purchaseTotal)}</span>
                        </div>
                    )}
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 rounded-md text-xs font-medium hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-500/30 disabled:opacity-50 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        disabled={isPurchaseSubmitDisabled}
                        onClick={triggerPurchaseSubmit}
                        className={`px-3 py-1.5 text-white rounded-md text-xs font-medium focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors inline-flex items-center justify-center min-w-[110px] ${purchaseAccentBtn}`}
                    >
                        {isSubmitting ? 'Creating…' : (submitButtonLabel || defaultSubmitLabel)}
                    </button>
                </div>
            )}
        >
            {purchaseFormElement}
        </BaseModal>
    );
};

/** Spread into `<PurchaseForm />` on a CA ledger page (party known; no search UI). */
export const purchaseFormLedgerClientProps = ({ clientId, clientUsername, clientName }) => ({
    lockedPurchaseType: 'ca',
    hidePartySelector: true,
    showPurchaseTypeToggle: false,
    fixedParty: {
        id: clientId || clientUsername,
        username: clientUsername || clientId,
        name: clientName || clientUsername || String(clientId || ''),
    },
});

/** Alias for CA ledger context. */
export const purchaseFormLedgerCaProps = purchaseFormLedgerClientProps;

/** Spread into `<PurchaseForm />` on a bank ledger page (bank known; no search UI). */
export const purchaseFormLedgerBankProps = ({ bankId, bankName }) => ({
    lockedPurchaseType: 'bank',
    hidePartySelector: true,
    showPurchaseTypeToggle: false,
    fixedParty: {
        id: bankId,
        name: bankName || 'Bank',
    },
});

/** Backward-compatible wrapper used by `TransactionModalManager`. */
export const PurchaseModal = ({ isOpen, onClose, onSubmit, clientUsername, clientName, clientId, bankId, bankName }) => {
    const hasClient = Boolean(String(clientUsername || clientId || '').trim());
    const hasBank = Boolean(String(bankId || '').trim());
    const lockedPurchaseType = hasClient ? 'ca' : hasBank ? 'bank' : null;
    const hidePartySelector = Boolean(lockedPurchaseType);
    const fixedParty = hasClient
        ? {
            id: clientId || clientUsername,
            username: clientUsername || clientId,
            name: clientName || clientUsername || String(clientId || clientUsername || ''),
        }
        : hasBank
            ? { id: bankId, name: bankName || 'Bank' }
            : null;

    return (
        <PurchaseForm
            isOpen={isOpen}
            onClose={onClose}
            onSuccess={(data) => {
                if (onSubmit) onSubmit('PURCHASE', data);
            }}
            mode="modal"
            initialPartyId={fixedParty ? String(fixedParty.id) : ''}
            defaultPurchaseType={lockedPurchaseType || 'ca'}
            lockedPurchaseType={lockedPurchaseType}
            hidePartySelector={hidePartySelector}
            showFixedPartyBanner={!lockedPurchaseType}
            fixedParty={fixedParty}
            modalTitle={
                hasClient
                    ? 'Purchase from CA'
                    : hasBank
                        ? 'Purchase from Bank'
                        : 'Create Purchase Bill'
            }
        />
    );
};

// Expense Modal — bank-funded expense entries (API: /expense/entry/create)
const EMPTY_EXPENSE_LINE = { item_id: '', amount: '' };

const formatExpenseItemTypeShort = (type) => {
    const map = {
        direct: 'Direct',
        indirect: 'Indirect',
        reimbursement: 'Reimbursement',
    };
    return map[String(type || '').toLowerCase()] || type || '';
};

const getExpenseItemOptionLabel = (item) => {
    const name = String(item?.name || '—').trim();
    const typeLabel = formatExpenseItemTypeShort(item?.type);
    return typeLabel ? `${name} (${typeLabel})` : name;
};

export const ExpenseModal = ({
    isOpen,
    onClose,
    bankDetails,
    bankId,
    onSubmit,
    formatCurrency,
    showBank = true,
    editRecord = null,
}) => {
    const [loading, setLoading] = useState(false);
    const [selectedBank, setSelectedBank] = useState(bankDetails || (bankId ? { bank_id: bankId, bank: 'Selected Bank' } : null));
    const [showBankSearch, setShowBankSearch] = useState(false);
    const [transactionDate, setTransactionDate] = useState(new Date().toISOString().split('T')[0]);
    const [remark, setRemark] = useState('');
    const [lines, setLines] = useState([{ ...EMPTY_EXPENSE_LINE }]);
    const [expenseItems, setExpenseItems] = useState([]);
    const [itemsLoading, setItemsLoading] = useState(false);

    const hasPresetBank = Boolean(String(bankId || '').trim());
    const shouldShowBankSelector = showBank && !hasPresetBank;
    const expenseFieldClass = getCompactFieldClass('emerald');
    const expenseAccentBtn = MODAL_ACCENT_STYLES.expense.primaryBtn;
    const todayIso = useMemo(() => new Date().toISOString().split('T')[0], []);
    const isEditMode = Boolean(editRecord?.expense_id);

    const fetchExpenseItems = useCallback(async () => {
        setItemsLoading(true);
        try {
            const response = await axios.get(
                `${API_BASE_URL}/expense/item/list`,
                {
                    headers: getHeaders(),
                    params: {
                        page_no: 1,
                        limit: 100,
                        include_reserved: false,
                    },
                }
            );
            if (response.data?.success) {
                setExpenseItems(response.data.data || []);
            } else {
                setExpenseItems([]);
            }
        } catch (error) {
            console.error('Error fetching expense items:', error);
            toast.error('Failed to load expense items');
            setExpenseItems([]);
        } finally {
            setItemsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!isOpen) return;
        if (isEditMode) {
            const bankSel = mapBankPartyToSelection(editRecord.expense_party);
            setSelectedBank(bankSel || bankDetails || (bankId ? { bank_id: bankId, bank: 'Selected Bank' } : null));
            setShowBankSearch(false);
            setTransactionDate(toIsoDateOnly(editRecord.transaction_date || editRecord.expense_date));
            setRemark(editRecord.remark || '');
            const editLines = Array.isArray(editRecord.items) && editRecord.items.length > 0
                ? editRecord.items.map((line) => ({
                    item_id: line.item_id || line.item?.item_id || '',
                    amount: String(line.amount ?? ''),
                }))
                : [{
                    item_id: editRecord.item?.item_id || '',
                    amount: String(editRecord.amount ?? ''),
                }];
            setLines(editLines);
            setLoading(false);
            fetchExpenseItems();
            return;
        }
        setSelectedBank(bankDetails || (bankId ? { bank_id: bankId, bank: 'Selected Bank' } : null));
        setShowBankSearch(false);
        setTransactionDate(new Date().toISOString().split('T')[0]);
        setRemark('');
        setLines([{ ...EMPTY_EXPENSE_LINE }]);
        setLoading(false);
        fetchExpenseItems();
    }, [isOpen, bankDetails, bankId, fetchExpenseItems, isEditMode, editRecord]);

    const resolveExpenseBank = useCallback(() => {
        if (hasPresetBank) {
            return bankDetails || (bankId ? { bank_id: bankId, bank: 'Selected Bank' } : null);
        }
        return selectedBank;
    }, [hasPresetBank, bankDetails, bankId, selectedBank]);

    const totalAmount = useMemo(
        () => lines.reduce((sum, line) => sum + parseDecimalValue(line.amount), 0),
        [lines]
    );

    const validLines = useMemo(
        () => lines.filter((line) => line.item_id && parseDecimalValue(line.amount) > 0),
        [lines]
    );

    const updateLine = (index, field, value) => {
        setLines((prev) =>
            prev.map((line, i) => (i === index ? { ...line, [field]: value } : line))
        );
    };

    const addLine = () => {
        setLines((prev) => [...prev, { ...EMPTY_EXPENSE_LINE }]);
    };

    const removeLine = (index) => {
        setLines((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));
    };

    const submitExpense = useCallback(async () => {
        if (loading) return;

        const effectiveBank = resolveExpenseBank();
        if (!effectiveBank?.bank_id) {
            toast.error('Please select a bank account');
            return;
        }

        if (!transactionDate) {
            toast.error('Please select a date');
            return;
        }

        if (validLines.length === 0) {
            toast.error('Add at least one expense item with a valid amount');
            return;
        }

        const incompleteLine = lines.find(
            (line) => (line.item_id && parseDecimalValue(line.amount) <= 0) || (!line.item_id && parseDecimalValue(line.amount) > 0)
        );
        if (incompleteLine) {
            toast.error('Please complete all expense lines (item and amount)');
            return;
        }

        setLoading(true);
        const remarkText = String(remark || '').trim();
        const payloadItems = validLines.map((line) => ({
            item_id: line.item_id,
            amount: parseDecimalValue(line.amount),
        }));

        try {
            if (isEditMode) {
                const response = await axios.put(
                    `${API_BASE_URL}/expense/entry/edit`,
                    {
                        expense_id: editRecord.expense_id,
                        items: payloadItems,
                        remark: remarkText,
                        transaction_date: transactionDate,
                        party_id: effectiveBank.bank_id,
                        party_type: 'bank',
                    },
                    { headers: getHeaders() }
                );
                if (!response.data?.success) {
                    toast.error(response.data?.message || 'Failed to update expense entry');
                    return;
                }
                toast.success(response.data.message || 'Expense entry updated successfully');
                if (onSubmit) onSubmit('EXPENSE', response.data.data);
                onClose();
                return;
            }

            const response = await axios.post(
                `${API_BASE_URL}/expense/entry/create`,
                {
                    items: payloadItems,
                    remark: remarkText,
                    transaction_date: transactionDate,
                    party_id: effectiveBank.bank_id,
                    party_type: 'bank',
                },
                { headers: getHeaders() }
            );

            if (!response.data?.success) {
                toast.error(response.data?.message || 'Failed to create expense entry');
                return;
            }

            toast.success(response.data.message || 'Expense entry created successfully');
            if (onSubmit) {
                onSubmit('EXPENSE', response.data.data);
            }
            onClose();
            if (!hasPresetBank) {
                setSelectedBank(bankDetails || null);
                setShowBankSearch(false);
            }
        } catch (error) {
            console.error('Error creating expense entries:', error);
            const errorMessage =
                error.response?.data?.message ||
                error.response?.data?.error ||
                error.message ||
                'Failed to create expense entry';
            toast.error(errorMessage);
        } finally {
            setLoading(false);
        }
    }, [
        loading,
        resolveExpenseBank,
        transactionDate,
        validLines,
        lines,
        remark,
        onSubmit,
        onClose,
        hasPresetBank,
        bankDetails,
        isEditMode,
        editRecord,
    ]);

    const handleSubmit = (e) => {
        e.preventDefault();
        submitExpense();
    };

    const hasSelectedBank = Boolean(resolveExpenseBank()?.bank_id);
    const isExpenseFormValid =
        hasSelectedBank &&
        Boolean(transactionDate) &&
        validLines.length > 0 &&
        !lines.some(
            (line) =>
                (line.item_id && parseDecimalValue(line.amount) <= 0) ||
                (!line.item_id && parseDecimalValue(line.amount) > 0)
        );
    const effectiveExpenseBank = resolveExpenseBank();
    const selectedBankDisplayName = effectiveExpenseBank
        ? getBankPrimaryLabel(effectiveExpenseBank)
        : (bankId ? `Bank #${bankId}` : '—');

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            title={isEditMode ? 'Edit Expense Entry' : 'Create Expense Entry'}
            maxWidth="max-w-3xl"
            compact
            closeOnOverlayClick={false}
            accent="expense"
            titleIcon={<FiFileText className="w-4 h-4" aria-hidden />}
            footer={(
                <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-xs text-slate-500">
                        {validLines.length > 0 ? (
                            <span>
                                <span className="font-medium text-slate-700 tabular-nums">{validLines.length}</span>
                                {' '}
                                line{validLines.length === 1 ? '' : 's'}
                                {' · '}
                                Total{' '}
                                <span className="font-semibold text-emerald-700 tabular-nums">
                                    ₹{formatCurrency ? formatCurrency(totalAmount) : formatPlainInrAmount(totalAmount)}
                                </span>
                            </span>
                        ) : (
                            <span>Add expense items below</span>
                        )}
                    </div>
                    <div className="flex items-center justify-end gap-2 shrink-0">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={loading}
                            className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 rounded-md text-xs font-medium hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-500/30 disabled:opacity-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            disabled={loading || !isExpenseFormValid}
                            onClick={submitExpense}
                            className={`px-3 py-1.5 text-white rounded-md text-xs font-medium focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors inline-flex items-center justify-center min-w-[120px] ${expenseAccentBtn}`}
                        >
                            {loading ? 'Saving…' : (isEditMode ? 'Update Expense' : 'Create Expense')}
                        </button>
                    </div>
                </div>
            )}
        >
            <form id="expense-form" onSubmit={handleSubmit} noValidate className="space-y-3 min-w-0">
                {shouldShowBankSelector && (
                    <div>
                        <label className={COMPACT_LABEL}>
                            Pay from bank <span className="text-red-500">*</span>
                        </label>
                        {(!selectedBank || showBankSearch) ? (
                            <BankSearchDropdown
                                compact
                                focusAccent="emerald"
                                onSelect={(bank) => {
                                    setSelectedBank(bank);
                                    setShowBankSearch(false);
                                }}
                                selectedBankId={selectedBank?.bank_id}
                            />
                        ) : (
                            <SaleBankPreviewCard
                                bank={selectedBank}
                                onChangeBank={() => setShowBankSearch(true)}
                                formatMoney={formatCurrency || formatPlainInrAmount}
                                variant="expense"
                            />
                        )}
                    </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                        <label className={COMPACT_LABEL}>
                            Date <span className="text-red-500">*</span>
                        </label>
                        <DatePickerField
                            value={transactionDate}
                            onChange={(d) => {
                                const picked = String(d || '').trim();
                                if (!picked) {
                                    setTransactionDate('');
                                    return;
                                }
                                setTransactionDate(picked > todayIso ? todayIso : picked);
                            }}
                            mode="single"
                            hideTabs={true}
                            showResetButton={false}
                            placeholder="Select date"
                            buttonClassName={expenseFieldClass}
                            maxSelectableDate={todayIso}
                        />
                    </div>
                    <div>
                        <label className={COMPACT_LABEL}>Remark</label>
                        <input
                            type="text"
                            name="remark"
                            placeholder="Optional note for all lines"
                            value={remark}
                            onChange={(e) => setRemark(e.target.value)}
                            className={expenseFieldClass}
                        />
                    </div>
                </div>

                <div className="rounded-md border border-slate-200 bg-slate-50/50 p-3 space-y-2 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                            Expense items
                        </p>
                        {!isEditMode && (
                            <button
                                type="button"
                                onClick={addLine}
                                className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-white px-2 py-1 text-[11px] font-medium text-emerald-700 hover:bg-emerald-50 transition-colors shrink-0"
                            >
                                <FiPlus className="w-3 h-3" />
                                Add line
                            </button>
                        )}
                    </div>

                    {itemsLoading ? (
                        <div className="space-y-2">
                            {[...Array(2)].map((_, i) => (
                                <div key={i} className="h-9 animate-pulse rounded-md bg-slate-200/70" />
                            ))}
                        </div>
                    ) : expenseItems.length === 0 ? (
                        <p className="text-xs text-slate-500 py-2">
                            No expense items found. Create items from the Expense Items page first.
                        </p>
                    ) : (
                        <div className="space-y-2 min-w-0">
                            <div className="grid grid-cols-[minmax(0,1fr)_76px_28px] gap-1.5 items-center px-0.5">
                                <span className="text-[10px] font-medium uppercase tracking-wide text-slate-400">Item</span>
                                <span className="text-[10px] font-medium uppercase tracking-wide text-slate-400 text-right">Amount</span>
                                <span className="sr-only">Remove</span>
                            </div>
                            {lines.map((line, index) => (
                                <div
                                    key={`expense-line-${index}`}
                                    className="grid grid-cols-[minmax(0,1fr)_76px_28px] gap-1.5 items-center min-w-0"
                                >
                                    <CustomSelect
                                        options={expenseItems}
                                        value={optionByValue(expenseItems, line.item_id, 'item_id')}
                                        onChange={(opt) => updateLine(index, 'item_id', opt ? opt.item_id : '')}
                                        getOptionLabel={getExpenseItemOptionLabel}
                                        getOptionValue={(item) => item.item_id}
                                        placeholder="Select expense item"
                                        searchPlaceholder="Search expense item..."
                                        noOptionsMessage="No items found"
                                        isClearable={false}
                                    />
                                    <input
                                        type="text"
                                        inputMode="decimal"
                                        placeholder="0.00"
                                        value={line.amount}
                                        onChange={(e) => updateLine(index, 'amount', sanitizeDecimalInput(e.target.value, 2))}
                                        className={`${expenseFieldClass} w-full min-w-0 px-2 text-right tabular-nums`}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => removeLine(index)}
                                        disabled={lines.length <= 1 || isEditMode}
                                        className={`flex h-8 w-7 mx-auto items-center justify-center rounded-md text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-30 disabled:hover:bg-transparent transition-colors ${isEditMode ? 'invisible' : ''}`}
                                        aria-label="Remove line"
                                    >
                                        <FiTrash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {hasSelectedBank && validLines.length > 0 && (
                    <div className="rounded-md bg-emerald-50 border border-emerald-100 px-3 py-2 space-y-1">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700/80">Summary</p>
                        <div className="flex items-center justify-between gap-2 text-xs">
                            <span className="text-slate-600">Pay from</span>
                            <span className="font-medium text-slate-800 truncate">{selectedBankDisplayName}</span>
                        </div>
                        <div className="flex items-center justify-between gap-2 text-xs">
                            <span className="text-slate-600">Total amount</span>
                            <span className="font-semibold text-emerald-700 tabular-nums">
                                ₹{formatCurrency ? formatCurrency(totalAmount) : formatPlainInrAmount(totalAmount)}
                            </span>
                        </div>
                    </div>
                )}
            </form>
        </BaseModal>
    );
};

// Journal Modal — transfer between Client, Agent, or CA ledgers
export const JournalModal = ({
    isOpen,
    onClose,
    onSubmit,
    formatCurrency,
    showSummary = true,
    showFromClient = true,
    showToClient = true,
    /** Optional preset “from” user (username) when opening from a ledger context */
    clientUsername = '',
    clientName = '',
    partyType = 'client',
    partyLabel = 'Client',
    /** Legacy: hide entire from block — maps to !showFromClient */
    showClient = true,
    editRecord = null,
}) => {
    const presetFromType = partyType === 'agent' || partyType === 'ca' ? partyType : 'client';
    const showFromSection = showClient && showFromClient;
    const [loading, setLoading] = useState(false);
    const [presetFromParty, setPresetFromParty] = useState(null);
    const [loadingPresetFrom, setLoadingPresetFrom] = useState(false);
    const [transactionDate, setTransactionDate] = useState(new Date().toISOString().split('T')[0]);
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [excludeForFromLookup, setExcludeForFromLookup] = useState(null);
    const [excludeForToLookup, setExcludeForToLookup] = useState(null);

    const todayIso = useMemo(() => new Date().toISOString().split('T')[0], []);
    const journalFieldClass = getCompactFieldClass('indigo');
    const journalAccentBtn = MODAL_ACCENT_STYLES.journal.primaryBtn;
    const isEditMode = Boolean(editRecord?.transaction_id);

    const hasPresetFromParam = Boolean(String(clientUsername || '').trim());

    const shouldShowFromSelector = showFromSection && !hasPresetFromParam;
    const shouldShowToSelector = showToClient;

    const fromPartyLookup = useTransactionPartySearch(JOURNAL_PARTY_SEARCH_TYPES, Boolean(shouldShowFromSelector), {
        fetchOnFocusOnly: true,
        excludeParty: excludeForFromLookup,
    });
    const toPartyLookup = useTransactionPartySearch(JOURNAL_PARTY_SEARCH_TYPES, Boolean(shouldShowToSelector), {
        fetchOnFocusOnly: true,
        excludeParty: excludeForToLookup,
    });

    const journalPartyRowKey = (party) => `${party.userType || 'client'}:${party.party_id || party.username || party.bank_id || ''}`;
    const journalSearchPlaceholder = 'Search client, CA, agent, staff, capital, bank, or expense';
    const journalSearchHint = 'Search client, CA, agent, staff, capital, bank, or expense.';

    useEffect(() => {
        if (!isOpen || !hasPresetFromParam) {
            setPresetFromParty(null);
            setLoadingPresetFrom(false);
            return undefined;
        }
        let cancelled = false;
        setLoadingPresetFrom(true);
        (async () => {
            try {
                const match = await fetchPresetTransactionParty(clientUsername, presetFromType, JOURNAL_PARTY_SEARCH_TYPES);
                if (match && !cancelled) {
                    setPresetFromParty(match);
                }
            } catch (err) {
                console.error('Journal preset party fetch:', err);
            } finally {
                if (!cancelled) setLoadingPresetFrom(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [isOpen, clientUsername, hasPresetFromParam, presetFromType]);

    useEffect(() => {
        if (!isOpen) return;
        if (isEditMode) {
            setTransactionDate(toIsoDateOnly(editRecord.transaction_date));
            setAmount(String(editRecord.amount ?? ''));
            setDescription(editRecord.remark || '');
            setLoading(false);
            const fromParty = mapUserPartyToJournal(editRecord.payment_from);
            const toParty = mapUserPartyToJournal(editRecord.payment_to);
            if (fromParty && shouldShowFromSelector) fromPartyLookup.setSelectedFirm(fromParty);
            if (toParty && shouldShowToSelector) toPartyLookup.setSelectedFirm(toParty);
            return;
        }
        setExcludeForFromLookup(null);
        setExcludeForToLookup(null);
        setTransactionDate(new Date().toISOString().split('T')[0]);
        setAmount('');
        setDescription('');
        setLoading(false);
        fromPartyLookup.reset();
        toPartyLookup.reset();
    }, [isOpen, isEditMode, editRecord]); // eslint-disable-line react-hooks/exhaustive-deps

    const effectiveFromParty = hasPresetFromParam
        ? (presetFromParty || {
            username: clientUsername,
            party_id: clientUsername,
            name: clientName || clientUsername,
            balance: 0,
            userType: presetFromType,
        })
        : fromPartyLookup.selectedFirm;

    const effectiveToParty = toPartyLookup.selectedFirm;

    useEffect(() => {
        setExcludeForToLookup(
            effectiveFromParty && transactionPartyKey(effectiveFromParty) ? effectiveFromParty : null
        );
    }, [effectiveFromParty]);

    useEffect(() => {
        setExcludeForFromLookup(
            effectiveToParty && transactionPartyKey(effectiveToParty) ? effectiveToParty : null
        );
    }, [effectiveToParty]);

    const fromPartyKey = journalPartyKey(effectiveFromParty, hasPresetFromParam ? presetFromType : 'client');
    const toPartyKey = journalPartyKey(effectiveToParty, 'client');

    const isJournalFormValid =
        Boolean(fromPartyKey) &&
        Boolean(toPartyKey) &&
        fromPartyKey !== toPartyKey &&
        parseDecimalValue(amount) > 0 &&
        !(hasPresetFromParam && loadingPresetFrom);

    const submitJournal = useCallback(async () => {
        if (loading) return;
        if (!effectiveFromParty || !effectiveToParty) {
            toast.error('Please select both users');
            return;
        }
        if (fromPartyKey === toPartyKey) {
            toast.error('Cannot transfer to the same account');
            return;
        }

        const parsedAmount = parseDecimalValue(amount);
        if (!parsedAmount || parsedAmount <= 0) {
            toast.error('Please enter a valid amount');
            return;
        }

        if (!transactionDate) {
            toast.error('Please select a date');
            return;
        }

        if (hasPresetFromParam && loadingPresetFrom) {
            toast.error('Loading source user…');
            return;
        }

        const remarkText = String(description || '').trim();
        const fromResolved = resolveTransactionPartySelection(
            effectiveFromParty,
            hasPresetFromParam ? presetFromType : (effectiveFromParty?.userType || 'client')
        );
        const toResolved = resolveTransactionPartySelection(
            effectiveToParty,
            effectiveToParty?.userType || 'client'
        );
        const fromLabel = JOURNAL_PARTY_TYPE_LABELS[fromResolved.party_type] || 'User';
        const toLabel = JOURNAL_PARTY_TYPE_LABELS[toResolved.party_type] || 'User';

        const payload = {
            amount: parsedAmount,
            party1_id: fromResolved.party_id,
            party2_id: toResolved.party_id,
            party1_type: fromResolved.party_type,
            party2_type: toResolved.party_type,
            remark:
                remarkText ||
                `Journal transfer from ${fromLabel} ${effectiveFromParty.name || fromResolved.party_id} to ${toLabel} ${effectiveToParty.name || toResolved.party_id}`,
            transaction_date: transactionDate,
        };

        setLoading(true);
        try {
            const response = isEditMode
                ? await axios.put(
                    `${API_BASE_URL}/journal/edit`,
                    {
                        ...payload,
                        journal_id: editRecord.journal_id,
                        transaction_id: editRecord.transaction_id,
                    },
                    { headers: getHeaders() }
                )
                : await axios.post(`${API_BASE_URL}/journal/create`, payload, {
                    headers: getHeaders(),
                });
            if (response.data.success) {
                toast.success(response.data.message || (isEditMode ? 'Journal updated successfully' : 'Journal entry created successfully'));
                if (onSubmit) onSubmit('JOURNAL', response.data.data);
                onClose();
            } else {
                toast.error(response.data.message || 'Failed to create journal entry');
            }
        } catch (error) {
            console.error('Error creating journal entry:', error);
            const errorMessage =
                error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to create journal entry';
            toast.error(errorMessage);
        } finally {
            setLoading(false);
        }
    }, [
        loading,
        effectiveFromParty,
        effectiveToParty,
        fromPartyKey,
        toPartyKey,
        amount,
        transactionDate,
        description,
        hasPresetFromParam,
        presetFromType,
        loadingPresetFrom,
        onSubmit,
        onClose,
        isEditMode,
        editRecord,
    ]);

    const handleSubmit = (e) => {
        e.preventDefault();
        submitJournal();
    };

    const shouldShowJournalSummary =
        showSummary && Boolean(effectiveFromParty) && Boolean(effectiveToParty);

    const fromPartyDisplayName = effectiveFromParty?.name || effectiveFromParty?.username || effectiveFromParty?.party_id || '—';
    const toPartyDisplayName = effectiveToParty?.name || effectiveToParty?.username || effectiveToParty?.party_id || '—';
    const fromTypeLabel = JOURNAL_PARTY_TYPE_LABELS[effectiveFromParty?.userType || (hasPresetFromParam ? presetFromType : 'client')] || partyLabel;
    const toTypeLabel = JOURNAL_PARTY_TYPE_LABELS[effectiveToParty?.userType || 'client'] || 'Party';
    const presetFromLabel = `From ${partyLabel || fromTypeLabel}`;

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            title={isEditMode ? 'Edit Journal Entry' : 'Journal Transfer'}
            maxWidth="max-w-3xl"
            compact
            closeOnOverlayClick={false}
            accent="journal"
            titleIcon={<FiFileText className="w-4 h-4" aria-hidden />}
            footer={(
                <div className="flex items-center justify-end gap-2 w-full shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={loading}
                        className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 rounded-md text-xs font-medium hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-500/30 disabled:opacity-50 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        disabled={loading || !isJournalFormValid || (hasPresetFromParam && loadingPresetFrom)}
                        onClick={submitJournal}
                        className={`px-3 py-1.5 text-white rounded-md text-xs font-medium focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors inline-flex items-center justify-center min-w-[110px] ${journalAccentBtn}`}
                    >
                        {loading ? 'Processing…' : (hasPresetFromParam && loadingPresetFrom ? 'Loading…' : (isEditMode ? 'Update Journal' : 'Transfer'))}
                    </button>
                </div>
            )}
        >
            <form id="journal-form" onSubmit={handleSubmit} noValidate className="space-y-3">
                {shouldShowFromSelector && (
                    <FirmClientSearchFields
                        variant="receive"
                        label="From"
                        formatCurrency={formatCurrency}
                        compact
                        hideSearchHint
                        focusAccent="indigo"
                        searchPlaceholder={journalSearchPlaceholder}
                        searchHint={journalSearchHint}
                        emptyMessage="No parties found"
                        showPartyType
                        getRowKey={journalPartyRowKey}
                        searchTerm={fromPartyLookup.searchTerm}
                        setSearchTerm={fromPartyLookup.setSearchTerm}
                        firms={fromPartyLookup.firms}
                        setFirms={fromPartyLookup.setFirms}
                        showDropdown={fromPartyLookup.showDropdown}
                        setShowDropdown={fromPartyLookup.setShowDropdown}
                        openDropdown={fromPartyLookup.openDropdown}
                        dismissDropdown={fromPartyLookup.dismissDropdown}
                        searchLoading={fromPartyLookup.searchLoading}
                        loadingMore={fromPartyLookup.loadingMore}
                        handleListScroll={fromPartyLookup.handleListScroll}
                        clearSelection={fromPartyLookup.clearSelection}
                        onSearchFocus={fromPartyLookup.loadPartiesOnFocus}
                        selectedFirm={fromPartyLookup.selectedFirm}
                        setSelectedFirm={fromPartyLookup.setSelectedFirm}
                    />
                )}

                {showFromSection && hasPresetFromParam && effectiveFromParty && (
                    <FirmClientSearchFields
                        variant="receive"
                        label={presetFromLabel}
                        lockedFirm={effectiveFromParty}
                        readOnly
                        formatCurrency={formatCurrency}
                        compact
                        focusAccent="indigo"
                    />
                )}

                {shouldShowToSelector && (
                    <FirmClientSearchFields
                        variant="payment"
                        label="To"
                        formatCurrency={formatCurrency}
                        compact
                        hideSearchHint
                        focusAccent="indigo"
                        searchPlaceholder={journalSearchPlaceholder}
                        searchHint={journalSearchHint}
                        emptyMessage="No parties found"
                        showPartyType
                        getRowKey={journalPartyRowKey}
                        searchTerm={toPartyLookup.searchTerm}
                        setSearchTerm={toPartyLookup.setSearchTerm}
                        firms={toPartyLookup.firms}
                        setFirms={toPartyLookup.setFirms}
                        showDropdown={toPartyLookup.showDropdown}
                        setShowDropdown={toPartyLookup.setShowDropdown}
                        openDropdown={toPartyLookup.openDropdown}
                        dismissDropdown={toPartyLookup.dismissDropdown}
                        searchLoading={toPartyLookup.searchLoading}
                        loadingMore={toPartyLookup.loadingMore}
                        handleListScroll={toPartyLookup.handleListScroll}
                        clearSelection={toPartyLookup.clearSelection}
                        onSearchFocus={toPartyLookup.loadPartiesOnFocus}
                        selectedFirm={toPartyLookup.selectedFirm}
                        setSelectedFirm={toPartyLookup.setSelectedFirm}
                    />
                )}

                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className={COMPACT_LABEL}>
                            Date <span className="text-red-500">*</span>
                        </label>
                        <DatePickerField
                            value={transactionDate}
                            onChange={(d) => {
                                const picked = String(d || '').trim();
                                if (!picked) {
                                    setTransactionDate('');
                                    return;
                                }
                                setTransactionDate(picked > todayIso ? todayIso : picked);
                            }}
                            mode="single"
                            hideTabs={true}
                            showResetButton={false}
                            placeholder="Select date"
                            buttonClassName={journalFieldClass}
                            maxSelectableDate={todayIso}
                        />
                    </div>
                    <div>
                        <label className={COMPACT_LABEL}>
                            Amount <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            name="amount"
                            placeholder="0.00"
                            inputMode="decimal"
                            value={amount}
                            onChange={(e) => setAmount(sanitizeDecimalInput(e.target.value, 2))}
                            className={journalFieldClass}
                        />
                    </div>
                </div>

                <div>
                    <label className={COMPACT_LABEL}>Description / Remark</label>
                    <textarea
                        name="description"
                        placeholder="Optional note"
                        rows="2"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className={`${journalFieldClass} resize-none`}
                    />
                </div>

                {shouldShowJournalSummary && (
                    <div className="rounded-md bg-indigo-50 border border-indigo-100 px-3 py-2 space-y-1">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-indigo-700/80">Summary</p>
                        <div className="flex items-center justify-between gap-2 text-xs">
                            <span className="text-slate-600">From {fromTypeLabel}</span>
                            <span className="font-medium text-slate-800 truncate">{fromPartyDisplayName}</span>
                        </div>
                        <div className="flex items-center justify-between gap-2 text-xs">
                            <span className="text-slate-600">To {toTypeLabel}</span>
                            <span className="font-medium text-indigo-700 truncate">{toPartyDisplayName}</span>
                        </div>
                        {parseDecimalValue(amount) > 0 && (
                            <div className="flex items-center justify-between gap-2 text-xs pt-0.5 border-t border-indigo-100/80">
                                <span className="text-slate-600">Amount</span>
                                <span className="font-semibold text-indigo-700 tabular-nums">₹{formatPlainInrAmount(amount)}</span>
                            </div>
                        )}
                    </div>
                )}
            </form>
        </BaseModal>
    );
};

// Contra Modal - API integrated bank-to-bank transfer
export const ContraModal = ({
    isOpen,
    onClose,
    onSubmit,
    formatCurrency,
    showSummary = true,
    showFromBank = true,
    showToBank = true,
    fromBankDetails = null,
    fromBankId = '',
    toBankDetails = null,
    toBankId = '',
    editRecord = null,
}) => {
    const [loading, setLoading] = useState(false);
    const [selectedFromBank, setSelectedFromBank] = useState(fromBankDetails || (fromBankId ? { bank_id: fromBankId, bank: 'Selected Bank' } : null));
    const [selectedToBank, setSelectedToBank] = useState(toBankDetails || (toBankId ? { bank_id: toBankId, bank: 'Selected Bank' } : null));
    const [showFromBankSearch, setShowFromBankSearch] = useState(false);
    const [showToBankSearch, setShowToBankSearch] = useState(false);
    const [transactionDate, setTransactionDate] = useState(new Date().toISOString().split('T')[0]);
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');

    const todayIso = useMemo(() => new Date().toISOString().split('T')[0], []);
    const contraFieldClass = getCompactFieldClass('teal');
    const contraAccentBtn = MODAL_ACCENT_STYLES.contra.primaryBtn;
    const isEditMode = Boolean(editRecord?.transaction_id || editRecord?.contra_id);

    const hasPresetFromBank = Boolean(String(fromBankId || '').trim());
    const hasPresetToBank = Boolean(String(toBankId || '').trim());
    const shouldShowFromBankSelector = showFromBank && !hasPresetFromBank;
    const shouldShowToBankSelector = showToBank && !hasPresetToBank;

    useEffect(() => {
        if (!isOpen) return;
        if (isEditMode) {
            const fromBank = mapBankPartyToSelection(editRecord.payment_from);
            const toBank = mapBankPartyToSelection(editRecord.payment_to);
            if (fromBank && !hasPresetFromBank) setSelectedFromBank(fromBank);
            if (toBank && !hasPresetToBank) setSelectedToBank(toBank);
            setShowFromBankSearch(false);
            setShowToBankSearch(false);
            setTransactionDate(toIsoDateOnly(editRecord.transaction_date));
            setAmount(String(editRecord.amount ?? ''));
            setDescription(editRecord.remark || '');
            setLoading(false);
            return;
        }
        setSelectedFromBank(fromBankDetails || (fromBankId ? { bank_id: fromBankId, bank: 'Selected Bank' } : null));
        setSelectedToBank(toBankDetails || (toBankId ? { bank_id: toBankId, bank: 'Selected Bank' } : null));
        setShowFromBankSearch(false);
        setShowToBankSearch(false);
        setTransactionDate(new Date().toISOString().split('T')[0]);
        setAmount('');
        setDescription('');
        setLoading(false);
    }, [isOpen, fromBankDetails, fromBankId, toBankDetails, toBankId, isEditMode, editRecord, hasPresetFromBank, hasPresetToBank]);

    const effectiveFromBank = hasPresetFromBank
        ? {
            bank_id: fromBankId,
            bank: fromBankDetails?.bank || fromBankDetails?.holder || 'Selected Bank',
            balance: fromBankDetails?.balance ?? 0,
        }
        : selectedFromBank;
    const effectiveToBank = hasPresetToBank
        ? {
            bank_id: toBankId,
            bank: toBankDetails?.bank || toBankDetails?.holder || 'Selected Bank',
            balance: toBankDetails?.balance ?? 0,
        }
        : selectedToBank;

    const selectedFromBankId = String(effectiveFromBank?.bank_id || '');
    const selectedToBankId = String(effectiveToBank?.bank_id || '');

    const isContraFormValid =
        Boolean(effectiveFromBank) &&
        Boolean(effectiveToBank) &&
        selectedFromBankId !== '' &&
        selectedToBankId !== '' &&
        selectedFromBankId !== selectedToBankId &&
        parseDecimalValue(amount) > 0;

    const submitContra = useCallback(async () => {
        if (loading) return;
        if (!effectiveFromBank || !effectiveToBank) {
            toast.error('Please select both banks');
            return;
        }
        if (String(effectiveFromBank.bank_id) === String(effectiveToBank.bank_id)) {
            toast.error('Cannot transfer between the same bank account');
            return;
        }

        const parsedAmount = parseDecimalValue(amount);
        if (!parsedAmount || parsedAmount <= 0) {
            toast.error('Please enter a valid amount');
            return;
        }

        if (!transactionDate) {
            toast.error('Please select a date');
            return;
        }

        if (!isEditMode && parsedAmount > parseDecimalValue(effectiveFromBank.balance || 0)) {
            toast.error('Insufficient balance in source bank account');
            return;
        }

        const remarkText = String(description || '').trim();
        const fromBankLabel = getBankPrimaryLabel(effectiveFromBank);
        const toBankLabel = getBankPrimaryLabel(effectiveToBank);

        const payload = {
            party_1: effectiveFromBank.bank_id,
            party_2: effectiveToBank.bank_id,
            transaction_date: transactionDate,
            amount: parsedAmount,
            remark: remarkText || `Contra transfer from ${fromBankLabel} to ${toBankLabel}`,
        };

        setLoading(true);
        try {
            const response = isEditMode
                ? await axios.put(
                    `${API_BASE_URL}/contra/edit`,
                    {
                        ...payload,
                        contra_id: editRecord.contra_id,
                        transaction_id: editRecord.transaction_id,
                    },
                    { headers: getHeaders() }
                )
                : await axios.post(
                    `${API_BASE_URL}/contra/create`,
                    payload,
                    { headers: getHeaders() }
                );
            if (response.data.success) {
                toast.success(response.data.message || (isEditMode ? 'Contra updated successfully' : 'Contra transfer completed successfully'));
                if (onSubmit) onSubmit('CONTRA', response.data.data);
                onClose();
            } else {
                toast.error(response.data.message || 'Failed to create contra transfer');
            }
        } catch (error) {
            console.error('Error creating contra transfer:', error);
            const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to create contra transfer';
            toast.error(errorMessage);
        } finally {
            setLoading(false);
        }
    }, [
        loading,
        effectiveFromBank,
        effectiveToBank,
        amount,
        transactionDate,
        description,
        onSubmit,
        onClose,
        isEditMode,
        editRecord,
    ]);

    const handleSubmit = (e) => {
        e.preventDefault();
        submitContra();
    };

    const shouldShowContraSummary = showSummary && effectiveFromBank && effectiveToBank;
    const fromBankDisplayName = effectiveFromBank ? getBankPrimaryLabel(effectiveFromBank) : '—';
    const toBankDisplayName = effectiveToBank ? getBankPrimaryLabel(effectiveToBank) : '—';

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            title={isEditMode ? 'Edit Contra Entry' : 'Bank Transfer (Contra)'}
            maxWidth="max-w-3xl"
            compact
            closeOnOverlayClick={false}
            accent="contra"
            titleIcon={<FiRepeat className="w-4 h-4" aria-hidden />}
            footer={(
                <div className="flex items-center justify-end gap-2 w-full shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={loading}
                        className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 rounded-md text-xs font-medium hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-500/30 disabled:opacity-50 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        disabled={loading || !isContraFormValid}
                        onClick={submitContra}
                        className={`px-3 py-1.5 text-white rounded-md text-xs font-medium focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors inline-flex items-center justify-center min-w-[110px] ${contraAccentBtn}`}
                    >
                        {loading ? 'Processing…' : (isEditMode ? 'Update Contra' : 'Transfer Funds')}
                    </button>
                </div>
            )}
        >
            <form id="contra-form" onSubmit={handleSubmit} noValidate className="space-y-3">
                {shouldShowFromBankSelector && (
                    <div>
                        <label className={COMPACT_LABEL}>
                            From bank <span className="text-red-500">*</span>
                        </label>
                        {(!selectedFromBank || showFromBankSearch) ? (
                            <BankSearchDropdown
                                compact
                                focusAccent="teal"
                                onSelect={(bank) => {
                                    setSelectedFromBank(bank);
                                    setShowFromBankSearch(false);
                                }}
                                selectedBankId={selectedFromBank?.bank_id}
                                excludeBankId={effectiveToBank?.bank_id}
                            />
                        ) : (
                            <SaleBankPreviewCard
                                bank={selectedFromBank}
                                onChangeBank={() => setShowFromBankSearch(true)}
                                formatMoney={formatPlainInrAmount}
                                variant="contra"
                            />
                        )}
                    </div>
                )}

                {showFromBank && hasPresetFromBank && effectiveFromBank && (
                    <div>
                        <label className={COMPACT_LABEL}>From bank</label>
                        <SaleBankPreviewCard
                            bank={effectiveFromBank}
                            formatMoney={formatPlainInrAmount}
                            variant="contra"
                            readOnly
                        />
                    </div>
                )}

                {shouldShowToBankSelector && (
                    <div>
                        <label className={COMPACT_LABEL}>
                            To bank <span className="text-red-500">*</span>
                        </label>
                        {(!selectedToBank || showToBankSearch) ? (
                            <BankSearchDropdown
                                compact
                                focusAccent="teal"
                                onSelect={(bank) => {
                                    setSelectedToBank(bank);
                                    setShowToBankSearch(false);
                                }}
                                selectedBankId={selectedToBank?.bank_id}
                                excludeBankId={effectiveFromBank?.bank_id}
                            />
                        ) : (
                            <SaleBankPreviewCard
                                bank={selectedToBank}
                                onChangeBank={() => setShowToBankSearch(true)}
                                formatMoney={formatPlainInrAmount}
                                variant="contra"
                            />
                        )}
                    </div>
                )}

                {showToBank && hasPresetToBank && effectiveToBank && (
                    <div>
                        <label className={COMPACT_LABEL}>To bank</label>
                        <SaleBankPreviewCard
                            bank={effectiveToBank}
                            formatMoney={formatPlainInrAmount}
                            variant="contra"
                            readOnly
                        />
                    </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className={COMPACT_LABEL}>
                            Date <span className="text-red-500">*</span>
                        </label>
                        <DatePickerField
                            value={transactionDate}
                            onChange={(d) => {
                                const picked = String(d || '').trim();
                                if (!picked) {
                                    setTransactionDate('');
                                    return;
                                }
                                setTransactionDate(picked > todayIso ? todayIso : picked);
                            }}
                            mode="single"
                            hideTabs={true}
                            showResetButton={false}
                            placeholder="Select date"
                            buttonClassName={contraFieldClass}
                            maxSelectableDate={todayIso}
                        />
                    </div>
                    <div>
                        <label className={COMPACT_LABEL}>
                            Amount <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            name="amount"
                            placeholder="0.00"
                            inputMode="decimal"
                            value={amount}
                            onChange={(e) => setAmount(sanitizeDecimalInput(e.target.value, 2))}
                            className={contraFieldClass}
                        />
                    </div>
                </div>

                <div>
                    <label className={COMPACT_LABEL}>Description / Remark</label>
                    <textarea
                        name="description"
                        placeholder="Optional note"
                        rows="2"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className={`${contraFieldClass} resize-none`}
                    />
                </div>

                {shouldShowContraSummary && (
                    <div className="rounded-md bg-teal-50 border border-teal-100 px-3 py-2 space-y-1">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-teal-700/80">Summary</p>
                        {showFromBank && (
                            <div className="flex items-center justify-between gap-2 text-xs">
                                <span className="text-slate-600">From bank</span>
                                <span className="font-medium text-slate-800 truncate">{fromBankDisplayName}</span>
                            </div>
                        )}
                        {showToBank && (
                            <div className="flex items-center justify-between gap-2 text-xs">
                                <span className="text-slate-600">To bank</span>
                                <span className="font-medium text-teal-700 truncate">{toBankDisplayName}</span>
                            </div>
                        )}
                        {parseDecimalValue(amount) > 0 && (
                            <div className="flex items-center justify-between gap-2 text-xs pt-0.5 border-t border-teal-100/80">
                                <span className="text-slate-600">Amount</span>
                                <span className="font-semibold text-teal-700 tabular-nums">₹{formatPlainInrAmount(amount)}</span>
                            </div>
                        )}
                    </div>
                )}
            </form>
        </BaseModal>
    );
};

export const DiscountModal = ({
    isOpen,
    onClose,
    onSubmit,
    formatCurrency,
    showClient = true,
    clientUsername = '',
    clientName = '',
    partyType = 'client',
    partyLabel = 'Client',
    editRecord = null,
}) => {
    const presetPartyType = partyType === 'agent' || partyType === 'ca' || partyType === 'staff' ? partyType : 'client';
    const hasPresetClient = Boolean(String(clientUsername || '').trim());
    const shouldShowClientSelector = showClient && !hasPresetClient;
    const [loading, setLoading] = useState(false);
    const [presetParty, setPresetParty] = useState(null);
    const [loadingPresetParty, setLoadingPresetParty] = useState(false);
    const [selectedPartyType, setSelectedPartyType] = useState('client');
    const [transactionDate, setTransactionDate] = useState(new Date().toISOString().split('T')[0]);
    const [amount, setAmount] = useState('');
    const [remark, setRemark] = useState('');

    const partyLookup = useJournalPartySearch(selectedPartyType, Boolean(shouldShowClientSelector));
    const discountFieldClass = getCompactFieldClass('amber');
    const discountAccentBtn = MODAL_ACCENT_STYLES.discount.primaryBtn;
    const todayIso = useMemo(() => new Date().toISOString().split('T')[0], []);
    const isEditMode = Boolean(editRecord?.discount_id);

    useEffect(() => {
        if (!isOpen || !hasPresetClient) {
            setPresetParty(null);
            setLoadingPresetParty(false);
            return undefined;
        }
        let cancelled = false;
        setLoadingPresetParty(true);
        (async () => {
            try {
                const match = await fetchPresetJournalParty(clientUsername, presetPartyType);
                if (match && !cancelled) {
                    setPresetParty(match);
                }
            } catch (err) {
                console.error('Discount preset party fetch:', err);
            } finally {
                if (!cancelled) setLoadingPresetParty(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [isOpen, clientUsername, hasPresetClient, presetPartyType]);

    useEffect(() => {
        if (!isOpen) return;
        if (isEditMode) {
            const party = editRecord.discount_party || editRecord.payment_from;
            const partyTypeVal = party?.type || editRecord.party_type || 'client';
            setSelectedPartyType(
                partyTypeVal === 'agent' || partyTypeVal === 'ca' || partyTypeVal === 'staff' ? partyTypeVal : 'client'
            );
            setTransactionDate(toIsoDateOnly(editRecord.transaction_date || editRecord.discount_date));
            setAmount(String(editRecord.amount ?? ''));
            setRemark(editRecord.remark || '');
            setLoading(false);
            const mappedParty = mapUserPartyToJournal(party);
            if (mappedParty?.username && shouldShowClientSelector) {
                partyLookup.setSelectedParty(mappedParty);
            }
            return;
        }
        setSelectedPartyType(hasPresetClient ? presetPartyType : 'client');
        setTransactionDate(new Date().toISOString().split('T')[0]);
        setAmount('');
        setRemark('');
        setLoading(false);
        partyLookup.reset();
    }, [isOpen, isEditMode, editRecord]); // eslint-disable-line react-hooks/exhaustive-deps

    const effectiveParty = hasPresetClient
        ? (presetParty || mapRowToJournalParty({
            username: clientUsername,
            name: clientName || clientUsername,
            email: '',
            balance: 0,
            mobile: '',
            pan_number: '',
        }, presetPartyType))
        : partyLookup.selectedParty;

    const partyKey = journalPartyKey(effectiveParty, hasPresetClient ? presetPartyType : selectedPartyType);
    const parsedAmount = parseDecimalValue(amount);

    const isDiscountFormValid =
        Boolean(effectiveParty) &&
        partyKey !== '' &&
        parsedAmount > 0 &&
        Boolean(transactionDate) &&
        !(hasPresetClient && loadingPresetParty);

    const submitDiscount = useCallback(async () => {
        if (loading) return;
        if (!effectiveParty || partyKey === '') {
            toast.error(`Please select a ${partyLabel}`);
            return;
        }
        if (!parsedAmount || parsedAmount <= 0) {
            toast.error('Please enter a valid amount');
            return;
        }
        if (!transactionDate) {
            toast.error('Please select a date');
            return;
        }

        const resolvedPartyType = hasPresetClient ? presetPartyType : (effectiveParty.userType || selectedPartyType);
        const resolvedPartyId = resolveJournalPartyId(effectiveParty, resolvedPartyType);
        const remarkText = String(remark || '').trim();

        setLoading(true);
        try {
            const payload = {
                party_id: resolvedPartyId,
                party_type: resolvedPartyType,
                amount: parsedAmount,
                remark: remarkText,
                transaction_date: transactionDate,
            };

            const response = isEditMode
                ? await axios.put(
                    `${API_BASE_URL}/expense/discount/edit`,
                    { ...payload, discount_id: editRecord.discount_id },
                    { headers: getHeaders() }
                )
                : await axios.post(
                    `${API_BASE_URL}/expense/discount/create`,
                    payload,
                    { headers: getHeaders() }
                );

            if (!response.data?.success) {
                toast.error(response.data?.message || 'Failed to save discount entry');
                return;
            }

            toast.success(response.data.message || (isEditMode ? 'Discount entry updated successfully' : 'Discount entry created successfully'));
            if (onSubmit) onSubmit('DISCOUNT', response.data.data);
            onClose();
        } catch (error) {
            console.error('Error saving discount entry:', error);
            const errorMessage =
                error.response?.data?.message ||
                error.response?.data?.error ||
                error.message ||
                'Failed to save discount entry';
            toast.error(errorMessage);
        } finally {
            setLoading(false);
        }
    }, [
        loading,
        effectiveParty,
        partyKey,
        parsedAmount,
        transactionDate,
        remark,
        hasPresetClient,
        presetPartyType,
        selectedPartyType,
        partyLabel,
        isEditMode,
        editRecord,
        onSubmit,
        onClose,
    ]);

    const handleSubmit = (e) => {
        e.preventDefault();
        submitDiscount();
    };

    const partyDisplayName = effectiveParty?.name || effectiveParty?.username || '—';

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            title={isEditMode ? 'Edit Discount Entry' : 'Create Discount Entry'}
            maxWidth="max-w-lg"
            compact
            closeOnOverlayClick={false}
            accent="discount"
            titleIcon={<FiDollarSign className="w-4 h-4" aria-hidden />}
            footer={(
                <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-xs text-slate-500">
                        {parsedAmount > 0 ? (
                            <span>
                                Discount amount{' '}
                                <span className="font-semibold text-amber-700 tabular-nums">
                                    ₹{formatCurrency ? formatCurrency(parsedAmount) : formatPlainInrAmount(parsedAmount)}
                                </span>
                            </span>
                        ) : (
                            <span>Enter discount details below</span>
                        )}
                    </div>
                    <div className="flex items-center justify-end gap-2 shrink-0">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={loading}
                            className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 rounded-md text-xs font-medium hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-500/30 disabled:opacity-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            disabled={loading || !isDiscountFormValid}
                            onClick={submitDiscount}
                            className={`px-3 py-1.5 text-white rounded-md text-xs font-medium focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors inline-flex items-center justify-center min-w-[120px] ${discountAccentBtn}`}
                        >
                            {loading ? 'Saving…' : (isEditMode ? 'Update Discount' : 'Create Discount')}
                        </button>
                    </div>
                </div>
            )}
        >
            <form id="discount-form" onSubmit={handleSubmit} noValidate className="space-y-3 min-w-0">
                {shouldShowClientSelector ? (
                    <JournalPartySearchFields
                        variant="receive"
                        label={`Discount to ${partyLabel}`}
                        partyType={selectedPartyType}
                        onPartyTypeChange={setSelectedPartyType}
                        showTypeToggle={!isEditMode}
                        searchTerm={partyLookup.searchTerm}
                        setSearchTerm={partyLookup.setSearchTerm}
                        parties={partyLookup.parties}
                        setParties={partyLookup.setParties}
                        showDropdown={partyLookup.showDropdown}
                        setShowDropdown={partyLookup.setShowDropdown}
                        openDropdown={partyLookup.openDropdown}
                        dismissDropdown={partyLookup.dismissDropdown}
                        searchLoading={partyLookup.searchLoading}
                        loadingMore={partyLookup.loadingMore}
                        handleListScroll={partyLookup.handleListScroll}
                        clearSelection={partyLookup.clearSelection}
                        onSearchFocus={partyLookup.loadPartiesOnFocus}
                        selectedParty={partyLookup.selectedParty}
                        setSelectedParty={partyLookup.setSelectedParty}
                        formatCurrency={formatCurrency}
                        compact
                        focusAccent="amber"
                    />
                ) : (
                    <div>
                        <label className={COMPACT_LABEL}>
                            Discount to {partyLabel} <span className="text-red-500">*</span>
                        </label>
                        {loadingPresetParty ? (
                            <div className="h-14 animate-pulse rounded-md bg-slate-200/70" />
                        ) : (
                            <TransactionClientPreviewCard
                                client={effectiveParty}
                                formatCurrency={formatCurrency}
                                variant="receive"
                                readOnly
                                partyType={hasPresetClient ? presetPartyType : (effectiveParty?.userType || selectedPartyType)}
                            />
                        )}
                    </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                        <label className={COMPACT_LABEL}>
                            Date <span className="text-red-500">*</span>
                        </label>
                        <DatePickerField
                            value={transactionDate}
                            onChange={(d) => {
                                const picked = String(d || '').trim();
                                if (!picked) {
                                    setTransactionDate('');
                                    return;
                                }
                                setTransactionDate(picked > todayIso ? todayIso : picked);
                            }}
                            mode="single"
                            hideTabs={true}
                            showResetButton={false}
                            placeholder="Select date"
                            buttonClassName={discountFieldClass}
                            maxSelectableDate={todayIso}
                        />
                    </div>
                    <div>
                        <label className={COMPACT_LABEL}>
                            Amount <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            inputMode="decimal"
                            placeholder="0.00"
                            value={amount}
                            onChange={(e) => setAmount(sanitizeDecimalInput(e.target.value, 2))}
                            className={`${discountFieldClass} text-right tabular-nums`}
                        />
                    </div>
                </div>

                <div>
                    <label className={COMPACT_LABEL}>Remark</label>
                    <input
                        type="text"
                        name="remark"
                        placeholder="Optional note"
                        value={remark}
                        onChange={(e) => setRemark(e.target.value)}
                        className={discountFieldClass}
                    />
                </div>

                {effectiveParty && parsedAmount > 0 && (
                    <div className="rounded-md bg-amber-50 border border-amber-100 px-3 py-2 space-y-1">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-700/80">Summary</p>
                        <div className="flex items-center justify-between gap-2 text-xs">
                            <span className="text-slate-600">Party</span>
                            <span className="font-medium text-slate-800 truncate">{partyDisplayName}</span>
                        </div>
                        <div className="flex items-center justify-between gap-2 text-xs">
                            <span className="text-slate-600">Amount</span>
                            <span className="font-semibold text-amber-700 tabular-nums">
                                ₹{formatCurrency ? formatCurrency(parsedAmount) : formatPlainInrAmount(parsedAmount)}
                            </span>
                        </div>
                    </div>
                )}
            </form>
        </BaseModal>
    );
};

// Modal Manager Component
export const TransactionModalManager = ({
    modalType,
    isOpen,
    onClose,
    bankDetails,
    bankId,
    showBank = true,
    onSubmit,
    formatCurrency,
    summary,
    clientId,
    clientName,
    showClient = true,
    showSummary = true,
    bankPageClientLookup = false,
    showFromBank = true,
    showToBank = true,
    fromBankDetails = null,
    fromBankId = '',
    toBankDetails = null,
    toBankId = '',
    showFromClient = true,
    showToClient = true,
    partyType = 'client',
    partyLabel = 'client',
}) => {
    const modalProps = {
        isOpen,
        onClose,
        bankDetails,
        bankId,
        bankName: bankDetails?.bank,
        // Bank ledger: current bank is implicit — no bank card or bank search in Receive/Payment
        showBank: bankPageClientLookup ? false : showBank,
        onSubmit,
        formatCurrency,
        summary,
        clientUsername: clientId,
        clientName: clientName,
        showClient,
        showSummary,
        bankPageClientLookup,
        showFromBank,
        showToBank,
        fromBankDetails,
        fromBankId,
        toBankDetails,
        toBankId,
        showFromClient,
        showToClient,
        partyType,
        partyLabel,
    };

    switch (modalType) {
        case 'RECEIVE':
            return <ReceiveModal {...modalProps} />;
        case 'PAYMENT':
            return <PaymentModal {...modalProps} />;
        case 'SALE':
            return <SaleModal {...modalProps} />;
        case 'PURCHASE':
            return <PurchaseModal {...modalProps} />;
        case 'EXPENSE':
            return <ExpenseModal {...modalProps} />;
        case 'JOURNAL':
            return <JournalModal {...modalProps} />;
        case 'CONTRA':
            return <ContraModal {...modalProps} />;
        case 'DISCOUNT':
            return <DiscountModal {...modalProps} />;
        default:
            return null;
    }
};

export default TransactionModalManager;
