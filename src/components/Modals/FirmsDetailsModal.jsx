import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { FiBriefcase, FiEye, FiX } from "react-icons/fi";
import { FirmModalShell, FirmViewDetails } from "./FirmModalParts";

const formatDate = (dateString) => {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const InfoCard = ({ label, value }) => {
  if (!value) return null;
  return (
    <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
        {label}
      </div>
      <div className="font-bold text-gray-900 text-sm truncate" title={value}>
        {value}
      </div>
    </div>
  );
};

/** Normalize firm fields so FirmViewDetails works with list API shape. */
const normalizeFirmForView = (firm = {}) => ({
  ...firm,
  pan: firm.pan || firm.pan_no || null,
  gst: firm.gst || firm.gst_no || null,
  tan: firm.tan || firm.tan_no || null,
  cin: firm.cin || firm.cin_no || null,
  vat: firm.vat || firm.vat_no || null,
  file_no: firm.file_no || null,
  address: firm.address || {},
});

const FirmsDetailsModal = ({
  isOpen,
  onClose,
  firms = [],
  clientName = "",
}) => {
  const [viewFirm, setViewFirm] = useState(null);
  const firmList = Array.isArray(firms) ? firms : [];

  useEffect(() => {
    if (!isOpen) {
      setViewFirm(null);
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !viewFirm) onClose?.();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, viewFirm]);

  if (typeof document === "undefined") return null;

  const openFirmView = (firm) => {
    setViewFirm(normalizeFirmForView(firm));
  };

  const closeFirmView = () => {
    setViewFirm(null);
  };

  return (
    <>
      {createPortal(
        <AnimatePresence>
          {isOpen && (
            <motion.div
              className="fixed inset-0 z-[250] flex items-center justify-center overflow-hidden overscroll-none p-3 sm:p-4 pointer-events-none"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
            >
              <motion.button
                type="button"
                aria-label="Close firms details modal"
                className="absolute inset-0 bg-black bg-opacity-50 pointer-events-auto"
                onClick={onClose}
              />

              <motion.div
                className="relative z-[1] pointer-events-auto flex w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl max-h-[calc(100vh-1.5rem)] sm:max-h-[calc(100vh-2rem)]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                role="dialog"
                aria-modal="true"
                aria-labelledby="firms-details-title"
              >
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-5 py-3.5 flex justify-between items-center shrink-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center shrink-0">
                      <FiBriefcase className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h2
                        id="firms-details-title"
                        className="text-lg font-bold leading-tight"
                      >
                        Firms Details
                      </h2>
                      {clientName ? (
                        <p className="text-blue-100 text-sm truncate">
                          {clientName}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <motion.button
                    type="button"
                    onClick={onClose}
                    className="text-white hover:text-blue-200 transition-colors p-2 rounded-lg hover:bg-white/10 shrink-0"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <FiX className="w-5 h-5" />
                  </motion.button>
                </div>

                <div
                  className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain px-5 py-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                  style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
                >
                  {firmList.length === 0 ? (
                    <div className="py-12 text-center text-sm text-gray-500">
                      No firms found for this client.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {firmList.map((firm, index) => {
                        const firmKey = firm.firm_id || index;

                        return (
                          <motion.div
                            key={firmKey}
                            className="bg-gradient-to-br from-gray-50 to-white border border-gray-200 rounded-xl overflow-hidden"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: Math.min(index * 0.04, 0.2) }}
                          >
                            <div className="p-4 bg-white border-b border-gray-200">
                              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                                <div className="flex items-start gap-4 min-w-0 flex-1">
                                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md">
                                    <FiBriefcase className="w-6 h-6 text-white" />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <h3 className="font-bold text-gray-900 text-lg mb-1 truncate">
                                      {firm.firm_name || "Unnamed Firm"}
                                    </h3>
                                    <div className="flex flex-wrap gap-2 mb-2">
                                      {firm.firm_type ? (
                                        <span className="inline-flex items-center px-3 py-1 bg-blue-50 text-blue-700 text-xs font-semibold rounded-full border border-blue-200">
                                          {firm.firm_type}
                                        </span>
                                      ) : null}
                                      {firm.status ? (
                                        <span className="inline-flex items-center px-3 py-1 bg-green-50 text-green-700 text-xs font-semibold rounded-full border border-green-200">
                                          Active
                                        </span>
                                      ) : null}
                                    </div>
                                    <div className="text-sm text-gray-600">
                                      <span className="font-medium">
                                        Firm #{index + 1}
                                      </span>
                                      <span className="mx-2">•</span>
                                      <span>
                                        Created: {formatDate(firm.create_date)}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                <motion.button
                                  type="button"
                                  onClick={() => openFirmView(firm)}
                                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm self-start"
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                >
                                  <FiEye className="w-4 h-4" />
                                  View Details
                                </motion.button>
                              </div>
                            </div>

                            <div className="p-4">
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <InfoCard
                                  label="PAN No"
                                  value={firm.pan_no || firm.pan}
                                />
                                <InfoCard
                                  label="File No"
                                  value={firm.file_no}
                                />
                                <InfoCard
                                  label="GST No"
                                  value={firm.gst_no || firm.gst}
                                />
                                <InfoCard
                                  label="Registration No"
                                  value={firm.registration_no}
                                />
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="px-5 py-3 bg-gray-50 border-t border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-3 shrink-0">
                  <div className="text-sm text-gray-600 font-medium">
                    Total: {firmList.length} firm
                    {firmList.length !== 1 ? "s" : ""}
                  </div>
                  <motion.button
                    type="button"
                    onClick={onClose}
                    className="px-5 py-2.5 bg-gradient-to-r from-gray-200 to-gray-300 text-gray-800 text-sm font-medium rounded-lg hover:from-gray-300 hover:to-gray-400 transition-colors shadow-sm"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Close
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}

      <FirmModalShell
        open={Boolean(viewFirm)}
        onClose={closeFirmView}
        maxWidth="max-w-5xl"
        zClass="z-[260]"
        headerClass="bg-gradient-to-r from-slate-700 via-slate-800 to-slate-900"
        icon={FiEye}
        title="Firm details"
        subtitle={viewFirm?.firm_name || "View firm information"}
        footer={
          <div className="flex justify-end">
            <button
              type="button"
              onClick={closeFirmView}
              className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              Close
            </button>
          </div>
        }
      >
        {viewFirm ? (
          <FirmViewDetails firm={viewFirm} formatDate={formatDate} />
        ) : null}
      </FirmModalShell>
    </>
  );
};

export default FirmsDetailsModal;
