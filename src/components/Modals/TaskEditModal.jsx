import React, { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
    FiCalendar,
    FiEdit,
    FiLoader,
    FiLock,
    FiSave,
    FiUserCheck,
    FiX,
} from 'react-icons/fi';
import { TbCurrencyRupee } from 'react-icons/tb';
import { toast } from 'react-hot-toast';
import API_BASE_URL from '../../utils/api-controller';
import getHeaders from '../../utils/get-headers';
import { checkPermissionSync } from '../../utils/permission-helper';
import CustomSelect from '../CustomSelect';
import { DatePickerField } from '../PortalDatePicker';
import {
    fetchCaOptions,
    fetchAgentOptions,
} from '../../services/complianceService';

const MODAL_BODY_CLASS =
    'px-5 py-4 flex-1 min-h-0 overflow-y-auto overscroll-y-contain [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden';

const formatDate = (dateString) => {
    if (!dateString) return '—';
    try {
        return new Date(dateString).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
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

const LockedField = ({ label, value }) => (
    <div>
        {label ? (
            <label className="mb-1.5 block text-xs font-semibold text-gray-600">{label}</label>
        ) : null}
        <div className="flex min-h-[40px] items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
            <FiLock className="h-3.5 w-3.5 shrink-0 text-gray-400" />
            <span className="truncate text-sm font-medium text-gray-600">{value || '—'}</span>
        </div>
    </div>
);

const buildInitialForm = (taskData) => ({
    fees: taskData?.charges?.fees ?? 0,
    has_ca: !!taskData?.has_ca,
    ca_id: taskData?.ca?.username || '',
    caOption: taskData?.has_ca ? toMemberSelectOption(taskData.ca) : null,
    has_agent: !!taskData?.has_agent,
    agent_id: taskData?.agent?.username || '',
    agentOption: taskData?.has_agent ? toMemberSelectOption(taskData.agent) : null,
    due_date: taskData?.dates?.due_date ? formatDateForAPI(taskData.dates.due_date) : '',
    target_date: taskData?.dates?.target_date
        ? formatDateForAPI(taskData.dates.target_date)
        : '',
    complete_date: taskData?.dates?.complete_date
        ? formatDateForAPI(taskData.dates.complete_date)
        : '',
});

export default function TaskEditModal({ isOpen, onClose, taskId, taskData, onSaved }) {
    const [form, setForm] = useState({});
    const [isSaving, setIsSaving] = useState(false);

    const setEF = (patch) => setForm((prev) => ({ ...prev, ...patch }));

    const billGenerated =
        taskData?.billing_status === 'complete' || taskData?.billing_status === 'non billable';
    const isTaskComplete = String(taskData?.status || '').toLowerCase() === 'complete';
    const canChangeCompleteDate =
        isTaskComplete && checkPermissionSync('task_complete_date_change');
    const canViewFees = checkPermissionSync('task_fees_view');

    const loadCaOptions = useCallback(async (search) => {
        const res = await fetchCaOptions({ search, page: 1, limit: 50 });
        return (res?.data || []).map(toMemberSelectOption).filter(Boolean);
    }, []);

    const loadAgentOptions = useCallback(async (search) => {
        const res = await fetchAgentOptions({ search, page: 1, limit: 50 });
        return (res?.data || []).map(toMemberSelectOption).filter(Boolean);
    }, []);

    useEffect(() => {
        if (isOpen && taskData) {
            setForm(buildInitialForm(taskData));
        }
    }, [isOpen, taskData]);

    useEffect(() => {
        if (!isOpen) return undefined;
        const onKey = (e) => {
            if (e.key === 'Escape' && !isSaving) onClose?.();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [isOpen, isSaving, onClose]);

    const handleClose = () => {
        if (!isSaving) onClose?.();
    };

    const handleSave = async () => {
        const headers = getHeaders();
        if (!headers) {
            toast.error('Authentication failed.');
            return;
        }
        if (form.has_ca && !form.ca_id) {
            toast.error('CA is enabled — please select a CA.');
            return;
        }
        if (form.has_agent && !form.agent_id) {
            toast.error('Agent is enabled — please select an agent.');
            return;
        }

        setIsSaving(true);
        const toastId = toast.loading('Saving changes…');
        try {
            const feesNum = Number(form.fees);
            const safeFees = Number.isFinite(feesNum) ? feesNum : 0;

            const payload = {
                fees: safeFees,
                ca: form.has_ca ? { has_ca: true, ca_id: form.ca_id } : { has_ca: false },
                agent: form.has_agent
                    ? { has_agent: true, agent_id: form.agent_id }
                    : { has_agent: false },
                due_date: form.due_date || '',
                target_date: form.target_date || '',
            };

            if (canChangeCompleteDate) {
                if (!form.complete_date) {
                    toast.error('Complete date is required.', { id: toastId });
                    setIsSaving(false);
                    return;
                }
                payload.complete_date = form.complete_date;
            }

            const res = await fetch(`${API_BASE_URL}/task/edit/${taskId}`, {
                method: 'PUT',
                headers: { ...headers, 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const data = await res.json();

            if (data.success) {
                toast.success('Task updated successfully', { id: toastId });
                onSaved?.({
                    charges: { fees: safeFees },
                    dates: {
                        due_date: form.due_date,
                        target_date: form.target_date,
                        ...(canChangeCompleteDate ? { complete_date: form.complete_date } : {}),
                    },
                    has_ca: form.has_ca,
                    ca:
                        form.has_ca && form.caOption
                            ? {
                                  username: form.caOption.username,
                                  name: form.caOption.name,
                                  mobile: form.caOption.mobile,
                                  email: form.caOption.email,
                              }
                            : null,
                    has_agent: form.has_agent,
                    agent:
                        form.has_agent && form.agentOption
                            ? {
                                  username: form.agentOption.username,
                                  name: form.agentOption.name,
                                  mobile: form.agentOption.mobile,
                                  email: form.agentOption.email,
                              }
                            : null,
                });
                onClose?.();
            } else {
                toast.error(data.message || 'Failed to update task', { id: toastId });
            }
        } catch (err) {
            toast.error(err.message || 'An error occurred', { id: toastId });
        } finally {
            setIsSaving(false);
        }
    };

    if (typeof document === 'undefined') return null;

    return createPortal(
        <AnimatePresence>
            {isOpen ? (
                <motion.div
                    key="task-edit-modal"
                    className="fixed inset-0 z-[210] flex items-start justify-center overflow-hidden overscroll-none p-3 sm:p-4 pointer-events-none"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                >
                    <button
                        type="button"
                        aria-label="Close dialog"
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm pointer-events-auto"
                        onClick={handleClose}
                        disabled={isSaving}
                    />
                    <motion.div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="task-edit-modal-title"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="relative z-[1] pointer-events-auto my-2 flex max-h-[calc(100vh-1.5rem)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl sm:my-4 sm:max-h-[calc(100vh-2rem)]"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-gray-100 bg-gradient-to-r from-indigo-600 to-indigo-700 px-5 py-3.5 text-white">
                            <div className="flex min-w-0 items-center gap-2.5">
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/15">
                                    <FiEdit className="h-4 w-4" />
                                </div>
                                <div className="min-w-0">
                                    <h2
                                        id="task-edit-modal-title"
                                        className="m-0 truncate text-base font-bold"
                                    >
                                        Edit Task
                                    </h2>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={handleClose}
                                disabled={isSaving}
                                className="shrink-0 rounded-lg p-1.5 text-white/90 hover:bg-white/10 hover:text-white disabled:opacity-50"
                                aria-label="Close"
                            >
                                <FiX className="h-5 w-5" />
                            </button>
                        </div>

                        <div
                            className={MODAL_BODY_CLASS}
                            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                        >
                            <div className="space-y-5">
                                {billGenerated ? (
                                    <div className="flex items-center gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
                                        <FiLock className="h-4 w-4 shrink-0 text-amber-600" />
                                        <p className="text-sm font-semibold text-amber-800">
                                            Bill already generated
                                        </p>
                                    </div>
                                ) : null}

                                {canViewFees ? (
                                    <section>
                                        <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-gray-800">
                                            <TbCurrencyRupee className="h-4 w-4 text-indigo-500" />
                                            Financials
                                        </h3>
                                        <div>
                                            <label className="mb-1.5 block text-xs font-semibold text-gray-600">
                                                Fees (₹) <span className="text-red-500">*</span>
                                            </label>
                                            <div className="relative max-w-xs">
                                                <TbCurrencyRupee className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                                                <input
                                                    type="text"
                                                    inputMode="decimal"
                                                    value={form.fees}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        if (val === '' || /^\d*\.?\d*$/.test(val)) {
                                                            setEF({ fees: val });
                                                        }
                                                    }}
                                                    className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm text-gray-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
                                                    placeholder="0.00"
                                                />
                                            </div>
                                        </div>
                                    </section>
                                ) : null}

                                <section>
                                    <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-gray-800">
                                        <FiCalendar className="h-4 w-4 text-indigo-500" />
                                        Dates
                                    </h3>
                                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                        {billGenerated ? (
                                            <LockedField
                                                label="Due Date"
                                                value={
                                                    form.due_date ? formatDate(form.due_date) : '—'
                                                }
                                            />
                                        ) : (
                                            <div>
                                                <label className="mb-1.5 block text-xs font-semibold text-gray-600">
                                                    Due Date
                                                </label>
                                                <DatePickerField
                                                    value={form.due_date}
                                                    onChange={(value) =>
                                                        setEF({ due_date: value || '' })
                                                    }
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
                                                value={
                                                    form.target_date
                                                        ? formatDate(form.target_date)
                                                        : '—'
                                                }
                                            />
                                        ) : (
                                            <div>
                                                <label className="mb-1.5 block text-xs font-semibold text-gray-600">
                                                    Target Date
                                                </label>
                                                <DatePickerField
                                                    value={form.target_date}
                                                    onChange={(value) =>
                                                        setEF({ target_date: value || '' })
                                                    }
                                                    placeholder="Select target date"
                                                    mode="single"
                                                    initialTab="single"
                                                    quickOptionKeys={['td', 'tom', 'n7', 'eom']}
                                                    buttonClassName="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
                                                />
                                            </div>
                                        )}
                                        {isTaskComplete ? (
                                            canChangeCompleteDate ? (
                                                <div>
                                                    <label className="mb-1.5 block text-xs font-semibold text-gray-600">
                                                        Complete Date
                                                    </label>
                                                    <DatePickerField
                                                        value={form.complete_date}
                                                        onChange={(value) =>
                                                            setEF({ complete_date: value || '' })
                                                        }
                                                        placeholder="Select complete date"
                                                        mode="single"
                                                        initialTab="single"
                                                        quickOptionKeys={['td', 'yd', 'n7', 'eom']}
                                                        buttonClassName="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
                                                    />
                                                </div>
                                            ) : (
                                                <LockedField
                                                    label="Complete Date"
                                                    value={
                                                        form.complete_date
                                                            ? formatDate(form.complete_date)
                                                            : '—'
                                                    }
                                                />
                                            )
                                        ) : null}
                                    </div>
                                </section>

                                <section>
                                    <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-gray-800">
                                        <FiUserCheck className="h-4 w-4 text-indigo-500" />
                                        CA & Agent
                                    </h3>
                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                        <div>
                                            <div className="mb-1.5 flex items-center justify-between">
                                                <label className="text-xs font-semibold text-gray-600">
                                                    CA
                                                </label>
                                                <button
                                                    type="button"
                                                    role="switch"
                                                    aria-checked={form.has_ca}
                                                    disabled={billGenerated}
                                                    onClick={() => {
                                                        const next = !form.has_ca;
                                                        setEF({
                                                            has_ca: next,
                                                            ca_id: next ? form.ca_id : '',
                                                            caOption: next ? form.caOption : null,
                                                        });
                                                    }}
                                                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 ${form.has_ca ? 'bg-indigo-600' : 'bg-gray-200'}`}
                                                >
                                                    <span
                                                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${form.has_ca ? 'translate-x-4' : 'translate-x-0'}`}
                                                    />
                                                </button>
                                            </div>
                                            <AnimatePresence initial={false}>
                                                {form.has_ca ? (
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
                                                                value={
                                                                    form.caOption?.label ||
                                                                    form.caOption?.name
                                                                }
                                                            />
                                                        ) : (
                                                            <CustomSelect
                                                                loadOptions={loadCaOptions}
                                                                value={form.caOption || null}
                                                                onChange={(opt) =>
                                                                    setEF({
                                                                        ca_id: opt?.value || '',
                                                                        caOption: opt || null,
                                                                    })
                                                                }
                                                                getOptionLabel={(opt) =>
                                                                    opt?.label || ''
                                                                }
                                                                getOptionValue={(opt) => opt?.value}
                                                                placeholder="Search CA…"
                                                                searchPlaceholder="Search by name or mobile…"
                                                                noOptionsMessage="No CA found"
                                                                isClearable
                                                            />
                                                        )}
                                                    </motion.div>
                                                ) : null}
                                            </AnimatePresence>
                                        </div>

                                        <div>
                                            <div className="mb-1.5 flex items-center justify-between">
                                                <label className="text-xs font-semibold text-gray-600">
                                                    Agent
                                                </label>
                                                <button
                                                    type="button"
                                                    role="switch"
                                                    aria-checked={form.has_agent}
                                                    disabled={billGenerated}
                                                    onClick={() => {
                                                        const next = !form.has_agent;
                                                        setEF({
                                                            has_agent: next,
                                                            agent_id: next ? form.agent_id : '',
                                                            agentOption: next
                                                                ? form.agentOption
                                                                : null,
                                                        });
                                                    }}
                                                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 ${form.has_agent ? 'bg-indigo-600' : 'bg-gray-200'}`}
                                                >
                                                    <span
                                                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${form.has_agent ? 'translate-x-4' : 'translate-x-0'}`}
                                                    />
                                                </button>
                                            </div>
                                            <AnimatePresence initial={false}>
                                                {form.has_agent ? (
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
                                                                value={
                                                                    form.agentOption?.label ||
                                                                    form.agentOption?.name
                                                                }
                                                            />
                                                        ) : (
                                                            <CustomSelect
                                                                loadOptions={loadAgentOptions}
                                                                value={form.agentOption || null}
                                                                onChange={(opt) =>
                                                                    setEF({
                                                                        agent_id: opt?.value || '',
                                                                        agentOption: opt || null,
                                                                    })
                                                                }
                                                                getOptionLabel={(opt) =>
                                                                    opt?.label || ''
                                                                }
                                                                getOptionValue={(opt) => opt?.value}
                                                                placeholder="Search agent…"
                                                                searchPlaceholder="Search by name or mobile…"
                                                                noOptionsMessage="No agent found"
                                                                isClearable
                                                            />
                                                        )}
                                                    </motion.div>
                                                ) : null}
                                            </AnimatePresence>
                                        </div>
                                    </div>
                                </section>
                            </div>
                        </div>

                        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-gray-100 bg-gray-50 px-5 py-3">
                            <button
                                type="button"
                                onClick={handleClose}
                                disabled={isSaving}
                                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleSave}
                                disabled={isSaving}
                                className="inline-flex min-w-[120px] items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                            >
                                {isSaving ? (
                                    <>
                                        <FiLoader className="h-4 w-4 animate-spin" />
                                        Saving…
                                    </>
                                ) : (
                                    <>
                                        <FiSave className="h-4 w-4" />
                                        Save Changes
                                    </>
                                )}
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            ) : null}
        </AnimatePresence>,
        document.body,
    );
}
