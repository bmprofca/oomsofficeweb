import React, { useEffect, useMemo, useRef } from 'react';
import { FiLayers, FiUser, FiUsers } from 'react-icons/fi';
import { SegmentedControl, TransferList } from '../../../components/Modals/WizardModalParts';

function getFirmFileNo(firm) {
    const c = firm?.client || {};
    return firm?.file_no || c?.file_no || '';
}

const cleanLabel = (value) =>
    String(value || '')
        .replace(/\bnull\b|\bundefined\b/gi, '')
        .replace(/^[\s–—-]+|[\s–—-]+$/g, '')
        .trim();

function firmToItem(opt) {
    const f = opt.__firm || {};
    const c = f.client || {};
    const title =
        cleanLabel(f.firm_name) ||
        cleanLabel(c.name) ||
        cleanLabel(opt.label) ||
        cleanLabel(c.email) ||
        (c.mobile ? `Client ${c.mobile}` : '') ||
        (f.firm_id ? `Firm ${f.firm_id}` : 'Unnamed firm');
    const pan = f.pan_no || c.pan_number;
    const fileNo = getFirmFileNo(f);
    const sub = [
        cleanLabel(c.name) && cleanLabel(c.name) !== title ? cleanLabel(c.name) : '',
        pan ? `PAN ${pan}` : '',
        f.firm_type ? String(f.firm_type).replace(/_/g, ' ') : '',
    ]
        .filter(Boolean)
        .join(' · ');
    return { key: opt.value, title, subtitle: sub || null, meta: fileNo ? `File ${fileNo}` : null, opt };
}

function groupToItem(opt) {
    const n = opt.firm_count ?? 0;
    return { key: opt.value, title: cleanLabel(opt.label) || 'Unnamed group', subtitle: `${n} firm${n === 1 ? '' : 's'}`, opt };
}

export default function ClientsStep({
    selectionMode = 'firm',
    onSelectionModeChange,
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
    const isFirmMode = selectionMode === 'firm';
    const firmTabDisabled = (firmsLocked || groupsLocked) && !isFirmMode;
    const groupTabDisabled = (firmsLocked || groupsLocked) && isFirmMode;
    const firmsErr = fieldError?.field === 'firms';
    const listRef = useRef(null);
    const sentinelRef = useRef(null);
    const onLoadMoreRef = useRef(onLoadMoreFirms);
    onLoadMoreRef.current = onLoadMoreFirms;

    const availableFirms = useMemo(
        () => firmSearchResults.filter((f) => !selectedFirmOptions.some((s) => s.value === f.value)),
        [firmSearchResults, selectedFirmOptions]
    );
    const availableGroups = useMemo(
        () => groupOptions.filter((g) => !selectedGroupOptions.some((s) => s.value === g.value)),
        [groupOptions, selectedGroupOptions]
    );

    useEffect(() => {
        const root = listRef.current;
        const sentinel = sentinelRef.current;
        if (!root || !sentinel || firmsLocked || !firmSearchHasMore || !isFirmMode) return undefined;
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0]?.isIntersecting) onLoadMoreRef.current?.();
            },
            { root, rootMargin: '48px', threshold: 0 }
        );
        observer.observe(sentinel);
        return () => observer.disconnect();
    }, [firmsLocked, firmSearchHasMore, availableFirms.length, firmSearchQuery, isFirmMode]);

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <SegmentedControl
                    value={selectionMode}
                    onChange={(v) => onSelectionModeChange?.(v)}
                    options={[
                        { value: 'firm', label: 'Firms', icon: <FiUser className="h-3.5 w-3.5" />, disabled: firmTabDisabled },
                        { value: 'group', label: 'Groups', icon: <FiUsers className="h-3.5 w-3.5" />, disabled: groupTabDisabled },
                    ]}
                />
                <p className="text-xs text-slate-500">
                    {isFirmMode ? 'Click a firm to add it. Click again to remove.' : 'Every firm in the chosen groups gets a task.'}
                </p>
            </div>

            <div ref={fieldRefs.firms}>
                {isFirmMode ? (
                    <TransferList
                        availableTitle="Firms"
                        selectedTitle="Selected firms"
                        available={availableFirms.map(firmToItem)}
                        selected={selectedFirmOptions.map(firmToItem)}
                        onAdd={(item) => addFirm(item.opt)}
                        onRemove={(item) => removeFirm(item.opt)}
                        onAddAll={addAllFirmsFromResults}
                        onRemoveAll={removeAllFirms}
                        search={{ value: firmSearchQuery, onChange: setFirmSearchQuery, placeholder: 'Search by firm, client, PAN or file no…' }}
                        loading={firmSearchLoading}
                        loadingMore={firmSearchLoadingMore}
                        emptyAvailable={firmSearchQuery ? 'No firms match your search' : 'No firms found'}
                        emptySelected="No firms selected yet"
                        availableListRef={listRef}
                        availableFooter={
                            firmSearchHasMore && !firmSearchLoadingMore ? <div ref={sentinelRef} className="h-1" aria-hidden /> : null
                        }
                        disabled={firmsLocked}
                        hasError={firmsErr}
                    />
                ) : (
                    <TransferList
                        availableTitle="Groups"
                        selectedTitle="Selected groups"
                        available={availableGroups.map(groupToItem)}
                        selected={selectedGroupOptions.map(groupToItem)}
                        onAdd={(item) => addGroup(item.opt)}
                        onRemove={(item) => removeGroup(item.opt)}
                        onAddAll={() => availableGroups.forEach((g) => addGroup(g))}
                        onRemoveAll={() => selectedGroupOptions.forEach((g) => removeGroup(g))}
                        emptyAvailable="No groups available"
                        emptySelected="No groups selected yet"
                        disabled={groupsLocked}
                        hasError={firmsErr}
                    />
                )}
                {firmsErr && (
                    <p className="mt-2 text-xs text-red-600" role="alert">
                        {fieldError.message}
                    </p>
                )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-indigo-100 bg-indigo-50/60 px-4 py-3">
                <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-indigo-600 ring-1 ring-indigo-100">
                        <FiLayers className="h-4 w-4" />
                    </span>
                    <div>
                        <p className="text-sm font-semibold text-indigo-950">Tasks to be created</p>
                        <p className="text-xs text-indigo-700/80">
                            {isFirmMode
                                ? `${selectedFirmCount} firm${selectedFirmCount === 1 ? '' : 's'} selected`
                                : `${selectedGroupCount} group${selectedGroupCount === 1 ? '' : 's'} · ${selectedGroupFirmCount} firm${selectedGroupFirmCount === 1 ? '' : 's'} inside`}
                        </p>
                    </div>
                </div>
                <div className="font-mono text-2xl font-semibold tabular-nums text-indigo-700">{estimatedTaskCreateCount}</div>
            </div>
        </div>
    );
}
