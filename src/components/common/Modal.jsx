import { useEffect } from 'react';
import { createPortal } from 'react-dom';
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
 * Body scroll lock is handled app-wide by BodyScrollLockObserver — do not set
 * document.body.style.overflow here (it races with the observer and can stick).
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
    compactHeader = false,
    zIndexClass = 'z-[10050]',
}) => {
    useEffect(() => {
        if (!isOpen) return undefined;

        const onKeyDown = (e) => {
            if (e.key === 'Escape') onClose?.();
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [isOpen, onClose]);

    if (typeof document === 'undefined' || !isOpen) return null;

    return createPortal(
        <div
            className={`fixed inset-0 flex items-start justify-center overflow-hidden overscroll-none p-3 sm:p-4 ${zIndexClass}`}
            onClick={onClose}
        >
            <div
                className="absolute inset-0 bg-slate-900/55 backdrop-blur-sm"
                aria-hidden="true"
            />

            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="app-modal-title"
                className={`relative z-[1] my-2 sm:my-4 flex w-full ${SIZE_CLASS[size] || SIZE_CLASS.md} max-h-[min(calc(100vh-1.5rem),100dvh)] sm:max-h-[min(calc(100vh-2rem),100dvh)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl ${className}`.trim()}
                onClick={(e) => e.stopPropagation()}
            >
                <div className={`flex shrink-0 items-center justify-between gap-3 border-b border-indigo-100 bg-gradient-to-r from-indigo-600 to-indigo-700 px-5 text-white ${compactHeader ? 'py-2' : 'py-3.5'}`}>
                    <div className="min-w-0">
                        <h2 id="app-modal-title" className={`truncate font-semibold ${compactHeader ? 'text-base' : 'text-lg'}`}>
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
            </div>
        </div>,
        document.body
    );
};

export default Modal;
