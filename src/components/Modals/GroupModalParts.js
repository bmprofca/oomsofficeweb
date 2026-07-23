import React from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { FiX } from "react-icons/fi";

export const MODAL_BODY_CLASS =
  "px-5 py-4 flex-1 min-h-0 overflow-y-auto overscroll-y-contain [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden";

export const INPUT_CLASS =
  "w-full px-3 py-2 text-sm text-gray-700 border border-gray-200 rounded-lg bg-white outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-60";

export const LABEL_CLASS = "block text-xs font-semibold text-gray-600 mb-1.5";

export const formatGroupDate = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export const formatGroupDateTime = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

/** Viewport-safe modal shell — see context/modal.md */
export function GroupModalShell({
  open,
  onClose,
  maxWidth = "max-w-lg",
  /** Extra classes on the dialog panel (e.g. fixed height). */
  panelClassName = "",
  headerClass = "bg-gradient-to-r from-indigo-600 to-violet-600",
  icon: Icon,
  title,
  subtitle,
  footer,
  children,
  closeDisabled = false,
  zIndex = "z-[200]",
}) {
  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          key="group-modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className={`fixed inset-0 ${zIndex} flex items-start justify-center overflow-hidden overscroll-none p-3 sm:p-4 pointer-events-none`}
        >
          <motion.button
            type="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm pointer-events-auto"
            aria-label="Close dialog"
            onClick={closeDisabled ? undefined : onClose}
            disabled={closeDisabled}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="group-modal-title"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className={`relative z-[1] pointer-events-auto flex w-full ${maxWidth} my-2 sm:my-4 max-h-[calc(100vh-1.5rem)] sm:max-h-[calc(100vh-2rem)] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ${panelClassName}`}
            onClick={(e) => e.stopPropagation()}
          >
            <header className={`shrink-0 ${headerClass} px-4 py-2.5 text-white`}>
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  {Icon ? (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/15 ring-1 ring-white/20">
                      <Icon className="h-3.5 w-3.5" aria-hidden />
                    </div>
                  ) : null}
                  <div className="min-w-0">
                    <h2
                      id="group-modal-title"
                      className="truncate text-sm font-semibold leading-tight"
                    >
                      {title}
                    </h2>
                    {subtitle ? (
                      <p className="mt-0.5 truncate text-[11px] leading-tight text-white/85">
                        {subtitle}
                      </p>
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
              <footer className="shrink-0 border-t border-gray-100 bg-gray-50 px-5 py-3">
                {footer}
              </footer>
            ) : null}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
