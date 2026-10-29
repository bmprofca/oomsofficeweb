import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { FiShield, FiX } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import CustomSelect from '../CustomSelect';
import getHeaders from '../../utils/get-headers';
import API_BASE_URL from '../../utils/api-controller';

const DESIGNATION_OPTIONS = [
  { value: 'Developer', label: 'Developer' },
  { value: 'Senior Developer', label: 'Senior Developer' },
  { value: 'Project Manager', label: 'Project Manager' },
  { value: 'UI/UX Designer', label: 'UI/UX Designer' },
  { value: 'Quality Assurance', label: 'Quality Assurance' },
  { value: 'DevOps Engineer', label: 'DevOps Engineer' },
  { value: 'Frontend Developer', label: 'Frontend Developer' },
  { value: 'Backend Developer', label: 'Backend Developer' },
  { value: 'HR Manager', label: 'HR Manager' },
  { value: 'Sales Executive', label: 'Sales Executive' },
  { value: 'Accountant', label: 'Accountant' },
  { value: 'Manager', label: 'Manager' },
  { value: 'Supervisor', label: 'Supervisor' },
  { value: 'Assistant', label: 'Assistant' },
  { value: 'Administrator', label: 'Administrator' },
];

const optionByValue = (options, value) =>
  options.find((option) => option.value === value) || null;

export default function AddStaffOtpModal({ isOpen = false, onClose, onSuccess, initialMobile = '', onExistingUser }) {
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [designation, setDesignation] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [mobileMasked, setMobileMasked] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setName('');
      setMobile('');
      setDesignation('');
      setOtp('');
      setOtpSent(false);
      setMobileMasked('');
      setBusy(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && initialMobile) {
      setMobile(String(initialMobile).replace(/\D/g, '').slice(0, 10));
    }
  }, [isOpen, initialMobile]);

  const headers = () => {
    const value = getHeaders();
    if (!value) throw new Error('Authentication required. Please log in again.');
    return value;
  };

  const openInvitationFlow = async (mobileDigits) => {
    toast('This number already has an Ooms account. Opening the invitation form...');
    await new Promise((resolve) => setTimeout(resolve, 700));
    onExistingUser?.(mobileDigits);
  };

  const sendOtp = async (event) => {
    event?.preventDefault();
    const mobileDigits = mobile.replace(/\D/g, '').slice(-10);
    if (!/^\d{10}$/.test(mobileDigits)) {
      toast.error('Enter a valid 10-digit mobile number.');
      return;
    }

    setBusy(true);
    try {
      const requestHeaders = headers();
      try {
        const lookup = await axios.post(
          `${API_BASE_URL}/settings/staff/check-user`,
          { mobile: mobileDigits },
          { headers: requestHeaders },
        );
        if (lookup.data?.success && lookup.data?.data?.username) {
          await openInvitationFlow(mobileDigits);
          return;
        }
        if (lookup.data?.success) {
          throw new Error(lookup.data?.message || 'This user is already part of this branch.');
        }
      } catch (lookupError) {
        if (lookupError.response?.status !== 404) throw lookupError;
      }

      const response = await axios.post(
        `${API_BASE_URL}/settings/staff/otp/send`,
        { mobile: mobileDigits, name: name.trim(), designation: designation.trim() },
        { headers: requestHeaders },
      );
      if (!response.data?.success) throw new Error(response.data?.message || 'Unable to send verification code.');
      setMobile(mobileDigits);
      setOtp('');
      setOtpSent(true);
      setMobileMasked(response.data.mobile_masked || `******${mobileDigits.slice(-4)}`);
      toast.success(response.data.message || 'Verification code sent.');
    } catch (error) {
      if (error.response?.status === 409 && error.response?.data?.code === 'STAFF_ACCOUNT_EXISTS') {
        await openInvitationFlow(mobileDigits);
        return;
      }
      toast.error(error.response?.data?.message || error.message || 'Unable to send verification code.');
    } finally {
      setBusy(false);
    }
  };

  const verifyAndAdd = async (event) => {
    event?.preventDefault();
    if (!/^\d{6}$/.test(otp.trim())) {
      toast.error('Enter the 6-digit verification code.');
      return;
    }

    setBusy(true);
    try {
      const response = await axios.post(
        `${API_BASE_URL}/settings/staff/otp/verify-create`,
        { mobile: mobile.replace(/\D/g, '').slice(-10), otp: otp.trim() },
        { headers: headers() },
      );
      if (!response.data?.success) throw new Error(response.data?.message || 'Unable to add staff member.');
      toast.success(response.data.message || 'Staff member added successfully.');
      onSuccess?.();
      onClose?.();
    } catch (error) {
      if (error.response?.status === 409 && error.response?.data?.code === 'STAFF_ACCOUNT_EXISTS') {
        await openInvitationFlow(mobile.replace(/\D/g, '').slice(-10));
        return;
      }
      toast.error(error.response?.data?.message || error.message || 'Unable to verify and add staff member.');
    } finally {
      setBusy(false);
    }
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          className="fixed inset-0 z-[10060] flex items-center justify-center overflow-y-auto p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="presentation"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            aria-label="Close add staff with OTP dialog"
            disabled={busy}
            onClick={onClose}
          />
          <motion.section
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-staff-otp-title"
            className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl"
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            onClick={(event) => event.stopPropagation()}
          >
            <header className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
              <div>
                <h2 id="add-staff-otp-title" className="flex items-center gap-2 text-lg font-bold text-slate-900">
                  <FiShield className="text-indigo-600" />
                  Add Staff with Mobile OTP
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Verify the staff member’s phone and add them directly without an invitation.
                </p>
              </div>
              <button type="button" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" onClick={onClose} disabled={busy} aria-label="Close">
                <FiX />
              </button>
            </header>

            <form onSubmit={otpSent ? verifyAndAdd : sendOtp} className="space-y-4 px-5 py-5">
              <label className="block text-sm font-medium text-slate-700">
                Staff member name
                <span className="ml-1 text-xs font-normal text-slate-400">(required for a new account)</span>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  disabled={busy || otpSent}
                  className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-50"
                  placeholder="Full name"
                  autoComplete="name"
                />
              </label>

              <label className="block text-sm font-medium text-slate-700">
                Mobile number
                <div className="mt-1.5 flex h-11 overflow-hidden rounded-lg border border-slate-200 bg-white focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100">
                  <span className="flex items-center border-r border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-600">
                    +91
                  </span>
                  <input
                    value={mobile}
                    onChange={(event) => {
                      setMobile(event.target.value.replace(/\D/g, '').slice(0, 10));
                      if (otpSent) {
                        setOtpSent(false);
                        setOtp('');
                      }
                    }}
                    disabled={busy || otpSent}
                    className="h-full min-w-0 flex-1 px-3 text-sm text-slate-700 outline-none disabled:bg-slate-50"
                    placeholder="10-digit mobile"
                    maxLength={10}
                    inputMode="numeric"
                    pattern="[0-9]{10}"
                    autoComplete="tel"
                  />
                </div>
              </label>

              <div className="block text-sm font-medium text-slate-700">
                Designation
                <CustomSelect
                  options={DESIGNATION_OPTIONS}
                  value={optionByValue(DESIGNATION_OPTIONS, designation)}
                  onChange={(option) => setDesignation(option?.value || '')}
                  placeholder="Select designation"
                  isClearable={false}
                  isDisabled={busy || otpSent}
                />
              </div>

              {otpSent && (
                <>
                  <p className="text-sm text-slate-500">Enter the 6-digit code sent to {mobileMasked}.</p>
                  <label className="block text-sm font-medium text-slate-700">
                    Verification code
                    <input
                      value={otp}
                      onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))}
                      disabled={busy}
                      className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm tracking-[0.3em] outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                      placeholder="6-digit code"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                    />
                  </label>
                </>
              )}

              <div className="flex flex-wrap justify-between gap-2 pt-2">
                {otpSent ? (
                  <button type="button" onClick={sendOtp} disabled={busy} className="rounded-lg px-3 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-50 disabled:opacity-50">
                    Resend code
                  </button>
                ) : <span />}
                <button type="submit" disabled={busy} className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">
                  {busy ? 'Please wait…' : otpSent ? 'Verify & Add Staff' : 'Send Verification Code'}
                </button>
              </div>
            </form>
          </motion.section>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
