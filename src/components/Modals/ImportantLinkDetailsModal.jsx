import React, { useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { FiEye, FiX, FiEdit2, FiCopy, FiExternalLink, FiEyeOff } from "react-icons/fi";
import { toast } from "react-hot-toast";

const MODAL_BODY =
  "px-5 py-4 flex-1 min-h-0 overflow-y-auto overscroll-y-contain [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden";

const DetailRow = ({ label, children, last = false }) => (
  <div className={`flex items-start justify-between gap-4 py-2.5 ${last ? "" : "border-b border-gray-100"}`}>
    <span className="text-xs font-semibold text-gray-500 shrink-0">{label}</span>
    <div className="text-sm font-medium text-gray-800 text-right min-w-0">{children}</div>
  </div>
);

const copyText = async (text, label) => {
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  } catch {
    toast.error(`Failed to copy ${label.toLowerCase()}`);
  }
};

export default function ImportantLinkDetailsModal({ open, link, onClose, onEdit }) {
  const [showPassword, setShowPassword] = useState(false);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && link ? (
        <motion.div
          key="important-link-details-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden overscroll-none p-3 sm:p-4 pointer-events-none"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/50 backdrop-blur-sm pointer-events-auto"
            aria-label="Close"
            onClick={() => {
              setShowPassword(false);
              onClose();
            }}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="relative z-[1] pointer-events-auto bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[min(calc(100vh-1.5rem),100dvh)] sm:max-h-[calc(100vh-2rem)] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="shrink-0 flex items-center justify-between gap-3 px-5 py-3.5 border-b border-gray-200">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-1.5 rounded-lg bg-indigo-50">
                  <FiEye className="w-4 h-4 text-indigo-600" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-bold text-gray-800 m-0">Link details</h3>
                  <p className="text-xs text-gray-500 m-0 truncate">{link.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowPassword(false);
                  onClose();
                }}
                className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"
              >
                <FiX className="w-4 h-4" />
              </button>
            </div>

            <div className={MODAL_BODY}>
              <DetailRow label="Name">{link.name || "—"}</DetailRow>
              <DetailRow label="URL">
                <div className="flex items-center justify-end gap-2">
                  <span className="truncate">{link.url || "—"}</span>
                  {link.url ? (
                    <>
                      <button
                        type="button"
                        onClick={() => copyText(link.url, "URL")}
                        className="p-1 text-gray-400 hover:text-indigo-600"
                        title="Copy URL"
                      >
                        <FiCopy className="w-3.5 h-3.5" />
                      </button>
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 text-gray-400 hover:text-indigo-600"
                        title="Open"
                      >
                        <FiExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </>
                  ) : null}
                </div>
              </DetailRow>
              <DetailRow label="Username">
                <div className="flex items-center justify-end gap-2">
                  <span className="truncate">{link.username || "—"}</span>
                  {link.username ? (
                    <button
                      type="button"
                      onClick={() => copyText(link.username, "Username")}
                      className="p-1 text-gray-400 hover:text-indigo-600"
                    >
                      <FiCopy className="w-3.5 h-3.5" />
                    </button>
                  ) : null}
                </div>
              </DetailRow>
              <DetailRow label="Password">
                <div className="flex items-center justify-end gap-2">
                  <span className="font-mono">
                    {link.password ? (showPassword ? link.password : "••••••••") : "—"}
                  </span>
                  {link.password ? (
                    <>
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="p-1 text-gray-400 hover:text-indigo-600"
                      >
                        {showPassword ? <FiEyeOff className="w-3.5 h-3.5" /> : <FiEye className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => copyText(link.password, "Password")}
                        className="p-1 text-gray-400 hover:text-indigo-600"
                      >
                        <FiCopy className="w-3.5 h-3.5" />
                      </button>
                    </>
                  ) : null}
                </div>
              </DetailRow>
              <DetailRow label="Remarks" last>
                {link.remark || "—"}
              </DetailRow>
            </div>

            <div className="shrink-0 flex items-center justify-end gap-2 px-5 py-3 border-t border-gray-200 bg-gray-50">
              <button
                type="button"
                onClick={() => {
                  setShowPassword(false);
                  onClose();
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-white"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => onEdit?.(link)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
              >
                <FiEdit2 className="w-3.5 h-3.5" />
                Edit
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
