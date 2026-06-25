import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { FiArrowRight, FiSearch, FiX } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import API_BASE_URL from '../../utils/api-controller';
import getHeaders from '../../utils/get-headers';
import { DatePickerField } from '../PortalDatePicker';
import SearchablePickField, {
    assignableMemberExtractor,
    memberLabelMapping,
} from '../../pages/task-create/SearchablePickField';
import { approveServiceRequest } from '../../services/serviceRequestService';

const DATE_BTN_CLASS =
    'w-full min-h-[44px] pl-3 pr-3 py-2.5 text-sm text-gray-900 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white outline-none';

const formatMoney = (charges) => {
    const n = Number(charges?.amount ?? charges?.fees);
    if (!Number.isFinite(n)) return '—';
    return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
};

const MODAL_BODY_CLASS =
    'px-5 py-4 flex-1 min-h-0 overflow-y-auto overscroll-y-contain [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden';

export default function ServiceRequestApproveModal({ isOpen, request, onClose, onSuccess }) {
    const [dueDate, setDueDate] = useState('');
    const [officeNote, setOfficeNote] = useState('');
    const [selectedCa, setSelectedCa] = useState(null);
    const [selectedAgent, setSelectedAgent] = useState(null);
    const [caId, setCaId] = useState('');
    const [agentId, setAgentId] = useState('');
    const [allStaff, setAllStaff] = useState([]);
    const [selectedStaff, setSelectedStaff] = useState([]);
    const [staffFilter, setStaffFilter] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!isOpen) return;
        setDueDate('');
        setOfficeNote('');
        setSelectedCa(null);
        setSelectedAgent(null);
        setCaId('');
        setAgentId('');
        setSelectedStaff([]);
        setStaffFilter('');
    }, [isOpen, request?.request_id]);

    useEffect(() => {
        if (!isOpen) return;
        const loadStaff = async () => {
            const headers = getHeaders();
            if (!headers) return;
            const base = API_BASE_URL.replace(/\/$/, '');
            const all = [];
            let page = 1;
            for (;;) {
                const res = await fetch(
                    `${base}/settings/staff/list?search=&page=${page}&limit=100`,
                    { headers }
                );
                const json = await res.json();
                const list = Array.isArray(json?.data) ? json.data : [];
                all.push(...list);
                if (json?.meta?.is_last_page) break;
                page += 1;
            }
            setAllStaff(
                all.map((item) => ({
                    username: item.username,
                    name: item.profile?.name ?? item.username,
                    department: item.designation ?? '',
                }))
            );
        };
        loadStaff().catch(() => setAllStaff([]));
    }, [isOpen]);

    const availableStaff = useMemo(
        () => allStaff.filter((s) => !selectedStaff.some((x) => x.username === s.username)),
        [allStaff, selectedStaff]
    );

    const filteredAvailable = useMemo(() => {
        const q = staffFilter.trim().toLowerCase();
        if (!q) return availableStaff;
        return availableStaff.filter(
            (s) =>
                (s.name || '').toLowerCase().includes(q) ||
                (s.username || '').toLowerCase().includes(q) ||
                (s.department || '').toLowerCase().includes(q)
        );
    }, [availableStaff, staffFilter]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!request?.request_id) return;
        const due = String(dueDate || '').trim();
        if (!due) {
            toast.error('Due date is required');
            return;
        }

        const payload = {
            due_date: due,
            assignment: {
                staff: selectedStaff.map((s) => s.username),
                ca_id: caId || null,
                agent_id: agentId || null,
            },
        };

        const note = officeNote.trim();
        if (note) {
            payload.notes = { text: [note], attachments: [], voice: [] };
        }

        setSubmitting(true);
        try {
            const result = await approveServiceRequest(request.request_id, payload);
            if (!result?.success) {
                throw new Error(result?.message || 'Failed to approve request');
            }
            toast.success(result.message || 'Service request approved and task created');
            onSuccess?.(result);
            onClose?.();
        } catch (err) {
            toast.error(err.response?.data?.message || err.message || 'Failed to approve request');
        } finally {
            setSubmitting(false);
        }
    };

    if (!isOpen || !request) return null;

    const client = request.client || {};
    const firm = request.firm || {};
    const service = request.service || {};

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] flex items-start justify-center overflow-hidden overscroll-none p-3 sm:p-4 pointer-events-none"
        >
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm pointer-events-auto"
                onClick={() => !submitting && onClose?.()}
            />
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="relative z-[1] pointer-events-auto w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 my-2 sm:my-4 max-h-[calc(100vh-1.5rem)] sm:max-h-[calc(100vh-2rem)] overflow-hidden flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="px-5 py-3.5 border-b border-slate-200 flex items-start justify-between gap-3 shrink-0">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900">Approve service request</h2>
                        <p className="text-sm text-slate-500 mt-0.5">Creates a task for this client request</p>
                    </div>
                    <button
                        type="button"
                        onClick={() => !submitting && onClose?.()}
                        className="p-2 rounded-lg text-slate-400 hover:bg-slate-100"
                    >
                        <FiX className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col min-h-0 flex-1 overflow-hidden">
                    <div className={`${MODAL_BODY_CLASS} space-y-4`}>
                        <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4 text-sm space-y-2">
                            <div className="flex justify-between gap-2">
                                <span className="text-slate-500">Client</span>
                                <span className="font-medium text-slate-800 text-right">
                                    {client.name || client.username || '—'}
                                </span>
                            </div>
                            <div className="flex justify-between gap-2">
                                <span className="text-slate-500">Firm</span>
                                <span className="font-medium text-slate-800 text-right">
                                    {firm.name || firm.firm_name || '—'}
                                </span>
                            </div>
                            <div className="flex justify-between gap-2">
                                <span className="text-slate-500">Service</span>
                                <span className="font-medium text-slate-800 text-right">
                                    {service.name || '—'}
                                </span>
                            </div>
                            <div className="flex justify-between gap-2">
                                <span className="text-slate-500">Amount</span>
                                <span className="font-semibold text-indigo-700">
                                    {formatMoney(request.charges)}
                                </span>
                            </div>
                            {request.client_remark && (
                                <div className="pt-2 border-t border-indigo-100">
                                    <p className="text-xs font-semibold text-slate-500 uppercase">Client remark</p>
                                    <p className="text-slate-700 mt-1">{request.client_remark}</p>
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                Due date <span className="text-red-500">*</span>
                            </label>
                            <DatePickerField
                                value={dueDate}
                                onChange={(val) => setDueDate(typeof val === 'string' ? val : '')}
                                placeholder="Select due date"
                                mode="single"
                                initialTab="single"
                                quickOptionKeys={['td', 'tom', 'n7', 'eom']}
                                wrapperClassName="w-full block"
                                buttonClassName={DATE_BTN_CLASS}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Office note (optional)</label>
                            <textarea
                                value={officeNote}
                                onChange={(e) => setOfficeNote(e.target.value)}
                                rows={2}
                                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                                placeholder="Note added to the task..."
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <SearchablePickField
                                label="CA (optional)"
                                selected={selectedCa}
                                onClear={() => {
                                    setSelectedCa(null);
                                    setCaId('');
                                }}
                                onSelect={(item) => {
                                    setSelectedCa({
                                        username: item.username,
                                        name: item.profile?.name || item.username,
                                    });
                                    setCaId(item.username);
                                }}
                                listEndpoint="ca/list"
                                endpoint="ca/list"
                                valueKey="username"
                                labelMapping={memberLabelMapping}
                                dataExtractor={assignableMemberExtractor}
                                placeholder="Search CA..."
                                renderSelected={(s) => s.name}
                            />
                            <SearchablePickField
                                label="Agent (optional)"
                                selected={selectedAgent}
                                onClear={() => {
                                    setSelectedAgent(null);
                                    setAgentId('');
                                }}
                                onSelect={(item) => {
                                    setSelectedAgent({
                                        username: item.username,
                                        name: item.profile?.name || item.username,
                                    });
                                    setAgentId(item.username);
                                }}
                                listEndpoint="agent/list"
                                endpoint="agent/list"
                                valueKey="username"
                                labelMapping={memberLabelMapping}
                                dataExtractor={assignableMemberExtractor}
                                placeholder="Search agent..."
                                renderSelected={(s) => s.name}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Assign staff (optional)</label>
                            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                                <div className="sm:col-span-2 border border-slate-200 rounded-xl p-3 h-48 flex flex-col">
                                    <div className="relative mb-2">
                                        <FiSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <input
                                            type="text"
                                            value={staffFilter}
                                            onChange={(e) => setStaffFilter(e.target.value)}
                                            placeholder="Filter staff..."
                                            className="w-full pl-8 pr-2 py-1.5 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/30"
                                        />
                                    </div>
                                    <div className="flex-1 overflow-y-auto space-y-1">
                                        {filteredAvailable.map((emp) => (
                                            <button
                                                key={emp.username}
                                                type="button"
                                                onClick={() =>
                                                    setSelectedStaff((p) => [...p, emp])
                                                }
                                                className="w-full text-left px-2 py-1.5 text-sm rounded-lg hover:bg-indigo-50 border border-transparent hover:border-indigo-100"
                                            >
                                                {emp.name}
                                            </button>
                                        ))}
                                        {filteredAvailable.length === 0 && (
                                            <p className="text-xs text-slate-400 text-center py-4">No staff</p>
                                        )}
                                    </div>
                                </div>
                                <div className="sm:col-span-1 flex sm:flex-col items-center justify-center gap-2">
                                    <FiArrowRight className="hidden sm:block w-4 h-4 text-slate-300" />
                                </div>
                                <div className="sm:col-span-2 border border-slate-200 rounded-xl p-3 h-48 overflow-y-auto space-y-1">
                                    {selectedStaff.map((emp) => (
                                        <button
                                            key={emp.username}
                                            type="button"
                                            onClick={() =>
                                                setSelectedStaff((p) =>
                                                    p.filter((x) => x.username !== emp.username)
                                                )
                                            }
                                            className="w-full text-left px-2 py-1.5 text-sm rounded-lg bg-indigo-50 border border-indigo-100 hover:bg-red-50 hover:border-red-100"
                                        >
                                            {emp.name}
                                        </button>
                                    ))}
                                    {selectedStaff.length === 0 && (
                                        <p className="text-xs text-slate-400 text-center py-4">None selected</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="px-5 py-3 border-t border-slate-200 flex justify-end gap-2 shrink-0">
                        <button
                            type="button"
                            onClick={() => !submitting && onClose?.()}
                            disabled={submitting}
                            className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={submitting || !dueDate}
                            className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-60"
                        >
                            {submitting ? 'Approving…' : 'Approve & create task'}
                        </button>
                    </div>
                </form>
            </motion.div>
        </motion.div>
    );
}
