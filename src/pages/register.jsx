import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
    FiUser,
    FiMail,
    FiPhone,
    FiArrowRight,
    FiArrowLeft,
    FiRefreshCw,
    FiCheck,
} from 'react-icons/fi';
import API_BASE_URL from '../utils/api-controller';
import { fetchWhatsappChannel } from '../services/whatsappChannelStore';
import { fetchSmsChannel } from '../services/smsChannelStore';
import { fetchCallChannel } from '../services/callChannelStore';
import { saveUserSessionToStorage } from '../utils/user-profile-storage';
import AuthPortalSwitcher from '../components/auth/AuthPortalSwitcher';
import OomsAuthShell from '../components/auth/OomsAuthShell';

const OFFICE_FEATURES = [
    { icon: "📋", label: "Tasks & compliance tracking" },
    { icon: "👥", label: "Clients & firm management" },
    { icon: "💰", label: "Billing & finance registers" },
    { icon: "📣", label: "Broadcast & WhatsApp" },
    { icon: "👨‍💼", label: "Staff attendance & reports" },
    { icon: "🔐", label: "DSC, files & password vault" },
    { icon: "📅", label: "Recurring & compliance calendar" },
    { icon: "📊", label: "Dashboards & quick stats" },
];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MOBILE_REGEX = /^\d{10}$/;

const Register = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [loginSuccess, setLoginSuccess] = useState(false);
    const [otpChannel, setOtpChannel] = useState('mobile');
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        mobile: '',
        otp: ''
    });
    const [fieldErrors, setFieldErrors] = useState({
        email: '',
        mobile: ''
    });

    const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
    const nameRef = useRef(null);
    const otpRefs = useRef([...Array(6)].map(() => React.createRef()));

    useEffect(() => {
        if (step === 1) {
            setTimeout(() => {
                nameRef.current?.focus();
            }, 100);
        } else if (step === 2) {
            setTimeout(() => {
                otpRefs.current[0]?.current?.focus();
            }, 100);
        }
    }, [step]);

    const normalizeMobile = (value) => String(value || '').replace(/\D/g, '').slice(-10);

    const validateContactFields = ({ email, mobile, showToast = false }) => {
        const trimmedEmail = String(email || '').trim().toLowerCase();
        const normalizedMobile = normalizeMobile(mobile);
        const errors = { email: '', mobile: '' };

        if (!normalizedMobile) {
            errors.mobile = 'Mobile number is required.';
        } else if (!MOBILE_REGEX.test(normalizedMobile)) {
            errors.mobile = 'Mobile number must be 10 digits.';
        }

        if (trimmedEmail && !EMAIL_REGEX.test(trimmedEmail)) {
            errors.email = 'Enter a valid email address.';
        }

        if (errors.email || errors.mobile) {
            const message = errors.email || errors.mobile;
            if (showToast) toast.error(message);
            return { ok: false, errors, message };
        }

        return {
            ok: true,
            errors,
            email: trimmedEmail || null,
            mobile: normalizedMobile,
        };
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        const nextValue = name === 'mobile' ? value.replace(/\D/g, '').slice(0, 10) : value;

        setFormData(prev => ({
            ...prev,
            [name]: nextValue
        }));

        if (name === 'email' || name === 'mobile') {
            const validation = validateContactFields({
                email: name === 'email' ? nextValue : formData.email,
                mobile: name === 'mobile' ? nextValue : formData.mobile,
            });
            setFieldErrors(validation.errors);
        }
    };

    const handleOtpChange = (index, value) => {
        if (value.length <= 1 && /^\d*$/.test(value)) {
            const newOtpDigits = [...otpDigits];
            newOtpDigits[index] = value;
            setOtpDigits(newOtpDigits);

            const otpValue = newOtpDigits.join('');
            setFormData(prev => ({ ...prev, otp: otpValue }));

            if (value && index < 5) {
                otpRefs.current[index + 1]?.current?.focus();
            }
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

    const buildPayload = () => ({
        name: formData.name.trim(),
        email: formData.email.trim() || undefined,
        mobile: normalizeMobile(formData.mobile),
        country_code: '+91',
    });

    const handleDetailsSubmit = async (e) => {
        e.preventDefault();

        if (!formData.name.trim()) {
            toast.error('Full name is required.');
            return;
        }

        const validation = validateContactFields({
            email: formData.email,
            mobile: formData.mobile,
            showToast: true,
        });

        if (!validation.ok) {
            setFieldErrors(validation.errors);
            return;
        }

        setLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/auth/register/send-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(buildPayload()),
            });
            const result = await response.json();

            if (result.success) {
                setOtpChannel('mobile');
                setStep(2);
                toast.success(result.message || 'OTP sent to your mobile number');
            } else {
                toast.error(result.message || 'Failed to send OTP');
            }
        } catch (error) {
            console.error('Error sending registration OTP:', error);
            toast.error('Failed to send OTP. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleCompleteLogin = (result) => {
        saveUserSessionToStorage(result, {
            name: formData.name.trim(),
            email: formData.email.trim() || undefined,
            mobile: formData.mobile.trim() || undefined,
        });

        setLoginSuccess(true);
        fetchWhatsappChannel().catch(() => { });
        fetchSmsChannel().catch(() => { });
        fetchCallChannel().catch(() => { });

        const welcomeName = result.profile?.name || formData.name.trim() || 'User';
        toast.success(`Welcome ${welcomeName}! Registration successful!`);

        setTimeout(() => {
            const redirect = sessionStorage.getItem('post_login_redirect');
            if (redirect) {
                sessionStorage.removeItem('post_login_redirect');
                window.location.href = redirect;
            } else if (!result.branches || result.branches.length === 0) {
                window.location.href = '/branch-setup';
            } else {
                window.location.href = '/';
            }
        }, 1500);
    };

    const handleOtpSubmit = async (e) => {
        e.preventDefault();

        if (formData.otp.length !== 6) {
            toast.error('Please enter the 6-digit OTP');
            return;
        }

        setLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/auth/register/verify-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...buildPayload(),
                    otp: formData.otp,
                }),
            });
            const result = await response.json();

            if (result.success) {
                handleCompleteLogin(result);
            } else {
                toast.error(result.message || 'Registration failed');
            }
        } catch (error) {
            console.error('Error verifying registration OTP:', error);
            toast.error('Registration failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleResendOtp = async () => {
        const validation = validateContactFields({
            email: formData.email,
            mobile: formData.mobile,
            showToast: true,
        });

        if (!validation.ok) return;

        setLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/auth/register/send-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(buildPayload()),
            });
            const result = await response.json();

            if (result.success) {
                setOtpChannel('mobile');
                toast.success(result.message || 'OTP resent to your mobile number');
            } else {
                toast.error(result.message || 'Failed to resend OTP');
            }
        } catch (error) {
            console.error('Error resending registration OTP:', error);
            toast.error('Failed to resend OTP. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const contactValidation = validateContactFields({
        email: formData.email,
        mobile: formData.mobile,
    });

    const isStep1Empty = !formData.name.trim() || !contactValidation.ok;
    const isStep2Empty = formData.otp.length !== 6;

    const otpDestination = `+91 ${normalizeMobile(formData.mobile)}`;

    return (
        <OomsAuthShell
            portalLabel="Office"
            features={OFFICE_FEATURES}
            allowFormScroll
            footer={(
                <>
                    By registering, you agree to our{' '}
                    <button type="button" className="text-slate-500 hover:underline">Terms</button> &{' '}
                    <button type="button" className="text-slate-500 hover:underline">Privacy Policy</button>
                </>
            )}
        >
                        <AuthPortalSwitcher active="app" />

                        <div className="text-center">
                            <div className="w-12 h-12 rounded-2xl overflow-hidden bg-slate-950 flex items-center justify-center shadow-lg mb-2 mx-auto ring-1 ring-indigo-200">
                                <img src="/logo512.png" alt="OOMS" className="h-8 w-8 object-contain" />
                            </div>
                            <h2 className="text-2xl font-black text-slate-800 tracking-tight">
                                {step === 1 ? 'Create account' : 'Verify OTP'}
                            </h2>
                            <p className="text-xs text-slate-450 mt-1">
                                {step === 1
                                    ? 'Office registration only — Client & CA portals use login.'
                                    : `Code sent to ${otpDestination}`}
                            </p>

                            <div className="flex gap-1.5 justify-center mt-3">
                                <div className={`h-[4px] w-8 rounded-full transition-all duration-300 ${step >= 1 ? 'bg-[#5c3fe6]' : 'bg-slate-100'}`} />
                                <div className={`h-[4px] w-8 rounded-full transition-all duration-300 ${step >= 2 ? 'bg-[#5c3fe6]' : 'bg-slate-100'}`} />
                            </div>
                        </div>

                        {step === 1 && (
                            <div className="animate-fade-in space-y-4">
                                <form onSubmit={handleDetailsSubmit} className="space-y-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Full Name</label>
                                        <div className="relative group">
                                            <input
                                                ref={nameRef}
                                                type="text"
                                                name="name"
                                                value={formData.name}
                                                onChange={handleInputChange}
                                                className="w-full pl-10 pr-4 py-2.5 text-xs font-semibold bg-slate-50 border border-slate-200/80 rounded-xl outline-none transition-all duration-200 placeholder:text-slate-350 text-slate-800 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10"
                                                placeholder="e.g. John Doe"
                                                required
                                            />
                                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                                                <FiUser size={13} />
                                            </span>
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                                            Email Address <span className="text-slate-300 font-semibold normal-case">(optional)</span>
                                        </label>
                                        <div className="relative group">
                                            <input
                                                type="email"
                                                name="email"
                                                value={formData.email}
                                                onChange={handleInputChange}
                                                className={`w-full pl-10 pr-4 py-2.5 text-xs font-semibold bg-slate-50 border rounded-xl outline-none transition-all duration-200 placeholder:text-slate-350 text-slate-800 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 ${fieldErrors.email ? 'border-red-300 focus:border-red-400' : 'border-slate-200/80 focus:border-indigo-500'}`}
                                                placeholder="e.g. john@company.com"
                                            />
                                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                                                <FiMail size={13} />
                                            </span>
                                        </div>
                                        {fieldErrors.email && (
                                            <p className="text-[10px] text-red-500 font-semibold">{fieldErrors.email}</p>
                                        )}
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                                            Mobile Number <span className="text-red-400 font-semibold normal-case">(required)</span>
                                        </label>
                                        <div className="relative group">
                                            <input
                                                type="tel"
                                                name="mobile"
                                                value={formData.mobile}
                                                onChange={handleInputChange}
                                                className={`w-full pl-10 pr-4 py-2.5 text-xs font-semibold bg-slate-50 border rounded-xl outline-none transition-all duration-200 placeholder:text-slate-350 text-slate-800 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 ${fieldErrors.mobile ? 'border-red-300 focus:border-red-400' : 'border-slate-200/80 focus:border-indigo-500'}`}
                                                placeholder="e.g. 9876543210"
                                                inputMode="numeric"
                                                maxLength={10}
                                                required
                                            />
                                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                                                <FiPhone size={13} />
                                            </span>
                                        </div>
                                        {fieldErrors.mobile && (
                                            <p className="text-[10px] text-red-500 font-semibold">{fieldErrors.mobile}</p>
                                        )}
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={loading || isStep1Empty}
                                        className={`w-full py-3 px-6 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all duration-200 shadow-md shadow-indigo-500/5 mt-2
                                            ${isStep1Empty || loading
                                                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                                : 'bg-[#5c3fe6] hover:bg-[#4b30c5] text-white shadow-indigo-500/20 active:scale-[0.985]'
                                            }`}
                                    >
                                        {loading ? (
                                            <><FiRefreshCw className="animate-spin" size={13} /> Sending OTP...</>
                                        ) : (
                                            <>Continue <FiArrowRight size={13} /></>
                                        )}
                                    </button>
                                </form>
                            </div>
                        )}

                        {step === 2 && !loginSuccess && (
                            <div className="animate-fade-in space-y-4">
                                <form onSubmit={handleOtpSubmit} className="space-y-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                                            Enter 6-digit OTP
                                        </label>
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
                                                    required
                                                />
                                            ))}
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
                                        <span>Didn't receive code?</span>
                                        <button
                                            type="button"
                                            onClick={handleResendOtp}
                                            disabled={loading}
                                            className="text-[#5c3fe6] hover:text-[#4b30c5] transition-colors disabled:opacity-50"
                                        >
                                            Resend OTP
                                        </button>
                                    </div>

                                    <div className="flex space-x-3 pt-2">
                                        <button
                                            type="button"
                                            onClick={() => setStep(1)}
                                            className="flex-1 py-3 border border-slate-200 text-slate-500 text-xs font-bold rounded-xl hover:bg-slate-50 active:scale-[0.985] transition-colors flex items-center justify-center gap-1.5"
                                        >
                                            <FiArrowLeft size={13} /> Back
                                        </button>

                                        <button
                                            type="submit"
                                            disabled={loading || isStep2Empty}
                                            className={`flex-1 py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all duration-200 shadow-md shadow-indigo-500/5
                                                ${isStep2Empty || loading
                                                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                                    : 'bg-[#5c3fe6] hover:bg-[#4b30c5] text-white shadow-indigo-500/20 active:scale-[0.985]'
                                                }`}
                                        >
                                            {loading ? (
                                                <FiRefreshCw className="animate-spin" size={13} />
                                            ) : (
                                                <>Create Account <FiCheck size={13} /></>
                                            )}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        )}

                        {step === 2 && loginSuccess && (
                            <div className="text-center py-6 animate-fade-in space-y-4">
                                <div className="w-16 h-16 rounded-full bg-emerald-500 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20 animate-bounce">
                                    <FiCheck className="text-white" size={28} />
                                </div>
                                <h3 className="text-xl font-black text-slate-800">Registration Successful!</h3>
                                <p className="text-xs text-slate-400">Redirecting to your dashboard...</p>
                            </div>
                        )}

                        {step === 1 && (
                            <div className="space-y-4">
                                <div className="flex items-center gap-3 my-3 text-[10px] text-slate-350 font-bold uppercase tracking-wider">
                                    <div className="flex-1 h-px bg-slate-100" />
                                    <span>or</span>
                                    <div className="flex-1 h-px bg-slate-100" />
                                </div>

                                <p className="text-center text-[12px] text-slate-400 font-semibold">
                                    Already have an account?{' '}
                                    <button
                                        type="button"
                                        onClick={() => navigate('/login')}
                                        className="text-[#5c3fe6] font-bold hover:text-[#4b30c5] hover:underline transition-colors"
                                    >
                                        Sign in
                                    </button>
                                </p>
                            </div>
                        )}
        </OomsAuthShell>
    );
};

export default Register;
