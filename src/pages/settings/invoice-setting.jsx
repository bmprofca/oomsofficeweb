import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import API_BASE_URL from '../../utils/api-controller';
import getHeaders from '../../utils/get-headers';
import {
    FiPlus,
    FiTrash2,
    FiFileText,
    FiSearch,
    FiX,
    FiCalendar,
    FiCheckCircle,
    FiXCircle,
    FiEye,
    FiCheck,
    FiGrid,
    FiList,
    FiMaximize2,
    FiMinimize2,
    FiDownload,
    FiChevronLeft,
    FiChevronRight,
    FiZoomIn,
    FiZoomOut,
} from 'react-icons/fi';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { Header, Sidebar } from '../../components/header';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Point react-pdf at a matching pdf.js worker build.
// webpack 5 (react-scripts 5+) understands `new URL(..., import.meta.url)` natively
// and turns it into a properly-hashed asset URL at build time — this guarantees the
// worker file always matches the exact pdfjs-dist version that's actually installed,
// so we never hit a CDN/version-mismatch 404 again.
// NOTE: if you're on react-scripts < 5 / webpack 4, `import.meta.url` is not supported.
// In that case, swap this line for the CDN fallback instead:
//   pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
).toString();

const InvoiceSettings = () => {
    const navigate = useNavigate();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(() => {
        const saved = localStorage.getItem('sidebarMinimized');
        return saved ? JSON.parse(saved) : false;
    });
    const [loading, setLoading] = useState(false);
    const [listError, setListError] = useState(null);
    const [invoicePrefixData, setInvoicePrefixData] = useState([]);
    const fetchAbortRef = useRef(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedType, setSelectedType] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [deleteModal, setDeleteModal] = useState(false);
    const [deleteConfirmText, setDeleteConfirmText] = useState('');
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState(null);
    const [activeTab, setActiveTab] = useState('prefix');
    const [formData, setFormData] = useState({
        type: '',
        prefix: '',
        issue_date: '',
        expire_date: '',
        current: '1',
    });

    // Format related states
    const [formatData, setFormatData] = useState(null);
    const [selectedFormatType, setSelectedFormatType] = useState('sale');
    const [selectedFormatSample, setSelectedFormatSample] = useState(null);
    const [showPreviewModal, setShowPreviewModal] = useState(false);
    const [previewPdfUrl, setPreviewPdfUrl] = useState(null);
    const [activatingFormat, setActivatingFormat] = useState(false);
    const [formatLoading, setFormatLoading] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const previewContainerRef = useRef(null);

    // Custom PDF viewer state (replaces native browser PDF plugin controls)
    const [numPages, setNumPages] = useState(null);
    const [pageNumber, setPageNumber] = useState(1);
    const [zoom, setZoom] = useState(1.0);
    const [pdfLoadError, setPdfLoadError] = useState(false);

    // Invoice type options
    const invoiceTypes = [
        { value: 'opening balance', label: 'Opening Balance' },
        { value: 'receive', label: 'Receive' },
        { value: 'payment', label: 'Payment' },
        { value: 'journal', label: 'Journal' },
        { value: 'contra', label: 'Contra' },
        { value: 'sale', label: 'Sale' },
        { value: 'purchase', label: 'Purchase' },
        { value: 'discount', label: 'Discount' },
        { value: 'expense', label: 'Expense' },
        { value: 'loan create', label: 'Loan Create' },
        { value: 'loan repayment', label: 'Loan Repayment' },
        { value: 'loan opening balance', label: 'Loan Opening Balance' },
        { value: 'asset depreciation', label: 'Asset Depreciation' },
        { value: 'asset sale', label: 'Asset Sale' },
        { value: 'asset purchase', label: 'Asset Purchase' },
    ];

    const formatDisplayNames = {
        classic: 'Classic',
        compact: 'Compact',
        minimal: 'Minimal',
    };

    useEffect(() => {
        localStorage.setItem('sidebarMinimized', JSON.stringify(isMinimized));
    }, [isMinimized]);

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

    useEffect(() => {
        fetchInvoicePrefixData();
        fetchFormatData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (activeTab === 'format') {
            fetchFormatData();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedFormatType]);

    const fetchInvoicePrefixData = async () => {
        const headers = getHeaders();
        if (!headers) {
            setListError('Missing authentication. Please sign in again.');
            return;
        }

        fetchAbortRef.current?.abort();
        const ac = new AbortController();
        fetchAbortRef.current = ac;

        setLoading(true);
        setListError(null);
        try {
            const response = await fetch(`${API_BASE_URL}/invoice/prefix/list`, {
                method: 'GET',
                headers,
                signal: ac.signal,
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const json = await response.json();

            if (json.success && Array.isArray(json.data)) {
                setInvoicePrefixData(json.data);
            } else {
                setInvoicePrefixData([]);
                setListError(json?.message || 'Unexpected response from server');
            }
        } catch (e) {
            if (e.name === 'AbortError') return;
            console.error('Prefix list fetch:', e);
            setInvoicePrefixData([]);
            setListError(e.message || 'Failed to load invoice prefix list');
        } finally {
            setLoading(false);
        }
    };

    const fetchFormatData = async () => {
        const headers = getHeaders();
        if (!headers) {
            toast.error('Missing authentication. Please sign in again.');
            return;
        }

        setFormatLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/invoice/formats?type=${selectedFormatType}`, {
                method: 'GET',
                headers,
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            // Check if response is JSON
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                throw new Error('Server returned non-JSON response. Please check if the endpoint is correct.');
            }

            const json = await response.json();

            if (json.success) {
                setFormatData(json.data);
            } else {
                setFormatData(null);
                toast.error(json?.message || 'Failed to load format data');
            }
        } catch (error) {
            console.error('Format fetch error:', error);
            toast.error(error.message || 'Failed to load invoice formats');
            setFormatData(null);
        } finally {
            setFormatLoading(false);
        }
    };

    const handleActivateFormat = async (formatId) => {
        const headers = getHeaders();
        if (!headers) {
            toast.error('Missing authentication. Please sign in again.');
            return;
        }

        setActivatingFormat(true);
        try {
            const response = await fetch(`${API_BASE_URL}/invoice/update-format`, {
                method: 'PUT',
                headers: {
                    ...headers,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    format_id: formatId,
                    type: selectedFormatType,
                }),
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            // Check if response is JSON
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                throw new Error('Server returned non-JSON response. Please check if the update-format endpoint is correct.');
            }

            const json = await response.json();

            if (!json.success) {
                throw new Error(json?.message || 'Update failed');
            }

            toast.success(`Format "${formatDisplayNames[formatId]}" activated successfully!`);
            await fetchFormatData();
        } catch (error) {
            console.error('Format activation error:', error);
            toast.error(error.message || 'Failed to activate format. Please check if the endpoint is correct.');
        } finally {
            setActivatingFormat(false);
        }
    };

    const handlePreviewFormat = (sample) => {
        try {
            if (sample.url) {
                setPreviewPdfUrl(sample.url);
            } else if (sample.data) {
                // Fallback for old base64 format (if any)
                let base64Data = sample.data;
                if (base64Data.includes(',')) {
                    base64Data = base64Data.split(',')[1];
                }
                base64Data = base64Data.replace(/\s/g, '');
                const binaryString = atob(base64Data);
                const bytes = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                }
                const blob = new Blob([bytes], { type: 'application/pdf' });
                const url = URL.createObjectURL(blob);
                setPreviewPdfUrl(url);
            } else {
                throw new Error('No PDF URL or data provided');
            }

            setSelectedFormatSample(sample);
            setShowPreviewModal(true);
            setIsFullscreen(false);
            // Reset the custom viewer state for the new document
            setNumPages(null);
            setPageNumber(1);
            setZoom(1.0);
            setPdfLoadError(false);
        } catch (error) {
            console.error('PDF preview error:', error);
            toast.error('Failed to load PDF preview. The file may be corrupted.');
        }
    };

    const handleDownloadPdf = () => {
        if (previewPdfUrl) {
            const link = document.createElement('a');
            link.href = previewPdfUrl;
            link.download = `${selectedFormatSample.format_id}_${selectedFormatType}_format.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            toast.success('Download started');
        }
    };

    const toggleFullscreen = () => {
        if (!isFullscreen) {
            if (previewContainerRef.current) {
                if (previewContainerRef.current.requestFullscreen) {
                    previewContainerRef.current.requestFullscreen();
                } else if (previewContainerRef.current.webkitRequestFullscreen) {
                    previewContainerRef.current.webkitRequestFullscreen();
                } else if (previewContainerRef.current.msRequestFullscreen) {
                    previewContainerRef.current.msRequestFullscreen();
                }
            }
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            } else if (document.msExitFullscreen) {
                document.msExitFullscreen();
            }
        }
    };

    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
        document.addEventListener('msfullscreenchange', handleFullscreenChange);

        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
            document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
            document.removeEventListener('msfullscreenchange', handleFullscreenChange);
        };
    }, []);

    const closePreviewModal = () => {
        if (previewPdfUrl) {
            URL.revokeObjectURL(previewPdfUrl);
        }
        setPreviewPdfUrl(null);
        setSelectedFormatSample(null);
        setShowPreviewModal(false);
        setIsFullscreen(false);
        setNumPages(null);
        setPageNumber(1);
        setZoom(1.0);
        setPdfLoadError(false);
    };

    // Keyboard navigation for the custom viewer (left/right arrows to page, +/- to zoom)
    useEffect(() => {
        if (!showPreviewModal) return;

        const handleKeyDown = (e) => {
            if (e.key === 'ArrowLeft') {
                setPageNumber((p) => Math.max(1, p - 1));
            } else if (e.key === 'ArrowRight') {
                setPageNumber((p) => Math.min(numPages || p, p + 1));
            } else if (e.key === '+' || e.key === '=') {
                setZoom((z) => Math.min(2.5, +(z + 0.1).toFixed(2)));
            } else if (e.key === '-') {
                setZoom((z) => Math.max(0.5, +(z - 0.1).toFixed(2)));
            } else if (e.key === 'Escape' && !isFullscreen) {
                closePreviewModal();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [showPreviewModal, numPages, isFullscreen]);

    const filteredInvoices = invoicePrefixData.filter((invoice) => {
        const matchesSearch =
            searchQuery === '' ||
            invoice.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
            invoice.prefix.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesType = selectedType === '' || invoice.type === selectedType;

        return matchesSearch && matchesType;
    });

    const isActive = (issue_date, expire_date) => {
        const now = new Date();
        const start = new Date(issue_date);
        const end = new Date(expire_date);
        return now >= start && now <= end;
    };

    const resetForm = () => {
        setFormData({
            type: '',
            prefix: '',
            issue_date: '',
            expire_date: '',
            current: '1',
        });
    };

    const handleInputChange = (field, value) => {
        setFormData((prev) => ({
            ...prev,
            [field]: value,
        }));
    };

    const formatDateForDisplay = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-GB');
    };

    const handleCreateInvoicePrefix = async (e) => {
        e.preventDefault();

        const headers = getHeaders();
        if (!headers) {
            toast.error('Missing authentication. Please sign in again.');
            return;
        }

        setLoading(true);

        try {
            const payload = {
                type: formData.type,
                prefix: formData.prefix,
                issue_date: formData.issue_date,
                expire_date: formData.expire_date,
                current: formData.current || 1,
            };

            const response = await fetch(`${API_BASE_URL}/invoice/prefix/create`, {
                method: 'POST',
                headers: {
                    ...headers,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const json = await response.json();

            if (!json.success) {
                throw new Error(json?.message || 'Create failed');
            }

            await fetchInvoicePrefixData();
            resetForm();
            setShowCreateModal(false);
            toast.success(json?.message || 'Invoice prefix created successfully!');
        } catch (error) {
            console.error('Prefix create error:', error);
            toast.error(error.message || 'Failed to create invoice prefix');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteInvoicePrefix = async (invoiceId) => {
        const headers = getHeaders();
        if (!headers) {
            toast.error('Missing authentication. Please sign in again.');
            return;
        }

        setDeleteLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/invoice/prefix/delete`, {
                method: 'DELETE',
                headers: {
                    ...headers,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ id: invoiceId }),
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const json = await response.json();
            if (!json.success) {
                throw new Error(json?.message || 'Delete failed');
            }

            setDeleteModal(false);
            setDeleteConfirmText('');
            setSelectedInvoice(null);
            await fetchInvoicePrefixData();
            toast.success(json?.message || 'Invoice prefix deleted successfully');
        } catch (error) {
            console.error('Prefix delete error:', error);
            toast.error(error.message || 'Failed to delete invoice prefix');
        } finally {
            setDeleteLoading(false);
        }
    };

    const openCreateModal = () => {
        resetForm();
        setShowCreateModal(true);
    };

    const getTypeColor = (type) => {
        const colors = {
            'opening balance': 'from-teal-500 to-teal-600',
            receive: 'from-purple-500 to-purple-600',
            payment: 'from-orange-500 to-orange-600',
            journal: 'from-indigo-500 to-indigo-600',
            contra: 'from-pink-500 to-pink-600',
            sale: 'from-green-500 to-green-600',
            purchase: 'from-blue-500 to-blue-600',
            discount: 'from-violet-500 to-violet-600',
            expense: 'from-red-500 to-red-600',
            'loan create': 'from-yellow-500 to-yellow-600',
            'loan repayment': 'from-lime-500 to-lime-600',
            'loan opening balance': 'from-emerald-500 to-emerald-600',
            'asset depreciation': 'from-cyan-500 to-cyan-600',
            'asset sale': 'from-sky-500 to-sky-600',
            'asset purchase': 'from-amber-500 to-amber-600',
        };
        return colors[type] || 'from-gray-500 to-gray-600';
    };

    const SkeletonRow = () => (
        <tr className="animate-pulse">
            <td className="p-4">
                <div className="h-3 bg-gray-200 rounded w-6"></div>
            </td>
            <td className="p-4">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gray-200 rounded-lg flex-shrink-0"></div>
                    <div className="h-5 bg-gray-200 rounded-full w-20"></div>
                </div>
            </td>
            <td className="p-4">
                <div className="h-7 bg-gray-200 rounded-lg w-32"></div>
            </td>
            <td className="p-4">
                <div className="h-6 bg-gray-200 rounded-full w-10 mx-auto"></div>
            </td>
            <td className="p-4">
                <div className="h-3 bg-gray-200 rounded w-44"></div>
            </td>
            <td className="p-4">
                <div className="h-6 bg-gray-200 rounded-full w-16 mx-auto"></div>
            </td>
            <td className="p-4">
                <div className="flex justify-center">
                    <div className="w-8 h-8 bg-gray-200 rounded"></div>
                </div>
            </td>
        </tr>
    );

const FormatCard = ({ sample, isActive, onPreview, onActivate, activating }) => {
    const [thumbError, setThumbError] = useState(false);
    const [thumbLoaded, setThumbLoaded] = useState(false);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -4 }}
            className={`bg-white rounded-xl border-2 transition-all duration-300 overflow-visible ${
                isActive ? 'border-green-500 shadow-lg shadow-green-100' : 'border-gray-200 hover:border-indigo-300 hover:shadow-md'
            }`}
        >
            <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                                isActive ? 'bg-green-100' : 'bg-indigo-100'
                            }`}
                        >
                            <FiFileText className={`w-6 h-6 ${isActive ? 'text-green-600' : 'text-indigo-600'}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="text-lg my-0 font-bold text-gray-800 capitalize truncate">
                                {formatDisplayNames[sample.format_id] || sample.format_id}
                            </h3>
                            <p className="text-xs my-0 text-gray-500 truncate">Format ID: {sample.format_id}</p>
                        </div>
                    </div>
                    {isActive && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200 flex-shrink-0 ml-2">
                            <FiCheckCircle className="w-3 h-3" />
                            Active
                        </span>
                    )}
                </div>

                {/* --- NEW: PDF thumbnail preview --- */}
                <div
                    onClick={() => onPreview(sample)}
                    className="relative mb-4 rounded-lg border border-gray-200 bg-gray-50 overflow-hidden cursor-pointer group"
                    style={{ height: '200px' }}
                >
                    {sample.url ? (
                        !thumbError ? (
                            <>
                                {!thumbLoaded && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-gray-100 animate-pulse">
                                        <FiFileText className="w-8 h-8 text-gray-300" />
                                    </div>
                                )}
                                <Document
                                    file={sample.url}
                                    loading={null}
                                    onLoadSuccess={() => setThumbLoaded(true)}
                                    onLoadError={() => setThumbError(true)}
                                    className="flex justify-center items-start h-full overflow-hidden"
                                >
                                    <Page
                                        pageNumber={1}
                                        width={260}
                                        renderTextLayer={false}
                                        renderAnnotationLayer={false}
                                        className="shadow-sm"
                                    />
                                </Document>
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                                    <FiEye className="w-6 h-6 text-white opacity-0 group-hover:opacity-90 transition-opacity" />
                                </div>
                            </>
                        ) : (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
                                <FiFileText className="w-8 h-8 mb-1" />
                                <span className="text-xs">Preview unavailable</span>
                            </div>
                        )
                    ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-gray-300">
                            <FiFileText className="w-10 h-10" />
                        </div>
                    )}
                </div>

                <div className="space-y-2">
                    <button
                        onClick={() => onPreview(sample)}
                        className="w-full py-2.5 px-4 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-lg text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 border border-gray-200"
                    >
                        <FiEye className="w-4 h-4" />
                        Preview
                    </button>

                    {!isActive && (
                        <button
                            onClick={() => onActivate(sample.format_id)}
                            disabled={activating}
                            className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <FiCheck className="w-4 h-4" />
                            {activating ? 'Activating...' : 'Activate'}
                        </button>
                    )}
                </div>
            </div>
        </motion.div>
    );
};

    // Sort samples to show active format first
    const getSortedSamples = () => {
        if (!formatData || !formatData.samples) return [];
        const samples = [...formatData.samples];
        return samples.sort((a, b) => {
            if (a.format_id === formatData.active_format) return -1;
            if (b.format_id === formatData.active_format) return 1;
            return 0;
        });
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

            <div className={`pt-16 transition-all duration-300 ease-in-out ${isMinimized ? 'md:pl-20' : 'md:pl-[260px]'}`}>
                <div className="max-w-full mx-auto px-4 sm:px-6 md:px-8 py-6">
                    <div className="h-full flex flex-col">
                        {/* Tabs */}
                        <div className="mb-6">
                            <div className="border-b border-gray-200">
                                <nav className="flex gap-8">
                                    <button
                                        onClick={() => setActiveTab('prefix')}
                                        className={`py-3 px-1 text-sm font-medium transition-all duration-200 border-b-2 ${
                                            activeTab === 'prefix'
                                                ? 'border-indigo-600 text-indigo-600'
                                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <FiList className="w-4 h-4" />
                                            Prefix Management
                                        </div>
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('format')}
                                        className={`py-3 px-1 text-sm font-medium transition-all duration-200 border-b-2 ${
                                            activeTab === 'format'
                                                ? 'border-indigo-600 text-indigo-600'
                                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <FiGrid className="w-4 h-4" />
                                            Invoice Format
                                        </div>
                                    </button>
                                </nav>
                            </div>
                        </div>

                        {/* Prefix Management Tab */}
                        {activeTab === 'prefix' && (
                            <div className="bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col h-full">
                                <div className="border-b border-gray-200 px-6 py-4">
                                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                                        <div>
                                            <h5 className="text-xl font-bold text-gray-800 mb-1">Invoice Prefix Management</h5>
                                            <p className="text-gray-500 text-xs">
                                                {filteredInvoices.length} of {invoicePrefixData.length} invoice prefixes shown
                                            </p>
                                        </div>

                                        <div className="flex flex-col lg:flex-row gap-3 w-full lg:w-auto">
                                            <div className="flex-1 relative min-w-[300px]">
                                                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                                <input
                                                    type="text"
                                                    placeholder="Search by type or prefix..."
                                                    value={searchQuery}
                                                    onChange={(e) => setSearchQuery(e.target.value)}
                                                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 font-medium transition-all duration-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm text-sm"
                                                />
                                            </div>

                                            <div className="flex gap-2">
                                                <select
                                                    value={selectedType}
                                                    onChange={(e) => setSelectedType(e.target.value)}
                                                    className="px-4 py-2.5 border border-gray-300 rounded-lg bg-white text-gray-700 font-medium transition-all duration-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm text-sm"
                                                >
                                                    <option value="">All Types</option>
                                                    {invoiceTypes.map((type) => (
                                                        <option key={type.value} value={type.value}>
                                                            {type.label}
                                                        </option>
                                                    ))}
                                                </select>

                                                <motion.button
                                                    onClick={openCreateModal}
                                                    className="px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 shadow-sm"
                                                    whileHover={{ scale: 1.02 }}
                                                    whileTap={{ scale: 0.98 }}
                                                >
                                                    <FiPlus className="w-4 h-4" />
                                                    Add Prefix
                                                </motion.button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex-1 overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                                            <tr>
                                                <th className="text-left p-4 font-semibold text-gray-700 text-sm">#</th>
                                                <th className="text-left p-4 font-semibold text-gray-700 text-sm">Type</th>
                                                <th className="text-left p-4 font-semibold text-gray-700 text-sm">Prefix</th>
                                                <th className="text-center p-4 font-semibold text-gray-700 text-sm">Current #</th>
                                                <th className="text-left p-4 font-semibold text-gray-700 text-sm">Valid Period</th>
                                                <th className="text-center p-4 font-semibold text-gray-700 text-sm">Status</th>
                                                <th className="text-center p-4 font-semibold text-gray-700 text-sm">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {loading ? (
                                                Array.from({ length: 5 }).map((_, index) => <SkeletonRow key={index} />)
                                            ) : filteredInvoices.length === 0 ? (
                                                <tr>
                                                    <td colSpan="7" className="p-8 text-center">
                                                        <div className="flex flex-col items-center justify-center py-8">
                                                            <FiFileText className="w-16 h-16 text-gray-300 mb-4" />
                                                            <p className="text-gray-500 text-lg font-medium mb-2">
                                                                {listError ? 'Failed to load prefixes' : 'No invoice prefixes found'}
                                                            </p>
                                                            <p className="text-gray-400 text-sm mb-6">
                                                                {listError ? listError : 'Try adjusting your search or add a new prefix'}
                                                            </p>
                                                            {listError ? (
                                                                <button
                                                                    onClick={fetchInvoicePrefixData}
                                                                    className="px-6 py-3 bg-gray-600 text-white rounded-lg text-sm font-medium hover:bg-gray-700 transition-all duration-200 shadow-sm"
                                                                >
                                                                    Retry
                                                                </button>
                                                            ) : (
                                                                <button
                                                                    onClick={openCreateModal}
                                                                    className="px-6 py-3 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-all duration-200 shadow-sm"
                                                                >
                                                                    <FiPlus className="w-4 h-4 inline mr-2" />
                                                                    Add New Prefix
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ) : (
                                                filteredInvoices.map((invoice, index) => {
                                                    const active = isActive(invoice.issue_date, invoice.expire_date);
                                                    return (
                                                        <tr
                                                            key={invoice.id}
                                                            className={`transition-colors ${
                                                                active ? 'hover:bg-gray-50' : 'bg-gray-50/60 hover:bg-gray-100/60 opacity-80'
                                                            }`}
                                                        >
                                                            <td className="p-4 text-sm text-gray-600 font-medium">{index + 1}</td>
                                                            <td className="p-4">
                                                                <div className="flex items-center gap-3">
                                                                    <div
                                                                        className={`w-8 h-8 bg-gradient-to-br ${getTypeColor(
                                                                            invoice.type
                                                                        )} rounded-lg flex items-center justify-center shadow-sm`}
                                                                    >
                                                                        <FiFileText className="w-4 h-4 text-white" />
                                                                    </div>
                                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 capitalize">
                                                                        {invoice.type}
                                                                    </span>
                                                                </div>
                                                            </td>
                                                            <td className="p-4">
                                                                <code className="text-sm font-mono text-gray-800 bg-gray-100 px-3 py-1.5 rounded-lg border border-gray-200">
                                                                    {invoice.prefix}
                                                                </code>
                                                            </td>
                                                            <td className="p-4 text-center">
                                                                <span className="inline-flex items-center justify-center min-w-[2rem] px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                                                    {invoice.current ?? '—'}
                                                                </span>
                                                            </td>
                                                            <td className="p-4">
                                                                <div className="flex items-center gap-2 text-sm text-gray-700">
                                                                    <FiCalendar className="w-3 h-3 text-gray-400 flex-shrink-0" />
                                                                    <span>{formatDateForDisplay(invoice.issue_date)}</span>
                                                                    <span className="text-gray-400">→</span>
                                                                    <FiCalendar className="w-3 h-3 text-gray-400 flex-shrink-0" />
                                                                    <span>{formatDateForDisplay(invoice.expire_date)}</span>
                                                                </div>
                                                            </td>
                                                            <td className="p-4 text-center">
                                                                {active ? (
                                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200">
                                                                        <FiCheckCircle className="w-3 h-3" />
                                                                        Active
                                                                    </span>
                                                                ) : (
                                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-600 border border-red-200">
                                                                        <FiXCircle className="w-3 h-3" />
                                                                        Inactive
                                                                    </span>
                                                                )}
                                                            </td>
                                                            <td className="p-4">
                                                                <div className="flex justify-center">
                                                                    <button
                                                                        onClick={() => {
                                                                            setSelectedInvoice(invoice);
                                                                            setDeleteConfirmText('');
                                                                            setDeleteModal(true);
                                                                        }}
                                                                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                                        title="Delete"
                                                                    >
                                                                        <FiTrash2 className="w-4 h-4" />
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                })
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* Invoice Format Tab */}
                        {activeTab === 'format' && (
                            <div className="bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col h-full">
                                <div className="border-b border-gray-200 px-6 py-4">
                                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                                        <div>
                                            <h5 className="text-xl font-bold text-gray-800 mb-1">Invoice Format Management</h5>
                                            <p className="text-gray-500 text-xs">
                                                Manage and activate different invoice formats for each invoice type
                                            </p>
                                        </div>

                                        <div className="w-full lg:w-72">
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Invoice Type</label>
                                            <select
                                                value={selectedFormatType}
                                                onChange={(e) => setSelectedFormatType(e.target.value)}
                                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-white text-gray-700 font-medium transition-all duration-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm text-sm"
                                            >
                                                {invoiceTypes.map((type) => (
                                                    <option key={type.value} value={type.value}>
                                                        {type.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-6">
                                    {formatLoading ? (
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                            {[1, 2, 3].map((i) => (
                                                <div key={i} className="animate-pulse">
                                                    <div className="bg-gray-100 rounded-xl p-6">
                                                        <div className="flex items-center gap-3 mb-4">
                                                            <div className="w-12 h-12 bg-gray-200 rounded-xl"></div>
                                                            <div className="flex-1">
                                                                <div className="h-5 bg-gray-200 rounded w-24 mb-2"></div>
                                                                <div className="h-3 bg-gray-200 rounded w-20"></div>
                                                            </div>
                                                        </div>
                                                        <div className="space-y-3">
                                                            <div className="h-10 bg-gray-200 rounded-lg"></div>
                                                            <div className="h-10 bg-gray-200 rounded-lg"></div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : formatData && formatData.samples ? (
                                        <div>
                                            <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                                                <p className="text-sm text-blue-800">
                                                    <strong>Branch ID:</strong> {formatData.branch_id || 'N/A'} |
                                                    <strong className="ml-3">Active Format:</strong>{' '}
                                                    {formatDisplayNames[formatData.active_format] || formatData.active_format}
                                                </p>
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                                                {getSortedSamples().map((sample) => (
                                                    <FormatCard
                                                        key={sample.format_id}
                                                        sample={sample}
                                                        isActive={formatData.active_format === sample.format_id}
                                                        onPreview={handlePreviewFormat}
                                                        onActivate={handleActivateFormat}
                                                        activating={activatingFormat}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center py-12">
                                            <FiFileText className="w-16 h-16 text-gray-300 mb-4" />
                                            <p className="text-gray-500 text-lg font-medium mb-2">No formats found</p>
                                            <p className="text-gray-400 text-sm">Could not load invoice formats for this type</p>
                                            <button
                                                onClick={fetchFormatData}
                                                className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm"
                                            >
                                                Retry
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Create Invoice Prefix Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden transform transition-all duration-300">
                        <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white px-6 py-4 flex justify-between items-center">
                            <div>
                                <h2 className="text-xl font-bold">Add Invoice Prefix</h2>
                                <p className="text-indigo-100 text-sm mt-1">Configure new invoice prefix settings</p>
                            </div>
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="text-white hover:text-indigo-200 transition-colors duration-200 p-1 rounded-lg hover:bg-indigo-500"
                            >
                                <FiX className="w-6 h-6" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateInvoicePrefix}>
                            <div className="p-6">
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Invoice Type</label>
                                            <select
                                                value={formData.type}
                                                onChange={(e) => handleInputChange('type', e.target.value)}
                                                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all duration-200"
                                                required
                                            >
                                                <option value="">Select Invoice Type</option>
                                                {invoiceTypes.map((type) => (
                                                    <option key={type.value} value={type.value}>
                                                        {type.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Prefix</label>
                                            <input
                                                type="text"
                                                value={formData.prefix}
                                                onChange={(e) => handleInputChange('prefix', e.target.value)}
                                                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all duration-200"
                                                placeholder="Ex: COMPANY/2025/"
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                <FiCalendar className="inline w-4 h-4 mr-2 text-gray-400" />
                                                Issue Date
                                            </label>
                                            <input
                                                type="date"
                                                value={formData.issue_date}
                                                onChange={(e) => handleInputChange('issue_date', e.target.value)}
                                                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all duration-200"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                <FiCalendar className="inline w-4 h-4 mr-2 text-gray-400" />
                                                Expire Date
                                            </label>
                                            <input
                                                type="date"
                                                value={formData.expire_date}
                                                onChange={(e) => handleInputChange('expire_date', e.target.value)}
                                                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all duration-200"
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Starting Number</label>
                                            <input
                                                type="number"
                                                min="1"
                                                value={formData.current}
                                                onChange={(e) => handleInputChange('current', e.target.value)}
                                                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all duration-200"
                                                placeholder="1"
                                            />
                                            <p className="mt-1 text-xs text-gray-500">This will be the next invoice number to be used.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="border-t px-6 py-4 bg-gray-50 flex justify-end gap-3">
                                <motion.button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="px-6 py-3 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-200 transition-all duration-200 hover:shadow-sm text-gray-700"
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    Cancel
                                </motion.button>
                                <motion.button
                                    type="submit"
                                    disabled={loading}
                                    className="px-6 py-3 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all duration-200 hover:shadow-md shadow-sm disabled:opacity-50"
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    {loading ? 'Adding...' : 'Add Prefix'}
                                </motion.button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteModal && selectedInvoice && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 transition-all duration-300">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md transform transition-all duration-300">
                        <div className="bg-gradient-to-r from-red-600 to-red-700 text-white px-6 py-4 flex justify-between items-center rounded-t-xl">
                            <h2 className="text-xl font-bold">Delete Invoice Prefix</h2>
                            <button
                                onClick={() => {
                                    setDeleteModal(false);
                                    setDeleteConfirmText('');
                                }}
                                className="text-white hover:text-red-200 transition-colors duration-200 p-1 rounded-lg hover:bg-red-500"
                            >
                                <FiX className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="p-6">
                            <div className="text-center mb-5">
                                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <FiTrash2 className="w-8 h-8 text-red-600" />
                                </div>
                                <p className="text-slate-700 text-sm">
                                    Type <span className="font-semibold">delete</span> to confirm deleting prefix
                                    <span className="font-semibold"> {selectedInvoice.prefix}</span>.
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Confirmation Text</label>
                                <input
                                    type="text"
                                    value={deleteConfirmText}
                                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                                    placeholder='Type "delete"'
                                    className="w-full px-4 py-3 border border-slate-300 rounded-lg text-slate-700 font-medium transition-all duration-200 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
                                />
                            </div>
                        </div>

                        <div className="border-t px-6 py-4 bg-slate-50 flex justify-between items-center rounded-b-xl">
                            <button
                                onClick={() => {
                                    setDeleteModal(false);
                                    setDeleteConfirmText('');
                                }}
                                className="px-6 py-3 text-sm font-medium border border-slate-300 rounded-lg hover:bg-slate-200 transition-all duration-200 hover:shadow-sm text-slate-700"
                            >
                                Cancel
                            </button>

                            <button
                                onClick={() => handleDeleteInvoicePrefix(selectedInvoice.id)}
                                disabled={deleteLoading || deleteConfirmText.trim().toLowerCase() !== 'delete'}
                                className="px-6 py-3 text-sm font-medium bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg hover:from-red-700 hover:to-red-800 transition-all duration-200 hover:shadow-md shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                <FiTrash2 className="w-4 h-4" />
                                {deleteLoading ? 'Deleting...' : 'Confirm Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Full Screen PDF Preview Modal — custom pdf.js-powered viewer, no native browser plugin UI */}
            {showPreviewModal && previewPdfUrl && selectedFormatSample && (
                <div className="fixed inset-0 bg-black bg-opacity-95 z-50 flex flex-col">
                    {/* Modal Header */}
                    <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white px-6 py-2 flex justify-between items-center shadow-lg">
                        <div>
                            <h2 className="text-lg my-0 font-bold capitalize">
                                {formatDisplayNames[selectedFormatSample.format_id]} Format Preview
                            </h2>
                            <p className="text-indigo-100 text-xs my-0">Previewing invoice format for {selectedFormatType} type</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={handleDownloadPdf}
                                className="text-white hover:text-indigo-200 transition-colors duration-200 p-2 rounded-lg hover:bg-indigo-500"
                                title="Download PDF"
                            >
                                <FiDownload className="w-5 h-5" />
                            </button>
                            <button
                                onClick={toggleFullscreen}
                                className="text-white hover:text-indigo-200 transition-colors duration-200 p-2 rounded-lg hover:bg-indigo-500"
                                title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                            >
                                {isFullscreen ? <FiMinimize2 className="w-5 h-5" /> : <FiMaximize2 className="w-5 h-5" />}
                            </button>
                            <button
                                onClick={closePreviewModal}
                                className="text-white hover:text-indigo-200 transition-colors duration-200 p-2 rounded-lg hover:bg-indigo-500"
                                title="Close"
                            >
                                <FiX className="w-6 h-6" />
                            </button>
                        </div>
                    </div>

                    {/* Custom viewer container */}
                    <div ref={previewContainerRef} className="flex-1 bg-gray-900 flex flex-col overflow-hidden">
                        {/* Custom toolbar (replaces the native browser PDF plugin toolbar) */}
                        <div className="flex items-center justify-center gap-3 bg-gray-800 border-b border-gray-700 py-2 px-4">
                            <button
                                onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
                                disabled={pageNumber <= 1}
                                className="p-2 text-white bg-gray-700 rounded-lg hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                title="Previous page"
                            >
                                <FiChevronLeft className="w-4 h-4" />
                            </button>

                            <span className="text-sm text-gray-200 min-w-[90px] text-center select-none">
                                Page {pageNumber} of {numPages || '—'}
                            </span>

                            <button
                                onClick={() => setPageNumber((p) => Math.min(numPages || p, p + 1))}
                                disabled={pageNumber >= (numPages || 1)}
                                className="p-2 text-white bg-gray-700 rounded-lg hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                title="Next page"
                            >
                                <FiChevronRight className="w-4 h-4" />
                            </button>

                            <div className="w-px h-6 bg-gray-600 mx-2" />

                            <button
                                onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.1).toFixed(2)))}
                                className="p-2 text-white bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
                                title="Zoom out"
                            >
                                <FiZoomOut className="w-4 h-4" />
                            </button>

                            <span className="text-sm text-gray-200 w-12 text-center select-none">{Math.round(zoom * 100)}%</span>

                            <button
                                onClick={() => setZoom((z) => Math.min(2.5, +(z + 0.1).toFixed(2)))}
                                className="p-2 text-white bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
                                title="Zoom in"
                            >
                                <FiZoomIn className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Rendered page(s) */}
                        <div className="flex-1 overflow-auto flex justify-center p-4">
                            {pdfLoadError ? (
                                <div className="text-center text-gray-300 mt-16">
                                    <p className="text-sm mb-3">Could not render the PDF preview.</p>
                                    <button
                                        onClick={handleDownloadPdf}
                                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm"
                                    >
                                        Download instead
                                    </button>
                                </div>
                            ) : (
                                <Document
                                    file={previewPdfUrl}
                                    onLoadSuccess={({ numPages: loadedPages }) => {
                                        setNumPages(loadedPages);
                                        setPageNumber(1);
                                    }}
                                    onLoadError={(error) => {
                                        console.error('PDF render error:', error);
                                        setPdfLoadError(true);
                                        toast.error('Failed to render PDF preview.');
                                    }}
                                    loading={<p className="text-gray-300 text-sm mt-16">Loading preview...</p>}
                                >
                                    <Page
                                        pageNumber={pageNumber}
                                        scale={zoom}
                                        className="shadow-2xl"
                                        renderTextLayer={false}
                                        renderAnnotationLayer={false}
                                    />
                                </Document>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default InvoiceSettings;