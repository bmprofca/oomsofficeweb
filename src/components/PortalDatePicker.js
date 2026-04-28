import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { FaCheck, FaUndo } from 'react-icons/fa';
import { FiX } from 'react-icons/fi';

/** Short codes for configurable quick presets (order = display order when passed in `quickOptionKeys`). */
export const QUICK_OPTION_CODES = {
    TD: 'td',
    TOM: 'tom',
    N7: 'n7',
    EOM: 'eom',
    YD: 'yd',
    TM: 'tm',
    LM: 'lm',
    TW: 'tw',
    LW: 'lw',
    FY: 'fy',
    LF: 'lf',
};

const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
];

export function fmt(d) {
    if (!d) return '';
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function parseDateValue(value) {
    if (!value) return null;
    if (value instanceof Date) return new Date(value);
    if (typeof value !== 'string') return null;

    const [year, month, day] = value.split('-').map(Number);
    if (!year || !month || !day) return null;

    return new Date(year, month - 1, day);
}

export function toIsoDate(date) {
    if (!date) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function sameDay(a, b) {
    return a && b && a.getFullYear() === b.getFullYear()
        && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function startOfDay(d) {
    const c = new Date(d);
    c.setHours(0, 0, 0, 0);
    return c;
}

function getPresets() {
    const t = startOfDay(new Date());
    const yesterday = new Date(t); yesterday.setDate(t.getDate() - 1);
    const tomorrow = new Date(t); tomorrow.setDate(t.getDate() + 1);
    const next7thDay = (() => {
        const year = t.getFullYear();
        const month = t.getMonth();
        if (t.getDate() <= 7) return startOfDay(new Date(year, month, 7));
        return startOfDay(new Date(year, month + 1, 7));
    })();
    const endOfThisMonth = new Date(t.getFullYear(), t.getMonth() + 1, 0);
    const last7start = new Date(t); last7start.setDate(t.getDate() - 6);
    const last30start = new Date(t); last30start.setDate(t.getDate() - 29);
    const thisMonthStart = new Date(t.getFullYear(), t.getMonth(), 1);
    const thisMonthEnd = new Date(t.getFullYear(), t.getMonth() + 1, 0);
    const lastMonthStart = new Date(t.getFullYear(), t.getMonth() - 1, 1);
    const lastMonthEnd = new Date(t.getFullYear(), t.getMonth(), 0);

    return [
        { key: 'today', label: 'Today', sub: fmt(t), single: t },
        { key: 'tomorrow', label: 'Tomorrow', sub: fmt(tomorrow), single: tomorrow },
        { key: 'n7', label: 'Next 7th day', sub: fmt(next7thDay), single: next7thDay },
        { key: 'eom', label: 'Last day of this month', sub: fmt(endOfThisMonth), single: endOfThisMonth },
        { key: 'yesterday', label: 'Yesterday', sub: fmt(yesterday), single: yesterday },
        { key: 'last7', label: 'Last 7 days', sub: `${fmt(last7start)} – ${fmt(t)}`, range: [last7start, t] },
        { key: 'last30', label: 'Last 30 days', sub: `${fmt(last30start)} – ${fmt(t)}`, range: [last30start, t] },
        { key: 'thisMonth', label: 'This month', sub: `${fmt(thisMonthStart)} – ${fmt(thisMonthEnd)}`, range: [thisMonthStart, thisMonthEnd] },
        { key: 'lastMonth', label: 'Last month', sub: `${fmt(lastMonthStart)} – ${fmt(lastMonthEnd)}`, range: [lastMonthStart, lastMonthEnd] },
    ];
}

/** Monday–Sunday week containing `d`; both normalized start-of-day. */
function getMondayOfWeekContaining(d) {
    const t0 = startOfDay(d);
    const day = t0.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const mon = new Date(t0);
    mon.setDate(t0.getDate() + diff);
    return startOfDay(mon);
}

function getSundayFromMonday(mon) {
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    return startOfDay(sun);
}

/** Indian FY: 1 Apr – 31 Mar. */
function getIndianFinancialYearStart(t) {
    const y = t.getFullYear();
    const m = t.getMonth();
    if (m >= 3) return startOfDay(new Date(y, 3, 1));
    return startOfDay(new Date(y - 1, 3, 1));
}

function getIndianFinancialYearEnd(t) {
    const start = getIndianFinancialYearStart(t);
    return startOfDay(new Date(start.getFullYear() + 1, 2, 31));
}

/** Build one quick preset by short code (`td`, `tom`, `n7`, `eom`, `yd`, `tm`, `lm`, `tw`, `lw`, `fy`, `lf`). */
export function buildQuickPresetEntry(code) {
    const t = startOfDay(new Date());
    const c = String(code).toLowerCase().trim();

    if (c === 'td') {
        return { key: 'td', label: 'Today', sub: fmt(t), single: t, range: [t, t] };
    }
    if (c === 'tom') {
        const tomorrow = new Date(t);
        tomorrow.setDate(t.getDate() + 1);
        const d = startOfDay(tomorrow);
        return { key: 'tom', label: 'Tomorrow', sub: fmt(d), single: d, range: [d, d] };
    }
    if (c === 'n7') {
        const d = (() => {
            const year = t.getFullYear();
            const month = t.getMonth();
            if (t.getDate() <= 7) return startOfDay(new Date(year, month, 7));
            return startOfDay(new Date(year, month + 1, 7));
        })();
        return { key: 'n7', label: 'Next 7th day', sub: fmt(d), single: d, range: [d, d] };
    }
    if (c === 'eom') {
        const d = startOfDay(new Date(t.getFullYear(), t.getMonth() + 1, 0));
        return { key: 'eom', label: 'Last day of this month', sub: fmt(d), single: d, range: [d, d] };
    }
    if (c === 'yd') {
        const yd = new Date(t);
        yd.setDate(t.getDate() - 1);
        const y0 = startOfDay(yd);
        return { key: 'yd', label: 'Yesterday', sub: fmt(y0), single: y0, range: [y0, y0] };
    }
    if (c === 'tm') {
        const thisMonthStart = startOfDay(new Date(t.getFullYear(), t.getMonth(), 1));
        return {
            key: 'tm',
            label: 'This month',
            sub: `${fmt(thisMonthStart)} – ${fmt(t)}`,
            range: [thisMonthStart, t],
        };
    }
    if (c === 'lm') {
        const lastMonthStart = startOfDay(new Date(t.getFullYear(), t.getMonth() - 1, 1));
        const lastMonthEnd = startOfDay(new Date(t.getFullYear(), t.getMonth(), 0));
        return {
            key: 'lm',
            label: 'Last month',
            sub: `${fmt(lastMonthStart)} – ${fmt(lastMonthEnd)}`,
            range: [lastMonthStart, lastMonthEnd],
        };
    }
    if (c === 'tw') {
        const mon = getMondayOfWeekContaining(t);
        const sun = getSundayFromMonday(mon);
        const weekEndCapped = t < sun ? t : sun;
        return {
            key: 'tw',
            label: 'This week',
            sub: `${fmt(mon)} – ${fmt(weekEndCapped)}`,
            range: [mon, weekEndCapped],
        };
    }
    if (c === 'lw') {
        const mon = getMondayOfWeekContaining(t);
        const sun = getSundayFromMonday(mon);
        const lastWeekMon = new Date(mon);
        lastWeekMon.setDate(mon.getDate() - 7);
        const lastWeekSun = new Date(sun);
        lastWeekSun.setDate(sun.getDate() - 7);
        const lastWeekStart = startOfDay(lastWeekMon);
        const lastWeekEnd = startOfDay(lastWeekSun);
        return {
            key: 'lw',
            label: 'Last week',
            sub: `${fmt(lastWeekStart)} – ${fmt(lastWeekEnd)}`,
            range: [lastWeekStart, lastWeekEnd],
        };
    }
    if (c === 'fy') {
        const fyStart = getIndianFinancialYearStart(t);
        const fyEnd = getIndianFinancialYearEnd(t);
        const fyRangeEnd = t < fyEnd ? t : fyEnd;
        return {
            key: 'fy',
            label: 'This financial year',
            sub: `${fmt(fyStart)} – ${fmt(fyRangeEnd)}`,
            range: [fyStart, fyRangeEnd],
        };
    }
    if (c === 'lf') {
        const currentFYStart = getIndianFinancialYearStart(t);
        const lastFYStart = new Date(currentFYStart);
        lastFYStart.setFullYear(currentFYStart.getFullYear() - 1);
        const lastFYEnd = new Date(currentFYStart);
        lastFYEnd.setDate(currentFYStart.getDate() - 1);
        const ls = startOfDay(lastFYStart);
        const le = startOfDay(lastFYEnd);
        return {
            key: 'lf',
            label: 'Last financial year',
            sub: `${fmt(ls)} – ${fmt(le)}`,
            range: [ls, le],
        };
    }
    return null;
}

export function buildQuickPresetsFromKeys(keys) {
    if (!keys?.length) return [];
    const seen = new Set();
    const out = [];
    keys.forEach((k) => {
        const entry = buildQuickPresetEntry(k);
        if (entry && !seen.has(entry.key)) {
            seen.add(entry.key);
            out.push(entry);
        }
    });
    return out;
}

function filterPresets(presets, mode) {
    if (mode === 'single') {
        return presets.filter((preset) => preset.single);
    }

    if (mode === 'range') {
        return presets.filter((preset) => preset.range);
    }

    return presets;
}

function buildYearOptions(minYear, maxYear) {
    const lo = Math.min(minYear, maxYear);
    const hi = Math.max(minYear, maxYear);
    const years = [];
    for (let yr = lo; yr <= hi; yr++) years.push(yr);
    return years;
}

function Calendar({
    mode, viewDate, onViewChange, selectedSingle, onSelectSingle,
    rangeStart, rangeEnd, onRangeClick, onSinglePick,
    minCalendarYear = 1900,
    maxCalendarYear = 2100,
}) {
    const [hoverDate, setHoverDate] = useState(null);
    const today = startOfDay(new Date());
    const y = viewDate.getFullYear();
    const m = viewDate.getMonth();
    const yearOptions = useMemo(() => {
        const lo = Math.min(minCalendarYear, y);
        const hi = Math.max(maxCalendarYear, y);
        return buildYearOptions(lo, hi);
    }, [minCalendarYear, maxCalendarYear, y]);
    const firstDay = new Date(y, m, 1).getDay();
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const prevMonthDays = new Date(y, m, 0).getDate();

    function getDayClass(date) {
        const base = 'w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center text-[10px] sm:text-xs cursor-pointer select-none transition-colors duration-100 ';
        if (mode === 'single') {
            if (sameDay(date, selectedSingle)) return `${base}bg-blue-500 text-white rounded-lg font-medium`;
            if (sameDay(date, today)) return `${base}bg-blue-100 text-blue-700 rounded-lg font-medium`;
            return `${base}hover:bg-gray-100 rounded-lg text-gray-700`;
        }
        const lo = rangeStart && rangeEnd ? (rangeStart <= rangeEnd ? rangeStart : rangeEnd) : rangeStart;
        const hi = rangeStart && rangeEnd ? (rangeStart <= rangeEnd ? rangeEnd : rangeStart)
            : (rangeStart && hoverDate ? (hoverDate >= rangeStart ? hoverDate : null) : null);

        if (lo && sameDay(date, lo) && hi && sameDay(date, hi)) {
            return `${base}bg-blue-500 text-white rounded-lg font-medium`;
        }
        if (lo && sameDay(date, lo)) {
            return `${base}bg-blue-500 text-white font-medium ${hi ? 'rounded-l-lg rounded-r-none' : 'rounded-lg'}`;
        }
        if (hi && sameDay(date, hi)) {
            return `${base}bg-blue-500 text-white font-medium rounded-r-lg rounded-l-none`;
        }
        if (lo && hi && date > lo && date < hi) {
            return `${base}bg-blue-100 text-blue-700 rounded-none`;
        }
        if (sameDay(date, today)) return `${base}bg-blue-50 text-blue-600 rounded-lg font-medium`;
        return `${base}hover:bg-gray-100 rounded-lg text-gray-700`;
    }

    const cells = [];
    for (let i = 0; i < firstDay; i++) {
        cells.push(
            <div key={`p${i}`} className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center text-[10px] sm:text-xs text-gray-300">
                {prevMonthDays - firstDay + i + 1}
            </div>,
        );
    }
    for (let d = 1; d <= daysInMonth; d++) {
        const date = startOfDay(new Date(y, m, d));
        cells.push(
            <div
                key={d}
                role="button"
                tabIndex={0}
                className={getDayClass(date)}
                onClick={() => {
                    if (mode === 'single') {
                        onSelectSingle(date);
                        onSinglePick?.(date);
                    } else onRangeClick(date);
                }}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        if (mode === 'single') {
                            onSelectSingle(date);
                            onSinglePick?.(date);
                        } else onRangeClick(date);
                    }
                }}
                onMouseEnter={() => mode === 'range' && setHoverDate(date)}
                onMouseLeave={() => mode === 'range' && setHoverDate(null)}
            >
                {d}
            </div>,
        );
    }
    const remaining = 42 - firstDay - daysInMonth;
    for (let d = 1; d <= remaining; d++) {
        cells.push(
            <div key={`n${d}`} className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center text-[10px] sm:text-xs text-gray-300">{d}</div>,
        );
    }

    return (
        <div>
            <div className="mb-2.5 flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
                <button
                    type="button"
                    onClick={() => onViewChange(new Date(y, m - 1, 1))}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-gray-200 text-gray-600 transition-colors hover:bg-gray-50"
                    aria-label="Previous month"
                >
                    ‹
                </button>
                <select
                    value={m}
                    onChange={(e) => onViewChange(new Date(y, Number(e.target.value), 1))}
                    className="h-8 min-w-0 flex-1 rounded-lg border border-gray-200 bg-white px-1.5 text-[11px] font-medium text-gray-800 shadow-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 sm:px-2 sm:text-xs"
                    aria-label="Month"
                >
                    {MONTHS.map((name, i) => (
                        <option key={name} value={i}>{name}</option>
                    ))}
                </select>
                <select
                    value={y}
                    onChange={(e) => onViewChange(new Date(Number(e.target.value), m, 1))}
                    className="h-8 w-[4.5rem] shrink-0 rounded-lg border border-gray-200 bg-white px-1 text-[11px] font-medium text-gray-800 shadow-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 sm:w-24 sm:px-2 sm:text-xs"
                    aria-label="Year"
                >
                    {yearOptions.map((yr) => (
                        <option key={yr} value={yr}>{yr}</option>
                    ))}
                </select>
                <button
                    type="button"
                    onClick={() => onViewChange(new Date(y, m + 1, 1))}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-gray-200 text-gray-600 transition-colors hover:bg-gray-50"
                    aria-label="Next month"
                >
                    ›
                </button>
            </div>
            <div className="grid grid-cols-7 mb-1">
                {DAYS.map((d) => (
                    <div key={d} className="w-7 h-6 sm:w-8 sm:h-6 flex items-center justify-center text-[9px] sm:text-[10px] text-gray-400 font-medium">{d}</div>
                ))}
            </div>
            <div className="grid grid-cols-7">
                {cells}
            </div>
        </div>
    );
}

function resolveDefaultQuickKey(presets, defaultQuickKey, initialQuickKey) {
    const want = (defaultQuickKey ?? initialQuickKey)?.toString().toLowerCase().trim();
    if (want && presets.some((p) => p.key === want)) return want;
    return presets[0]?.key ?? 'td';
}

export default function DatePicker({
    mode = 'both',
    onApply,
    initialTab = 'quick',
    /** @deprecated use `defaultQuickKey` */
    initialQuickKey,
    defaultQuickKey,
    /** Ordered short codes: `td`, `tom`, `n7`, `eom`, `yd`, `tm`, `lm`, `tw`, `lw`, `fy`, `lf`. When set, only these quick options appear (2-column grid). */
    quickOptionKeys,
    initialSingle = null,
    initialRangeStart = null,
    initialRangeEnd = null,
    presetSource = 'default',
    /** When set, shows an X inside the card header (portal fields pass this to close the modal). */
    onRequestClose,
    minCalendarYear = 1900,
    maxCalendarYear = 2100,
}) {
    const isLoanPresets = presetSource === 'loan';

    const resolvedQuickKeys = useMemo(() => {
        if (Array.isArray(quickOptionKeys) && quickOptionKeys.length > 0) {
            return quickOptionKeys.map((k) => String(k).toLowerCase().trim());
        }
        if (isLoanPresets) return ['td', 'yd', 'tm', 'lm', 'tw', 'lw', 'fy', 'lf'];
        return null;
    }, [quickOptionKeys, isLoanPresets]);

    const presets = useMemo(() => {
        if (resolvedQuickKeys) return buildQuickPresetsFromKeys(resolvedQuickKeys);
        return filterPresets(getPresets(), mode);
    }, [resolvedQuickKeys, mode]);

    const initialQuickKeyResolved = useMemo(
        () => resolveDefaultQuickKey(presets, defaultQuickKey, initialQuickKey),
        [presets, defaultQuickKey, initialQuickKey],
    );

    const [tab, setTab] = useState(initialTab);
    const [quickKey, setQuickKey] = useState(initialQuickKeyResolved);
    const [viewDate, setViewDate] = useState(() => parseDateValue(initialSingle) || parseDateValue(initialRangeStart) || new Date());
    const [selectedSingle, setSelectedSingle] = useState(() => parseDateValue(initialSingle));
    const [rangeStart, setRangeStart] = useState(() => parseDateValue(initialRangeStart));
    const [rangeEnd, setRangeEnd] = useState(() => parseDateValue(initialRangeEnd));
    const [feedback, setFeedback] = useState('');

    const tabs = useMemo(() => {
        if (isLoanPresets) {
            return [
                { key: 'quick', label: 'Quick select' },
                { key: 'custom', label: 'Custom range' },
            ];
        }
        return [
            { key: 'quick', label: 'Quick select' },
            { key: 'single', label: 'Single date' },
            ...(mode === 'single' ? [] : [{ key: 'range', label: 'Date range' }]),
        ];
    }, [isLoanPresets, mode]);

    const isRangePickerTab = tab === 'range' || tab === 'custom';

    function handleRangeClick(date) {
        if (!rangeStart || (rangeStart && rangeEnd)) {
            setRangeStart(date);
            setRangeEnd(null);
        } else if (date < rangeStart) {
            setRangeEnd(rangeStart);
            setRangeStart(date);
        } else setRangeEnd(date);
    }

    function getLabel() {
        if (tab === 'quick') {
            return presets.find((p) => p.key === quickKey)?.label || '';
        }
        if (tab === 'single') {
            return selectedSingle ? fmt(selectedSingle) : 'Pick a date';
        }
        if (isRangePickerTab) {
            if (rangeStart && rangeEnd) return `${fmt(rangeStart)} → ${fmt(rangeEnd)}`;
            if (rangeStart) return `${fmt(rangeStart)} → …`;
            return 'Pick start date, then end date';
        }
        return '';
    }

    function applyQuickPreset(preset) {
        if (!preset) return;
        if (preset.single) {
            onApply?.({ type: 'single', date: preset.single });
            return;
        }
        if (preset.range) {
            onApply?.({ type: 'range', start: preset.range[0], end: preset.range[1] });
        }
    }

    function handleApply() {
        let result = null;
        if (tab === 'quick') {
            const p = presets.find((p0) => p0.key === quickKey);
            if (p?.single) {
                result = { type: 'single', date: p.single };
            } else if (p?.range) {
                result = { type: 'range', start: p.range[0], end: p.range[1] };
            }
        } else if (tab === 'single') {
            if (!selectedSingle) {
                setFeedback('Please select a date.');
                setTimeout(() => setFeedback(''), 2000);
                return;
            }
            result = { type: 'single', date: selectedSingle };
        } else if (isRangePickerTab) {
            if (!rangeStart || !rangeEnd) {
                setFeedback('Please select a date range.');
                setTimeout(() => setFeedback(''), 2000);
                return;
            }
            result = { type: 'range', start: rangeStart, end: rangeEnd };
        }
        if (!result) {
            setFeedback('Nothing to apply.');
            setTimeout(() => setFeedback(''), 2000);
            return;
        }
        setFeedback('✓ Applied!');
        setTimeout(() => setFeedback(''), 2000);
        onApply?.(result);
    }

    function handleReset() {
        setQuickKey(resolveDefaultQuickKey(presets, defaultQuickKey, initialQuickKey));
        setSelectedSingle(null);
        setRangeStart(null);
        setRangeEnd(null);
        setViewDate(new Date());
        setFeedback('');
        if (isLoanPresets) setTab('quick');
    }

    useEffect(() => {
        if (isLoanPresets) return;
        if (mode === 'single' && tab === 'range') {
            setTab('single');
        }
        if (mode === 'range' && tab === 'single') {
            setTab('range');
        }
    }, [mode, tab, isLoanPresets]);

    useEffect(() => {
        if (tab !== 'quick' || presets.length === 0) return;
        const hasQuick = presets.some((preset) => preset.key === quickKey);
        if (!hasQuick) {
            setQuickKey(presets[0].key);
        }
    }, [tab, quickKey, presets]);

    const useWideQuickGrid = Boolean(resolvedQuickKeys);

    return (
        <div
            className={`w-full rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden font-sans max-h-[calc(100vh-6rem)] flex flex-col ${useWideQuickGrid
                ? 'max-w-[min(21rem,calc(100vw-1.5rem))] min-w-0'
                : 'max-w-[min(19rem,calc(100vw-0.5rem))]'
                }`}
        >
            <div className={`relative border-b border-gray-100 px-3 py-2.5 sm:px-4 sm:py-3 ${onRequestClose ? 'pr-11 sm:pr-12' : ''}`}>
                {onRequestClose ? (
                    <button
                        type="button"
                        onClick={onRequestClose}
                        aria-label="Close"
                        className="absolute right-2 top-2 z-20 flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                    >
                        <FiX className="h-4 w-4" />
                    </button>
                ) : null}
                <p className="text-xs text-gray-400 mb-1 uppercase tracking-wide">Selected</p>
                <p className="text-xs sm:text-sm font-medium text-gray-800 break-words pr-1">
                    {feedback || getLabel()}
                </p>
            </div>

            <div className="flex flex-wrap border-b border-gray-100">
                {tabs.map((t) => (
                    <button
                        key={t.key}
                        type="button"
                        onClick={() => setTab(t.key)}
                        className={`min-w-0 flex-1 py-2 text-[10px] sm:text-[11px] font-medium transition-colors border-b-2 ${tab === t.key
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-gray-400 hover:text-gray-600'
                            }`}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            <div className="px-3 sm:px-4 py-3.5 overflow-y-auto">
                {tab === 'quick' && (
                    <div
                        className={`max-h-[46vh] overflow-y-auto ${useWideQuickGrid ? 'grid grid-cols-2 gap-2' : 'space-y-1.5'}`}
                    >
                        {presets.map((p) => (
                            <button
                                key={p.key}
                                type="button"
                                onClick={() => {
                                    setQuickKey(p.key);
                                    applyQuickPreset(p);
                                }}
                                className={`flex flex-col items-start rounded-lg border px-2 py-2 text-left transition-all sm:px-2.5 sm:py-2.5 ${useWideQuickGrid ? 'min-h-[4.25rem] justify-center' : 'w-full'
                                    } ${quickKey === p.key
                                        ? 'border-blue-300 bg-blue-50'
                                        : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                                    }`}
                            >
                                <span className={`text-[11px] font-semibold sm:text-xs ${quickKey === p.key ? 'text-blue-700' : 'text-gray-700'}`}>
                                    {p.label}
                                </span>
                                <span className={`mt-0.5 line-clamp-2 text-[9px] leading-tight sm:text-[10px] ${quickKey === p.key ? 'text-blue-500' : 'text-gray-400'}`}>
                                    {p.sub}
                                </span>
                            </button>
                        ))}
                    </div>
                )}

                {tab === 'single' && !isLoanPresets && (
                    <Calendar
                        mode="single"
                        viewDate={viewDate}
                        onViewChange={setViewDate}
                        selectedSingle={selectedSingle}
                        onSelectSingle={setSelectedSingle}
                        minCalendarYear={minCalendarYear}
                        maxCalendarYear={maxCalendarYear}
                        onSinglePick={(date) => {
                            onApply?.({ type: 'single', date });
                        }}
                    />
                )}

                {isRangePickerTab && (
                    <div>
                        <p className="text-[10px] text-center text-gray-400 mb-2 min-h-4 px-1">
                            {!rangeStart ? 'Click to set start date (from)'
                                : !rangeEnd ? 'Click to set end date (to)'
                                    : `${fmt(rangeStart)} → ${fmt(rangeEnd)}`}
                        </p>
                        <Calendar
                            mode="range"
                            viewDate={viewDate}
                            onViewChange={setViewDate}
                            rangeStart={rangeStart}
                            rangeEnd={rangeEnd}
                            minCalendarYear={minCalendarYear}
                            maxCalendarYear={maxCalendarYear}
                            onRangeClick={handleRangeClick}
                        />
                    </div>
                )}
            </div>

            <div className="px-3 sm:px-4 py-2.5 border-t border-gray-100 flex flex-col-reverse sm:flex-row justify-end gap-1.5">
                <button
                    type="button"
                    onClick={handleReset}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-gray-500 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors w-full sm:w-auto"
                    title="Reset"
                    aria-label="Reset"
                >
                    <FaUndo className="text-[11px]" />
                </button>
                <button
                    type="button"
                    onClick={handleApply}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-white bg-blue-500 rounded-md hover:bg-blue-600 transition-colors w-full sm:w-auto"
                    title="Apply"
                    aria-label="Apply"
                >
                    <FaCheck className="text-[11px]" />
                </button>
            </div>
        </div>
    );
}

export function DatePickerField({
    value,
    onChange,
    placeholder = 'Select date',
    buttonClassName = '',
    wrapperClassName = '',
    popoverClassName = '',
    initialTab = 'single',
    mode = 'single',
    quickOptionKeys,
    defaultQuickKey,
    initialQuickKey,
    minCalendarYear,
    maxCalendarYear,
}) {
    const [open, setOpen] = useState(false);
    const selectedDate = parseDateValue(value);

    return (
        <div className={`relative ${wrapperClassName}`.trim()}>
            <button
                type="button"
                onClick={() => setOpen((prev) => !prev)}
                className={`${buttonClassName} flex items-center justify-between gap-2`.trim()}
                aria-haspopup="dialog"
                aria-expanded={open}
            >
                <span className={`min-w-0 flex-1 truncate text-left text-xs sm:text-sm ${value ? '' : 'text-gray-400'}`}>
                    {value ? fmt(selectedDate) : placeholder}
                </span>
                <span className="flex-shrink-0 text-[10px] text-gray-400">▾</span>
            </button>

            {open
                && createPortal(
                    <div
                        data-datepicker-portal="true"
                        className="fixed inset-0 z-[9999] grid place-items-center overflow-y-auto bg-black/45 p-3 sm:p-6"
                        onClick={() => setOpen(false)}
                        onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
                        role="presentation"
                    >
                        <div
                            className={`relative w-full max-w-[min(21rem,calc(100vw-1.5rem))] min-w-0 ${popoverClassName}`.trim()}
                            onClick={(e) => e.stopPropagation()}
                            role="dialog"
                            aria-modal="true"
                        >
                            <DatePicker
                                mode={mode}
                                initialTab={initialTab}
                                quickOptionKeys={quickOptionKeys}
                                defaultQuickKey={defaultQuickKey}
                                initialQuickKey={initialQuickKey}
                                initialSingle={selectedDate}
                                minCalendarYear={minCalendarYear}
                                maxCalendarYear={maxCalendarYear}
                                onRequestClose={() => setOpen(false)}
                                onApply={(result) => {
                                    if (result?.type === 'single') {
                                        onChange?.(toIsoDate(result.date));
                                    } else if (result?.type === 'range') {
                                        onChange?.({
                                            start: toIsoDate(result.start),
                                            end: toIsoDate(result.end),
                                        });
                                    }
                                    setOpen(false);
                                }}
                            />
                        </div>
                    </div>,
                    document.body,
                )}
        </div>
    );
}

export function DateRangePickerField({
    value,
    onChange,
    placeholder = 'Select date range',
    buttonClassName = '',
    wrapperClassName = '',
    popoverClassName = '',
    initialTab = 'quick',
    presetSource = 'default',
    /** @deprecated use `defaultQuickKey` */
    initialQuickKey,
    defaultQuickKey,
    quickOptionKeys,
    minCalendarYear,
    maxCalendarYear,
}) {
    const [open, setOpen] = useState(false);
    const startValue = value?.start || value?.start_date || value?.from || '';
    const endValue = value?.end || value?.end_date || value?.to || '';
    const startDate = parseDateValue(startValue);
    const endDate = parseDateValue(endValue);

    const displayValue = startDate && endDate
        ? (sameDay(startDate, endDate)
            ? fmt(startDate)
            : `${fmt(startDate)} to ${fmt(endDate)}`)
        : startDate
            ? `${fmt(startDate)} to ...`
            : placeholder;

    return (
        <div className={`relative ${wrapperClassName}`.trim()}>
            <button
                type="button"
                onClick={() => setOpen((prev) => !prev)}
                className={`${buttonClassName} flex items-center justify-between gap-2`.trim()}
                aria-haspopup="dialog"
                aria-expanded={open}
            >
                <span className={`min-w-0 flex-1 truncate text-left text-xs sm:text-sm ${startDate ? '' : 'text-gray-400'}`}>
                    {displayValue}
                </span>
                <span className="flex-shrink-0 text-[10px] text-gray-400">▾</span>
            </button>

            {open
                && createPortal(
                    <div
                        data-datepicker-portal="true"
                        className="fixed inset-0 z-[9999] grid place-items-center overflow-y-auto bg-black/45 p-3 sm:p-6"
                        onClick={() => setOpen(false)}
                        onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
                        role="presentation"
                    >
                        <div
                            className={`relative w-full max-w-[min(21rem,calc(100vw-1.5rem))] min-w-0 ${popoverClassName}`.trim()}
                            onClick={(e) => e.stopPropagation()}
                            role="dialog"
                            aria-modal="true"
                        >
                            <DatePicker
                                mode="both"
                                presetSource={presetSource}
                                quickOptionKeys={quickOptionKeys}
                                defaultQuickKey={defaultQuickKey}
                                initialQuickKey={initialQuickKey}
                                initialTab={initialTab}
                                initialRangeStart={startDate}
                                initialRangeEnd={endDate}
                                minCalendarYear={minCalendarYear}
                                maxCalendarYear={maxCalendarYear}
                                onRequestClose={() => setOpen(false)}
                                onApply={(result) => {
                                    if (result?.type === 'range') {
                                        onChange?.({
                                            start: toIsoDate(result.start),
                                            end: toIsoDate(result.end),
                                        });
                                    } else if (result?.type === 'single') {
                                        const iso = toIsoDate(result.date);
                                        onChange?.({
                                            start: iso,
                                            end: iso,
                                        });
                                    }
                                    setOpen(false);
                                }}
                            />
                        </div>
                    </div>,
                    document.body,
                )}
        </div>
    );
}
