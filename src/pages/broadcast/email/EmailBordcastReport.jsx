import React, { useState, useEffect } from 'react';
import { Sidebar, Header } from '../../../components/header';
import {
    FiBarChart2,
    FiTrash2,
    FiClock,
    FiCheckCircle,
    FiXCircle,
    FiPauseCircle,
    FiEye,
    FiRefreshCw,
    FiFilter,
} from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import API_BASE_URL from '../../../utils/api-controller';
import getHeaders from '../../../utils/get-headers';
import EmailActionMenu from './EmailActionMenu';
import ConfirmActionModal from '../../../components/ConfirmActionModal';
import TablePagination from '../../../components/TablePagination';
import CustomSelect from '../../../components/CustomSelect';
import { optionByValue } from '../../../utils/customSelectHelpers';
import AnimatedCheckbox from '../../../components/AnimatedCheckbox';
import { DateRangePickerField } from '../../../components/PortalDatePicker';

const REPORT_STATUS_OPTIONS = [
  { value: '', label: 'All Status' },
  { value: 'completed', label: 'Completed' },
  { value: 'processing', label: 'Processing' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'failed', label: 'Failed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'paused', label: 'Paused' },
  { value: 'partially_failed', label: 'Partially Failed' },
];

const BroadcastReport = () => {
    const navigate = useNavigate();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(() => {
        const saved = localStorage.getItem('sidebarMinimized');
        return saved ? JSON.parse(saved) : false;
    });

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
    const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
    const [bulkDeleting, setBulkDeleting] = useState(false);

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

    useEffect(() => {
        fetchReports();
    }, [pagination.page_no, pagination.limit, filters]);

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

            const endpoint = `${API_BASE_URL}/broadcast/email/email/report-list?${params}`;

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

    
    // Handle bulk delete
    const requestBulkDelete = () => {
        if (selectedItems.length === 0) {
            toast.error('Please select at least one item to delete');
            return;
        }
        setConfirmBulkDelete(true);
    };

    const handleBulkDelete = async () => {
        setBulkDeleting(true);
        setLoading(true);
        try {
            const headers = await getHeaders();
            const endpoint = `${API_BASE_URL}/email/broadcast/bulk-delete`;

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
            setBulkDeleting(false);
            setConfirmBulkDelete(false);
        }
    };

    // Handle view details
    const handleViewDetails = (broadcastId) => {
        navigate(`/broadcast/email/details/${broadcastId}`);
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

    const ReportTableSkeleton = () => (
        <>
            {Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="border-b border-gray-100">
                    {Array.from({ length: 11 }).map((_, c) => (
                        <td key={c} className="p-3">
                            <div className="h-3 bg-gray-200 rounded animate-pulse mx-auto" style={{ width: c === 2 ? 120 : 48 }} />
                        </td>
                    ))}
                </tr>
            ))}
        </>
    );

    // Filter panel
    const FilterPanel = () => (
        <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-gray-50 rounded-lg p-4 mb-4 border border-gray-200"
        >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date range</label>
                    <DateRangePickerField
                        value={{ start: filters.start_date, end: filters.end_date }}
                        onChange={(range) => {
                            setFilters((prev) => ({
                                ...prev,
                                start_date: range?.start || '',
                                end_date: range?.end || '',
                            }));
                            setPagination((prev) => ({ ...prev, page_no: 1 }));
                        }}
                        placeholder="Select date range"
                        mode="range"
                        initialTab="quick"
                        defaultQuickKey="tm"
                        quickOptionKeys={['tw', 'lw', 'lm', 'tm', 'lf', 'fy']}
                        showRangeHint={false}
                        showResetButton
                        truncateRangeLabel={false}
                        buttonClassName="w-full min-w-0 px-3 py-2 bg-white border border-gray-300 rounded-md text-sm text-gray-700 hover:border-indigo-400 focus:outline-none"
                        wrapperClassName="w-full min-w-0"
                    />
                </div>
                <div>
                    <CustomSelect
                        label="Status"
                        options={REPORT_STATUS_OPTIONS}
                        value={optionByValue(REPORT_STATUS_OPTIONS, filters.status) || REPORT_STATUS_OPTIONS[0]}
                        onChange={(opt) => handleFilterChange('status', opt?.value || '')}
                        isClearable={false}
                        isSearchable={false}
                        placeholder="All Status"
                    />
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
                <div className="h-full flex flex-col mx-2 sm:mx-4 md:mx-8 my-3 md:my-4">
                    <motion.div 
                        className="bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col h-full mb-6"
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
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6">
                            <div>
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
                                                    <th className="text-center p-3 font-medium text-gray-700 w-12">
                                                        <div className="flex justify-center">
                                                            <AnimatedCheckbox
                                                                checked={selectAll}
                                                                indeterminate={selectedItems.length > 0 && selectedItems.length < reports.length}
                                                                onChange={handleSelectAll}
                                                                ariaLabel="Select all"
                                                            />
                                                        </div>
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {loading ? (
                                                    <ReportTableSkeleton />
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
                                                                    onClick={() => handleViewDetails(report.broadcast_id)}
                                                                    className="text-yellow-600 hover:text-yellow-800 font-medium hover:underline flex items-center justify-center gap-1 mx-auto"
                                                                >
                                                                    <FiClock className="w-4 h-4" />
                                                                    {report.pending}
                                                                </button>
                                                            </td>
                                                            <td className="p-3 text-center">
                                                                <button
                                                                    onClick={() => handleViewDetails(report.broadcast_id)}
                                                                    className="text-green-600 hover:text-green-800 font-medium hover:underline flex items-center justify-center gap-1 mx-auto"
                                                                >
                                                                    <FiCheckCircle className="w-4 h-4" />
                                                                    {report.send}
                                                                </button>
                                                            </td>
                                                            <td className="p-3 text-center">
                                                                <button
                                                                    onClick={() => handleViewDetails(report.broadcast_id)}
                                                                    className="text-red-600 hover:text-red-800 font-medium hover:underline flex items-center justify-center gap-1 mx-auto"
                                                                >
                                                                    <FiXCircle className="w-4 h-4" />
                                                                    {report.failed}
                                                                </button>
                                                            </td>
                                                            <td className="p-3 text-center">
                                                                <button
                                                                    onClick={() => handleViewDetails(report.broadcast_id)}
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
                                                                <EmailActionMenu
                                                                    items={[
                                                                        { label: 'View Details', icon: FiEye, onClick: () => handleViewDetails(report.broadcast_id) },
                                                                    ]}
                                                                />
                                                            </td>
                                                            <td className="p-3 text-center">
                                                                <div className="flex justify-center">
                                                                    <AnimatedCheckbox
                                                                        checked={selectedItems.includes(report.broadcast_id)}
                                                                        onChange={() => handleItemSelect(report.broadcast_id)}
                                                                        ariaLabel={`Select ${report.template || 'broadcast'}`}
                                                                    />
                                                                </div>
                                                            </td>
                                                        </motion.tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Pagination */}
                                    {!loading && reports.length > 0 && (
                                        <TablePagination
                                            page={pagination.page_no}
                                            limit={pagination.limit}
                                            total={pagination.total}
                                            totalPages={pagination.total_pages}
                                            rowOptions={[10, 20, 50, 100]}
                                            defaultRows={20}
                                            onPageChange={(page) => setPagination((prev) => ({ ...prev, page_no: page }))}
                                            onLimitChange={(limit) => setPagination((prev) => ({ ...prev, limit, page_no: 1 }))}
                                        />
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
                                    onClick={requestBulkDelete}
                                    className="px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 text-white rounded hover:from-red-700 hover:to-red-800 transition-colors flex items-center gap-2 text-sm"
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    <FiTrash2 className="w-4 h-4" />
                                    Delete ({selectedItems.length})
                                </motion.button>
                            </div>
                            <div className="flex items-center gap-2">
                                <AnimatedCheckbox
                                    checked={selectAll}
                                    indeterminate={selectedItems.length > 0 && selectedItems.length < reports.length}
                                    onChange={handleSelectAll}
                                    ariaLabel="Select all"
                                />
                                <span className="text-sm text-gray-600">Select All</span>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <ConfirmActionModal
                isOpen={confirmBulkDelete}
                title="Delete broadcasts"
                heading="Delete selected broadcasts?"
                message={`This will permanently delete ${selectedItems.length} selected broadcast(s). This action cannot be undone.`}
                confirmLabel="Delete"
                loading={bulkDeleting}
                tone="danger"
                onCancel={() => { if (!bulkDeleting) setConfirmBulkDelete(false); }}
                onConfirm={handleBulkDelete}
            />
        </div>
    );
};

export default BroadcastReport;