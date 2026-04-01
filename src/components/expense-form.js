import React, { useState, useEffect, useCallback } from 'react';
import { FiX, FiCalendar, FiDollarSign, FiFileText, FiArrowRight, FiCreditCard, FiHash, FiPlus, FiTrash2, FiChevronDown, FiSearch } from 'react-icons/fi';
import API_BASE_URL from '../utils/api-controller';
import getHeaders from '../utils/get-headers';
import { debounce } from 'lodash';
import DatePickerComponent from '../components/DatePickerComponent'; // Adjust path as needed

const CreateExpense = ({
    isOpen = false,
    onClose = () => { },
    onSuccess = () => { },
    mode = 'modal'
}) => {
    const [formData, setFormData] = useState({
        transaction_date: new Date().toISOString().split('T')[0],
        expense_number: `EXP-${Date.now().toString().slice(-6)}`,
        items: [{ item_id: '', amount: '' }],
        bank_id: '',
        total_amount: 0,
        remark: ''
    });

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showBankDropdown, setShowBankDropdown] = useState(false);
    const [bankSearchTerm, setBankSearchTerm] = useState('');
    
    // API States
    const [expenseItems, setExpenseItems] = useState([]);
    const [expenseItemsLoading, setExpenseItemsLoading] = useState(false);
    const [banks, setBanks] = useState([]);
    const [banksLoading, setBanksLoading] = useState(false);

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

    // Fetch banks from API
    const fetchBanks = async (search = '') => {
        setBanksLoading(true);
        try {
            const headers = getHeaders();
            const url = `${API_BASE_URL}/transaction/bank/list?page_no=1&limit=50&search=${search}`;
            const response = await fetch(url, { headers });
            const result = await response.json();
            
            if (result.success && result.data) {
                setBanks(result.data);
            }
        } catch (error) {
            console.error('Error fetching banks:', error);
        } finally {
            setBanksLoading(false);
        }
    };

    // Debounced search for banks
    const debouncedBankSearch = useCallback(
        debounce((searchValue) => {
            fetchBanks(searchValue);
        }, 300),
        []
    );

    // Debounced search for expense items
    const debouncedItemSearch = useCallback(
        debounce((searchValue) => {
            fetchExpenseItems(searchValue);
        }, 300),
        []
    );

    useEffect(() => {
        if (bankSearchTerm !== undefined) {
            debouncedBankSearch(bankSearchTerm);
        }
        return () => {
            debouncedBankSearch.cancel();
        };
    }, [bankSearchTerm]);

    // Fetch initial data when modal opens
    useEffect(() => {
        if (isOpen) {
            fetchExpenseItems();
            fetchBanks();
            setFormData({
                transaction_date: new Date().toISOString().split('T')[0],
                expense_number: `EXP-${Date.now().toString().slice(-6)}`,
                items: [{ item_id: '', amount: '' }],
                bank_id: '',
                total_amount: 0,
                remark: ''
            });
            setBankSearchTerm('');
            setShowBankDropdown(false);
        }
    }, [isOpen]);

    const getSelectedBank = () => {
        return banks.find(bank => bank.bank_id === formData.bank_id);
    };

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

    const handleBankSelect = (bankId) => {
        setFormData(prev => ({ ...prev, bank_id: bankId }));
        setShowBankDropdown(false);
        setBankSearchTerm('');
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
                console.log('All expenses created successfully:', results);
                onSuccess(results);
                if (mode === 'modal') onClose();
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

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
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

    const formContent = (
        <div className="bg-white rounded-xl shadow-2xl flex flex-col h-full border border-gray-200">
            {/* Compact Header */}
            <div className="flex-shrink-0 flex items-center justify-between p-3 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-t-xl">
                <div className="flex items-center space-x-3">
                    <div className="p-1.5 bg-white/10 rounded-lg">
                        <FiDollarSign className="w-5 h-5" />
                    </div>
                    <div className="flex items-center space-x-4">
                        <h2 className="text-lg font-bold">Create Expense</h2>
                        <span className="text-blue-200 text-sm hidden sm:inline">|</span>
                        <p className="text-blue-100 text-xs sm:text-sm hidden sm:block">New Expense Entry</p>
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
                    {/* Bank Account Selection and Date Section */}
                    <div className="mb-6">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            {/* Bank Account Selection */}
                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <label className="block text-sm font-semibold text-gray-700">
                                        Bank Account <span className="text-red-500">*</span>
                                    </label>
                                    <span className="text-xs text-gray-500 px-1.5 py-0.5 bg-gray-100 rounded">Required</span>
                                </div>
                                <div className="relative">
                                    <div
                                        className="w-full px-3 py-2.5 border-2 border-gray-300 rounded-lg bg-white cursor-pointer hover:border-blue-400 transition-all duration-200 shadow-sm group"
                                        onClick={() => setShowBankDropdown(!showBankDropdown)}
                                    >
                                        {formData.bank_id ? (
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center space-x-2">
                                                    <div className="p-1 bg-blue-100 text-blue-600 rounded group-hover:bg-blue-200 transition-colors">
                                                        <FiCreditCard className="w-3.5 h-3.5" />
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-medium text-gray-900 truncate max-w-[200px]">
                                                            {getSelectedBank()?.bank || getSelectedBank()?.name}
                                                        </div>
                                                        <div className="text-xs text-gray-600 truncate max-w-[200px]">
                                                            {getSelectedBank()?.account_no}
                                                        </div>
                                                    </div>
                                                </div>
                                                <svg className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                </svg>
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-between text-gray-500 group-hover:text-gray-600 transition-colors">
                                                <div className="flex items-center space-x-2">
                                                    <FiCreditCard className="w-4 h-4 text-gray-400 group-hover:text-gray-500 transition-colors" />
                                                    <span className="text-sm">Select bank account...</span>
                                                </div>
                                                <svg className="w-4 h-4 text-gray-400 group-hover:text-gray-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                </svg>
                                            </div>
                                        )}
                                    </div>

                                    {showBankDropdown && (
                                        <div className="absolute z-40 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-xl max-h-60 overflow-y-auto animate-fadeIn">
                                            <div className="p-2 border-b border-gray-200 bg-gray-50 sticky top-0">
                                                <div className="relative">
                                                    <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                                    <input
                                                        type="text"
                                                        placeholder="Search banks..."
                                                        className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                                                        value={bankSearchTerm}
                                                        onChange={(e) => setBankSearchTerm(e.target.value)}
                                                        autoFocus
                                                    />
                                                </div>
                                            </div>
                                            <div className="py-1">
                                                {banksLoading ? (
                                                    <div className="px-3 py-2 text-center text-gray-500 text-sm">
                                                        <div className="animate-pulse">Loading banks...</div>
                                                    </div>
                                                ) : banks.length === 0 ? (
                                                    <div className="px-3 py-2 text-center text-gray-500 text-sm">
                                                        No banks found
                                                    </div>
                                                ) : (
                                                    banks.map(bank => (
                                                        <div
                                                            key={bank.bank_id}
                                                            className={`px-3 py-2 cursor-pointer hover:bg-gray-50 border-l-2 transition-all duration-200 ${formData.bank_id === bank.bank_id
                                                                ? 'bg-blue-50 border-blue-500 text-blue-700'
                                                                : 'border-transparent hover:border-blue-300'
                                                                }`}
                                                            onClick={() => handleBankSelect(bank.bank_id)}
                                                        >
                                                            <div className="flex items-center justify-between">
                                                                <div className="flex items-center space-x-2">
                                                                    <div className="p-1 bg-blue-100 text-blue-600 rounded">
                                                                        <FiCreditCard className="w-3 h-3" />
                                                                    </div>
                                                                    <div>
                                                                        <div className="text-sm font-medium text-gray-900">{bank.bank || bank.name}</div>
                                                                        <div className="text-xs text-gray-600">
                                                                            {bank.account_no} • {bank.holder}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <span className="text-xs text-gray-500">
                                                                    {bank.branch}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Date Input using DatePickerComponent */}
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
                                            {/* Expense Item - 8 columns */}
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

                                            {/* Amount and Delete - 4 columns */}
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
                                    {getSelectedBank()?.bank || getSelectedBank()?.name || 'Not selected'}
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

            {/* Compact Footer */}
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
    );

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

    // Add styles to document head if not already added
    if (typeof document !== 'undefined' && !document.getElementById('expense-modal-styles')) {
        const styleSheet = document.createElement("style");
        styleSheet.id = 'expense-modal-styles';
        styleSheet.innerText = styles;
        document.head.appendChild(styleSheet);
    }

    // Render as modal or standalone component
    if (mode === 'modal') {
        return isOpen ? (
            <div className="fixed inset-0 z-50 overflow-y-auto">
                <div className="flex items-center justify-center min-h-screen p-2 sm:p-4">
                    {/* Overlay */}
                    <div
                        className="fixed inset-0 bg-gray-900 bg-opacity-50 backdrop-blur-sm transition-opacity duration-300"
                        onClick={() => {
                            setShowBankDropdown(false);
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

export default CreateExpense;