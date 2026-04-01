// finance/bank/bank-modals.js
import React, { useState, useEffect, useRef, useMemo, useCallback} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IoTrash, IoAdd } from "react-icons/io5";
import { FiX, FiArrowRight , FiUser, FiDollarSign,FiChevronDown, FiShoppingBag, FiTruck, FiFileText, FiRepeat, FiPlus, FiTrash2, FiSearch, FiMail, FiPhone, FiCreditCard, FiCalendar, FiHash, FiHome } from 'react-icons/fi';
import toast from 'react-hot-toast';
import API_BASE_URL from '../../utils/api-controller';
import getHeaders from '../../utils/get-headers';
import axios from 'axios';
import DatePickerComponent from '../../components/DatePickerComponent';
import { debounce } from 'lodash';
const appSettings = {
    company_name: 'Professional Accounting Services',
    gst_applicable: true,
    default_gst_rate: 18,
    currency: 'INR',
};

// Base Modal Component
const BaseModal = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <>
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                    onClick={onClose}
                />
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
                >
                    <div className="w-full max-w-3xl max-h-[90vh] overflow-hidden bg-white rounded-2xl shadow-2xl pointer-events-auto mx-4">
                        <div className="flex justify-between items-center p-6 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white">
                            <h2 className="text-2xl font-bold text-slate-800">{title}</h2>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                                <FiX className="w-6 h-6 text-slate-500" />
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto max-h-[calc(90vh-88px)]">
                            {children}
                        </div>
                    </div>
                </motion.div>
            </>
        </AnimatePresence>
    );
};

// Receive Modal - Updated with correct API response mapping
// Receive Modal - Updated with single client display
// Receive Modal - Updated with fix to prevent second API call after selection
export const ReceiveModal = ({ isOpen, onClose, bankDetails, bankId, onSubmit, formatCurrency, summary }) => {
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [firms, setFirms] = useState([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [selectedFirm, setSelectedFirm] = useState(null);
    const [showDropdown, setShowDropdown] = useState(false);

    // Search clients API
    const searchClients = async (term) => {
        if (!term || term.length < 2) {
            setFirms([]);
            return;
        }

        setSearchLoading(true);
        try {
            const response = await axios.get(
                `${API_BASE_URL}/firm/search?search=${term}`,
                { headers: getHeaders() }
            );
            
            if (response.data.success) {
                console.log('Search response:', response.data);
                setFirms(response.data.data || []);
                setShowDropdown(true);
            }
        } catch (error) {
            console.error('Error searching clients:', error);
            toast.error('Failed to search clients');
        } finally {
            setSearchLoading(false);
        }
    };

    // Debounce search - but only if no firm is selected
    useEffect(() => {
        // Don't search if a firm is already selected
        if (selectedFirm) {
            return;
        }
        
        const debounceTimer = setTimeout(() => {
            if (searchTerm && searchTerm.length >= 2) {
                searchClients(searchTerm);
            } else {
                setFirms([]);
                setShowDropdown(false);
            }
        }, 500);

        return () => clearTimeout(debounceTimer);
    }, [searchTerm, selectedFirm]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        console.log('=== RECEIVE MODAL - FORM SUBMITTED ===');
        
        if (!selectedFirm) {
            console.error('Validation failed: No client selected');
            toast.error('Please select a client');
            return;
        }

        if (!bankId) {
            console.error('Validation failed: No bank selected');
            toast.error('Bank information not available');
            return;
        }

        const formData = new FormData(e.target);
        const amount = formData.get('amount');
        const date = formData.get('date');
        const description = formData.get('description');

        console.log('Form values:', { amount, date, description });
        console.log('Selected client:', selectedFirm);
        console.log('Bank ID:', bankId);
        console.log('Bank details:', bankDetails);

        if (!amount || parseFloat(amount) <= 0) {
            console.error('Validation failed: Invalid amount', amount);
            toast.error('Please enter a valid amount');
            return;
        }

        setLoading(true);
        
        // CORRECTED: For RECEIVE API - Client is party1, Bank is party2
        // This means the client is giving money (sending) and bank is receiving it
        const payload = {
            amount: parseFloat(amount),
            party1_id: selectedFirm.client?.username,  // Client username as party1_id
            party1_type: "client",                    // party1_type is client
            party2_id: bankId,                        // Bank ID as party2_id
            party2_type: "bank",                      // party2_type is bank
            remark: description || `Payment received from ${selectedFirm.client?.name}`,
            transaction_date: date
        };

        console.log('Receive payment payload:', JSON.stringify(payload, null, 2));
        console.log('API Endpoint:', `${API_BASE_URL}/transaction/payment/receive`);

        try {
            const response = await axios.post(
                `${API_BASE_URL}/transaction/payment/receive`,
                payload,
                { headers: getHeaders() }
            );

            console.log('Receive payment response status:', response.status);
            console.log('Receive payment response data:', response.data);

            if (response.data.success) {
                console.log('Receive payment successful:', response.data.message);
                toast.success(response.data.message || 'Payment received successfully');
                if (onSubmit) {
                    onSubmit('RECEIVE', response.data.data);
                }
                onClose();
                // Reset form
                setSearchTerm('');
                setSelectedFirm(null);
                setFirms([]);
            } else {
                console.error('Receive payment failed:', response.data);
                toast.error(response.data.message || 'Payment receive failed');
            }
        } catch (error) {
            console.error('=== ERROR IN RECEIVE PAYMENT ===');
            console.error('Error object:', error);
            console.error('Error message:', error.message);
            
            if (error.response) {
                console.error('Error response status:', error.response.status);
                console.error('Error response status text:', error.response.statusText);
                console.error('Error response data:', error.response.data);
                
                if (error.response.data) {
                    console.error('Error details:', {
                        message: error.response.data.message,
                        error: error.response.data.error,
                        ...error.response.data
                    });
                    
                    // Check for party_id specific errors
                    if (error.response.data.message && error.response.data.message.includes('party_id')) {
                        console.error('Party ID validation failed:', {
                            party1_id: payload.party1_id,
                            party1_type: payload.party1_type,
                            party2_id: payload.party2_id,
                            party2_type: payload.party2_type
                        });
                    }
                }
                
                const errorMessage = error.response?.data?.message || 
                                    error.response?.data?.error || 
                                    `Server error: ${error.response.status} ${error.response.statusText}`;
                toast.error(errorMessage);
            } else if (error.request) {
                console.error('No response received from server');
                toast.error('No response from server. Please check your network connection.');
            } else {
                console.error('Error setting up request:', error.message);
                toast.error(`Request error: ${error.message}`);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <BaseModal isOpen={isOpen} onClose={onClose} title="Create Receive from Client">
            <form onSubmit={handleSubmit} className="space-y-5">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 mb-4">
                    <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                            <p className="text-xs text-blue-600 font-medium">Bank Name</p>
                            <p className="text-sm font-bold text-slate-700">{bankDetails?.bank || 'Current Bank'}</p>
                        </div>
                        <div>
                            <p className="text-xs text-blue-600 font-medium">Bank Balance</p>
                            <p className="text-lg font-bold text-blue-700">₹{formatCurrency(bankDetails?.balance || 0)}</p>
                        </div>
                        <div>
                            <p className="text-xs text-blue-600 font-medium">Bank ID</p>
                            <p className="text-xs font-mono text-slate-600">{bankId || 'N/A'}</p>
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    {/* Client Search */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Search Client <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    setSearchTerm(value);
                                    // Clear selected firm when user starts typing again
                                    if (selectedFirm) {
                                        setSelectedFirm(null);
                                    }
                                    if (!value) {
                                        setFirms([]);
                                        setShowDropdown(false);
                                    }
                                }}
                                onFocus={() => {
                                    // Only show dropdown if there are firms and no firm is selected
                                    if (firms.length > 0 && !selectedFirm) {
                                        setShowDropdown(true);
                                    }
                                }}
                                placeholder="Type client name, mobile or PAN to search..."
                                className="w-full px-4 py-3 pl-10 border-2 border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                            {searchLoading && (
                                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
                                </div>
                            )}
                        </div>

                        {/* Search Results Dropdown */}
                        {showDropdown && firms.length > 0 && (
                            <div className="absolute z-10 mt-1 w-full max-w-[calc(100%-3rem)] bg-white border-2 border-slate-200 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                                {firms.map((firm) => (
                                    <button
                                        key={firm.firm_id}
                                        type="button"
                                        onClick={() => {
                                            console.log('Selected firm:', firm);
                                            setSelectedFirm(firm);
                                            setSearchTerm(firm.firm_name);
                                            setShowDropdown(false);
                                            setFirms([]); // Clear the firms list
                                        }}
                                        className="w-full px-4 py-3 text-left hover:bg-blue-50 border-b border-slate-100 last:border-0 transition-colors"
                                    >
                                        <div className="font-medium text-slate-800">{firm.firm_name}</div>
                                        <div className="text-sm text-slate-500 flex items-center gap-3 mt-1">
                                            <span className="flex items-center gap-1">
                                                <FiUser className="w-3 h-3" />
                                                {firm.client?.name || 'N/A'}
                                            </span>
                                            <span>•</span>
                                            <span className="flex items-center gap-1">
                                                <FiPhone className="w-3 h-3" />
                                                {firm.client?.mobile || 'N/A'}
                                            </span>
                                        </div>
                                        <div className="text-xs text-slate-400 mt-1">
                                            Username: {firm.client?.username || 'N/A'} | PAN: {firm.client?.pan_number || firm.pan_no || 'N/A'}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Selected Client Details Card */}
                        {selectedFirm && (
                            <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg">
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-sm font-semibold text-blue-800">Selected Client</h3>
                                    <span className="px-2 py-0.5 bg-blue-600 text-white text-xs rounded-full">Active</span>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <p className="text-xs text-blue-600 font-medium mb-1">Client Name</p>
                                        <p className="text-sm font-semibold text-slate-800">{selectedFirm.client?.name}</p>
                                    </div>
                                    
                                    <div>
                                        <p className="text-xs text-blue-600 font-medium mb-1">Username</p>
                                        <p className="text-sm font-mono text-slate-700">{selectedFirm.client?.username}</p>
                                    </div>
                                    
                                    <div>
                                        <p className="text-xs text-blue-600 font-medium mb-1 flex items-center gap-1">
                                            <FiPhone className="w-3 h-3" /> Phone
                                        </p>
                                        <p className="text-sm text-slate-700">{selectedFirm.client?.mobile || 'N/A'}</p>
                                    </div>
                                    
                                    <div>
                                        <p className="text-xs text-blue-600 font-medium mb-1 flex items-center gap-1">
                                            <FiCreditCard className="w-3 h-3" /> PAN
                                        </p>
                                        <p className="text-sm font-mono text-slate-700">
                                            {selectedFirm.client?.pan_number || selectedFirm.pan_no || 'N/A'}
                                        </p>
                                    </div>
                                </div>
                                
                                {/* Hidden field to store client username */}
                                <input 
                                    type="hidden" 
                                    name="client_username" 
                                    value={selectedFirm.client?.username} 
                                />
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Date <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="date"
                                name="date"
                                defaultValue={new Date().toISOString().split('T')[0]}
                                required
                                className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Amount <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="number"
                                name="amount"
                                placeholder="Enter amount"
                                required
                                min="0.01"
                                step="0.01"
                                className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Description
                        </label>
                        <textarea
                            name="description"
                            placeholder="Enter description"
                            rows="3"
                            className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>

                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                        <p className="text-xs text-slate-600 mb-2">Transaction Flow Summary</p>
                        <div className="flex items-center justify-between text-sm">
                            <span className="font-medium">From (Client):</span>
                            <span className="text-blue-600">{selectedFirm?.client?.name || 'Not selected'}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm mt-1">
                            <span className="font-medium">To (Bank):</span>
                            <span className="text-blue-600">{bankDetails?.bank || 'Not selected'}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm mt-1">
                            <span className="font-medium">Transaction Type:</span>
                            <span className="text-green-600">Receive Payment</span>
                        </div>
                    </div>
                </div>

                <div className="flex gap-3 pt-4 border-t border-slate-200">
                    <button
                        type="submit"
                        disabled={loading || !selectedFirm}
                        className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg text-base font-medium hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center"
                    >
                        {loading ? (
                            <>
                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Processing...
                            </>
                        ) : (
                            'Receive Payment'
                        )}
                    </button>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={loading}
                        className="flex-1 px-6 py-3 bg-white border-2 border-slate-200 text-slate-700 rounded-lg text-base font-medium hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 disabled:opacity-50 transition-all duration-200"
                    >
                        Cancel
                    </button>
                </div>
            </form>
        </BaseModal>
    );
};

// Payment Modal - Updated with fix to prevent second API call after selection
export const PaymentModal = ({ isOpen, onClose, bankDetails, bankId, onSubmit, formatCurrency, summary }) => {
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [firms, setFirms] = useState([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [selectedFirm, setSelectedFirm] = useState(null);
    const [showDropdown, setShowDropdown] = useState(false);

    // Search clients API
    const searchClients = async (term) => {
        if (!term || term.length < 2) {
            setFirms([]);
            return;
        }

        setSearchLoading(true);
        try {
            const response = await axios.get(
                `${API_BASE_URL}/firm/search?search=${term}`,
                { headers: getHeaders() }
            );
            
            if (response.data.success) {
                console.log('Search response:', response.data);
                setFirms(response.data.data || []);
                setShowDropdown(true);
            }
        } catch (error) {
            console.error('Error searching clients:', error);
            toast.error('Failed to search clients');
        } finally {
            setSearchLoading(false);
        }
    };

    // Debounce search - but only if no firm is selected
    useEffect(() => {
        // Don't search if a firm is already selected
        if (selectedFirm) {
            return;
        }
        
        const debounceTimer = setTimeout(() => {
            if (searchTerm && searchTerm.length >= 2) {
                searchClients(searchTerm);
            } else {
                setFirms([]);
                setShowDropdown(false);
            }
        }, 500);

        return () => clearTimeout(debounceTimer);
    }, [searchTerm, selectedFirm]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!selectedFirm) {
            toast.error('Please select a client');
            return;
        }

        const formData = new FormData(e.target);
        const amount = formData.get('amount');
        const date = formData.get('date');
        const description = formData.get('description');
        const paymentMode = formData.get('payment_mode');

        if (!amount || parseFloat(amount) <= 0) {
            toast.error('Please enter a valid amount');
            return;
        }

        setLoading(true);
        
        const payload = {
            amount: parseFloat(amount),
            party1_id: bankId,
            party2_id: selectedFirm.client?.username,
            party1_type: "bank",
            party2_type: "client",
            remark: description || `Payment made to ${selectedFirm.client?.name} via ${paymentMode}`,
            transaction_date: date
        };

        try {
            const response = await axios.post(
                `${API_BASE_URL}/transaction/payment/payment`,
                payload,
                { headers: getHeaders() }
            );

            if (response.data.success) {
                toast.success(response.data.message || 'Payment made successfully');
                onSubmit('PAYMENT', response.data.data);
                onClose();
                // Reset form
                setSearchTerm('');
                setSelectedFirm(null);
                setFirms([]);
            }
        } catch (error) {
            console.error('Error creating payment transaction:', error);
            toast.error(error.response?.data?.message || 'Failed to create payment transaction');
        } finally {
            setLoading(false);
        }
    };

    return (
        <BaseModal isOpen={isOpen} onClose={onClose} title="Create Payment to Client">
            <form onSubmit={handleSubmit} className="space-y-5">
                <div className="bg-red-50 p-4 rounded-lg border border-red-200 mb-4">
                    <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                            <p className="text-xs text-red-600 font-medium">Bank Name</p>
                            <p className="text-sm font-bold text-slate-700">{bankDetails?.bank || 'Current Bank'}</p>
                        </div>
                        <div>
                            <p className="text-xs text-red-600 font-medium">Credit</p>
                            <p className="text-sm font-bold text-green-600">₹{formatCurrency(summary?.totalCredit || 0)}</p>
                        </div>
                        <div>
                            <p className="text-xs text-red-600 font-medium">Debit</p>
                            <p className="text-sm font-bold text-red-600">₹{formatCurrency(summary?.totalDebit || 0)}</p>
                        </div>
                        <div className="col-span-3 mt-2 pt-2 border-t border-red-200">
                            <p className="text-xs text-red-600 font-medium">Current Balance</p>
                            <p className="text-lg font-bold text-red-700">₹{formatCurrency(bankDetails?.balance || 0)}</p>
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    {/* Client Search */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Search Client <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    setSearchTerm(value);
                                    // Clear selected firm when user starts typing again
                                    if (selectedFirm) {
                                        setSelectedFirm(null);
                                    }
                                    if (!value) {
                                        setFirms([]);
                                        setShowDropdown(false);
                                    }
                                }}
                                onFocus={() => {
                                    // Only show dropdown if there are firms and no firm is selected
                                    if (firms.length > 0 && !selectedFirm) {
                                        setShowDropdown(true);
                                    }
                                }}
                                placeholder="Type client name, mobile or PAN to search..."
                                className="w-full px-4 py-3 pl-10 border-2 border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                            {searchLoading && (
                                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
                                </div>
                            )}
                        </div>

                        {/* Search Results Dropdown */}
                        {showDropdown && firms.length > 0 && (
                            <div className="absolute z-10 mt-1 w-full max-w-[calc(100%-3rem)] bg-white border-2 border-slate-200 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                                {firms.map((firm) => (
                                    <button
                                        key={firm.firm_id}
                                        type="button"
                                        onClick={() => {
                                            setSelectedFirm(firm);
                                            setSearchTerm(firm.firm_name);
                                            setShowDropdown(false);
                                            setFirms([]); // Clear the firms list
                                        }}
                                        className="w-full px-4 py-3 text-left hover:bg-red-50 border-b border-slate-100 last:border-0 transition-colors"
                                    >
                                        <div className="font-medium text-slate-800">{firm.firm_name}</div>
                                        <div className="text-sm text-slate-500 flex items-center gap-3 mt-1">
                                            <span className="flex items-center gap-1">
                                                <FiUser className="w-3 h-3" />
                                                {firm.client?.name || 'N/A'}
                                            </span>
                                            <span>•</span>
                                            <span className="flex items-center gap-1">
                                                <FiPhone className="w-3 h-3" />
                                                {firm.client?.mobile || 'N/A'}
                                            </span>
                                        </div>
                                        <div className="text-xs text-slate-400 mt-1">
                                            PAN: {firm.client?.pan_number || firm.pan_no || 'N/A'}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Selected Client Details Card - Simplified */}
                        {selectedFirm && (
                            <div className="mt-4 p-4 bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-200 rounded-lg">
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-sm font-semibold text-red-800">Selected Client</h3>
                                    <span className="px-2 py-0.5 bg-red-600 text-white text-xs rounded-full">Active</span>
                                </div>
                                
                                <div className="grid grid-cols-3 gap-3">
                                    <div>
                                        <p className="text-xs text-red-600 font-medium mb-1">Client Name</p>
                                        <p className="text-sm font-semibold text-slate-800">{selectedFirm.client?.name}</p>
                                    </div>
                                    
                                    <div>
                                        <p className="text-xs text-red-600 font-medium mb-1 flex items-center gap-1">
                                            <FiPhone className="w-3 h-3" /> Phone
                                        </p>
                                        <p className="text-sm text-slate-700">{selectedFirm.client?.mobile || 'N/A'}</p>
                                    </div>
                                    
                                    <div>
                                        <p className="text-xs text-red-600 font-medium mb-1 flex items-center gap-1">
                                            <FiCreditCard className="w-3 h-3" /> PAN
                                        </p>
                                        <p className="text-sm font-mono text-slate-700">
                                            {selectedFirm.client?.pan_number || selectedFirm.pan_no || 'N/A'}
                                        </p>
                                    </div>
                                </div>
                                
                                {/* Hidden field to store client username */}
                                <input 
                                    type="hidden" 
                                    name="client_username" 
                                    value={selectedFirm.client?.username} 
                                />
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Date <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="date"
                                name="date"
                                defaultValue={new Date().toISOString().split('T')[0]}
                                required
                                className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Amount <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="number"
                                name="amount"
                                placeholder="Enter amount"
                                required
                                min="0.01"
                                step="0.01"
                                className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Description
                        </label>
                        <textarea
                            name="description"
                            placeholder="Enter description"
                            rows="3"
                            className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Payment Mode <span className="text-red-500">*</span>
                        </label>
                        <select
                            name="payment_mode"
                            required
                            className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="cash">Cash</option>
                            <option value="cheque">Cheque</option>
                            <option value="online">Online Transfer</option>
                            <option value="card">Card</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Select Bank <span className="text-red-500">*</span>
                        </label>
                        <select
                            name="bank"
                            required
                            disabled
                            className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-slate-50"
                        >
                            <option value={bankId}>
                                {bankDetails?.bank || 'Current Bank'} - Balance: ₹{formatCurrency(bankDetails?.balance || 0)}
                            </option>
                        </select>
                    </div>
                </div>

                <div className="flex gap-3 pt-4 border-t border-slate-200">
                    <button
                        type="submit"
                        disabled={loading || !selectedFirm}
                        className="flex-1 px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg text-base font-medium hover:from-red-700 hover:to-red-800 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center"
                    >
                        {loading ? (
                            <>
                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Processing...
                            </>
                        ) : (
                            'Make Payment'
                        )}
                    </button>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={loading}
                        className="flex-1 px-6 py-3 bg-white border-2 border-slate-200 text-slate-700 rounded-lg text-base font-medium hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 disabled:opacity-50 transition-all duration-200"
                    >
                        Cancel
                    </button>
                </div>
            </form>
        </BaseModal>
    );
};
// Sale Modal with Items
export const SaleModal = ({ isOpen, onClose, bankDetails, bankId, onSubmit, formatCurrency }) => {
    const [formData, setFormData] = useState({
        payment_date: new Date().toISOString().split('T')[0],
        items: [{ service_id: '', description: '', price: '', amount: 0, remark: '' }],
        subtotal: 0,
        discount: 0,
        discount_type: 'percentage',
        sgst_rate: appSettings.gst_applicable ? appSettings.default_gst_rate / 2 : 0,
        cgst_rate: appSettings.gst_applicable ? appSettings.default_gst_rate / 2 : 0,
        sgst_amount: 0,
        cgst_amount: 0,
        round_off: 0,
        grand_total: 0,
        notes: '',
        tax_rate: appSettings.default_gst_rate,
        additional_charge: 0,
        apply_round_off: false
    });

    const [serviceOptions, setServiceOptions] = useState([]);
    const [isLoadingServices, setIsLoadingServices] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [sendEmail, setSendEmail] = useState(true);
    const [sendWhatsApp, setSendWhatsApp] = useState(true);

    useEffect(() => {
        if (isOpen) {
            fetchServices();
            resetForm();
        }
    }, [isOpen]);

    const fetchServices = async () => {
        setIsLoadingServices(true);
        try {
            const response = await fetch(`${API_BASE_URL}/service/list?search=&category_id`, {
                method: 'GET',
                headers: getHeaders()
            });
            const data = await response.json();
            if (data.success) {
                setServiceOptions(data.data.map(service => ({
                    service_id: service.service_id,
                    name: service.name,
                    fees: parseFloat(service.fees),
                    category: service.category_name,
                    remark: service.remark
                })));
            }
        } catch (error) {
            console.error('Error fetching services:', error);
        } finally {
            setIsLoadingServices(false);
        }
    };

    const resetForm = () => {
        setFormData({
            payment_date: new Date().toISOString().split('T')[0],
            items: [{ service_id: '', description: '', price: '', amount: 0, remark: '' }],
            subtotal: 0,
            discount: 0,
            discount_type: 'percentage',
            sgst_rate: appSettings.gst_applicable ? appSettings.default_gst_rate / 2 : 0,
            cgst_rate: appSettings.gst_applicable ? appSettings.default_gst_rate / 2 : 0,
            sgst_amount: 0,
            cgst_amount: 0,
            round_off: 0,
            grand_total: 0,
            notes: '',
            tax_rate: appSettings.default_gst_rate,
            additional_charge: 0,
            apply_round_off: false
        });
    };

    const addItem = () => {
        setFormData(prev => ({
            ...prev,
            items: [
                ...prev.items,
                { service_id: '', description: '', price: '', amount: 0, remark: '' }
            ]
        }));
    };

    const removeItem = (index) => {
        if (formData.items.length > 1) {
            setFormData(prev => ({
                ...prev,
                items: prev.items.filter((_, i) => i !== index)
            }));
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: name === 'additional_charge' || name === 'discount' ? parseFloat(value) || 0 : value
        }));
    };

    const handleItemChange = (index, field, value) => {
        const updatedItems = formData.items.map((item, i) => {
            if (i === index) {
                const updatedItem = {
                    ...item,
                    [field]: field === 'price' ? parseFloat(value) || 0 : value
                };
                updatedItem.amount = updatedItem.price || 0;
                return updatedItem;
            }
            return item;
        });

        setFormData(prev => ({ ...prev, items: updatedItems }));
    };

    const handleServiceChange = (index, serviceId) => {
        const service = serviceOptions.find(s => s.service_id === serviceId);
        if (service) {
            const updatedItems = formData.items.map((item, i) =>
                i === index ? {
                    ...item,
                    service_id: serviceId,
                    price: parseFloat(service.fees),
                    amount: parseFloat(service.fees),
                    description: service.name,
                    remark: service.remark || ''
                } : item
            );

            setFormData(prev => ({
                ...prev,
                items: updatedItems
            }));
        }
    };

    // Calculate totals
    useEffect(() => {
        let subtotal = 0;
        formData.items.forEach(item => {
            subtotal += Number(item.amount) || 0;
        });

        let discountAmount = 0;
        if (formData.discount > 0) {
            if (formData.discount_type === 'percentage') {
                discountAmount = subtotal * (Number(formData.discount) / 100);
            } else {
                discountAmount = Number(formData.discount) || 0;
            }
        }

        const amountAfterDiscount = Math.max(0, subtotal - discountAmount);
        
        const sgst_amount = amountAfterDiscount * (Number(formData.sgst_rate) / 100);
        const cgst_amount = amountAfterDiscount * (Number(formData.cgst_rate) / 100);
        
        let grand_total = amountAfterDiscount + sgst_amount + cgst_amount + (Number(formData.additional_charge) || 0);
        
        let round_off = 0;
        if (formData.apply_round_off) {
            round_off = Math.round(grand_total) - grand_total;
            grand_total = Math.round(grand_total);
        }

        setFormData(prev => ({
            ...prev,
            subtotal,
            sgst_amount,
            cgst_amount,
            round_off,
            grand_total
        }));
    }, [formData.items, formData.discount, formData.discount_type, formData.sgst_rate, formData.cgst_rate, formData.additional_charge, formData.apply_round_off]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (isSubmitting) return;

        const hasValidItems = formData.items.some(item => item.service_id && item.price > 0);
        if (!hasValidItems) {
            alert('Please add at least one valid service item');
            return;
        }

        setIsSubmitting(true);
        try {
            const payload = {
                transaction_date: formData.payment_date,
                remark: formData.notes,
                tax_rate: formData.tax_rate,
                items: formData.items
                    .filter(item => item.service_id && item.price > 0)
                    .map(item => ({
                        service_id: item.service_id,
                        fees: item.price,
                        remark: item.remark || item.description
                    })),
                additional_charge: Number(formData.additional_charge) || 0,
                round_off: formData.apply_round_off
            };

            if (formData.discount > 0) {
                payload.discount_type = formData.discount_type;
                if (formData.discount_type === 'percentage') {
                    payload.discount_perc_rate = Number(formData.discount);
                } else {
                    payload.discount_value = Number(formData.discount);
                }
            } else {
                payload.discount_type = 'not applicable';
            }

            payload.bank_id = bankId;

            const response = await fetch(`${API_BASE_URL}/sale/create/bank`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (data.success) {
                const submissionData = {
                    ...formData,
                    bankDetails,
                    timestamp: new Date().toISOString(),
                    api_response: data,
                    notifications: {
                        email: sendEmail,
                        whatsapp: sendWhatsApp
                    }
                };
                onSubmit('SALE', submissionData);
                onClose();
            } else {
                throw new Error(data.message || 'Failed to create sale');
            }
        } catch (error) {
            console.error('Error submitting form:', error);
            alert(error.message || 'Error creating sale. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const formatCurrencyLocal = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen p-4">
                <div className="fixed inset-0 bg-gray-900 bg-opacity-50 backdrop-blur-sm transition-opacity" onClick={onClose} />
                <div className="relative w-full max-w-4xl bg-white rounded-xl shadow-2xl max-h-[90vh] flex flex-col">
                    {/* Header */}
                    <div className="flex-shrink-0 flex items-center justify-between p-4 border-b bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-t-xl">
                        <div>
                            <h2 className="text-lg font-bold">Create Bank Sale Invoice</h2>
                            <p className="text-blue-100 text-xs">{bankDetails?.bank || 'Bank Transaction'}</p>
                        </div>
                        <button onClick={onClose} className="p-1 hover:bg-blue-500 rounded-lg">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Body */}
                    <div className="flex-1 overflow-y-auto p-5 bg-gray-50">
                        <form onSubmit={handleSubmit}>
                            {/* Bank Info */}
                            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 mb-5">
                                <div className="grid grid-cols-3 gap-4 text-center">
                                    <div>
                                        <p className="text-xs text-blue-600 font-medium">Bank Name</p>
                                        <p className="text-sm font-bold text-slate-700">{bankDetails?.bank || bankDetails?.name || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-blue-600 font-medium">Account No</p>
                                        <p className="text-sm font-bold text-slate-700">{bankDetails?.account_no || bankDetails?.account || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-blue-600 font-medium">Balance</p>
                                        <p className="text-sm font-bold text-green-600">₹{formatCurrencyLocal(bankDetails?.balance || 0)}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Date */}
                            <div className="mb-5">
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                    Date <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="date"
                                    name="payment_date"
                                    value={formData.payment_date}
                                    onChange={handleInputChange}
                                    required
                                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>

                            {/* Services Table */}
                            <div className="mb-5">
                                <div className="flex justify-between items-center mb-3">
                                    <h3 className="text-base font-bold text-gray-900">Services & Items</h3>
                                    <button
                                        type="button"
                                        onClick={addItem}
                                        className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                                    >
                                        <IoAdd className="w-4 h-4 mr-1" />
                                        Add Service
                                    </button>
                                </div>

                                <div className="overflow-x-auto border border-gray-300 rounded-lg">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">Service</th>
                                                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">Description</th>
                                                <th className="px-3 py-2 text-right text-xs font-semibold text-gray-700">Price</th>
                                                <th className="px-3 py-2 text-center text-xs font-semibold text-gray-700 w-12">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {formData.items.map((item, index) => (
                                                <tr key={index}>
                                                    <td className="px-3 py-2">
                                                        <select
                                                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                            value={item.service_id}
                                                            onChange={(e) => handleServiceChange(index, e.target.value)}
                                                            required
                                                            disabled={isLoadingServices}
                                                        >
                                                            <option value="">Select Service</option>
                                                            {serviceOptions.map(service => (
                                                                <option key={service.service_id} value={service.service_id}>
                                                                    {service.name} - ₹{service.fees}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </td>
                                                    <td className="px-3 py-2">
                                                        <input
                                                            type="text"
                                                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                                            placeholder="Description"
                                                            value={item.description}
                                                            onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                                                        />
                                                    </td>
                                                    <td className="px-3 py-2">
                                                        <input
                                                            type="number"
                                                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm text-right"
                                                            placeholder="0"
                                                            value={item.price}
                                                            onChange={(e) => handleItemChange(index, 'price', e.target.value)}
                                                            required
                                                        />
                                                    </td>
                                                    <td className="px-3 py-2 text-center">
                                                        {formData.items.length > 1 && (
                                                            <button
                                                                type="button"
                                                                onClick={() => removeItem(index)}
                                                                className="text-red-500 hover:bg-red-50 p-1 rounded"
                                                            >
                                                                <IoTrash className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Additional Settings */}
                            <div className="grid grid-cols-2 gap-4 mb-5">
                                <div className="bg-white p-3 rounded-lg border">
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Additional Charge (₹)</label>
                                    <input
                                        type="number"
                                        name="additional_charge"
                                        value={formData.additional_charge}
                                        onChange={handleInputChange}
                                        className="w-full px-2 py-1 border rounded text-sm"
                                        min="0"
                                    />
                                </div>
                                <div className="bg-white p-3 rounded-lg border flex items-center">
                                    <input
                                        type="checkbox"
                                        id="round_off"
                                        checked={formData.apply_round_off}
                                        onChange={(e) => setFormData(prev => ({ ...prev, apply_round_off: e.target.checked }))}
                                        className="mr-2"
                                    />
                                    <label htmlFor="round_off" className="text-xs font-medium text-gray-700">Apply Round Off</label>
                                </div>
                            </div>

                            {/* Discount Section */}
                            <div className="bg-white p-4 rounded-lg border mb-5">
                                <h4 className="text-sm font-bold mb-3">Discount</h4>
                                <div className="grid grid-cols-2 gap-3">
                                    <select
                                        name="discount_type"
                                        value={formData.discount_type}
                                        onChange={handleInputChange}
                                        className="px-2 py-1 border rounded text-sm"
                                    >
                                        <option value="percentage">Percentage (%)</option>
                                        <option value="flat">Flat Amount (₹)</option>
                                    </select>
                                    <input
                                        type="number"
                                        name="discount"
                                        value={formData.discount}
                                        onChange={handleInputChange}
                                        placeholder={formData.discount_type === 'percentage' ? 'Percentage' : 'Amount'}
                                        className="px-2 py-1 border rounded text-sm"
                                        min="0"
                                    />
                                </div>
                            </div>

                            {/* Notes */}
                            <div className="mb-5">
                                <textarea
                                    name="notes"
                                    value={formData.notes}
                                    onChange={handleInputChange}
                                    placeholder="Additional notes..."
                                    className="w-full px-3 py-2 border rounded-lg text-sm resize-none"
                                    rows="2"
                                />
                            </div>

                            {/* Summary */}
                            <div className="bg-gradient-to-br from-blue-50 to-white p-4 rounded-lg border border-blue-100">
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span>Subtotal:</span>
                                        <span className="font-semibold">{formatCurrencyLocal(formData.subtotal)}</span>
                                    </div>
                                    {formData.discount > 0 && (
                                        <div className="flex justify-between text-red-600">
                                            <span>Discount:</span>
                                            <span>-{formatCurrencyLocal(formData.discount_type === 'percentage' 
                                                ? formData.subtotal * (formData.discount / 100) 
                                                : formData.discount)}</span>
                                        </div>
                                    )}
                                    {appSettings.gst_applicable && (
                                        <>
                                            <div className="flex justify-between">
                                                <span>SGST ({formData.sgst_rate}%):</span>
                                                <span>{formatCurrencyLocal(formData.sgst_amount)}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>CGST ({formData.cgst_rate}%):</span>
                                                <span>{formatCurrencyLocal(formData.cgst_amount)}</span>
                                            </div>
                                        </>
                                    )}
                                    {formData.additional_charge > 0 && (
                                        <div className="flex justify-between">
                                            <span>Additional Charge:</span>
                                            <span>{formatCurrencyLocal(formData.additional_charge)}</span>
                                        </div>
                                    )}
                                    <div className="pt-2 border-t">
                                        <div className="flex justify-between font-bold">
                                            <span>Grand Total:</span>
                                            <span className="text-blue-700 text-lg">{formatCurrencyLocal(formData.grand_total)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </form>
                    </div>

                    {/* Footer */}
                    <div className="flex-shrink-0 border-t bg-white p-4 rounded-b-xl">
                        <div className="flex justify-between items-center mb-3">
                            <div className="flex items-center gap-4">
                                <label className="flex items-center cursor-pointer">
                                    <input type="checkbox" checked={sendEmail} onChange={(e) => setSendEmail(e.target.checked)} className="mr-2" />
                                    <span className="text-xs">Email Invoice</span>
                                </label>
                                <label className="flex items-center cursor-pointer">
                                    <input type="checkbox" checked={sendWhatsApp} onChange={(e) => setSendWhatsApp(e.target.checked)} className="mr-2" />
                                    <span className="text-xs">WhatsApp Invoice</span>
                                </label>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button
                                type="submit"
                                onClick={handleSubmit}
                                disabled={isSubmitting || formData.items.every(item => !item.service_id)}
                                className="flex-1 px-6 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-medium hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 transition-all"
                            >
                                {isSubmitting ? 'Creating...' : 'Create Bank Sale Invoice'}
                            </button>
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 px-6 py-2 bg-white border-2 border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-all"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Purchase Modal (similar to Sale)
export const PurchaseModal = ({ isOpen, onClose, bankDetails, bankId, onSubmit, formatCurrency }) => {
    const [formData, setFormData] = useState({
        purchase_date: new Date().toISOString().split('T')[0],
        items: [{ service_id: '', description: '', price: '', amount: 0, remark: '' }],
        subtotal: 0,
        sgst_rate: 9,
        cgst_rate: 9,
        sgst_amount: 0,
        cgst_amount: 0,
        round_off: 0,
        grand_total: 0,
        notes: '',
        tax_rate: 18
    });

    const [serviceOptions, setServiceOptions] = useState([]);
    const [isLoadingServices, setIsLoadingServices] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [sendEmail, setSendEmail] = useState(true);
    const [sendWhatsApp, setSendWhatsApp] = useState(true);

    useEffect(() => {
        if (isOpen) {
            fetchServices();
            resetForm();
        }
    }, [isOpen]);

    const fetchServices = async () => {
        setIsLoadingServices(true);
        try {
            const response = await fetch(`${API_BASE_URL}/service/list?search=&category_id`, {
                method: 'GET',
                headers: getHeaders()
            });
            const data = await response.json();
            if (data.success) {
                setServiceOptions(data.data.map(service => ({
                    service_id: service.service_id,
                    name: service.name,
                    fees: parseFloat(service.fees),
                    category: service.category_name,
                    remark: service.remark
                })));
            }
        } catch (error) {
            console.error('Error fetching services:', error);
        } finally {
            setIsLoadingServices(false);
        }
    };

    const resetForm = () => {
        setFormData({
            purchase_date: new Date().toISOString().split('T')[0],
            items: [{ service_id: '', description: '', price: '', amount: 0, remark: '' }],
            subtotal: 0,
            sgst_rate: 9,
            cgst_rate: 9,
            sgst_amount: 0,
            cgst_amount: 0,
            round_off: 0,
            grand_total: 0,
            notes: '',
            tax_rate: 18
        });
    };

    const addItem = () => {
        setFormData(prev => ({
            ...prev,
            items: [
                ...prev.items,
                { service_id: '', description: '', price: '', amount: 0, remark: '' }
            ]
        }));
    };

    const removeItem = (index) => {
        if (formData.items.length > 1) {
            setFormData(prev => ({
                ...prev,
                items: prev.items.filter((_, i) => i !== index)
            }));
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleItemChange = (index, field, value) => {
        const updatedItems = formData.items.map((item, i) => {
            if (i === index) {
                const updatedItem = {
                    ...item,
                    [field]: field === 'price' ? parseFloat(value) || 0 : value
                };
                updatedItem.amount = updatedItem.price || 0;
                return updatedItem;
            }
            return item;
        });

        setFormData(prev => ({ ...prev, items: updatedItems }));
    };

    const handleServiceChange = (index, serviceId) => {
        const service = serviceOptions.find(s => s.service_id === serviceId);
        if (service) {
            const updatedItems = formData.items.map((item, i) =>
                i === index ? {
                    ...item,
                    service_id: serviceId,
                    price: parseFloat(service.fees),
                    amount: parseFloat(service.fees),
                    description: service.name,
                    remark: service.remark || ''
                } : item
            );

            setFormData(prev => ({
                ...prev,
                items: updatedItems
            }));
        }
    };

    // Calculate totals
    useEffect(() => {
        let subtotal = 0;
        formData.items.forEach(item => {
            subtotal += Number(item.amount) || 0;
        });

        const sgst_amount = subtotal * (Number(formData.sgst_rate) / 100);
        const cgst_amount = subtotal * (Number(formData.cgst_rate) / 100);
        
        let grand_total = subtotal + sgst_amount + cgst_amount;
        
        let round_off = 0;

        setFormData(prev => ({
            ...prev,
            subtotal,
            sgst_amount,
            cgst_amount,
            round_off,
            grand_total
        }));
    }, [formData.items, formData.sgst_rate, formData.cgst_rate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (isSubmitting) return;

        const hasValidItems = formData.items.some(item => item.service_id && item.price > 0);
        if (!hasValidItems) {
            alert('Please add at least one valid service item');
            return;
        }

        setIsSubmitting(true);
        try {
            const payload = {
                transaction_date: formData.purchase_date,
                remark: formData.notes,
                tax_rate: formData.tax_rate,
                items: formData.items
                    .filter(item => item.service_id && item.price > 0)
                    .map(item => ({
                        service_id: item.service_id,
                        fees: item.price,
                        remark: item.remark || item.description
                    }))
            };

            payload.bank_id = bankId;

            const response = await fetch(`${API_BASE_URL}/purchase/create/bank`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (data.success) {
                const submissionData = {
                    ...formData,
                    bankDetails,
                    timestamp: new Date().toISOString(),
                    api_response: data,
                    notifications: {
                        email: sendEmail,
                        whatsapp: sendWhatsApp
                    }
                };
                onSubmit('PURCHASE', submissionData);
                onClose();
            } else {
                throw new Error(data.message || 'Failed to create purchase');
            }
        } catch (error) {
            console.error('Error submitting form:', error);
            alert(error.message || 'Error creating purchase. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const formatCurrencyLocal = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen p-4">
                <div className="fixed inset-0 bg-gray-900 bg-opacity-50 backdrop-blur-sm transition-opacity" onClick={onClose} />
                <div className="relative w-full max-w-4xl bg-white rounded-xl shadow-2xl max-h-[90vh] flex flex-col">
                    {/* Header */}
                    <div className="flex-shrink-0 flex items-center justify-between p-4 border-b bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-t-xl">
                        <div>
                            <h2 className="text-lg font-bold">Create Purchase Bill</h2>
                            <p className="text-blue-100 text-xs">{bankDetails?.bank || 'Bank Transaction'}</p>
                        </div>
                        <button onClick={onClose} className="p-1 hover:bg-blue-500 rounded-lg">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Body */}
                    <div className="flex-1 overflow-y-auto p-5 bg-gray-50">
                        <form onSubmit={handleSubmit}>
                            {/* Bank Info */}
                            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 mb-5">
                                <div className="grid grid-cols-3 gap-4 text-center">
                                    <div>
                                        <p className="text-xs text-blue-600 font-medium">Bank Name</p>
                                        <p className="text-sm font-bold text-slate-700">{bankDetails?.bank || bankDetails?.name || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-blue-600 font-medium">Account No</p>
                                        <p className="text-sm font-bold text-slate-700">{bankDetails?.account_no || bankDetails?.account || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-blue-600 font-medium">Balance</p>
                                        <p className="text-sm font-bold text-green-600">₹{formatCurrencyLocal(bankDetails?.balance || 0)}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Date */}
                            <div className="mb-5">
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                    Bill Date <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="date"
                                    name="purchase_date"
                                    value={formData.purchase_date}
                                    onChange={handleInputChange}
                                    required
                                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>

                            {/* Items Table */}
                            <div className="mb-5">
                                <div className="flex justify-between items-center mb-3">
                                    <h3 className="text-base font-bold text-gray-900">Purchase Items</h3>
                                    <button
                                        type="button"
                                        onClick={addItem}
                                        className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                                    >
                                        <IoAdd className="w-4 h-4 mr-1" />
                                        Add Item
                                    </button>
                                </div>

                                <div className="overflow-x-auto border border-gray-300 rounded-lg">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">Service/Item</th>
                                                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">Description</th>
                                                <th className="px-3 py-2 text-right text-xs font-semibold text-gray-700">Price</th>
                                                <th className="px-3 py-2 text-center text-xs font-semibold text-gray-700 w-12">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {formData.items.map((item, index) => (
                                                <tr key={index}>
                                                    <td className="px-3 py-2">
                                                        <select
                                                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                            value={item.service_id}
                                                            onChange={(e) => handleServiceChange(index, e.target.value)}
                                                            required
                                                            disabled={isLoadingServices}
                                                        >
                                                            <option value="">Select Service</option>
                                                            {serviceOptions.map(service => (
                                                                <option key={service.service_id} value={service.service_id}>
                                                                    {service.name} - ₹{service.fees}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </td>
                                                    <td className="px-3 py-2">
                                                        <input
                                                            type="text"
                                                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                                            placeholder="Description"
                                                            value={item.description}
                                                            onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                                                        />
                                                    </td>
                                                    <td className="px-3 py-2">
                                                        <input
                                                            type="number"
                                                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm text-right"
                                                            placeholder="0"
                                                            value={item.price}
                                                            onChange={(e) => handleItemChange(index, 'price', e.target.value)}
                                                            required
                                                        />
                                                    </td>
                                                    <td className="px-3 py-2 text-center">
                                                        {formData.items.length > 1 && (
                                                            <button
                                                                type="button"
                                                                onClick={() => removeItem(index)}
                                                                className="text-red-500 hover:bg-red-50 p-1 rounded"
                                                            >
                                                                <IoTrash className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Notes */}
                            <div className="mb-5">
                                <textarea
                                    name="notes"
                                    value={formData.notes}
                                    onChange={handleInputChange}
                                    placeholder="Additional notes..."
                                    className="w-full px-3 py-2 border rounded-lg text-sm resize-none"
                                    rows="2"
                                />
                            </div>

                            {/* Summary */}
                            <div className="bg-gradient-to-br from-blue-50 to-white p-4 rounded-lg border border-blue-100">
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span>Subtotal:</span>
                                        <span className="font-semibold">{formatCurrencyLocal(formData.subtotal)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>SGST ({formData.sgst_rate}%):</span>
                                        <span>{formatCurrencyLocal(formData.sgst_amount)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>CGST ({formData.cgst_rate}%):</span>
                                        <span>{formatCurrencyLocal(formData.cgst_amount)}</span>
                                    </div>
                                    <div className="pt-2 border-t">
                                        <div className="flex justify-between font-bold">
                                            <span>Total Payable:</span>
                                            <span className="text-blue-700 text-lg">{formatCurrencyLocal(formData.grand_total)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </form>
                    </div>

                    {/* Footer */}
                    <div className="flex-shrink-0 border-t bg-white p-4 rounded-b-xl">
                        <div className="flex justify-between items-center mb-3">
                            <div className="flex items-center gap-4">
                                <label className="flex items-center cursor-pointer">
                                    <input type="checkbox" checked={sendEmail} onChange={(e) => setSendEmail(e.target.checked)} className="mr-2" />
                                    <span className="text-xs">Email Bill</span>
                                </label>
                                <label className="flex items-center cursor-pointer">
                                    <input type="checkbox" checked={sendWhatsApp} onChange={(e) => setSendWhatsApp(e.target.checked)} className="mr-2" />
                                    <span className="text-xs">WhatsApp Bill</span>
                                </label>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button
                                type="submit"
                                onClick={handleSubmit}
                                disabled={isSubmitting || formData.items.every(item => !item.service_id)}
                                className="flex-1 px-6 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-medium hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 transition-all"
                            >
                                {isSubmitting ? 'Creating...' : 'Create Purchase Bill'}
                            </button>
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 px-6 py-2 bg-white border-2 border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-all"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export const ExpenseModal = ({ 
    isOpen, 
    onClose, 
    bankDetails, 
    bankId, 
    onSubmit, 
    formatCurrency: externalFormatCurrency,
    onSuccess 
}) => {
    const [formData, setFormData] = useState({
        transaction_date: new Date().toISOString().split('T')[0],
        items: [{ item_id: '', amount: '' }],
        bank_id: bankId || '',
        total_amount: 0,
        remark: ''
    });

    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // API States
    const [expenseItems, setExpenseItems] = useState([]);
    const [expenseItemsLoading, setExpenseItemsLoading] = useState(false);
    const [itemSearchTerm, setItemSearchTerm] = useState('');

    // Format currency function
    const formatCurrency = (amount) => {
        if (externalFormatCurrency) {
            return externalFormatCurrency(amount);
        }
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    };

    // Fetch expense items from API
    const fetchExpenseItems = async (search = '') => {
        setExpenseItemsLoading(true);
        try {
            const headers = getHeaders();
            const url = `${API_BASE_URL}/expense/item/list?page_no=1&limit=50&search=${search}`;
            const response = await fetch(url, { headers });
            const result = await response.json();
            
            if (result.success && result.data) {
                setExpenseItems(result.data);
            }
        } catch (error) {
            console.error('Error fetching expense items:', error);
        } finally {
            setExpenseItemsLoading(false);
        }
    };

    // Debounced search for expense items
    const debouncedItemSearch = useCallback(
        debounce((searchValue) => {
            fetchExpenseItems(searchValue);
        }, 300),
        []
    );

    useEffect(() => {
        if (itemSearchTerm !== undefined) {
            debouncedItemSearch(itemSearchTerm);
        }
        return () => {
            debouncedItemSearch.cancel();
        };
    }, [itemSearchTerm]);

    // Fetch initial data when modal opens
    useEffect(() => {
        if (isOpen) {
            fetchExpenseItems();
            setFormData({
                transaction_date: new Date().toISOString().split('T')[0],
                items: [{ item_id: '', amount: '' }],
                bank_id: bankId || '',
                total_amount: 0,
                remark: ''
            });
        }
    }, [isOpen, bankId]);

    const addItem = () => {
        setFormData(prev => ({
            ...prev,
            items: [
                ...prev.items,
                { item_id: '', amount: '' }
            ]
        }));
    };

    const removeItem = (index) => {
        if (formData.items.length > 1) {
            setFormData(prev => ({
                ...prev,
                items: prev.items.filter((_, i) => i !== index)
            }));
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleItemChange = (index, field, value) => {
        const updatedItems = formData.items.map((item, i) => {
            if (i === index) {
                return {
                    ...item,
                    [field]: field === 'amount' ? Number(value) || 0 : value
                };
            }
            return item;
        });

        setFormData(prev => ({ ...prev, items: updatedItems }));
    };

    const handleExpenseItemChange = (index, itemId) => {
        const updatedItems = formData.items.map((item, i) =>
            i === index ? {
                ...item,
                item_id: itemId,
                amount: ''
            } : item
        );
        setFormData(prev => ({
            ...prev,
            items: updatedItems
        }));
    };

    const handleDateChange = (date) => {
        setFormData(prev => ({
            ...prev,
            transaction_date: date
        }));
    };

    // Calculate totals
    useEffect(() => {
        let total_amount = 0;
        formData.items.forEach(item => {
            total_amount += Number(item.amount) || 0;
        });

        setFormData(prev => ({
            ...prev,
            total_amount
        }));
    }, [formData.items]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.bank_id || isSubmitting) return;

        setIsSubmitting(true);
        try {
            const headers = getHeaders();
            
            // Create expense entries for each item
            const expensePromises = formData.items.map(async (item) => {
                const payload = {
                    item_id: item.item_id,
                    remark: formData.remark,
                    amount: item.amount,
                    transaction_date: formData.transaction_date,
                    party_id: formData.bank_id,
                    party_type: "bank"
                };
                
                const response = await fetch(`${API_BASE_URL}/expense/entry/create`, {
                    method: 'POST',
                    headers: {
                        ...headers,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload)
                });
                
                return response.json();
            });
            
            const results = await Promise.all(expensePromises);
            const allSuccess = results.every(result => result.success);
            
            if (allSuccess) {
                if (onSuccess) onSuccess(results);
                if (onSubmit) onSubmit('EXPENSE', results);
                onClose();
            } else {
                console.error('Some expenses failed:', results);
                alert('Some expenses could not be created. Please check and try again.');
            }
        } catch (error) {
            console.error('Error submitting expense:', error);
            alert('Failed to create expense. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    };

    const getExpenseItemDetails = (itemId) => {
        return expenseItems.find(item => item.item_id === itemId);
    };

    const getExpenseTypeBadge = (type) => {
        const typeConfig = {
            'direct': 'bg-red-100 text-red-800',
            'indirect': 'bg-blue-100 text-blue-800',
            'reimbursable': 'bg-green-100 text-green-800'
        };
        return typeConfig[type] || 'bg-gray-100 text-gray-800';
    };

    const formatExpenseType = (type) => {
        const typeMap = {
            'direct': 'Direct Expense',
            'indirect': 'Indirect Expense',
            'reimbursable': 'Reimbursable Expense'
        };
        return typeMap[type] || type;
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen p-2 sm:p-4">
                {/* Overlay */}
                <div
                    className="fixed inset-0 bg-gray-900 bg-opacity-50 backdrop-blur-sm transition-opacity duration-300"
                    onClick={onClose}
                />
                
                {/* Modal Panel */}
                <div className="relative w-full max-w-3xl bg-white rounded-xl shadow-2xl h-[85vh] flex flex-col transform transition-all duration-300 scale-100 animate-fadeIn">
                    {/* Header */}
                    <div className="flex-shrink-0 flex items-center justify-between p-3 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-t-xl">
                        <div className="flex items-center space-x-3">
                            <div className="p-1.5 bg-white/10 rounded-lg">
                                <FiDollarSign className="w-5 h-5" />
                            </div>
                            <div className="flex items-center space-x-4">
                                <h2 className="text-lg font-bold">Create Expense from Bank</h2>
                                <span className="text-blue-200 text-sm hidden sm:inline">|</span>
                                <p className="text-blue-100 text-xs sm:text-sm hidden sm:block">Auto-selected Bank</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-1.5 text-blue-200 hover:text-white hover:bg-blue-500 rounded-lg transition-colors"
                        >
                            <FiX className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-4 sm:p-5 bg-gray-50">
                        <form onSubmit={handleSubmit}>
                            {/* Auto-selected Bank Card */}
                            <div className="mb-6">
                                <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg border border-green-200">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center space-x-2">
                                            <FiCreditCard className="w-5 h-5 text-green-600" />
                                            <span className="text-sm font-semibold text-gray-700">Selected Bank Account</span>
                                        </div>
                                        <span className="text-xs bg-green-200 text-green-800 px-2 py-1 rounded-full">Auto-selected</span>
                                    </div>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div>
                                            <p className="text-xs text-green-600 font-medium">Bank Name</p>
                                            <p className="text-sm font-bold text-gray-900">{bankDetails?.bank || bankDetails?.name || 'Current Bank'}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-green-600 font-medium">Account No</p>
                                            <p className="text-sm font-medium text-gray-700">{bankDetails?.account_no || 'N/A'}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-green-600 font-medium">Balance</p>
                                            <p className="text-sm font-bold text-green-600">{formatCurrency(bankDetails?.balance || 0)}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-green-600 font-medium">Holder Name</p>
                                            <p className="text-sm font-medium text-gray-700">{bankDetails?.holder || 'N/A'}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Date Section */}
                            <div className="mb-6">
                                <div className="grid grid-cols-1 gap-4">
                                    <div>
                                        <div className="flex items-center justify-between mb-1.5">
                                            <label className="block text-sm font-semibold text-gray-700">
                                                Transaction Date <span className="text-red-500">*</span>
                                            </label>
                                            <span className="text-xs text-gray-500 px-1.5 py-0.5 bg-gray-100 rounded">Required</span>
                                        </div>
                                        <DatePickerComponent
                                            selectedDate={formData.transaction_date}
                                            onDateChange={handleDateChange}
                                            placeholder="Select transaction date"
                                        />
                                        <div className="mt-1.5 text-xs text-gray-500">
                                            Selected: {formatDate(formData.transaction_date)}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Expense Items Section */}
                            <div className="mb-6">
                                <div className="flex justify-between items-center mb-4">
                                    <div className="flex items-center space-x-2">
                                        <h3 className="text-sm font-bold text-gray-900">Expense Items</h3>
                                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded transition-all duration-200 hover:bg-gray-200">
                                            {formData.items.length} item{formData.items.length !== 1 ? 's' : ''}
                                        </span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={addItem}
                                        className="inline-flex items-center px-3 py-1.5 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-1 focus:ring-green-500 transition-all duration-200 shadow-sm hover:shadow transform hover:-translate-y-0.5"
                                    >
                                        <FiPlus className="w-3.5 h-3.5 mr-1.5 transition-transform duration-200 group-hover:rotate-90" />
                                        Add Item
                                    </button>
                                </div>

                                <div className="space-y-3">
                                    {formData.items.map((item, index) => {
                                        const expenseItem = getExpenseItemDetails(item.item_id);
                                        return (
                                            <div 
                                                key={index} 
                                                className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-all duration-300"
                                            >
                                                <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                                                    {/* Expense Item */}
                                                    <div className="md:col-span-8">
                                                        <div className="flex items-center justify-between mb-1">
                                                            <label className="text-xs font-medium text-gray-700">Expense Item</label>
                                                            {expenseItem && (
                                                                <span className={`text-xs px-2 py-1 rounded-full transition-colors duration-200 ${getExpenseTypeBadge(expenseItem.type)}`}>
                                                                    {formatExpenseType(expenseItem.type)}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="relative">
                                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                                <FiFileText className="w-4 h-4 text-gray-400" />
                                                            </div>
                                                            <select
                                                                className="pl-10 w-full px-3 py-2 text-sm border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 hover:border-blue-400 transition-all duration-200 appearance-none bg-white"
                                                                value={item.item_id}
                                                                onChange={(e) => handleExpenseItemChange(index, e.target.value)}
                                                                required
                                                            >
                                                                <option value="" disabled>Select Expense Item</option>
                                                                {expenseItems.map(expenseItem => (
                                                                    <option key={expenseItem.item_id} value={expenseItem.item_id}>
                                                                        {expenseItem.name}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                                                <FiChevronDown className="w-4 h-4 text-gray-400" />
                                                            </div>
                                                        </div>
                                                        {expenseItemsLoading && (
                                                            <div className="text-xs text-gray-400 mt-1">Loading items...</div>
                                                        )}
                                                    </div>

                                                    {/* Amount and Delete */}
                                                    <div className="md:col-span-4">
                                                        <div className="flex items-end space-x-2 h-full">
                                                            <div className="flex-1">
                                                                <label className="text-xs font-medium text-gray-700 mb-1 block">Amount (₹)</label>
                                                                <div className="relative">
                                                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                                        <FiDollarSign className="w-4 h-4 text-gray-400" />
                                                                    </div>
                                                                    <input
                                                                        type="number"
                                                                        className="pl-10 w-full pr-3 py-2 text-sm border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 hover:border-blue-400 transition-all duration-200 text-right"
                                                                        placeholder="0.00"
                                                                        value={item.amount}
                                                                        onChange={(e) => handleItemChange(index, 'amount', e.target.value)}
                                                                        required
                                                                    />
                                                                </div>
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={() => removeItem(index)}
                                                                disabled={formData.items.length <= 1}
                                                                className="p-2 text-red-600 hover:bg-red-50 hover:text-red-700 rounded-lg transition-all duration-200 transform hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed"
                                                            >
                                                                <FiTrash2 className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Remark Section */}
                            <div className="mb-6">
                                <div className="bg-gradient-to-br from-blue-50 to-white p-4 rounded-lg border border-blue-100 shadow-sm transition-all duration-300 hover:shadow-md">
                                    <div className="flex items-center mb-3">
                                        <div className="p-1.5 bg-blue-600 text-white rounded-lg mr-2 transition-transform duration-200 hover:rotate-3">
                                            <FiFileText className="w-4 h-4" />
                                        </div>
                                        <h4 className="text-sm font-bold text-gray-900">Remark</h4>
                                    </div>
                                    <div className="relative">
                                        <div className="absolute left-3 top-3 pointer-events-none">
                                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                                            </svg>
                                        </div>
                                        <textarea
                                            className="pl-10 w-full px-3 py-2.5 text-sm border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 hover:border-blue-400 transition-all duration-200"
                                            placeholder="Enter remark..."
                                            name="remark"
                                            rows={3}
                                            value={formData.remark}
                                            onChange={handleInputChange}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Expense Summary */}
                            <div className="bg-gradient-to-br from-blue-50 to-white p-4 rounded-lg border border-blue-100 shadow-sm transition-all duration-300 hover:shadow-md">
                                <div className="flex items-center mb-3">
                                    <div className="p-1.5 bg-blue-600 text-white rounded-lg mr-2 transition-transform duration-200 hover:rotate-3">
                                        <FiDollarSign className="w-4 h-4" />
                                    </div>
                                    <h4 className="text-sm font-bold text-gray-900">Expense Summary</h4>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                    <div className="text-center p-3 bg-white rounded-lg border border-gray-200 transition-all duration-200 hover:border-blue-300 hover:shadow-sm">
                                        <div className="text-xs text-gray-600 mb-1">Items Count</div>
                                        <div className="font-semibold text-blue-600 text-lg">
                                            {formData.items.length}
                                        </div>
                                    </div>
                                    <div className="text-center p-3 bg-white rounded-lg border border-gray-200 transition-all duration-200 hover:border-green-300 hover:shadow-sm">
                                        <div className="text-xs text-gray-600 mb-1">Bank Account</div>
                                        <div className="font-semibold text-green-600 text-sm truncate">
                                            {bankDetails?.bank || bankDetails?.name || 'Auto-selected'}
                                        </div>
                                    </div>
                                    <div className="text-center p-3 bg-white rounded-lg border border-gray-200 transition-all duration-200 hover:border-red-300 hover:shadow-sm">
                                        <div className="text-xs text-gray-600 mb-1">Total Amount</div>
                                        <div className="font-semibold text-red-600 text-lg">
                                            {formatCurrency(formData.total_amount)}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </form>
                    </div>

                    {/* Footer */}
                    <div className="flex-shrink-0 border-t border-gray-200 bg-white p-4 rounded-b-xl shadow-lg">
                        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                            {/* Warning Message */}
                            {(!formData.bank_id || formData.items.some(item => !item.item_id || !item.amount)) && (
                                <div className="w-full lg:w-auto animate-pulse">
                                    <div className="flex items-center text-amber-600 text-xs font-medium px-3 py-1.5 bg-amber-50 border border-amber-200 rounded transition-all duration-200 hover:bg-amber-100">
                                        <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.998-.833-2.732 0L4.342 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                        </svg>
                                        Please fill all required fields (*) to create expense
                                    </div>
                                </div>
                            )}

                            {/* Action Buttons */}
                            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full lg:w-auto">
                                <div className="hidden lg:flex items-center space-x-4">
                                    <div className="px-3 py-1.5 bg-gradient-to-r from-green-50 to-green-100 rounded-lg border border-green-200 transition-all duration-200 hover:border-green-300 hover:shadow-sm">
                                        <div className="text-xs text-green-700 font-semibold">
                                            Total: <span className="text-sm">{formatCurrency(formData.total_amount)}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        disabled={isSubmitting}
                                        className="px-4 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-500 focus:border-gray-500 transition-all duration-200 transform hover:-translate-y-0.5 disabled:opacity-50 shadow-sm hover:shadow"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        onClick={handleSubmit}
                                        disabled={isSubmitting || !formData.bank_id || formData.items.some(item => !item.item_id || !item.amount)}
                                        className="px-5 py-2 text-xs font-medium text-white bg-gradient-to-r from-blue-600 to-blue-700 border border-transparent rounded-lg hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow hover:shadow-md transform hover:-translate-y-0.5 min-w-[140px] flex items-center justify-center"
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <svg className="animate-spin -ml-1 mr-2 h-3 w-3 text-white" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                Creating...
                                            </>
                                        ) : (
                                            <>
                                                <FiArrowRight className="w-3.5 h-3.5 mr-1.5 transition-transform duration-200 group-hover:translate-x-1" />
                                                Create Expense
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes fadeIn {
                    from {
                        opacity: 0;
                        transform: translateY(-10px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                
                .animate-fadeIn {
                    animation: fadeIn 0.3s ease-out;
                }
            `}</style>
        </div>
    );
};

// Contra Modal
export const ContraModal = ({ isOpen, onClose, bankDetails, bankId, onSubmit, formatCurrency }) => {
    const [formData, setFormData] = useState({
        from_bank_id: bankId || '',
        to_bank_id: '',
        date: new Date().toISOString().split('T')[0],
        amount: '',
        description: '',
        transaction_ref_id: ''
    });

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [banks, setBanks] = useState([]);
    const [loadingBanks, setLoadingBanks] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [showFromDropdown, setShowFromDropdown] = useState(false);
    const [showToDropdown, setShowToDropdown] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    
    const fromDropdownRef = useRef(null);
    const toDropdownRef = useRef(null);
    
    // Selected banks for display
    const [selectedFromBank, setSelectedFromBank] = useState(null);
    const [selectedToBank, setSelectedToBank] = useState(null);
    
    // Filter banks based on search
    const filteredBanks = useMemo(() => {
        if (!searchTerm) return banks;
        return banks.filter(bank =>
            bank.bank?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            bank.account_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            bank.ifsc?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            bank.branch?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [searchTerm, banks]);

    // Fetch banks list
    const fetchBanks = useCallback(async (pageNum = 1, append = false) => {
        setLoadingBanks(true);
        try {
            const response = await axios.get(
                `${API_BASE_URL}/transaction/bank/list?page_no=${pageNum}&limit=10&search=${searchTerm}`,
                { headers: getHeaders() }
            );
            
            if (response.data.success) {
                const bankData = response.data.data || [];
                if (append) {
                    setBanks(prev => [...prev, ...bankData]);
                } else {
                    setBanks(bankData);
                }
                setHasMore(!response.data.is_last_page);
            }
        } catch (error) {
            console.error('Error fetching banks:', error);
            toast.error('Failed to fetch banks');
        } finally {
            setLoadingBanks(false);
        }
    }, [searchTerm]);

    // Debounced search
    useEffect(() => {
        const debounceTimer = setTimeout(() => {
            setCurrentPage(1);
            fetchBanks(1, false);
        }, 500);
        return () => clearTimeout(debounceTimer);
    }, [searchTerm, fetchBanks]);

    // Initial load when modal opens
    useEffect(() => {
        if (isOpen) {
            fetchBanks(1, false);
        }
    }, [isOpen, fetchBanks]);

    // Load more banks
    const loadMoreBanks = () => {
        const nextPage = currentPage + 1;
        setCurrentPage(nextPage);
        fetchBanks(nextPage, true);
    };

    // Set selected from bank when bankId changes
    useEffect(() => {
        if (bankId && banks.length > 0) {
            const fromBank = banks.find(bank => bank.bank_id === bankId);
            if (fromBank) {
                setSelectedFromBank(fromBank);
                setFormData(prev => ({ ...prev, from_bank_id: bankId }));
            }
        }
    }, [bankId, banks]);

    // Click outside handlers
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (fromDropdownRef.current && !fromDropdownRef.current.contains(event.target)) {
                setShowFromDropdown(false);
            }
            if (toDropdownRef.current && !toDropdownRef.current.contains(event.target)) {
                setShowToDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleFromBankSelect = (bank) => {
        setSelectedFromBank(bank);
        setFormData(prev => ({ ...prev, from_bank_id: bank.bank_id }));
        setShowFromDropdown(false);
    };

    const handleToBankSelect = (bank) => {
        setSelectedToBank(bank);
        setFormData(prev => ({ ...prev, to_bank_id: bank.bank_id }));
        setShowToDropdown(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!formData.from_bank_id || !formData.to_bank_id || !formData.amount) {
            toast.error('Please fill all required fields');
            return;
        }

        if (formData.from_bank_id === formData.to_bank_id) {
            toast.error('Cannot transfer between the same bank account');
            return;
        }

        if (isSubmitting) return;

        // Check if sufficient balance in source bank
        if (selectedFromBank && parseFloat(formData.amount) > parseFloat(selectedFromBank.balance || 0)) {
            toast.error(`Insufficient balance in ${selectedFromBank.bank}. Available balance: ₹${formatCurrency(selectedFromBank.balance || 0)}`);
            return;
        }

        setIsSubmitting(true);
        
        const payload = {
            amount: parseFloat(formData.amount),
            party1_id: formData.from_bank_id,
            party2_id: formData.to_bank_id,
            party1_type: "bank",
            party2_type: "bank",
            remark: formData.description || `Contra transfer from ${selectedFromBank?.bank || 'source'} to ${selectedToBank?.bank || 'destination'}`,
            transaction_date: formData.date
        };

        // Add transaction reference if provided
        if (formData.transaction_ref_id) {
            payload.transaction_ref_id = formData.transaction_ref_id;
        }

        try {
            const response = await axios.post(
                `${API_BASE_URL}/transaction/payment/contra`,
                payload,
                { headers: getHeaders() }
            );

            if (response.data.success) {
                toast.success(response.data.message || 'Contra transfer completed successfully');
                onSubmit('CONTRA', response.data.data);
                onClose();
                // Reset form
                setFormData({
                    from_bank_id: bankId || '',
                    to_bank_id: '',
                    date: new Date().toISOString().split('T')[0],
                    amount: '',
                    description: '',
                    transaction_ref_id: ''
                });
                setSelectedFromBank(selectedFromBank);
                setSelectedToBank(null);
            } else {
                toast.error(response.data.message || 'Failed to create contra transfer');
            }
        } catch (error) {
            console.error('Error creating contra transfer:', error);
            const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to create contra transfer';
            toast.error(errorMessage);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Bank Dropdown Component
    const BankDropdown = ({ 
        type, 
        selectedBank, 
        onSelect, 
        showDropdown, 
        setShowDropdown,
        placeholder = "Select bank account..."
    }) => {
        const dropdownRef = type === 'from' ? fromDropdownRef : toDropdownRef;
        
        return (
            <div className="relative" ref={dropdownRef}>
                <div
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg bg-white cursor-pointer hover:border-indigo-400 transition-all duration-200"
                    onClick={() => setShowDropdown(!showDropdown)}
                >
                    {selectedBank ? (
                        <div className="flex items-center justify-between">
                            <div className="flex-1">
                                <div className="flex items-center gap-2">
                                    <div className={`p-1.5 rounded ${type === 'from' ? 'bg-red-100' : 'bg-green-100'}`}>
                                        <FiCreditCard className={`w-4 h-4 ${type === 'from' ? 'text-red-600' : 'text-green-600'}`} />
                                    </div>
                                    <div>
                                        <div className="text-sm font-medium text-slate-800">
                                            {selectedBank.bank}
                                        </div>
                                        <div className="text-xs text-slate-500">
                                            A/c: {selectedBank.account_no} | IFSC: {selectedBank.ifsc}
                                        </div>
                                        <div className="text-xs text-slate-400">
                                            Branch: {selectedBank.branch}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-green-600">
                                    ₹{formatCurrency(selectedBank.balance || 0)}
                                </span>
                                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center justify-between text-slate-500">
                            <div className="flex items-center gap-2">
                                <FiCreditCard className="w-4 h-4" />
                                <span className="text-sm">{placeholder}</span>
                            </div>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </div>
                    )}
                </div>

                {showDropdown && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-80 overflow-y-auto">
                        <div className="sticky top-0 p-2 border-b border-slate-200 bg-slate-50">
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Search banks by name, account, or IFSC..."
                                    className="w-full px-3 py-2 pl-8 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    autoFocus
                                />
                                <FiSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                            </div>
                        </div>
                        <div className="py-1">
                            {loadingBanks && banks.length === 0 ? (
                                <div className="px-4 py-3 text-center text-slate-500">
                                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-indigo-500 border-t-transparent mx-auto mb-2"></div>
                                    Loading banks...
                                </div>
                            ) : filteredBanks.length > 0 ? (
                                <>
                                    {filteredBanks.map(bank => (
                                        <div
                                            key={bank.bank_id}
                                            className={`px-3 py-2 cursor-pointer hover:bg-slate-50 border-l-2 ${selectedBank?.bank_id === bank.bank_id
                                                ? type === 'from' ? 'border-red-500 bg-red-50' : 'border-green-500 bg-green-50'
                                                : 'border-transparent'
                                            }`}
                                            onClick={() => onSelect(bank)}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex-1">
                                                    <div className="text-sm font-medium text-slate-900">{bank.bank}</div>
                                                    <div className="text-xs text-slate-600">
                                                        A/c: {bank.account_no} • IFSC: {bank.ifsc}
                                                    </div>
                                                    <div className="text-xs text-slate-500 mt-0.5">
                                                        Branch: {bank.branch}
                                                    </div>
                                                    {bank.remark && (
                                                        <div className="text-xs text-slate-400 mt-0.5">
                                                            Note: {bank.remark}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-semibold text-green-600">
                                                        ₹{formatCurrency(bank.balance || 0)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {hasMore && (
                                        <button
                                            type="button"
                                            onClick={loadMoreBanks}
                                            disabled={loadingBanks}
                                            className="w-full px-4 py-2 text-center bg-slate-50 hover:bg-slate-100 text-indigo-600 font-medium text-sm border-t border-slate-200 transition-colors disabled:opacity-50"
                                        >
                                            {loadingBanks ? 'Loading...' : 'Load More Banks'}
                                        </button>
                                    )}
                                </>
                            ) : (
                                <div className="px-4 py-3 text-center text-slate-500">
                                    {searchTerm ? 'No banks found' : 'No banks available'}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <BaseModal isOpen={isOpen} onClose={onClose} title="Create Contra Entry">
            <form onSubmit={handleSubmit} className="space-y-5">
                {/* Bank Transfer Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* From Bank */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                            From Bank (Payment Out) <span className="text-red-500">*</span>
                        </label>
                        <BankDropdown
                            type="from"
                            selectedBank={selectedFromBank}
                            onSelect={handleFromBankSelect}
                            showDropdown={showFromDropdown}
                            setShowDropdown={setShowFromDropdown}
                            placeholder="Select source bank..."
                        />
                        {selectedFromBank && (
                            <div className="mt-2 text-xs text-slate-600">
                                <span className="font-medium">Available Balance: ₹{formatCurrency(selectedFromBank.balance || 0)}</span>
                                <span className="text-slate-400 ml-2">•</span>
                                <span className="ml-2">IFSC: {selectedFromBank.ifsc}</span>
                            </div>
                        )}
                    </div>

                    {/* To Bank */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                            To Bank (Payment In) <span className="text-red-500">*</span>
                        </label>
                        <BankDropdown
                            type="to"
                            selectedBank={selectedToBank}
                            onSelect={handleToBankSelect}
                            showDropdown={showToDropdown}
                            setShowDropdown={setShowToDropdown}
                            placeholder="Select destination bank..."
                        />
                        {selectedToBank && (
                            <div className="mt-2 text-xs text-slate-600">
                                <span className="font-medium">Current Balance: ₹{formatCurrency(selectedToBank.balance || 0)}</span>
                                <span className="text-slate-400 ml-2">•</span>
                                <span className="ml-2">IFSC: {selectedToBank.ifsc}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Date and Amount Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                            Transfer Date <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <FiCalendar className="w-4 h-4 text-slate-400" />
                            </div>
                            <input
                                type="date"
                                name="date"
                                value={formData.date}
                                onChange={handleInputChange}
                                required
                                className="w-full pl-10 pr-3 py-3 border-2 border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                            Transfer Amount <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <FiDollarSign className="w-4 h-4 text-slate-400" />
                            </div>
                            <input
                                type="number"
                                name="amount"
                                value={formData.amount}
                                onChange={handleInputChange}
                                placeholder="Enter amount"
                                required
                                min="0.01"
                                step="0.01"
                                className="w-full pl-10 pr-3 py-3 border-2 border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            />
                        </div>
                    </div>
                </div>

                {/* Transaction Reference ID */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        Transaction Reference ID
                    </label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <FiHash className="w-4 h-4 text-slate-400" />
                        </div>
                        <input
                            type="text"
                            name="transaction_ref_id"
                            value={formData.transaction_ref_id}
                            onChange={handleInputChange}
                            placeholder="Enter transaction reference (UTR number, cheque no., etc.)"
                            className="w-full pl-10 pr-3 py-3 border-2 border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                        Bank transaction ID, UTR number, or transfer reference
                    </p>
                </div>

                {/* Description */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        Description
                    </label>
                    <div className="relative">
                        <div className="absolute left-3 top-3 pointer-events-none">
                            <FiFileText className="w-4 h-4 text-slate-400" />
                        </div>
                        <textarea
                            name="description"
                            value={formData.description}
                            onChange={handleInputChange}
                            placeholder="Enter transfer description or remarks..."
                            rows="3"
                            className="w-full pl-10 pr-3 py-3 border-2 border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                    </div>
                </div>

                {/* Transfer Summary */}
                {(selectedFromBank || selectedToBank || formData.amount) && (
                    <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200">
                        <h4 className="text-sm font-semibold text-indigo-900 mb-3">Transfer Summary</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div className="text-center p-2 bg-white rounded border border-indigo-100">
                                <div className="text-xs text-slate-600 mb-1">From Bank</div>
                                <div className="font-semibold text-red-600 text-sm truncate">
                                    {selectedFromBank?.bank || 'Not selected'}
                                </div>
                                <div className="text-xs text-slate-500 mt-1">
                                    ₹{formatCurrency(selectedFromBank?.balance || 0)}
                                </div>
                            </div>
                            <div className="text-center p-2 bg-white rounded border border-indigo-100">
                                <div className="text-xs text-slate-600 mb-1">Amount</div>
                                <div className="font-semibold text-indigo-600 text-sm">
                                    {formData.amount ? `₹${formatCurrency(formData.amount)}` : '₹0'}
                                </div>
                            </div>
                            <div className="text-center p-2 bg-white rounded border border-indigo-100">
                                <div className="text-xs text-slate-600 mb-1">To Bank</div>
                                <div className="font-semibold text-green-600 text-sm truncate">
                                    {selectedToBank?.bank || 'Not selected'}
                                </div>
                                <div className="text-xs text-slate-500 mt-1">
                                    ₹{formatCurrency(selectedToBank?.balance || 0)}
                                </div>
                            </div>
                            <div className="text-center p-2 bg-white rounded border border-indigo-100">
                                <div className="text-xs text-slate-600 mb-1">Ref ID</div>
                                <div className="font-semibold text-blue-600 text-sm truncate">
                                    {formData.transaction_ref_id || 'N/A'}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Warning Messages */}
                {formData.from_bank_id === formData.to_bank_id && formData.from_bank_id && formData.to_bank_id && (
                    <div className="flex items-center p-3 bg-amber-50 border border-amber-200 rounded-lg">
                        <svg className="w-4 h-4 text-amber-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.998-.833-2.732 0L4.342 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                        <span className="text-xs text-amber-700">Cannot transfer between the same bank account</span>
                    </div>
                )}

                {selectedFromBank && formData.amount && 
                 parseFloat(formData.amount) > parseFloat(selectedFromBank.balance || 0) && (
                    <div className="flex items-center p-3 bg-red-50 border border-red-200 rounded-lg">
                        <svg className="w-4 h-4 text-red-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-xs text-red-700">
                            Insufficient balance! Available: ₹{formatCurrency(selectedFromBank.balance || 0)}
                        </span>
                    </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4 border-t border-slate-200">
                    <button
                        type="submit"
                        disabled={isSubmitting || 
                            !formData.from_bank_id || 
                            !formData.to_bank_id || 
                            !formData.amount || 
                            formData.from_bank_id === formData.to_bank_id ||
                            (selectedFromBank && formData.amount && 
                             parseFloat(formData.amount) > parseFloat(selectedFromBank.balance || 0))}
                        className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg text-base font-medium hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? (
                            <div className="flex items-center justify-center gap-2">
                                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Processing...
                            </div>
                        ) : (
                            'Transfer Funds'
                        )}
                    </button>
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 px-6 py-3 bg-white border-2 border-slate-200 text-slate-700 rounded-lg text-base font-medium hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 transition-all duration-200"
                    >
                        Cancel
                    </button>
                </div>
            </form>
        </BaseModal>
    );
};

// Modal Manager Component
export const TransactionModalManager = ({ 
    modalType, 
    isOpen, 
    onClose, 
    bankDetails, 
    bankId, 
    onSubmit,
    formatCurrency,
    summary 
}) => {
    const modalProps = {
        isOpen,
        onClose,
        bankDetails,
        bankId,
        onSubmit,
        formatCurrency,
        summary
    };

    switch(modalType) {
        case 'RECEIVE':
            return <ReceiveModal {...modalProps} />;
        case 'PAYMENT':
            return <PaymentModal {...modalProps} />;
        case 'SALE':
            return <SaleModal {...modalProps} />;
        case 'PURCHASE':
            return <PurchaseModal {...modalProps} />;
        case 'EXPENSE':
            return <ExpenseModal {...modalProps} />;
        case 'CONTRA':
            return <ContraModal {...modalProps} />;
        default:
            return null;
    }
};