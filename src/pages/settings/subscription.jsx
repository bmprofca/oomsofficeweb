import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Header, Sidebar } from '../../components/header';
import {
    FiCreditCard,
    FiCheck,
    FiStar,
    FiZap,
    FiAward,
    FiCalendar,
    FiAlertTriangle,
    FiClock,
    FiX,
    FiArrowRight,
    FiHome,
} from 'react-icons/fi';
import { FaWallet } from 'react-icons/fa';
import { useSubscription } from '../../hooks/useSubscription';
import getHeaders from '../../utils/get-headers';
import API_BASE_URL from '../../utils/api-controller';
import { toast } from 'react-hot-toast';
import useBodyScrollLock from '../../hooks/useBodyScrollLock';

const loadScript = (src) => {
    return new Promise((resolve) => {
        const script = document.createElement("script");
        script.src = src;
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
    });
};

// Centralised, currency-aware number formatting so amounts never render
// without thousands separators (e.g. ₹29,990.00 instead of ₹29990.00).
const formatINR = (value) => {
    const num = Number(value) || 0;
    return num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const GST_RATE = 0.18;

const calculateGSTPrice = (price) => {
    const base = Number(price) || 0;
    return Math.round(base * (1 + GST_RATE) * 100) / 100;
};

const PLAN_META = {
    Business: { icon: FiStar, color: 'blue', tagline: 'For solo operators getting started' },
    BusinessPlus: { icon: FiZap, color: 'indigo', tagline: 'For growing teams that need staff tools', popular: true },
    BusinessPro: { icon: FiAward, color: 'violet', tagline: 'For established businesses that need it all' },
};

const Subscription = () => {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(() => {
        const saved = localStorage.getItem('sidebarMinimized');
        return saved ? JSON.parse(saved) : false;
    });
    const [paymentLoading, setPaymentLoading] = useState(false);
    const [billingCycle, setBillingCycle] = useState('monthly'); // 'monthly' or 'yearly'
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState(null);
    const [walletBalance, setWalletBalance] = useState(0);
    const [walletLoading, setWalletLoading] = useState(true);
    const [walletError, setWalletError] = useState('');
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [successDetails, setSuccessDetails] = useState(null);

    const buildSuccessConfetti = () => (
        Array.from({ length: 10 }, (_, index) => ({
            id: index,
            left: `${10 + (index * 8) % 80}%`,
            delay: `${(index % 4) * 0.08}s`,
            size: index % 3 === 0 ? 5 : 4,
            color: ['#6366f1', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899'][index % 5],
            drift: index % 2 === 0 ? -10 : 10,
        }))
    );

    const { subscription, loading: subLoading, refetch } = useSubscription();
    const branchName = localStorage.getItem('branch_name') || 'Current branch';
    const branchId = subscription?.branch_id || localStorage.getItem('branch_id') || '';

    const getWalletChargeAmount = (plan) => calculateGSTPrice(plan?.price || 0);

    const fetchWalletBalance = async ({ refresh = false } = {}) => {
        if (refresh) {
            setWalletLoading(true);
        }
        setWalletError('');

        const headers = getHeaders();
        if (!headers) {
            setWalletBalance(0);
            setWalletError('Select a branch workspace to view wallet balance.');
            setWalletLoading(false);
            return;
        }

        try {
            const res = await fetch(`${API_BASE_URL}/subscription/wallet-balance`, { headers });
            const result = await res.json();

            if (result.success) {
                setWalletBalance(Number(result.data?.balance ?? 0));
                return;
            }

            const fallbackRes = await fetch(`${API_BASE_URL}/wallet/balance`, { headers });
            const fallback = await fallbackRes.json();
            if (fallback.success) {
                setWalletBalance(Number(fallback.data?.balance ?? 0));
                return;
            }

            setWalletBalance(0);
            setWalletError(result.message || fallback.message || 'Unable to load wallet balance');
        } catch (err) {
            console.error('Error fetching wallet balance:', err);
            setWalletBalance(0);
            setWalletError('Unable to load wallet balance');
        } finally {
            setWalletLoading(false);
        }
    };

    useEffect(() => {
        fetchWalletBalance();
    }, []);

    // Check if redirect has upgrade query param
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get('upgrade') === 'true') {
            toast.error("Your current plan does not support this feature. Please upgrade your subscription.", {
                duration: 6000,
                id: 'upgrade-warning'
            });
        }
    }, []);

    // Persist sidebar minimized state
    useEffect(() => {
        localStorage.setItem('sidebarMinimized', JSON.stringify(isMinimized));
    }, [isMinimized]);

    useBodyScrollLock(mobileMenuOpen || showPaymentModal || showSuccessModal);

    // Days remaining until the nearest active plan expires.
    const expiringPlan = useMemo(() => {
        const activePlans = (subscription?.active_plans || []).filter((plan) => plan.is_active);
        return activePlans.find((plan) => plan.days_remaining <= 7) || null;
    }, [subscription]);

    const daysRemaining = expiringPlan?.days_remaining ?? null;
    const isActive = subscription && subscription.is_subscribed === 'yes' && !subscription.is_expired;
    const isExpiringSoon = isActive && expiringPlan !== null;

    const planActiveMap = useMemo(() => {
        const map = {};
        (subscription?.active_plans || []).forEach((plan) => {
            map[plan.plan_name] = plan;
        });
        return map;
    }, [subscription]);

    const subscriptionPlans = useMemo(() => {
        const plans = [
            {
                id: 'Business',
                name: 'Business',
                price: billingCycle === 'monthly' ? 999 : 9990,
                duration: billingCycle === 'monthly' ? 'month' : 'year',
                features: [
                    { label: 'Unlimited Client Creation', included: true },
                    { label: 'Unlimited Task Management', included: true },
                    { label: 'Broadcast Access (Email/SMS)', included: true },
                    { label: 'Document Management System', included: true },
                    { label: 'Gateway Access & Ledger Groups', included: true },
                    { label: 'Staff Management', included: true },
                    { label: 'Salary Management', included: false },
                    { label: 'Live Chat (OOMS)', included: false },
                ],
            },
            {
                id: 'BusinessPlus',
                name: 'BusinessPlus',
                price: billingCycle === 'monthly' ? 1999 : 19990,
                duration: billingCycle === 'monthly' ? 'month' : 'year',
                features: [
                    { label: 'Unlimited Client Creation', included: true },
                    { label: 'Unlimited Task Management', included: true },
                    { label: 'Broadcast Access (Email/SMS)', included: true },
                    { label: 'Document Management System', included: true },
                    { label: 'Gateway Access & Ledger Groups', included: true },
                    { label: 'Staff Management Module', included: true },
                    { label: 'Salary Management Included', included: true },
                    { label: 'Live Chat (OOMS)', included: false },
                ],
            },
            {
                id: 'BusinessPro',
                name: 'BusinessPro',
                price: billingCycle === 'monthly' ? 2999 : 29990,
                duration: billingCycle === 'monthly' ? 'month' : 'year',
                features: [
                    { label: 'Unlimited Client Creation', included: true },
                    { label: 'Unlimited Task Management', included: true },
                    { label: 'Broadcast Access (Email/SMS)', included: true },
                    { label: 'Document Management System', included: true },
                    { label: 'Gateway Access & Ledger Groups', included: true },
                    { label: 'Staff Management Module', included: true },
                    { label: 'Salary Management Included', included: true },
                    { label: 'Live Chat (OOMS) Integrated', included: true },
                ],
            }
        ];
        return plans.map((plan) => ({ ...plan, ...PLAN_META[plan.id] }));
    }, [billingCycle]);

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getPlanExpiryFromResponse = (responseData, planName) => {
        const activatedExpiry = responseData?.activated_plan?.expires_at;
        if (activatedExpiry) return activatedExpiry;

        const activePlan = (responseData?.active_plans || []).find((plan) => plan.plan_name === planName);
        return activePlan?.expires_at || responseData?.subscription_expires_at || null;
    };

    const openSubscriptionSuccessModal = ({
        planName,
        paymentMethod,
        amountPaid,
        responseData,
        isExtension = false,
    }) => {
        const planMeta = subscriptionPlans.find((plan) => plan.id === planName) || PLAN_META[planName] || {};
        const planLabel = planMeta.name || planName;

        setSuccessDetails({
            modalKey: Date.now(),
            confetti: buildSuccessConfetti(),
            planName,
            planLabel,
            planColor: planMeta.color || 'indigo',
            planIcon: planMeta.icon || FiStar,
            expiresAt: getPlanExpiryFromResponse(responseData, planName),
            paymentMethod,
            amountPaid,
            billingCycle,
            branchName,
            branchId,
            isExtension,
        });
        setShowSuccessModal(true);
    };

    const closeSubscriptionSuccessModal = () => {
        setShowSuccessModal(false);
        setSuccessDetails(null);
    };

    const getPlanExpiryLabel = (planEntry) => {
        if (!planEntry?.expires_at) return null;
        if (planEntry.is_active) {
            return `Active until ${formatDate(planEntry.expires_at)}`;
        }
        return `Expired on ${formatDate(planEntry.expires_at)}`;
    };

    const handleBuyPlan = (planName) => {
        const plan = subscriptionPlans.find(p => p.id === planName);
        if (!plan) return;
        setSelectedPlan(plan);
        setShowPaymentModal(true);
        fetchWalletBalance({ refresh: true });
    };

    const selectedPlanCharge = useMemo(
        () => (selectedPlan ? getWalletChargeAmount(selectedPlan) : 0),
        [selectedPlan]
    );

    const canPayFromWallet = selectedPlan
        ? !walletLoading && walletBalance >= selectedPlanCharge
        : false;

    const processRazorpayPayment = async (planName) => {
        setShowPaymentModal(false);
        const headers = getHeaders();
        if (!headers) {
            toast.error("Please login to proceed with the subscription.");
            return;
        }

        setPaymentLoading(true);
        const toastId = toast.loading("Initializing payment gateway...");

        try {
            // 1. Load Razorpay SDK script
            const scriptLoaded = await loadScript("https://checkout.razorpay.com/v1/checkout.js");
            if (!scriptLoaded) {
                toast.error("Razorpay SDK failed to load. Please check your internet connection.", { id: toastId });
                setPaymentLoading(false);
                return;
            }

            // 2. Call backend to create checkout session
            const checkoutRes = await fetch(`${API_BASE_URL}/subscription/create-checkout`, {
                method: "POST",
                headers,
                body: JSON.stringify({ planName, billingCycle })
            });

            const checkoutData = await checkoutRes.json();
            if (!checkoutData.success) {
                toast.error(checkoutData.message || "Failed to initiate payment. Please try again.", { id: toastId });
                setPaymentLoading(false);
                return;
            }

            const { key, amount, currency, order_id, name, description } = checkoutData.data;

            toast.dismiss(toastId);

            // 3. Configure Razorpay modal options
            const options = {
                key,
                amount,
                currency,
                name,
                description,
                order_id,
                handler: async function (response) {
                    const verificationToastId = toast.loading("Verifying payment transaction...");
                    setPaymentLoading(true);
                    try {
                        // 4. Verify payment on backend
                        const verifyRes = await fetch(`${API_BASE_URL}/subscription/verify-payment`, {
                            method: "POST",
                            headers,
                            body: JSON.stringify({
                                razorpay_order_id: order_id,
                                razorpay_payment_id: response.razorpay_payment_id,
                                razorpay_signature: response.razorpay_signature,
                                planName,
                                billingCycle
                            })
                        });

                        const verifyData = await verifyRes.json();
                        if (verifyData.success) {
                            toast.dismiss(verificationToastId);
                            openSubscriptionSuccessModal({
                                planName,
                                paymentMethod: 'razorpay',
                                amountPaid: calculateGSTPrice(
                                    subscriptionPlans.find((plan) => plan.id === planName)?.price || 0
                                ),
                                responseData: verifyData.data,
                                isExtension: !!planActiveMap[planName]?.is_active,
                            });
                            await refetch();
                            await fetchWalletBalance();
                        } else {
                            toast.error("Payment signature verification failed: " + verifyData.message, { id: verificationToastId });
                        }
                    } catch (err) {
                        toast.error("Error verifying payment signature. Please contact support.", { id: verificationToastId });
                    } finally {
                        setPaymentLoading(false);
                    }
                },
                prefill: {
                    email: localStorage.getItem('user_email') || "user@example.com",
                    name: localStorage.getItem('user_name') || "User"
                },
                theme: {
                    color: "#4f46e5" // Indigo theme
                },
                modal: {
                    ondismiss: function () {
                        setPaymentLoading(false);
                        toast.error("Payment checkout cancelled.");
                    }
                }
            };

            const paymentObject = new window.Razorpay(options);
            paymentObject.open();

        } catch (error) {
            console.error("Payment initialization error:", error);
            toast.error("Failed to start payment. Please check configurations.", { id: toastId });
            setPaymentLoading(false);
        }
    };

    const handleWalletPay = async (planName) => {
        setShowPaymentModal(false);
        const headers = getHeaders();
        if (!headers) {
            toast.error("Please login to proceed with the subscription.");
            return;
        }

        setPaymentLoading(true);
        const toastId = toast.loading("Processing subscription payment from wallet...");

        try {
            const res = await fetch(`${API_BASE_URL}/subscription/pay-from-wallet`, {
                method: "POST",
                headers,
                body: JSON.stringify({ planName, billingCycle })
            });

            const data = await res.json();
            if (data.success) {
                toast.dismiss(toastId);
                if (typeof data.data?.remaining_wallet_balance === 'number') {
                    setWalletBalance(Number(data.data.remaining_wallet_balance));
                } else {
                    await fetchWalletBalance({ refresh: true });
                }
                await refetch();
                openSubscriptionSuccessModal({
                    planName,
                    paymentMethod: 'wallet',
                    amountPaid: data.data?.amount_paid ?? selectedPlanCharge,
                    responseData: data.data,
                    isExtension: !!planActiveMap[planName]?.is_active,
                });
            } else {
                toast.error(data.message || "Failed to process wallet payment.", { id: toastId });
            }
        } catch (err) {
            console.error("Wallet subscription payment error:", err);
            toast.error("Error processing wallet payment. Please try again.", { id: toastId });
        } finally {
            setPaymentLoading(false);
        }
    };

    const getColorClasses = (color) => {
        const colorMap = {
            blue: 'text-sky-600 bg-sky-50',
            indigo: 'text-indigo-600 bg-indigo-50',
            violet: 'text-violet-600 bg-violet-50',
            purple: 'text-violet-600 bg-violet-50',
        };
        return colorMap[color] || colorMap.indigo;
    };

    return (
        <div className="app-page">
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

            {/* Main content */}
            <div className={`pt-16 transition-all duration-300 ease-in-out ${isMinimized ? 'md:pl-20' : 'md:pl-[260px]'}`}>
                <div className="mx-auto max-w-6xl space-y-5 px-4 py-6 sm:px-6 lg:px-8">
                    {/* Page heading */}
                    <div className="flex flex-wrap items-end justify-between gap-3">
                        <div className="min-w-0">
                            <p className="ui-eyebrow">Billing</p>
                            <h1 className="mt-0.5 font-display text-2xl font-semibold tracking-tight text-slate-900">Subscription</h1>
                            <p className="mt-1 text-sm text-slate-500">
                                Plans apply to this branch only{branchId ? ` — ${branchName} (${branchId})` : ''}.
                            </p>
                        </div>
                        <Link
                            to="/wallet-recharge"
                            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm no-underline transition-colors hover:border-slate-300 hover:bg-slate-50"
                            title="Branch wallet — click to add money"
                        >
                            <FaWallet className="h-3.5 w-3.5 text-emerald-600" />
                            <span className="text-slate-500">Wallet</span>
                            <span className="font-mono font-semibold tabular-nums text-slate-900">
                                {walletLoading ? '…' : `₹${formatINR(walletBalance)}`}
                            </span>
                        </Link>
                    </div>

                    {/* Expiring-soon banner */}
                    {isExpiringSoon && (
                        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                            <FiAlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                            <p className="m-0 text-sm text-amber-900">
                                <span className="font-semibold">{expiringPlan.plan_name} expires soon.</span>{' '}
                                {daysRemaining <= 0
                                    ? 'It ends today.'
                                    : `${daysRemaining} day${daysRemaining === 1 ? '' : 's'} left.`}{' '}
                                Extend it below to avoid any interruption.
                            </p>
                        </div>
                    )}

                    {/* Current plan */}
                    {(() => {
                        const current = (subscription?.active_plans || [])
                            .filter((plan) => plan.is_active)
                            .sort((x, y) => new Date(y.expires_at) - new Date(x.expires_at))[0];
                        const meta = current ? PLAN_META[current.plan_name] || {} : {};
                        const CurrentIcon = meta.icon || FiCreditCard;
                        const days = current?.days_remaining ?? null;
                        const pct = days == null ? 0 : Math.max(4, Math.min(100, (days / 365) * 100));
                        return (
                            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                                <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-[1fr_auto] md:items-center">
                                    <div className="flex min-w-0 items-start gap-4">
                                        <span
                                            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${
                                                current ? 'bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100' : 'bg-slate-100 text-slate-400'
                                            }`}
                                        >
                                            <CurrentIcon className="h-5 w-5" />
                                        </span>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-xs font-medium text-slate-500">Current plan</p>
                                            {subLoading ? (
                                                <div className="mt-1 h-6 w-40 animate-pulse rounded bg-slate-100" />
                                            ) : current ? (
                                                <>
                                                    <div className="mt-0.5 flex flex-wrap items-center gap-2">
                                                        <h2 className="m-0 font-display text-lg font-semibold text-slate-900">{current.plan_name}</h2>
                                                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-100">
                                                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                                            Active
                                                        </span>
                                                    </div>
                                                    <p className="m-0 mt-1 text-sm text-slate-600">
                                                        Valid until <span className="font-medium text-slate-900">{formatDate(current.expires_at)}</span>
                                                        {days != null && (
                                                            <span className="text-slate-400"> · {days} day{days === 1 ? '' : 's'} left</span>
                                                        )}
                                                    </p>
                                                    {days != null && (
                                                        <div className="mt-3 h-1.5 w-full max-w-md overflow-hidden rounded-full bg-slate-100">
                                                            <div
                                                                className={`h-full rounded-full ${days <= 7 ? 'bg-amber-500' : 'bg-indigo-500'}`}
                                                                style={{ width: `${pct}%` }}
                                                            />
                                                        </div>
                                                    )}
                                                </>
                                            ) : (
                                                <>
                                                    <h2 className="m-0 mt-0.5 font-display text-lg font-semibold text-slate-900">No active plan</h2>
                                                    <p className="m-0 mt-1 text-sm text-slate-600">Choose a plan below to unlock clients, tasks, billing and more.</p>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    {current && (
                                        <button
                                            type="button"
                                            onClick={() => handleBuyPlan(current.plan_name)}
                                            disabled={paymentLoading || subLoading}
                                            className="ui-btn ui-btn-primary w-full md:w-auto"
                                        >
                                            <FiClock className="h-4 w-4" />
                                            Extend {current.plan_name}
                                        </button>
                                    )}
                                </div>
                            </section>
                        );
                    })()}

                    {/* Plans */}
                    <section className="rounded-2xl border border-slate-200 bg-white">
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
                            <div className="min-w-0">
                                <h2 className="m-0 text-base font-semibold text-slate-900">Plans</h2>
                                <p className="m-0 mt-0.5 text-xs text-slate-500">Upgrade, switch or renew at any time. Prices exclude 18% GST.</p>
                            </div>
                            <div className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-100 p-0.5" role="tablist" aria-label="Billing cycle">
                                {[
                                    { id: 'monthly', label: 'Monthly' },
                                    { id: 'yearly', label: 'Yearly', badge: 'Save 17%' },
                                ].map((opt) => (
                                    <button
                                        key={opt.id}
                                        type="button"
                                        role="tab"
                                        aria-selected={billingCycle === opt.id}
                                        onClick={() => setBillingCycle(opt.id)}
                                        className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
                                            billingCycle === opt.id ? 'bg-white text-indigo-700 shadow-sm ring-1 ring-slate-200' : 'text-slate-600 hover:text-slate-900'
                                        }`}
                                    >
                                        {opt.label}
                                        {opt.badge && (
                                            <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-emerald-700">
                                                {opt.badge}
                                            </span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-3">
                            {subscriptionPlans.map((plan) => {
                                const IconComponent = plan.icon;
                                const gstPrice = calculateGSTPrice(plan.price);
                                const planEntry = planActiveMap[plan.id];
                                const isPlanActive = !!planEntry?.is_active;
                                const expiryLabel = getPlanExpiryLabel(planEntry);
                                const perMonth = billingCycle === 'yearly' ? Math.round(plan.price / 12) : null;
                                const highlighted = isPlanActive || plan.popular;

                                return (
                                    <div
                                        key={plan.id}
                                        className={`relative flex flex-col rounded-xl border bg-white p-5 transition-colors ${
                                            isPlanActive
                                                ? 'border-indigo-500 ring-1 ring-indigo-500'
                                                : plan.popular
                                                  ? 'border-indigo-200'
                                                  : 'border-slate-200 hover:border-slate-300'
                                        }`}
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${getColorClasses(plan.color)}`}>
                                                <IconComponent className="h-[18px] w-[18px]" />
                                            </span>
                                            {isPlanActive ? (
                                                <span className="shrink-0 rounded-full bg-indigo-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                                                    Current
                                                </span>
                                            ) : plan.popular ? (
                                                <span className="shrink-0 rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-indigo-700 ring-1 ring-indigo-100">
                                                    Popular
                                                </span>
                                            ) : null}
                                        </div>
                                        <h3 className="m-0 mt-3 text-base font-semibold text-slate-900">{plan.name}</h3>
                                        <p className="m-0 mt-0.5 min-h-[2.5em] text-xs leading-snug text-slate-500">{plan.tagline}</p>

                                        <div className="mt-3 flex items-baseline gap-1">
                                            <span className="text-lg font-medium text-slate-500">₹</span>
                                            <span className="font-display text-3xl font-semibold tracking-tight text-slate-900">
                                                {plan.price.toLocaleString('en-IN')}
                                            </span>
                                            <span className="text-sm text-slate-500">/{plan.duration}</span>
                                        </div>
                                        <p className="m-0 mt-0.5 text-xs text-slate-500">
                                            ₹{formatINR(gstPrice)} incl. GST
                                            {perMonth ? ` · ≈ ₹${perMonth.toLocaleString('en-IN')}/month` : ''}
                                        </p>

                                        <button
                                            type="button"
                                            onClick={() => handleBuyPlan(plan.id)}
                                            disabled={paymentLoading || subLoading}
                                            className={`ui-btn mt-4 w-full ${highlighted ? 'ui-btn-primary' : 'ui-btn-secondary'}`}
                                            title={`18% GST included — total ₹${formatINR(gstPrice)}`}
                                        >
                                            {paymentLoading ? (
                                                'Processing…'
                                            ) : isPlanActive ? (
                                                <>
                                                    <FiClock className="h-4 w-4" />
                                                    Extend plan
                                                </>
                                            ) : (
                                                <>
                                                    Choose {plan.name}
                                                    <FiArrowRight className="h-4 w-4" />
                                                </>
                                            )}
                                        </button>
                                        <p
                                            className={`m-0 mt-2 flex min-h-[1.25rem] items-center justify-center gap-1.5 text-[11px] font-medium ${
                                                isPlanActive ? 'text-emerald-700' : 'text-slate-500'
                                            }`}
                                        >
                                            {expiryLabel && (
                                                <>
                                                    <FiCalendar className="h-3 w-3 shrink-0" />
                                                    {expiryLabel}
                                                </>
                                            )}
                                        </p>

                                        <ul className="m-0 mt-3 list-none space-y-2 border-t border-slate-100 p-0 pt-4">
                                            {plan.features.map((feature) => (
                                                <li
                                                    key={feature.label}
                                                    className={`flex items-start gap-2 text-[13px] leading-snug ${
                                                        feature.included ? 'text-slate-700' : 'text-slate-400 line-through decoration-slate-300'
                                                    }`}
                                                >
                                                    {feature.included ? (
                                                        <FiCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" strokeWidth={3} />
                                                    ) : (
                                                        <FiX className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-300" />
                                                    )}
                                                    <span>{feature.label}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                );
                            })}
                        </div>
                    </section>

                    <p className="m-0 flex items-center justify-center gap-1.5 text-center text-xs text-slate-400">
                        <FiClock className="h-3 w-3" />
                        Plans activate immediately after payment. Pay from the branch wallet or by card, UPI or net banking.
                    </p>
                </div>
            </div>

            {createPortal(
                <AnimatePresence>
                    {showPaymentModal && selectedPlan && (
                        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-hidden overscroll-none p-3 sm:p-4 pointer-events-none">
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.15 }}
                                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm pointer-events-auto"
                                onClick={() => setShowPaymentModal(false)}
                                aria-hidden
                            />

                            <motion.div
                                role="dialog"
                                aria-modal="true"
                                aria-labelledby="subscription-payment-modal-title"
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 8 }}
                                transition={{ duration: 0.15 }}
                                className="relative z-[1] pointer-events-auto w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col my-2 sm:my-4 max-h-[calc(100vh-1.5rem)] sm:max-h-[calc(100vh-2rem)]"
                                onClick={(e) => e.stopPropagation()}
                            >
                                {/* Modal Header */}
                                <div className="border-b border-slate-100 px-5 py-3.5 bg-slate-50 flex justify-between items-center flex-shrink-0">
                                    <div>
                                        <h3 id="subscription-payment-modal-title" className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                            <FiCreditCard className="w-4 h-4 text-indigo-600" />
                                            Complete your subscription
                                        </h3>
                                        <p className="text-slate-500 text-xs mt-0.5">
                                            {selectedPlan.name} · Billed {billingCycle}
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setShowPaymentModal(false)}
                                        className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                                        aria-label="Close"
                                    >
                                        <FiX className="w-4 h-4" />
                                    </button>
                                </div>

                                {/* Modal Body */}
                                <div className="p-5 space-y-4 overflow-y-auto overscroll-y-contain flex-1 min-h-0 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                                {/* Selected Plan Details */}
                                <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 flex justify-between items-center">
                                    <div>
                                        <span className="text-[10px] text-indigo-600 font-bold uppercase tracking-wider">Plan Price</span>
                                        <h4 className="text-lg font-black text-slate-900">₹{selectedPlan.price.toLocaleString('en-IN')}</h4>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-[10px] text-slate-500 font-semibold">Total incl. GST</span>
                                        <h4 className="text-lg font-black text-indigo-600">₹{formatINR(calculateGSTPrice(selectedPlan.price))}</h4>
                                    </div>
                                </div>

                                {/* Option 1: Pay from Wallet */}
                                <div className="border border-slate-200 rounded-2xl p-4 hover:border-indigo-300 transition-colors flex flex-col justify-between">
                                    <div className="flex items-start gap-3">
                                        <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100 mt-0.5">
                                            <FaWallet className="w-4 h-4" />
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="font-bold text-slate-800 text-xs flex items-center justify-between gap-2">
                                                Pay from Wallet Balance
                                                {walletLoading ? (
                                                    <span className="text-[10px] text-slate-400 font-normal">Loading...</span>
                                                ) : walletError ? (
                                                    <span className="text-[10px] text-rose-500 font-medium text-right">Unavailable</span>
                                                ) : (
                                                    <span className="text-xs font-bold text-emerald-600 whitespace-nowrap">
                                                        Bal: ₹{formatINR(walletBalance)}
                                                    </span>
                                                )}
                                            </h4>
                                            <p className="text-[11px] text-slate-500 mt-1">
                                                {walletError
                                                    ? walletError
                                                    : `Instant activation. Wallet is charged ₹${formatINR(selectedPlanCharge)} (total incl. 18% GST).`}
                                            </p>
                                            {!walletLoading && !walletError && walletBalance < selectedPlanCharge && (
                                                <p className="text-[11px] text-amber-600 mt-1">
                                                    Need ₹{formatINR(selectedPlanCharge - walletBalance)} more.{' '}
                                                    <Link to="/wallet-recharge" className="font-semibold underline" onClick={() => setShowPaymentModal(false)}>
                                                        Add money
                                                    </Link>
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => handleWalletPay(selectedPlan.id)}
                                        disabled={walletLoading || !!walletError || !canPayFromWallet || paymentLoading}
                                        className={`w-full py-2.5 rounded-xl font-bold mt-4 text-xs flex items-center justify-center gap-2 transition-all
                                            ${canPayFromWallet
                                                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
                                                : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'}`}
                                    >
                                        <FiCheck className="w-3.5 h-3.5" />
                                        {canPayFromWallet
                                            ? `Pay ₹${formatINR(selectedPlanCharge)} via Wallet`
                                            : walletLoading
                                                ? 'Checking wallet balance...'
                                                : `Needs ₹${formatINR(Math.max(0, selectedPlanCharge - walletBalance))} more`}
                                    </button>
                                </div>

                                {/* Option 2: Pay via Payment Gateway */}
                                <div className="border border-slate-200 rounded-2xl p-4 hover:border-indigo-300 transition-colors flex flex-col justify-between">
                                    <div className="flex items-start gap-3">
                                        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100 mt-0.5">
                                            <FiCreditCard className="w-4 h-4" />
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="font-bold text-slate-800 text-xs">
                                                Card, UPI or NetBanking
                                            </h4>
                                            <p className="text-[11px] text-slate-500 mt-1">
                                                Secure checkout powered by Razorpay. You will be charged ₹{formatINR(selectedPlanCharge)} (total incl. 18% GST).
                                            </p>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => processRazorpayPayment(selectedPlan.id)}
                                        disabled={paymentLoading}
                                        className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold mt-4 text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
                                    >
                                        <FiZap className="w-3.5 h-3.5" />
                                        Pay ₹{formatINR(selectedPlanCharge)} via Cards / UPI / NetBanking
                                    </button>
                                </div>

                                <p className="text-[10px] text-slate-400 text-center flex items-center justify-center gap-1.5 pt-1">
                                    <FiClock className="w-3 h-3" />
                                    Your plan activates immediately after successful payment.
                                </p>
                            </div>

                                {/* Modal Footer */}
                                <div className="bg-slate-50 px-5 py-3 border-t border-slate-100 flex justify-end flex-shrink-0">
                                    <button
                                        type="button"
                                        onClick={() => setShowPaymentModal(false)}
                                        className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-100 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>,
                document.body
            )}

            {createPortal(
                <AnimatePresence mode="wait">
                    {showSuccessModal && successDetails && (
                        <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-hidden overscroll-none p-3 sm:p-4 pointer-events-none">
                            <style>{`
                                @keyframes subSuccessRing {
                                    0% { transform: scale(0.88); opacity: 0.4; }
                                    100% { transform: scale(1.5); opacity: 0; }
                                }
                                @keyframes subSuccessPop {
                                    0% { transform: scale(0.6); opacity: 0; }
                                    100% { transform: scale(1); opacity: 1; }
                                }
                                @keyframes subSuccessFadeUp {
                                    0% { opacity: 0; transform: translateY(8px); }
                                    100% { opacity: 1; transform: translateY(0); }
                                    }
                                @keyframes subConfettiBurst {
                                    0% { opacity: 0; transform: translate(0, 0) scale(0.4); }
                                    20% { opacity: 1; }
                                    100% { opacity: 0; transform: translate(var(--drift), -56px) scale(0.6); }
                                }
                                .sub-success-ring { animation: subSuccessRing 0.9s ease-out forwards; }
                                .sub-success-ring-delay { animation: subSuccessRing 0.9s ease-out 0.35s forwards; }
                                .sub-success-pop { animation: subSuccessPop 0.45s cubic-bezier(0.34, 1.4, 0.64, 1) forwards; }
                                .sub-success-fade-up { animation: subSuccessFadeUp 0.35s ease-out forwards; }
                                .sub-success-fade-up-delay { animation: subSuccessFadeUp 0.35s ease-out 0.12s forwards; opacity: 0; }
                                .sub-success-fade-up-delay-2 { animation: subSuccessFadeUp 0.35s ease-out 0.2s forwards; opacity: 0; }
                                .sub-success-card { animation: subSuccessFadeUp 0.35s ease-out forwards; opacity: 0; }
                                .sub-confetti-piece { animation: subConfettiBurst 1s ease-out forwards; opacity: 0; }
                            `}</style>

                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm pointer-events-auto"
                                onClick={closeSubscriptionSuccessModal}
                                aria-hidden
                            />

                            <motion.div
                                key={successDetails.modalKey}
                                role="dialog"
                                aria-modal="true"
                                aria-labelledby="subscription-success-modal-title"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="relative z-[1] pointer-events-auto flex w-full max-w-sm flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xl my-2 sm:my-4 max-h-[calc(100vh-1.5rem)] sm:max-h-[calc(100vh-2rem)]"
                                onClick={(e) => e.stopPropagation()}
                            >
                                {/* Slim header */}
                                <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-4 py-2.5">
                                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                                        Payment confirmed
                                    </p>
                                    <button
                                        type="button"
                                        onClick={closeSubscriptionSuccessModal}
                                        className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                                        aria-label="Close"
                                    >
                                        <FiX className="h-4 w-4" />
                                    </button>
                                </div>

                                {/* Scrollable body */}
                                <div className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                                    <div className="relative px-5 pt-4 pb-3 text-center">
                                        {(successDetails.confetti || []).map((piece) => (
                                            <span
                                                key={piece.id}
                                                className="sub-confetti-piece pointer-events-none absolute top-6 rounded-full"
                                                style={{
                                                    left: piece.left,
                                                    width: piece.size,
                                                    height: piece.size,
                                                    backgroundColor: piece.color,
                                                    animationDelay: piece.delay,
                                                    '--drift': `${piece.drift}px`,
                                                }}
                                            />
                                        ))}

                                        <div className="relative mx-auto mb-3 flex h-[52px] w-[52px] items-center justify-center">
                                            <span className="sub-success-ring absolute inset-0 rounded-full bg-emerald-400/25" />
                                            <span className="sub-success-ring-delay absolute inset-0 rounded-full bg-emerald-400/20" />
                                            <div className="sub-success-pop relative flex h-[52px] w-[52px] items-center justify-center rounded-full bg-emerald-400 text-white shadow-lg shadow-emerald-500/30">
                                                <FiCheck className="h-6 w-6" strokeWidth={3} />
                                            </div>
                                        </div>

                                        <h3
                                            id="subscription-success-modal-title"
                                            className="sub-success-fade-up text-base font-bold text-slate-900"
                                        >
                                            {successDetails.isExtension ? 'Plan extended successfully' : 'Subscription activated'}
                                        </h3>
                                        <p className="sub-success-fade-up-delay mt-1 text-xs text-slate-500">
                                            {successDetails.planLabel} · {successDetails.billingCycle} plan
                                        </p>
                                    </div>

                                    <div className="space-y-2 px-4 pb-4">
                                        <div
                                            className={`sub-success-card flex items-center gap-3 rounded-xl border px-3 py-2.5 ${getColorClasses(successDetails.planColor)}`}
                                            style={{ animationDelay: '0.22s' }}
                                        >
                                            {(() => {
                                                const PlanIcon = successDetails.planIcon || FiStar;
                                                return (
                                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-current/15 bg-white/80">
                                                        <PlanIcon className="h-4 w-4" />
                                                    </div>
                                                );
                                            })()}
                                            <div className="min-w-0 flex-1 text-left">
                                                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Plan</p>
                                                <p className="truncate text-sm font-bold text-slate-900">{successDetails.planLabel}</p>
                                            </div>
                                            <span className="shrink-0 rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-700">
                                                Active
                                            </span>
                                        </div>

                                        <div
                                            className="sub-success-card grid grid-cols-2 gap-2"
                                            style={{ animationDelay: '0.3s' }}
                                        >
                                            <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2.5 text-left">
                                                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Valid until</p>
                                                <p className="mt-1 flex items-start gap-1 text-[11px] font-semibold leading-snug text-slate-800">
                                                    <FiCalendar className="mt-0.5 h-3 w-3 shrink-0 text-indigo-500" />
                                                    <span>{successDetails.expiresAt ? formatDate(successDetails.expiresAt) : 'Now'}</span>
                                                </p>
                                            </div>
                                            <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2.5 text-left">
                                                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Paid</p>
                                                <p className="mt-1 text-sm font-bold text-slate-900">₹{formatINR(successDetails.amountPaid || 0)}</p>
                                                <p className="text-[10px] text-slate-400">incl. GST</p>
                                            </div>
                                        </div>

                                        <div
                                            className="sub-success-card flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5"
                                            style={{ animationDelay: '0.38s' }}
                                        >
                                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                                                {successDetails.paymentMethod === 'wallet' ? (
                                                    <FaWallet className="h-3.5 w-3.5" />
                                                ) : (
                                                    <FiCreditCard className="h-3.5 w-3.5" />
                                                )}
                                            </div>
                                            <div className="min-w-0 flex-1 text-left">
                                                <p className="text-[11px] font-semibold text-slate-800">
                                                    {successDetails.paymentMethod === 'wallet' ? 'Branch wallet' : 'Razorpay'}
                                                </p>
                                                <p className="flex items-center gap-1 text-[10px] text-slate-500">
                                                    <FiHome className="h-3 w-3 shrink-0" />
                                                    <span className="truncate">
                                                        {successDetails.branchName}
                                                        {successDetails.branchId ? ` · ${successDetails.branchId}` : ''}
                                                    </span>
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Footer */}
                                <div className="shrink-0 border-t border-slate-100 bg-slate-50/80 px-4 py-3">
                                    <button
                                        type="button"
                                        onClick={closeSubscriptionSuccessModal}
                                        className="sub-success-fade-up-delay-2 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-500/20 transition-shadow hover:shadow-lg hover:shadow-indigo-500/25"
                                    >
                                        Continue
                                        <FiArrowRight className="h-4 w-4" />
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>,
                document.body
            )}
        </div>
    );
};

export default Subscription;