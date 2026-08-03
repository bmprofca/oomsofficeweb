import React from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { FiAlertTriangle, FiX, FiLoader } from "react-icons/fi";

/**
 * Generic confirm dialog styled like delete-confirmation.js
 * (gradient header, icon, cancel / confirm) — no OTP.
 */
export default function ConfirmActionModal({
  isOpen = false,
  title = "Confirm",
  heading = "Are you sure?",
  message = "",
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  loading = false,
  tone = "danger", // danger | primary | warning
  icon: Icon = FiAlertTriangle,
  children = null,
  onCancel,
  onConfirm,
}) {
  if (typeof document === "undefined") return null;

  const tones = {
    danger: {
      header: "bg-gradient-to-r from-red-600 to-red-700",
      iconWrap: "bg-red-100 ring-8 ring-red-50",
      icon: "text-red-600",
      banner: "bg-red-50 border-red-100 text-red-800",
      confirm:
        "bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 shadow-sm shadow-red-200",
    },
    primary: {
      header: "bg-gradient-to-r from-indigo-600 to-indigo-700",
      iconWrap: "bg-indigo-100 ring-8 ring-indigo-50",
      icon: "text-indigo-600",
      banner: "bg-indigo-50 border-indigo-100 text-indigo-800",
      confirm:
        "bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 shadow-sm shadow-indigo-200",
    },
    warning: {
      header: "bg-gradient-to-r from-amber-500 to-amber-600",
      iconWrap: "bg-amber-100 ring-8 ring-amber-50",
      icon: "text-amber-600",
      banner: "bg-amber-50 border-amber-100 text-amber-900",
      confirm:
        "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 shadow-sm shadow-amber-200",
    },
  };
  const t = tones[tone] || tones.danger;

  return createPortal(
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          key="confirm-action-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[210] flex items-center justify-center overflow-hidden overscroll-none p-3 sm:p-4 pointer-events-none"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/50 backdrop-blur-sm pointer-events-auto"
            aria-label="Close"
            onClick={loading ? undefined : onCancel}
            disabled={loading}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="relative z-[1] pointer-events-auto bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className={`${t.header} text-white px-6 py-4 flex justify-between items-center shrink-0`}
            >
              <h2 className="text-lg font-bold m-0 tracking-tight">{title}</h2>
              <button
                type="button"
                onClick={onCancel}
                disabled={loading}
                className="text-white/90 hover:text-white p-1.5 rounded-lg hover:bg-white/10 disabled:opacity-50 transition-colors"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-6 flex-1 min-h-0">
              <div className="text-center">
                <div
                  className={`w-16 h-16 ${t.iconWrap} rounded-full flex items-center justify-center mx-auto mb-4`}
                >
                  <Icon className={`w-8 h-8 ${t.icon}`} />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 m-0 mb-3">
                  {heading}
                </h3>
                {message ? (
                  <div
                    className={`rounded-xl border px-4 py-3 text-left ${t.banner}`}
                  >
                    <p className="text-sm font-medium leading-relaxed m-0">
                      {message}
                    </p>
                  </div>
                ) : null}
                {children ? <div className="mt-4 text-left">{children}</div> : null}
              </div>
            </div>

            <div className="border-t border-gray-100 px-6 py-4 bg-gray-50 flex justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={onCancel}
                disabled={loading}
                className="px-5 py-2.5 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-100 text-gray-700 disabled:opacity-50 transition-colors"
              >
                {cancelLabel}
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={loading}
                className={`inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white rounded-lg disabled:opacity-50 transition-all ${t.confirm}`}
              >
                {loading ? (
                  <FiLoader className="w-4 h-4 animate-spin" />
                ) : (
                  <Icon className="w-4 h-4" />
                )}
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
