import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
    FiLock,
    FiArrowLeft,
    FiCreditCard,
    FiCheck,
    FiShield,
    FiZap,
    FiMessageCircle,
    FiUsers,
    FiHome,
} from 'react-icons/fi';
import { useSubscription } from '../hooks/useSubscription';
import GateScreenLayout, {
    GateLeftPanel,
    GateContentHeader,
    GateSectionLabel,
} from './GateScreenLayout';

export const PLAN_CONFIG = {
    core: {
        headline: 'Unlock the full CRM workspace',
        subheadline: 'Subscribe to Business to manage clients, tasks, billing, and more.',
        requiredPlan: 'Business',
        planLabel: 'Business Plan',
        icon: FiShield,
        gradient: 'from-indigo-600 via-indigo-500 to-violet-500',
        softBg: 'bg-indigo-50',
        softBorder: 'border-indigo-200',
        softText: 'text-indigo-700',
        chipBg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
        button: 'bg-indigo-600 hover:bg-indigo-700 shadow-sm shadow-indigo-200/60',
        features: [
            'Task management',
            'Client database',
            'Billing & invoicing',
            'Finance ledger',
            'Broadcast messages',
        ],
    },
    'staff-management': {
        headline: 'Team tools need BusinessPlus',
        subheadline: 'Upgrade to manage staff profiles, attendance, and office assistance.',
        requiredPlan: 'BusinessPlus',
        planLabel: 'BusinessPlus Plan',
        icon: FiUsers,
        gradient: 'from-violet-600 via-purple-600 to-fuchsia-500',
        softBg: 'bg-violet-50',
        softBorder: 'border-violet-200',
        softText: 'text-violet-700',
        chipBg: 'bg-violet-50 text-violet-700 border-violet-200',
        button: 'bg-violet-600 hover:bg-violet-700 shadow-sm shadow-violet-200/60',
        features: [
            'Staff profiles',
            'Attendance logs',
            'Office assistance',
            'Team performance reports',
        ],
    },
    'live-chat': {
        headline: 'Live chat is a BusinessPro feature',
        subheadline: 'Upgrade to enable real-time customer messaging and chat widgets.',
        requiredPlan: 'BusinessPro',
        planLabel: 'BusinessPro Plan',
        icon: FiMessageCircle,
        gradient: 'from-purple-600 via-indigo-600 to-blue-600',
        softBg: 'bg-purple-50',
        softBorder: 'border-purple-200',
        softText: 'text-purple-700',
        chipBg: 'bg-purple-50 text-purple-700 border-purple-200',
        button: 'bg-purple-600 hover:bg-purple-700 shadow-sm shadow-purple-200/60',
        features: [
            'WhatsApp live chat',
            'Chat widgets',
            'Customer communication portal',
            'Dedicated support channel',
        ],
    },
};

export const getCurrentPlanLabel = (subscription) => {
    if (!subscription || subscription.is_subscribed !== 'yes' || subscription.is_expired) {
        return subscription?.is_expired ? 'Expired plan' : 'No active plan';
    }

    const activeNames = (subscription.active_plans || [])
        .filter((plan) => plan.is_active)
        .map((plan) => plan.plan_name);

    if (activeNames.length > 1) {
        return activeNames.join(' + ');
    }

    return activeNames[0] || subscription.subscription_plan || 'Active plan';
};

export const SubscriptionBlockedScreen = ({ requiredLevel }) => {
    const navigate = useNavigate();
    const { subscription } = useSubscription();
    const config = PLAN_CONFIG[requiredLevel] || PLAN_CONFIG.core;
    const PlanIcon = config.icon;
    const currentPlanLabel = getCurrentPlanLabel(subscription);
    const branchName = localStorage.getItem('branch_name') || 'Not selected';
    const branchId = subscription?.branch_id || localStorage.getItem('branch_id') || '';
    const planSource = 'Branch workspace plan';

    const leftPanel = (
        <GateLeftPanel
            gradient={config.gradient}
            badge="Premium access"
            badgeIcon={FiLock}
            icon={PlanIcon}
            subtitle="Required plan"
            title={config.planLabel}
            description={config.subheadline}
            statuses={[
                {
                    label: 'Selected branch',
                    value: branchId ? `${branchName} (${branchId})` : branchName,
                    icon: FiHome,
                },
                {
                    label: planSource,
                    value: currentPlanLabel,
                    icon: FiZap,
                },
            ]}
        />
    );

    return (
        <GateScreenLayout leftPanel={leftPanel}>
            <GateContentHeader
                title={config.headline}
                subtitle="Subscription is checked for the currently selected branch. Choose a plan to continue using this workspace."
            />

            <div className={`mt-4 rounded-xl border ${config.softBorder} ${config.softBg} p-3.5 sm:p-4`}>
                <div className="flex items-center justify-between gap-3 mb-3">
                    <GateSectionLabel className={config.softText}>
                        Included with {config.requiredPlan}
                    </GateSectionLabel>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border ${config.chipBg}`}>
                        {config.requiredPlan}
                    </span>
                </div>
                <ul className="grid sm:grid-cols-2 gap-2.5">
                    {config.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-2.5 text-sm font-medium text-gray-700">
                            <span className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-white border border-emerald-200 flex-shrink-0">
                                <FiCheck className="w-3 h-3 text-emerald-600" />
                            </span>
                            <span>{feature}</span>
                        </li>
                    ))}
                </ul>
            </div>

            <div className="mt-5 flex flex-col sm:flex-row gap-2">
                <button
                    type="button"
                    onClick={() => navigate('/subscription')}
                    className={`inline-flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-colors ${config.button}`}
                >
                    <FiCreditCard className="w-4 h-4" />
                    View pricing plans
                </button>
                <button
                    type="button"
                    onClick={() => navigate('/branch-setup?change=1')}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                    <FiArrowLeft className="w-4 h-4" />
                    Change branch
                </button>
            </div>
        </GateScreenLayout>
    );
};

export const SubscriptionProtectedRoute = ({ children, requiredLevel }) => {
    const { hasAccess, loading } = useSubscription();

    if (loading) {
        return (
            <GateScreenLayout loading loadingMessage="Checking subscription access..." />
        );
    }

    const authorized = hasAccess(requiredLevel);

    if (!authorized) {
        return <SubscriptionBlockedScreen requiredLevel={requiredLevel} />;
    }

    return children;
};
