import React, { useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiBriefcase, FiEdit, FiList, FiPlus, FiTrash2 } from 'react-icons/fi';
import { SegmentedControl, inputClass } from '../../../components/Modals/WizardModalParts';
import CustomSelect from '../../../components/CustomSelect';
import { formatMoney, getServiceAmounts } from '../taskCreateConstants';
import {
    fetchTaskCreateServiceList,
    mapServiceListToSelectOptions,
    mapServiceToSelectOption,
} from '../taskCreateServiceList';

export default function SubtasksStep({
    subtasks,
    setSubtasks,
    subTaskForm,
    setSubTaskForm,
    showSubTaskForm,
    setShowSubTaskForm,
    addSubTask,
}) {
    const subTaskServiceValue = useMemo(() => {
        if (!subTaskForm.service_id) return null;
        return mapServiceToSelectOption({
            service_id: subTaskForm.service_id,
            name: subTaskForm.service_name,
            fees: subTaskForm.service_fees,
            gst_rate: subTaskForm.service_gst_rate,
            gst_value: subTaskForm.service_gst_value,
        });
    }, [
        subTaskForm.service_fees,
        subTaskForm.service_gst_rate,
        subTaskForm.service_gst_value,
        subTaskForm.service_id,
        subTaskForm.service_name,
    ]);

    const loadServiceOptions = useCallback(async (query) => {
        const result = await fetchTaskCreateServiceList({
            search: query,
            page_no: 1,
            limit: 100,
        });
        const rows = Array.isArray(result?.data) ? result.data : [];
        return mapServiceListToSelectOptions(rows);
    }, []);

    const renderServiceOption = (option) => {
        const { fees, gstRate, gstValue, total } = getServiceAmounts(option);
        const gstPart =
            gstValue > 0 ? ` · GST ${gstRate}% ₹${formatMoney(gstValue)}` : '';
        return (
            <div className="flex flex-col gap-0.5 min-w-0">
                <span className="font-medium truncate">{option.name}</span>
                <span className="text-xs text-gray-500 truncate">
                    {`₹${formatMoney(fees)}${gstPart} · Total ₹${formatMoney(total)}`}
                </span>
            </div>
        );
    };

    const resetSubTaskFields = (type) => ({
        type,
        service_id: '',
        service_name: '',
        service_fees: '',
        service_gst_rate: '',
        service_gst_value: '',
        manual_text: '',
    });

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-slate-600">
                    {subtasks.length
                        ? `${subtasks.length} sub task${subtasks.length === 1 ? '' : 's'} will be added to every task.`
                        : 'No sub tasks yet — this step is optional.'}
                </p>
                {!showSubTaskForm && (
                    <button type="button" onClick={() => setShowSubTaskForm(true)} className="ui-btn ui-btn-secondary ui-btn-sm">
                        <FiPlus className="h-3.5 w-3.5" />
                        Add sub task
                    </button>
                )}
            </div>

            <AnimatePresence initial={false}>
                {showSubTaskForm && (
                    <motion.div
                        className="overflow-visible rounded-xl border border-indigo-200 bg-indigo-50/40"
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                    >
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-indigo-100 px-4 py-3">
                            <p className="text-sm font-semibold text-slate-900">New sub task</p>
                            <SegmentedControl
                                value={subTaskForm.type}
                                onChange={(v) => setSubTaskForm(resetSubTaskFields(v))}
                                options={[
                                    { value: 'service', label: 'From a service', icon: <FiBriefcase className="h-3.5 w-3.5" /> },
                                    { value: 'manual', label: 'Custom text', icon: <FiEdit className="h-3.5 w-3.5" /> },
                                ]}
                            />
                        </div>
                        <div className="px-4 py-4">
                            {subTaskForm.type === 'service' ? (
                                <CustomSelect
                                    loadOptions={loadServiceOptions}
                                    defaultOptions
                                    minSearchLength={0}
                                    value={subTaskServiceValue}
                                    onChange={(option) => {
                                        if (!option) {
                                            setSubTaskForm((prev) => ({
                                                ...prev,
                                                service_id: '',
                                                service_name: '',
                                                service_fees: '',
                                                service_gst_rate: '',
                                                service_gst_value: '',
                                            }));
                                            return;
                                        }
                                        setSubTaskForm((prev) => ({
                                            ...prev,
                                            service_id: option.service_id,
                                            service_name: option.name,
                                            service_fees: option.fees,
                                            service_gst_rate: option.gst_rate,
                                            service_gst_value: option.gst_value,
                                        }));
                                    }}
                                    getOptionLabel={(option) => option.label}
                                    getOptionValue={(option) => option.value}
                                    renderOption={renderServiceOption}
                                    placeholder="Search and select a service..."
                                    searchPlaceholder="Search services..."
                                    noOptionsMessage="No branch services found"
                                    loadingMessage="Loading services..."
                                />
                            ) : (
                                <input
                                    type="text"
                                    value={subTaskForm.manual_text}
                                    onChange={(e) => setSubTaskForm((p) => ({ ...p, manual_text: e.target.value }))}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            if (subTaskForm.manual_text.trim()) addSubTask();
                                        }
                                    }}
                                    className={inputClass(false)}
                                    placeholder="e.g. Collect bank statements"
                                    autoFocus
                                />
                            )}
                        </div>
                        <div className="flex justify-end gap-2 px-4 pb-4">
                            <button type="button" onClick={() => setShowSubTaskForm(false)} className="ui-btn ui-btn-ghost ui-btn-sm">
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={addSubTask}
                                disabled={subTaskForm.type === 'service' ? !subTaskForm.service_id : !subTaskForm.manual_text.trim()}
                                className="ui-btn ui-btn-primary ui-btn-sm"
                            >
                                <FiPlus className="h-3.5 w-3.5" />
                                Add
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {subtasks.length > 0 ? (
                <ol className="m-0 list-none divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 p-0">
                    {subtasks.map((task, i) => (
                        <li key={task.id} className="flex items-center gap-3 bg-white px-4 py-3">
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 font-mono text-[11px] font-semibold text-slate-600">
                                {i + 1}
                            </span>
                            <span className="min-w-0 flex-1 truncate text-sm text-slate-800">{task.description}</span>
                            <span
                                className={`hidden shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold sm:inline ${
                                    task.type === 'service' ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-100 text-slate-600'
                                }`}
                            >
                                {task.type === 'service' ? 'Service' : 'Custom'}
                            </span>
                            <button
                                type="button"
                                onClick={() => setSubtasks((p) => p.filter((t) => t.id !== task.id))}
                                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                                aria-label="Remove sub task"
                            >
                                <FiTrash2 className="h-4 w-4" />
                            </button>
                        </li>
                    ))}
                </ol>
            ) : (
                !showSubTaskForm && (
                    <button
                        type="button"
                        onClick={() => setShowSubTaskForm(true)}
                        className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 px-4 py-10 text-center transition-colors hover:border-indigo-300 hover:bg-indigo-50/40"
                    >
                        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
                            <FiList className="h-5 w-5" />
                        </span>
                        <span className="text-sm font-medium text-slate-700">Add a checklist for this task</span>
                        <span className="text-xs text-slate-500">Pick a service or type your own sub task</span>
                    </button>
                )
            )}
        </div>
    );
}
