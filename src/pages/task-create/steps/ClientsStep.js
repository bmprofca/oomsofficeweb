import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { FiArrowLeft, FiArrowRight, FiSearch, FiUser, FiUsers } from 'react-icons/fi';

const SkeletonBar = ({ className = '' }) => (
    <div className={`animate-pulse rounded bg-gray-200/90 ${className}`} aria-hidden />
);

function FirmListSkeleton({ count = 5 }) {
    return (
        <>
            {Array.from({ length: count }, (_, i) => (
                <div
                    key={`firm-sk-${i}`}
                    className="p-2.5 bg-white border border-gray-200 rounded-lg space-y-2"
                    aria-hidden
                >
                    <SkeletonBar className="h-4 w-3/4 max-w-[180px]" />
                    <SkeletonBar className="h-3 w-1/2 max-w-[120px]" />
                    <div className="flex gap-3 pt-0.5">
                        <SkeletonBar className="h-3 w-16" />
                        <SkeletonBar className="h-3 w-20" />
                    </div>
                </div>
            ))}
        </>
    );
}

function getFirmFileNo(firm) {
    const c = firm?.client || {};
    return firm?.file_no || c?.file_no || '';
}

export default function ClientsStep({
    firmSearchQuery,
    setFirmSearchQuery,
    firmSearchLoading,
    firmSearchLoadingMore,
    firmSearchHasMore,
    onLoadMoreFirms,
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
    lockedFields = {},
    fieldError = null,
    fieldRefs = {},
}) {
    const firmsLocked = Boolean(lockedFields.firms);
    const groupsLocked = Boolean(lockedFields.groups);
    const firmsErr = fieldError?.field === 'firms';
    const listRef = useRef(null);
    const sentinelRef = useRef(null);
    const onLoadMoreRef = useRef(onLoadMoreFirms);
    onLoadMoreRef.current = onLoadMoreFirms;

    const availableFirms = firmSearchResults.filter(
        (f) => !selectedFirmOptions.some((s) => s.value === f.value)
    );

    useEffect(() => {
        const root = listRef.current;
        const sentinel = sentinelRef.current;
        if (!root || !sentinel || firmsLocked || !firmSearchHasMore) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0]?.isIntersecting) onLoadMoreRef.current?.();
            },
            { root, rootMargin: '48px', threshold: 0 }
        );
        observer.observe(sentinel);
        return () => observer.disconnect();
    }, [firmsLocked, firmSearchHasMore, availableFirms.length, firmSearchQuery]);

    return (
        <div className="space-y-6">
            <div
                className={`space-y-2 rounded-xl transition-shadow ${
                    firmsErr ? 'ring-2 ring-red-500 ring-offset-1 p-1 -m-1' : ''
                }`}
                ref={fieldRefs.firms}
            >
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <FiUser className="w-4 h-4 text-indigo-600" />
                    Firms
                </label>
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
                    <div className={`lg:col-span-2 min-w-0 ${firmsLocked ? 'opacity-60 pointer-events-none' : ''}`}>
                        <div className="bg-gray-50 border border-gray-200 rounded-xl overflow-hidden flex flex-col h-72">
                            <div className="p-3 border-b border-gray-200 bg-white">
                                <div className="relative">
                                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                        type="text"
                                        value={firmSearchQuery}
                                        onChange={(e) => setFirmSearchQuery(e.target.value)}
                                        placeholder="Search firms..."
                                        disabled={firmsLocked}
                                        className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none disabled:bg-gray-50"
                                    />
                                </div>
                            </div>
                            <div
                                ref={listRef}
                                className="flex-1 overflow-y-auto task-scrollbar-hide p-2 space-y-1.5"
                            >
                                {firmSearchLoading && availableFirms.length === 0 && <FirmListSkeleton count={5} />}
                                {!firmSearchLoading && availableFirms.length === 0 && (
                                    <div className="text-center text-gray-400 text-sm py-6">No firms found</div>
                                )}
                                {availableFirms.map((opt) => {
                                    const f = opt.__firm;
                                    const c = f?.client || {};
                                    const fileNo = getFirmFileNo(f);
                                    return (
                                        <div
                                            key={opt.value}
                                            onClick={() => addFirm(opt)}
                                            className="p-2.5 bg-white border border-gray-200 rounded-lg cursor-pointer hover:bg-indigo-50 hover:border-indigo-200 transition-colors"
                                        >
                                            <div className="font-medium text-sm text-gray-900 truncate">
                                                {f?.firm_name || opt.label}
                                            </div>
                                            {c.name && (
                                                <div className="text-xs text-gray-600 truncate">{c.name}</div>
                                            )}
                                            <div className="flex flex-wrap gap-x-2 mt-0.5 text-xs text-gray-500">
                                                {(f?.pan_no || c.pan_number) && (
                                                    <span>PAN: {f?.pan_no || c.pan_number}</span>
                                                )}
                                                {fileNo && <span>File No: {fileNo}</span>}
                                            </div>
                                        </div>
                                    );
                                })}
                                {firmSearchLoadingMore && <FirmListSkeleton count={2} />}
                                {firmSearchHasMore && !firmSearchLoadingMore && (
                                    <div ref={sentinelRef} className="h-1 shrink-0" aria-hidden />
                                )}
                            </div>
                        </div>
                    </div>
                    <div
                        className={`lg:col-span-1 flex lg:flex-col justify-center items-center gap-2 ${firmsLocked ? 'opacity-60 pointer-events-none' : ''}`}
                    >
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
                            className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
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
                                    const fileNo = getFirmFileNo(f);
                                    return (
                                        <div
                                            key={opt.value}
                                            onClick={() => removeFirm(opt)}
                                            className="p-2.5 bg-white border border-indigo-200 rounded-lg cursor-pointer hover:bg-red-50 hover:border-red-200 transition-colors"
                                        >
                                            <div className="font-medium text-sm text-gray-800 truncate">
                                                {f?.firm_name || opt.label}
                                            </div>
                                            {c.name && (
                                                <div className="text-xs text-gray-600 truncate">{c.name}</div>
                                            )}
                                            {fileNo && (
                                                <div className="text-xs text-gray-500 mt-0.5">File No: {fileNo}</div>
                                            )}
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
                {firmsErr && (
                    <p className="text-xs text-red-600" role="alert">
                        {fieldError.message}
                    </p>
                )}
            </div>

            <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <FiUsers className="w-4 h-4 text-indigo-600" />
                    Groups
                </label>
                <div
                    className={`grid grid-cols-1 lg:grid-cols-5 gap-3 ${groupsLocked ? 'opacity-60 pointer-events-none' : ''}`}
                >
                    <div className="lg:col-span-2 min-w-0">
                        <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 h-72 overflow-hidden flex flex-col">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-sm font-medium text-gray-700">Available Groups</span>
                            </div>
                            <div className="flex-1 overflow-y-auto task-scrollbar-hide space-y-1.5">
                                {groupOptions
                                    .filter((g) => !selectedGroupOptions.some((s) => s.value === g.value))
                                    .map((opt) => (
                                        <div
                                            key={opt.value}
                                            onClick={() => addGroup(opt)}
                                            className="p-2.5 bg-white border border-gray-200 rounded-lg cursor-pointer hover:bg-indigo-50 hover:border-indigo-200 transition-colors"
                                        >
                                            <div className="font-medium text-sm text-gray-900 truncate">
                                                {opt.label}
                                            </div>
                                            <span className="text-xs text-gray-500">
                                                {opt.firm_count ?? 0} firm
                                                {(opt.firm_count ?? 0) !== 1 ? 's' : ''}
                                            </span>
                                        </div>
                                    ))}
                                {groupOptions.filter((g) => !selectedGroupOptions.some((s) => s.value === g.value))
                                    .length === 0 && (
                                    <div className="text-center text-gray-400 text-sm py-8">
                                        No groups available
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="lg:col-span-1 flex lg:flex-col justify-center items-center gap-2">
                        <motion.button
                            type="button"
                            onClick={() => {
                                const toAdd = groupOptions.filter(
                                    (g) => !selectedGroupOptions.some((s) => s.value === g.value)
                                );
                                toAdd.forEach((g) => addGroup(g));
                            }}
                            disabled={
                                groupOptions.filter((g) => !selectedGroupOptions.some((s) => s.value === g.value))
                                    .length === 0
                            }
                            className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                            whileTap={{ scale: 0.95 }}
                        >
                            <FiArrowRight className="w-4 h-4" />
                        </motion.button>
                        <motion.button
                            type="button"
                            onClick={() => selectedGroupOptions.forEach((g) => removeGroup(g))}
                            disabled={selectedGroupOptions.length === 0}
                            className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                            whileTap={{ scale: 0.95 }}
                        >
                            <FiArrowLeft className="w-4 h-4" />
                        </motion.button>
                    </div>
                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 h-72 overflow-hidden flex flex-col lg:col-span-2">
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

            <div className="rounded-lg border border-indigo-100 bg-indigo-50/40 p-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="flex items-start gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0">
                            <FiUsers className="w-4 h-4 text-indigo-700" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-indigo-900">Estimated tasks to create</p>
                            <p className="text-xs text-indigo-600 mt-0.5">Based on selected firms and groups</p>
                        </div>
                    </div>
                    <div className="text-right sm:pl-4">
                        <div className="text-xl font-semibold text-indigo-700 leading-none">
                            {estimatedTaskCreateCount}
                        </div>
                        <div className="text-xs text-indigo-600 mt-0.5">tasks</div>
                    </div>
                </div>
                <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-indigo-800">
                    <span>
                        Firms: <span className="font-medium">{selectedFirmCount}</span>
                    </span>
                    <span>
                        Groups: <span className="font-medium">{selectedGroupCount}</span>
                    </span>
                    <span>
                        Firms in groups: <span className="font-medium">{selectedGroupFirmCount}</span>
                    </span>
                </div>
            </div>
        </div>
    );
}
