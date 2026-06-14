import React, { useState, useEffect, useRef } from 'react';
import {
    FiUser,
    FiLock,
    FiMail,
    FiArrowRight,
    FiArrowLeft,
    FiRefreshCw,
    FiCheckCircle,
    FiEye,
    FiEyeOff,
    FiGitBranch,
    FiCheck,
    FiHome,
    FiShield,
    FiKey
} from 'react-icons/fi';
import { FcGoogle } from 'react-icons/fc';
import { FaMicrosoft } from 'react-icons/fa';
import { SiAuth0 } from 'react-icons/si';
import { GoogleLogin } from '@react-oauth/google';

const BASE_URL = 'https://api.ooms.in/api/v1';

const Login = () => {
    const [phase, setPhase] = useState(1); // 1: Credentials, 2: OTP
    const [loading, setLoading] = useState(false);
    const [fullScreenLoading, setFullScreenLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        otp: ''
    });
    const [branches, setBranches] = useState([]);
    const [selectedBranch, setSelectedBranch] = useState('');
    const [otpExpireTime, setOtpExpireTime] = useState(null);
    const [loginResponse, setLoginResponse] = useState(null);
    const [showBranchSelection, setShowBranchSelection] = useState(false);
    const [loginSuccess, setLoginSuccess] = useState(false);
    const [activeSocialLogin, setActiveSocialLogin] = useState(null);
    const [isValidEmail, setIsValidEmail] = useState(true);
    const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);

    const emailRef = useRef(null);
    const passwordRef = useRef(null);
    const otpRefs = useRef([...Array(6)].map(() => React.createRef()));

    useEffect(() => {
        if (phase === 1) {
            setTimeout(() => {
                emailRef.current?.focus();
            }, 100);
        }
    }, [phase]);

    useEffect(() => {
        if (phase === 2 && !showBranchSelection && !loginSuccess) {
            setTimeout(() => {
                otpRefs.current[0]?.current?.focus();
            }, 300);
        }
    }, [phase, showBranchSelection, loginSuccess]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));

        if (name === 'email') {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            setIsValidEmail(value === '' || emailRegex.test(value));
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

            if (!value && index > 0) {
                otpRefs.current[index - 1]?.current?.focus();
            }
        }
    };

    const handleOtpKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
            otpRefs.current[index - 1]?.current?.focus();
        }
    };

    // Email/Password Login Flow
    const handleSendOtp = async (e) => {
        e.preventDefault();

        if (!formData.email || !formData.password) {
            alert('Please enter both email and password');
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
            setIsValidEmail(false);
            alert('Please enter a valid email address');
            return;
        }

        setLoading(true);

        try {
            const response = await fetch(`${BASE_URL}/auth/login/send-otp`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: formData.email,
                    password: formData.password
                })
            });

            const result = await response.json();

            if (result.success) {
                setPhase(2);
                setOtpExpireTime(result.expire);
                alert(result.message);
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
        e.preventDefault();

        if (formData.otp.length !== 6) {
            alert('Please enter 6-digit OTP');
            return;
        }

        setLoading(true);

        try {
            const response = await fetch(`${BASE_URL}/auth/login/email`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: formData.email,
                    password: formData.password,
                    otp: parseInt(formData.otp)
                })
            });

            const result = await response.json();

            if (result.success) {
                setLoginResponse(result);

                if (result.branches && result.branches.length > 0) {
                    setBranches(result.branches);

                    if (result.branches.length === 1) {
                        // Single branch - auto select and complete login
                        handleCompleteLogin(result, result.branches[0].branch_id);
                    } else {
                        // Multiple branches - show selection
                        setShowBranchSelection(true);
                    }
                } else {
                    // No branches - direct login
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

    // Google Auth Flow
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

            if (!response.ok || !result.success) {
                throw new Error(result.message || 'Authentication failed');
            }

            console.log('Google auth successful:', result);

            // Store basic user info
            localStorage.setItem('user_token', result.token);
            localStorage.setItem('user_username', result.username);
            localStorage.setItem('user_email', result.profile.email);
            localStorage.setItem('user_name', result.profile.name);
            localStorage.setItem('user_is_new', result.is_new_user ? 'true' : 'false');

            setLoginResponse(result);

            // Handle branches
            if (result.branches && result.branches.length > 0) {
                setBranches(result.branches);

                if (result.branches.length === 1) {
                    // Single branch - auto select and complete login
                    handleCompleteLogin(result, result.branches[0].branch_id);
                } else {
                    // Multiple branches - show selection
                    setShowBranchSelection(true);
                    setActiveSocialLogin(null);
                    setLoading(false);
                }
            } else {
                // No branches - direct login
                handleCompleteLogin(result, null);
            }

        } catch (error) {
            console.error('Google Auth Error:', error);
            alert('Authentication failed: ' + error.message);
            setActiveSocialLogin(null);
            setLoading(false);
        }
    };

    // Complete Login - handles final steps after branch selection or direct login
    const handleCompleteLogin = (result, branchId) => {
        // Store token and user info
        localStorage.setItem('user_token', result.token);
        localStorage.setItem('user_username', result.username);
        localStorage.setItem('user_email', result.profile?.email || formData.email);
        localStorage.setItem('user_name', result.profile?.name || result.username);

        if (result.branches) {
            localStorage.setItem('user_branches', JSON.stringify(result.branches));
        }

        if (result.expire_date) {
            localStorage.setItem('token_expire', result.expire_date);
        }

        // Handle branch selection
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

        // Show success message
        const welcomeName = result.profile?.name || result.username || 'User';
        alert(`Welcome ${welcomeName}! Login successful!`);

        // Redirect after 1.5 seconds
        setTimeout(() => {
            window.location.href = '/';
        }, 1500);
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
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: formData.email,
                    password: formData.password
                })
            });

            const result = await response.json();

            if (result.success) {
                setOtpExpireTime(result.expire);
                setOtpDigits(['', '', '', '', '', '']);
                setFormData(prev => ({ ...prev, otp: '' }));
                alert('OTP has been resent!');
                setTimeout(() => {
                    otpRefs.current[0]?.current?.focus();
                }, 100);
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

    const handleMicrosoftLogin = () => {
        setActiveSocialLogin('Microsoft');
        setTimeout(() => {
            setActiveSocialLogin(null);
            alert('Microsoft login integration coming soon');
        }, 1500);
    };

    if (fullScreenLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-700 flex items-center justify-center">
                <div className="text-center text-white">
                    <div className="w-16 h-16 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-6"></div>
                    <h2 className="text-2xl font-semibold mb-2">Loading...</h2>
                    <p className="text-white/80">Please wait while we prepare your dashboard</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background Elements */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-100 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob"></div>
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-100 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-2000"></div>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-pink-100 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-4000"></div>
            </div>

            <div className="w-full max-w-3xl bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl overflow-hidden border border-gray-200/50 relative z-10">
                <div className="flex flex-col md:flex-row">
                    {/* Left Side - Branding */}
                    <div className="md:w-2/5 bg-gradient-to-br from-blue-600 to-purple-700 p-8 text-white relative overflow-hidden">
                        <div className="absolute inset-0 bg-grid-white/10 bg-[size:20px_20px]"></div>
                        <div className="relative z-10 h-full flex flex-col">
                            <div className="flex items-center space-x-3 mb-8">
                                <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                                    <FiShield className="text-2xl" />
                                </div>
                                <div>
                                    <h1 className="text-2xl font-bold">OOMS</h1>
                                    <p className="text-blue-200 text-sm">Secure Enterprise Login</p>
                                </div>
                            </div>

                            <div className="flex-grow flex flex-col justify-center">
                                <div className="mb-8">
                                    <div className="w-16 h-16 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-6 mx-auto">
                                        <SiAuth0 className="text-3xl text-white" />
                                    </div>
                                    <h2 className="text-3xl font-bold mb-4 text-center">One Secure Login</h2>
                                    <p className="text-blue-100 text-center leading-relaxed">
                                        Access all your enterprise tools with a single, secure authentication.
                                    </p>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-center space-x-3 bg-white/10 p-3 rounded-lg">
                                        <FiCheckCircle className="text-green-300 flex-shrink-0" />
                                        <span className="text-sm">End-to-end encrypted</span>
                                    </div>
                                    <div className="flex items-center space-x-3 bg-white/10 p-3 rounded-lg">
                                        <FiCheckCircle className="text-green-300 flex-shrink-0" />
                                        <span className="text-sm">Multi-factor authentication</span>
                                    </div>
                                    <div className="flex items-center space-x-3 bg-white/10 p-3 rounded-lg">
                                        <FiCheckCircle className="text-green-300 flex-shrink-0" />
                                        <span className="text-sm">Enterprise-grade security</span>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-auto pt-8 border-t border-white/20">
                                <p className="text-blue-200 text-sm">
                                    <FiKey className="inline mr-2" />
                                    ISO 27001 Certified Security
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Right Side - Login Form */}
                    <div className="md:w-3/5 p-8">
                        {/* Header */}
                        <div className="mb-8">
                            <h1 className="text-2xl font-bold text-gray-900">
                                {showBranchSelection ? 'Select Branch' :
                                    loginSuccess ? 'Welcome Back!' :
                                        phase === 1 ? 'Sign in to your account' : 'Verify Your Identity'}
                            </h1>
                            <p className="text-gray-600 mt-2">
                                {showBranchSelection ? 'Choose your branch to continue' :
                                    loginSuccess ? 'You have successfully logged in' :
                                        phase === 1 ? 'Enter your credentials to continue' : 'Enter the 6-digit verification code'}
                            </p>
                        </div>

                        {/* Branch Selection Screen */}
                        {showBranchSelection && (
                            <div className="space-y-6">
                                <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6">
                                    <div className="flex items-center">
                                        <FiCheckCircle className="text-green-600 text-2xl mr-3" />
                                        <div>
                                            <p className="font-semibold text-green-800">Identity Verified Successfully!</p>
                                            <p className="text-green-700 text-sm mt-1">Please select your branch to continue</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <label className="block text-sm font-semibold text-gray-800">
                                        Available Branches
                                    </label>
                                    <div className="space-y-3">
                                        {branches.map((branch) => (
                                            <button
                                                key={branch.branch_id}
                                                type="button"
                                                onClick={() => handleBranchSelect(branch.branch_id)}
                                                disabled={loading}
                                                className={`w-full p-5 text-left rounded-xl border-2 transition-all duration-300 transform hover:-translate-y-0.5 flex items-center justify-between group
                                                    ${selectedBranch === branch.branch_id ?
                                                        'border-blue-500 bg-blue-50 shadow-lg shadow-blue-100' :
                                                        'border-gray-200 hover:border-blue-300 hover:shadow-lg'
                                                    }`}
                                            >
                                                <div className="flex items-center">
                                                    <div className={`p-2 rounded-lg mr-4 ${selectedBranch === branch.branch_id ? 'bg-blue-100' : 'bg-gray-100 group-hover:bg-blue-50'}`}>
                                                        <FiHome className={`w-5 h-5 ${selectedBranch === branch.branch_id ? 'text-blue-600' : 'text-gray-600'}`} />
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-gray-900">{branch.name}</p>
                                                        <p className="text-sm text-gray-600 mt-1">
                                                            Branch ID: {branch.branch_id}
                                                            {branch.owned && (
                                                                <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">Owned</span>
                                                            )}
                                                        </p>
                                                    </div>
                                                </div>
                                                {selectedBranch === branch.branch_id && (
                                                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                                                        <FiCheck className="text-white" />
                                                    </div>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex space-x-4 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowBranchSelection(false);
                                            setPhase(1);
                                            setActiveSocialLogin(null);
                                        }}
                                        className="flex-1 py-3 px-6 border-2 border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 hover:border-gray-400 transition-all duration-300 flex items-center justify-center"
                                    >
                                        <FiArrowLeft className="mr-2" />
                                        Back
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Phase 1: Email and Password Together */}
                        {phase === 1 && !showBranchSelection && !loginSuccess && (
                            <div>
                                {/* Social Login Buttons */}
                                <div className="mb-6">
                                    <div className="grid grid-cols-2 gap-3">
                                        {/* Google Login Button */}
                                        <div className="w-full">
                                            {activeSocialLogin === 'Google' ? (
                                                <div className="flex items-center justify-center p-3 border border-gray-300 rounded-xl bg-gray-50">
                                                    <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                                                    <span className="ml-2 font-medium text-gray-700">Verifying...</span>
                                                </div>
                                            ) : (
                                                <GoogleLogin
                                                    onSuccess={handleGoogleAuth}
                                                    onError={() => {
                                                        console.log('Google Login Failed');
                                                        alert('Google login failed. Please try again.');
                                                        setActiveSocialLogin(null);
                                                    }}
                                                    useOneTap={false}
                                                    theme="outline"
                                                    size="large"
                                                    text="continue_with"
                                                    shape="rectangular"
                                                    width="100%"
                                                />
                                            )}
                                        </div>

                                        {/* Microsoft Login Button */}
                                        <button
                                            onClick={handleMicrosoftLogin}
                                            disabled={activeSocialLogin !== null}
                                            className="flex items-center justify-center p-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition-all duration-300 disabled:opacity-50 group hover:border-blue-300"
                                        >
                                            {activeSocialLogin === 'Microsoft' ? (
                                                <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                                            ) : (
                                                <>
                                                    <FaMicrosoft className="text-xl mr-3 text-blue-600" />
                                                    <span className="font-medium text-gray-700">Microsoft</span>
                                                </>
                                            )}
                                        </button>
                                    </div>

                                    <div className="flex items-center my-6">
                                        <div className="flex-grow border-t border-gray-300"></div>
                                        <span className="mx-4 text-gray-500 text-sm font-medium">OR CONTINUE WITH EMAIL</span>
                                        <div className="flex-grow border-t border-gray-300"></div>
                                    </div>
                                </div>

                                {/* Email and Password Form */}
                                <form onSubmit={handleSendOtp} className="space-y-5">
                                    {/* Email Field */}
                                    <div className="space-y-2">
                                        <label className="block text-sm font-medium text-gray-700">
                                            Email Address
                                        </label>
                                        <div className="relative group">
                                            <input
                                                ref={emailRef}
                                                type="email"
                                                name="email"
                                                value={formData.email}
                                                onChange={handleInputChange}
                                                className={`w-full pl-12 pr-4 py-4 bg-gray-50/50 border-2 rounded-xl focus:ring-4 outline-none transition-all duration-300 group-hover:border-blue-400 ${isValidEmail
                                                        ? 'border-gray-300 focus:border-blue-500 focus:ring-blue-100'
                                                        : 'border-red-300 focus:border-red-500 focus:ring-red-100'
                                                    }`}
                                                placeholder="your.email@company.com"
                                                required
                                            />
                                            <FiMail className={`absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 transition-colors ${isValidEmail ? 'text-gray-400 group-focus-within:text-blue-500' : 'text-red-400'
                                                }`} />
                                        </div>
                                        {!isValidEmail && formData.email && (
                                            <p className="text-red-500 text-sm flex items-center">
                                                <FiCheckCircle className="mr-1" />
                                                Please enter a valid email address
                                            </p>
                                        )}
                                    </div>

                                    {/* Password Field */}
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center">
                                            <label className="block text-sm font-medium text-gray-700">
                                                Password
                                            </label>
                                            <button
                                                type="button"
                                                className="text-sm text-blue-600 hover:text-blue-700 font-medium hover:underline"
                                            >
                                                Forgot password?
                                            </button>
                                        </div>
                                        <div className="relative group">
                                            <input
                                                ref={passwordRef}
                                                type={showPassword ? 'text' : 'password'}
                                                name="password"
                                                value={formData.password}
                                                onChange={handleInputChange}
                                                className="w-full pl-12 pr-12 py-4 bg-gray-50/50 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all duration-300 group-hover:border-blue-400"
                                                placeholder="Enter your password"
                                                required
                                            />
                                            <FiLock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 w-5 h-5 transition-colors" />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                            >
                                                {showPassword ? <FiEyeOff className="w-5 h-5" /> : <FiEye className="w-5 h-5" />}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Remember Me */}
                                    <div className="flex items-center">
                                        <input
                                            type="checkbox"
                                            id="remember"
                                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                        />
                                        <label htmlFor="remember" className="ml-2 text-sm text-gray-600">
                                            Remember this device for 30 days
                                        </label>
                                    </div>

                                    {/* Submit Button */}
                                    <button
                                        type="submit"
                                        disabled={loading || !formData.email || !formData.password}
                                        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 text-white py-4 px-6 rounded-xl font-semibold shadow-lg hover:shadow-xl disabled:shadow-none transition-all duration-300 flex items-center justify-center group"
                                    >
                                        {loading ? (
                                            <>
                                                <FiRefreshCw className="animate-spin mr-3" />
                                                Sending Verification Code...
                                            </>
                                        ) : (
                                            <>
                                                Continue to Verification
                                                <FiArrowRight className="ml-3 group-hover:translate-x-1 transition-transform" />
                                            </>
                                        )}
                                    </button>
                                </form>
                            </div>
                        )}

                        {/* Phase 2: OTP Verification */}
                        {phase === 2 && !showBranchSelection && !loginSuccess && (
                            <div className="space-y-6">
                                {/* Animated Header */}
                                <div className="relative overflow-hidden bg-gradient-to-br from-blue-50 to-indigo-100 border border-blue-200 rounded-2xl p-6">
                                    <div className="absolute -top-10 -right-10 w-20 h-20 bg-blue-200 rounded-full opacity-20"></div>
                                    <div className="absolute -bottom-10 -left-10 w-20 h-20 bg-purple-200 rounded-full opacity-20"></div>

                                    <div className="relative z-10 flex flex-col items-center text-center">
                                        <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg animate-pulse-slow">
                                            <FiMail className="text-white text-3xl" />
                                        </div>
                                        <h3 className="text-xl font-bold text-gray-900 mb-2">Verify Your Identity</h3>
                                        <p className="text-gray-700 mb-3">We've sent a 6-digit code to</p>
                                        <div className="bg-white px-4 py-2 rounded-lg border border-gray-200 inline-flex items-center mb-4">
                                            <FiMail className="text-blue-500 mr-2" />
                                            <span className="font-semibold text-gray-900">{formData.email}</span>
                                        </div>
                                        {otpExpireTime && (
                                            <div className="flex items-center text-sm text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                                                <FiRefreshCw className="mr-2" />
                                                Expires: {otpExpireTime}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* OTP Input Section */}
                                <div className="space-y-6">
                                    <div className="text-center">
                                        <h4 className="text-lg font-semibold text-gray-900 mb-2">Enter Verification Code</h4>
                                        <p className="text-gray-600 text-sm">Type the 6-digit code from your email</p>
                                    </div>

                                    {/* OTP Input Boxes */}
                                    <div className="flex justify-center space-x-3">
                                        {otpDigits.map((digit, index) => (
                                            <div key={index} className="relative group">
                                                <input
                                                    ref={otpRefs.current[index]}
                                                    type="text"
                                                    value={digit}
                                                    onChange={(e) => handleOtpChange(index, e.target.value)}
                                                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                                                    className="w-14 h-14 text-center text-2xl font-bold bg-white border-2 border-blue-300 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all duration-300 shadow-lg group-hover:border-blue-400 group-hover:shadow-xl"
                                                    maxLength="1"
                                                    required
                                                />
                                                <div className={`absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-10 h-1 rounded-full transition-all duration-300 ${digit ? 'bg-blue-500' : 'bg-gray-300'
                                                    }`}></div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* OTP Status */}
                                    <div className="text-center">
                                        <div className="inline-flex items-center space-x-2 bg-gray-50 px-4 py-2 rounded-lg">
                                            <div className={`w-2 h-2 rounded-full ${formData.otp.length === 6 ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                                            <span className="text-sm text-gray-600">
                                                {formData.otp.length === 6
                                                    ? '✓ All digits entered'
                                                    : `${formData.otp.length}/6 digits entered`
                                                }
                                            </span>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="grid grid-cols-2 gap-4 pt-2">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setPhase(1);
                                                setOtpDigits(['', '', '', '', '', '']);
                                            }}
                                            className="py-3 px-6 border-2 border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 hover:border-gray-400 transition-all duration-300 flex items-center justify-center"
                                        >
                                            <FiArrowLeft className="mr-2" />
                                            Back
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleResendOtp}
                                            disabled={loading}
                                            className="py-3 px-6 border-2 border-blue-200 text-blue-600 rounded-xl font-medium hover:bg-blue-50 hover:border-blue-300 transition-all duration-300 flex items-center justify-center"
                                        >
                                            <FiRefreshCw className={`mr-2 ${loading ? 'animate-spin' : ''}`} />
                                            Resend Code
                                        </button>
                                    </div>

                                    {/* Verify Button */}
                                    <button
                                        onClick={handleOtpSubmit}
                                        disabled={loading || formData.otp.length !== 6}
                                        className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:from-gray-400 disabled:to-gray-500 text-white py-4 px-6 rounded-xl font-semibold shadow-lg hover:shadow-xl disabled:shadow-none transition-all duration-300 flex items-center justify-center group transform hover:-translate-y-0.5"
                                    >
                                        {loading ? (
                                            <>
                                                <FiRefreshCw className="animate-spin mr-3" />
                                                Verifying Code...
                                            </>
                                        ) : (
                                            <>
                                                <FiCheckCircle className="mr-3 text-lg" />
                                                Verify & Continue
                                                <FiArrowRight className="ml-3 opacity-0 group-hover:opacity-100 transition-all duration-300" />
                                            </>
                                        )}
                                    </button>
                                </div>

                                {/* Security Note */}
                                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-center">
                                    <div className="flex items-center justify-center space-x-2 text-sm text-gray-600">
                                        <FiShield className="text-blue-500" />
                                        <span>This code expires in 10 minutes for security purposes</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Login Success Display */}
                        {loginSuccess && (
                            <div className="space-y-6">
                                <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-8 text-center relative overflow-hidden">
                                    <div className="absolute inset-0 bg-confetti opacity-10"></div>
                                    <div className="relative z-10">
                                        <div className="w-20 h-20 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg animate-bounce">
                                            <FiCheckCircle className="text-white text-3xl" />
                                        </div>
                                        <h3 className="font-bold text-green-900 text-xl mb-2">Login Successful!</h3>
                                        <p className="text-green-700">Redirecting to dashboard...</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Footer */}
                        {!loginSuccess && !showBranchSelection && phase === 1 && (
                            <div className="mt-8 pt-6 border-t border-gray-200 text-center">
                                <p className="text-gray-600 text-sm">
                                    Don't have an account?{' '}
                                    <button className="text-blue-600 hover:text-blue-700 font-semibold hover:underline">
                                        Request access
                                    </button>
                                </p>
                                <p className="text-gray-500 text-xs mt-3">
                                    By continuing, you agree to our{' '}
                                    <button className="text-blue-600 hover:underline">Terms of Service</button>
                                    {' '}and{' '}
                                    <button className="text-blue-600 hover:underline">Privacy Policy</button>
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Add animations to global styles */}
            <style jsx>{`
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
                
                @keyframes pulse-slow {
                    0%, 100% {
                        opacity: 1;
                    }
                    50% {
                        opacity: 0.8;
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
                
                .animate-pulse-slow {
                    animation: pulse-slow 2s infinite;
                }
                
                .bg-confetti {
                    background-image: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%2310b981' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
                }
            `}</style>
        </div>
    );
};

export default Login;