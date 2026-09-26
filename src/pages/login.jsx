import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
    FiArrowRight,
    FiArrowLeft,
    FiRefreshCw,
    FiCheckCircle,
    FiCheck,
    FiHome,
    FiChevronRight,
} from 'react-icons/fi';
import { fetchWhatsappChannel } from '../services/whatsappChannelStore';
import { fetchSmsChannel } from '../services/smsChannelStore';
import { fetchCallChannel } from '../services/callChannelStore';
import API_BASE_URL from '../utils/api-controller';
import {
    saveUserSessionToStorage,
} from '../utils/user-profile-storage';
import { applyBranchToSession } from '../services/branchSetupService';
import { clearUserPermissionCache } from '../utils/permission-helper';
import OomsAuthShell from '../components/auth/OomsAuthShell';
import AuthPortalSwitcher from '../components/auth/AuthPortalSwitcher';

const Login = () => {
    const navigate = useNavigate();
    const [phase, setPhase] = useState(1);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({ mobile: '', otp: '' });
    const [branches, setBranches] = useState([]);
    const [selectedBranch, setSelectedBranch] = useState('');
    const [loginResponse, setLoginResponse] = useState(null);
    const [showBranchSelection, setShowBranchSelection] = useState(false);
    const [loginSuccess, setLoginSuccess] = useState(false);
    const [isValidMobile, setIsValidMobile] = useState(true);
    const [otpDestination, setOtpDestination] = useState('');
    const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
    const [countdown, setCountdown] = useState(30);

    const mobileRef = useRef(null);
    const otpRefs = useRef([...Array(6)].map(() => React.createRef()));

    useEffect(() => {
        if (phase === 1) {
            setTimeout(() => { mobileRef.current?.focus(); }, 100);
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

    const normalizeLoginMobile = (value) => String(value || '').replace(/\D/g, '').slice(0, 10);

    const buildLoginPayload = () => ({
        mobile: normalizeLoginMobile(formData.mobile),
    });

    const validateMobile = (val) => {
        if (!val) return true;
        return /^\d{10}$/.test(val);
    };

    const handleMobileChange = (e) => {
        const value = normalizeLoginMobile(e.target.value);
        setFormData(prev => ({ ...prev, mobile: value }));
        setIsValidMobile(validateMobile(value));
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
        if (!formData.mobile) { toast.error('Please enter your mobile number'); return; }
        if (!validateMobile(formData.mobile)) {
            setIsValidMobile(false);
            toast.error('Please enter a valid 10-digit mobile number');
            return;
        }
        setLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/auth/login/send-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(buildLoginPayload())
            });
            const result = await response.json();
            if (result.success) {
                setPhase(2);
                setCountdown(30);
                setOtpDestination(result.mobile_masked || '');
                toast.success(result.message || 'OTP sent to your registered mobile number');
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
                body: JSON.stringify({ ...buildLoginPayload(), otp: formData.otp })
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

    const handleCompleteLogin = (result, branchId) => {
        const profileMobile = result.profile?.mobile || normalizeLoginMobile(formData.mobile);
        const profileEmail = result.profile?.email || '';

        saveUserSessionToStorage(result, {
            email: profileEmail,
            mobile: profileMobile,
        });

        clearUserPermissionCache(result.username, branchId || null);

        if (branchId) {
            const selectedBranchInfo = result.branches?.find((b) => b.branch_id === branchId);
            if (selectedBranchInfo) {
                applyBranchToSession(selectedBranchInfo);
            }
        }
        setLoginSuccess(true);
        setShowBranchSelection(false);
        fetchWhatsappChannel().catch(() => { });
        fetchSmsChannel().catch(() => { });
        fetchCallChannel().catch(() => { });
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
                body: JSON.stringify(buildLoginPayload())
            });
            const result = await response.json();
            if (result.success) {
                setOtpDestination(result.mobile_masked || otpDestination);
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

    return (
        <OomsAuthShell
            portalLabel="Office"
            features={[
                { icon: "📋", label: "Tasks & compliance tracking" },
                { icon: "👥", label: "Clients & firm management" },
                { icon: "💰", label: "Billing & finance registers" },
                { icon: "📣", label: "Broadcast & WhatsApp" },
                { icon: "👨‍💼", label: "Staff attendance & reports" },
                { icon: "🔐", label: "DSC, files & password vault" },
                { icon: "📅", label: "Recurring & compliance calendar" },
                { icon: "📊", label: "Dashboards & quick stats" },
            ]}
            footerNote="Secure office area — all access is monitored"
        >
            <AuthPortalSwitcher active="app" />

            {!loginSuccess && (
                <div className="text-center animate-fade-in">
                    <div className="w-12 h-12 rounded-2xl overflow-hidden bg-slate-950 flex items-center justify-center shadow-lg mb-2 mx-auto ring-1 ring-indigo-200">
                        <img src="/logo512.png" alt="OOMS" className="h-8 w-8 object-contain" />
                    </div>
                    <h2 className="text-2xl font-black text-slate-800 tracking-tight">Welcome back</h2>
                    <p className="text-xs text-slate-500 mt-1">
                        {showBranchSelection
                            ? 'Select a branch to continue'
                            : phase === 2
                                ? (otpDestination ? `Code sent to ${otpDestination}` : 'Enter the OTP sent to your mobile')
                                : 'Secure access to your office dashboard'}
                    </p>
                    {!showBranchSelection && (
                        <div className="flex gap-1.5 justify-center mt-3">
                            <div className={`h-[4px] w-8 rounded-full transition-all duration-300 ${phase >= 1 ? 'bg-[#5c3fe6]' : 'bg-slate-100'}`} />
                            <div className={`h-[4px] w-8 rounded-full transition-all duration-300 ${phase >= 2 ? 'bg-[#5c3fe6]' : 'bg-slate-100'}`} />
                            <div className={`h-[4px] w-8 rounded-full transition-all duration-300 ${showBranchSelection ? 'bg-[#5c3fe6]' : 'bg-slate-100'}`} />
                        </div>
                    )}
                </div>
            )}

            {phase === 1 && !showBranchSelection && !loginSuccess && (
                <div className="animate-fade-in space-y-4">
                    <form onSubmit={handleSendOtp} className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                                Mobile Number
                            </label>
                            <div className="relative">
                                <input
                                    ref={mobileRef}
                                    type="tel"
                                    name="mobile"
                                    value={formData.mobile}
                                    onChange={handleMobileChange}
                                    className={`w-full pl-10 pr-4 py-3 text-xs font-semibold bg-slate-50 border rounded-xl outline-none transition-all duration-200
                                        placeholder:text-slate-350 text-slate-800
                                        ${isValidMobile
                                            ? 'border-slate-200 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10'
                                            : 'border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-500/10'
                                        }`}
                                    placeholder="10-digit mobile number"
                                    inputMode="numeric"
                                    maxLength={10}
                                    required
                                />
                                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">📱</span>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading || formData.mobile.length !== 10}
                            className={`w-full py-3 px-6 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all duration-200 shadow-md shadow-indigo-500/5
                                ${formData.mobile.length !== 10 || loading
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

            {phase === 2 && !showBranchSelection && !loginSuccess && (
                <div className="animate-fade-in space-y-4">
                    <div className="text-center bg-slate-50 border border-slate-100 p-3 rounded-xl text-xs text-slate-500 font-semibold">
                        {otpDestination ? (
                            <>We sent a 6-digit code to your registered mobile <span className="text-slate-800 font-bold">{otpDestination}</span></>
                        ) : (
                            <>We sent a 6-digit code to your registered mobile number</>
                        )}
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

                        <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
                            <button
                                type="button"
                                onClick={() => {
                                    setPhase(1);
                                    setOtpDigits(['', '', '', '', '', '']);
                                    setFormData(prev => ({ ...prev, otp: '' }));
                                    setOtpDestination('');
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
                        onClick={() => { setShowBranchSelection(false); setPhase(1); }}
                        className="w-full py-2.5 border border-slate-200 text-slate-500 text-xs font-bold rounded-xl hover:bg-slate-50 transition-colors flex items-center justify-center gap-1.5"
                    >
                        <FiArrowLeft size={13} /> Back to Login
                    </button>
                </div>
            )}

            {loginSuccess && (
                <div className="text-center py-6 animate-fade-in space-y-4">
                    <div className="w-16 h-16 rounded-full bg-emerald-500 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20 animate-bounce">
                        <FiCheck className="text-white" size={28} />
                    </div>
                    <h3 className="text-xl font-black text-slate-800">Login Successful!</h3>
                    <p className="text-xs text-slate-400">Redirecting to your dashboard...</p>
                </div>
            )}

            {!loginSuccess && !showBranchSelection && phase === 1 && (
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
            )}

            {!loginSuccess && (
                <div className="flex items-center justify-center gap-6 text-[10px] text-slate-400 font-bold pt-1">
                    <span>🔒 SSL secured</span>
                    <span>👁️ Access logged</span>
                </div>
            )}
        </OomsAuthShell>
    );
};

export default Login;
