import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    FiPlus, FiEdit, FiTrash2, FiX, FiSearch,
    FiAlertTriangle, FiCheck, FiRefreshCw, FiLayers,
    FiCheckCircle, FiFileText, FiMoreVertical, FiEye, FiRepeat, FiMenu, FiInfo,
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

const getDueDayLabel = (frequency) => {
    const f = String(frequency || '').toLowerCase();
    switch (f) {
        case 'monthly':
            return 'Due In Month (Day) *';
        case 'quarterly':
            return 'Due Day after Quarter *';
        case 'half-yearly':
        case 'halfyearly':
            return 'Due Day after Half Year *';
        case 'yearly':
        case 'annual':
        case 'annually':
            return 'Due Day after Year *';
        default:
            return 'Due Day *';
    }
};

const GST_RATE_OPTIONS = [
    { value: 0, label: '0%' },
    { value: 5, label: '5%' },
    { value: 12, label: '12%' },
    { value: 18, label: '18%' },
    { value: 28, label: '28%' },
];

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
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border ${cls} uppercase tracking-wide`}>
            {t}
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
const FeeForm = ({ form, onChange, loading }) => {
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
const ViewModal = ({ svc, onClose, isBranch }) => {
    const hasFees = isBranch && svc.fees !== undefined;
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
            {/* name block */}
            <div className="mb-4 p-3 bg-indigo-50 border border-indigo-100 rounded-xl">
                <h4 className="text-sm font-bold text-indigo-900 leading-snug">{svc.name}</h4>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                    {typeBadge(svc.type)}
                    {svc.sac_code && (
                        <span className="text-[11px] font-mono text-indigo-600 bg-indigo-100 px-1.5 py-0.5 rounded">{svc.sac_code}</span>
                    )}
                    {svc.added_to_branch !== undefined && (
                        svc.added_to_branch
                            ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200">
                                <FiCheck className="w-3 h-3" /> Added
                            </span>
                            : <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 text-slate-500 border border-gray-200">Not added</span>
                    )}
                </div>
            </div>

            {/* fee details (branch only) */}
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

            {/* remark */}
            {svc.remark && (
                <div className="mb-4">
                    <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Remark</p>
                    <p className="text-xs text-slate-700 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2.5 leading-relaxed">{svc.remark}</p>
                </div>
            )}

            {/* modified info */}
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
    const [activeTab, setActiveTab] = useState('branch');

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

    /* ── recurring task templates ── */
    const [rtList, setRtList] = useState([]);
    const [rtLoading, setRtLoading] = useState(false);
    const [rtSearch, setRtSearch] = useState('');
    const [rtShowModal, setRtShowModal] = useState(false);
    const [rtEditTarget, setRtEditTarget] = useState(null); // null = add mode, object = edit mode
    const [rtForm, setRtForm] = useState({
        service_id: '',
        name: '',
        frequency: 'monthly',
        default_amount: '',
        due_day: '',
        q1_due_day: '',
        q2_due_day: '',
        q3_due_day: '',
        q4_due_day: '',
        h1_due_day: '',
        h2_due_day: '',
        status: 'Active',
        template_type: 'Custom / New Service',
        required_fields: []
    });
    const [rtSubmitting, setRtSubmitting] = useState(false);
    const [rtDeleteTarget, setRtDeleteTarget] = useState(null);
    const [rtDeleting, setRtDeleting] = useState(false);
    const [rtAssignments, setRtAssignments] = useState([]);

    const fetchRtAssignments = useCallback(async () => {
        try {
            const res = await axios.get(`${API_BASE_URL}/recurring-task/assignments`, { headers: getHeaders() });
            if (res.data?.success) {
                setRtAssignments(res.data.data || []);
            }
        } catch (err) {
            console.error('Failed to load assignments:', err);
        }
    }, []);

    const fetchRt = useCallback(async () => {
        setRtLoading(true);
        try {
            const res = await axios.get(`${API_BASE_URL}/recurring-task/services`, { headers: getHeaders() });
            const data = res.data?.data || res.data || [];
            setRtList(Array.isArray(data) ? data : []);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to load recurring task templates');
        } finally { setRtLoading(false); }
    }, []);

    useEffect(() => {
        if (activeTab === 'recurring') {
            fetchRt();
            fetchRtAssignments();
        }
    }, [activeTab, fetchRt, fetchRtAssignments]);

    const openRtModal = (svc = null) => {
        setRtEditTarget(svc);
        const resolvedTemplateType = svc
            ? ((svc.name === 'Professional Tax' || svc.name === 'GSTR-1 Filing') ? svc.name : 'Custom / New Service')
            : 'Custom / New Service';

        setRtForm(svc
            ? {
                service_id: svc.service_id || '',
                name: svc.name || '',
                frequency: svc.frequency || 'monthly',
                default_amount: String(svc.default_amount ?? ''),
                due_day: String(svc.due_day ?? ''),
                q1_due_day: String(svc.q1_due_day ?? ''),
                q2_due_day: String(svc.q2_due_day ?? ''),
                q3_due_day: String(svc.q3_due_day ?? ''),
                q4_due_day: String(svc.q4_due_day ?? ''),
                h1_due_day: String(svc.h1_due_day ?? ''),
                h2_due_day: String(svc.h2_due_day ?? ''),
                status: svc.status || 'Active',
                template_type: resolvedTemplateType,
                required_fields: svc.required_fields || []
            }
            : {
                service_id: '',
                name: '',
                frequency: 'monthly',
                default_amount: '',
                due_day: '',
                q1_due_day: '',
                q2_due_day: '',
                q3_due_day: '',
                q4_due_day: '',
                h1_due_day: '',
                h2_due_day: '',
                status: 'Active',
                template_type: 'Custom / New Service',
                required_fields: []
            }
        );
        setRtShowModal(true);
    };

    const handleRtSubmit = async () => {
        const finalName = rtForm.name.trim();

        if (!finalName) { toast.error('Service name is required'); return; }
        if (!rtForm.default_amount) { toast.error('Default fee is required'); return; }

        if (rtForm.frequency === 'quarterly') {
            const qFields = ['q1_due_day', 'q2_due_day', 'q3_due_day', 'q4_due_day'];
            for (const f of qFields) {
                if (rtForm[f]) {
                    const val = parseInt(rtForm[f]);
                    if (isNaN(val) || val < 1 || val > 31) {
                        toast.error(`${f.toUpperCase().replace('_', ' ')} must be between 1 and 31`);
                        return;
                    }
                }
            }
        } else if (rtForm.frequency === 'half-yearly') {
            const hFields = ['h1_due_day', 'h2_due_day'];
            for (const f of hFields) {
                if (rtForm[f]) {
                    const val = parseInt(rtForm[f]);
                    if (isNaN(val) || val < 1 || val > 31) {
                        toast.error(`${f.toUpperCase().replace('_', ' ')} must be between 1 and 31`);
                        return;
                    }
                }
            }
        }

        // Validate custom fields schema
        if (rtForm.required_fields?.length > 0) {
            for (const field of rtForm.required_fields) {
                if (!field.label?.trim()) { toast.error('Field Label is required for all custom fields'); return; }
                if (!field.key?.trim()) { toast.error('Field Key is required for all custom fields'); return; }
                if (!/^[a-z0-9_]+$/.test(field.key)) {
                    toast.error(`Field Key "${field.key}" must be alphanumeric with underscores only`);
                    return;
                }
            }
            const keys = rtForm.required_fields.map(f => f.key);
            if (new Set(keys).size !== keys.length) {
                toast.error('All Custom Field Keys must be unique');
                return;
            }
        }

        if (rtEditTarget) {
            const templateId = rtEditTarget.service_id || rtEditTarget.id;
            const hasAssignments = rtAssignments.some(assign => String(assign.service_id) === String(templateId));
            if (hasAssignments) {
                if (rtForm.frequency !== rtEditTarget.frequency) {
                    toast.error('Cannot change frequency of template with active assignments.');
                    return;
                }
                if (rtForm.status === 'Inactive' && rtEditTarget.status === 'Active') {
                    toast.error('Cannot deactivate template with active assignments.');
                    return;
                }
            }
        }

        setRtSubmitting(true);
        try {
            const payload = {
                name: finalName,
                frequency: rtForm.frequency,
                default_amount: parseFloat(rtForm.default_amount),
                due_day: rtForm.due_day ? parseInt(rtForm.due_day) : null,
                status: rtForm.status,
                template_type: rtForm.template_type || 'Custom / New Service',
                required_fields: rtForm.required_fields || []
            };
            if (rtForm.frequency === 'quarterly') {
                payload.q1_due_day = rtForm.q1_due_day ? parseInt(rtForm.q1_due_day) : null;
                payload.q2_due_day = rtForm.q2_due_day ? parseInt(rtForm.q2_due_day) : null;
                payload.q3_due_day = rtForm.q3_due_day ? parseInt(rtForm.q3_due_day) : null;
                payload.q4_due_day = rtForm.q4_due_day ? parseInt(rtForm.q4_due_day) : null;
            } else if (rtForm.frequency === 'half-yearly') {
                payload.h1_due_day = rtForm.h1_due_day ? parseInt(rtForm.h1_due_day) : null;
                payload.h2_due_day = rtForm.h2_due_day ? parseInt(rtForm.h2_due_day) : null;
            }

            if (rtForm.service_id) {
                payload.service_id = rtForm.service_id;
            }
            let res;
            if (rtEditTarget) {
                res = await axios.put(`${API_BASE_URL}/recurring-task/services/${rtEditTarget.service_id || rtEditTarget.id}`, payload, { headers: getHeaders() });
            } else {
                res = await axios.post(`${API_BASE_URL}/recurring-task/services`, payload, { headers: getHeaders() });
            }
            if (res.data?.success !== false) {
                toast.success(rtEditTarget ? 'Template updated' : 'Template created');
                setRtShowModal(false);
                fetchRt();
            } else {
                toast.error(res.data?.message || 'Operation failed');
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Error saving template');
        } finally { setRtSubmitting(false); }
    };

    const handleRtDelete = async () => {
        if (!rtDeleteTarget) return;
        const templateId = rtDeleteTarget.service_id || rtDeleteTarget.id;
        const hasAssignments = rtAssignments.some(assign => String(assign.service_id) === String(templateId));
        if (hasAssignments) {
            toast.error('Cannot delete template. Active clients are assigned to it.');
            setRtDeleteTarget(null);
            return;
        }
        setRtDeleting(true);
        try {
            await axios.delete(`${API_BASE_URL}/recurring-task/services/${templateId}`, { headers: getHeaders() });
            toast.success('Template deleted');
            setRtDeleteTarget(null);
            fetchRt();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Error deleting template');
        } finally { setRtDeleting(false); }
    };

    const handleToggleRtStatus = async (svc) => {
        const nextStatus = svc.status === 'Active' ? 'Inactive' : 'Active';
        if (svc.status === 'Active') {
            const hasAssignments = rtAssignments.some(assign => String(assign.service_id) === String(svc.service_id || svc.id));
            if (hasAssignments) {
                toast.error('Cannot deactivate recurring task. Active clients are assigned to it.');
                return;
            }
        }
        const toastId = toast.loading(`Toggling status to ${nextStatus}...`);
        try {
            const payload = {
                name: svc.name,
                frequency: svc.frequency,
                default_amount: parseFloat(svc.default_amount),
                due_day: svc.due_day ? parseInt(svc.due_day) : null,
                status: nextStatus
            };
            if (svc.frequency === 'quarterly') {
                payload.q1_due_day = svc.q1_due_day ? parseInt(svc.q1_due_day) : null;
                payload.q2_due_day = svc.q2_due_day ? parseInt(svc.q2_due_day) : null;
                payload.q3_due_day = svc.q3_due_day ? parseInt(svc.q3_due_day) : null;
                payload.q4_due_day = svc.q4_due_day ? parseInt(svc.q4_due_day) : null;
            } else if (svc.frequency === 'half-yearly') {
                payload.h1_due_day = svc.h1_due_day ? parseInt(svc.h1_due_day) : null;
                payload.h2_due_day = svc.h2_due_day ? parseInt(svc.h2_due_day) : null;
            }

            const res = await axios.put(`${API_BASE_URL}/recurring-task/services/${svc.service_id || svc.id}`, payload, { headers: getHeaders() });
            if (res.data?.success !== false) {
                toast.success(`Service status updated to ${nextStatus}`, { id: toastId });
                fetchRt();
            } else {
                toast.error(res.data?.message || 'Failed to update status', { id: toastId });
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Error updating status', { id: toastId });
        }
    };

    const filteredRtList = rtList.filter(s =>
        !rtSearch || (s.name || '').toLowerCase().includes(rtSearch.toLowerCase()) || (s.service_id || '').toLowerCase().includes(rtSearch.toLowerCase())
    );

    const FREQ_BADGE_COLORS = {
        monthly: 'bg-indigo-100 text-indigo-700 border-indigo-200',
        quarterly: 'bg-violet-100 text-violet-700 border-violet-200',
        yearly: 'bg-teal-100 text-teal-700 border-teal-200',
        annual: 'bg-teal-100 text-teal-700 border-teal-200',
        'half-yearly': 'bg-amber-100 text-amber-700 border-amber-200',
    };

    /* ── branch services ── */
    const [branchList, setBranchList] = useState([]);
    const [branchLoading, setBranchLoading] = useState(false);
    const [branchSearch, setBranchSearch] = useState('');
    const [branchPage, setBranchPage] = useState(1);
    const [branchLimit, setBranchLimit] = useState(20);
    const [branchTotal, setBranchTotal] = useState(0);
    const [branchTotalPages, setBranchTotalPages] = useState(1);

    /* ── all global services ── */
    const [allList, setAllList] = useState([]);
    const [allLoading, setAllLoading] = useState(false);
    const [allSearch, setAllSearch] = useState('');
    const [allPage, setAllPage] = useState(1);
    const [allLimit, setAllLimit] = useState(20);
    const [allTotal, setAllTotal] = useState(0);
    const [allTotalPages, setAllTotalPages] = useState(1);

    /* ── modals ── */
    const [viewTarget, setViewTarget] = useState(null);  // { svc, isBranch }
    const [editTarget, setEditTarget] = useState(null);
    const [editForm, setEditForm] = useState({ fees: '', gst_rate: null, remark: '' });
    const [editLoading, setEditLoading] = useState(false);

    const [addTarget, setAddTarget] = useState(null);
    const [addForm, setAddForm] = useState({ fees: '', gst_rate: null, remark: '' });
    const [addLoading, setAddLoading] = useState(false);

    const [removeTarget, setRemoveTarget] = useState(null);
    const [removeLoading, setRemoveLoading] = useState(false);

    const [customServiceShowModal, setCustomServiceShowModal] = useState(false);
    const [customServiceForm, setCustomServiceForm] = useState({ service_id: '', name: '', type: 'other', sac_code: '', fees: '', gst_rate: null, remark: '' });
    const [customServiceSubmitting, setCustomServiceSubmitting] = useState(false);

    const openCustomServiceModal = () => {
        setCustomServiceForm({ service_id: '', name: '', type: 'other', sac_code: '', fees: '', gst_rate: 18, remark: '' });
        setCustomServiceShowModal(true);
    };

    const handleCustomServiceSubmit = async () => {
        if (!customServiceForm.name.trim()) { toast.error('Service name is required'); return; }
        const fees = parseFloat(customServiceForm.fees);
        if (isNaN(fees) || fees < 0) { toast.error('Enter a valid fees amount'); return; }
        if (customServiceForm.gst_rate === null) { toast.error('Select a GST rate'); return; }

        setCustomServiceSubmitting(true);
        try {
            const payload = {
                name: customServiceForm.name.trim(),
                type: customServiceForm.type,
                fees,
                gst_rate: Number(customServiceForm.gst_rate)
            };
            if (customServiceForm.service_id.trim()) {
                payload.service_id = customServiceForm.service_id.trim();
            }
            if (customServiceForm.sac_code.trim()) {
                payload.sac_code = customServiceForm.sac_code.trim();
            }
            if (customServiceForm.remark.trim()) {
                payload.remark = customServiceForm.remark.trim();
            }

            const res = await axios.post(`${API_BASE_URL}/service/create`, payload, { headers: getHeaders() });
            if (res.data?.success) {
                toast.success('Custom service created and enabled successfully');
                setCustomServiceShowModal(false);
                fetchBranch(branchSearch, branchPage, branchLimit);
                fetchAll(allSearch, allPage, allLimit);
            } else {
                toast.error(res.data?.message || 'Failed to create custom service');
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Error creating custom service');
        } finally {
            setCustomServiceSubmitting(false);
        }
    };

    const branchTimer = useRef(null);
    const allTimer = useRef(null);

    /* ─── fetch (server-side pagination) ────────────────────────── */
    const fetchBranch = useCallback(async (search = '', page = 1, limit = 20) => {
        setBranchLoading(true);
        try {
            const res = await axios.get(`${API_BASE_URL}/service/list`, {
                headers: getHeaders(),
                params: { search, page_no: page, limit },
            });
            if (res.data?.success) {
                setBranchList(res.data.data || []);
                setBranchTotal(res.data.total ?? 0);
                setBranchTotalPages(res.data.total_pages ?? 1);
            } else {
                toast.error(res.data?.message || 'Failed to fetch branch services');
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Error loading branch services');
        } finally { setBranchLoading(false); }
    }, []);

    const fetchAll = useCallback(async (search = '', page = 1, limit = 20) => {
        setAllLoading(true);
        try {
            const res = await axios.get(`${API_BASE_URL}/service/all`, {
                headers: getHeaders(),
                params: { search, page_no: page, limit },
            });
            if (res.data?.success) {
                setAllList(res.data.data || []);
                setAllTotal(res.data.total ?? 0);
                setAllTotalPages(res.data.total_pages ?? 1);
            } else {
                toast.error(res.data?.message || 'Failed to fetch services');
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Error loading services');
        } finally { setAllLoading(false); }
    }, []);

    /* initial load on tab switch */
    useEffect(() => { if (activeTab === 'branch') fetchBranch('', 1, branchLimit); }, [activeTab]); // eslint-disable-line
    useEffect(() => { if (activeTab === 'all') fetchAll('', 1, allLimit); }, [activeTab]); // eslint-disable-line

    /* debounced search — resets to page 1 */
    useEffect(() => {
        clearTimeout(branchTimer.current);
        branchTimer.current = setTimeout(() => {
            setBranchPage(1);
            fetchBranch(branchSearch, 1, branchLimit);
        }, 400);
        return () => clearTimeout(branchTimer.current);
    }, [branchSearch, fetchBranch]); // eslint-disable-line

    useEffect(() => {
        clearTimeout(allTimer.current);
        allTimer.current = setTimeout(() => {
            setAllPage(1);
            fetchAll(allSearch, 1, allLimit);
        }, 400);
        return () => clearTimeout(allTimer.current);
    }, [allSearch, fetchAll]); // eslint-disable-line

    /* ─── edit ───────────────────────────────────────────────────── */
    const openEdit = (svc) => {
        setEditTarget(svc);
        setEditForm({ fees: String(svc.fees ?? ''), gst_rate: svc.gst_rate !== undefined ? Number(svc.gst_rate) : null, remark: svc.remark || '' });
    };
    const handleEdit = async () => {
        const fees = parseFloat(editForm.fees);
        const gst_rate = editForm.gst_rate;
        if (isNaN(fees) || fees < 0) { toast.error('Enter a valid fees amount'); return; }
        if (gst_rate === null) { toast.error('Select a GST rate'); return; }
        setEditLoading(true);
        try {
            const res = await axios.put(`${API_BASE_URL}/service/edit`,
                { service_id: editTarget.service_id, fees, gst_rate, remark: editForm.remark },
                { headers: getHeaders() });
            if (isApiSuccess(res.data)) {
                toast.success(apiMessage(res.data, 'Service updated'));
                setEditTarget(null);
                fetchBranch(branchSearch, branchPage, branchLimit);
            } else {
                toast.error(apiMessage(res.data, 'Update failed'));
            }
        } catch (err) { toast.error(apiMessage(err.response?.data, 'Error updating service')); }
        finally { setEditLoading(false); }
    };

    const handleToggleServiceStatus = async (svc) => {
        const currentStatus = String(svc.status || 'Active').toLowerCase();
        const isCurrentInactive = currentStatus === 'inactive' || !svc.added_to_branch;
        const nextStatus = isCurrentInactive ? 'Active' : 'Inactive';
        const toastId = toast.loading(`Toggling status to ${nextStatus}...`);
        try {
            const res = await axios.put(`${API_BASE_URL}/service/status`, {
                service_id: svc.service_id,
                status: nextStatus
            }, { headers: getHeaders() });

            if (res.data?.success) {
                toast.success(`Service status updated to ${nextStatus}`, { id: toastId });
                fetchBranch(branchSearch, branchPage, branchLimit);
                fetchAll(allSearch, allPage, allLimit);
            } else {
                toast.error(res.data?.message || 'Failed to update status', { id: toastId });
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Error updating status', { id: toastId });
        }
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
            const res = await axios.delete(`${API_BASE_URL}/service/remove`,
                { headers: getHeaders(), data: { service_id: removeTarget.service_id } });
            if (isApiSuccess(res.data)) {
                toast.success(apiMessage(res.data, 'Service removed from branch'));
                setRemoveTarget(null);
                fetchBranch(branchSearch, branchPage, branchLimit);
                fetchAll(allSearch, allPage, allLimit);
            } else toast.error(apiMessage(res.data, 'Remove failed'));
        } catch (err) { toast.error(apiMessage(err.response?.data, 'Error removing service')); }
        finally { setRemoveLoading(false); }
    };

    /* ─── add ────────────────────────────────────────────────────── */
    const openAdd = (svc) => { setAddTarget(svc); setAddForm({ fees: '', gst_rate: null, remark: '' }); };
    const handleAdd = async () => {
        const fees = parseFloat(addForm.fees);
        const gst_rate = addForm.gst_rate;
        if (isNaN(fees) || fees < 0) { toast.error('Enter a valid fees amount'); return; }
        if (gst_rate === null) { toast.error('Select a GST rate'); return; }
        setAddLoading(true);
        try {
            const res = await axios.post(`${API_BASE_URL}/service/add`,
                { service_id: addTarget.service_id, fees, gst_rate, remark: addForm.remark },
                { headers: getHeaders() });
            if (isApiSuccess(res.data)) {
                toast.success(apiMessage(res.data, 'Service added to branch'));
                setAddTarget(null);
                fetchAll(allSearch, allPage, allLimit);
                fetchBranch(branchSearch, branchPage, branchLimit);
            } else toast.error(apiMessage(res.data, 'Add failed'));
        } catch (err) { toast.error(apiMessage(err.response?.data, 'Error adding service')); }
        finally { setAddLoading(false); }
    };
    const parsedAddFees = parseFloat(addForm.fees);
    const isAddFormValid =
        !!addTarget &&
        addForm.gst_rate !== null &&
        addForm.fees !== '' &&
        isValidAmountInput(addForm.fees) &&
        !isNaN(parsedAddFees) &&
        parsedAddFees >= 0;

    const isEditMode = rtEditTarget !== null;
    const selectedTemplateId = rtEditTarget?.service_id || rtEditTarget?.id;
    const modalHasAssignments = isEditMode && rtAssignments.some(assign => String(assign.service_id) === String(selectedTemplateId));

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
                                                                <p className="font-semibold text-slate-700">Fees: ₹{fmt(firm.assignment?.custom_amount)}</p>
                                                                <p className="text-[11px] text-slate-505 mt-0.5">Pay Month: {firm.assignment?.pay_from_month || firm.assignment?.period_name || '—'}</p>
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
                                {/* tabs */}
                                <div className="flex border-b border-gray-100 px-4 pt-3 gap-1">
                                    {[
                                        { id: 'branch', label: 'Active Services', icon: <FiCheckCircle className="w-3.5 h-3.5" /> },
                                        { id: 'all', label: 'All Services', icon: <FiPlus className="w-3.5 h-3.5" /> },
                                        { id: 'recurring', label: 'Recurring Task Templates', icon: <FiRepeat className="w-3.5 h-3.5" /> },
                                    ].map((tab) => (
                                        <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                                            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-t-lg border-b-2 transition-all -mb-px ${activeTab === tab.id
                                                ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50'
                                                : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-gray-50'
                                                }`}
                                        >
                                            {tab.icon}{tab.label}
                                        </button>
                                    ))}
                                </div>

                                {/* ── BRANCH SERVICES TAB ── */}
                                {activeTab === 'branch' && (
                                    <div>
                                        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
                                            <div className="relative flex-1 max-w-xs">
                                                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                                                <input type="text" placeholder="Search branch services…" value={branchSearch}
                                                    onChange={(e) => setBranchSearch(e.target.value)}
                                                    className="w-full pl-9 pr-3 py-2 text-sm text-slate-700 border border-gray-200 rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none placeholder:text-slate-400"
                                                />
                                            </div>
                                            <ViewportTooltip label="Refresh">
                                                <button onClick={() => fetchBranch(branchSearch)}
                                                    className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors border border-gray-200">
                                                    <FiRefreshCw className={`w-3.5 h-3.5 ${branchLoading ? 'animate-spin' : ''}`} />
                                                </button>
                                            </ViewportTooltip>
                                            <button onClick={openCustomServiceModal}
                                                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors">
                                                <FiPlus className="w-3.5 h-3.5" /> Custom Service
                                            </button>
                                        </div>

                                        <div className="overflow-x-auto">
                                            <table className="w-full text-sm table-fixed min-w-[1000px]">
                                                <thead>
                                                    <tr className="bg-gray-50 border-b border-gray-100">
                                                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap w-12">#</th>
                                                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap w-[28%]">Service</th>
                                                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap w-28">Type</th>
                                                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap w-24">Fees</th>
                                                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap w-24">GST</th>
                                                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap w-20">Firms</th>
                                                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap w-24">Pending</th>
                                                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap w-24">Complete</th>
                                                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap w-24">Cancel</th>
                                                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap w-32">Action</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-50">
                                                    {branchLoading
                                                        ? Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} cols={10} />)
                                                        : branchList.length === 0
                                                            ? <EmptyState icon={<FiLayers className="w-5 h-5 text-slate-400" />} title="No branch services" desc={branchSearch ? 'No match found.' : 'Go to "Add Services" to enable services.'} />
                                                            : branchList.map((svc, idx) => (
                                                                <motion.tr key={svc.service_id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                                                    className="hover:bg-indigo-50/30 transition-colors group">
                                                                    <td className="px-4 py-3 text-xs text-slate-400 font-medium w-10">
                                                                        {(branchPage - 1) * branchLimit + idx + 1}
                                                                    </td>
                                                                    <td className="px-4 py-3 max-w-[200px]">
                                                                        <ViewportTooltip label={svc.name} fullWidth>
                                                                            <p className="font-semibold text-slate-800 text-xs leading-snug truncate">{svc.name}</p>
                                                                        </ViewportTooltip>
                                                                        {svc.sac_code && (
                                                                            <span className="text-[11px] font-mono text-slate-400 bg-gray-100 px-1 py-0.5 rounded mt-0.5 inline-block">{svc.sac_code}</span>
                                                                        )}
                                                                    </td>
                                                                    <td className="px-4 py-3">{typeBadge(svc.type)}</td>
                                                                    <td className="px-4 py-3">
                                                                        <span className="text-xs font-semibold text-slate-800">₹{fmt(svc.fees)}</span>
                                                                    </td>
                                                                    <td className="px-4 py-3">
                                                                        <p className="text-xs text-slate-600">{svc.gst_rate ?? 0}%</p>
                                                                        <p className="text-[11px] text-slate-400">₹{fmt(svc.gst_value)}</p>
                                                                    </td>
                                                                    <td className="px-4 py-3">
                                                                        <button
                                                                            onClick={() => handleViewFirms(svc)}
                                                                            className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 hover:scale-105 transition-all"
                                                                            title="Click to view assigned firms"
                                                                        >
                                                                            {svc.firm_count ?? 0}
                                                                        </button>
                                                                    </td>
                                                                    <td className="px-4 py-3">
                                                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                                                                            {svc.pending_count ?? svc.summary?.pending ?? 0}
                                                                        </span>
                                                                    </td>
                                                                    <td className="px-4 py-3">
                                                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                                            {svc.complete_count ?? svc.summary?.complete ?? 0}
                                                                        </span>
                                                                    </td>
                                                                    <td className="px-4 py-3">
                                                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-50 text-slate-600 border border-slate-200">
                                                                            {svc.cancel_count ?? svc.summary?.cancel ?? 0}
                                                                        </span>
                                                                    </td>
                                                                    <td className="px-4 py-3">
                                                                        <ActionMenu items={[
                                                                            { label: 'View', icon: <FiEye className="w-3.5 h-3.5" />, onClick: () => setViewTarget({ svc, isBranch: true }) },
                                                                            { label: 'Edit', icon: <FiEdit className="w-3.5 h-3.5" />, onClick: () => openEdit(svc) },
                                                                            { label: 'Remove', icon: <FiTrash2 className="w-3.5 h-3.5" />, onClick: () => setRemoveTarget(svc), danger: true },
                                                                        ]} />
                                                                    </td>
                                                                </motion.tr>
                                                            ))
                                                    }
                                                </tbody>
                                            </table>
                                        </div>

                                        {(
                                            <div className="border-t border-gray-100 px-4 py-2">
                                                <TablePagination
                                                    page={branchPage} limit={branchLimit} total={branchTotal}
                                                    totalPages={branchTotalPages} isLastPage={branchPage >= branchTotalPages}
                                                    onPageChange={(p) => { setBranchPage(p); fetchBranch(branchSearch, p, branchLimit); }}
                                                    onLimitChange={(l) => { setBranchLimit(l); setBranchPage(1); fetchBranch(branchSearch, 1, l); }}
                                                    rowOptions={[5, 10, 20, 50, 100]}
                                                    showRange showRows showJump showFirstLast
                                                />
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* ── ADD SERVICES TAB ── */}
                                {activeTab === 'all' && (
                                    <div>
                                        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
                                            <div className="relative flex-1 max-w-xs">
                                                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                                                <input type="text" placeholder="Search all services…" value={allSearch}
                                                    onChange={(e) => setAllSearch(e.target.value)}
                                                    className="w-full pl-9 pr-3 py-2 text-sm text-slate-700 border border-gray-200 rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none placeholder:text-slate-400"
                                                />
                                            </div>
                                            <ViewportTooltip label="Refresh">
                                                <button onClick={() => fetchAll(allSearch)}
                                                    className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors border border-gray-200">
                                                    <FiRefreshCw className={`w-3.5 h-3.5 ${allLoading ? 'animate-spin' : ''}`} />
                                                </button>
                                            </ViewportTooltip>
                                            <button onClick={openCustomServiceModal}
                                                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors">
                                                <FiPlus className="w-3.5 h-3.5" /> Custom Service
                                            </button>
                                        </div>

                                        <div className="overflow-x-auto">
                                            <table className="w-full text-sm table-fixed min-w-[700px]">
                                                <thead>
                                                    <tr className="bg-gray-50 border-b border-gray-100">
                                                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap w-12">#</th>
                                                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap w-[48%]">Service</th>
                                                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap w-32">Type</th>
                                                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap w-32">Status</th>
                                                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap w-32">Action</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-50">
                                                    {allLoading
                                                        ? Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} cols={5} />)
                                                        : allList.length === 0
                                                            ? <EmptyState icon={<FiFileText className="w-5 h-5 text-slate-400" />} title="No services found" desc="Try a different search term." />
                                                            : allList.map((svc, idx) => (
                                                                <motion.tr key={svc.service_id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                                                    className={`transition-colors group ${svc.added_to_branch ? 'bg-emerald-50/30' : 'hover:bg-indigo-50/30'}`}>
                                                                    <td className="px-4 py-3 text-xs text-slate-400 font-medium w-10">
                                                                        {(allPage - 1) * allLimit + idx + 1}
                                                                    </td>
                                                                    <td className="px-4 py-3 max-w-[200px]">
                                                                        <ViewportTooltip label={svc.name} fullWidth>
                                                                            <p className="font-semibold text-slate-800 text-xs leading-snug truncate">{svc.name}</p>
                                                                        </ViewportTooltip>
                                                                        {svc.sac_code && (
                                                                            <span className="text-[11px] font-mono text-slate-400 bg-gray-100 px-1 py-0.5 rounded mt-0.5 inline-block">{svc.sac_code}</span>
                                                                        )}
                                                                    </td>
                                                                    <td className="px-4 py-3">{typeBadge(svc.type)}</td>
                                                                    <td className="px-4 py-3">
                                                                        {svc.added_to_branch ? (
                                                                            String(svc.status).toLowerCase() === 'inactive' ? (
                                                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                                                                                    <FiX className="w-3 h-3" /> Inactive
                                                                                </span>
                                                                            ) : (
                                                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200">
                                                                                    <FiCheck className="w-3 h-3" /> Added
                                                                                </span>
                                                                            )
                                                                        ) : (
                                                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 text-slate-500 border border-gray-200">
                                                                                Not added
                                                                            </span>
                                                                        )}
                                                                    </td>
                                                                    <td className="px-4 py-3">
                                                                        <div className="flex items-center gap-2">
                                                                            <button
                                                                                onClick={() => handleToggleServiceStatus(svc)}
                                                                                className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-all duration-300 ${svc.added_to_branch && String(svc.status).toLowerCase() === 'inactive'
                                                                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                                                                        : svc.added_to_branch
                                                                                            ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                                                                                            : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                                                                    }`}
                                                                            >
                                                                                {svc.added_to_branch && String(svc.status).toLowerCase() === 'inactive' ? 'Active' : svc.added_to_branch ? 'Deactive' : 'Active'}
                                                                            </button>
                                                                            <ActionMenu items={[
                                                                                { label: 'View', icon: <FiEye className="w-3.5 h-3.5" />, onClick: () => setViewTarget({ svc, isBranch: false }) },
                                                                                ...(!svc.added_to_branch
                                                                                    ? [{ label: 'Add to Branch', icon: <FiPlus className="w-3.5 h-3.5" />, onClick: () => openAdd(svc) }]
                                                                                    : [{ label: 'Remove', icon: <FiTrash2 className="w-3.5 h-3.5" />, onClick: () => setRemoveTarget(svc), danger: true }]
                                                                                ),
                                                                            ]} />
                                                                        </div>
                                                                    </td>
                                                                </motion.tr>
                                                            ))
                                                    }
                                                </tbody>
                                            </table>
                                        </div>

                                        {(
                                            <div className="border-t border-gray-100 px-4 py-2">
                                                <TablePagination
                                                    page={allPage} limit={allLimit} total={allTotal}
                                                    totalPages={allTotalPages} isLastPage={allPage >= allTotalPages}
                                                    onPageChange={(p) => { setAllPage(p); fetchAll(allSearch, p, allLimit); }}
                                                    onLimitChange={(l) => { setAllLimit(l); setAllPage(1); fetchAll(allSearch, 1, l); }}
                                                    rowOptions={[5, 10, 20, 50, 100]}
                                                    showRange showRows showJump showFirstLast
                                                />
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* ── RECURRING TASK TEMPLATES TAB ── */}
                                {activeTab === 'recurring' && (
                                    <div>
                                        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
                                            <div className="relative flex-1 max-w-xs">
                                                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                                                <input type="text" placeholder="Search templates…" value={rtSearch}
                                                    onChange={(e) => setRtSearch(e.target.value)}
                                                    className="w-full pl-9 pr-3 py-2 text-sm text-slate-700 border border-gray-200 rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none placeholder:text-slate-400"
                                                />
                                            </div>
                                            <button onClick={fetchRt}
                                                className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors border border-gray-200">
                                                <FiRefreshCw className={`w-3.5 h-3.5 ${rtLoading ? 'animate-spin' : ''}`} />
                                            </button>
                                            <button onClick={() => openRtModal()}
                                                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors">
                                                <FiPlus className="w-3.5 h-3.5" /> New Template
                                            </button>
                                        </div>

                                        <div className="overflow-x-auto">
                                            <table className="w-full text-sm table-fixed min-w-[850px]">
                                                <thead>
                                                    <tr className="bg-gray-50 border-b border-gray-100">
                                                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap w-12">#</th>
                                                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap w-[32%]">Service Name</th>
                                                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap w-28">Frequency</th>
                                                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap w-24">Due Day</th>
                                                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap w-32">Default Fee</th>
                                                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap w-28">Status</th>
                                                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap w-20">Action</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-50">
                                                    {rtLoading
                                                        ? Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} cols={7} />)
                                                        : filteredRtList.length === 0
                                                            ? <EmptyState icon={<FiRepeat className="w-5 h-5 text-slate-400" />} title="No recurring task templates" desc={rtSearch ? 'No match found.' : 'Click "New Template" to create one.'} />
                                                            : filteredRtList.map((svc, idx) => (
                                                                <motion.tr key={svc.service_id || svc.id || idx} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                                                    className="hover:bg-indigo-50/30 transition-colors">
                                                                    <td className="px-4 py-3 text-xs text-slate-400 font-medium w-10">{idx + 1}</td>
                                                                    <td className="px-4 py-3 max-w-[200px]">
                                                                        <p className="font-semibold text-slate-800 text-xs leading-snug truncate">{svc.name}</p>
                                                                    </td>
                                                                    <td className="px-4 py-3">
                                                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border uppercase tracking-wide ${FREQ_BADGE_COLORS[String(svc.frequency).toLowerCase()] || 'bg-gray-100 text-slate-600 border-gray-200'}`}>
                                                                            {svc.frequency}
                                                                        </span>
                                                                    </td>
                                                                    <td className="px-4 py-3 text-xs text-slate-600">
                                                                        {svc.due_day ? `Day ${svc.due_day}` : '—'}
                                                                    </td>
                                                                    <td className="px-4 py-3">
                                                                        <span className="text-xs font-semibold text-slate-800">₹{fmt(svc.default_amount)}</span>
                                                                    </td>
                                                                    <td className="px-4 py-3">
                                                                        {svc.status === 'Active' ? (
                                                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200">
                                                                                <FiCheck className="w-3.5 h-3.5" /> Active
                                                                            </span>
                                                                        ) : (
                                                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200" style={{ backgroundColor: 'rgb(254 242 242)' }}>
                                                                                <FiX className="w-3.5 h-3.5" /> Inactive
                                                                            </span>
                                                                        )}
                                                                    </td>
                                                                    <td className="px-4 py-3">
                                                                        <div className="flex items-center gap-2">
                                                                            <button
                                                                                onClick={() => handleToggleRtStatus(svc)}
                                                                                className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-all duration-300 ${svc.status === 'Active'
                                                                                    ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                                                                                    : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                                                                    }`}
                                                                            >
                                                                                {svc.status === 'Active' ? 'Deactive' : 'Active'}
                                                                            </button>
                                                                            <ActionMenu items={[
                                                                                { label: 'Edit', icon: <FiEdit className="w-3.5 h-3.5" />, onClick: () => openRtModal(svc) },
                                                                                { label: 'Delete', icon: <FiTrash2 className="w-3.5 h-3.5" />, onClick: () => setRtDeleteTarget(svc), danger: true },
                                                                            ]} />
                                                                        </div>
                                                                    </td>
                                                                </motion.tr>
                                                            ))
                                                    }
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}

                    </div>
                </div>
            </div>

            {/* ── VIEW MODAL ── */}
            <AnimatePresence>
                {viewTarget && (
                    <ViewModal svc={viewTarget.svc} isBranch={viewTarget.isBranch} onClose={() => setViewTarget(null)} />
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
                        <FeeForm form={editForm} onChange={(k, v) => setEditForm(f => ({ ...f, [k]: v }))} loading={editLoading} />
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
                            </div>
                        </div>
                        <FeeForm form={addForm} onChange={(k, v) => setAddForm(f => ({ ...f, [k]: v }))} loading={addLoading} />
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

            {/* ── RECURRING TEMPLATE MODAL (Create / Edit) ── */}
            <AnimatePresence>
                {rtShowModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-start justify-center p-3 sm:p-4 z-[210] backdrop-blur-sm overflow-y-auto" onClick={() => !rtSubmitting && setRtShowModal(false)}>
                        <motion.div
                            initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }}
                            transition={{ duration: 0.15 }}
                            className="bg-white rounded-2xl shadow-2xl w-full max-w-md my-2 sm:my-8 max-h-[calc(100vh-1.5rem)] sm:max-h-[calc(100vh-4rem)] overflow-hidden flex flex-col"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white shrink-0">
                                <div className="flex items-center gap-2">
                                    <FiRepeat className="w-4 h-4" />
                                    <h3 className="text-sm font-bold">{rtEditTarget ? 'Edit Template' : 'New Recurring Task Template'}</h3>
                                </div>
                                <button onClick={() => setRtShowModal(false)} disabled={rtSubmitting} className="p-1 hover:bg-white/10 rounded-lg">
                                    <FiX className="w-4 h-4" />
                                </button>
                            </div>
                            <div className="p-5 space-y-4 overflow-y-auto [scrollbar-width:none]">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Service Name *</label>
                                    <input type="text" value={rtForm.name} onChange={(e) => setRtForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Local Authority Audit"
                                        className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white font-medium text-slate-700" required />
                                </div>

                                <div className="border-t border-gray-100 pt-3 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-xs font-bold text-slate-700">Custom Credentials/Fields</h4>
                                        <button
                                            type="button"
                                            onClick={() => setRtForm(f => ({
                                                ...f,
                                                required_fields: [...(f.required_fields || []), { key: '', label: '', type: 'text' }]
                                            }))}
                                            className="flex items-center gap-1 px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-705 border border-indigo-200 rounded-lg text-[10px] font-semibold transition-colors"
                                        >
                                            <FiPlus className="w-3 h-3" /> Add Field
                                        </button>
                                    </div>
                                    {(!rtForm.required_fields || rtForm.required_fields.length === 0) ? (
                                        <p className="text-[11px] text-slate-400 italic">No custom fields defined. Click "Add Field" to define required credentials.</p>
                                    ) : (
                                        <div className="space-y-3 max-h-48 overflow-y-auto p-1 border border-slate-100 rounded-xl bg-slate-50/50">
                                            {rtForm.required_fields.map((field, idx) => (
                                                <div key={idx} className="flex gap-2 items-end border border-slate-200 p-2.5 rounded-lg bg-white relative">
                                                    <div className="flex-1 min-w-0">
                                                        <label className="block text-[10px] font-semibold text-slate-500 mb-1">Field Label *</label>
                                                        <input
                                                            type="text"
                                                            value={field.label}
                                                            onChange={(e) => {
                                                                const val = e.target.value;
                                                                const key = val.toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/_+/g, '_');
                                                                setRtForm(f => {
                                                                    const updated = [...f.required_fields];
                                                                    updated[idx] = { ...updated[idx], label: val, key: updated[idx].key || key };
                                                                    return { ...f, required_fields: updated };
                                                                });
                                                            }}
                                                            placeholder="e.g. Audit Code"
                                                            className="w-full px-2 py-1 text-[11px] border border-gray-200 rounded-lg focus:ring-1 focus:ring-indigo-500 outline-none"
                                                        />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <label className="block text-[10px] font-semibold text-slate-500 mb-1">Field Key *</label>
                                                        <input
                                                            type="text"
                                                            value={field.key}
                                                            onChange={(e) => {
                                                                const val = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_');
                                                                setRtForm(f => {
                                                                    const updated = [...f.required_fields];
                                                                    updated[idx] = { ...updated[idx], key: val };
                                                                    return { ...f, required_fields: updated };
                                                                });
                                                            }}
                                                            placeholder="e.g. audit_code"
                                                            className="w-full px-2 py-1 text-[11px] border border-gray-200 rounded-lg focus:ring-1 focus:ring-indigo-500 outline-none"
                                                        />
                                                    </div>
                                                    <div className="w-20">
                                                        <label className="block text-[10px] font-semibold text-slate-500 mb-1">Type *</label>
                                                        <select
                                                            value={field.type}
                                                            onChange={(e) => {
                                                                const val = e.target.value;
                                                                setRtForm(f => {
                                                                    const updated = [...f.required_fields];
                                                                    updated[idx] = { ...updated[idx], type: val };
                                                                    return { ...f, required_fields: updated };
                                                                });
                                                            }}
                                                            className="w-full px-2 py-1 text-[11px] border border-gray-200 rounded-lg focus:ring-1 focus:ring-indigo-500 outline-none bg-white"
                                                        >
                                                            <option value="text">text</option>
                                                            <option value="password">password</option>
                                                        </select>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => setRtForm(f => ({
                                                            ...f,
                                                            required_fields: f.required_fields.filter((_, i) => i !== idx)
                                                        }))}
                                                        className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors border border-rose-200"
                                                    >
                                                        <FiTrash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {rtForm.template_type && rtForm.template_type !== 'Custom / New Service' && (
                                    <div className="bg-indigo-50/55 border border-indigo-100 rounded-xl p-3 text-xs text-indigo-805 space-y-1">
                                        <p className="font-semibold flex items-center gap-1 text-[11px]">
                                            <FiInfo className="w-3.5 h-3.5 text-indigo-500 shrink-0" /> Pre-allocated Credentials Schema:
                                        </p>
                                        <ul className="list-disc pl-4 space-y-0.5 font-medium text-[11px]">
                                            {rtForm.template_type === 'Professional Tax' && (
                                                <>
                                                    <li><strong>Professional Tax Reg No</strong> (Key: <code>ptax_reg_no</code>, Type: <code>text</code>)</li>
                                                    <li><strong>Password</strong> (Key: <code>ptax_password</code>, Type: <code>password</code>)</li>
                                                </>
                                            )}
                                            {rtForm.template_type === 'GSTR-1 Filing' && (
                                                <>
                                                    <li><strong>GST Login ID</strong> (Key: <code>gst_login_id</code>, Type: <code>text</code>)</li>
                                                    <li><strong>Password</strong> (Key: <code>gst_password</code>, Type: <code>password</code>)</li>
                                                </>
                                            )}
                                        </ul>
                                    </div>
                                )}
                                <div className="grid grid-cols-2 gap-3">
                                    <div className={rtForm.frequency === 'one-time' ? 'col-span-2' : ''}>
                                        <label className="block text-xs font-semibold text-slate-600 mb-1.5">Frequency *</label>
                                        <select value={rtForm.frequency} onChange={(e) => setRtForm(f => ({ ...f, frequency: e.target.value }))}
                                            disabled={modalHasAssignments}
                                            className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white disabled:opacity-60 disabled:cursor-not-allowed">
                                            {['monthly', 'quarterly', 'half-yearly', 'yearly', 'annual', 'one-time'].map(f => (
                                                <option key={f} value={f}>{f.charAt(0).toUpperCase() + f.slice(1)}</option>
                                            ))}
                                        </select>
                                        {modalHasAssignments && (
                                            <p className="text-[10px] text-slate-450 mt-1 font-medium flex items-center gap-1">
                                                <FiInfo className="w-3 h-3 text-slate-400 shrink-0" />
                                                Cannot change frequency of assigned template.
                                            </p>
                                        )}
                                    </div>
                                    {rtForm.frequency !== 'one-time' && (
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                                                {getDueDayLabel(rtForm.frequency)}
                                            </label>
                                            <input type="number" min="1" max="31" value={rtForm.due_day} onChange={(e) => setRtForm(f => ({ ...f, due_day: e.target.value }))} placeholder="e.g. 11"
                                                className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none" />
                                        </div>
                                    )}
                                </div>
                                {rtForm.frequency === 'quarterly' && (
                                    <div className="grid grid-cols-2 gap-3 border-t border-gray-100 pt-3">
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Q1 Due Day (Apr-Jun)</label>
                                            <input type="number" min="1" max="31" value={rtForm.q1_due_day || ''} onChange={(e) => setRtForm(f => ({ ...f, q1_due_day: e.target.value }))} placeholder="e.g. 31"
                                                className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Q2 Due Day (Jul-Sep)</label>
                                            <input type="number" min="1" max="31" value={rtForm.q2_due_day || ''} onChange={(e) => setRtForm(f => ({ ...f, q2_due_day: e.target.value }))} placeholder="e.g. 31"
                                                className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Q3 Due Day (Oct-Dec)</label>
                                            <input type="number" min="1" max="31" value={rtForm.q3_due_day || ''} onChange={(e) => setRtForm(f => ({ ...f, q3_due_day: e.target.value }))} placeholder="e.g. 31"
                                                className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Q4 Due Day (Jan-Mar)</label>
                                            <input type="number" min="1" max="31" value={rtForm.q4_due_day || ''} onChange={(e) => setRtForm(f => ({ ...f, q4_due_day: e.target.value }))} placeholder="e.g. 30"
                                                className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none" />
                                        </div>
                                    </div>
                                )}
                                {rtForm.frequency === 'half-yearly' && (
                                    <div className="grid grid-cols-2 gap-3 border-t border-gray-100 pt-3">
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-600 mb-1.5">H1 Due Day (Apr-Sep)</label>
                                            <input type="number" min="1" max="31" value={rtForm.h1_due_day || ''} onChange={(e) => setRtForm(f => ({ ...f, h1_due_day: e.target.value }))} placeholder="e.g. 31"
                                                className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-600 mb-1.5">H2 Due Day (Oct-Mar)</label>
                                            <input type="number" min="1" max="31" value={rtForm.h2_due_day || ''} onChange={(e) => setRtForm(f => ({ ...f, h2_due_day: e.target.value }))} placeholder="e.g. 30"
                                                className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none" />
                                        </div>
                                    </div>
                                )}
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Default Fee (₹) *</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">₹</span>
                                        <input type="text" inputMode="decimal" value={rtForm.default_amount}
                                            onChange={(e) => { const v = e.target.value; if (v === '' || isValidAmountInput(v)) setRtForm(f => ({ ...f, default_amount: v })); }}
                                            placeholder="0.00"
                                            className="w-full pl-7 pr-3 py-2 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Status *</label>
                                    <select value={rtForm.status} onChange={(e) => setRtForm(f => ({ ...f, status: e.target.value }))}
                                        disabled={modalHasAssignments}
                                        className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white disabled:opacity-60 disabled:cursor-not-allowed">
                                        <option value="Active">Active</option>
                                        <option value="Inactive">Inactive</option>
                                    </select>
                                    {modalHasAssignments && (
                                        <p className="text-[10px] text-slate-450 mt-1 font-medium flex items-center gap-1">
                                            <FiInfo className="w-3 h-3 text-slate-400 shrink-0" />
                                            Cannot deactivate template with active assignments.
                                        </p>
                                    )}
                                </div>
                            </div>
                            <div className="shrink-0 px-5 py-3 border-t border-gray-100 bg-gray-50 flex gap-2">
                                <button onClick={() => setRtShowModal(false)} disabled={rtSubmitting}
                                    className="flex-1 px-4 py-2 text-sm font-medium text-slate-600 border border-gray-200 rounded-lg hover:bg-gray-100 disabled:opacity-50 transition-colors">
                                    Cancel
                                </button>
                                <button onClick={handleRtSubmit} disabled={rtSubmitting}
                                    className="flex-1 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg disabled:opacity-50 transition-colors inline-flex items-center justify-center gap-1.5">
                                    {rtSubmitting && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                                    {rtEditTarget ? 'Save Changes' : 'Create Template'}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ── RECURRING TEMPLATE DELETE CONFIRM ── */}
            <AnimatePresence>
                {rtDeleteTarget && (
                    <ConfirmModal
                        title="Delete Template"
                        message={`Delete "${rtDeleteTarget.name}" template? This cannot be undone.`}
                        onConfirm={handleRtDelete}
                        onCancel={() => !rtDeleting && setRtDeleteTarget(null)}
                        loading={rtDeleting}
                    />
                )}
            </AnimatePresence>

            {/* ── CUSTOM SERVICE MODAL ── */}
            <AnimatePresence>
                {customServiceShowModal && (
                    <Modal
                        title="Create Custom Service"
                        icon={<FiPlus className="w-4 h-4" />}
                        onClose={() => !customServiceSubmitting && setCustomServiceShowModal(false)}
                        footer={
                            <div className="flex justify-end gap-2">
                                <button
                                    onClick={() => setCustomServiceShowModal(false)}
                                    disabled={customServiceSubmitting}
                                    className="px-4 py-2 text-sm font-medium text-slate-650 border border-gray-250 rounded-xl hover:bg-slate-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleCustomServiceSubmit}
                                    disabled={
                                        customServiceSubmitting ||
                                        !customServiceForm.name.trim() ||
                                        customServiceForm.fees === '' ||
                                        customServiceForm.gst_rate === null
                                    }
                                    className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl disabled:opacity-50 transition-colors inline-flex items-center gap-1.5"
                                >
                                    {customServiceSubmitting && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                                    Create Service
                                </button>
                            </div>
                        }
                    >
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Service Name *</label>
                                <input
                                    type="text"
                                    value={customServiceForm.name}
                                    onChange={(e) => setCustomServiceForm(f => ({ ...f, name: e.target.value }))}
                                    disabled={customServiceSubmitting}
                                    className="w-full px-3 py-2.5 text-xs text-slate-700 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none disabled:opacity-60 bg-white"
                                    placeholder="e.g. My Custom Local Consult Service"
                                />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-505 uppercase tracking-wider mb-1.5 font-semibold">Service Type *</label>
                                    <select
                                        value={customServiceForm.type}
                                        onChange={(e) => setCustomServiceForm(f => ({ ...f, type: e.target.value }))}
                                        disabled={customServiceSubmitting}
                                        className="w-full px-3 py-2.5 text-xs text-slate-705 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none disabled:opacity-60 bg-white font-medium"
                                    >
                                        <option value="gst">GST</option>
                                        <option value="itr">ITR</option>
                                        <option value="audit">Audit</option>
                                        <option value="compliance">Compliance</option>
                                        <option value="registration">Registration</option>
                                        <option value="other">Other</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-505 uppercase tracking-wider mb-1.5 font-semibold">Service ID (Optional)</label>
                                    <input
                                        type="text"
                                        value={customServiceForm.service_id}
                                        onChange={(e) => setCustomServiceForm(f => ({ ...f, service_id: e.target.value }))}
                                        disabled={customServiceSubmitting}
                                        className="w-full px-3 py-2.5 text-xs text-slate-705 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none disabled:opacity-60 bg-white font-mono"
                                        placeholder="e.g. CUSTOM-SERVICE"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 font-semibold">SAC Code (Optional)</label>
                                    <input
                                        type="text"
                                        value={customServiceForm.sac_code}
                                        onChange={(e) => setCustomServiceForm(f => ({ ...f, sac_code: e.target.value }))}
                                        disabled={customServiceSubmitting}
                                        className="w-full px-3 py-2.5 text-xs text-slate-700 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none disabled:opacity-60 bg-white"
                                        placeholder="e.g. 998412"
                                    />
                                </div>
                            </div>
                            <FeeForm
                                form={customServiceForm}
                                onChange={(k, v) => setCustomServiceForm(f => ({ ...f, [k]: v }))}
                                loading={customServiceSubmitting}
                            />
                        </div>
                    </Modal>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Services;
