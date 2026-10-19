import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

const MobileSelectionModal = ({ isOpen, onClose, onSubmit }) => {
    const [activeTab, setActiveTab] = useState('predefined');
    const [selectedMobile, setSelectedMobile] = useState('');
    const [customMobile, setCustomMobile] = useState('');

    const mobileOptions = [
        { value: '+1-555-0101', label: '+1-555-0101' },
        { value: '+1-555-0102', label: '+1-555-0102' },
        { value: '+1-555-0103', label: '+1-555-0103' },
        { value: '+1-555-0104', label: '+1-555-0104' },
        { value: '+1-555-0105', label: '+1-555-0105' }
    ];

    const handleSubmit = (e) => {
        e.preventDefault();

        let finalMobile = '';

        if (activeTab === 'predefined') {
            finalMobile = selectedMobile;
        } else {
            if (isValidMobile(customMobile)) {
                finalMobile = customMobile;
            } else {
                alert('Please enter a valid mobile number');
                return;
            }
        }

        if (finalMobile) {
            onSubmit(finalMobile);
            resetForm();
        } else {
            alert('Please select or enter a mobile number');
        }
    };

    const isValidMobile = (mobile) => {
        // Enhanced mobile validation
        const mobileRegex = /^[\+]?[1-9][\d]{0,15}$/;
        const cleanedMobile = mobile.replace(/[\s\-\(\)]/g, '');
        return mobileRegex.test(cleanedMobile) && cleanedMobile.length >= 10;
    };

    const formatMobileDisplay = (mobile) => {
        // Simple formatting for display
        const cleaned = mobile.replace(/[\s\-\(\)]/g, '');
        if (cleaned.length <= 10) {
            return cleaned.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3');
        } else {
            return cleaned.replace(/(\d{1})(\d{3})(\d{3})(\d{4})/, '+$1 ($2) $3-$4');
        }
    };

    const resetForm = () => {
        setSelectedMobile('');
        setCustomMobile('');
        setActiveTab('predefined');
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    const handleOverlayClick = (e) => {
        if (e.target === e.currentTarget) {
            handleClose();
        }
    };

    return (
        <AnimatePresence>
        {isOpen && (
        <motion.div key="mobile-selection-modal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
            onClick={handleOverlayClick}
        >
            <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }} transition={{ duration: 0.18, ease: 'easeOut' }} className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-hidden">
                <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
                    <h2 className="text-xl font-semibold text-gray-800">Select Mobile Number</h2>
                    <button
                        onClick={handleClose}
                        className="text-gray-400 hover:text-gray-600 text-2xl font-light transition-colors duration-200"
                    >
                        ×
                    </button>
                </div>

                {/* Tabs */}
                <div className="border-b border-gray-200">
                    <nav className="flex -mb-px">
                        <button
                            type="button"
                            onClick={() => setActiveTab('predefined')}
                            className={`flex-1 py-3 px-4 text-center font-medium text-sm ${activeTab === 'predefined'
                                    ? 'rounded-md bg-indigo-50 text-indigo-700'
                                    : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            Predefined
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('custom')}
                            className={`flex-1 py-3 px-4 text-center font-medium text-sm ${activeTab === 'custom'
                                    ? 'rounded-md bg-indigo-50 text-indigo-700'
                                    : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            Custom
                        </button>
                    </nav>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="px-6 py-4">
                        {activeTab === 'predefined' ? (
                            <div>
                                <label htmlFor="mobile-select" className="block text-sm font-medium text-gray-700 mb-2">
                                    Choose from predefined numbers:
                                </label>
                                <select
                                    id="mobile-select"
                                    value={selectedMobile}
                                    onChange={(e) => setSelectedMobile(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors duration-200"
                                >
                                    <option value="">-- Please select a mobile number --</option>
                                    {mobileOptions.map((option) => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        ) : (
                            <div>
                                <label htmlFor="custom-mobile" className="block text-sm font-medium text-gray-700 mb-2">
                                    Enter your mobile number:
                                </label>
                                <input
                                    type="tel"
                                    id="custom-mobile"
                                    value={customMobile}
                                    onChange={(e) => setCustomMobile(e.target.value)}
                                    placeholder="+1234567890"
                                    className="w-full px-3 py-2 border border-slate-200 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors duration-200"
                                />
                                {customMobile && !isValidMobile(customMobile) && (
                                    <p className="text-red-500 text-xs mt-1">
                                        Please enter a valid 10+ digit mobile number
                                    </p>
                                )}
                                {customMobile && isValidMobile(customMobile) && (
                                    <p className="text-green-500 text-xs mt-1">
                                        Format: {formatMobileDisplay(customMobile)}
                                    </p>
                                )}
                                <p className="text-gray-500 text-xs mt-2">
                                    Enter with country code (e.g., +1 for US)
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
                        <button
                            type="button"
                            onClick={handleClose}
                            className="px-4 py-2 text-gray-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors duration-200"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={
                                (activeTab === 'predefined' && !selectedMobile) ||
                                (activeTab === 'custom' && (!customMobile || !isValidMobile(customMobile)))
                            }
                            className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-green-300 disabled:cursor-not-allowed transition-colors duration-200"
                        >
                            Submit
                        </button>
                    </div>
                </form>
            </motion.div>
        </motion.div>
        )}
        </AnimatePresence>
    );
};

export default MobileSelectionModal;