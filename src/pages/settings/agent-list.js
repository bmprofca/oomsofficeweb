import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FiAlertCircle,
    FiCheckCircle,
    FiClock,
    FiMail,
    FiMoreVertical,
    FiPhone,
    FiPlus,
    FiRefreshCw,
    FiSearch,
    FiUsers,
    FiTrash2,
    FiUser,
    FiUserCheck,
    FiUserPlus,
    FiUserX,
    FiX,
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import { Header, Sidebar } from '../../components/header';
import TablePagination from '../../components/TablePagination';
import AppDialog from '../../components/AppDialog';
import useDebouncedValue from '../../hooks/useDebouncedValue';
import {
    changeAgentStatus,
    checkAgentUser,
    createAgentInvitation,
    deleteAgent,
    fetchAgentList,
    resendAgentInvitation,
} from '../../services/agentService';

const ACTIONS_MENU_WIDTH = 200;
const ACTIONS_MENU_HEIGHT = 160;

const isAgentAccepted = (row) => Boolean(row?.is_accepted);

const formatCurrency = (value) => {
    const n = Number(value);
    if (!Number.isFinite(n)) return '—';
    return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
};

const formatPhone = (profile) => {
    if (!profile) return '—';
    const code = profile.country_code ? `+${String(profile.country_code).replace(/^\+/, '')}` : '';
    const mobile = profile.mobile || '';
    if (!mobile) return '—';
    return code ? `${code} ${mobile}` : mobile;
};

const formatUserContactPhone = (user) => {
    if (!user?.mobile) return null;
    const code = user.country_code ? `+${String(user.country_code).replace(/^\+/, '')}` : '';
    return code ? `${code} ${user.mobile}` : String(user.mobile);
};

const SkeletonPulse = ({ className = '' }) => (
    <div className={`animate-pulse rounded-md bg-gray-200/90 ${className}`} />
);

const AgentList = () => {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(() => {
        const saved = localStorage.getItem('sidebarMinimized');
        return saved ? JSON.parse(saved) : false;
    });

    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearch = useDebouncedValue(searchTerm, 400);
    const [agentRows, setAgentRows] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 20,
        total: 0,
        total_pages: 1,
        is_last_page: false,
    });

    const [activeRowDropdown, setActiveRowDropdown] = useState(null);
    const [dropdownPos, setDropdownPos] = useState({ top: 0, right: 0, openUpward: false });
    const dropdownAnchorRef = useRef(null);

    const [showAddModal, setShowAddModal] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');
    const [checkingUser, setCheckingUser] = useState(false);
    const [inviting, setInviting] = useState(false);
    const [checkedUser, setCheckedUser] = useState(null);
    const [checkFeedback, setCheckFeedback] = useState({ type: null, message: '' });

    const [dialog, setDialog] = useState({
        open: false,
        variant: 'confirm',
        title: '',
        message: '',
        confirmText: 'Confirm',
        cancelText: 'Cancel',
        onConfirm: null,
        loading: false,
    });

    const listAbortRef = useRef(null);

    const loadAgentList = useCallback(async () => {
        listAbortRef.current?.abort();
        const ac = new AbortController();
        listAbortRef.current = ac;

        setLoading(true);
        setError('');
        try {
            const result = await fetchAgentList({
                search: debouncedSearch,
                page: pagination.page,
                limit: pagination.limit,
            });
            if (ac.signal.aborted) return;

            if (!result?.success) {
                throw new Error(result?.message || 'Failed to fetch agent list');
            }

            setAgentRows(Array.isArray(result.data) ? result.data : []);
            const meta = result.meta || {};
            setPagination((prev) => ({
                ...prev,
                page: meta.page != null ? Number(meta.page) : prev.page,
                limit: meta.limit != null ? Number(meta.limit) : prev.limit,
                total: meta.total != null ? Number(meta.total) : 0,
                total_pages: meta.total_pages != null ? Number(meta.total_pages) : 1,
                is_last_page: Boolean(meta.is_last_page),
            }));
        } catch (e) {
            if (e.name === 'AbortError') return;
            console.error('Agent list fetch:', e);
            setAgentRows([]);
            setError(e.response?.data?.message || e.message || 'Failed to load agent list');
        } finally {
            if (listAbortRef.current === ac) setLoading(false);
        }
    }, [debouncedSearch, pagination.page, pagination.limit]);

    useEffect(() => {
        setPagination((prev) => (prev.page !== 1 ? { ...prev, page: 1 } : prev));
    }, [debouncedSearch]);

    useEffect(() => {
        loadAgentList();
    }, [loadAgentList]);

    useEffect(() => {
        localStorage.setItem('sidebarMinimized', JSON.stringify(isMinimized));
    }, [isMinimized]);

    useEffect(() => {
        document.body.style.overflow = mobileMenuOpen ? 'hidden' : 'auto';
        return () => {
            document.body.style.overflow = 'auto';
        };
    }, [mobileMenuOpen]);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (
                !e.target.closest('.agent-list-dropdown') &&
                !e.target.closest('[data-agent-list-actions-menu]')
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

    const activeItem = useMemo(
        () => agentRows.find((row) => row.map_id === activeRowDropdown) || null,
        [agentRows, activeRowDropdown]
    );

    const rowsForTable = useMemo(
        () =>
            loading
                ? Array.from({ length: 6 }, (_, i) => ({ __skeleton: true, map_id: `sk-${i}` }))
                : agentRows,
        [loading, agentRows]
    );

    const showConfirm = ({ variant = 'warning', title, message, confirmText = 'Confirm', cancelText = 'Cancel', onConfirm }) => {
        setDialog({ open: true, variant, title, message, confirmText, cancelText, onConfirm, loading: false });
    };

    const closeDialog = () => {
        setDialog((prev) => ({ ...prev, open: false, loading: false, onConfirm: null }));
    };

    const handleDialogConfirm = async () => {
        if (!dialog.onConfirm) {
            closeDialog();
            return;
        }
        setDialog((prev) => ({ ...prev, loading: true }));
        const result = await dialog.onConfirm();
        if (result?.variant) {
            setDialog({
                open: true,
                variant: result.variant,
                title: result.title,
                message: result.message,
                confirmText: 'Close',
                cancelText: null,
                onConfirm: null,
                loading: false,
            });
        } else {
            closeDialog();
        }
    };

    const resetAddModal = () => {
        setInviteEmail('');
        setCheckedUser(null);
        setCheckFeedback({ type: null, message: '' });
        setCheckingUser(false);
        setInviting(false);
    };

    const handleVerifyEmail = async () => {
        const email = inviteEmail.trim();
        if (!email) {
            setCheckedUser(null);
            setCheckFeedback({ type: 'error', message: 'Email is required.' });
            return;
        }
        setCheckingUser(true);
        setCheckedUser(null);
        setCheckFeedback({ type: null, message: '' });
        try {
            const result = await checkAgentUser(email);
            const message = result?.message || '';

            if (!result?.success) {
                setCheckFeedback({
                    type: 'error',
                    message: message || 'User not found. Please check the email address.',
                });
                return;
            }

            if (message === 'Agent already exists') {
                setCheckFeedback({
                    type: 'warning',
                    message: 'This agent is already added and has accepted the invitation.',
                });
                return;
            }

            if (message === 'Agent already exists but not accepted yet') {
                setCheckFeedback({
                    type: 'info',
                    message: 'Invitation already sent. Waiting for the agent to accept.',
                });
                return;
            }

            if (result.data?.username) {
                setCheckedUser(result.data);
                setCheckFeedback({ type: null, message: '' });
            } else {
                setCheckFeedback({
                    type: 'error',
                    message: message || 'Unable to verify user. Please try again.',
                });
            }
        } catch (e) {
            console.error('Agent check-user:', e);
            setCheckFeedback({
                type: 'error',
                message: e.response?.data?.message || e.message || 'Failed to verify email. Please try again.',
            });
        } finally {
            setCheckingUser(false);
        }
    };

    const handleSendInvitation = async () => {
        if (!checkedUser?.username) return;
        setInviting(true);
        try {
            const result = await createAgentInvitation(checkedUser.username);
            if (result?.success) {
                const link = result.data?.invitation_link;
                toast.success(result.message || 'Invitation sent successfully');
                if (link) {
                    try {
                        await navigator.clipboard.writeText(link);
                        toast.success('Invitation link copied to clipboard');
                    } catch {
                        /* clipboard optional */
                    }
                }
                setShowAddModal(false);
                resetAddModal();
                await loadAgentList();
            } else {
                toast.error(result?.message || 'Failed to send invitation');
            }
        } catch (e) {
            console.error('Agent create:', e);
            toast.error(e.response?.data?.message || e.message || 'Failed to send invitation');
        } finally {
            setInviting(false);
        }
    };

    const handleToggleStatus = (row) => {
        if (!row?.username || !isAgentAccepted(row)) return;
        const nextStatus = row.status ? 'deactive' : 'active';
        const label = nextStatus === 'active' ? 'activate' : 'deactivate';
        setActiveRowDropdown(null);
        showConfirm({
            variant: nextStatus === 'deactive' ? 'warning' : 'confirm',
            title: `${nextStatus === 'active' ? 'Activate' : 'Deactivate'} Agent`,
            message: `Are you sure you want to ${label} ${row.profile?.name || row.username}?`,
            confirmText: nextStatus === 'active' ? 'Activate' : 'Deactivate',
            cancelText: 'Cancel',
            onConfirm: async () => {
                try {
                    const result = await changeAgentStatus(row.username, nextStatus);
                    if (result?.success) {
                        await loadAgentList();
                        return {
                            variant: 'success',
                            title: 'Status Updated',
                            message: result.message || 'Agent status updated successfully.',
                        };
                    }
                    return {
                        variant: 'error',
                        title: 'Update Failed',
                        message: result?.message || 'Could not update agent status.',
                    };
                } catch (e) {
                    console.error('Agent change-status:', e);
                    return {
                        variant: 'error',
                        title: 'Error',
                        message: e.response?.data?.message || e.message || 'Failed to update agent status.',
                    };
                }
            },
        });
    };

    const handleResendInvitation = (row) => {
        if (!row?.map_id || isAgentAccepted(row)) return;
        setActiveRowDropdown(null);
        showConfirm({
            variant: 'confirm',
            title: 'Resend Invitation',
            message: `Resend invitation to ${row.profile?.name || row.username}? The previous invitation link will stop working.`,
            confirmText: 'Resend',
            cancelText: 'Cancel',
            onConfirm: async () => {
                try {
                    const result = await resendAgentInvitation(row.map_id);
                    if (result?.success) {
                        const link = result.data?.invitation_link;
                        if (link) {
                            try {
                                await navigator.clipboard.writeText(link);
                            } catch {
                                /* clipboard optional */
                            }
                        }
                        await loadAgentList();
                        return {
                            variant: 'success',
                            title: 'Invitation Resent',
                            message: link
                                ? `${result.message || 'Invitation resent successfully.'} New link copied to clipboard.`
                                : result.message || 'Invitation resent successfully.',
                        };
                    }
                    return {
                        variant: 'error',
                        title: 'Resend Failed',
                        message: result?.message || 'Could not resend invitation.',
                    };
                } catch (e) {
                    console.error('Agent resend-invitation:', e);
                    return {
                        variant: 'error',
                        title: 'Error',
                        message: e.response?.data?.message || e.message || 'Failed to resend invitation.',
                    };
                }
            },
        });
    };

    const handleDelete = (row) => {
        if (!row?.map_id || isAgentAccepted(row)) return;
        setActiveRowDropdown(null);
        showConfirm({
            variant: 'danger',
            title: 'Remove Agent',
            message: `Remove ${row.profile?.name || row.username} from this branch? This action cannot be undone.`,
            confirmText: 'Remove',
            cancelText: 'Cancel',
            onConfirm: async () => {
                try {
                    const result = await deleteAgent(row.map_id);
                    if (result?.success) {
                        await loadAgentList();
                        return {
                            variant: 'success',
                            title: 'Agent Removed',
                            message: result.message || 'Agent deleted successfully.',
                        };
                    }
                    return {
                        variant: 'error',
                        title: 'Delete Failed',
                        message: result?.message || 'Could not delete agent.',
                    };
                } catch (e) {
                    console.error('Agent delete:', e);
                    return {
                        variant: 'error',
                        title: 'Error',
                        message: e.response?.data?.message || e.message || 'Failed to delete agent.',
                    };
                }
            },
        });
    };

    const toggleRowDropdown = (mapId, e) => {
        if (activeRowDropdown === mapId) {
            setActiveRowDropdown(null);
            return;
        }
        dropdownAnchorRef.current = e.currentTarget;
        const rect = e.currentTarget.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        const openUpward = spaceBelow < ACTIONS_MENU_HEIGHT + 8;
        setDropdownPos({
            top: openUpward ? undefined : rect.bottom + 4,
            bottom: openUpward ? window.innerHeight - rect.top + 4 : undefined,
            right: window.innerWidth - rect.right,
            openUpward,
        });
        setActiveRowDropdown(mapId);
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

            <div className={`pt-16 transition-all duration-300 ${isMinimized ? 'md:pl-20' : 'md:pl-[260px]'}`}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="mb-6">
                        <h1 className="text-xl font-bold text-slate-900">Branch Agents</h1>
                        <p className="text-sm text-slate-500 mt-1">
                            Invite and manage agents for this branch
                        </p>
                    </div>

                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="px-4 py-3 border-b border-slate-200 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Search by name, mobile, email..."
                                className="w-full sm:max-w-sm px-4 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none"
                            />
                            <div className="flex items-center gap-2 shrink-0">
                                <button
                                    type="button"
                                    onClick={loadAgentList}
                                    disabled={loading}
                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                                >
                                    <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                                    Refresh
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        resetAddModal();
                                        setShowAddModal(true);
                                    }}
                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700"
                                >
                                    <FiPlus className="w-4 h-4" />
                                    Add Agent
                                </button>
                            </div>
                        </div>

                        {error && !loading && (
                            <div className="mx-4 mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                                {error}
                            </div>
                        )}

                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[52rem] text-sm">
                                <thead className="bg-slate-50 border-b border-slate-200">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase w-12">#</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Agent</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Contact</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Balance</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Invitation</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Status</th>
                                        <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase w-14">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {!loading && rowsForTable.length === 0 ? (
                                        <tr>
                                            <td colSpan="7" className="px-6 py-14 text-center">
                                                <FiUsers className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                                                <p className="font-medium text-slate-700">No agents found</p>
                                                <p className="text-sm text-slate-500 mt-1">Add an agent by email invitation</p>
                                            </td>
                                        </tr>
                                    ) : (
                                        rowsForTable.map((row, index) => {
                                            if (row.__skeleton) {
                                                return (
                                                    <tr key={row.map_id}>
                                                        <td className="px-4 py-4"><SkeletonPulse className="h-4 w-6" /></td>
                                                        <td className="px-4 py-4"><SkeletonPulse className="h-10 w-40" /></td>
                                                        <td className="px-4 py-4"><SkeletonPulse className="h-8 w-36" /></td>
                                                        <td className="px-4 py-4"><SkeletonPulse className="h-4 w-20" /></td>
                                                        <td className="px-4 py-4"><SkeletonPulse className="h-6 w-24" /></td>
                                                        <td className="px-4 py-4"><SkeletonPulse className="h-6 w-20" /></td>
                                                        <td className="px-4 py-4"><SkeletonPulse className="h-6 w-6 mx-auto" /></td>
                                                    </tr>
                                                );
                                            }

                                            const profile = row.profile || {};
                                            const serialNo = (pagination.page - 1) * pagination.limit + index + 1;

                                            return (
                                                <tr key={row.map_id} className="hover:bg-slate-50/80">
                                                    <td className="px-4 py-4 text-slate-600">{serialNo}</td>
                                                    <td className="px-4 py-4">
                                                        <div className="flex items-center gap-3">
                                                            {profile.image ? (
                                                                <img
                                                                    src={profile.image}
                                                                    alt=""
                                                                    className="w-10 h-10 rounded-full object-cover border border-slate-200"
                                                                />
                                                            ) : (
                                                                <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center">
                                                                    <FiUsers className="w-5 h-5 text-indigo-600" />
                                                                </div>
                                                            )}
                                                            <div>
                                                                <span className="font-semibold text-slate-800">
                                                                    {profile.name || row.username}
                                                                </span>
                                                                <p className="text-xs text-slate-500 mt-0.5">@{row.username}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-4">
                                                        <div className="space-y-1 text-slate-600">
                                                            <div className="flex items-center gap-1.5">
                                                                <FiPhone className="w-3.5 h-3.5 shrink-0" />
                                                                {formatPhone(profile)}
                                                            </div>
                                                            <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                                                <FiMail className="w-3.5 h-3.5 shrink-0" />
                                                                {profile.email || '—'}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-4 font-medium text-slate-800">
                                                        {formatCurrency(row.balance)}
                                                    </td>
                                                    <td className="px-4 py-4">
                                                        <span
                                                            className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${
                                                                row.is_accepted
                                                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                                                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                                                            }`}
                                                        >
                                                            {row.is_accepted ? 'Accepted' : 'Pending'}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-4">
                                                        {isAgentAccepted(row) ? (
                                                            <span
                                                                className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${
                                                                    row.status
                                                                        ? 'bg-green-50 text-green-700 border border-green-200'
                                                                        : 'bg-slate-100 text-slate-600 border border-slate-200'
                                                                }`}
                                                            >
                                                                {row.status ? 'Active' : 'Inactive'}
                                                            </span>
                                                        ) : (
                                                            <span className="text-xs text-slate-400">—</span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-4">
                                                        <div className="flex justify-center">
                                                            <button
                                                                type="button"
                                                                className="agent-list-dropdown p-1.5 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100"
                                                                onClick={(e) => toggleRowDropdown(row.map_id, e)}
                                                            >
                                                                <FiMoreVertical className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {(loading || agentRows.length > 0) && (
                            <TablePagination
                                showRange
                                showRows
                                showJump
                                showFirstLast
                                rowOptions={[10, 20, 50, 100]}
                                defaultRows={20}
                                className="!bg-white !from-white !to-white border-t border-slate-200"
                                page={pagination.page}
                                limit={pagination.limit}
                                total={pagination.total}
                                totalPages={pagination.total_pages}
                                isLastPage={pagination.is_last_page}
                                onPageChange={(page) => setPagination((prev) => ({ ...prev, page }))}
                                onLimitChange={(limit) =>
                                    setPagination((prev) => ({ ...prev, limit, page: 1 }))
                                }
                            />
                        )}
                    </div>
                </div>
            </div>

            {activeRowDropdown && activeItem &&
                createPortal(
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: dropdownPos.openUpward ? 6 : -6 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ duration: 0.12 }}
                        data-agent-list-actions-menu
                        className="agent-list-dropdown fixed bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden z-[9999]"
                        style={{
                            top: dropdownPos.top,
                            bottom: dropdownPos.bottom,
                            right: dropdownPos.right,
                            width: `${ACTIONS_MENU_WIDTH}px`,
                        }}
                    >
                        <div className="py-1">
                            {isAgentAccepted(activeItem) ? (
                                <button
                                    type="button"
                                    className="flex items-center w-full px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
                                    onClick={() => handleToggleStatus(activeItem)}
                                >
                                    {activeItem.status ? (
                                        <>
                                            <FiUserX className="w-4 h-4 mr-3 text-amber-500" />
                                            Deactivate
                                        </>
                                    ) : (
                                        <>
                                            <FiUserCheck className="w-4 h-4 mr-3 text-emerald-500" />
                                            Activate
                                        </>
                                    )}
                                </button>
                            ) : (
                                <>
                                    <button
                                        type="button"
                                        className="flex items-center w-full px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
                                        onClick={() => handleResendInvitation(activeItem)}
                                    >
                                        <FiMail className="w-4 h-4 mr-3 text-indigo-500" />
                                        Resend Invitation
                                    </button>
                                    <div className="border-t border-slate-100" />
                                    <button
                                        type="button"
                                        className="flex items-center w-full px-4 py-2.5 text-sm text-rose-700 hover:bg-rose-50"
                                        onClick={() => handleDelete(activeItem)}
                                    >
                                        <FiTrash2 className="w-4 h-4 mr-3 text-rose-500" />
                                        Remove
                                    </button>
                                </>
                            )}
                        </div>
                    </motion.div>,
                    document.body
                )}

            <AnimatePresence>
                {showAddModal && (
                    <div className="fixed inset-0 z-[10050] flex items-start justify-center overflow-hidden overscroll-none p-3 sm:p-4 pointer-events-none">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm pointer-events-auto"
                            onClick={() => {
                                if (!checkingUser && !inviting) {
                                    setShowAddModal(false);
                                    resetAddModal();
                                }
                            }}
                        />
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="relative z-[1] pointer-events-auto bg-white rounded-xl shadow-xl w-full max-w-[26rem] my-2 sm:my-4 max-h-[calc(100vh-1.5rem)] sm:max-h-[calc(100vh-2rem)] overflow-hidden flex flex-col border border-slate-200"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="shrink-0 flex items-center justify-between gap-2 px-3.5 py-2.5 border-b border-indigo-500/20 bg-indigo-600 text-white">
                                <div className="flex items-center gap-2 min-w-0">
                                    <FiUserPlus className="w-4 h-4 shrink-0 opacity-90" />
                                    <h3 className="text-sm font-semibold truncate">Invite Agent</h3>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowAddModal(false);
                                        resetAddModal();
                                    }}
                                    disabled={checkingUser || inviting}
                                    className="p-1 rounded-md hover:bg-white/15 text-white/90 disabled:opacity-50 shrink-0"
                                    aria-label="Close"
                                >
                                    <FiX className="w-4 h-4" />
                                </button>
                            </div>

                            <div
                                className="px-3.5 py-3 flex-1 min-h-0 overflow-y-auto overscroll-y-contain space-y-2.5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                            >
                                <p className="text-[11px] leading-relaxed text-slate-500">
                                    Enter the user&apos;s platform email to verify, then send the branch agent invitation.
                                </p>

                                <div className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-slate-400">
                                    <span className={checkedUser ? 'text-slate-400' : 'text-indigo-600'}>1. Verify</span>
                                    <span>·</span>
                                    <span className={checkedUser ? 'text-indigo-600' : 'text-slate-400'}>2. Invite</span>
                                </div>

                                <div className="space-y-2">
                                    <label className="block text-xs font-medium text-slate-700">
                                        Email address <span className="text-rose-500">*</span>
                                    </label>
                                    <div className="flex gap-1.5">
                                        <div className="relative flex-1 min-w-0">
                                            <FiMail className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                                            <input
                                                type="email"
                                                value={inviteEmail}
                                                onChange={(e) => {
                                                    setInviteEmail(e.target.value);
                                                    setCheckedUser(null);
                                                    setCheckFeedback({ type: null, message: '' });
                                                }}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' && !checkingUser && inviteEmail.trim()) {
                                                        e.preventDefault();
                                                        handleVerifyEmail();
                                                    }
                                                }}
                                                placeholder="agent.user@example.com"
                                                autoFocus
                                                className={`w-full pl-8 pr-2.5 py-1.5 text-sm bg-white border rounded-md outline-none ${
                                                    checkFeedback.type === 'error'
                                                        ? 'border-rose-300 focus:ring-1 focus:ring-rose-400/30 focus:border-rose-400'
                                                        : 'border-slate-200 focus:ring-1 focus:ring-indigo-400/30 focus:border-indigo-400'
                                                }`}
                                            />
                                        </div>
                                        <button
                                            type="button"
                                            onClick={handleVerifyEmail}
                                            disabled={checkingUser || !inviteEmail.trim()}
                                            className="shrink-0 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
                                        >
                                            {checkingUser ? (
                                                <FiRefreshCw className="w-3.5 h-3.5 animate-spin" />
                                            ) : (
                                                <FiSearch className="w-3.5 h-3.5" />
                                            )}
                                            {checkingUser ? 'Checking' : 'Check'}
                                        </button>
                                    </div>
                                </div>

                                {checkFeedback.type && checkFeedback.message && (
                                    <div
                                        className={`flex items-start gap-2 rounded-md border px-2.5 py-2 ${
                                            checkFeedback.type === 'error'
                                                ? 'border-rose-200 bg-rose-50 text-rose-900'
                                                : checkFeedback.type === 'warning'
                                                  ? 'border-amber-200 bg-amber-50 text-amber-900'
                                                  : 'border-sky-200 bg-sky-50 text-sky-900'
                                        }`}
                                    >
                                        <span className="mt-0.5 shrink-0">
                                            {checkFeedback.type === 'error' && (
                                                <FiAlertCircle className="w-3.5 h-3.5 text-rose-500" />
                                            )}
                                            {checkFeedback.type === 'warning' && (
                                                <FiCheckCircle className="w-3.5 h-3.5 text-amber-500" />
                                            )}
                                            {checkFeedback.type === 'info' && (
                                                <FiClock className="w-3.5 h-3.5 text-sky-500" />
                                            )}
                                        </span>
                                        <div className="min-w-0">
                                            <p className="text-[11px] font-semibold leading-snug">
                                                {checkFeedback.type === 'error' && 'Could not verify user'}
                                                {checkFeedback.type === 'warning' && 'Already on this branch'}
                                                {checkFeedback.type === 'info' && 'Invitation pending'}
                                            </p>
                                            <p className="text-[11px] mt-0.5 opacity-90 leading-snug">{checkFeedback.message}</p>
                                        </div>
                                    </div>
                                )}

                                {checkedUser && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 4 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.2 }}
                                        className="overflow-hidden rounded-md border border-emerald-200 bg-emerald-50/50 divide-y divide-emerald-100/90"
                                    >
                                        <div className="flex items-center gap-2 px-2.5 py-1.5">
                                            <FiUser className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                                            <span className="min-w-0 truncate text-xs text-slate-700">
                                                {checkedUser.name || '—'}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 px-2.5 py-1.5">
                                            <FiMail className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                                            <span className="min-w-0 truncate text-xs text-slate-700">
                                                {checkedUser.email || inviteEmail || '—'}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 px-2.5 py-1.5">
                                            <FiPhone className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                                            <span className="min-w-0 truncate text-xs text-slate-700 tabular-nums">
                                                {formatUserContactPhone(checkedUser) || '—'}
                                            </span>
                                        </div>
                                    </motion.div>
                                )}
                            </div>

                            <div className="shrink-0 flex gap-2 px-3.5 py-2.5 border-t border-slate-200 bg-slate-50">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowAddModal(false);
                                        resetAddModal();
                                    }}
                                    disabled={checkingUser || inviting}
                                    className="flex-1 sm:flex-none px-3 py-1.5 text-xs font-medium text-slate-600 border border-slate-200 rounded-md bg-white hover:bg-slate-50 disabled:opacity-60"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSendInvitation}
                                    disabled={!checkedUser?.username || inviting || checkingUser}
                                    className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50"
                                >
                                    {inviting ? (
                                        <>
                                            <FiRefreshCw className="w-3.5 h-3.5 animate-spin" />
                                            Sending…
                                        </>
                                    ) : (
                                        <>
                                            <FiMail className="w-3.5 h-3.5" />
                                            Send invitation
                                        </>
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <AppDialog dialog={dialog} onClose={closeDialog} onConfirm={handleDialogConfirm} />
        </div>
    );
};

export default AgentList;
