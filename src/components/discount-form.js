import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { FiX, FiCalendar, FiDollarSign, FiFileText, FiArrowRight, FiCreditCard, FiHash, FiPlus, FiUser, FiTrash2, FiChevronDown, FiMail, FiMessageSquare, FiSearch } from 'react-icons/fi';
import getHeaders from '../utils/get-headers';
import API_BASE_URL from '../utils/api-controller';

const DiscountForm = ({
    isOpen = false,
    onClose = () => { },
    onSuccess = () => { },
    initialPartyId = '',
    mode = 'modal'
}) => {
    const [formData, setFormData] = useState({
        amount: '',
        party_id: initialPartyId || '',
        party_type: 'client',
        remark: '',
        transaction_date: new Date().toISOString().split('T')[0],
    });

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [showPartyDropdown, setShowPartyDropdown] = useState(false);
    const [sendEmail, setSendEmail] = useState(true);
    const [sendWhatsApp, setSendWhatsApp] = useState(true);
    const [partyOptions, setPartyOptions] = useState([]);
    const [loadingParties, setLoadingParties] = useState(false);
    const [selectedParty, setSelectedParty] = useState(null);

    // Fetch clients from API
    const fetchClients = useCallback(async (search = '') => {
        setLoadingParties(true);
        try {
            const headers = getHeaders();
            const url = `${API_BASE_URL}/client/list?page=1&limit=20&search=${encodeURIComponent(search)}`;
            
            const response = await fetch(url, {
                method: 'GET',
                headers: headers
            });

            const result = await response.json();

            if (result.success && result.data) {
                // Format clients to match the expected structure
                const formattedClients = result.data.map(client => ({
                    id: client.client_id || client.id,
                    type: 'client',
                    name: client.name || client.client_name || '',
                    email: client.email || '',
                    contact: client.contact_no || client.phone || '',
                    outstanding: client.outstanding_balance || client.balance || '0',
                    gst_no: client.gst_no || '',
                    address: client.address || ''
                }));
                setPartyOptions(formattedClients);
            } else {
                console.error('Failed to fetch clients:', result);
                setPartyOptions([]);
            }
        } catch (error) {
            console.error('Error fetching clients:', error);
            setPartyOptions([]);
        } finally {
            setLoadingParties(false);
        }
    }, []);

    // Fetch initial clients when modal opens
    useEffect(() => {
        if (isOpen && mode === 'modal') {
            fetchClients();
            setSearchTerm('');
            setSelectedParty(null);
            setFormData(prev => ({
                ...prev,
                party_id: initialPartyId || '',
                transaction_date: new Date().toISOString().split('T')[0],
                amount: '',
                remark: ''
            }));
        }
    }, [isOpen, initialPartyId, fetchClients, mode]);

    // Search clients when search term changes
    useEffect(() => {
        if (showPartyDropdown) {
            const debounceTimer = setTimeout(() => {
                fetchClients(searchTerm);
            }, 300);
            return () => clearTimeout(debounceTimer);
        }
    }, [searchTerm, showPartyDropdown, fetchClients]);

    const getSelectedParty = () => {
        if (formData.party_id && selectedParty) return selectedParty;
        return partyOptions.find(party => party.id === formData.party_id);
    };

    const getPartyDisplayText = (party) => {
        if (!party) return 'Select Client';
        return `${party.name}${party.email ? ` • ${party.email}` : ''}${party.contact ? ` • ${party.contact}` : ''}`;
    };

    const getPartyTypeBadge = (type) => {
        const typeConfig = {
            client: { color: 'bg-blue-100 text-blue-800', label: 'CLIENT' }
        };
        const config = typeConfig[type] || { color: 'bg-gray-100 text-gray-800', label: type?.toUpperCase() || 'CLIENT' };
        return `text-xs font-bold px-2 py-1 rounded ${config.color}`;
    };

    const handlePartySelect = (party) => {
        setSelectedParty(party);
        setFormData(prev => ({ ...prev, party_id: party.id }));
        setShowPartyDropdown(false);
        setSearchTerm('');
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount || 0);
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-IN', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!formData.party_id) {
            alert('Please select a client');
            return;
        }
        if (!formData.amount || formData.amount <= 0) {
            alert('Please enter a valid discount amount');
            return;
        }
        if (!formData.transaction_date) {
            alert('Please select transaction date');
            return;
        }
        
        if (isSubmitting) return;

        setIsSubmitting(true);
        try {
            const headers = getHeaders();
            const payload = {
                amount: parseFloat(formData.amount),
                party_id: formData.party_id,
                party_type: 'client',
                remark: formData.remark || '',
                transaction_date: formData.transaction_date
            };

            const response = await fetch(`${API_BASE_URL}/transaction/payment/discount`, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(payload)
            });

            const result = await response.json();

            if (result.success) {
                const submissionData = {
                    ...formData,
                    selected_party: getSelectedParty(),
                    timestamp: new Date().toISOString(),
                    send_email: sendEmail,
                    send_whatsapp: sendWhatsApp,
                    response: result
                };
                console.log('Discount payment submitted:', submissionData);
                onSuccess(submissionData);
                if (mode === 'modal') onClose();
                alert('Discount payment created successfully!');
            } else {
                alert(result.message || 'Failed to create discount payment');
            }
        } catch (error) {
            console.error('Error submitting discount payment:', error);
            alert('An error occurred while creating discount payment');
        } finally {
            setIsSubmitting(false);
        }
    };

    const formContent = (
        <div className="bg-white rounded-xl shadow-2xl flex flex-col h-full border border-gray-200">
            {/* Compact Header */}
            <div className="flex-shrink-0 flex items-center justify-between p-3 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-t-xl">
                <div className="flex items-center space-x-3">
                    <div className="p-1.5 bg-white/10 rounded-lg">
                        <FiDollarSign className="w-5 h-5" />
                    </div>
                    <div className="flex items-center space-x-4">
                        <h2 className="text-lg font-bold">Discount Payment</h2>
                        <span className="text-blue-200 text-sm hidden sm:inline">|</span>
                        <p className="text-blue-100 text-xs sm:text-sm hidden sm:block">Create discount invoice for clients</p>
                    </div>
                </div>
                {mode === 'modal' && (
                    <button
                        onClick={onClose}
                        className="p-1.5 text-blue-200 hover:text-white hover:bg-blue-500 rounded-lg transition-colors"
                    >
                        <FiX className="w-5 h-5" />
                    </button>
                )}
            </div>

            {/* Scrollable Content Area */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 bg-gray-50">
                <form onSubmit={handleSubmit}>
                    {/* Client Selection and Date Section */}
                    <div className="mb-6">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            {/* Client Selection */}
                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <label className="block text-sm font-semibold text-gray-700">
                                        Select Client <span className="text-red-500">*</span>
                                    </label>
                                    <span className="text-xs text-gray-500 px-1.5 py-0.5 bg-gray-100 rounded">Required</span>
                                </div>
                                <div className="relative">
                                    <div
                                        className="w-full px-3 py-2.5 border-2 border-gray-300 rounded-lg bg-white cursor-pointer hover:border-blue-400 transition-all duration-200 shadow-sm group"
                                        onClick={() => setShowPartyDropdown(!showPartyDropdown)}
                                    >
                                        {formData.party_id && selectedParty ? (
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center space-x-2">
                                                    <div className="p-1 bg-blue-100 text-blue-600 rounded group-hover:bg-blue-200 transition-colors">
                                                        <FiUser className="w-3.5 h-3.5" />
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-medium text-gray-900 truncate max-w-[200px]">
                                                            {selectedParty.name}
                                                        </div>
                                                        <div className="text-xs text-gray-600 truncate max-w-[200px]">
                                                            {selectedParty.email || selectedParty.contact || ''}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    <span className={getPartyTypeBadge('client')}>
                                                        CLIENT
                                                    </span>
                                                    <svg className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                    </svg>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-between text-gray-500 group-hover:text-gray-600 transition-colors">
                                                <div className="flex items-center space-x-2">
                                                    <FiUser className="w-4 h-4 text-gray-400 group-hover:text-gray-500 transition-colors" />
                                                    <span className="text-sm">Select client...</span>
                                                </div>
                                                <svg className="w-4 h-4 text-gray-400 group-hover:text-gray-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                </svg>
                                            </div>
                                        )}
                                    </div>

                                    {showPartyDropdown && (
                                        <div className="absolute z-40 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-xl max-h-60 overflow-y-auto animate-fadeIn">
                                            <div className="p-2 border-b border-gray-200 bg-gray-50 sticky top-0">
                                                <div className="relative">
                                                    <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                                    <input
                                                        type="text"
                                                        placeholder="Search clients by name, email, or contact..."
                                                        className="pl-9 w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                                                        value={searchTerm}
                                                        onChange={(e) => setSearchTerm(e.target.value)}
                                                        autoFocus
                                                    />
                                                </div>
                                            </div>
                                            <div className="py-1">
                                                {loadingParties ? (
                                                    <div className="px-3 py-4 text-center text-gray-500">
                                                        <div className="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                                                        <p className="text-xs mt-2">Loading clients...</p>
                                                    </div>
                                                ) : partyOptions.length === 0 ? (
                                                    <div className="px-3 py-4 text-center text-gray-500">
                                                        <p className="text-sm">No clients found</p>
                                                        <p className="text-xs mt-1">Try searching with different keywords</p>
                                                    </div>
                                                ) : (
                                                    partyOptions.map(party => (
                                                        <div
                                                            key={party.id}
                                                            className={`px-3 py-2 cursor-pointer hover:bg-gray-50 border-l-2 transition-all duration-200 ${formData.party_id === party.id
                                                                ? 'bg-blue-50 border-blue-500 text-blue-700'
                                                                : 'border-transparent hover:border-blue-300'
                                                                }`}
                                                            onClick={() => handlePartySelect(party)}
                                                        >
                                                            <div className="flex items-center justify-between">
                                                                <div className="flex items-center space-x-2 flex-1">
                                                                    <div className="p-1 bg-blue-100 text-blue-600 rounded">
                                                                        <FiUser className="w-3 h-3" />
                                                                    </div>
                                                                    <div className="flex-1">
                                                                        <div className="text-sm font-medium text-gray-900">{party.name}</div>
                                                                        <div className="text-xs text-gray-600">
                                                                            {party.email && <span>{party.email}</span>}
                                                                            {party.email && party.contact && <span className="mx-1">•</span>}
                                                                            {party.contact && <span>{party.contact}</span>}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center space-x-2">
                                                                    {party.outstanding && party.outstanding !== '0' && (
                                                                        <span className="text-xs text-gray-500">₹{party.outstanding}</span>
                                                                    )}
                                                                    <span className={getPartyTypeBadge('client')}>
                                                                        CLIENT
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                {selectedParty && (
                                    <div className="mt-1.5 text-xs text-gray-600 flex items-center space-x-2 animate-fadeIn">
                                        {selectedParty.outstanding && selectedParty.outstanding !== '0' && (
                                            <>
                                                <span className="font-medium">Outstanding: ₹{selectedParty.outstanding}</span>
                                                <span className="text-gray-400">•</span>
                                            </>
                                        )}
                                        {selectedParty.gst_no && (
                                            <>
                                                <span>GST: {selectedParty.gst_no}</span>
                                                <span className="text-gray-400">•</span>
                                            </>
                                        )}
                                        <span className="text-gray-500">{selectedParty.address || ''}</span>
                                    </div>
                                )}
                            </div>

                            {/* Transaction Date */}
                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <label className="block text-sm font-semibold text-gray-700">
                                        Transaction Date <span className="text-red-500">*</span>
                                    </label>
                                    <span className="text-xs text-gray-500 px-1.5 py-0.5 bg-gray-100 rounded">Required</span>
                                </div>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                                        <FiCalendar className="w-4 h-4 text-gray-400" />
                                    </div>
                                    <input
                                        type="date"
                                        className="pl-9 w-full pr-3 py-2.5 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 hover:border-blue-400 transition-all duration-200 shadow-sm bg-white text-sm"
                                        name="transaction_date"
                                        value={formData.transaction_date}
                                        onChange={handleInputChange}
                                        required
                                    />
                                </div>
                                <div className="mt-1.5 text-xs text-gray-500">
                                    Selected: {formatDate(formData.transaction_date)}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Discount Amount Section */}
                    <div className="mb-6">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            {/* Discount Amount */}
                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <label className="block text-sm font-semibold text-gray-700">
                                        Discount Amount <span className="text-red-500">*</span>
                                    </label>
                                    <span className="text-xs text-gray-500 px-1.5 py-0.5 bg-gray-100 rounded">Required</span>
                                </div>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                                        <FiDollarSign className="w-4 h-4 text-gray-400" />
                                    </div>
                                    <input
                                        type="number"
                                        className="pl-9 w-full pr-3 py-2.5 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 hover:border-blue-400 transition-all duration-200 shadow-sm text-sm"
                                        name="amount"
                                        value={formData.amount}
                                        onChange={handleInputChange}
                                        placeholder="Enter discount amount"
                                        min="0"
                                        step="0.01"
                                        required
                                    />
                                </div>
                                {formData.amount && (
                                    <div className="mt-1.5 text-xs text-green-600">
                                        Discount Amount: {formatCurrency(formData.amount)}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Remark Section */}
                    <div className="mb-6">
                        <div className="bg-gradient-to-br from-blue-50 to-white p-4 rounded-lg border border-blue-100 shadow-sm transition-all duration-300 hover:shadow-md">
                            <div className="flex items-center mb-3">
                                <div className="p-1.5 bg-blue-600 text-white rounded-lg mr-2 transition-transform duration-200 hover:rotate-3">
                                    <FiFileText className="w-4 h-4" />
                                </div>
                                <h4 className="text-sm font-bold text-gray-900">Remark / Notes</h4>
                            </div>
                            <div className="relative">
                                <div className="absolute left-3 top-3 pointer-events-none">
                                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                                    </svg>
                                </div>
                                <textarea
                                    className="pl-10 w-full px-3 py-2.5 text-sm border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 hover:border-blue-400 transition-all duration-200"
                                    placeholder="Enter remark or notes for this discount payment..."
                                    name="remark"
                                    rows={3}
                                    value={formData.remark}
                                    onChange={handleInputChange}
                                />
                            </div>
                            <p className="text-xs text-gray-500 mt-2 transition-opacity duration-200 hover:opacity-100">
                                Optional: Add any additional notes or remarks
                            </p>
                        </div>
                    </div>

                    {/* Summary Section */}
                    <div className="bg-gradient-to-br from-blue-50 to-white p-4 rounded-lg border border-blue-100 shadow-sm transition-all duration-300 hover:shadow-md">
                        <div className="flex items-center mb-3">
                            <div className="p-1.5 bg-blue-600 text-white rounded-lg mr-2 transition-transform duration-200 hover:rotate-3">
                                <FiFileText className="w-4 h-4" />
                            </div>
                            <h4 className="text-sm font-bold text-gray-900">Payment Summary</h4>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="text-center p-3 bg-white rounded-lg border border-gray-200 transition-all duration-200 hover:border-blue-300 hover:shadow-sm">
                                <div className="text-xs text-gray-600 mb-1">Selected Client</div>
                                <div className="font-semibold text-gray-900 text-sm">
                                    {selectedParty ? selectedParty.name : 'No client selected'}
                                </div>
                                {selectedParty && (
                                    <div className="text-xs text-gray-500 mt-1">
                                        {selectedParty.email || selectedParty.contact || ''}
                                    </div>
                                )}
                            </div>
                            <div className="text-center p-3 bg-white rounded-lg border border-gray-200 transition-all duration-200 hover:border-green-300 hover:shadow-sm">
                                <div className="text-xs text-gray-600 mb-1">Discount Amount</div>
                                <div className="font-semibold text-green-600 text-lg">
                                    {formatCurrency(formData.amount || 0)}
                                </div>
                            </div>
                        </div>
                    </div>
                </form>
            </div>

            {/* Compact Footer */}
            <div className="flex-shrink-0 border-t border-gray-200 bg-white p-4 rounded-b-xl shadow-lg">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                    {/* Send Options */}
                    <div className="w-full lg:w-auto">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                            <div className="flex items-center space-x-4">
                                <div className="flex items-center">
                                    <label className="flex items-center cursor-pointer group">
                                        <div className="relative">
                                            <input
                                                type="checkbox"
                                                checked={sendEmail}
                                                onChange={() => setSendEmail(!sendEmail)}
                                                className="sr-only"
                                            />
                                            <div className={`w-4 h-4 border rounded transition-all duration-200 flex items-center justify-center ${sendEmail ? 'bg-blue-600 border-blue-600' : 'border-gray-300 bg-white group-hover:border-blue-400'}`}>
                                                {sendEmail && (
                                                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                    </svg>
                                                )}
                                            </div>
                                        </div>
                                        <div className="ml-2 flex items-center space-x-1">
                                            <FiMail className="w-3.5 h-3.5 text-gray-600" />
                                            <span className="text-xs font-medium text-gray-700 whitespace-nowrap">
                                                Email receipt
                                            </span>
                                        </div>
                                    </label>
                                </div>

                                <div className="flex items-center">
                                    <label className="flex items-center cursor-pointer group">
                                        <div className="relative">
                                            <input
                                                type="checkbox"
                                                checked={sendWhatsApp}
                                                onChange={() => setSendWhatsApp(!sendWhatsApp)}
                                                className="sr-only"
                                            />
                                            <div className={`w-4 h-4 border rounded transition-all duration-200 flex items-center justify-center ${sendWhatsApp ? 'bg-green-600 border-green-600' : 'border-gray-300 bg-white group-hover:border-green-400'}`}>
                                                {sendWhatsApp && (
                                                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                    </svg>
                                                )}
                                            </div>
                                        </div>
                                        <div className="ml-2 flex items-center space-x-1">
                                            <FiMessageSquare className="w-3.5 h-3.5 text-gray-600" />
                                            <span className="text-xs font-medium text-gray-700 whitespace-nowrap">
                                                WhatsApp receipt
                                            </span>
                                        </div>
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full lg:w-auto">
                        {/* Amount Display */}
                        <div className="hidden lg:flex items-center space-x-4">
                            <div className="px-3 py-1.5 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg border border-blue-200 transition-all duration-200 hover:border-blue-300 hover:shadow-sm">
                                <div className="text-xs text-blue-700 font-semibold">
                                    Date: <span className="text-sm">{formatDate(formData.transaction_date)}</span>
                                </div>
                            </div>
                            <div className="px-3 py-1.5 bg-gradient-to-r from-green-50 to-green-100 rounded-lg border border-green-200 transition-all duration-200 hover:border-green-300 hover:shadow-sm">
                                <div className="text-xs text-green-700 font-semibold">
                                    Amount: <span className="text-sm">{formatCurrency(formData.amount)}</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            {mode === 'modal' && (
                                <button
                                    type="button"
                                    onClick={onClose}
                                    disabled={isSubmitting}
                                    className="px-4 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-500 focus:border-gray-500 transition-all duration-200 transform hover:-translate-y-0.5 disabled:opacity-50 shadow-sm hover:shadow"
                                >
                                    Cancel
                                </button>
                            )}
                            <button
                                type="submit"
                                onClick={handleSubmit}
                                disabled={isSubmitting || !formData.party_id || !formData.amount || formData.amount <= 0}
                                className="px-5 py-2 text-xs font-medium text-white bg-gradient-to-r from-blue-600 to-blue-700 border border-transparent rounded-lg hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow hover:shadow-md transform hover:-translate-y-0.5 min-w-[140px] flex items-center justify-center"
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
                                        <FiArrowRight className="w-3.5 h-3.5 mr-1.5 transition-transform duration-200 group-hover:translate-x-1" />
                                        Create Discount
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
                        className="fixed inset-0 bg-gray-900 bg-opacity-50 backdrop-blur-sm transition-opacity duration-300"
                        onClick={() => {
                            setShowPartyDropdown(false);
                            onClose();
                        }}
                    />
                    {/* Compact Modal panel */}
                    <div className="relative w-full max-w-3xl bg-white rounded-xl shadow-2xl h-[85vh] flex flex-col transform transition-all duration-300 scale-100 animate-fadeIn">
                        {formContent}
                    </div>
                </div>
            </div>
        ) : null;
    }

    // Render as standalone page component
    return formContent;
};

// Add CSS for animations
const styles = `
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
`;

// Add styles to document head
if (typeof document !== 'undefined') {
    const styleSheet = document.createElement("style");
    styleSheet.innerText = styles;
    document.head.appendChild(styleSheet);
}

export default DiscountForm;