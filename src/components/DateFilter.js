import React, { useState, useRef, useEffect } from 'react';
import { FiChevronDown } from 'react-icons/fi';

const formatDateForDisplay = (date) => {
    if (!date || date === '') return '';
    const dateObj = date instanceof Date ? date : new Date(date);
    if (isNaN(dateObj.getTime())) return '';
    return dateObj.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    }).replace(/\//g, '/');
};

const buildRangeLabel = (from, to) => {
    if (!from || !to) return '';
    return `${formatDateForDisplay(from)} – ${formatDateForDisplay(to)}`;
};

const getThisMonthBounds = () => {
    const today = new Date();
    const from = new Date(today.getFullYear(), today.getMonth(), 1);
    const to = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    return { from, to, label: buildRangeLabel(from, to) };
};

const DateFilter = ({ onChange, onSearch, className = '' }) => {
    const [isOpen, setIsOpen] = useState(false);
    /** Preset title shown on the trigger (actual range is shown by the parent page). */
    const [selectionTitle, setSelectionTitle] = useState('This Month');
    const [showCustomPicker, setShowCustomPicker] = useState(false);
    const [customStartDate, setCustomStartDate] = useState('');
    const [customEndDate, setCustomEndDate] = useState('');
    const dropdownRef = useRef(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
                setShowCustomPicker(false);
            }
        };

        document.addEventListener('click', handleClickOutside, true);
        return () => {
            document.removeEventListener('click', handleClickOutside, true);
        };
    }, []);

    const options = [
        { label: 'Today', value: 'today' },
        { label: 'This Week', value: 'this_week' },
        { label: 'This Month', value: 'this_month' },
        { label: 'Last Month', value: 'last_month' },
        { label: 'This FY', value: 'this_fy' },
        { label: 'Previous FY', value: 'prev_fy' },
        { label: 'Custom Dates', value: 'custom' },
    ];

    const formatDateForInput = (date) => {
        return date.toISOString().split('T')[0];
    };

    const handleSelect = (option) => {
        if (option.value === 'custom') {
            setShowCustomPicker(true);
            setIsOpen(true);
            return;
        }

        setIsOpen(false);
        setShowCustomPicker(false);

        // Calculate date range based on selection
        const today = new Date();
        let from, to;

        switch (option.value) {
            case 'today':
                from = today;
                to = today;
                break;
            case 'this_week':
                const firstDayOfWeek = new Date(today);
                firstDayOfWeek.setDate(today.getDate() - today.getDay());
                const lastDayOfWeek = new Date(today);
                lastDayOfWeek.setDate(today.getDate() - today.getDay() + 6);
                from = firstDayOfWeek;
                to = lastDayOfWeek;
                break;
            case 'this_month':
                from = new Date(today.getFullYear(), today.getMonth(), 1);
                to = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                break;
            case 'last_month':
                from = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                to = new Date(today.getFullYear(), today.getMonth(), 0);
                break;
            case 'this_fy':
                // Financial year logic (April to March)
                const currentYear = today.getFullYear();
                const fiscalYearStart = today.getMonth() >= 3 ?
                    new Date(currentYear, 3, 1) :
                    new Date(currentYear - 1, 3, 1);
                const fiscalYearEnd = today.getMonth() >= 3 ?
                    new Date(currentYear + 1, 2, 31) :
                    new Date(currentYear, 2, 31);
                from = fiscalYearStart;
                to = fiscalYearEnd;
                break;
            case 'prev_fy':
                const prevYear = today.getFullYear() - 1;
                from = new Date(prevYear, 3, 1);
                to = new Date(prevYear + 1, 2, 31);
                break;
            default:
                return;
        }

        const range = `${formatDateForDisplay(from)} - ${formatDateForDisplay(to)}`;
        setSelectionTitle(option.label);

        if (onChange) {
            onChange({
                type: option.value,
                range,
                from,
                to,
                presetLabel: option.label,
            });
        }

        // Auto search when selecting predefined ranges
        if (onSearch) {
            onSearch(from, to);
        }
    };

    const handleCustomDateApply = () => {
        if (!customStartDate || !customEndDate) {
            alert('Please select both start and end dates');
            return;
        }

        const start = new Date(customStartDate);
        const end = new Date(customEndDate);

        if (start > end) {
            alert('Start date cannot be after end date');
            return;
        }

        setSelectionTitle('Custom Dates');
        setIsOpen(false);
        setShowCustomPicker(false);

        const range = `${formatDateForDisplay(start)} - ${formatDateForDisplay(end)}`;

        if (onChange) {
            onChange({
                type: 'custom',
                range,
                from: start,
                to: end,
                presetLabel: 'Custom Dates',
            });
        }

        // Trigger search for custom dates
        if (onSearch) {
            onSearch(start, end);
        }
    };

    const handleCustomDateCancel = () => {
        setShowCustomPicker(false);
        setCustomStartDate('');
        setCustomEndDate('');
    };

    // Default custom dates + sync label with "this month" (same as parent default range)
    useEffect(() => {
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        const lastDay = today;

        setCustomStartDate(formatDateForInput(firstDay));
        setCustomEndDate(formatDateForInput(lastDay));
        setSelectionTitle('This Month');
    }, []);

    const rootClassName = className.trim()
        ? `relative flex items-center gap-2 ${className}`
        : 'relative flex w-full items-center gap-2 sm:w-auto';

    return (
        <div className={rootClassName} ref={dropdownRef}>
            {/* Date Filter Dropdown */}
            <div className="relative w-full sm:w-auto">
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsOpen((o) => !o);
                    }}
                    className="flex h-9 w-full min-w-0 items-center justify-between gap-2 rounded-lg border border-slate-300 bg-white px-2.5 text-left text-slate-700 shadow-sm transition-colors hover:border-slate-400 sm:h-10 sm:min-w-[10.5rem] sm:max-w-[14rem] sm:px-3"
                >
                    <span className="min-w-0 flex-1 truncate text-xs font-medium text-slate-800 sm:text-sm">
                        {selectionTitle}
                    </span>
                    <FiChevronDown className={`h-4 w-4 shrink-0 text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>

                {isOpen && (
                    <div className="absolute left-0 top-full z-[200] mt-1 w-64 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl">
                        {!showCustomPicker ? (
                            // Main options list
                            <>
                                {options.map((option) => (
                                    <button
                                        key={option.value}
                                        onClick={() => handleSelect(option)}
                                        className="flex items-center w-full px-4 py-3 text-sm text-slate-700 hover:bg-blue-50 transition-colors text-left border-b border-slate-100 last:border-b-0"
                                    >
                                        {option.label}
                                    </button>
                                ))}
                            </>
                        ) : (
                            // Custom date picker
                            <div className="p-4">
                                <h4 className="font-semibold text-slate-800 mb-3">Select Date Range</h4>

                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">
                                            Start Date
                                        </label>
                                        <input
                                            type="date"
                                            value={customStartDate}
                                            onChange={(e) => setCustomStartDate(e.target.value)}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">
                                            End Date
                                        </label>
                                        <input
                                            type="date"
                                            value={customEndDate}
                                            onChange={(e) => setCustomEndDate(e.target.value)}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-2 mt-4">
                                    <button
                                        onClick={handleCustomDateCancel}
                                        className="flex-1 px-3 py-2 text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleCustomDateApply}
                                        className="flex-1 px-3 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                                    >
                                        Apply
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Search Button
            <button
                onClick={() => {
                    // Get current date range and trigger search
                    const today = new Date();
                    let from, to;
                    
                    switch (selectedOption) {
                        case 'Today':
                            from = today;
                            to = today;
                            break;
                        case 'This Week':
                            const firstDayOfWeek = new Date(today);
                            firstDayOfWeek.setDate(today.getDate() - today.getDay());
                            const lastDayOfWeek = new Date(today);
                            lastDayOfWeek.setDate(today.getDate() - today.getDay() + 6);
                            from = firstDayOfWeek;
                            to = lastDayOfWeek;
                            break;
                        case 'This Month':
                            from = new Date(today.getFullYear(), today.getMonth(), 1);
                            to = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                            break;
                        case 'Custom Date':
                            // Use the custom dates that are already set
                            if (customStartDate && customEndDate) {
                                from = new Date(customStartDate);
                                to = new Date(customEndDate);
                            } else {
                                // Fallback to current month
                                from = new Date(today.getFullYear(), today.getMonth(), 1);
                                to = today;
                            }
                            break;
                        default:
                            from = new Date(today.getFullYear(), today.getMonth(), 1);
                            to = today;
                    }

                    if (onSearch) {
                        onSearch(from, to);
                    }
                }}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 shadow-sm"
            >
                <FiSearch className="w-4 h-4" />
                Search
            </button> */}
        </div>
    );
};

export default DateFilter;