import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { FiArrowLeft, FiArrowRight, FiLayers, FiSearch } from 'react-icons/fi';
import { FirmModalShell, ModalFooterActions } from './FirmModalParts';

const PANEL_CLASS =
    'flex h-[420px] flex-col overflow-hidden rounded-lg border border-slate-200 bg-slate-50 p-4';
const LIST_CLASS =
    'min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-y-contain [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden';

/**
 * Dual-list group assignment for a firm (same pattern as TaskCreate TeamStep employees).
 * Left = available branch groups, Right = assigned / selected groups.
 */
export default function FirmGroupsManageModal({
    open,
    firm = null,
    groups = [],
    groupsLoading = false,
    saving = false,
    onClose,
    onSave,
}) {
    const [selectedGroups, setSelectedGroups] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (!open || !firm) {
            setSelectedGroups([]);
            setSearchQuery('');
            return;
        }
        const byId = new Map((groups || []).map((g) => [g.value, g]));
        const initial = (firm.groups || [])
            .map((g) => {
                const id = g.group_id;
                if (!id) return null;
                return byId.get(id) || {
                    value: id,
                    label: g.group_name || id,
                    firm_count: g.firm_count,
                };
            })
            .filter(Boolean);
        setSelectedGroups(initial);
        setSearchQuery('');
        // Intentionally omit `groups` so async group fetch does not wipe in-progress edits
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, firm]);

    useEffect(() => {
        if (!open || !groups?.length) return;
        setSelectedGroups((prev) =>
            prev.map((g) => {
                const match = groups.find((x) => x.value === g.value);
                return match ? { ...g, label: match.label, firm_count: match.firm_count } : g;
            }),
        );
    }, [open, groups]);

    const selectedIds = useMemo(
        () => new Set(selectedGroups.map((g) => g.value).filter(Boolean)),
        [selectedGroups],
    );

    const availableGroups = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        return (groups || [])
            .filter((g) => g?.value && !selectedIds.has(g.value))
            .filter((g) => {
                if (!q) return true;
                return String(g.label || '').toLowerCase().includes(q)
                    || String(g.value || '').toLowerCase().includes(q);
            });
    }, [groups, selectedIds, searchQuery]);

    const addGroup = (group) => {
        if (!group?.value) return;
        setSelectedGroups((prev) =>
            prev.some((g) => g.value === group.value) ? prev : [...prev, group],
        );
    };

    const removeGroup = (group) => {
        setSelectedGroups((prev) => prev.filter((g) => g.value !== group.value));
    };

    const addAllVisible = () => {
        setSelectedGroups((prev) => {
            const seen = new Set(prev.map((g) => g.value));
            return [
                ...prev,
                ...availableGroups.filter((g) => !seen.has(g.value)),
            ];
        });
    };

    const removeAll = () => setSelectedGroups([]);

    const handleSave = () => {
        const ids = selectedGroups.map((g) => g.value).filter(Boolean);
        onSave?.(ids);
    };

    return (
        <FirmModalShell
            open={open && !!firm}
            onClose={() => !saving && onClose?.()}
            maxWidth="max-w-4xl"
            headerClass="bg-gradient-to-r from-violet-600 to-fuchsia-600"
            icon={FiLayers}
            title="Manage groups"
            subtitle={firm?.firm_name || 'Assign firm to groups'}
            bodyScroll={false}
            footer={
                <ModalFooterActions
                    onCancel={onClose}
                    onConfirm={handleSave}
                    confirmLabel="Update groups"
                    confirmClass="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 shadow-violet-200"
                    loading={saving}
                />
            }
        >
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
                <div className="lg:col-span-2">
                    <div className={PANEL_CLASS}>
                        <div className="mb-3 flex shrink-0 items-center justify-between">
                            <h3 className="m-0 text-sm font-medium text-slate-700">
                                Available groups
                            </h3>
                            <span className="rounded bg-white px-2 py-1 text-sm text-slate-500">
                                {availableGroups.length}
                            </span>
                        </div>
                        <div className="relative mb-2 shrink-0">
                            <FiSearch className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search groups..."
                                disabled={saving}
                                className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-8 pr-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                            />
                        </div>
                        <div className={LIST_CLASS} style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                            {groupsLoading ? (
                                <div className="py-8 text-center text-sm text-slate-500">
                                    Loading groups...
                                </div>
                            ) : null}
                            {!groupsLoading && availableGroups.length === 0 ? (
                                <div className="py-8 text-center text-sm text-slate-400">
                                    {searchQuery.trim()
                                        ? 'No matching groups'
                                        : 'No groups available'}
                                </div>
                            ) : null}
                            {!groupsLoading
                                && availableGroups.map((group) => (
                                    <button
                                        key={group.value}
                                        type="button"
                                        disabled={saving}
                                        onClick={() => addGroup(group)}
                                        className="w-full rounded-lg border border-slate-200 bg-white p-3 text-left transition-colors hover:border-indigo-200 hover:bg-indigo-50 disabled:opacity-50"
                                    >
                                        <div className="text-sm font-medium text-slate-800">
                                            {group.label}
                                        </div>
                                        <div className="text-xs text-slate-400">
                                            {group.firm_count != null
                                                ? `${group.firm_count} firm(s)`
                                                : 'Click to assign'}
                                        </div>
                                    </button>
                                ))}
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-center gap-3 lg:col-span-1 lg:flex-col">
                    <motion.button
                        type="button"
                        onClick={addAllVisible}
                        disabled={saving || availableGroups.length === 0}
                        className="rounded-lg bg-indigo-600 p-2 text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                        whileTap={{ scale: 0.9 }}
                        aria-label="Add all visible groups"
                    >
                        <FiArrowRight className="h-4 w-4" />
                    </motion.button>
                    <motion.button
                        type="button"
                        onClick={removeAll}
                        disabled={saving || selectedGroups.length === 0}
                        className="rounded-lg bg-indigo-600 p-2 text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                        whileTap={{ scale: 0.9 }}
                        aria-label="Remove all groups"
                    >
                        <FiArrowLeft className="h-4 w-4" />
                    </motion.button>
                </div>

                <div className="lg:col-span-2">
                    <div className={PANEL_CLASS}>
                        <div className="mb-3 flex shrink-0 items-center justify-between">
                            <h3 className="m-0 text-sm font-medium text-slate-700">
                                Assigned groups
                            </h3>
                            <span className="rounded bg-white px-2 py-1 text-sm text-slate-500">
                                {selectedGroups.length}
                            </span>
                        </div>
                        <div className={LIST_CLASS} style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                            {selectedGroups.map((group) => (
                                <button
                                    key={group.value}
                                    type="button"
                                    disabled={saving}
                                    onClick={() => removeGroup(group)}
                                    className="w-full rounded-lg border border-indigo-200 bg-white p-3 text-left transition-colors hover:border-red-200 hover:bg-red-50 disabled:opacity-50"
                                >
                                    <div className="text-sm font-medium text-slate-800">
                                        {group.label}
                                    </div>
                                    <div className="text-xs text-slate-400">
                                        Click to remove
                                    </div>
                                </button>
                            ))}
                            {selectedGroups.length === 0 ? (
                                <div className="py-8 text-center text-sm text-slate-400">
                                    No groups assigned
                                </div>
                            ) : null}
                        </div>
                    </div>
                </div>
            </div>
        </FirmModalShell>
    );
}
