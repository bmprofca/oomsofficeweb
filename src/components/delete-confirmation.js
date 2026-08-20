import { FiX, FiTrash2, FiLoader } from "react-icons/fi";
import { useState, useEffect } from "react";

export default function DeleteConfirmationModal({
    title = "Delete",
    description = "Please enter the OTP sent to your registered email.",
    destinationMasked = null,
    loading = false,
    confirming = false,
    error = null,
    onConfirm,
    onCancel,
    onResend,
}) {
    const [otp, setOtp] = useState("");

    useEffect(() => {
        setOtp("");
    }, [title, destinationMasked]);

    const handleConfirm = () => {
        if (otp.length !== 6 || loading || confirming) return;
        onConfirm?.({ confirmed: true, otp });
    };

    const handleClose = () => {
        if (loading || confirming) return;
        setOtp("");
        onCancel?.();
        onConfirm?.({ confirmed: false, otp: "" });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 transition-all duration-300">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md transform transition-all duration-300 scale-95 animate-fade-in">
                <div className="bg-gradient-to-r from-red-600 to-red-700 text-white px-6 py-4 flex justify-between items-center rounded-t-xl">
                    <div>
                        <h2 className="text-xl font-bold">{title}</h2>
                    </div>
                    <button
                        type="button"
                        onClick={handleClose}
                        disabled={loading || confirming}
                        className="text-white hover:text-red-200 transition-colors duration-200 p-1 rounded-lg hover:bg-red-500 disabled:opacity-50"
                    >
                        <FiX className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-6">
                    <div className="text-center mb-6">
                        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <FiTrash2 className="w-8 h-8 text-red-600" />
                        </div>

                        <h3 className="text-lg font-semibold text-slate-800 mb-2">
                            Confirm Deletion
                        </h3>

                        <p className="text-slate-600 text-sm">{description}</p>
                        {destinationMasked ? (
                            <p className="text-slate-500 text-xs mt-2">
                                OTP sent to <span className="font-medium text-slate-700">{destinationMasked}</span>
                            </p>
                        ) : null}
                    </div>

                    {error ? (
                        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                            {error}
                        </div>
                    ) : null}

                    <div className="mb-6">
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Enter OTP
                        </label>

                        <input
                            type="text"
                            inputMode="numeric"
                            value={otp}
                            onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                            placeholder="Enter 6-digit OTP"
                            maxLength={6}
                            disabled={loading || confirming}
                            className="w-full px-4 py-3 border border-slate-300 rounded-lg text-slate-700 font-medium transition-all duration-200 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none disabled:bg-slate-50"
                        />

                        <div className="mt-2 flex items-center justify-between gap-2">
                            <p className="text-xs text-slate-500">
                                OTP expires in 5 minutes.
                            </p>
                            {onResend ? (
                                <button
                                    type="button"
                                    onClick={onResend}
                                    disabled={loading || confirming}
                                    className="text-xs font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
                                >
                                    Resend OTP
                                </button>
                            ) : null}
                        </div>
                    </div>
                </div>

                <div className="border-t px-6 py-4 bg-slate-50 flex justify-between items-center rounded-b-xl">
                    <button
                        type="button"
                        onClick={handleClose}
                        disabled={loading || confirming}
                        className="px-6 py-3 text-sm font-medium border border-slate-300 rounded-lg hover:bg-slate-200 transition-all duration-200 hover:shadow-sm text-slate-700 disabled:opacity-50"
                    >
                        Cancel
                    </button>

                    <button
                        type="button"
                        onClick={handleConfirm}
                        disabled={otp.length !== 6 || loading || confirming}
                        className="px-6 py-3 text-sm font-medium bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg hover:from-red-700 hover:to-red-800 transition-all duration-200 hover:shadow-md shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {confirming || loading ? (
                            <FiLoader className="w-4 h-4 animate-spin" />
                        ) : (
                            <FiTrash2 className="w-4 h-4" />
                        )}
                        {confirming ? "Deleting…" : "Confirm Delete"}
                    </button>
                </div>
            </div>
        </div>
    );
}
