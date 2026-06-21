import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FiEdit, FiX, FiClipboard, FiLoader,
    FiUser, FiUsers, FiBriefcase,
    FiCalendar, FiSave, FiDollarSign,
    FiUserCheck, FiUserPlus, FiFileText, FiAlertCircle,
    FiLock, FiMail, FiPhone,
} from 'react-icons/fi';
import API_BASE_URL from "../utils/api-controller";
import getHeaders from "../utils/get-headers";
import { toast } from 'react-hot-toast';
import TaskStatusChange from '../components/Modals/TaskStatusChange';
import { DatePickerField } from '../components/PortalDatePicker';
import { checkPermissionSync } from '../utils/permission-helper';
import SelectInput from '../components/SelectInput';

const BILLING_GENERATE_BILLABLE = '/billing/generate/billable';
const BILLING_GENERATE_NONBILLABLE = '/billing/generate/nonbillable';

/* ─────────────────────────────────────────────
   Helpers
───────────────────────────────────────────── */
const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
        return new Date(dateString).toLocaleDateString('en-GB', {
            day: '2-digit', month: '2-digit', year: 'numeric',
        });
    } catch { return 'N/A'; }
};

const formatDateForAPI = (dateString) => {
    if (!dateString) return '';
    try {
        const d = new Date(dateString);
        if (isNaN(d.getTime())) return '';
        return d.toISOString().split('T')[0];
    } catch { return ''; }
};

const STATUS_COLORS = {
    'in process': 'bg-orange-100 text-orange-700 border-orange-200',
    'pending from client': 'bg-purple-100 text-purple-700 border-purple-200',
    'pending from department': 'bg-yellow-100 text-yellow-700 border-yellow-200',
    'complete': 'bg-green-100 text-green-700 border-green-200',
    'cancel': 'bg-red-100 text-red-700 border-red-200',
};

const STATUS_OPTIONS = [
    { value: 'in process', label: 'In Process' },
    { value: 'pending from client', label: 'Pending from Client' },
    { value: 'pending from department', label: 'Pending from Department' },
    { value: 'complete', label: 'Complete' },
    { value: 'cancel', label: 'Cancel' },
];

/* ─────────────────────────────────────────────
   Small pieces
───────────────────────────────────────────── */
const InfoPair = ({ label, children }) => (
    <div className="py-3 border-b border-gray-100 last:border-0">
        <p className="text-xs text-gray-500 mb-0.5">{label}</p>
        <div className="text-sm font-medium text-gray-900">{children}</div>
    </div>
);

const SectionTitle = ({ icon: Icon, title }) => (
    <div className="flex items-center gap-2 mb-4">
        <div className="w-7 h-7 bg-indigo-50 rounded-lg flex items-center justify-center">
            <Icon className="w-3.5 h-3.5 text-indigo-600" />
        </div>
        <h4 className="text-sm font-semibold text-gray-700">{title}</h4>
    </div>
);

/** Read-only locked field shown in the edit modal when bill is generated */
const LockedField = ({ label, value }) => (
    <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-500">{label}</label>
        <div className="flex items-center gap-2 px-3 py-3 bg-gray-50 border border-gray-200 rounded-xl min-h-[46px]">
            <FiLock className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
            <span className="text-sm text-gray-500 truncate">{value || '—'}</span>
        </div>
    </div>
);

/* ─────────────────────────────────────────────
   DetailsTab
───────────────────────────────────────────── */
const DetailsTab = ({ taskData: initialData, task_id, onTaskUpdated }) => {
    const [taskData, setTaskData] = useState(initialData);
    const [showEditModal, setShowEditModal] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // ── billing modal ─────────────────────────
    const [billingModal, setBillingModal] = useState(null); // 'bill' | 'nonbillable' | null
    const [isBillingAction, setIsBillingAction] = useState(false);

    // ── edit form ─────────────────────────────
    const [editForm, setEditForm] = useState({});
    const setEF = (patch) => setEditForm(prev => ({ ...prev, ...patch }));

    // ── status ────────────────────────────────
    const [isChangingStatus, setIsChangingStatus] = useState(false);
    const [statusModalOpen, setStatusModalOpen] = useState(false);

    // ── supporting data ───────────────────────
    const [services, setServices] = useState([]);

    // ── search states ─────────────────────────
    const [firmSearchQuery, setFirmSearchQuery] = useState('');
    const [firmSearchResults, setFirmSearchResults] = useState([]);
    const [firmSearchLoading, setFirmSearchLoading] = useState(false);

    const [caSearchQuery, setCaSearchQuery] = useState('');
    const [caSearchResults, setCaSearchResults] = useState([]);
    const [caSearchLoading, setCaSearchLoading] = useState(false);

    const [agentSearchQuery, setAgentSearchQuery] = useState('');
    const [agentSearchResults, setAgentSearchResults] = useState([]);
    const [agentSearchLoading, setAgentSearchLoading] = useState(false);

    const firmAbortRef = useRef(null);
    const caAbortRef = useRef(null);
    const agentAbortRef = useRef(null);

    /* ── init ── */
    useEffect(() => {
        if (taskData) {
            fetchServices();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (initialData) {
            setTaskData(initialData);
        }
    }, [initialData]);

    const fetchServices = async () => {
        try {
            const headers = getHeaders();
            if (!headers) return;
            const res = await fetch(`${API_BASE_URL}/service/list`, { headers });
            const data = await res.json();
            if (data?.success) setServices(data.data || []);
        } catch (err) { console.error(err); }
    };

    /* ── status change ── */
    const handleStatusChange = async (_taskId, newStatus) => {
        if (!newStatus || newStatus === taskData.status) return;
        setIsChangingStatus(true);
        try {
            const headers = getHeaders();
            const res = await fetch(`${API_BASE_URL}/task/change-status`, {
                method: 'PUT',
                headers: { ...headers, 'Content-Type': 'application/json' },
                body: JSON.stringify({ task_ids: [task_id], status: newStatus }),
            });
            const data = await res.json();
            if (data.success) {
                setTaskData(prev => ({ ...prev, status: newStatus }));
                toast.success(`Status updated to "${STATUS_OPTIONS.find(s => s.value === newStatus)?.label}"`);
                if (onTaskUpdated) onTaskUpdated();
            } else {
                toast.error(data.message || 'Failed to update status');
            }
        } catch (err) {
            toast.error(err.message || 'Failed to update status');
        } finally {
            setIsChangingStatus(false);
        }
    };

    /* ── open edit modal ── */
    const handleEditClick = () => {
        setEditForm({
            firm_id: taskData.firm?.firm_id || '',
            firmOption: taskData.firm
                ? { value: taskData.firm.firm_id, label: taskData.firm.firm_name || '', owner_name: taskData.firm.owner_name || taskData.firm.owner?.name || '' }
                : null,
            service_id: taskData.service?.service_id || '',
            fees: taskData.charges?.fees ?? 0,
            tax_rate: taskData.charges?.tax_rate ?? 18,
            has_ca: !!taskData.has_ca,
            ca_id: taskData.ca?.username || '',
            caDisplay: taskData.has_ca && taskData.ca ? taskData.ca : null,
            has_agent: !!taskData.has_agent,
            agent_id: taskData.agent?.username || '',
            agentDisplay: taskData.has_agent && taskData.agent ? taskData.agent : null,
            due_date: taskData.dates?.due_date ? formatDateForAPI(taskData.dates.due_date) : '',
            target_date: taskData.dates?.target_date ? formatDateForAPI(taskData.dates.target_date) : '',
        });
        setFirmSearchQuery(''); setFirmSearchResults([]);
        setCaSearchQuery(''); setCaSearchResults([]);
        setAgentSearchQuery(''); setAgentSearchResults([]);
        setShowEditModal(true);
    };

    const closeEditModal = () => { if (!isSaving) setShowEditModal(false); };

    /* ── billing generate ── */
    const handleConfirmBilling = async () => {
        const headers = getHeaders();
        if (!headers) { toast.error('Authentication required.'); return; }

        const isBill = billingModal === 'bill';
        const endpoint = isBill ? BILLING_GENERATE_BILLABLE : BILLING_GENERATE_NONBILLABLE;
        const toastId = toast.loading(isBill ? 'Generating bill…' : 'Marking as non-billable…');

        setIsBillingAction(true);
        try {
            const res = await fetch(`${API_BASE_URL}${endpoint}`, {
                method: 'POST',
                headers: { ...headers, 'Content-Type': 'application/json' },
                body: JSON.stringify({ task_ids: [task_id] }),
            });
            const json = await res.json().catch(() => ({}));

            if (res.ok && json.success) {
                const invoiceNo = json.data?.invoice_no || '';
                toast.success(
                    (json.message || (isBill ? 'Bill generated successfully.' : 'Marked as non-billable.')) +
                    (invoiceNo ? ` Invoice: ${invoiceNo}` : ''),
                    { id: toastId }
                );
                // Update local task data so view refreshes immediately
                setTaskData(prev => ({
                    ...prev,
                    billing_status: isBill ? 'complete' : 'non billable',
                    invoice_id: json.data?.invoice_id || prev.invoice_id,
                    invoice_no: invoiceNo || prev.invoice_no,
                }));
                setBillingModal(null);
                if (onTaskUpdated) onTaskUpdated();
            } else {
                toast.error(json.message || 'Action failed. Please try again.', { id: toastId });
            }
        } catch (err) {
            console.error('Billing action error:', err);
            toast.error(err.message || 'An error occurred.', { id: toastId });
        } finally {
            setIsBillingAction(false);
        }
    };

    /* ── save ── */
    const handleSaveChanges = async () => {
        const headers = getHeaders();
        if (!headers) { toast.error('Authentication failed.'); return; }
        if (!editForm.firm_id) { toast.error('Please select a firm.'); return; }
        if (!editForm.service_id) { toast.error('Please select a service.'); return; }
        if (editForm.has_ca && !editForm.ca_id) { toast.error('CA is enabled — please select a CA.'); return; }
        if (editForm.has_agent && !editForm.agent_id) { toast.error('Agent is enabled — please select an agent.'); return; }

        setIsSaving(true);
        const toastId = toast.loading('Saving changes…');
        try {
            const payload = {
                firm_id: editForm.firm_id,
                service_id: editForm.service_id,
                fees: parseFloat(editForm.fees) || 0,
                tax_rate: parseFloat(editForm.tax_rate) || 0,
                ca: editForm.has_ca ? { has_ca: true, ca_id: editForm.ca_id } : { has_ca: false },
                agent: editForm.has_agent ? { has_agent: true, agent_id: editForm.agent_id } : { has_agent: false },
                due_date: editForm.due_date || '',
                target_date: editForm.target_date || '',
            };

            const res = await fetch(`${API_BASE_URL}/task/edit/${task_id}`, {
                method: 'PUT',
                headers: { ...headers, 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const data = await res.json();

            if (data.success) {
                toast.success('Task updated successfully', { id: toastId });
                setTaskData(prev => ({
                    ...prev,
                    firm: editForm.firmOption
                        ? { ...prev.firm, firm_id: editForm.firm_id, firm_name: editForm.firmOption.label, owner_name: editForm.firmOption.owner_name }
                        : prev.firm,
                    service: { ...prev.service, service_id: editForm.service_id, name: services.find(s => s.service_id === editForm.service_id)?.name || prev.service?.name },
                    charges: { ...prev.charges, fees: payload.fees, tax_rate: payload.tax_rate },
                    dates: { ...prev.dates, due_date: editForm.due_date, target_date: editForm.target_date },
                    has_ca: editForm.has_ca, ca: editForm.has_ca ? editForm.caDisplay : null,
                    has_agent: editForm.has_agent, agent: editForm.has_agent ? editForm.agentDisplay : null,
                }));
                setShowEditModal(false);
                if (onTaskUpdated) onTaskUpdated();
            } else {
                toast.error(data.message || 'Failed to update task', { id: toastId });
            }
        } catch (err) {
            toast.error(err.message || 'An error occurred', { id: toastId });
        } finally {
            setIsSaving(false);
        }
    };

    /* ── search effects ── */
    useEffect(() => {
        const term = firmSearchQuery.trim();
        if (term.length < 3) { setFirmSearchResults([]); return; }
        const t = setTimeout(async () => {
            setFirmSearchLoading(true);
            firmAbortRef.current?.abort();
            const ctrl = new AbortController(); firmAbortRef.current = ctrl;
            try {
                const res = await fetch(`${API_BASE_URL.replace(/\/$/, '')}/firm/search?search=${encodeURIComponent(term)}`, { headers: getHeaders(), signal: ctrl.signal });
                const data = await res.json();
                setFirmSearchResults(data.success && Array.isArray(data.data)
                    ? data.data.map(f => ({
                        value: f.firm_id,
                        label: f.firm_name || '',
                        client_name: f.client?.name || '',
                        client_mobile: f.client?.mobile || '',
                        file_no: f.file_no || f.client?.file_no || '',
                        pan_no: f.pan_no || f.client?.pan_number || '',
                    }))
                    : []);
            } catch (e) { if (e?.name !== 'AbortError') setFirmSearchResults([]); }
            finally { setFirmSearchLoading(false); }
        }, 350);
        return () => { clearTimeout(t); firmAbortRef.current?.abort(); };
    }, [firmSearchQuery]);

    useEffect(() => {
        const term = caSearchQuery.trim();
        if (term.length < 3) { setCaSearchResults([]); return; }
        const t = setTimeout(async () => {
            setCaSearchLoading(true);
            caAbortRef.current?.abort();
            const ctrl = new AbortController(); caAbortRef.current = ctrl;
            try {
                const res = await fetch(`${API_BASE_URL.replace(/\/$/, '')}/ca/search?search=${encodeURIComponent(term)}`, { headers: getHeaders(), signal: ctrl.signal });
                const data = await res.json();
                setCaSearchResults(data.success && Array.isArray(data.data) ? data.data : []);
            } catch (e) { if (e?.name !== 'AbortError') setCaSearchResults([]); }
            finally { setCaSearchLoading(false); }
        }, 350);
        return () => { clearTimeout(t); caAbortRef.current?.abort(); };
    }, [caSearchQuery]);

    useEffect(() => {
        const term = agentSearchQuery.trim();
        if (term.length < 3) { setAgentSearchResults([]); return; }
        const t = setTimeout(async () => {
            setAgentSearchLoading(true);
            agentAbortRef.current?.abort();
            const ctrl = new AbortController(); agentAbortRef.current = ctrl;
            try {
                const res = await fetch(`${API_BASE_URL.replace(/\/$/, '')}/agent/search?search=${encodeURIComponent(term)}`, { headers: getHeaders(), signal: ctrl.signal });
                const data = await res.json();
                setAgentSearchResults(data.success && Array.isArray(data.data) ? data.data : []);
            } catch (e) { if (e?.name !== 'AbortError') setAgentSearchResults([]); }
            finally { setAgentSearchLoading(false); }
        }, 350);
        return () => { clearTimeout(t); agentAbortRef.current?.abort(); };
    }, [agentSearchQuery]);

    // Total amount calculation
    const fees = parseFloat(editForm.fees) || 0;
    const taxRate = parseFloat(editForm.tax_rate) || 0;
    const taxAmount = fees * taxRate / 100;
    const totalAmount = fees + taxAmount;

    // 'complete' = billable invoice generated, 'non billable' = non-billable generated, 'pending' = not yet generated
    const billGenerated = taskData.billing_status === 'complete' || taskData.billing_status === 'non billable';
    const billNotGenerated = taskData.status === 'complete' && taskData.billing_status === 'pending';

    /* ═══════════════════════════════════════════
       Render
    ═══════════════════════════════════════════ */
    return (
        <>
            {/* ══════════════════════════════════════════
                View Card
            ══════════════════════════════════════════ */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-[0_8px_24px_rgba(15,23,42,0.06)] overflow-hidden">

                {/* Card header */}
                <div className="relative flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-indigo-600 via-indigo-600 to-violet-600">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.22),transparent_45%)] pointer-events-none" />
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center shadow-sm">
                            <FiClipboard className="w-4 h-4 text-white" />
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold text-white">Task Information</h3>
                            <p className="text-xs text-indigo-100">View and manage task details</p>
                        </div>
                    </div>
                    <motion.button
                        onClick={handleEditClick}
                        className="relative z-10 flex items-center gap-2 px-4 py-2 bg-white text-indigo-700 text-sm font-semibold rounded-xl hover:bg-indigo-50 transition-colors shadow-sm"
                        whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    >
                        <FiEdit className="w-4 h-4" />
                        Edit Task
                    </motion.button>
                </div>

                {/* Billing action bar — only when bill not generated */}
                {billNotGenerated && (
                    <div className="flex items-center gap-3 px-6 py-3 bg-amber-50 border-b border-amber-100">
                        <FiAlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                        <p className="text-sm text-amber-700 font-medium flex-1">Bill has not been generated for this task.</p>
                        <motion.button
                            onClick={() => setBillingModal('bill')}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
                            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                        >
                            <FiFileText className="w-3.5 h-3.5" />
                            Generate Bill
                        </motion.button>
                        <motion.button
                            onClick={() => setBillingModal('nonbillable')}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-600 text-white text-xs font-semibold rounded-lg hover:bg-gray-700 transition-colors"
                            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                        >
                            <FiFileText className="w-3.5 h-3.5" />
                            Generate Non Billable
                        </motion.button>
                    </div>
                )}

                {/* Card body */}
                <div className="p-6 bg-gradient-to-b from-white via-slate-50/30 to-slate-50/70">
                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-5">
                        <div className="xl:col-span-2 rounded-2xl border border-slate-200 bg-white p-4">
                            <div className="flex items-center justify-between mb-3">
                                <h4 className="text-sm font-semibold text-slate-800">Overview</h4>
                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border capitalize ${STATUS_COLORS[taskData.status] || 'bg-gray-100 text-gray-700 border-gray-200'}`}>
                                    {STATUS_OPTIONS.find((statusOption) => statusOption.value === taskData.status)?.label || taskData.status || 'N/A'}
                                </span>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                <div className="rounded-xl bg-slate-50 px-3 py-2">
                                    <p className="text-[11px] text-slate-500">Service</p>
                                    <p className="text-sm font-semibold text-slate-800 truncate">{taskData.service?.name || 'N/A'}</p>
                                </div>
                                <div className="rounded-xl bg-slate-50 px-3 py-2">
                                    <p className="text-[11px] text-slate-500">Firm</p>
                                    <p className="text-sm font-semibold text-slate-800 truncate">{taskData.firm?.firm_name || 'N/A'}</p>
                                </div>
                                <div className="rounded-xl bg-slate-50 px-3 py-2">
                                    <p className="text-[11px] text-slate-500">Charges</p>
                                    <div className="space-y-0.5">
                                        <p className="text-xs text-slate-600">Fees: <span className={`font-semibold text-slate-800 ${!checkPermissionSync('task_fees_view') ? 'blur-[3.5px] select-none' : ''}`}>₹{Number(taskData.charges?.fees ?? 0).toLocaleString('en-IN')}</span></p>
                                        <p className="text-xs text-slate-600">Tax: <span className={`font-semibold text-slate-800 ${!checkPermissionSync('task_fees_view') ? 'blur-[3.5px] select-none' : ''}`}>{taskData.charges?.tax_rate ?? 0}% (₹{Number(taskData.charges?.tax_value ?? 0).toLocaleString('en-IN')})</span></p>
                                        <p className="text-xs text-slate-600">Total: <span className={`font-semibold text-slate-900 ${!checkPermissionSync('task_fees_view') ? 'blur-[3.5px] select-none' : ''}`}>₹{Number(taskData.charges?.total ?? (Number(taskData.charges?.fees ?? 0) + Number(taskData.charges?.tax_value ?? 0))).toLocaleString('en-IN')}</span></p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-white p-4">
                            <h4 className="text-sm font-semibold text-slate-800 mb-3">Actions</h4>
                            <div className="space-y-2">
                                <motion.button
                                    type="button"
                                    onClick={() => setStatusModalOpen(true)}
                                    disabled={isChangingStatus}
                                    className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-xl hover:bg-indigo-100 disabled:opacity-50"
                                    whileHover={{ scale: 1.01 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    {isChangingStatus ? <FiLoader className="w-3.5 h-3.5 animate-spin" /> : <FiEdit className="w-3.5 h-3.5" />}
                                    Change Status
                                </motion.button>
                                <div className="rounded-xl bg-slate-50 px-3 py-2">
                                    <p className="text-[11px] text-slate-500">Billing</p>
                                    <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border capitalize ${
                                        taskData.billing_status === 'complete'
                                            ? 'bg-green-100 text-green-700 border-green-200'
                                            : taskData.billing_status === 'non billable'
                                                ? 'bg-blue-100 text-blue-700 border-blue-200'
                                                : 'bg-amber-100 text-amber-700 border-amber-200'
                                    }`}>
                                        {taskData.billing_status === 'complete'
                                            ? 'Bill Generated'
                                            : taskData.billing_status === 'non billable'
                                                ? 'Non Billable'
                                                : 'Pending'}
                                        </span>
                                        {taskData.billing_status === 'complete' && taskData.invoice_no && (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border bg-indigo-50 text-indigo-700 border-indigo-200">
                                                {taskData.invoice_no}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div className="rounded-2xl border border-slate-200 bg-white p-4">
                            <SectionTitle icon={FiBriefcase} title="Task Details" />
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3 text-sm">
                                <div><p className="text-xs text-slate-500">Client</p><p className="font-semibold text-slate-800">{taskData.client?.profile?.name || taskData.client?.name || 'N/A'}</p></div>
                                <div>
                                    <p className="text-xs text-slate-500">Client Mobile</p>
                                    <p className="text-xs text-slate-700 inline-flex items-center gap-1"><FiPhone className="w-3 h-3 text-slate-500" />{taskData.client?.profile?.mobile || 'N/A'}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500">Client Email</p>
                                    <p className="text-xs text-slate-700 inline-flex items-center gap-1"><FiMail className="w-3 h-3 text-slate-500" />{taskData.client?.profile?.email || 'N/A'}</p>
                                </div>
                                <div><p className="text-xs text-slate-500">Recurring</p><p className="font-semibold text-slate-800">{taskData.is_recurring ? 'Yes' : 'No'}</p></div>
                                {taskData.billing_status === 'complete' && taskData.invoice_no && (
                                    <div className="sm:col-span-2">
                                        <p className="text-xs text-slate-500">Invoice No</p>
                                        <p className="font-mono text-sm font-semibold text-indigo-700 tracking-wide">{taskData.invoice_no}</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-white p-4">
                            <SectionTitle icon={FiUsers} title="Assignment Details" />
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3 text-sm">
                                <div><p className="text-xs text-slate-500">Due Date</p><p className="font-semibold text-slate-800">{formatDate(taskData.dates?.due_date)}</p></div>
                                <div><p className="text-xs text-slate-500">Target Date</p><p className="font-semibold text-slate-800">{formatDate(taskData.dates?.target_date)}</p></div>
                                <div><p className="text-xs text-slate-500">Created Date</p><p className="font-semibold text-slate-800">{formatDate(taskData.dates?.create_date)}</p></div>
                                <div><p className="text-xs text-slate-500">CA</p><p className="font-semibold text-slate-800">{taskData.has_ca && taskData.ca ? (taskData.ca.name || taskData.ca.username) : 'Not assigned'}</p></div>
                                <div><p className="text-xs text-slate-500">Agent</p><p className="font-semibold text-slate-800">{taskData.has_agent && taskData.agent ? (taskData.agent.name || taskData.agent.username) : 'Not assigned'}</p></div>
                            </div>
                            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="rounded-xl bg-slate-50 border border-slate-200 px-3 py-2.5">
                                    <p className="text-xs text-slate-500 mb-1">Created By</p>
                                    <p className="text-sm font-semibold text-slate-800">{taskData.create_by?.name || 'N/A'}</p>
                                    <p className="text-xs text-slate-700 inline-flex items-center gap-1 mt-1"><FiPhone className="w-3 h-3 text-slate-500" />{taskData.create_by?.mobile || 'N/A'}</p>
                                    <p className="text-xs text-slate-700 inline-flex items-center gap-1 mt-1"><FiMail className="w-3 h-3 text-slate-500" />{taskData.create_by?.email || 'N/A'}</p>
                                </div>
                                <div className="rounded-xl bg-slate-50 border border-slate-200 px-3 py-2.5">
                                    <p className="text-xs text-slate-500 mb-1">Modified By</p>
                                    <p className="text-sm font-semibold text-slate-800">{taskData.modify_by?.name || 'N/A'}</p>
                                    <p className="text-xs text-slate-700 inline-flex items-center gap-1 mt-1"><FiPhone className="w-3 h-3 text-slate-500" />{taskData.modify_by?.mobile || 'N/A'}</p>
                                    <p className="text-xs text-slate-700 inline-flex items-center gap-1 mt-1"><FiMail className="w-3 h-3 text-slate-500" />{taskData.modify_by?.email || 'N/A'}</p>
                                </div>
                            </div>
                            {Array.isArray(taskData.staffs) && taskData.staffs.length > 0 && (
                                <div className="mt-4 pt-3 border-t border-slate-100">
                                    <p className="text-xs text-slate-500 mb-2">Assigned Staff</p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {taskData.staffs.map((s, i) => (
                                            <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-medium rounded-full">
                                                <FiUser className="w-2.5 h-2.5" />
                                                {s.name || s.username}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {Array.isArray(taskData.staffs) && taskData.staffs.length === 0 && (
                                <div className="mt-4 pt-3 border-t border-slate-100">
                                    <p className="text-xs text-slate-500">Assigned Staff</p>
                                    <p className="text-sm text-slate-400">No staff assigned</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* ══════════════════════════════════════════
                Edit Task Modal
            ══════════════════════════════════════════ */}
            <AnimatePresence>
                {showEditModal && (
                    <motion.div
                        key="edit-overlay"
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                        onClick={(e) => e.target === e.currentTarget && closeEditModal()}
                    >
                        <motion.div
                            key="edit-modal"
                            initial={{ opacity: 0, scale: 0.96, y: 16 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.96, y: 16 }}
                            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                            className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col overflow-hidden"
                            style={{ maxHeight: '92vh' }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Modal header */}
                            <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-gray-100">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center">
                                        <FiEdit className="w-4 h-4 text-indigo-600" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-semibold text-gray-900">Edit Task</h3>
                                        <p className="text-xs text-gray-400">Update task information below</p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={closeEditModal}
                                    disabled={isSaving}
                                    className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-40"
                                >
                                    <FiX className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Modal body */}
                            <div className="flex-1 min-h-0 overflow-y-auto [scrollbar-width:thin] px-6 py-6 space-y-6">

                                {/* Bill-generated restriction notice */}
                                {billGenerated && (
                                    <div className="flex items-start gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl">
                                        <FiLock className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-sm font-semibold text-amber-800">Bill already generated</p>
                                            <p className="text-xs text-amber-700 mt-0.5">Only <strong>Fees</strong> and <strong>Tax Rate</strong> can be edited. All other fields are locked.</p>
                                        </div>
                                    </div>
                                )}

                                {/* ─ Firm & Service ─ */}
                                <div className="space-y-5">
                                    <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                        <FiBriefcase className="w-4 h-4 text-indigo-500" /> Firm & Service
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {/* Firm */}
                                        {billGenerated ? (
                                            <LockedField label="Firm" value={editForm.firmOption?.label || taskData.firm?.firm_name} />
                                        ) : (
                                            <div className="space-y-2">
                                                <label className="block text-sm font-medium text-gray-700">
                                                    Firm <span className="text-red-500">*</span>
                                                </label>
                                                <div className="relative flex items-center w-full bg-white border border-gray-300 rounded-xl overflow-visible focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500 min-h-[46px]">
                                                    <FiBriefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 shrink-0 pointer-events-none z-10" />
                                                    {editForm.firmOption ? (
                                                        <>
                                                            <div className="flex-1 pl-9 pr-9 py-2">
                                                                <span className="text-sm text-gray-900 font-medium truncate block">{editForm.firmOption.label}</span>
                                                                <div className="flex flex-wrap gap-x-3">
                                                                    {editForm.firmOption.client_name && (
                                                                        <span className="text-xs text-gray-400">{editForm.firmOption.client_name}</span>
                                                                    )}
                                                                    {editForm.firmOption.pan_no && (
                                                                        <span className="text-xs text-gray-400">PAN: {editForm.firmOption.pan_no}</span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={() => { setEF({ firm_id: '', firmOption: null }); setFirmSearchQuery(''); setFirmSearchResults([]); }}
                                                                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                                            >
                                                                <FiX className="w-4 h-4" />
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <input
                                                                type="text"
                                                                value={firmSearchQuery}
                                                                onChange={(e) => setFirmSearchQuery(e.target.value)}
                                                                placeholder="Search firm (min 3 characters)..."
                                                                className="flex-1 min-w-0 pl-9 pr-3 py-2.5 text-sm border-0 bg-transparent focus:ring-0 focus:outline-none placeholder-gray-400"
                                                            />
                                                            {firmSearchQuery.trim().length >= 3 && (
                                                                <div className="absolute z-20 left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-72 overflow-y-auto">
                                                                    {firmSearchLoading && <div className="p-3 text-sm text-gray-500">Searching...</div>}
                                                                    {!firmSearchLoading && firmSearchResults.length === 0 && <div className="p-3 text-sm text-gray-500">No firms found</div>}
                                                                    {!firmSearchLoading && firmSearchResults.map(opt => (
                                                                        <button key={opt.value} type="button"
                                                                            onClick={() => { setEF({ firm_id: opt.value, firmOption: opt }); setFirmSearchQuery(''); setFirmSearchResults([]); }}
                                                                            className="w-full px-4 py-3 text-left hover:bg-indigo-50 border-b border-gray-100 last:border-0 transition-colors"
                                                                        >
                                                                            <p className="text-sm font-semibold text-gray-900 mb-1">{opt.label}</p>
                                                                            <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
                                                                                {opt.client_name && (
                                                                                    <span className="text-xs text-gray-500 truncate">
                                                                                        <span className="text-gray-400">Client: </span>{opt.client_name}
                                                                                    </span>
                                                                                )}
                                                                                {opt.client_mobile && (
                                                                                    <span className="text-xs text-gray-500">
                                                                                        <span className="text-gray-400">Mobile: </span>{opt.client_mobile}
                                                                                    </span>
                                                                                )}
                                                                                {opt.file_no && (
                                                                                    <span className="text-xs text-gray-500">
                                                                                        <span className="text-gray-400">File No: </span>{opt.file_no}
                                                                                    </span>
                                                                                )}
                                                                                {opt.pan_no && (
                                                                                    <span className="text-xs text-gray-500">
                                                                                        <span className="text-gray-400">PAN: </span>{opt.pan_no}
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            )}
                                                            {firmSearchQuery.trim().length > 0 && firmSearchQuery.trim().length < 3 && (
                                                                <p className="absolute left-9 top-full mt-0.5 text-xs text-gray-400">Type at least 3 characters</p>
                                                            )}
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {/* Service */}
                                        {billGenerated ? (
                                            <LockedField label="Service" value={services.find(s => s.service_id === editForm.service_id)?.name || taskData.service?.name} />
                                        ) : (
                                            <div className="space-y-2">
                                                <label className="block text-sm font-medium text-gray-700">
                                                    Service <span className="text-red-500">*</span>
                                                </label>
                                                <SelectInput
                                                    options={services.map((service) => ({
                                                        value: service.service_id,
                                                        label: service.name || 'Unnamed Service',
                                                    }))}
                                                    value={editForm.service_id || null}
                                                    onChange={(nextValue) => setEF({ service_id: nextValue || '' })}
                                                    placeholder="Select service"
                                                    searchPlaceholder="Search service..."
                                                    clearable={true}
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {checkPermissionSync('task_fees_view') && (
                                     <>
                                         <hr className="border-gray-100" />

                                         {/* ─ Financials ─ */}
                                         <div className="space-y-5">
                                             <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                                 <FiDollarSign className="w-4 h-4 text-indigo-500" /> Financials
                                             </h4>
                                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                 <div className="space-y-2">
                                                     <label className="block text-sm font-medium text-gray-700">
                                                         Fees (₹) <span className="text-red-500">*</span>
                                                     </label>
                                                     <div className="relative">
                                                         <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">₹</span>
                                                         <input
                                                             type="text"
                                                             inputMode="decimal"
                                                             value={editForm.fees}
                                                             onChange={(e) => {
                                                                 const val = e.target.value;
                                                                 if (val === '' || /^\d*\.?\d*$/.test(val)) setEF({ fees: val });
                                                             }}
                                                             className="w-full pl-8 pr-3 py-3 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white outline-none"
                                                             placeholder="0.00"
                                                         />
                                                     </div>
                                                 </div>
                                                 <div className="space-y-2">
                                                     <label className="block text-sm font-medium text-gray-700">Tax Rate (%)</label>
                                                     <div className="relative">
                                                         <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">%</span>
                                                         <input
                                                             type="text"
                                                             inputMode="decimal"
                                                             value={editForm.tax_rate}
                                                             onChange={(e) => {
                                                                 const val = e.target.value;
                                                                 if (val === '' || /^\d*\.?\d*$/.test(val)) setEF({ tax_rate: val });
                                                             }}
                                                             className="w-full pl-8 pr-3 py-3 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white outline-none"
                                                             placeholder="0"
                                                         />
                                                     </div>
                                                 </div>
                                             </div>
                                             {/* Total amount summary */}
                                             {fees > 0 && (
                                                 <div className="flex items-center justify-between px-4 py-3 bg-indigo-50 border border-indigo-100 rounded-xl text-sm">
                                                     <div className="flex items-center gap-4 text-gray-600">
                                                         <span>Base: <span className="font-semibold text-gray-800">₹{fees.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></span>
                                                         {taxRate > 0 && (
                                                             <span>Tax ({taxRate}%): <span className="font-semibold text-gray-800">₹{taxAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></span>
                                                         )}
                                                     </div>
                                                     <div className="font-bold text-indigo-700 text-base">
                                                         Total: ₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                     </div>
                                                 </div>
                                             )}
                                         </div>
                                     </>
                                )}

                                <hr className="border-gray-100" />

                                {/* ─ Dates ─ */}
                                <div className="space-y-5">
                                    <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                        <FiCalendar className="w-4 h-4 text-indigo-500" /> Dates
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {billGenerated ? (
                                            <LockedField label="Due Date" value={editForm.due_date ? formatDate(editForm.due_date) : '—'} />
                                        ) : (
                                            <div className="space-y-2">
                                                <label className="block text-sm font-medium text-gray-700">Due Date</label>
                                                <DatePickerField
                                                    value={editForm.due_date}
                                                    onChange={(value) => setEF({ due_date: value || '' })}
                                                    placeholder="Select due date"
                                                    mode="single"
                                                    initialTab="single"
                                                    quickOptionKeys={['td', 'tom', 'n7', 'eom']}
                                                    buttonClassName="w-full pl-3 pr-3 py-3 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white outline-none"
                                                />
                                            </div>
                                        )}
                                        {billGenerated ? (
                                            <LockedField label="Target Date" value={editForm.target_date ? formatDate(editForm.target_date) : '—'} />
                                        ) : (
                                            <div className="space-y-2">
                                                <label className="block text-sm font-medium text-gray-700">Target Date</label>
                                                <DatePickerField
                                                    value={editForm.target_date}
                                                    onChange={(value) => setEF({ target_date: value || '' })}
                                                    placeholder="Select target date"
                                                    mode="single"
                                                    initialTab="single"
                                                    quickOptionKeys={['td', 'tom', 'n7', 'eom']}
                                                    buttonClassName="w-full pl-3 pr-3 py-3 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white outline-none"
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <hr className="border-gray-100" />

                                {/* ─ CA & Agent ─ */}
                                <div className="space-y-5">
                                    <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                        <FiUserCheck className="w-4 h-4 text-indigo-500" /> CA & Agent
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                                        {/* CA */}
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <label className="block text-sm font-medium text-gray-700">CA</label>
                                                {/* Toggle */}
                                                <button
                                                    type="button"
                                                    role="switch"
                                                    aria-checked={editForm.has_ca}
                                                    disabled={billGenerated}
                                                    onClick={() => {
                                                        const next = !editForm.has_ca;
                                                        setEF({ has_ca: next, ca_id: next ? editForm.ca_id : '', caDisplay: next ? editForm.caDisplay : null });
                                                        if (!next) { setCaSearchQuery(''); setCaSearchResults([]); }
                                                    }}
                                                    className={`relative inline-flex h-6 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${editForm.has_ca ? 'bg-indigo-600' : 'bg-gray-200'}`}
                                                >
                                                    <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition ${editForm.has_ca ? 'translate-x-4' : 'translate-x-0'}`} />
                                                </button>
                                            </div>
                                            <AnimatePresence initial={false}>
                                                {editForm.has_ca && (
                                                    <motion.div
                                                        initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                                                        exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.18 }}
                                                        className="overflow-hidden"
                                                    >
                                                        <div className="relative flex items-center w-full bg-white border border-gray-300 rounded-xl overflow-visible focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500 min-h-[46px]">
                                                            <FiUserCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 shrink-0 pointer-events-none z-10" />
                                                            {editForm.caDisplay ? (
                                                                <>
                                                                    <div className="flex-1 pl-9 pr-9 py-2.5">
                                                                        <span className="text-sm text-gray-900 font-medium block">{editForm.caDisplay.name}</span>
                                                                        {editForm.caDisplay.email && <span className="text-xs text-gray-400">{editForm.caDisplay.email}</span>}
                                                                    </div>
                                                                    <button type="button"
                                                                        disabled={billGenerated}
                                                                        onClick={() => { setEF({ ca_id: '', caDisplay: null }); setCaSearchQuery(''); setCaSearchResults([]); }}
                                                                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                                                                    >
                                                                        <FiX className="w-4 h-4" />
                                                                    </button>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <input
                                                                        type="text" value={caSearchQuery}
                                                                        disabled={billGenerated}
                                                                        onChange={(e) => setCaSearchQuery(e.target.value)}
                                                                        placeholder="Search CA (min 3 characters)..."
                                                                        className="flex-1 min-w-0 pl-9 pr-3 py-2.5 text-sm border-0 bg-transparent focus:ring-0 focus:outline-none placeholder-gray-400 disabled:opacity-50"
                                                                    />
                                                                        {!billGenerated && caSearchQuery.trim().length >= 3 && (
                                                                        <div className="absolute z-20 left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-56 overflow-y-auto">
                                                                            {caSearchLoading && <div className="p-3 text-sm text-gray-500">Searching...</div>}
                                                                            {!caSearchLoading && caSearchResults.length === 0 && <div className="p-3 text-sm text-gray-500">No results</div>}
                                                                            {!caSearchLoading && caSearchResults.map(item => (
                                                                                <button key={item.username} type="button"
                                                                                    onClick={() => { setEF({ ca_id: item.username, caDisplay: item }); setCaSearchQuery(''); setCaSearchResults([]); }}
                                                                                    className="w-full px-3 py-2.5 text-left text-sm hover:bg-indigo-50 flex flex-col border-b border-gray-100 last:border-0"
                                                                                >
                                                                                    <span className="font-medium text-gray-900">{item.name}</span>
                                                                                    {(item.mobile || item.email) && <span className="text-xs text-gray-500">{[item.mobile, item.email].filter(Boolean).join(' · ')}</span>}
                                                                                </button>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                    {caSearchQuery.trim().length > 0 && caSearchQuery.trim().length < 3 && (
                                                                        <p className="absolute left-9 top-full mt-0.5 text-xs text-gray-400">Type at least 3 characters</p>
                                                                    )}
                                                                </>
                                                            )}
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                            {!editForm.has_ca && (
                                                <p className="text-xs text-gray-400">Enable toggle to assign a CA</p>
                                            )}
                                        </div>

                                        {/* Agent */}
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <label className="block text-sm font-medium text-gray-700">Agent</label>
                                                <button
                                                    type="button"
                                                    role="switch"
                                                    aria-checked={editForm.has_agent}
                                                    disabled={billGenerated}
                                                    onClick={() => {
                                                        const next = !editForm.has_agent;
                                                        setEF({ has_agent: next, agent_id: next ? editForm.agent_id : '', agentDisplay: next ? editForm.agentDisplay : null });
                                                        if (!next) { setAgentSearchQuery(''); setAgentSearchResults([]); }
                                                    }}
                                                    className={`relative inline-flex h-6 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${editForm.has_agent ? 'bg-indigo-600' : 'bg-gray-200'}`}
                                                >
                                                    <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition ${editForm.has_agent ? 'translate-x-4' : 'translate-x-0'}`} />
                                                </button>
                                            </div>
                                            <AnimatePresence initial={false}>
                                                {editForm.has_agent && (
                                                    <motion.div
                                                        initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                                                        exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.18 }}
                                                        className="overflow-hidden"
                                                    >
                                                        <div className="relative flex items-center w-full bg-white border border-gray-300 rounded-xl overflow-visible focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500 min-h-[46px]">
                                                            <FiUserPlus className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 shrink-0 pointer-events-none z-10" />
                                                            {editForm.agentDisplay ? (
                                                                <>
                                                                    <span className="flex-1 pl-9 pr-9 py-2.5 text-sm text-gray-900 font-medium truncate">
                                                                        {editForm.agentDisplay.name}
                                                                    </span>
                                                                    <button type="button"
                                                                        disabled={billGenerated}
                                                                        onClick={() => { setEF({ agent_id: '', agentDisplay: null }); setAgentSearchQuery(''); setAgentSearchResults([]); }}
                                                                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                                                                    >
                                                                        <FiX className="w-4 h-4" />
                                                                    </button>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <input
                                                                        type="text" value={agentSearchQuery}
                                                                        disabled={billGenerated}
                                                                        onChange={(e) => setAgentSearchQuery(e.target.value)}
                                                                        placeholder="Search Agent (min 3 characters)..."
                                                                        className="flex-1 min-w-0 pl-9 pr-3 py-2.5 text-sm border-0 bg-transparent focus:ring-0 focus:outline-none placeholder-gray-400 disabled:opacity-50"
                                                                    />
                                                                    {!billGenerated && agentSearchQuery.trim().length >= 3 && (
                                                                        <div className="absolute z-20 left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-56 overflow-y-auto">
                                                                            {agentSearchLoading && <div className="p-3 text-sm text-gray-500">Searching...</div>}
                                                                            {!agentSearchLoading && agentSearchResults.length === 0 && <div className="p-3 text-sm text-gray-500">No results</div>}
                                                                            {!agentSearchLoading && agentSearchResults.map(item => (
                                                                                <button key={item.username} type="button"
                                                                                    onClick={() => { setEF({ agent_id: item.username, agentDisplay: item }); setAgentSearchQuery(''); setAgentSearchResults([]); }}
                                                                                    className="w-full px-3 py-2.5 text-left text-sm hover:bg-indigo-50 flex flex-col border-b border-gray-100 last:border-0"
                                                                                >
                                                                                    <span className="font-medium text-gray-900">{item.name}</span>
                                                                                    {item.mobile && <span className="text-xs text-gray-500">{item.mobile}</span>}
                                                                                </button>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                    {agentSearchQuery.trim().length > 0 && agentSearchQuery.trim().length < 3 && (
                                                                        <p className="absolute left-9 top-full mt-0.5 text-xs text-gray-400">Type at least 3 characters</p>
                                                                    )}
                                                                </>
                                                            )}
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                            {!editForm.has_agent && (
                                                <p className="text-xs text-gray-400">Enable toggle to assign an agent</p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                            </div>

                            {/* Modal footer */}
                            <div className="flex-shrink-0 px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-end gap-3">
                                <button
                                    type="button" onClick={closeEditModal} disabled={isSaving}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 rounded-xl transition-colors disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <motion.button
                                    type="button" onClick={handleSaveChanges} disabled={isSaving}
                                    className="flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 shadow-sm min-w-[130px] justify-center"
                                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                                >
                                    {isSaving
                                        ? <><FiLoader className="w-4 h-4 animate-spin" /> Saving…</>
                                        : <><FiSave className="w-4 h-4" /> Save Changes</>
                                    }
                                </motion.button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ══════════════════════════════════════════
                Billing Confirmation Modal
            ══════════════════════════════════════════ */}
            <AnimatePresence>
                {billingModal && (
                    <motion.div
                        key="billing-overlay"
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4"
                        onClick={(e) => !isBillingAction && e.target === e.currentTarget && setBillingModal(null)}
                    >
                        <motion.div
                            key="billing-modal"
                            initial={{ opacity: 0, scale: 0.95, y: 12 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 12 }}
                            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
                            className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden"
                            style={{ maxHeight: '90vh' }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div className={`flex-shrink-0 px-6 py-4 flex items-center gap-3 ${billingModal === 'bill' ? 'bg-indigo-600' : 'bg-gray-700'}`}>
                                <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                                    <FiFileText className="w-4 h-4 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-white">
                                        {billingModal === 'bill' ? 'Generate Bill' : 'Mark as Non-Billable'}
                                    </h3>
                                    <p className="text-xs text-white/70 mt-0.5">This action cannot be undone</p>
                                </div>
                            </div>

                            {/* Amount breakdown */}
                            <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5 space-y-4">
                                {billingModal === 'bill' ? (
                                    <>
                                        <p className="text-sm text-gray-600">
                                            An invoice will be created for this task with the following charges:
                                        </p>
                                        <div className="rounded-xl border border-gray-200 overflow-hidden">
                                            <div className="flex justify-between items-center px-4 py-3 border-b border-gray-100">
                                                <span className="text-sm text-gray-500">Base Fees</span>
                                                <span className={`text-sm font-semibold text-gray-900 ${!checkPermissionSync('task_fees_view') ? 'blur-[3.5px] select-none' : ''}`}>
                                                    ₹{(taskData.charges?.fees ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center px-4 py-3 border-b border-gray-100">
                                                <span className="text-sm text-gray-500">
                                                    Tax ({taskData.charges?.tax_rate ?? 0}%)
                                                </span>
                                                <span className={`text-sm font-semibold text-gray-900 ${!checkPermissionSync('task_fees_view') ? 'blur-[3.5px] select-none' : ''}`}>
                                                    ₹{(taskData.charges?.tax_value ?? ((taskData.charges?.fees ?? 0) * (taskData.charges?.tax_rate ?? 0) / 100)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center px-4 py-3 bg-indigo-50">
                                                <span className="text-sm font-bold text-indigo-800">Total Amount</span>
                                                <span className={`text-base font-bold text-indigo-700 ${!checkPermissionSync('task_fees_view') ? 'blur-[3.5px] select-none' : ''}`}>
                                                    ₹{(taskData.charges?.total ?? ((taskData.charges?.fees ?? 0) + (taskData.charges?.fees ?? 0) * (taskData.charges?.tax_rate ?? 0) / 100)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-2 px-3 py-2.5 bg-amber-50 border border-amber-100 rounded-xl">
                                            <FiAlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                                            <p className="text-xs text-amber-700">
                                                Once generated, the invoice cannot be reversed from here. Make sure all charges are correct before proceeding.
                                            </p>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <p className="text-sm text-gray-600">
                                            This task will be marked as <span className="font-semibold text-gray-800">non-billable</span>. No invoice will be generated for the following charges:
                                        </p>
                                        <div className="rounded-xl border border-gray-200 overflow-hidden">
                                            <div className="flex justify-between items-center px-4 py-3 border-b border-gray-100">
                                                <span className="text-sm text-gray-500">Base Fees</span>
                                                <span className={`text-sm font-medium text-gray-400 line-through ${!checkPermissionSync('task_fees_view') ? 'blur-[3.5px] select-none' : ''}`}>
                                                    ₹{(taskData.charges?.fees ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center px-4 py-3 bg-gray-50">
                                                <span className="text-sm font-bold text-gray-600">Total</span>
                                                <span className={`text-sm font-bold text-gray-400 line-through ${!checkPermissionSync('task_fees_view') ? 'blur-[3.5px] select-none' : ''}`}>
                                                    ₹{(taskData.charges?.total ?? taskData.charges?.fees ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-2 px-3 py-2.5 bg-amber-50 border border-amber-100 rounded-xl">
                                            <FiAlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                                            <p className="text-xs text-amber-700">
                                                This action cannot be undone from here. The task will be closed without generating an invoice.
                                            </p>
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Footer */}
                            <div className="flex-shrink-0 px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-end gap-3">
                                <button
                                    type="button"
                                    disabled={isBillingAction}
                                    onClick={() => setBillingModal(null)}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 rounded-xl transition-colors disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <motion.button
                                    type="button"
                                    disabled={isBillingAction}
                                    onClick={handleConfirmBilling}
                                    className={`flex items-center gap-2 px-5 py-2 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50 shadow-sm min-w-[130px] justify-center ${billingModal === 'bill' ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-gray-700 hover:bg-gray-800'}`}
                                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                                >
                                    {isBillingAction ? (
                                        <><FiLoader className="w-4 h-4 animate-spin" /> Processing…</>
                                    ) : billingModal === 'bill' ? (
                                        <><FiFileText className="w-4 h-4" /> Generate Bill</>
                                    ) : (
                                        <><FiFileText className="w-4 h-4" /> Confirm</>
                                    )}
                                </motion.button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <TaskStatusChange
                isOpen={statusModalOpen}
                onClose={() => setStatusModalOpen(false)}
                taskId={task_id}
                taskName={taskData.service?.name || ''}
                currentStatus={taskData.status || ''}
                onStatusChange={handleStatusChange}
                statusOptions={STATUS_OPTIONS.map((statusOption) => ({ value: statusOption.value, name: statusOption.label }))}
            />
        </>
    );
};

export default DetailsTab;
