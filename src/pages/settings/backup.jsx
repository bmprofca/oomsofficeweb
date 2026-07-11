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
    FiUser,
    FiUpload
} from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { Header, Sidebar } from '../../components/header';
import API_BASE_URL from '../../utils/api-controller';
import getHeaders from '../../utils/get-headers';

// Section static metadata and color classes
const SECTION_INFO = {
    tasks: {
        title: "Tasks",
        description: "Branch tasks, descriptions, and statuses",
        color: "text-blue-600 bg-blue-50 border-blue-200"
    },
    clients: {
        title: "Clients & Firms",
        description: "Branch clients, profiles, and associated firms",
        color: "text-green-600 bg-green-50 border-green-200"
    },
    finance: {
        title: "Finance Transactions",
        description: "Financial ledger transactions",
        color: "text-purple-600 bg-purple-50 border-purple-200"
    },
    recurring_tasks: {
        title: "Compliance & Schedules",
        description: "Compliance assignments and calendar schedules",
        color: "text-amber-600 bg-amber-50 border-amber-200"
    },
    billing: {
        title: "Billing Invoices",
        description: "Generated billing invoices",
        color: "text-red-600 bg-red-50 border-red-200"
    },
    staff_management: {
        title: "Staff & Attendance",
        description: "Active staff mapping list and daily attendance logs",
        color: "text-teal-600 bg-teal-50 border-teal-200"
    }
};

const Backup = () => {
    // Shell layouts states
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(() => {
        const saved = localStorage.getItem('sidebarMinimized');
        return saved ? JSON.parse(saved) : false;
    });

    // Summary state
    const [summaryLoading, setSummaryLoading] = useState(true);
    const [summaryData, setSummaryData] = useState({});

    // Active user metadata for local history scoping
    const [userMeta, setUserMeta] = useState({ username: '', name: '', branchId: '', branchName: '' });

    // Form inputs state
    const [selectedSections, setSelectedSections] = useState(["tasks", "clients", "finance", "recurring_tasks", "billing", "staff_management"]);
    const [exportType, setExportType] = useState('excel');
    const [deliveryMethod, setDeliveryMethod] = useState('download');
    const [recipientEmail, setRecipientEmail] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // History and UI state
    const [backupHistory, setBackupHistory] = useState([]);
    const [expandedRow, setExpandedRow] = useState(null);
    const [individualLoading, setIndividualLoading] = useState({}); // format: { 'rowId_sectionKey_method': boolean }

    // Progress modal and stats states
    const [showProgressModal, setShowProgressModal] = useState(false);
    const [progressPercent, setProgressPercent] = useState(0);
    const [progressStatusText, setProgressStatusText] = useState('');
    const [progressType, setProgressType] = useState('export'); // 'export' or 'import'

    // Import states
    const [importFile, setImportFile] = useState(null);
    const [rawJsonText, setRawJsonText] = useState('');
    const [importMode, setImportMode] = useState('file'); // 'file' or 'raw'
    const [importing, setImporting] = useState(false);

    // Persist sidebar minimized state
    useEffect(() => {
        localStorage.setItem('sidebarMinimized', JSON.stringify(isMinimized));
    }, [isMinimized]);

    // Lock body scroll when mobile sidebar is open
    useEffect(() => {
        if (mobileMenuOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'auto';
        }
        return () => {
            document.body.style.overflow = 'auto';
        };
    }, [mobileMenuOpen]);

    // Load initial user metadata, fetch summary stats and load local history
    useEffect(() => {
        const username = localStorage.getItem('user_username') || '';
        const name = localStorage.getItem('user_name') || '';
        const branchId = localStorage.getItem('branch_id') || '';
        const branchName = localStorage.getItem('branch_name') || '';
        setUserMeta({ username, name, branchId, branchName });

        // Load prefilled email if available in userData
        const userDataStr = localStorage.getItem('userData');
        if (userDataStr) {
            try {
                const u = JSON.parse(userDataStr);
                const email = u?.profile?.email || u?.email || '';
                if (email) setRecipientEmail(email);
            } catch (e) {
                console.error("Error reading userData for email prefill:", e);
            }
        }

        fetchSummary();
        
        if (username && branchId) {
            const key = `ooms_backup_history_${username}_${branchId}`;
            const history = localStorage.getItem(key);
            if (history) {
                try {
                    setBackupHistory(JSON.parse(history));
                } catch (e) {
                    console.error("Error parsing backup history", e);
                }
            }
        }
    }, []);

    // Load backup summary counts from API
    const fetchSummary = async () => {
        setSummaryLoading(true);
        const headers = getHeaders();
        if (!headers) {
            setSummaryLoading(false);
            toast.error("Authentication headers missing. Please log in again.");
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/backup/summary`, {
                method: 'GET',
                headers
            });
            const result = await response.json();
            if (result.success) {
                setSummaryData(result.data || {});
            } else {
                toast.error(result.message || "Failed to retrieve backup summary");
            }
        } catch (error) {
            console.error("Error fetching backup summary:", error);
            toast.error("Network error while loading backup stats.");
        } finally {
            setSummaryLoading(false);
        }
    };

    // Helper to resolve clean API URL (handles relative/absolute combinations)
    const getFullUrl = (url) => {
        if (!url) return '';
        if (url.startsWith('http://') || url.startsWith('https://')) return url;
        const base = API_BASE_URL.replace('/api/v1', '');
        return `${base}${url}`;
    };

    // Helper to request a secure download using headers
    const triggerBackupDownload = async (downloadUrl, fileName) => {
        const headers = getHeaders();
        if (!headers) throw new Error("Unauthorized");

        const targetUrl = getFullUrl(downloadUrl);
        const response = await fetch(targetUrl, {
            method: 'GET',
            headers
        });

        if (!response.ok) {
            const errData = await response.json().catch(() => ({ message: 'Failed to download backup file' }));
            throw new Error(errData.message || `HTTP status: ${response.status}`);
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', fileName);
        document.body.appendChild(link);
        link.click();
        
        // Clean up
        link.parentNode.removeChild(link);
        window.URL.revokeObjectURL(url);
    };

    // Progress Bar Simulation utilities
    const startProgressSimulation = (type) => {
        setProgressType(type);
        setProgressPercent(0);
        setShowProgressModal(true);
        
        let statusTexts = [];
        if (type === 'export') {
            statusTexts = [
                { limit: 20, text: "Connecting to database modules..." },
                { limit: 55, text: "Compiling database tables..." },
                { limit: 80, text: "Compressing backup file..." },
                { limit: 95, text: "Verifying checksum and securing links..." }
            ];
        } else {
            statusTexts = [
                { limit: 30, text: "Parsing backup payload..." },
                { limit: 60, text: "Validating database schema and integrity..." },
                { limit: 85, text: "Writing backup records to tables..." },
                { limit: 95, text: "Rebuilding database indexes and establishing relations..." }
            ];
        }

        setProgressStatusText(statusTexts[0].text);

        const intervalId = setInterval(() => {
            setProgressPercent(prev => {
                const next = prev + Math.floor(Math.random() * 4) + 1;
                const currentTextObj = statusTexts.find(s => next <= s.limit);
                if (currentTextObj) {
                    setProgressStatusText(currentTextObj.text);
                }

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
        setProgressStatusText(isSuccess ? "Operation completed successfully!" : "Operation failed!");
        
        setTimeout(() => {
            setShowProgressModal(false);
        }, 800);
    };

    // File selection validation
    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
            toast.error("Please select a JSON file only.");
            return;
        }

        setImportFile(file);

        // Pre-validate locally
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                JSON.parse(event.target.result);
                toast.success("JSON file format pre-validated successfully.");
            } catch (err) {
                toast.error("Selected file is not a valid JSON document.");
                setImportFile(null);
            }
        };
        reader.readAsText(file);
    };

    // Import action handler
    const handleImportBackup = async (e) => {
        if (e) e.preventDefault();

        const headers = getHeaders(importMode === 'file');
        if (!headers) {
            toast.error("Session expired. Please log in again.");
            return;
        }

        let body;
        if (importMode === 'file') {
            if (!importFile) {
                toast.error("Please select a JSON backup file to import.");
                return;
            }
            body = new FormData();
            body.append('file', importFile);
        } else {
            if (!rawJsonText.trim()) {
                toast.error("Please paste the JSON backup payload.");
                return;
            }
            try {
                JSON.parse(rawJsonText);
            } catch (err) {
                toast.error("Invalid JSON format in text box.");
                return;
            }
            body = rawJsonText;
        }

        setImporting(true);
        const progressInterval = startProgressSimulation('import');

        try {
            const response = await fetch(`${API_BASE_URL}/backup/import`, {
                method: 'POST',
                headers,
                body: body
            });

            const result = await response.json();

            if (result.success) {
                completeProgressSimulation(progressInterval, true);
                toast.success(result.message || "Backup data restored successfully!");
                setImportFile(null);
                setRawJsonText('');
                fetchSummary();
            } else {
                throw new Error(result.message || "Failed to import backup data.");
            }
        } catch (error) {
            console.error("Import backup error:", error);
            completeProgressSimulation(progressInterval, false);
            toast.error(error.message || "An unexpected error occurred during restore.");
        } finally {
            setImporting(false);
        }
    };

    // Main execute backup handler
    const handleRunBackup = async (e) => {
        if (e) e.preventDefault();

        if (selectedSections.length === 0) {
            toast.error("Please select at least one database section.");
            return;
        }

        if (deliveryMethod === 'email' && !recipientEmail.trim()) {
            toast.error("Please provide a recipient email address.");
            return;
        }

        const headers = getHeaders();
        if (!headers) {
            toast.error("Session expired. Please log in again.");
            return;
        }

        setSubmitting(true);
        const progressInterval = startProgressSimulation('export');
        const backupId = Date.now().toString();
        const runDate = new Date().toISOString();

        // Create initial pending log item
        const newLog = {
            id: backupId,
            date: runDate,
            sections: [...selectedSections],
            export_type: exportType,
            delivery_method: deliveryMethod,
            recipient_email: deliveryMethod === 'email' ? recipientEmail : '',
            status: 'pending',
            message: 'Generating backup file...'
        };

        // Append to state history immediately
        appendHistoryItem(newLog);

        try {
            const body = {
                sections: selectedSections.length === Object.keys(SECTION_INFO).length ? 'all' : selectedSections,
                export_type: exportType,
                delivery_method: deliveryMethod
            };

            if (deliveryMethod === 'email') {
                body.recipient_email = recipientEmail;
            }

            const response = await fetch(`${API_BASE_URL}/backup/run`, {
                method: 'POST',
                headers,
                body: JSON.stringify(body)
            });

            const result = await response.json();

            if (result.success) {
                if (deliveryMethod === 'download') {
                    const downloadUrl = result.data?.download_url;
                    const fileName = result.data?.file_name;

                    if (downloadUrl) {
                        completeProgressSimulation(progressInterval, true);
                        toast.promise(
                            triggerBackupDownload(downloadUrl, fileName),
                            {
                                loading: 'Downloading file...',
                                success: <b>Backup downloaded successfully!</b>,
                                error: (err) => <b>Download failed: {err.message}</b>
                            }
                        );

                        // Update history item with success and file info
                        updateHistoryItem(backupId, {
                            status: 'success',
                            message: result.message || 'Backup completed successfully.',
                            download_url: downloadUrl,
                            file_name: fileName
                        });
                    } else {
                        throw new Error("Missing download URL in API response.");
                    }
                } else {
                    completeProgressSimulation(progressInterval, true);
                    toast.success(result.message || "Backup emailed successfully.");
                    updateHistoryItem(backupId, {
                        status: 'success',
                        message: result.message || 'Backup exported via email successfully.'
                    });
                }
            } else {
                throw new Error(result.message || "Execution failed on server.");
            }
        } catch (error) {
            console.error("Backup trigger failed:", error);
            completeProgressSimulation(progressInterval, false);
            toast.error(error.message || "An unexpected error occurred.");
            updateHistoryItem(backupId, {
                status: 'failed',
                message: error.message || 'Server error occurred during backup generation.'
            });
        } finally {
            setSubmitting(false);
        }
    };

    // Triggers backup for specific subparts (Individual items or all items from a past log)
    const handleIndividualBackup = async (historyItem, sectionsToExport, targetMethod) => {
        const headers = getHeaders();
        if (!headers) {
            toast.error("Auth headers not found. Please log in again.");
            return;
        }

        // Generate loading key
        const runId = `${historyItem.id}_${sectionsToExport.join('_')}_${targetMethod}`;
        setIndividualLoading(prev => ({ ...prev, [runId]: true }));
        const progressInterval = startProgressSimulation('export');

        try {
            const body = {
                sections: sectionsToExport,
                export_type: historyItem.export_type,
                delivery_method: targetMethod
            };

            if (targetMethod === 'email') {
                if (!historyItem.recipient_email && !recipientEmail) {
                    toast.error("Email recipient is missing.");
                    setIndividualLoading(prev => ({ ...prev, [runId]: false }));
                    if (progressInterval) clearInterval(progressInterval);
                    setShowProgressModal(false);
                    return;
                }
                body.recipient_email = historyItem.recipient_email || recipientEmail;
            }

            const response = await fetch(`${API_BASE_URL}/backup/run`, {
                method: 'POST',
                headers,
                body: JSON.stringify(body)
            });

            const result = await response.json();

            if (result.success) {
                completeProgressSimulation(progressInterval, true);
                if (targetMethod === 'download') {
                    const downloadUrl = result.data?.download_url;
                    const fileName = result.data?.file_name;

                    if (downloadUrl) {
                        await triggerBackupDownload(downloadUrl, fileName);
                        toast.success(`Successfully downloaded backup segment!`);
                    } else {
                        throw new Error("Download path missing from API response.");
                    }
                } else {
                    toast.success(result.message || `Segment email request sent successfully.`);
                }

                // Append this secondary run to backup history as a new row
                const additionalLog = {
                    id: Date.now().toString(),
                    date: new Date().toISOString(),
                    sections: sectionsToExport,
                    export_type: historyItem.export_type,
                    delivery_method: targetMethod,
                    recipient_email: targetMethod === 'email' ? (historyItem.recipient_email || recipientEmail) : '',
                    status: 'success',
                    message: result.message || 'Selective segment backup completed.',
                    download_url: targetMethod === 'download' ? result.data?.download_url : undefined,
                    file_name: targetMethod === 'download' ? result.data?.file_name : undefined
                };
                appendHistoryItem(additionalLog);
            } else {
                throw new Error(result.message || "Failed to trigger selective backup.");
            }
        } catch (error) {
            console.error("Selective run error:", error);
            completeProgressSimulation(progressInterval, false);
            toast.error(`Export failed: ${error.message}`);
        } finally {
            setIndividualLoading(prev => ({ ...prev, [runId]: false }));
        }
    };

    // Helper functions to manage history state & localStorage
    const appendHistoryItem = (item) => {
        setBackupHistory(prev => {
            const updated = [item, ...prev];
            if (userMeta.username && userMeta.branchId) {
                localStorage.setItem(`ooms_backup_history_${userMeta.username}_${userMeta.branchId}`, JSON.stringify(updated));
            }
            return updated;
        });
    };

    const updateHistoryItem = (id, updates) => {
        setBackupHistory(prev => {
            const updated = prev.map(item => item.id === id ? { ...item, ...updates } : item);
            if (userMeta.username && userMeta.branchId) {
                localStorage.setItem(`ooms_backup_history_${userMeta.username}_${userMeta.branchId}`, JSON.stringify(updated));
            }
            return updated;
        });
    };

    const deleteHistoryItem = (id, e) => {
        if (e) e.stopPropagation();
        if (!window.confirm("Are you sure you want to delete this backup log?")) return;

        setBackupHistory(prev => {
            const updated = prev.filter(item => item.id !== id);
            if (userMeta.username && userMeta.branchId) {
                localStorage.setItem(`ooms_backup_history_${userMeta.username}_${userMeta.branchId}`, JSON.stringify(updated));
            }
            return updated;
        });
        toast.success("Backup log removed from history.");
    };

    const clearAllHistory = () => {
        if (!window.confirm("Are you sure you want to clear all backup history? This cannot be undone.")) return;

        setBackupHistory([]);
        if (userMeta.username && userMeta.branchId) {
            localStorage.removeItem(`ooms_backup_history_${userMeta.username}_${userMeta.branchId}`);
        }
        toast.success("Backup history cleared.");
    };

    // Checkbox triggers
    const toggleSection = (key) => {
        setSelectedSections(prev => 
            prev.includes(key) ? prev.filter(item => item !== key) : [...prev, key]
        );
    };

    const handleSelectAll = (checked) => {
        if (checked) {
            setSelectedSections(Object.keys(SECTION_INFO));
        } else {
            setSelectedSections([]);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
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

            {/* Main content viewport */}
            <div className={`pt-16 transition-all duration-300 ease-in-out ${isMinimized ? 'md:pl-20' : 'md:pl-[260px]'}`}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-6">
                    
                    {/* Page Header */}
                    <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                                <FiDatabase className="text-teal-600 w-7 h-7 animate-pulse" />
                                Backup & Export
                            </h1>
                            <p className="text-gray-600 mt-1">
                                Securely compile database modules to excel spreadsheet, CSV ledger, or PDF documents.
                            </p>
                        </div>
                        <button
                            onClick={fetchSummary}
                            className="w-full md:w-auto px-4 py-2 bg-white hover:bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 font-medium transition-all duration-200 flex items-center justify-center gap-2 shadow-sm"
                        >
                            <FiRefreshCw className={`w-4 h-4 ${summaryLoading ? 'animate-spin' : ''}`} />
                            Refresh Stats
                        </button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                        
                        {/* LEFT COLUMN: Setup Configuration Form (2/3 width on large screens) */}
                        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                            <h2 className="text-lg font-bold text-gray-800 mb-4 pb-2 border-b border-gray-100 flex items-center gap-2">
                                <FiSettings className="text-gray-500 w-5 h-5" />
                                1. Configure Backup Package
                            </h2>

                            <form onSubmit={handleRunBackup}>
                                
                                {/* Target Sections Checklist */}
                                <div className="mb-6">
                                    <div className="flex justify-between items-center mb-3">
                                        <label className="block text-sm font-semibold text-gray-700">
                                            Select Modules to Include
                                        </label>
                                        <div className="flex items-center gap-2">
                                            <input
                                                id="select-all-checkbox"
                                                type="checkbox"
                                                checked={selectedSections.length === Object.keys(SECTION_INFO).length}
                                                onChange={(e) => handleSelectAll(e.target.checked)}
                                                className="w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500 cursor-pointer"
                                            />
                                            <label htmlFor="select-all-checkbox" className="text-xs text-gray-500 font-medium cursor-pointer">
                                                Select All
                                            </label>
                                        </div>
                                    </div>

                                    {/* Grid of section cards */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {Object.keys(SECTION_INFO).map((key) => {
                                            const sec = SECTION_INFO[key];
                                            const isSelected = selectedSections.includes(key);
                                            const stat = summaryData[key];
                                            return (
                                                <div 
                                                    key={key}
                                                    onClick={() => toggleSection(key)}
                                                    className={`p-3 rounded-lg border transition-all duration-200 cursor-pointer flex items-center justify-between ${
                                                        isSelected 
                                                            ? 'bg-teal-50/50 border-teal-200 shadow-sm' 
                                                            : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50/30'
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <input
                                                            type="checkbox"
                                                            checked={isSelected}
                                                            onChange={() => {}} // toggled by parent click
                                                            className="w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500 cursor-pointer"
                                                        />
                                                        <div>
                                                            <p className="text-sm font-bold text-gray-800 leading-tight">
                                                                {sec.title}
                                                            </p>
                                                            <p className="text-xs text-gray-500 mt-0.5 leading-tight">
                                                                {sec.description}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    
                                                    {/* Record counts badges */}
                                                    <span className="text-xs font-bold px-2 py-1 bg-gray-100 text-gray-700 rounded-full">
                                                        {summaryLoading ? '...' : (stat ? `${stat.count} rows` : '0 rows')}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Form settings split rows */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                    
                                    {/* Export format */}
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Export File Format
                                        </label>
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                            {['excel', 'csv', 'pdf', 'json'].map((format) => (
                                                <button
                                                    key={format}
                                                    type="button"
                                                    onClick={() => setExportType(format)}
                                                    className={`py-2 px-3 text-sm font-bold rounded-lg border text-center uppercase transition-all ${
                                                        exportType === format
                                                            ? 'bg-teal-600 border-teal-600 text-white shadow-sm'
                                                            : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                                                    }`}
                                                >
                                                    {format === 'excel' ? 'EXCEL' : format}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Delivery Method */}
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Delivery Destination
                                        </label>
                                        <div className="grid grid-cols-2 gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setDeliveryMethod('download')}
                                                className={`py-2 px-3 text-sm font-bold rounded-lg border flex items-center justify-center gap-2 transition-all ${
                                                    deliveryMethod === 'download'
                                                        ? 'bg-teal-600 border-teal-600 text-white shadow-sm'
                                                        : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                                                }`}
                                            >
                                                <FiDownload className="w-4 h-4" />
                                                Direct Download
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setDeliveryMethod('email')}
                                                className={`py-2 px-3 text-sm font-bold rounded-lg border flex items-center justify-center gap-2 transition-all ${
                                                    deliveryMethod === 'email'
                                                        ? 'bg-teal-600 border-teal-600 text-white shadow-sm'
                                                        : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                                                }`}
                                            >
                                                <FiMail className="w-4 h-4" />
                                                Send to Email
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Conditional email block */}
                                <AnimatePresence>
                                    {deliveryMethod === 'email' && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            className="mb-6 overflow-hidden"
                                        >
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                                Recipient Email Address
                                            </label>
                                            <div className="relative">
                                                <FiMail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                                <input
                                                    type="email"
                                                    placeholder="recipient@example.com"
                                                    value={recipientEmail}
                                                    onChange={(e) => setRecipientEmail(e.target.value)}
                                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all text-sm"
                                                    required
                                                />
                                            </div>
                                            <p className="text-xs text-gray-500 mt-1">
                                                The file will be compiled on the server and sent as an email attachment using the branch SMTP settings.
                                            </p>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {/* Submission Button */}
                                <button
                                    type="submit"
                                    disabled={submitting || summaryLoading}
                                    className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-lg text-sm transition-all duration-200 flex items-center justify-center gap-2 shadow hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {submitting ? (
                                        <>
                                            <FiRefreshCw className="w-5 h-5 animate-spin" />
                                            Executing Backup Archive...
                                        </>
                                    ) : (
                                        <>
                                            <FiDatabase className="w-5 h-5" />
                                            Execute Backup Package
                                        </>
                                    )}
                                </button>
                            </form>
                        </div>

                        {/* RIGHT COLUMN: Active Context & Import Data (stacked) */}
                        <div className="lg:col-span-1 flex flex-col gap-6">
                            
                            {/* Active Context */}
                            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex flex-col justify-between h-fit">
                                <div>
                                    <h2 className="text-lg font-bold text-gray-800 mb-4 pb-2 border-b border-gray-100 flex items-center gap-2">
                                        <FiUser className="text-gray-500 w-5 h-5" />
                                        Active Context
                                    </h2>

                                    <div className="space-y-4 text-sm text-gray-600 mb-6">
                                        <div className="flex justify-between py-2 border-b border-dashed border-gray-100">
                                            <span className="font-medium text-gray-500">Name:</span>
                                            <span className="font-bold text-gray-800">{userMeta.name || userMeta.username || 'Loading...'}</span>
                                        </div>
                                        <div className="flex justify-between py-2 border-b border-dashed border-gray-100">
                                            <span className="font-medium text-gray-500">Branch Name:</span>
                                            <span className="font-bold text-gray-800">{userMeta.branchName || userMeta.branchId || 'Loading...'}</span>
                                        </div>
                                        <div className="flex justify-between py-2 border-b border-dashed border-gray-100">
                                            <span className="font-medium text-gray-500">Total Sections:</span>
                                            <span className="font-bold text-teal-600">{Object.keys(SECTION_INFO).length} Modules</span>
                                        </div>
                                    </div>

                                    <div className="bg-teal-50 border border-teal-200 rounded-lg p-4 mb-2">
                                        <h4 className="text-xs font-bold text-teal-800 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                                            <FiCheckCircle className="w-4 h-4" />
                                            Access Control Rules
                                        </h4>
                                        <ul className="text-xs text-teal-700 space-y-1.5 list-disc list-inside">
                                            <li>Backup files are restricted to branch context level.</li>
                                            <li>Downloads verify matching branch ID header token.</li>
                                        </ul>
                                    </div>
                                </div>

                                <div className="text-xs text-gray-400 mt-4 pt-4 border-t border-gray-100 flex items-center gap-1">
                                    <FiClock className="w-3.5 h-3.5 text-gray-300" />
                                    Last sync: {new Date().toLocaleTimeString()}
                                </div>
                            </div>

                            {/* Import Backup Card */}
                            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                                <h2 className="text-lg font-bold text-gray-800 mb-4 pb-2 border-b border-gray-100 flex items-center gap-2">
                                    <FiUpload className="text-teal-600 w-5 h-5" />
                                    Import Backup Data
                                </h2>
                                
                                <p className="text-xs text-gray-500 mb-4">
                                    Restore database from a JSON backup file or raw JSON payload directly.
                                </p>

                                {/* Import mode selector */}
                                <div className="flex bg-gray-100 p-1 rounded-lg mb-4 text-xs font-bold">
                                    <button
                                        type="button"
                                        onClick={() => setImportMode('file')}
                                        className={`flex-1 py-1.5 rounded-md transition-all ${
                                            importMode === 'file' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-800'
                                        }`}
                                    >
                                        JSON File
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setImportMode('raw')}
                                        className={`flex-1 py-1.5 rounded-md transition-all ${
                                            importMode === 'raw' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-800'
                                        }`}
                                    >
                                        Raw JSON Text
                                    </button>
                                </div>

                                <form onSubmit={handleImportBackup} className="space-y-4">
                                    {importMode === 'file' ? (
                                        <div>
                                            <label className="block text-xs font-bold text-gray-600 mb-2">
                                                Select JSON Backup File
                                            </label>
                                            <div className="border-2 border-dashed border-gray-200 rounded-lg p-4 hover:border-teal-500 transition-colors text-center cursor-pointer relative bg-gray-50/50">
                                                <input
                                                    type="file"
                                                    accept=".json"
                                                    onChange={handleFileChange}
                                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                                />
                                                <FiUpload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                                                <p className="text-xs font-bold text-gray-700">
                                                    {importFile ? importFile.name : 'Click or Drag & Drop'}
                                                </p>
                                                <p className="text-[10px] text-gray-400 mt-1">
                                                    {importFile ? `${(importFile.size / 1024).toFixed(2)} KB` : 'JSON backups only'}
                                                </p>
                                            </div>
                                            {importFile && (
                                                <div className="flex justify-between items-center mt-2 px-1">
                                                    <span className="text-[11px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded border border-green-100 flex items-center gap-1">
                                                        <FiCheckCircle className="w-3 h-3" /> Validated JSON
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => setImportFile(null)}
                                                        className="text-[11px] font-bold text-red-600 hover:underline"
                                                    >
                                                        Remove
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div>
                                            <label className="block text-xs font-bold text-gray-600 mb-1.5">
                                                Paste JSON Payload
                                            </label>
                                            <textarea
                                                rows="5"
                                                value={rawJsonText}
                                                onChange={(e) => setRawJsonText(e.target.value)}
                                                placeholder='{ "tasks": [...], "clients": [...] }'
                                                className="w-full p-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-teal-500 text-xs font-mono bg-gray-50/50"
                                            />
                                        </div>
                                    )}

                                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-[11px] text-amber-800 leading-normal flex items-start gap-2">
                                        <FiAlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                                        <span>
                                            <strong>Warning:</strong> Restoring backup data replaces/adds database records. Proceed with caution.
                                        </span>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={importing || (importMode === 'file' ? !importFile : !rawJsonText.trim())}
                                        className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-lg text-xs transition-all duration-200 flex items-center justify-center gap-2 shadow disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {importing ? (
                                            <>
                                                <FiRefreshCw className="w-4 h-4 animate-spin" />
                                                Restoring...
                                            </>
                                        ) : (
                                            <>
                                                <FiUpload className="w-4 h-4" />
                                                Import & Restore
                                            </>
                                        )}
                                    </button>
                                </form>
                            </div>

                        </div>

                    </div>

                    {/* BOTTOM SECTION: Backup Logs (Master Table) */}
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                        
                        {/* Table Header */}
                        <div className="border-b border-gray-200 px-6 py-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div>
                                <h3 className="text-lg font-bold text-gray-800">Backup Logs & History</h3>
                                <p className="text-sm text-gray-500 mt-0.5">
                                    List of previously executed backups. Click a row to access part-by-part segments or re-run exports.
                                </p>
                            </div>
                            {backupHistory.length > 0 && (
                                <button
                                    onClick={clearAllHistory}
                                    className="px-3 py-1.5 text-xs font-semibold bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg flex items-center gap-1.5 transition-colors"
                                >
                                    <FiTrash2 className="w-3.5 h-3.5" />
                                    Clear History
                                </button>
                            )}
                        </div>

                        {/* Table rendering */}
                        <div className="overflow-x-auto">
                            {backupHistory.length === 0 ? (
                                <div className="p-12 text-center flex flex-col items-center justify-center">
                                    <FiDatabase className="w-16 h-16 text-gray-300 mb-3 animate-pulse" />
                                    <p className="text-gray-500 font-medium text-lg">No backup logs available</p>
                                    <p className="text-gray-400 text-sm mt-1 max-w-sm">
                                        Execute a database backup using the form above to record history. Scoped history saves locally for this branch.
                                    </p>
                                </div>
                            ) : (
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-gray-50 border-b border-gray-200 text-xs font-bold text-gray-500 uppercase tracking-wider">
                                            <th className="py-4 px-6 w-10"></th>
                                            <th className="py-4 px-6">Backup Date & Time</th>
                                            <th className="py-4 px-6">Format</th>
                                            <th className="py-4 px-6">Method / Destination</th>
                                            <th className="py-4 px-6">Included Modules</th>
                                            <th className="py-4 px-6">Status</th>
                                            <th className="py-4 px-6 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 text-sm">
                                        {backupHistory.map((item) => {
                                            const isExpanded = expandedRow === item.id;
                                            const displaySections = item.sections === 'all' 
                                                ? Object.keys(SECTION_INFO) 
                                                : (Array.isArray(item.sections) ? item.sections : []);
                                            
                                            return (
                                                <React.Fragment key={item.id}>
                                                    
                                                    {/* MASTER ROW */}
                                                    <tr 
                                                        onClick={() => setExpandedRow(isExpanded ? null : item.id)}
                                                        className={`hover:bg-gray-50/50 cursor-pointer transition-colors ${isExpanded ? 'bg-teal-50/10' : ''}`}
                                                    >
                                                        {/* Expand Toggle Chevron */}
                                                        <td className="py-4 px-6 text-gray-400">
                                                            {isExpanded ? <FiChevronUp className="w-4 h-4" /> : <FiChevronDown className="w-4 h-4" />}
                                                        </td>
                                                        
                                                        {/* Date */}
                                                        <td className="py-4 px-6 font-semibold text-gray-800">
                                                            <div className="flex items-center gap-2">
                                                                <FiClock className="text-gray-400 w-4 h-4" />
                                                                {new Date(item.date).toLocaleString()}
                                                            </div>
                                                        </td>

                                                        {/* Format */}
                                                        <td className="py-4 px-6 uppercase text-xs font-bold">
                                                            <span className={`px-2.5 py-1 rounded-full ${
                                                                item.export_type === 'excel' 
                                                                    ? 'bg-green-50 text-green-700 border border-green-200' 
                                                                    : item.export_type === 'csv'
                                                                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                                                    : item.export_type === 'json'
                                                                    ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                                                    : 'bg-red-50 text-red-700 border border-red-200'
                                                            }`}>
                                                                {item.export_type}
                                                            </span>
                                                        </td>

                                                        {/* Method */}
                                                        <td className="py-4 px-6 text-gray-600">
                                                            <div className="flex flex-col">
                                                                <span className="flex items-center gap-1.5 font-medium capitalize text-gray-800">
                                                                    {item.delivery_method === 'download' ? (
                                                                        <><FiDownload className="w-3.5 h-3.5 text-gray-500" /> Direct Download</>
                                                                    ) : (
                                                                        <><FiMail className="w-3.5 h-3.5 text-gray-500" /> Email Deliver</>
                                                                    )}
                                                                </span>
                                                                {item.recipient_email && (
                                                                    <span className="text-xs text-gray-400 mt-0.5">{item.recipient_email}</span>
                                                                )}
                                                            </div>
                                                        </td>

                                                        {/* Modules Count */}
                                                        <td className="py-4 px-6">
                                                            <span className="text-xs font-semibold px-2 py-1 bg-gray-100 text-gray-600 rounded">
                                                                {displaySections.length} of {Object.keys(SECTION_INFO).length} modules
                                                            </span>
                                                        </td>

                                                        {/* Status */}
                                                        <td className="py-4 px-6">
                                                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                                                                item.status === 'success'
                                                                    ? 'bg-green-100 text-green-800'
                                                                    : item.status === 'failed'
                                                                    ? 'bg-red-100 text-red-800'
                                                                    : 'bg-yellow-100 text-yellow-800'
                                                            }`}>
                                                                {item.status === 'success' && <FiCheckCircle className="w-3 h-3" />}
                                                                {item.status === 'failed' && <FiAlertTriangle className="w-3 h-3" />}
                                                                {item.status === 'pending' && <FiRefreshCw className="w-3 h-3 animate-spin" />}
                                                                <span className="capitalize">{item.status}</span>
                                                            </span>
                                                        </td>

                                                        {/* Actions */}
                                                        <td className="py-4 px-6 text-right" onClick={(e) => e.stopPropagation()}>
                                                            <div className="flex justify-end items-center gap-2">
                                                                {item.status === 'success' && item.delivery_method === 'download' && item.download_url && (
                                                                    <button
                                                                        onClick={() => {
                                                                            toast.promise(
                                                                                triggerBackupDownload(item.download_url, item.file_name),
                                                                                {
                                                                                    loading: 'Downloading backup...',
                                                                                    success: <b>File downloaded successfully</b>,
                                                                                    error: <b>Failed to download file</b>
                                                                                }
                                                                            );
                                                                        }}
                                                                        className="p-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors"
                                                                        title="Download File"
                                                                    >
                                                                        <FiDownload className="w-4 h-4" />
                                                                    </button>
                                                                )}
                                                                <button
                                                                    onClick={(e) => deleteHistoryItem(item.id, e)}
                                                                    className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-md border border-red-100 transition-colors"
                                                                    title="Remove Log"
                                                                >
                                                                    <FiTrash2 className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        </td>

                                                    </tr>

                                                    {/* DETAIL ROW / ROW EXPANSION */}
                                                    <AnimatePresence>
                                                        {isExpanded && (
                                                            <tr>
                                                                <td colSpan="7" className="bg-gray-50/70 p-0 border-t border-b border-gray-200">
                                                                    <motion.div
                                                                        initial={{ opacity: 0, height: 0 }}
                                                                        animate={{ opacity: 1, height: 'auto' }}
                                                                        exit={{ opacity: 0, height: 0 }}
                                                                        className="px-6 py-5 overflow-hidden"
                                                                    >
                                                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 pb-3 border-b border-gray-200/80">
                                                                            <div>
                                                                                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                                                                                    Selected Backup Summary Details
                                                                                </p>
                                                                                <p className="text-xs text-gray-500 mt-0.5">
                                                                                    Execute specific sections individual exports or trigger comprehensive batch updates.
                                                                                </p>
                                                                            </div>
                                                                            
                                                                            {/* Batch rerun actions */}
                                                                            <div className="flex gap-2">
                                                                                <button
                                                                                    onClick={() => handleIndividualBackup(item, displaySections, 'download')}
                                                                                    disabled={displaySections.length === 0}
                                                                                    className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 disabled:opacity-50"
                                                                                >
                                                                                    <FiDownload className="w-3.5 h-3.5" />
                                                                                    Download All
                                                                                </button>
                                                                                <button
                                                                                    onClick={() => handleIndividualBackup(item, displaySections, 'email')}
                                                                                    disabled={displaySections.length === 0}
                                                                                    className="px-3 py-1.5 bg-teal-100 hover:bg-teal-200 text-teal-800 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 disabled:opacity-50"
                                                                                >
                                                                                    <FiMail className="w-3.5 h-3.5" />
                                                                                    Email All
                                                                                </button>
                                                                            </div>
                                                                        </div>

                                                                        {/* List of sections inside backup */}
                                                                        <div className="space-y-2">
                                                                            {displaySections.map((secKey) => {
                                                                                const sec = SECTION_INFO[secKey];
                                                                                if (!sec) return null;

                                                                                const dlKey = `${item.id}_${secKey}_download`;
                                                                                const emKey = `${item.id}_${secKey}_email`;

                                                                                return (
                                                                                    <div 
                                                                                        key={secKey}
                                                                                        className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 bg-white border border-gray-200 rounded-lg gap-3 hover:shadow-sm transition-all"
                                                                                    >
                                                                                        <div className="flex items-center gap-3">
                                                                                            <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${sec.color}`}>
                                                                                                {sec.title[0]}
                                                                                            </span>
                                                                                            <div>
                                                                                                <p className="text-sm font-bold text-gray-800 leading-tight">
                                                                                                    {sec.title}
                                                                                                </p>
                                                                                                <p className="text-xs text-gray-500 mt-0.5 leading-tight">
                                                                                                    {sec.description}
                                                                                                </p>
                                                                                            </div>
                                                                                        </div>

                                                                                        {/* Segment selective export buttons */}
                                                                                        <div className="flex gap-2 w-full sm:w-auto">
                                                                                            <button
                                                                                                disabled={individualLoading[dlKey] || individualLoading[emKey]}
                                                                                                onClick={() => handleIndividualBackup(item, [secKey], 'download')}
                                                                                                className="flex-1 sm:flex-none px-3 py-1 bg-white hover:bg-gray-50 text-gray-700 text-xs font-bold border border-gray-200 rounded-lg transition-colors flex items-center justify-center gap-1"
                                                                                            >
                                                                                                {individualLoading[dlKey] ? (
                                                                                                    <FiRefreshCw className="w-3.5 h-3.5 animate-spin" />
                                                                                                ) : (
                                                                                                    <FiDownload className="w-3.5 h-3.5" />
                                                                                                )}
                                                                                                Download
                                                                                            </button>
                                                                                            <button
                                                                                                disabled={individualLoading[dlKey] || individualLoading[emKey]}
                                                                                                onClick={() => handleIndividualBackup(item, [secKey], 'email')}
                                                                                                className="flex-1 sm:flex-none px-3 py-1 bg-white hover:bg-gray-50 text-gray-700 text-xs font-bold border border-gray-200 rounded-lg transition-colors flex items-center justify-center gap-1"
                                                                                            >
                                                                                                {individualLoading[emKey] ? (
                                                                                                    <FiRefreshCw className="w-3.5 h-3.5 animate-spin" />
                                                                                                ) : (
                                                                                                    <FiMail className="w-3.5 h-3.5" />
                                                                                                )}
                                                                                                Email
                                                                                            </button>
                                                                                        </div>
                                                                                    </div>
                                                                                );
                                                                            })}
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

            {/* Professional Progress Modal Overlay */}
            <AnimatePresence>
                {showProgressModal && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
                    >
                        <motion.div 
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white rounded-2xl shadow-xl border border-gray-100 max-w-md w-full p-6 text-center"
                        >
                            {/* Title & Icon */}
                            <div className="flex flex-col items-center mb-6">
                                <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
                                    progressType === 'import' ? 'bg-teal-50 text-teal-600' : 'bg-blue-50 text-blue-600'
                                }`}>
                                    {progressType === 'import' ? (
                                        <FiUpload className="w-8 h-8 text-teal-600 animate-bounce" />
                                    ) : (
                                        <FiDownload className="w-8 h-8 text-blue-600 animate-bounce" />
                                    )}
                                </div>
                                <h3 className="text-lg font-bold text-gray-800">
                                    {progressType === 'import' ? 'Importing Backup Data' : 'Generating Backup Archive'}
                                </h3>
                                <p className="text-sm text-gray-500 mt-1">
                                    {progressStatusText}
                                </p>
                            </div>

                            {/* Progress Bar Container */}
                            <div className="w-full bg-gray-100 rounded-full h-3 mb-4 overflow-hidden relative">
                                <motion.div 
                                    className={`h-full rounded-full transition-all duration-300 ${
                                        progressType === 'import' ? 'bg-teal-600' : 'bg-blue-600'
                                    }`}
                                    style={{ width: `${progressPercent}%` }}
                                />
                            </div>

                            {/* Progress Details */}
                            <div className="flex justify-between items-center text-xs font-bold text-gray-500 mb-6">
                                <span>{progressPercent}% Complete</span>
                                <span className="flex items-center gap-1">
                                    <FiRefreshCw className="w-3.5 h-3.5 animate-spin" /> In Process
                                </span>
                            </div>

                            {/* Info Text */}
                            <p className="text-xs text-gray-400 bg-gray-50 rounded-lg p-3">
                                Please do not close this tab or navigate away. The database operations are being synchronized securely.
                            </p>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Backup;
