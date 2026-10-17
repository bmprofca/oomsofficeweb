import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { FiCheck, FiPlus, FiSearch, FiX } from 'react-icons/fi';

/**
 * Shared building blocks for the multi-step "create" modals (task, client).
 * Full screen on phones, a centred panel from `sm` up.
 */

export function WizardModal({ isOpen, onClose, labelledBy, children, maxWidth = 'sm:max-w-5xl', closeOnEsc = true }) {
    useEffect(() => {
        if (!isOpen) return undefined;
        const previous = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = previous;
        };
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen || !closeOnEsc) return undefined;
        const onKey = (e) => {
            if (e.key !== 'Escape' || e.defaultPrevented) return;
            onClose?.();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [isOpen, closeOnEsc, onClose]);

    // Enter animation only: closing is instant, so the modal can never get stuck
    // half-closed if animation frames are paused (background tab, hidden pane).
    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[220] flex items-stretch justify-center sm:items-center sm:p-4 lg:p-6">
            <motion.div
                className="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.18 }}
                aria-hidden
            />
            <motion.div
                role="dialog"
                aria-modal="true"
                aria-labelledby={labelledBy}
                className={`relative flex h-[100dvh] w-full flex-col overflow-hidden bg-white shadow-pop sm:h-[min(92vh,900px)] sm:rounded-2xl sm:border sm:border-slate-200 ${maxWidth}`}
                initial={{ opacity: 0, y: 18, scale: 0.99 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
            >
                {children}
            </motion.div>
        </div>,
        document.body
    );
}

export function WizardHeader({ id, icon, title, subtitle, actions, onClose }) {
    return (
        <div className="flex shrink-0 items-center gap-3 border-b border-slate-200 px-4 py-3 sm:px-6 sm:py-4">
            {icon && (
                <span className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100 sm:flex">
                    {icon}
                </span>
            )}
            <div className="min-w-0 flex-1">
                <h2 id={id} className="truncate font-display text-base font-semibold text-slate-900 sm:text-lg">
                    {title}
                </h2>
                {subtitle && <p className="truncate text-xs text-slate-500 sm:text-[13px]">{subtitle}</p>}
            </div>
            {actions}
            <button
                type="button"
                onClick={onClose}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                aria-label="Close"
                title="Close (Esc)"
            >
                <FiX className="h-5 w-5" />
            </button>
        </div>
    );
}

/** Equal-width step columns, so it always fits — even five steps on a 320px phone. */
export function WizardStepper({ steps, current, onStepClick, canJumpTo }) {
    const cols = { 2: 'grid-cols-2', 3: 'grid-cols-3', 4: 'grid-cols-4', 5: 'grid-cols-5', 6: 'grid-cols-6' }[steps.length] || 'grid-cols-5';
    return (
        <div className="shrink-0 border-b border-slate-200 bg-slate-50/70 px-3 py-3 sm:px-6">
            <ol className={`m-0 grid list-none gap-1 p-0 ${cols}`} aria-label="Progress">
                {steps.map((step, index) => {
                    const n = index + 1;
                    const isActive = n === current;
                    const isDone = n < current;
                    const clickable = Boolean(onStepClick) && (canJumpTo ? canJumpTo(n) : n < current);
                    const Tag = clickable ? 'button' : 'div';
                    return (
                        <li key={step.title} className="relative min-w-0" aria-current={isActive ? 'step' : undefined}>
                            {index > 0 && (
                                <span
                                    aria-hidden
                                    className={`absolute right-1/2 top-[15px] h-0.5 w-full -translate-y-1/2 rounded-full transition-colors duration-300 sm:top-4 ${
                                        n <= current ? 'bg-indigo-500' : 'bg-slate-200'
                                    }`}
                                />
                            )}
                            <Tag
                                {...(clickable ? { type: 'button', onClick: () => onStepClick(n) } : {})}
                                className={`relative flex w-full flex-col items-center text-center ${clickable ? 'cursor-pointer' : 'cursor-default'}`}
                            >
                                <span
                                    className={`relative z-10 flex h-[30px] w-[30px] items-center justify-center rounded-full border-2 text-xs font-semibold transition-all duration-300 sm:h-8 sm:w-8 ${
                                        isActive
                                            ? 'border-indigo-600 bg-indigo-600 text-white ring-4 ring-indigo-100'
                                            : isDone
                                              ? 'border-indigo-600 bg-white text-indigo-600'
                                              : 'border-slate-200 bg-white text-slate-400'
                                    }`}
                                >
                                    {isDone ? <FiCheck className="h-3.5 w-3.5" strokeWidth={3} /> : n}
                                </span>
                                <span
                                    className={`mt-1.5 block w-full truncate px-0.5 text-[11px] font-semibold leading-tight sm:text-xs ${
                                        isActive ? 'text-indigo-700' : isDone ? 'text-slate-700' : 'text-slate-400'
                                    }`}
                                >
                                    {step.title}
                                </span>
                                {step.subtitle && (
                                    <span className="mt-0.5 hidden w-full truncate px-0.5 text-[11px] text-slate-400 md:block">
                                        {step.subtitle}
                                    </span>
                                )}
                            </Tag>
                        </li>
                    );
                })}
            </ol>
        </div>
    );
}

export function WizardBody({ children, className = '' }) {
    return (
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain bg-white">
            <div className={`mx-auto w-full max-w-4xl px-4 py-5 sm:px-6 sm:py-6 ${className}`}>{children}</div>
        </div>
    );
}

export function WizardStepIntro({ step, total, title, description, aside }) {
    return (
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-indigo-600">
                    Step {step} of {total}
                </p>
                <h3 className="mt-0.5 font-display text-lg font-semibold text-slate-900">{title}</h3>
                {description && <p className="mt-0.5 text-sm text-slate-500">{description}</p>}
            </div>
            {aside}
        </div>
    );
}

export function WizardFooter({ hint, children }) {
    return (
        <div className="flex shrink-0 items-center gap-3 border-t border-slate-200 bg-white px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6">
            <div className="hidden min-w-0 flex-1 truncate text-xs text-slate-500 sm:block">{hint}</div>
            <div className="flex flex-1 items-center justify-end gap-2 sm:flex-none">{children}</div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Form primitives
// ---------------------------------------------------------------------------

export const inputClass = (hasError = false, extra = '') =>
    `block w-full rounded-lg border bg-white pl-3 pr-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500 ${
        hasError ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20' : 'border-slate-200 hover:border-slate-300'
    } ${extra}`;

export function FormField({ label, required, hint, error, children, className = '', htmlFor }) {
    return (
        <div className={`min-w-0 ${className}`}>
            {label && (
                <label htmlFor={htmlFor} className="mb-1.5 block text-[13px] font-medium text-slate-700">
                    {label}
                    {required && <span className="ml-0.5 text-red-500">*</span>}
                </label>
            )}
            {children}
            {error ? (
                <p className="mt-1 text-xs text-red-600" role="alert">
                    {error}
                </p>
            ) : hint ? (
                <p className="mt-1 text-xs text-slate-500">{hint}</p>
            ) : null}
        </div>
    );
}

export function IconInput({ icon: Icon, hasError, right, className = '', ...props }) {
    return (
        <div className="relative">
            {Icon && (
                <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            )}
            <input {...props} className={inputClass(hasError, `${Icon ? 'pl-9' : ''} ${right ? 'pr-20' : ''} ${className}`)} />
            {right && <div className="absolute right-2.5 top-1/2 flex -translate-y-1/2 items-center gap-1.5">{right}</div>}
        </div>
    );
}

export function SelectInput({ hasError, children, className = '', ...props }) {
    return (
        <div className="relative">
            <select {...props} className={inputClass(hasError, `cursor-pointer appearance-none pr-9 ${className}`)}>
                {children}
            </select>
            <svg
                className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden
            >
                <path
                    fillRule="evenodd"
                    d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                    clipRule="evenodd"
                />
            </svg>
        </div>
    );
}

export function FormSection({ title, description, icon: Icon, tone = 'indigo', actions, children, className = '' }) {
    const toneClass = {
        indigo: 'bg-indigo-50 text-indigo-600',
        emerald: 'bg-emerald-50 text-emerald-600',
        amber: 'bg-amber-50 text-amber-600',
        violet: 'bg-violet-50 text-violet-600',
        sky: 'bg-sky-50 text-sky-600',
        rose: 'bg-rose-50 text-rose-600',
    }[tone];
    return (
        <section className={`rounded-xl border border-slate-200 bg-white ${className}`}>
            {(title || actions) && (
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
                    <div className="flex min-w-0 items-center gap-2.5">
                        {Icon && (
                            <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${toneClass}`}>
                                <Icon className="h-3.5 w-3.5" />
                            </span>
                        )}
                        <div className="min-w-0">
                            <h4 className="truncate text-sm font-semibold text-slate-900">{title}</h4>
                            {description && <p className="truncate text-xs text-slate-500">{description}</p>}
                        </div>
                    </div>
                    {actions}
                </div>
            )}
            <div className="p-4">{children}</div>
        </section>
    );
}

// ---------------------------------------------------------------------------
// Transfer list (pick from "available" into "selected")
// ---------------------------------------------------------------------------

const AVATAR_TONES = [
    'bg-indigo-50 text-indigo-700',
    'bg-emerald-50 text-emerald-700',
    'bg-amber-50 text-amber-700',
    'bg-violet-50 text-violet-700',
    'bg-sky-50 text-sky-700',
    'bg-rose-50 text-rose-700',
];

export function initialsOf(text = '') {
    const parts = String(text).replace(/[^\p{L}\p{N} ]/gu, ' ').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '?';
    return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

function toneFor(key = '') {
    let h = 0;
    for (const ch of String(key)) h = (h * 31 + ch.charCodeAt(0)) % 997;
    return AVATAR_TONES[h % AVATAR_TONES.length];
}

function PickRow({ item, selected, onClick, disabled }) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className={`group flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                selected ? 'hover:bg-rose-50/60' : 'hover:bg-indigo-50/60'
            }`}
        >
            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${toneFor(item.key)}`}>
                {initialsOf(item.title)}
            </span>
            <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-medium text-slate-900">{item.title}</span>
                {item.subtitle && <span className="block truncate text-xs text-slate-500">{item.subtitle}</span>}
            </span>
            {item.meta && <span className="hidden shrink-0 text-[11px] text-slate-400 sm:inline">{item.meta}</span>}
            <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md border transition-colors ${
                    selected
                        ? 'border-slate-200 text-slate-400 group-hover:border-rose-200 group-hover:bg-white group-hover:text-rose-600'
                        : 'border-slate-200 text-slate-400 group-hover:border-indigo-200 group-hover:bg-white group-hover:text-indigo-600'
                }`}
                aria-hidden
            >
                {selected ? <FiX className="h-3.5 w-3.5" /> : <FiPlus className="h-3.5 w-3.5" />}
            </span>
        </button>
    );
}

function RowSkeleton({ count = 4 }) {
    return Array.from({ length: count }, (_, i) => (
        <div key={i} className="flex items-center gap-3 px-2.5 py-2" aria-hidden>
            <span className="h-8 w-8 animate-pulse rounded-full bg-slate-100" />
            <span className="flex-1 space-y-1.5">
                <span className="block h-3 w-2/3 animate-pulse rounded bg-slate-100" />
                <span className="block h-2.5 w-1/3 animate-pulse rounded bg-slate-100" />
            </span>
        </div>
    ));
}

export function TransferList({
    availableTitle = 'Available',
    selectedTitle = 'Selected',
    available = [],
    selected = [],
    availableCount,
    onAdd,
    onRemove,
    onAddAll,
    onRemoveAll,
    search,
    loading = false,
    loadingMore = false,
    emptyAvailable = 'Nothing found',
    emptySelected = 'Nothing selected yet',
    availableListRef,
    availableFooter = null,
    disabled = false,
    hasError = false,
    heightClass = 'h-72 lg:h-[340px]',
}) {
    const paneClass = `flex min-w-0 flex-col overflow-hidden rounded-xl border bg-white ${hasError ? 'border-red-300 ring-2 ring-red-100' : 'border-slate-200'}`;
    return (
        <div className={`grid grid-cols-1 gap-3 lg:grid-cols-2 ${disabled ? 'pointer-events-none opacity-60' : ''}`}>
            <div className={paneClass}>
                <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-3 py-2.5">
                    <div className="flex min-w-0 items-center gap-2">
                        <span className="truncate text-[13px] font-semibold text-slate-800">{availableTitle}</span>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                            {availableCount ?? available.length}
                        </span>
                    </div>
                    {onAddAll && (
                        <button
                            type="button"
                            onClick={onAddAll}
                            disabled={available.length === 0}
                            className="rounded-md px-2 py-1 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent"
                        >
                            Add all
                        </button>
                    )}
                </div>
                {search && (
                    <div className="border-b border-slate-100 p-2">
                        <div className="relative">
                            <FiSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                value={search.value}
                                onChange={(e) => search.onChange(e.target.value)}
                                placeholder={search.placeholder || 'Search…'}
                                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20"
                            />
                        </div>
                    </div>
                )}
                <div ref={availableListRef} className={`shrink-0 space-y-0.5 overflow-y-auto overscroll-contain p-1.5 ${heightClass}`}>
                    {loading && available.length === 0 && <RowSkeleton count={5} />}
                    {!loading && available.length === 0 && (
                        <div className="flex h-full items-center justify-center px-4 py-8 text-center text-sm text-slate-400">
                            {emptyAvailable}
                        </div>
                    )}
                    {available.map((item) => (
                        <PickRow key={item.key} item={item} onClick={() => onAdd(item)} />
                    ))}
                    {loadingMore && <RowSkeleton count={2} />}
                    {availableFooter}
                </div>
            </div>

            <div className={paneClass}>
                <div className="flex items-center justify-between gap-2 border-b border-slate-100 bg-indigo-50/40 px-3 py-2.5">
                    <div className="flex min-w-0 items-center gap-2">
                        <span className="truncate text-[13px] font-semibold text-slate-800">{selectedTitle}</span>
                        <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-[11px] font-semibold text-white">
                            {selected.length}
                        </span>
                    </div>
                    {onRemoveAll && (
                        <button
                            type="button"
                            onClick={onRemoveAll}
                            disabled={selected.length === 0}
                            className="rounded-md px-2 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent"
                        >
                            Clear
                        </button>
                    )}
                </div>
                <div className={`shrink-0 space-y-0.5 overflow-y-auto overscroll-contain p-1.5 ${heightClass}`}>
                    {selected.length === 0 ? (
                        <div className="flex h-full flex-col items-center justify-center gap-2 px-4 py-8 text-center">
                            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                                <FiPlus className="h-4 w-4" />
                            </span>
                            <p className="text-sm text-slate-400">{emptySelected}</p>
                        </div>
                    ) : (
                        selected.map((item) => (
                            <PickRow key={item.key} item={item} selected onClick={() => onRemove(item)} />
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}

export function SegmentedControl({ options, value, onChange, className = '' }) {
    return (
        <div className={`inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 ${className}`} role="tablist">
            {options.map((opt) => {
                const active = opt.value === value;
                return (
                    <button
                        key={opt.value}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        disabled={opt.disabled}
                        onClick={() => onChange(opt.value)}
                        className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-50 ${
                            active ? 'bg-white text-indigo-700 shadow-sm ring-1 ring-slate-200' : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                        {opt.icon}
                        {opt.label}
                    </button>
                );
            })}
        </div>
    );
}

export function Toggle({ checked, onChange, label, description }) {
    return (
        <label className="flex cursor-pointer items-start gap-3">
            <button
                type="button"
                role="switch"
                aria-checked={checked}
                onClick={() => onChange(!checked)}
                className={`relative mt-0.5 inline-flex h-5 w-9 shrink-0 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/30 ${
                    checked ? 'bg-indigo-600' : 'bg-slate-200'
                }`}
            >
                <span
                    className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                        checked ? 'translate-x-[18px]' : 'translate-x-0.5'
                    }`}
                />
            </button>
            <span className="min-w-0">
                <span className="block text-sm font-medium text-slate-800">{label}</span>
                {description && <span className="block text-xs text-slate-500">{description}</span>}
            </span>
        </label>
    );
}
