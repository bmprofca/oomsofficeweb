import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
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
import API_BASE_URL from '../utils/api-controller';
import {
    saveUserSessionToStorage,
} from '../utils/user-profile-storage';
import { applyBranchToSession } from '../services/branchSetupService';

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
        if (!formData.login_id) { toast.error('Please enter your mobile number or email'); return; }
        if (!validateLoginId(formData.login_id)) { setIsValidEmail(false); toast.error('Please enter a valid email address or 10-digit mobile number'); return; }
        setLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/auth/login/send-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ login_id: formData.login_id })
            });
            const result = await response.json();
            if (result.success) {
                setPhase(2);
                setCountdown(30);
                setOtpExpireTime(result.expire);
                toast.success(result.message || 'OTP sent successfully');
            } else {
                toast.error(result.message || 'Error sending OTP');
            }
        } catch (error) {
            console.error('Error sending OTP:', error);
            toast.error('Error sending OTP. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleOtpSubmit = async (e) => {
        if (e) e.preventDefault();
        if (formData.otp.length !== 6) { toast.error('Please enter 6-digit OTP'); return; }
        setLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/auth/login/verify-otp`, {
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
                toast.error(result.message || 'Login failed');
            }
        } catch (error) {
            console.error('Error verifying OTP:', error);
            toast.error('Error verifying OTP. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleAuth = async (credentialResponse) => {
        setActiveSocialLogin('Google');
        setLoading(true);
        try {
            const idToken = credentialResponse.credential;
            const response = await fetch(`${API_BASE_URL}/auth/google-auth`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ google_token: idToken })
            });
            const result = await response.json();
            if (!response.ok || !result.success) throw new Error(result.message || 'Authentication failed');
            console.log('Google auth successful:', result);
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
            toast.error('Authentication failed: ' + error.message);
            setActiveSocialLogin(null);
            setLoading(false);
        }
    };

    const handleCompleteLogin = (result, branchId) => {
        saveUserSessionToStorage(result, {
            email: formData.login_id?.includes('@') ? formData.login_id : '',
            mobile: /^\d{10}$/.test(String(formData.login_id || '').replace(/\D/g, '').slice(-10))
                ? String(formData.login_id).replace(/\D/g, '').slice(-10)
                : '',
        });

        if (branchId) {
            const selectedBranchInfo = result.branches?.find((b) => b.branch_id === branchId);
            if (selectedBranchInfo) {
                applyBranchToSession(selectedBranchInfo);
            }
        }
        setLoginSuccess(true);
        setShowBranchSelection(false);
        fetchWhatsappChannel().catch(() => { });
        const welcomeName = result.profile?.name || result.username || 'User';
        toast.success(`Welcome ${welcomeName}! Login successful!`);
        setTimeout(() => {
            const redirect = sessionStorage.getItem('post_login_redirect');
            if (redirect) {
                sessionStorage.removeItem('post_login_redirect');
                window.location.href = redirect;
            } else if (!branchId && (!result.branches || result.branches.length === 0)) {
                window.location.href = '/branch-setup';
            } else {
                window.location.href = '/';
            }
        }, 1500);
    };

    const handleBranchSelect = (branchId) => {
        setSelectedBranch(branchId);
        handleCompleteLogin(loginResponse, branchId);
    };

    const handleResendOtp = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/auth/login/send-otp`, {
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
                toast.success('OTP has been resent successfully');
                setTimeout(() => { otpRefs.current[0]?.current?.focus(); }, 100);
            } else {
                toast.error(result.message || 'Error resending OTP');
            }
        } catch (error) {
            console.error('Error resending OTP:', error);
            toast.error('Error resending OTP. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // ── FULL SCREEN LOADING ──────────────────────────────────────────────────
    if (fullScreenLoading) {
        return (
            <div className="h-screen h-[100dvh] overflow-hidden bg-[#06080f] flex items-center justify-center font-sans">
                <div className="text-center text-white animate-fade-in">
                    <div className="w-14 h-14 border-[3px] border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mx-auto mb-6"></div>
                    <h2 className="text-xl font-semibold mb-1.5">Loading...</h2>
                    <p className="text-slate-500 text-sm">Preparing your dashboard</p>
                </div>
            </div>
        );
    }

    return (
        <div className="ooms-root h-screen h-[100dvh] overflow-hidden bg-[#f3f6fc] flex items-center justify-center p-4 sm:p-6 font-sans">
            {/* Fonts */}
            <link rel="preconnect" href="https://fonts.googleapis.com" />
            <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="true" />
            <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />

            {/* Main Premium Card Container */}
            <div className="bg-white rounded-[32px] shadow-[0_20px_50px_rgba(99,102,241,0.06)] border border-slate-100/80 flex flex-col md:flex-row overflow-hidden w-full max-w-[920px] h-full md:h-[580px] max-h-full relative">

                {/* ═══════════════════════════════════════════════
                    LEFT — Brand Panel (Premium Dark Widget Art)
                ═══════════════════════════════════════════════ */}
                <div className="hidden md:flex md:w-[46%] bg-[#080b18] text-white flex-col justify-between p-8 relative overflow-hidden select-none">
                    {/* Dotted Grid Background */}
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_20%,_#080b18_80%),_radial-gradient(#ffffff04_1px,_transparent_1px)] [background-size:24px_24px] pointer-events-none"></div>

                    {/* Glowing Radial Blobs */}
                    <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-[radial-gradient(circle_at_center,_#3b82f612_0%,_transparent_70%)] filter blur-3xl pointer-events-none"></div>
                    <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-[radial-gradient(circle_at_center,_#8b5cf612_0%,_transparent_70%)] filter blur-3xl pointer-events-none"></div>

                    {/* Logo & Brand */}
                    <div className="relative z-10 flex items-center space-x-3">
                        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/20 border border-white/[0.08]">
                            <FiShield className="text-xl text-white" />
                        </div>
                        <span className="text-xl font-bold tracking-tight text-white">OOMS</span>
                    </div>

                    {/* Widgets Visual Art (Glassmorphic Mockup) */}
                    <div className="relative z-10 my-auto py-6 flex flex-col items-center">

                        {/* Upper Widget: User Card */}
                        <div className="w-full max-w-[240px] bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-4 shadow-xl relative animate-float">

                            {/* Compliant Badge */}
                            <span className="absolute -top-2 -right-2 bg-[#10b981] border border-emerald-400 text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-md flex items-center gap-0.5">
                                ✓ Compliant
                            </span>

                            {/* Profile Info */}
                            <div className="flex items-center gap-2.5 mb-3">
                                <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center text-white text-[10px]">
                                    👤
                                </div>
                                <div className="space-y-1.5 flex-1">
                                    <div className="h-2 w-20 bg-white/30 rounded-full" />
                                    <div className="h-1.5 w-12 bg-white/15 rounded-full" />
                                </div>
                            </div>

                            {/* Dots list */}
                            <div className="flex gap-1">
                                <div className="w-3 h-1.5 rounded-full bg-white/40" />
                                <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
                                <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
                                <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
                            </div>
                        </div>

                        {/* Lower Widget: Dashboard Summary Grid */}
                        <div className="w-full max-w-[240px] mt-4 grid grid-cols-2 gap-2.5">
                            {/* Card 1: Chart */}
                            <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl p-3 shadow-md flex flex-col justify-between min-h-[60px]">
                                <div className="flex justify-between items-start">
                                    <span className="text-xs">📊</span>
                                    <div className="w-2 h-2 rounded-full bg-emerald-400" />
                                </div>
                                <div className="h-1.5 w-12 bg-white/25 rounded-full mt-2" />
                            </div>
                            {/* Card 2: Tasks */}
                            <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl p-3 shadow-md flex flex-col justify-between min-h-[60px]">
                                <div className="flex justify-between items-start">
                                    <span className="text-xs">✅</span>
                                    <div className="w-2 h-2 rounded-full bg-blue-400" />
                                </div>
                                <div className="h-1.5 w-14 bg-white/25 rounded-full mt-2" />
                            </div>
                            {/* Card 3: Shield */}
                            <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl p-3 shadow-md flex flex-col justify-between min-h-[60px]">
                                <div className="flex justify-between items-start">
                                    <span className="text-xs">🛡️</span>
                                    <div className="w-2 h-2 rounded-full bg-purple-400" />
                                </div>
                                <div className="h-1.5 w-10 bg-white/25 rounded-full mt-2" />
                            </div>
                            {/* Card 4: Stats */}
                            <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl p-3 shadow-md flex flex-col justify-between min-h-[60px]">
                                <div className="flex justify-between items-start">
                                    <span className="text-xs">📈</span>
                                    <div className="w-2 h-2 rounded-full bg-amber-400" />
                                </div>
                                <div className="h-1.5 w-16 bg-white/25 rounded-full mt-2" />
                            </div>
                        </div>

                        {/* Floating Badges */}
                        {/* Live Alerts Badge */}
                        <div className="absolute right-[5%] top-[25%] bg-white/15 backdrop-blur-md border border-white/20 rounded-xl px-2.5 py-1 flex items-center gap-1 text-white text-[9px] font-bold shadow-lg animate-float-slow">
                            🔔 Live alerts
                        </div>
                        {/* SSL Secured Badge */}
                        <div className="absolute left-[5%] bottom-[12%] bg-white/15 backdrop-blur-md border border-white/20 rounded-xl px-2.5 py-1 flex items-center gap-1 text-white text-[9px] font-bold shadow-lg animate-float-medium">
                            🔒 SSL secured
                        </div>
                    </div>

                    {/* Bottom Status / Operational Info */}
                    <div className="relative z-10 flex items-center justify-between text-[10px] text-white/60 border-t border-white/10 pt-4">
                        <span>OneSaaS Office Suite</span>
                        <span>v0.4.0</span>
                    </div>
                </div>

                {/* ═══════════════════════════════════════════════
                    RIGHT — Form Panel
                ═══════════════════════════════════════════════ */}
                <div className="w-full md:w-[54%] flex flex-col justify-between p-6 sm:p-8 bg-white relative md:overflow-y-hidden overflow-y-auto scrollbar-hide">

                    {/* Top Right Mini Brand (Mobile Only) */}
                    <div className="flex md:hidden items-center justify-between w-full mb-6">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#4f35e3] to-[#3b82f6] flex items-center justify-center text-white shadow-md">
                                OO
                            </div>
                            <span className="text-sm font-bold text-slate-800">OOMS Admin</span>
                        </div>
                    </div>

                    {/* Centered Area */}
                    <div className="my-auto w-full max-w-[340px] mx-auto space-y-4">

                        {/* Shield icon & Title */}
                        {!loginSuccess && (
                            <div className="text-center">
                                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#4f35e3] to-[#3b82f6] flex items-center justify-center text-white shadow-lg mb-2 mx-auto">
                                    <FiShield size={20} />
                                </div>
                                <h2 className="text-2xl font-black text-slate-800 tracking-tight">Welcome back</h2>
                                <p className="text-xs text-slate-450 mt-1">Secure access to your dashboard</p>

                                {/* Step Progress Bar */}
                                {!showBranchSelection && (
                                    <div className="flex gap-1.5 justify-center mt-3">
                                        <div className={`h-[4px] w-8 rounded-full transition-all duration-300 ${phase >= 1 ? 'bg-[#5c3fe6]' : 'bg-slate-100'}`} />
                                        <div className={`h-[4px] w-8 rounded-full transition-all duration-300 ${phase >= 2 ? 'bg-[#5c3fe6]' : 'bg-slate-100'}`} />
                                        <div className={`h-[4px] w-8 rounded-full transition-all duration-300 ${showBranchSelection ? 'bg-[#5c3fe6]' : 'bg-slate-100'}`} />
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ── PHASE 1: Enter mobile / email ── */}
                        {phase === 1 && !showBranchSelection && !loginSuccess && (
                            <div className="animate-fade-in space-y-4">
                                <form onSubmit={handleSendOtp} className="space-y-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                                            Mobile Number or Email
                                        </label>
                                        <div className="relative">
                                            <input
                                                ref={identifierRef}
                                                type="text"
                                                name="login_id"
                                                value={formData.login_id}
                                                onChange={handleInputChange}
                                                className={`w-full pl-10 pr-4 py-3 text-xs font-semibold bg-slate-50 border rounded-xl outline-none transition-all duration-200
                                                    placeholder:text-slate-350 text-slate-800
                                                    ${isValidEmail
                                                        ? 'border-slate-200 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10'
                                                        : 'border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-500/10'
                                                    }`}
                                                placeholder="Enter your mobile number or email"
                                                required
                                            />
                                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                                                {/^\d+$/.test(formData.login_id || '') ? '📱' : '✉️'}
                                            </span>
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={loading || !formData.login_id}
                                        className={`w-full py-3 px-6 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all duration-200 shadow-md shadow-indigo-500/5
                                            ${!formData.login_id || loading
                                                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                                : 'bg-[#5c3fe6] hover:bg-[#4b30c5] text-white shadow-indigo-500/20 active:scale-[0.985]'
                                            }`}
                                    >
                                        {loading
                                            ? <><FiRefreshCw className="animate-spin" size={13} /> Sending OTP...</>
                                            : <>🔑 Request OTP</>
                                        }
                                    </button>
                                </form>
                            </div>
                        )}

                        {/* ── PHASE 2: Verify OTP ── */}
                        {phase === 2 && !showBranchSelection && !loginSuccess && (
                            <div className="animate-fade-in space-y-4">
                                <div className="text-center bg-slate-50 border border-slate-100 p-3 rounded-xl text-xs text-slate-500 font-semibold mb-4">
                                    We sent a 6-digit code to <span className="text-slate-800 font-bold">{formData.login_id}</span>
                                </div>

                                <div className="space-y-4">
                                    <div className="grid grid-cols-6 gap-2">
                                        {otpDigits.map((digit, index) => (
                                            <input
                                                key={index}
                                                ref={otpRefs.current[index]}
                                                type="text"
                                                value={digit}
                                                onChange={(e) => handleOtpChange(index, e.target.value)}
                                                onKeyDown={(e) => handleOtpKeyDown(index, e)}
                                                onPaste={handlePaste}
                                                className="w-full text-center text-lg font-bold rounded-xl border outline-none transition-all duration-150 py-2.5 bg-slate-50 border-slate-200 text-slate-800 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white"
                                                maxLength="1"
                                                inputMode="numeric"
                                            />
                                        ))}
                                    </div>

                                    {/* Action Row */}
                                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setPhase(1);
                                                setOtpDigits(['', '', '', '', '', '']);
                                                setFormData(prev => ({ ...prev, otp: '' }));
                                            }}
                                            className="hover:text-slate-700 flex items-center gap-1 transition-colors"
                                        >
                                            <FiArrowLeft size={12} /> Change number
                                        </button>
                                        {countdown > 0 ? (
                                            <span className="flex items-center gap-1">
                                                Resend OTP in <span className="text-[#5c3fe6]">{countdown}s</span>
                                            </span>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={handleResendOtp}
                                                className="text-[#5c3fe6] hover:text-[#4b30c5] transition-colors flex items-center gap-1"
                                            >
                                                <FiRefreshCw size={10} /> Resend OTP
                                            </button>
                                        )}
                                    </div>

                                    <button
                                        onClick={handleOtpSubmit}
                                        disabled={loading || formData.otp.length !== 6}
                                        className={`w-full py-3 px-6 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all duration-200 shadow-md shadow-indigo-500/5
                                            ${formData.otp.length !== 6 || loading
                                                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                                : 'bg-[#5c3fe6] hover:bg-[#4b30c5] text-white shadow-indigo-500/20 active:scale-[0.985]'
                                            }`}
                                    >
                                        {loading
                                            ? <><FiRefreshCw className="animate-spin" size={13} /> Verifying...</>
                                            : <>Verify & Sign In <FiArrowRight size={13} /></>
                                        }
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* ── BRANCH SELECTION ── */}
                        {showBranchSelection && (
                            <div className="animate-fade-in space-y-4">
                                <div className="flex items-start gap-2 bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-xs text-emerald-800 font-semibold">
                                    <FiCheckCircle className="text-emerald-500 mt-0.5 shrink-0" size={15} />
                                    <div>
                                        <p>Identity verified!</p>
                                        <p className="text-[11px] text-emerald-600 font-normal mt-0.5">Select a branch to complete sign in</p>
                                    </div>
                                </div>

                                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                                    {branches.map((branch) => (
                                        <button
                                            key={branch.branch_id}
                                            type="button"
                                            onClick={() => handleBranchSelect(branch.branch_id)}
                                            disabled={loading}
                                            className={`w-full p-3 text-left rounded-xl border flex items-center justify-between transition-all duration-150
                                                ${selectedBranch === branch.branch_id
                                                    ? 'border-indigo-500 bg-indigo-50/50 shadow-sm'
                                                    : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50'
                                                }`}
                                        >
                                            <div className="flex items-center gap-2.5">
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0
                                                    ${selectedBranch === branch.branch_id ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}>
                                                    <FiHome size={14} />
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-1">
                                                        <span className="text-xs font-bold text-slate-800">{branch.name}</span>
                                                        {branch.owned && (
                                                            <span className="text-[8px] font-bold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">Owned</span>
                                                        )}
                                                    </div>
                                                    <span className="text-[10px] text-slate-400">ID: {branch.branch_id}</span>
                                                </div>
                                            </div>
                                            <FiChevronRight size={14} className="text-slate-400" />
                                        </button>
                                    ))}
                                </div>

                                <button
                                    type="button"
                                    onClick={() => { setShowBranchSelection(false); setPhase(1); setActiveSocialLogin(null); }}
                                    className="w-full py-2.5 border border-slate-200 text-slate-500 text-xs font-bold rounded-xl hover:bg-slate-50 transition-colors flex items-center justify-center gap-1.5"
                                >
                                    <FiArrowLeft size={13} /> Back to Login
                                </button>
                            </div>
                        )}

                        {/* ── SUCCESS SCREEN ── */}
                        {loginSuccess && (
                            <div className="text-center py-6 animate-fade-in space-y-4">
                                <div className="w-16 h-16 rounded-full bg-emerald-500 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20 animate-bounce">
                                    <FiCheck className="text-white" size={28} />
                                </div>
                                <h3 className="text-xl font-black text-slate-800">Login Successful!</h3>
                                <p className="text-xs text-slate-400">Redirecting to your dashboard...</p>
                            </div>
                        )}

                        {/* ── Divider + Google Sign In ── */}
                        {!loginSuccess && !showBranchSelection && (
                            <div className="space-y-4">
                                <div className="flex items-center gap-3 my-3 text-[10px] text-slate-350 font-bold uppercase tracking-wider">
                                    <div className="flex-1 h-px bg-slate-100" />
                                    <span>or continue securely</span>
                                    <div className="flex-1 h-px bg-slate-100" />
                                </div>

                                <div className="flex justify-center">
                                    {activeSocialLogin === 'Google' ? (
                                        <div className="flex items-center justify-center gap-2 py-2.5 px-4 border border-slate-200 rounded-xl bg-slate-50 w-full text-xs font-semibold text-slate-600">
                                            <span className="w-3 h-3 border-2 border-indigo-650 border-t-transparent rounded-full animate-spin" />
                                            <span>Verifying google identity...</span>
                                        </div>
                                    ) : (
                                        <div className="w-full flex justify-center scale-95 origin-center">
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

                                <p className="text-center text-[12px] text-slate-400 font-semibold">
                                    Don't have an account?{' '}
                                    <button
                                        type="button"
                                        onClick={() => navigate('/register')}
                                        className="text-[#5c3fe6] font-bold hover:text-[#4b30c5] hover:underline transition-colors"
                                    >
                                        Create account
                                    </button>
                                </p>
                            </div>
                        )}

                        {/* Bottom security indicators */}
                        {!loginSuccess && (
                            <div className="flex items-center justify-center gap-6 text-[10px] text-slate-400 font-bold pt-2">
                                <span className="flex items-center gap-1"><span className="text-slate-500">🔒</span> SSL secured</span>
                                <span className="flex items-center gap-1"><span className="text-slate-500">👁️</span> Access logged</span>
                            </div>
                        )}
                    </div>

                    {/* Bottom Security Note */}
                    <div className="text-[10px] text-slate-400 font-semibold text-center mt-4 flex items-center justify-center gap-1">
                        <span>🛡️</span> Secure admin area - All access is monitored
                    </div>
                </div>
            </div>

            {/* Custom Styles for Keyframe Animations */}
            <style>{`
                .ooms-root, .ooms-root * {
                    font-family: 'Plus Jakarta Sans', sans-serif !important;
                }
                @keyframes fade-in {
                    from { opacity: 0; transform: translateY(10px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in { animation: fade-in 0.3s ease-out forwards; }
                
                @keyframes float {
                    0%, 100% { transform: translateY(0); }
                    50%      { transform: translateY(-6px); }
                }
                .animate-float { animation: float 4s ease-in-out infinite; }
                
                @keyframes float-medium {
                    0%, 100% { transform: translateY(0); }
                    50%      { transform: translateY(-4px); }
                }
                .animate-float-medium { animation: float-medium 3.5s ease-in-out infinite; }

                @keyframes float-slow {
                    0%, 100% { transform: translateY(0); }
                    50%      { transform: translateY(-8px); }
                }
                .animate-float-slow { animation: float-slow 5s ease-in-out infinite; }
            `}</style>
        </div>
    );
};

export default Login;