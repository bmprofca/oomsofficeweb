import React, { useState } from 'react';
import { FiAlertCircle, FiCheckCircle, FiInfo, FiTrendingUp } from 'react-icons/fi';
import { PiExportBold, PiFilePdfDuotone, PiMicrosoftExcelLogoDuotone } from 'react-icons/pi';
import { AiOutlineMail } from 'react-icons/ai';
import toast from 'react-hot-toast';
import getHeaders from '../../utils/get-headers';
import API_BASE_URL from '../../utils/api-controller';
import {
    CapitalModalShell,
    MODAL_BODY_CLASS,
} from './CapitalModalParts';

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
    } catch {
        return null;
    }
};

const CapitalExportModal = ({ isOpen, onClose, exportData, columns, jobType }) => {
    const [exporting, setExporting] = useState(false);
    const [exportStatus, setExportStatus] = useState(null);
    const [selectedFormat, setSelectedFormat] = useState(null);

    const userEmail = getUserEmail();

    const handleClose = () => {
        if (exporting) return;
        onClose?.();
    };

    const handleExport = async (fileType) => {
        if (!exportData?.length) {
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
                email_subject: `${String(jobType).replace(/_/g, ' ').toUpperCase()} Export - ${new Date().toLocaleString()}`,
                email_message: `<p>Your ${String(jobType).replace(/_/g, ' ')} export is ready.</p>
                                <p><strong>File Format:</strong> ${fileType.toUpperCase()}</p>
                                <p><strong>Total Records:</strong> ${exportData.length}</p>
                                <p><strong>Generated on:</strong> ${new Date().toLocaleString()}</p>`,
                data: exportData,
                columns,
                filters: {
                    export_date: new Date().toISOString(),
                    total_records: exportData.length,
                },
            };

            const response = await fetch(`${API_BASE_URL}/export/request`, {
                method: 'POST',
                headers: { ...headers, 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const result = await response.json();

            if (result.success) {
                setExportStatus('success');
                toast.success(
                    `Export started! You will receive the ${fileType.toUpperCase()} file via email at ${userEmail}`
                );
                setTimeout(() => {
                    handleClose();
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
        {
            type: 'excel',
            icon: <PiMicrosoftExcelLogoDuotone className="w-5 h-5 text-green-600" />,
            label: 'Excel (.xlsx)',
            description: 'Microsoft Excel spreadsheet',
        },
        {
            type: 'csv',
            icon: <FiTrendingUp className="w-5 h-5 text-blue-600" />,
            label: 'CSV (.csv)',
            description: 'Comma separated values',
        },
        {
            type: 'pdf',
            icon: <PiFilePdfDuotone className="w-5 h-5 text-red-600" />,
            label: 'PDF (.pdf)',
            description: 'Portable document format',
        },
    ];

    return (
        <CapitalModalShell
            open={isOpen}
            onClose={handleClose}
            maxWidth="max-w-md"
            title="Export data"
            subtitle="Choose your preferred format"
            icon={PiExportBold}
            closeDisabled={exporting}
            footer={(
                <div className="flex justify-end">
                    <button
                        type="button"
                        onClick={handleClose}
                        disabled={exporting}
                        className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
                    >
                        Cancel
                    </button>
                </div>
            )}
        >
            <div className={`${MODAL_BODY_CLASS} space-y-3`}>
                <div className="rounded-lg border border-blue-100 bg-blue-50/80 px-3 py-2.5">
                    <div className="flex items-center gap-2 text-xs text-blue-900">
                        <AiOutlineMail className="w-3.5 h-3.5 shrink-0" />
                        <span>
                            Export will be sent to: <strong>{userEmail || 'Not found'}</strong>
                        </span>
                    </div>
                    {!userEmail ? (
                        <p className="mt-1 text-[11px] text-red-600">Please log in with a valid email address.</p>
                    ) : null}
                </div>

                <div className="rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2.5 text-xs text-slate-600">
                    <div className="flex justify-between gap-2">
                        <span>Total records</span>
                        <span className="font-semibold text-slate-800">{exportData?.length || 0}</span>
                    </div>
                    <div className="mt-1 flex justify-between gap-2">
                        <span>Columns</span>
                        <span className="font-semibold text-slate-800">{columns?.length || 0}</span>
                    </div>
                </div>

                <div className="space-y-2">
                    {exportOptions.map((option) => (
                        <button
                            key={option.type}
                            type="button"
                            onClick={() => handleExport(option.type)}
                            disabled={exporting || !userEmail}
                            className={`flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors ${
                                exporting && selectedFormat === option.type
                                    ? 'border-blue-400 bg-blue-50'
                                    : 'border-slate-200 hover:border-blue-200 hover:bg-slate-50'
                            } ${(exporting || !userEmail) && selectedFormat !== option.type ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            <div className="flex min-w-0 items-center gap-2.5">
                                <div className="rounded-md bg-white p-1.5 shadow-sm">{option.icon}</div>
                                <div className="min-w-0">
                                    <div className="text-xs font-semibold text-slate-800">{option.label}</div>
                                    <div className="text-[10px] text-slate-500">{option.description}</div>
                                </div>
                            </div>
                            {exporting && selectedFormat === option.type ? (
                                <div className="shrink-0">
                                    {exportStatus === 'processing' && (
                                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                                    )}
                                    {exportStatus === 'success' && <FiCheckCircle className="h-4 w-4 text-green-600" />}
                                    {exportStatus === 'error' && <FiAlertCircle className="h-4 w-4 text-red-600" />}
                                </div>
                            ) : null}
                        </button>
                    ))}
                </div>

                <div className="rounded-lg border border-amber-100 bg-amber-50/80 px-3 py-2.5">
                    <div className="flex items-start gap-2">
                        <FiInfo className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
                        <p className="text-[11px] leading-relaxed text-amber-800">
                            Export runs in the background. You will receive the file by email when it is ready.
                        </p>
                    </div>
                </div>
            </div>
        </CapitalModalShell>
    );
};

export default CapitalExportModal;
