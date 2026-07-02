import React from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { FiX } from 'react-icons/fi';

export const MODAL_BODY_CLASS =
    'px-5 py-4 flex-1 min-h-0 overflow-y-auto overscroll-y-contain [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden';

export const INPUT_CLASS =
    'w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500';

export const LABEL_CLASS = 'block text-xs font-medium text-slate-700 mb-1';

/** Viewport-safe modal shell — see context/modal.md */
export function CapitalModalShell({
    open,
    onClose,
    maxWidth = 'max-w-lg',
    headerClass = 'bg-gradient-to-r from-blue-600 to-blue-700',
    icon: Icon,
    title,
    subtitle,
    footer,
    children,
    closeDisabled = false,
}) {
    if (typeof document === 'undefined') return null;

    return createPortal(
        <AnimatePresence>
            {open ? (
                <motion.div
                    key="capital-modal-overlay"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="fixed inset-0 z-[10050] flex items-start justify-center overflow-hidden overscroll-none p-3 sm:p-4 pointer-events-none"
                >
                    <button
                        type="button"
                        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm pointer-events-auto"
                        aria-label="Close dialog"
                        onClick={closeDisabled ? undefined : onClose}
                        disabled={closeDisabled}
                    />
                    <motion.div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="capital-modal-title"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className={`relative z-[1] pointer-events-auto flex w-full ${maxWidth} my-2 sm:my-4 max-h-[calc(100vh-1.5rem)] sm:max-h-[calc(100vh-2rem)] flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xl`}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <header className={`shrink-0 ${headerClass} px-5 py-3.5 text-white`}>
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex min-w-0 items-center gap-3">
                                    {Icon ? (
                                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/20">
                                            <Icon className="h-4 w-4" aria-hidden />
                                        </div>
                                    ) : null}
                                    <div className="min-w-0">
                                        <h2 id="capital-modal-title" className="truncate text-sm font-semibold sm:text-base">
                                            {title}
                                        </h2>
                                        {subtitle ? (
                                            <p className="mt-0.5 truncate text-[11px] text-white/85">{subtitle}</p>
                                        ) : null}
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={onClose}
                                    disabled={closeDisabled}
                                    className="shrink-0 rounded-lg p-1.5 text-white/85 transition-colors hover:bg-white/15 disabled:opacity-50"
                                    aria-label="Close"
                                >
                                    <FiX className="h-4 w-4" />
                                </button>
                            </div>
                        </header>

                        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                            {children}
                        </div>

                        {footer ? (
                            <footer className="shrink-0 border-t border-slate-200 bg-slate-50/90 px-5 py-3">
                                {footer}
                            </footer>
                        ) : null}
                    </motion.div>
                </motion.div>
            ) : null}
        </AnimatePresence>,
        document.body
    );
}

export function CapitalModalFooterActions({
    onCancel,
    onConfirm,
    cancelLabel = 'Cancel',
    confirmLabel,
    loading = false,
    confirmType = 'button',
    formId,
}) {
    return (
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-2">
            <button
                type="button"
                onClick={onCancel}
                disabled={loading}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
            >
                {cancelLabel}
            </button>
            <button
                type={confirmType}
                form={formId}
                onClick={confirmType === 'button' ? onConfirm : undefined}
                disabled={loading}
                className="inline-flex min-w-[120px] items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
                {loading ? 'Please wait…' : confirmLabel}
            </button>
        </div>
    );
}
