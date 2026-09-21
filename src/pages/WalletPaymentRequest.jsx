import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { Header, Sidebar } from '../components/header';
import CustomSelect from '../components/CustomSelect';
import { DatePickerField } from '../components/PortalDatePicker';
import { optionByValue } from '../utils/customSelectHelpers';
import getHeaders from '../utils/get-headers';
import API_BASE_URL from '../utils/api-controller';
import {
  FiCheckCircle,
  FiClock,
  FiCopy,
  FiCreditCard,
  FiLoader,
  FiRefreshCw,
  FiSend,
  FiShield,
  FiXCircle,
} from 'react-icons/fi';

const isValidAmountInput = (value) => {
  if (value === '' || value === '.') return true;
  return /^\d+(\.\d{0,2})?$/.test(value);
};

const parseAmount = (value) => {
  const normalized = String(value || '').trim();
  if (!normalized || normalized === '.') return null;
  const num = Number(normalized);
  if (!Number.isFinite(num) || num <= 0) return null;
  return Math.round(num * 100) / 100;
};

const formatDateTime = (dateString) => {
  if (!dateString) return '—';
  return new Date(dateString).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatDateOnly = (dateString) => {
  if (!dateString) return '—';
  const raw = String(dateString).slice(0, 10);
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const SkeletonPulse = ({ className = '' }) => (
  <div className={`animate-pulse rounded-md bg-slate-200/80 ${className}`} />
);

const PaymentRequestPageSkeleton = () => (
  <div className="space-y-4">
    <div className="flex items-start gap-3 rounded-xl border border-emerald-100 bg-emerald-50/60 px-4 py-3">
      <SkeletonPulse className="mt-0.5 h-5 w-5 rounded-full" />
      <div className="min-w-0 flex-1 space-y-2">
        <SkeletonPulse className="h-4 w-40" />
        <SkeletonPulse className="h-3.5 w-full max-w-xl" />
      </div>
    </div>

    <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2.5">
        <SkeletonPulse className="h-9 w-9 rounded-lg" />
        <div className="space-y-1.5">
          <SkeletonPulse className="h-4 w-44" />
          <SkeletonPulse className="h-3 w-64" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
        <div className="space-y-2 lg:col-span-5">
          <SkeletonPulse className="h-3.5 w-24" />
          <SkeletonPulse className="h-10 w-full rounded-lg" />
          <div className="grid grid-cols-2 gap-2 rounded-lg border border-slate-100 bg-slate-50 p-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-1">
                <SkeletonPulse className="h-2.5 w-12" />
                <SkeletonPulse className="h-3.5 w-full" />
              </div>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:col-span-7">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <SkeletonPulse className="h-3.5 w-28" />
              <SkeletonPulse className="h-10 w-full rounded-lg" />
            </div>
          ))}
          <div className="flex justify-end sm:col-span-2">
            <SkeletonPulse className="h-10 w-36 rounded-lg" />
          </div>
        </div>
      </div>
    </div>

    <div className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-4 py-3 space-y-2">
        <SkeletonPulse className="h-5 w-36" />
        <SkeletonPulse className="h-3.5 w-72 max-w-full" />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-100/90">
              {[40, 100, 80, 90, 120, 70, 100].map((w, i) => (
                <th key={i} className="p-3">
                  <SkeletonPulse className="h-3" style={{ width: w }} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {Array.from({ length: 5 }).map((_, row) => (
              <tr key={row} className={row % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'}>
                {Array.from({ length: 7 }).map((__, col) => (
                  <td key={col} className="p-3">
                    <SkeletonPulse className="h-3.5 w-full max-w-[7rem]" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  </div>
);

const DetailChip = ({ label, value, mono = false, copyable = false }) => {
  if (!value) return null;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(String(value));
      toast.success(`${label} copied`);
    } catch {
      toast.error('Could not copy');
    }
  };
  return (
    <div className="rounded-lg border border-slate-200/80 bg-white px-2.5 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <div className="mt-0.5 flex items-center gap-1.5">
        <p
          className={`min-w-0 flex-1 truncate text-sm font-semibold text-slate-800 ${
            mono ? 'font-mono' : ''
          }`}
        >
          {value}
        </p>
        {copyable ? (
          <button
            type="button"
            onClick={copy}
            className="shrink-0 rounded p-1 text-slate-400 transition hover:bg-slate-100 hover:text-teal-700"
            title={`Copy ${label}`}
          >
            <FiCopy className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>
    </div>
  );
};

const copyText = async (label, value) => {
  if (!value) return;
  try {
    await navigator.clipboard.writeText(String(value));
    toast.success(`${label} copied`);
  } catch {
    toast.error('Could not copy');
  }
};

const fieldInputClass = (hasError) =>
  `h-10 w-full rounded-lg border bg-white px-3 text-sm outline-none focus:ring-2 ${
    hasError
      ? 'border-rose-300 focus:border-rose-400 focus:ring-rose-100'
      : 'border-slate-200 focus:border-teal-500 focus:ring-teal-100'
  }`;

const WalletPaymentRequest = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(() => {
    const saved = localStorage.getItem('sidebarMinimized');
    return saved ? JSON.parse(saved) : false;
  });

  const [paymentBanks, setPaymentBanks] = useState([]);
  const [paymentRequests, setPaymentRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [prAmount, setPrAmount] = useState('');
  const [prBankId, setPrBankId] = useState('');
  const [prTransferRef, setPrTransferRef] = useState('');
  const [prTransferDate, setPrTransferDate] = useState('');
  const [prRemark, setPrRemark] = useState('');
  const [prSubmitting, setPrSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    localStorage.setItem('sidebarMinimized', JSON.stringify(isMinimized));
  }, [isMinimized]);

  const bankOptions = useMemo(
    () =>
      (paymentBanks || []).map((bank) => ({
        value: bank.bank_id,
        label: `${bank.bank_name} · ${bank.account_number}`,
        bank,
      })),
    [paymentBanks]
  );

  const fetchPaymentBanks = useCallback(async () => {
    try {
      const headers = getHeaders();
      const res = await fetch(`${API_BASE_URL}/wallet/payment-banks`, { headers });
      const result = await res.json();
      if (result.success) {
        const list = result.data || [];
        setPaymentBanks(list);
        setPrBankId((prev) => prev || list[0]?.bank_id || '');
      }
    } catch (error) {
      console.error('Fetch payment banks error:', error);
    }
  }, []);

  const fetchPaymentRequests = useCallback(async () => {
    try {
      const headers = getHeaders();
      const params = new URLSearchParams({ page_no: 1, limit: 50 });
      const res = await fetch(
        `${API_BASE_URL}/wallet/payment-requests?${params}`,
        { headers }
      );
      const result = await res.json();
      if (result.success) {
        setPaymentRequests(result.data || []);
      }
    } catch (error) {
      console.error('Fetch payment requests error:', error);
    }
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([fetchPaymentBanks(), fetchPaymentRequests()]);
    } finally {
      setLoading(false);
    }
  }, [fetchPaymentBanks, fetchPaymentRequests]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const selectedBank = paymentBanks.find((b) => b.bank_id === prBankId) || null;
  const contentInset = isMinimized ? 'md:pl-20' : 'md:pl-[260px]';

  const clearFieldError = (key) => {
    setFormErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const validatePaymentRequest = () => {
    const errors = {};
    const amountNum = parseAmount(prAmount);

    if (!prBankId) {
      errors.bank_id = 'Select the bank account you transferred to';
    }
    if (amountNum == null || amountNum < 1) {
      errors.amount = 'Enter a valid amount (minimum ₹1)';
    }
    if (!prTransferDate) {
      errors.transfer_date = 'Select the transfer date';
    }
    if (!prTransferRef.trim()) {
      errors.transfer_ref = 'Enter transfer UTR / reference number';
    }

    setFormErrors(errors);
    const firstError = Object.values(errors)[0];
    if (firstError) {
      toast.error(firstError);
      return null;
    }
    return amountNum;
  };

  const handlePaymentRequest = async (e) => {
    e.preventDefault();
    const amountNum = validatePaymentRequest();
    if (amountNum == null) return;

    setPrSubmitting(true);
    const toastId = toast.loading('Submitting payment request...');
    try {
      const headers = getHeaders();
      if (!headers) {
        toast.error('Please login again', { id: toastId });
        return;
      }
      const res = await fetch(`${API_BASE_URL}/wallet/payment-requests`, {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: amountNum,
          bank_id: prBankId,
          transfer_ref: prTransferRef.trim(),
          transfer_date: prTransferDate || null,
          remark: prRemark.trim() || null,
        }),
      });
      const result = await res.json();
      if (!result.success) {
        toast.error(result.message || 'Failed to submit request', { id: toastId });
        return;
      }
      toast.success(result.message || 'Payment request submitted', { id: toastId });
      setPrAmount('');
      setPrTransferRef('');
      setPrTransferDate('');
      setPrRemark('');
      setFormErrors({});
      fetchPaymentRequests();
    } catch (error) {
      console.error('Payment request error:', error);
      toast.error('Failed to submit payment request', { id: toastId });
    } finally {
      setPrSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#f1f5f9_45%,#eef2f7_100%)]">
      <Header
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
        isMinimized={isMinimized}
        setIsMinimized={setIsMinimized}
      />
      <Sidebar
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
        isMinimized={isMinimized}
        setIsMinimized={setIsMinimized}
      />

      <div className={`pt-16 transition-all duration-300 ease-in-out ${contentInset}`}>
        <div className="mx-2 my-3 flex h-full flex-col space-y-4 sm:mx-4 md:mx-8 md:my-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Payment Request
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Transfer funds to our bank account, then submit a request for admin approval.
              </p>
            </div>
            <button
              type="button"
              onClick={refresh}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
            >
              <FiRefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          {loading ? (
            <PaymentRequestPageSkeleton />
          ) : (
            <>
              <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-900">
                <FiShield className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
                <p>
                  <span className="font-semibold">No gateway charges.</span>{' '}
                  <span className="text-emerald-800/90">
                    The full amount you transfer is credited after admin approval.
                  </span>
                </p>
              </div>

              <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-700 ring-1 ring-slate-200">
                    <FiSend className="h-4 w-4" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                      Submit transfer request
                    </h2>
                    <p className="text-sm text-slate-500">
                      Select account, transfer funds, then enter UTR details.
                    </p>
                  </div>
                </div>

                {paymentBanks.length === 0 ? (
                  <p className="rounded-lg bg-slate-50 px-3 py-2.5 text-sm text-slate-600">
                    Bank accounts are not configured yet. Please use Razorpay top-up on{' '}
                    <Link
                      to="/wallet-recharge"
                      className="font-semibold text-teal-700 no-underline hover:text-teal-800"
                    >
                      Wallet Recharge
                    </Link>{' '}
                    or contact support.
                  </p>
                ) : (
                  <form onSubmit={handlePaymentRequest} noValidate>
                    <div className="grid grid-cols-1 gap-3 lg:grid-cols-12 lg:gap-4">
                      <div className="space-y-2 lg:col-span-5">
                        <CustomSelect
                          label="Transfer to"
                          options={bankOptions}
                          value={optionByValue(bankOptions, prBankId)}
                          onChange={(option) => {
                            setPrBankId(option?.value || '');
                            clearFieldError('bank_id');
                          }}
                          placeholder="Select bank account"
                          isClearable={false}
                          error={formErrors.bank_id || undefined}
                        />

                        {selectedBank ? (
                          <div className="overflow-hidden rounded-xl border border-teal-100 bg-gradient-to-br from-teal-50/80 to-white">
                            <div className="flex items-start gap-2 border-b border-teal-100/80 px-3 py-2">
                              <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-teal-700 text-white">
                                <FiCreditCard className="h-3.5 w-3.5" />
                              </div>
                              <div className="min-w-0 flex-1 space-y-0.5">
                                <div className="flex items-center gap-1">
                                  <p className="min-w-0 flex-1 truncate text-sm font-bold leading-tight text-slate-900">
                                    {selectedBank.bank_name}
                                  </p>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      copyText('Bank name', selectedBank.bank_name)
                                    }
                                    className="shrink-0 rounded p-1 text-slate-400 transition hover:bg-teal-100 hover:text-teal-800"
                                    title="Copy bank name"
                                  >
                                    <FiCopy className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                                <div className="flex items-center gap-1">
                                  <p className="min-w-0 flex-1 truncate text-xs leading-tight text-slate-500">
                                    {selectedBank.account_name}
                                  </p>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      copyText(
                                        'Account holder',
                                        selectedBank.account_name
                                      )
                                    }
                                    className="shrink-0 rounded p-1 text-slate-400 transition hover:bg-teal-100 hover:text-teal-800"
                                    title="Copy account holder"
                                  >
                                    <FiCopy className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2 p-2.5">
                              <DetailChip
                                label="Account no."
                                value={selectedBank.account_number}
                                mono
                                copyable
                              />
                              <DetailChip
                                label="IFSC"
                                value={selectedBank.ifsc}
                                mono
                                copyable
                              />
                              <DetailChip
                                label="Branch"
                                value={selectedBank.branch_name}
                              />
                              <DetailChip
                                label="UPI"
                                value={selectedBank.upi_id}
                                copyable
                              />
                            </div>
                          </div>
                        ) : null}
                      </div>

                      <div className="grid grid-cols-1 content-start gap-2.5 sm:grid-cols-2 lg:col-span-7">
                        <div>
                          <label className="mb-1 block text-sm font-semibold text-slate-700">
                            Amount transferred (₹)
                          </label>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={prAmount}
                            onChange={(e) => {
                              if (isValidAmountInput(e.target.value)) {
                                setPrAmount(e.target.value);
                                clearFieldError('amount');
                              }
                            }}
                            placeholder="0.00"
                            className={`${fieldInputClass(Boolean(formErrors.amount))} font-semibold`}
                          />
                          {formErrors.amount ? (
                            <p className="mt-1 text-xs font-medium text-rose-600">
                              {formErrors.amount}
                            </p>
                          ) : null}
                        </div>
                        <div>
                          <label className="mb-1 block text-sm font-semibold text-slate-700">
                            Transfer date
                          </label>
                          <DatePickerField
                            value={prTransferDate}
                            onChange={(value) => {
                              setPrTransferDate(value || '');
                              clearFieldError('transfer_date');
                            }}
                            placeholder="Select date"
                            mode="single"
                            initialTab="single"
                            hideTabs
                            quickOptionKeys={['td', 'yd', 'n7']}
                            buttonClassName={`h-10 w-full rounded-lg border bg-white px-3 text-sm text-slate-700 outline-none focus:ring-2 ${
                              formErrors.transfer_date
                                ? 'border-rose-300 focus:border-rose-400 focus:ring-rose-100'
                                : 'border-slate-200 focus:border-teal-500 focus:ring-teal-100'
                            }`}
                          />
                          {formErrors.transfer_date ? (
                            <p className="mt-1 text-xs font-medium text-rose-600">
                              {formErrors.transfer_date}
                            </p>
                          ) : null}
                        </div>
                        <div>
                          <label className="mb-1 block text-sm font-semibold text-slate-700">
                            UTR / reference
                          </label>
                          <input
                            type="text"
                            value={prTransferRef}
                            onChange={(e) => {
                              setPrTransferRef(e.target.value);
                              clearFieldError('transfer_ref');
                            }}
                            placeholder="Bank transfer reference"
                            className={fieldInputClass(Boolean(formErrors.transfer_ref))}
                            maxLength={100}
                          />
                          {formErrors.transfer_ref ? (
                            <p className="mt-1 text-xs font-medium text-rose-600">
                              {formErrors.transfer_ref}
                            </p>
                          ) : null}
                        </div>
                        <div>
                          <label className="mb-1 block text-sm font-semibold text-slate-700">
                            Remark
                          </label>
                          <input
                            type="text"
                            value={prRemark}
                            onChange={(e) => setPrRemark(e.target.value)}
                            placeholder="Optional"
                            className={fieldInputClass(false)}
                            maxLength={200}
                          />
                        </div>
                        <div className="flex justify-end sm:col-span-2">
                          <button
                            type="submit"
                            disabled={prSubmitting}
                            className="inline-flex h-10 items-center gap-2 rounded-lg bg-slate-800 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-900 disabled:opacity-55"
                          >
                            {prSubmitting ? (
                              <FiLoader className="h-4 w-4 animate-spin" />
                            ) : (
                              <FiSend className="h-4 w-4" />
                            )}
                            Submit request
                          </button>
                        </div>
                      </div>
                    </div>
                  </form>
                )}
              </div>

              <div className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-sm">
                <div className="border-b border-slate-100 px-4 py-3">
                  <h2 className="text-base font-bold text-slate-900">Your requests</h2>
                  <p className="mt-0.5 text-sm text-slate-500">
                    Pending requests are reviewed by admin. Approved amounts credit your wallet
                    with no fee.
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[820px] text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-100/90">
                        <th className="w-12 p-3 text-center text-[10px] font-semibold uppercase tracking-wider text-slate-700">
                          #
                        </th>
                        <th className="min-w-[140px] p-3 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-700">
                          Request ID
                        </th>
                        <th className="min-w-[110px] p-3 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-700">
                          Date
                        </th>
                        <th className="min-w-[100px] p-3 text-right text-[10px] font-semibold uppercase tracking-wider text-slate-700">
                          Amount
                        </th>
                        <th className="min-w-[140px] p-3 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-700">
                          UTR / Ref
                        </th>
                        <th className="min-w-[160px] p-3 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-700">
                          Bank
                        </th>
                        <th className="w-28 p-3 text-center text-[10px] font-semibold uppercase tracking-wider text-slate-700">
                          Status
                        </th>
                        <th className="min-w-[140px] p-3 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-700">
                          Admin remark
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {paymentRequests.length === 0 ? (
                        <tr>
                          <td colSpan="8" className="py-12 text-center">
                            <div className="flex flex-col items-center justify-center">
                              <div className="mb-3 rounded-full bg-slate-100 p-3">
                                <FiClock className="h-7 w-7 text-slate-400" />
                              </div>
                              <p className="text-base font-medium text-slate-600">
                                No payment requests yet
                              </p>
                              <p className="mt-1 text-sm text-slate-500">
                                Submit a transfer request above to get started
                              </p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        paymentRequests.map((req, index) => (
                          <tr
                            key={req.request_id}
                            className={`${
                              index % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'
                            } transition-colors hover:bg-indigo-50/40`}
                          >
                            <td className="p-3 text-center font-medium text-slate-600">
                              {index + 1}
                            </td>
                            <td className="p-3 font-mono text-xs text-slate-600">
                              {req.request_id}
                            </td>
                            <td className="p-3 text-slate-600">
                              <div>{formatDateTime(req.create_date)}</div>
                              {req.transfer_date ? (
                                <div className="text-xs text-slate-400">
                                  Transferred {formatDateOnly(req.transfer_date)}
                                </div>
                              ) : null}
                            </td>
                            <td className="p-3 text-right font-mono font-bold text-slate-800">
                              ₹
                              {Number(req.amount || 0).toLocaleString('en-IN', {
                                minimumFractionDigits: 2,
                              })}
                            </td>
                            <td className="p-3 text-slate-700">
                              {req.transfer_ref || '—'}
                            </td>
                            <td className="p-3 text-slate-600">
                              {req.bank ? (
                                <>
                                  <div className="font-medium text-slate-800">
                                    {req.bank.bank_name}
                                  </div>
                                  <div className="font-mono text-xs text-slate-500">
                                    {req.bank.account_number}
                                  </div>
                                </>
                              ) : (
                                '—'
                              )}
                            </td>
                            <td className="p-3 text-center">
                              <span
                                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${
                                  req.status === 'approved'
                                    ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                                    : req.status === 'rejected'
                                      ? 'border border-rose-200 bg-rose-50 text-rose-700'
                                      : 'border border-amber-200 bg-amber-50 text-amber-700'
                                }`}
                              >
                                {req.status === 'approved' ? (
                                  <FiCheckCircle className="h-3 w-3" />
                                ) : req.status === 'rejected' ? (
                                  <FiXCircle className="h-3 w-3" />
                                ) : (
                                  <FiClock className="h-3 w-3" />
                                )}
                                {req.status}
                              </span>
                            </td>
                            <td className="p-3 text-slate-500">
                              {req.admin_remark || '—'}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default WalletPaymentRequest;
