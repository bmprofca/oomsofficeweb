// Client ledger transaction create modals (Receive, Payment, Sale, …)
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { IoTrash, IoAdd } from "react-icons/io5";
import { FiX, FiUser, FiDollarSign, FiShoppingBag, FiTruck, FiFileText, FiRepeat, FiPlus, FiTrash2, FiMail, FiPhone, FiCreditCard, FiHome, FiArrowRight, FiArrowLeft, FiChevronLeft, FiChevronRight, FiMessageSquare, FiMessageCircle } from 'react-icons/fi';
import toast from 'react-hot-toast';
import API_BASE_URL from '../../utils/api-controller';
import getHeaders from '../../utils/get-headers';
import axios from 'axios';
import { DatePickerField, isDatePickerPortalOpen } from '../PortalDatePicker';
import SelectInput from '../SelectInput';

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
}) => {
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

    if (!isOpen) return null;

    /* Portal to document.body so fixed positioning is viewport-based. Nested layouts
       (e.g. Framer Motion with transform) otherwise create a containing block and distort
       size, fonts, and hit targets — common on client-profile → LedgerTab. */
    return createPortal(
        <AnimatePresence>
            <>
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[10050]"
                    onClick={closeOnOverlayClick ? onClose : undefined}
                />
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="fixed inset-0 z-[10051] pointer-events-none"
                >
                    <div
                        className={`fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100vw-1.5rem)] sm:w-[calc(100vw-2rem)] ${maxWidth} max-h-[calc(100vh-1.5rem)] sm:max-h-[calc(100vh-2rem)] overflow-hidden bg-white rounded-2xl shadow-2xl pointer-events-auto flex flex-col text-base text-slate-900 antialiased`}
                    >
                        <div className="flex flex-wrap justify-between items-center gap-x-3 gap-y-2 px-5 py-3.5 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white shrink-0">
                            <h2 className="text-lg sm:text-xl font-bold text-slate-800 truncate min-w-0 basis-full sm:basis-0 sm:flex-1">{title}</h2>
                            <div className="flex flex-wrap items-center justify-end gap-2 shrink-0 w-full sm:w-auto">
                                {headerTrailing}
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                                >
                                    <FiX className="w-6 h-6 text-slate-500" />
                                </button>
                            </div>
                        </div>
                        <div
                            className="px-5 py-4 overflow-y-auto flex-1 min-h-0 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                        >
                            {children}
                        </div>
                        {footer ? (
                            <div className="px-5 py-3 border-t border-slate-200 bg-white shrink-0">
                                {footer}
                            </div>
                        ) : null}
                    </div>
                </motion.div>
            </>
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

/** Selected bank card — same compact layout as Receive/Payment modals. */
const SaleBankPreviewCard = ({ bank, onChangeBank, formatMoney, readOnly = false }) => {
    if (!bank) return null;
    const title = getBankPrimaryLabel(bank);
    const subtitle = getBankSecondaryLabel(bank);
    const balance = bank.balance ?? 0;
    const isCashLedger = String(bank.type ?? '').toLowerCase() === 'cash';
    const account_no = bank.account_no ?? bank.account ?? '—';
    const ifsc = bank.ifsc ?? '—';
    const branch = bank.branch ?? '—';
    return (
        <div className="rounded-lg border-2 border-slate-200 overflow-hidden bg-white">
            <div className="flex items-center gap-2 px-3 py-2">
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-600">
                    {(title || 'B').trim().charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 leading-snug truncate">{title}</p>
                    <p className="text-xs text-slate-500 truncate mt-px">{subtitle}</p>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                    <div className="text-right">
                        <p className={`text-sm font-semibold tabular-nums leading-tight ${getBalanceColorClass(balance)}`}>
                            ₹{formatMoney(balance)}
                        </p>
                        <p className="text-xs text-slate-500">Balance</p>
                    </div>
                    {!readOnly && (
                        <button
                            type="button"
                            onClick={onChangeBank}
                            title="Change bank"
                            className="p-1 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                        >
                            <FiRepeat className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>
            </div>
            {!isCashLedger ? (
                <div className="grid grid-cols-3 divide-x divide-slate-100 border-t border-slate-100 bg-slate-50/90">
                    <div className="px-2 py-1.5 min-w-0">
                        <p className="text-xs text-slate-500">Account No</p>
                        <p className="text-sm text-slate-800 font-mono truncate mt-px">{account_no}</p>
                    </div>
                    <div className="px-2 py-1.5 min-w-0">
                        <p className="text-xs text-slate-500">IFSC</p>
                        <p className="text-sm text-slate-800 font-mono truncate mt-px">{ifsc}</p>
                    </div>
                    <div className="px-2 py-1.5 min-w-0">
                        <p className="text-xs text-slate-500">Branch</p>
                        <p className="text-sm text-slate-800 truncate mt-px">{branch}</p>
                    </div>
                </div>
            ) : null}
        </div>
    );
};

/** Selected client card — same compact layout as FirmClientSearchFields / Receive client preview. */
const SaleClientPreviewCard = ({
    party,
    name: nameFallback,
    detailLine: detailLineFallback,
    summary,
    formatMoney,
    onChangeClient,
    readOnly = false,
}) => {
    const p = party && typeof party === 'object' ? party : {};
    const displayName = (p.name != null && String(p.name).trim() !== '') ? String(p.name).trim() : (nameFallback || '—');
    const careOfSubtitle = formatClientCareOfSubtitle(p);
    const line2 = careOfSubtitle
        || (detailLineFallback && String(detailLineFallback).trim())
        || '—';

    const avatarClient = {
        name: displayName,
        username: p.username,
        mobile: p.contact ?? p.mobile,
        email: p.email,
        pan_number: p.pan_no ?? p.pan_number,
        country_code: p.country_code,
        profile: p.profile,
        profile_photo: p.profile_photo,
        profile_image: p.profile_image,
        photo_url: p.photo_url,
        image: p.image,
        avatar: p.avatar,
        photo: p.photo,
    };

    const rawMobile = p.contact ?? p.mobile;
    const mobileDisplay = p.country_code && rawMobile
        ? `+${p.country_code} ${rawMobile}`
        : (rawMobile ? String(rawMobile) : '—');
    const panDisplay = p.pan_no ?? p.pan_number ?? '—';
    const emailDisplay = p.email ?? '—';

    const hasLedgerSummary = summary != null && typeof summary === 'object';
    const partyBalanceRaw = p.balance;
    const partyBalanceKnown = partyBalanceRaw != null && partyBalanceRaw !== '';
    const partyBalance = partyBalanceKnown ? parseDecimalValue(partyBalanceRaw) : null;

    return (
        <div className="rounded-lg border-2 border-slate-200 overflow-hidden bg-white">
            <div className="flex items-center gap-2 px-3 py-2">
                <ClientSearchAvatar client={avatarClient} sizeClass="w-8 h-8" textClass="text-xs" roundedClass="rounded-lg" />
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 leading-snug truncate">{displayName}</p>
                    <p className="text-xs text-slate-500 truncate mt-px" title={line2 !== '—' ? line2 : undefined}>
                        {line2}
                    </p>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                    {hasLedgerSummary ? (
                        <div className="text-right">
                            <p className="text-xs text-slate-500">Balance summary</p>
                            <p className="text-sm text-green-600 font-semibold leading-tight">
                                Credit: ₹{formatMoney(summary?.totalCredit || 0)}
                            </p>
                            <p className="text-sm text-red-600 font-semibold leading-tight">
                                Debit: ₹{formatMoney(summary?.totalDebit || 0)}
                            </p>
                        </div>
                    ) : partyBalanceKnown ? (
                        <div className="text-right">
                            <p className={`text-sm font-semibold tabular-nums leading-tight ${getBalanceColorClass(partyBalance)}`}>
                                ₹{formatMoney(partyBalance)}
                            </p>
                            <p className="text-xs text-slate-500">Balance</p>
                        </div>
                    ) : null}
                    {!readOnly && onChangeClient ? (
                        <button
                            type="button"
                            onClick={onChangeClient}
                            title="Change client"
                            className="p-1 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                        >
                            <FiRepeat className="w-3.5 h-3.5" />
                        </button>
                    ) : null}
                </div>
            </div>
            <div className="grid grid-cols-3 divide-x divide-slate-100 border-t border-slate-100 bg-slate-50/90">
                <div className="px-2 py-1.5 min-w-0">
                    <p className="text-xs text-slate-500">Mobile</p>
                    <p className="text-sm text-slate-800 truncate mt-px" title={mobileDisplay !== '—' ? mobileDisplay : undefined}>{mobileDisplay}</p>
                </div>
                <div className="px-2 py-1.5 min-w-0">
                    <p className="text-xs text-slate-500">PAN</p>
                    <p className="text-sm text-slate-800 font-mono truncate mt-px">{panDisplay}</p>
                </div>
                <div className="px-2 py-1.5 min-w-0">
                    <p className="text-xs text-slate-500">Email</p>
                    <p className="text-sm text-slate-800 truncate mt-px" title={emailDisplay !== '—' ? emailDisplay : undefined}>{emailDisplay}</p>
                </div>
            </div>
        </div>
    );
};

// Bank Search Component — portal dropdown with infinite scroll
const BankSearchDropdown = ({ onSelect, selectedBankId, excludeBankId }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [banks, setBanks] = useState([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const [dropdownStyle, setDropdownStyle] = useState({});
    const wrapperRef = useRef(null);
    const inputRef = useRef(null);
    const portalRef = useRef(null);
    const isLoadingMore = useRef(false);
    // Mirror of hasMore as a ref so the scroll handler always reads the live value
    const hasMoreRef = useRef(false);
    const formatBalance = (value) => {
        const amount = parseDecimalValue(value);
        return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(amount);
    };

    const fetchBanks = useCallback(async (search = '', pageNum = 1) => {
        setLoading(true);
        try {
            const response = await axios.get(
                `${API_BASE_URL}/transaction/bank/list?page_no=${pageNum}&limit=10&search=${search}`,
                { headers: getHeaders() }
            );
            if (response.data.success) {
                const bankData = response.data.data || [];
                const filteredBanks = excludeBankId
                    ? bankData.filter(b => b.bank_id !== excludeBankId)
                    : bankData;
                if (pageNum === 1) {
                    setBanks(filteredBanks);
                } else {
                    setBanks(prev => [...prev, ...filteredBanks]);
                }
                // is_last_page lives inside meta, not at the top level
                const isLast = response.data.meta?.is_last_page ?? true;
                hasMoreRef.current = !isLast;
                setHasMore(!isLast);
            }
        } catch (error) {
            console.error('Error fetching banks:', error);
            toast.error('Failed to fetch banks');
        } finally {
            setLoading(false);
            isLoadingMore.current = false;
        }
    }, [excludeBankId]);

    // Debounced search — resets page to 1 on every new query
    useEffect(() => {
        const t = setTimeout(() => {
            pageRef.current = 1;
            setPage(1);
            fetchBanks(searchTerm, 1);
        }, 500);
        return () => clearTimeout(t);
    }, [searchTerm, fetchBanks]);

    // Click-outside: close unless the click is inside the portal list
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (portalRef.current && portalRef.current.contains(e.target)) return;
            if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Recalculate dropdown position whenever it opens or window resizes
    const updatePosition = useCallback(() => {
        if (!inputRef.current) return;
        const rect = inputRef.current.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        const maxH = 280;
        if (spaceBelow >= 80) {
            setDropdownStyle({
                position: 'fixed',
                top: rect.bottom + 4,
                left: rect.left,
                width: rect.width,
                zIndex: 99999,
                maxHeight: Math.min(maxH, spaceBelow - 8),
            });
        } else {
            setDropdownStyle({
                position: 'fixed',
                bottom: window.innerHeight - rect.top + 4,
                left: rect.left,
                width: rect.width,
                zIndex: 99999,
                maxHeight: Math.min(maxH, rect.top - 8),
            });
        }
    }, []);

    useEffect(() => {
        if (showDropdown) updatePosition();
    }, [showDropdown, updatePosition]);

    useEffect(() => {
        if (!showDropdown) return;
        window.addEventListener('resize', updatePosition);
        window.addEventListener('scroll', updatePosition, true);
        return () => {
            window.removeEventListener('resize', updatePosition);
            window.removeEventListener('scroll', updatePosition, true);
        };
    }, [showDropdown, updatePosition]);

    // Infinite scroll handler — uses refs so it never captures stale values
    const pageRef = useRef(1);
    const searchTermRef = useRef(searchTerm);
    useEffect(() => { searchTermRef.current = searchTerm; }, [searchTerm]);

    const handleListScroll = useCallback((e) => {
        const el = e.currentTarget;
        if (isLoadingMore.current || !hasMoreRef.current) return;
        if (el.scrollTop + el.clientHeight >= el.scrollHeight - 40) {
            isLoadingMore.current = true;
            const nextPage = pageRef.current + 1;
            pageRef.current = nextPage;
            setPage(nextPage);
            fetchBanks(searchTermRef.current, nextPage);
        }
    }, [fetchBanks]);

    const handleSelect = (bank) => {
        onSelect(bank);
        setSearchTerm(getBankPrimaryLabel(bank));
        setShowDropdown(false);
    };

    return (
        <div className="relative" ref={wrapperRef}>
            <div className="relative">
                <div className="relative">
                    <input
                        ref={inputRef}
                        type="text"
                        value={searchTerm}
                        onChange={(e) => { setSearchTerm(e.target.value); setShowDropdown(true); }}
                        onFocus={() => setShowDropdown(true)}
                        placeholder="Bank name, account, or IFSC…"
                        className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 caret-slate-600"
                        style={{ caretColor: '#64748b' }} // Tailwind slate-400 for caret
                    />
                </div>



                {loading && banks.length === 0 && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent" />
                    </div>
                )}
            </div>

            {showDropdown && createPortal(
                <div
                    ref={portalRef}
                    style={dropdownStyle}
                    className="bg-white border border-slate-200 rounded-xl shadow-2xl overflow-y-auto"
                    onScroll={handleListScroll}
                >
                    {banks.length > 0 ? (
                        <>
                            {banks.map((bank) => {
                                const isSelected = selectedBankId === bank.bank_id;
                                const primaryLabel = getBankPrimaryLabel(bank);
                                const secondaryLabel = getBankSecondaryLabel(bank);
                                const initial = (primaryLabel || 'B').trim().charAt(0).toUpperCase();
                                const hasMeta =
                                    Boolean(String(bank.ifsc ?? '').trim()) ||
                                    Boolean(String(bank.account_no ?? '').trim()) ||
                                    Boolean(String(bank.branch ?? '').trim());
                                return (
                                    <button
                                        key={bank.bank_id}
                                        type="button"
                                        onClick={() => handleSelect(bank)}
                                        className={`w-full text-left border-b border-slate-100 last:border-0 transition-all duration-150 group
                                            ${isSelected
                                                ? 'bg-indigo-50 border-l-[3px] border-l-indigo-500'
                                                : 'hover:bg-slate-50 border-l-[3px] border-l-transparent'}`}
                                    >
                                        {/* Main row */}
                                        <div className="flex items-center gap-2.5 px-3.5 pt-2 pb-1">
                                            {/* Avatar */}
                                            <div className={`flex-shrink-0 w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold
                                                ${isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-indigo-100 group-hover:text-indigo-600'}`}>
                                                {initial}
                                            </div>
                                            {/* Name + holder / type */}
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[13px] font-semibold text-slate-800 leading-none truncate">{primaryLabel}</p>
                                                <p className="text-[11px] text-slate-400 leading-none truncate mt-[3px]">{secondaryLabel}</p>
                                            </div>
                                            {/* Balance */}
                                            <div className="flex-shrink-0 text-right">
                                                <p className={`text-[13px] font-bold tabular-nums leading-none ${getBalanceColorClass(bank.balance)}`}>
                                                    ₹{formatBalance(bank.balance)}
                                                </p>
                                                {bank.type && (
                                                    <p className="text-[10px] text-slate-400 uppercase tracking-wide leading-none mt-[3px]">{bank.type}</p>
                                                )}
                                            </div>
                                        </div>
                                        {/* Meta chips — cash rows often have no IFSC/account/branch */}
                                        <div className="flex items-center gap-2 px-3.5 pb-2 pl-[2.75rem] min-h-[1.5rem]">
                                            {hasMeta ? (
                                                <>
                                                    <span className="inline-flex items-center px-1.5 py-px rounded bg-slate-100 text-[10px] font-mono text-slate-500 tracking-tight">
                                                        {bank.ifsc || '—'}
                                                    </span>
                                                    <span className="text-[10px] text-slate-400">
                                                        ••{bank.account_no?.slice(-4) || '——'}
                                                    </span>
                                                    <span className="text-[10px] text-slate-400 truncate">{bank.branch || ''}</span>
                                                </>
                                            ) : (
                                                <span className="text-[10px] text-slate-400 italic">
                                                    {String(bank.type ?? '').toLowerCase() === 'cash' ? 'Cash ledger' : '—'}
                                                </span>
                                            )}
                                        </div>
                                    </button>
                                );
                            })}
                            {loading && (
                                <div className="flex justify-center py-3">
                                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-indigo-500 border-t-transparent" />
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="px-4 py-6 text-center">
                            {loading
                                ? <><div className="animate-spin rounded-full h-5 w-5 border-2 border-indigo-400 border-t-transparent mx-auto mb-2" /><p className="text-sm text-slate-400">Loading banks…</p></>
                                : <p className="text-sm text-slate-400">No banks found</p>
                            }
                        </div>
                    )}
                </div>,
                document.body
            )}
        </div>
    );
};

const CLIENT_SEARCH_MIN = 3;

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

/** Client search for Receive/Payment/Journal (GET /client/search). */
const useFirmClientSearch = (enabled, excludeUsername = '') => {
    const [searchTerm, setSearchTerm] = useState('');
    const [firms, setFirms] = useState([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [selectedFirm, setSelectedFirm] = useState(null);
    const [showDropdown, setShowDropdown] = useState(false);
    const exclude = String(excludeUsername || '').trim();

    const searchClients = useCallback(async (term) => {
        const q = String(term || '').trim();
        if (q.length < CLIENT_SEARCH_MIN) {
            setFirms([]);
            return;
        }
        setSearchLoading(true);
        try {
            const response = await axios.get(
                `${API_BASE_URL}/client/search?search=${encodeURIComponent(q)}`,
                { headers: getHeaders() }
            );
            if (response.data.success) {
                let list = response.data.data || [];
                if (exclude) {
                    list = list.filter((f) => String(f.username) !== exclude);
                }
                setFirms(list);
                setShowDropdown(true);
            } else {
                setFirms([]);
                setShowDropdown(false);
            }
        } catch (error) {
            console.error('Error searching clients:', error);
            const msg = error.response?.status === 400
                ? (error.response?.data?.message || `Enter at least ${CLIENT_SEARCH_MIN} characters to search`)
                : (error.response?.data?.message || 'Failed to search clients');
            toast.error(msg);
            setFirms([]);
            setShowDropdown(false);
        } finally {
            setSearchLoading(false);
        }
    }, [exclude]);

    useEffect(() => {
        if (exclude && selectedFirm && String(selectedFirm.username) === exclude) {
            setSelectedFirm(null);
            setSearchTerm('');
            setFirms([]);
            setShowDropdown(false);
        }
    }, [exclude, selectedFirm]);

    useEffect(() => {
        if (!enabled) return;
        if (selectedFirm) return;
        const debounceTimer = setTimeout(() => {
            const q = String(searchTerm || '').trim();
            if (q.length >= CLIENT_SEARCH_MIN) {
                searchClients(q);
            } else {
                setFirms([]);
                setShowDropdown(false);
            }
        }, 500);
        return () => clearTimeout(debounceTimer);
    }, [searchTerm, selectedFirm, enabled, searchClients]);

    const reset = useCallback(() => {
        setSearchTerm('');
        setFirms([]);
        setSelectedFirm(null);
        setShowDropdown(false);
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
        searchLoading,
        reset,
    };
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
    searchLoading,
    selectedFirm,
    setSelectedFirm,
    formatCurrency,
}) => {
    const itemHover = variant === 'payment' ? 'hover:bg-red-50' : 'hover:bg-blue-50';
    const fmtBal = (v) => (typeof formatCurrency === 'function' ? formatCurrency(v ?? 0) : String(v ?? 0));
    const previewFirm = lockedFirm || selectedFirm;
    const selectedCareSubtitle = previewFirm
        ? [previewFirm.care_of, previewFirm.guardian_name]
            .filter((s) => s != null && String(s).trim() !== '')
            .map((s) => String(s).trim())
            .join(' · ')
        : '';

    const repeatHover =
        variant === 'payment'
            ? 'text-slate-400 hover:text-red-600 hover:bg-red-50'
            : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50';

    const showSearchUi = !lockedFirm && !selectedFirm;

    if (lockedFirm) {
        const lf = lockedFirm;
        const lockedCareSubtitle = [lf.care_of, lf.guardian_name]
            .filter((s) => s != null && String(s).trim() !== '')
            .map((s) => String(s).trim())
            .join(' · ');
        return (
            <div className="space-y-3">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                        {label} {!readOnly && <span className="text-red-500">*</span>}
                    </label>
                    <div className="rounded-lg border-2 border-slate-200 overflow-hidden bg-white">
                        <div className="flex items-center gap-2 px-3 py-2">
                            <ClientSearchAvatar client={lf} sizeClass="w-8 h-8" textClass="text-xs" roundedClass="rounded-lg" />
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-slate-800 leading-snug truncate">{lf.name || '—'}</p>
                                <p className="text-xs text-slate-500 truncate mt-px" title={lockedCareSubtitle || undefined}>
                                    {lockedCareSubtitle || '—'}
                                </p>
                            </div>
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                                <div className="text-right">
                                    <p className={`text-sm font-semibold tabular-nums leading-tight ${getBalanceColorClass(lf.balance)}`}>
                                        ₹{fmtBal(lf.balance)}
                                    </p>
                                    <p className="text-xs text-slate-500">Balance</p>
                                </div>
                            </div>
                        </div>
                        <div className="grid grid-cols-3 divide-x divide-slate-100 border-t border-slate-100 bg-slate-50/90">
                            <div className="px-2 py-1.5 min-w-0">
                                <p className="text-xs text-slate-500">Mobile</p>
                                <p className="text-sm text-slate-800 truncate mt-px">
                                    {lf.country_code ? `+${lf.country_code} ` : ''}{lf.mobile || '—'}
                                </p>
                            </div>
                            <div className="px-2 py-1.5 min-w-0">
                                <p className="text-xs text-slate-500">PAN</p>
                                <p className="text-sm text-slate-800 font-mono truncate mt-px">{lf.pan_number || '—'}</p>
                            </div>
                            <div className="px-2 py-1.5 min-w-0">
                                <p className="text-xs text-slate-500">Email</p>
                                <p className="text-sm text-slate-800 truncate mt-px" title={lf.email || ''}>
                                    {lf.email || '—'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                    {label} {!readOnly && <span className="text-red-500">*</span>}
                </label>
                {showSearchUi ? (
                    <>
                        <p className="text-xs text-slate-500 mb-1.5">Type at least {CLIENT_SEARCH_MIN} characters (name, mobile, email, or PAN).</p>
                        <div className="relative">
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    setSearchTerm(value);
                                    if (!value.trim()) {
                                        setFirms([]);
                                        setShowDropdown(false);
                                    }
                                }}
                                onFocus={() => {
                                    if (firms.length > 0 && !selectedFirm) setShowDropdown(true);
                                }}
                                placeholder="Name, mobile, email, or PAN (min 3 characters)"
                                className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                            {searchLoading && (
                                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent" />
                                </div>
                            )}
                            {showDropdown && firms.length > 0 && (
                                <div className="absolute z-10 mt-1 w-full max-w-[calc(100%-0.5rem)] bg-white border-2 border-slate-200 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                                    {firms.map((client) => (
                                        <button
                                            key={client.username}
                                            type="button"
                                            onClick={() => {
                                                setSelectedFirm(client);
                                                setSearchTerm(client.name || '');
                                                setShowDropdown(false);
                                                setFirms([]);
                                            }}
                                            className={`w-full flex items-start gap-3 px-4 py-3 text-left border-b border-slate-100 last:border-0 transition-colors ${itemHover}`}
                                        >
                                            <ClientSearchAvatar client={client} sizeClass="w-9 h-9" textClass="text-sm" />
                                            <div className="min-w-0 flex-1">
                                                <div className="font-medium text-slate-800 truncate">{client.name || '—'}</div>
                                                <div className="text-xs text-slate-600 mt-1 space-y-0.5">
                                                    <p className="flex items-center gap-1.5">
                                                        <FiPhone className="w-3 h-3 shrink-0 text-slate-400" />
                                                        <span>{client.country_code ? `+${client.country_code} ` : ''}{client.mobile || '—'}</span>
                                                    </p>
                                                    <p className="flex items-center gap-1.5 break-all">
                                                        <FiMail className="w-3 h-3 shrink-0 text-slate-400" />
                                                        <span>{client.email || '—'}</span>
                                                    </p>
                                                    <p className="flex items-center gap-1.5">
                                                        <FiCreditCard className="w-3 h-3 shrink-0 text-slate-400" />
                                                        <span className="font-mono">{client.pan_number || '—'}</span>
                                                        <span className="text-slate-400">·</span>
                                                        <span className="font-semibold text-slate-700">Bal. ₹{fmtBal(client.balance)}</span>
                                                    </p>
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </>
                ) : null}
                {previewFirm ? (
                    <div className="rounded-lg border-2 border-slate-200 overflow-hidden bg-white">
                        <div className="flex items-center gap-2 px-3 py-2">
                            <ClientSearchAvatar client={previewFirm} sizeClass="w-8 h-8" textClass="text-xs" roundedClass="rounded-lg" />
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-slate-800 leading-snug truncate">{previewFirm.name || '—'}</p>
                                <p className="text-xs text-slate-500 truncate mt-px" title={selectedCareSubtitle || undefined}>
                                    {selectedCareSubtitle || '—'}
                                </p>
                            </div>
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                                <div className="text-right">
                                    <p className={`text-sm font-semibold tabular-nums leading-tight ${getBalanceColorClass(previewFirm.balance)}`}>
                                        ₹{fmtBal(previewFirm.balance)}
                                    </p>
                                    <p className="text-xs text-slate-500">Balance</p>
                                </div>
                                {!readOnly && !lockedFirm ? (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSelectedFirm(null);
                                            setSearchTerm('');
                                            setFirms([]);
                                            setShowDropdown(false);
                                        }}
                                        title="Change client"
                                        className={`p-1 rounded-md transition-colors ${repeatHover}`}
                                    >
                                        <FiRepeat className="w-3.5 h-3.5" />
                                    </button>
                                ) : null}
                            </div>
                        </div>
                        <div className="grid grid-cols-3 divide-x divide-slate-100 border-t border-slate-100 bg-slate-50/90">
                            <div className="px-2 py-1.5 min-w-0">
                                <p className="text-xs text-slate-500">Mobile</p>
                                <p className="text-sm text-slate-800 truncate mt-px">
                                    {previewFirm.country_code ? `+${previewFirm.country_code} ` : ''}{previewFirm.mobile || '—'}
                                </p>
                            </div>
                            <div className="px-2 py-1.5 min-w-0">
                                <p className="text-xs text-slate-500">PAN</p>
                                <p className="text-sm text-slate-800 font-mono truncate mt-px">{previewFirm.pan_number || '—'}</p>
                            </div>
                            <div className="px-2 py-1.5 min-w-0">
                                <p className="text-xs text-slate-500">Email</p>
                                <p className="text-sm text-slate-800 truncate mt-px" title={previewFirm.email || ''}>
                                    {previewFirm.email || '—'}
                                </p>
                            </div>
                        </div>
                    </div>
                ) : null}
            </div>
        </div>
    );
};

// Receive Modal - API Integrated with Bank Search (No Client Search)
export const ReceiveModal = ({ isOpen, onClose, bankDetails, bankId, onSubmit, formatCurrency, summary, clientUsername, clientName, showClient = true, showBank = true, showSummary = true, bankPageClientLookup = false, partyType = 'client', partyLabel = 'client' }) => {
    const [loading, setLoading] = useState(false);
    const [selectedBank, setSelectedBank] = useState(bankDetails || (bankId ? { bank_id: bankId, bank: 'Selected Bank' } : null));
    const [showBankSearch, setShowBankSearch] = useState(false);
    const [transactionDate, setTransactionDate] = useState(new Date().toISOString().split('T')[0]);
    const [amount, setAmount] = useState('');
    const [formKey, setFormKey] = useState(0);
    const hasPresetClient = Boolean(String(clientUsername || '').trim());
    const hasPresetBank = Boolean(String(bankId || '').trim());
    const shouldShowClientSelector = bankPageClientLookup || !hasPresetClient;
    const shouldShowBankSelector = !hasPresetBank;
    const firmLookup = useFirmClientSearch(Boolean(shouldShowClientSelector));

    // Reset all fields every time the modal opens
    useEffect(() => {
        if (!isOpen) return;
        setFormKey(k => k + 1);
        setSelectedBank(bankDetails || (bankId ? { bank_id: bankId, bank: 'Selected Bank' } : null));
        setShowBankSearch(false);
        setTransactionDate(new Date().toISOString().split('T')[0]);
        setAmount('');
        setLoading(false);
        if (shouldShowClientSelector) firmLookup.reset();
    }, [isOpen, shouldShowClientSelector]); // eslint-disable-line react-hooks/exhaustive-deps

    const isAmountValid = parseDecimalValue(amount) > 0;
    const isDateValid = Boolean(transactionDate);
    const hasSelectedBank = hasPresetBank || Boolean(selectedBank);
    const hasClientParty = hasPresetClient || Boolean(firmLookup.selectedFirm?.username);
    const isReceiveFormValid = hasSelectedBank && isDateValid && isAmountValid && hasClientParty;
    const selectedClientDisplayName = hasPresetClient ? clientName : (firmLookup.selectedFirm?.name || 'Selected client');
    const shouldShowReceiveSummary = showSummary && hasSelectedBank && hasClientParty;

    const handleSubmit = async (e) => {
        e.preventDefault();

        const effectiveBank = hasPresetBank ? { bank_id: bankId, bank: bankDetails?.bank || 'Selected Bank' } : selectedBank;
        if (!effectiveBank) {
            toast.error('Please select a bank');
            return;
        }

        if (!hasPresetClient && !firmLookup.selectedFirm?.username) {
            toast.error(`Please select a ${partyLabel}`);
            return;
        }

        const formData = new FormData(e.target);
        const parsedAmount = parseDecimalValue(amount);
        const date = transactionDate;
        const description = formData.get('description');

        if (!parsedAmount || parsedAmount <= 0) {
            toast.error('Please enter a valid amount');
            return;
        }

        setLoading(true);

        const resolvedParty1 = hasPresetClient ? clientUsername : firmLookup.selectedFirm?.username;
        const resolvedName = hasPresetClient ? clientName : firmLookup.selectedFirm?.name;

        const payload = {
            amount: parsedAmount,
            party1_id: resolvedParty1,
            party1_type: partyType,
            party2_id: hasPresetBank ? bankId : effectiveBank.bank_id,
            party2_type: "bank",
            remark: description || `Payment received from ${resolvedName}`,
            transaction_date: date
        };

        try {
            const response = await axios.post(
                `${API_BASE_URL}/transaction/payment/receive`,
                payload,
                { headers: getHeaders() }
            );

            if (response.data.success) {
                toast.success(response.data.message || 'Payment received successfully');
                onSubmit('RECEIVE', response.data.data);
                onClose();
                // Reset form
                if (!hasPresetBank) {
                    setSelectedBank(bankDetails || null);
                    setShowBankSearch(false);
                }
            }
        } catch (error) {
            console.error('Error creating receive transaction:', error);
            toast.error(error.response?.data?.message || 'Failed to create receive transaction');
        } finally {
            setLoading(false);
        }
    };

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            title="Receive Payment from Client"
            closeOnOverlayClick={false}
            footer={(
                <div className="flex justify-end gap-2">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={loading}
                        className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-500/40 disabled:opacity-50 transition-all duration-200"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        form="receive-form"
                        disabled={loading || !isReceiveFormValid}
                        className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg text-sm font-medium hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 inline-flex items-center justify-center min-w-[140px]"
                    >
                        {loading ? 'Processing...' : 'Receive Payment'}
                    </button>
                </div>
            )}
        >
            <form key={formKey} id="receive-form" onSubmit={handleSubmit} className="space-y-5">
                {shouldShowClientSelector && (
                    <FirmClientSearchFields
                        variant="receive"
                        formatCurrency={formatCurrency}
                        searchTerm={firmLookup.searchTerm}
                        setSearchTerm={firmLookup.setSearchTerm}
                        firms={firmLookup.firms}
                        setFirms={firmLookup.setFirms}
                        showDropdown={firmLookup.showDropdown}
                        setShowDropdown={firmLookup.setShowDropdown}
                        searchLoading={firmLookup.searchLoading}
                        selectedFirm={firmLookup.selectedFirm}
                        setSelectedFirm={firmLookup.setSelectedFirm}
                    />
                )}
                {/* Bank Selection */}
                {showBank && shouldShowBankSelector && (
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                            Bank Account <span className="text-red-500">*</span>
                        </label>

                        {(!selectedBank || showBankSearch) ? (
                            <BankSearchDropdown
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
                            />
                        )}
                    </div>
                )}

                {/* Form Fields */}
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Date <span className="text-red-500">*</span>
                            </label>
                            <DatePickerField
                                value={transactionDate}
                                onChange={setTransactionDate}
                                mode="single"
                                hideTabs={true}
                                showResetButton={false}
                                placeholder="Select date"
                                buttonClassName="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Amount <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                name="amount"
                                placeholder="Enter amount"
                                required
                                inputMode="decimal"
                                value={amount}
                                onChange={(e) => setAmount(sanitizeDecimalInput(e.target.value, 2))}
                                className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Description / Remark
                        </label>
                        <textarea
                            name="description"
                            placeholder="Enter description or remark"
                            rows="2"
                            className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>

                    {shouldShowReceiveSummary && (
                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                            <p className="text-xs text-slate-600 mb-1">Transaction Summary</p>
                            <div className="flex items-center justify-between text-sm">
                                <span className="font-medium">Receiving from:</span>
                                <span className="text-blue-600">{selectedClientDisplayName}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm mt-1">
                                <span className="font-medium">To Bank:</span>
                                <span className="text-blue-600">{selectedBank?.bank || (bankId ? `Bank #${bankId}` : 'Not selected')}</span>
                            </div>
                        </div>
                    )}
                </div>

            </form>
        </BaseModal>
    );
};

// Payment Modal - API Integrated with Bank Search
export const PaymentModal = ({ isOpen, onClose, bankDetails, bankId, onSubmit, formatCurrency, summary, clientUsername, clientName, showClient = true, showBank = true, showSummary = true, bankPageClientLookup = false, partyType = 'client', partyLabel = 'client' }) => {
    const [loading, setLoading] = useState(false);
    const [selectedBank, setSelectedBank] = useState(bankDetails || (bankId ? { bank_id: bankId, bank: 'Selected Bank' } : null));
    const [showBankSearch, setShowBankSearch] = useState(false);
    const [transactionDate, setTransactionDate] = useState(new Date().toISOString().split('T')[0]);
    const [amount, setAmount] = useState('');
    const [formKey, setFormKey] = useState(0);
    const hasPresetClient = Boolean(String(clientUsername || '').trim());
    const hasPresetBank = Boolean(String(bankId || '').trim());
    const shouldShowClientSelector = bankPageClientLookup || !hasPresetClient;
    const shouldShowBankSelector = !hasPresetBank;
    const firmLookup = useFirmClientSearch(Boolean(shouldShowClientSelector));

    // Reset all fields every time the modal opens
    useEffect(() => {
        if (!isOpen) return;
        setFormKey(k => k + 1);
        setSelectedBank(bankDetails || (bankId ? { bank_id: bankId, bank: 'Selected Bank' } : null));
        setShowBankSearch(false);
        setTransactionDate(new Date().toISOString().split('T')[0]);
        setAmount('');
        setLoading(false);
        if (shouldShowClientSelector) firmLookup.reset();
    }, [isOpen, shouldShowClientSelector]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleSubmit = async (e) => {
        e.preventDefault();

        const effectiveBank = hasPresetBank ? { bank_id: bankId, bank: bankDetails?.bank || 'Selected Bank' } : selectedBank;
        if (!effectiveBank) {
            toast.error('Please select a bank');
            return;
        }

        if (!hasPresetClient && !firmLookup.selectedFirm?.username) {
            toast.error(`Please select a ${partyLabel}`);
            return;
        }

        const formData = new FormData(e.target);
        const parsedAmount = parseDecimalValue(amount);
        const date = transactionDate;
        const description = formData.get('description');

        if (!parsedAmount || parsedAmount <= 0) {
            toast.error('Please enter a valid amount');
            return;
        }

        // Check if sufficient balance
        if (parsedAmount > (effectiveBank?.balance || 0)) {
            toast.error('Insufficient balance in bank account');
            return;
        }

        setLoading(true);

        const resolvedParty2 = hasPresetClient ? clientUsername : firmLookup.selectedFirm?.username;
        const resolvedName = hasPresetClient ? clientName : firmLookup.selectedFirm?.name;
        const party1BankId = hasPresetBank ? bankId : effectiveBank.bank_id;

        const payload = {
            amount: parsedAmount,
            party1_id: party1BankId,
            party1_type: "bank",
            party2_id: resolvedParty2,
            party2_type: partyType,
            remark: description || `Payment made to ${resolvedName}`,
            transaction_date: date
        };

        try {
            const response = await axios.post(
                `${API_BASE_URL}/transaction/payment/payment`,
                payload,
                { headers: getHeaders() }
            );

            if (response.data.success) {
                toast.success(response.data.message || 'Payment made successfully');
                if (onSubmit) {
                    onSubmit('PAYMENT', response.data.data);
                }
                onClose();
                // Reset form
                if (!hasPresetBank) {
                    setSelectedBank(bankDetails || null);
                    setShowBankSearch(false);
                }
                e.target.reset();
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
    };

    const isPaymentFormValid =
        (hasPresetBank || Boolean(selectedBank)) &&
        parseDecimalValue(amount) > 0 &&
        (hasPresetClient || Boolean(firmLookup.selectedFirm?.username));
    const selectedClientDisplayName = hasPresetClient ? clientName : (firmLookup.selectedFirm?.name || 'Selected client');
    const shouldShowPaymentSummary = showSummary && (hasPresetBank || Boolean(selectedBank)) && (hasPresetClient || Boolean(firmLookup.selectedFirm?.username));

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            title="Make Payment to Client"
            footer={(
                <div className="flex justify-end gap-2">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={loading}
                        className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-500/40 disabled:opacity-50 transition-all duration-200"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        form="payment-form"
                        disabled={loading || !isPaymentFormValid}
                        className="px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg text-sm font-medium hover:from-red-700 hover:to-red-800 focus:outline-none focus:ring-2 focus:ring-red-500/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 inline-flex items-center justify-center min-w-[140px]"
                    >
                        {loading ? 'Processing...' : 'Make Payment'}
                    </button>
                </div>
            )}
        >
            <form key={formKey} id="payment-form" onSubmit={handleSubmit} className="space-y-5">
                {shouldShowClientSelector && (
                    <FirmClientSearchFields
                        variant="payment"
                        formatCurrency={formatCurrency}
                        searchTerm={firmLookup.searchTerm}
                        setSearchTerm={firmLookup.setSearchTerm}
                        firms={firmLookup.firms}
                        setFirms={firmLookup.setFirms}
                        showDropdown={firmLookup.showDropdown}
                        setShowDropdown={firmLookup.setShowDropdown}
                        searchLoading={firmLookup.searchLoading}
                        selectedFirm={firmLookup.selectedFirm}
                        setSelectedFirm={firmLookup.setSelectedFirm}
                    />
                )}
                {/* Bank Selection */}
                {showBank && shouldShowBankSelector && (
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                            Bank Account <span className="text-red-500">*</span>
                        </label>

                        {(!selectedBank || showBankSearch) ? (
                            <BankSearchDropdown
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
                            />
                        )}
                    </div>
                )}

                <div className="space-y-4">
                    {/* Form Fields */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Date <span className="text-red-500">*</span>
                            </label>
                            <DatePickerField
                                value={transactionDate}
                                onChange={setTransactionDate}
                                mode="single"
                                hideTabs={true}
                                showResetButton={false}
                                placeholder="Select date"
                                buttonClassName="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Amount <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                name="amount"
                                placeholder="Enter amount"
                                required
                                inputMode="decimal"
                                value={amount}
                                onChange={(e) => setAmount(sanitizeDecimalInput(e.target.value, 2))}
                                className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Description / Remark
                        </label>
                        <textarea
                            name="description"
                            placeholder="Enter description or remark"
                            rows="2"
                            className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>

                    {shouldShowPaymentSummary && (
                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                            <p className="text-xs text-slate-600 mb-1">Transaction Summary</p>
                            <div className="flex items-center justify-between text-sm">
                                <span className="font-medium">Paying to:</span>
                                <span className="text-red-600">{selectedClientDisplayName}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm mt-1">
                                <span className="font-medium">From Bank:</span>
                                <span className="text-red-600">{selectedBank?.bank || (bankId ? `Bank #${bankId}` : 'Not selected')}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm mt-1">
                                <span className="font-medium">Available Balance:</span>
                                <span className="text-green-600">₹{formatCurrency(selectedBank?.balance || 0)}</span>
                            </div>
                        </div>
                    )}
                </div>

            </form>
        </BaseModal>
    );
};

/**
 * Sale invoice form — modal or inline.
 *
 * Party behaviour:
 * - Voucher-style: omit `lockedSaleType`, keep `hidePartySelector` false — user picks client vs bank and searches party.
 * - Ledger-style: set `lockedSaleType` ('user' | 'bank'), `hidePartySelector`, and `fixedParty` — party is implied; no search UI.
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
 * @param {'user'|'bank'} [props.defaultSaleType] — initial type when party type is not locked
 * @param {'user'|'bank'|null} [props.lockedSaleType] — lock client vs bank; hides type toggle by default
 * @param {boolean} [props.hidePartySelector] — hide search/dropdown; use `fixedParty` + id for submit
 * @param {SaleFormFixedParty|null} [props.fixedParty] — party row when selector hidden (name, id, username, …)
 * @param {boolean} [props.showSaleTypeToggle] — default: show only when `lockedSaleType` is null
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
    hidePartySelector = false,
    fixedParty = null,
    showSaleTypeToggle,
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
    const [saleType, setSaleType] = useState(lockedSaleType || defaultSaleType);
    const [formData, setFormData] = useState({
        party_id: initialPartyId || '',
        party_type: defaultSaleType,
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
    const [showPartyDropdown, setShowPartyDropdown] = useState(false);
    const [sendEmail, setSendEmail] = useState(true);
    const [sendSms, setSendSms] = useState(true);
    const [sendWhatsApp, setSendWhatsApp] = useState(true);
    const [saleBankPickerOpen, setSaleBankPickerOpen] = useState(true);
    /** Full selected user row — survives clearing `userSearchTerm` / `userOptions` so preview + avatar stay correct */
    const [selectedSaleUser, setSelectedSaleUser] = useState(null);
    const [saleBankRow, setSaleBankRow] = useState(null);
    const [serviceOptions, setServiceOptions] = useState([]);
    const [userOptions, setUserOptions] = useState([]);
    const [bankOptions, setBankOptions] = useState([]);
    const [isLoadingServices, setIsLoadingServices] = useState(false);
    const [isLoadingParties, setIsLoadingParties] = useState(false);
    const [isLoadingBanks, setIsLoadingBanks] = useState(false);
    const [userSearchTerm, setUserSearchTerm] = useState('');
    const [selectedSaleFirmId, setSelectedSaleFirmId] = useState('');

    const effectiveSaleType = lockedSaleType ?? saleType;
    const typeToggleVisible = showSaleTypeToggle !== undefined ? showSaleTypeToggle : lockedSaleType == null;
    const bannerTitle = fixedPartyBannerTitle
        ?? (effectiveSaleType === 'bank' ? 'Bank (sale from bank)' : 'Client (sale to client)');

    useEffect(() => {
        if (lockedSaleType) setSaleType(lockedSaleType);
    }, [lockedSaleType]);

    // Fetch services from API — only when modal opens
    useEffect(() => {
        if (isOpen) {
            fetchServices();
        }
    }, [isOpen]);

    // Fetch banks when party search is shown and type is bank
    useEffect(() => {
        if (effectiveSaleType !== 'bank') return;
        if (hidePartySelector && lockedSaleType === 'bank') return;
        fetchAllBanks();
    }, [effectiveSaleType, hidePartySelector, lockedSaleType]);

    // Fetch users — same min length + debounce as Receive/Payment `FirmClientSearchFields`
    useEffect(() => {
        if (hidePartySelector && effectiveSaleType === 'user') return;
        if (effectiveSaleType !== 'user') return;
        const q = String(userSearchTerm || '').trim();
        if (q.length < CLIENT_SEARCH_MIN) {
            setShowPartyDropdown(false);
            /* Keep last search results while a client is selected so `getSelectedParty` can resolve; cleared when party cleared */
            if (!formData.party_id || effectiveSaleType !== 'user') {
                setUserOptions([]);
            }
            return;
        }
        const delayDebounce = setTimeout(() => {
            fetchUsers();
        }, 500);
        return () => clearTimeout(delayDebounce);
    }, [effectiveSaleType, userSearchTerm, hidePartySelector, formData.party_id]);

    const fetchServices = async () => {
        setIsLoadingServices(true);
        try {
            const response = await fetch(`${API_BASE_URL}/service/list?search=&category_id`, {
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
                    duration: service.is_recurring ? 'Recurring' : 'One-time',
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

    const fetchAllBanks = async () => {
        setIsLoadingBanks(true);
        try {
            const response = await fetch(`${API_BASE_URL}/transaction/bank/list`, {
                method: 'GET',
                headers: getHeaders()
            });
            const data = await response.json();
            console.log('Bank API Response:', data);

            if (data.success && data.data) {
                const formattedBanks = data.data.map(bank => ({
                    id: bank.bank_id || bank.id,
                    type: 'bank',
                    name: getBankPrimaryLabel(bank),
                    account: bank.account_number || bank.account_no || bank.account || 'N/A',
                    holder: bank.account_holder || bank.holder_name || bank.holder || 'N/A',
                    ifsc: bank.ifsc_code || bank.ifsc || 'N/A',
                    branch: bank.branch_name || bank.branch || 'N/A',
                    balance: bank.balance || bank.current_balance || 0
                }));
                setBankOptions(formattedBanks);
                console.log('Formatted Banks:', formattedBanks);
            } else {
                console.error('Invalid bank data structure:', data);
                setBankOptions([]);
            }
        } catch (error) {
            console.error('Error fetching banks:', error);
            setBankOptions([]);
        } finally {
            setIsLoadingBanks(false);
        }
    };

    const fetchUsers = async () => {
        const q = String(userSearchTerm || '').trim();
        if (q.length < CLIENT_SEARCH_MIN) {
            setShowPartyDropdown(false);
            return;
        }

        setIsLoadingParties(true);
        try {
            const response = await fetch(`${API_BASE_URL}/client/search?search=${encodeURIComponent(q)}`, {
                method: 'GET',
                headers: getHeaders()
            });
            const data = await response.json();
            if (data.success) {
                const opts = (data.data || []).map(client => ({
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
                }));
                setUserOptions(opts);
                setShowPartyDropdown(opts.length > 0);
                setSelectedSaleUser((prev) => {
                    if (!prev) return prev;
                    const fresh = opts.find((o) => String(o.id) === String(prev.id));
                    return fresh ?? prev;
                });
            } else {
                setUserOptions([]);
                setShowPartyDropdown(false);
            }
        } catch (error) {
            console.error('Error fetching users:', error);
            setUserOptions([]);
            setShowPartyDropdown(false);
        } finally {
            setIsLoadingParties(false);
        }
    };

    // Combined party options based on sale type
    const partyOptions = useMemo(() => {
        if (effectiveSaleType === 'user') {
            return userOptions;
        } else if (effectiveSaleType === 'bank') {
            return bankOptions;
        }
        return [];
    }, [effectiveSaleType, userOptions, bankOptions]);

    // Reset form when modal opens or party context changes
    useEffect(() => {
        if (isOpen) {
            const presetPartyId = hidePartySelector && fixedParty?.id != null && fixedParty.id !== ''
                ? String(fixedParty.id)
                : (initialPartyId ? String(initialPartyId) : '');
            setFormData({
                party_id: presetPartyId,
                party_type: effectiveSaleType,
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
            setUserSearchTerm('');
            setShowPartyDropdown(false);
            setUserOptions([]);
            setSelectedSaleUser(null);
            setSelectedSaleFirmId('');
            const hasParty = Boolean(presetPartyId);
            setSaleBankPickerOpen(!hasParty);
            setSaleBankRow(null);
        }
    }, [isOpen, initialPartyId, effectiveSaleType, hidePartySelector, fixedParty?.id, fixedParty?.username]);

    const handleSaleTypeChange = (type) => {
        if (lockedSaleType) return;
        setSaleType(type);
        setFormData(prev => ({ ...prev, party_id: '', party_type: type }));
        setUserSearchTerm('');
        setShowPartyDropdown(false);
        setUserOptions([]);
        setSelectedSaleUser(null);
        setSelectedSaleFirmId('');
        setSaleBankPickerOpen(true);
        setSaleBankRow(null);
        if (type === 'bank' && bankOptions.length === 0) {
            fetchAllBanks();
        }
    };

    const getSelectedParty = () => {
        if (hidePartySelector && fixedParty && fixedParty.id != null && fixedParty.id !== '') {
            const id = String(fixedParty.id);
            return {
                ...fixedParty,
                id,
                type: effectiveSaleType === 'bank' ? 'bank' : 'user',
                name: fixedParty.name || String(fixedParty.id),
                username: fixedParty.username,
                email: fixedParty.email,
                contact: fixedParty.contact,
                pan_no: fixedParty.pan_no ?? fixedParty.pan_number,
                account: fixedParty.account,
                holder: fixedParty.holder,
            };
        }
        if (effectiveSaleType === 'user' && selectedSaleUser && String(selectedSaleUser.id) === String(formData.party_id)) {
            return selectedSaleUser;
        }
        return partyOptions.find(party => String(party.id) === String(formData.party_id));
    };

    const selectedSaleFirms = useMemo(() => {
        const p = getSelectedParty();
        return Array.isArray(p?.firms) ? p.firms : [];
    }, [formData.party_id, partyOptions, selectedSaleUser, hidePartySelector, fixedParty, effectiveSaleType]);

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

    /** Map sale `party` row to `ClientSearchAvatar` / Receive dropdown row shape */
    const partyRowToSearchClient = (party) => ({
        username: party.username,
        name: party.name,
        mobile: party.contact,
        email: party.email,
        pan_number: party.pan_no,
        country_code: party.country_code,
        balance: party.balance,
        profile: party.profile,
        profile_photo: party.profile_photo,
        profile_image: party.profile_image,
        photo_url: party.photo_url,
        image: party.image,
        avatar: party.avatar,
        photo: party.photo,
    });

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

    const handlePartySelect = (partyId) => {
        const id = String(partyId);
        if (effectiveSaleType === 'user') {
            const row = partyOptions.find((p) => String(p.id) === id);
            setSelectedSaleUser(row ?? null);
            setSelectedSaleFirmId('');
        } else {
            setSelectedSaleUser(null);
            setSelectedSaleFirmId('');
        }
        setFormData(prev => ({ ...prev, party_id: id }));
        setShowPartyDropdown(false);
        setUserSearchTerm('');
        if (effectiveSaleType === 'bank') {
            const row = bankOptions.find((b) => String(b.id) === id);
            setSaleBankRow(row || null);
            setSaleBankPickerOpen(false);
        }
    };

    // Calculate totals with proper decimal handling
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

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (isSubmitting) return;

        const partyIdOk = hidePartySelector && fixedParty?.id != null && fixedParty.id !== ''
            ? true
            : Boolean(formData.party_id);
        if (!partyIdOk) return;

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
            const selectedParty = getSelectedParty();

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
                round_off: formData.apply_round_off
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

            let endpoint = '';
            let finalPayload = {};

            if (effectiveSaleType === 'user') {
                endpoint = `${API_BASE_URL}/sale/create/user`;
                finalPayload = {
                    ...basePayload,
                    username: selectedParty?.username || selectedParty?.id,
                    user_type: 'client',
                };
                if (selectedSaleFirmId) {
                    finalPayload.firm_id = selectedSaleFirmId;
                }
            } else if (effectiveSaleType === 'bank') {
                endpoint = `${API_BASE_URL}/sale/create/bank`;
                finalPayload = {
                    ...basePayload,
                    bank_id: selectedParty?.id
                };
            }

            console.log('Submitting to:', endpoint);
            console.log('Payload:', finalPayload);

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify(finalPayload)
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
                    sale_type: effectiveSaleType,
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
                console.log('Form submitted successfully:', submissionData);
                onSuccess(submissionData);
                if (mode === 'modal') onClose();
            } else {
                throw new Error(data.message || `Failed to create ${effectiveSaleType} sale`);
            }
        } catch (error) {
            console.error('Error submitting form:', error);
            toast.error(error.message || `Error creating ${effectiveSaleType} sale. Please try again.`);
        } finally {
            setIsSubmitting(false);
        }
    };

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

    const formClassMerged = [mode === 'modal' ? 'space-y-5' : '', formClassName].filter(Boolean).join(' ').trim();

    const partyReady = hidePartySelector && fixedParty?.id != null && fixedParty.id !== ''
        ? true
        : Boolean(formData.party_id);

    const bankCardFromSearchOrParty = () => {
        if (saleBankRow && String(saleBankRow.bank_id ?? saleBankRow.id) === String(formData.party_id)) {
            return saleBankRow;
        }
        const p = getSelectedParty();
        if (!p || effectiveSaleType !== 'bank' || !formData.party_id) return null;
        return {
            bank: p.name,
            holder: p.holder,
            account_no: p.account,
            ifsc: p.ifsc,
            branch: p.branch,
            balance: p.balance,
        };
    };

    const saleFormElement = (
        <>
            {aboveForm}
            <form id={saleFormId} onSubmit={handleSubmit} className={formClassMerged || undefined}>
                {/* Party + date — Receive/Payment-style labels, bank search + preview cards */}
                <div className="space-y-5 mb-6">
                    {!hidePartySelector && effectiveSaleType === 'user' && (
                        <div className="space-y-3">
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Client <span className="text-red-500">*</span>
                            </label>
                            {!formData.party_id ? (
                                <>
                                    <p className="text-xs text-slate-500 mb-1.5">
                                        Type at least {CLIENT_SEARCH_MIN} characters (name, mobile, email, or PAN).
                                    </p>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={userSearchTerm}
                                            onChange={(e) => {
                                                const value = e.target.value;
                                                setUserSearchTerm(value);
                                                if (!value.trim()) {
                                                    setUserOptions([]);
                                                    setShowPartyDropdown(false);
                                                }
                                            }}
                                            onFocus={() => {
                                                if (partyOptions.length > 0) setShowPartyDropdown(true);
                                            }}
                                            placeholder="Name, mobile, email, or PAN (min 3 characters)"
                                            className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            autoComplete="off"
                                        />
                                        {isLoadingParties && (
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent" />
                                            </div>
                                        )}
                                        {showPartyDropdown && partyOptions.length > 0 && (
                                            <div className="absolute z-[60] mt-1 w-full max-w-[calc(100%-0.5rem)] bg-white border-2 border-slate-200 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                                                {partyOptions.map((party) => (
                                                    <button
                                                        key={party.id}
                                                        type="button"
                                                        onClick={() => handlePartySelect(party.id)}
                                                        className="w-full flex items-start gap-3 px-4 py-3 text-left border-b border-slate-100 last:border-0 transition-colors hover:bg-blue-50"
                                                    >
                                                        <ClientSearchAvatar client={partyRowToSearchClient(party)} sizeClass="w-9 h-9" textClass="text-sm" />
                                                        <div className="min-w-0 flex-1">
                                                            <div className="font-medium text-slate-800 truncate">{party.name || '—'}</div>
                                                            <div className="text-xs text-slate-600 mt-1 space-y-0.5">
                                                                <p className="flex items-center gap-1.5">
                                                                    <FiPhone className="w-3 h-3 shrink-0 text-slate-400" />
                                                                    <span>{party.country_code ? `+${party.country_code} ` : ''}{party.contact || '—'}</span>
                                                                </p>
                                                                <p className="flex items-center gap-1.5 break-all">
                                                                    <FiMail className="w-3 h-3 shrink-0 text-slate-400" />
                                                                    <span>{party.email || '—'}</span>
                                                                </p>
                                                                <p className="flex items-center gap-1.5">
                                                                    <FiCreditCard className="w-3 h-3 shrink-0 text-slate-400" />
                                                                    <span className="font-mono">{party.pan_no || '—'}</span>
                                                                    <span className="text-slate-400">·</span>
                                                                    <span className="font-semibold text-slate-700">Bal. ₹{formatMoney(party.balance ?? 0)}</span>
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    {!isLoadingParties
                                        && userSearchTerm.trim().length >= CLIENT_SEARCH_MIN
                                        && partyOptions.length === 0 && (
                                            <p className="text-xs text-slate-500 mt-1.5">No clients found</p>
                                        )}
                                </>
                            ) : (
                                <div className="space-y-3">
                                    <SaleClientPreviewCard
                                        party={getSelectedParty()}
                                        summary={summary}
                                        formatMoney={formatMoney}
                                        onChangeClient={() => {
                                            setFormData((prev) => ({ ...prev, party_id: '' }));
                                            setSelectedSaleUser(null);
                                            setSelectedSaleFirmId('');
                                            setUserSearchTerm('');
                                            setUserOptions([]);
                                            setShowPartyDropdown(false);
                                        }}
                                    />
                                    {selectedSaleFirms.length > 0 && (
                                        <div className="rounded-lg border border-slate-200 bg-white p-3">
                                            <SelectInput
                                                label="Firm (optional)"
                                                options={saleFirmSelectOptions}
                                                value={selectedSaleFirmId || null}
                                                onChange={(value) => setSelectedSaleFirmId(value ? String(value) : '')}
                                                placeholder="Select firm for this sale"
                                                searchPlaceholder="Search firm by name, PAN, file no, type"
                                                noOptionsText="No firms available"
                                                clearable
                                            />
                                            {selectedSaleFirm && (
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
                            )}
                        </div>
                    )}

                    {!hidePartySelector && effectiveSaleType === 'bank' && (
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                Bank Account <span className="text-red-500">*</span>
                            </label>
                            {(!formData.party_id || saleBankPickerOpen) ? (
                                <BankSearchDropdown
                                    onSelect={(bank) => {
                                        setFormData((prev) => ({ ...prev, party_id: String(bank.bank_id) }));
                                        setSaleBankRow(bank);
                                        setSaleBankPickerOpen(false);
                                    }}
                                    selectedBankId={formData.party_id || undefined}
                                />
                            ) : (
                                <SaleBankPreviewCard
                                    bank={bankCardFromSearchOrParty()}
                                    onChangeBank={() => setSaleBankPickerOpen(true)}
                                    formatMoney={formatMoney}
                                />
                            )}
                        </div>
                    )}

                    {hidePartySelector && showFixedPartyBanner && fixedParty && (
                        <div>
                            {effectiveSaleType === 'user' ? (
                                <SaleClientPreviewCard
                                    party={getSelectedParty()}
                                    summary={summary}
                                    formatMoney={formatMoney}
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
                                    formatMoney={formatMoney}
                                    readOnly
                                />
                            )}
                        </div>
                    )}

                    {mode !== 'modal' && (
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
                <div className="mb-6">
                    <div className="flex justify-between items-center mb-4">
                        <div>
                            <h3 className="text-base font-bold text-gray-900">Services & Items</h3>
                            <p className="text-xs text-gray-600 mt-0.5">Add services and items for this invoice</p>
                        </div>
                        <button
                            type="button"
                            onClick={addItem}
                            disabled={isLoadingServices}
                            className="inline-flex items-center px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:ring-offset-1 transition-all duration-200 shadow-sm text-sm disabled:opacity-50"
                        >
                            <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Add Service
                        </button>
                    </div>

                    <div className="overflow-hidden border border-gray-300 rounded-lg shadow-sm text-sm">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                                <tr>
                                    <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Service</th>
                                    <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Description</th>
                                    <th className="px-3 py-2.5 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Price</th>
                                    <th className="px-3 py-2.5 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Action</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {formData.items.map((item, index) => (
                                    <tr key={index} className="hover:bg-gray-50 transition-colors duration-150">
                                        <td className="px-3 py-2.5 min-w-[220px]">
                                            <SelectInput
                                                options={serviceSelectOptions}
                                                value={item.service_id !== '' && item.service_id != null ? String(item.service_id) : null}
                                                onChange={(v) => handleServiceChange(index, v ?? '')}
                                                placeholder={isLoadingServices ? 'Loading services…' : 'Select service'}
                                                searchPlaceholder="Search services…"
                                                disabled={isLoadingServices}
                                                clearable={false}
                                                className="text-sm"
                                            />
                                        </td>
                                        <td className="px-3 py-2.5">
                                            <input
                                                type="text"
                                                className="w-full px-2.5 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-150"
                                                placeholder="Description"
                                                value={item.description}
                                                onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                                            />
                                        </td>
                                        <td className="px-3 py-2.5">
                                            <input
                                                type="text"
                                                name={`sale-price-${index}`}
                                                inputMode="decimal"
                                                autoComplete="off"
                                                className="w-full px-2.5 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-150 text-right"
                                                placeholder="0.00"
                                                value={item.price ?? ''}
                                                onChange={(e) => handleItemChange(index, 'price', e.target.value)}
                                                required
                                            />
                                        </td>
                                        <td className="px-3 py-2.5 text-center">
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
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
                    <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                        <div className="flex items-center mb-3">
                            <div className="p-1.5 bg-indigo-100 text-indigo-600 rounded mr-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <h4 className="text-sm font-bold text-gray-900">Additional Settings</h4>
                        </div>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1.5">Additional Charge (₹)</label>
                                <input
                                    type="text"
                                    inputMode="decimal"
                                    autoComplete="off"
                                    className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                                    name="additional_charge"
                                    value={formData.additional_charge ?? ''}
                                    onChange={handleInputChange}
                                    placeholder="0.00"
                                />
                                <p className="text-xs text-gray-500 mt-1">Additional charge will be added after GST calculation</p>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                    <svg className="w-4 h-4 text-gray-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                    </svg>
                                    <span className="text-xs font-medium text-gray-700">Apply Round Off</span>
                                </div>
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
                    <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                        <div className="flex items-center mb-3">
                            <div className="p-1.5 bg-indigo-100 text-indigo-600 rounded mr-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </div>
                            <h4 className="text-sm font-bold text-gray-900">Notes</h4>
                        </div>
                        <textarea
                            className="w-full h-28 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-150 resize-none bg-gray-50 text-sm"
                            placeholder="Notes"
                            name="notes"
                            value={formData.notes}
                            onChange={handleInputChange}
                        />
                    </div>
                </div>

                {/* Discount and Totals Section */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* Discount Section */}
                    <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                        <div className="flex items-center mb-3">
                            <div className="p-1.5 bg-indigo-100 text-indigo-600 rounded mr-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <h4 className="text-sm font-bold text-gray-900">Discount</h4>
                        </div>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1.5">Discount Type</label>
                                <select
                                    className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-150"
                                    name="discount_type"
                                    value={formData.discount_type}
                                    onChange={handleInputChange}
                                >
                                    <option value="percentage">Percentage (%)</option>
                                    <option value="flat">Flat Amount (₹)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                                    {formData.discount_type === 'percentage' ? 'Percentage (%)' : 'Amount (₹)'}
                                </label>
                                <input
                                    type="text"
                                    inputMode="decimal"
                                    autoComplete="off"
                                    className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-150"
                                    name="discount"
                                    value={formData.discount ?? ''}
                                    onChange={handleInputChange}
                                    placeholder="0"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Totals Section */}
                    <div className="lg:col-span-2 bg-gradient-to-br from-indigo-50 to-white p-4 rounded-lg border border-indigo-100 shadow-sm">
                        <div className="flex items-center mb-4">
                            <div className="p-1.5 bg-indigo-600 text-white rounded mr-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                </svg>
                            </div>
                            <h4 className="text-sm font-bold text-gray-900">Summary</h4>
                        </div>
                        <div className="space-y-2 text-sm">
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
                        </div>
                    </div>
                </div>
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

                {typeToggleVisible && (
                    <div className="flex items-center gap-2 bg-indigo-500/30 rounded-lg p-1">
                        <button
                            type="button"
                            onClick={() => handleSaleTypeChange('user')}
                            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200 ${effectiveSaleType === 'user'
                                ? 'bg-white text-indigo-700 shadow-md'
                                : 'text-indigo-100 hover:bg-indigo-500/50'
                                }`}
                        >
                            <div className="flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                                <span>User/Client</span>
                            </div>
                        </button>
                        <button
                            type="button"
                            onClick={() => handleSaleTypeChange('bank')}
                            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200 ${effectiveSaleType === 'bank'
                                ? 'bg-white text-indigo-700 shadow-md'
                                : 'text-indigo-100 hover:bg-indigo-500/50'
                                }`}
                        >
                            <div className="flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                                </svg>
                                <span>Bank</span>
                            </div>
                        </button>
                    </div>
                )}
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
        const salePartyTypeHeader = typeToggleVisible ? (
            <div className="flex rounded-lg border border-slate-200 bg-white p-0.5 shadow-sm shrink-0" role="group" aria-label="Invoice party type">
                <button
                    type="button"
                    onClick={() => handleSaleTypeChange('user')}
                    className={`px-2.5 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-all ${effectiveSaleType === 'user' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                    Client
                </button>
                <button
                    type="button"
                    onClick={() => handleSaleTypeChange('bank')}
                    className={`px-2.5 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-all ${effectiveSaleType === 'bank' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                    Bank
                </button>
            </div>
        ) : null;

        const saleModalHeaderTrailing = (
            <div className="flex flex-wrap items-center justify-end gap-2">
                <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-xs font-medium text-slate-600 whitespace-nowrap">
                        Date <span className="text-red-500">*</span>
                    </span>
                    <DatePickerField
                        value={formData.payment_date}
                        onChange={(value) => setFormData((prev) => ({ ...prev, payment_date: value || '' }))}
                        mode="single"
                        hideTabs={true}
                        showResetButton={false}
                        placeholder="Invoice date"
                        buttonClassName="min-w-[8.5rem] w-[8.5rem] sm:min-w-[9.25rem] sm:w-[9.25rem] px-2.5 py-1.5 border-2 border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                    />
                </div>
                {salePartyTypeHeader}
            </div>
        );

        const hasSaleLineReady = formData.items.some(
            (item) => item.service_id && parseDecimalValue(item.price) > 0
        );
        const isSaleSubmitDisabled = isSubmitting || !partyReady || !hasSaleLineReady;
        const defaultSubmitLabel = 'Create Sale';

        const invoiceFooterToggle = (checked, onCheckedChange, icon, ariaLabel, onTrackClass) => (
            <button
                type="button"
                role="switch"
                aria-checked={checked}
                aria-label={ariaLabel}
                title={ariaLabel}
                onClick={() => onCheckedChange(!checked)}
                className="inline-flex items-center gap-2 rounded-lg py-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
            >
                <span
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border border-slate-200/80 transition-colors ${checked ? onTrackClass : 'bg-slate-200'}`}
                >
                    <span
                        className={`pointer-events-none absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ease-out ${checked ? 'translate-x-5' : 'translate-x-0'}`}
                    />
                </span>
                <span className="text-slate-600 [&>svg]:h-4 [&>svg]:w-4 [&>svg]:shrink-0" aria-hidden>
                    {icon}
                </span>
            </button>
        );

        return (
            <BaseModal
                isOpen={isOpen}
                onClose={onClose}
                title={modalTitle}
                maxWidth={modalMaxWidth}
                closeOnOverlayClick={closeOnOverlayClick}
                headerTrailing={saleModalHeaderTrailing}
                footer={(
                    <div className="flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                        {showNotificationToggles && (
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                                <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Send invoice</span>
                                {invoiceFooterToggle(sendEmail, setSendEmail, <FiMail />, 'Email invoice', 'bg-slate-700')}
                                {invoiceFooterToggle(sendSms, setSendSms, <FiMessageSquare />, 'SMS invoice', 'bg-sky-600')}
                                {invoiceFooterToggle(sendWhatsApp, setSendWhatsApp, <FiMessageCircle className="text-emerald-600" />, 'WhatsApp invoice', 'bg-emerald-600')}
                            </div>
                        )}
                        <div className="flex w-full flex-wrap items-center justify-end gap-3 sm:w-auto">
                            <div className="text-sm text-right">
                                <span className="text-xs font-medium text-slate-500">Grand total</span>
                                <span className="ml-2 text-base font-semibold tabular-nums text-slate-900">{formatMoney(formData.grand_total)}</span>
                            </div>
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={isSubmitting}
                                className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-500/40 disabled:opacity-50 transition-all duration-200"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                form={saleFormId}
                                disabled={isSaleSubmitDisabled}
                                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg text-sm font-medium hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 inline-flex items-center justify-center min-w-[160px]"
                            >
                                {isSubmitting ? 'Creating...' : (submitButtonLabel || defaultSubmitLabel)}
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
    const lockedSaleType = hasClient ? 'user' : hasBank ? 'bank' : null;
    const hidePartySelector = Boolean(lockedSaleType);
    const fixedParty = hasClient
        ? {
            id: clientId || clientUsername,
            username: clientUsername,
            name: clientName || clientUsername || String(clientId || clientUsername || ''),
        }
        : hasBank
            ? { id: bankId, name: bankName || 'Bank' }
            : null;

    return (
        <SaleForm
            isOpen={isOpen}
            onClose={onClose}
            onSuccess={(data) => onSubmit && onSubmit('SALE', data)}
            initialPartyId={fixedParty ? String(fixedParty.id) : ''}
            mode="modal"
            defaultSaleType={lockedSaleType || 'user'}
            lockedSaleType={lockedSaleType}
            hidePartySelector={hidePartySelector}
            showFixedPartyBanner={!lockedSaleType}
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
    lockedSaleType: 'user',
    hidePartySelector: true,
    fixedParty: {
        id: clientId || clientUsername,
        username: clientUsername,
        name: clientName || clientUsername || String(clientId || clientUsername || ''),
    },
    showSaleTypeToggle: false,
    ...(partyBannerSubtitle ? { partyBannerSubtitle } : {}),
});

/** Spread into `<SaleForm />` on a bank ledger page (bank known; no search UI). */
export const saleFormLedgerBankProps = ({ bankId, bankName, partyBannerSubtitle = '' }) => ({
    lockedSaleType: 'bank',
    hidePartySelector: true,
    fixedParty: {
        id: bankId,
        name: bankName || 'Bank',
    },
    showSaleTypeToggle: false,
    ...(partyBannerSubtitle ? { partyBannerSubtitle } : {}),
});

export const PurchaseForm = ({
    isOpen = false,
    onClose = () => { },
    onSuccess = () => { },
    mode = 'modal',
    initialPartyId = '',
    hidePartySelector = false,
    fixedParty = null,
    showFixedPartyBanner = true,
    modalTitle = 'Create Purchase Bill',
    modalMaxWidth = 'max-w-4xl',
    closeOnOverlayClick = false,
    formClassName = '',
    submitButtonLabel = '',
}) => {
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
    const [selectedPurchaseUser, setSelectedPurchaseUser] = useState(null);
    const [sendEmail, setSendEmail] = useState(true);
    const [sendWhatsApp, setSendWhatsApp] = useState(true);

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
        setShowPartyDropdown(false);
        setSelectedPurchaseUser(null);
        fetchServices();
    }, [isOpen, hidePartySelector, fixedParty?.id, initialPartyId]);

    useEffect(() => {
        if (hidePartySelector) return;
        const q = String(userSearchTerm || '').trim();
        if (q.length < CLIENT_SEARCH_MIN) {
            setShowPartyDropdown(false);
            if (!formData.party_id) setUserOptions([]);
            return;
        }
        const delayDebounce = setTimeout(() => {
            fetchUsers();
        }, 500);
        return () => clearTimeout(delayDebounce);
    }, [userSearchTerm, hidePartySelector, formData.party_id]);

    const fetchServices = async () => {
        setIsLoadingServices(true);
        try {
            const response = await fetch(`${API_BASE_URL}/service/list?search=&category_id`, {
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

    const fetchUsers = async () => {
        const q = String(userSearchTerm || '').trim();
        if (q.length < CLIENT_SEARCH_MIN) {
            setShowPartyDropdown(false);
            return;
        }
        setIsLoadingParties(true);
        try {
            const response = await fetch(`${API_BASE_URL}/client/search?search=${encodeURIComponent(q)}`, {
                method: 'GET',
                headers: getHeaders()
            });
            const data = await response.json();
            if (data.success) {
                const opts = (data.data || []).map((client) => ({
                    id: client.client_id || client.username,
                    type: 'user',
                    name: client.name || client.firm_name,
                    email: client.email,
                    contact: client.mobile,
                    pan_no: client.pan_number,
                    username: client.username,
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
                }));
                setUserOptions(opts);
                setShowPartyDropdown(opts.length > 0);
            } else {
                setUserOptions([]);
                setShowPartyDropdown(false);
            }
        } catch (error) {
            console.error('Error fetching users:', error);
            setUserOptions([]);
            setShowPartyDropdown(false);
        } finally {
            setIsLoadingParties(false);
        }
    };

    const getSelectedParty = () => {
        if (hidePartySelector && fixedParty && fixedParty.id != null && fixedParty.id !== '') {
            const id = String(fixedParty.id);
            return {
                ...fixedParty,
                id,
                type: 'user',
                name: fixedParty.name || String(fixedParty.id),
                username: fixedParty.username || id,
                email: fixedParty.email,
                contact: fixedParty.contact,
                pan_no: fixedParty.pan_no ?? fixedParty.pan_number,
            };
        }
        if (selectedPurchaseUser && String(selectedPurchaseUser.id) === String(formData.party_id)) {
            return selectedPurchaseUser;
        }
        return userOptions.find((u) => String(u.id) === String(formData.party_id));
    };

    const partyRowToSearchClient = (party) => ({
        username: party.username,
        name: party.name,
        mobile: party.contact,
        email: party.email,
        pan_number: party.pan_no,
        country_code: party.country_code,
        balance: party.balance,
        profile: party.profile,
        profile_photo: party.profile_photo,
        profile_image: party.profile_image,
        photo_url: party.photo_url,
        image: party.image,
        avatar: party.avatar,
        photo: party.photo,
    });

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
            toast.error('Please select a client');
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
        if (!selectedParty?.username && !selectedParty?.id) {
            toast.error('Client information is missing');
            return;
        }

        setIsSubmitting(true);
        try {
            const payload = {
                username: selectedParty.username || selectedParty.id,
                user_type: 'client',
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

            const response = await fetch(`${API_BASE_URL}/purchase/create/user`, {
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
                selected_party: selectedParty,
                timestamp: new Date().toISOString(),
                api_response: data,
                notifications: {
                    email: sendEmail,
                    whatsapp: sendWhatsApp,
                },
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

    const formClassMerged = [mode === 'modal' ? 'space-y-5' : '', formClassName].filter(Boolean).join(' ').trim();
    const partyReady = hidePartySelector && fixedParty?.id != null && fixedParty.id !== ''
        ? true
        : Boolean(formData.party_id);
    const selectedParty = getSelectedParty();

    const purchaseFormElement = (
        <form id="purchase-create-form" onSubmit={handleSubmit} className={formClassMerged || undefined}>
            <div className="space-y-5 mb-6">
                {!hidePartySelector ? (
                    <div className="space-y-3">
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Client <span className="text-red-500">*</span>
                        </label>
                        {!formData.party_id ? (
                            <>
                                <p className="text-xs text-slate-500 mb-1.5">
                                    Type at least {CLIENT_SEARCH_MIN} characters (name, mobile, email, or PAN).
                                </p>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={userSearchTerm}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            setUserSearchTerm(value);
                                            if (!value.trim()) {
                                                setUserOptions([]);
                                                setShowPartyDropdown(false);
                                            }
                                        }}
                                        onFocus={() => {
                                            if (userOptions.length > 0) setShowPartyDropdown(true);
                                        }}
                                        placeholder="Name, mobile, email, or PAN (min 3 characters)"
                                        className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                        autoComplete="off"
                                    />
                                    {isLoadingParties && (
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-purple-500 border-t-transparent" />
                                        </div>
                                    )}
                                    {showPartyDropdown && userOptions.length > 0 && (
                                        <div className="absolute z-[60] mt-1 w-full max-w-[calc(100%-0.5rem)] bg-white border-2 border-slate-200 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                                            {userOptions.map((party) => (
                                                <button
                                                    key={party.id}
                                                    type="button"
                                                    onClick={() => {
                                                        const id = String(party.id);
                                                        setSelectedPurchaseUser(party);
                                                        setFormData((prev) => ({ ...prev, party_id: id }));
                                                        setShowPartyDropdown(false);
                                                        setUserSearchTerm('');
                                                    }}
                                                    className="w-full flex items-start gap-3 px-4 py-3 text-left border-b border-slate-100 last:border-0 transition-colors hover:bg-purple-50"
                                                >
                                                    <ClientSearchAvatar client={partyRowToSearchClient(party)} sizeClass="w-9 h-9" textClass="text-sm" />
                                                    <div className="min-w-0 flex-1">
                                                        <div className="font-medium text-slate-800 truncate">{party.name || '—'}</div>
                                                        <div className="text-xs text-slate-600 mt-1 space-y-0.5">
                                                            <p className="flex items-center gap-1.5">
                                                                <FiPhone className="w-3 h-3 shrink-0 text-slate-400" />
                                                                <span>{party.country_code ? `+${party.country_code} ` : ''}{party.contact || '—'}</span>
                                                            </p>
                                                            <p className="flex items-center gap-1.5 break-all">
                                                                <FiMail className="w-3 h-3 shrink-0 text-slate-400" />
                                                                <span>{party.email || '—'}</span>
                                                            </p>
                                                        </div>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : (
                            <SaleClientPreviewCard
                                party={selectedParty}
                                summary={null}
                                formatMoney={(v) => new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(parseDecimalValue(v))}
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
                ) : (
                    showFixedPartyBanner && fixedParty && (
                        <SaleClientPreviewCard
                            party={selectedParty}
                            summary={null}
                            formatMoney={(v) => new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(parseDecimalValue(v))}
                            readOnly
                        />
                    )
                )}

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                            Purchase Date <span className="text-red-500">*</span>
                        </label>
                        <DatePickerField
                            value={formData.transaction_date}
                            onChange={(v) => setFormData((prev) => ({ ...prev, transaction_date: v || '' }))}
                            mode="single"
                            hideTabs={true}
                            showResetButton={false}
                            placeholder="Select date"
                            buttonClassName="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                            Tax Rate (%) <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            inputMode="decimal"
                            value={String(formData.tax_rate ?? '')}
                            onChange={(e) => setFormData((prev) => ({ ...prev, tax_rate: sanitizeDecimalInput(e.target.value, 2) }))}
                            className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                        />
                    </div>
                </div>
            </div>

            <div className="mb-6 rounded-xl border border-slate-200 bg-white">
                <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                    <h3 className="text-sm font-semibold text-slate-800">Purchase Items</h3>
                    <button
                        type="button"
                        onClick={addItem}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-purple-700"
                    >
                        <IoAdd className="h-4 w-4" />
                        Add Item
                    </button>
                </div>
                <div className="space-y-3 p-4">
                    {formData.items.map((item, index) => (
                        <div key={index} className="grid grid-cols-1 gap-3 rounded-lg border border-slate-100 p-3 sm:grid-cols-12">
                            <div className="sm:col-span-5">
                                <label className="mb-1 block text-xs font-medium text-slate-500">Service</label>
                                <SelectInput
                                    options={serviceSelectOptions}
                                    value={item.service_id ? String(item.service_id) : null}
                                    onChange={(value) => handleServiceChange(index, value ? String(value) : '')}
                                    placeholder={isLoadingServices ? 'Loading services...' : 'Select service'}
                                    searchPlaceholder="Search service..."
                                    noOptionsText={isLoadingServices ? 'Loading...' : 'No services found'}
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

            <div className="space-y-4">
                <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Remark</label>
                    <textarea
                        value={formData.remark}
                        onChange={(e) => setFormData((prev) => ({ ...prev, remark: e.target.value }))}
                        rows="2"
                        placeholder="Any remark"
                        className="w-full rounded-lg border-2 border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    />
                </div>
            </div>
        </form>
    );

    if (mode !== 'modal') return purchaseFormElement;
    if (!isOpen) return null;

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            title={modalTitle}
            maxWidth={modalMaxWidth}
            closeOnOverlayClick={closeOnOverlayClick}
            footer={(
                <div className="w-full">
                    <div className="mb-3 flex items-center gap-4">
                        <label className="flex items-center cursor-pointer">
                            <input type="checkbox" checked={sendEmail} onChange={(e) => setSendEmail(e.target.checked)} className="mr-2" />
                            <span className="text-xs">Email Bill</span>
                        </label>
                        <label className="flex items-center cursor-pointer">
                            <input type="checkbox" checked={sendWhatsApp} onChange={(e) => setSendWhatsApp(e.target.checked)} className="mr-2" />
                            <span className="text-xs">WhatsApp Bill</span>
                        </label>
                    </div>
                    <div className="flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            form="purchase-create-form"
                            disabled={isSubmitting || !partyReady}
                            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg text-sm font-medium hover:from-purple-700 hover:to-purple-800 disabled:opacity-50 transition-all min-w-[170px]"
                        >
                            {isSubmitting ? 'Creating...' : (submitButtonLabel || 'Create Purchase Bill')}
                        </button>
                    </div>
                </div>
            )}
        >
            {purchaseFormElement}
        </BaseModal>
    );
};

/** Spread into `<PurchaseForm />` on a client ledger page (party known; no search UI). */
export const purchaseFormLedgerClientProps = ({ clientId, clientUsername, clientName }) => ({
    hidePartySelector: true,
    fixedParty: {
        id: clientId || clientUsername,
        username: clientUsername || clientId,
        name: clientName || clientUsername || String(clientId || ''),
    },
});

/** Backward-compatible wrapper used by `TransactionModalManager`. */
export const PurchaseModal = ({ isOpen, onClose, onSubmit, clientUsername, clientName, clientId }) => {
    const hasClient = Boolean(String(clientUsername || clientId || '').trim());
    return (
        <PurchaseForm
            isOpen={isOpen}
            onClose={onClose}
            onSuccess={(data) => {
                if (onSubmit) onSubmit('PURCHASE', data);
            }}
            mode="modal"
            initialPartyId={hasClient ? String(clientId || clientUsername) : ''}
            hidePartySelector={hasClient}
            showFixedPartyBanner={!hasClient}
            fixedParty={hasClient ? {
                id: clientId || clientUsername,
                username: clientUsername || clientId,
                name: clientName || clientUsername || String(clientId || clientUsername || ''),
            } : null}
            modalTitle={hasClient ? 'Purchase from Client' : 'Create Purchase Bill'}
        />
    );
};

// Expense Modal - UI Only with Bank Search
export const ExpenseModal = ({ isOpen, onClose, bankDetails, bankId, onSubmit, formatCurrency, clientUsername, clientName, showClient = true, showBank = true }) => {
    const [selectedBank, setSelectedBank] = useState(bankDetails || (bankId ? { bank_id: bankId, bank: 'Selected Bank' } : null));
    const [showBankSearch, setShowBankSearch] = useState(false);
    const [transactionDate, setTransactionDate] = useState(new Date().toISOString().split('T')[0]);
    const [amount, setAmount] = useState('');
    const [formKey, setFormKey] = useState(0);

    // Reset all fields every time the modal opens
    useEffect(() => {
        if (!isOpen) return;
        setFormKey(k => k + 1);
        setSelectedBank(bankDetails || (bankId ? { bank_id: bankId, bank: 'Selected Bank' } : null));
        setShowBankSearch(false);
        setTransactionDate(new Date().toISOString().split('T')[0]);
        setAmount('');
    }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleSubmit = (e) => {
        e.preventDefault();

        const effectiveBank = selectedBank || (bankId ? { bank_id: bankId, bank: 'Selected Bank' } : null);
        if (!effectiveBank) {
            toast.error('Please select a bank');
            return;
        }

        const formData = new FormData(e.target);
        const parsedAmount = parseDecimalValue(amount);
        if (!parsedAmount || parsedAmount <= 0) {
            toast.error('Please enter a valid amount');
            return;
        }
        const data = {
            ...Object.fromEntries(formData),
            date: transactionDate,
            amount: parsedAmount,
            bank: effectiveBank,
            clientName: clientName,
            clientUsername: clientUsername
        };
        onSubmit('EXPENSE', data);
        toast.success('Expense created successfully (Demo)');
        onClose();
    };

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            title="Create Expense"
            footer={(
                <div className="flex justify-end gap-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-500/40 transition-all duration-200"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        form="expense-form"
                        disabled={!(selectedBank || bankId)}
                        className="px-4 py-2 bg-gradient-to-r from-orange-600 to-orange-700 text-white rounded-lg text-sm font-medium hover:from-orange-700 hover:to-orange-800 focus:outline-none focus:ring-2 focus:ring-orange-500/40 disabled:opacity-50 transition-all duration-200 min-w-[140px]"
                    >
                        Create Expense
                    </button>
                </div>
            )}
        >
            <form key={formKey} id="expense-form" onSubmit={handleSubmit} className="space-y-5">
                {/* Client Info - Read Only */}
                {showClient && <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs text-orange-600 font-medium">Client</p>
                            <p className="text-lg font-semibold text-slate-800">{clientName}</p>
                            <p className="text-xs text-slate-500">Username: {clientUsername}</p>
                        </div>
                    </div>
                </div>}

                {/* Bank Selection */}
                {showBank && <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                    <label className="block text-sm font-medium text-orange-700 mb-2">
                        Select Bank Account <span className="text-red-500">*</span>
                    </label>

                    {(!selectedBank || showBankSearch) ? (
                        <BankSearchDropdown
                            onSelect={(bank) => {
                                setSelectedBank(bank);
                                setShowBankSearch(false);
                            }}
                            selectedBankId={selectedBank?.bank_id}
                        />
                    ) : (
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium text-slate-800">{selectedBank?.bank || 'No bank selected'}</p>
                                {selectedBank && (
                                    <p className="text-sm text-slate-600">
                                        A/c: {selectedBank?.account_no} | Balance: ₹{formatCurrency(selectedBank?.balance || 0)}
                                    </p>
                                )}
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowBankSearch(true)}
                                className="px-3 py-1 text-sm bg-white border border-orange-300 text-orange-600 rounded-lg hover:bg-orange-50"
                            >
                                Change Bank
                            </button>
                        </div>
                    )}
                </div>}

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Payee Name <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            name="payee"
                            placeholder="Enter payee name"
                            required
                            className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Date <span className="text-red-500">*</span>
                            </label>
                            <DatePickerField
                                value={transactionDate}
                                onChange={setTransactionDate}
                                mode="single"
                                hideTabs={true}
                                showResetButton={false}
                                placeholder="Select date"
                                buttonClassName="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Amount <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                name="amount"
                                placeholder="Enter amount"
                                required
                                inputMode="decimal"
                                value={amount}
                                onChange={(e) => setAmount(sanitizeDecimalInput(e.target.value, 2))}
                                className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Category <span className="text-red-500">*</span>
                        </label>
                        <select
                            name="category"
                            required
                            className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        >
                            <option value="">Select Category</option>
                            <option value="rent">Rent</option>
                            <option value="salary">Salary</option>
                            <option value="electricity">Electricity</option>
                            <option value="travel">Travel</option>
                            <option value="office">Office Expenses</option>
                            <option value="other">Other</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Payment Mode <span className="text-red-500">*</span>
                        </label>
                        <select
                            name="payment_mode"
                            required
                            className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        >
                            <option value="cash">Cash</option>
                            <option value="cheque">Cheque</option>
                            <option value="online">Online Transfer</option>
                            <option value="card">Card</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Description
                        </label>
                        <textarea
                            name="description"
                            placeholder="Enter description"
                            rows="2"
                            className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        />
                    </div>
                </div>

            </form>
        </BaseModal>
    );
};

// Journal Modal — client-to-client transfer (same client UI as Receive/Payment)
export const JournalModal = ({
    isOpen,
    onClose,
    onSubmit,
    formatCurrency,
    showSummary = true,
    showFromClient = true,
    showToClient = true,
    /** Optional preset “from” client (username) when opening from a client context */
    clientUsername = '',
    clientName = '',
    /** Legacy: hide entire from block — maps to !showFromClient */
    showClient = true,
}) => {
    const showFromSection = showClient && showFromClient;
    const [loading, setLoading] = useState(false);
    const [presetFromClient, setPresetFromClient] = useState(null);
    const [loadingPresetFrom, setLoadingPresetFrom] = useState(false);
    const [transactionDate, setTransactionDate] = useState(new Date().toISOString().split('T')[0]);
    const [amount, setAmount] = useState('');
    const [formKey, setFormKey] = useState(0);
    const [excludeForFromLookup, setExcludeForFromLookup] = useState('');

    const hasPresetFromParam = Boolean(String(clientUsername || '').trim());

    const shouldShowFromSelector = showFromSection && !hasPresetFromParam;
    const shouldShowToSelector = showToClient;

    const fromFirmLookup = useFirmClientSearch(Boolean(shouldShowFromSelector), excludeForFromLookup);

    const excludeUsernameForTo = hasPresetFromParam
        ? String(clientUsername || '').trim()
        : (fromFirmLookup.selectedFirm?.username || '');

    const toFirmLookup = useFirmClientSearch(Boolean(shouldShowToSelector), excludeUsernameForTo);

    useEffect(() => {
        setExcludeForFromLookup(toFirmLookup.selectedFirm?.username || '');
    }, [toFirmLookup.selectedFirm]);

    useEffect(() => {
        if (!isOpen || !hasPresetFromParam) {
            setPresetFromClient(null);
            setLoadingPresetFrom(false);
            return undefined;
        }
        let cancelled = false;
        setLoadingPresetFrom(true);
        (async () => {
            try {
                const response = await axios.get(
                    `${API_BASE_URL}/client/search?page_no=1&limit=10&search=${encodeURIComponent(String(clientUsername).trim())}`,
                    { headers: getHeaders() }
                );
                if (!response.data.success || cancelled) return;
                const rows = response.data.data || [];
                const match =
                    rows.find((c) => String(c.username) === String(clientUsername).trim()) ||
                    rows[0];
                if (match && !cancelled) {
                    setPresetFromClient(match);
                }
            } catch (err) {
                console.error('Journal preset client fetch:', err);
            } finally {
                if (!cancelled) setLoadingPresetFrom(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [isOpen, clientUsername, hasPresetFromParam]);

    useEffect(() => {
        if (!isOpen) return;
        setFormKey((k) => k + 1);
        setExcludeForFromLookup('');
        setTransactionDate(new Date().toISOString().split('T')[0]);
        setAmount('');
        setLoading(false);
        fromFirmLookup.reset();
        toFirmLookup.reset();
    }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

    const effectiveFromClient = hasPresetFromParam
        ? (presetFromClient || {
            username: clientUsername,
            name: clientName || clientUsername,
            email: '',
            balance: 0,
            mobile: '',
            pan_number: '',
        })
        : fromFirmLookup.selectedFirm;

    const effectiveToClient = toFirmLookup.selectedFirm;

    const fromId = String(effectiveFromClient?.username || '');
    const toId = String(effectiveToClient?.username || '');

    const isJournalFormValid =
        Boolean(effectiveFromClient) &&
        Boolean(effectiveToClient) &&
        fromId !== '' &&
        toId !== '' &&
        fromId !== toId &&
        parseDecimalValue(amount) > 0 &&
        !(hasPresetFromParam && loadingPresetFrom);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!effectiveFromClient || !effectiveToClient) {
            toast.error('Please select both clients');
            return;
        }
        if (fromId === toId) {
            toast.error('Cannot transfer between the same client');
            return;
        }

        const parsedAmount = parseDecimalValue(amount);
        if (!parsedAmount || parsedAmount <= 0) {
            toast.error('Please enter a valid amount');
            return;
        }

        if (hasPresetFromParam && loadingPresetFrom) {
            toast.error('Loading source client…');
            return;
        }

        const fromBal = parseDecimalValue(effectiveFromClient.balance);
        if (parsedAmount > fromBal) {
            toast.error('Insufficient balance in source client ledger');
            return;
        }

        const formData = new FormData(e.target);
        const description = formData.get('description');

        const payload = {
            amount: parsedAmount,
            party1_id: effectiveFromClient.username,
            party2_id: effectiveToClient.username,
            party1_type: 'client',
            party2_type: 'client',
            remark:
                description ||
                `Journal transfer from ${effectiveFromClient.name || effectiveFromClient.username} to ${effectiveToClient.name || effectiveToClient.username}`,
            transaction_date: transactionDate,
        };

        setLoading(true);
        try {
            const response = await axios.post(`${API_BASE_URL}/transaction/payment/journal`, payload, {
                headers: getHeaders(),
            });
            if (response.data.success) {
                toast.success(response.data.message || 'Journal entry created successfully');
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
    };

    const shouldShowJournalSummary =
        showSummary && Boolean(effectiveFromClient) && Boolean(effectiveToClient);

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            title="Journal Transfer (Client to Client)"
            footer={(
                <div className="flex justify-end gap-2">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={loading}
                        className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-500/40 disabled:opacity-50 transition-all duration-200"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        form="journal-form"
                        disabled={loading || !isJournalFormValid || (hasPresetFromParam && loadingPresetFrom)}
                        className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-lg text-sm font-medium hover:from-indigo-700 hover:to-indigo-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 inline-flex items-center justify-center min-w-[150px]"
                    >
                        {loading ? 'Processing…' : hasPresetFromParam && loadingPresetFrom ? 'Loading…' : 'Transfer'}
                    </button>
                </div>
            )}
        >
            <form key={formKey} id="journal-form" onSubmit={handleSubmit} className="space-y-5">
                {shouldShowFromSelector && (
                    <FirmClientSearchFields
                        variant="receive"
                        label="From Client"
                        formatCurrency={formatCurrency}
                        searchTerm={fromFirmLookup.searchTerm}
                        setSearchTerm={fromFirmLookup.setSearchTerm}
                        firms={fromFirmLookup.firms}
                        setFirms={fromFirmLookup.setFirms}
                        showDropdown={fromFirmLookup.showDropdown}
                        setShowDropdown={fromFirmLookup.setShowDropdown}
                        searchLoading={fromFirmLookup.searchLoading}
                        selectedFirm={fromFirmLookup.selectedFirm}
                        setSelectedFirm={fromFirmLookup.setSelectedFirm}
                    />
                )}

                {showFromSection && hasPresetFromParam && effectiveFromClient && (
                    <FirmClientSearchFields
                        variant="receive"
                        label="From Client"
                        lockedFirm={effectiveFromClient}
                        readOnly
                        formatCurrency={formatCurrency}
                    />
                )}

                {shouldShowToSelector && (
                    <FirmClientSearchFields
                        variant="payment"
                        label="To Client"
                        formatCurrency={formatCurrency}
                        searchTerm={toFirmLookup.searchTerm}
                        setSearchTerm={toFirmLookup.setSearchTerm}
                        firms={toFirmLookup.firms}
                        setFirms={toFirmLookup.setFirms}
                        showDropdown={toFirmLookup.showDropdown}
                        setShowDropdown={toFirmLookup.setShowDropdown}
                        searchLoading={toFirmLookup.searchLoading}
                        selectedFirm={toFirmLookup.selectedFirm}
                        setSelectedFirm={toFirmLookup.setSelectedFirm}
                    />
                )}

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Date <span className="text-red-500">*</span>
                        </label>
                        <DatePickerField
                            value={transactionDate}
                            onChange={setTransactionDate}
                            mode="single"
                            hideTabs={true}
                            showResetButton={false}
                            placeholder="Select date"
                            buttonClassName="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Amount <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            name="amount"
                            placeholder="Enter amount"
                            required
                            inputMode="decimal"
                            value={amount}
                            onChange={(e) => setAmount(sanitizeDecimalInput(e.target.value, 2))}
                            className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                        Description / Remark
                    </label>
                    <textarea
                        name="description"
                        placeholder="Enter description or remark"
                        rows="2"
                        className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                </div>

                {shouldShowJournalSummary && (
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                        <p className="text-xs text-slate-600 mb-1">Transaction Summary</p>
                        <div className="flex items-center justify-between text-sm">
                            <span className="font-medium">From Client:</span>
                            <span className="text-red-600 truncate max-w-[55%] text-right">
                                {effectiveFromClient?.name || effectiveFromClient?.username || '—'}
                            </span>
                        </div>
                        <div className="flex items-center justify-between text-sm mt-1">
                            <span className="font-medium">To Client:</span>
                            <span className="text-green-600 truncate max-w-[55%] text-right">
                                {effectiveToClient?.name || effectiveToClient?.username || '—'}
                            </span>
                        </div>
                        <div className="flex items-center justify-between text-sm mt-1">
                            <span className="font-medium">Amount:</span>
                            <span className="text-indigo-600">₹{formatCurrency(parseDecimalValue(amount) || 0)}</span>
                        </div>
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
}) => {
    const [loading, setLoading] = useState(false);
    const [selectedFromBank, setSelectedFromBank] = useState(fromBankDetails || (fromBankId ? { bank_id: fromBankId, bank: 'Selected Bank' } : null));
    const [selectedToBank, setSelectedToBank] = useState(toBankDetails || (toBankId ? { bank_id: toBankId, bank: 'Selected Bank' } : null));
    const [showFromBankSearch, setShowFromBankSearch] = useState(false);
    const [showToBankSearch, setShowToBankSearch] = useState(false);
    const [transactionDate, setTransactionDate] = useState(new Date().toISOString().split('T')[0]);
    const [amount, setAmount] = useState('');
    const [formKey, setFormKey] = useState(0);

    const hasPresetFromBank = Boolean(String(fromBankId || '').trim());
    const hasPresetToBank = Boolean(String(toBankId || '').trim());
    const shouldShowFromBankSelector = showFromBank && !hasPresetFromBank;
    const shouldShowToBankSelector = showToBank && !hasPresetToBank;

    useEffect(() => {
        if (!isOpen) return;
        setFormKey((k) => k + 1);
        setSelectedFromBank(fromBankDetails || (fromBankId ? { bank_id: fromBankId, bank: 'Selected Bank' } : null));
        setSelectedToBank(toBankDetails || (toBankId ? { bank_id: toBankId, bank: 'Selected Bank' } : null));
        setShowFromBankSearch(false);
        setShowToBankSearch(false);
        setTransactionDate(new Date().toISOString().split('T')[0]);
        setAmount('');
        setLoading(false);
    }, [isOpen, fromBankDetails, fromBankId, toBankDetails, toBankId]);

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

    const handleSubmit = async (e) => {
        e.preventDefault();
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

        if (parsedAmount > parseDecimalValue(effectiveFromBank.balance || 0)) {
            toast.error('Insufficient balance in source bank account');
            return;
        }

        const formData = new FormData(e.target);
        const description = formData.get('description');

        const payload = {
            party_1: effectiveFromBank.bank_id,
            party_2: effectiveToBank.bank_id,
            transaction_date: transactionDate,
            amount: parsedAmount,
            remark: description || `Contra transfer from ${effectiveFromBank.bank || 'source bank'} to ${effectiveToBank.bank || 'destination bank'}`,
        };

        setLoading(true);
        try {
            const response = await axios.post(
                `${API_BASE_URL}/contra/create`,
                payload,
                { headers: getHeaders() }
            );
            if (response.data.success) {
                toast.success(response.data.message || 'Contra transfer completed successfully');
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
    };

    const shouldShowContraSummary = showSummary && effectiveFromBank && effectiveToBank;

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            title="Bank Transfer (Contra)"
            footer={(
                <div className="flex justify-end gap-2">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={loading}
                        className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-500/40 disabled:opacity-50 transition-all duration-200"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        form="contra-form"
                        disabled={loading || !isContraFormValid}
                        className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-lg text-sm font-medium hover:from-indigo-700 hover:to-indigo-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 inline-flex items-center justify-center min-w-[150px]"
                    >
                        {loading ? 'Processing...' : 'Transfer Funds'}
                    </button>
                </div>
            )}
        >
            <form key={formKey} id="contra-form" onSubmit={handleSubmit} className="space-y-5">
                {shouldShowFromBankSelector && (
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                            From Bank <span className="text-red-500">*</span>
                        </label>
                        {(!selectedFromBank || showFromBankSearch) ? (
                            <BankSearchDropdown
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
                                formatMoney={formatCurrency}
                            />
                        )}
                    </div>
                )}

                {showFromBank && hasPresetFromBank && effectiveFromBank && (
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">From Bank</label>
                        <SaleBankPreviewCard
                            bank={effectiveFromBank}
                            formatMoney={formatCurrency}
                            readOnly
                        />
                    </div>
                )}

                {shouldShowToBankSelector && (
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                            To Bank <span className="text-red-500">*</span>
                        </label>
                        {(!selectedToBank || showToBankSearch) ? (
                            <BankSearchDropdown
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
                                formatMoney={formatCurrency}
                            />
                        )}
                    </div>
                )}

                {showToBank && hasPresetToBank && effectiveToBank && (
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">To Bank</label>
                        <SaleBankPreviewCard
                            bank={effectiveToBank}
                            formatMoney={formatCurrency}
                            readOnly
                        />
                    </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Date <span className="text-red-500">*</span>
                        </label>
                        <DatePickerField
                            value={transactionDate}
                            onChange={setTransactionDate}
                            mode="single"
                            hideTabs={true}
                            showResetButton={false}
                            placeholder="Select date"
                            buttonClassName="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Amount <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            name="amount"
                            placeholder="Enter amount"
                            required
                            inputMode="decimal"
                            value={amount}
                            onChange={(e) => setAmount(sanitizeDecimalInput(e.target.value, 2))}
                            className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                        Description / Remark
                    </label>
                    <textarea
                        name="description"
                        placeholder="Enter description or remark"
                        rows="2"
                        className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                </div>

                {shouldShowContraSummary && (
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                        <p className="text-xs text-slate-600 mb-1">Transaction Summary</p>
                        {showFromBank && (
                            <div className="flex items-center justify-between text-sm">
                                <span className="font-medium">From Bank:</span>
                                <span className="text-red-600">{effectiveFromBank?.bank || `Bank #${effectiveFromBank?.bank_id || ''}`}</span>
                            </div>
                        )}
                        <div className={`flex items-center justify-between text-sm ${showFromBank ? 'mt-1' : ''}`}>
                            <span className="font-medium">To Bank:</span>
                            <span className="text-green-600">{effectiveToBank?.bank || `Bank #${effectiveToBank?.bank_id || ''}`}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm mt-1">
                            <span className="font-medium">Amount:</span>
                            <span className="text-indigo-600">₹{formatCurrency(parseDecimalValue(amount) || 0)}</span>
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
        default:
            return null;
    }
};

export default TransactionModalManager;
