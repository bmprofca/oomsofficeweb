import React, { useState, useEffect } from 'react';
import { Sidebar, Header } from '../../../components/header';
import {
    FiBarChart2,
    FiTrash2,
    FiCheckSquare,
    FiSquare,
    FiClock,
    FiCheckCircle,
    FiXCircle,
    FiPauseCircle,
    FiEye,
    FiRefreshCw,
    FiCalendar,
    FiSearch,
    FiFilter,
    FiDownload
} from 'react-icons/fi';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import API_BASE_URL from '../../../utils/api-controller';
import getHeaders from '../../../utils/get-headers';

const BroadcastReport = () => {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(() => {
        const saved = localStorage.getItem('sidebarMinimized');
        return saved ? JSON.parse(saved) : false;
    });
    
    // Get active tab from URL or default to 'text-message'
    const urlTab = searchParams.get('tab');
    const [activeTab, setActiveTab] = useState(urlTab || 'text-message');
    
    // Report states
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedItems, setSelectedItems] = useState([]);
    const [selectAll, setSelectAll] = useState(false);
    const [showBulkActions, setShowBulkActions] = useState(false);
    const [pagination, setPagination] = useState({
        page_no: 1,
        limit: 20,
        total: 0,
        total_pages: 1,
        has_next: false,
        has_prev: false
    });
    const [summary, setSummary] = useState({
        total_broadcasts: 0,
        total_emails: 0,
        total_sent: 0,
        total_pending: 0,
        total_failed: 0,
        avg_success_rate: 0
    });
    
    // Filter states
    const [filters, setFilters] = useState({
        start_date: '',
        end_date: '',
        status: '',
        search: ''
    });
    const [showFilters, setShowFilters] = useState(false);
    const [exporting, setExporting] = useState(false);

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

    // Update URL when tab changes
    useEffect(() => {
        if (urlTab !== activeTab) {
            const newParams = new URLSearchParams(searchParams);
            newParams.set('tab', activeTab);
            setSearchParams(newParams);
        }
    }, [activeTab, setSearchParams, searchParams, urlTab]);

    // Set active tab from URL on component mount or when URL changes
    useEffect(() => {
        if (urlTab && urlTab !== activeTab) {
            setActiveTab(urlTab);
        }
    }, [urlTab, activeTab]);

    // Load reports based on active tab and filters
    useEffect(() => {
        fetchReports();
    }, [activeTab, pagination.page_no, filters]);

    useEffect(() => {
        setShowBulkActions(selectedItems.length > 0);
    }, [selectedItems]);

    // Fetch reports from API
    const fetchReports = async () => {
        setLoading(true);
        try {
            const headers = await getHeaders();
            const params = new URLSearchParams({
                page_no: pagination.page_no,
                limit: pagination.limit,
                ...(filters.start_date && { start_date: filters.start_date }),
                ...(filters.end_date && { end_date: filters.end_date }),
                ...(filters.status && { status: filters.status }),
                ...(filters.search && { search: filters.search })
            });

            let endpoint = '';
            switch (activeTab) {
                case 'text-message':
                    endpoint = `${API_BASE_URL}/broadcast/email/email/report-list?${params}`;
                    break;
                case 'whatsapp':
                    endpoint = `${API_BASE_URL}/whatsapp/broadcast/report-list?${params}`;
                    break;
                case 'push':
                    endpoint = `${API_BASE_URL}/push/broadcast/report-list?${params}`;
                    break;
                default:
                    endpoint = `${API_BASE_URL}/email/broadcast/report-list?${params}`;
            }

            const response = await fetch(endpoint, { headers });
            const result = await response.json();

            if (result.success) {
                setReports(result.data.data);
                setSummary(result.data.summary);
                setPagination(prev => ({
                    ...prev,
                    total: result.data.pagination.total,
                    total_pages: result.data.pagination.total_pages,
                    has_next: result.data.pagination.has_next,
                    has_prev: result.data.pagination.has_prev
                }));
            } else {
                toast.error(result.message || 'Failed to fetch reports');
            }
        } catch (error) {
            console.error('Fetch reports error:', error);
            toast.error('Failed to fetch reports');
        } finally {
            setLoading(false);
        }
    };

    
    const handleTabChange = (tab) => {
        setActiveTab(tab);
    };

    // Handle bulk delete
    const handleBulkDelete = async () => {
        if (selectedItems.length === 0) {
            toast.error('Please select at least one item to delete');
            return;
        }

        if (!window.confirm(`Are you sure you want to delete ${selectedItems.length} selected broadcast(s)? This action cannot be undone.`)) {
            return;
        }

        setLoading(true);
        try {
            const headers = await getHeaders();
            let endpoint = '';
            
            switch (activeTab) {
                case 'text-message':
                    endpoint = `${API_BASE_URL}/email/broadcast/bulk-delete`;
                    break;
                case 'whatsapp':
                    endpoint = `${API_BASE_URL}/whatsapp/broadcast/bulk-delete`;
                    break;
                case 'push':
                    endpoint = `${API_BASE_URL}/push/broadcast/bulk-delete`;
                    break;
                default:
                    endpoint = `${API_BASE_URL}/email/broadcast/bulk-delete`;
            }

            const response = await fetch(endpoint, {
                method: 'DELETE',
                headers: {
                    ...headers,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ broadcast_ids: selectedItems })
            });
            const result = await response.json();

            if (result.success) {
                toast.success(`Successfully deleted ${selectedItems.length} broadcast(s)`);
                setSelectedItems([]);
                setSelectAll(false);
                fetchReports();
            } else {
                toast.error(result.message || 'Failed to delete broadcasts');
            }
        } catch (error) {
            console.error('Bulk delete error:', error);
            toast.error('Failed to delete broadcasts');
        } finally {
            setLoading(false);
        }
    };

    // Handle view details
    const handleViewDetails = async (broadcastId, status) => {
        navigate(`/batch-report?broadcast_id=${broadcastId}&status=${status}&tab=${activeTab}`);
    };

    // Handle export
    const handleExport = async (format = 'csv') => {
        setExporting(true);
        try {
            const headers = await getHeaders();
            const params = new URLSearchParams({
                start_date: filters.start_date || '2024-01-01',
                end_date: filters.end_date || new Date().toISOString().split('T')[0],
                format
            });

            let endpoint = '';
            switch (activeTab) {
                case 'text-message':
                    endpoint = `${API_BASE_URL}/email/analytics/export?${params}`;
                    break;
                case 'whatsapp':
                    endpoint = `${API_BASE_URL}/whatsapp/analytics/export?${params}`;
                    break;
                case 'push':
                    endpoint = `${API_BASE_URL}/push/analytics/export?${params}`;
                    break;
                default:
                    endpoint = `${API_BASE_URL}/email/analytics/export?${params}`;
            }

            if (format === 'csv') {
                window.open(endpoint, '_blank');
            } else {
                const response = await fetch(endpoint, { headers });
                const result = await response.json();
                if (result.success) {
                    // Download JSON as file
                    const dataStr = JSON.stringify(result.data, null, 2);
                    const blob = new Blob([dataStr], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `broadcast_report_${new Date().toISOString().split('T')[0]}.json`;
                    link.click();
                    URL.revokeObjectURL(url);
                    toast.success('Export completed successfully');
                } else {
                    toast.error(result.message || 'Export failed');
                }
            }
        } catch (error) {
            console.error('Export error:', error);
            toast.error('Failed to export data');
        } finally {
            setExporting(false);
        }
    };

    // Handle item selection
    const handleItemSelect = (broadcastId) => {
        setSelectedItems(prev => {
            if (prev.includes(broadcastId)) {
                return prev.filter(id => id !== broadcastId);
            } else {
                return [...prev, broadcastId];
            }
        });
    };

    // Handle select all
    const handleSelectAll = () => {
        if (selectAll) {
            setSelectedItems([]);
        } else {
            setSelectedItems(reports.map(report => report.broadcast_id));
        }
        setSelectAll(!selectAll);
    };

    // Handle filter change
    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
        setPagination(prev => ({ ...prev, page_no: 1 })); // Reset to first page on filter change
    };

    // Clear all filters
    const clearFilters = () => {
        setFilters({
            start_date: '',
            end_date: '',
            status: '',
            search: ''
        });
        setPagination(prev => ({ ...prev, page_no: 1 }));
        setShowFilters(false);
    };

    // Format date
    const formatDate = (dateString) => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };

    // Get status badge class
    const getStatusBadgeClass = (status) => {
        switch (status) {
            case 'completed':
                return 'bg-green-100 text-green-800';
            case 'processing':
                return 'bg-blue-100 text-blue-800';
            case 'scheduled':
                return 'bg-yellow-100 text-yellow-800';
            case 'failed':
                return 'bg-red-100 text-red-800';
            case 'cancelled':
                return 'bg-gray-100 text-gray-800';
            case 'paused':
                return 'bg-orange-100 text-orange-800';
            case 'partial':
                return 'bg-purple-100 text-purple-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    // Skeleton Components
    const SkeletonStatCard = () => (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between">
                <div className="w-full">
                    <div className="h-4 bg-gray-200 rounded animate-pulse mb-2 w-1/2"></div>
                    <div className="h-8 bg-gray-200 rounded animate-pulse w-3/4"></div>
                </div>
                <div className="bg-gray-200 rounded-lg p-3">
                    <div className="w-6 h-6 bg-gray-300 rounded animate-pulse"></div>
                </div>
            </div>
        </div>
    );

    // Filter panel
    const FilterPanel = () => (
        <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-gray-50 rounded-lg p-4 mb-4 border border-gray-200"
        >
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                    <input
                        type="date"
                        value={filters.start_date}
                        onChange={(e) => handleFilterChange('start_date', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                    <input
                        type="date"
                        value={filters.end_date}
                        onChange={(e) => handleFilterChange('end_date', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <select
                        value={filters.status}
                        onChange={(e) => handleFilterChange('status', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
                    >
                        <option value="">All Status</option>
                        <option value="completed">Completed</option>
                        <option value="processing">Processing</option>
                        <option value="scheduled">Scheduled</option>
                        <option value="failed">Failed</option>
                        <option value="cancelled">Cancelled</option>
                        <option value="paused">Paused</option>
                        <option value="partially_failed">Partially Failed</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                    <input
                        type="text"
                        placeholder="Search by template name..."
                        value={filters.search}
                        onChange={(e) => handleFilterChange('search', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
                <button
                    onClick={clearFilters}
                    className="px-3 py-1.5 text-sm bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
                >
                    Clear Filters
                </button>
                <button
                    onClick={() => setShowFilters(false)}
                    className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                    Apply Filters
                </button>
            </div>
        </motion.div>
    );

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

            {/* Main content */}
            <div className={`pt-16 transition-all duration-300 ease-in-out ${isMinimized ? 'md:pl-20' : 'md:pl-[260px]'}`}>
                <div className="h-full flex flex-col">
                    <motion.div 
                        className="bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col h-full mx-4 sm:mx-6 md:mx-8 my-6"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                    >
                        <div className="border-b border-gray-200 px-6 py-4">
                            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                                <div>
                                    <h5 className="text-xl font-bold text-gray-800 mb-1">
                                        Broadcast Report
                                    </h5>
                                    <p className="text-gray-500 text-xs">
                                        View and manage broadcast reports
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setShowFilters(!showFilters)}
                                        className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors flex items-center gap-2"
                                    >
                                        <FiFilter className="w-4 h-4" />
                                        Filters
                                    </button>
                                    <button
                                        onClick={fetchReports}
                                        disabled={loading}
                                        className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors flex items-center gap-2"
                                    >
                                        <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                                        Refresh
                                    </button>
                                    <button
                                        onClick={() => handleExport('csv')}
                                        disabled={exporting}
                                        className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center gap-2"
                                    >
                                        <FiDownload className="w-4 h-4" />
                                        {exporting ? 'Exporting...' : 'Export'}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6">
                            <div className="max-w-7xl mx-auto">
                                {/* Tabs */}
                                <div className="mb-6">
                                    <div className="border-b border-gray-200">
                                        
                                    </div>
                                </div>

                                {/* Filter Panel */}
                                <AnimatePresence>
                                    {showFilters && <FilterPanel />}
                                </AnimatePresence>

                                {/* Report Summary Cards */}
                                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
                                    {loading ? (
                                        <>
                                            <SkeletonStatCard />
                                            <SkeletonStatCard />
                                            <SkeletonStatCard />
                                            <SkeletonStatCard />
                                            <SkeletonStatCard />
                                        </>
                                    ) : (
                                        <>
                                            <motion.div 
                                                className="bg-white rounded-lg border border-gray-200 p-4"
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: 0.1 }}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <p className="text-sm text-gray-500">Total Broadcasts</p>
                                                        <p className="text-2xl font-bold text-gray-800">{summary.total_broadcasts}</p>
                                                    </div>
                                                    <div className="bg-blue-100 rounded-lg p-3">
                                                        <FiBarChart2 className="w-6 h-6 text-blue-600" />
                                                    </div>
                                                </div>
                                            </motion.div>
                                            <motion.div 
                                                className="bg-white rounded-lg border border-gray-200 p-4"
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: 0.2 }}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <p className="text-sm text-gray-500">Total Emails</p>
                                                        <p className="text-2xl font-bold text-gray-800">{summary.total_emails}</p>
                                                    </div>
                                                    <div className="bg-purple-100 rounded-lg p-3">
                                                        <FiCheckCircle className="w-6 h-6 text-purple-600" />
                                                    </div>
                                                </div>
                                            </motion.div>
                                            <motion.div 
                                                className="bg-white rounded-lg border border-gray-200 p-4"
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: 0.3 }}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <p className="text-sm text-gray-500">Total Sent</p>
                                                        <p className="text-2xl font-bold text-green-600">{summary.total_sent}</p>
                                                    </div>
                                                    <div className="bg-green-100 rounded-lg p-3">
                                                        <FiCheckCircle className="w-6 h-6 text-green-600" />
                                                    </div>
                                                </div>
                                            </motion.div>
                                            <motion.div 
                                                className="bg-white rounded-lg border border-gray-200 p-4"
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: 0.4 }}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <p className="text-sm text-gray-500">Total Failed</p>
                                                        <p className="text-2xl font-bold text-red-600">{summary.total_failed}</p>
                                                    </div>
                                                    <div className="bg-red-100 rounded-lg p-3">
                                                        <FiXCircle className="w-6 h-6 text-red-600" />
                                                    </div>
                                                </div>
                                            </motion.div>
                                            <motion.div 
                                                className="bg-white rounded-lg border border-gray-200 p-4"
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: 0.5 }}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <p className="text-sm text-gray-500">Success Rate</p>
                                                        <p className="text-2xl font-bold text-gray-800">{summary.avg_success_rate}%</p>
                                                    </div>
                                                    <div className="bg-yellow-100 rounded-lg p-3">
                                                        <FiBarChart2 className="w-6 h-6 text-yellow-600" />
                                                    </div>
                                                </div>
                                            </motion.div>
                                        </>
                                    )}
                                </div>

                                {/* Report Table */}
                                <motion.div 
                                    className="bg-white rounded-lg border border-gray-200"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.3 }}
                                >
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="bg-gray-50 border-b border-gray-200">
                                                    <th className="text-left p-3 font-medium text-gray-700">#</th>
                                                    <th className="text-left p-3 font-medium text-gray-700">Date</th>
                                                    <th className="text-left p-3 font-medium text-gray-700">Template</th>
                                                    <th className="text-center p-3 font-medium text-gray-700">Total</th>
                                                    <th className="text-center p-3 font-medium text-gray-700">Pending</th>
                                                    <th className="text-center p-3 font-medium text-gray-700">Sent</th>
                                                    <th className="text-center p-3 font-medium text-gray-700">Failed</th>
                                                    <th className="text-center p-3 font-medium text-gray-700">Paused</th>
                                                    <th className="text-center p-3 font-medium text-gray-700">Status</th>
                                                    <th className="text-center p-3 font-medium text-gray-700">Actions</th>
                                                    <th className="text-center p-3 font-medium text-gray-700">
                                                        <input
                                                            type="checkbox"
                                                            checked={selectAll}
                                                            onChange={handleSelectAll}
                                                            className="form-check-input h-4 w-4 text-blue-600 rounded border-gray-300"
                                                        />
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {loading ? (
                                                    <tr>
                                                        <td colSpan="11" className="text-center py-8">
                                                            <div className="flex justify-center items-center">
                                                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ) : reports.length === 0 ? (
                                                    <tr>
                                                        <td colSpan="11" className="text-center py-8 text-gray-500">
                                                            No reports found
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    reports.map((report, index) => (
                                                        <motion.tr 
                                                            key={report.broadcast_id} 
                                                            className="border-b border-gray-200 hover:bg-gray-50"
                                                            initial={{ opacity: 0, y: 10 }}
                                                            animate={{ opacity: 1, y: 0 }}
                                                            transition={{ delay: index * 0.05 }}
                                                        >
                                                            <td className="p-3 text-gray-600">{report.sl_no || ((pagination.page_no - 1) * pagination.limit) + index + 1}</td>
                                                            <td className="p-3 text-gray-600">{report.date}</td>
                                                            <td className="p-3 text-gray-600 font-medium">{report.template}</td>
                                                            <td className="p-3 text-center font-semibold">{report.total}</td>
                                                            <td className="p-3 text-center">
                                                                <button
                                                                    onClick={() => handleViewDetails(report.broadcast_id, 'pending')}
                                                                    className="text-yellow-600 hover:text-yellow-800 font-medium hover:underline flex items-center justify-center gap-1 mx-auto"
                                                                >
                                                                    <FiClock className="w-4 h-4" />
                                                                    {report.pending}
                                                                </button>
                                                            </td>
                                                            <td className="p-3 text-center">
                                                                <button
                                                                    onClick={() => handleViewDetails(report.broadcast_id, 'sent')}
                                                                    className="text-green-600 hover:text-green-800 font-medium hover:underline flex items-center justify-center gap-1 mx-auto"
                                                                >
                                                                    <FiCheckCircle className="w-4 h-4" />
                                                                    {report.send}
                                                                </button>
                                                            </td>
                                                            <td className="p-3 text-center">
                                                                <button
                                                                    onClick={() => handleViewDetails(report.broadcast_id, 'failed')}
                                                                    className="text-red-600 hover:text-red-800 font-medium hover:underline flex items-center justify-center gap-1 mx-auto"
                                                                >
                                                                    <FiXCircle className="w-4 h-4" />
                                                                    {report.failed}
                                                                </button>
                                                            </td>
                                                            <td className="p-3 text-center">
                                                                <button
                                                                    onClick={() => handleViewDetails(report.broadcast_id, 'paused')}
                                                                    className="text-blue-600 hover:text-blue-800 font-medium hover:underline flex items-center justify-center gap-1 mx-auto"
                                                                >
                                                                    <FiPauseCircle className="w-4 h-4" />
                                                                    {report.paused}
                                                                </button>
                                                            </td>
                                                            <td className="p-3 text-center">
                                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(report.select)}`}>
                                                                    {report.select}
                                                                </span>
                                                            </td>
                                                            <td className="p-3 text-center">
                                                                <button
                                                                    onClick={() => handleViewDetails(report.broadcast_id, 'all')}
                                                                    className="text-blue-600 hover:text-blue-800 p-1"
                                                                    title="View Details"
                                                                >
                                                                    <FiEye className="w-5 h-5" />
                                                                </button>
                                                            </td>
                                                            <td className="p-3 text-center">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={selectedItems.includes(report.broadcast_id)}
                                                                    onChange={() => handleItemSelect(report.broadcast_id)}
                                                                    className="form-check-input h-4 w-4 text-blue-600 rounded border-gray-300"
                                                                />
                                                            </td>
                                                        </motion.tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Pagination */}
                                    {!loading && reports.length > 0 && (
                                        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between bg-gray-50">
                                            <div className="text-sm text-gray-700">
                                                Showing {((pagination.page_no - 1) * pagination.limit) + 1} to {Math.min(pagination.page_no * pagination.limit, pagination.total)} of {pagination.total} entries
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => setPagination(prev => ({ ...prev, page_no: prev.page_no - 1 }))}
                                                    disabled={!pagination.has_prev}
                                                    className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                                >
                                                    Previous
                                                </button>
                                                <span className="px-3 py-1 text-sm text-gray-700">
                                                    Page {pagination.page_no} of {pagination.total_pages}
                                                </span>
                                                <button
                                                    onClick={() => setPagination(prev => ({ ...prev, page_no: prev.page_no + 1 }))}
                                                    disabled={!pagination.has_next}
                                                    className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                                >
                                                    Next
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </motion.div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>

            {/* Bulk Actions Panel */}
            <AnimatePresence>
                {showBulkActions && (
                    <motion.div 
                        className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-white rounded-lg shadow-lg border border-gray-200 p-4 z-50 min-w-64"
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 50 }}
                    >
                        <div className="flex flex-col items-center space-y-3">
                            <div className="flex space-x-3">
                                <motion.button
                                    onClick={handleBulkDelete}
                                    className="px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 text-white rounded hover:from-red-700 hover:to-red-800 transition-colors flex items-center gap-2 text-sm"
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    <FiTrash2 className="w-4 h-4" />
                                    Delete ({selectedItems.length})
                                </motion.button>
                            </div>
                            <div className="flex items-center">
                                <input
                                    type="checkbox"
                                    checked={selectAll}
                                    onChange={handleSelectAll}
                                    className="form-check-input h-4 w-4 text-blue-600 rounded border-gray-300 mr-2"
                                />
                                <label className="text-sm text-gray-600">Select All</label>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default BroadcastReport;