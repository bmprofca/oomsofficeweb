import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
    FiUser,
    FiMail,
    FiPhone,
    FiBriefcase,
    FiArrowRight,
    FiArrowLeft,
    FiRefreshCw,
    FiCheckCircle,
    FiCheck,
    FiShield,
    FiTrendingUp
} from 'react-icons/fi';

const Register = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState(1); // 1: Basic, 2: Business, 3: OTP
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        mobile: '',
        firmNameShort: '',
        firmNameLong: '',
        otp: ''
    });

    const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
    const nameRef = useRef(null);
    const firmRef = useRef(null);
    const otpRefs = useRef([...Array(6)].map(() => React.createRef()));

    useEffect(() => {
        if (step === 1) {
            setTimeout(() => {
                nameRef.current?.focus();
            }, 100);
        } else if (step === 2) {
            setTimeout(() => {
                firmRef.current?.focus();
            }, 100);
        } else if (step === 3) {
            setTimeout(() => {
                otpRefs.current[0]?.current?.focus();
            }, 100);
        }
    }, [step]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
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

    const handleBasicSubmit = async (e) => {
        e.preventDefault();
        if (!formData.name || !formData.email || !formData.mobile) return;
        setLoading(true);

        // Simulate basic details submit
        setTimeout(() => {
            setLoading(false);
            setStep(2);
        }, 1000);
    };

    const handleBusinessSubmit = async (e) => {
        e.preventDefault();
        if (!formData.firmNameShort || !formData.firmNameLong) return;
        setLoading(true);

        // Simulate business details submit
        setTimeout(() => {
            setLoading(false);
            setStep(3);
        }, 1000);
    };

    const handleOtpSubmit = async (e) => {
        e.preventDefault();
        if (formData.otp.length !== 6) return;
        setLoading(true);

        // Simulate registration complete
        setTimeout(() => {
            setLoading(false);
            toast.success('Registration request submitted successfully! Our team will verify and activate your portal.');
            navigate('/login');
        }, 1500);
    };

    const handleResendOtp = () => {
        toast.success('OTP has been resent to your mobile!');
    };

    const isStep1Empty = !formData.name || !formData.email || !formData.mobile;
    const isStep2Empty = !formData.firmNameShort || !formData.firmNameLong;
    const isStep3Empty = formData.otp.length !== 6;

    return (
        <div className="ooms-root h-screen h-[100dvh] overflow-hidden bg-[#f3f6fc] flex items-center justify-center p-4 sm:p-6 font-sans page-container">
            {/* Google Font Integration */}
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

                    {/* Content & Infographics */}
                    <div className="relative z-10 my-auto py-4 flex flex-col justify-center">
                        <h1 className="text-3xl font-extrabold text-white tracking-tight leading-tight">
                            Join OOMS,<br />
                            <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent">
                                register your firm.
                            </span>
                        </h1>
                        <p className="text-slate-400 text-xs mt-3 leading-relaxed font-normal">
                            Set up your firm details, verify your mobile, and access secure office management tools.
                        </p>

                        {/* Infographic Panels */}
                        <div className="mt-6 space-y-4">
                            {/* Task Status Progress Panel */}
                            <div className="bg-white/[0.02] border border-white/[0.06] backdrop-blur-md rounded-2xl p-4 shadow-2xl relative overflow-hidden transition-all duration-500 hover:border-white/[0.12] hover:bg-white/[0.04]">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center space-x-2.5">
                                        <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                                            <FiBriefcase className="text-indigo-400" />
                                        </div>
                                        <div>
                                            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Registration</span>
                                            <span className="text-xs font-semibold text-slate-200">Account Setup Status</span>
                                        </div>
                                    </div>
                                    <span className="bg-amber-500/10 text-amber-400 text-[10px] font-bold px-2 py-0.5 rounded border border-amber-500/20">
                                        Step {step}/3
                                    </span>
                                </div>
                                <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                                    <div className="bg-indigo-500 h-full rounded-full transition-all duration-500" style={{ width: `${(step / 3) * 100}%` }} />
                                </div>
                                <span className="text-[9px] text-slate-500 block mt-2">Progress saved automatically</span>
                            </div>

                            {/* Metric Counter Panel */}
                            <div className="bg-white/[0.02] border border-white/[0.06] backdrop-blur-md rounded-2xl p-4 shadow-2xl relative overflow-hidden transition-all duration-500 hover:border-white/[0.12] hover:bg-white/[0.04]">
                                <div className="flex items-center justify-between mb-2">
                                    <div>
                                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Office Efficiency</span>
                                        <span className="text-xl font-bold text-slate-100 mt-1 block">99.9% Automated</span>
                                    </div>
                                    <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                                        <FiTrendingUp className="text-indigo-400 text-base" />
                                    </div>
                                </div>
                                <div className="w-full h-[1px] bg-white/[0.08]" />
                                <span className="text-[9px] text-slate-500 block mt-2">Scale operations and automate filing</span>
                            </div>
                        </div>
                    </div>

                    {/* Footer Metrics */}
                    <div className="relative z-10 grid grid-cols-3 gap-4 pt-4 border-t border-white/[0.08]">
                        <div>
                            <span className="text-xl font-extrabold text-white block">10K+</span>
                            <span className="text-[9px] text-slate-500 uppercase tracking-wider font-bold block mt-0.5">Clients</span>
                        </div>
                        <div>
                            <span className="text-xl font-extrabold text-white block">99.9%</span>
                            <span className="text-[9px] text-slate-500 uppercase tracking-wider font-bold block mt-0.5">Uptime</span>
                        </div>
                        <div>
                            <span className="text-xl font-extrabold text-white block">4.9★</span>
                            <span className="text-[9px] text-slate-500 uppercase tracking-wider font-bold block mt-0.5">Rating</span>
                        </div>
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
                                <FiShield size={16} />
                            </div>
                            <span className="text-sm font-bold text-slate-800">OOMS</span>
                        </div>
                    </div>

                    {/* Form Wrapper Container */}
                    <div className="my-auto w-full max-w-[340px] mx-auto space-y-4">
                        <div className="text-center">
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#4f35e3] to-[#3b82f6] flex items-center justify-center text-white shadow-lg mb-2 mx-auto">
                                <FiShield size={20} />
                            </div>
                            <h2 className="text-2xl font-black text-slate-800 tracking-tight">
                                {step === 1 && "Create account"}
                                {step === 2 && "Business details"}
                                {step === 3 && "Verify mobile"}
                            </h2>
                            <p className="text-xs text-slate-450 mt-1">
                                {step === 1 && "Enter your details to get started"}
                                {step === 2 && "Enter business name & configuration"}
                                {step === 3 && `Code sent to +91 ${formData.mobile}`}
                            </p>

                            {/* Step Progress Bar */}
                            <div className="flex gap-1.5 justify-center mt-3">
                                <div className={`h-[4px] w-8 rounded-full transition-all duration-300 ${step >= 1 ? 'bg-[#5c3fe6]' : 'bg-slate-100'}`} />
                                <div className={`h-[4px] w-8 rounded-full transition-all duration-300 ${step >= 2 ? 'bg-[#5c3fe6]' : 'bg-slate-100'}`} />
                                <div className={`h-[4px] w-8 rounded-full transition-all duration-300 ${step >= 3 ? 'bg-[#5c3fe6]' : 'bg-slate-100'}`} />
                            </div>
                        </div>

                        {/* Step 1: Basic Details */}
                        {step === 1 && (
                            <div className="animate-fade-in space-y-4">
                                <form onSubmit={handleBasicSubmit} className="space-y-4">
                                    {/* Name Input */}
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

                                    {/* Email Input */}
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Email Address</label>
                                        <div className="relative group">
                                            <input
                                                type="email"
                                                name="email"
                                                value={formData.email}
                                                onChange={handleInputChange}
                                                className="w-full pl-10 pr-4 py-2.5 text-xs font-semibold bg-slate-50 border border-slate-200/80 rounded-xl outline-none transition-all duration-200 placeholder:text-slate-350 text-slate-800 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10"
                                                placeholder="e.g. john@company.com"
                                                required
                                            />
                                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                                                <FiMail size={13} />
                                            </span>
                                        </div>
                                    </div>

                                    {/* Mobile Input */}
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Mobile Number</label>
                                        <div className="relative group">
                                            <input
                                                type="tel"
                                                name="mobile"
                                                value={formData.mobile}
                                                onChange={handleInputChange}
                                                className="w-full pl-10 pr-4 py-2.5 text-xs font-semibold bg-slate-50 border border-slate-200/80 rounded-xl outline-none transition-all duration-200 placeholder:text-slate-350 text-slate-800 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10"
                                                placeholder="e.g. 9876543210"
                                                required
                                            />
                                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                                                <FiPhone size={13} />
                                            </span>
                                        </div>
                                    </div>

                                    {/* Submit button */}
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
                                            <><FiRefreshCw className="animate-spin" size={13} /> Processing...</>
                                        ) : (
                                            <>Continue <FiArrowRight size={13} /></>
                                        )}
                                    </button>
                                </form>
                            </div>
                        )}

                        {/* Step 2: Business Details */}
                        {step === 2 && (
                            <div className="animate-fade-in space-y-4">
                                <form onSubmit={handleBusinessSubmit} className="space-y-4">
                                    {/* Short Firm Name */}
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Firm Name (Short)</label>
                                        <div className="relative group">
                                            <input
                                                ref={firmRef}
                                                type="text"
                                                name="firmNameShort"
                                                value={formData.firmNameShort}
                                                onChange={handleInputChange}
                                                className="w-full pl-10 pr-4 py-2.5 text-xs font-semibold bg-slate-50 border border-slate-200/80 rounded-xl outline-none transition-all duration-200 placeholder:text-slate-350 text-slate-800 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10"
                                                placeholder="e.g. ACME Corp"
                                                required
                                            />
                                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                                                <FiBriefcase size={13} />
                                            </span>
                                        </div>
                                    </div>

                                    {/* Long Firm Name */}
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Firm Name (Long)</label>
                                        <div className="relative group">
                                            <input
                                                type="text"
                                                name="firmNameLong"
                                                value={formData.firmNameLong}
                                                onChange={handleInputChange}
                                                className="w-full pl-10 pr-4 py-2.5 text-xs font-semibold bg-slate-50 border border-slate-200/80 rounded-xl outline-none transition-all duration-200 placeholder:text-slate-350 text-slate-800 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10"
                                                placeholder="e.g. ACME Solutions Private Limited"
                                                required
                                            />
                                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                                                <FiBriefcase size={13} />
                                            </span>
                                        </div>
                                    </div>

                                    {/* Form control buttons */}
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
                                                <>Continue <FiArrowRight size={13} /></>
                                            )}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        )}

                        {/* Step 3: Verify OTP */}
                        {step === 3 && (
                            <div className="animate-fade-in space-y-4">
                                <form onSubmit={handleOtpSubmit} className="space-y-4">
                                    {/* OTP Code Boxes */}
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
                                            className="text-[#5c3fe6] hover:text-[#4b30c5] transition-colors"
                                        >
                                            Resend OTP
                                        </button>
                                    </div>

                                    <div className="flex space-x-3 pt-2">
                                        <button
                                            type="button"
                                            onClick={() => setStep(2)}
                                            className="flex-1 py-3 border border-slate-200 text-slate-500 text-xs font-bold rounded-xl hover:bg-slate-50 active:scale-[0.985] transition-colors flex items-center justify-center gap-1.5"
                                        >
                                            <FiArrowLeft size={13} /> Back
                                        </button>

                                        <button
                                            type="submit"
                                            disabled={loading || isStep3Empty}
                                            className={`flex-1 py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all duration-200 shadow-md shadow-indigo-500/5
                                                ${isStep3Empty || loading
                                                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                                    : 'bg-[#5c3fe6] hover:bg-[#4b30c5] text-white shadow-indigo-500/20 active:scale-[0.985]'
                                                }`}
                                        >
                                            {loading ? (
                                                <FiRefreshCw className="animate-spin" size={13} />
                                            ) : (
                                                <>Complete <FiCheck size={13} /></>
                                            )}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        )}

                        {/* Sign in Redirection */}
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
                    </div>

                    {/* Bottom Security/Terms Note */}
                    <div className="text-[10px] text-slate-400 font-semibold text-center mt-4">
                        By registering, you agree to our{' '}
                        <button type="button" className="text-slate-500 hover:underline">Terms</button> &{' '}
                        <button type="button" className="text-slate-500 hover:underline">Privacy Policy</button>
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
            `}</style>
        </div>
    );
};

export default Register;