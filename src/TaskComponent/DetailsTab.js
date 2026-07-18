import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FiEdit, FiX, FiClipboard, FiLoader,
    FiUser, FiUsers, FiBriefcase,
    FiCalendar, FiSave,
    FiUserCheck, FiFileText, FiAlertCircle,
    FiLock, FiMail, FiPhone, FiHash, FiClock, FiEye,
} from 'react-icons/fi';
import { TbCurrencyRupee } from 'react-icons/tb';
import API_BASE_URL from "../utils/api-controller";
import getHeaders from "../utils/get-headers";
import { toast } from 'react-hot-toast';
import TaskStatusChange from '../components/Modals/TaskStatusChange';
import { DatePickerField } from '../components/PortalDatePicker';
import { checkPermissionSync } from '../utils/permission-helper';
import CustomSelect from '../components/CustomSelect';
import { optionByValue } from '../utils/customSelectHelpers';
import {
    FirmModalShell,
    FirmViewDetails,
} from '../components/Modals/FirmModalParts';
import {
    searchFirmSelectOptions,
    fetchCaOptions,
    fetchAgentOptions,
} from '../services/complianceService';

const BILLING_GENERATE_BILLABLE = '/billing/generate/billable';
const BILLING_GENERATE_NONBILLABLE = '/billing/generate/nonbillable';

const PROFILE_LINK_CLASS =
    'font-semibold text-indigo-600 no-underline transition-colors hover:text-indigo-800 hover:no-underline';

const mapFirmForView = (firm) => {
    if (!firm) return null;
    return {
        ...firm,
        firm_id: firm.firm_id,
        firm_name: firm.firm_name,
        firm_type: firm.firm_type,
        status:
            typeof firm.status === 'boolean'
                ? firm.status
                : firm.status == '1' || firm.status === true,
        username: firm.username,
        pan: firm.pan || firm.pan_no || '',
        gst: firm.gst || firm.gst_no || '',
        file_no: firm.file_no || '',
        tan: firm.tan || firm.tan_no || '',
        cin: firm.cin || firm.cin_no || '',
        vat: firm.vat || firm.vat_no || '',
        address: firm.address || {
            address_line_1: '',
            address_line_2: '',
            city: '',
            state: '',
            pincode: '',
            country: '',
        },
        create_by: firm.create_by || {},
        modify_by: firm.modify_by || {},
        create_date: firm.create_date,
        modify_date: firm.modify_date,
    };
};

const formatFirmViewDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
        return new Date(dateString).toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    } catch {
        return dateString;
    }
};

const StaffProfileName = ({ user, fallback = '—' }) => {
    const name = user?.name || fallback;
    const username = user?.username;
    if (!username || !user?.name) {
        return <span className="text-sm font-semibold text-gray-800">{name}</span>;
    }
    return (
        <Link
            to={`/staff/view/profile/task?username=${encodeURIComponent(username)}`}
            className={`mt-1 inline-block text-sm ${PROFILE_LINK_CLASS}`}
        >
            {name}
        </Link>
    );
};

const formatDate = (dateString) => {
    if (!dateString) return '—';
    try {
        return new Date(dateString).toLocaleDateString('en-GB', {
            day: '2-digit', month: '2-digit', year: 'numeric',
        });
    } catch {
        return '—';
    }
};

const formatDateForAPI = (dateString) => {
    if (!dateString) return '';
    try {
        const d = new Date(dateString);
        if (isNaN(d.getTime())) return '';
        return d.toISOString().split('T')[0];
    } catch {
        return '';
    }
};

const formatMoney = (value) =>
    `₹${Number(value ?? 0).toLocaleString('en-IN', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    })}`;

const STATUS_COLORS = {
    'in process': 'bg-orange-100 text-orange-700',
    'pending from client': 'bg-purple-100 text-purple-700',
    'pending from department': 'bg-yellow-100 text-yellow-700',
    complete: 'bg-green-100 text-green-700',
    cancel: 'bg-red-100 text-red-700',
};

const STATUS_OPTIONS = [
    { value: 'in process', label: 'In Process' },
    { value: 'pending from client', label: 'Pending from Client' },
    { value: 'pending from department', label: 'Pending from Department' },
    { value: 'complete', label: 'Complete' },
    { value: 'cancel', label: 'Cancel' },
];

const MetaField = ({ label, children, className = '' }) => (
    <div className={`min-w-0 ${className}`}>
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-500">{label}</p>
        <div className="text-sm font-medium text-gray-800">{children ?? <span className="text-gray-400">—</span>}</div>
    </div>
);

const SectionBlock = ({ icon: Icon, title, children, action }) => (
    <section className="rounded-lg border border-gray-200 bg-white">
        <div className="flex items-center justify-between gap-2 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white px-3 py-2.5 md:px-4">
            <div className="flex items-center gap-2 min-w-0">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-50">
                    <Icon className="h-3.5 w-3.5 text-indigo-600" />
                </div>
                <h4 className="truncate text-sm font-bold text-gray-800">{title}</h4>
            </div>
            {action}
        </div>
        <div className="p-3 md:p-4">{children}</div>
    </section>
);

const LockedField = ({ label, value }) => (
    <div>
        {label ? (
            <label className="mb-1.5 block text-xs font-semibold text-gray-600">{label}</label>
        ) : null}
        <div className="flex min-h-[40px] items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
            <FiLock className="h-3.5 w-3.5 shrink-0 text-gray-400" />
            <span className="truncate text-sm font-medium text-gray-500">{value || '—'}</span>
        </div>
    </div>
);

const ContactLine = ({ icon: Icon, value }) => (
    <p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-gray-700">
        <Icon className="h-3 w-3 shrink-0 text-gray-400" />
        <span className="truncate">{value || '—'}</span>
    </p>
);

const toMemberSelectOption = (member) => {
    if (!member) return null;
    const username = member.username || member.value || member.ca_id || member.agent_id || '';
    if (!username) return null;
    const name = member.name || member.label || username;
    return {
        value: username,
        label: member.mobile ? `${name} · ${member.mobile}` : name,
        username,
        name,
        mobile: member.mobile || '',
        email: member.email || '',
    };
};

const DetailsTab = ({ taskData: initialData, task_id, onTaskUpdated }) => {
    const [taskData, setTaskData] = useState(initialData);
    const [showEditModal, setShowEditModal] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const [billingModal, setBillingModal] = useState(null);
    const [isBillingAction, setIsBillingAction] = useState(false);

    const [editForm, setEditForm] = useState({});
    const setEF = (patch) => setEditForm((prev) => ({ ...prev, ...patch }));

    const [isChangingStatus, setIsChangingStatus] = useState(false);
    const [statusModalOpen, setStatusModalOpen] = useState(false);

    const [services, setServices] = useState([]);
    const [showFirmViewModal, setShowFirmViewModal] = useState(false);
    const [viewFirm, setViewFirm] = useState(null);
    const [firmViewLoading, setFirmViewLoading] = useState(false);

    const loadFirmOptions = useCallback(async (search, page = 1) => {
        return searchFirmSelectOptions({
            search,
            page_no: page,
            limit: 30,
        });
    }, []);

    const loadCaOptions = useCallback(async (search) => {
        const res = await fetchCaOptions({ search, page: 1, limit: 50 });
        return (res?.data || []).map(toMemberSelectOption).filter(Boolean);
    }, []);

    const loadAgentOptions = useCallback(async (search) => {
        const res = await fetchAgentOptions({ search, page: 1, limit: 50 });
        return (res?.data || []).map(toMemberSelectOption).filter(Boolean);
    }, []);

    useEffect(() => {
        if (taskData) fetchServices();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (initialData) setTaskData(initialData);
    }, [initialData]);

    const fetchServices = async () => {
        try {
            const headers = getHeaders();
            if (!headers) return;
            const res = await fetch(`${API_BASE_URL}/service/list`, { headers });
            const data = await res.json();
            if (data?.success) setServices(data.data || []);
        } catch (err) {
            console.error(err);
        }
    };

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
                setTaskData((prev) => ({ ...prev, status: newStatus }));
                toast.success(`Status updated to "${STATUS_OPTIONS.find((s) => s.value === newStatus)?.label}"`);
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

    const openFirmViewModal = async () => {
        const firmId = taskData.firm?.firm_id;
        if (!firmId) {
            toast.error('Firm details not available');
            return;
        }

        // Prefer firm payload already returned by task details (full firm object)
        const mappedFromTask = mapFirmForView(taskData.firm);
        if (
            mappedFromTask?.pan ||
            mappedFromTask?.gst ||
            mappedFromTask?.address?.address_line_1 ||
            mappedFromTask?.firm_type
        ) {
            setViewFirm(mappedFromTask);
            setShowFirmViewModal(true);
            return;
        }

        const clientUsername = taskData.client?.username;
        if (!clientUsername) {
            toast.error('Client username missing — cannot load firm details');
            return;
        }

        setFirmViewLoading(true);
        setShowFirmViewModal(true);
        try {
            const headers = getHeaders();
            if (!headers) throw new Error('Missing authentication');
            const response = await fetch(
                `${API_BASE_URL}/client/details/firms/list?username=${encodeURIComponent(clientUsername)}`,
                { headers },
            );
            const json = await response.json().catch(() => ({}));
            if (!response.ok || !json.success) {
                throw new Error(json.message || 'Failed to load firm details');
            }
            const firm = (json.data?.firms || []).find((f) => f.firm_id === firmId);
            if (!firm) {
                throw new Error('Firm not found');
            }
            setViewFirm(mapFirmForView(firm));
        } catch (err) {
            console.error(err);
            toast.error(err.message || 'Failed to load firm details');
            setShowFirmViewModal(false);
            setViewFirm(null);
        } finally {
            setFirmViewLoading(false);
        }
    };

    const handleEditClick = () => {
        const firmOption = taskData.firm
            ? {
                value: taskData.firm.firm_id,
                label: taskData.firm.firm_name
                    ? (taskData.firm.pan_no
                        ? `${taskData.firm.firm_name} - ${taskData.firm.pan_no}`
                        : taskData.firm.firm_name)
                    : taskData.firm.firm_id,
                firm_name: taskData.firm.firm_name || '',
                pan_no: taskData.firm.pan_no || '',
                owner_name: taskData.firm.owner_name || taskData.firm.owner?.name || '',
            }
            : null;

        setEditForm({
            firm_id: taskData.firm?.firm_id || '',
            firmOption,
            service_id: taskData.service?.service_id || '',
            fees: taskData.charges?.fees ?? 0,
            has_ca: !!taskData.has_ca,
            ca_id: taskData.ca?.username || '',
            caOption: taskData.has_ca ? toMemberSelectOption(taskData.ca) : null,
            has_agent: !!taskData.has_agent,
            agent_id: taskData.agent?.username || '',
            agentOption: taskData.has_agent ? toMemberSelectOption(taskData.agent) : null,
            due_date: taskData.dates?.due_date ? formatDateForAPI(taskData.dates.due_date) : '',
            target_date: taskData.dates?.target_date ? formatDateForAPI(taskData.dates.target_date) : '',
        });
        setShowEditModal(true);
    };

    const closeEditModal = () => {
        if (!isSaving) setShowEditModal(false);
    };

    const handleConfirmBilling = async () => {
        const headers = getHeaders();
        if (!headers) {
            toast.error('Authentication required.');
            return;
        }

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
                    { id: toastId },
                );
                setTaskData((prev) => ({
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

    const handleSaveChanges = async () => {
        const headers = getHeaders();
        if (!headers) {
            toast.error('Authentication failed.');
            return;
        }
        if (!editForm.firm_id) {
            toast.error('Please select a firm.');
            return;
        }
        if (!editForm.service_id) {
            toast.error('Please select a service.');
            return;
        }
        if (editForm.has_ca && !editForm.ca_id) {
            toast.error('CA is enabled — please select a CA.');
            return;
        }
        if (editForm.has_agent && !editForm.agent_id) {
            toast.error('Agent is enabled — please select an agent.');
            return;
        }

        setIsSaving(true);
        const toastId = toast.loading('Saving changes…');
        try {
            const feesNum = Number(editForm.fees);
            const safeFees = Number.isFinite(feesNum) ? feesNum : 0;

            const payload = {
                firm_id: editForm.firm_id,
                service_id: editForm.service_id,
                fees: safeFees,
                ca: editForm.has_ca
                    ? { has_ca: true, ca_id: editForm.ca_id }
                    : { has_ca: false },
                agent: editForm.has_agent
                    ? { has_agent: true, agent_id: editForm.agent_id }
                    : { has_agent: false },
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
                setTaskData((prev) => ({
                    ...prev,
                    firm: editForm.firmOption
                        ? {
                            ...prev.firm,
                            firm_id: editForm.firm_id,
                            firm_name: editForm.firmOption.firm_name || editForm.firmOption.label,
                            owner_name: editForm.firmOption.owner_name,
                            pan_no: editForm.firmOption.pan_no,
                        }
                        : prev.firm,
                    service: {
                        ...prev.service,
                        service_id: editForm.service_id,
                        name: services.find((s) => s.service_id === editForm.service_id)?.name || prev.service?.name,
                    },
                    charges: {
                        ...prev.charges,
                        fees: safeFees,
                    },
                    dates: { ...prev.dates, due_date: editForm.due_date, target_date: editForm.target_date },
                    has_ca: editForm.has_ca,
                    ca: editForm.has_ca && editForm.caOption
                        ? {
                            username: editForm.caOption.username,
                            name: editForm.caOption.name,
                            mobile: editForm.caOption.mobile,
                            email: editForm.caOption.email,
                        }
                        : null,
                    has_agent: editForm.has_agent,
                    agent: editForm.has_agent && editForm.agentOption
                        ? {
                            username: editForm.agentOption.username,
                            name: editForm.agentOption.name,
                            mobile: editForm.agentOption.mobile,
                            email: editForm.agentOption.email,
                        }
                        : null,
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

    const fees = parseFloat(editForm.fees) || 0;

    const billGenerated =
        taskData.billing_status === 'complete' || taskData.billing_status === 'non billable';
    const billNotGenerated = taskData.status === 'complete' && taskData.billing_status === 'pending';
    const canViewFees = checkPermissionSync('task_fees_view');
    const feesBlur = !canViewFees ? 'blur-[3.5px] select-none' : '';

    const statusLabel =
        STATUS_OPTIONS.find((s) => s.value === taskData.status)?.label || taskData.status || '—';
    const statusClass = STATUS_COLORS[taskData.status] || 'bg-gray-100 text-gray-700';

    const billingChip =
        taskData.billing_status === 'complete'
            ? { label: 'Bill Generated', className: 'bg-green-100 text-green-700' }
            : taskData.billing_status === 'non billable'
                ? { label: 'Non Billable', className: 'bg-blue-100 text-blue-700' }
                : { label: 'Billing Pending', className: 'bg-amber-100 text-amber-700' };

    const clientName = taskData.client?.profile?.name || taskData.client?.name || '—';
    const clientUsername = taskData.client?.username || '';
    const clientMobile = taskData.client?.profile?.mobile || '—';
    const clientEmail = taskData.client?.profile?.email || '—';

    const serviceOptions = services.map((service) => ({
        value: service.service_id,
        label: service.name || 'Unnamed Service',
    }));

    const modalRootClass =
        'fixed inset-0 z-50 flex items-start justify-center overflow-hidden overscroll-none p-3 sm:p-4 pointer-events-none';
    const modalPanelClass =
        'relative z-[1] pointer-events-auto bg-white rounded-2xl shadow-2xl w-full my-2 sm:my-4 max-h-[calc(100vh-1.5rem)] sm:max-h-[calc(100vh-2rem)] overflow-hidden flex flex-col border border-gray-200';
    const modalBodyClass =
        'px-5 py-4 flex-1 min-h-0 overflow-y-auto overscroll-y-contain [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden';

    return (
        <>
            <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
                {/* Header */}
                <div className="flex flex-col gap-3 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white px-3 py-3 md:flex-row md:items-center md:justify-between md:px-4">
                    <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50">
                            <FiClipboard className="h-4 w-4 text-indigo-600" />
                        </div>
                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                                <h3 className="text-base font-bold text-gray-800 md:text-lg">Task Details</h3>
                                <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${statusClass}`}>
                                    {statusLabel}
                                </span>
                                <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${billingChip.className}`}>
                                    {billingChip.label}
                                </span>
                                {taskData.billing_status === 'complete' && taskData.invoice_no ? (
                                    <span className="inline-flex items-center gap-1 rounded border border-indigo-200 bg-indigo-50 px-2 py-0.5 font-mono text-xs font-semibold text-indigo-700">
                                        <FiHash className="h-3 w-3" />
                                        {taskData.invoice_no}
                                    </span>
                                ) : null}
                            </div>
                            <p className="mt-0.5 truncate text-xs text-gray-500">
                                {taskData.service?.name || 'Untitled service'}
                                {taskData.firm?.firm_name ? ` · ${taskData.firm.firm_name}` : ''}
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setStatusModalOpen(true)}
                            disabled={isChangingStatus}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 disabled:opacity-50"
                        >
                            {isChangingStatus ? (
                                <FiLoader className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                                <FiEdit className="h-3.5 w-3.5" />
                            )}
                            Change Status
                        </button>
                        <button
                            type="button"
                            onClick={handleEditClick}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
                        >
                            <FiEdit className="h-3.5 w-3.5" />
                            Edit Task
                        </button>
                    </div>
                </div>

                {/* Billing prompt */}
                {billNotGenerated && (
                    <div className="flex flex-col gap-3 border-b border-amber-200 bg-amber-50 px-3 py-3 sm:flex-row sm:items-center sm:justify-between md:px-4">
                        <div className="flex items-start gap-2">
                            <FiAlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                            <div>
                                <p className="text-sm font-semibold text-amber-800">Bill not generated</p>
                                <p className="text-xs text-amber-700">
                                    This task is complete. Generate a bill or mark it non-billable.
                                </p>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <button
                                type="button"
                                onClick={() => setBillingModal('bill')}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700"
                            >
                                <FiFileText className="h-3.5 w-3.5" />
                                Generate Bill
                            </button>
                            <button
                                type="button"
                                onClick={() => setBillingModal('nonbillable')}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-100"
                            >
                                <FiFileText className="h-3.5 w-3.5" />
                                Non Billable
                            </button>
                        </div>
                    </div>
                )}

                {/* Body */}
                <div className="space-y-3 p-3 md:p-4">
                    <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
                        <SectionBlock icon={FiBriefcase} title="Service & Firm">
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <MetaField label="Service">
                                    <span className="font-semibold text-gray-800">{taskData.service?.name || '—'}</span>
                                </MetaField>
                                <MetaField label="Firm">
                                    {taskData.firm?.firm_id && taskData.firm?.firm_name ? (
                                        <button
                                            type="button"
                                            onClick={openFirmViewModal}
                                            className={`text-left ${PROFILE_LINK_CLASS}`}
                                        >
                                            {taskData.firm.firm_name}
                                        </button>
                                    ) : (
                                        <span className="font-semibold text-gray-800">
                                            {taskData.firm?.firm_name || '—'}
                                        </span>
                                    )}
                                </MetaField>
                                <MetaField label="Compliance">
                                    <span className={`text-xs font-medium ${taskData.is_recurring ? 'text-green-600' : 'text-gray-400'}`}>
                                        {taskData.is_recurring ? 'Yes' : 'No'}
                                    </span>
                                </MetaField>
                                <MetaField label="Task ID">
                                    <span className="font-mono text-xs text-gray-700">{task_id || '—'}</span>
                                </MetaField>
                            </div>
                        </SectionBlock>

                        <SectionBlock icon={TbCurrencyRupee} title="Charges">
                            <div className="space-y-3">
                                <div className="flex items-center justify-between gap-2 border-b border-gray-100 pb-2">
                                    <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Fees</span>
                                    <span className={`inline-flex items-center rounded border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700 ${feesBlur}`}>
                                        {formatMoney(taskData.charges?.fees)}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between gap-2 border-b border-gray-100 pb-2">
                                    <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                        Tax ({taskData.charges?.tax_rate ?? 0}%)
                                    </span>
                                    <span className={`text-sm font-medium text-gray-700 ${feesBlur}`}>
                                        {formatMoney(taskData.charges?.tax_value)}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between gap-2">
                                    <span className="text-xs font-bold uppercase tracking-wide text-gray-700">Total</span>
                                    <span className={`text-sm font-bold text-gray-800 ${feesBlur}`}>
                                        {formatMoney(
                                            taskData.charges?.total ??
                                            Number(taskData.charges?.fees ?? 0) + Number(taskData.charges?.tax_value ?? 0),
                                        )}
                                    </span>
                                </div>
                            </div>
                        </SectionBlock>

                        <SectionBlock icon={FiCalendar} title="Dates">
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                                <MetaField label="Due Date">
                                    <span className="inline-flex items-center gap-1.5">
                                        <FiCalendar className="h-3.5 w-3.5 text-gray-400" />
                                        {formatDate(taskData.dates?.due_date)}
                                    </span>
                                </MetaField>
                                <MetaField label="Target Date">
                                    <span className="inline-flex items-center gap-1.5">
                                        <FiClock className="h-3.5 w-3.5 text-gray-400" />
                                        {formatDate(taskData.dates?.target_date)}
                                    </span>
                                </MetaField>
                                <MetaField label="Created" className="sm:col-span-2 lg:col-span-1 xl:col-span-2">
                                    {formatDate(taskData.dates?.create_date)}
                                </MetaField>
                            </div>
                        </SectionBlock>
                    </div>

                    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                        <SectionBlock icon={FiUser} title="Client">
                            <div className="flex items-start gap-3">
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 shadow-sm">
                                    <span className="text-xs font-bold text-white">
                                        {(clientName || '?').charAt(0).toUpperCase()}
                                    </span>
                                </div>
                                <div className="min-w-0 flex-1">
                                    {clientUsername && clientName !== '—' ? (
                                        <Link
                                            to={`/client/profile/${encodeURIComponent(clientUsername)}`}
                                            className={`text-sm ${PROFILE_LINK_CLASS}`}
                                        >
                                            {clientName}
                                        </Link>
                                    ) : (
                                        <p className="text-sm font-semibold text-gray-800">{clientName}</p>
                                    )}
                                    <ContactLine icon={FiPhone} value={clientMobile} />
                                    <ContactLine icon={FiMail} value={clientEmail} />
                                </div>
                            </div>
                        </SectionBlock>

                        <SectionBlock icon={FiUsers} title="Assignment">
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <MetaField label="CA">
                                    {taskData.has_ca && taskData.ca ? (
                                        <span className="inline-flex items-center rounded bg-violet-50 px-1.5 py-0.5 text-[10px] font-semibold text-violet-700">
                                            {taskData.ca.name || taskData.ca.username}
                                        </span>
                                    ) : (
                                        <span className="text-gray-400">Not assigned</span>
                                    )}
                                </MetaField>
                                <MetaField label="Agent">
                                    {taskData.has_agent && taskData.agent ? (
                                        <span className="inline-flex items-center rounded bg-sky-50 px-1.5 py-0.5 text-[10px] font-semibold text-sky-700">
                                            {taskData.agent.name || taskData.agent.username}
                                        </span>
                                    ) : (
                                        <span className="text-gray-400">Not assigned</span>
                                    )}
                                </MetaField>
                                <div className="sm:col-span-2">
                                    <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                                        Assigned Staff
                                    </p>
                                    {Array.isArray(taskData.staffs) && taskData.staffs.length > 0 ? (
                                        <div className="flex flex-wrap gap-1.5">
                                            {taskData.staffs.map((s, i) => (
                                                <span
                                                    key={i}
                                                    className="inline-flex items-center gap-1.5 rounded-full border border-indigo-100 bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700"
                                                >
                                                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white">
                                                        {(s.name || s.username || '?').charAt(0).toUpperCase()}
                                                    </span>
                                                    {s.name || s.username}
                                                </span>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-gray-400">No staff assigned</p>
                                    )}
                                </div>
                            </div>
                        </SectionBlock>
                    </div>

                    <SectionBlock icon={FiClock} title="Audit">
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2.5">
                                <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Created By</p>
                                <StaffProfileName user={taskData.create_by} />
                                <ContactLine icon={FiPhone} value={taskData.create_by?.mobile} />
                                <ContactLine icon={FiMail} value={taskData.create_by?.email} />
                            </div>
                            <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2.5">
                                <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Modified By</p>
                                <StaffProfileName user={taskData.modify_by} />
                                <ContactLine icon={FiPhone} value={taskData.modify_by?.mobile} />
                                <ContactLine icon={FiMail} value={taskData.modify_by?.email} />
                            </div>
                            <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2.5">
                                <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Completed By</p>
                                <StaffProfileName user={taskData.complete_by} />
                                <ContactLine icon={FiPhone} value={taskData.complete_by?.mobile} />
                                <ContactLine icon={FiMail} value={taskData.complete_by?.email} />
                            </div>
                        </div>
                    </SectionBlock>
                </div>
            </div>

            {/* Edit Modal */}
            {typeof document !== 'undefined' &&
                createPortal(
                    <AnimatePresence>
                        {showEditModal && (
                            <motion.div
                                key="edit-task-modal"
                                className={modalRootClass}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.2 }}
                            >
                                <motion.button
                                    type="button"
                                    aria-label="Close dialog"
                                    className="absolute inset-0 bg-black/50 backdrop-blur-sm pointer-events-auto"
                                    onClick={closeEditModal}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                />
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className={`${modalPanelClass} max-w-3xl`}
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <div className="flex shrink-0 items-center justify-between border-b border-gray-200 px-5 py-3.5">
                                        <div className="flex items-center gap-2.5">
                                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50">
                                                <FiEdit className="h-4 w-4 text-indigo-600" />
                                            </div>
                                            <div>
                                                <h3 className="text-sm font-bold text-gray-800">Edit Task</h3>
                                                <p className="text-xs text-gray-500">Update task information</p>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={closeEditModal}
                                            disabled={isSaving}
                                            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-40"
                                        >
                                            <FiX className="h-4 w-4" />
                                        </button>
                                    </div>

                                    <div className={modalBodyClass} style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                                        <div className="space-y-5">
                                            {billGenerated && (
                                                <div className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
                                                    <FiLock className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                                                    <div>
                                                        <p className="text-sm font-semibold text-amber-800">Bill already generated</p>
                                                        <p className="mt-0.5 text-xs text-amber-700">
                                                            Only Fees can be edited. Other fields are locked.
                                                        </p>
                                                    </div>
                                                </div>
                                            )}

                                            <div>
                                                <h4 className="mb-3 flex items-center gap-2 text-sm font-bold text-gray-800">
                                                    <FiBriefcase className="h-4 w-4 text-indigo-500" /> Firm & Service
                                                </h4>
                                                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                                    {billGenerated ? (
                                                        <LockedField
                                                            label="Firm"
                                                            value={editForm.firmOption?.label || taskData.firm?.firm_name}
                                                        />
                                                    ) : (
                                                        <CustomSelect
                                                            label="Firm"
                                                            required
                                                            loadOptions={loadFirmOptions}
                                                            value={editForm.firmOption || null}
                                                            onChange={(opt) =>
                                                                setEF({
                                                                    firm_id: opt?.value || '',
                                                                    firmOption: opt || null,
                                                                })
                                                            }
                                                            getOptionLabel={(opt) => opt?.label || ''}
                                                            getOptionValue={(opt) => opt?.value}
                                                            placeholder="Search firm by name or PAN…"
                                                            searchPlaceholder="Type to search firms…"
                                                            noOptionsMessage="No firms found"
                                                            minSearchLength={0}
                                                            isClearable
                                                        />
                                                    )}

                                                    {billGenerated ? (
                                                        <LockedField
                                                            label="Service"
                                                            value={
                                                                services.find((s) => s.service_id === editForm.service_id)?.name ||
                                                                taskData.service?.name
                                                            }
                                                        />
                                                    ) : (
                                                        <CustomSelect
                                                            label="Service"
                                                            required
                                                            options={serviceOptions}
                                                            value={optionByValue(serviceOptions, editForm.service_id || null)}
                                                            onChange={(opt) => setEF({ service_id: opt ? opt.value : '' })}
                                                            getOptionLabel={(opt) => opt.label}
                                                            getOptionValue={(opt) => opt.value}
                                                            placeholder="Select service"
                                                            searchPlaceholder="Search service..."
                                                            isClearable
                                                        />
                                                    )}
                                                </div>
                                            </div>

                                            {canViewFees && (
                                                <div>
                                                    <h4 className="mb-3 flex items-center gap-2 text-sm font-bold text-gray-800">
                                                        <TbCurrencyRupee className="h-4 w-4 text-indigo-500" /> Financials
                                                    </h4>
                                                    <div className="grid grid-cols-1 gap-3">
                                                        <div>
                                                            <label className="mb-1.5 block text-xs font-semibold text-gray-600">
                                                                Fees (₹) <span className="text-red-500">*</span>
                                                            </label>
                                                            <div className="relative">
                                                                <TbCurrencyRupee className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                                                                <input
                                                                    type="text"
                                                                    inputMode="decimal"
                                                                    value={editForm.fees}
                                                                    onChange={(e) => {
                                                                        const val = e.target.value;
                                                                        if (val === '' || /^\d*\.?\d*$/.test(val)) setEF({ fees: val });
                                                                    }}
                                                                    className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm text-gray-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
                                                                    placeholder="0.00"
                                                                />
                                                            </div>
                                                            <p className="mt-1.5 text-xs text-gray-500">
                                                                GST is applied automatically by the server when applicable for this branch.
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            <div>
                                                <h4 className="mb-3 flex items-center gap-2 text-sm font-bold text-gray-800">
                                                    <FiCalendar className="h-4 w-4 text-indigo-500" /> Dates
                                                </h4>
                                                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                                    {billGenerated ? (
                                                        <LockedField
                                                            label="Due Date"
                                                            value={editForm.due_date ? formatDate(editForm.due_date) : '—'}
                                                        />
                                                    ) : (
                                                        <div>
                                                            <label className="mb-1.5 block text-xs font-semibold text-gray-600">
                                                                Due Date
                                                            </label>
                                                            <DatePickerField
                                                                value={editForm.due_date}
                                                                onChange={(value) => setEF({ due_date: value || '' })}
                                                                placeholder="Select due date"
                                                                mode="single"
                                                                initialTab="single"
                                                                quickOptionKeys={['td', 'tom', 'n7', 'eom']}
                                                                buttonClassName="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
                                                            />
                                                        </div>
                                                    )}
                                                    {billGenerated ? (
                                                        <LockedField
                                                            label="Target Date"
                                                            value={editForm.target_date ? formatDate(editForm.target_date) : '—'}
                                                        />
                                                    ) : (
                                                        <div>
                                                            <label className="mb-1.5 block text-xs font-semibold text-gray-600">
                                                                Target Date
                                                            </label>
                                                            <DatePickerField
                                                                value={editForm.target_date}
                                                                onChange={(value) => setEF({ target_date: value || '' })}
                                                                placeholder="Select target date"
                                                                mode="single"
                                                                initialTab="single"
                                                                quickOptionKeys={['td', 'tom', 'n7', 'eom']}
                                                                buttonClassName="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div>
                                                <h4 className="mb-3 flex items-center gap-2 text-sm font-bold text-gray-800">
                                                    <FiUserCheck className="h-4 w-4 text-indigo-500" /> CA & Agent
                                                </h4>
                                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                                    <div>
                                                        <div className="mb-1.5 flex items-center justify-between">
                                                            <label className="text-xs font-semibold text-gray-600">CA</label>
                                                            <button
                                                                type="button"
                                                                role="switch"
                                                                aria-checked={editForm.has_ca}
                                                                disabled={billGenerated}
                                                                onClick={() => {
                                                                    const next = !editForm.has_ca;
                                                                    setEF({
                                                                        has_ca: next,
                                                                        ca_id: next ? editForm.ca_id : '',
                                                                        caOption: next ? editForm.caOption : null,
                                                                    });
                                                                }}
                                                                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 ${editForm.has_ca ? 'bg-indigo-600' : 'bg-gray-200'}`}
                                                            >
                                                                <span
                                                                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${editForm.has_ca ? 'translate-x-4' : 'translate-x-0'}`}
                                                                />
                                                            </button>
                                                        </div>
                                                        <AnimatePresence initial={false}>
                                                            {editForm.has_ca && (
                                                                <motion.div
                                                                    initial={{ height: 0, opacity: 0 }}
                                                                    animate={{ height: 'auto', opacity: 1 }}
                                                                    exit={{ height: 0, opacity: 0 }}
                                                                    transition={{ duration: 0.18 }}
                                                                    className="overflow-hidden"
                                                                >
                                                                    {billGenerated ? (
                                                                        <LockedField
                                                                            label=""
                                                                            value={editForm.caOption?.label || editForm.caOption?.name}
                                                                        />
                                                                    ) : (
                                                                        <CustomSelect
                                                                            loadOptions={loadCaOptions}
                                                                            value={editForm.caOption || null}
                                                                            onChange={(opt) =>
                                                                                setEF({
                                                                                    ca_id: opt?.value || '',
                                                                                    caOption: opt || null,
                                                                                })
                                                                            }
                                                                            getOptionLabel={(opt) => opt?.label || ''}
                                                                            getOptionValue={(opt) => opt?.value}
                                                                            placeholder="Search CA…"
                                                                            searchPlaceholder="Search by name or mobile…"
                                                                            noOptionsMessage="No CA found"
                                                                            isClearable
                                                                        />
                                                                    )}
                                                                </motion.div>
                                                            )}
                                                        </AnimatePresence>
                                                        {!editForm.has_ca && (
                                                            <p className="mt-1 text-xs text-gray-400">Enable toggle to assign a CA</p>
                                                        )}
                                                    </div>

                                                    <div>
                                                        <div className="mb-1.5 flex items-center justify-between">
                                                            <label className="text-xs font-semibold text-gray-600">Agent</label>
                                                            <button
                                                                type="button"
                                                                role="switch"
                                                                aria-checked={editForm.has_agent}
                                                                disabled={billGenerated}
                                                                onClick={() => {
                                                                    const next = !editForm.has_agent;
                                                                    setEF({
                                                                        has_agent: next,
                                                                        agent_id: next ? editForm.agent_id : '',
                                                                        agentOption: next ? editForm.agentOption : null,
                                                                    });
                                                                }}
                                                                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 ${editForm.has_agent ? 'bg-indigo-600' : 'bg-gray-200'}`}
                                                            >
                                                                <span
                                                                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${editForm.has_agent ? 'translate-x-4' : 'translate-x-0'}`}
                                                                />
                                                            </button>
                                                        </div>
                                                        <AnimatePresence initial={false}>
                                                            {editForm.has_agent && (
                                                                <motion.div
                                                                    initial={{ height: 0, opacity: 0 }}
                                                                    animate={{ height: 'auto', opacity: 1 }}
                                                                    exit={{ height: 0, opacity: 0 }}
                                                                    transition={{ duration: 0.18 }}
                                                                    className="overflow-hidden"
                                                                >
                                                                    {billGenerated ? (
                                                                        <LockedField
                                                                            label=""
                                                                            value={editForm.agentOption?.label || editForm.agentOption?.name}
                                                                        />
                                                                    ) : (
                                                                        <CustomSelect
                                                                            loadOptions={loadAgentOptions}
                                                                            value={editForm.agentOption || null}
                                                                            onChange={(opt) =>
                                                                                setEF({
                                                                                    agent_id: opt?.value || '',
                                                                                    agentOption: opt || null,
                                                                                })
                                                                            }
                                                                            getOptionLabel={(opt) => opt?.label || ''}
                                                                            getOptionValue={(opt) => opt?.value}
                                                                            placeholder="Search agent…"
                                                                            searchPlaceholder="Search by name or mobile…"
                                                                            noOptionsMessage="No agent found"
                                                                            isClearable
                                                                        />
                                                                    )}
                                                                </motion.div>
                                                            )}
                                                        </AnimatePresence>
                                                        {!editForm.has_agent && (
                                                            <p className="mt-1 text-xs text-gray-400">
                                                                Enable toggle to assign an agent
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex shrink-0 items-center justify-end gap-2 border-t border-gray-200 bg-gray-50 px-5 py-3">
                                        <button
                                            type="button"
                                            onClick={closeEditModal}
                                            disabled={isSaving}
                                            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleSaveChanges}
                                            disabled={isSaving}
                                            className="inline-flex min-w-[120px] items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                                        >
                                            {isSaving ? (
                                                <>
                                                    <FiLoader className="h-4 w-4 animate-spin" /> Saving…
                                                </>
                                            ) : (
                                                <>
                                                    <FiSave className="h-4 w-4" /> Save Changes
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>,
                    document.body,
                )}

            {/* Billing Modal */}
            {typeof document !== 'undefined' &&
                createPortal(
                    <AnimatePresence>
                        {billingModal && (
                            <motion.div
                                key="billing-modal"
                                className={`${modalRootClass} z-[60]`}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.2 }}
                            >
                                <motion.button
                                    type="button"
                                    aria-label="Close dialog"
                                    className="absolute inset-0 bg-black/50 backdrop-blur-sm pointer-events-auto"
                                    onClick={() => !isBillingAction && setBillingModal(null)}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                />
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className={`${modalPanelClass} max-w-md`}
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <div
                                        className={`flex shrink-0 items-center gap-2.5 px-5 py-3.5 ${billingModal === 'bill' ? 'bg-indigo-600' : 'bg-gray-700'}`}
                                    >
                                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20">
                                            <FiFileText className="h-4 w-4 text-white" />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-bold text-white">
                                                {billingModal === 'bill' ? 'Generate Bill' : 'Mark as Non-Billable'}
                                            </h3>
                                            <p className="text-xs text-white/70">This action cannot be undone</p>
                                        </div>
                                    </div>

                                    <div className={modalBodyClass} style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                                        {billingModal === 'bill' ? (
                                            <div className="space-y-3">
                                                <p className="text-sm font-medium text-gray-700">
                                                    An invoice will be created with these charges:
                                                </p>
                                                <div className="overflow-hidden rounded-lg border border-gray-200">
                                                    <div className="flex items-center justify-between border-b border-gray-100 px-3 py-2.5">
                                                        <span className="text-sm text-gray-500">Base Fees</span>
                                                        <span className={`text-sm font-semibold text-gray-800 ${feesBlur}`}>
                                                            {formatMoney(taskData.charges?.fees)}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center justify-between border-b border-gray-100 px-3 py-2.5">
                                                        <span className="text-sm text-gray-500">
                                                            Tax ({taskData.charges?.tax_rate ?? 0}%)
                                                        </span>
                                                        <span className={`text-sm font-semibold text-gray-800 ${feesBlur}`}>
                                                            {formatMoney(
                                                                taskData.charges?.tax_value ??
                                                                ((taskData.charges?.fees ?? 0) *
                                                                    (taskData.charges?.tax_rate ?? 0)) /
                                                                100,
                                                            )}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center justify-between bg-indigo-50 px-3 py-2.5">
                                                        <span className="text-sm font-bold text-indigo-800">Total</span>
                                                        <span className={`text-sm font-bold text-indigo-700 ${feesBlur}`}>
                                                            {formatMoney(
                                                                taskData.charges?.total ??
                                                                Number(taskData.charges?.fees ?? 0) +
                                                                (Number(taskData.charges?.fees ?? 0) *
                                                                    Number(taskData.charges?.tax_rate ?? 0)) /
                                                                100,
                                                            )}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                                                    <FiAlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
                                                    <p className="text-xs text-amber-700">
                                                        Once generated, the invoice cannot be reversed from here.
                                                    </p>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                <p className="text-sm font-medium text-gray-700">
                                                    This task will be marked as{' '}
                                                    <span className="font-semibold text-gray-800">non-billable</span>. No
                                                    invoice will be generated.
                                                </p>
                                                <div className="overflow-hidden rounded-lg border border-gray-200">
                                                    <div className="flex items-center justify-between border-b border-gray-100 px-3 py-2.5">
                                                        <span className="text-sm text-gray-500">Base Fees</span>
                                                        <span
                                                            className={`text-sm font-medium text-gray-400 line-through ${feesBlur}`}
                                                        >
                                                            {formatMoney(taskData.charges?.fees)}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center justify-between bg-gray-50 px-3 py-2.5">
                                                        <span className="text-sm font-bold text-gray-600">Total</span>
                                                        <span
                                                            className={`text-sm font-bold text-gray-400 line-through ${feesBlur}`}
                                                        >
                                                            {formatMoney(taskData.charges?.total ?? taskData.charges?.fees)}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                                                    <FiAlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
                                                    <p className="text-xs text-amber-700">
                                                        This closes the task without generating an invoice.
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex shrink-0 items-center justify-end gap-2 border-t border-gray-200 bg-gray-50 px-5 py-3">
                                        <button
                                            type="button"
                                            disabled={isBillingAction}
                                            onClick={() => setBillingModal(null)}
                                            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="button"
                                            disabled={isBillingAction}
                                            onClick={handleConfirmBilling}
                                            className={`inline-flex min-w-[120px] items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50 ${billingModal === 'bill' ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-gray-700 hover:bg-gray-800'}`}
                                        >
                                            {isBillingAction ? (
                                                <>
                                                    <FiLoader className="h-4 w-4 animate-spin" /> Processing…
                                                </>
                                            ) : billingModal === 'bill' ? (
                                                <>
                                                    <FiFileText className="h-4 w-4" /> Generate Bill
                                                </>
                                            ) : (
                                                <>
                                                    <FiFileText className="h-4 w-4" /> Confirm
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>,
                    document.body,
                )}

            <TaskStatusChange
                isOpen={statusModalOpen}
                onClose={() => setStatusModalOpen(false)}
                taskId={task_id}
                taskName={taskData.service?.name || ''}
                currentStatus={taskData.status || ''}
                onStatusChange={handleStatusChange}
                statusOptions={STATUS_OPTIONS.map((statusOption) => ({
                    value: statusOption.value,
                    name: statusOption.label,
                }))}
            />

            <FirmModalShell
                open={showFirmViewModal}
                onClose={() => {
                    setShowFirmViewModal(false);
                    setViewFirm(null);
                }}
                maxWidth="max-w-5xl"
                headerClass="bg-gradient-to-r from-slate-700 via-slate-800 to-slate-900"
                icon={FiEye}
                title="Firm details"
                subtitle={viewFirm?.firm_name || 'View firm information'}
                footer={
                    <div className="flex justify-end">
                        <button
                            type="button"
                            onClick={() => {
                                setShowFirmViewModal(false);
                                setViewFirm(null);
                            }}
                            className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                        >
                            Close
                        </button>
                    </div>
                }
            >
                {firmViewLoading ? (
                    <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500">
                        <FiLoader className="h-4 w-4 animate-spin" />
                        Loading firm details…
                    </div>
                ) : viewFirm ? (
                    <FirmViewDetails firm={viewFirm} formatDate={formatFirmViewDate} />
                ) : null}
            </FirmModalShell>
        </>
    );
};

export default DetailsTab;
