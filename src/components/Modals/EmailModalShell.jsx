import React from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";

export const EMAIL_MODAL_BODY =
  "px-5 py-4 flex-1 min-h-0 overflow-y-auto overscroll-y-contain [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden";

/** Viewport-safe modal shell with fade-only open/close. See CLIENT/context/modal.md */
export default function EmailModalShell({
  show,
  onHide,
  maxWidthClass = "max-w-4xl",
  fullScreen = false,
  children,
}) {
  if (typeof document === "undefined") return null;

  const panelClass = fullScreen
    ? "relative z-[1] pointer-events-auto bg-white rounded-xl shadow-2xl w-[calc(100vw-1.5rem)] sm:w-[calc(100vw-2rem)] h-[min(calc(100vh-1.5rem),100dvh)] sm:h-[calc(100vh-2rem)] overflow-hidden flex flex-col"
    : `relative z-[1] pointer-events-auto bg-white rounded-2xl shadow-2xl w-full ${maxWidthClass} max-h-[min(calc(100vh-1.5rem),100dvh)] sm:max-h-[calc(100vh-2rem)] overflow-hidden flex flex-col`;

  return createPortal(
    <AnimatePresence>
      {show ? (
        <motion.div
          key="email-modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden overscroll-none p-3 sm:p-4 pointer-events-none"
        >
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm pointer-events-auto"
            onClick={onHide}
            aria-hidden
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className={panelClass}
            onClick={(e) => e.stopPropagation()}
          >
            {children}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
