// BranchSetupModal.jsx - With Custom Headers for Backend
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiHome, FiMail, FiCheck, FiX, FiAlertCircle, FiCheckCircle, FiChevronRight } from 'react-icons/fi';
import API_BASE_URL from '../utils/api-controller';

const BranchSetupModal = ({ isOpen, onBranchCreated, onClose, invitationToken }) => {
    const [mode, setMode] = useState('choose');
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [invitationData, setInvitationData] = useState(null);
    const [acceptingInvitation, setAcceptingInvitation] = useState(false);
    const [invitationAccepted, setInvitationAccepted] = useState(false);
    
    const [formData, setFormData] = useState({
        branch_name: '',
        branch_code: '',
        address_line_1: '',
        address_line_2: '',
        city: '',
        state: '',
        country: 'India',
        pincode: '',
        mobile_1: '',
        mobile_2: '',
        email_1: '',
        email_2: '',
        gst: '',
        gst_rate: 0,
        pan: '',
        invoice_address: '',
        is_head_office: true
    });

    // Function to get custom headers for backend
   // BranchSetupModal.jsx - Update these functions

const getCustomHeaders = (skipBranch = false) => {
    // FIX: Use correct localStorage keys
    const userName = localStorage.getItem('username') ||      // Try 'username' first
                    localStorage.getItem('user_username') ||  // Fallback to 'user_username'
                    localStorage.getItem('user_name');
    
    const token = localStorage.getItem('token') ||           // Try 'token' first
                  localStorage.getItem('user_token');        // Fallback to 'user_token'
    
    const branchId = localStorage.getItem('branch_id') || '';

    const headers = {
        'Content-Type': 'application/json'
    };

    // FIX: Always send username if available
    if (userName) {
        headers['username'] = userName;
        console.log('Sending username:', userName);
    } else {
        console.error('No username found in localStorage!');
        // Try to get from somewhere else or show error
        const userData = JSON.parse(localStorage.getItem('user') || '{}');
        if (userData.username) {
            headers['username'] = userData.username;
            console.log('Using username from user object:', userData.username);
        }
    }
    
    if (token) {
        headers['token'] = token;
        console.log('Sending token:', token.substring(0, 10) + '...');
    }
    
    if (branchId && !skipBranch) {
        headers['branch'] = branchId;
    }

    return headers;
};

const acceptInvitation = async () => {
    setAcceptingInvitation(true);
    setError('');
    
    try {
        // FIX: Get username correctly
        const username = localStorage.getItem('username') || 
                        localStorage.getItem('user_username') ||
                        JSON.parse(localStorage.getItem('user') || '{}').username;
        
        if (!username) {
            throw new Error('User not logged in. Please login again.');
        }
        
        const headers = getCustomHeaders(true);
        
        const response = await fetch(`${API_BASE_URL}/branch/invitations/accept/${invitationToken}`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({
                username: username  // FIX: Send 'username' not 'user_id'
            })
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            localStorage.setItem('branch_id', data.data.branch_id);
            localStorage.setItem('branch_name', data.data.branch_name);
            localStorage.setItem('branch_code', data.data.branch_code);
            
            setInvitationAccepted(true);
            
            if (onBranchCreated) {
                onBranchCreated(data.data);
            }
            
            setTimeout(() => {
                onClose();
            }, 1500);
        } else {
            setError(data.message || 'Failed to accept invitation');
        }
    } catch (err) {
        console.error('Accept invitation error:', err);
        setError(err.message || 'Network error. Please try again.');
    } finally {
        setAcceptingInvitation(false);
    }
};

    useEffect(() => {
        if (invitationToken && isOpen) {
            verifyInvitation();
        }
    }, [invitationToken, isOpen]);

    const verifyInvitation = async () => {
        setLoading(true);
        setError('');
        
        try {
            // Skip branch header for invitation (branch doesn't exist yet)
            const headers = getCustomHeaders(true);
            
            const response = await fetch(`${API_BASE_URL}/branch/invitations/verify/${invitationToken}`, {
                method: 'GET',
                headers: headers
            });
            
            const data = await response.json();
            
            if (response.ok && data.success) {
                setInvitationData(data.data);
                setMode('accept');
            } else {
                setError(data.message || 'Invalid or expired invitation');
                setMode('choose');
            }
        } catch (err) {
            console.error('Invitation verification error:', err);
            setError('Failed to verify invitation');
            setMode('choose');
        } finally {
            setLoading(false);
        }
    };
    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const validateStep1 = () => {
        if (!formData.branch_name.trim()) {
            setError('Branch name is required');
            return false;
        }
        if (!formData.branch_code.trim()) {
            setError('Branch code is required');
            return false;
        }
        if (!formData.address_line_1.trim()) {
            setError('Address is required');
            return false;
        }
        if (!formData.city.trim()) {
            setError('City is required');
            return false;
        }
        if (!formData.state.trim()) {
            setError('State is required');
            return false;
        }
        setError('');
        return true;
    };

    const validateStep2 = () => {
        if (!formData.mobile_1.trim()) {
            setError('Phone number is required');
            return false;
        }
        if (formData.email_1 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email_1)) {
            setError('Invalid email format');
            return false;
        }
        setError('');
        return true;
    };

    const handleNext = () => {
        if (step === 1 && validateStep1()) {
            setStep(2);
        } else if (step === 2 && validateStep2()) {
            createBranch();
        }
    };

    const handlePrevious = () => {
        setStep(1);
        setError('');
    };

    const createBranch = async () => {
        setLoading(true);
        setError('');

        const branchData = {
            branch_name: formData.branch_name,
            branch_code: formData.branch_code,
            address_line_1: formData.address_line_1,
            address_line_2: formData.address_line_2 || null,
            city: formData.city,
            state: formData.state,
            country: formData.country,
            pincode: formData.pincode || null,
            invoice_address: formData.invoice_address || null,
            pan: formData.pan || null,
            gst: formData.gst || null,
            gst_rate: parseFloat(formData.gst_rate) || 0,
            mobile_1: formData.mobile_1,
            mobile_2: formData.mobile_2 || null,
            email_1: formData.email_1 || null,
            email_2: formData.email_2 || null,
            is_head_office: formData.is_head_office
        };

        try {
            // Skip branch header for branch creation (branch doesn't exist yet)
            const headers = getCustomHeaders(true);
            
            console.log('Sending headers:', headers);
            console.log('Branch Data:', branchData);
            
            const response = await fetch(`${API_BASE_URL}/branch/create`, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(branchData)
            });

            const data = await response.json();
            console.log('Response:', data);

            if (response.ok && data.success) {
                // Store branch info in localStorage
                localStorage.setItem('branch_id', data.data.branch_id);
                localStorage.setItem('branch_name', data.data.branch_name || formData.branch_name);
                localStorage.setItem('branch_code', data.data.branch_code || formData.branch_code);
                
                if (onBranchCreated) {
                    onBranchCreated(data.data);
                }
                
                setStep(3);
                setTimeout(() => {
                    onClose();
                }, 1500);
            } else {
                setError(data.message || 'Failed to create branch');
            }
        } catch (err) {
            console.error('Branch creation error:', err);
            setError(err.message || 'Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const renderChooseMode = () => (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-5"
        >
            <div className="text-center mb-5">
                <div className="w-16 h-16 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <FiHome className="w-8 h-8 text-indigo-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-800 mb-1">Setup Your Branch</h2>
                <p className="text-sm text-gray-500">Choose how to set up your branch</p>
            </div>

            {error && (
                <div className="mb-4 p-2 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-xs">
                    <FiAlertCircle className="w-3 h-3" />
                    <span>{error}</span>
                </div>
            )}

            <div className="space-y-3">
                <button
                    onClick={() => setMode('create')}
                    className="w-full p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-200 hover:border-indigo-400 transition-all duration-300 text-left group"
                >
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg">
                            <FiHome className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-base font-semibold text-gray-800">Create New Branch</h3>
                            <p className="text-xs text-gray-500">Set up a completely new branch</p>
                        </div>
                        <FiChevronRight className="w-4 h-4 text-gray-400" />
                    </div>
                </button>

                <button
                    onClick={() => setMode('accept')}
                    className="w-full p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200 hover:border-green-400 transition-all duration-300 text-left group"
                >
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg">
                            <FiMail className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-base font-semibold text-gray-800">Accept Invitation</h3>
                            <p className="text-xs text-gray-500">Join an existing branch</p>
                        </div>
                        <FiChevronRight className="w-4 h-4 text-gray-400" />
                    </div>
                </button>
            </div>
        </motion.div>
    );

    const renderAcceptInvitation = () => (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="p-5"
        >
            {invitationAccepted ? (
                <div className="text-center py-6">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <FiCheckCircle className="w-8 h-8 text-green-600" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-800 mb-1">Invitation Accepted!</h3>
                    <p className="text-sm text-gray-600">You have joined {invitationData?.branch_name}</p>
                </div>
            ) : (
                <>
                    <div className="text-center mb-4">
                        <div className="w-16 h-16 bg-gradient-to-br from-green-100 to-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
                            <FiMail className="w-8 h-8 text-green-600" />
                        </div>
                        <h2 className="text-xl font-bold text-gray-800 mb-1">Branch Invitation</h2>
                        <p className="text-sm text-gray-500">You have been invited to join</p>
                    </div>

                    {error && (
                        <div className="mb-4 p-2 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-xs">
                            <FiAlertCircle className="w-3 h-3" />
                            <span>{error}</span>
                        </div>
                    )}

                    {invitationData && (
                        <div className="bg-gray-50 rounded-lg p-4 mb-5 space-y-2">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-600">Branch:</span>
                                <span className="font-semibold text-gray-800">{invitationData.branch_name}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-600">Code:</span>
                                <span className="font-semibold text-gray-800">{invitationData.branch_code}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-600">Invited by:</span>
                                <span className="font-semibold text-gray-800">{invitationData.invited_by_name}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-600">Role:</span>
                                <span className="font-semibold text-gray-800 capitalize">{invitationData.role || 'Staff'}</span>
                            </div>
                        </div>
                    )}

                    <div className="flex gap-3">
                        <button
                            onClick={() => setMode('choose')}
                            className="flex-1 px-3 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                        >
                            Back
                        </button>
                        <button
                            onClick={acceptInvitation}
                            disabled={acceptingInvitation}
                            className="flex-1 px-3 py-2 text-sm bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {acceptingInvitation ? (
                                <>
                                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    Accepting...
                                </>
                            ) : (
                                <>
                                    <FiCheck className="w-3 h-3" />
                                    Accept
                                </>
                            )}
                        </button>
                    </div>
                </>
            )}
        </motion.div>
    );

    const renderCreateBranch = () => (
        <>
            {step !== 3 && (
                <div className="px-5 pt-4">
                    <div className="flex items-center justify-between">
                        {[1, 2].map((s) => (
                            <React.Fragment key={s}>
                                <div className="flex flex-col items-center">
                                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold ${
                                        step >= s 
                                            ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white' 
                                            : 'bg-gray-200 text-gray-500'
                                    }`}>
                                        {step > s ? <FiCheck className="w-3 h-3" /> : s}
                                    </div>
                                    <span className={`text-xs mt-1 ${step >= s ? 'text-indigo-600' : 'text-gray-400'}`}>
                                        {s === 1 ? 'Basic' : 'Contact'}
                                    </span>
                                </div>
                                {s === 1 && (
                                    <div className={`flex-1 h-0.5 mx-2 rounded-full ${
                                        step > 1 ? 'bg-gradient-to-r from-indigo-600 to-purple-600' : 'bg-gray-200'
                                    }`} />
                                )}
                            </React.Fragment>
                        ))}
                    </div>
                </div>
            )}

            <div className="p-5 max-h-[50vh] overflow-y-auto">
                {error && (
                    <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-xs">
                        <FiAlertCircle className="w-3 h-3" />
                        <span>{error}</span>
                    </div>
                )}

                {step === 1 && (
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="space-y-3"
                    >
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                    Branch Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    name="branch_name"
                                    value={formData.branch_name}
                                    onChange={handleChange}
                                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    placeholder="e.g., Mumbai Main Branch"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                    Branch Code <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    name="branch_code"
                                    value={formData.branch_code}
                                    onChange={handleChange}
                                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    placeholder="e.g., MUM001"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                Address Line 1 <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                name="address_line_1"
                                value={formData.address_line_1}
                                onChange={handleChange}
                                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                placeholder="Street address, building name"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                Address Line 2
                            </label>
                            <input
                                type="text"
                                name="address_line_2"
                                value={formData.address_line_2}
                                onChange={handleChange}
                                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                placeholder="Landmark, area (optional)"
                            />
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                    City <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    name="city"
                                    value={formData.city}
                                    onChange={handleChange}
                                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg"
                                    placeholder="City"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                    State <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    name="state"
                                    value={formData.state}
                                    onChange={handleChange}
                                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg"
                                    placeholder="State"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                    Pincode
                                </label>
                                <input
                                    type="text"
                                    name="pincode"
                                    value={formData.pincode}
                                    onChange={handleChange}
                                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg"
                                    placeholder="Pincode"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                Country
                            </label>
                            <input
                                type="text"
                                name="country"
                                value={formData.country}
                                onChange={handleChange}
                                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg"
                                placeholder="Country"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                Invoice Address
                            </label>
                            <textarea
                                name="invoice_address"
                                value={formData.invoice_address}
                                onChange={handleChange}
                                rows="2"
                                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                placeholder="Invoice address (if different from above)"
                            />
                        </div>

                        <label className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                name="is_head_office"
                                checked={formData.is_head_office}
                                onChange={handleChange}
                                className="w-3.5 h-3.5 text-indigo-600 rounded"
                            />
                            <span className="text-xs text-gray-700">This is the Head Office</span>
                        </label>
                    </motion.div>
                )}

                {step === 2 && (
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="space-y-3"
                    >
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                    Mobile Number <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="tel"
                                    name="mobile_1"
                                    value={formData.mobile_1}
                                    onChange={handleChange}
                                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg"
                                    placeholder="Primary mobile number"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                    Alternate Mobile
                                </label>
                                <input
                                    type="tel"
                                    name="mobile_2"
                                    value={formData.mobile_2}
                                    onChange={handleChange}
                                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg"
                                    placeholder="Alternate mobile number"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                    Email Address
                                </label>
                                <input
                                    type="email"
                                    name="email_1"
                                    value={formData.email_1}
                                    onChange={handleChange}
                                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg"
                                    placeholder="Primary email"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                    Alternate Email
                                </label>
                                <input
                                    type="email"
                                    name="email_2"
                                    value={formData.email_2}
                                    onChange={handleChange}
                                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg"
                                    placeholder="Alternate email"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                    GST Number
                                </label>
                                <input
                                    type="text"
                                    name="gst"
                                    value={formData.gst}
                                    onChange={handleChange}
                                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg"
                                    placeholder="GSTIN"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                    GST Rate (%)
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    name="gst_rate"
                                    value={formData.gst_rate}
                                    onChange={handleChange}
                                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg"
                                    placeholder="GST percentage"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                PAN Number
                            </label>
                            <input
                                type="text"
                                name="pan"
                                value={formData.pan}
                                onChange={handleChange}
                                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg"
                                placeholder="PAN card number"
                            />
                        </div>
                    </motion.div>
                )}

                {step === 3 && (
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="text-center py-6"
                    >
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                            <FiCheck className="w-8 h-8 text-green-600" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-800 mb-1">Branch Created!</h3>
                        <p className="text-sm text-gray-600">Redirecting to dashboard...</p>
                    </motion.div>
                )}
            </div>

            {step !== 3 && (
                <div className="px-5 py-3 bg-gray-50 border-t border-gray-200 flex justify-between gap-3">
                    <button
                        onClick={() => setMode('choose')}
                        className="px-3 py-1.5 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                        Back
                    </button>
                    <div className="flex gap-2">
                        {step === 2 && (
                            <button
                                onClick={handlePrevious}
                                disabled={loading}
                                className="px-3 py-1.5 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                            >
                                Previous
                            </button>
                        )}
                        <button
                            onClick={handleNext}
                            disabled={loading}
                            className="px-4 py-1.5 text-sm bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:shadow-lg disabled:opacity-50 flex items-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    Creating...
                                </>
                            ) : (
                                step === 2 ? 'Create Branch' : 'Continue'
                            )}
                        </button>
                    </div>
                </div>
            )}
        </>
    );

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
                onClick={(e) => {
                    if (e.target === e.currentTarget && !loading && mode !== 'accept') {
                        onClose();
                    }
                }}
            >
                <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden"
                >
                    <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-5 py-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-white/20 rounded-lg">
                                    {mode === 'accept' ? <FiMail className="w-4 h-4 text-white" /> : <FiHome className="w-4 h-4 text-white" />}
                                </div>
                                <div>
                                    <h2 className="text-base font-bold text-white">
                                        {mode === 'choose' && "Setup Branch"}
                                        {mode === 'create' && "Create Branch"}
                                        {mode === 'accept' && "Accept Invitation"}
                                    </h2>
                                </div>
                            </div>
                            {!loading && mode !== 'accept' && step !== 3 && (
                                <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-lg">
                                    <FiX className="w-4 h-4 text-white" />
                                </button>
                            )}
                        </div>
                    </div>

                    {mode === 'choose' && renderChooseMode()}
                    {mode === 'create' && renderCreateBranch()}
                    {mode === 'accept' && renderAcceptInvitation()}
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default BranchSetupModal;