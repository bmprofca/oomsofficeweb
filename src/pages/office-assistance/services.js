import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    FiPlus, FiEdit, FiTrash2, FiX, FiSearch,
    FiAlertTriangle, FiCheck, FiRefreshCw, FiLayers,
    FiEye, FiMenu,
    FiBriefcase,
} from 'react-icons/fi';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { Header, Sidebar } from '../../components/header';
import getHeaders from '../../utils/get-headers';
import API_BASE_URL from '../../utils/api-controller';
import TablePagination from '../../components/TablePagination';
import { useUserPermissions } from '../../utils/permission-helper';
import SelectInput from '../../components/SelectInput';
import { ViewportTooltip } from '../../components/ViewportTooltip';

/* ─── helpers ─────────────────────────────────────────────────────── */
const fmt = (n) =>
    Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const calcGST = (fees, rate) => {
    const f = parseFloat(fees) || 0;
    const r = parseFloat(rate) || 0;
    return (f * r / 100).toFixed(2);
};
const isValidAmountInput = (value) => /^\d*(\.\d{0,2})?$/.test(value);
const isApiSuccess = (payload) => {
    const statusValue = String(payload?.status ?? '').toLowerCase();
    return (
        payload?.success === true ||
        statusValue === 'success' ||
        statusValue === 'true' ||
        statusValue === '200'
    );
};
const apiMessage = (payload, fallback) => payload?.message || fallback;

const isComplianceService = (svc) => String(svc?.type || '').toLowerCase() === 'compliance';

const GST_RATE_OPTIONS = [
    { value: 0, label: '0%' },
    { value: 5, label: '5%' },
    { value: 12, label: '12%' },
    { value: 18, label: '18%' },
    { value: 28, label: '28%' },
];

const SERVICE_CATEGORIES = [
    { id: 'compliance', label: 'Compliance' },
    { id: 'general', label: 'General' },
];

const FREQ_BADGE_COLORS = {
    monthly: 'bg-blue-50 text-blue-700 border-blue-200',
    quarterly: 'bg-violet-50 text-violet-700 border-violet-200',
    'half-yearly': 'bg-amber-50 text-amber-700 border-amber-200',
    halfyearly: 'bg-amber-50 text-amber-700 border-amber-200',
    yearly: 'bg-teal-50 text-teal-700 border-teal-200',
    annual: 'bg-teal-50 text-teal-700 border-teal-200',
    'one-time': 'bg-gray-100 text-slate-600 border-gray-200',
};

const frequencyBadge = (frequency) => {
    if (!frequency) return null;
    const key = String(frequency).toLowerCase();
    const cls = FREQ_BADGE_COLORS[key] || 'bg-gray-100 text-slate-600 border-gray-200';
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold border uppercase tracking-wide ${cls}`}>
            {frequency}
        </span>
    );
};

const getServiceRemark = (svc) => svc.remark || svc.service_remark || '';

const isServiceOnBranch = (svc) => {
    if (svc && 'is_added' in svc) return svc.is_added === true || svc.is_added === 1 || svc.is_added === '1';
    if (svc && 'added_to_branch' in svc) {
        return svc.added_to_branch === true || svc.added_to_branch === 1 || svc.added_to_branch === '1';
    }
    return false;
};

const CellDash = () => <span className="text-xs text-slate-400">—</span>;

const BranchAddedBadge = ({ svc }) =>
    isServiceOnBranch(svc) ? (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200">
            <FiCheck className="w-3 h-3" /> Added to branch
        </span>
    ) : (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 text-slate-500 border border-gray-200">
            Not added
        </span>
    );

/* ─── badge helpers ─────────────────────────────────────────────── */
const TYPE_COLORS = {
    gst: 'bg-blue-100 text-blue-700 border-blue-200',
    itr: 'bg-violet-100 text-violet-700 border-violet-200',
    audit: 'bg-amber-100 text-amber-700 border-amber-200',
    compliance: 'bg-teal-100 text-teal-700 border-teal-200',
    registration: 'bg-orange-100 text-orange-700 border-orange-200',
    other: 'bg-gray-100 text-slate-600 border-gray-200',
};
const typeBadge = (type) => {
    const t = (type || 'other').toLowerCase();
    const cls = TYPE_COLORS[t] || TYPE_COLORS.other;
    const label = t === 'compliance' ? 'recurring task' : t;
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border ${cls} uppercase tracking-wide`}>
            {label}
        </span>
    );
};

/* ─── skeleton row ──────────────────────────────────────────────── */
const SkeletonRow = ({ cols }) => (
    <tr className="animate-pulse">
        {Array.from({ length: cols }).map((_, i) => (
            <td key={i} className="px-4 py-3">
                <div className="h-3.5 bg-gray-200 rounded-full" style={{ width: `${60 + (i % 3) * 20}px` }} />
            </td>
        ))}
    </tr>
);

/* ─── 3-dot action menu (portal · viewport-aware) ──────────────── */
const ActionMenu = ({ items }) => {
    const [open, setOpen] = useState(false);
    const [pos, setPos] = useState({ top: 0, left: 0 });
    const btnRef = useRef(null);
    const menuRef = useRef(null);

    const calcPos = useCallback(() => {
        const btn = btnRef.current;
        if (!btn) return;
        const r = btn.getBoundingClientRect();
        const mH = menuRef.current?.offsetHeight || 120;
        const mW = menuRef.current?.offsetWidth || 144;
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const GAP = 4;
        const PAD = 6;
        /* prefer below the button, flip to above if no room */
        const top = (r.bottom + GAP + mH <= vh - PAD)
            ? r.bottom + GAP
            : r.top - mH - GAP;
        /* right-align to button, clamp inside viewport */
        const left = Math.min(Math.max(PAD, r.right - mW), vw - PAD - mW);
        setPos({
            top: Math.min(Math.max(PAD, top), vh - PAD - mH),
            left,
        });
    }, []);

    /* recalculate once the portal has actually mounted */
    useEffect(() => {
        if (!open) return;
        const raf = requestAnimationFrame(() => calcPos());
        return () => cancelAnimationFrame(raf);
    }, [open, calcPos]);

    /* outside-click · scroll · resize · Escape */
    useEffect(() => {
        if (!open) return;
        const onDown = (e) => {
            if (!btnRef.current?.contains(e.target) && !menuRef.current?.contains(e.target))
                setOpen(false);
        };
        const onClose = () => setOpen(false);
        const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
        document.addEventListener('mousedown', onDown);
        window.addEventListener('scroll', onClose, true);
        window.addEventListener('resize', calcPos);
        window.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('mousedown', onDown);
            window.removeEventListener('scroll', onClose, true);
            window.removeEventListener('resize', calcPos);
            window.removeEventListener('keydown', onKey);
        };
    }, [open, calcPos]);

    return (
        <>
            <ViewportTooltip label="Actions">
                <button
                    ref={btnRef}
                    onClick={(e) => { e.stopPropagation(); setOpen(v => !v); }}
                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                    <FiMenu className="w-3.5 h-3.5" />
                </button>
            </ViewportTooltip>

            {createPortal(
                <AnimatePresence>
                    {open && (
                        <motion.div
                            ref={menuRef}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.1 }}
                            style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 9999 }}
                            className="w-36 bg-white border border-gray-200 rounded-xl shadow-xl py-1 overflow-hidden"
                        >
                            {items.map((item) => (
                                <button
                                    key={item.label}
                                    onClick={(e) => { e.stopPropagation(); item.onClick(); setOpen(false); }}
                                    className={`w-full text-left px-3 py-2 text-xs flex items-center gap-2 transition-colors ${item.danger
                                        ? 'text-red-600 hover:bg-red-50'
                                        : 'text-slate-700 hover:bg-gray-50'
                                        }`}
                                >
                                    {item.icon}
                                    {item.label}
                                </button>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>,
                document.body
            )}
        </>
    );
};

/* ─── fee form ──────────────────────────────────────────────────── */
const FeeForm = ({ form, onChange, loading, showDueDate = false }) => {
    const gstValue = calcGST(form.fees, form.gst_rate);
    const total = ((parseFloat(form.fees) || 0) + parseFloat(gstValue)).toFixed(2);
    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Fees (₹) *</label>
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">₹</span>
                        <input
                            type="text"
                            inputMode="decimal"
                            value={form.fees}
                            onChange={(e) => {
                                const next = e.target.value.trim();
                                if (next === '' || isValidAmountInput(next)) {
                                    onChange('fees', next);
                                }
                            }}
                            disabled={loading}
                            className="w-full pl-7 pr-3 py-2.5 text-sm text-slate-700 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none disabled:opacity-60"
                            placeholder="0.00"
                        />
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">GST Rate *</label>
                    <SelectInput
                        options={GST_RATE_OPTIONS}
                        value={form.gst_rate !== null && form.gst_rate !== '' ? Number(form.gst_rate) : null}
                        onChange={(val) => onChange('gst_rate', val)}
                        placeholder="Select rate…"
                        disabled={loading}
                        clearable={false}
                    />
                </div>
            </div>

            {/* Live preview */}
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5">
                    <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-0.5">GST Value</p>
                    <p className="text-sm font-semibold text-slate-800">₹ {fmt(gstValue)}</p>
                </div>
                <div className="bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-2.5">
                    <p className="text-[10px] font-semibold text-indigo-500 uppercase tracking-wide mb-0.5">Total</p>
                    <p className="text-sm font-semibold text-indigo-700">₹ {fmt(total)}</p>
                </div>
            </div>

            {showDueDate ? (
                <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Due Date (day of month) *</label>
                    <input
                        type="number"
                        min="1"
                        max="31"
                        value={form.due_date ?? ''}
                        onChange={(e) => onChange('due_date', e.target.value)}
                        disabled={loading}
                        placeholder="e.g. 10"
                        className="w-full px-3 py-2.5 text-sm text-slate-700 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none disabled:opacity-60"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">Day of the month when this recurring task is due (1–31).</p>
                </div>
            ) : null}

            {!showDueDate ? (
                <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Remark</label>
                    <textarea
                        value={form.remark}
                        onChange={(e) => onChange('remark', e.target.value)}
                        disabled={loading}
                        rows={2}
                        className="w-full px-3 py-2.5 text-sm text-slate-700 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none disabled:opacity-60"
                        placeholder="Optional note…"
                    />
                </div>
            ) : null}
        </div>
    );
};

/* ─── modal shell ────────────────────────────────────────────────── */
const Modal = ({ title, subtitle, icon, onClose, children, footer }) => (
    <div
        className="fixed inset-0 bg-black/50 flex items-start justify-center p-3 sm:p-4 z-[200] backdrop-blur-sm overflow-y-auto"
        onClick={onClose}
    >
        <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 12 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg my-2 sm:my-4 max-h-[calc(100vh-1.5rem)] sm:max-h-[calc(100vh-2rem)] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
        >
            {/* header */}
            <div className="shrink-0 flex items-center justify-between gap-3 px-5 py-3.5 bg-gradient-to-r from-indigo-600 to-violet-600">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center text-white shrink-0">
                        {icon}
                    </div>
                    <div className="min-w-0">
                        <h3 className="text-sm font-semibold text-white leading-tight">{title}</h3>
                        {subtitle && <p className="text-xs text-indigo-200 leading-tight mt-0.5 truncate">{subtitle}</p>}
                    </div>
                </div>
                <ViewportTooltip label="Close">
                    <button onClick={onClose} className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors shrink-0">
                        <FiX className="w-4 h-4" />
                    </button>
                </ViewportTooltip>
            </div>
            {/* scrollable body */}
            <div className="flex-1 overflow-y-auto px-5 py-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                {children}
            </div>
            {/* footer */}
            {footer && (
                <div className="shrink-0 px-5 py-3 border-t border-gray-100 bg-gray-50">
                    {footer}
                </div>
            )}
        </motion.div>
    </div>
);

/* ─── confirm dialog ────────────────────────────────────────────── */
const ConfirmModal = ({ title, message, onConfirm, onCancel, loading }) => (
    <div
        className="fixed inset-0 bg-black/50 flex items-start justify-center p-3 sm:p-4 z-[210] backdrop-blur-sm overflow-y-auto"
        onClick={onCancel}
    >
        <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm my-2 sm:my-4 max-h-[calc(100vh-1.5rem)] sm:max-h-[calc(100vh-2rem)] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
        >
            <div className="flex-1 overflow-y-auto px-5 py-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-3">
                    <FiAlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <h4 className="text-center text-sm font-semibold text-slate-800 mb-1">{title}</h4>
                <p className="text-center text-xs text-slate-500">{message}</p>
            </div>
            <div className="shrink-0 px-5 py-3 border-t border-gray-100 bg-gray-50 flex gap-2">
                <button onClick={onCancel} disabled={loading}
                    className="flex-1 px-4 py-2 text-sm font-medium text-slate-700 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50">
                    Cancel
                </button>
                <button onClick={onConfirm} disabled={loading}
                    className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-1.5">
                    {loading && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                    Remove
                </button>
            </div>
        </motion.div>
    </div>
);

/* ─── view details modal ────────────────────────────────────────── */
const ViewModal = ({ svc, onClose }) => {
    const onBranch = isServiceOnBranch(svc);
    const hasFees = onBranch && svc.fees !== undefined && svc.fees !== null;
    return (
        <Modal title="Service Details" icon={<FiEye className="w-4 h-4" />} onClose={onClose}
            footer={
                <div className="flex justify-end">
                    <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors">
                        Close
                    </button>
                </div>
            }
        >
            <div className="mb-4 p-3 bg-indigo-50 border border-indigo-100 rounded-xl">
                <h4 className="text-sm font-bold text-indigo-900 leading-snug">{svc.name}</h4>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                    {typeBadge(svc.type)}
                    {svc.sac_code && (
                        <span className="text-[11px] font-mono text-indigo-600 bg-indigo-100 px-1.5 py-0.5 rounded">{svc.sac_code}</span>
                    )}
                    <BranchAddedBadge svc={svc} />
                    {svc.frequency && frequencyBadge(svc.frequency)}
                </div>
            </div>

            {!onBranch && isComplianceService(svc) && (svc.frequency || svc.default_due_date != null) && (
                <div className="grid grid-cols-2 gap-3 mb-4">
                    {svc.frequency && (
                        <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5">
                            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-0.5">Frequency</p>
                            <p className="text-sm font-bold text-slate-800 capitalize">{svc.frequency}</p>
                        </div>
                    )}
                    {svc.default_due_date != null && (
                        <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5">
                            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-0.5">Default Due Day</p>
                            <p className="text-sm font-bold text-slate-800">Day {svc.default_due_date}</p>
                        </div>
                    )}
                </div>
            )}

            {hasFees && (
                <div className="grid grid-cols-2 gap-3 mb-4">
                    {[
                        { label: 'Fees', value: `₹ ${fmt(svc.fees)}`, cls: 'bg-gray-50 border-gray-200' },
                        { label: 'GST Rate', value: `${svc.gst_rate ?? 0}%`, cls: 'bg-gray-50 border-gray-200' },
                        { label: 'GST Value', value: `₹ ${fmt(svc.gst_value)}`, cls: 'bg-amber-50 border-amber-100' },
                        { label: 'Total', value: `₹ ${fmt((parseFloat(svc.fees) || 0) + (parseFloat(svc.gst_value) || 0))}`, cls: 'bg-indigo-50 border-indigo-100' },
                    ].map(({ label, value, cls }) => (
                        <div key={label} className={`${cls} border rounded-lg px-3 py-2.5`}>
                            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-0.5">{label}</p>
                            <p className="text-sm font-bold text-slate-800">{value}</p>
                        </div>
                    ))}
                </div>
            )}

            {onBranch && isComplianceService(svc) && svc.due_date != null && (
                <div className="mb-4 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5">
                    <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-0.5">Branch Due Day</p>
                    <p className="text-sm font-bold text-slate-800">Day {svc.due_date}</p>
                </div>
            )}

            {getServiceRemark(svc) && (
                <div className="mb-4">
                    <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Remark</p>
                    <p className="text-xs text-slate-700 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2.5 leading-relaxed">{getServiceRemark(svc)}</p>
                </div>
            )}

            {(svc.modify_by?.name || svc.modify_date) && (
                <div className="pt-3 border-t border-gray-100">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Last Modified</p>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                        {svc.modify_by?.name && <span className="font-medium text-slate-700">{svc.modify_by.name}</span>}
                        {svc.modify_date && (
                            <span>{new Date(svc.modify_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                        )}
                    </div>
                </div>
            )}
        </Modal>
    );
};

/* ─── empty state ───────────────────────────────────────────────── */
const EmptyState = ({ icon, title, desc }) => (
    <tr>
        <td colSpan={99}>
            <div className="flex flex-col items-center justify-center py-14 text-slate-400">
                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">{icon}</div>
                <p className="text-sm font-medium text-slate-600">{title}</p>
                <p className="text-xs mt-0.5">{desc}</p>
            </div>
        </td>
    </tr>
);

/* ═══════════════════════════════════════════════════════════════════ */
const Services = () => {
    const { check } = useUserPermissions();
    const navigate = useNavigate();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(() => {
        try { return JSON.parse(localStorage.getItem('sidebarMinimized')) || false; } catch { return false; }
    });

    useEffect(() => { localStorage.setItem('sidebarMinimized', JSON.stringify(isMinimized)); }, [isMinimized]);
    useEffect(() => {
        document.body.style.overflow = mobileMenuOpen ? 'hidden' : 'auto';
        return () => { document.body.style.overflow = 'auto'; };
    }, [mobileMenuOpen]);

    /* ── tabs ── */
    const [serviceCategory, setServiceCategory] = useState('compliance');

    /* ── staff mapping ── */
    const [staffMap, setStaffMap] = useState({});

    const fetchStaff = useCallback(async () => {
        const base = API_BASE_URL.replace(/\/$/, '');
        let page = 1;
        const limit = 100;
        const map = {};
        try {
            for (; ;) {
                const res = await axios.get(`${base}/settings/staff/list`, {
                    headers: getHeaders(),
                    params: { search: '', page, limit }
                });
                const list = res.data?.data || [];
                list.forEach(item => {
                    if (item.username) {
                        map[item.username] = item.profile?.name ?? item.username;
                    }
                });
                if (res.data?.meta?.is_last_page || list.length < limit) break;
                page += 1;
            }
            setStaffMap(map);
        } catch (err) {
            console.error('Failed to fetch staff list:', err);
        }
    }, []);

    useEffect(() => {
        fetchStaff();
    }, [fetchStaff]);

    const getStaffNames = useCallback((employee_username) => {
        if (!employee_username) return '—';
        const usernames = typeof employee_username === 'string'
            ? employee_username.split(',').map(u => u.trim())
            : (Array.isArray(employee_username) ? employee_username : [employee_username]);
        const names = usernames.map(u => staffMap[u] || u);
        return names.join(', ');
    }, [staffMap]);

    /* ── firms list view ── */
    const [viewMode, setViewMode] = useState('list'); // 'list' | 'firms'
    const [selectedServiceForFirms, setSelectedServiceForFirms] = useState(null);
    const [firmsList, setFirmsList] = useState([]);
    const [firmsLoading, setFirmsLoading] = useState(false);
    const [firmsSearch, setFirmsSearch] = useState('');
    const [firmsPage, setFirmsPage] = useState(1);
    const [firmsLimit, setFirmsLimit] = useState(20);
    const [firmsTotal, setFirmsTotal] = useState(0);
    const [firmsTotalPages, setFirmsTotalPages] = useState(1);

    const fetchFirmsForService = useCallback(async (serviceId, search = '', page = 1, limit = 20) => {
        setFirmsLoading(true);
        try {
            const res = await axios.get(`${API_BASE_URL}/service/firms`, {
                headers: getHeaders(),
                params: { service_id: serviceId, search, page, limit }
            });
            if (res.data?.success) {
                setFirmsList(res.data.data || []);
                setFirmsTotal(res.data.pagination?.total ?? 0);
                setFirmsTotalPages(res.data.pagination?.total_pages ?? 1);
            } else {
                toast.error(res.data?.message || 'Failed to fetch assigned firms');
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Error loading assigned firms');
        } finally {
            setFirmsLoading(false);
        }
    }, []);

    const firmsTimer = useRef(null);

    useEffect(() => {
        if (viewMode !== 'firms' || !selectedServiceForFirms) return;
        clearTimeout(firmsTimer.current);
        firmsTimer.current = setTimeout(() => {
            setFirmsPage(1);
            fetchFirmsForService(selectedServiceForFirms.service_id, firmsSearch, 1, firmsLimit);
        }, 400);
        return () => clearTimeout(firmsTimer.current);
    }, [firmsSearch, viewMode, selectedServiceForFirms, firmsLimit, fetchFirmsForService]);

    const handleViewFirms = (svc) => {
        setSelectedServiceForFirms(svc);
        setFirmsSearch('');
        setFirmsPage(1);
        setViewMode('firms');
        fetchFirmsForService(svc.service_id, '', 1, firmsLimit);
    };

    /* ── branch services list ── */
    const [serviceList, setServiceList] = useState([]);
    const [serviceLoading, setServiceLoading] = useState(false);
    const [serviceSearch, setServiceSearch] = useState('');
    const [servicePage, setServicePage] = useState(1);
    const [serviceLimit, setServiceLimit] = useState(20);
    const [serviceTotal, setServiceTotal] = useState(0);
    const [serviceTotalPages, setServiceTotalPages] = useState(1);

    /* ── modals ── */
    const [viewTarget, setViewTarget] = useState(null);  // { svc, isBranch }
    const [editTarget, setEditTarget] = useState(null);
    const [editForm, setEditForm] = useState({ fees: '', gst_rate: null, remark: '', due_date: '' });
    const [editLoading, setEditLoading] = useState(false);

    const [removeTarget, setRemoveTarget] = useState(null);
    const [removeLoading, setRemoveLoading] = useState(false);

    const [addTarget, setAddTarget] = useState(null);
    const [addForm, setAddForm] = useState({ fees: '', gst_rate: null, due_date: '', remark: '' });
    const [addLoading, setAddLoading] = useState(false);

    const serviceTimer = useRef(null);

    /* ─── fetch (server-side pagination) ────────────────────────── */
    const fetchServiceList = useCallback(async ({
        search = '',
        page = 1,
        limit = 20,
        type = 'compliance',
    } = {}) => {
        setServiceLoading(true);
        try {
            const res = await axios.get(`${API_BASE_URL}/service/list`, {
                headers: getHeaders(),
                params: { search, page_no: page, limit, type },
            });
            if (res.data?.success) {
                const pagination = res.data.pagination || {};
                setServiceList(res.data.data || []);
                setServiceTotal(pagination.total ?? res.data.total ?? 0);
                setServiceTotalPages(pagination.total_pages ?? res.data.total_pages ?? 1);
            } else {
                toast.error(res.data?.message || 'Failed to fetch services');
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Error loading services');
        } finally { setServiceLoading(false); }
    }, []);

    const refreshServiceList = useCallback((search = serviceSearch, page = servicePage, limit = serviceLimit) => {
        fetchServiceList({ search, page, limit, type: serviceCategory });
    }, [fetchServiceList, serviceCategory, serviceSearch, servicePage, serviceLimit]);

    useEffect(() => {
        if (viewMode !== 'list') return;
        setServicePage(1);
        fetchServiceList({ search: serviceSearch, page: 1, limit: serviceLimit, type: serviceCategory });
    }, [serviceCategory, viewMode]); // eslint-disable-line

    useEffect(() => {
        if (viewMode !== 'list') return;
        clearTimeout(serviceTimer.current);
        serviceTimer.current = setTimeout(() => {
            setServicePage(1);
            fetchServiceList({ search: serviceSearch, page: 1, limit: serviceLimit, type: serviceCategory });
        }, 400);
        return () => clearTimeout(serviceTimer.current);
    }, [serviceSearch, serviceCategory, viewMode]); // eslint-disable-line

    /* ─── edit ───────────────────────────────────────────────────── */
    const openEdit = (svc) => {
        setEditTarget(svc);
        setEditForm({
            fees: String(svc.fees ?? ''),
            gst_rate: svc.gst_rate !== undefined && svc.gst_rate !== null ? Number(svc.gst_rate) : null,
            remark: getServiceRemark(svc),
            due_date: svc.due_date != null ? String(svc.due_date) : '',
        });
    };

    const handleEdit = async () => {
        const isCompliance = isComplianceService(editTarget);
        const fees = parseFloat(editForm.fees);
        const gst_rate = editForm.gst_rate;

        if (editForm.fees !== '' && (isNaN(fees) || fees < 0)) {
            toast.error('Enter a valid fees amount');
            return;
        }
        if (gst_rate === null) { toast.error('Select a GST rate'); return; }

        const payload = {
            service_id: editTarget.service_id,
            ...(editForm.fees !== '' ? { fees } : {}),
            gst_rate: Number(gst_rate),
        };

        if (isCompliance) {
            const due_date = parseInt(editForm.due_date, 10);
            if (editForm.due_date === '' || isNaN(due_date) || due_date < 1 || due_date > 31) {
                toast.error('Due date must be between 1 and 31');
                return;
            }
            payload.due_date = due_date;
        } else {
            payload.remark = editForm.remark?.trim() || null;
        }

        setEditLoading(true);
        try {
            const res = await axios.put(`${API_BASE_URL}/service/edit`, payload, { headers: getHeaders() });
            if (isApiSuccess(res.data)) {
                toast.success(apiMessage(res.data, 'Service updated'));
                setEditTarget(null);
                refreshServiceList();
            } else {
                toast.error(apiMessage(res.data, 'Update failed'));
            }
        } catch (err) { toast.error(apiMessage(err.response?.data, 'Error updating service')); }
        finally { setEditLoading(false); }
    };

    /* ─── remove ─────────────────────────────────────────────────── */
    const handleRemove = async () => {
        if (!removeTarget) return;
        if (Number(removeTarget.firm_count || 0) > 0) {
            toast.error('Cannot remove service. Active clients are assigned to it.');
            setRemoveTarget(null);
            return;
        }
        setRemoveLoading(true);
        try {
            const res = await axios.delete(`${API_BASE_URL}/service/remove`, {
                headers: getHeaders(),
                data: { service_id: removeTarget.service_id },
            });
            if (isApiSuccess(res.data)) {
                toast.success(apiMessage(res.data, 'Service removed from branch'));
                setRemoveTarget(null);
                refreshServiceList();
            } else toast.error(apiMessage(res.data, 'Remove failed'));
        } catch (err) { toast.error(apiMessage(err.response?.data, 'Error removing service')); }
        finally { setRemoveLoading(false); }
    };

    const openAdd = (svc) => {
        const isCompliance = isComplianceService(svc);
        setAddTarget(svc);
        setAddForm({
            fees: '',
            gst_rate: 18,
            due_date: isCompliance && svc.default_due_date != null ? String(svc.default_due_date) : '',
            remark: '',
        });
    };

    const handleAdd = async () => {
        const isCompliance = isComplianceService(addTarget);
        const fees = parseFloat(addForm.fees);
        const gst_rate = addForm.gst_rate;

        if (addForm.fees !== '' && (isNaN(fees) || fees < 0)) {
            toast.error('Enter a valid fees amount');
            return;
        }
        if (gst_rate === null) { toast.error('Select a GST rate'); return; }

        const payload = {
            service_id: addTarget.service_id,
            ...(addForm.fees !== '' ? { fees } : {}),
            gst_rate: Number(gst_rate),
        };

        if (isCompliance) {
            if (addForm.due_date !== '') {
                const due_date = parseInt(addForm.due_date, 10);
                if (isNaN(due_date) || due_date < 1 || due_date > 31) {
                    toast.error('Due date must be between 1 and 31');
                    return;
                }
                payload.due_date = due_date;
            }
        } else if (addForm.remark?.trim()) {
            payload.remark = addForm.remark.trim();
        }

        setAddLoading(true);
        try {
            const res = await axios.post(`${API_BASE_URL}/service/add`, payload, { headers: getHeaders() });
            if (isApiSuccess(res.data)) {
                toast.success(apiMessage(res.data, 'Service added to branch'));
                setAddTarget(null);
                refreshServiceList();
            } else toast.error(apiMessage(res.data, 'Add failed'));
        } catch (err) { toast.error(apiMessage(err.response?.data, 'Error adding service')); }
        finally { setAddLoading(false); }
    };

    const parsedAddFees = parseFloat(addForm.fees);
    const isComplianceAdd = addTarget && isComplianceService(addTarget);
    const feesValid = addForm.fees === '' || (isValidAmountInput(addForm.fees) && !isNaN(parsedAddFees) && parsedAddFees >= 0);
    const dueDateValid = !isComplianceAdd || addForm.due_date === '' || (
        !isNaN(parseInt(addForm.due_date, 10)) &&
        parseInt(addForm.due_date, 10) >= 1 &&
        parseInt(addForm.due_date, 10) <= 31
    );
    const isAddFormValid =
        !!addTarget &&
        addForm.gst_rate !== null &&
        feesValid &&
        dueDateValid;

    /* ═════════════════════════════════════════════════════════════════ */
    return (
        <div className="min-h-screen bg-gray-50">
            <Header mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} isMinimized={isMinimized} setIsMinimized={setIsMinimized} />
            <Sidebar mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} isMinimized={isMinimized} setIsMinimized={setIsMinimized} />

            <div className={`pt-16 transition-all duration-300 ease-in-out ${isMinimized ? 'md:pl-20' : 'md:pl-[260px]'}`}>
                <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">

                    {/* page header */}
                    <div className="mb-5 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center">
                                <FiLayers className="w-4 h-4 text-indigo-600" />
                            </div>
                            <div>
                                {viewMode === 'firms' ? (
                                    <>
                                        <h1 className="text-lg font-bold text-slate-800 leading-tight">Assigned Firms</h1>
                                        <p className="text-xs text-slate-500">Firms assigned to {selectedServiceForFirms?.name}</p>
                                    </>
                                ) : (
                                    <>
                                        <h1 className="text-lg font-bold text-slate-800 leading-tight">Branch Services</h1>
                                        <p className="text-xs text-slate-500">Manage services enabled for this branch</p>
                                    </>
                                )}
                            </div>
                        </div>
                        {viewMode === 'firms' && (
                            <button
                                onClick={() => setViewMode('list')}
                                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-lg transition-colors shadow-sm"
                            >
                                <FiX className="w-3.5 h-3.5" /> Back to Services
                            </button>
                        )}
                    </div>

                    {/* main card */}
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">

                        {viewMode === 'firms' ? (
                            <div>
                                <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 bg-gray-50/50">
                                    <div className="relative flex-1 max-w-xs">
                                        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                                        <input type="text" placeholder="Search assigned firms…" value={firmsSearch}
                                            onChange={(e) => setFirmsSearch(e.target.value)}
                                            className="w-full pl-9 pr-3 py-2 text-sm text-slate-705 border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none placeholder:text-slate-400"
                                        />
                                    </div>
                                    <ViewportTooltip label="Refresh">
                                        <button onClick={() => fetchFirmsForService(selectedServiceForFirms.service_id, firmsSearch, firmsPage, firmsLimit)}
                                            className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-white rounded-lg transition-colors border border-gray-200 bg-white">
                                            <FiRefreshCw className={`w-3.5 h-3.5 ${firmsLoading ? 'animate-spin' : ''}`} />
                                        </button>
                                    </ViewportTooltip>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm table-fixed min-w-[950px]">
                                        <thead>
                                            <tr className="bg-gray-50 border-b border-gray-100">
                                                <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap w-12">#</th>
                                                <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap w-[24%]">Firm Name</th>
                                                <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap w-28">Firm Type</th>
                                                <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap w-40">GSTIN / PAN</th>
                                                <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap w-48">Client Details</th>
                                                <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap w-48">Assignment Details</th>
                                                <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap w-24">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50 bg-white">
                                            {firmsLoading
                                                ? Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} cols={7} />)
                                                : firmsList.length === 0
                                                    ? <EmptyState icon={<FiBriefcase className="w-5 h-5 text-slate-400" />} title="No assigned firms found" desc="No firms are currently assigned to this service." />
                                                    : firmsList.map((firm, idx) => (
                                                        <motion.tr key={firm.firm_id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                                            className="hover:bg-indigo-50/30 transition-colors group">
                                                            <td className="px-4 py-3 text-xs text-slate-400 font-medium w-10">
                                                                {(firmsPage - 1) * firmsLimit + idx + 1}
                                                            </td>
                                                            <td className="px-4 py-3 max-w-[220px]">
                                                                <button
                                                                    onClick={() => navigate(`/client/profile/${firm.client?.username}/firms`)}
                                                                    className="font-bold text-indigo-600 hover:text-indigo-800 hover:underline text-xs text-left leading-snug break-words"
                                                                >
                                                                    {firm.firm_name}
                                                                </button>
                                                            </td>
                                                            <td className="px-4 py-3 text-xs text-slate-605 font-medium">
                                                                {firm.firm_type || '—'}
                                                            </td>
                                                            <td className="px-4 py-3 text-xs text-slate-600">
                                                                <p className="font-semibold text-slate-700">{firm.gst_no || '—'}</p>
                                                                <p className="text-[11px] text-slate-400 font-mono mt-0.5">{firm.pan_no || '—'}</p>
                                                            </td>
                                                            <td className="px-4 py-3 text-xs text-slate-600">
                                                                <p className="font-bold text-slate-700">{firm.client?.name || '—'}</p>
                                                                <p className="text-[11px] text-slate-505 mt-0.5">{firm.client?.mobile || '—'}</p>
                                                                <p className="text-[10px] text-slate-400 mt-0.5 truncate max-w-[180px]">{firm.client?.email || '—'}</p>
                                                            </td>
                                                            <td className="px-4 py-3 text-xs text-slate-600">
                                                                <p className={`font-semibold text-slate-700 ${!check('recurring_task_fees_view') ? 'blur-[3.5px] select-none' : ''}`}>
                                                                    Fees: {check('recurring_task_fees_view') ? `₹${fmt(firm.assignment?.custom_amount)}` : '₹••••'}
                                                                </p>
                                                                <p className="text-[11px] text-slate-555 mt-0.5">Pay Month: {firm.assignment?.pay_from_month || firm.assignment?.period_name || '—'}</p>
                                                                <p className="text-[10px] text-slate-400 mt-0.5">Staff: {getStaffNames(firm.assignment?.employee_username)}</p>
                                                            </td>
                                                            <td className="px-4 py-3">
                                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${String(firm.assignment?.status).toLowerCase() === 'active'
                                                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                                    : 'bg-rose-50 text-rose-700 border-rose-200'
                                                                    }`}>
                                                                    {firm.assignment?.status || 'inactive'}
                                                                </span>
                                                            </td>
                                                        </motion.tr>
                                                    ))
                                            }
                                        </tbody>
                                    </table>
                                </div>

                                <div className="border-t border-gray-100 px-4 py-2">
                                    <TablePagination
                                        page={firmsPage} limit={firmsLimit} total={firmsTotal}
                                        totalPages={firmsTotalPages} isLastPage={firmsPage >= firmsTotalPages}
                                        onPageChange={(p) => { setFirmsPage(p); fetchFirmsForService(selectedServiceForFirms.service_id, firmsSearch, p, firmsLimit); }}
                                        onLimitChange={(l) => { setFirmsLimit(l); setFirmsPage(1); fetchFirmsForService(selectedServiceForFirms.service_id, firmsSearch, 1, l); }}
                                        rowOptions={[5, 10, 20, 50, 100]}
                                        showRange showRows showJump showFirstLast
                                    />
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="flex border-b border-gray-100 px-4 pt-3 gap-1">
                                    {SERVICE_CATEGORIES.map((tab) => (
                                        <button
                                            key={tab.id}
                                            type="button"
                                            onClick={() => {
                                                setServiceCategory(tab.id);
                                                setServicePage(1);
                                            }}
                                            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-t-lg border-b-2 transition-all -mb-px ${serviceCategory === tab.id
                                                ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50'
                                                : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-gray-50'
                                                }`}
                                        >
                                            {tab.label}
                                        </button>
                                    ))}
                                </div>

                                <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
                                    <div className="relative flex-1 max-w-xs">
                                        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                                        <input
                                            type="text"
                                            placeholder={`Search ${serviceCategory} services…`}
                                            value={serviceSearch}
                                            onChange={(e) => setServiceSearch(e.target.value)}
                                            className="w-full pl-9 pr-3 py-2 text-sm text-slate-700 border border-gray-200 rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none placeholder:text-slate-400"
                                        />
                                    </div>
                                    <ViewportTooltip label="Refresh">
                                        <button
                                            onClick={() => refreshServiceList()}
                                            className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors border border-gray-200"
                                        >
                                            <FiRefreshCw className={`w-3.5 h-3.5 ${serviceLoading ? 'animate-spin' : ''}`} />
                                        </button>
                                    </ViewportTooltip>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm table-fixed min-w-[850px]">
                                        <thead>
                                            <tr className="bg-gray-50 border-b border-gray-100">
                                                <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap w-12">#</th>
                                                <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap w-[24%]">Service</th>
                                                <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap w-32">Branch</th>
                                                <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap w-24">Fees</th>
                                                <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap w-24">GST</th>
                                                {serviceCategory === 'compliance' && (
                                                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap w-24">Frequency</th>
                                                )}
                                                {serviceCategory === 'compliance' && (
                                                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap w-20">Due Day</th>
                                                )}
                                                {serviceCategory === 'compliance' && (
                                                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap w-20">Firms</th>
                                                )}
                                                <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap w-32">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {serviceLoading
                                                ? Array.from({ length: 6 }).map((_, i) => (
                                                    <SkeletonRow key={i} cols={serviceCategory === 'compliance' ? 9 : 6} />
                                                ))
                                                : serviceList.length === 0
                                                    ? <EmptyState icon={<FiLayers className="w-5 h-5 text-slate-400" />} title="No services found" desc={serviceSearch ? 'No match found.' : 'No services are enabled for this branch yet.'} />
                                                    : serviceList.map((svc, idx) => {
                                                        const onBranch = isServiceOnBranch(svc);
                                                        return (
                                                            <motion.tr key={svc.service_id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                                                className={`transition-colors group ${onBranch ? 'hover:bg-indigo-50/30' : 'hover:bg-slate-50/80'}`}>
                                                                <td className="px-4 py-3 text-xs text-slate-400 font-medium w-10">
                                                                    {(servicePage - 1) * serviceLimit + idx + 1}
                                                                </td>
                                                                <td className="px-4 py-3 max-w-[200px]">
                                                                    <ViewportTooltip label={svc.name} fullWidth>
                                                                        <p className="font-semibold text-slate-800 text-xs leading-snug truncate">{svc.name}</p>
                                                                    </ViewportTooltip>
                                                                    {svc.sac_code && (
                                                                        <span className="text-[11px] font-mono text-slate-400 bg-gray-100 px-1 py-0.5 rounded mt-0.5 inline-block">{svc.sac_code}</span>
                                                                    )}
                                                                </td>
                                                                <td className="px-4 py-3">
                                                                    <BranchAddedBadge svc={svc} />
                                                                </td>
                                                                <td className="px-4 py-3">
                                                                    {onBranch && svc.fees != null
                                                                        ? <span className="text-xs font-semibold text-slate-800">₹{fmt(svc.fees)}</span>
                                                                        : <CellDash />}
                                                                </td>
                                                                <td className="px-4 py-3">
                                                                    {onBranch && svc.gst_rate != null ? (
                                                                        <>
                                                                            <p className="text-xs text-slate-600">{svc.gst_rate}%</p>
                                                                            <p className="text-[11px] text-slate-400">₹{fmt(svc.gst_value)}</p>
                                                                        </>
                                                                    ) : <CellDash />}
                                                                </td>
                                                                {serviceCategory === 'compliance' && (
                                                                    <td className="px-4 py-3">
                                                                        {frequencyBadge(svc.frequency) || <CellDash />}
                                                                    </td>
                                                                )}
                                                                {serviceCategory === 'compliance' && (
                                                                    <td className="px-4 py-3 text-xs">
                                                                        {onBranch && svc.due_date != null ? (
                                                                            <span className="text-slate-600">Day {svc.due_date}</span>
                                                                        ) : !onBranch && svc.default_due_date != null ? (
                                                                            <span className="text-slate-400" title="Default due day">Day {svc.default_due_date} <span className="text-[10px]">(default)</span></span>
                                                                        ) : <CellDash />}
                                                                    </td>
                                                                )}
                                                                {serviceCategory === 'compliance' && (
                                                                    <td className="px-4 py-3">
                                                                        {onBranch ? (
                                                                            <button
                                                                                onClick={() => handleViewFirms(svc)}
                                                                                className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 hover:scale-105 transition-all"
                                                                                title="Click to view assigned firms"
                                                                            >
                                                                                {svc.firm_count ?? 0}
                                                                            </button>
                                                                        ) : <CellDash />}
                                                                    </td>
                                                                )}
                                                                <td className="px-4 py-3">
                                                                    {onBranch ? (
                                                                        <ActionMenu items={[
                                                                            { label: 'View', icon: <FiEye className="w-3.5 h-3.5" />, onClick: () => setViewTarget({ svc }) },
                                                                            { label: 'Edit', icon: <FiEdit className="w-3.5 h-3.5" />, onClick: () => openEdit(svc) },
                                                                            { label: 'Remove', icon: <FiTrash2 className="w-3.5 h-3.5" />, onClick: () => setRemoveTarget(svc), danger: true },
                                                                        ]} />
                                                                    ) : (
                                                                        <ActionMenu items={[
                                                                            { label: 'View', icon: <FiEye className="w-3.5 h-3.5" />, onClick: () => setViewTarget({ svc }) },
                                                                            { label: 'Add to Branch', icon: <FiPlus className="w-3.5 h-3.5" />, onClick: () => openAdd(svc) },
                                                                        ]} />
                                                                    )}
                                                                </td>
                                                            </motion.tr>
                                                        );
                                                    })
                                            }
                                        </tbody>
                                    </table>
                                </div>

                                <div className="border-t border-gray-100 px-4 py-2">
                                    <TablePagination
                                        page={servicePage}
                                        limit={serviceLimit}
                                        total={serviceTotal}
                                        totalPages={serviceTotalPages}
                                        isLastPage={servicePage >= serviceTotalPages}
                                        onPageChange={(p) => {
                                            setServicePage(p);
                                            fetchServiceList({ search: serviceSearch, page: p, limit: serviceLimit, type: serviceCategory });
                                        }}
                                        onLimitChange={(l) => {
                                            setServiceLimit(l);
                                            setServicePage(1);
                                            fetchServiceList({ search: serviceSearch, page: 1, limit: l, type: serviceCategory });
                                        }}
                                        rowOptions={[5, 10, 20, 50, 100]}
                                        showRange showRows showJump showFirstLast
                                    />
                                </div>
                            </>
                        )}

                    </div>
                </div>
            </div>

            {/* ── VIEW MODAL ── */}
            <AnimatePresence>
                {viewTarget && (
                    <ViewModal svc={viewTarget.svc} onClose={() => setViewTarget(null)} />
                )}
            </AnimatePresence>

            {/* ── EDIT MODAL ── */}
            <AnimatePresence>
                {editTarget && (
                    <Modal title="Edit Service" subtitle={editTarget.name} icon={<FiEdit className="w-4 h-4" />}
                        onClose={() => !editLoading && setEditTarget(null)}
                        footer={
                            <div className="flex justify-end gap-2">
                                <button onClick={() => setEditTarget(null)} disabled={editLoading}
                                    className="px-4 py-2 text-sm font-medium text-slate-600 border border-gray-200 rounded-lg hover:bg-gray-100 disabled:opacity-50 transition-colors">
                                    Cancel
                                </button>
                                <button onClick={handleEdit} disabled={editLoading}
                                    className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg disabled:opacity-50 transition-colors inline-flex items-center gap-1.5">
                                    {editLoading && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                                    Save Changes
                                </button>
                            </div>
                        }
                    >
                        <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg mb-4">
                            <p className="text-xs font-semibold text-slate-800 truncate">{editTarget.name}</p>
                            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                {typeBadge(editTarget.type)}
                                {editTarget.sac_code && <span className="text-[11px] font-mono text-slate-500 bg-gray-100 px-1.5 py-0.5 rounded">{editTarget.sac_code}</span>}
                            </div>
                        </div>
                        <FeeForm
                            form={editForm}
                            onChange={(k, v) => setEditForm(f => ({ ...f, [k]: v }))}
                            loading={editLoading}
                            showDueDate={isComplianceService(editTarget)}
                        />
                    </Modal>
                )}
            </AnimatePresence>

            {/* ── ADD MODAL ── */}
            <AnimatePresence>
                {addTarget && (
                    <Modal title="Add to Branch" icon={<FiPlus className="w-4 h-4" />}
                        onClose={() => !addLoading && setAddTarget(null)}
                        footer={
                            <div className="flex justify-end gap-2">
                                <button onClick={() => setAddTarget(null)} disabled={addLoading}
                                    className="px-4 py-2 text-sm font-medium text-slate-600 border border-gray-200 rounded-lg hover:bg-gray-100 disabled:opacity-50 transition-colors">
                                    Cancel
                                </button>
                                <button onClick={handleAdd} disabled={addLoading || !isAddFormValid}
                                    className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg disabled:opacity-50 transition-colors inline-flex items-center gap-1.5">
                                    {addLoading && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                                    <FiPlus className="w-3.5 h-3.5" />
                                    Add to Branch
                                </button>
                            </div>
                        }
                    >
                        <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg mb-4">
                            <p className="text-xs font-semibold text-indigo-900 truncate">{addTarget.name}</p>
                            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                {typeBadge(addTarget.type)}
                                {addTarget.sac_code && <span className="text-[11px] font-mono text-indigo-600 bg-indigo-100 px-1.5 py-0.5 rounded">{addTarget.sac_code}</span>}
                                {addTarget.frequency && frequencyBadge(addTarget.frequency)}
                            </div>
                            {getServiceRemark(addTarget) && (
                                <p className="text-[11px] text-indigo-700/80 mt-2 leading-relaxed">{getServiceRemark(addTarget)}</p>
                            )}
                        </div>
                        <FeeForm
                            form={addForm}
                            onChange={(k, v) => setAddForm(f => ({ ...f, [k]: v }))}
                            loading={addLoading}
                            showDueDate={isComplianceAdd}
                        />
                    </Modal>
                )}
            </AnimatePresence>

            {/* ── REMOVE CONFIRM ── */}
            <AnimatePresence>
                {removeTarget && (
                    <ConfirmModal
                        title="Remove Service"
                        message={`Remove "${removeTarget.name}" from this branch? This won't delete the global service.`}
                        onConfirm={handleRemove}
                        onCancel={() => !removeLoading && setRemoveTarget(null)}
                        loading={removeLoading}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

export default Services;
