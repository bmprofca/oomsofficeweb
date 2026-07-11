import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
    FiHome,
    FiMail,
    FiArrowRight,
    FiRefreshCw,
    FiCheck,
    FiShield,
    FiLogOut,
    FiUser,
} from 'react-icons/fi';
import GateScreenLayout, {
    GateLeftPanel,
    GateContentHeader,
    GateActionCard,
    GateSectionLabel,
} from '../components/GateScreenLayout';
import CreateBranch from '../components/Modals/CreateBranch';
import { resetSubscriptionCache } from '../hooks/useSubscription';
import {
    acceptBranchInvitation,
    applyBranchToSession,
    fetchMyInvitations,
    fetchOnboardingStatus,
} from '../services/branchSetupService';

const THEME = {
    gradient: 'from-indigo-600 via-indigo-500 to-violet-500',
    button: 'bg-indigo-600 hover:bg-indigo-700 shadow-sm shadow-indigo-200/60',
};

const BranchSetup = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const isChangeMode = searchParams.get('change') === '1';
    const [view, setView] = useState('home');
    const [loading, setLoading] = useState(true);
    const [acceptingToken, setAcceptingToken] = useState('');
    const [invitations, setInvitations] = useState([]);
    const [branches, setBranches] = useState([]);
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const activeBranchId = localStorage.getItem('branch_id') || '';

    const displayName = localStorage.getItem('user_name')
        || localStorage.getItem('user_username')
        || localStorage.getItem('username')
        || 'User';

    const loadData = async () => {
        setLoading(true);
        try {
            const status = await fetchOnboardingStatus();
            if (status.has_branch && !isChangeMode) {
                applyBranchToSession(status.branches[0]);
                navigate('/', { replace: true });
                return;
            }
            setBranches(status.branches || []);
            setInvitations(status.pending_invitations || []);
        } catch (err) {
            console.error(err);
            toast.error(err.message || 'Failed to load branch setup');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [isChangeMode]);

    const leftPanelMeta = useMemo(() => {
        if (view === 'invitations') {
            return {
                badge: 'Workspace setup',
                badgeIcon: FiMail,
                icon: FiMail,
                subtitle: 'Pending invites',
                title: 'Branch Invitations',
                description: 'Review branches that invited you and accept one to continue.',
            };
        }
        return {
            badge: isChangeMode ? 'Workspace' : 'Workspace setup',
            badgeIcon: FiShield,
            icon: FiHome,
            subtitle: isChangeMode ? 'Switch branch' : 'Branch required',
            title: isChangeMode ? 'Change Branch' : 'Connect Workspace',
            description: isChangeMode
                ? 'Pick another branch workspace. Subscription access is checked again after you switch.'
                : 'Your account is ready. Create a branch or accept an invitation to start using OOMS.',
        };
    }, [view, isChangeMode]);

    const leftPanel = (
        <GateLeftPanel
            gradient={THEME.gradient}
            badge={leftPanelMeta.badge}
            badgeIcon={leftPanelMeta.badgeIcon}
            icon={leftPanelMeta.icon}
            subtitle={leftPanelMeta.subtitle}
            title={leftPanelMeta.title}
            description={leftPanelMeta.description}
            statuses={[
                {
                    label: 'Signed in as',
                    value: displayName,
                    icon: FiUser,
                },
                {
                    label: 'Pending invitations',
                    value: invitations.length > 0 ? `${invitations.length} waiting` : 'None',
                    icon: FiMail,
                },
            ]}
        />
    );

    const handleLogout = () => {
        localStorage.clear();
        navigate('/login');
    };

    const finishBranchSetup = (branch) => {
        applyBranchToSession(branch);
        resetSubscriptionCache();
        toast.success(`Welcome to ${branch.branch_name || branch.name}!`);
        navigate('/', { replace: true });
        window.location.reload();
    };

    const handleSelectBranch = (branch) => {
        if (branch.branch_id === activeBranchId) {
            toast('This branch is already selected');
            return;
        }
        finishBranchSetup(branch);
    };

    const handleAcceptInvitation = async (invitation) => {
        setAcceptingToken(invitation.invitation_token);
        try {
            const branch = await acceptBranchInvitation(invitation.invitation_token);
            finishBranchSetup({
                branch_id: branch.branch_id,
                branch_name: branch.branch_name,
                name: branch.branch_name,
                owned: branch.owned,
            });
        } catch (err) {
            toast.error(err.message || 'Failed to accept invitation');
        } finally {
            setAcceptingToken('');
        }
    };

    const openInvitations = async () => {
        setView('invitations');
        setLoading(true);
        try {
            const rows = await fetchMyInvitations();
            setInvitations(rows);
        } catch (err) {
            toast.error(err.message || 'Failed to load invitations');
        } finally {
            setLoading(false);
        }
    };

    const renderHome = () => (
        <>
            <GateContentHeader
                onBack={isChangeMode ? () => navigate(-1) : undefined}
                title={isChangeMode ? 'Select a branch workspace' : 'Choose how to connect'}
                subtitle={
                    isChangeMode
                        ? 'Switch to another branch you have access to, or create a new one.'
                        : 'Create your own branch or join one you were invited to. After a branch is selected, subscription access is checked for that branch.'
                }
            />

            {isChangeMode && branches.length > 0 && (
                <div className="mt-4 space-y-1">
                    <GateSectionLabel className="mb-1">Your branches</GateSectionLabel>
                    {branches.map((branch) => {
                        const isActive = branch.branch_id === activeBranchId;
                        return (
                            <GateActionCard
                                key={branch.branch_id}
                                icon={FiHome}
                                iconTone="indigo"
                                title={branch.branch_name || branch.name}
                                description={
                                    <>
                                        <span className="font-mono text-[11px] text-gray-500">{branch.branch_id}</span>
                                        {isActive ? (
                                            <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                                Current
                                            </span>
                                        ) : null}
                                    </>
                                }
                                active={isActive}
                                onClick={() => handleSelectBranch(branch)}
                                trailing={isActive ? null : FiArrowRight}
                            />
                        );
                    })}
                </div>
            )}

            <div className={`${isChangeMode && branches.length > 0 ? 'mt-3' : 'mt-4'} space-y-1.5`}>
                {!isChangeMode && <GateSectionLabel className="mb-0.5">Get started</GateSectionLabel>}
                <GateActionCard
                    icon={FiHome}
                    iconTone="indigo"
                    title="Create Branch"
                    description="Set up a new firm branch as admin"
                    onClick={() => setCreateModalOpen(true)}
                    trailing={FiArrowRight}
                />
                <GateActionCard
                    icon={FiMail}
                    iconTone="emerald"
                    title="View Invitations"
                    description="Join an existing branch workspace"
                    badge={
                        invitations.length > 0 ? (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                {invitations.length} new
                            </span>
                        ) : null
                    }
                    onClick={openInvitations}
                    trailing={FiArrowRight}
                />
            </div>

            <div className="mt-5 pt-4 border-t border-gray-100">
                <button
                    type="button"
                    onClick={handleLogout}
                    className="inline-flex items-center gap-2 text-xs font-semibold text-gray-500 hover:text-red-600 transition-colors"
                >
                    <FiLogOut className="w-3.5 h-3.5" />
                    Logout
                </button>
            </div>
        </>
    );

    const renderInvitations = () => (
        <>
            <GateContentHeader
                onBack={() => setView('home')}
                title="Pending invitations"
                subtitle="Accept a branch invitation to set your active workspace and continue."
            />

            <div className="mt-4 rounded-xl border border-gray-200 overflow-hidden bg-white shadow-sm">
                {loading ? (
                    <div className="py-12 flex flex-col items-center justify-center gap-2">
                        <FiRefreshCw className="animate-spin text-indigo-600 w-5 h-5" />
                        <p className="text-sm font-medium text-gray-500">Loading invitations...</p>
                    </div>
                ) : invitations.length === 0 ? (
                    <div className="py-12 px-6 text-center">
                        <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                            <FiMail className="w-6 h-6 text-gray-400" />
                        </div>
                        <p className="text-sm font-medium text-gray-500">No pending invitations</p>
                        <p className="text-xs text-gray-400 mt-1">When a branch invites you, it will appear here.</p>
                        <button
                            type="button"
                            onClick={() => setCreateModalOpen(true)}
                            className={`mt-5 inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-colors ${THEME.button}`}
                        >
                            Create your own branch
                            <FiArrowRight className="w-4 h-4" />
                        </button>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[680px]">
                            <thead>
                                <tr className="border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
                                    <th className="px-4 py-3 text-left text-[11px] font-bold text-gray-700 uppercase tracking-wide">
                                        Branch
                                    </th>
                                    <th className="px-4 py-3 text-left text-[11px] font-bold text-gray-700 uppercase tracking-wide border-l border-gray-100">
                                        Branch ID
                                    </th>
                                    <th className="px-4 py-3 text-left text-[11px] font-bold text-gray-700 uppercase tracking-wide border-l border-gray-100">
                                        Role
                                    </th>
                                    <th className="px-4 py-3 text-left text-[11px] font-bold text-gray-700 uppercase tracking-wide border-l border-gray-100">
                                        Invited By
                                    </th>
                                    <th className="px-4 py-3 text-right text-[11px] font-bold text-gray-700 uppercase tracking-wide border-l border-gray-100">
                                        Action
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {invitations.map((invitation) => (
                                    <tr
                                        key={invitation.map_id || invitation.invitation_token}
                                        className="border-b border-gray-100 bg-white hover:bg-gray-50 transition-colors"
                                    >
                                        <td className="px-4 py-3 text-sm font-semibold text-gray-800">
                                            {invitation.branch_name || '—'}
                                        </td>
                                        <td className="px-4 py-3 text-sm font-medium text-gray-700 font-mono border-l border-gray-100">
                                            {invitation.branch_id}
                                        </td>
                                        <td className="px-4 py-3 border-l border-gray-100">
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-gray-100 text-gray-700 capitalize">
                                                {invitation.role || 'staff'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-sm font-medium text-gray-700 border-l border-gray-100">
                                            {invitation.invited_by_name || invitation.invited_by}
                                        </td>
                                        <td className="px-4 py-3 text-right border-l border-gray-100">
                                            <button
                                                type="button"
                                                disabled={acceptingToken === invitation.invitation_token}
                                                onClick={() => handleAcceptInvitation(invitation)}
                                                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60 transition-colors"
                                            >
                                                {acceptingToken === invitation.invitation_token ? (
                                                    <FiRefreshCw className="animate-spin w-3.5 h-3.5" />
                                                ) : (
                                                    <FiCheck className="w-3.5 h-3.5" />
                                                )}
                                                Accept
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </>
    );

    return (
        <>
            <GateScreenLayout
                leftPanel={leftPanel}
                loading={loading && view === 'home'}
                loadingMessage="Preparing your workspace..."
            >
                {view === 'home' && renderHome()}
                {view === 'invitations' && renderInvitations()}
            </GateScreenLayout>

            <CreateBranch
                isOpen={createModalOpen}
                onClose={() => setCreateModalOpen(false)}
                onSuccess={finishBranchSetup}
            />
        </>
    );
};

export default BranchSetup;
