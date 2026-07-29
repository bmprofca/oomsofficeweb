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
    FiDollarSign,
} from 'react-icons/fi';
import { Building2, Loader2 } from 'lucide-react';
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
            'Staff management',
            'Billing & invoicing',
            'Finance ledger',
            'Broadcast messages',
        ],
    },
    'salary-management': {
        headline: 'Salary management needs BusinessPlus',
        subheadline: 'Upgrade to configure staff salaries, adjustments, and payslips.',
        requiredPlan: 'BusinessPlus',
        planLabel: 'BusinessPlus Plan',
        icon: FiDollarSign,
        gradient: 'from-violet-600 via-purple-600 to-fuchsia-500',
        softBg: 'bg-violet-50',
        softBorder: 'border-violet-200',
        softText: 'text-violet-700',
        chipBg: 'bg-violet-50 text-violet-700 border-violet-200',
        button: 'bg-violet-600 hover:bg-violet-700 shadow-sm shadow-violet-200/60',
        features: [
            'Staff salary setup',
            'Salary history',
            'Salary adjustments',
            'Payslip generation',
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

/** Friendly transition while branch/subscription syncs — never the Premium gate. */
export const WorkspaceSyncScreen = ({
    title = 'Loading workspace',
    subtitle = 'Preparing data for the selected branch…',
}) => {
    const branchName = localStorage.getItem('branch_name') || 'your workspace';

    return (
        <GateScreenLayout>
            <div className="flex flex-col items-center justify-center py-10 sm:py-16 px-4 text-center">
                <div className="relative mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
                    <Building2 size={28} />
                    <span className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white shadow-sm">
                        <Loader2 size={14} className="animate-spin text-blue-600" />
                    </span>
                </div>
                <h2 className="m-0 text-lg font-semibold text-slate-900">{title}</h2>
                <p className="mt-2 mb-0 max-w-sm text-sm text-slate-500">{subtitle}</p>
                <p className="mt-3 mb-0 inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
                    <FiHome className="w-3.5 h-3.5" />
                    {branchName}
                </p>
            </div>
        </GateScreenLayout>
    );
};

export const SubscriptionBlockedScreen = ({ requiredLevel }) => {
    const navigate = useNavigate();
    const { subscription, refetch } = useSubscription();
    const [refreshing, setRefreshing] = React.useState(false);
    const config = PLAN_CONFIG[requiredLevel] || PLAN_CONFIG.core;
    const PlanIcon = config.icon;
    const currentPlanLabel = getCurrentPlanLabel(subscription);
    const branchName = localStorage.getItem('branch_name') || 'Not selected';
    const branchId = subscription?.branch_id || localStorage.getItem('branch_id') || '';
    const planSource = 'Branch workspace plan';

    const handleRefreshAccess = async () => {
        setRefreshing(true);
        try {
            await refetch({ silent: true });
        } finally {
            setRefreshing(false);
        }
    };

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
                    disabled={refreshing}
                    onClick={handleRefreshAccess}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-sm font-medium text-indigo-700 hover:bg-indigo-100 transition-colors disabled:opacity-60"
                >
                    <FiZap className="w-4 h-4" />
                    {refreshing ? 'Checking…' : 'Refresh access'}
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
    const {
        hasAccess,
        loading,
        verifyingBranch,
        isBranchSwitching,
    } = useSubscription();

    // Branch switch / plan sync: never flash the Premium upgrade gate
    if (isBranchSwitching || verifyingBranch || loading) {
        return (
            <WorkspaceSyncScreen
                title={isBranchSwitching ? 'Switching workspace' : 'Loading workspace'}
                subtitle={
                    isBranchSwitching
                        ? 'Refreshing subscription and data for the selected branch…'
                        : 'Checking plan access for this branch…'
                }
            />
        );
    }

    if (!hasAccess(requiredLevel)) {
        return <SubscriptionBlockedScreen requiredLevel={requiredLevel} />;
    }

    return children;
};
