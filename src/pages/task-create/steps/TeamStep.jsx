import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { FiArrowLeft, FiArrowRight, FiSearch } from 'react-icons/fi';
import CustomSelect from '../../../components/CustomSelect';
import { formatMemberSelectedLabel } from '../SearchablePickField';

function toMemberOption(member) {
    if (!member?.username) return null;
    return {
        label: formatMemberSelectedLabel(member),
        value: member.username,
        username: member.username,
        name: member.name,
        mobile: member.mobile,
        balance: member.balance,
    };
}

export default function TeamStep({
    form,
    setForm,
    caList = [],
    agentList = [],
    selectedCa,
    setSelectedCa,
    selectedAgent,
    setSelectedAgent,
    allEmployees,
    selectedEmployees,
    employeeSearchQuery,
    setEmployeeSearchQuery,
    filteredAvailableEmployees,
    addEmployee,
    removeEmployee,
    addAllEmployees,
    removeAllEmployees,
    staffLoading,
    lockedFields = {},
}) {
    const caLocked = Boolean(lockedFields.ca);
    const agentLocked = Boolean(lockedFields.agent);

    const caOptions = useMemo(
        () => caList.map((member) => toMemberOption(member)).filter(Boolean),
        [caList]
    );

    const agentOptions = useMemo(
        () => agentList.map((member) => toMemberOption(member)).filter(Boolean),
        [agentList]
    );

    const caValue = useMemo(() => {
        if (!selectedCa) return null;
        return (
            caOptions.find((option) => option.value === selectedCa.username) ||
            toMemberOption(selectedCa)
        );
    }, [caOptions, selectedCa]);

    const agentValue = useMemo(() => {
        if (!selectedAgent) return null;
        return (
            agentOptions.find((option) => option.value === selectedAgent.username) ||
            toMemberOption(selectedAgent)
        );
    }, [agentOptions, selectedAgent]);

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <CustomSelect
                    label="CA"
                    options={caOptions}
                    value={caValue}
                    onChange={(option) => {
                        if (caLocked) return;
                        if (!option) {
                            setSelectedCa(null);
                            setForm((prev) => ({ ...prev, ca: '' }));
                            return;
                        }
                        setSelectedCa({
                            username: option.username,
                            name: option.name,
                            mobile: option.mobile,
                            balance: option.balance,
                        });
                        setForm((prev) => ({ ...prev, ca: option.username }));
                    }}
                    getOptionLabel={(option) => option.label}
                    getOptionValue={(option) => option.value}
                    placeholder="Search CA by name or mobile..."
                    searchPlaceholder="Search CA..."
                    noOptionsMessage="No CA found"
                    isDisabled={caLocked}
                    isClearable={!caLocked}
                />
                <CustomSelect
                    label="Agent"
                    options={agentOptions}
                    value={agentValue}
                    onChange={(option) => {
                        if (agentLocked) return;
                        if (!option) {
                            setSelectedAgent(null);
                            setForm((prev) => ({ ...prev, agent: '' }));
                            return;
                        }
                        setSelectedAgent({
                            username: option.username,
                            name: option.name,
                            mobile: option.mobile,
                            balance: option.balance,
                        });
                        setForm((prev) => ({ ...prev, agent: option.username }));
                    }}
                    getOptionLabel={(option) => option.label}
                    getOptionValue={(option) => option.value}
                    placeholder="Search agent by name or mobile..."
                    searchPlaceholder="Search agent..."
                    noOptionsMessage="No agent found"
                    isDisabled={agentLocked}
                    isClearable={!agentLocked}
                />
            </div>

            <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">Employees</label>
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                    <div className="lg:col-span-2">
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 min-h-[420px] flex flex-col overflow-hidden">
                            <div className="flex justify-between items-center mb-3 shrink-0">
                                <h3 className="text-sm font-medium text-gray-700">Available Employees</h3>
                                <span className="text-sm text-gray-500 bg-white px-2 py-1 rounded">{allEmployees.length}</span>
                            </div>
                            <div className="relative mb-2 shrink-0">
                                <FiSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                                <input
                                    type="text"
                                    value={employeeSearchQuery}
                                    onChange={(e) => setEmployeeSearchQuery(e.target.value)}
                                    placeholder="Search by name, mobile, email, designation..."
                                    className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                                />
                            </div>
                            <div className="flex-1 min-h-0 overflow-y-auto space-y-2">
                                {staffLoading && (
                                    <div className="text-center text-gray-500 text-sm py-8">Loading staff...</div>
                                )}
                                {!staffLoading && filteredAvailableEmployees.length === 0 && (
                                    <div className="text-center text-gray-400 text-sm py-8">
                                        {employeeSearchQuery.trim() ? 'No matching employees' : 'No employees available'}
                                    </div>
                                )}
                                {!staffLoading &&
                                    filteredAvailableEmployees.map((employee) => (
                                        <div
                                            key={employee.username}
                                            onClick={() => addEmployee(employee)}
                                            className="p-3 bg-white border border-gray-200 rounded-lg cursor-pointer hover:bg-indigo-50 hover:border-indigo-200 transition-colors"
                                        >
                                            <div className="font-medium text-sm text-gray-800">{employee.name}</div>
                                            <div className="text-sm text-gray-400">
                                                {[employee.department, employee.mobile].filter(Boolean).join(' • ') || '—'}
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        </div>
                    </div>
                    <div className="lg:col-span-1 flex lg:flex-col justify-center items-center gap-3">
                        <motion.button
                            type="button"
                            onClick={addAllEmployees}
                            disabled={filteredAvailableEmployees.length === 0}
                            className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                            whileTap={{ scale: 0.9 }}
                        >
                            <FiArrowRight className="w-4 h-4" />
                        </motion.button>
                        <motion.button
                            type="button"
                            onClick={removeAllEmployees}
                            disabled={selectedEmployees.length === 0}
                            className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                            whileTap={{ scale: 0.9 }}
                        >
                            <FiArrowLeft className="w-4 h-4" />
                        </motion.button>
                    </div>
                    <div className="lg:col-span-2">
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 min-h-[420px] flex flex-col overflow-hidden">
                            <div className="flex justify-between items-center mb-3 shrink-0">
                                <h3 className="text-sm font-medium text-gray-700">Selected Employees</h3>
                                <span className="text-sm text-gray-500 bg-white px-2 py-1 rounded">{selectedEmployees.length}</span>
                            </div>
                            <div className="flex-1 min-h-0 overflow-y-auto space-y-2">
                                {selectedEmployees.map((employee) => (
                                    <div
                                        key={employee.username}
                                        onClick={() => removeEmployee(employee)}
                                        className="p-3 bg-white border border-indigo-200 rounded-lg cursor-pointer hover:bg-red-50 hover:border-red-200 transition-colors"
                                    >
                                        <div className="font-medium text-sm text-gray-800">{employee.name}</div>
                                        <div className="text-sm text-gray-400">
                                            {[employee.department, employee.mobile].filter(Boolean).join(' • ') || '—'}
                                        </div>
                                    </div>
                                ))}
                                {selectedEmployees.length === 0 && (
                                    <div className="text-center text-gray-400 text-sm py-8">No employees selected</div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
