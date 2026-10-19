import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { FiX } from 'react-icons/fi';

/**
 * Viewport-safe modal shell for the AI settings dialogs (context/modal.md):
 * portal + AnimatePresence, fixed header/footer, only the body scrolls, Esc / backdrop close.
 */
export default function AiSettingsModal({ open, onClose, title, subtitle, icon, children, footer, size = 'max-w-xl', busy = false, labelledBy }) {
  const panelRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape' && !busy) onClose();
    };
    document.addEventListener('keydown', onKey);
    const t = setTimeout(() => panelRef.current?.querySelector('input, select, button:not([data-close])')?.focus(), 50);
    return () => {
      document.removeEventListener('keydown', onKey);
      clearTimeout(t);
    };
  }, [open, onClose, busy]);

  const titleId = labelledBy || 'ai-settings-modal-title';

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center overflow-hidden overscroll-none p-3 sm:p-4">
          <motion.div
            key="backdrop"
            className="pointer-events-auto absolute inset-0 bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => !busy && onClose()}
          />
          <motion.div
            key="panel"
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className={`pointer-events-auto relative z-[1] flex max-h-[calc(100vh-1.5rem)] w-full ${size} flex-col overflow-hidden rounded-2xl bg-white shadow-2xl sm:max-h-[calc(100vh-2rem)]`}
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 px-5 py-3.5">
              <div className="flex items-start gap-3">
                {icon}
                <div>
                  <h2 id={titleId} className="text-[16px] font-semibold text-slate-900">{title}</h2>
                  {subtitle && <p className="mt-0.5 text-[12.5px] text-slate-500">{subtitle}</p>}
                </div>
              </div>
              <button type="button" data-close onClick={onClose} disabled={busy} className="ui-btn ui-btn-ghost ui-btn-icon" aria-label="Close">
                <FiX className="h-4 w-4" />
              </button>
            </div>
            <div
              className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-5 py-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {children}
            </div>
            {footer && <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-slate-100 px-5 py-3">{footer}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
