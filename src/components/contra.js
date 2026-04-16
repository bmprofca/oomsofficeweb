import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { FiX, FiCalendar, FiDollarSign, FiFileText, FiArrowRight, FiCreditCard, FiHash, FiSearch, FiMinus, FiPlus } from 'react-icons/fi';
import axios from 'axios';
import API_BASE_URL from '../../src/utils/api-controller';
import getHeaders from '../../src/utils/get-headers';
import toast from 'react-hot-toast';

const appSettings = {
    company_name: 'Professional Accounting Services',
    currency: 'INR',
};

const ContraTransfer = ({
    isOpen = false,
    onClose = () => { },
    onSuccess = () => { },
    initialOutBankId = '',
    initialInBankId = '',
    mode = 'modal'
}) => {
    const [formData, setFormData] = useState({
        out_bank_id: initialOutBankId || '',
        in_bank_id: initialInBankId || '',
        date: new Date().toISOString().split('T')[0],
        amount: '',
        remark: '',
        transaction_ref_id: ''
    });

    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Separate state for from and to dropdowns
    const [fromSearchTerm, setFromSearchTerm] = useState('');
    const [toSearchTerm, setToSearchTerm] = useState('');
    const [showFromDropdown, setShowFromDropdown] = useState(false);
    const [showToDropdown, setShowToDropdown] = useState(false);
    
    // Separate API data for from and to banks
    const [fromBanks, setFromBanks] = useState([]);
    const [toBanks, setToBanks] = useState([]);
    const [loadingFrom, setLoadingFrom] = useState(false);
    const [loadingTo, setLoadingTo] = useState(false);
    const [fromPage, setFromPage] = useState(1);
    const [toPage, setToPage] = useState(1);
    const [hasMoreFrom, setHasMoreFrom] = useState(true);
    const [hasMoreTo, setHasMoreTo] = useState(true);
    
    // Store search values for each dropdown
    const [fromSearchValue, setFromSearchValue] = useState('');
    const [toSearchValue, setToSearchValue] = useState('');
    
    // Refs for dropdowns
    const fromDropdownRef = useRef(null);
    const toDropdownRef = useRef(null);

    // Fetch banks for FROM dropdown
    const fetchFromBanks = useCallback(async (search = '', pageNum = 1, append = false) => {
        setLoadingFrom(true);
        try {
            const response = await axios.get(
                `${API_BASE_URL}/transaction/bank/list?page_no=${pageNum}&limit=10&search=${search}`,
                { headers: getHeaders() }
            );
            
            if (response.data.success) {
                const bankData = response.data.data || [];
                const formattedBanks = bankData.map(bank => ({
                    id: bank.bank_id,
                    type: 'bank',
                    name: bank.bank,
                    account_no: bank.account_no,
                    ifsc: bank.ifsc,
                    branch: bank.branch,
                    balance: bank.balance || '0',
                    remark: bank.remark
                }));
                
                if (append) {
                    setFromBanks(prev => [...prev, ...formattedBanks]);
                } else {
                    setFromBanks(formattedBanks);
                }
                
                setHasMoreFrom(!response.data.is_last_page);
            }
        } catch (error) {
            console.error('Error fetching from banks:', error);
            toast.error('Failed to fetch banks');
        } finally {
            setLoadingFrom(false);
        }
    }, []);

    // Fetch banks for TO dropdown
    const fetchToBanks = useCallback(async (search = '', pageNum = 1, append = false) => {
        setLoadingTo(true);
        try {
            const response = await axios.get(
                `${API_BASE_URL}/transaction/bank/list?page_no=${pageNum}&limit=10&search=${search}`,
                { headers: getHeaders() }
            );
            
            if (response.data.success) {
                const bankData = response.data.data || [];
                const formattedBanks = bankData.map(bank => ({
                    id: bank.bank_id,
                    type: 'bank',
                    name: bank.bank,
                    account_no: bank.account_no,
                    ifsc: bank.ifsc,
                    branch: bank.branch,
                    balance: bank.balance || '0',
                    remark: bank.remark
                }));
                
                if (append) {
                    setToBanks(prev => [...prev, ...formattedBanks]);
                } else {
                    setToBanks(formattedBanks);
                }
                
                setHasMoreTo(!response.data.is_last_page);
            }
        } catch (error) {
            console.error('Error fetching to banks:', error);
            toast.error('Failed to fetch banks');
        } finally {
            setLoadingTo(false);
        }
    }, []);

    // Debounced search for FROM dropdown
    useEffect(() => {
        if (!isOpen) return;
        const debounceTimer = setTimeout(() => {
            setFromPage(1);
            fetchFromBanks(fromSearchValue, 1, false);
        }, 500);

        return () => clearTimeout(debounceTimer);
    }, [isOpen, fromSearchValue, fetchFromBanks]);

    // Debounced search for TO dropdown
    useEffect(() => {
        if (!isOpen) return;
        const debounceTimer = setTimeout(() => {
            setToPage(1);
            fetchToBanks(toSearchValue, 1, false);
        }, 500);

        return () => clearTimeout(debounceTimer);
    }, [isOpen, toSearchValue, fetchToBanks]);

    // Load more banks for FROM dropdown
    const loadMoreFromBanks = () => {
        const nextPage = fromPage + 1;
        setFromPage(nextPage);
        fetchFromBanks(fromSearchValue, nextPage, true);
    };

    // Load more banks for TO dropdown
    const loadMoreToBanks = () => {
        const nextPage = toPage + 1;
        setToPage(nextPage);
        fetchToBanks(toSearchValue, nextPage, true);
    };

    // Initial load when modal opens
    useEffect(() => {
        if (isOpen) {
            fetchFromBanks('', 1, false);
            fetchToBanks('', 1, false);
        }
    }, [isOpen, fetchFromBanks, fetchToBanks]);

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

    // Filter FROM banks based on search
    const filteredFromBanks = useMemo(() => {
        if (!fromSearchValue) return fromBanks;
        return fromBanks.filter(bank =>
            bank.name?.toLowerCase().includes(fromSearchValue.toLowerCase()) ||
            bank.account_no?.toLowerCase().includes(fromSearchValue.toLowerCase()) ||
            bank.ifsc?.toLowerCase().includes(fromSearchValue.toLowerCase()) ||
            bank.branch?.toLowerCase().includes(fromSearchValue.toLowerCase())
        );
    }, [fromSearchValue, fromBanks]);

    // Filter TO banks based on search
    const filteredToBanks = useMemo(() => {
        if (!toSearchValue) return toBanks;
        return toBanks.filter(bank =>
            bank.name?.toLowerCase().includes(toSearchValue.toLowerCase()) ||
            bank.account_no?.toLowerCase().includes(toSearchValue.toLowerCase()) ||
            bank.ifsc?.toLowerCase().includes(toSearchValue.toLowerCase()) ||
            bank.branch?.toLowerCase().includes(toSearchValue.toLowerCase())
        );
    }, [toSearchValue, toBanks]);

    // Reset form when modal opens
    useEffect(() => {
        if (isOpen) {
            setFormData({
                out_bank_id: initialOutBankId || '',
                in_bank_id: initialInBankId || '',
                date: new Date().toISOString().split('T')[0],
                amount: '',
                remark: '',
                transaction_ref_id: ''
            });
            setFromSearchValue('');
            setToSearchValue('');
            setShowFromDropdown(false);
            setShowToDropdown(false);
            setFromPage(1);
            setToPage(1);
        }
    }, [isOpen, initialOutBankId, initialInBankId]);

    const getSelectedOutBank = () => {
        return fromBanks.find(bank => bank.id === formData.out_bank_id);
    };

    const getSelectedInBank = () => {
        return toBanks.find(bank => bank.id === formData.in_bank_id);
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleFromBankSelect = (bankId) => {
        setFormData(prev => ({ ...prev, out_bank_id: bankId }));
        setShowFromDropdown(false);
    };

    const handleToBankSelect = (bankId) => {
        setFormData(prev => ({ ...prev, in_bank_id: bankId }));
        setShowToDropdown(false);
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!formData.out_bank_id || !formData.in_bank_id || !formData.amount) {
            toast.error('Please fill all required fields');
            return;
        }

        if (formData.out_bank_id === formData.in_bank_id) {
            toast.error('Cannot transfer between the same bank account');
            return;
        }

        if (isSubmitting) return;

        setIsSubmitting(true);
        
        const outBank = getSelectedOutBank();
        const inBank = getSelectedInBank();

        if (!outBank || !inBank) {
            toast.error('Invalid bank selection');
            setIsSubmitting(false);
            return;
        }

        // Check if sufficient balance in source bank
        if (parseFloat(formData.amount) > parseFloat(outBank.balance)) {
            toast.error(`Insufficient balance in ${outBank.name}. Available balance: ₹${outBank.balance}`);
            setIsSubmitting(false);
            return;
        }

        const payload = {
            amount: parseFloat(formData.amount),
            party1_id: outBank.id,
            party2_id: inBank.id,
            party1_type: "bank",
            party2_type: "bank",
            remark: formData.remark || `Contra transfer from ${outBank.name} to ${inBank.name}`,
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
                onSuccess(response.data.data);
                if (mode === 'modal') {
                    onClose();
                }
                // Reset form
                setFormData({
                    out_bank_id: initialOutBankId || '',
                    in_bank_id: initialInBankId || '',
                    date: new Date().toISOString().split('T')[0],
                    amount: '',
                    remark: '',
                    transaction_ref_id: ''
                });
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
        selectedId, 
        onSelect, 
        searchValue,
        setSearchValue,
        showDropdown, 
        setShowDropdown,
        banks,
        isLoading,
        hasMore,
        onLoadMore
    }) => {
        const dropdownRef = type === 'from' ? fromDropdownRef : toDropdownRef;
        const selectedBank = banks.find(b => b.id === selectedId);
        
        return (
            <div className="relative" ref={dropdownRef}>
                <div
                    className="w-full px-3 py-2.5 border-2 border-gray-300 rounded-lg bg-white cursor-pointer hover:border-indigo-400 transition-all duration-200 shadow-sm"
                    onClick={() => setShowDropdown(!showDropdown)}
                >
                    {selectedId && selectedBank ? (
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                                <div className={`p-1 ${type === 'from' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'} rounded`}>
                                    <FiCreditCard className="w-3.5 h-3.5" />
                                </div>
                                <div>
                                    <div className="text-sm font-medium text-gray-900 truncate max-w-[200px]">
                                        {selectedBank.name}
                                    </div>
                                    <div className="text-xs text-gray-600 truncate max-w-[200px]">
                                        A/c: {selectedBank.account_no} | IFSC: {selectedBank.ifsc}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center space-x-2">
                                <span className="text-xs font-bold px-2 py-1 rounded bg-blue-100 text-blue-800">
                                    BK
                                </span>
                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center justify-between text-gray-500">
                            <div className="flex items-center space-x-2">
                                <FiCreditCard className="w-4 h-4 text-gray-400" />
                                <span className="text-sm">Select bank account...</span>
                            </div>
                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </div>
                    )}
                </div>

                {showDropdown && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-xl max-h-80 overflow-y-auto">
                        <div className="sticky top-0 p-2 border-b border-gray-200 bg-gray-50">
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Search banks by name, account, or IFSC..."
                                    className="w-full px-3 py-2 pl-8 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                                    value={searchValue}
                                    onChange={(e) => setSearchValue(e.target.value)}
                                    autoFocus
                                />
                                <FiSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                            </div>
                        </div>
                        <div className="py-1">
                            {isLoading && banks.length === 0 ? (
                                <div className="px-4 py-3 text-center text-gray-500">
                                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-indigo-500 border-t-transparent mx-auto mb-2"></div>
                                    Loading banks...
                                </div>
                            ) : banks.length > 0 ? (
                                <>
                                    {banks.map(bank => (
                                        <div
                                            key={bank.id}
                                            className={`px-3 py-2 cursor-pointer hover:bg-gray-50 border-l-2 ${selectedId === bank.id
                                                ? type === 'from' ? 'bg-red-50 border-red-500' : 'bg-green-50 border-green-500'
                                                : 'border-transparent'
                                                }`}
                                            onClick={() => onSelect(bank.id)}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex-1">
                                                    <div className="text-sm font-medium text-gray-900">{bank.name}</div>
                                                    <div className="text-xs text-gray-600">
                                                        A/c: {bank.account_no} • IFSC: {bank.ifsc}
                                                    </div>
                                                    <div className="text-xs text-gray-500 mt-0.5">
                                                        Branch: {bank.branch}
                                                    </div>
                                                    {bank.remark && (
                                                        <div className="text-xs text-gray-400 mt-0.5">
                                                            Note: {bank.remark}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    <span className="text-xs font-semibold text-green-600">
                                                        ₹{bank.balance}
                                                    </span>
                                                    <span className="text-xs font-bold px-2 py-1 rounded bg-blue-100 text-blue-800">
                                                        BK
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {hasMore && (
                                        <button
                                            type="button"
                                            onClick={onLoadMore}
                                            disabled={isLoading}
                                            className="w-full px-4 py-2 text-center bg-gray-50 hover:bg-gray-100 text-indigo-600 font-medium text-sm border-t border-gray-200 transition-colors disabled:opacity-50"
                                        >
                                            {isLoading ? 'Loading...' : 'Load More Banks'}
                                        </button>
                                    )}
                                </>
                            ) : (
                                <div className="px-4 py-3 text-center text-gray-500">
                                    {searchValue ? 'No banks found' : 'No banks available'}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const formContent = (
        <div className="bg-white rounded-xl shadow-2xl flex flex-col h-full border border-gray-200">
            {/* Compact Header */}
            <div className="flex-shrink-0 flex items-center justify-between p-3 border-b border-gray-200 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-t-xl">
                <div className="flex items-center space-x-3">
                    <div className="p-1.5 bg-white/10 rounded-lg">
                        <FiArrowRight className="w-5 h-5" />
                    </div>
                    <div className="flex items-center space-x-4">
                        <h2 className="text-lg font-bold">Bank Transfer (Contra)</h2>
                        <span className="text-indigo-200 text-sm hidden sm:inline">|</span>
                        <p className="text-indigo-100 text-xs sm:text-sm hidden sm:block">{appSettings.company_name}</p>
                    </div>
                </div>
                {mode === 'modal' && (
                    <button
                        onClick={onClose}
                        className="p-1.5 text-indigo-200 hover:text-white hover:bg-indigo-500 rounded-lg transition-colors"
                    >
                        <FiX className="w-5 h-5" />
                    </button>
                )}
            </div>

            {/* Scrollable Content Area */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 bg-gray-50">
                <form onSubmit={handleSubmit}>
                    {/* Bank Transfer Section */}
                    <div className="mb-6">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            {/* From Bank */}
                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <label className="block text-sm font-semibold text-gray-700">
                                        From Bank (Payment Out) <span className="text-red-500">*</span>
                                    </label>
                                    <span className="text-xs text-gray-500 px-1.5 py-0.5 bg-gray-100 rounded">Required</span>
                                </div>
                                <BankDropdown
                                    type="from"
                                    selectedId={formData.out_bank_id}
                                    onSelect={handleFromBankSelect}
                                    searchValue={fromSearchValue}
                                    setSearchValue={setFromSearchValue}
                                    showDropdown={showFromDropdown}
                                    setShowDropdown={setShowFromDropdown}
                                    banks={filteredFromBanks}
                                    isLoading={loadingFrom}
                                    hasMore={hasMoreFrom}
                                    onLoadMore={loadMoreFromBanks}
                                />
                                {formData.out_bank_id && (
                                    <div className="mt-2 text-xs text-gray-600">
                                        <span className="font-medium">Balance: ₹{getSelectedOutBank()?.balance || 0}</span>
                                        <span className="text-gray-400 ml-2">•</span>
                                        <span className="ml-2">IFSC: {getSelectedOutBank()?.ifsc}</span>
                                    </div>
                                )}
                            </div>

                            {/* To Bank */}
                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <label className="block text-sm font-semibold text-gray-700">
                                        To Bank (Payment In) <span className="text-red-500">*</span>
                                    </label>
                                    <span className="text-xs text-gray-500 px-1.5 py-0.5 bg-gray-100 rounded">Required</span>
                                </div>
                                <BankDropdown
                                    type="to"
                                    selectedId={formData.in_bank_id}
                                    onSelect={handleToBankSelect}
                                    searchValue={toSearchValue}
                                    setSearchValue={setToSearchValue}
                                    showDropdown={showToDropdown}
                                    setShowDropdown={setShowToDropdown}
                                    banks={filteredToBanks}
                                    isLoading={loadingTo}
                                    hasMore={hasMoreTo}
                                    onLoadMore={loadMoreToBanks}
                                />
                                {formData.in_bank_id && (
                                    <div className="mt-2 text-xs text-gray-600">
                                        <span className="font-medium">Balance: ₹{getSelectedInBank()?.balance || 0}</span>
                                        <span className="text-gray-400 ml-2">•</span>
                                        <span className="ml-2">IFSC: {getSelectedInBank()?.ifsc}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Date and Amount Section */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
                        {/* Date */}
                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <label className="block text-sm font-semibold text-gray-700">
                                    Transfer Date <span className="text-red-500">*</span>
                                </label>
                                <span className="text-xs text-gray-500 px-1.5 py-0.5 bg-gray-100 rounded">Required</span>
                            </div>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                                    <FiCalendar className="w-4 h-4 text-gray-400" />
                                </div>
                                <input
                                    type="date"
                                    className="pl-9 w-full pr-3 py-2.5 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 hover:border-indigo-400 transition-all duration-200 shadow-sm bg-white text-sm"
                                    name="date"
                                    value={formData.date}
                                    onChange={handleInputChange}
                                    required
                                />
                            </div>
                        </div>

                        {/* Amount */}
                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <label className="block text-sm font-semibold text-gray-700">
                                    Transfer Amount <span className="text-red-500">*</span>
                                </label>
                                <span className="text-xs text-gray-500 px-1.5 py-0.5 bg-gray-100 rounded">Required</span>
                            </div>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                                    <FiDollarSign className="w-4 h-4 text-gray-400" />
                                </div>
                                <input
                                    type="number"
                                    className="pl-9 w-full pr-3 py-2.5 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 hover:border-indigo-400 transition-all duration-200 shadow-sm text-sm"
                                    name="amount"
                                    value={formData.amount}
                                    onChange={handleInputChange}
                                    placeholder="Enter transfer amount"
                                    required
                                    min="1"
                                    step="0.01"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Transaction Ref ID and Description Section */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
                        {/* Transaction Ref ID */}
                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <label className="block text-sm font-semibold text-gray-700">
                                    Transaction Reference ID
                                </label>
                                <span className="text-xs text-gray-500 px-1.5 py-0.5 bg-gray-100 rounded">Optional</span>
                            </div>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                                    <FiHash className="w-4 h-4 text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    className="pl-9 w-full pr-3 py-2.5 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 hover:border-indigo-400 transition-all duration-200 shadow-sm text-sm"
                                    name="transaction_ref_id"
                                    value={formData.transaction_ref_id}
                                    onChange={handleInputChange}
                                    placeholder="Enter transaction reference"
                                    maxLength="50"
                                />
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                                Bank transaction ID, UTR number, or transfer reference
                            </p>
                        </div>

                        {/* Description */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                Transfer Description
                            </label>
                            <div className="relative">
                                <div className="absolute left-3 top-3 pointer-events-none">
                                    <FiFileText className="w-4 h-4 text-gray-400" />
                                </div>
                                <textarea
                                    className="pl-10 w-full px-3 py-2.5 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 hover:border-indigo-400 transition-all duration-200 shadow-sm text-sm"
                                    name="remark"
                                    value={formData.remark}
                                    onChange={handleInputChange}
                                    placeholder="Enter transfer description or remarks..."
                                    rows={3}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Transfer Summary */}
                    <div className="bg-gradient-to-br from-indigo-50 to-white p-4 rounded-lg border border-indigo-100 shadow-sm">
                        <div className="flex items-center mb-3">
                            <div className="p-1.5 bg-indigo-600 text-white rounded mr-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                </svg>
                            </div>
                            <h4 className="text-sm font-bold text-gray-900">Transfer Summary</h4>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div className="text-center p-2 bg-white rounded border border-gray-200">
                                <div className="text-xs text-gray-600 mb-1">From Bank</div>
                                <div className="font-semibold text-red-600 text-sm truncate">
                                    {getSelectedOutBank()?.name || 'Not selected'}
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                    ₹{getSelectedOutBank()?.balance || 'N/A'}
                                </div>
                            </div>
                            <div className="text-center p-2 bg-white rounded border border-gray-200">
                                <div className="text-xs text-gray-600 mb-1">Amount</div>
                                <div className="font-semibold text-indigo-600 text-sm">
                                    {formData.amount ? formatCurrency(formData.amount) : '₹0'}
                                </div>
                            </div>
                            <div className="text-center p-2 bg-white rounded border border-gray-200">
                                <div className="text-xs text-gray-600 mb-1">To Bank</div>
                                <div className="font-semibold text-green-600 text-sm truncate">
                                    {getSelectedInBank()?.name || 'Not selected'}
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                    ₹{getSelectedInBank()?.balance || 'N/A'}
                                </div>
                            </div>
                            <div className="text-center p-2 bg-white rounded border border-gray-200">
                                <div className="text-xs text-gray-600 mb-1">Ref ID</div>
                                <div className="font-semibold text-blue-600 text-sm truncate">
                                    {formData.transaction_ref_id || 'N/A'}
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
                    {formData.out_bank_id === formData.in_bank_id && formData.out_bank_id && formData.in_bank_id && (
                        <div className="w-full lg:w-auto">
                            <div className="flex items-center text-amber-600 text-xs font-medium px-3 py-1.5 bg-amber-50 border border-amber-200 rounded">
                                <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.998-.833-2.732 0L4.342 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                </svg>
                                Cannot transfer between same bank account
                            </div>
                        </div>
                    )}

                    {/* Insufficient Balance Warning */}
                    {formData.out_bank_id && formData.amount && getSelectedOutBank() && 
                     parseFloat(formData.amount) > parseFloat(getSelectedOutBank()?.balance) && (
                        <div className="w-full lg:w-auto">
                            <div className="flex items-center text-red-600 text-xs font-medium px-3 py-1.5 bg-red-50 border border-red-200 rounded">
                                <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Insufficient balance! Available: ₹{getSelectedOutBank()?.balance}
                            </div>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full lg:w-auto">
                        {/* Amount Display */}
                        <div className="hidden lg:block px-3 py-1.5 bg-gradient-to-r from-indigo-50 to-indigo-100 rounded border border-indigo-200">
                            <div className="text-xs text-indigo-700 font-semibold">
                                Amount: <span className="text-sm">{formData.amount ? formatCurrency(formData.amount) : '₹0'}</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            {mode === 'modal' && (
                                <button
                                    type="button"
                                    onClick={onClose}
                                    disabled={isSubmitting}
                                    className="px-4 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-500 focus:border-gray-500 transition-all duration-150 disabled:opacity-50 shadow-sm"
                                >
                                    Cancel
                                </button>
                            )}
                            <button
                                type="submit"
                                onClick={handleSubmit}
                                disabled={isSubmitting || 
                                    !formData.out_bank_id || 
                                    !formData.in_bank_id || 
                                    !formData.amount || 
                                    formData.out_bank_id === formData.in_bank_id ||
                                    (formData.out_bank_id && formData.amount && getSelectedOutBank() && 
                                     parseFloat(formData.amount) > parseFloat(getSelectedOutBank()?.balance))}
                                className="px-5 py-2 text-xs font-medium text-white bg-gradient-to-r from-indigo-600 to-indigo-700 border border-transparent rounded-lg hover:from-indigo-700 hover:to-indigo-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 shadow hover:shadow-md min-w-[140px] flex items-center justify-center"
                            >
                                {isSubmitting ? (
                                    <>
                                        <svg className="animate-spin -ml-1 mr-2 h-3 w-3 text-white" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Processing...
                                    </>
                                ) : (
                                    <>
                                        <FiArrowRight className="w-3.5 h-3.5 mr-1.5" />
                                        Transfer Funds
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    // Render as modal or standalone component
    if (mode === 'modal') {
        return isOpen ? (
            <div className="fixed inset-0 z-50 overflow-y-auto">
                <div className="flex items-center justify-center min-h-screen p-2 sm:p-4">
                    {/* Overlay */}
                    <div
                        className="fixed inset-0 bg-gray-900 bg-opacity-50 backdrop-blur-sm transition-opacity"
                        onClick={onClose}
                    />
                    {/* Modal panel */}
                    <div className="relative w-full max-w-3xl bg-white rounded-xl shadow-2xl h-[85vh] flex flex-col transform transition-all duration-300 scale-100">
                        {formContent}
                    </div>
                </div>
            </div>
        ) : null;
    }

    // Render as standalone page component
    return formContent;
};

export default ContraTransfer;