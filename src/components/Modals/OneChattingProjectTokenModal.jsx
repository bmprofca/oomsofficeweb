import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { FiX, FiKey, FiLoader } from "react-icons/fi";

const FORM_ID = "onechatting-project-token-form";

const BODY_CLASS =
  "px-5 py-4 flex-1 min-h-0 overflow-y-auto overscroll-y-contain [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden";

/**
 * Set / update branch OneChatting project developer token.
 * Layout follows CLIENT/context/modal.md.
 */
const OneChattingProjectTokenModal = ({
  isOpen,
  onClose,
  initialToken = "",
  onSubmit,
  saving,
}) => {
  const [developerToken, setDeveloperToken] = useState("");

  useEffect(() => {
    if (isOpen) {
      setDeveloperToken(initialToken || "");
    }
  }, [isOpen, initialToken]);

  if (typeof document === "undefined") return null;

  const isUpdate = Boolean(initialToken);
  const title = isUpdate
    ? "Update Project Token"
    : "Set Project Developer Token";
  const submitLabel = isUpdate ? "Save Token" : "Save Token";

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!developerToken.trim()) return;
    onSubmit({ developer_token: developerToken.trim() });
  };

  return createPortal(
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          key="onechatting-project-token-overlay"
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
            aria-labelledby="onechatting-project-token-title"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="relative z-[1] pointer-events-auto bg-white rounded-2xl shadow-2xl w-full max-w-md my-2 sm:my-4 max-h-[calc(100vh-1.5rem)] sm:max-h-[calc(100vh-2rem)] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="shrink-0 px-5 py-3.5 border-b border-gray-100 bg-gradient-to-r from-indigo-600 to-blue-600 text-white flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
                  <FiKey className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h2
                    id="onechatting-project-token-title"
                    className="text-base font-bold m-0 truncate"
                  >
                    {title}
                  </h2>
                  <p className="text-xs text-white/80 m-0 truncate">
                    Branch project access
                  </p>
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
                <div>
                  <label
                    htmlFor="project_developer_token"
                    className="block text-sm font-medium text-gray-700 mb-1.5"
                  >
                    Project Developer Token{" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="project_developer_token"
                    type="text"
                    value={developerToken}
                    onChange={(e) => setDeveloperToken(e.target.value)}
                    placeholder="Enter OneChatting project developer token"
                    disabled={saving}
                    autoFocus
                    className="w-full px-3 py-2.5 text-sm text-gray-800 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none disabled:opacity-60 placeholder:text-gray-400 font-mono"
                  />
                  <p className="text-xs text-gray-500 mt-2 leading-relaxed m-0">
                    Used for branch-level OneChatting APIs such as template list
                    and client contact sync. This is separate from each staff
                    user’s developer token.
                  </p>
                </div>
              </form>
            </div>

            <div className="shrink-0 px-5 py-3 border-t border-gray-100 bg-gray-50 flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-100 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                form={FORM_ID}
                disabled={saving || !developerToken.trim()}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg disabled:opacity-50"
              >
                {saving ? (
                  <FiLoader className="w-3.5 h-3.5 animate-spin" />
                ) : null}
                {submitLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
};

export default OneChattingProjectTokenModal;
