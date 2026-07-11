import React, { useState, useEffect } from 'react';
import {
    FiDatabase,
    FiDownload,
    FiMail,
    FiChevronDown,
    FiChevronUp,
    FiClock,
    FiCheckCircle,
    FiAlertTriangle,
    FiRefreshCw,
    FiTrash2,
    FiFileText,
    FiSettings,
    FiBriefcase,
    FiUsers,
    FiDollarSign,
    FiCalendar,
    FiUserCheck,
    FiShield,
    FiLayers,
} from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { Header, Sidebar } from '../../components/header';
import API_BASE_URL from '../../utils/api-controller';
import getHeaders from '../../utils/get-headers';

const SECTION_INFO = {
    tasks: {
        title: 'Tasks',
        description: 'Branch tasks, descriptions, and statuses',
        icon: FiBriefcase,
        card: 'border-blue-200 bg-gradient-to-br from-blue-50 to-sky-50',
        badge: 'bg-blue-100 text-blue-700',
        ring: 'ring-blue-400',
        dot: 'bg-blue-500',
    },
    clients: {
        title: 'Clients & Firms',
        description: 'Branch clients, profiles, and associated firms',
        icon: FiUsers,
        card: 'border-emerald-200 bg-gradient-to-br from-emerald-50 to-green-50',
        badge: 'bg-emerald-100 text-emerald-700',
        ring: 'ring-emerald-400',
        dot: 'bg-emerald-500',
    },
    finance: {
        title: 'Finance Transactions',
        description: 'Financial ledger transactions',
        icon: FiDollarSign,
        card: 'border-violet-200 bg-gradient-to-br from-violet-50 to-purple-50',
        badge: 'bg-violet-100 text-violet-700',
        ring: 'ring-violet-400',
        dot: 'bg-violet-500',
    },
    recurring_tasks: {
        title: 'Compliance & Schedules',
        description: 'Compliance assignments and calendar schedules',
        icon: FiCalendar,
        card: 'border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50',
        badge: 'bg-amber-100 text-amber-800',
        ring: 'ring-amber-400',
        dot: 'bg-amber-500',
    },
    billing: {
        title: 'Billing Invoices',
        description: 'Generated billing invoices',
        icon: FiFileText,
        card: 'border-rose-200 bg-gradient-to-br from-rose-50 to-pink-50',
        badge: 'bg-rose-100 text-rose-700',
        ring: 'ring-rose-400',
        dot: 'bg-rose-500',
    },
    staff_management: {
        title: 'Staff & Attendance',
        description: 'Active staff mapping list and daily attendance logs',
        icon: FiUserCheck,
        card: 'border-teal-200 bg-gradient-to-br from-teal-50 to-cyan-50',
        badge: 'bg-teal-100 text-teal-700',
        ring: 'ring-teal-400',
        dot: 'bg-teal-500',
    },
};

const EXPORT_FORMATS = [
    { id: 'excel', label: 'Excel', color: 'from-green-500 to-emerald-600' },
    { id: 'csv', label: 'CSV', color: 'from-sky-500 to-blue-600' },
    { id: 'pdf', label: 'PDF', color: 'from-rose-500 to-red-600' },
    { id: 'json', label: 'JSON', color: 'from-violet-500 to-purple-600' },
];

const DELIVERY_OPTIONS = [
    { id: 'download', label: 'Download', icon: FiDownload, color: 'from-indigo-500 to-blue-600' },
    { id: 'email', label: 'Email', icon: FiMail, color: 'from-fuchsia-500 to-pink-600' },
];

const formatBtnClass = (active) =>
    `py-2 px-3 text-sm font-bold rounded-lg border text-center transition-all ${
        active
            ? 'bg-gradient-to-r text-white border-transparent shadow-md scale-[1.02]'
            : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300'
    }`;

const Backup = () => {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(() => {
        const saved = localStorage.getItem('sidebarMinimized');
        return saved ? JSON.parse(saved) : false;
    });

    const [summaryLoading, setSummaryLoading] = useState(true);
    const [summaryData, setSummaryData] = useState({});
    const [branchMeta, setBranchMeta] = useState({ branchId: '', branchName: '' });

    const [selectedSections, setSelectedSections] = useState(
        Object.keys(SECTION_INFO)
    );
    const [exportType, setExportType] = useState('excel');
    const [deliveryMethod, setDeliveryMethod] = useState('download');
    const [recipientEmail, setRecipientEmail] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const [backupHistory, setBackupHistory] = useState([]);
    const [expandedRow, setExpandedRow] = useState(null);
    const [individualLoading, setIndividualLoading] = useState({});

    const [showProgressModal, setShowProgressModal] = useState(false);
    const [progressPercent, setProgressPercent] = useState(0);
    const [progressStatusText, setProgressStatusText] = useState('');

    useEffect(() => {
        localStorage.setItem('sidebarMinimized', JSON.stringify(isMinimized));
    }, [isMinimized]);

    useEffect(() => {
        document.body.style.overflow = mobileMenuOpen ? 'hidden' : 'auto';
        return () => {
            document.body.style.overflow = 'auto';
        };
    }, [mobileMenuOpen]);

    useEffect(() => {
        const branchId = localStorage.getItem('branch_id') || '';
        const branchName = localStorage.getItem('branch_name') || '';
        setBranchMeta({ branchId, branchName });

        const userDataStr = localStorage.getItem('userData');
        if (userDataStr) {
            try {
                const u = JSON.parse(userDataStr);
                const email = u?.profile?.email || u?.email || '';
                if (email) setRecipientEmail(email);
            } catch (e) {
                console.error('Error reading userData for email prefill:', e);
            }
        }

        fetchSummary();

        if (branchId) {
            const key = `ooms_backup_history_${branchId}`;
            const history = localStorage.getItem(key);
            if (history) {
                try {
                    setBackupHistory(JSON.parse(history));
                } catch (e) {
                    console.error('Error parsing backup history', e);
                }
            }
        }
    }, []);

    const fetchSummary = async () => {
        setSummaryLoading(true);
        const headers = getHeaders();
        if (!headers) {
            setSummaryLoading(false);
            toast.error('Authentication headers missing. Please log in again.');
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/backup/summary`, {
                method: 'GET',
                headers,
            });
            const result = await response.json();
            if (result.success) {
                setSummaryData(result.data || {});
            } else {
                toast.error(result.message || 'Failed to retrieve backup summary');
            }
        } catch (error) {
            console.error('Error fetching backup summary:', error);
            toast.error('Network error while loading backup stats.');
        } finally {
            setSummaryLoading(false);
        }
    };

    const getFullUrl = (url) => {
        if (!url) return '';
        if (url.startsWith('http://') || url.startsWith('https://')) return url;
        const base = API_BASE_URL.replace('/api/v1', '');
        return `${base}${url}`;
    };

    const triggerBackupDownload = async (downloadUrl, fileName) => {
        const headers = getHeaders();
        if (!headers) throw new Error('Unauthorized');

        const targetUrl = getFullUrl(downloadUrl);
        const response = await fetch(targetUrl, { method: 'GET', headers });

        if (!response.ok) {
            const errData = await response
                .json()
                .catch(() => ({ message: 'Failed to download backup file' }));
            throw new Error(errData.message || `HTTP status: ${response.status}`);
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', fileName);
        document.body.appendChild(link);
        link.click();
        link.parentNode.removeChild(link);
        window.URL.revokeObjectURL(url);
    };

    const startProgressSimulation = () => {
        setProgressPercent(0);
        setShowProgressModal(true);

        const statusTexts = [
            { limit: 20, text: 'Preparing selected modules...' },
            { limit: 55, text: 'Compiling export data...' },
            { limit: 80, text: 'Building your backup file...' },
            { limit: 95, text: 'Finalizing export...' },
        ];

        setProgressStatusText(statusTexts[0].text);

        const intervalId = setInterval(() => {
            setProgressPercent((prev) => {
                const next = prev + Math.floor(Math.random() * 4) + 1;
                const currentTextObj = statusTexts.find((s) => next <= s.limit);
                if (currentTextObj) setProgressStatusText(currentTextObj.text);
                if (next >= 95) {
                    clearInterval(intervalId);
                    return 95;
                }
                return next;
            });
        }, 150);

        return intervalId;
    };

    const completeProgressSimulation = (intervalId, isSuccess) => {
        if (intervalId) clearInterval(intervalId);
        setProgressPercent(100);
        setProgressStatusText(isSuccess ? 'Backup completed successfully!' : 'Backup failed.');
        setTimeout(() => setShowProgressModal(false), 800);
    };

    const persistHistory = (items) => {
        const branchId = branchMeta.branchId || localStorage.getItem('branch_id') || '';
        if (branchId) {
            localStorage.setItem(`ooms_backup_history_${branchId}`, JSON.stringify(items));
        }
    };

    const appendHistoryItem = (item) => {
        setBackupHistory((prev) => {
            const updated = [item, ...prev];
            persistHistory(updated);
            return updated;
        });
    };

    const updateHistoryItem = (id, updates) => {
        setBackupHistory((prev) => {
            const updated = prev.map((item) =>
                item.id === id ? { ...item, ...updates } : item
            );
            persistHistory(updated);
            return updated;
        });
    };

    const deleteHistoryItem = (id, e) => {
        if (e) e.stopPropagation();
        if (!window.confirm('Are you sure you want to delete this backup log?')) return;

        setBackupHistory((prev) => {
            const updated = prev.filter((item) => item.id !== id);
            persistHistory(updated);
            return updated;
        });
        toast.success('Backup log removed from history.');
    };

    const clearAllHistory = () => {
        if (!window.confirm('Are you sure you want to clear all backup history?')) return;
        setBackupHistory([]);
        if (branchMeta.branchId) {
            localStorage.removeItem(`ooms_backup_history_${branchMeta.branchId}`);
        }
        toast.success('Backup history cleared.');
    };

    const toggleSection = (key) => {
        setSelectedSections((prev) =>
            prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key]
        );
    };

    const handleSelectAll = (checked) => {
        setSelectedSections(checked ? Object.keys(SECTION_INFO) : []);
    };

    const handleRunBackup = async (e) => {
        if (e) e.preventDefault();

        if (selectedSections.length === 0) {
            toast.error('Please select at least one module.');
            return;
        }

        if (deliveryMethod === 'email' && !recipientEmail.trim()) {
            toast.error('Please provide a recipient email address.');
            return;
        }

        const headers = getHeaders();
        if (!headers) {
            toast.error('Session expired. Please log in again.');
            return;
        }

        setSubmitting(true);
        const progressInterval = startProgressSimulation();
        const backupId = Date.now().toString();
        const runDate = new Date().toISOString();

        appendHistoryItem({
            id: backupId,
            date: runDate,
            sections: [...selectedSections],
            export_type: exportType,
            delivery_method: deliveryMethod,
            recipient_email: deliveryMethod === 'email' ? recipientEmail : '',
            status: 'pending',
            message: 'Generating backup file...',
        });

        try {
            const body = {
                sections:
                    selectedSections.length === Object.keys(SECTION_INFO).length
                        ? 'all'
                        : selectedSections,
                export_type: exportType,
                delivery_method: deliveryMethod,
            };

            if (deliveryMethod === 'email') body.recipient_email = recipientEmail;

            const response = await fetch(`${API_BASE_URL}/backup/run`, {
                method: 'POST',
                headers,
                body: JSON.stringify(body),
            });

            const result = await response.json();

            if (result.success) {
                if (deliveryMethod === 'download') {
                    const downloadUrl = result.data?.download_url;
                    const fileName = result.data?.file_name;

                    if (downloadUrl) {
                        completeProgressSimulation(progressInterval, true);
                        toast.promise(triggerBackupDownload(downloadUrl, fileName), {
                            loading: 'Downloading file...',
                            success: <b>Backup downloaded successfully!</b>,
                            error: (err) => <b>Download failed: {err.message}</b>,
                        });
                        updateHistoryItem(backupId, {
                            status: 'success',
                            message: result.message || 'Backup completed successfully.',
                            download_url: downloadUrl,
                            file_name: fileName,
                        });
                    } else {
                        throw new Error('Missing download URL in API response.');
                    }
                } else {
                    completeProgressSimulation(progressInterval, true);
                    toast.success(result.message || 'Backup emailed successfully.');
                    updateHistoryItem(backupId, {
                        status: 'success',
                        message: result.message || 'Backup sent via email.',
                    });
                }
            } else {
                throw new Error(result.message || 'Execution failed on server.');
            }
        } catch (error) {
            console.error('Backup trigger failed:', error);
            completeProgressSimulation(progressInterval, false);
            toast.error(error.message || 'An unexpected error occurred.');
            updateHistoryItem(backupId, {
                status: 'failed',
                message: error.message || 'Server error during backup generation.',
            });
        } finally {
            setSubmitting(false);
        }
    };

    const handleIndividualBackup = async (historyItem, sectionsToExport, targetMethod) => {
        const headers = getHeaders();
        if (!headers) {
            toast.error('Auth headers not found. Please log in again.');
            return;
        }

        const runId = `${historyItem.id}_${sectionsToExport.join('_')}_${targetMethod}`;
        setIndividualLoading((prev) => ({ ...prev, [runId]: true }));
        const progressInterval = startProgressSimulation();

        try {
            const body = {
                sections: sectionsToExport,
                export_type: historyItem.export_type,
                delivery_method: targetMethod,
            };

            if (targetMethod === 'email') {
                if (!historyItem.recipient_email && !recipientEmail) {
                    toast.error('Email recipient is missing.');
                    return;
                }
                body.recipient_email = historyItem.recipient_email || recipientEmail;
            }

            const response = await fetch(`${API_BASE_URL}/backup/run`, {
                method: 'POST',
                headers,
                body: JSON.stringify(body),
            });

            const result = await response.json();

            if (result.success) {
                completeProgressSimulation(progressInterval, true);
                if (targetMethod === 'download') {
                    const downloadUrl = result.data?.download_url;
                    const fileName = result.data?.file_name;
                    if (downloadUrl) {
                        await triggerBackupDownload(downloadUrl, fileName);
                        toast.success('Backup segment downloaded.');
                    } else {
                        throw new Error('Download path missing from API response.');
                    }
                } else {
                    toast.success(result.message || 'Segment email sent.');
                }

                appendHistoryItem({
                    id: Date.now().toString(),
                    date: new Date().toISOString(),
                    sections: sectionsToExport,
                    export_type: historyItem.export_type,
                    delivery_method: targetMethod,
                    recipient_email:
                        targetMethod === 'email'
                            ? historyItem.recipient_email || recipientEmail
                            : '',
                    status: 'success',
                    message: result.message || 'Selective backup completed.',
                    download_url:
                        targetMethod === 'download' ? result.data?.download_url : undefined,
                    file_name:
                        targetMethod === 'download' ? result.data?.file_name : undefined,
                });
            } else {
                throw new Error(result.message || 'Failed to trigger selective backup.');
            }
        } catch (error) {
            console.error('Selective run error:', error);
            completeProgressSimulation(progressInterval, false);
            toast.error(`Export failed: ${error.message}`);
        } finally {
            setIndividualLoading((prev) => ({ ...prev, [runId]: false }));
        }
    };

    const totalRecords = Object.keys(SECTION_INFO).reduce((sum, key) => {
        return sum + (summaryData[key]?.count || 0);
    }, 0);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/40 to-purple-50/30">
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

            <div
                className={`pt-16 transition-all duration-300 ease-in-out ${
                    isMinimized ? 'md:pl-20' : 'md:pl-[260px]'
                }`}
            >
                <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-6">
                    {/* Hero */}
                    <div className="mb-6 rounded-2xl bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 p-[1px] shadow-lg shadow-indigo-200/50">
                        <div className="rounded-2xl bg-white/95 backdrop-blur px-5 py-5 sm:px-6 sm:py-6">
                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-md shrink-0">
                                        <FiDatabase className="w-6 h-6 text-white" />
                                    </div>
                                    <div>
                                        <h1 className="text-2xl font-bold text-gray-900">
                                            Backup & Export
                                        </h1>
                                        <p className="text-gray-600 mt-1 text-sm max-w-xl">
                                            Export branch data to Excel, CSV, PDF, or JSON. Download
                                            instantly or receive by email.
                                        </p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={fetchSummary}
                                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-colors"
                                >
                                    <FiRefreshCw
                                        className={`w-4 h-4 ${summaryLoading ? 'animate-spin' : ''}`}
                                    />
                                    Refresh stats
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Quick stats */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                        {[
                            {
                                label: 'Modules',
                                value: Object.keys(SECTION_INFO).length,
                                icon: FiLayers,
                                tone: 'text-indigo-600 bg-indigo-50',
                            },
                            {
                                label: 'Selected',
                                value: selectedSections.length,
                                icon: FiCheckCircle,
                                tone: 'text-emerald-600 bg-emerald-50',
                            },
                            {
                                label: 'Total records',
                                value: summaryLoading ? '…' : totalRecords,
                                icon: FiDatabase,
                                tone: 'text-violet-600 bg-violet-50',
                            },
                            {
                                label: 'History',
                                value: backupHistory.length,
                                icon: FiClock,
                                tone: 'text-amber-600 bg-amber-50',
                            },
                        ].map((stat) => (
                            <div
                                key={stat.label}
                                className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3"
                            >
                                <div
                                    className={`w-10 h-10 rounded-lg flex items-center justify-center ${stat.tone}`}
                                >
                                    <stat.icon className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 font-medium">{stat.label}</p>
                                    <p className="text-lg font-bold text-gray-900">{stat.value}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                        {/* Config form */}
                        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <span className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center">
                                    <FiSettings className="w-4 h-4" />
                                </span>
                                Configure backup
                            </h2>

                            <form onSubmit={handleRunBackup}>
                                <div className="mb-6">
                                    <div className="flex justify-between items-center mb-3">
                                        <label className="text-sm font-semibold text-gray-800">
                                            Modules to include
                                        </label>
                                        <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={
                                                    selectedSections.length ===
                                                    Object.keys(SECTION_INFO).length
                                                }
                                                onChange={(e) => handleSelectAll(e.target.checked)}
                                                className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                                            />
                                            Select all
                                        </label>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {Object.keys(SECTION_INFO).map((key) => {
                                            const sec = SECTION_INFO[key];
                                            const Icon = sec.icon;
                                            const isSelected = selectedSections.includes(key);
                                            const stat = summaryData[key];
                                            const inputId = `backup-module-${key}`;

                                            return (
                                                <label
                                                    key={key}
                                                    htmlFor={inputId}
                                                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all duration-200 ${
                                                        isSelected
                                                            ? `${sec.card} shadow-sm ring-2 ${sec.ring} ring-offset-1`
                                                            : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50/50'
                                                    }`}
                                                >
                                                    <input
                                                        id={inputId}
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={() => toggleSection(key)}
                                                        className="mt-0.5 w-5 h-5 shrink-0 rounded border-gray-300 text-indigo-600 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-0 cursor-pointer"
                                                    />
                                                    <div className="flex flex-1 items-start justify-between gap-2 min-w-0">
                                                        <div className="flex items-start gap-3 min-w-0">
                                                            <span
                                                                className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${sec.badge}`}
                                                            >
                                                                <Icon className="w-4 h-4" />
                                                            </span>
                                                            <div className="min-w-0">
                                                                <p className="text-sm font-bold text-gray-900">
                                                                    {sec.title}
                                                                </p>
                                                                <p className="text-xs text-gray-500 mt-0.5">
                                                                    {sec.description}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <span
                                                            className={`text-[11px] font-bold px-2 py-1 rounded-full shrink-0 ${sec.badge}`}
                                                        >
                                                            {summaryLoading
                                                                ? '…'
                                                                : `${stat?.count ?? 0} rows`}
                                                        </span>
                                                    </div>
                                                </label>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-800 mb-2">
                                            Export file format
                                        </label>
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                            {EXPORT_FORMATS.map((format) => (
                                                <button
                                                    key={format.id}
                                                    type="button"
                                                    onClick={() => setExportType(format.id)}
                                                    className={`${formatBtnClass(
                                                        exportType === format.id
                                                    )} ${
                                                        exportType === format.id
                                                            ? format.color
                                                            : ''
                                                    }`}
                                                >
                                                    {format.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-800 mb-2">
                                            Delivery destination
                                        </label>
                                        <div className="flex flex-wrap gap-2">
                                            {DELIVERY_OPTIONS.map((option) => {
                                                const Icon = option.icon;
                                                const active = deliveryMethod === option.id;
                                                return (
                                                    <button
                                                        key={option.id}
                                                        type="button"
                                                        onClick={() =>
                                                            setDeliveryMethod(option.id)
                                                        }
                                                        className={`${formatBtnClass(active)} ${
                                                            active ? option.color : ''
                                                        } inline-flex items-center justify-center gap-2 px-4 py-2 min-w-[8.5rem] whitespace-nowrap`}
                                                    >
                                                        <Icon className="w-4 h-4 shrink-0" />
                                                        <span>{option.label}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>

                                <AnimatePresence>
                                    {deliveryMethod === 'email' && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            className="mb-6 overflow-hidden"
                                        >
                                            <label className="block text-sm font-semibold text-gray-800 mb-2">
                                                Recipient email
                                            </label>
                                            <div className="relative">
                                                <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                                <input
                                                    type="email"
                                                    placeholder="recipient@example.com"
                                                    value={recipientEmail}
                                                    onChange={(e) =>
                                                        setRecipientEmail(e.target.value)
                                                    }
                                                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                                                    required
                                                />
                                            </div>
                                            <p className="text-xs text-gray-500 mt-1.5">
                                                The backup will be sent as an email attachment.
                                            </p>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                <button
                                    type="submit"
                                    disabled={submitting || summaryLoading}
                                    className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {submitting ? (
                                        <>
                                            <FiRefreshCw className="w-5 h-5 animate-spin" />
                                            Creating backup…
                                        </>
                                    ) : (
                                        <>
                                            <FiDownload className="w-5 h-5" />
                                            Run backup
                                        </>
                                    )}
                                </button>
                            </form>
                        </div>

                        {/* Branch sidebar */}
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 h-fit">
                            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <span className="w-8 h-8 rounded-lg bg-violet-100 text-violet-600 flex items-center justify-center">
                                    <FiShield className="w-4 h-4" />
                                </span>
                                Branch overview
                            </h2>

                            <div className="space-y-3 mb-5">
                                <div className="rounded-xl bg-gradient-to-r from-violet-50 to-indigo-50 border border-violet-100 p-4">
                                    <p className="text-xs font-semibold text-violet-600 uppercase tracking-wide mb-1">
                                        Active branch
                                    </p>
                                    <p className="text-base font-bold text-gray-900">
                                        {branchMeta.branchName || branchMeta.branchId || '—'}
                                    </p>
                                </div>

                                <div className="flex items-center justify-between py-2 px-1 text-sm">
                                    <span className="text-gray-500">Available modules</span>
                                    <span className="font-bold text-indigo-600">
                                        {Object.keys(SECTION_INFO).length}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between py-2 px-1 text-sm border-t border-gray-100">
                                    <span className="text-gray-500">Export formats</span>
                                    <span className="font-bold text-gray-800">Excel · CSV · PDF · JSON</span>
                                </div>
                            </div>

                            <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-4">
                                <p className="text-xs font-bold text-emerald-800 flex items-center gap-1.5 mb-1">
                                    <FiCheckCircle className="w-4 h-4" />
                                    Secure export
                                </p>
                                <p className="text-xs text-emerald-700 leading-relaxed">
                                    Backups are scoped to your current branch and include only the
                                    modules you select.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* History */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="border-b border-gray-100 px-6 py-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                    <FiClock className="w-5 h-5 text-indigo-500" />
                                    Backup history
                                </h3>
                                <p className="text-sm text-gray-500 mt-0.5">
                                    Past exports for this branch. Expand a row to re-download
                                    individual modules.
                                </p>
                            </div>
                            {backupHistory.length > 0 && (
                                <button
                                    type="button"
                                    onClick={clearAllHistory}
                                    className="px-3 py-1.5 text-xs font-semibold bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg flex items-center gap-1.5"
                                >
                                    <FiTrash2 className="w-3.5 h-3.5" />
                                    Clear history
                                </button>
                            )}
                        </div>

                        <div className="overflow-x-auto">
                            {backupHistory.length === 0 ? (
                                <div className="p-12 text-center">
                                    <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-indigo-50 flex items-center justify-center">
                                        <FiDatabase className="w-8 h-8 text-indigo-400" />
                                    </div>
                                    <p className="text-gray-600 font-medium">No backups yet</p>
                                    <p className="text-gray-400 text-sm mt-1 max-w-sm mx-auto">
                                        Run a backup above to see your export history here.
                                    </p>
                                </div>
                            ) : (
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-gray-50/80 border-b border-gray-100 text-xs font-bold text-gray-500 uppercase tracking-wider">
                                            <th className="py-3 px-6 w-10" />
                                            <th className="py-3 px-6">Date & time</th>
                                            <th className="py-3 px-6">Format</th>
                                            <th className="py-3 px-6">Delivery</th>
                                            <th className="py-3 px-6">Modules</th>
                                            <th className="py-3 px-6">Status</th>
                                            <th className="py-3 px-6 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50 text-sm">
                                        {backupHistory.map((item) => {
                                            const isExpanded = expandedRow === item.id;
                                            const displaySections =
                                                item.sections === 'all'
                                                    ? Object.keys(SECTION_INFO)
                                                    : Array.isArray(item.sections)
                                                      ? item.sections
                                                      : [];

                                            return (
                                                <React.Fragment key={item.id}>
                                                    <tr
                                                        onClick={() =>
                                                            setExpandedRow(
                                                                isExpanded ? null : item.id
                                                            )
                                                        }
                                                        className={`hover:bg-indigo-50/30 cursor-pointer transition-colors ${
                                                            isExpanded ? 'bg-indigo-50/20' : ''
                                                        }`}
                                                    >
                                                        <td className="py-4 px-6 text-gray-400">
                                                            {isExpanded ? (
                                                                <FiChevronUp className="w-4 h-4" />
                                                            ) : (
                                                                <FiChevronDown className="w-4 h-4" />
                                                            )}
                                                        </td>
                                                        <td className="py-4 px-6 font-medium text-gray-800">
                                                            <div className="flex items-center gap-2">
                                                                <FiClock className="text-gray-400 w-4 h-4" />
                                                                {new Date(item.date).toLocaleString()}
                                                            </div>
                                                        </td>
                                                        <td className="py-4 px-6">
                                                            <span className="text-xs font-bold uppercase px-2.5 py-1 rounded-full bg-gray-100 text-gray-700">
                                                                {item.export_type}
                                                            </span>
                                                        </td>
                                                        <td className="py-4 px-6 text-gray-600">
                                                            <span className="flex items-center gap-1.5 font-medium capitalize">
                                                                {item.delivery_method ===
                                                                'download' ? (
                                                                    <>
                                                                        <FiDownload className="w-3.5 h-3.5" />
                                                                        Download
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <FiMail className="w-3.5 h-3.5" />
                                                                        Email
                                                                    </>
                                                                )}
                                                            </span>
                                                            {item.recipient_email && (
                                                                <span className="text-xs text-gray-400 block mt-0.5">
                                                                    {item.recipient_email}
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="py-4 px-6">
                                                            <span className="text-xs font-semibold px-2 py-1 bg-indigo-50 text-indigo-700 rounded-lg">
                                                                {displaySections.length} modules
                                                            </span>
                                                        </td>
                                                        <td className="py-4 px-6">
                                                            <span
                                                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                                                                    item.status === 'success'
                                                                        ? 'bg-green-100 text-green-800'
                                                                        : item.status === 'failed'
                                                                          ? 'bg-red-100 text-red-800'
                                                                          : 'bg-amber-100 text-amber-800'
                                                                }`}
                                                            >
                                                                {item.status === 'success' && (
                                                                    <FiCheckCircle className="w-3 h-3" />
                                                                )}
                                                                {item.status === 'failed' && (
                                                                    <FiAlertTriangle className="w-3 h-3" />
                                                                )}
                                                                {item.status === 'pending' && (
                                                                    <FiRefreshCw className="w-3 h-3 animate-spin" />
                                                                )}
                                                                <span className="capitalize">
                                                                    {item.status}
                                                                </span>
                                                            </span>
                                                        </td>
                                                        <td
                                                            className="py-4 px-6 text-right"
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            <div className="flex justify-end gap-2">
                                                                {item.status === 'success' &&
                                                                    item.delivery_method ===
                                                                        'download' &&
                                                                    item.download_url && (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => {
                                                                                toast.promise(
                                                                                    triggerBackupDownload(
                                                                                        item.download_url,
                                                                                        item.file_name
                                                                                    ),
                                                                                    {
                                                                                        loading:
                                                                                            'Downloading…',
                                                                                        success: (
                                                                                            <b>
                                                                                                Downloaded
                                                                                            </b>
                                                                                        ),
                                                                                        error: (
                                                                                            <b>
                                                                                                Download
                                                                                                failed
                                                                                            </b>
                                                                                        ),
                                                                                    }
                                                                                );
                                                                            }}
                                                                            className="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg"
                                                                            title="Download"
                                                                        >
                                                                            <FiDownload className="w-4 h-4" />
                                                                        </button>
                                                                    )}
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) =>
                                                                        deleteHistoryItem(item.id, e)
                                                                    }
                                                                    className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg"
                                                                    title="Remove"
                                                                >
                                                                    <FiTrash2 className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>

                                                    <AnimatePresence>
                                                        {isExpanded && (
                                                            <tr>
                                                                <td
                                                                    colSpan="7"
                                                                    className="bg-gradient-to-b from-indigo-50/40 to-white p-0 border-t border-indigo-100/50"
                                                                >
                                                                    <motion.div
                                                                        initial={{
                                                                            opacity: 0,
                                                                            height: 0,
                                                                        }}
                                                                        animate={{
                                                                            opacity: 1,
                                                                            height: 'auto',
                                                                        }}
                                                                        exit={{
                                                                            opacity: 0,
                                                                            height: 0,
                                                                        }}
                                                                        className="px-6 py-5 overflow-hidden"
                                                                    >
                                                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
                                                                            <p className="text-sm font-semibold text-gray-700">
                                                                                Module breakdown
                                                                            </p>
                                                                            <div className="flex gap-2">
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() =>
                                                                                        handleIndividualBackup(
                                                                                            item,
                                                                                            displaySections,
                                                                                            'download'
                                                                                        )
                                                                                    }
                                                                                    disabled={
                                                                                        displaySections.length ===
                                                                                        0
                                                                                    }
                                                                                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 disabled:opacity-50 whitespace-nowrap min-w-[7.5rem] justify-center"
                                                                                >
                                                                                    <FiDownload className="w-3.5 h-3.5" />
                                                                                    Download all
                                                                                </button>
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() =>
                                                                                        handleIndividualBackup(
                                                                                            item,
                                                                                            displaySections,
                                                                                            'email'
                                                                                        )
                                                                                    }
                                                                                    disabled={
                                                                                        displaySections.length ===
                                                                                        0
                                                                                    }
                                                                                    className="px-3 py-1.5 bg-violet-100 hover:bg-violet-200 text-violet-800 rounded-lg text-xs font-bold flex items-center gap-1.5 disabled:opacity-50"
                                                                                >
                                                                                    <FiMail className="w-3.5 h-3.5" />
                                                                                    Email all
                                                                                </button>
                                                                            </div>
                                                                        </div>

                                                                        <div className="space-y-2">
                                                                            {displaySections.map(
                                                                                (secKey) => {
                                                                                    const sec =
                                                                                        SECTION_INFO[
                                                                                            secKey
                                                                                        ];
                                                                                    if (!sec)
                                                                                        return null;
                                                                                    const Icon =
                                                                                        sec.icon;
                                                                                    const dlKey = `${item.id}_${secKey}_download`;
                                                                                    const emKey = `${item.id}_${secKey}_email`;

                                                                                    return (
                                                                                        <div
                                                                                            key={
                                                                                                secKey
                                                                                            }
                                                                                            className={`flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl border gap-3 ${sec.card}`}
                                                                                        >
                                                                                            <div className="flex items-center gap-3">
                                                                                                <span
                                                                                                    className={`w-9 h-9 rounded-lg flex items-center justify-center ${sec.badge}`}
                                                                                                >
                                                                                                    <Icon className="w-4 h-4" />
                                                                                                </span>
                                                                                                <div>
                                                                                                    <p className="text-sm font-bold text-gray-900">
                                                                                                        {
                                                                                                            sec.title
                                                                                                        }
                                                                                                    </p>
                                                                                                    <p className="text-xs text-gray-500">
                                                                                                        {
                                                                                                            sec.description
                                                                                                        }
                                                                                                    </p>
                                                                                                </div>
                                                                                            </div>
                                                                                            <div className="flex gap-2">
                                                                                                <button
                                                                                                    type="button"
                                                                                                    disabled={
                                                                                                        individualLoading[
                                                                                                            dlKey
                                                                                                        ] ||
                                                                                                        individualLoading[
                                                                                                            emKey
                                                                                                        ]
                                                                                                    }
                                                                                                    onClick={() =>
                                                                                                        handleIndividualBackup(
                                                                                                            item,
                                                                                                            [
                                                                                                                secKey,
                                                                                                            ],
                                                                                                            'download'
                                                                                                        )
                                                                                                    }
                                                                                                    className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold flex items-center gap-1.5 hover:bg-gray-50 whitespace-nowrap min-w-[6.5rem] justify-center"
                                                                                                >
                                                                                                    {individualLoading[
                                                                                                        dlKey
                                                                                                    ] ? (
                                                                                                        <FiRefreshCw className="w-3.5 h-3.5 animate-spin" />
                                                                                                    ) : (
                                                                                                        <FiDownload className="w-3.5 h-3.5" />
                                                                                                    )}
                                                                                                    Download
                                                                                                </button>
                                                                                                <button
                                                                                                    type="button"
                                                                                                    disabled={
                                                                                                        individualLoading[
                                                                                                            dlKey
                                                                                                        ] ||
                                                                                                        individualLoading[
                                                                                                            emKey
                                                                                                        ]
                                                                                                    }
                                                                                                    onClick={() =>
                                                                                                        handleIndividualBackup(
                                                                                                            item,
                                                                                                            [
                                                                                                                secKey,
                                                                                                            ],
                                                                                                            'email'
                                                                                                        )
                                                                                                    }
                                                                                                    className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold flex items-center gap-1.5 hover:bg-gray-50 whitespace-nowrap min-w-[6.5rem] justify-center"
                                                                                                >
                                                                                                    {individualLoading[
                                                                                                        emKey
                                                                                                    ] ? (
                                                                                                        <FiRefreshCw className="w-3.5 h-3.5 animate-spin" />
                                                                                                    ) : (
                                                                                                        <FiMail className="w-3.5 h-3.5" />
                                                                                                    )}
                                                                                                    Email
                                                                                                </button>
                                                                                            </div>
                                                                                        </div>
                                                                                    );
                                                                                }
                                                                            )}
                                                                        </div>
                                                                    </motion.div>
                                                                </td>
                                                            </tr>
                                                        )}
                                                    </AnimatePresence>
                                                </React.Fragment>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <AnimatePresence>
                {showProgressModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 text-center"
                        >
                            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
                                <FiDownload className="w-8 h-8 text-white animate-bounce" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900">Creating backup</h3>
                            <p className="text-sm text-gray-500 mt-1">{progressStatusText}</p>

                            <div className="w-full bg-gray-100 rounded-full h-2.5 mt-6 mb-3 overflow-hidden">
                                <motion.div
                                    className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-600"
                                    style={{ width: `${progressPercent}%` }}
                                />
                            </div>
                            <p className="text-xs font-semibold text-gray-500">
                                {progressPercent}% complete
                            </p>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Backup;
