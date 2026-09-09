import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { FiAlertTriangle, FiLoader, FiSend, FiTrash2, FiX } from "react-icons/fi";

/**
 * Document delete confirmation with OTP sent to the branch admin.
 * Step 1: review + Send OTP. Step 2: enter OTP + Delete.
 */
export default function DocumentDeleteOtpModal({
  isOpen = false,
  title = "Delete Document",
  summary = null,
  description = "Enter the OTP sent to the branch admin’s mobile to confirm deletion.",
  destinationMasked = null,
  otpSent = false,
  sending = false,
  confirming = false,
  error = null,
  onConfirm,
  onCancel,
  onSendOtp,
}) {
  const [otp, setOtp] = useState("");
  const busy = sending || confirming;
  const canSubmit = otpSent && otp.length === 6 && !busy;

  useEffect(() => {
    if (!isOpen) {
      setOtp("");
      return;
    }
    if (!otpSent) setOtp("");
  }, [isOpen, otpSent, destinationMasked, title, summary]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKeyDown = (e) => {
      if (e.key === "Escape" && !busy) onCancel?.();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, busy, onCancel]);

  if (typeof document === "undefined") return null;

  const handleConfirm = () => {
    if (!canSubmit) return;
    onConfirm?.({ otp });
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
          key="document-delete-otp-overlay"
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
            aria-labelledby="document-delete-otp-title"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="relative z-[1] pointer-events-auto flex w-full max-w-md max-h-[calc(100vh-1.5rem)] sm:max-h-[calc(100vh-2rem)] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex shrink-0 items-center justify-between bg-gradient-to-r from-red-600 to-red-700 px-5 py-3.5 text-white">
              <h2
                id="document-delete-otp-title"
                className="m-0 text-lg font-bold tracking-tight"
              >
                {title}
              </h2>
              <button
                type="button"
                onClick={handleClose}
                disabled={busy}
                className="rounded-lg p-1.5 text-white/90 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-50"
              >
                <FiX className="h-5 w-5" />
              </button>
            </div>

            <div
              className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain px-5 py-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
              <div className="mb-4 text-center">
                <div
                  className={`mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full ${
                    error && !otpSent ? "bg-amber-100" : "bg-red-100"
                  }`}
                >
                  {error && !otpSent ? (
                    <FiAlertTriangle className="h-7 w-7 text-amber-600" />
                  ) : (
                    <FiTrash2 className="h-7 w-7 text-red-600" />
                  )}
                </div>

                <h3 className="m-0 mb-1.5 text-base font-semibold text-slate-800">
                  {error && !otpSent ? "Cannot send OTP" : "Confirm deletion"}
                </h3>

                {summary ? (
                  <p className="m-0 mb-2 text-sm font-medium text-slate-800">
                    {summary}
                  </p>
                ) : null}

                {otpSent ? (
                  <>
                    <p className="m-0 text-sm text-slate-600">{description}</p>
                    {destinationMasked ? (
                      <p className="mt-2 m-0 text-xs text-slate-500">
                        OTP sent to branch admin{" "}
                        <span className="font-medium text-slate-700">
                          {destinationMasked}
                        </span>
                      </p>
                    ) : null}
                  </>
                ) : (
                  <p className="m-0 text-sm text-slate-600">
                    Review the deletion below. Click{" "}
                    <span className="font-semibold text-slate-700">Send OTP</span>{" "}
                    to send a code to the branch admin’s mobile, then enter it to
                    continue.
                  </p>
                )}
              </div>

              {error ? (
                <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-left">
                  <p className="m-0 text-sm font-medium leading-relaxed text-amber-900">
                    {error}
                  </p>
                </div>
              ) : null}

              {otpSent ? (
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
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
                    className="w-full rounded-lg border border-slate-300 px-4 py-2.5 font-medium text-slate-700 outline-none transition-colors focus:border-red-500 focus:ring-2 focus:ring-red-500 disabled:bg-slate-50"
                  />
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <p className="m-0 text-xs text-slate-500">
                      OTP expires in 5 minutes.
                    </p>
                    {onSendOtp ? (
                      <button
                        type="button"
                        onClick={onSendOtp}
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

            <div className="flex shrink-0 items-center justify-between gap-3 border-t border-slate-100 bg-slate-50 px-5 py-3">
              <button
                type="button"
                onClick={handleClose}
                disabled={busy}
                className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 disabled:opacity-50"
              >
                Cancel
              </button>

              {otpSent ? (
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={!canSubmit}
                  className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-red-600 to-red-700 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:from-red-700 hover:to-red-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {confirming ? (
                    <FiLoader className="h-4 w-4 animate-spin" />
                  ) : (
                    <FiTrash2 className="h-4 w-4" />
                  )}
                  {confirming ? "Deleting…" : "Delete"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onSendOtp}
                  disabled={busy || !onSendOtp}
                  className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-red-600 to-red-700 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:from-red-700 hover:to-red-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {sending ? (
                    <FiLoader className="h-4 w-4 animate-spin" />
                  ) : (
                    <FiSend className="h-4 w-4" />
                  )}
                  {sending ? "Sending…" : "Send OTP"}
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
