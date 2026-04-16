import React, { useState, useEffect } from 'react';
import { FiMail, FiSettings, FiLink, FiCheckCircle, FiInfo } from 'react-icons/fi';
import { motion } from 'framer-motion';
import { Header, Sidebar } from '../../components/header';

const EmailConfig = () => {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(() => {
        const saved = localStorage.getItem('sidebarMinimized');
        return saved ? JSON.parse(saved) : false;
    });
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('step1');
    
    // Email configuration state
    const [emailConfig, setEmailConfig] = useState({
        platform: 'gmail',
        username: '',
        password: '',
        ssl_tls: 'tls',
        port: '587',
        status: '1'
    });

    // Mock data - replace with actual API calls
    const mockEmailConfig = {
        platform: 'gmail',
        username: 'your.email@gmail.com',
        password: 'your-app-password',
        ssl_tls: 'tls',
        port: '587',
        status: '1'
    };

    // Persist sidebar minimized state
    useEffect(() => {
        localStorage.setItem('sidebarMinimized', JSON.stringify(isMinimized));
    }, [isMinimized]);

    // Lock body scroll when mobile sidebar is open
    useEffect(() => {
        if (mobileMenuOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'auto';
        }
        return () => {
            document.body.style.overflow = 'auto';
        };
    }, [mobileMenuOpen]);

    // Load initial data
    useEffect(() => {
        fetchEmailConfig();
    }, []);

    const fetchEmailConfig = async () => {
        setLoading(true);
        // Simulate API call
        setTimeout(() => {
            setEmailConfig(mockEmailConfig);
            setLoading(false);
        }, 1000);
    };

    const handleInputChange = (field, value) => {
        setEmailConfig(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        
        // Simulate API call
        setTimeout(() => {
            setLoading(false);
            alert('Email configuration updated successfully!');
        }, 1000);
    };

    const platformOptions = [
        { value: 'gmail', label: 'GMAIL (Google)' }
    ];

    const sslTlsOptions = [
        { value: 'ssl', label: 'SSL' },
        { value: 'tls', label: 'TLS' }
    ];

    const statusOptions = [
        { value: '1', label: 'Active' },
        { value: '0', label: 'Inactive' }
    ];

    return (
        <div className="min-h-screen bg-gray-50">
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

            {/* Main content */}
            <div className={`pt-16 transition-all duration-300 ease-in-out ${isMinimized ? 'md:pl-20' : 'md:pl-[260px]'}`}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-6">
                    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                        <div className="border-b border-gray-200 px-6 py-4">
                            <h5 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                                <FiMail className="w-5 h-5" />
                                Email Configuration
                            </h5>
                        </div>
                        
                        <div className="p-6">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                {/* Configuration Form */}
                                <div>
                                    <form onSubmit={handleSubmit}>
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Platform
                                                </label>
                                                <select
                                                    value={emailConfig.platform}
                                                    onChange={(e) => handleInputChange('platform', e.target.value)}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                                                >
                                                    {platformOptions.map(option => (
                                                        <option key={option.value} value={option.value}>
                                                            {option.label}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Username
                                                </label>
                                                <input
                                                    type="email"
                                                    value={emailConfig.username}
                                                    onChange={(e) => handleInputChange('username', e.target.value)}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                                                    placeholder="Enter SMTP username (Email)"
                                                    required
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Password
                                                </label>
                                                <input
                                                    type="text"
                                                    value={emailConfig.password}
                                                    onChange={(e) => handleInputChange('password', e.target.value)}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                                                    placeholder="Enter SMTP password"
                                                    required
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    SSL/TLS
                                                </label>
                                                <select
                                                    value={emailConfig.ssl_tls}
                                                    onChange={(e) => handleInputChange('ssl_tls', e.target.value)}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                                                >
                                                    {sslTlsOptions.map(option => (
                                                        <option key={option.value} value={option.value}>
                                                            {option.label}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    PORT
                                                </label>
                                                <input
                                                    type="text"
                                                    value={emailConfig.port}
                                                    onChange={(e) => handleInputChange('port', e.target.value)}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                                                    placeholder="Enter port"
                                                    required
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Status
                                                </label>
                                                <select
                                                    value={emailConfig.status}
                                                    onChange={(e) => handleInputChange('status', e.target.value)}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                                                >
                                                    {statusOptions.map(option => (
                                                        <option key={option.value} value={option.value}>
                                                            {option.label}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div className="pt-4">
                                                <motion.button
                                                    type="submit"
                                                    disabled={loading}
                                                    className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                                                    whileHover={{ scale: 1.02 }}
                                                    whileTap={{ scale: 0.98 }}
                                                >
                                                    <FiSettings className="w-4 h-4" />
                                                    {loading ? 'Updating...' : 'Update Configuration'}
                                                </motion.button>
                                            </div>
                                        </div>
                                    </form>
                                </div>

                                {/* Configuration Guide */}
                                <div>
                                    <div className="bg-gray-50 rounded-lg border border-gray-200">
                                        <div className="border-b border-gray-200 px-4 py-3">
                                            <h6 className="font-semibold text-gray-800 flex items-center gap-2">
                                                <FiInfo className="w-4 h-4 text-indigo-600" />
                                                Gmail (Google) Configuration Guide
                                            </h6>
                                        </div>
                                        
                                        <div className="p-4">
                                            {/* Step Navigation */}
                                            <div className="flex border-b border-gray-200 mb-4">
                                                <button
                                                    onClick={() => setActiveTab('step1')}
                                                    className={`flex-1 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                                                        activeTab === 'step1' 
                                                            ? 'border-indigo-600 text-indigo-600' 
                                                            : 'border-transparent text-gray-500 hover:text-gray-700'
                                                    }`}
                                                >
                                                    Step 1
                                                </button>
                                                <button
                                                    onClick={() => setActiveTab('step2')}
                                                    className={`flex-1 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                                                        activeTab === 'step2' 
                                                            ? 'border-indigo-600 text-indigo-600' 
                                                            : 'border-transparent text-gray-500 hover:text-gray-700'
                                                    }`}
                                                >
                                                    Step 2
                                                </button>
                                                <button
                                                    onClick={() => setActiveTab('step3')}
                                                    className={`flex-1 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                                                        activeTab === 'step3' 
                                                            ? 'border-indigo-600 text-indigo-600' 
                                                            : 'border-transparent text-gray-500 hover:text-gray-700'
                                                    }`}
                                                >
                                                    Step 3
                                                </button>
                                            </div>

                                            {/* Step Content */}
                                            <div className="space-y-4">
                                                {activeTab === 'step1' && (
                                                    <div>
                                                        <div className="flex items-center gap-2 mb-3">
                                                            <FiCheckCircle className="w-5 h-5 text-green-600" />
                                                            <h6 className="font-medium text-gray-800">
                                                                Enable 2-Step Verification
                                                            </h6>
                                                        </div>
                                                        <p className="text-sm text-gray-600 mb-3">
                                                            Enable 2-Step Verification in your Google Account
                                                        </p>
                                                        <a 
                                                            href="https://myaccount.google.com/security" 
                                                            target="_blank" 
                                                            rel="noopener noreferrer"
                                                            className="inline-flex items-center gap-2 px-3 py-2 text-sm text-indigo-600 hover:text-indigo-700 bg-indigo-50 rounded-lg transition-colors"
                                                        >
                                                            <FiLink className="w-4 h-4" />
                                                            Open Account Settings
                                                        </a>
                                                    </div>
                                                )}

                                                {activeTab === 'step2' && (
                                                    <div>
                                                        <div className="flex items-center gap-2 mb-3">
                                                            <FiCheckCircle className="w-5 h-5 text-green-600" />
                                                            <h6 className="font-medium text-gray-800">
                                                                Set App Password
                                                            </h6>
                                                        </div>
                                                        <p className="text-sm text-gray-600 mb-3">
                                                            Go to the link below and create an app password. Then copy the generated password.
                                                        </p>
                                                        <a 
                                                            href="https://myaccount.google.com/apppasswords" 
                                                            target="_blank" 
                                                            rel="noopener noreferrer"
                                                            className="inline-flex items-center gap-2 px-3 py-2 text-sm text-indigo-600 hover:text-indigo-700 bg-indigo-50 rounded-lg transition-colors"
                                                        >
                                                            <FiLink className="w-4 h-4" />
                                                            https://myaccount.google.com/apppasswords
                                                        </a>
                                                    </div>
                                                )}

                                                {activeTab === 'step3' && (
                                                    <div>
                                                        <div className="flex items-center gap-2 mb-3">
                                                            <FiCheckCircle className="w-5 h-5 text-green-600" />
                                                            <h6 className="font-medium text-gray-800">
                                                                Configure Email Settings
                                                            </h6>
                                                        </div>
                                                        <p className="text-sm text-gray-600 mb-3">
                                                            Use the following configuration in the form:
                                                        </p>
                                                        <div className="bg-white border border-gray-200 rounded-lg p-4">
                                                            <ul className="space-y-2 text-sm text-gray-700">
                                                                <li className="flex items-center gap-2">
                                                                    <div className="w-2 h-2 bg-indigo-600 rounded-full"></div>
                                                                    <span><strong>Platform:</strong> Gmail (Google)</span>
                                                                </li>
                                                                <li className="flex items-center gap-2">
                                                                    <div className="w-2 h-2 bg-indigo-600 rounded-full"></div>
                                                                    <span><strong>Username:</strong> Your Email address</span>
                                                                </li>
                                                                <li className="flex items-center gap-2">
                                                                    <div className="w-2 h-2 bg-indigo-600 rounded-full"></div>
                                                                    <span><strong>Password:</strong> Google generated password</span>
                                                                </li>
                                                                <li className="flex items-center gap-2">
                                                                    <div className="w-2 h-2 bg-indigo-600 rounded-full"></div>
                                                                    <span><strong>SSL/TLS:</strong> TLS</span>
                                                                </li>
                                                                <li className="flex items-center gap-2">
                                                                    <div className="w-2 h-2 bg-indigo-600 rounded-full"></div>
                                                                    <span><strong>Port:</strong> 587</span>
                                                                </li>
                                                                <li className="flex items-center gap-2">
                                                                    <div className="w-2 h-2 bg-indigo-600 rounded-full"></div>
                                                                    <span><strong>Status:</strong> Active</span>
                                                                </li>
                                                            </ul>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Step Indicator */}
                                            <div className="mt-6 pt-4 border-t border-gray-200">
                                                <div className="flex items-center justify-between text-xs text-gray-500">
                                                    <span>Step {activeTab.replace('step', '')} of 3</span>
                                                    <div className="flex gap-1">
                                                        {[1, 2, 3].map(step => (
                                                            <div
                                                                key={step}
                                                                className={`w-2 h-2 rounded-full ${
                                                                    activeTab === `step${step}` 
                                                                        ? 'bg-indigo-600' 
                                                                        : 'bg-gray-300'
                                                                }`}
                                                            ></div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Quick Tips */}
                                    <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                                        <div className="flex items-start gap-3">
                                            <FiInfo className="w-5 h-5 text-yellow-600 mt-0.5" />
                                            <div>
                                                <h6 className="font-medium text-yellow-800 mb-1">Important Notes</h6>
                                                <ul className="text-sm text-yellow-700 space-y-1">
                                                    <li>• Use App Password, not your regular Google password</li>
                                                    <li>• Make sure 2FA is enabled on your Google account</li>
                                                    <li>• Test the configuration after updating</li>
                                                </ul>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EmailConfig;