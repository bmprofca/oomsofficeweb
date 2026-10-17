import React, { useState } from 'react';
import { FiPlus, FiX } from 'react-icons/fi';

const CreateLedgerModal = ({ isOpen, onClose, onSave }) => {
    const [formData, setFormData] = useState({
        name: '',
        pan: '',
        gst: '',
        address: '',
        mobile: '',
        group: '',
        opening_balance: '',
        date: '',
        balance_type: 'credit'
    });
    const [loading, setLoading] = useState(false);

    // Mock ledger groups for dropdown
    const ledgerGroups = [
        { value: 'sundry_debtors', name: 'Sundry Debtors' },
        { value: 'sundry_creditors', name: 'Sundry Creditors' },
        { value: 'cash_in_hand', name: 'Cash in Hand' },
        { value: 'bank_accounts', name: 'Bank Accounts' },
        { value: 'fixed_assets', name: 'Fixed Assets' },
        { value: 'capital_account', name: 'Capital Account' },
        { value: 'loan_account', name: 'Loan Account' },
        { value: 'sales_account', name: 'Sales Account' },
        { value: 'purchase_account', name: 'Purchase Account' },
        { value: 'expense_account', name: 'Expense Account' }
    ];

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        // Simulate API call
        setTimeout(() => {
            onSave(formData);
            setFormData({
                name: '',
                pan: '',
                gst: '',
                address: '',
                mobile: '',
                group: '',
                opening_balance: '',
                date: '',
                balance_type: 'credit'
            });
            setLoading(false);
            onClose();
        }, 1000);
    };

    const handleClose = () => {
        setFormData({
            name: '',
            pan: '',
            gst: '',
            address: '',
            mobile: '',
            group: '',
            opening_balance: '',
            date: '',
            balance_type: 'credit'
        });
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl flex flex-col" style={{ height: '90vh' }}>
                {/* Header - Fixed */}
                <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-white flex-shrink-0 rounded-t-xl">
                    <div>
                        <h2 className="text-xl font-semibold text-slate-800">Create New Ledger</h2>
                        <p className="text-sm text-slate-600 mt-1">Add a new ledger account to your chart of accounts</p>
                    </div>
                    <button
                        onClick={handleClose}
                        className="text-slate-400 hover:text-slate-600 transition-colors p-1 hover:bg-slate-100 rounded"
                    >
                        <FiX className="w-5 h-5" />
                    </button>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto">
                    <form onSubmit={handleSubmit} className="p-6 space-y-6">
                        {/* Basic Information Section */}
                        <div>
                            <h3 className="text-lg font-medium text-slate-800 mb-4">Basic Information</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Name - Required */}
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        Ledger Name <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleInputChange}
                                        placeholder="Enter ledger name"
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-500 transition-colors"
                                        required
                                    />
                                </div>

                                {/* PAN Number */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        PAN Number
                                    </label>
                                    <input
                                        type="text"
                                        name="pan"
                                        value={formData.pan}
                                        onChange={handleInputChange}
                                        placeholder="Enter PAN number"
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-500 transition-colors"
                                        maxLength="10"
                                    />
                                </div>

                                {/* GST Number */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        GST Number
                                    </label>
                                    <input
                                        type="text"
                                        name="gst"
                                        value={formData.gst}
                                        onChange={handleInputChange}
                                        placeholder="Enter GST number"
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-500 transition-colors"
                                    />
                                </div>

                                {/* Mobile Number */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        Mobile Number
                                    </label>
                                    <input
                                        type="tel"
                                        name="mobile"
                                        value={formData.mobile}
                                        onChange={handleInputChange}
                                        placeholder="Enter mobile number"
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-500 transition-colors"
                                    />
                                </div>

                                {/* Ledger Group - Required */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        Choose Group <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        name="group"
                                        value={formData.group}
                                        onChange={handleInputChange}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-500 transition-colors bg-white"
                                        required
                                    >
                                        <option value="" disabled>Select a group</option>
                                        {ledgerGroups.map(group => (
                                            <option key={group.value} value={group.value}>
                                                {group.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Address Section */}
                        <div>
                            <h3 className="text-lg font-medium text-slate-800 mb-4">Address Information</h3>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Address
                                </label>
                                <textarea
                                    name="address"
                                    value={formData.address}
                                    onChange={handleInputChange}
                                    placeholder="Enter complete address"
                                    rows="3"
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-500 transition-colors resize-none"
                                />
                            </div>
                        </div>

                        {/* Opening Balance Section */}
                        <div>
                            <h3 className="text-lg font-medium text-slate-800 mb-4">Opening Balance</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {/* Date */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        Date <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="date"
                                        name="date"
                                        value={formData.date}
                                        onChange={handleInputChange}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-500 transition-colors"
                                        required
                                    />
                                </div>
                                {/* Opening Balance Amount */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        Opening Balance <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="number"
                                        name="opening_balance"
                                        value={formData.opening_balance}
                                        onChange={handleInputChange}
                                        placeholder="0.00"
                                        step="0.01"
                                        min="0"
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-500 transition-colors"
                                        required
                                    />
                                </div>

                                {/* Balance Type */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        Balance Type <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        name="balance_type"
                                        value={formData.balance_type}
                                        onChange={handleInputChange}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-500 transition-colors bg-white"
                                        required
                                    >
                                        <option value="credit">Credit</option>
                                        <option value="debit">Debit</option>
                                    </select>
                                </div>
                            </div>
                            
                            {/* Balance Type Explanation */}
                            <div className="mt-3 p-3 bg-slate-50 rounded-lg">
                                <p className="text-sm text-slate-600">
                                    <strong>Credit:</strong> The ledger has a liability or income nature (e.g., Creditors, Capital, Income)<br />
                                    <strong>Debit:</strong> The ledger has an asset or expense nature (e.g., Debtors, Cash, Expenses)
                                </p>
                            </div>
                        </div>
                    </form>
                </div>

                {/* Fixed Footer with Action Buttons */}
                <div className="border-t border-slate-200 bg-white p-6 flex-shrink-0 rounded-b-xl">
                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={handleClose}
                            className="flex-1 px-4 py-3 text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 text-sm font-medium transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            onClick={handleSubmit}
                            disabled={loading}
                            className="flex-1 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    Creating...
                                </>
                            ) : (
                                <>
                                    <FiPlus className="w-4 h-4" />
                                    Create Ledger
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CreateLedgerModal;