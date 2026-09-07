import React from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { FiEye, FiX, FiEdit2 } from "react-icons/fi";

const MODAL_BODY =
  "px-5 py-4 flex-1 min-h-0 overflow-y-auto overscroll-y-contain [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden";

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const DetailRow = ({ label, children, last = false }) => (
  <div className={`flex items-start justify-between gap-4 py-2.5 ${last ? "" : "border-b border-gray-100"}`}>
    <span className="text-xs font-semibold text-gray-500 shrink-0">{label}</span>
    <div className="text-sm font-medium text-gray-800 text-right min-w-0">{children}</div>
  </div>
);

export default function FileIndexDetailsModal({ open, file, onClose, onEdit }) {
  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && file ? (
        <motion.div
          key="file-index-details-overlay"
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
            onClick={onClose}
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
                  <h3 className="text-base font-bold text-gray-800 m-0">File index details</h3>
                  <p className="text-xs text-gray-500 m-0 truncate">{file.firmname || file.indexid}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"
              >
                <FiX className="w-4 h-4" />
              </button>
            </div>

            <div className={MODAL_BODY}>
              <DetailRow label="Firm">{file.firmname || "—"}</DetailRow>
              <DetailRow label="Created by">{file.name || "—"}</DetailRow>
              <DetailRow label="Guardian">{file.guardianname || "—"}</DetailRow>
              <DetailRow label="Mobile">{file.mobile || "—"}</DetailRow>
              <DetailRow label="Email">{file.email || "—"}</DetailRow>
              <DetailRow label="GST">{file.gst || "—"}</DetailRow>
              <DetailRow label="Audit">{file.audit || "—"}</DetailRow>
              <DetailRow label="Income tax">{file.income_tax || "—"}</DetailRow>
              <DetailRow label="Other">{file.other || "—"}</DetailRow>
              <DetailRow label="Created" last>
                {formatDate(file.createddate)}
              </DetailRow>
            </div>

            <div className="shrink-0 flex items-center justify-end gap-2 px-5 py-3 border-t border-gray-200 bg-gray-50">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-white"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => onEdit?.(file)}
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
