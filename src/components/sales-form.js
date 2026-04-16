import React, { useState, useEffect, useMemo } from 'react';
import { IoTrash } from "react-icons/io5";
import API_BASE_URL from '../utils/api-controller';
import getHeaders from '../utils/get-headers';
import DatePickerComponent from './DatePickerComponent';

const appSettings = {
    company_name: 'Professional Accounting Services',
    gst_applicable: true,
    default_gst_rate: 18,
    currency: 'INR',
};

const SaleForm = ({
    isOpen = false,
    onClose = () => { },
    onSuccess = () => { },
    initialPartyId = '',
    mode = 'modal',
    defaultSaleType = 'user' // 'user' or 'bank'
}) => {
    const [saleType, setSaleType] = useState(defaultSaleType);
    const [formData, setFormData] = useState({
        party_id: initialPartyId || '',
        party_type: defaultSaleType,
        payment_date: new Date().toISOString().split('T')[0],
        invoice_number: `INV-${Date.now().toString().slice(-6)}`,
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
        remark: '',
        tax_rate: appSettings.default_gst_rate,
        additional_charge: 0,
        apply_round_off: false
    });

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showPartyDropdown, setShowPartyDropdown] = useState(false);
    const [sendEmail, setSendEmail] = useState(true);
    const [sendWhatsApp, setSendWhatsApp] = useState(true);
    const [serviceOptions, setServiceOptions] = useState([]);
    const [userOptions, setUserOptions] = useState([]);
    const [bankOptions, setBankOptions] = useState([]);
    const [isLoadingServices, setIsLoadingServices] = useState(false);
    const [isLoadingParties, setIsLoadingParties] = useState(false);
    const [isLoadingBanks, setIsLoadingBanks] = useState(false);
    const [userSearchTerm, setUserSearchTerm] = useState('');

    // Fetch services from API — only when modal opens
    useEffect(() => {
        if (isOpen) {
            fetchServices();
        }
    }, [isOpen]);

    // Fetch banks when component mounts (for bank flow)
    useEffect(() => {
        if (saleType === 'bank') {
            fetchAllBanks();
        }
    }, [saleType]);

    // Fetch users based on search term (with debounce) - only for user flow
    useEffect(() => {
        if (saleType === 'user' && userSearchTerm) {
            const delayDebounce = setTimeout(() => {
                fetchUsers();
            }, 500);
            return () => clearTimeout(delayDebounce);
        }
    }, [saleType, userSearchTerm]);

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
                    duration: service.is_recurring ? 'Recurring' : 'One-time',
                    gst_rate: parseFloat(service.gst_rate),
                    sac_code: service.sac_code,
                    remark: service.remark
                })));
            }
        } catch (error) {
            console.error('Error fetching services:', error);
        } finally {
            setIsLoadingServices(false);
        }
    };

    const fetchAllBanks = async () => {
        setIsLoadingBanks(true);
        try {
            const response = await fetch(`${API_BASE_URL}/transaction/bank/list`, {
                method: 'GET',
                headers: getHeaders()
            });
            const data = await response.json();
            console.log('Bank API Response:', data);
            
            if (data.success && data.data) {
                const formattedBanks = data.data.map(bank => ({
                    id: bank.bank_id || bank.id,
                    type: 'bank',
                    name: bank.bank || bank.name || 'Unnamed Bank',
                    account: bank.account_number || bank.account_no || bank.account || 'N/A',
                    holder: bank.account_holder || bank.holder_name || bank.holder || 'N/A',
                    ifsc: bank.ifsc_code || bank.ifsc || 'N/A',
                    branch: bank.branch_name || bank.branch || 'N/A',
                    balance: bank.balance || bank.current_balance || 0
                }));
                setBankOptions(formattedBanks);
                console.log('Formatted Banks:', formattedBanks);
            } else {
                console.error('Invalid bank data structure:', data);
                setBankOptions([]);
            }
        } catch (error) {
            console.error('Error fetching banks:', error);
            setBankOptions([]);
        } finally {
            setIsLoadingBanks(false);
        }
    };

    const fetchUsers = async () => {
        if (!userSearchTerm) return;
        
        setIsLoadingParties(true);
        try {
            const response = await fetch(`${API_BASE_URL}/client/search?search=${encodeURIComponent(userSearchTerm)}`, {
                method: 'GET',
                headers: getHeaders()
            });
            const data = await response.json();
            if (data.success) {
                setUserOptions(data.data.map(client => ({
                    id: client.client_id || client.username,
                    type: 'user',
                    name: client.name || client.firm_name,
                    email: client.email,
                    contact: client.mobile,
                    gst_no: client.gst_no,
                    pan_no: client.pan_number,
                    username: client.username,
                    address: client.address,
                    city: client.city,
                    state: client.state,
                    pincode: client.pincode
                })));
            }
        } catch (error) {
            console.error('Error fetching users:', error);
        } finally {
            setIsLoadingParties(false);
        }
    };

    // Combined party options based on sale type
    const partyOptions = useMemo(() => {
        if (saleType === 'user') {
            return userOptions;
        } else if (saleType === 'bank') {
            return bankOptions;
        }
        return [];
    }, [saleType, userOptions, bankOptions]);

    // Reset form when modal opens or sale type changes
    useEffect(() => {
        if (isOpen) {
            setFormData({
                party_id: initialPartyId || '',
                party_type: saleType,
                payment_date: new Date().toISOString().split('T')[0],
                invoice_number: `INV-${Date.now().toString().slice(-6)}`,
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
                remark: '',
                tax_rate: appSettings.default_gst_rate,
                additional_charge: 0,
                apply_round_off: false
            });
            setUserSearchTerm('');
            setShowPartyDropdown(false);
            setUserOptions([]);
        }
    }, [isOpen, initialPartyId, saleType]);

    const handleSaleTypeChange = (type) => {
        setSaleType(type);
        setFormData(prev => ({ ...prev, party_id: '', party_type: type }));
        setUserSearchTerm('');
        setShowPartyDropdown(false);
        setUserOptions([]);
        // If switching to bank, ensure banks are loaded
        if (type === 'bank' && bankOptions.length === 0) {
            fetchAllBanks();
        }
    };

    const getSelectedParty = () => {
        return partyOptions.find(party => party.id === formData.party_id);
    };

    const getPartyDisplayText = (party) => {
        if (!party) return `Select ${saleType === 'user' ? 'User/Client' : 'Bank'}`;

        switch (party.type) {
            case 'bank':
                return `${party.name}${party.account !== 'N/A' ? ` • ${party.account}` : ''}${party.holder !== 'N/A' ? ` • ${party.holder}` : ''}`;
            case 'user':
                return `${party.name} • ${party.email || party.contact}`;
            default:
                return party.name;
        }
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
        let parsedValue = value;
        if (name === 'additional_charge' || name === 'discount') {
            parsedValue = value === '' ? 0 : parseFloat(value) || 0;
        }
        setFormData(prev => ({
            ...prev,
            [name]: parsedValue
        }));
    };

    const handleItemChange = (index, field, value) => {
        const updatedItems = formData.items.map((item, i) => {
            if (i === index) {
                let parsedValue = value;
                if (field === 'price') {
                    // Allow only up to 2 decimal places
                    if (value === '') {
                        parsedValue = 0;
                    } else {
                        let numValue = parseFloat(value);
                        if (!isNaN(numValue)) {
                            // Round to 2 decimal places
                            parsedValue = Math.round(numValue * 100) / 100;
                        } else {
                            parsedValue = 0;
                        }
                    }
                }
                const updatedItem = {
                    ...item,
                    [field]: parsedValue
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

    const handlePartySelect = (partyId) => {
        setFormData(prev => ({ ...prev, party_id: partyId }));
        setShowPartyDropdown(false);
        setUserSearchTerm('');
    };

    // Calculate totals with proper decimal handling
    useEffect(() => {
        let subtotal = 0;
        formData.items.forEach(item => {
            subtotal += Number(item.amount) || 0;
        });
        // Keep subtotal with 2 decimal places
        subtotal = Math.round(subtotal * 100) / 100;

        let discountAmount = 0;
        if (formData.discount > 0) {
            if (formData.discount_type === 'percentage') {
                discountAmount = subtotal * (Number(formData.discount) / 100);
            } else {
                discountAmount = Number(formData.discount) || 0;
            }
            // Round discount to 2 decimal places
            discountAmount = Math.round(discountAmount * 100) / 100;
        }

        const amountAfterDiscount = Math.max(0, subtotal - discountAmount);
        
        const sgst_amount = Math.round((amountAfterDiscount * (Number(formData.sgst_rate) / 100)) * 100) / 100;
        const cgst_amount = Math.round((amountAfterDiscount * (Number(formData.cgst_rate) / 100)) * 100) / 100;
        
        let grand_total = amountAfterDiscount + sgst_amount + cgst_amount + (Number(formData.additional_charge) || 0);
        // Keep grand total with 2 decimal places before round off
        grand_total = Math.round(grand_total * 100) / 100;
        
        let round_off = 0;
        // Only apply round off if the toggle is checked
        if (formData.apply_round_off) {
            round_off = Math.round(grand_total) - grand_total;
            round_off = Math.round(round_off * 100) / 100;
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
        if (!formData.party_id || isSubmitting) return;

        const hasValidItems = formData.items.some(item => item.service_id && item.price > 0);
        if (!hasValidItems) {
            alert('Please add at least one valid service item');
            return;
        }

        setIsSubmitting(true);
        try {
            const selectedParty = getSelectedParty();
            
            const basePayload = {
                transaction_date: formData.payment_date,
                remark: formData.notes || formData.remark,
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
                basePayload.discount_type = formData.discount_type;
                if (formData.discount_type === 'percentage') {
                    basePayload.discount_perc_rate = Number(formData.discount);
                } else {
                    basePayload.discount_value = Number(formData.discount);
                }
            } else {
                basePayload.discount_type = 'not applicable';
            }

            let endpoint = '';
            let finalPayload = {};

            if (saleType === 'user') {
                endpoint = `${API_BASE_URL}/sale/create/user`;
                finalPayload = {
                    ...basePayload,
                    username: selectedParty?.username || selectedParty?.id,
                    user_type: 'client',
                    firm_id: selectedParty?.id
                };
            } else if (saleType === 'bank') {
                endpoint = `${API_BASE_URL}/sale/create/bank`;
                finalPayload = {
                    ...basePayload,
                    bank_id: selectedParty?.id
                };
            }

            console.log('Submitting to:', endpoint);
            console.log('Payload:', finalPayload);

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify(finalPayload)
            });

            const data = await response.json();

            if (data.success) {
                const submissionData = {
                    ...formData,
                    sale_type: saleType,
                    selected_party: selectedParty,
                    timestamp: new Date().toISOString(),
                    company: appSettings.company_name,
                    api_response: data,
                    notifications: {
                        email: sendEmail,
                        whatsapp: sendWhatsApp
                    }
                };
                console.log('Form submitted successfully:', submissionData);
                onSuccess(submissionData);
                if (mode === 'modal') onClose();
            } else {
                throw new Error(data.message || `Failed to create ${saleType} sale`);
            }
        } catch (error) {
            console.error('Error submitting form:', error);
            alert(error.message || `Error creating ${saleType} sale. Please try again.`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount);
    };

    const getServiceDetails = (serviceId) => {
        return serviceOptions.find(s => s.service_id === serviceId);
    };

    const formContent = (
        <div className="bg-white rounded-xl shadow-2xl flex flex-col h-full border border-gray-200">
            {/* Header with Toggle Buttons */}
            <div className="flex-shrink-0 flex items-center justify-between p-3 border-b border-gray-200 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-t-xl">
                <div className="flex items-center space-x-3">
                    <div className="p-1.5 bg-white/10 rounded-lg">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                    </div>
                    <div>
                        <h2 className="text-lg font-bold">Create Sale Invoice</h2>
                        <p className="text-indigo-100 text-xs hidden sm:block">{appSettings.company_name}</p>
                    </div>
                </div>
                
                {/* Sale Type Toggle Buttons */}
                <div className="flex items-center gap-2 bg-indigo-500/30 rounded-lg p-1">
                    <button
                        type="button"
                        onClick={() => handleSaleTypeChange('user')}
                        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200 ${
                            saleType === 'user'
                                ? 'bg-white text-indigo-700 shadow-md'
                                : 'text-indigo-100 hover:bg-indigo-500/50'
                        }`}
                    >
                        <div className="flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            <span>User/Client</span>
                        </div>
                    </button>
                    <button
                        type="button"
                        onClick={() => handleSaleTypeChange('bank')}
                        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200 ${
                            saleType === 'bank'
                                ? 'bg-white text-indigo-700 shadow-md'
                                : 'text-indigo-100 hover:bg-indigo-500/50'
                        }`}
                    >
                        <div className="flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                            </svg>
                            <span>Bank</span>
                        </div>
                    </button>
                </div>

                {mode === 'modal' && (
                    <button
                        onClick={onClose}
                        className="p-1.5 text-indigo-200 hover:text-white hover:bg-indigo-500 rounded-lg transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                )}
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 bg-gray-50">
                <form onSubmit={handleSubmit}>
                    {/* Party Selection and Date Section */}
                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-6">
                        {/* Party Selection */}
                        <div className="lg:col-span-4">
                            <div className="flex items-center justify-between mb-1.5">
                                <label className="block text-sm font-semibold text-gray-700">
                                    Select {saleType === 'user' ? 'User/Client' : 'Bank'} <span className="text-red-500">*</span>
                                </label>
                                <span className="text-xs text-gray-500 px-1.5 py-0.5 bg-gray-100 rounded">Required</span>
                            </div>
                            <div className="relative">
                                <div
                                    className="w-full px-3 py-2.5 border-2 border-gray-300 rounded-lg bg-white cursor-pointer hover:border-indigo-400 transition-all duration-200 shadow-sm text-sm"
                                    onClick={() => setShowPartyDropdown(!showPartyDropdown)}
                                >
                                    {formData.party_id ? (
                                        <div className="flex justify-between items-center">
                                            <div className="flex items-center space-x-2">
                                                <div className={`p-1.5 rounded ${saleType === 'bank' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
                                                    <span className="text-xs">
                                                        {saleType === 'bank' ? '🏦' : '👥'}
                                                    </span>
                                                </div>
                                                <div className="truncate">
                                                    <span className="text-gray-800 font-medium block truncate">
                                                        {getPartyDisplayText(getSelectedParty())}
                                                    </span>
                                                </div>
                                            </div>
                                            <svg className="w-4 h-4 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </div>
                                    ) : (
                                        <div className="flex justify-between items-center text-gray-500">
                                            <div className="flex items-center space-x-2">
                                                <div className="p-1.5 rounded bg-gray-100">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                    </svg>
                                                </div>
                                                <span className="font-medium truncate">
                                                    {saleType === 'bank' && isLoadingBanks ? 'Loading banks...' : 
                                                     saleType === 'user' && isLoadingParties ? 'Loading users...' : 
                                                     `Click to select a ${saleType === 'user' ? 'user/client' : 'bank'}...`}
                                                </span>
                                            </div>
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </div>
                                    )}
                                </div>

                                {showPartyDropdown && (
                                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-xl max-h-80 overflow-y-auto text-sm">
                                        {/* Search input - Only show for user flow */}
                                        {saleType === 'user' && (
                                            <div className="p-2 border-b border-gray-200 bg-gray-50 sticky top-0">
                                                <div className="relative">
                                                    <svg className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                                    </svg>
                                                    <input
                                                        type="text"
                                                        placeholder="Search by name, email, or mobile..."
                                                        className="w-full pl-8 pr-3 py-2 border-2 border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                                                        value={userSearchTerm}
                                                        onChange={(e) => setUserSearchTerm(e.target.value)}
                                                        autoFocus
                                                    />
                                                </div>
                                            </div>
                                        )}
                                        
                                        <div className="py-1">
                                            {partyOptions.length === 0 && !isLoadingParties && !isLoadingBanks && saleType === 'user' && (
                                                <div className="px-3 py-4 text-center text-gray-500 text-sm">
                                                    No users/clients found
                                                </div>
                                            )}
                                            {partyOptions.length === 0 && saleType === 'bank' && !isLoadingBanks && (
                                                <div className="px-3 py-4 text-center text-gray-500 text-sm">
                                                    No banks available
                                                </div>
                                            )}
                                            {isLoadingParties && saleType === 'user' && (
                                                <div className="px-3 py-4 text-center text-gray-500 text-sm">
                                                    Searching users...
                                                </div>
                                            )}
                                            {isLoadingBanks && saleType === 'bank' && (
                                                <div className="px-3 py-4 text-center text-gray-500 text-sm">
                                                    Loading banks...
                                                </div>
                                            )}
                                            {partyOptions.map(party => (
                                                <div
                                                    key={party.id}
                                                    className={`px-3 py-2 cursor-pointer border-l-2 transition-all duration-150 ${
                                                        formData.party_id === party.id
                                                            ? 'bg-indigo-50 border-indigo-500 text-indigo-700'
                                                            : 'border-transparent hover:bg-gray-50'
                                                    }`}
                                                    onClick={() => handlePartySelect(party.id)}
                                                >
                                                    <div className="flex justify-between items-center">
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center space-x-2 mb-1">
                                                                <span className={`p-1 rounded ${saleType === 'bank' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
                                                                    <span className="text-xs">
                                                                        {saleType === 'bank' ? '🏦' : '👥'}
                                                                    </span>
                                                                </span>
                                                                <div className="flex items-center min-w-0">
                                                                    <span className="font-medium text-gray-900 truncate">{party.name}</span>
                                                                    <span className={`ml-2 px-1.5 py-0.5 text-xs rounded-full font-medium ${
                                                                        saleType === 'bank' 
                                                                            ? 'bg-green-100 text-green-800 border border-green-200' 
                                                                            : 'bg-blue-100 text-blue-800 border border-blue-200'
                                                                    }`}>
                                                                        {saleType === 'bank' ? 'Bank' : 'User'}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            <div className="text-xs text-gray-600 ml-7 truncate">
                                                                {saleType === 'bank' && (
                                                                    <>
                                                                        {party.account && party.account !== 'N/A' && `Acc: ${party.account} • `}
                                                                        {party.holder && party.holder !== 'N/A' && `${party.holder}`}
                                                                        {party.ifsc && party.ifsc !== 'N/A' && ` • IFSC: ${party.ifsc}`}
                                                                        {party.branch && party.branch !== 'N/A' && ` • ${party.branch}`}
                                                                    </>
                                                                )}
                                                                {saleType === 'user' && (
                                                                    <>
                                                                        {party.email && `${party.email} • `}
                                                                        {party.contact && `Mob: ${party.contact}`}
                                                                        {party.gst_no && ` • GST: ${party.gst_no}`}
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                        {formData.party_id === party.id && (
                                                            <svg className="w-4 h-4 text-indigo-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                            </svg>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Date */}
                        <div className="lg:col-span-1">
                            <div className="flex items-center justify-between mb-1.5">
                                <label className="block text-sm font-semibold text-gray-700">
                                    Date <span className="text-red-500">*</span>
                                </label>
                                <span className="text-xs text-gray-500 px-1.5 py-0.5 bg-gray-100 rounded">Required</span>
                            </div>
                            <div className="relative">
                                <DatePickerComponent
                                    selectedDate={formData.payment_date}
                                    onDateChange={(date) => setFormData(prev => ({ ...prev, payment_date: date }))}
                                    placeholder="Select date"
                                    className="w-full"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Services Section */}
                    <div className="mb-6">
                        <div className="flex justify-between items-center mb-4">
                            <div>
                                <h3 className="text-base font-bold text-gray-900">Services & Items</h3>
                                <p className="text-xs text-gray-600 mt-0.5">Add services and items for this invoice</p>
                            </div>
                            <button
                                type="button"
                                onClick={addItem}
                                disabled={isLoadingServices}
                                className="inline-flex items-center px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:ring-offset-1 transition-all duration-200 shadow-sm text-sm disabled:opacity-50"
                            >
                                <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                Add Service
                            </button>
                        </div>

                        <div className="overflow-hidden border border-gray-300 rounded-lg shadow-sm text-sm">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                                    <tr>
                                        <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Service</th>
                                        <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Description</th>
                                        <th className="px-3 py-2.5 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Price</th>
                                        <th className="px-3 py-2.5 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {formData.items.map((item, index) => (
                                        <tr key={index} className="hover:bg-gray-50 transition-colors duration-150">
                                            <td className="px-3 py-2.5">
                                                <select
                                                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-150"
                                                    value={item.service_id}
                                                    onChange={(e) => handleServiceChange(index, e.target.value)}
                                                    required
                                                    disabled={isLoadingServices}
                                                >
                                                    <option value="" className="text-gray-500 text-sm">
                                                        {isLoadingServices ? 'Loading services...' : 'Select Service'}
                                                    </option>
                                                    {serviceOptions.map(service => (
                                                        <option key={service.service_id} value={service.service_id} className="py-1 text-sm">
                                                            {service.name} - ₹{service.fees.toFixed(2)}
                                                        </option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td className="px-3 py-2.5">
                                                <input
                                                    type="text"
                                                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-150"
                                                    placeholder="Description..."
                                                    value={item.description}
                                                    onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                                                />
                                            </td>
                                            <td className="px-3 py-2.5">
                                                <div className="relative">
                                                    <span className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">₹</span>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        className="w-full pl-7 pr-2.5 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-150 text-right"
                                                        placeholder="0.00"
                                                        value={item.price === 0 ? '' : item.price}
                                                        onChange={(e) => handleItemChange(index, 'price', e.target.value)}
                                                        required
                                                    />
                                                </div>
                                            </td>
                                            <td className="px-3 py-2.5 text-center">
                                                <button
                                                    type="button"
                                                    onClick={() => removeItem(index)}
                                                    disabled={formData.items.length <= 1}
                                                    className="inline-flex items-center px-2 py-1 bg-red-50 text-red-600 rounded border border-red-200 text-xs font-medium hover:bg-red-100 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    <IoTrash className="w-3 h-3" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Additional Fields Section */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
                        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                            <div className="flex items-center mb-3">
                                <div className="p-1.5 bg-indigo-100 text-indigo-600 rounded mr-2">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <h4 className="text-sm font-bold text-gray-900">Additional Settings</h4>
                            </div>
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1.5">Additional Charge (₹)</label>
                                    <div className="relative">
                                        <span className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">₹</span>
                                        <input
                                            type="number"
                                            step="0.01"
                                            className="w-full pl-8 pr-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                                            name="additional_charge"
                                            value={formData.additional_charge === 0 ? '' : formData.additional_charge}
                                            onChange={handleInputChange}
                                            min="0"
                                            placeholder="0.00"
                                        />
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">Additional charge will be added after GST calculation</p>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center">
                                        <svg className="w-4 h-4 text-gray-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                        </svg>
                                        <span className="text-xs font-medium text-gray-700">Apply Round Off</span>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            checked={formData.apply_round_off}
                                            onChange={(e) => setFormData(prev => ({ ...prev, apply_round_off: e.target.checked }))}
                                        />
                                        <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                                    </label>
                                </div>
                            </div>
                        </div>

                        {/* Notes Section */}
                        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                            <div className="flex items-center mb-3">
                                <div className="p-1.5 bg-indigo-100 text-indigo-600 rounded mr-2">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                </div>
                                <h4 className="text-sm font-bold text-gray-900">Notes</h4>
                            </div>
                            <textarea
                                className="w-full h-28 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-150 resize-none bg-gray-50 text-sm"
                                placeholder="Additional notes or instructions..."
                                name="notes"
                                value={formData.notes}
                                onChange={handleInputChange}
                            />
                        </div>
                    </div>

                    {/* Discount and Totals Section */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        {/* Discount Section */}
                        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                            <div className="flex items-center mb-3">
                                <div className="p-1.5 bg-indigo-100 text-indigo-600 rounded mr-2">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <h4 className="text-sm font-bold text-gray-900">Discount</h4>
                            </div>
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1.5">Discount Type</label>
                                    <select
                                        className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-150"
                                        name="discount_type"
                                        value={formData.discount_type}
                                        onChange={handleInputChange}
                                    >
                                        <option value="percentage">Percentage (%)</option>
                                        <option value="flat">Flat Amount (₹)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1.5">
                                        {formData.discount_type === 'percentage' ? 'Percentage (%)' : 'Amount (₹)'}
                                    </label>
                                    <div className="relative">
                                        {formData.discount_type === 'percentage' ? (
                                            <span className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">%</span>
                                        ) : (
                                            <span className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">₹</span>
                                        )}
                                        <input
                                            type="number"
                                            step={formData.discount_type === 'percentage' ? '0.1' : '0.01'}
                                            className="w-full pl-8 pr-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-150"
                                            name="discount"
                                            value={formData.discount === 0 ? '' : formData.discount}
                                            onChange={handleInputChange}
                                            min="0"
                                            placeholder="0"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Totals Section */}
                        <div className="lg:col-span-2 bg-gradient-to-br from-indigo-50 to-white p-4 rounded-lg border border-indigo-100 shadow-sm">
                            <div className="flex items-center mb-4">
                                <div className="p-1.5 bg-indigo-600 text-white rounded mr-2">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                    </svg>
                                </div>
                                <h4 className="text-sm font-bold text-gray-900">Summary</h4>
                            </div>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between items-center py-1">
                                    <span className="text-gray-600">Subtotal:</span>
                                    <span className="font-semibold text-gray-900">{formatCurrency(formData.subtotal)}</span>
                                </div>

                                {formData.discount > 0 && (
                                    <div className="flex justify-between items-center py-1 text-red-600">
                                        <span>Discount:</span>
                                        <span className="font-semibold">-{formatCurrency(
                                            formData.discount_type === 'percentage'
                                                ? formData.subtotal * (formData.discount / 100)
                                                : Number(formData.discount)
                                        )}</span>
                                    </div>
                                )}

                                {appSettings.gst_applicable && (
                                    <>
                                        <div className="flex justify-between items-center py-1">
                                            <span className="text-gray-600">SGST ({formData.sgst_rate}%):</span>
                                            <span className="font-semibold text-gray-900">{formatCurrency(formData.sgst_amount)}</span>
                                        </div>
                                        <div className="flex justify-between items-center py-1">
                                            <span className="text-gray-600">CGST ({formData.cgst_rate}%):</span>
                                            <span className="font-semibold text-gray-900">{formatCurrency(formData.cgst_amount)}</span>
                                        </div>
                                    </>
                                )}

                                {formData.additional_charge > 0 && (
                                    <div className="flex justify-between items-center py-1">
                                        <span className="text-gray-600">Additional Charge:</span>
                                        <span className="font-semibold text-gray-900">{formatCurrency(formData.additional_charge)}</span>
                                    </div>
                                )}

                                {Math.abs(formData.round_off) > 0.01 && (
                                    <div className="flex justify-between items-center py-1">
                                        <span className="text-gray-600">Round Off:</span>
                                        <span className={`font-semibold ${formData.round_off > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            {formatCurrency(formData.round_off)}
                                        </span>
                                    </div>
                                )}

                                <div className="pt-2 mt-1 border-t border-gray-200">
                                    <div className="flex justify-between items-center font-bold text-gray-900 bg-indigo-50 px-3 py-2 rounded">
                                        <span>Grand Total:</span>
                                        <span className="text-indigo-700 text-base">{formatCurrency(formData.grand_total)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </form>
            </div>

            {/* Footer with Actions */}
            <div className="flex-shrink-0 border-t border-gray-200 bg-white p-4 rounded-b-xl shadow-lg">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                    <div className="w-full lg:w-auto">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                            <span className="text-xs font-semibold text-gray-700 whitespace-nowrap">Send Invoice:</span>
                            <div className="flex items-center gap-4">
                                <label className="flex items-center cursor-pointer">
                                    <div className="relative">
                                        <input
                                            type="checkbox"
                                            checked={sendEmail}
                                            onChange={(e) => setSendEmail(e.target.checked)}
                                            className="sr-only"
                                        />
                                        <div className={`w-9 h-5 rounded-full transition-colors duration-200 ${sendEmail ? 'bg-indigo-600' : 'bg-gray-300'}`}></div>
                                        <div className={`absolute left-0.5 top-0.5 w-4 h-4 rounded-full bg-white transition-transform duration-200 transform ${sendEmail ? 'translate-x-4' : ''}`}></div>
                                    </div>
                                    <div className="ml-2 flex items-center">
                                        <svg className="w-4 h-4 text-gray-600 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                        </svg>
                                        <span className="text-xs text-gray-700 font-medium">Email</span>
                                    </div>
                                </label>

                                <label className="flex items-center cursor-pointer">
                                    <div className="relative">
                                        <input
                                            type="checkbox"
                                            checked={sendWhatsApp}
                                            onChange={(e) => setSendWhatsApp(e.target.checked)}
                                            className="sr-only"
                                        />
                                        <div className={`w-9 h-5 rounded-full transition-colors duration-200 ${sendWhatsApp ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                                        <div className={`absolute left-0.5 top-0.5 w-4 h-4 rounded-full bg-white transition-transform duration-200 transform ${sendWhatsApp ? 'translate-x-4' : ''}`}></div>
                                    </div>
                                    <div className="ml-2 flex items-center">
                                        <svg className="w-4 h-4 text-green-600 mr-1.5" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.76.982.998-3.675-.236-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.9 6.994c-.004 5.45-4.438 9.88-9.888 9.88m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.333.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.333 11.893-11.892 0-3.18-1.24-6.162-3.495-8.411" />
                                        </svg>
                                        <span className="text-xs text-gray-700 font-medium">WhatsApp</span>
                                    </div>
                                </label>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full lg:w-auto">
                        <div className="hidden lg:block px-3 py-1.5 bg-gradient-to-r from-indigo-50 to-indigo-100 rounded border border-indigo-200">
                            <div className="text-xs text-indigo-700 font-semibold">
                                Total: <span className="text-sm">{formatCurrency(formData.grand_total)}</span>
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
                                disabled={isSubmitting || !formData.party_id || formData.items.every(item => !item.service_id)}
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
                                        <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        Create {saleType === 'user' ? 'User' : 'Bank'} Invoice
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    if (mode === 'modal') {
        return isOpen ? (
            <div className="fixed inset-0 z-50 overflow-y-auto">
                <div className="flex items-center justify-center min-h-screen p-2 sm:p-4">
                    <div
                        className="fixed inset-0 bg-gray-900 bg-opacity-50 backdrop-blur-sm transition-opacity"
                        onClick={onClose}
                    />
                    <div className="relative w-full max-w-4xl bg-white rounded-xl shadow-2xl h-[85vh] flex flex-col transform transition-all duration-300 scale-100">
                        {formContent}
                    </div>
                </div>
            </div>
        ) : null;
    }

    return formContent;
};

export default SaleForm;