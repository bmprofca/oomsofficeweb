import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { Header, Sidebar } from '../components/header';
import TablePagination from '../components/TablePagination';
import getHeaders from '../utils/get-headers';
import API_BASE_URL from '../utils/api-controller';
import {
  FiCreditCard,
  FiRefreshCw,
  FiClock,
  FiList,
  FiX,
  FiMoreVertical,
  FiEye,
  FiDownload,
  FiLoader,
  FiArrowUpRight,
  FiShield,
  FiSend,
  FiChevronRight,
} from 'react-icons/fi';

const ACTIONS_MENU_WIDTH = 168;
const ACTIONS_MENU_HEIGHT = 88;
const QUICK_AMOUNTS = [50, 100, 200, 500, 1000];
const DEFAULT_REMARK = 'Wallet Recharge';

/** Allow digits with optional one decimal point and up to 2 fractional digits. */
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

const loadScript = (src) => {
  return new Promise((resolve) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

const downloadFileFromUrl = async (fileUrl, filename) => {
  const response = await fetch(fileUrl);
  if (!response.ok) {
    throw new Error('Failed to fetch invoice file');
  }
  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = filename || 'wallet-invoice.pdf';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
};

const SkeletonPulse = ({ className = '' }) => (
  <div className={`animate-pulse rounded-md bg-slate-200/80 ${className}`} />
);

const BalanceCardSkeleton = () => (
  <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className="flex items-center justify-between gap-3">
      <div className="space-y-2">
        <SkeletonPulse className="h-3 w-28" />
        <SkeletonPulse className="h-8 w-36" />
      </div>
      <SkeletonPulse className="h-11 w-11 rounded-xl" />
    </div>
    <div className="mt-4 space-y-2 border-t border-slate-100 pt-3">
      <div className="flex justify-between">
        <SkeletonPulse className="h-3.5 w-28" />
        <SkeletonPulse className="h-3.5 w-16" />
      </div>
      <SkeletonPulse className="h-3 w-40" />
    </div>
  </div>
);

const TopUpCardSkeleton = () => (
  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:col-span-2">
    <div className="mb-3 flex items-center gap-2.5">
      <SkeletonPulse className="h-8 w-8 rounded-lg" />
      <div className="space-y-1.5">
        <SkeletonPulse className="h-3.5 w-28" />
        <SkeletonPulse className="h-2.5 w-40" />
      </div>
    </div>
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      <SkeletonPulse className="h-9 w-full rounded-lg" />
      <SkeletonPulse className="h-9 w-full rounded-lg" />
    </div>
    <div className="mt-3 flex flex-wrap gap-1.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <SkeletonPulse key={i} className="h-7 w-12 rounded-md" />
      ))}
    </div>
    <div className="mt-3 flex justify-end">
      <SkeletonPulse className="h-9 w-36 rounded-lg" />
    </div>
  </div>
);

const TransactionsSkeleton = () => (
  <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
    <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-4">
      <SkeletonPulse className="h-10 w-10 rounded-xl" />
      <div className="space-y-2">
        <SkeletonPulse className="h-4 w-40" />
        <SkeletonPulse className="h-3 w-56" />
      </div>
    </div>
    <div className="space-y-0">
      <div className="grid grid-cols-7 gap-3 border-b border-slate-100 bg-slate-50/80 px-6 py-3">
        {[10, 24, 16, 20, 14, 12, 8].map((w, i) => (
          <SkeletonPulse key={i} className={`h-3 w-${w}`} style={{ width: `${w * 4}px` }} />
        ))}
      </div>
      {Array.from({ length: 6 }).map((_, row) => (
        <div
          key={row}
          className="grid grid-cols-7 items-center gap-3 border-b border-slate-50 px-6 py-3.5 last:border-b-0"
        >
          <SkeletonPulse className="h-3 w-6" />
          <SkeletonPulse className="h-3 w-28" />
          <SkeletonPulse className="h-3 w-24" />
          <SkeletonPulse className="h-3 w-32" />
          <SkeletonPulse className="ml-auto h-3 w-16" />
          <SkeletonPulse className="mx-auto h-5 w-14 rounded-full" />
          <SkeletonPulse className="mx-auto h-8 w-8 rounded-lg" />
        </div>
      ))}
    </div>
  </div>
);

const WalletRecharge = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(() =>
    JSON.parse(localStorage.getItem('sidebarMinimized') || 'false')
  );

  const [balanceData, setBalanceData] = useState(null);
  const [loadingBalance, setLoadingBalance] = useState(true);
  const [transactions, setTransactions] = useState([]);
  const [loadingTransactions, setLoadingTransactions] = useState(true);
  const [pagination, setPagination] = useState({
    page_no: 1,
    limit: 10,
    total: 0,
    total_pages: 1,
  });
  const [selectedTx, setSelectedTx] = useState(null);
  const [activeRowDropdown, setActiveRowDropdown] = useState(null);
  const [dropdownPos, setDropdownPos] = useState({
    top: 0,
    right: 0,
    openUpward: false,
  });
  const [downloadingInvoiceId, setDownloadingInvoiceId] = useState(null);

  const [rechargeAmount, setRechargeAmount] = useState('');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [amountError, setAmountError] = useState('');
  const [feeSettings, setFeeSettings] = useState({
    gateway_fee_percent: 0,
    gateway_fee_flat: 0,
  });

  const parseTxDetails = (tx) => {
    if (!tx) return {};

    const detailsText = tx.details || '';
    let parsedJson = null;

    if (detailsText.trim().startsWith('{')) {
      try {
        parsedJson = JSON.parse(detailsText);
      } catch (e) {}
    }

    const sms_id =
      tx.sms_id ||
      parsedJson?.sms_id ||
      detailsText.match(/sms_id:\s*([a-zA-Z0-9_-]+)/i)?.[1];
    const campaign_id =
      tx.campaign_id ||
      tx.broadcast_id ||
      parsedJson?.campaign_id ||
      parsedJson?.broadcast_id ||
      detailsText.match(/(?:campaign_id|broadcast_id):\s*([a-zA-Z0-9_-]+)/i)?.[1];
    const message =
      tx.message ||
      parsedJson?.message ||
      detailsText.match(/(?:message|msg):\s*["']?([^"'\n]+)/i)?.[1];
    const recipients_count =
      tx.recipients_count ||
      parsedJson?.recipients_count ||
      detailsText.match(/recipients?:\s*(\d+)/i)?.[1];
    const gateway =
      tx.gateway ||
      parsedJson?.gateway ||
      detailsText.match(/gateway:\s*([a-zA-Z0-9_-]+)/i)?.[1];

    return {
      sms_id,
      campaign_id,
      message,
      recipients_count,
      gateway,
      rawDetails: parsedJson ? null : detailsText,
    };
  };

  useEffect(() => {
    localStorage.setItem('sidebarMinimized', JSON.stringify(isMinimized));
  }, [isMinimized]);

  const fetchWalletBalance = async () => {
    setLoadingBalance(true);
    try {
      const headers = getHeaders();
      const res = await fetch(`${API_BASE_URL}/wallet/balance`, { headers });
      const result = await res.json();
      if (result.success) {
        setBalanceData(result.data);
      } else {
        toast.error(result.message || 'Failed to fetch wallet balance');
      }
    } catch (error) {
      console.error('Fetch balance error:', error);
      toast.error('Failed to fetch wallet balance');
    } finally {
      setLoadingBalance(false);
    }
  };

  const fetchFeeSettings = useCallback(async () => {
    try {
      const headers = getHeaders();
      const res = await fetch(`${API_BASE_URL}/wallet/gateway-fee`, { headers });
      const result = await res.json();
      if (result.success && result.data) {
        setFeeSettings({
          gateway_fee_percent: Number(result.data.gateway_fee_percent) || 0,
          gateway_fee_flat: Number(result.data.gateway_fee_flat) || 0,
        });
      }
    } catch (error) {
      console.error('Fetch gateway fee error:', error);
    }
  }, []);

  const fetchTransactions = useCallback(async (page = 1, limit = 10) => {
    setLoadingTransactions(true);
    try {
      const headers = getHeaders();
      const params = new URLSearchParams({
        page_no: page,
        limit,
      });
      const res = await fetch(`${API_BASE_URL}/wallet/transactions?${params}`, {
        headers,
      });
      const result = await res.json();
      if (result.success) {
        setTransactions(result.data || []);
        if (result.pagination) {
          setPagination({
            page_no: Number(result.pagination.page_no || page),
            limit: Number(result.pagination.limit || limit),
            total: Number(result.pagination.total || 0),
            total_pages: Number(result.pagination.total_pages || 1),
          });
        }
      } else {
        toast.error(result.message || 'Failed to fetch transactions');
      }
    } catch (error) {
      console.error('Fetch transactions error:', error);
      toast.error('Failed to fetch transactions');
    } finally {
      setLoadingTransactions(false);
    }
  }, []);

  useEffect(() => {
    fetchWalletBalance();
    fetchFeeSettings();
  }, [fetchFeeSettings]);

  useEffect(() => {
    fetchTransactions(pagination.page_no, pagination.limit);
  }, [pagination.page_no, pagination.limit, fetchTransactions]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        !e.target.closest('[data-wallet-actions-menu]') &&
        !e.target.closest('.wallet-actions-trigger')
      ) {
        setActiveRowDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const close = () => setActiveRowDropdown(null);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, []);

  const activeTx = useMemo(
    () =>
      transactions.find((tx) => tx.transaction_id === activeRowDropdown) || null,
    [transactions, activeRowDropdown]
  );

  const toggleRowDropdown = (transactionId, e) => {
    if (activeRowDropdown === transactionId) {
      setActiveRowDropdown(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUpward = spaceBelow < ACTIONS_MENU_HEIGHT + 8;
    setDropdownPos({
      top: openUpward ? undefined : rect.bottom + 4,
      bottom: openUpward ? window.innerHeight - rect.top + 4 : undefined,
      right: window.innerWidth - rect.right,
      openUpward,
    });
    setActiveRowDropdown(transactionId);
  };

  const openDetailsModal = (tx) => {
    setActiveRowDropdown(null);
    setSelectedTx(tx);
  };

  const handleDownloadInvoice = async (tx) => {
    setActiveRowDropdown(null);
    if (!tx?.transaction_id) return;

    setDownloadingInvoiceId(tx.transaction_id);
    const toastId = toast.loading('Generating invoice...');

    try {
      const headers = getHeaders();
      if (!headers) {
        toast.error('Please log in again to download the invoice', { id: toastId });
        return;
      }

      const res = await fetch(
        `${API_BASE_URL}/wallet/transactions/${encodeURIComponent(tx.transaction_id)}/invoice`,
        { headers }
      );
      const result = await res.json();

      if (!result.success || !result.data?.url) {
        toast.error(result.message || 'Failed to generate invoice', { id: toastId });
        return;
      }

      await downloadFileFromUrl(
        result.data.url,
        result.data.filename || `wallet-invoice-${tx.transaction_id}.pdf`
      );
      toast.success('Invoice downloaded', { id: toastId });
    } catch (error) {
      console.error('Wallet invoice download error:', error);
      toast.error(error.message || 'Failed to download invoice', { id: toastId });
    } finally {
      setDownloadingInvoiceId(null);
    }
  };

  const refreshData = () => {
    fetchWalletBalance();
    fetchTransactions(pagination.page_no, pagination.limit);
    fetchFeeSettings();
  };

  const handleAmountChange = (e) => {
    const next = e.target.value;
    if (!isValidAmountInput(next)) return;
    setRechargeAmount(next);
    if (amountError) setAmountError('');
  };

  const handleAddMoney = async (e) => {
    e.preventDefault();
    const amountNum = parseAmount(rechargeAmount);
    if (amountNum == null || amountNum < 1) {
      setAmountError('Enter a valid amount (minimum ₹1, up to 2 decimal places)');
      toast.error('Please enter a valid recharge amount');
      return;
    }

    setAmountError('');
    setSubmitting(true);
    const toastId = toast.loading('Initializing payment gateway...');

    try {
      const headers = getHeaders();
      if (!headers) {
        toast.error('Please login to recharge your wallet.', { id: toastId });
        return;
      }

      const scriptLoaded = await loadScript(
        'https://checkout.razorpay.com/v1/checkout.js'
      );
      if (!scriptLoaded) {
        toast.error(
          'Razorpay SDK failed to load. Please check your internet connection.',
          { id: toastId }
        );
        return;
      }

      const checkoutRes = await fetch(`${API_BASE_URL}/wallet/create-checkout`, {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: amountNum,
          remark: details.trim() || DEFAULT_REMARK,
        }),
      });

      const checkoutData = await checkoutRes.json();
      if (!checkoutData.success) {
        toast.error(checkoutData.message || 'Failed to initiate payment.', {
          id: toastId,
        });
        return;
      }

      const { key, amount, currency, order_id, name, description, net_amount } =
        checkoutData.data;
      toast.dismiss(toastId);

      const creditLabel =
        net_amount != null ? Number(net_amount) : amountNum;

      const options = {
        key,
        amount,
        currency,
        name,
        description,
        order_id,
        handler: async function (response) {
          const verificationToastId = toast.loading(
            'Verifying payment transaction...'
          );
          try {
            const verifyRes = await fetch(
              `${API_BASE_URL}/wallet/verify-payment`,
              {
                method: 'POST',
                headers: {
                  ...headers,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  razorpay_order_id: order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                }),
              }
            );

            const verifyData = await verifyRes.json();
            if (verifyData.success) {
              toast.success(
                verifyData.message ||
                  `Successfully added ₹${Number(creditLabel).toFixed(2)} to wallet!`,
                { id: verificationToastId }
              );
              setRechargeAmount('');
              setDetails('');
              refreshData();
            } else {
              toast.error(
                verifyData.message || 'Payment verification failed.',
                { id: verificationToastId }
              );
            }
          } catch (error) {
            console.error('Verify payment error:', error);
            toast.error('Error verifying payment. Please contact support.', {
              id: verificationToastId,
            });
          }
        },
        prefill: {
          email: localStorage.getItem('user_email') || 'user@example.com',
          name: localStorage.getItem('user_name') || 'User',
        },
        theme: {
          color: '#0f766e',
        },
        modal: {
          ondismiss: function () {
            toast.error('Payment cancelled.');
          },
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (error) {
      console.error('Add money error:', error);
      toast.error('Failed to start wallet recharge.', { id: toastId });
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickAmountClick = (amount) => {
    setRechargeAmount(String(amount));
    setAmountError('');
  };

  const formatTxDate = (dateString) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const info = selectedTx ? parseTxDetails(selectedTx) : {};
  const balanceValue = Number(balanceData?.balance || 0);
  const parsedPreview = parseAmount(rechargeAmount);
  const feePreview = useMemo(() => {
    if (parsedPreview == null) return null;
    const percent = Number(feeSettings.gateway_fee_percent) || 0;
    const flat = Number(feeSettings.gateway_fee_flat) || 0;
    const fee = Math.round(((parsedPreview * percent) / 100 + flat) * 100) / 100;
    return {
      net: parsedPreview,
      fee,
      total: Math.round((parsedPreview + fee) * 100) / 100,
    };
  }, [parsedPreview, feeSettings]);

  const feeRateLabel = useMemo(() => {
    const percent = Number(feeSettings.gateway_fee_percent) || 0;
    const flat = Number(feeSettings.gateway_fee_flat) || 0;
    if (percent <= 0 && flat <= 0) return 'No gateway fee';
    const parts = [];
    if (percent > 0) parts.push(`${percent}%`);
    if (flat > 0) {
      parts.push(
        `₹${flat.toLocaleString('en-IN', {
          minimumFractionDigits: flat % 1 === 0 ? 0 : 2,
          maximumFractionDigits: 2,
        })}`
      );
    }
    return parts.join(' + ');
  }, [feeSettings]);

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

      <div
        className={`pt-16 transition-all duration-300 ease-in-out ${
          isMinimized ? 'md:pl-20' : 'md:pl-[260px]'
        }`}
      >
        <div className="mx-2 my-3 flex h-full flex-col space-y-4 sm:mx-4 md:mx-8 md:my-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Wallet Recharge
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Add funds securely and track every credit and debit.
              </p>
            </div>
            <button
              type="button"
              onClick={refreshData}
              disabled={loadingBalance || loadingTransactions}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
            >
              <FiRefreshCw
                className={`h-4 w-4 ${
                  loadingBalance || loadingTransactions ? 'animate-spin' : ''
                }`}
              />
              Refresh
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {loadingBalance ? (
              <BalanceCardSkeleton />
            ) : (
              <div className="relative overflow-hidden rounded-xl border border-teal-800/15 bg-[linear-gradient(145deg,#0f766e_0%,#115e59_60%,#134e4a_100%)] px-5 py-4 text-white shadow-sm">
                <div className="relative flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal-100/80">
                      Available balance
                    </p>
                    <p className="mt-1.5 font-mono text-3xl font-bold tracking-tight">
                      ₹{balanceValue.toLocaleString('en-IN', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </p>
                  </div>
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/20">
                    <FiCreditCard className="h-5 w-5" />
                  </div>
                </div>
                <div className="relative mt-4 space-y-1.5 border-t border-white/15 pt-3 text-sm text-teal-50/90">
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5">
                      <FiShield className="h-4 w-4" />
                      Payment charges
                    </span>
                    <span className="font-semibold text-white">{feeRateLabel}</span>
                  </div>
                  <p className="text-xs text-teal-100/75">
                    Applied on Razorpay top-ups only
                    {balanceData?.modify_date
                      ? ` · Updated ${new Date(balanceData.modify_date).toLocaleDateString('en-IN')}`
                      : ''}
                  </p>
                </div>
              </div>
            )}

            {loadingBalance ? (
              <TopUpCardSkeleton />
            ) : (
              <div className="rounded-xl border border-slate-200/90 bg-white px-5 py-4 shadow-sm lg:col-span-2">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-700 ring-1 ring-teal-100">
                    <FiArrowUpRight className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Top up wallet</h2>
                    <p className="text-sm text-slate-500">
                      UPI, cards, or net banking via Razorpay
                    </p>
                  </div>
                </div>

                <form onSubmit={handleAddMoney} className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                        Amount (₹)
                      </label>
                      <div className="relative">
                        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-base font-semibold text-slate-400">
                          ₹
                        </span>
                        <input
                          type="text"
                          inputMode="decimal"
                          autoComplete="off"
                          className={`w-full rounded-lg border bg-slate-50/70 py-2.5 pl-7 pr-3 text-base font-semibold text-slate-900 outline-none transition focus:bg-white focus:ring-2 ${
                            amountError
                              ? 'border-rose-300 focus:border-rose-400 focus:ring-rose-100'
                              : 'border-slate-200 focus:border-teal-500 focus:ring-teal-100'
                          }`}
                          placeholder="0.00"
                          value={rechargeAmount}
                          onChange={handleAmountChange}
                          required
                        />
                      </div>
                      {amountError ? (
                        <p className="mt-1.5 text-sm font-medium text-rose-600">
                          {amountError}
                        </p>
                      ) : null}
                    </div>

                    <div>
                      <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                        Remark
                      </label>
                      <input
                        type="text"
                        className="w-full rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-100"
                        placeholder="Optional note"
                        value={details}
                        onChange={(e) => setDetails(e.target.value)}
                        maxLength={200}
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className="mr-0.5 text-sm font-medium text-slate-500">
                      Quick
                    </span>
                    {QUICK_AMOUNTS.map((amt) => {
                      const active = String(amt) === String(rechargeAmount);
                      return (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => handleQuickAmountClick(amt)}
                          className={`rounded-md px-3 py-1.5 text-sm font-semibold transition ${
                            active
                              ? 'bg-teal-700 text-white'
                              : 'bg-slate-100 text-slate-700 hover:bg-teal-50 hover:text-teal-800'
                          }`}
                        >
                          ₹{amt}
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                    <div className="text-sm text-slate-600">
                      {feePreview != null ? (
                        feePreview.fee > 0 ? (
                          <>
                            Credit{' '}
                            <span className="font-semibold text-slate-800">
                              ₹
                              {feePreview.net.toLocaleString('en-IN', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </span>
                            {' + '}
                            fee{' '}
                            <span className="font-semibold text-slate-800">
                              ₹
                              {feePreview.fee.toLocaleString('en-IN', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </span>
                            {' = pay '}
                            <span className="font-semibold text-teal-800">
                              ₹
                              {feePreview.total.toLocaleString('en-IN', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </span>
                          </>
                        ) : (
                          <>
                            Pay{' '}
                            <span className="font-semibold text-slate-800">
                              ₹
                              {feePreview.net.toLocaleString('en-IN', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </span>
                          </>
                        )
                      ) : (
                        'Enter an amount to continue'
                      )}
                    </div>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="inline-flex items-center justify-center gap-2 rounded-lg bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-800 disabled:opacity-55"
                    >
                      {submitting ? (
                        <FiLoader className="h-4 w-4 animate-spin" />
                      ) : (
                        <FiCreditCard className="h-4 w-4" />
                      )}
                      Pay with Razorpay
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>

          <Link
            to="/wallet/payment-request"
            className="group relative block overflow-hidden rounded-xl border border-slate-200/90 bg-white no-underline shadow-sm transition hover:border-teal-300 hover:shadow-md"
          >
            <div className="absolute inset-y-0 left-0 w-1 bg-teal-600 opacity-80 transition group-hover:opacity-100" />
            <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-5 pl-6">
              <div className="flex min-w-0 items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-teal-50 to-teal-100 text-teal-800 ring-1 ring-teal-200/80 transition group-hover:from-teal-100 group-hover:to-teal-200">
                  <FiSend className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-bold text-slate-900 no-underline">
                      Payment request
                    </h2>
                    <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-100">
                      <FiShield className="h-3 w-3" />
                      No charges
                    </span>
                  </div>
                  <p className="mt-1 text-sm leading-relaxed text-slate-500 no-underline">
                    Transfer to our bank account and submit a request. Full amount is credited
                    after admin approval — no gateway fee.
                  </p>
                </div>
              </div>
              <span className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-sm font-semibold text-white no-underline transition group-hover:bg-teal-800">
                Open page
                <FiChevronRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </span>
            </div>
          </Link>

          {loadingTransactions ? (
            <TransactionsSkeleton />
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm">
              <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                    <FiList className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">
                      Transaction history
                    </h2>
                    <p className="text-sm text-slate-500">
                      Credits, debits, and recharge activity for this wallet
                    </p>
                  </div>
                </div>
              </div>

              {transactions.length === 0 ? (
                <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
                  <div className="mb-4 rounded-full bg-slate-100 p-4">
                    <FiClock className="h-8 w-8 text-slate-400" />
                  </div>
                  <p className="font-medium text-slate-700">No transactions yet</p>
                  <p className="mt-1 text-sm text-slate-400">
                    Recharge your wallet to start the activity log
                  </p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="border-b border-slate-200 bg-slate-50/90 text-xs font-semibold uppercase tracking-wider text-slate-500">
                        <tr>
                          <th className="w-12 px-4 py-3 text-center">#</th>
                          <th className="px-6 py-3">Transaction ID</th>
                          <th className="px-6 py-3">Date</th>
                          <th className="px-6 py-3">Remark</th>
                          <th className="px-6 py-3 text-right">Amount</th>
                          <th className="px-6 py-3 text-center">Type</th>
                          <th className="w-16 px-4 py-3 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {transactions.map((tx, index) => {
                          const serialNo =
                            (pagination.page_no - 1) * pagination.limit +
                            index +
                            1;
                          return (
                            <tr
                              key={tx.id || tx.transaction_id}
                              className="transition-colors hover:bg-slate-50/70"
                            >
                              <td className="px-4 py-3 text-center text-sm font-semibold tabular-nums text-slate-500">
                                {serialNo}
                              </td>
                              <td className="px-6 py-3 font-mono text-sm text-slate-500">
                                {tx.transaction_id}
                              </td>
                              <td className="px-6 py-3 text-sm text-slate-600">
                                {formatTxDate(tx.create_date)}
                              </td>
                              <td className="px-6 py-3 font-semibold text-slate-800">
                                {tx.remark || tx.purpose || '—'}
                              </td>
                              <td className="px-6 py-3 text-right font-mono font-bold text-slate-800">
                                ₹{Number(tx.amount || 0).toFixed(2)}
                              </td>
                              <td className="px-6 py-3 text-center">
                                {tx.type === 'credit' ? (
                                  <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                                    Credit
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-700">
                                    Debit
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <button
                                  type="button"
                                  onClick={(e) =>
                                    toggleRowDropdown(tx.transaction_id, e)
                                  }
                                  className="wallet-actions-trigger inline-flex rounded-lg border border-slate-200 p-1.5 text-slate-500 transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700"
                                  aria-label="Transaction actions"
                                  title="Actions"
                                >
                                  <FiMoreVertical className="h-4 w-4" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {pagination.total > 0 && (
                    <TablePagination
                      showRange
                      showRows
                      showJump
                      showFirstLast
                      rowOptions={[10, 20, 50, 100]}
                      defaultRows={10}
                      page={pagination.page_no}
                      limit={pagination.limit}
                      total={pagination.total}
                      totalPages={pagination.total_pages}
                      onPageChange={(page) =>
                        setPagination((prev) => ({ ...prev, page_no: page }))
                      }
                      onLimitChange={(limit) =>
                        setPagination((prev) => ({
                          ...prev,
                          limit,
                          page_no: 1,
                        }))
                      }
                    />
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {activeRowDropdown &&
        activeTx &&
        createPortal(
          <div
            data-wallet-actions-menu
            className="fixed z-[99999] w-44 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-xl"
            style={{
              top: dropdownPos.top,
              bottom: dropdownPos.bottom,
              right: dropdownPos.right,
              minWidth: ACTIONS_MENU_WIDTH,
            }}
          >
            <button
              type="button"
              onClick={() => openDetailsModal(activeTx)}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
            >
              <FiEye className="h-3.5 w-3.5 text-slate-500" />
              Details
            </button>
            <button
              type="button"
              onClick={() => handleDownloadInvoice(activeTx)}
              disabled={downloadingInvoiceId === activeTx.transaction_id}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              {downloadingInvoiceId === activeTx.transaction_id ? (
                <FiLoader className="h-3.5 w-3.5 animate-spin text-slate-500" />
              ) : (
                <FiDownload className="h-3.5 w-3.5 text-slate-500" />
              )}
              Download
            </button>
          </div>,
          document.body
        )}

      {createPortal(
        <AnimatePresence>
          {selectedTx ? (
            <motion.div
              key="wallet-tx-modal"
              className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden overscroll-none p-3 sm:p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
            >
              <motion.button
                type="button"
                aria-label="Close modal backdrop"
                className="absolute inset-0 bg-slate-900/45 backdrop-blur-[2px]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelectedTx(null)}
              />

              <motion.div
                role="dialog"
                aria-modal="true"
                initial={{ opacity: 0, y: 14, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.98 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                className="relative z-[1] flex max-h-[calc(100vh-1.5rem)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl sm:max-h-[calc(100vh-2rem)]"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-3.5">
                  <h3 className="flex items-center gap-1.5 text-base font-bold uppercase tracking-wider text-slate-800">
                    <FiList className="text-teal-600" />
                    Transaction details
                  </h3>
                  <button
                    type="button"
                    onClick={() => setSelectedTx(null)}
                    className="rounded-lg p-1 transition-colors hover:bg-slate-200"
                  >
                    <FiX />
                  </button>
                </div>

                <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-y-contain px-5 py-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                      <span className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-400">
                        Transaction ID
                      </span>
                      <span className="font-mono text-xs font-semibold text-slate-700">
                        {selectedTx.transaction_id}
                      </span>
                    </div>
                    <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                      <span className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-400">
                        Date & Time
                      </span>
                      <span className="text-xs font-semibold text-slate-700">
                        {formatTxDate(selectedTx.create_date)}
                      </span>
                    </div>
                    <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                      <span className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-400">
                        Type
                      </span>
                      {selectedTx.type === 'credit' ? (
                        <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                          Credit
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-700">
                          Debit
                        </span>
                      )}
                    </div>
                    <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                      <span className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-400">
                        Amount
                      </span>
                      <span
                        className={`font-mono text-sm font-bold ${
                          selectedTx.type === 'credit'
                            ? 'text-emerald-600'
                            : 'text-rose-600'
                        }`}
                      >
                        {selectedTx.type === 'credit' ? '+' : '-'}₹
                        {Number(selectedTx.amount || 0).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Remark
                    </span>
                    <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3 text-sm font-semibold text-slate-800">
                      {selectedTx.remark || selectedTx.purpose || '—'}
                    </div>
                  </div>

                  {(info.campaign_id ||
                    info.sms_id ||
                    info.gateway ||
                    info.recipients_count) && (
                    <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                      <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                        Campaign & message metadata
                      </h4>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        {info.campaign_id && (
                          <div className="rounded-lg border border-slate-100 bg-white p-2">
                            <span className="block text-xs font-bold uppercase text-slate-400">
                              Campaign ID
                            </span>
                            <span className="font-mono font-semibold text-slate-800">
                              #{info.campaign_id}
                            </span>
                          </div>
                        )}
                        {info.sms_id && (
                          <div className="rounded-lg border border-slate-100 bg-white p-2">
                            <span className="block text-xs font-bold uppercase text-slate-400">
                              SMS ID
                            </span>
                            <span className="font-mono font-semibold text-slate-800">
                              #{info.sms_id}
                            </span>
                          </div>
                        )}
                        {info.recipients_count && (
                          <div className="rounded-lg border border-slate-100 bg-white p-2">
                            <span className="block text-xs font-bold uppercase text-slate-400">
                              Total recipients
                            </span>
                            <span className="font-semibold text-slate-800">
                              {info.recipients_count}
                            </span>
                          </div>
                        )}
                        {info.gateway && (
                          <div className="rounded-lg border border-slate-100 bg-white p-2">
                            <span className="block text-xs font-bold uppercase text-slate-400">
                              Gateway
                            </span>
                            <span className="font-mono font-semibold text-slate-800">
                              {info.gateway}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {info.message && (
                    <div className="space-y-1">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        Sent message body
                      </span>
                      <div className="whitespace-pre-wrap rounded-xl border border-slate-200 bg-slate-50 p-3 font-mono text-sm leading-relaxed text-slate-800">
                        {info.message}
                      </div>
                    </div>
                  )}

                  {info.rawDetails && (
                    <div className="space-y-1">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        Transaction remarks / details
                      </span>
                      <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3 text-sm leading-relaxed text-slate-600">
                        {info.rawDetails}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex shrink-0 justify-end border-t border-slate-200 bg-slate-50 px-5 py-3">
                  <button
                    type="button"
                    onClick={() => setSelectedTx(null)}
                    className="rounded-lg bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition-all hover:bg-slate-300"
                  >
                    Close
                  </button>
                </div>
              </motion.div>
            </motion.div>
          ) : null}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
};

export default WalletRecharge;
