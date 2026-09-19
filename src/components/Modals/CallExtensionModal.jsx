import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { FiX, FiPhone, FiLoader } from "react-icons/fi";

const FORM_ID = "call-extension-form";

const BODY_CLASS =
  "px-5 py-4 flex-1 min-h-0 overflow-y-auto overscroll-y-contain [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden";

/**
 * Enable / update PBX extension for click-to-call.
 */
const CallExtensionModal = ({ isOpen, onClose, row, onSubmit, saving }) => {
  const [extension, setExtension] = useState("");

  useEffect(() => {
    if (isOpen && row) {
      setExtension(row.call_extension || "");
    }
  }, [isOpen, row]);

  if (typeof document === "undefined") return null;

  const isUpdate = Boolean(row?.call_enabled);
  const title = isUpdate ? "Update Extension" : "Enable Click-to-Call";
  const submitLabel = isUpdate ? "Save Extension" : "Save & Enable";
  const subtitle =
    row?.profile?.name || row?.designation || "Branch staff";

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!row || !extension.trim()) return;
    onSubmit({
      map_id: row.map_id,
      enabled: true,
      call_extension: extension.trim(),
    });
  };

  return createPortal(
    <AnimatePresence>
      {isOpen && row ? (
        <motion.div
          key="call-extension-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[210] flex items-start justify-center overflow-hidden overscroll-none p-3 sm:p-4 pointer-events-none"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/50 backdrop-blur-sm pointer-events-auto"
            aria-label="Close"
            onClick={saving ? undefined : onClose}
            disabled={saving}
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="call-extension-title"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="relative z-[1] pointer-events-auto bg-white rounded-2xl shadow-2xl w-full max-w-md my-2 sm:my-4 max-h-[calc(100vh-1.5rem)] sm:max-h-[calc(100vh-2rem)] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="shrink-0 px-5 py-3.5 border-b border-gray-100 bg-gradient-to-r from-teal-600 to-emerald-600 text-white flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
                  <FiPhone className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h2
                    id="call-extension-title"
                    className="text-base font-bold m-0 truncate"
                  >
                    {title}
                  </h2>
                  <p className="text-xs text-white/80 m-0 truncate">{subtitle}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="p-1.5 rounded-lg text-white/90 hover:text-white hover:bg-white/10 disabled:opacity-50 shrink-0"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            <div
              className={BODY_CLASS}
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
              <form id={FORM_ID} onSubmit={handleSubmit} className="space-y-3">
                <p className="text-sm text-gray-500 m-0 leading-relaxed">
                  Enter the PBX extension assigned to this person. Click-to-call
                  will dial from this extension.
                </p>
                <div>
                  <label
                    htmlFor="call_extension"
                    className="block text-sm font-medium text-gray-700 mb-1.5"
                  >
                    Extension code <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="call_extension"
                    type="text"
                    value={extension}
                    onChange={(e) => setExtension(e.target.value)}
                    placeholder="e.g. 1001"
                    disabled={saving}
                    autoFocus
                    autoComplete="off"
                    className="w-full px-3 py-2.5 text-sm text-gray-800 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none disabled:opacity-60 placeholder:text-gray-400 font-mono tracking-wide"
                  />
                </div>
              </form>
            </div>

            <div className="shrink-0 px-5 py-3.5 border-t border-gray-100 bg-gray-50 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="px-3.5 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-white disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                form={FORM_ID}
                disabled={saving || !extension.trim()}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg disabled:opacity-50"
              >
                {saving ? (
                  <FiLoader className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <FiPhone className="w-3.5 h-3.5" />
                )}
                {submitLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body
  );
};

export default CallExtensionModal;
