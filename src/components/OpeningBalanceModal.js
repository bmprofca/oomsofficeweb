import React from 'react';
import { motion } from 'framer-motion';
import { FiBarChart2, FiX } from 'react-icons/fi';
import { DatePickerField } from './PortalDatePicker';

const OpeningBalanceModal = ({
    isOpen,
    onClose,
    isLoading,
    isSubmitting,
    openingBalanceData,
    openingBalanceForm,
    setOpeningBalanceForm,
    onSubmit,
    formatCurrency,
}) => {
    if (!isOpen) return null;

    const sanitizeAmountInput = (value) => {
        const normalized = String(value ?? '').replace(/,/g, '.').replace(/[^\d.]/g, '');
        const [whole = '', ...rest] = normalized.split('.');
        if (rest.length === 0) return whole;
        const fraction = rest.join('').slice(0, 2);
        return `${whole}.${fraction}`;
    };

    return (
        <div
            className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-start justify-center p-3 sm:p-4 overflow-y-auto"
            onMouseDown={(e) => {
                if (e.target === e.currentTarget) onClose?.();
            }}
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative w-full max-w-lg my-2 sm:my-4 max-h-[calc(100vh-1.5rem)] sm:max-h-[calc(100vh-2rem)] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="px-5 py-3.5 border-b border-slate-200 bg-gradient-to-r from-indigo-600 to-indigo-700 shrink-0">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-white/20 rounded-lg">
                                <FiBarChart2 className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-white">
                                    {openingBalanceData ? 'Update Opening Balance' : 'Set Opening Balance'}
                                </h2>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => !isSubmitting && onClose?.()}
                            className="p-2 rounded-lg hover:bg-white/15 transition-colors"
                        >
                            <FiX className="w-5 h-5 text-white" />
                        </button>
                    </div>
                </div>

                {isLoading ? (
                    <div className="px-5 py-4 flex-1 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                        <div className="py-12 flex justify-center">
                            <div className="animate-spin h-10 w-10 rounded-full border-4 border-indigo-200 border-t-indigo-600" />
                        </div>
                    </div>
                ) : (
                    <form onSubmit={onSubmit} className="flex flex-1 flex-col min-h-0">
                        <div className="px-5 py-4 space-y-4 flex-1 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Amount *</label>
                                    <input
                                        type="text"
                                        inputMode="decimal"
                                        required
                                        value={openingBalanceForm.amount}
                                        onChange={(e) => setOpeningBalanceForm((f) => ({ ...f, amount: sanitizeAmountInput(e.target.value) }))}
                                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                        placeholder="0.00"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Type *</label>
                                    <select
                                        value={openingBalanceForm.type}
                                        onChange={(e) => setOpeningBalanceForm((f) => ({ ...f, type: e.target.value }))}
                                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    >
                                        <option value="credit">Credit (Client owes you)</option>
                                        <option value="debit">Debit (You owe client)</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">Transaction Date *</label>
                                <DatePickerField
                                    value={openingBalanceForm.transaction_date}
                                    onChange={(value) => setOpeningBalanceForm((f) => ({ ...f, transaction_date: value || '' }))}
                                    mode="single"
                                    hideTabs={true}
                                    showResetButton={false}
                                    placeholder="Select date"
                                    buttonClassName="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">Remark</label>
                                <textarea
                                    rows={3}
                                    value={openingBalanceForm.remark}
                                    onChange={(e) => setOpeningBalanceForm((f) => ({ ...f, remark: e.target.value }))}
                                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
                                    placeholder="Optional note..."
                                />
                            </div>

                            {openingBalanceData && (
                                <div className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                                    Current: {formatCurrency(openingBalanceData.amount)} ({openingBalanceData.type})
                                    {openingBalanceData.invoice_no && ` • ${openingBalanceData.invoice_no}`}
                                </div>
                            )}
                        </div>

                        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 shrink-0">
                            <div className="flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => !isSubmitting && onClose?.()}
                                    className="px-4 py-2.5 border border-slate-200 rounded-xl text-slate-700 font-medium hover:bg-slate-100 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting || !openingBalanceForm.amount || parseFloat(openingBalanceForm.amount) <= 0}
                                    className="min-w-[140px] px-4 py-2.5 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors inline-flex justify-center items-center"
                                >
                                    {isSubmitting ? 'Saving...' : (openingBalanceData ? 'Update' : 'Set Opening Balance')}
                                </button>
                            </div>
                        </div>
                    </form>
                )}
            </motion.div>
        </div>
    );
};

export default OpeningBalanceModal;
