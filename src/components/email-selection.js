import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

const EmailSelectionModal = ({ isOpen, onClose, onSubmit }) => {
    const [activeTab, setActiveTab] = useState('predefined');
    const [selectedEmail, setSelectedEmail] = useState('');
    const [customEmail, setCustomEmail] = useState('');

    const emailOptions = [
        { value: 'john.doe@example.com', label: 'john.doe@example.com' },
        { value: 'jane.smith@example.com', label: 'jane.smith@example.com' },
        { value: 'mike.wilson@example.com', label: 'mike.wilson@example.com' },
        { value: 'sarah.johnson@example.com', label: 'sarah.johnson@example.com' },
        { value: 'admin@example.com', label: 'admin@example.com' }
    ];

    const handleSubmit = (e) => {
        e.preventDefault();

        let finalEmail = '';

        if (activeTab === 'predefined') {
            finalEmail = selectedEmail;
        } else {
            if (isValidEmail(customEmail)) {
                finalEmail = customEmail;
            } else {
                alert('Please enter a valid email address');
                return;
            }
        }

        if (finalEmail) {
            onSubmit(finalEmail);
            resetForm();
        } else {
            alert('Please select or enter an email');
        }
    };

    const isValidEmail = (email) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    const resetForm = () => {
        setSelectedEmail('');
        setCustomEmail('');
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
        <motion.div key="email-selection-modal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
            onClick={handleOverlayClick}
        >
            <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }} transition={{ duration: 0.18, ease: 'easeOut' }} className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-hidden">
                <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
                    <h2 className="text-xl font-semibold text-gray-800">Select Email</h2>
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
                                ? 'border-b-2 border-blue-500 text-blue-600'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            Predefined
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('custom')}
                            className={`flex-1 py-3 px-4 text-center font-medium text-sm ${activeTab === 'custom'
                                ? 'border-b-2 border-blue-500 text-blue-600'
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
                                <label htmlFor="email-select" className="block text-sm font-medium text-gray-700 mb-2">
                                    Choose from predefined emails:
                                </label>
                                <select
                                    id="email-select"
                                    value={selectedEmail}
                                    onChange={(e) => setSelectedEmail(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-500 transition-colors duration-200"
                                >
                                    <option value="">-- Please select an email --</option>
                                    {emailOptions.map((option) => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        ) : (
                            <div>
                                <label htmlFor="custom-email" className="block text-sm font-medium text-gray-700 mb-2">
                                    Enter your email address:
                                </label>
                                <input
                                    type="email"
                                    id="custom-email"
                                    value={customEmail}
                                    onChange={(e) => setCustomEmail(e.target.value)}
                                    placeholder="example@domain.com"
                                    className="w-full px-3 py-2 border border-slate-200 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-500 transition-colors duration-200"
                                />
                                {customEmail && !isValidEmail(customEmail) && (
                                    <p className="text-red-500 text-xs mt-1">Please enter a valid email address</p>
                                )}
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
                                (activeTab === 'predefined' && !selectedEmail) ||
                                (activeTab === 'custom' && (!customEmail || !isValidEmail(customEmail)))
                            }
                            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/25 disabled:bg-blue-300 disabled:cursor-not-allowed transition-colors duration-200"
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

export default EmailSelectionModal;