import React from 'react';
import { motion } from 'framer-motion';
import { FiArrowLeft, FiArrowRight, FiSearch, FiUser, FiUsers } from 'react-icons/fi';

export default function ClientsStep({
    firmSearchQuery,
    setFirmSearchQuery,
    firmSearchLoading,
    firmSearchResults,
    selectedFirmOptions,
    addFirm,
    removeFirm,
    addAllFirmsFromResults,
    removeAllFirms,
    groupOptions,
    selectedGroupOptions,
    addGroup,
    removeGroup,
    estimatedTaskCreateCount,
    selectedFirmCount,
    selectedGroupCount,
    selectedGroupFirmCount,
}) {
    const availableFirms = firmSearchResults.filter(
        (f) => !selectedFirmOptions.some((s) => s.value === f.value)
    );

    return (
        <div className="space-y-6">
            <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <FiUser className="w-4 h-4 text-indigo-600" />
                    Firms
                </label>
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
                    <div className="lg:col-span-2 min-w-0">
                        <div className="bg-gray-50 border border-gray-200 rounded-xl overflow-hidden flex flex-col h-72">
                            <div className="p-3 border-b border-gray-200 bg-white">
                                <div className="relative">
                                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                        type="text"
                                        value={firmSearchQuery}
                                        onChange={(e) => setFirmSearchQuery(e.target.value)}
                                        placeholder="Search firms (min 3 characters)..."
                                        className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                                    />
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto task-scrollbar-hide p-2 space-y-1.5">
                                {firmSearchLoading && (
                                    <div className="text-center text-gray-500 text-sm py-6">Searching...</div>
                                )}
                                {!firmSearchLoading && firmSearchQuery.trim().length < 3 && (
                                    <div className="text-center text-gray-400 text-sm py-6">Search firms...</div>
                                )}
                                {!firmSearchLoading && firmSearchQuery.trim().length >= 3 && availableFirms.length === 0 && (
                                    <div className="text-center text-gray-400 text-sm py-6">No firms found</div>
                                )}
                                {!firmSearchLoading &&
                                    availableFirms.map((opt) => {
                                        const f = opt.__firm;
                                        const c = f?.client || {};
                                        return (
                                            <div
                                                key={opt.value}
                                                onClick={() => addFirm(opt)}
                                                className="p-2.5 bg-white border border-gray-200 rounded-lg cursor-pointer hover:bg-indigo-50 hover:border-indigo-200 transition-colors"
                                            >
                                                <div className="font-medium text-sm text-gray-900 truncate">
                                                    {f?.firm_name || opt.label}
                                                </div>
                                                {c.name && <div className="text-xs text-gray-600 truncate">{c.name}</div>}
                                                <div className="flex flex-wrap gap-x-2 mt-0.5 text-xs text-gray-500">
                                                    {(f?.pan_no || c.pan_number) && (
                                                        <span>PAN: {f?.pan_no || c.pan_number}</span>
                                                    )}
                                                    {f?.branch_id && <span>Branch: {f.branch_id}</span>}
                                                </div>
                                            </div>
                                        );
                                    })}
                            </div>
                        </div>
                    </div>
                    <div className="lg:col-span-1 flex lg:flex-col justify-center items-center gap-2">
                        <motion.button
                            type="button"
                            onClick={addAllFirmsFromResults}
                            disabled={availableFirms.length === 0}
                            className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                            whileTap={{ scale: 0.95 }}
                        >
                            <FiArrowRight className="w-4 h-4" />
                        </motion.button>
                        <motion.button
                            type="button"
                            onClick={removeAllFirms}
                            disabled={selectedFirmOptions.length === 0}
                            className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                            whileTap={{ scale: 0.95 }}
                        >
                            <FiArrowLeft className="w-4 h-4" />
                        </motion.button>
                    </div>
                    <div className="lg:col-span-2 min-w-0">
                        <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 h-72 overflow-hidden flex flex-col">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-sm font-medium text-gray-700">Selected Firms</span>
                                <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded">
                                    {selectedFirmOptions.length}
                                </span>
                            </div>
                            <div className="flex-1 overflow-y-auto task-scrollbar-hide space-y-1.5">
                                {selectedFirmOptions.map((opt) => {
                                    const f = opt.__firm;
                                    const c = f?.client || {};
                                    return (
                                        <div
                                            key={opt.value}
                                            onClick={() => removeFirm(opt)}
                                            className="p-2.5 bg-white border border-indigo-200 rounded-lg cursor-pointer hover:bg-red-50 hover:border-red-200 transition-colors"
                                        >
                                            <div className="font-medium text-sm text-gray-900 truncate">
                                                {f?.firm_name || opt.label}
                                            </div>
                                            {c.name && <div className="text-xs text-gray-600 truncate">{c.name}</div>}
                                        </div>
                                    );
                                })}
                                {selectedFirmOptions.length === 0 && (
                                    <div className="text-center text-gray-400 text-sm py-8">No firms selected</div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <FiUsers className="w-4 h-4 text-indigo-600" />
                    Groups
                </label>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 h-72 overflow-hidden flex flex-col">
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="text-sm font-medium text-gray-700">Available Groups</h3>
                            <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded">
                                {groupOptions.filter((g) => !selectedGroupOptions.some((s) => s.value === g.value)).length}
                            </span>
                        </div>
                        <div className="flex-1 overflow-y-auto task-scrollbar-hide space-y-1.5">
                            {groupOptions
                                .filter((g) => !selectedGroupOptions.some((s) => s.value === g.value))
                                .map((opt) => (
                                    <div
                                        key={opt.value}
                                        onClick={() => addGroup(opt)}
                                        className={`p-2.5 rounded-lg border cursor-pointer transition-colors ${
                                            opt.firm_count === 0
                                                ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
                                                : 'bg-white border-gray-200 hover:bg-indigo-50 hover:border-indigo-200'
                                        }`}
                                    >
                                        <div className="font-medium text-sm text-gray-800 truncate">{opt.label}</div>
                                        <span className="text-xs text-gray-500">
                                            {opt.firm_count ?? 0} firm{(opt.firm_count ?? 0) !== 1 ? 's' : ''}
                                        </span>
                                    </div>
                                ))}
                            {groupOptions.filter((g) => !selectedGroupOptions.some((s) => s.value === g.value)).length === 0 && (
                                <div className="text-center text-gray-400 text-sm py-8">No groups available</div>
                            )}
                        </div>
                    </div>
                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 h-72 overflow-hidden flex flex-col">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-medium text-gray-700">Selected Groups</span>
                            <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded">
                                {selectedGroupOptions.length}
                            </span>
                        </div>
                        <div className="flex-1 overflow-y-auto task-scrollbar-hide space-y-1.5">
                            {selectedGroupOptions.map((opt) => (
                                <div
                                    key={opt.value}
                                    onClick={() => removeGroup(opt)}
                                    className="p-2.5 bg-white border border-indigo-200 rounded-lg cursor-pointer hover:bg-red-50 hover:border-red-200 transition-colors"
                                >
                                    <div className="font-medium text-sm text-gray-800 truncate">{opt.label}</div>
                                    <span className="text-xs text-gray-500">
                                        {opt.firm_count ?? 0} firm{(opt.firm_count ?? 0) !== 1 ? 's' : ''}
                                    </span>
                                </div>
                            ))}
                            {selectedGroupOptions.length === 0 && (
                                <div className="text-center text-gray-400 text-sm py-8">No groups selected</div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
                            <FiUsers className="w-5 h-5 text-indigo-700" />
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-indigo-900">Estimated tasks to create</p>
                            <p className="text-xs text-indigo-700 mt-0.5">Based on your selected firms and groups</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-3xl font-extrabold text-indigo-700 leading-none">{estimatedTaskCreateCount}</div>
                        <div className="text-xs text-indigo-600 mt-1 font-medium">tasks</div>
                    </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-indigo-800">
                    <span>Firms selected: <span className="font-semibold">{selectedFirmCount}</span></span>
                    <span>Groups selected: <span className="font-semibold">{selectedGroupCount}</span></span>
                    <span>Firms in groups: <span className="font-semibold">{selectedGroupFirmCount}</span></span>
                </div>
            </div>
        </div>
    );
}
