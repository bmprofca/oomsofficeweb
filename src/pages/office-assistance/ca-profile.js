import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
    FiArrowLeft,
    FiMail,
    FiMapPin,
    FiPhone,
    FiRefreshCw,
    FiUser,
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import { Header, Sidebar } from '../../components/header';
import { fetchCaProfile } from '../../services/caService';

const formatDate = (value) => {
    if (!value) return '—';
    const dt = new Date(value);
    if (Number.isNaN(dt.getTime())) return String(value);
    return dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatAddress = (address) => {
    if (!address || typeof address !== 'object') return '—';
    const parts = [
        address.address_line_1,
        address.address_line_2,
        address.city,
        address.district,
        address.state,
        address.country,
        address.pincode,
    ].filter(Boolean);
    return parts.length ? parts.join(', ') : '—';
};

const CAProfile = () => {
    const { username: usernameParam } = useParams();
    const username = decodeURIComponent(usernameParam || '').trim();
    const navigate = useNavigate();

    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(() => {
        const saved = localStorage.getItem('sidebarMinimized');
        return saved ? JSON.parse(saved) : false;
    });
    const [loading, setLoading] = useState(false);
    const [profile, setProfile] = useState(null);
    const [error, setError] = useState('');

    const loadProfile = useCallback(async () => {
        if (!username) {
            setError('Username is required');
            setProfile(null);
            return;
        }
        setLoading(true);
        setError('');
        try {
            const result = await fetchCaProfile(username);
            if (!result?.success) {
                throw new Error(result?.message || 'Failed to load CA profile');
            }
            const rows = Array.isArray(result.data) ? result.data : [];
            setProfile(rows[0] || null);
            if (!rows[0]) setError('Profile not found');
        } catch (e) {
            console.error('CA profile fetch:', e);
            setProfile(null);
            setError(e.response?.data?.message || e.message || 'Failed to load CA profile');
        } finally {
            setLoading(false);
        }
    }, [username]);

    useEffect(() => {
        loadProfile();
    }, [loadProfile]);

    useEffect(() => {
        localStorage.setItem('sidebarMinimized', JSON.stringify(isMinimized));
    }, [isMinimized]);

    useEffect(() => {
        document.body.style.overflow = mobileMenuOpen ? 'hidden' : 'auto';
        return () => {
            document.body.style.overflow = 'auto';
        };
    }, [mobileMenuOpen]);

    const displayName = profile?.name || username || 'CA Profile';
    const phone =
        profile?.mobile != null && profile.mobile !== ''
            ? `${profile.country_code ? `+${String(profile.country_code).replace(/^\+/, '')} ` : ''}${profile.mobile}`
            : '—';

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
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="flex items-center justify-between gap-4 mb-6">
                        <div className="flex items-center gap-3 min-w-0">
                            <button
                                type="button"
                                onClick={() => navigate('/staff/office-assistance/ca-list')}
                                className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900"
                            >
                                <FiArrowLeft className="w-4 h-4" />
                                Back
                            </button>
                            <div className="h-5 w-px bg-slate-200" />
                            <h1 className="text-xl font-bold text-slate-900 truncate">{displayName}</h1>
                        </div>
                        <button
                            type="button"
                            onClick={loadProfile}
                            disabled={loading}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                        >
                            <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                            Refresh
                        </button>
                    </div>

                    {error && !loading && (
                        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                            {error}
                        </div>
                    )}

                    {loading && !profile ? (
                        <div className="bg-white rounded-xl border border-slate-200 p-8 animate-pulse space-y-4">
                            <div className="h-20 w-20 rounded-full bg-slate-200" />
                            <div className="h-6 w-48 bg-slate-200 rounded" />
                            <div className="h-4 w-full bg-slate-200 rounded" />
                            <div className="h-4 w-2/3 bg-slate-200 rounded" />
                        </div>
                    ) : profile ? (
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                            <div className="px-6 py-6 border-b border-slate-200 bg-gradient-to-r from-indigo-50/80 to-white">
                                <div className="flex items-start gap-4">
                                    <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                                        <FiUser className="w-8 h-8 text-indigo-600" />
                                    </div>
                                    <div className="min-w-0">
                                        <h2 className="text-lg font-bold text-slate-900">{profile.name || '—'}</h2>
                                        <p className="text-sm text-slate-500 mt-0.5">@{profile.username || username}</p>
                                        {profile.user_type && (
                                            <span className="inline-flex mt-2 text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                                                {profile.user_type}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                        Contact
                                    </h3>
                                    <div className="space-y-3 text-sm">
                                        <div className="flex items-start gap-2 text-slate-700">
                                            <FiMail className="w-4 h-4 mt-0.5 text-slate-400 shrink-0" />
                                            <span>{profile.email || '—'}</span>
                                        </div>
                                        <div className="flex items-start gap-2 text-slate-700">
                                            <FiPhone className="w-4 h-4 mt-0.5 text-slate-400 shrink-0" />
                                            <span>{phone}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                        Personal
                                    </h3>
                                    <dl className="space-y-2 text-sm">
                                        <div className="flex justify-between gap-4">
                                            <dt className="text-slate-500">Date of birth</dt>
                                            <dd className="text-slate-800 font-medium">{formatDate(profile.date_of_birth)}</dd>
                                        </div>
                                        <div className="flex justify-between gap-4">
                                            <dt className="text-slate-500">Gender</dt>
                                            <dd className="text-slate-800 font-medium capitalize">{profile.gender || '—'}</dd>
                                        </div>
                                        <div className="flex justify-between gap-4">
                                            <dt className="text-slate-500">Status</dt>
                                            <dd className="text-slate-800 font-medium">
                                                {String(profile.status) === '1' ? 'Active' : 'Inactive'}
                                            </dd>
                                        </div>
                                    </dl>
                                </div>

                                {(profile.address_line_1 ||
                                    profile.city ||
                                    profile.state ||
                                    profile.pincode ||
                                    profile.address) && (
                                    <div className="md:col-span-2 space-y-3">
                                        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                            Address
                                        </h3>
                                        <div className="flex items-start gap-2 text-sm text-slate-700">
                                            <FiMapPin className="w-4 h-4 mt-0.5 text-slate-400 shrink-0" />
                                            <span>
                                                {formatAddress({
                                                    address_line_1: profile.address_line_1,
                                                    address_line_2: profile.address_line_2,
                                                    city: profile.city,
                                                    district: profile.district,
                                                    state: profile.state,
                                                    country: profile.country,
                                                    pincode: profile.pincode,
                                                    ...(profile.address || {}),
                                                })}
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : null}

                    {!loading && !profile && !error && (
                        <div className="text-center py-12 text-slate-500 text-sm">
                            No profile data available.{' '}
                            <Link to="/staff/office-assistance/ca-list" className="text-indigo-600 hover:text-indigo-800">
                                Return to CA list
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CAProfile;
