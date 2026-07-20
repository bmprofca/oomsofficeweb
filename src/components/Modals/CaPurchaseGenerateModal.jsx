import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { FiRefreshCw, FiX } from 'react-icons/fi';
import { TbFileInvoice } from 'react-icons/tb';

const formatCurrency = (value) => {
    const n = Number(value);
    if (!Number.isFinite(n)) return '—';
    return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
};

const sanitizeAmountInput = (value) => {
    const normalized = String(value ?? '').replace(/,/g, '.').replace(/[^\d.]/g, '');
    const [whole = '', ...rest] = normalized.split('.');
    if (rest.length === 0) return whole;
    return `${whole}.${rest.join('').slice(0, 2)}`;
};

/**
 * @param {{
 *   isOpen: boolean,
 *   row: { task_id?: string, service_name?: string, service_fees?: number|string } | null,
 *   onClose: () => void,
 *   onSubmit: (amount: number) => Promise<{ success: boolean, error?: string }>,
 *   submitting?: boolean,
 *   canViewFees?: boolean,
 * }} props
 */
const CaPurchaseGenerateModal = ({
    isOpen,
    row,
    onClose,
    onSubmit,
    submitting = false,
    canViewFees = true,
}) => {
    const [amount, setAmount] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            setAmount('');
            setError('');
        }
    }, [isOpen, row?.task_id]);

    const handleClose = () => {
        if (submitting) return;
        onClose?.();
    };

    const handleSubmit = async () => {
        if (!row?.task_id || submitting) return;

        const amountNum = Number(amount);
        if (!Number.isFinite(amountNum) || amountNum <= 0) {
            setError('Please enter a purchase amount greater than 0');
            return;
        }

        setError('');
        const result = await onSubmit?.(amountNum);
        if (result && !result.success && result.error) {
            setError(result.error);
        }
    };

    if (typeof document === 'undefined') return null;

    return createPortal(
        <AnimatePresence>
            {isOpen && row && (
                <div className="fixed inset-0 z-[10050] flex items-start justify-center overflow-hidden overscroll-none p-3 sm:p-4 pointer-events-none">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm pointer-events-auto"
                        onClick={handleClose}
                        aria-hidden
                    />
                    <motion.div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="ca-purchase-generate-title"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="relative z-[1] pointer-events-auto my-2 sm:my-4 flex w-full max-w-md max-h-[calc(100vh-1.5rem)] sm:max-h-[calc(100vh-2rem)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="shrink-0 border-b border-slate-100 bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-3.5">
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex items-start gap-3 min-w-0">
                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/20 text-white">
                                        <TbFileInvoice className="h-4.5 w-4.5" />
                                    </div>
                                    <div className="min-w-0">
                                        <h3
                                            id="ca-purchase-generate-title"
                                            className="text-sm font-bold text-white"
                                        >
                                            Generate CA Purchase
                                        </h3>
                                        <p className="mt-0.5 text-xs text-amber-50">
                                            Enter purchase amount for this invoice
                                        </p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleClose}
                                    disabled={submitting}
                                    className="rounded-lg p-1.5 text-white/80 transition hover:bg-white/15 hover:text-white disabled:opacity-50"
                                    aria-label="Close"
                                >
                                    <FiX className="h-4 w-4" />
                                </button>
                            </div>
                        </div>

                        <div
                            className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain px-5 py-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                        >
                            <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                                <div className="flex justify-between gap-3 text-sm">
                                    <span className="text-slate-500">Service</span>
                                    <span className="max-w-[60%] text-right font-medium text-slate-800">
                                        {row.service_name}
                                    </span>
                                </div>
                                <div className="flex justify-between gap-3 text-sm">
                                    <span className="text-slate-500">Task fees</span>
                                    <span
                                        className={`font-semibold tabular-nums text-slate-800 ${
                                            !canViewFees ? 'blur-[3.5px] select-none' : ''
                                        }`}
                                    >
                                        {formatCurrency(row.service_fees)}
                                    </span>
                                </div>
                                <div className="border-t border-slate-200 pt-2 text-xs text-slate-400">
                                    {row.task_id}
                                </div>
                            </div>

                            <div className="mt-4">
                                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                                    Purchase amount *
                                </label>
                                <div className="relative">
                                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                                        ₹
                                    </span>
                                    <input
                                        type="text"
                                        inputMode="decimal"
                                        autoFocus
                                        value={amount}
                                        onChange={(e) => {
                                            setAmount(sanitizeAmountInput(e.target.value));
                                            setError('');
                                        }}
                                        placeholder="Enter amount"
                                        disabled={submitting}
                                        className="w-full rounded-xl border border-slate-200 py-2.5 pl-7 pr-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-50"
                                    />
                                </div>
                                {error ? (
                                    <p className="mt-1.5 text-xs text-rose-600" role="alert">
                                        {error}
                                    </p>
                                ) : (
                                    <p className="mt-1.5 text-xs text-slate-500">
                                        Used on the purchase invoice (not task fees).
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="shrink-0 border-t border-slate-100 bg-slate-50/90 px-5 py-3">
                            <div className="flex items-center justify-end gap-2.5">
                                <button
                                    type="button"
                                    disabled={submitting}
                                    onClick={handleClose}
                                    className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    disabled={submitting}
                                    onClick={handleSubmit}
                                    className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:from-amber-600 hover:to-orange-600 disabled:opacity-60"
                                >
                                    {submitting ? (
                                        <>
                                            <FiRefreshCw className="h-3.5 w-3.5 animate-spin" />
                                            Generating…
                                        </>
                                    ) : (
                                        'Generate'
                                    )}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>,
        document.body
    );
};

export default CaPurchaseGenerateModal;
