import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { FiX, FiCalendar, FiDollarSign, FiFileText, FiArrowRight, FiMinus, FiPlus, FiHash, FiCreditCard, FiUser, FiSearch } from 'react-icons/fi';
import axios from 'axios';
import API_BASE_URL from '../../src/utils/api-controller';
import getHeaders from '../../src/utils/get-headers';
import toast from 'react-hot-toast';

const JournalEntry = ({
    isOpen = false,
    onClose = () => { },
    onSuccess = () => { },
    initialFromAccountId = '',
    mode = 'modal'
}) => {
    const [formData, setFormData] = useState({
        from_account_id: initialFromAccountId || '',
        to_account_id: '',
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
    
    // Separate API data for from and to dropdowns
    const [fromClients, setFromClients] = useState([]);
    const [toClients, setToClients] = useState([]);
    const [loadingFrom, setLoadingFrom] = useState(false);
    const [loadingTo, setLoadingTo] = useState(false);
    const [fromPage, setFromPage] = useState(1);
    const [toPage, setToPage] = useState(1);
    const [hasMoreFrom, setHasMoreFrom] = useState(true);
    const [hasMoreTo, setHasMoreTo] = useState(true);
    
    // Refs for dropdowns
    const fromDropdownRef = useRef(null);
    const toDropdownRef = useRef(null);
    
    // Store search terms for each dropdown
    const [fromSearchValue, setFromSearchValue] = useState('');
    const [toSearchValue, setToSearchValue] = useState('');

    // Fetch clients for FROM dropdown
    const fetchFromClients = useCallback(async (search = '', pageNum = 1, append = false) => {
        setLoadingFrom(true);
        try {
            const response = await axios.get(
                `${API_BASE_URL}/client/search?page_no=${pageNum}&limit=10&search=${search}`,
                { headers: getHeaders() }
            );
            
            if (response.data.success) {
                const clientData = response.data.data || [];
                const formattedClients = clientData.map(client => ({
                    id: client.username,
                    type: 'client',
                    name: client.name || client.username,
                    username: client.username,
                    email: client.email || '',
                    contact: client.phone || '',
                    balance: client.balance || '0',
                    isActive: client.is_active
                }));
                
                if (append) {
                    setFromClients(prev => [...prev, ...formattedClients]);
                } else {
                    setFromClients(formattedClients);
                }
                
                setHasMoreFrom(!response.data.is_last_page);
            }
        } catch (error) {
            console.error('Error fetching from clients:', error);
            toast.error('Failed to fetch clients');
        } finally {
            setLoadingFrom(false);
        }
    }, []);

    // Fetch clients for TO dropdown
    const fetchToClients = useCallback(async (search = '', pageNum = 1, append = false) => {
        setLoadingTo(true);
        try {
            const response = await axios.get(
                `${API_BASE_URL}/client/search?page_no=${pageNum}&limit=10&search=${search}`,
                { headers: getHeaders() }
            );
            
            if (response.data.success) {
                const clientData = response.data.data || [];
                const formattedClients = clientData.map(client => ({
                    id: client.username,
                    type: 'client',
                    name: client.name || client.username,
                    username: client.username,
                    email: client.email || '',
                    contact: client.phone || '',
                    balance: client.balance || '0',
                    isActive: client.is_active
                }));
                
                if (append) {
                    setToClients(prev => [...prev, ...formattedClients]);
                } else {
                    setToClients(formattedClients);
                }
                
                setHasMoreTo(!response.data.is_last_page);
            }
        } catch (error) {
            console.error('Error fetching to clients:', error);
            toast.error('Failed to fetch clients');
        } finally {
            setLoadingTo(false);
        }
    }, []);

    // Debounced search for FROM dropdown
    useEffect(() => {
        if (!isOpen) return;
        const debounceTimer = setTimeout(() => {
            setFromPage(1);
            fetchFromClients(fromSearchValue, 1, false);
        }, 500);

        return () => clearTimeout(debounceTimer);
    }, [isOpen, fromSearchValue, fetchFromClients]);

    // Debounced search for TO dropdown
    useEffect(() => {
        if (!isOpen) return;
        const debounceTimer = setTimeout(() => {
            setToPage(1);
            fetchToClients(toSearchValue, 1, false);
        }, 500);

        return () => clearTimeout(debounceTimer);
    }, [isOpen, toSearchValue, fetchToClients]);

    // Load more clients for FROM dropdown
    const loadMoreFromClients = () => {
        const nextPage = fromPage + 1;
        setFromPage(nextPage);
        fetchFromClients(fromSearchValue, nextPage, true);
    };

    // Load more clients for TO dropdown
    const loadMoreToClients = () => {
        const nextPage = toPage + 1;
        setToPage(nextPage);
        fetchToClients(toSearchValue, nextPage, true);
    };

    // Initial load when modal opens
    useEffect(() => {
        if (isOpen) {
            fetchFromClients('', 1, false);
            fetchToClients('', 1, false);
        }
    }, [isOpen, fetchFromClients, fetchToClients]);

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

    // Filter FROM accounts based on search
    const filteredFromAccounts = useMemo(() => {
        if (!fromSearchValue) return fromClients;
        return fromClients.filter(account =>
            account.name?.toLowerCase().includes(fromSearchValue.toLowerCase()) ||
            account.email?.toLowerCase().includes(fromSearchValue.toLowerCase()) ||
            account.contact?.toLowerCase().includes(fromSearchValue.toLowerCase()) ||
            account.username?.toLowerCase().includes(fromSearchValue.toLowerCase())
        );
    }, [fromSearchValue, fromClients]);

    // Filter TO accounts based on search
    const filteredToAccounts = useMemo(() => {
        if (!toSearchValue) return toClients;
        return toClients.filter(account =>
            account.name?.toLowerCase().includes(toSearchValue.toLowerCase()) ||
            account.email?.toLowerCase().includes(toSearchValue.toLowerCase()) ||
            account.contact?.toLowerCase().includes(toSearchValue.toLowerCase()) ||
            account.username?.toLowerCase().includes(toSearchValue.toLowerCase())
        );
    }, [toSearchValue, toClients]);

    // Reset form when modal opens
    useEffect(() => {
        if (isOpen) {
            setFormData({
                from_account_id: initialFromAccountId || '',
                to_account_id: '',
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
    }, [isOpen, initialFromAccountId]);

    const getSelectedFromAccount = () => {
        return fromClients.find(account => account.id === formData.from_account_id);
    };

    const getSelectedToAccount = () => {
        return toClients.find(account => account.id === formData.to_account_id);
    };

    const getAccountDisplayText = (account) => {
        if (!account) return 'Select Account';
        return `${account.name} • ${account.email || account.username}`;
    };

    const getAccountTypeBadge = (type) => {
        return 'text-xs font-bold px-2 py-1 rounded bg-green-100 text-green-800';
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleFromAccountSelect = (accountId) => {
        setFormData(prev => ({ ...prev, from_account_id: accountId }));
        setShowFromDropdown(false);
        // Don't clear search value immediately to maintain dropdown content
        // but we'll keep the selected account visible
    };

    const handleToAccountSelect = (accountId) => {
        setFormData(prev => ({ ...prev, to_account_id: accountId }));
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
        
        if (!formData.from_account_id || !formData.to_account_id || !formData.amount) {
            toast.error('Please fill all required fields');
            return;
        }

        if (formData.from_account_id === formData.to_account_id) {
            toast.error('Cannot transfer between the same account');
            return;
        }

        if (isSubmitting) return;

        setIsSubmitting(true);
        
        const fromAccount = getSelectedFromAccount();
        const toAccount = getSelectedToAccount();

        if (!fromAccount || !toAccount) {
            toast.error('Invalid account selection');
            setIsSubmitting(false);
            return;
        }

        const payload = {
            amount: parseFloat(formData.amount),
            party1_id: fromAccount.id,
            party2_id: toAccount.id,
            party1_type: fromAccount.type,
            party2_type: toAccount.type,
            remark: formData.remark || `Journal entry from ${fromAccount.name} to ${toAccount.name}`,
            transaction_date: formData.date
        };

        if (formData.transaction_ref_id) {
            payload.transaction_ref_id = formData.transaction_ref_id;
        }

        try {
            const response = await axios.post(
                `${API_BASE_URL}/transaction/payment/journal`,
                payload,
                { headers: getHeaders() }
            );

            if (response.data.success) {
                toast.success(response.data.message || 'Journal entry created successfully');
                onSuccess(response.data.data);
                if (mode === 'modal') {
                    onClose();
                }
                // Reset form
                setFormData({
                    from_account_id: initialFromAccountId || '',
                    to_account_id: '',
                    date: new Date().toISOString().split('T')[0],
                    amount: '',
                    remark: '',
                    transaction_ref_id: ''
                });
            } else {
                toast.error(response.data.message || 'Failed to create journal entry');
            }
        } catch (error) {
            console.error('Error creating journal entry:', error);
            const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to create journal entry';
            toast.error(errorMessage);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Account Dropdown Component
    const AccountDropdown = ({ 
        type, 
        selectedId, 
        onSelect, 
        searchValue,
        setSearchValue,
        showDropdown, 
        setShowDropdown,
        accounts,
        isLoading,
        hasMore,
        onLoadMore
    }) => {
        const dropdownRef = type === 'from' ? fromDropdownRef : toDropdownRef;
        const selectedAccount = accounts.find(a => a.id === selectedId);
        
        return (
            <div className="relative" ref={dropdownRef}>
                <div
                    className="w-full px-3 py-2.5 border-2 border-gray-300 rounded-lg bg-white cursor-pointer hover:border-indigo-400 transition-all duration-200 shadow-sm"
                    onClick={() => setShowDropdown(!showDropdown)}
                >
                    {selectedId && selectedAccount ? (
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                                <div className={`p-1 ${type === 'from' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'} rounded`}>
                                    {type === 'from' ? <FiMinus className="w-3.5 h-3.5" /> : <FiPlus className="w-3.5 h-3.5" />}
                                </div>
                                <div>
                                    <div className="text-sm font-medium text-gray-900 truncate max-w-[200px]">
                                        {selectedAccount.name}
                                    </div>
                                    <div className="text-xs text-gray-600 truncate max-w-[200px]">
                                        {getAccountDisplayText(selectedAccount)}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center space-x-2">
                                <span className={getAccountTypeBadge(selectedAccount.type)}>
                                    CL
                                </span>
                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center justify-between text-gray-500">
                            <div className="flex items-center space-x-2">
                                {type === 'from' ? <FiMinus className="w-4 h-4 text-gray-400" /> : <FiPlus className="w-4 h-4 text-gray-400" />}
                                <span className="text-sm">Select client...</span>
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
                                    placeholder="Search clients..."
                                    className="w-full px-3 py-2 pl-8 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                                    value={searchValue}
                                    onChange={(e) => setSearchValue(e.target.value)}
                                    autoFocus
                                />
                                <FiSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                            </div>
                        </div>
                        <div className="py-1">
                            {isLoading && accounts.length === 0 ? (
                                <div className="px-4 py-3 text-center text-gray-500">
                                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-indigo-500 border-t-transparent mx-auto mb-2"></div>
                                    Loading clients...
                                </div>
                            ) : accounts.length > 0 ? (
                                <>
                                    {accounts.map(account => (
                                        <div
                                            key={account.id}
                                            className={`px-3 py-2 cursor-pointer hover:bg-gray-50 border-l-2 ${selectedId === account.id
                                                ? type === 'from' ? 'bg-red-50 border-red-500' : 'bg-green-50 border-green-500'
                                                : 'border-transparent'
                                                }`}
                                            onClick={() => onSelect(account.id)}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center space-x-2">
                                                    <div className={`p-1 ${type === 'from' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'} rounded`}>
                                                        {type === 'from' ? <FiMinus className="w-3 h-3" /> : <FiPlus className="w-3 h-3" />}
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-medium text-gray-900">{account.name}</div>
                                                        <div className="text-xs text-gray-600">
                                                            {account.email || account.username}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    <span className="text-xs text-gray-500">₹{account.balance}</span>
                                                    <span className={getAccountTypeBadge(account.type)}>
                                                        CL
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
                                            {isLoading ? 'Loading...' : 'Load More Clients'}
                                        </button>
                                    )}
                                </>
                            ) : (
                                <div className="px-4 py-3 text-center text-gray-500">
                                    {searchValue ? 'No clients found' : 'No clients available'}
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
                        <h2 className="text-lg font-bold">Journal Entry</h2>
                        <span className="text-indigo-200 text-sm hidden sm:inline">|</span>
                        <p className="text-indigo-100 text-xs sm:text-sm hidden sm:block">Client to Client Transfer</p>
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
                    {/* Account Selection Section */}
                    <div className="mb-6">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            {/* Decrease From Account */}
                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <label className="block text-sm font-semibold text-gray-700">
                                        Decrease From <span className="text-red-500">*</span>
                                    </label>
                                    <span className="text-xs text-gray-500 px-1.5 py-0.5 bg-gray-100 rounded">Required</span>
                                </div>
                                <AccountDropdown
                                    type="from"
                                    selectedId={formData.from_account_id}
                                    onSelect={handleFromAccountSelect}
                                    searchValue={fromSearchValue}
                                    setSearchValue={setFromSearchValue}
                                    showDropdown={showFromDropdown}
                                    setShowDropdown={setShowFromDropdown}
                                    accounts={filteredFromAccounts}
                                    isLoading={loadingFrom}
                                    hasMore={hasMoreFrom}
                                    onLoadMore={loadMoreFromClients}
                                />
                                {formData.from_account_id && (
                                    <div className="mt-1.5 text-xs text-gray-600 flex items-center space-x-2">
                                        <span className="font-medium">Balance: ₹{getSelectedFromAccount()?.balance || 0}</span>
                                        <span className="text-gray-400">•</span>
                                        <span className="text-gray-500">CLIENT</span>
                                    </div>
                                )}
                            </div>

                            {/* Increase To Account */}
                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <label className="block text-sm font-semibold text-gray-700">
                                        Increase To <span className="text-red-500">*</span>
                                    </label>
                                    <span className="text-xs text-gray-500 px-1.5 py-0.5 bg-gray-100 rounded">Required</span>
                                </div>
                                <AccountDropdown
                                    type="to"
                                    selectedId={formData.to_account_id}
                                    onSelect={handleToAccountSelect}
                                    searchValue={toSearchValue}
                                    setSearchValue={setToSearchValue}
                                    showDropdown={showToDropdown}
                                    setShowDropdown={setShowToDropdown}
                                    accounts={filteredToAccounts}
                                    isLoading={loadingTo}
                                    hasMore={hasMoreTo}
                                    onLoadMore={loadMoreToClients}
                                />
                                {formData.to_account_id && (
                                    <div className="mt-1.5 text-xs text-gray-600 flex items-center space-x-2">
                                        <span className="font-medium">Balance: ₹{getSelectedToAccount()?.balance || 0}</span>
                                        <span className="text-gray-400">•</span>
                                        <span className="text-gray-500">CLIENT</span>
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
                                    Journal Date <span className="text-red-500">*</span>
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
                                    Amount <span className="text-red-500">*</span>
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
                                    placeholder="Enter amount"
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
                                Bank transaction ID, UTR number, or journal reference
                            </p>
                        </div>

                        {/* Description */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                Journal Description
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
                                    placeholder="Enter journal description or remarks..."
                                    rows={3}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Journal Summary */}
                    <div className="bg-gradient-to-br from-indigo-50 to-white p-4 rounded-lg border border-indigo-100 shadow-sm">
                        <div className="flex items-center mb-3">
                            <div className="p-1.5 bg-indigo-600 text-white rounded mr-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                </svg>
                            </div>
                            <h4 className="text-sm font-bold text-gray-900">Journal Summary</h4>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div className="text-center p-2 bg-white rounded border border-gray-200">
                                <div className="text-xs text-gray-600 mb-1">Decrease From</div>
                                <div className="font-semibold text-red-600 text-sm truncate">
                                    {getSelectedFromAccount()?.name || 'Not selected'}
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                    CLIENT
                                </div>
                            </div>
                            <div className="text-center p-2 bg-white rounded border border-gray-200">
                                <div className="text-xs text-gray-600 mb-1">Amount</div>
                                <div className="font-semibold text-indigo-600 text-sm">
                                    {formData.amount ? formatCurrency(formData.amount) : '₹0'}
                                </div>
                            </div>
                            <div className="text-center p-2 bg-white rounded border border-gray-200">
                                <div className="text-xs text-gray-600 mb-1">Increase To</div>
                                <div className="font-semibold text-green-600 text-sm truncate">
                                    {getSelectedToAccount()?.name || 'Not selected'}
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                    CLIENT
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
                    {formData.from_account_id === formData.to_account_id && formData.from_account_id && formData.to_account_id && (
                        <div className="w-full lg:w-auto">
                            <div className="flex items-center text-amber-600 text-xs font-medium px-3 py-1.5 bg-amber-50 border border-amber-200 rounded">
                                <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.998-.833-2.732 0L4.342 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                </svg>
                                Cannot journal between same accounts
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
                                disabled={isSubmitting || !formData.from_account_id || !formData.to_account_id || !formData.amount || formData.from_account_id === formData.to_account_id}
                                className="px-5 py-2 text-xs font-medium text-white bg-gradient-to-r from-indigo-600 to-indigo-700 border border-transparent rounded-lg hover:from-indigo-700 hover:to-indigo-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 shadow hover:shadow-md min-w-[140px] flex items-center justify-center"
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
                                        <FiArrowRight className="w-3.5 h-3.5 mr-1.5" />
                                        Create Journal
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

export default JournalEntry;