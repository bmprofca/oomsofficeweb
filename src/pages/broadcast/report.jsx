import React, { useState, useEffect } from 'react';
import { Sidebar, Header } from '../../components/header';
import {
    FiBarChart2,
    FiTrash2,
    FiCheckSquare,
    FiSquare,
    FiClock,
    FiCheckCircle,
    FiXCircle,
    FiPauseCircle,
    FiEye
} from 'react-icons/fi';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const BroadcastReport = () => {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(() => {
        const saved = localStorage.getItem('sidebarMinimized');
        return saved ? JSON.parse(saved) : false;
    });
    
    const validTabs = ['text-message', 'whatsapp'];
    // Get active tab from URL or default to 'text-message'
    const urlTab = searchParams.get('tab');
    const [activeTab, setActiveTab] = useState(validTabs.includes(urlTab) ? urlTab : 'text-message');
    
    // Report states
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedItems, setSelectedItems] = useState([]);
    const [selectAll, setSelectAll] = useState(false);
    const [showBulkActions, setShowBulkActions] = useState(false);

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

    // Mock data for different report types
    const mockSmsReports = [
        {
            batch_id: '1',
            date: '2024-01-15 10:30:00',
            format: 'Welcome Template',
            total: 150,
            pending: 5,
            success: 140,
            failed: 3,
            paused: 2,
            type: 'text-message'
        },
        {
            batch_id: '2',
            date: '2024-01-14 14:20:00',
            format: 'Payment Reminder',
            total: 89,
            pending: 0,
            success: 87,
            failed: 2,
            paused: 0,
            type: 'text-message'
        },
        {
            batch_id: '3',
            date: '2024-01-13 09:15:00',
            format: 'Service Update',
            total: 234,
            pending: 12,
            success: 220,
            failed: 1,
            paused: 1,
            type: 'text-message'
        }
    ];

    const mockWhatsappReports = [
        {
            batch_id: '4',
            date: '2024-01-15 11:45:00',
            format: 'Welcome Message',
            total: 200,
            pending: 8,
            success: 190,
            failed: 2,
            paused: 0,
            type: 'whatsapp'
        },
        {
            batch_id: '5',
            date: '2024-01-14 16:30:00',
            format: 'Promotional Offer',
            total: 150,
            pending: 3,
            success: 145,
            failed: 2,
            paused: 0,
            type: 'whatsapp'
        }
    ];

    // Update URL when tab changes
    useEffect(() => {
        if (urlTab !== activeTab) {
            const newParams = new URLSearchParams(searchParams);
            newParams.set('tab', activeTab);
            setSearchParams(newParams);
        }
    }, [activeTab]);

    // Set active tab from URL on component mount or when URL changes
    useEffect(() => {
        if (urlTab && validTabs.includes(urlTab) && urlTab !== activeTab) {
            setActiveTab(urlTab);
        }
        if (urlTab && !validTabs.includes(urlTab)) {
            setActiveTab('text-message');
        }
    }, [urlTab]);

    // Load reports based on active tab
    useEffect(() => {
        fetchReports();
    }, [activeTab]);

    useEffect(() => {
        setShowBulkActions(selectedItems.length > 0);
    }, [selectedItems]);

    const fetchReports = async () => {
        setLoading(true);
        // Simulate API call
        setTimeout(() => {
            let data;
            switch (activeTab) {
                case 'text-message':
                    data = mockSmsReports;
                    break;
                case 'whatsapp':
                    data = mockWhatsappReports;
                    break;
                default:
                    data = mockSmsReports;
            }
            setReports(data);
            setLoading(false);
        }, 1000);
    };

    // Tab change handler
    const handleTabChange = (tab) => {
        setActiveTab(tab);
    };

    const handleItemSelect = (batchId) => {
        setSelectedItems(prev => {
            if (prev.includes(batchId)) {
                return prev.filter(id => id !== batchId);
            } else {
                return [...prev, batchId];
            }
        });
    };

    const handleSelectAll = () => {
        if (selectAll) {
            setSelectedItems([]);
        } else {
            setSelectedItems(reports.map(report => report.batch_id));
        }
        setSelectAll(!selectAll);
    };

    const handleBulkDelete = () => {
        if (selectedItems.length === 0) {
            alert('Please select at least one item to delete');
            return;
        }

        if (window.confirm(`Are you sure you want to delete ${selectedItems.length} selected batch(es)? This action cannot be undone.`)) {
            // Simulate API call for deletion
            setLoading(true);
            setTimeout(() => {
                setReports(prev => prev.filter(report => !selectedItems.includes(report.batch_id)));
                setSelectedItems([]);
                setSelectAll(false);
                setLoading(false);
                alert('Selected batches deleted successfully!');
            }, 1000);
        }
    };

    const handleViewDetails = (batchId, status) => {
        // Navigate to detailed batch report
        navigate(`/batch-report?batch_id=${batchId}&status=${status}`);
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-GB');
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'pending': return 'text-yellow-600';
            case 'success': return 'text-green-600';
            case 'failed': return 'text-red-600';
            case 'paused': return 'text-blue-600';
            default: return 'text-gray-600';
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'pending': return <FiClock className="w-4 h-4" />;
            case 'success': return <FiCheckCircle className="w-4 h-4" />;
            case 'failed': return <FiXCircle className="w-4 h-4" />;
            case 'paused': return <FiPauseCircle className="w-4 h-4" />;
            default: return <FiClock className="w-4 h-4" />;
        }
    };

    // Skeleton Components
    const SkeletonTableRow = ({ columns = 1 }) => (
        <tr>
            {Array.from({ length: columns }).map((_, index) => (
                <td key={index} className="p-3 border border-gray-200">
                    <div className="h-6 bg-gray-200 rounded animate-pulse"></div>
                </td>
            ))}
        </tr>
    );

    const SkeletonTable = ({ rows = 3, columns = 1 }) => (
        <>
            {Array.from({ length: rows }).map((_, rowIndex) => (
                <SkeletonTableRow key={rowIndex} columns={columns} />
            ))}
        </>
    );

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

    // Render report table
    const renderReportTable = () => (
        <motion.div 
            className="bg-white rounded-lg border border-gray-200"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
        >
            <div className="p-6">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm border border-gray-200">
                        <thead>
                            <tr className="bg-gray-50">
                                <th className="text-left p-3 font-medium text-gray-700 border border-gray-200">#</th>
                                <th className="text-left p-3 font-medium text-gray-700 border border-gray-200">Date</th>
                                <th className="text-left p-3 font-medium text-gray-700 border border-gray-200">Template</th>
                                <th className="text-center p-3 font-medium text-gray-700 border border-gray-200">Total</th>
                                <th className="text-center p-3 font-medium text-gray-700 border border-gray-200">Pending</th>
                                <th className="text-center p-3 font-medium text-gray-700 border border-gray-200">Sent</th>
                                <th className="text-center p-3 font-medium text-gray-700 border border-gray-200">Failed</th>
                                <th className="text-center p-3 font-medium text-gray-700 border border-gray-200">Paused</th>
                                <th className="text-center p-3 font-medium text-gray-700 border border-gray-200">
                                    <input
                                        type="checkbox"
                                        checked={selectAll}
                                        onChange={handleSelectAll}
                                        className="form-check-input h-4 w-4 text-blue-600"
                                    />
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="9" className="text-center py-8 border border-gray-200">
                                        <div className="flex justify-center items-center">
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                        </div>
                                    </td>
                                </tr>
                            ) : reports.length === 0 ? (
                                <tr>
                                    <td colSpan="9" className="text-center py-8 text-gray-500 border border-gray-200">
                                        No reports found
                                    </td>
                                </tr>
                            ) : (
                                reports.map((report, index) => (
                                    <motion.tr 
                                        key={report.batch_id} 
                                        className="border-b border-gray-200 hover:bg-gray-50"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.05 }}
                                    >
                                        <td className="p-3 text-gray-600 border border-gray-200">
                                            {index + 1}
                                        </td>
                                        <td className="p-3 text-gray-600 border border-gray-200">
                                            {formatDate(report.date)}
                                        </td>
                                        <td className="p-3 text-gray-600 border border-gray-200">
                                            {report.format}
                                        </td>
                                        <td className="p-3 text-center text-gray-600 border border-gray-200">
                                            <span className="font-semibold">{report.total}</span>
                                        </td>
                                        <td className="p-3 text-center border border-gray-200">
                                            <motion.button
                                                onClick={() => handleViewDetails(report.batch_id, 0)}
                                                className="text-yellow-600 hover:text-yellow-800 font-medium hover:underline flex items-center justify-center gap-1 mx-auto"
                                                whileHover={{ scale: 1.05 }}
                                                whileTap={{ scale: 0.95 }}
                                            >
                                                <FiClock className="w-4 h-4" />
                                                {report.pending}
                                            </motion.button>
                                        </td>
                                        <td className="p-3 text-center border border-gray-200">
                                            <motion.button
                                                onClick={() => handleViewDetails(report.batch_id, 1)}
                                                className="text-green-600 hover:text-green-800 font-medium hover:underline flex items-center justify-center gap-1 mx-auto"
                                                whileHover={{ scale: 1.05 }}
                                                whileTap={{ scale: 0.95 }}
                                            >
                                                <FiCheckCircle className="w-4 h-4" />
                                                {report.success}
                                            </motion.button>
                                        </td>
                                        <td className="p-3 text-center border border-gray-200">
                                            <motion.button
                                                onClick={() => handleViewDetails(report.batch_id, 2)}
                                                className="text-red-600 hover:text-red-800 font-medium hover:underline flex items-center justify-center gap-1 mx-auto"
                                                whileHover={{ scale: 1.05 }}
                                                whileTap={{ scale: 0.95 }}
                                            >
                                                <FiXCircle className="w-4 h-4" />
                                                {report.failed}
                                            </motion.button>
                                        </td>
                                        <td className="p-3 text-center border border-gray-200">
                                            <motion.button
                                                onClick={() => handleViewDetails(report.batch_id, 3)}
                                                className="text-blue-600 hover:text-blue-800 font-medium hover:underline flex items-center justify-center gap-1 mx-auto"
                                                whileHover={{ scale: 1.05 }}
                                                whileTap={{ scale: 0.95 }}
                                            >
                                                <FiPauseCircle className="w-4 h-4" />
                                                {report.paused}
                                            </motion.button>
                                        </td>
                                        <td className="p-3 text-center border border-gray-200">
                                            <input
                                                type="checkbox"
                                                checked={selectedItems.includes(report.batch_id)}
                                                onChange={() => handleItemSelect(report.batch_id)}
                                                className="form-check-input h-4 w-4 text-blue-600"
                                            />
                                        </td>
                                    </motion.tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </motion.div>
    );

    // Bulk actions panel
    const renderBulkActions = () => (
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
                                className="form-check-input h-4 w-4 text-blue-600 mr-2"
                            />
                            <label className="text-sm text-gray-600">Select All</label>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
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
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6">
                            <div className="max-w-7xl mx-auto">
                                {/* Tabs */}
                                <div className="mb-6">
                                    <div className="border-b border-gray-200">
                                        <nav className="-mb-px flex space-x-8 overflow-x-auto">
                                            <motion.button
                                                onClick={() => handleTabChange('text-message')}
                                                className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap flex items-center gap-2 ${
                                                    activeTab === 'text-message'
                                                        ? 'border-blue-500 text-blue-600'
                                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                                }`}
                                                whileHover={{ scale: 1.05 }}
                                                whileTap={{ scale: 0.95 }}
                                            >
                                                <FiBarChart2 className="w-4 h-4" />
                                                Message Reports
                                            </motion.button>
                                            <motion.button
                                                onClick={() => handleTabChange('whatsapp')}
                                                className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap flex items-center gap-2 ${
                                                    activeTab === 'whatsapp'
                                                        ? 'border-blue-500 text-blue-600'
                                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                                }`}
                                                whileHover={{ scale: 1.05 }}
                                                whileTap={{ scale: 0.95 }}
                                            >
                                                <FiBarChart2 className="w-4 h-4" />
                                                WhatsApp Reports
                                            </motion.button>
                                        </nav>
                                    </div>
                                </div>

                                {/* Report Summary Cards */}
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                                    {loading ? (
                                        <>
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
                                                        <p className="text-sm text-gray-500">Total Batches</p>
                                                        <p className="text-2xl font-bold text-gray-800">{reports.length}</p>
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
                                                        <p className="text-sm text-gray-500">Total Messages</p>
                                                        <p className="text-2xl font-bold text-gray-800">
                                                            {reports.reduce((sum, report) => sum + report.total, 0)}
                                                        </p>
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
                                                transition={{ delay: 0.3 }}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <p className="text-sm text-gray-500">Successful</p>
                                                        <p className="text-2xl font-bold text-gray-800">
                                                            {reports.reduce((sum, report) => sum + report.success, 0)}
                                                        </p>
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
                                                        <p className="text-sm text-gray-500">Failed</p>
                                                        <p className="text-2xl font-bold text-gray-800">
                                                            {reports.reduce((sum, report) => sum + report.failed, 0)}
                                                        </p>
                                                    </div>
                                                    <div className="bg-red-100 rounded-lg p-3">
                                                        <FiXCircle className="w-6 h-6 text-red-600" />
                                                    </div>
                                                </div>
                                            </motion.div>
                                        </>
                                    )}
                                </div>

                                {/* Report Table */}
                                {renderReportTable()}
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>

            {/* Bulk Actions Panel */}
            {renderBulkActions()}
        </div>
    );
};

export default BroadcastReport;