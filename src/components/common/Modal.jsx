import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { FiX } from 'react-icons/fi';

const SIZE_CLASS = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    '2xl': 'max-w-5xl',
};

/**
 * Centered modal with backdrop, scrollable body, and optional footer.
 * Layout follows ADMIN Modal structure, adapted for CLIENT (portal, larger sizes).
 */
const Modal = ({
    isOpen,
    onClose,
    title,
    subtitle,
    children,
    footer,
    size = 'md',
    className = '',
    bodyClassName = '',
    zIndexClass = 'z-[10050]',
}) => {
    useEffect(() => {
        if (!isOpen) return undefined;

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        const onKeyDown = (e) => {
            if (e.key === 'Escape') onClose?.();
        };
        window.addEventListener('keydown', onKeyDown);

        return () => {
            document.body.style.overflow = previousOverflow;
            window.removeEventListener('keydown', onKeyDown);
        };
    }, [isOpen, onClose]);

    if (typeof document === 'undefined') return null;

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <div
                    className={`fixed inset-0 flex items-start justify-center overflow-hidden overscroll-none p-3 sm:p-4 pointer-events-none ${zIndexClass}`}
                >
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="absolute inset-0 bg-slate-900/55 backdrop-blur-sm pointer-events-auto"
                        onClick={onClose}
                        aria-hidden="true"
                    />

                    <motion.div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="app-modal-title"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        transition={{ duration: 0.2 }}
                        className={`relative z-[1] pointer-events-auto my-2 sm:my-4 flex w-full ${SIZE_CLASS[size] || SIZE_CLASS.md} max-h-[min(calc(100vh-1.5rem),100dvh)] sm:max-h-[min(calc(100vh-2rem),100dvh)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl ${className}`.trim()}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-indigo-100 bg-gradient-to-r from-indigo-600 to-indigo-700 px-5 py-3.5 text-white">
                            <div className="min-w-0">
                                <h2 id="app-modal-title" className="truncate text-lg font-semibold">
                                    {title}
                                </h2>
                                {subtitle ? (
                                    <p className="mt-0.5 truncate text-sm text-indigo-100">{subtitle}</p>
                                ) : null}
                            </div>
                            <button
                                type="button"
                                onClick={onClose}
                                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white/90 transition-colors hover:bg-white/15"
                                aria-label="Close"
                            >
                                <FiX className="h-5 w-5" />
                            </button>
                        </div>

                        <div className={`flex-1 min-h-0 overflow-y-auto overscroll-y-contain ${bodyClassName}`.trim()}>
                            {children}
                        </div>

                        {footer ? (
                            <div className="shrink-0 border-t border-slate-200 bg-slate-50 px-5 py-3">
                                {footer}
                            </div>
                        ) : null}
                    </motion.div>
                </div>
            )}
        </AnimatePresence>,
        document.body
    );
};

export default Modal;
