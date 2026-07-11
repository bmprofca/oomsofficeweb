import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Header, Sidebar } from '../components/header';
import {
    FiPlus,
    FiEdit,
    FiSettings,
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
import { TbPigMoney, TbCash, TbBuildingBank } from 'react-icons/tb';
import { HiOutlineReceiptRefund } from 'react-icons/hi';
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

const ACTIONS_MENU_WIDTH = 192;
const ACTIONS_MENU_HEIGHT = 220;

const EMPTY_TYPE_STATS = { count: 0, balance: 0 };

const EMPTY_STATS = {
    by_type: {
        savings: { ...EMPTY_TYPE_STATS },
        current: { ...EMPTY_TYPE_STATS },
        loan: { ...EMPTY_TYPE_STATS },
        cash: { ...EMPTY_TYPE_STATS },
    },
};

const BANK_TYPE_CARDS = [
    {
        key: 'savings',
        label: 'Savings',
        gradient: 'from-emerald-500 to-emerald-600',
        labelClass: 'text-emerald-100',
        Icon: TbPigMoney,
    },
    {
        key: 'current',
        label: 'Current',
        gradient: 'from-blue-500 to-blue-600',
        labelClass: 'text-blue-100',
        Icon: TbBuildingBank,
    },
    {
        key: 'loan',
        label: 'Loan',
        gradient: 'from-orange-500 to-orange-600',
        labelClass: 'text-orange-100',
        Icon: HiOutlineReceiptRefund,
    },
    {
        key: 'cash',
        label: 'Cash',
        gradient: 'from-amber-500 to-amber-600',
        labelClass: 'text-amber-100',
        Icon: TbCash,
    },
];

const normalizeBankStats = (raw) => {
    const byType = raw?.by_type || {};
    return {
        by_type: BANK_TYPE_CARDS.reduce((acc, { key }) => {
            const entry = byType[key] || {};
            acc[key] = {
                count: Number(entry.count) || 0,
                balance: Number(entry.balance) || 0,
            };
            return acc;
        }, {}),
    };
};

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
                                className={`w-full flex items-center justify-between p-4 rounded-lg border-2 transition-all ${exporting && selectedFormat === option.type
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
    const [dropdownPos, setDropdownPos] = useState({ top: 0, left: undefined, right: 0, bottom: undefined, openUpward: false });
    const actionAnchorRef = useRef(null);
    const dropdownModeRef = useRef('button');
    const [exportModal, setExportModal] = useState({ open: false, type: '', data: null });

    // Export Modal State
    const [exportModalOpen, setExportModalOpen] = useState(false);
    const [exportData, setExportData] = useState([]);
    const [exportColumns, setExportColumns] = useState([]);

    // Pagination and list states
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [total, setTotal] = useState(0);
    const [isLastPage, setIsLastPage] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
    const [fetchError, setFetchError] = useState(null);
    const [stats, setStats] = useState(EMPTY_STATS);

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
                sl_no: ((currentPage - 1) * itemsPerPage) + index + 1,
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
                    limit: itemsPerPage,
                    search: searchTrimmed
                }
            });

            if (response.data?.success) {
                const list = Array.isArray(response.data.data) ? response.data.data : [];
                const meta = response.data.meta || {};
                setBanks(list);
                setTotal(meta.total ?? 0);
                setIsLastPage(meta.is_last_page ?? true);
                setStats(normalizeBankStats(response.data?.stats));
                setFetchError(null);
            } else {
                setFetchError(response.data?.message || 'Failed to fetch bank list');
                setBanks([]);
                setStats(EMPTY_STATS);
            }
        } catch (error) {
            console.error('Error fetching banks:', error);
            const errMsg = error.response?.data?.message || error.message || 'Failed to fetch bank list';
            setFetchError(errMsg);
            toast.error(errMsg);
            setBanks([]);
            setStats(EMPTY_STATS);
        } finally {
            setFetchLoading(false);
        }
    }, [currentPage, itemsPerPage, debouncedSearchTerm]);

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

    // Close export dropdown when clicking outside; row actions menu uses its own handler
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (!event.target.closest('.dropdown-container')) {
                setShowAddDropdown(false);
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
        setActiveRowDropdown(null);
        actionAnchorRef.current = null;
    }, []);

    // Handle delete click - memoized
    const handleDeleteClick = useCallback((bank) => {
        setSelectedBank(bank);
        setShowDeleteModal(true);
        setActiveRowDropdown(null);
        actionAnchorRef.current = null;
    }, []);

    const updateDropdownPosition = useCallback((anchorEl) => {
        if (!anchorEl) return;
        const rect = anchorEl.getBoundingClientRect();
        const margin = 8;
        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceAbove = rect.top;
        const openUpward = spaceBelow < ACTIONS_MENU_HEIGHT + margin && spaceAbove > spaceBelow;

        let top;
        let bottom;
        if (openUpward) {
            top = undefined;
            bottom = Math.max(margin, window.innerHeight - rect.top + 4);
        } else {
            top = Math.min(rect.bottom + 4, window.innerHeight - ACTIONS_MENU_HEIGHT - margin);
            bottom = undefined;
        }

        const right = Math.max(
            margin,
            Math.min(window.innerWidth - rect.right, window.innerWidth - ACTIONS_MENU_WIDTH - margin)
        );

        setDropdownPos({
            top,
            bottom,
            right,
            left: undefined,
            openUpward,
        });
    }, []);

    const openActionsFromButton = useCallback((e, bankId) => {
        e.stopPropagation();
        if (activeRowDropdown === bankId) {
            setActiveRowDropdown(null);
            actionAnchorRef.current = null;
            return;
        }
        dropdownModeRef.current = 'button';
        actionAnchorRef.current = e.currentTarget;
        updateDropdownPosition(e.currentTarget);
        setActiveRowDropdown(bankId);
    }, [activeRowDropdown, updateDropdownPosition]);

    const openActionsFromContextMenu = useCallback((e, bankId) => {
        e.preventDefault();
        e.stopPropagation();
        dropdownModeRef.current = 'pointer';
        actionAnchorRef.current = null;
        const margin = 8;
        const left = Math.min(e.clientX, window.innerWidth - ACTIONS_MENU_WIDTH - margin);
        const top = Math.min(e.clientY, window.innerHeight - ACTIONS_MENU_HEIGHT - margin);
        setDropdownPos({
            top: Math.max(margin, top),
            left: Math.max(margin, left),
            right: undefined,
            bottom: undefined,
            openUpward: false,
        });
        setActiveRowDropdown(bankId);
    }, []);

    const activeBank = useMemo(
        () => banks.find((b) => b.bank_id === activeRowDropdown) || null,
        [banks, activeRowDropdown]
    );

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (
                !event.target.closest('[data-bank-actions-menu]') &&
                !event.target.closest('[data-bank-actions-trigger]')
            ) {
                setActiveRowDropdown(null);
                actionAnchorRef.current = null;
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (!activeRowDropdown) return undefined;

        const handleScrollOrResize = () => {
            if (dropdownModeRef.current === 'button' && actionAnchorRef.current) {
                updateDropdownPosition(actionAnchorRef.current);
                return;
            }
            if (dropdownModeRef.current === 'pointer') {
                setActiveRowDropdown(null);
                actionAnchorRef.current = null;
            }
        };

        window.addEventListener('scroll', handleScrollOrResize, true);
        window.addEventListener('resize', handleScrollOrResize);
        return () => {
            window.removeEventListener('scroll', handleScrollOrResize, true);
            window.removeEventListener('resize', handleScrollOrResize);
        };
    }, [activeRowDropdown, updateDropdownPosition]);

    // Get bank type name
    const getBankTypeName = useCallback((typeValue) => {
        const type = bankTypes.find(t => t.value === typeValue);
        return type ? type.name : typeValue;
    }, [bankTypes]);

    // Get bank type color
    const getBankTypeColor = useCallback((type) => {
        switch (type?.toLowerCase()) {
            case 'savings': return 'bg-emerald-100 text-emerald-700';
            case 'current': return 'bg-blue-100 text-blue-700';
            case 'loan': return 'bg-orange-100 text-orange-700';
            case 'cash': return 'bg-amber-100 text-amber-700';
            default: return 'bg-slate-100 text-slate-700';
        }
    }, []);

    // Handle page change
    const handlePageChange = useCallback((newPage) => {
        setCurrentPage(newPage);
    }, []);

    const handleLimitChange = useCallback((newLimit) => {
        setItemsPerPage(newLimit);
        setCurrentPage(1);
    }, []);

    // Handle refresh
    const handleRefresh = useCallback(() => {
        fetchBanks();
    }, [fetchBanks]);

    // Skeleton loader component
    const StatCardSkeleton = () => (
        <div className="animate-pulse rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-2 h-3 w-20 rounded bg-slate-200" />
            <div className="mb-2 h-5 w-16 rounded bg-slate-200" />
            <div className="h-4 w-24 rounded bg-slate-200" />
        </div>
    );

    const SkeletonRow = useCallback(() => (
        <tr className="animate-pulse border-b border-slate-100">
            <td className="p-2.5">
                <div className="mx-auto h-4 w-6 rounded bg-slate-200" />
            </td>
            <td className="p-2.5">
                <div className="mb-2 h-4 w-32 rounded bg-slate-200" />
                <div className="h-3 w-24 rounded bg-slate-200" />
            </td>
            <td className="p-2.5">
                <div className="h-4 w-28 rounded bg-slate-200" />
            </td>
            <td className="p-2.5">
                <div className="h-4 w-20 rounded bg-slate-200" />
            </td>
            <td className="p-2.5">
                <div className="h-6 w-16 rounded bg-slate-200" />
            </td>
            <td className="p-2.5">
                <div className="ml-auto h-4 w-20 rounded bg-slate-200" />
            </td>
            <td className="p-2.5">
                <div className="mx-auto h-8 w-8 rounded bg-slate-200" />
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
                <div className="mx-auto max-w-full px-4 py-6 sm:px-6 lg:px-8">
                    <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        {fetchLoading && banks.length === 0 ? (
                            <>
                                <StatCardSkeleton />
                                <StatCardSkeleton />
                                <StatCardSkeleton />
                                <StatCardSkeleton />
                            </>
                        ) : (
                            BANK_TYPE_CARDS.map(({ key, label, gradient, labelClass, Icon }, index) => {
                                const typeStats = stats.by_type[key] || EMPTY_TYPE_STATS;
                                const accountLabel = typeStats.count === 1 ? 'account' : 'accounts';

                                return (
                                    <motion.div
                                        key={key}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.2, delay: index * 0.05 }}
                                        className={`rounded-lg bg-gradient-to-r ${gradient} p-4 text-white shadow-md`}
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <p className={`text-xs font-medium ${labelClass}`}>{label}</p>
                                                <h3 className="mt-1 text-lg font-bold tabular-nums">
                                                    {typeStats.count} {accountLabel}
                                                </h3>
                                                <p className="mt-1 text-sm font-semibold tabular-nums opacity-95">
                                                    ₹{formatCurrency(typeStats.balance)}
                                                </p>
                                            </div>
                                            <Icon className="h-5 w-5 shrink-0 opacity-80" />
                                        </div>
                                    </motion.div>
                                );
                            })
                        )}
                    </div>

                    <motion.div
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg"
                    >
                        <div className="sticky top-0 z-10 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white px-3 py-2.5 sm:px-4">
                            <div className="flex min-w-0 flex-col gap-2 xl:flex-row xl:items-center xl:justify-between xl:gap-3">
                                <div className="flex shrink-0 items-center gap-2">
                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-100">
                                        <FiCreditCard className="h-4 w-4 text-blue-600" />
                                    </div>
                                    <h5 className="shrink-0 text-sm font-bold tracking-tight text-slate-800 sm:text-base">
                                        Bank Register
                                    </h5>
                                </div>

                                <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end sm:gap-2">
                                    <div className="relative ml-auto w-full min-w-0 sm:ml-0 sm:w-60">
                                        <FiSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                        <input
                                            type="text"
                                            placeholder="Search banks..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="h-9 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>

                                    <motion.button
                                        type="button"
                                        onClick={handleRefresh}
                                        title="Refresh"
                                        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition-all hover:bg-slate-50"
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        <FiRefreshCw className="h-4 w-4" />
                                    </motion.button>

                                    <div className="dropdown-container relative shrink-0">
                                        <motion.button
                                            type="button"
                                            onClick={() => setShowAddDropdown(!showAddDropdown)}
                                            className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition-all hover:bg-slate-50 sm:h-10 sm:w-auto sm:px-4"
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                        >
                                            <PiExportBold className="h-4 w-4 shrink-0" />
                                            <span>Export</span>
                                            <FiChevronRight className={`h-3.5 w-3.5 shrink-0 transition-transform ${showAddDropdown ? 'rotate-90' : ''}`} />
                                        </motion.button>

                                        <AnimatePresence>
                                            {showAddDropdown && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: 5 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, y: 5 }}
                                                    className="absolute right-0 z-50 mt-1 w-56 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl"
                                                >
                                                    <div className="py-1">
                                                        <button
                                                            type="button"
                                                            onClick={handleExportClick}
                                                            className="flex w-full items-center px-3 py-2 text-sm text-slate-700 transition-all duration-150 hover:bg-blue-50"
                                                        >
                                                            <div className="mr-2 rounded bg-red-50 p-1.5">
                                                                <PiFilePdfDuotone className="h-3.5 w-3.5 text-red-500" />
                                                            </div>
                                                            <span className="text-xs font-medium">Export as PDF</span>
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={handleExportClick}
                                                            className="flex w-full items-center px-3 py-2 text-sm text-slate-700 transition-all duration-150 hover:bg-blue-50"
                                                        >
                                                            <div className="mr-2 rounded bg-green-50 p-1.5">
                                                                <PiMicrosoftExcelLogoDuotone className="h-3.5 w-3.5 text-green-500" />
                                                            </div>
                                                            <span className="text-xs font-medium">Export as Excel</span>
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleOtherExport('print')}
                                                            className="flex w-full items-center px-3 py-2 text-sm text-slate-700 transition-all duration-150 hover:bg-blue-50"
                                                        >
                                                            <div className="mr-2 rounded bg-slate-50 p-1.5">
                                                                <FiPrinter className="h-3.5 w-3.5 text-slate-600" />
                                                            </div>
                                                            <span className="text-xs font-medium">Print Report</span>
                                                        </button>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>

                                    <motion.button
                                        type="button"
                                        onClick={() => setShowAddModal(true)}
                                        className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 px-3 text-sm font-semibold text-white shadow-sm transition-all hover:from-blue-700 hover:to-blue-800 sm:h-10 sm:px-4"
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        <FiPlus className="h-4 w-4 shrink-0" />
                                        <span className="whitespace-nowrap">Add Bank</span>
                                    </motion.button>
                                </div>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[820px] text-sm">
                                <thead>
                                    <tr className="bg-gradient-to-r from-slate-50 to-slate-100">
                                        <th className="w-12 p-2.5 text-center text-xs font-semibold uppercase tracking-wider text-slate-700">#</th>
                                        <th className="min-w-[140px] p-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-700">Account Holder</th>
                                        <th className="min-w-[180px] p-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-700">Bank Details</th>
                                        <th className="min-w-[120px] p-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-700">IFSC</th>
                                        <th className="w-24 p-2.5 text-center text-xs font-semibold uppercase tracking-wider text-slate-700">Type</th>
                                        <th className="w-28 p-2.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-700">Balance</th>
                                        <th className="w-16 p-2.5 text-center text-xs font-semibold uppercase tracking-wider text-slate-700">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {fetchError && !fetchLoading ? (
                                        <tr>
                                            <td colSpan="7" className="py-10 text-center">
                                                <div className="flex flex-col items-center justify-center">
                                                    <p className="mb-2 font-medium text-red-600">{fetchError}</p>
                                                    <motion.button
                                                        type="button"
                                                        onClick={handleRefresh}
                                                        className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
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
                                            <td colSpan="7" className="py-10 text-center">
                                                <div className="flex flex-col items-center justify-center">
                                                    <div className="mb-3 rounded-full bg-slate-100 p-3">
                                                        <FiCreditCard className="h-8 w-8 text-slate-400" />
                                                    </div>
                                                    <p className="mb-1 text-base font-medium text-slate-600">No bank accounts found</p>
                                                    <p className="mb-4 text-sm text-slate-500">Get started by adding your first bank account</p>
                                                    <motion.button
                                                        type="button"
                                                        onClick={() => setShowAddModal(true)}
                                                        className="rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:from-blue-700 hover:to-blue-800"
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
                                            const isPositive = bank.balance > 0;

                                            return (
                                                <motion.tr
                                                    key={bank.bank_id}
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    transition={{ duration: 0.2 }}
                                                    className="transition-colors duration-150 hover:bg-blue-50/30"
                                                    onContextMenu={(e) => openActionsFromContextMenu(e, bank.bank_id)}
                                                >
                                                    <td className="p-2.5 text-center">
                                                        <span className="font-medium text-slate-600">
                                                            {(currentPage - 1) * itemsPerPage + index + 1}
                                                        </span>
                                                    </td>
                                                    <td className="p-2.5">
                                                        <span className="font-medium text-slate-700">
                                                            {bank.holder}
                                                        </span>
                                                    </td>
                                                    <td className="p-2.5">
                                                        <div>
                                                            <div className="font-semibold text-slate-800">
                                                                {bank.bank}
                                                            </div>
                                                            <div className="mt-0.5 text-xs text-slate-500">
                                                                {bank.account_no}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="p-2.5">
                                                        <div className="space-y-1">
                                                            {bank.ifsc ? (
                                                                <span className="inline-flex rounded-lg border border-slate-200 bg-slate-100 px-2 py-1 font-mono text-xs text-slate-700">
                                                                    {bank.ifsc}
                                                                </span>
                                                            ) : null}
                                                            {bank.branch ? (
                                                                <div className="text-xs text-slate-500">{bank.branch}</div>
                                                            ) : null}
                                                        </div>
                                                    </td>
                                                    <td className="p-2.5 text-center">
                                                        <span className={`rounded-lg px-2.5 py-1 text-xs font-medium capitalize ${getBankTypeColor(bank.type)}`}>
                                                            {getBankTypeName(bank.type)}
                                                        </span>
                                                    </td>
                                                    <td className="p-2.5 text-right">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleBalanceClick(bank)}
                                                            className={`inline-flex items-center justify-end text-sm font-bold transition-all duration-200 ${isPositive ? 'text-green-600 hover:text-green-700' : 'text-red-600 hover:text-red-700'
                                                                }`}
                                                        >
                                                            {isPositive ? '+' : '-'} ₹{formatCurrency(Math.abs(bank.balance))}
                                                        </button>
                                                    </td>
                                                    <td className="p-2.5">
                                                        <div className="flex justify-center">
                                                            <motion.button
                                                                type="button"
                                                                data-bank-actions-trigger
                                                                className="rounded-lg border border-slate-200 p-2 text-slate-500 transition-colors duration-150 hover:bg-blue-50 hover:text-blue-600"
                                                                onClick={(e) => openActionsFromButton(e, bank.bank_id)}
                                                                whileHover={{ scale: 1.05 }}
                                                                whileTap={{ scale: 0.95 }}
                                                            >
                                                                <FiMenu className="h-4 w-4" />
                                                            </motion.button>
                                                        </div>
                                                    </td>
                                                </motion.tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {!fetchError && (banks.length > 0 || total > 0) && (
                            <TablePagination
                                page={currentPage}
                                limit={itemsPerPage}
                                total={total}
                                totalPages={Math.max(1, Math.ceil(total / (itemsPerPage || 1)))}
                                isLastPage={isLastPage}
                                rowOptions={[10, 20, 50, 100]}
                                defaultRows={10}
                                onPageChange={handlePageChange}
                                onLimitChange={handleLimitChange}
                            />
                        )}
                    </motion.div>
                </div>
            </div>

            {activeRowDropdown && activeBank && createPortal(
                <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    data-bank-actions-menu
                    className="fixed z-[10040] w-48 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-xl"
                    style={{
                        top: dropdownPos.top,
                        bottom: dropdownPos.bottom,
                        right: dropdownPos.right,
                        left: dropdownPos.left,
                        minWidth: ACTIONS_MENU_WIDTH,
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                >
                    <button
                        type="button"
                        onClick={() => {
                            handleEditClick(activeBank);
                        }}
                        className="flex w-full items-center px-3 py-2 text-sm text-slate-700 transition-colors duration-150 hover:bg-blue-50"
                    >
                        <div className="mr-2 rounded-lg bg-blue-50 p-1.5">
                            <FiEdit className="h-4 w-4 text-blue-500" />
                        </div>
                        <span>Edit Bank</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => handleDeleteClick(activeBank)}
                        className="flex w-full items-center px-3 py-2 text-sm text-slate-700 transition-colors duration-150 hover:bg-red-50"
                    >
                        <div className="mr-2 rounded-lg bg-red-50 p-1.5">
                            <FiTrash2 className="h-4 w-4 text-red-500" />
                        </div>
                        <span>Delete Bank</span>
                    </button>
                    <div className="my-1 border-t border-slate-100" />
                    <a
                        href={`/view-bank-ledger?bank_id=${activeBank.bank_id}`}
                        className="flex w-full items-center px-3 py-2 text-sm text-slate-700 no-underline transition-colors duration-150 hover:bg-blue-50"
                        onClick={() => {
                            setActiveRowDropdown(null);
                            actionAnchorRef.current = null;
                        }}
                    >
                        <div className="mr-2 rounded-lg bg-green-50 p-1.5">
                            <FiFileText className="h-4 w-4 text-green-500" />
                        </div>
                        <span>View Ledger</span>
                    </a>
                    <button
                        type="button"
                        onClick={() => {
                            handleOtherExport('print', activeBank);
                            setActiveRowDropdown(null);
                            actionAnchorRef.current = null;
                        }}
                        className="flex w-full items-center px-3 py-2 text-sm text-slate-700 transition-colors duration-150 hover:bg-blue-50"
                    >
                        <div className="mr-2 rounded-lg bg-slate-50 p-1.5">
                            <FiPrinter className="h-4 w-4 text-slate-600" />
                        </div>
                        <span>Print</span>
                    </button>
                </motion.div>,
                document.body
            )}

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