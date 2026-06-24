import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiAlertCircle, FiCheckCircle, FiInfo, FiRefreshCw, FiXCircle } from 'react-icons/fi';

const DIALOG_CONFIG = {
    confirm: {
        iconBg: 'bg-indigo-100',
        iconRing: 'ring-indigo-200',
        iconColor: 'text-indigo-600',
        Icon: FiInfo,
        accentGradient: 'from-indigo-500 to-violet-500',
        confirmBtnClass: 'bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500',
    },
    warning: {
        iconBg: 'bg-amber-100',
        iconRing: 'ring-amber-200',
        iconColor: 'text-amber-600',
        Icon: FiAlertCircle,
        accentGradient: 'from-amber-500 to-orange-500',
        confirmBtnClass:
            'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 focus:ring-amber-500',
    },
    danger: {
        iconBg: 'bg-rose-100',
        iconRing: 'ring-rose-200',
        iconColor: 'text-rose-600',
        Icon: FiAlertCircle,
        accentGradient: 'from-rose-500 to-pink-500',
        confirmBtnClass:
            'bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-700 hover:to-pink-700 focus:ring-rose-500',
    },
    success: {
        iconBg: 'bg-emerald-100',
        iconRing: 'ring-emerald-200',
        iconColor: 'text-emerald-600',
        Icon: FiCheckCircle,
        accentGradient: 'from-emerald-500 to-teal-500',
        confirmBtnClass:
            'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 focus:ring-emerald-500',
    },
    error: {
        iconBg: 'bg-rose-100',
        iconRing: 'ring-rose-200',
        iconColor: 'text-rose-600',
        Icon: FiXCircle,
        accentGradient: 'from-rose-500 to-pink-500',
        confirmBtnClass:
            'bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-700 hover:to-pink-700 focus:ring-rose-500',
    },
};

const AppDialog = ({ dialog, onClose, onConfirm }) => {
    const cfg = DIALOG_CONFIG[dialog.variant] || DIALOG_CONFIG.confirm;
    const { Icon } = cfg;

    return createPortal(
        <AnimatePresence>
            {dialog.open && (
                <motion.div
                    key="app-dialog-root"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.18 }}
                    className="fixed inset-0 z-[10000] flex items-center justify-center p-4"
                >
                    <div
                        className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
                        onClick={!dialog.loading ? onClose : undefined}
                    />
                    <motion.div
                        key="app-dialog-card"
                        initial={{ opacity: 0, scale: 0.9, y: 16 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 16 }}
                        transition={{ type: 'spring', damping: 28, stiffness: 380 }}
                        className="relative w-full max-w-[420px] bg-white rounded-2xl shadow-2xl overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className={`h-1 w-full bg-gradient-to-r ${cfg.accentGradient}`} />
                        <div className="px-6 pt-5 pb-6">
                            <div className="flex gap-4">
                                <div
                                    className={`mt-0.5 flex-shrink-0 w-11 h-11 rounded-xl ${cfg.iconBg} ring-4 ${cfg.iconRing} flex items-center justify-center`}
                                >
                                    <Icon className={`w-5 h-5 ${cfg.iconColor}`} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-[15px] font-bold text-gray-900 leading-snug">
                                        {dialog.title}
                                    </h3>
                                    <p className="mt-1.5 text-sm text-gray-500 leading-relaxed">
                                        {dialog.message}
                                    </p>
                                </div>
                            </div>
                            <div className="mt-5 border-t border-gray-100" />
                            <div className="mt-4 flex items-center justify-end gap-2.5">
                                {dialog.cancelText && (
                                    <button
                                        type="button"
                                        disabled={dialog.loading}
                                        onClick={onClose}
                                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        {dialog.cancelText}
                                    </button>
                                )}
                                <motion.button
                                    type="button"
                                    disabled={dialog.loading}
                                    onClick={onConfirm}
                                    whileTap={{ scale: dialog.loading ? 1 : 0.97 }}
                                    className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-60 disabled:cursor-not-allowed transition-all ${cfg.confirmBtnClass}`}
                                >
                                    {dialog.loading ? (
                                        <>
                                            <FiRefreshCw className="w-3.5 h-3.5 animate-spin" />
                                            Processing…
                                        </>
                                    ) : (
                                        dialog.confirmText || 'OK'
                                    )}
                                </motion.button>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>,
        document.body
    );
};

export default AppDialog;
