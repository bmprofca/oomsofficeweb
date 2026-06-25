import React, { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    FiAlertCircle,
    FiBriefcase,
    FiCheckCircle,
    FiHome,
    FiMail,
    FiMapPin,
    FiPhone,
    FiRefreshCw,
    FiUser,
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import { acceptInvitation, fetchInvitationDetails } from '../../services/invitationService';

const ROLE_LABELS = {
    admin: 'Administrator',
    staff: 'Staff',
    ca: 'Chartered Accountant',
    agent: 'Agent',
};

const formatPhone = (mobile, countryCode) => {
    if (!mobile) return null;
    const code = countryCode ? `+${String(countryCode).replace(/^\+/, '')}` : '';
    return code ? `${code} ${mobile}` : String(mobile);
};

const formatBranchAddress = (address) => {
    if (!address) return null;
    const parts = [
        address.address_line_1,
        address.address_line_2,
        address.city,
        address.state,
        address.country,
        address.pincode,
    ].filter(Boolean);
    return parts.length ? parts.join(', ') : null;
};

const getRoleLabel = (type, designation) => {
    if (designation) return designation;
    return ROLE_LABELS[type] || type || 'Member';
};

const InvitationRequest = () => {
    const { token: routeToken } = useParams();
    const token = (routeToken || '').trim();

    const [loading, setLoading] = useState(true);
    const [accepting, setAccepting] = useState(false);
    const [accepted, setAccepted] = useState(false);
    const [error, setError] = useState('');
    const [details, setDetails] = useState(null);
    const [acceptResult, setAcceptResult] = useState(null);

    const loadDetails = useCallback(async () => {
        if (!token) {
            setError('Invitation token is missing from the link.');
            setLoading(false);
            return;
        }
        setLoading(true);
        setError('');
        setDetails(null);
        setAccepted(false);
        setAcceptResult(null);
        try {
            const result = await fetchInvitationDetails(token);
            if (!result?.success) {
                setError(result?.message || 'Unable to load invitation details.');
                return;
            }
            setDetails(result.data || null);
        } catch (e) {
            console.error('Invitation details:', e);
            setError(e.response?.data?.message || e.message || 'Failed to load invitation.');
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        loadDetails();
    }, [loadDetails]);

    const handleAccept = async () => {
        if (!token || !details || accepting || accepted) return;
        setAccepting(true);
        try {
            const result = await acceptInvitation(token);
            if (!result?.success) {
                toast.error(result?.message || 'Could not accept invitation.');
                return;
            }
            setAcceptResult(result.data || null);
            setAccepted(true);
            toast.success(result.message || 'Invitation accepted successfully.');
        } catch (e) {
            console.error('Invitation accept:', e);
            toast.error(e.response?.data?.message || e.message || 'Failed to accept invitation.');
        } finally {
            setAccepting(false);
        }
    };

    const branch = details?.branch;
    const invitedUser = details?.invited_user;
    const invitedBy = details?.invited_by;
    const branchAddress = formatBranchAddress(branch?.address);
    const roleLabel = details ? getRoleLabel(details.type, details.designation) : '';

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/40 to-slate-100 flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className="w-full max-w-lg"
            >
                <div className="text-center mb-6">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/25 mb-3">
                        <FiBriefcase className="w-6 h-6" />
                    </div>
                    <h1 className="text-xl font-bold text-slate-900">Branch Invitation</h1>
                    <p className="text-sm text-slate-500 mt-1">Review and accept your invitation to join a branch</p>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden">
                    {loading && (
                        <div className="px-6 py-14 flex flex-col items-center justify-center text-slate-500">
                            <FiRefreshCw className="w-8 h-8 animate-spin text-indigo-500 mb-3" />
                            <p className="text-sm font-medium">Loading invitation…</p>
                        </div>
                    )}

                    {!loading && error && (
                        <div className="px-6 py-10 text-center">
                            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-rose-50">
                                <FiAlertCircle className="h-6 w-6 text-rose-500" />
                            </div>
                            <h2 className="text-base font-semibold text-slate-900">Invitation unavailable</h2>
                            <p className="mt-2 text-sm text-slate-600 leading-relaxed">{error}</p>
                            <button
                                type="button"
                                onClick={loadDetails}
                                className="mt-5 inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                            >
                                <FiRefreshCw className="w-4 h-4" />
                                Try again
                            </button>
                        </div>
                    )}

                    {!loading && !error && details && (
                        <>
                            <div className="px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-indigo-50/80 to-white">
                                <div className="flex items-start gap-4">
                                    {branch?.logo ? (
                                        <img
                                            src={branch.logo}
                                            alt=""
                                            className="h-14 w-14 rounded-xl border border-slate-200 object-cover bg-white shrink-0"
                                        />
                                    ) : (
                                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
                                            <FiHome className="h-7 w-7" />
                                        </div>
                                    )}
                                    <div className="min-w-0 flex-1">
                                        <p className="text-xs font-medium uppercase tracking-wide text-indigo-600">
                                            You are invited to join
                                        </p>
                                        <h2 className="mt-0.5 text-lg font-bold text-slate-900 truncate">
                                            {branch?.name || 'Branch'}
                                        </h2>
                                        <p className="mt-1 text-sm text-slate-600">
                                            Role: <span className="font-medium text-slate-800">{roleLabel}</span>
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="px-6 py-4 space-y-4">
                                {branchAddress && (
                                    <div className="flex items-start gap-2.5 text-sm text-slate-600">
                                        <FiMapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                                        <span>{branchAddress}</span>
                                    </div>
                                )}
                                {(branch?.mobile || branch?.email) && (
                                    <div className="rounded-lg border border-slate-100 bg-slate-50/80 px-3.5 py-3 space-y-2">
                                        {branch?.mobile && (
                                            <div className="flex items-center gap-2 text-sm text-slate-700">
                                                <FiPhone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                                {formatPhone(branch.mobile, null)}
                                            </div>
                                        )}
                                        {branch?.email && (
                                            <div className="flex items-center gap-2 text-sm text-slate-700">
                                                <FiMail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                                <span className="truncate">{branch.email}</span>
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div className="rounded-lg border border-slate-200 px-3.5 py-3">
                                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-2">
                                            Invited user
                                        </p>
                                        <div className="space-y-1.5 text-sm text-slate-700">
                                            <div className="flex items-center gap-2 font-medium text-slate-900">
                                                <FiUser className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                                <span className="truncate">{invitedUser?.name || '—'}</span>
                                            </div>
                                            {invitedUser?.email && (
                                                <div className="flex items-center gap-2 truncate">
                                                    <FiMail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                                    <span className="truncate">{invitedUser.email}</span>
                                                </div>
                                            )}
                                            {formatPhone(invitedUser?.mobile, invitedUser?.country_code) && (
                                                <div className="flex items-center gap-2">
                                                    <FiPhone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                                    {formatPhone(invitedUser.mobile, invitedUser.country_code)}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="rounded-lg border border-slate-200 px-3.5 py-3">
                                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-2">
                                            Invited by
                                        </p>
                                        <div className="space-y-1.5 text-sm text-slate-700">
                                            <div className="flex items-center gap-2 font-medium text-slate-900">
                                                <FiUser className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                                <span className="truncate">{invitedBy?.name || '—'}</span>
                                            </div>
                                            {invitedBy?.email && (
                                                <div className="flex items-center gap-2 truncate">
                                                    <FiMail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                                    <span className="truncate">{invitedBy.email}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {accepted ? (
                                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-4 text-center">
                                        <FiCheckCircle className="mx-auto h-8 w-8 text-emerald-500 mb-2" />
                                        <p className="text-sm font-semibold text-emerald-900">Invitation accepted</p>
                                        <p className="mt-1 text-xs text-emerald-800">
                                            You joined {acceptResult?.branch_name || branch?.name}. You can sign in to access your account.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="flex flex-col sm:flex-row gap-2 pt-1">
                                        <button
                                            type="button"
                                            onClick={handleAccept}
                                            disabled={accepting}
                                            className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                                        >
                                            {accepting ? (
                                                <>
                                                    <FiRefreshCw className="w-4 h-4 animate-spin" />
                                                    Accepting…
                                                </>
                                            ) : (
                                                <>
                                                    <FiCheckCircle className="w-4 h-4" />
                                                    Accept invitation
                                                </>
                                            )}
                                        </button>
                                        <Link
                                            to="/login"
                                            className="flex-1 inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 text-center"
                                        >
                                            Sign in
                                        </Link>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>

                <p className="mt-4 text-center text-xs text-slate-500">
                    Invitation links are single-use. If the admin resent the invite, use the latest email link.
                </p>
            </motion.div>
        </div>
    );
};

export default InvitationRequest;
