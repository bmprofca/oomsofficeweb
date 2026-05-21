import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Header, Sidebar } from '../components/header';
import {
    FiPlus,
    FiEdit,
    FiSettings,
    FiDollarSign,
    FiMenu,
    FiFileText,
    FiFilter,
    FiChevronRight,
    FiPrinter,
    FiCreditCard,
    FiTrash2,
    FiSearch,
    FiRefreshCw,
    FiX,
    FiCalendar,
    FiCheckCircle,
    FiAlertCircle,
    FiInfo
} from 'react-icons/fi';
import { PiExportBold } from "react-icons/pi";
import { PiFilePdfDuotone, PiMicrosoftExcelLogoDuotone } from "react-icons/pi";
import { AiOutlineMail } from "react-icons/ai";
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import API_BASE_URL from '../utils/api-controller';
import getHeaders from '../utils/get-headers';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import SelectInput from '../components/SelectInput';
import { DatePickerField } from '../components/PortalDatePicker';
import TablePagination from '../components/TablePagination';
import { lookupIfscBankAndBranch, normalizeIfsc } from '../utils/ifscLookup';

// Inline Export Modal Component
const InlineExportModal = ({ isOpen, onClose, exportData, columns, jobType }) => {
    const [exporting, setExporting] = useState(false);
    const [exportStatus, setExportStatus] = useState(null);
    const [selectedFormat, setSelectedFormat] = useState(null);

    const getUserEmail = () => {
        try {
            const userEmail = localStorage.getItem('user_email');
            if (userEmail && userEmail !== 'undefined' && userEmail !== 'null') {
                return userEmail;
            }
            const userData = localStorage.getItem('user');
            if (userData) {
                const user = JSON.parse(userData);
                if (user.email) return user.email;
                if (user.user_email) return user.user_email;
            }
            return null;
        } catch (error) {
            console.error('Error getting user email:', error);
            return null;
        }
    };

    const userEmail = getUserEmail();

    const handleExport = async (fileType) => {
        if (!exportData || exportData.length === 0) {
            toast.error('No data to export');
            return;
        }

        if (!userEmail) {
            toast.error('User email not found. Please login again.');
            return;
        }

        setSelectedFormat(fileType);
        setExporting(true);
        setExportStatus('processing');

        try {
            const headers = await getHeaders();
            
            const payload = {
                job_type: jobType,
                file_type: fileType,
                recipient_email: userEmail,
                email_subject: `${jobType.replace('_', ' ').toUpperCase()} Export - ${new Date().toLocaleString()}`,
                email_message: `<p>Your ${jobType.replace('_', ' ')} export is ready.</p>
                                <p><strong>File Format:</strong> ${fileType.toUpperCase()}</p>
                                <p><strong>Total Records:</strong> ${exportData.length}</p>
                                <p><strong>Generated on:</strong> ${new Date().toLocaleString()}</p>`,
                data: exportData,
                columns: columns,
                filters: {
                    export_date: new Date().toISOString(),
                    total_records: exportData.length
                }
            };

            const response = await fetch(`${API_BASE_URL}/export/request`, {
                method: 'POST',
                headers: { ...headers, 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const result = await response.json();

            if (result.success) {
                setExportStatus('success');
                toast.success(`Export started! You will receive the ${fileType.toUpperCase()} file via email at ${userEmail}`);
                setTimeout(() => {
                    onClose();
                    setExportStatus(null);
                    setSelectedFormat(null);
                    setExporting(false);
                }, 2000);
            } else {
                throw new Error(result.message || 'Export failed');
            }
        } catch (error) {
            console.error('Export error:', error);
            setExportStatus('error');
            toast.error(error.message || 'Failed to start export');
            setTimeout(() => {
                setExportStatus(null);
                setSelectedFormat(null);
                setExporting(false);
            }, 2000);
        }
    };

    const exportOptions = [
        { type: 'excel', icon: <PiMicrosoftExcelLogoDuotone className="w-6 h-6 text-green-600" />, label: 'Excel (.xlsx)', description: 'Export as Microsoft Excel spreadsheet' },
        { type: 'csv', icon: <FiCreditCard className="w-6 h-6 text-blue-600" />, label: 'CSV (.csv)', description: 'Export as Comma Separated Values' },
        { type: 'pdf', icon: <PiFilePdfDuotone className="w-6 h-6 text-red-600" />, label: 'PDF (.pdf)', description: 'Export as Portable Document Format' }
    ];

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[200] p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-auto overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                                <PiExportBold className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold">Export Data</h3>
                                <p className="text-indigo-100 text-sm">Choose your preferred format</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-white p-2 rounded-lg hover:bg-white/10 transition-colors"
                            disabled={exporting}
                        >
                            <FiX className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="p-6">
                    {/* Email Info */}
                    <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="flex items-center gap-2">
                            <AiOutlineMail className="w-4 h-4 text-blue-600" />
                            <span className="text-sm text-blue-800">
                                Export will be sent to: <strong>{userEmail || 'Not found'}</strong>
                            </span>
                        </div>
                        {!userEmail && (
                            <div className="mt-2 text-xs text-red-600">
                                Please make sure you are logged in with a valid email address.
                            </div>
                        )}
                    </div>

                    {/* Data Summary */}
                    <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Total Records:</span>
                            <span className="font-semibold text-gray-800">{exportData?.length || 0}</span>
                        </div>
                        <div className="flex justify-between text-sm mt-1">
                            <span className="text-gray-600">Columns:</span>
                            <span className="font-semibold text-gray-800">{columns?.length || 0}</span>
                        </div>
                    </div>

                    {/* Export Options */}
                    <div className="space-y-3">
                        {exportOptions.map((option) => (
                            <button
                                key={option.type}
                                onClick={() => handleExport(option.type)}
                                disabled={exporting || !userEmail}
                                className={`w-full flex items-center justify-between p-4 rounded-lg border-2 transition-all ${
                                    exporting && selectedFormat === option.type
                                        ? 'border-indigo-500 bg-indigo-50'
                                        : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50'
                                } ${(exporting || !userEmail) && selectedFormat !== option.type ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-gray-50">
                                        {option.icon}
                                    </div>
                                    <div className="text-left">
                                        <div className="font-medium text-gray-800">{option.label}</div>
                                        <div className="text-xs text-gray-500">{option.description}</div>
                                    </div>
                                </div>
                                {exporting && selectedFormat === option.type && (
                                    <div className="flex items-center gap-2">
                                        {exportStatus === 'processing' && <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>}
                                        {exportStatus === 'success' && <FiCheckCircle className="w-5 h-5 text-green-600" />}
                                        {exportStatus === 'error' && <FiAlertCircle className="w-5 h-5 text-red-600" />}
                                    </div>
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Info Message */}
                    <div className="mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                        <div className="flex items-start gap-2">
                            <FiInfo className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                            <p className="text-xs text-yellow-700">
                                Export will be processed in the background. You will receive the file via email once completed.
                                Duplicate export requests are not allowed while an export is already in progress.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 font-medium text-sm transition-colors"
                        disabled={exporting}
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};

const sanitizeDecimalInput = (value, maxDecimals = 2) => {
    let next = String(value ?? '').replace(/[^\d.]/g, '');
    if (next === '') return '';
    const firstDot = next.indexOf('.');
    if (firstDot !== -1) {
        next = `${next.slice(0, firstDot + 1)}${next.slice(firstDot + 1).replace(/\./g, '')}`;
    }
    if (next.startsWith('.')) next = `0${next}`;
    const [i = '0', d = ''] = next.split('.');
    const intPart = i.replace(/^0+(?=\d)/, '') || '0';
    const decPart = d.slice(0, Math.max(0, maxDecimals));
    return decPart.length ? `${intPart}.${decPart}` : intPart;
};

// Move ModalContent outside and memoize it
const ModalContent = React.memo(({
    isOpen,
    onClose,
    onSubmit,
    formData,
    onChange,
    patchFields,
    loading,
    mode = 'add',
    title,
    bankTypes,
    openingTypes
}) => {
    const [ifscLookupLoading, setIfscLookupLoading] = React.useState(false);
    const ifscLookupSeqRef = React.useRef(0);
    const lastSuccessfulIfscRef = React.useRef('');

    const runIfscLookup = React.useCallback(
        async (codeRaw) => {
            const code = normalizeIfsc(codeRaw);
            if (!patchFields) return;
            if (String(formData.type || '').toLowerCase() === 'cash') return;
            if (code.length !== 11) return;

            const requestId = ++ifscLookupSeqRef.current;

            setIfscLookupLoading(true);
            try {
                const { bank, branch } = await lookupIfscBankAndBranch(code);
                if (requestId !== ifscLookupSeqRef.current) return;
                lastSuccessfulIfscRef.current = code;
                patchFields({
                    bank: bank || '',
                    branch: branch || ''
                });
            } catch (err) {
                if (requestId !== ifscLookupSeqRef.current) return;
                const codeKey = err?.code;
                if (codeKey === 'INVALID_IFSC') {
                    toast.error('Invalid IFSC code');
                } else if (codeKey === 'NOT_FOUND' || codeKey === 'NETWORK') {
                    toast.error('Could not fetch bank details. Enter bank and branch manually.');
                } else {
                    toast.error('Could not fetch bank details. Try again or enter manually.');
                }
            } finally {
                if (requestId === ifscLookupSeqRef.current) {
                    setIfscLookupLoading(false);
                }
            }
        },
        [formData.type, patchFields]
    );

    const handleIfscKeyUp = React.useCallback(
        (e) => {
            const code = normalizeIfsc(e.currentTarget.value);
            if (code.length < 11) {
                lastSuccessfulIfscRef.current = '';
                return;
            }
            if (code.length === 11 && code !== lastSuccessfulIfscRef.current) {
                void runIfscLookup(code);
            }
        },
        [runIfscLookup]
    );

    const handleIfscPaste = React.useCallback(
        (e) => {
            const inputEl = e.currentTarget;
            window.setTimeout(() => {
                const code = normalizeIfsc(inputEl.value);
                if (code.length < 11) {
                    lastSuccessfulIfscRef.current = '';
                    return;
                }
                if (code.length === 11 && code !== lastSuccessfulIfscRef.current) {
                    void runIfscLookup(code);
                }
            }, 0);
        },
        [runIfscLookup]
    );

    if (!isOpen) return null;
    const isCashType = String(formData.type || '').toLowerCase() === 'cash';
    const hasHolder = String(formData.holder || '').trim() !== '';
    const hasOpeningAmount = String(formData.opening_balance?.amount ?? '').trim() !== '';
    const hasOpeningDate = String(formData.opening_balance?.date || '').trim() !== '';
    const hasOpeningType = String(formData.opening_balance?.type || '').trim() !== '';
    const hasType = String(formData.type || '').trim() !== '';
    const hasBankName = String(formData.bank || '').trim() !== '';
    const hasAccountNo = String(formData.account_no || '').trim() !== '';
    const hasIfsc = String(formData.ifsc || '').trim() !== '';
    const hasBranch = String(formData.branch || '').trim() !== '';
    const isFormValid = isCashType
        ? hasType && hasHolder && hasOpeningAmount && hasOpeningDate && hasOpeningType
        : hasType && hasHolder && hasBankName && hasAccountNo && hasIfsc && hasBranch && hasOpeningAmount && hasOpeningDate && hasOpeningType;

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-hidden overscroll-none p-3 sm:p-4 pointer-events-none">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/50 backdrop-blur-sm pointer-events-auto"
                onClick={onClose}
                aria-hidden
            />

            {/* Modal panel: fixed stacking; scrolling only inside body */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                role="dialog"
                aria-modal="true"
                className="relative z-[1] pointer-events-auto w-full max-w-4xl my-2 sm:my-4 flex flex-col overflow-hidden rounded-2xl bg-white shadow-2xl max-h-[min(calc(100vh-1.5rem),100dvh)] sm:max-h-[min(calc(100vh-2rem),100dvh)] overscroll-none"
            >
                    {/* Header */}
                    <div className="shrink-0 flex items-center justify-between px-5 py-2.5 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-t-2xl">
                        <div>
                            <h2 className="text-xl font-bold">{title}</h2>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-blue-500 rounded-lg transition-colors"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Body */}
                    <div
                        className="px-5 py-4 flex-1 min-h-0 overflow-y-auto overscroll-y-contain [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden touch-pan-y"
                        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                    >
                        <form onSubmit={onSubmit} id="bank-form">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                                {/* Account Type */}
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-semibold text-gray-700">
                                        Account Type <span className="text-red-500">*</span>
                                    </label>
                                    <SelectInput
                                        options={bankTypes.map((type) => ({ value: type.value, label: type.name }))}
                                        value={formData.type || null}
                                        onChange={(value) => onChange({ target: { name: 'type', value: value || '' } })}
                                        placeholder="Select Account Type"
                                        searchPlaceholder="Search account type..."
                                        clearable={false}
                                    />
                                </div>

                                {/* Account Holder */}
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-semibold text-gray-700">
                                        Account Holder <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        name="holder"
                                        value={formData.holder || ''}
                                        onChange={onChange}
                                        placeholder="Enter account holder name"
                                        className="w-full h-10 px-3 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-blue-400 transition-all duration-200"
                                        required
                                    />
                                </div>

                                {!isCashType && (
                                    <>
                                        {/* Account Number */}
                                        <div className="space-y-1.5">
                                            <label className="block text-xs font-semibold text-gray-700">
                                                Account Number <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                name="account_no"
                                                value={formData.account_no || ''}
                                                onChange={onChange}
                                                placeholder="Enter account number"
                                                className="w-full h-10 px-3 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-blue-400 transition-all duration-200"
                                                required={!isCashType}
                                                autoCapitalize="characters"
                                                autoCorrect="off"
                                            />
                                        </div>

                                        {/* IFSC Code */}
                                        <div className="space-y-1.5">
                                            <div className="flex items-center gap-2">
                                                <label className="block text-xs font-semibold text-gray-700">
                                                    IFSC Code <span className="text-red-500">*</span>
                                                </label>
                                                {ifscLookupLoading ? (
                                                    <span className="inline-flex items-center text-blue-600" aria-live="polite">
                                                        <FiRefreshCw className="w-3.5 h-3.5 animate-spin shrink-0" aria-hidden />
                                                        <span className="sr-only">Looking up bank details</span>
                                                    </span>
                                                ) : null}
                                            </div>
                                            <input
                                                type="text"
                                                name="ifsc"
                                                value={formData.ifsc || ''}
                                                onChange={onChange}
                                                onKeyUp={handleIfscKeyUp}
                                                onPaste={handleIfscPaste}
                                                placeholder="Enter IFSC code"
                                                className="w-full h-10 px-3 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-blue-400 transition-all duration-200"
                                                required={!isCashType}
                                                maxLength={11}
                                                autoCapitalize="characters"
                                                autoCorrect="off"
                                                spellCheck={false}
                                            />
                                        </div>

                                        {/* Bank Name */}
                                        <div className="space-y-1.5">
                                            <label className="block text-xs font-semibold text-gray-700">
                                                Bank Name <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                name="bank"
                                                value={formData.bank || ''}
                                                onChange={onChange}
                                                placeholder="Auto-filled from IFSC or type manually"
                                                className="w-full h-10 px-3 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-blue-400 transition-all duration-200"
                                                required={!isCashType}
                                            />
                                        </div>

                                        {/* Branch */}
                                        <div className="space-y-1.5">
                                            <label className="block text-xs font-semibold text-gray-700">
                                                Branch <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                name="branch"
                                                value={formData.branch || ''}
                                                onChange={onChange}
                                                placeholder="Auto-filled from IFSC or type manually"
                                                className="w-full h-10 px-3 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-blue-400 transition-all duration-200"
                                                required={!isCashType}
                                            />
                                        </div>
                                    </>
                                )}

                                {/* Remark */}
                                <div className="lg:col-span-2 space-y-1.5">
                                    <label className="block text-xs font-semibold text-gray-700">
                                        Remark
                                    </label>
                                    <input
                                        type="text"
                                        name="remark"
                                        value={formData.remark || ''}
                                        onChange={onChange}
                                        placeholder="Enter any remarks"
                                        className="w-full h-10 px-3 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-blue-400 transition-all duration-200"
                                    />
                                </div>

                                {/* Opening Balance Section */}
                                <div className="lg:col-span-2 border-t border-gray-200 pt-2 mt-0.5">
                                    <h3 className="text-sm font-semibold text-gray-800 mb-2">Opening Balance Details</h3>
                                </div>

                                {/* Opening Balance Amount */}
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-semibold text-gray-700">
                                        Opening Balance Amount <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        name="opening_balance.amount"
                                        value={formData.opening_balance?.amount || ''}
                                        onChange={onChange}
                                        placeholder="Enter amount"
                                        className="w-full h-10 px-3 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-blue-400 transition-all duration-200"
                                        required
                                        inputMode="decimal"
                                    />
                                </div>

                                {/* Opening Balance Type */}
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-semibold text-gray-700">
                                        Balance Type <span className="text-red-500">*</span>
                                    </label>
                                    <SelectInput
                                        options={openingTypes.map((type) => ({ value: type.value, label: type.name }))}
                                        value={formData.opening_balance?.type || 'credit'}
                                        onChange={(value) => onChange({ target: { name: 'opening_balance.type', value: value || 'credit' } })}
                                        placeholder="Select balance type"
                                        searchPlaceholder="Search balance type..."
                                        clearable={false}
                                    />
                                </div>

                                {/* Opening Balance Date */}
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-semibold text-gray-700">
                                        Opening Date <span className="text-red-500">*</span>
                                    </label>
                                    <DatePickerField
                                        value={formData.opening_balance?.date || new Date().toISOString().split('T')[0]}
                                        onChange={(value) => onChange({ target: { name: 'opening_balance.date', value: value || '' } })}
                                        mode="single"
                                        hideTabs={true}
                                        showResetButton={false}
                                        placeholder="Select opening date"
                                        buttonClassName="w-full h-10 px-3 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-blue-400 transition-all duration-200"
                                    />
                                </div>
                            </div>
                        </form>
                    </div>

                    {/* Footer */}
                    <div className="shrink-0 border-t border-gray-200 bg-gray-50 px-5 py-2 rounded-b-2xl">
                        <div className="flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={loading}
                                className="px-6 py-2.5 text-sm font-medium text-gray-700 bg-white border-2 border-gray-200 rounded-xl hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-all duration-200 disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                form="bank-form"
                                disabled={loading || !isFormValid}
                                className="px-6 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center min-w-[140px] justify-center shadow-lg"
                            >
                                {loading ? (
                                    <>
                                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        {mode === 'add' ? 'Creating...' : 'Updating...'}
                                    </>
                                ) : (
                                    mode === 'add' ? 'Create Bank' : 'Update Bank'
                                )}
                            </button>
                        </div>
                    </div>
                </motion.div>
        </div>
    );
});

// Delete Modal - moved outside and memoized
const DeleteModal = React.memo(({ isOpen, onClose, onConfirm, bank, loading }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden overscroll-none p-4 pointer-events-none">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/50 backdrop-blur-sm pointer-events-auto"
                onClick={onClose}
                aria-hidden
            />

            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="relative z-[1] pointer-events-auto w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 overscroll-none"
                role="dialog"
                aria-modal="true"
            >
                    <div className="text-center">
                        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <FiTrash2 className="w-10 h-10 text-red-500" />
                        </div>

                        <h3 className="text-xl font-bold text-gray-800 mb-2">
                            Delete Bank Account
                        </h3>

                        <p className="text-gray-600 mb-6">
                            Are you sure you want to delete <span className="font-semibold">{bank?.bank}</span>? This action cannot be undone.
                        </p>

                        <div className="flex gap-3">
                            <button
                                onClick={onClose}
                                disabled={loading}
                                className="flex-1 px-4 py-3 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-all duration-200 disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={onConfirm}
                                disabled={loading}
                                className="flex-1 px-4 py-3 text-sm font-medium text-white bg-gradient-to-r from-red-500 to-red-600 rounded-xl hover:from-red-600 hover:to-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center"
                            >
                                {loading ? (
                                    <>
                                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Deleting...
                                    </>
                                ) : (
                                    'Delete'
                                )}
                            </button>
                        </div>
                    </div>
            </motion.div>
        </div>
    );
});

const BankList = () => {
    const navigate = useNavigate();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(() => {
        const saved = localStorage.getItem('sidebarMinimized');
        return saved ? JSON.parse(saved) : false;
    });
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [selectedBank, setSelectedBank] = useState(null);
    const [loading, setLoading] = useState(false);
    const [fetchLoading, setFetchLoading] = useState(true);
    const [showAddDropdown, setShowAddDropdown] = useState(false);
    const [activeRowDropdown, setActiveRowDropdown] = useState(null);
    const [exportModal, setExportModal] = useState({ open: false, type: '', data: null });

    // Export Modal State
    const [exportModalOpen, setExportModalOpen] = useState(false);
    const [exportData, setExportData] = useState([]);
    const [exportColumns, setExportColumns] = useState([]);

    // Pagination and list states
    const [currentPage, setCurrentPage] = useState(1);
    const [limit] = useState(10);
    const [total, setTotal] = useState(0);
    const [isLastPage, setIsLastPage] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
    const [fetchError, setFetchError] = useState(null);

    // Form states
    const [formData, setFormData] = useState({
        account_no: '',
        holder: '',
        ifsc: '',
        bank: '',
        branch: '',
        type: '',
        remark: '',
        opening_balance: {
            amount: '0',
            date: new Date().toISOString().split('T')[0],
            type: 'credit'
        }
    });

    const [editFormData, setEditFormData] = useState({
        bank_id: '',
        account_no: '',
        holder: '',
        ifsc: '',
        bank: '',
        branch: '',
        type: '',
        remark: '',
        opening_balance: {
            amount: '0',
            date: '',
            type: 'credit'
        }
    });

    // Bank type options - memoized to prevent unnecessary re-renders
    const bankTypes = useMemo(() => [
        { value: 'savings', name: 'Savings' },
        { value: 'current', name: 'Current' },
        { value: 'loan', name: 'Loan' },
        { value: 'cash', name: 'Cash' }
    ], []);

    // Opening type options
    const openingTypes = useMemo(() => [
        { value: 'credit', name: 'Credit' },
        { value: 'debit', name: 'Debit' }
    ], []);

    // Banks data
    const [banks, setBanks] = useState([]);

    // Prepare data for export
    const prepareExportData = () => {
        const exportDataList = [];
        const exportColumnsConfig = [];

        const columns = [
            { header: 'S.No', key: 'sl_no', width: 10 },
            { header: 'Account Holder', key: 'holder', width: 25 },
            { header: 'Bank Name', key: 'bank', width: 25 },
            { header: 'Account No', key: 'account_no', width: 20 },
            { header: 'IFSC Code', key: 'ifsc', width: 15 },
            { header: 'Branch', key: 'branch', width: 20 },
            { header: 'Type', key: 'type', width: 15 },
            { header: 'Balance (₹)', key: 'balance', width: 18 },
            { header: 'Remark', key: 'remark', width: 25 }
        ];

        exportColumnsConfig.push(...columns);

        banks.forEach((bank, index) => {
            const row = {
                sl_no: ((currentPage - 1) * limit) + index + 1,
                holder: bank.holder || 'N/A',
                bank: bank.bank || 'N/A',
                account_no: bank.account_no || 'N/A',
                ifsc: bank.ifsc || 'N/A',
                branch: bank.branch || 'N/A',
                type: getBankTypeName(bank.type),
                balance: bank.balance || 0,
                remark: bank.remark || ''
            };
            exportDataList.push(row);
        });

        return { data: exportDataList, columns: exportColumnsConfig };
    };

    // Handle export click for modal
    const handleExportClick = () => {
        const { data, columns } = prepareExportData();
        
        if (data.length === 0) {
            toast.error('No data to export');
            return;
        }

        setExportData(data);
        setExportColumns(columns);
        setExportModalOpen(true);
    };

    // Handle other exports (print)
    const handleOtherExport = (type, data = null) => {
        setExportModal({ open: true, type, data });

        setTimeout(() => {
            setExportModal({ open: false, type: '', data: null });
            toast.success(`${type.toUpperCase()} export completed successfully!`);
        }, 1500);
    };

    // Fetch banks from API – GET /bank/list
    const fetchBanks = useCallback(async () => {
        setFetchLoading(true);
        setFetchError(null);
        const headers = getHeaders();
        if (!headers) {
            setFetchError('Authentication required');
            setFetchLoading(false);
            return;
        }
        try {
            const searchTrimmed = (debouncedSearchTerm || '').trim();
            const response = await axios.get(`${API_BASE_URL}/transaction/bank/list`, {
                headers,
                params: {
                    page_no: currentPage,
                    limit,
                    search: searchTrimmed
                }
            });

            if (response.data?.success) {
                const list = Array.isArray(response.data.data) ? response.data.data : [];
                const meta = response.data.meta || {};
                setBanks(list);
                setTotal(meta.total ?? 0);
                setIsLastPage(meta.is_last_page ?? true);
                setFetchError(null);
            } else {
                setFetchError(response.data?.message || 'Failed to fetch bank list');
                setBanks([]);
            }
        } catch (error) {
            console.error('Error fetching banks:', error);
            const errMsg = error.response?.data?.message || error.message || 'Failed to fetch bank list';
            setFetchError(errMsg);
            toast.error(errMsg);
            setBanks([]);
        } finally {
            setFetchLoading(false);
        }
    }, [currentPage, limit, debouncedSearchTerm]);

    // Debounce search term – trim and reset to page 1 on change
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchTerm((searchTerm || '').trim());
            setCurrentPage(1);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    // Fetch banks on page change or search
    useEffect(() => {
        fetchBanks();
    }, [fetchBanks]);

    // Persist sidebar minimized state
    useEffect(() => {
        localStorage.setItem('sidebarMinimized', JSON.stringify(isMinimized));
    }, [isMinimized]);

    // Lock body scroll when mobile sidebar is open (avoid leaving inline overflow when closed)
    useEffect(() => {
        if (mobileMenuOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.removeProperty('overflow');
        }
        return () => {
            document.body.style.removeProperty('overflow');
        };
    }, [mobileMenuOpen]);

    // Close all dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (!event.target.closest('.dropdown-container')) {
                setShowAddDropdown(false);
                setActiveRowDropdown(null);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Handle balance click - redirect to transaction history page
    const handleBalanceClick = useCallback((bank) => {
        navigate(`/finance/bank/transaction-history?bank_id=${bank.bank_id}`);
    }, [navigate]);

    // Format currency
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount);
    };

    // Handle form input changes for add modal - memoized
    const handleInputChange = useCallback((e) => {
        const { name, value } = e.target;

        if (name.startsWith('opening_balance.')) {
            const field = name.split('.')[1];
            setFormData(prev => ({
                ...prev,
                opening_balance: {
                    ...prev.opening_balance,
                    [field]: field === 'amount' ? sanitizeDecimalInput(value, 2) : value
                }
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                [name]: name === 'ifsc' ? normalizeIfsc(value) : value
            }));
        }
    }, []);

    // Handle form input changes for edit modal - memoized
    const handleEditInputChange = useCallback((e) => {
        const { name, value } = e.target;

        if (name.startsWith('opening_balance.')) {
            const field = name.split('.')[1];
            setEditFormData(prev => ({
                ...prev,
                opening_balance: {
                    ...prev.opening_balance,
                    [field]: field === 'amount' ? sanitizeDecimalInput(value, 2) : value
                }
            }));
        } else {
            setEditFormData(prev => ({
                ...prev,
                [name]: name === 'ifsc' ? normalizeIfsc(value) : value
            }));
        }
    }, []);

    // Handle create bank - memoized
    const handleCreateBank = useCallback(async (e) => {
        e.preventDefault();
        setLoading(true);

        const loadingToast = toast.loading('Creating bank account...');

        try {
            const response = await axios.post(
                `${API_BASE_URL}/transaction/bank/create`,
                {
                    account_no: formData.account_no,
                    holder: formData.holder,
                    ifsc: formData.ifsc,
                    bank: formData.bank,
                    branch: formData.branch,
                    type: formData.type,
                    remark: formData.remark,
                    opening_balance: {
                        amount: parseFloat(formData.opening_balance.amount),
                        date: formData.opening_balance.date,
                        type: formData.opening_balance.type
                    }
                },
                { headers: getHeaders() }
            );

            if (response.data.success) {
                toast.success('Bank created successfully!', { id: loadingToast });
                setFormData({
                    account_no: '',
                    holder: '',
                    ifsc: '',
                    bank: '',
                    branch: '',
                    type: '',
                    remark: '',
                    opening_balance: {
                        amount: '0',
                        date: new Date().toISOString().split('T')[0],
                        type: 'credit'
                    }
                });
                setShowAddModal(false);
                fetchBanks(); // Refresh the list
            }
        } catch (error) {
            console.error('Error creating bank:', error);
            toast.error(
                error.response?.data?.message || 'Failed to create bank account',
                { id: loadingToast }
            );
        } finally {
            setLoading(false);
        }
    }, [formData]);

    // Handle edit bank - memoized
    const handleEditBank = useCallback(async (e) => {
        e.preventDefault();
        setLoading(true);

        const loadingToast = toast.loading('Updating bank account...');

        try {
            const response = await axios.put(
                `${API_BASE_URL}/transaction/bank/edit`,
                {
                    bank_id: editFormData.bank_id,
                    account_no: editFormData.account_no,
                    holder: editFormData.holder,
                    ifsc: editFormData.ifsc,
                    bank: editFormData.bank,
                    branch: editFormData.branch,
                    type: editFormData.type,
                    remark: editFormData.remark,
                    opening_balance: {
                        amount: parseFloat(editFormData.opening_balance.amount),
                        date: editFormData.opening_balance.date,
                        type: editFormData.opening_balance.type
                    }
                },
                { headers: getHeaders() }
            );

            if (response.data.success) {
                toast.success('Bank updated successfully!', { id: loadingToast });
                setShowEditModal(false);
                fetchBanks(); // Refresh the list
            }
        } catch (error) {
            console.error('Error updating bank:', error);
            toast.error(
                error.response?.data?.message || 'Failed to update bank account',
                { id: loadingToast }
            );
        } finally {
            setLoading(false);
        }
    }, [editFormData]);

    // Handle delete bank - memoized
    const handleDeleteBank = useCallback(async () => {
        if (!selectedBank) return;

        setLoading(true);
        const loadingToast = toast.loading('Deleting bank account...');

        try {
            const response = await axios.post(
                `${API_BASE_URL}/transaction/bank/delete`,
                { bank_id: selectedBank.bank_id },
                { headers: getHeaders() }
            );

            if (response.data.success) {
                toast.success('Bank deleted successfully!', { id: loadingToast });
                setShowDeleteModal(false);
                setSelectedBank(null);
                fetchBanks(); // Refresh the list
            }
        } catch (error) {
            console.error('Error deleting bank:', error);
            toast.error(
                error.response?.data?.message || 'Failed to delete bank account',
                { id: loadingToast }
            );
        } finally {
            setLoading(false);
        }
    }, [selectedBank]);

    // Handle edit button click - memoized
    const handleEditClick = useCallback((bank) => {
        setEditFormData({
            bank_id: bank.bank_id,
            account_no: bank.account_no,
            holder: bank.holder,
            ifsc: bank.ifsc,
            bank: bank.bank,
            branch: bank.branch,
            type: bank.type,
            remark: bank.remark || '',
            opening_balance: {
                amount: sanitizeDecimalInput(String(Math.abs(bank.balance ?? 0)), 2),
                date: new Date().toISOString().split('T')[0],
                type: bank.balance < 0 ? 'credit' : 'debit'
            }
        });
        setShowEditModal(true);
    }, []);

    // Handle delete click - memoized
    const handleDeleteClick = useCallback((bank) => {
        setSelectedBank(bank);
        setShowDeleteModal(true);
        setActiveRowDropdown(null);
    }, []);

    // Get bank type name
    const getBankTypeName = useCallback((typeValue) => {
        const type = bankTypes.find(t => t.value === typeValue);
        return type ? type.name : typeValue;
    }, [bankTypes]);

    // Get bank type color
    const getBankTypeColor = useCallback((type) => {
        switch (type?.toLowerCase()) {
            case 'savings': return 'bg-blue-100 text-blue-700';
            case 'current': return 'bg-green-100 text-green-700';
            case 'salary': return 'bg-purple-100 text-purple-700';
            case 'fixed_deposit': return 'bg-orange-100 text-orange-700';
            default: return 'bg-slate-100 text-slate-700';
        }
    }, []);

    // Toggle row dropdown
    const toggleRowDropdown = useCallback((bankId) => {
        setActiveRowDropdown(prev => prev === bankId ? null : bankId);
    }, []);

    // Handle page change
    const handlePageChange = useCallback((newPage) => {
        if (newPage < 1) return;
        if (newPage > currentPage && isLastPage) return;
        setCurrentPage(newPage);
    }, [currentPage, isLastPage]);

    // Handle refresh
    const handleRefresh = useCallback(() => {
        fetchBanks();
        toast.success('Data refreshed');
    }, []);

    // Skeleton loader component
    const SkeletonRow = useCallback(() => (
        <tr className="border-b border-slate-100 animate-pulse">
            <td className="p-4">
                <div className="h-4 bg-slate-200 rounded w-6"></div>
            </td>
            <td className="p-4">
                <div className="h-4 bg-slate-200 rounded w-32 mb-2"></div>
                <div className="h-3 bg-slate-200 rounded w-24"></div>
            </td>
            <td className="p-4">
                <div className="h-4 bg-slate-200 rounded w-28"></div>
            </td>
            <td className="p-4">
                <div className="h-4 bg-slate-200 rounded w-20"></div>
            </td>
            <td className="p-4">
                <div className="h-6 bg-slate-200 rounded w-16"></div>
            </td>
            <td className="p-4">
                <div className="h-6 bg-slate-200 rounded w-24"></div>
            </td>
            <td className="p-4">
                <div className="h-8 bg-slate-200 rounded w-8"></div>
            </td>
        </tr>
    ), []);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
            <Header
                mobileMenuOpen={mobileMenuOpen}
                setMobileMenuOpen={setMobileMenuOpen}
                isMinimized={isMinimized}
                setIsMinimized={setIsMinimized}
            />
            <Sidebar
                mobileMenuOpen={mobileMenuOpen}
                setMobileMenuOpen={setMobileMenuOpen}
                isMinimized={isMinimized}
                setIsMinimized={setIsMinimized}
            />

            {/* Main Content Area */}
            <div className={`pt-16 transition-all duration-300 ease-in-out ${isMinimized ? 'md:pl-20' : 'md:pl-[260px]'}`}>
                <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    {/* Main Card */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden"
                    >
                        {/* Card Header */}
                        <div className="border-b border-slate-200 px-6 py-4 bg-white">
                            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                                <div>
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-blue-100 rounded-xl">
                                            <FiCreditCard className="w-5 h-5 text-blue-600" />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-slate-800">
                                                Bank Register
                                            </h3>
                                            <p className="text-slate-500 text-sm">
                                                Manage all your bank accounts
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-wrap gap-3">
                                    {/* Search Bar */}
                                    <div className="relative">
                                        <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                                        <input
                                            type="text"
                                            placeholder="Search banks..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-64"
                                        />
                                    </div>

                                    {/* Refresh Button */}
                                    <motion.button
                                        onClick={handleRefresh}
                                        className="px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-50 transition-all duration-200 flex items-center gap-2"
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        <FiRefreshCw className="w-4 h-4" />
                                        Refresh
                                    </motion.button>

                                    {/* Export Dropdown */}
                                    <div className="dropdown-container relative">
                                        <motion.button
                                            onClick={() => setShowAddDropdown(!showAddDropdown)}
                                            className="px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-50 transition-all duration-200 flex items-center gap-2"
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                        >
                                            <PiExportBold className="w-4 h-4" />
                                            Export
                                            <FiChevronRight className={`w-3 h-3 transition-transform ${showAddDropdown ? 'rotate-90' : ''}`} />
                                        </motion.button>

                                        <AnimatePresence>
                                            {showAddDropdown && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, y: 10 }}
                                                    className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden"
                                                >
                                                    <div className="py-2">
                                                        <button
                                                            onClick={handleExportClick}
                                                            className="flex items-center w-full px-4 py-2.5 text-sm text-slate-700 hover:bg-blue-50 transition-all duration-150"
                                                        >
                                                            <div className="p-1.5 bg-red-50 rounded-lg mr-3">
                                                                <PiFilePdfDuotone className="w-4 h-4 text-red-500" />
                                                            </div>
                                                            <span>Export as PDF</span>
                                                        </button>
                                                        <button
                                                            onClick={handleExportClick}
                                                            className="flex items-center w-full px-4 py-2.5 text-sm text-slate-700 hover:bg-blue-50 transition-all duration-150"
                                                        >
                                                            <div className="p-1.5 bg-green-50 rounded-lg mr-3">
                                                                <PiMicrosoftExcelLogoDuotone className="w-4 h-4 text-green-500" />
                                                            </div>
                                                            <span>Export as Excel</span>
                                                        </button>
                                                        <button
                                                            onClick={() => handleOtherExport('print')}
                                                            className="flex items-center w-full px-4 py-2.5 text-sm text-slate-700 hover:bg-blue-50 transition-all duration-150"
                                                        >
                                                            <div className="p-1.5 bg-slate-50 rounded-lg mr-3">
                                                                <FiPrinter className="w-4 h-4 text-slate-600" />
                                                            </div>
                                                            <span>Print Report</span>
                                                        </button>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>

                                    {/* Add Bank Button */}
                                    <motion.button
                                        onClick={() => setShowAddModal(true)}
                                        className="px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl text-sm font-medium hover:from-emerald-600 hover:to-emerald-700 transition-all duration-200 flex items-center gap-2 shadow-lg shadow-emerald-500/25"
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        <FiPlus className="w-4 h-4" />
                                        Add Bank
                                    </motion.button>
                                </div>
                            </div>
                        </div>

                        {/* Table */}
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-gradient-to-r from-slate-50 to-slate-100 border-y border-slate-200">
                                        <th className="text-left p-4 font-semibold text-slate-600">S.No</th>
                                        <th className="text-left p-4 font-semibold text-slate-600">Account Holder</th>
                                        <th className="text-left p-4 font-semibold text-slate-600">Bank Details</th>
                                        <th className="text-left p-4 font-semibold text-slate-600">IFSC</th>
                                        <th className="text-left p-4 font-semibold text-slate-600">Type</th>
                                        <th className="text-right p-4 font-semibold text-slate-600">Balance</th>
                                        <th className="text-center p-4 font-semibold text-slate-600">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {fetchError && !fetchLoading ? (
                                        <tr>
                                            <td colSpan="7" className="text-center py-12">
                                                <div className="flex flex-col items-center justify-center">
                                                    <p className="text-red-600 font-medium mb-2">{fetchError}</p>
                                                    <motion.button
                                                        onClick={handleRefresh}
                                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
                                                        whileHover={{ scale: 1.02 }}
                                                        whileTap={{ scale: 0.98 }}
                                                    >
                                                        Try Again
                                                    </motion.button>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : fetchLoading ? (
                                        [...Array(5)].map((_, index) => (
                                            <SkeletonRow key={index} />
                                        ))
                                    ) : banks.length === 0 ? (
                                        <tr>
                                            <td colSpan="7" className="text-center py-12">
                                                <div className="flex flex-col items-center justify-center">
                                                    <div className="p-4 bg-slate-100 rounded-full mb-4">
                                                        <FiCreditCard className="w-8 h-8 text-slate-400" />
                                                    </div>
                                                    <p className="text-slate-600 text-lg font-medium mb-2">No bank accounts found</p>
                                                    <p className="text-slate-500 text-sm mb-4">Get started by adding your first bank account</p>
                                                    <motion.button
                                                        onClick={() => setShowAddModal(true)}
                                                        className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl text-sm font-medium hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg"
                                                        whileHover={{ scale: 1.02 }}
                                                        whileTap={{ scale: 0.98 }}
                                                    >
                                                        Add Your First Bank Account
                                                    </motion.button>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        banks.map((bank, index) => {
                                            const isDropdownOpen = activeRowDropdown === bank.bank_id;
                                            const isPositive = bank.balance > 0;

                                            return (
                                                <motion.tr
                                                    key={bank.bank_id}
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    transition={{ duration: 0.2 }}
                                                    className="hover:bg-blue-50/30 transition-colors duration-150"
                                                >
                                                    <td className="p-4">
                                                        <span className="text-slate-600 font-medium">
                                                            {(currentPage - 1) * limit + index + 1}
                                                        </span>
                                                    </td>
                                                    <td className="p-4">
                                                        <span className="font-medium text-slate-700">
                                                            {bank.holder}
                                                        </span>
                                                    </td>
                                                    <td className="p-4">
                                                        <div>
                                                            <div className="font-semibold text-slate-800">
                                                                {bank.bank}
                                                            </div>
                                                            <div className="text-slate-500 text-xs mt-1">
                                                                {bank.account_no}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="p-4">
                                                        <div className="space-y-1">
                                                            {bank.ifsc ? (
                                                                <span className="inline-flex px-3 py-1.5 bg-slate-100 text-slate-700 font-mono text-xs rounded-lg border border-slate-200">
                                                                    {bank.ifsc}
                                                                </span>
                                                            ) : null}
                                                            {bank.branch ? (
                                                                <div className="text-slate-500 text-xs">{bank.branch}</div>
                                                            ) : null}
                                                        </div>
                                                    </td>
                                                    <td className="p-4">
                                                        <span className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize ${getBankTypeColor(bank.type)}`}>
                                                            {getBankTypeName(bank.type)}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 text-right">
                                                        <button
                                                            onClick={() => handleBalanceClick(bank)}
                                                            className={`inline-flex items-center justify-end font-bold text-sm ${isPositive ? 'text-green-600 hover:text-green-700' : 'text-red-600 hover:text-red-700'
                                                                } cursor-pointer transition-all duration-200`}
                                                        >
                                                            {isPositive ? '+' : '-'} ₹{formatCurrency(Math.abs(bank.balance))}
                                                        </button>
                                                    </td>
                                                    <td className="p-4">
                                                        <div className="dropdown-container relative flex justify-center">
                                                            <motion.button
                                                                className="p-2 text-slate-500 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors duration-150 border border-slate-200"
                                                                onClick={() => toggleRowDropdown(bank.bank_id)}
                                                                whileHover={{ scale: 1.05 }}
                                                                whileTap={{ scale: 0.95 }}
                                                            >
                                                                <FiMenu className="w-4 h-4" />
                                                            </motion.button>
                                                            <AnimatePresence>
                                                                {isDropdownOpen && (
                                                                    <motion.div
                                                                        initial={{ opacity: 0, y: 10 }}
                                                                        animate={{ opacity: 1, y: 0 }}
                                                                        exit={{ opacity: 0, y: 10 }}
                                                                        className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden"
                                                                    >
                                                                        <div className="py-2">
                                                                            <button
                                                                                onClick={() => {
                                                                                    handleEditClick(bank);
                                                                                    setActiveRowDropdown(null);
                                                                                }}
                                                                                className="flex items-center w-full px-4 py-2.5 text-sm text-slate-700 hover:bg-blue-50 transition-colors duration-150"
                                                                            >
                                                                                <div className="p-1.5 bg-blue-50 rounded-lg mr-3">
                                                                                    <FiEdit className="w-4 h-4 text-blue-500" />
                                                                                </div>
                                                                                <span>Edit Bank</span>
                                                                            </button>
                                                                            <button
                                                                                onClick={() => {
                                                                                    handleDeleteClick(bank);
                                                                                    setActiveRowDropdown(null);
                                                                                }}
                                                                                className="flex items-center w-full px-4 py-2.5 text-sm text-slate-700 hover:bg-red-50 transition-colors duration-150"
                                                                            >
                                                                                <div className="p-1.5 bg-red-50 rounded-lg mr-3">
                                                                                    <FiTrash2 className="w-4 h-4 text-red-500" />
                                                                                </div>
                                                                                <span>Delete Bank</span>
                                                                            </button>
                                                                            <div className="border-t border-slate-100 my-2"></div>
                                                                            <a
                                                                                href={`/view-bank-ledger?bank_id=${bank.bank_id}`}
                                                                                className="flex items-center w-full px-4 py-2.5 text-sm text-slate-700 hover:bg-blue-50 transition-colors duration-150"
                                                                            >
                                                                                <div className="p-1.5 bg-green-50 rounded-lg mr-3">
                                                                                    <FiFileText className="w-4 h-4 text-green-500" />
                                                                                </div>
                                                                                <span>View Ledger</span>
                                                                            </a>
                                                                            <button
                                                                                onClick={() => {
                                                                                    handleOtherExport('print', bank);
                                                                                    setActiveRowDropdown(null);
                                                                                }}
                                                                                className="flex items-center w-full px-4 py-2.5 text-sm text-slate-700 hover:bg-blue-50 transition-colors duration-150"
                                                                            >
                                                                                <div className="p-1.5 bg-slate-50 rounded-lg mr-3">
                                                                                    <FiPrinter className="w-4 h-4 text-slate-600" />
                                                                                </div>
                                                                                <span>Print</span>
                                                                            </button>
                                                                        </div>
                                                                    </motion.div>
                                                                )}
                                                            </AnimatePresence>
                                                        </div>
                                                    </td>
                                                </motion.tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {!fetchLoading && (banks.length > 0 || total > 0) && !fetchError && (
                            <TablePagination
                                page={currentPage}
                                limit={limit}
                                total={total}
                                totalPages={Math.max(1, Math.ceil(total / (limit || 1)))}
                                isLastPage={isLastPage}
                                rowOptions={[10]}
                                defaultRows={10}
                                onPageChange={handlePageChange}
                                onLimitChange={() => { }}
                            />
                        )}
                    </motion.div>
                </div>
            </div>

            {/* Modals */}
            <AnimatePresence>
                {showAddModal && (
                    <ModalContent
                        isOpen={showAddModal}
                        onClose={() => setShowAddModal(false)}
                        onSubmit={handleCreateBank}
                        formData={formData}
                        onChange={handleInputChange}
                        patchFields={(patch) => setFormData((prev) => ({ ...prev, ...patch }))}
                        loading={loading}
                        mode="add"
                        title="Add New Bank Account"
                        bankTypes={bankTypes}
                        openingTypes={openingTypes}
                    />
                )}

                {showEditModal && (
                    <ModalContent
                        isOpen={showEditModal}
                        onClose={() => setShowEditModal(false)}
                        onSubmit={handleEditBank}
                        formData={editFormData}
                        onChange={handleEditInputChange}
                        patchFields={(patch) => setEditFormData((prev) => ({ ...prev, ...patch }))}
                        loading={loading}
                        mode="edit"
                        title="Edit Bank Account"
                        bankTypes={bankTypes}
                        openingTypes={openingTypes}
                    />
                )}

                {showDeleteModal && (
                    <DeleteModal
                        isOpen={showDeleteModal}
                        onClose={() => {
                            setShowDeleteModal(false);
                            setSelectedBank(null);
                        }}
                        onConfirm={handleDeleteBank}
                        bank={selectedBank}
                        loading={loading}
                    />
                )}

                {/* Inline Export Modal */}
                <InlineExportModal
                    isOpen={exportModalOpen}
                    onClose={() => { setExportModalOpen(false); setExportData([]); setExportColumns([]); }}
                    exportData={exportData}
                    columns={exportColumns}
                    jobType="bank_report"
                />

                {/* Export Confirmation Modal */}
                {exportModal.open && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="bg-white rounded-2xl p-8 max-w-sm w-full mx-auto shadow-2xl"
                        >
                            <div className="text-center">
                                <div className="w-20 h-20 bg-gradient-to-r from-blue-100 to-blue-200 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <PiExportBold className="w-8 h-8 text-blue-600" />
                                </div>
                                <h3 className="text-xl font-bold text-slate-800 mb-2">
                                    Exporting {exportModal.type.toUpperCase()}
                                </h3>
                                <p className="text-slate-600 mb-6">
                                    Your {exportModal.type} export is being processed...
                                </p>
                                <div className="flex justify-center space-x-3 mb-6">
                                    <div className="w-3 h-3 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full animate-bounce"></div>
                                    <div className="w-3 h-3 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                                    <div className="w-3 h-3 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                </div>
                                <p className="text-sm text-slate-500">
                                    This will only take a moment...
                                </p>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default BankList;