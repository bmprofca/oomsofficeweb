import React, { useState, useEffect, useMemo } from 'react';
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
    FiShield,
    FiX,
    FiArrowRight,
    FiTrendingUp
} from 'react-icons/fi';
import { FaWallet } from 'react-icons/fa';
import { useSubscription } from '../../hooks/useSubscription';
import getHeaders from '../../utils/get-headers';
import API_BASE_URL from '../../utils/api-controller';
import { toast } from 'react-hot-toast';

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

const PLAN_META = {
    Business: { icon: FiStar, color: 'blue', tagline: 'For solo operators getting started' },
    BusinessPlus: { icon: FiZap, color: 'indigo', tagline: 'For growing teams that need staff tools', popular: true },
    BusinessPro: { icon: FiAward, color: 'purple', tagline: 'For established businesses that need it all' },
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

    const { subscription, loading: subLoading, refetch } = useSubscription();

    const fetchWalletBalance = async () => {
        const headers = getHeaders();
        if (!headers) return;
        try {
            const res = await fetch(`${API_BASE_URL}/wallet/balance`, { headers });
            const result = await res.json();
            if (result.success) {
                setWalletBalance(Number(result.data.balance) || 0);
            }
        } catch (err) {
            console.error("Error fetching wallet balance:", err);
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

    // Lock body scroll when mobile sidebar is open, or the payment modal is open
    useEffect(() => {
        if (mobileMenuOpen || showPaymentModal) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'auto';
        }
        return () => {
            document.body.style.overflow = 'auto';
        };
    }, [mobileMenuOpen, showPaymentModal]);

    // Days remaining until the active plan expires - drives the renewal banner
    // and the "expiring soon" badge in the summary table.
    const daysRemaining = useMemo(() => {
        if (!subscription?.subscription_expires_at) return null;
        const expiry = new Date(subscription.subscription_expires_at);
        const diffMs = expiry.getTime() - Date.now();
        return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    }, [subscription]);

    const isActive = subscription && subscription.is_subscribed === 'yes' && !subscription.is_expired;
    const isExpiringSoon = isActive && daysRemaining !== null && daysRemaining <= 7;

    const activePlans = useMemo(() => {
        if (subscription && subscription.is_subscribed === 'yes') {
            return [
                {
                    plan_name: subscription.subscription_plan,
                    total_client: 'unlimited',
                    total_staff: (subscription.subscription_plan === 'BusinessPlus' || subscription.subscription_plan === 'BusinessPro') ? 'unlimited' : 'disabled',
                    total_task: 'unlimited',
                    total_bank: 'unlimited',
                    expire_date: subscription.subscription_expires_at,
                    status: subscription.is_expired ? 'expired' : 'active'
                }
            ];
        }
        return [];
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
                    { label: 'Staff Management', included: false },
                    { label: 'Salary Management', included: false },
                    { label: 'Attendance Management', included: false },
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
                    { label: 'Attendance Management Included', included: true },
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
                    { label: 'Attendance Management Included', included: true },
                    { label: 'Live Chat (OOMS) Integrated', included: true },
                ],
            }
        ];
        return plans.map((plan) => ({ ...plan, ...PLAN_META[plan.id] }));
    }, [billingCycle]);

    const calculateGSTPrice = (price) => {
        return price * 1.18; // 18% GST, returned as a number
    };

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

    const getStatusBadge = (status) => {
        return status === 'active' ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Active
            </span>
        ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                Expired
            </span>
        );
    };

    const handleBuyPlan = (planName) => {
        const plan = subscriptionPlans.find(p => p.id === planName);
        if (!plan) return;
        setSelectedPlan(plan);
        setShowPaymentModal(true);
    };

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
                            toast.success("Subscription activated successfully!", { id: verificationToastId });
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
                toast.success("Subscription activated successfully using wallet balance!", { id: toastId });
                await fetchWalletBalance();
                await refetch();
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
            blue: 'border-blue-200 text-blue-600 bg-blue-50',
            indigo: 'border-indigo-200 text-indigo-600 bg-indigo-50',
            purple: 'border-purple-200 text-purple-600 bg-purple-50',
        };
        return colorMap[color] || colorMap.indigo;
    };

    const getButtonClasses = (color) => {
        const map = {
            blue: 'bg-blue-600 hover:bg-blue-700',
            indigo: 'bg-indigo-600 hover:bg-indigo-700',
            purple: 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700',
        };
        return map[color] || map.indigo;
    };

    return (
        <div className="min-h-screen bg-slate-50">
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
                <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-8">
                    <div className="flex flex-col gap-6">

                        {/* Page heading */}
                        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
                            <div>
                                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Billing &amp; Subscription</h1>
                                <p className="text-sm text-slate-500 mt-1">
                                    Manage your plan, review usage limits, and upgrade whenever your business grows.
                                </p>
                            </div>
                        </div>

                        {/* Expiring-soon banner */}
                        {isExpiringSoon && (
                            <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                                <FiAlertTriangle className="w-4.5 h-4.5 text-amber-600 mt-0.5 flex-shrink-0" />
                                <p className="text-sm text-amber-800">
                                    <span className="font-semibold">Your plan renews soon.</span>{' '}
                                    {daysRemaining <= 0
                                        ? 'Your subscription expires today.'
                                        : `Only ${daysRemaining} day${daysRemaining === 1 ? '' : 's'} left before it expires.`}{' '}
                                    Renew below to avoid any interruption to your account.
                                </p>
                            </div>
                        )}

                        {/* Active Subscription Summary — always visible for a subscribed account,
                            independent of which plan cards are shown below. */}
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="border-b border-slate-100 px-6 py-4 flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                    <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                                        <FiShield className="w-4.5 h-4.5" />
                                    </div>
                                    <div>
                                        <h2 className="text-base font-bold text-slate-900">Your Subscription</h2>
                                        <p className="text-xs text-slate-500">Current plan and account entitlements</p>
                                    </div>
                                </div>
                                {isActive && (
                                    <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-full border border-indigo-100">
                                        <FiTrendingUp className="w-3.5 h-3.5" />
                                        {subscription.subscription_plan}
                                    </span>
                                )}
                            </div>

                            <div className="p-6">
                                {subLoading ? (
                                    <div className="flex justify-center items-center py-10">
                                        <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-200 border-t-indigo-600"></div>
                                    </div>
                                ) : activePlans.length > 0 ? (
                                    <div className="overflow-x-auto -mx-2">
                                        <table className="w-full text-sm min-w-[640px]">
                                            <thead>
                                                <tr className="text-left text-[11px] uppercase tracking-wider text-slate-500 font-semibold border-b border-slate-200">
                                                    <th className="px-2 pb-3">Plan</th>
                                                    <th className="px-2 pb-3">Clients</th>
                                                    <th className="px-2 pb-3">Staff</th>
                                                    <th className="px-2 pb-3">Tasks</th>
                                                    <th className="px-2 pb-3">Bank Accounts</th>
                                                    <th className="px-2 pb-3">Renews / Expires</th>
                                                    <th className="px-2 pb-3">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {activePlans.map((plan, index) => (
                                                    <tr key={index} className="hover:bg-slate-50/60 transition-colors">
                                                        <td className="px-2 py-4">
                                                            <span className="inline-flex items-center gap-2 font-bold text-slate-800">
                                                                <span className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                                                                    <FiZap className="w-3.5 h-3.5" />
                                                                </span>
                                                                {plan.plan_name}
                                                            </span>
                                                        </td>
                                                        <td className="px-2 py-4 capitalize font-semibold text-slate-700">{plan.total_client}</td>
                                                        <td className="px-2 py-4">
                                                            {plan.total_staff === 'disabled' ? (
                                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-500 border border-slate-200">
                                                                    Not included
                                                                </span>
                                                            ) : (
                                                                <span className="capitalize font-semibold text-slate-700">{plan.total_staff}</span>
                                                            )}
                                                        </td>
                                                        <td className="px-2 py-4 capitalize font-semibold text-slate-700">{plan.total_task}</td>
                                                        <td className="px-2 py-4 capitalize font-semibold text-slate-700">{plan.total_bank}</td>
                                                        <td className="px-2 py-4">
                                                            <span className="inline-flex items-center gap-1.5 text-slate-700 font-semibold">
                                                                <FiCalendar className="w-3.5 h-3.5 text-slate-400" />
                                                                {formatDate(plan.expire_date)}
                                                            </span>
                                                        </td>
                                                        <td className="px-2 py-4">{getStatusBadge(plan.status)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center text-center py-10 gap-2">
                                        <div className="w-11 h-11 rounded-full bg-slate-100 flex items-center justify-center mb-1">
                                            <FiCreditCard className="w-5 h-5 text-slate-400" />
                                        </div>
                                        <p className="text-sm font-semibold text-slate-700">No active subscription yet</p>
                                        <p className="text-xs text-slate-500 max-w-sm">
                                            Choose a plan below to unlock client management, task tracking, and more for your business.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Subscription Plans Section */}
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="border-b border-slate-100 px-6 py-5 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                                <div>
                                    <h2 className="text-base font-bold text-slate-900">Available Plans</h2>
                                    <p className="text-xs text-slate-500 mt-1">
                                        Pick the plan that fits your team. Upgrade, downgrade, or renew at any time.
                                    </p>
                                </div>

                                {/* Monthly / Yearly toggle */}
                                <div className="flex items-center self-start sm:self-auto bg-slate-100 p-1 rounded-xl border border-slate-200">
                                    <button
                                        onClick={() => setBillingCycle('monthly')}
                                        className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${billingCycle === 'monthly' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-indigo-600'}`}
                                    >
                                        Monthly
                                    </button>
                                    <button
                                        onClick={() => setBillingCycle('yearly')}
                                        className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${billingCycle === 'yearly' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-indigo-600'}`}
                                    >
                                        Yearly
                                        <span className="bg-emerald-100 text-emerald-700 text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                                            Save 17%
                                        </span>
                                    </button>
                                </div>
                            </div>

                            <div className="p-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {subscriptionPlans.map((plan) => {
                                        const IconComponent = plan.icon;
                                        const gstPrice = calculateGSTPrice(plan.price);
                                        const isCurrent = subscription && subscription.is_subscribed === 'yes' && subscription.subscription_plan === plan.id && !subscription.is_expired;

                                        return (
                                            <motion.div
                                                key={plan.id}
                                                className={`relative border rounded-2xl transition-all overflow-hidden flex flex-col justify-between
                                                    ${isCurrent
                                                        ? 'border-indigo-400 ring-1 ring-indigo-400 bg-indigo-50/30'
                                                        : plan.popular
                                                            ? 'border-indigo-200 shadow-md'
                                                            : 'border-slate-200 hover:border-slate-300 hover:shadow-md'}`}
                                                whileHover={{ y: -2 }}
                                            >
                                                {plan.popular && !isCurrent && (
                                                    <div className="absolute top-0 inset-x-0 bg-indigo-600 text-white text-[10px] font-bold uppercase tracking-wider text-center py-1.5">
                                                        Most Popular
                                                    </div>
                                                )}

                                                <div className={`p-6 ${plan.popular && !isCurrent ? 'pt-10' : ''}`}>
                                                    {/* Plan Header */}
                                                    <div className="flex justify-between items-start mb-4">
                                                        <div className={`p-3 rounded-xl border ${getColorClasses(plan.color)}`}>
                                                            <IconComponent className="w-5 h-5" />
                                                        </div>
                                                        {isCurrent && (
                                                            <span className="inline-flex items-center gap-1 bg-indigo-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
                                                                <FiCheck className="w-3 h-3" />
                                                                Current Plan
                                                            </span>
                                                        )}
                                                    </div>

                                                    <h3 className="text-lg font-bold text-slate-900">
                                                        {plan.name}
                                                    </h3>
                                                    <p className="text-xs text-slate-500 mt-1">{plan.tagline}</p>

                                                    {/* Pricing */}
                                                    <div className="my-5 flex items-baseline">
                                                        <span className="text-slate-500 text-lg font-medium">₹</span>
                                                        <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
                                                            {plan.price.toLocaleString('en-IN')}
                                                        </span>
                                                        <span className="text-slate-500 text-sm ml-1 font-medium">
                                                            /{plan.duration}
                                                        </span>
                                                    </div>

                                                    {/* Features */}
                                                    <ul className="space-y-3 pt-5 border-t border-slate-100">
                                                        {plan.features.map((feature, index) => (
                                                            <li
                                                                key={index}
                                                                className={`flex items-start gap-2.5 text-xs ${feature.included ? 'text-slate-700 font-medium' : 'text-slate-400'}`}
                                                            >
                                                                {feature.included ? (
                                                                    <FiCheck className="w-4 h-4 mt-0.5 flex-shrink-0 text-emerald-500" />
                                                                ) : (
                                                                    <FiX className="w-4 h-4 mt-0.5 flex-shrink-0 text-slate-300" />
                                                                )}
                                                                <span>{feature.label}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>

                                                <div className="p-6 pt-0">
                                                    <motion.button
                                                        onClick={() => handleBuyPlan(plan.id)}
                                                        disabled={paymentLoading || subLoading || isCurrent}
                                                        className={`w-full py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 text-sm
                                                            ${isCurrent
                                                                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                                                : `text-white shadow-sm hover:shadow-md ${getButtonClasses(plan.color)}`}`}
                                                        title={`18% GST included \u2014 Total: \u20B9${formatINR(gstPrice)}`}
                                                        whileTap={isCurrent ? {} : { scale: 0.98 }}
                                                    >
                                                        {isCurrent ? (
                                                            <>
                                                                <FiCheck className="w-4 h-4" />
                                                                Active Plan
                                                            </>
                                                        ) : (
                                                            <>
                                                                {paymentLoading ? 'Processing...' : `Choose ${plan.name}`}
                                                                {!paymentLoading && <FiArrowRight className="w-4 h-4" />}
                                                            </>
                                                        )}
                                                    </motion.button>

                                                    <div className="text-[11px] text-slate-400 text-center mt-2.5">
                                                        ₹{formatINR(gstPrice)} incl. 18% GST
                                                    </div>
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Payment Method Selection Modal */}
            <AnimatePresence>
                {showPaymentModal && selectedPlan && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-x-hidden overflow-y-auto">
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
                            onClick={() => setShowPaymentModal(false)}
                        />

                        {/* Modal Content */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.96, y: 8 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.96, y: 8 }}
                            transition={{ duration: 0.15 }}
                            className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-10 flex flex-col my-auto max-h-[90vh]"
                        >
                            {/* Modal Header */}
                            <div className="border-b border-slate-100 px-6 py-4 bg-slate-50 flex justify-between items-center flex-shrink-0">
                                <div>
                                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                        <FiCreditCard className="w-4 h-4 text-indigo-600" />
                                        Complete your subscription
                                    </h3>
                                    <p className="text-slate-500 text-xs mt-0.5">
                                        {selectedPlan.name} · Billed {billingCycle}
                                    </p>
                                </div>
                                <button
                                    onClick={() => setShowPaymentModal(false)}
                                    className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                                    aria-label="Close"
                                >
                                    <FiX className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Modal Body */}
                            <div className="p-6 space-y-4 overflow-y-auto flex-1">
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
                                            <h4 className="font-bold text-slate-800 text-xs flex items-center justify-between">
                                                Pay from Wallet Balance
                                                {walletLoading ? (
                                                    <span className="text-[10px] text-slate-400 font-normal">Loading...</span>
                                                ) : (
                                                    <span className="text-xs font-bold text-emerald-600">
                                                        Bal: ₹{formatINR(walletBalance)}
                                                    </span>
                                                )}
                                            </h4>
                                            <p className="text-[11px] text-slate-500 mt-1">
                                                Instant activation, debited from your wallet balance.
                                            </p>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => handleWalletPay(selectedPlan.id)}
                                        disabled={walletLoading || walletBalance < Number(calculateGSTPrice(selectedPlan.price)) || paymentLoading}
                                        className={`w-full py-2.5 rounded-xl font-bold mt-4 text-xs flex items-center justify-center gap-2 transition-all
                                            ${walletBalance >= Number(calculateGSTPrice(selectedPlan.price))
                                                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
                                                : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'}`}
                                    >
                                        <FiCheck className="w-3.5 h-3.5" />
                                        {walletBalance >= Number(calculateGSTPrice(selectedPlan.price))
                                            ? `Pay ₹${formatINR(calculateGSTPrice(selectedPlan.price))} via Wallet`
                                            : `Needs ₹${formatINR(Number(calculateGSTPrice(selectedPlan.price)) - walletBalance)} more`}
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
                                                Secure checkout powered by Razorpay.
                                            </p>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => processRazorpayPayment(selectedPlan.id)}
                                        disabled={paymentLoading}
                                        className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold mt-4 text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
                                    >
                                        <FiZap className="w-3.5 h-3.5" />
                                        Pay via Cards / UPI / NetBanking
                                    </button>
                                </div>

                                <p className="text-[10px] text-slate-400 text-center flex items-center justify-center gap-1.5 pt-1">
                                    <FiClock className="w-3 h-3" />
                                    Your plan activates immediately after successful payment.
                                </p>
                            </div>

                            {/* Modal Footer */}
                            <div className="bg-slate-50 px-6 py-3 border-t border-slate-100 flex justify-end flex-shrink-0">
                                <button
                                    onClick={() => setShowPaymentModal(false)}
                                    className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-100 transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Subscription;