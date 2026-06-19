import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    FiUser,
    FiMail,
    FiArrowRight,
    FiArrowLeft,
    FiRefreshCw,
    FiCheckCircle,
    FiCheck,
    FiHome,
    FiShield,
    FiChevronRight,
    FiTrendingUp
} from 'react-icons/fi';
import { GoogleLogin } from '@react-oauth/google';
import { fetchWhatsappChannel } from './broadcast/whatsapp/whatsappChannelStore';

const BASE_URL = 'https://api.ooms.in/api/v1';

const Login = () => {
    const navigate = useNavigate();
    const [phase, setPhase] = useState(1);
    const [loading, setLoading] = useState(false);
    const [fullScreenLoading, setFullScreenLoading] = useState(false);
    const [formData, setFormData] = useState({ login_id: '', otp: '' });
    const [branches, setBranches] = useState([]);
    const [selectedBranch, setSelectedBranch] = useState('');
    const [otpExpireTime, setOtpExpireTime] = useState(null);
    const [loginResponse, setLoginResponse] = useState(null);
    const [showBranchSelection, setShowBranchSelection] = useState(false);
    const [loginSuccess, setLoginSuccess] = useState(false);
    const [activeSocialLogin, setActiveSocialLogin] = useState(null);
    const [isValidEmail, setIsValidEmail] = useState(true);
    const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
    const [countdown, setCountdown] = useState(30);

    const identifierRef = useRef(null);
    const otpRefs = useRef([...Array(6)].map(() => React.createRef()));

    useEffect(() => {
        if (phase === 1) {
            setTimeout(() => { identifierRef.current?.focus(); }, 100);
        }
    }, [phase]);

    useEffect(() => {
        if (phase === 2 && !showBranchSelection && !loginSuccess) {
            setTimeout(() => { otpRefs.current[0]?.current?.focus(); }, 300);
        }
    }, [phase, showBranchSelection, loginSuccess]);

    useEffect(() => {
        let timer;
        if (phase === 2 && countdown > 0) {
            timer = setInterval(() => { setCountdown(prev => prev - 1); }, 1000);
        }
        return () => clearInterval(timer);
    }, [phase, countdown]);

    const validateLoginId = (val) => {
        if (!val) return true;
        if (val.includes('@')) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return emailRegex.test(val);
        } else {
            const phoneRegex = /^\d{10}$/;
            return phoneRegex.test(val);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (name === 'login_id') setIsValidEmail(validateLoginId(value));
    };

    const handleOtpChange = (index, value) => {
        if (value.length <= 1 && /^\d*$/.test(value)) {
            const newOtpDigits = [...otpDigits];
            newOtpDigits[index] = value;
            setOtpDigits(newOtpDigits);
            setFormData(prev => ({ ...prev, otp: newOtpDigits.join('') }));
            if (value && index < 5) otpRefs.current[index + 1]?.current?.focus();
        }
    };

    const handleOtpKeyDown = (index, e) => {
        if (e.key === 'Backspace') {
            if (!otpDigits[index] && index > 0) {
                const newOtpDigits = [...otpDigits];
                newOtpDigits[index - 1] = '';
                setOtpDigits(newOtpDigits);
                setFormData(prev => ({ ...prev, otp: newOtpDigits.join('') }));
                otpRefs.current[index - 1]?.current?.focus();
            } else if (otpDigits[index]) {
                const newOtpDigits = [...otpDigits];
                newOtpDigits[index] = '';
                setOtpDigits(newOtpDigits);
                setFormData(prev => ({ ...prev, otp: newOtpDigits.join('') }));
            }
        }
    };

    const handlePaste = (e) => {
        e.preventDefault();
        const pasteData = e.clipboardData.getData('text').trim();
        if (/^\d{6}$/.test(pasteData)) {
            const digits = pasteData.split('');
            setOtpDigits(digits);
            setFormData(prev => ({ ...prev, otp: pasteData }));
            otpRefs.current[5]?.current?.focus();
        }
    };

    const handleSendOtp = async (e) => {
        e.preventDefault();
        if (!formData.login_id) { alert('Please enter your mobile number or email'); return; }
        if (!validateLoginId(formData.login_id)) { setIsValidEmail(false); alert('Please enter a valid email address or 10-digit mobile number'); return; }
        setLoading(true);
        try {
            const response = await fetch(`${BASE_URL}/auth/login/send-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ login_id: formData.login_id })
            });
            const result = await response.json();
            if (result.success) {
                setPhase(2);
                setCountdown(30);
                setOtpExpireTime(result.expire);
            } else {
                alert(result.message || 'Error sending OTP');
            }
        } catch (error) {
            console.error('Error sending OTP:', error);
            alert('Error sending OTP. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleOtpSubmit = async (e) => {
        if (e) e.preventDefault();
        if (formData.otp.length !== 6) { alert('Please enter 6-digit OTP'); return; }
        setLoading(true);
        try {
            const response = await fetch(`${BASE_URL}/auth/login/verify-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ login_id: formData.login_id, otp: formData.otp })
            });
            const result = await response.json();
            if (result.success) {
                setLoginResponse(result);
                if (result.branches && result.branches.length > 0) {
                    setBranches(result.branches);
                    setShowBranchSelection(true);
                } else {
                    handleCompleteLogin(result, null);
                }
            } else {
                alert(result.message || 'Login failed');
            }
        } catch (error) {
            console.error('Error verifying OTP:', error);
            alert('Error verifying OTP. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleAuth = async (credentialResponse) => {
        setActiveSocialLogin('Google');
        setLoading(true);
        try {
            const idToken = credentialResponse.credential;
            const response = await fetch(`${BASE_URL}/auth/google-auth`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ google_token: idToken })
            });
            const result = await response.json();
            if (!response.ok || !result.success) throw new Error(result.message || 'Authentication failed');
            console.log('Google auth successful:', result);
            localStorage.setItem('user_token', result.token);
            localStorage.setItem('user_username', result.username);
            localStorage.setItem('user_email', result.profile.email);
            localStorage.setItem('user_name', result.profile.name);
            localStorage.setItem('user_is_new', result.is_new_user ? 'true' : 'false');
            setLoginResponse(result);
            if (result.branches && result.branches.length > 0) {
                setBranches(result.branches);
                setShowBranchSelection(true);
                setActiveSocialLogin(null);
                setLoading(false);
            } else {
                handleCompleteLogin(result, null);
            }
        } catch (error) {
            console.error('Google Auth Error:', error);
            alert('Authentication failed: ' + error.message);
            setActiveSocialLogin(null);
            setLoading(false);
        }
    };

    const handleCompleteLogin = (result, branchId) => {
        localStorage.setItem('user_token', result.token);
        localStorage.setItem('user_username', result.username);
        localStorage.setItem('user_email', result.profile?.email || formData.login_id);
        localStorage.setItem('user_name', result.profile?.name || result.username);
        if (result.branches) localStorage.setItem('user_branches', JSON.stringify(result.branches));
        if (result.expire_date) localStorage.setItem('token_expire', result.expire_date);
        if (branchId) {
            localStorage.setItem('branch_id', branchId);
            const selectedBranchInfo = result.branches?.find(b => b.branch_id === branchId);
            if (selectedBranchInfo) {
                localStorage.setItem('branch_name', selectedBranchInfo.name);
                localStorage.setItem('branch_owned', selectedBranchInfo.owned ? 'true' : 'false');
            }
        }
        setLoginSuccess(true);
        setShowBranchSelection(false);
        fetchWhatsappChannel().catch(() => { });
        const welcomeName = result.profile?.name || result.username || 'User';
        alert(`Welcome ${welcomeName}! Login successful!`);
        setTimeout(() => { window.location.href = '/'; }, 1500);
    };

    const handleBranchSelect = (branchId) => {
        setSelectedBranch(branchId);
        handleCompleteLogin(loginResponse, branchId);
    };

    const handleResendOtp = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${BASE_URL}/auth/login/send-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ login_id: formData.login_id })
            });
            const result = await response.json();
            if (result.success) {
                setOtpExpireTime(result.expire);
                setOtpDigits(['', '', '', '', '', '']);
                setFormData(prev => ({ ...prev, otp: '' }));
                setCountdown(30);
                setTimeout(() => { otpRefs.current[0]?.current?.focus(); }, 100);
            } else {
                alert(result.message || 'Error resending OTP');
            }
        } catch (error) {
            console.error('Error resending OTP:', error);
            alert('Error resending OTP. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // ── FULL SCREEN LOADING ──────────────────────────────────────────────────
    if (fullScreenLoading) {
        return (
            <div className="min-h-screen bg-[#06080f] flex items-center justify-center font-sans">
                <div className="text-center text-white animate-fade-in">
                    <div className="w-14 h-14 border-[3px] border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mx-auto mb-6"></div>
                    <h2 className="text-xl font-semibold mb-1.5">Loading...</h2>
                    <p className="text-slate-500 text-sm">Preparing your dashboard</p>
                </div>
            </div>
        );
    }

    return (
        <div className="ooms-root min-h-screen bg-white flex flex-col md:flex-row overflow-hidden">
            {/* Fonts */}
            <link rel="preconnect" href="https://fonts.googleapis.com" />
            <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="true" />
            <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />

            {/* ═══════════════════════════════════════════════
                LEFT — Dark Brand Panel
            ═══════════════════════════════════════════════ */}
            <div className="hidden md:flex md:w-[46%] bg-[#06080f] text-white flex-col justify-between relative overflow-hidden select-none p-10 lg:p-14">

                {/* Subtle grid lines */}
                <div className="absolute inset-0 pointer-events-none"
                    style={{
                        backgroundImage: `linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
                                          linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)`,
                        backgroundSize: '40px 40px'
                    }}
                />

                {/* Radial glows */}
                <div className="absolute -top-32 -right-32 w-[480px] h-[480px] rounded-full pointer-events-none"
                    style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.14) 0%, transparent 70%)' }} />
                <div className="absolute -bottom-32 -left-32 w-[420px] h-[420px] rounded-full pointer-events-none"
                    style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.10) 0%, transparent 70%)' }} />

                {/* ── Brand ── */}
                <div className="relative z-10 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/30 border border-white/10">
                        <FiShield className="text-white text-lg" />
                    </div>
                    <div>
                        <span className="text-lg font-bold tracking-tight text-white leading-none">OOMS</span>
                        <span className="block text-[10px] text-slate-500 font-medium tracking-widest uppercase mt-0.5">OneSaaS Office Mgmt</span>
                    </div>
                </div>

                {/* ── Hero ── */}
                <div className="relative z-10 my-auto">
                    <div className="inline-flex items-center gap-2 bg-white/[0.05] border border-white/[0.08] rounded-full px-3 py-1.5 mb-6">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                        <span className="text-[11px] text-slate-400 font-semibold tracking-wider uppercase">All systems operational</span>
                    </div>

                    <h1 className="text-4xl lg:text-[2.75rem] font-extrabold text-white tracking-tight leading-[1.15] mb-4">
                        Your office,<br />
                        <span style={{ background: 'linear-gradient(135deg, #818cf8 0%, #a78bfa 50%, #c4b5fd 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                            managed right.
                        </span>
                    </h1>
                    <p className="text-slate-400 text-[13px] leading-relaxed max-w-xs mb-10">
                        Sign in to access your dashboard, track task progress, and manage clients seamlessly.
                    </p>

                    {/* ── Info cards ── */}
                    <div className="space-y-3">
                        {/* Card 1 — Office Status */}
                        <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-4 backdrop-blur-sm hover:bg-white/[0.05] hover:border-white/[0.12] transition-all duration-300 group">
                            <div className="flex items-center justify-between mb-3.5">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
                                        <FiCheck className="text-emerald-400 text-xs" />
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-bold uppercase tracking-widest text-slate-600">Office Status</p>
                                        <p className="text-[12px] font-semibold text-slate-200 mt-0.5">Daily Compliance Filed</p>
                                    </div>
                                </div>
                                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 rounded-full px-2 py-0.5">✓ Filed</span>
                            </div>
                            <div className="w-full h-1 bg-white/[0.05] rounded-full overflow-hidden">
                                <div className="h-full rounded-full w-[95%]"
                                    style={{ background: 'linear-gradient(90deg, #10b981, #34d399)', boxShadow: '0 0 10px rgba(16,185,129,0.35)' }} />
                            </div>
                            <p className="text-[10px] text-slate-600 mt-2">Processing complete</p>
                        </div>

                        {/* Card 2 — Avg Resolution */}
                        <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-4 backdrop-blur-sm hover:bg-white/[0.05] hover:border-white/[0.12] transition-all duration-300">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-[9px] font-bold uppercase tracking-widest text-slate-600 mb-1">Avg Task Resolution</p>
                                    <p className="text-2xl font-extrabold text-slate-100 leading-none">1.8 <span className="text-sm font-semibold text-slate-400">hrs</span></p>
                                </div>
                                <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                                    <FiTrendingUp className="text-indigo-400 text-base" />
                                </div>
                            </div>
                            <div className="w-full h-px bg-white/[0.06] mt-3 mb-2.5" />
                            <p className="text-[10px] text-slate-600">Based on 124 active client tasks today</p>
                        </div>
                    </div>
                </div>

                {/* ── Footer stats ── */}
                <div className="relative z-10 grid grid-cols-3 gap-4 pt-6 border-t border-white/[0.06]">
                    {[['10K+', 'Clients'], ['99.9%', 'Uptime'], ['4.9★', 'Rating']].map(([val, label]) => (
                        <div key={label}>
                            <span className="text-xl font-extrabold text-white block">{val}</span>
                            <span className="text-[9px] font-bold uppercase tracking-widest text-slate-600 block mt-1">{label}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* ═══════════════════════════════════════════════
                RIGHT — Form Panel
            ═══════════════════════════════════════════════ */}
            <div className="w-full md:w-[54%] min-h-screen bg-white flex flex-col relative">

                {/* Mobile brand header */}
                <div className="flex md:hidden items-center gap-3 px-8 pt-8 pb-0">
                    <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center shadow shadow-indigo-600/30">
                        <FiShield className="text-white text-base" />
                    </div>
                    <span className="text-base font-bold text-slate-900">OOMS</span>
                </div>

                {/* Centered form */}
                <div className="flex-1 flex flex-col justify-center px-8 sm:px-14 lg:px-20 py-10">
                    <div className="w-full max-w-[360px] mx-auto">

                        {/* Progress bar */}
                        {!loginSuccess && !showBranchSelection && (
                            <div className="flex gap-1.5 mb-10">
                                <div className={`h-[3px] flex-1 rounded-full transition-all duration-500 ${phase >= 1 ? 'bg-indigo-600' : 'bg-slate-100'}`} />
                                <div className={`h-[3px] flex-1 rounded-full transition-all duration-500 ${phase >= 2 ? 'bg-indigo-600' : 'bg-slate-100'}`} />
                            </div>
                        )}

                        {/* ── PHASE 1: Identifier ── */}
                        {phase === 1 && !showBranchSelection && !loginSuccess && (
                            <div className="animate-fade-in">
                                <p className="text-[11px] font-bold uppercase tracking-widest text-indigo-500 mb-3">Step 1 of 2</p>
                                <h2 className="text-[28px] font-extrabold text-[#06080f] tracking-tight leading-tight mb-2">Welcome back</h2>
                                <p className="text-slate-400 text-sm leading-relaxed mb-8">Enter your mobile number or email to receive a one-time password.</p>

                                <form onSubmit={handleSendOtp} className="space-y-5">
                                    <div>
                                        <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400 block mb-2.5">
                                            Mobile Number or Email
                                        </label>
                                        <div className="relative group">
                                            <input
                                                ref={identifierRef}
                                                type="text"
                                                name="login_id"
                                                value={formData.login_id}
                                                onChange={handleInputChange}
                                                className={`w-full pl-11 pr-4 py-[13px] text-[14px] font-medium bg-slate-50 border rounded-xl outline-none transition-all duration-200
                                                    placeholder:text-slate-300 text-slate-800
                                                    ${isValidEmail
                                                        ? 'border-slate-200 focus:border-indigo-500 focus:bg-white focus:ring-[3px] focus:ring-indigo-100'
                                                        : 'border-red-300 focus:border-red-500 focus:ring-[3px] focus:ring-red-100'
                                                    }`}
                                                placeholder="e.g. 9876543210 or you@company.com"
                                                required
                                            />
                                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                                                {/^\d+$/.test(formData.login_id || '') ? <FiUser size={16} /> : <FiMail size={16} />}
                                            </span>
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={loading || !formData.login_id}
                                        className={`w-full py-[13px] px-6 rounded-xl text-[14px] font-semibold flex items-center justify-center gap-2 transition-all duration-200 
                                            ${!formData.login_id || loading
                                                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                                : 'bg-[#06080f] hover:bg-[#10142a] text-white shadow-lg shadow-slate-950/10 hover:shadow-xl hover:shadow-slate-950/20 active:scale-[0.985]'
                                            }`}
                                    >
                                        {loading
                                            ? <><FiRefreshCw className="animate-spin" size={15} /> Sending OTP...</>
                                            : <>Send OTP <FiArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" /></>
                                        }
                                    </button>
                                </form>
                            </div>
                        )}

                        {/* ── PHASE 2: OTP ── */}
                        {phase === 2 && !showBranchSelection && !loginSuccess && (
                            <div className="animate-fade-in">
                                <p className="text-[11px] font-bold uppercase tracking-widest text-indigo-500 mb-3">Step 2 of 2</p>
                                <h2 className="text-[28px] font-extrabold text-[#06080f] tracking-tight leading-tight mb-2">Verify OTP</h2>
                                <p className="text-slate-400 text-sm leading-relaxed mb-8">
                                    We sent a 6-digit code to <span className="font-semibold text-slate-700">{formData.login_id}</span>
                                </p>

                                <div className="space-y-6">
                                    {/* OTP Boxes */}
                                    <div>
                                        <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400 block mb-4">
                                            Enter 6-digit OTP
                                        </label>
                                        <div className="grid grid-cols-6 gap-3">
                                            {otpDigits.map((digit, index) => (
                                                <input
                                                    key={index}
                                                    ref={otpRefs.current[index]}
                                                    type="text"
                                                    value={digit}
                                                    onChange={(e) => handleOtpChange(index, e.target.value)}
                                                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                                                    onPaste={handlePaste}
                                                    style={{
                                                        width: '100%',
                                                        aspectRatio: '1 / 1',
                                                        textAlign: 'center',
                                                        fontSize: '22px',
                                                        fontWeight: '700',
                                                        borderRadius: '14px',
                                                        outline: 'none',
                                                        transition: 'all 0.15s ease',
                                                        caretColor: '#6366f1',
                                                        border: digit
                                                            ? '2px solid #6366f1'
                                                            : '1.5px solid #e2e8f0',
                                                        background: digit ? '#eef2ff' : '#f8fafc',
                                                        color: digit ? '#4338ca' : '#0f172a',
                                                        boxShadow: digit
                                                            ? '0 0 0 4px rgba(99,102,241,0.1)'
                                                            : 'none',
                                                    }}
                                                    maxLength="1"
                                                    inputMode="numeric"
                                                />
                                            ))}
                                        </div>

                                        {/* Progress dots */}
                                        <div className="flex items-center justify-center gap-1.5 mt-4">
                                            {otpDigits.map((digit, i) => (
                                                <div
                                                    key={i}
                                                    style={{
                                                        width: digit ? '20px' : '6px',
                                                        height: '4px',
                                                        borderRadius: '99px',
                                                        background: digit ? '#6366f1' : '#e2e8f0',
                                                        transition: 'all 0.2s ease',
                                                    }}
                                                />
                                            ))}
                                        </div>
                                    </div>

                                    {/* Actions row */}
                                    <div className="flex items-center justify-between">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setPhase(1);
                                                setOtpDigits(['', '', '', '', '', '']);
                                                setFormData(prev => ({ ...prev, otp: '' }));
                                            }}
                                            className="text-[12px] font-semibold text-slate-400 hover:text-slate-700 flex items-center gap-1.5 transition-colors"
                                        >
                                            <FiArrowLeft size={13} /> Change number
                                        </button>
                                        {countdown > 0
                                            ? (
                                                <span className="text-[12px] text-slate-400 font-medium flex items-center gap-1.5">
                                                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-100 text-[10px] font-bold text-slate-500">{countdown}</span>
                                                    Resend OTP
                                                </span>
                                            )
                                            : (
                                                <button type="button" onClick={handleResendOtp}
                                                    className="text-[12px] font-bold text-indigo-600 hover:text-indigo-700 transition-colors flex items-center gap-1">
                                                    <FiRefreshCw size={11} /> Resend OTP
                                                </button>
                                            )
                                        }
                                    </div>

                                    {/* Verify button */}
                                    <button
                                        onClick={handleOtpSubmit}
                                        disabled={loading || formData.otp.length !== 6}
                                        className={`w-full py-[13px] px-6 rounded-xl text-[14px] font-semibold flex items-center justify-center gap-2 transition-all duration-200
                                            ${formData.otp.length !== 6 || loading
                                                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                                : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/20 hover:shadow-xl hover:shadow-indigo-600/30 active:scale-[0.985]'
                                            }`}
                                    >
                                        {loading
                                            ? <><FiRefreshCw className="animate-spin" size={15} /> Verifying...</>
                                            : <>Verify & Sign In <FiArrowRight size={15} /></>
                                        }
                                    </button>

                                    {/* Testing hint */}
                                    <div className="flex items-center justify-center gap-2 py-2.5 px-4 bg-slate-50 border border-slate-100 rounded-xl">
                                        <FiShield size={12} className="text-indigo-400 flex-shrink-0" />
                                        <p className="text-[11px] text-slate-400 font-medium">
                                            Testing? Use OTP: <span className="font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded ml-0.5">123456</span>
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ── BRANCH SELECTION ── */}
                        {showBranchSelection && (
                            <div className="animate-fade-in space-y-5">
                                <div className="flex items-start gap-3 bg-emerald-50 border border-emerald-100 rounded-2xl p-4">
                                    <FiCheckCircle className="text-emerald-500 mt-0.5 flex-shrink-0" size={18} />
                                    <div>
                                        <p className="text-[13px] font-bold text-emerald-800">Identity verified!</p>
                                        <p className="text-[12px] text-emerald-600 mt-0.5">Select your branch to continue</p>
                                    </div>
                                </div>

                                <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400 block">
                                    Available Branches
                                </label>

                                <div className="space-y-2.5 max-h-72 overflow-y-auto">
                                    {branches.map((branch) => (
                                        <button
                                            key={branch.branch_id}
                                            type="button"
                                            onClick={() => handleBranchSelect(branch.branch_id)}
                                            disabled={loading}
                                            className={`w-full p-4 text-left rounded-xl border-[1.5px] flex items-center justify-between transition-all duration-200
                                                ${selectedBranch === branch.branch_id
                                                    ? 'border-indigo-500 bg-indigo-50/60 shadow-sm shadow-indigo-100'
                                                    : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50 active:scale-[0.99]'
                                                }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all
                                                    ${selectedBranch === branch.branch_id ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}>
                                                    <FiHome size={15} />
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-[13px] font-semibold text-slate-800">{branch.name}</span>
                                                        {branch.owned && (
                                                            <span className="text-[9px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-200 px-1.5 py-0.5 rounded-full">Owned</span>
                                                        )}
                                                    </div>
                                                    <span className="text-[11px] text-slate-400 font-medium">ID: {branch.branch_id}</span>
                                                </div>
                                            </div>
                                            {selectedBranch === branch.branch_id
                                                ? <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center flex-shrink-0">
                                                    <FiCheck className="text-white" size={12} />
                                                </div>
                                                : <FiChevronRight className="text-slate-300 flex-shrink-0" size={16} />
                                            }
                                        </button>
                                    ))}
                                </div>

                                <button
                                    type="button"
                                    onClick={() => { setShowBranchSelection(false); setPhase(1); setActiveSocialLogin(null); }}
                                    className="w-full py-3 px-6 border border-slate-200 text-slate-500 text-[13px] font-semibold rounded-xl hover:bg-slate-50 active:scale-[0.99] flex items-center justify-center gap-2 transition-all"
                                >
                                    <FiArrowLeft size={14} /> Back to Login
                                </button>
                            </div>
                        )}

                        {/* ── SUCCESS ── */}
                        {loginSuccess && (
                            <div className="text-center py-10 animate-fade-in">
                                <div className="w-[72px] h-[72px] rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-emerald-500/20 animate-bounce"
                                    style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
                                    <FiCheck className="text-white" size={30} />
                                </div>
                                <h3 className="text-2xl font-extrabold text-[#06080f] mb-2">Login Successful!</h3>
                                <p className="text-slate-400 text-sm">Redirecting you to the dashboard...</p>
                            </div>
                        )}

                        {/* ── Divider + Google + Signup ── */}
                        {!loginSuccess && !showBranchSelection && (
                            <>
                                <div className="flex items-center gap-3 my-7">
                                    <div className="flex-1 h-px bg-slate-100" />
                                    <span className="text-[11px] font-bold text-slate-300 tracking-widest uppercase">or</span>
                                    <div className="flex-1 h-px bg-slate-100" />
                                </div>

                                <div className="flex justify-center mb-6">
                                    {activeSocialLogin === 'Google' ? (
                                        <div className="flex items-center justify-center gap-2 py-3 px-6 border border-slate-200 rounded-xl bg-slate-50 w-full">
                                            <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                                            <span className="text-[13px] font-semibold text-slate-600">Verifying...</span>
                                        </div>
                                    ) : (
                                        <div className="w-full flex justify-center">
                                            <GoogleLogin
                                                onSuccess={handleGoogleAuth}
                                                onError={() => { console.log('Google Login Failed'); setActiveSocialLogin(null); }}
                                                useOneTap={false}
                                                theme="outline"
                                                size="large"
                                                text="continue_with"
                                                shape="pill"
                                                width="320px"
                                            />
                                        </div>
                                    )}
                                </div>

                                <p className="text-center text-[13px] text-slate-400 font-medium">
                                    Don't have an account?{' '}
                                    <button
                                        type="button"
                                        onClick={() => navigate('/register')}
                                        className="text-indigo-600 font-bold hover:text-indigo-700 hover:underline transition-colors ml-0.5"
                                    >
                                        Create account
                                    </button>
                                </p>
                            </>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="text-center text-[11px] text-slate-300 pb-8 px-8">
                    By continuing, you agree to our{' '}
                    <button className="text-slate-400 hover:underline font-semibold transition-colors">Terms of Service</button>
                    {' '}and{' '}
                    <button className="text-slate-400 hover:underline font-semibold transition-colors">Privacy Policy</button>
                </div>
            </div>

            {/* Global styles */}
            <style>{`
                .ooms-root, .ooms-root * {
                    font-family: 'Plus Jakarta Sans', sans-serif !important;
                }
                @keyframes fade-in {
                    from { opacity: 0; transform: translateY(10px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in { animation: fade-in 0.35s ease-out forwards; }
            `}</style>
        </div>
    );
};

export default Login;