import React, { useState, useEffect, useId } from 'react';
import {
    FiChevronsLeft,
    FiChevronLeft,
    FiChevronRight,
    FiChevronsRight,
    FiCornerDownLeft,
} from 'react-icons/fi';

const DEFAULT_ROW_OPTIONS = [5, 10, 20, 50, 100];

/**
 * Compact table footer: range summary, rows-per-page, icon pagination, optional jump.
 *
 * Props:
 * @param {boolean} [showRange=true] — “Showing X to Y of Z”
 * @param {boolean} [showRows=true] — rows-per-page `<select>`
 * @param {number[]} [rowOptions] — option values (default 5…100)
 * @param {number} [defaultRows=20] — fallback limit if `limit` is invalid; also used when coercing select value
 * @param {boolean} [showJump=true] — jump-to-page field + submit
 * @param {boolean} [showFirstLast=true] — first / last chevron buttons
 * @param {number} page — current page (1-based)
 * @param {number} limit — page size
 * @param {number} [total=0] — total records
 * @param {number} [totalPages=1] — total pages from API
 * @param {boolean} [isLastPage] — when set, disables Next when true (e.g. API `is_last_page`); when omitted, uses `page >= totalPages`
 * @param {(page: number) => void} onPageChange
 * @param {(limit: number) => void} [onLimitChange] — required when `showRows` is true
 * @param {string} [className] — extra classes on outer wrapper
 */
const TablePagination = ({
    showRange = true,
    showRows = true,
    rowOptions = DEFAULT_ROW_OPTIONS,
    defaultRows = 20,
    showJump = true,
    showFirstLast = true,
    page,
    limit,
    total = 0,
    totalPages = 1,
    isLastPage: isLastPageProp,
    onPageChange,
    onLimitChange,
    className = '',
}) => {
    const rowsFieldId = useId();
    const [jumpPageInput, setJumpPageInput] = useState('');

    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.max(1, Number(limit) || defaultRows);
    const safeTotal = Math.max(0, Number(total) || 0);
    const resolvedTotalPages = Math.max(1, Number(totalPages) || 1);

    const numericOptions = [...new Set(rowOptions.map((n) => Number(n)).filter((n) => Number.isFinite(n) && n > 0))].sort(
        (a, b) => a - b
    );
    const effectiveRowOptions =
        numericOptions.length > 0
            ? numericOptions.includes(safeLimit)
                ? numericOptions
                : [...numericOptions, safeLimit].sort((a, b) => a - b)
            : DEFAULT_ROW_OPTIONS;

    const rangeStart = safeTotal === 0 ? 0 : (safePage - 1) * safeLimit + 1;
    const rangeEnd = Math.min(safePage * safeLimit, safeTotal);

    const atLastPage =
        isLastPageProp !== undefined && isLastPageProp !== null
            ? Boolean(isLastPageProp)
            : safePage >= resolvedTotalPages;

    useEffect(() => {
        setJumpPageInput('');
    }, [safePage, safeLimit]);

    const totalPagesForJump = resolvedTotalPages;

    const parsedJumpPage = (() => {
        const t = String(jumpPageInput).trim();
        if (!t) return null;
        const n = Number(t);
        if (!Number.isFinite(n) || !Number.isInteger(n)) return NaN;
        return n;
    })();

    const jumpPageInputInvalid =
        String(jumpPageInput).trim() !== '' &&
        (Number.isNaN(parsedJumpPage) ||
            parsedJumpPage < 1 ||
            parsedJumpPage > totalPagesForJump);

    const jumpPageCanSubmit =
        String(jumpPageInput).trim() !== '' &&
        !Number.isNaN(parsedJumpPage) &&
        parsedJumpPage >= 1 &&
        parsedJumpPage <= totalPagesForJump;

    const handleJumpSubmit = (e) => {
        e.preventDefault();
        if (!jumpPageCanSubmit || !onPageChange) return;
        onPageChange(parsedJumpPage);
        setJumpPageInput('');
    };

    const handleFirst = () => {
        if (safePage > 1 && onPageChange) onPageChange(1);
    };

    const handlePrev = () => {
        if (safePage > 1 && onPageChange) onPageChange(safePage - 1);
    };

    const handleNext = () => {
        if (!atLastPage && onPageChange) onPageChange(safePage + 1);
    };

    const handleLast = () => {
        if (safePage < resolvedTotalPages && onPageChange) onPageChange(resolvedTotalPages);
    };

    const handleRowsChange = (e) => {
        if (!onLimitChange) return;
        const raw = Number(e.target.value);
        const next = Math.min(100, Math.max(1, Number.isFinite(raw) ? raw : defaultRows));
        onLimitChange(next);
    };

    const showControls = Boolean(onPageChange);
    const showJumpBlock = showJump && showControls;

    return (
        <div
            className={`border-t border-slate-200 bg-gradient-to-r from-slate-50 to-white px-4 py-3 sm:py-3.5 sm:px-5 ${className}`.trim()}
        >
            <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                {(showRange || showRows) && (
                    <div className="flex min-w-0 flex-wrap items-center gap-3">
                        {showRange && (
                            <div className="whitespace-nowrap text-sm text-slate-500">
                                Showing{' '}
                                <span className="font-medium text-slate-700">{rangeStart}</span>
                                {' to '}
                                <span className="font-medium text-slate-700">{rangeEnd}</span>
                                {' of '}
                                <span className="font-medium text-slate-700">{safeTotal}</span>
                            </div>
                        )}
                        {showRows && onLimitChange && (
                            <div className="flex items-center gap-2">
                                <label htmlFor={rowsFieldId} className="text-xs font-medium text-slate-500">
                                    Rows per page
                                </label>
                                <select
                                    id={rowsFieldId}
                                    value={safeLimit}
                                    onChange={handleRowsChange}
                                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                                >
                                    {effectiveRowOptions.map((n) => (
                                        <option key={n} value={n}>
                                            {n}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>
                )}

                {showControls && (
                    <div className="flex min-w-0 w-full flex-wrap items-center justify-end gap-2 sm:w-auto sm:flex-nowrap sm:gap-3">
                        <div className="flex flex-wrap items-center justify-end gap-1 sm:gap-1.5">
                            {showFirstLast && (
                                <button
                                    type="button"
                                    onClick={handleFirst}
                                    disabled={safePage === 1}
                                    title="First page"
                                    aria-label="First page"
                                    className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm transition-colors ${
                                        safePage === 1
                                            ? 'cursor-not-allowed text-slate-300'
                                            : 'text-slate-700 hover:bg-indigo-50 hover:text-indigo-600'
                                    }`}
                                >
                                    <FiChevronsLeft className="h-4 w-4" aria-hidden />
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={handlePrev}
                                disabled={safePage === 1}
                                title="Previous page"
                                aria-label="Previous page"
                                className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm transition-colors ${
                                    safePage === 1
                                        ? 'cursor-not-allowed text-slate-300'
                                        : 'text-slate-700 hover:bg-indigo-50 hover:text-indigo-600'
                                }`}
                            >
                                <FiChevronLeft className="h-4 w-4" aria-hidden />
                            </button>
                            <span className="inline-flex h-9 min-w-[2.25rem] items-center justify-center rounded-lg border border-slate-200 bg-white px-2 text-sm font-semibold tabular-nums text-slate-800">
                                {safePage}
                            </span>
                            <button
                                type="button"
                                onClick={handleNext}
                                disabled={atLastPage}
                                title="Next page"
                                aria-label="Next page"
                                className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm transition-colors ${
                                    atLastPage
                                        ? 'cursor-not-allowed text-slate-300'
                                        : 'text-slate-700 hover:bg-indigo-50 hover:text-indigo-600'
                                }`}
                            >
                                <FiChevronRight className="h-4 w-4" aria-hidden />
                            </button>
                            {showFirstLast && (
                                <button
                                    type="button"
                                    onClick={handleLast}
                                    disabled={safePage === resolvedTotalPages}
                                    title="Last page"
                                    aria-label="Last page"
                                    className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm transition-colors ${
                                        safePage === resolvedTotalPages
                                            ? 'cursor-not-allowed text-slate-300'
                                            : 'text-slate-700 hover:bg-indigo-50 hover:text-indigo-600'
                                    }`}
                                >
                                    <FiChevronsRight className="h-4 w-4" aria-hidden />
                                </button>
                            )}
                        </div>

                        {showJumpBlock && (
                            <>
                                <span className="hidden h-6 w-px shrink-0 self-center bg-slate-200 sm:block" aria-hidden />
                                <form
                                    onSubmit={handleJumpSubmit}
                                    className="flex min-w-0 shrink-0 items-center gap-2"
                                >
                                    <span className="hidden text-xs text-slate-500 lg:inline">Jump</span>
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        autoComplete="off"
                                        placeholder="Page"
                                        value={jumpPageInput}
                                        onChange={(e) => setJumpPageInput(e.target.value)}
                                        aria-invalid={jumpPageInputInvalid}
                                        aria-label={`Go to page, 1–${totalPagesForJump}`}
                                        className={`w-16 rounded-lg border px-2 py-2 text-center text-sm focus:outline-none focus:ring-2 ${
                                            jumpPageInputInvalid
                                                ? 'border-red-500 text-red-700 focus:border-red-500 focus:ring-red-500/30'
                                                : 'border-slate-200 bg-white text-slate-800 focus:border-indigo-500 focus:ring-indigo-500/30'
                                        }`}
                                    />
                                    <button
                                        type="submit"
                                        disabled={!jumpPageCanSubmit}
                                        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm transition-colors hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-white disabled:shadow-none"
                                        aria-label="Go to page"
                                    >
                                        <FiCornerDownLeft className="h-4 w-4" />
                                    </button>
                                    <span className="text-xs tabular-nums text-slate-500">/ {totalPagesForJump}</span>
                                </form>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default TablePagination;
