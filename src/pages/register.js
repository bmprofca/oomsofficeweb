import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
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
            alert('Registration request submitted successfully! Our team will verify and activate your portal.');
            navigate('/login');
        }, 1500);
    };

    const handleResendOtp = () => {
        alert('OTP has been resent to your mobile!');
    };

    const isStep1Empty = !formData.name || !formData.email || !formData.mobile;
    const isStep2Empty = !formData.firmNameShort || !formData.firmNameLong;
    const isStep3Empty = formData.otp.length !== 6;

    return (
        <div className="min-h-screen bg-white flex flex-col md:flex-row relative overflow-hidden font-sans page-container">
            {/* Google Font Integration */}
            <link rel="preconnect" href="https://fonts.googleapis.com" />
            <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="true" />
            <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />

            {/* Left Side - Branding (Desktop Only) */}
            <div className="hidden md:flex md:w-1/2 bg-[#080b18] text-white p-12 lg:p-16 relative overflow-hidden flex-col justify-between select-none">
                {/* Dotted Grid Background */}
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_20%,_#080b18_80%),_radial-gradient(#ffffff04_1px,_transparent_1px)] [background-size:24px_24px] pointer-events-none"></div>

                {/* Glowing Radial Blobs */}
                <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-[radial-gradient(circle_at_center,_#3b82f612_0%,_transparent_70%)] filter blur-3xl pointer-events-none"></div>
                <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-[radial-gradient(circle_at_center,_#8b5cf612_0%,_transparent_70%)] filter blur-3xl pointer-events-none"></div>

                {/* Header Logo */}
                <div className="relative z-10 flex items-center space-x-3">
                    <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/20 border border-white/[0.08]">
                        <FiShield className="text-xl text-white" />
                    </div>
                    <span className="text-xl font-bold tracking-tight text-white">OOMS</span>
                </div>

                {/* Content & Infographics */}
                <div className="relative z-10 my-auto py-12 max-w-lg">
                    <h1 className="text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-tight">
                        Join OOMS,<br />
                        <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent">
                            register your firm.
                        </span>
                    </h1>
                    <p className="text-slate-400 text-sm max-w-sm mt-4 leading-relaxed font-normal">
                        Set up your firm details, verify your mobile, and access secure office management tools.
                    </p>

                    {/* Infographic Panels */}
                    <div className="mt-12 space-y-6">
                        {/* Task Status Progress Panel */}
                        <div className="bg-white/[0.02] border border-white/[0.06] backdrop-blur-md rounded-2xl p-5 shadow-2xl relative overflow-hidden transition-all duration-500 hover:border-white/[0.12] hover:bg-white/[0.04]">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center space-x-2.5">
                                    <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                                        <FiBriefcase className="text-indigo-400" />
                                    </div>
                                    <div>
                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Registration</span>
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
                            <span className="text-[10px] text-slate-500 block mt-2.5">Progress saved automatically</span>
                        </div>

                        {/* Metric Counter Panel */}
                        <div className="bg-white/[0.02] border border-white/[0.06] backdrop-blur-md rounded-2xl p-5 shadow-2xl relative overflow-hidden transition-all duration-500 hover:border-white/[0.12] hover:bg-white/[0.04]">
                            <div className="flex items-center justify-between mb-3">
                                <div>
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Office Efficiency</span>
                                    <span className="text-2xl font-bold text-slate-100 mt-1 block">99.9% Automated</span>
                                </div>
                                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                                    <FiTrendingUp className="text-indigo-400 text-lg" />
                                </div>
                            </div>
                            <div className="w-full h-[1px] bg-white/[0.08]" />
                            <span className="text-[10px] text-slate-500 block mt-2.5">Scale operations and automate filing</span>
                        </div>
                    </div>
                </div>

                {/* Footer Metrics */}
                <div className="relative z-10 grid grid-cols-3 gap-6 pt-8 border-t border-white/[0.08]">
                    <div>
                        <span className="text-2xl font-extrabold text-white block">10K+</span>
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold block mt-1">Clients</span>
                    </div>
                    <div>
                        <span className="text-2xl font-extrabold text-white block">99.9%</span>
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold block mt-1">Uptime</span>
                    </div>
                    <div>
                        <span className="text-2xl font-extrabold text-white block">4.9★</span>
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold block mt-1">Rating</span>
                    </div>
                </div>
            </div>

            {/* Right Side - Interactive Forms */}
            <div className="w-full md:w-1/2 min-h-screen bg-white p-8 sm:p-12 lg:p-20 flex flex-col justify-between relative z-10">
                {/* Mobile Header Logo */}
                <div className="flex items-center space-x-3 mb-8 md:hidden">
                    <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/20">
                        <FiShield className="text-xl text-white" />
                    </div>
                    <span className="text-xl font-bold tracking-tight text-slate-800 font-sans">OOMS</span>
                </div>

                {/* Form Wrapper Container */}
                <div className="max-w-sm w-full mx-auto my-auto py-8">
                    {/* Progress Indicator Steps */}
                    <div className="flex space-x-2 mb-10 w-full">
                        <div className={`h-1 flex-1 rounded-full transition-all duration-500 ${step >= 1 ? 'bg-indigo-600' : 'bg-slate-100'}`} />
                        <div className={`h-1 flex-1 rounded-full transition-all duration-500 ${step >= 2 ? 'bg-indigo-600' : 'bg-slate-100'}`} />
                        <div className={`h-1 flex-1 rounded-full transition-all duration-500 ${step >= 3 ? 'bg-indigo-600' : 'bg-slate-100'}`} />
                    </div>

                    {/* Step 1: Basic Details */}
                    {step === 1 && (
                        <div className="animate-fade-in">
                            <div className="mb-8">
                                <h2 className="text-3xl font-extrabold text-[#090b16] tracking-tight">Create your account</h2>
                                <p className="text-slate-500 text-sm mt-2 font-normal leading-relaxed">Enter your personal details to begin registration.</p>
                            </div>

                            <form onSubmit={handleBasicSubmit} className="space-y-5">
                                {/* Name Input */}
                                <div className="space-y-2">
                                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Full Name</label>
                                    <div className="relative group">
                                        <input
                                            ref={nameRef}
                                            type="text"
                                            name="name"
                                            value={formData.name}
                                            onChange={handleInputChange}
                                            className="w-full pl-12 pr-4 py-4 bg-slate-50/60 border border-slate-200/80 rounded-2xl focus:ring-4 focus:border-indigo-500 focus:ring-indigo-100/40 outline-none transition-all duration-300 font-medium"
                                            placeholder="e.g. John Doe"
                                            required
                                        />
                                        <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors pointer-events-none">
                                            <FiUser className="w-5 h-5" />
                                        </div>
                                    </div>
                                </div>

                                {/* Email Input */}
                                <div className="space-y-2">
                                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Email Address</label>
                                    <div className="relative group">
                                        <input
                                            type="email"
                                            name="email"
                                            value={formData.email}
                                            onChange={handleInputChange}
                                            className="w-full pl-12 pr-4 py-4 bg-slate-50/60 border border-slate-200/80 rounded-2xl focus:ring-4 focus:border-indigo-500 focus:ring-indigo-100/40 outline-none transition-all duration-300 font-medium"
                                            placeholder="e.g. john@company.com"
                                            required
                                        />
                                        <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors pointer-events-none">
                                            <FiMail className="w-5 h-5" />
                                        </div>
                                    </div>
                                </div>

                                {/* Mobile Input */}
                                <div className="space-y-2">
                                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Mobile Number</label>
                                    <div className="relative group">
                                        <input
                                            type="tel"
                                            name="mobile"
                                            value={formData.mobile}
                                            onChange={handleInputChange}
                                            className="w-full pl-12 pr-4 py-4 bg-slate-50/60 border border-slate-200/80 rounded-2xl focus:ring-4 focus:border-indigo-500 focus:ring-indigo-100/40 outline-none transition-all duration-300 font-medium"
                                            placeholder="e.g. 9876543210"
                                            required
                                        />
                                        <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors pointer-events-none">
                                            <FiPhone className="w-5 h-5" />
                                        </div>
                                    </div>
                                </div>

                                {/* Submit button */}
                                <button
                                    type="submit"
                                    disabled={loading || isStep1Empty}
                                    className={`w-full py-4 px-6 rounded-2xl font-semibold transition-all duration-200 flex items-center justify-center group mt-4 ${
                                        isStep1Empty
                                            ? 'bg-[#f1f5f9] text-[#94a3b8] cursor-not-allowed'
                                            : 'bg-[#0c111d] hover:bg-[#161c2d] text-white shadow-lg shadow-slate-950/5 hover:shadow-xl hover:shadow-slate-950/15 active:scale-[0.98]'
                                    }`}
                                >
                                    {loading ? (
                                        <>
                                            <FiRefreshCw className="animate-spin mr-3" />
                                            Processing...
                                        </>
                                    ) : (
                                        <>
                                            Continue
                                            <FiArrowRight className="ml-2 group-hover:translate-x-0.5 transition-transform" />
                                        </>
                                    )}
                                </button>
                            </form>
                        </div>
                    )}

                    {/* Step 2: Business Details */}
                    {step === 2 && (
                        <div className="animate-fade-in">
                            <div className="mb-8">
                                <h2 className="text-3xl font-extrabold text-[#090b16] tracking-tight">Business details</h2>
                                <p className="text-slate-500 text-sm mt-2 font-normal leading-relaxed">Enter your business name & firm configuration.</p>
                            </div>

                            <form onSubmit={handleBusinessSubmit} className="space-y-5">
                                {/* Short Firm Name */}
                                <div className="space-y-2">
                                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Firm Name (Short)</label>
                                    <div className="relative group">
                                        <input
                                            ref={firmRef}
                                            type="text"
                                            name="firmNameShort"
                                            value={formData.firmNameShort}
                                            onChange={handleInputChange}
                                            className="w-full pl-12 pr-4 py-4 bg-slate-50/60 border border-slate-200/80 rounded-2xl focus:ring-4 focus:border-indigo-500 focus:ring-indigo-100/40 outline-none transition-all duration-300 font-medium"
                                            placeholder="e.g. ACME Corp"
                                            required
                                        />
                                        <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors pointer-events-none">
                                            <FiBriefcase className="w-5 h-5" />
                                        </div>
                                    </div>
                                </div>

                                {/* Long Firm Name */}
                                <div className="space-y-2">
                                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Firm Name (Long)</label>
                                    <div className="relative group">
                                        <input
                                            type="text"
                                            name="firmNameLong"
                                            value={formData.firmNameLong}
                                            onChange={handleInputChange}
                                            className="w-full pl-12 pr-4 py-4 bg-slate-50/60 border border-slate-200/80 rounded-2xl focus:ring-4 focus:border-indigo-500 focus:ring-indigo-100/40 outline-none transition-all duration-300 font-medium"
                                            placeholder="e.g. ACME Solutions Private Limited"
                                            required
                                        />
                                        <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors pointer-events-none">
                                            <FiBriefcase className="w-5 h-5" />
                                        </div>
                                    </div>
                                </div>

                                {/* Form control buttons */}
                                <div className="flex space-x-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setStep(1)}
                                        className="flex-1 py-4 border border-slate-200 text-slate-600 rounded-2xl font-semibold hover:bg-slate-50 active:scale-[0.99] transition-all flex items-center justify-center gap-1.5"
                                    >
                                        <FiArrowLeft /> Back
                                    </button>

                                    <button
                                        type="submit"
                                        disabled={loading || isStep2Empty}
                                        className={`flex-1 py-4 rounded-2xl font-semibold transition-all duration-200 flex items-center justify-center group ${
                                            isStep2Empty
                                                ? 'bg-[#f1f5f9] text-[#94a3b8] cursor-not-allowed'
                                                : 'bg-[#0c111d] hover:bg-[#161c2d] text-white shadow-lg active:scale-[0.98]'
                                        }`}
                                    >
                                        {loading ? (
                                            <FiRefreshCw className="animate-spin" />
                                        ) : (
                                            <>
                                                Continue <FiArrowRight className="ml-1 group-hover:translate-x-0.5 transition-transform" />
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {/* Step 3: Verify OTP */}
                    {step === 3 && (
                        <div className="animate-fade-in">
                            <div className="mb-8">
                                <h2 className="text-3xl font-extrabold text-[#090b16] tracking-tight">Verify mobile</h2>
                                <p className="text-slate-500 text-sm mt-2 font-normal leading-relaxed">
                                    Enter the verification code sent to <strong className="text-slate-800 font-semibold">+91 {formData.mobile}</strong>.
                                </p>
                            </div>

                            <form onSubmit={handleOtpSubmit} className="space-y-6">
                                {/* OTP Code Boxes */}
                                <div className="space-y-2">
                                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-3">
                                        Enter 6-digit OTP
                                    </label>
                                    <div className="flex justify-between space-x-2">
                                        {otpDigits.map((digit, index) => (
                                            <input
                                                key={index}
                                                ref={otpRefs.current[index]}
                                                type="text"
                                                value={digit}
                                                onChange={(e) => handleOtpChange(index, e.target.value)}
                                                onKeyDown={(e) => handleOtpKeyDown(index, e)}
                                                onPaste={handlePaste}
                                                className="w-12 h-14 text-center text-2xl font-bold bg-slate-50/60 border border-slate-200/80 rounded-xl focus:border-indigo-600 focus:bg-white focus:ring-4 focus:ring-indigo-100/40 outline-none transition-all duration-300"
                                                maxLength="1"
                                                required
                                            />
                                        ))}
                                    </div>
                                </div>

                                <div className="flex items-center justify-between text-[13px] font-semibold">
                                    <span className="text-slate-400 font-medium">Didn't receive code?</span>
                                    <button
                                        type="button"
                                        onClick={handleResendOtp}
                                        className="text-indigo-600 hover:text-indigo-700 transition-colors"
                                    >
                                        Resend OTP
                                    </button>
                                </div>

                                <div className="flex space-x-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setStep(2)}
                                        className="flex-1 py-4 border border-slate-200 text-slate-600 rounded-2xl font-semibold hover:bg-slate-50 active:scale-[0.99] transition-all flex items-center justify-center gap-1.5"
                                    >
                                        <FiArrowLeft /> Back
                                    </button>

                                    <button
                                        type="submit"
                                        disabled={loading || isStep3Empty}
                                        className={`flex-1 py-4 rounded-2xl font-semibold transition-all duration-200 flex items-center justify-center group ${
                                            isStep3Empty
                                                ? 'bg-[#f1f5f9] text-[#94a3b8] cursor-not-allowed'
                                                : 'bg-[#4f46e5] hover:bg-[#4338ca] text-white shadow-lg active:scale-[0.98]'
                                        }`}
                                    >
                                        {loading ? (
                                            <FiRefreshCw className="animate-spin" />
                                        ) : (
                                            <>
                                                Complete <FiCheck className="ml-1" />
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {/* Bottom sign-in redirection */}
                    {step === 1 && (
                        <div className="text-center pt-8 border-t border-slate-100 mt-8">
                            <p className="text-slate-400 text-sm font-semibold">
                                Already have an account?{' '}
                                <button
                                    type="button"
                                    onClick={() => navigate('/login')}
                                    className="text-indigo-600 hover:text-indigo-700 font-bold ml-1 transition-colors hover:underline"
                                >
                                    Sign in
                                </button>
                            </p>
                        </div>
                    )}
                </div>

                {/* Footer Section */}
                <div className="text-center text-xs text-slate-400 mt-auto pt-8 select-none">
                    By continuing, you agree to our{' '}
                    <button className="text-slate-500 hover:underline font-medium">Terms of Service</button>
                    {' '}and{' '}
                    <button className="text-slate-500 hover:underline font-medium">Privacy Policy</button>
                </div>
            </div>

            {/* Animations styles */}
            <style jsx>{`
                .page-container {
                    font-family: 'Plus Jakarta Sans', sans-serif !important;
                }

                @keyframes blob {
                    0% {
                        transform: translate(0px, 0px) scale(1);
                    }
                    33% {
                        transform: translate(30px, -50px) scale(1.1);
                    }
                    66% {
                        transform: translate(-20px, 20px) scale(0.9);
                    }
                    100% {
                        transform: translate(0px, 0px) scale(1);
                    }
                }
                
                .animate-blob {
                    animation: blob 7s infinite;
                }
                
                .animation-delay-2000 {
                    animation-delay: 2s;
                }
                
                .animation-delay-4000 {
                    animation-delay: 4s;
                }

                @keyframes fade-in {
                    from {
                        opacity: 0;
                        transform: translateY(8px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                .animate-fade-in {
                    animation: fade-in 0.3s ease-out forwards;
                }
            `}</style>
        </div>
    );
};

export default Register;