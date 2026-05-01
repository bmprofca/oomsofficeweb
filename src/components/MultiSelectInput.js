import React, { useEffect, useMemo, useRef, useState } from 'react';

const normalizeOption = (option, valueKey, labelKey, colorKey) => ({
    value: option?.[valueKey],
    label: option?.[labelKey],
    color: option?.[colorKey] || '#6366f1',
    raw: option,
});

const MultiSelectInput = ({
    options = [],
    value,
    defaultValue = [],
    onChange,
    placeholder = 'Select options...',
    searchPlaceholder = 'Search options...',
    emptyMessage = 'No options found',
    allSelectedLabel = 'All',
    treatEmptyAsAll = false,
    showSearch = true,
    showSelectActions = true,
    has_limit = false,
    maxSelection = null,
    closeOnSelect = false,
    disabled = false,
    valueKey = 'value',
    labelKey = 'label',
    colorKey = 'color',
    className = '',
}) => {
    const isControlled = Array.isArray(value);
    const [internalValue, setInternalValue] = useState(defaultValue);
    const selectedValues = isControlled ? value : internalValue;

    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const containerRef = useRef(null);
    const searchInputRef = useRef(null);
    const displayRowRef = useRef(null);
    const measureRowRef = useRef(null);
    const [autoVisibleCount, setAutoVisibleCount] = useState(0);

    const normalizedOptions = useMemo(
        () => options.map((opt) => normalizeOption(opt, valueKey, labelKey, colorKey)),
        [options, valueKey, labelKey, colorKey]
    );

    const selectedOptions = useMemo(
        () => normalizedOptions.filter((opt) => selectedValues.includes(opt.value)),
        [normalizedOptions, selectedValues]
    );

    const filteredOptions = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        if (!q) return normalizedOptions;
        return normalizedOptions.filter((opt) => String(opt.label || '').toLowerCase().includes(q));
    }, [normalizedOptions, searchQuery]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
                setSearchQuery('');
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (isOpen && showSearch && searchInputRef.current) {
            setTimeout(() => searchInputRef.current?.focus(), 70);
        }
        if (!isOpen) setSearchQuery('');
    }, [isOpen, showSearch]);

    useEffect(() => {
        const recalculateVisibleCount = () => {
            if (!displayRowRef.current || !measureRowRef.current) return;
            const measureNodes = measureRowRef.current.children;
            const availableWidth = displayRowRef.current.clientWidth;
            if (!availableWidth || !measureNodes.length) {
                setAutoVisibleCount(0);
                return;
            }

            const gap = 6;
            let used = 0;
            let visibleCount = 0;

            for (let i = 0; i < measureNodes.length; i += 1) {
                const chipWidth = measureNodes[i].offsetWidth;
                const remaining = selectedOptions.length - (i + 1);
                const reserveForMore = remaining > 0 ? 74 : 0; // "+99 more" safe width
                const nextUsed = used + (visibleCount > 0 ? gap : 0) + chipWidth;
                if (nextUsed + reserveForMore > availableWidth) break;
                used = nextUsed;
                visibleCount += 1;
            }
            setAutoVisibleCount(visibleCount);
        };

        recalculateVisibleCount();
        const resizeObserver = new ResizeObserver(recalculateVisibleCount);
        if (displayRowRef.current) resizeObserver.observe(displayRowRef.current);
        window.addEventListener('resize', recalculateVisibleCount);
        return () => {
            resizeObserver.disconnect();
            window.removeEventListener('resize', recalculateVisibleCount);
        };
    }, [selectedOptions]);

    const emitChange = (nextValues) => {
        if (!isControlled) setInternalValue(nextValues);
        if (onChange) {
            const nextSelectedOptions = normalizedOptions.filter((opt) => nextValues.includes(opt.value));
            onChange(nextValues, nextSelectedOptions);
        }
    };

    const isSelected = (optionValue) => selectedValues.includes(optionValue);

    const effectiveMaxSelection =
        has_limit && Number.isFinite(Number(maxSelection)) && Number(maxSelection) > 0
            ? Number(maxSelection)
            : null;

    const toggleOption = (optionValue) => {
        const exists = isSelected(optionValue);
        if (exists) {
            emitChange(selectedValues.filter((v) => v !== optionValue));
            return;
        }
        if (effectiveMaxSelection && selectedValues.length >= effectiveMaxSelection) {
            return;
        }
        emitChange([...selectedValues, optionValue]);
        if (closeOnSelect) setIsOpen(false);
    };

    const handleSelectAll = () => {
        if (effectiveMaxSelection) {
            emitChange(normalizedOptions.slice(0, effectiveMaxSelection).map((opt) => opt.value));
            return;
        }
        emitChange(normalizedOptions.map((opt) => opt.value));
    };

    const handleDeselectAll = () => emitChange([]);

    const renderDisplay = () => {
        if (!selectedOptions.length && treatEmptyAsAll && normalizedOptions.length > 0) {
            return <span className="text-slate-800 text-sm font-medium">{allSelectedLabel}</span>;
        }
        if (!selectedOptions.length) {
            return <span className="text-slate-400 text-sm">{placeholder}</span>;
        }
        if (selectedOptions.length === normalizedOptions.length && normalizedOptions.length > 0) {
            return <span className="text-slate-800 text-sm font-medium">{allSelectedLabel}</span>;
        }
        const visibleCount = Math.max(1, Math.min(autoVisibleCount || 1, selectedOptions.length));
        const visible = selectedOptions.slice(0, visibleCount);
        const remaining = selectedOptions.length - visible.length;

        return (
            <div ref={displayRowRef} className="flex items-center gap-1.5 h-6 overflow-hidden whitespace-nowrap">
                {visible.map((item) => (
                    <span
                        key={String(item.value)}
                        className="inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium"
                        style={{
                            color: item.color,
                            borderColor: `${item.color}55`,
                            backgroundColor: `${item.color}18`,
                        }}
                    >
                        {item.label}
                    </span>
                ))}
                {remaining > 0 && <span className="text-xs text-slate-500">+{remaining} more</span>}
            </div>
        );
    };

    return (
        <div ref={containerRef} className={`relative ${className}`}>
            <div ref={measureRowRef} className="absolute -z-10 opacity-0 pointer-events-none whitespace-nowrap">
                {selectedOptions.map((item) => (
                    <span
                        key={`measure-${String(item.value)}`}
                        className="inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium mr-1.5"
                    >
                        {item.label}
                    </span>
                ))}
            </div>
            <button
                type="button"
                disabled={disabled}
                onClick={() => !disabled && setIsOpen((s) => !s)}
                className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition ${
                    disabled
                        ? 'bg-slate-100 border-slate-200 cursor-not-allowed'
                        : `bg-white border-slate-300 hover:border-indigo-400 ${isOpen ? 'ring-2 ring-indigo-200 border-indigo-500' : ''}`
                }`}
            >
                <div className="pr-7 min-h-[20px]">{renderDisplay()}</div>
                <span
                    className={`absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 transition-transform ${
                        isOpen ? 'rotate-180' : ''
                    }`}
                >
                    <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                        <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </span>
            </button>

            {isOpen && (
                <div className="absolute z-[3000] mt-2 w-full rounded-xl border border-slate-200 bg-white shadow-2xl">
                    {showSelectActions && (
                        <div className="flex gap-2 p-2 border-b border-slate-100">
                            <button
                                type="button"
                                onClick={handleSelectAll}
                                className="flex-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
                            >
                                Select All
                            </button>
                            <button
                                type="button"
                                onClick={handleDeselectAll}
                                className="flex-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
                            >
                                Deselect All
                            </button>
                        </div>
                    )}

                    {showSearch && (
                        <div className="p-2 border-b border-slate-100">
                            <input
                                ref={searchInputRef}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder={searchPlaceholder}
                                className="w-full rounded-md border border-slate-200 px-2.5 py-2 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500"
                            />
                        </div>
                    )}

                    <div className="max-h-64 overflow-auto p-1.5">
                        {filteredOptions.length === 0 ? (
                            <div className="px-2 py-6 text-center text-sm text-slate-500">{emptyMessage}</div>
                        ) : (
                            filteredOptions.map((opt) => {
                                const selected = isSelected(opt.value);
                                return (
                                    <button
                                        key={String(opt.value)}
                                        type="button"
                                        onClick={() => toggleOption(opt.value)}
                                        className={`w-full rounded-md px-2.5 py-2 text-left mb-1 flex items-center gap-2.5 transition ${
                                            selected ? 'bg-indigo-50' : 'hover:bg-slate-50'
                                        }`}
                                    >
                                        <span
                                            className="w-4 h-4 rounded border-2 flex items-center justify-center shrink-0"
                                            style={{
                                                borderColor: selected ? opt.color : '#cbd5e1',
                                                backgroundColor: selected ? opt.color : 'transparent',
                                            }}
                                        >
                                            {selected && (
                                                <svg width="10" height="8" viewBox="0 0 12 10" fill="none">
                                                    <path d="M1 5L4.5 8.5L11 1.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                </svg>
                                            )}
                                        </span>
                                        <span
                                            className="text-sm"
                                            style={{ color: selected ? opt.color : '#0f172a', fontWeight: selected ? 600 : 400 }}
                                        >
                                            {opt.label}
                                        </span>
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default MultiSelectInput;
