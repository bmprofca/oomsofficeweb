import React from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { FiAlertTriangle } from "react-icons/fi";

const GroupDeleteConfirmModal = ({
  isOpen,
  group,
  loading = false,
  onCancel,
  onConfirm,
}) => {
  if (typeof document === "undefined") return null;

  const firmCount = Number(group?.firm_count) || 0;
  const blocked = firmCount > 0;
  const name = group?.name || "this group";

  return createPortal(
    <AnimatePresence>
      {isOpen && group ? (
        <motion.div
          key="group-delete-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[210] flex items-start justify-center overflow-hidden overscroll-none p-3 sm:p-4 pointer-events-none"
        >
          <motion.button
            type="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm pointer-events-auto"
            aria-label="Close"
            onClick={loading ? undefined : onCancel}
            disabled={loading}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="relative z-[1] pointer-events-auto bg-white rounded-2xl shadow-2xl w-full max-w-sm my-2 sm:my-4 max-h-[calc(100vh-1.5rem)] sm:max-h-[calc(100vh-2rem)] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex-1 min-h-0 overflow-y-auto px-5 py-5">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-3 ${
                  blocked ? "bg-amber-100" : "bg-red-100"
                }`}
              >
                <FiAlertTriangle
                  className={`w-5 h-5 ${blocked ? "text-amber-600" : "text-red-600"}`}
                />
              </div>
              <h4 className="text-center text-sm font-semibold text-gray-800 mb-1">
                {blocked ? "Cannot delete group" : "Delete group?"}
              </h4>
              <p className="text-center text-xs text-gray-500 leading-relaxed">
                {blocked
                  ? `"${name}" has ${firmCount} firm(s). Remove firms first.`
                  : `This will permanently delete "${name}".`}
              </p>
            </div>
            <div className="shrink-0 px-5 py-3 border-t border-gray-100 bg-gray-50 flex gap-2">
              <button
                type="button"
                onClick={onCancel}
                disabled={loading}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
              >
                {blocked ? "Close" : "Cancel"}
              </button>
              {!blocked ? (
                <button
                  type="button"
                  onClick={onConfirm}
                  disabled={loading}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
                >
                  {loading ? (
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : null}
                  Delete
                </button>
              ) : null}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
};

export default GroupDeleteConfirmModal;
