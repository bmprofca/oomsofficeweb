import React, { useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiBriefcase, FiEdit, FiPlus, FiTrash2 } from 'react-icons/fi';
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
            <div className="flex justify-between items-center">
                <label className="block text-sm font-medium text-gray-700">Sub tasks</label>
                <motion.button
                    type="button"
                    onClick={() => setShowSubTaskForm(true)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium"
                    whileTap={{ scale: 0.98 }}
                >
                    <FiPlus className="w-4 h-4" />
                    Add Subtask
                </motion.button>
            </div>

            <AnimatePresence>
                {showSubTaskForm && (
                    <motion.div
                        className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/60 to-white shadow-sm overflow-visible"
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                    >
                        <div className="px-5 pt-4 pb-3 border-b border-indigo-100">
                            <div className="inline-flex rounded-xl bg-white border border-gray-200 shadow-sm p-1 gap-1">
                                {[
                                    { id: 'service', label: 'Service', icon: <FiBriefcase className="w-3.5 h-3.5" /> },
                                    { id: 'manual', label: 'Manual Text', icon: <FiEdit className="w-3.5 h-3.5" /> },
                                ].map((tab) => (
                                    <button
                                        key={tab.id}
                                        type="button"
                                        onClick={() => setSubTaskForm(resetSubTaskFields(tab.id))}
                                        className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                            subTaskForm.type === tab.id
                                                ? 'bg-indigo-600 text-white shadow-sm'
                                                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                                        }`}
                                    >
                                        {tab.icon}
                                        {tab.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="px-5 py-4">
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
                                    onChange={(e) =>
                                        setSubTaskForm((p) => ({ ...p, manual_text: e.target.value }))
                                    }
                                    className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                                    placeholder="Enter subtask description..."
                                />
                            )}
                        </div>
                        <div className="px-5 pb-4 flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setShowSubTaskForm(false)}
                                className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 rounded-lg"
                            >
                                Cancel
                            </button>
                            <motion.button
                                type="button"
                                onClick={addSubTask}
                                disabled={
                                    subTaskForm.type === 'service'
                                        ? !subTaskForm.service_id
                                        : !subTaskForm.manual_text.trim()
                                }
                                className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white rounded-lg"
                                whileTap={{ scale: 0.97 }}
                            >
                                <FiPlus className="w-3.5 h-3.5" />
                                Add Subtask
                            </motion.button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {subtasks.length > 0 && (
                <div className="overflow-x-auto rounded-xl border border-gray-200">
                    <table className="w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="p-4 text-left text-xs font-semibold text-gray-500 uppercase">Description</th>
                                <th className="p-4 w-16" />
                            </tr>
                        </thead>
                        <tbody>
                            {subtasks.map((task) => (
                                <tr key={task.id} className="border-b border-gray-100 hover:bg-gray-50">
                                    <td className="p-4 text-sm text-gray-800">
                                        <div className="flex items-center gap-2">
                                            <span>{task.description}</span>
                                            {task.type === 'service' && (
                                                <span className="bg-indigo-100 text-indigo-800 px-2 py-1 rounded text-xs">Service</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <button
                                            type="button"
                                            onClick={() => setSubtasks((p) => p.filter((t) => t.id !== task.id))}
                                            className="text-red-500 hover:text-red-700 p-1"
                                        >
                                            <FiTrash2 className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
