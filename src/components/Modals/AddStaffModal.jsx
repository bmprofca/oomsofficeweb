import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { FiMail, FiPhone, FiUserCheck, FiX } from "react-icons/fi";
import { toast } from "react-hot-toast";
import axios from "axios";
import CustomSelect from "../CustomSelect";
import getHeaders from "../../utils/get-headers";
import API_BASE_URL from "../../utils/api-controller";

const MODAL_BODY =
  "px-5 py-4 flex-1 min-h-0 overflow-y-auto overscroll-y-contain [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden";

const DESIGNATION_OPTIONS = [
  { value: "Developer", label: "Developer" },
  { value: "Senior Developer", label: "Senior Developer" },
  { value: "Project Manager", label: "Project Manager" },
  { value: "UI/UX Designer", label: "UI/UX Designer" },
  { value: "Quality Assurance", label: "Quality Assurance" },
  { value: "DevOps Engineer", label: "DevOps Engineer" },
  { value: "Frontend Developer", label: "Frontend Developer" },
  { value: "Backend Developer", label: "Backend Developer" },
  { value: "HR Manager", label: "HR Manager" },
  { value: "Sales Executive", label: "Sales Executive" },
  { value: "Accountant", label: "Accountant" },
  { value: "Manager", label: "Manager" },
  { value: "Supervisor", label: "Supervisor" },
  { value: "Assistant", label: "Assistant" },
  { value: "Administrator", label: "Administrator" },
];

function optionByValue(options, value) {
  if (value == null || value === "") return null;
  return options.find((opt) => String(opt.value) === String(value)) || null;
}

const FindUserSkeleton = () => (
  <div className="space-y-5 animate-pulse">
    <div className="mb-1 text-center">
      <div className="mx-auto mb-3 h-14 w-14 rounded-full bg-indigo-100" />
      <div className="mx-auto mb-2 h-4 w-40 rounded bg-gray-200" />
      <div className="mx-auto h-3 w-56 rounded bg-gray-100" />
    </div>
    <div className="flex gap-2">
      <div className="h-8 flex-1 rounded-lg bg-gray-100" />
      <div className="h-8 flex-1 rounded-lg bg-gray-100" />
    </div>
    <div>
      <div className="mb-2 h-3 w-28 rounded bg-gray-200" />
      <div className="h-10 w-full rounded-lg bg-gray-100" />
    </div>
  </div>
);

const UserFoundSkeleton = () => (
  <div className="space-y-4 animate-pulse">
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
      <div className="flex items-start gap-3">
        <div className="h-8 w-8 shrink-0 rounded-lg bg-gray-200" />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="h-4 w-24 rounded bg-gray-200" />
          <div className="h-3 w-52 rounded bg-gray-100" />
          <div className="h-3 w-40 rounded bg-gray-100" />
          <div className="h-3 w-44 rounded bg-gray-100" />
          <div className="h-3 w-36 rounded bg-gray-100" />
        </div>
      </div>
    </div>
    <div>
      <div className="mb-2 h-3 w-24 rounded bg-gray-200" />
      <div className="h-10 w-full rounded-lg bg-gray-100" />
    </div>
  </div>
);

export default function AddStaffModal({ isOpen = false, onClose, onSuccess }) {
  const [step, setStep] = useState(1);
  const [lookupMode, setLookupMode] = useState("email");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [designation, setDesignation] = useState("");
  const [userDetails, setUserDetails] = useState(null);
  const [finding, setFinding] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const busy = finding || submitting;

  const reset = () => {
    setStep(1);
    setLookupMode("email");
    setEmail("");
    setMobile("");
    setDesignation("");
    setUserDetails(null);
    setFinding(false);
    setSubmitting(false);
  };

  useEffect(() => {
    if (!isOpen) reset();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape" && !busy) onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, busy, onClose]);

  const handleClose = () => {
    if (busy) return;
    onClose?.();
  };

  const handleFindUser = async (e) => {
    e?.preventDefault();
    const trimmedEmail = email.trim();
    const mobileDigits = mobile.replace(/\D/g, "").slice(-10);

    if (lookupMode === "email") {
      if (!trimmedEmail || !trimmedEmail.includes("@")) {
        toast.error("Enter a valid email address");
        return;
      }
    } else if (!/^\d{10}$/.test(mobileDigits)) {
      toast.error("Enter a valid 10-digit mobile number");
      return;
    }

    const headers = getHeaders();
    if (!headers) {
      toast.error("Authentication required. Please login again.");
      return;
    }
    setFinding(true);
    try {
      const payload =
        lookupMode === "email" ? { email: trimmedEmail } : { mobile: mobileDigits };
      const res = await axios.post(`${API_BASE_URL}/settings/staff/check-user`, payload, { headers });
      if (res.data?.success && res.data?.data?.username) {
        setUserDetails(res.data.data);
        setStep(2);
      } else {
        toast.error(res.data?.message || "User not found. Check the email or mobile number.");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Network error. Please try again.");
    } finally {
      setFinding(false);
    }
  };

  const handleAddStaff = async (e) => {
    e?.preventDefault();
    if (!userDetails?.username) return;
    if (!designation) {
      toast.error("Please select a designation");
      return;
    }
    const headers = getHeaders();
    if (!headers) {
      toast.error("Authentication required. Please login again.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await axios.post(
        `${API_BASE_URL}/settings/staff/create`,
        { username: userDetails.username, designation },
        { headers },
      );
      if (res.data?.success) {
        toast.success(res.data.message || "Invitation sent to staff successfully!");
        onSuccess?.();
        onClose?.();
      } else {
        toast.error(res.data?.message || "Failed to add staff member");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "An error occurred while adding staff member");
    } finally {
      setSubmitting(false);
    }
  };

  if (typeof document === "undefined") return null;

  const tabClass = (active) =>
    `flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
      active ? "bg-indigo-600 text-white" : "bg-white text-slate-600 hover:bg-indigo-50"
    }`;

  return createPortal(
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          key="add-staff-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-[10050] flex items-center justify-center overflow-hidden overscroll-none p-3 sm:p-4 pointer-events-none"
        >
          <button
            type="button"
            aria-label="Close"
            className="absolute inset-0 bg-black/50 backdrop-blur-sm pointer-events-auto"
            onClick={busy ? undefined : handleClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="relative z-[1] pointer-events-auto flex w-full max-w-md max-h-[min(calc(100vh-1.5rem),100dvh)] sm:max-h-[calc(100vh-2rem)] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-gray-200 px-5 py-3.5">
              <h2 className="m-0 text-base font-bold text-gray-800">
                {step === 1 ? "Find Staff Member" : "Add Staff Details"}
              </h2>
              <button
                type="button"
                onClick={handleClose}
                disabled={busy}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
              >
                <FiX className="h-4 w-4" />
              </button>
            </div>

            <div className={MODAL_BODY} style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
              {step === 1 && finding ? (
                <FindUserSkeleton />
              ) : step === 2 && submitting ? (
                <UserFoundSkeleton />
              ) : step === 1 ? (
                <form id="add-staff-form" onSubmit={handleFindUser} className="space-y-5">
                  <div className="mb-1 text-center">
                    <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full border border-indigo-200 bg-indigo-50">
                      {lookupMode === "email" ? (
                        <FiMail className="h-6 w-6 text-indigo-600" />
                      ) : (
                        <FiPhone className="h-6 w-6 text-indigo-600" />
                      )}
                    </div>
                    <h3 className="m-0 mb-1 text-sm font-semibold text-slate-800">
                      {lookupMode === "email" ? "Find Staff by Email" : "Find Staff by Mobile"}
                    </h3>
                    <p className="m-0 text-xs text-slate-500">
                      {lookupMode === "email"
                        ? "Enter the registered email address to check if the user exists."
                        : "Enter the registered 10-digit mobile number to check if the user exists."}
                    </p>
                  </div>

                  <div className="flex rounded-xl border border-slate-200 bg-slate-50 p-1">
                    <button type="button" className={tabClass(lookupMode === "email")} onClick={() => setLookupMode("email")}>
                      <FiMail className="h-3.5 w-3.5" />
                      Email
                    </button>
                    <button type="button" className={tabClass(lookupMode === "mobile")} onClick={() => setLookupMode("mobile")}>
                      <FiPhone className="h-3.5 w-3.5" />
                      Mobile
                    </button>
                  </div>

                  {lookupMode === "email" ? (
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-gray-600">
                        Email Address <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
                        placeholder="email@company.com"
                        required
                        disabled={busy}
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-gray-600">
                        Mobile Number <span className="text-red-500">*</span>
                      </label>
                      <div className="flex h-10 overflow-hidden rounded-lg border border-gray-300 bg-white focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500">
                        <span className="flex items-center border-r border-gray-200 bg-slate-50 px-3 text-sm font-medium text-slate-600">
                          +91
                        </span>
                        <input
                          type="tel"
                          inputMode="numeric"
                          value={mobile}
                          onChange={(e) => setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
                          className="h-full min-w-0 flex-1 px-3 text-sm text-gray-700 outline-none disabled:opacity-60"
                          placeholder="10-digit mobile"
                          required
                          disabled={busy}
                        />
                      </div>
                    </div>
                  )}
                </form>
              ) : (
                <form id="add-staff-form" onSubmit={handleAddStaff} className="space-y-4">
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                    <div className="flex items-start gap-3">
                      <div className="rounded-lg bg-emerald-100 p-1.5">
                        <FiUserCheck className="h-5 w-5 text-emerald-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="m-0 mb-1 text-sm font-semibold text-emerald-800">User Found</h4>
                        <p className="m-0 mb-3 text-xs text-emerald-600">
                          User details fetched successfully. Please add designation below.
                        </p>
                        <div className="grid grid-cols-1 gap-1.5 text-xs">
                          <div>
                            <span className="text-slate-500">Name:</span>
                            <span className="ml-2 font-medium text-slate-800">{userDetails?.name || "N/A"}</span>
                          </div>
                          <div>
                            <span className="text-slate-500">Email:</span>
                            <span className="ml-2 font-medium text-slate-800">{userDetails?.email || "N/A"}</span>
                          </div>
                          <div>
                            <span className="text-slate-500">Mobile:</span>
                            <span className="ml-2 font-medium text-slate-800">
                              {userDetails?.mobile
                                ? `+${String(userDetails.country_code || "91").replace(/^\+/, "")} ${userDetails.mobile}`
                                : "N/A"}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500">Username:</span>
                            <span className="ml-2 font-medium text-slate-800">{userDetails?.username || "N/A"}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-gray-600">
                      Designation <span className="text-red-500">*</span>
                    </label>
                    <CustomSelect
                      options={DESIGNATION_OPTIONS}
                      value={optionByValue(DESIGNATION_OPTIONS, designation)}
                      onChange={(opt) => setDesignation(opt?.value || "")}
                      placeholder="Select designation"
                      isClearable={false}
                      isDisabled={busy}
                    />
                  </div>
                </form>
              )}
            </div>

            <div className="flex shrink-0 items-center justify-between gap-2 border-t border-gray-200 bg-gray-50 px-5 py-3">
              {busy ? (
                <>
                  <div className="h-10 w-20 animate-pulse rounded-lg bg-gray-200" />
                  <div className="h-10 w-36 animate-pulse rounded-lg bg-gray-200" />
                </>
              ) : step === 2 ? (
                <button
                  type="button"
                  onClick={() => {
                    setStep(1);
                    setDesignation("");
                    setUserDetails(null);
                  }}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                >
                  Back
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleClose}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                >
                  Cancel
                </button>
              )}
              {!busy ? (
                <button
                  type="submit"
                  form="add-staff-form"
                  className="inline-flex min-w-[8.5rem] items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                >
                  {step === 1 ? "Find User" : "Add Staff Member"}
                </button>
              ) : null}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
