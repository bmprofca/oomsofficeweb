import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { FiAlertTriangle, FiLoader, FiPower, FiX } from "react-icons/fi";

/**
 * Confirm staff activate/deactivate with OTP sent on the login SMS channel.
 */
export default function StaffStatusOtpModal({
  isOpen = false,
  staffName = "",
  newStatus = true,
  destinationMasked = null,
  otpSent = false,
  sending = false,
  confirming = false,
  error = null,
  onConfirm,
  onCancel,
  onResend,
}) {
  const [otp, setOtp] = useState("");
  const activating = Boolean(newStatus);
  const busy = sending || confirming;
  const canSubmit = otpSent && otp.length === 6 && !busy;

  useEffect(() => {
    if (!isOpen) {
      setOtp("");
      return;
    }
    setOtp("");
  }, [isOpen, destinationMasked, staffName, newStatus]);

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
          key="staff-status-otp-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-[10060] flex items-center justify-center overflow-hidden overscroll-none p-3 sm:p-4 pointer-events-none"
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
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="relative z-[1] pointer-events-auto flex w-full max-w-md max-h-[calc(100vh-1.5rem)] sm:max-h-[calc(100vh-2rem)] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className={`flex shrink-0 items-center justify-between px-5 py-3.5 text-white ${
                activating
                  ? "bg-gradient-to-r from-emerald-600 to-emerald-700"
                  : "bg-gradient-to-r from-amber-500 to-orange-500"
              }`}
            >
              <h2 className="m-0 text-lg font-bold tracking-tight">
                {activating ? "Activate Staff" : "Deactivate Staff"}
              </h2>
              <button
                type="button"
                onClick={handleClose}
                disabled={busy}
                className="rounded-lg p-1.5 text-white/90 hover:bg-white/10 hover:text-white disabled:opacity-50"
              >
                <FiX className="h-5 w-5" />
              </button>
            </div>

            <div
              className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain px-5 py-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
              {sending && !otpSent && !error ? (
                <div className="animate-pulse">
                  <div className="mb-4 text-center">
                    <div className="mx-auto mb-3 h-14 w-14 rounded-full bg-gray-200" />
                    <div className="mx-auto mb-2 h-5 w-40 rounded bg-gray-200" />
                    <div className="mx-auto h-4 w-64 max-w-full rounded bg-gray-100" />
                    <div className="mx-auto mt-2 h-3 w-36 rounded bg-gray-100" />
                  </div>
                  <div>
                    <div className="mb-2 h-4 w-20 rounded bg-gray-200" />
                    <div className="h-10 w-full rounded-lg bg-gray-100" />
                    <div className="mt-2 flex items-center justify-between">
                      <div className="h-3 w-32 rounded bg-gray-100" />
                      <div className="h-3 w-16 rounded bg-gray-100" />
                    </div>
                  </div>
                </div>
              ) : (
                <>
              <div className="mb-4 text-center">
                <div
                  className={`mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full ${
                    error && !otpSent
                      ? "bg-amber-100"
                      : activating
                        ? "bg-emerald-100"
                        : "bg-amber-100"
                  }`}
                >
                  {error && !otpSent ? (
                    <FiAlertTriangle className="h-7 w-7 text-amber-600" />
                  ) : (
                    <FiPower className={`h-7 w-7 ${activating ? "text-emerald-600" : "text-amber-600"}`} />
                  )}
                </div>
                <h3 className="m-0 mb-1.5 text-base font-semibold text-slate-800">
                  {error && !otpSent ? "Cannot change status" : "Confirm with OTP"}
                </h3>
                {otpSent ? (
                  <>
                    <p className="m-0 text-sm text-slate-600">
                      Enter the OTP sent to your registered mobile to set{" "}
                      <strong>{staffName || "this staff"}</strong> as{" "}
                      <strong className={activating ? "text-emerald-700" : "text-amber-700"}>
                        {activating ? "Active" : "Deactive"}
                      </strong>
                      .
                    </p>
                    {destinationMasked ? (
                      <p className="m-0 mt-2 text-xs text-slate-500">
                        OTP sent to{" "}
                        <span className="font-medium text-slate-700">{destinationMasked}</span>
                      </p>
                    ) : null}
                  </>
                ) : sending ? (
                  <p className="m-0 text-sm text-slate-600">Sending OTP to your registered mobile…</p>
                ) : (
                  <p className="m-0 text-sm text-slate-600">
                    Status changes require an OTP sent on the same SMS channel used for login.
                  </p>
                )}
              </div>

              {error ? (
                <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-left">
                  <p className="m-0 text-sm font-medium leading-relaxed text-amber-900">{error}</p>
                </div>
              ) : null}

              {otpSent ? (
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Enter OTP</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleConfirm();
                    }}
                    placeholder="Enter 6-digit OTP"
                    maxLength={6}
                    disabled={busy}
                    className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-50"
                  />
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <p className="m-0 text-xs text-slate-500">OTP expires in 5 minutes.</p>
                    {onResend ? (
                      <button
                        type="button"
                        onClick={onResend}
                        disabled={busy}
                        className="text-xs font-medium text-indigo-600 hover:text-indigo-700 disabled:opacity-50"
                      >
                        Resend OTP
                      </button>
                    ) : null}
                  </div>
                </div>
              ) : null}
                </>
              )}
            </div>

            <div className="flex shrink-0 items-center justify-between gap-3 border-t border-slate-100 bg-slate-50 px-5 py-3">
              <button
                type="button"
                onClick={handleClose}
                disabled={busy}
                className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
              >
                {otpSent ? "Cancel" : "Close"}
              </button>
              {otpSent ? (
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={!canSubmit}
                  className={`inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-50 ${
                    activating
                      ? "bg-emerald-600 hover:bg-emerald-700"
                      : "bg-amber-500 hover:bg-amber-600"
                  }`}
                >
                  {confirming || sending ? <FiLoader className="h-4 w-4 animate-spin" /> : <FiPower className="h-4 w-4" />}
                  {confirming ? "Updating…" : activating ? "Set Active" : "Set Deactive"}
                </button>
              ) : onResend && !sending ? (
                <button
                  type="button"
                  onClick={onResend}
                  disabled={busy}
                  className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                >
                  Try again
                </button>
              ) : sending ? (
                <span className="inline-flex h-10 w-28 animate-pulse rounded-lg bg-gray-200" />
              ) : null}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
