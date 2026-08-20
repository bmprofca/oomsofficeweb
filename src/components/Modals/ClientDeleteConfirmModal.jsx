import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { FiAlertTriangle, FiLoader, FiTrash2, FiX } from "react-icons/fi";

/**
 * Client delete confirmation with OTP.
 * Viewport-safe shell per CLIENT/context/modal.md (centered, fade-only,
 * fixed header/footer, scrollable body).
 */
export default function ClientDeleteConfirmModal({
  isOpen = false,
  title = "Delete Client",
  description = "Enter the OTP sent to your registered email and mobile to remove this client from the branch.",
  destinationMasked = null,
  otpSent = false,
  loading = false,
  confirming = false,
  error = null,
  onConfirm,
  onCancel,
  onResend,
}) {
  const [otp, setOtp] = useState("");

  useEffect(() => {
    if (!isOpen) {
      setOtp("");
      return;
    }
    setOtp("");
  }, [isOpen, destinationMasked, title]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKeyDown = (e) => {
      if (e.key === "Escape" && !loading && !confirming) {
        onCancel?.();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, loading, confirming, onCancel]);

  if (typeof document === "undefined") return null;

  const busy = loading || confirming;
  const canSubmit = otpSent && otp.length === 6 && !busy;

  const handleConfirm = () => {
    if (!canSubmit) return;
    onConfirm?.({ confirmed: true, otp });
  };

  const handleClose = () => {
    if (busy) return;
    setOtp("");
    onCancel?.();
  };

  return createPortal(
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          key="client-delete-overlay"
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
            onClick={busy ? undefined : handleClose}
            disabled={busy}
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="client-delete-title"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="relative z-[1] pointer-events-auto bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[calc(100vh-1.5rem)] sm:max-h-[calc(100vh-2rem)] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="shrink-0 bg-gradient-to-r from-red-600 to-red-700 text-white px-5 py-3.5 flex justify-between items-center">
              <h2
                id="client-delete-title"
                className="text-lg font-bold m-0 tracking-tight"
              >
                {title}
              </h2>
              <button
                type="button"
                onClick={handleClose}
                disabled={busy}
                className="text-white/90 hover:text-white p-1.5 rounded-lg hover:bg-white/10 disabled:opacity-50 transition-colors"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            <div
              className="px-5 py-4 flex-1 min-h-0 overflow-y-auto overscroll-y-contain [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
              <div className="text-center mb-4">
                <div
                  className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3 ${
                    error && !otpSent ? "bg-amber-100" : "bg-red-100"
                  }`}
                >
                  {error && !otpSent ? (
                    <FiAlertTriangle className="w-7 h-7 text-amber-600" />
                  ) : (
                    <FiTrash2 className="w-7 h-7 text-red-600" />
                  )}
                </div>

                <h3 className="text-base font-semibold text-slate-800 m-0 mb-1.5">
                  {error && !otpSent
                    ? "Cannot delete this client"
                    : "Confirm deletion"}
                </h3>

                {otpSent ? (
                  <>
                    <p className="text-slate-600 text-sm m-0">{description}</p>
                    {destinationMasked ? (
                      <p className="text-slate-500 text-xs mt-2 m-0">
                        OTP sent to{" "}
                        <span className="font-medium text-slate-700">
                          {destinationMasked}
                        </span>
                      </p>
                    ) : null}
                  </>
                ) : loading ? (
                  <p className="text-slate-600 text-sm m-0">
                    Checking eligibility and sending OTP…
                  </p>
                ) : (
                  <p className="text-slate-600 text-sm m-0">
                    This client can only be deleted when it has no linked
                    activity.
                  </p>
                )}
              </div>

              {error ? (
                <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-left">
                  <p className="text-sm font-medium text-amber-900 leading-relaxed m-0">
                    {error}
                  </p>
                </div>
              ) : null}

              {otpSent ? (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Enter OTP
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={otp}
                    onChange={(e) =>
                      setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleConfirm();
                    }}
                    placeholder="Enter 6-digit OTP"
                    maxLength={6}
                    disabled={busy}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-slate-700 font-medium transition-colors focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none disabled:bg-slate-50"
                  />
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <p className="text-xs text-slate-500 m-0">
                      OTP expires in 5 minutes.
                    </p>
                    {onResend ? (
                      <button
                        type="button"
                        onClick={onResend}
                        disabled={busy}
                        className="text-xs font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
                      >
                        Resend OTP
                      </button>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="shrink-0 border-t border-slate-100 px-5 py-3 bg-slate-50 flex justify-between items-center gap-3">
              <button
                type="button"
                onClick={handleClose}
                disabled={busy}
                className="px-5 py-2.5 text-sm font-medium border border-slate-300 rounded-lg hover:bg-slate-100 text-slate-700 disabled:opacity-50 transition-colors"
              >
                {otpSent ? "Cancel" : "Close"}
              </button>

              {otpSent ? (
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={!canSubmit}
                  className="px-5 py-2.5 text-sm font-medium bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg hover:from-red-700 hover:to-red-800 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
                >
                  {confirming || loading ? (
                    <FiLoader className="w-4 h-4 animate-spin" />
                  ) : (
                    <FiTrash2 className="w-4 h-4" />
                  )}
                  {confirming ? "Deleting…" : "Delete"}
                </button>
              ) : onResend && !loading ? (
                <button
                  type="button"
                  onClick={onResend}
                  disabled={busy}
                  className="px-5 py-2.5 text-sm font-medium border border-slate-300 rounded-lg hover:bg-slate-100 text-slate-700 disabled:opacity-50 transition-colors"
                >
                  Try again
                </button>
              ) : loading ? (
                <span className="inline-flex items-center gap-2 text-sm text-slate-500">
                  <FiLoader className="w-4 h-4 animate-spin" />
                  Please wait…
                </span>
              ) : null}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
