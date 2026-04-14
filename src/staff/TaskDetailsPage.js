// TaskDetailsPage.jsx
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
    FiArrowLeft,
    FiUser,
    FiPhone,
    FiMail,
    FiBriefcase,
    FiCalendar,
    FiDollarSign,
    FiTag,
    FiCheckCircle,
    FiClock,
    FiAlertCircle,
    FiTrendingUp,
    FiLayers,
    FiHome,
    FiFileText,
    FiRefreshCw,
    FiChevronLeft,
    FiChevronRight,
    FiMapPin,
    FiStar
} from 'react-icons/fi';
import { motion } from 'framer-motion';
import { Header, Sidebar } from '../components/header';
import getHeaders from '../utils/get-headers';
import API_BASE_URL from '../utils/api-controller';

const TaskDetailsPage = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(() => {
        const saved = localStorage.getItem('sidebarMinimized');
        return saved ? JSON.parse(saved) : false;
    });
    const [loading, setLoading] = useState(true);
    const [taskData, setTaskData] = useState(null);
    const [staffInfo, setStaffInfo] = useState(null);
    const [tasks, setTasks] = useState([]);
    const [pagination, setPagination] = useState(null);
    const [filtersApplied, setFiltersApplied] = useState(null);
    const [apiError, setApiError] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [limit] = useState(20);

    // Get query parameters from URL
    const queryParams = new URLSearchParams(location.search);
    const staffUsername = queryParams.get('staff_username');
    const category = queryParams.get('category');

    // Get category display name and color
    const getCategoryInfo = (categoryCode) => {
        const categories = {
            'OD': { name: 'Overdue Tasks', color: 'red', icon: FiAlertCircle, bgColor: 'bg-gradient-to-r from-red-50 to-red-100', textColor: 'text-red-700', borderColor: 'border-red-200' },
            'DT': { name: 'Due Today Tasks', color: 'orange', icon: FiClock, bgColor: 'bg-gradient-to-r from-orange-50 to-orange-100', textColor: 'text-orange-700', borderColor: 'border-orange-200' },
            'D7': { name: 'Due in 7 Days', color: 'blue', icon: FiCalendar, bgColor: 'bg-gradient-to-r from-blue-50 to-blue-100', textColor: 'text-blue-700', borderColor: 'border-blue-200' },
            'FT': { name: 'Future Tasks', color: 'green', icon: FiTrendingUp, bgColor: 'bg-gradient-to-r from-green-50 to-green-100', textColor: 'text-green-700', borderColor: 'border-green-200' },
            'WIP': { name: 'Work in Progress', color: 'purple', icon: FiCheckCircle, bgColor: 'bg-gradient-to-r from-purple-50 to-purple-100', textColor: 'text-purple-700', borderColor: 'border-purple-200' },
            'PFC': { name: 'Pending from Client', color: 'yellow', icon: FiClock, bgColor: 'bg-gradient-to-r from-yellow-50 to-yellow-100', textColor: 'text-yellow-700', borderColor: 'border-yellow-200' },
            'PFD': { name: 'Pending from Department', color: 'yellow', icon: FiClock, bgColor: 'bg-gradient-to-r from-yellow-50 to-yellow-100', textColor: 'text-yellow-700', borderColor: 'border-yellow-200' }
        };
        return categories[categoryCode] || { name: 'Tasks', color: 'gray', icon: FiFileText, bgColor: 'bg-gradient-to-r from-gray-50 to-gray-100', textColor: 'text-gray-700', borderColor: 'border-gray-200' };
    };

    const categoryInfo = getCategoryInfo(category);

    // Fetch task details
    const fetchTaskDetails = async (page = 1) => {
        if (!staffUsername || !category) {
            setApiError('Missing required parameters');
            setLoading(false);
            return;
        }

        setLoading(true);
        setApiError(null);

        try {
            const headers = await getHeaders();
            const url = `${API_BASE_URL}/report/team-report-details`;
            
            const params = new URLSearchParams();
            params.append('staff_username', staffUsername);
            params.append('category', category);
            params.append('page_no', page);
            params.append('limit', limit);
            
            const finalUrl = `${url}?${params.toString()}`;
            
            const response = await fetch(finalUrl, {
                method: 'GET',
                headers: {
                    ...headers,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            
            if (result.success) {
                setTaskData(result.data);
                setStaffInfo(result.data.staff_info);
                setTasks(result.data.tasks || []);
                setPagination(result.data.pagination);
                setFiltersApplied(result.filters_applied);
            } else {
                throw new Error(result.message || 'Failed to fetch task details');
            }
        } catch (error) {
            console.error('Error fetching task details:', error);
            setApiError(error.message || 'An error occurred while fetching data');
            setTasks([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTaskDetails(currentPage);
    }, [staffUsername, category, currentPage]);

    // Handle page change
    const handlePageChange = (newPage) => {
        if (newPage >= 1 && pagination && newPage <= pagination.total_pages) {
            setCurrentPage(newPage);
        }
    };

    // Get status badge color
    const getStatusBadgeClass = (status) => {
        const statusConfig = {
            'in process': { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', dot: 'bg-purple-500' },
            'pending from client': { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200', dot: 'bg-yellow-500' },
            'pending from department': { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200', dot: 'bg-yellow-500' },
            'complete': { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', dot: 'bg-green-500' },
            'cancel': { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', dot: 'bg-red-500' }
        };
        return statusConfig[status] || { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200', dot: 'bg-gray-500' };
    };

    // Get due category badge color
    const getDueCategoryBadgeClass = (dueCategory) => {
        const dueConfig = {
            'OD': { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
            'DT': { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
            'D7': { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
            'FT': { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' }
        };
        return dueConfig[dueCategory] || { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' };
    };

    // Format date
    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        if (date.toDateString() === today.toDateString()) return 'Today';
        if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
        
        return date.toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    // Format currency
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    };

    // Get priority indicator
    const getPriorityIndicator = (dueCategory) => {
        switch(dueCategory) {
            case 'OD': return '🔴 High';
            case 'DT': return '🟠 Urgent';
            case 'D7': return '🔵 Medium';
            default: return '🟢 Low';
        }
    };

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

    // Skeleton loader
    const SkeletonLoader = () => (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
            <Header mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} isMinimized={isMinimized} setIsMinimized={setIsMinimized} />
            <Sidebar mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} isMinimized={isMinimized} setIsMinimized={setIsMinimized} />
            <div className={`pt-16 transition-all duration-300 ${isMinimized ? 'md:pl-20' : 'md:pl-72'}`}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="animate-pulse">
                        <div className="h-8 bg-slate-200 rounded w-64 mb-6"></div>
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                            <div className="h-32 bg-slate-100 rounded mb-4"></div>
                            <div className="space-y-3">
                                {[...Array(5)].map((_, i) => (
                                    <div key={i} className="h-16 bg-slate-100 rounded"></div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    if (loading) {
        return <SkeletonLoader />;
    }

    const CategoryIcon = categoryInfo.icon;

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

            <div className={`pt-16 transition-all duration-300 ${isMinimized ? 'md:pl-20' : 'md:pl-72'}`}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    {/* Back Button */}
                    <motion.button
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        onClick={() => navigate(-1)}
                        className="mb-6 flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm"
                    >
                        <FiArrowLeft className="w-4 h-4" />
                        Back to Report
                    </motion.button>

                    {/* Error Alert */}
                    {apiError && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4"
                        >
                            <div className="flex items-center gap-3">
                                <FiAlertCircle className="w-5 h-5 text-red-600" />
                                <div className="flex-1">
                                    <p className="text-red-800 text-sm font-medium">Error loading data</p>
                                    <p className="text-red-600 text-xs">{apiError}</p>
                                </div>
                                <button
                                    onClick={() => fetchTaskDetails(currentPage)}
                                    className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-xs font-medium hover:bg-red-200 transition-colors"
                                >
                                    Retry
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {/* Header Banner - Professional
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`${categoryInfo.bgColor} border-l-4 ${categoryInfo.borderColor} rounded-lg p-5 mb-6 shadow-sm`}
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className={`p-2.5 rounded-lg bg-white shadow-sm ${categoryInfo.textColor}`}>
                                    <CategoryIcon className="w-6 h-6" />
                                </div>
                                <div>
                                    <h1 className="text-xl font-bold text-slate-800">{categoryInfo.name}</h1>
                                    <p className="text-slate-500 text-xs mt-0.5">Detailed task breakdown</p>
                                </div>
                            </div>
                            {pagination && (
                                <div className="text-right">
                                    <div className="text-2xl font-bold text-slate-800">{pagination.total}</div>
                                    <div className="text-slate-400 text-xs">Total Tasks</div>
                                </div>
                            )}
                        </div>
                    </motion.div> */}

                    {/* Compact Staff Information Card - Professional */}
                    {staffInfo && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="bg-white rounded-lg border border-slate-200 mb-6 shadow-sm hover:shadow-md transition-shadow"
                        >
                            <div className="flex items-center justify-between p-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-sm">
                                        {staffInfo.image ? (
                                            <img src={staffInfo.image} alt={staffInfo.name} className="w-10 h-10 rounded-lg object-cover" />
                                        ) : (
                                            <FiUser className="w-5 h-5 text-white" />
                                        )}
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-slate-800">{staffInfo.name}</h3>
                                        <p className="text-slate-500 text-xs">{staffInfo.designation}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-6">
                                    <div className="hidden md:flex items-center gap-2 text-slate-600">
                                        <FiMail className="w-4 h-4 text-slate-400" />
                                        <span className="text-sm">{staffInfo.email}</span>
                                    </div>
                                    <div className="hidden md:flex items-center gap-2 text-slate-600">
                                        <FiPhone className="w-4 h-4 text-slate-400" />
                                        <span className="text-sm">{staffInfo.mobile}</span>
                                    </div>
                                    <div className="flex md:hidden items-center gap-2 text-slate-600">
                                        <FiMail className="w-4 h-4 text-slate-400" />
                                        <FiPhone className="w-4 h-4 text-slate-400" />
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* Professional Tasks Table */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm"
                    >
                        {/* Table Header */}
                        <div className="bg-slate-50 border-b border-slate-200 px-6 py-3">
                            <div className="flex items-center gap-2">
                                <FiFileText className="w-4 h-4 text-slate-500" />
                                <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Task List</h2>
                            </div>
                        </div>

                        {tasks.length === 0 ? (
                            <div className="text-center py-12">
                                <div className="p-3 bg-slate-50 rounded-full inline-flex mb-4">
                                    <FiFileText className="w-8 h-8 text-slate-400" />
                                </div>
                                <p className="text-slate-600 font-medium">No tasks found</p>
                                <p className="text-slate-400 text-sm mt-1">No tasks available in this category</p>
                            </div>
                        ) : (
                            <>
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="border-b border-slate-200 bg-slate-50/50">
                                                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Service</th>
                                                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Client</th>
                                                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Firm</th>
                                                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Due Date</th>
                                                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Status</th>
                                                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Priority</th>
                                                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Amount</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {tasks.map((task, index) => {
                                                const statusConfig = getStatusBadgeClass(task.task_details?.status);
                                                const dueConfig = getDueCategoryBadgeClass(task.task_details?.due_category);
                                                
                                                return (
                                                    <motion.tr
                                                        key={task.task_id}
                                                        initial={{ opacity: 0 }}
                                                        animate={{ opacity: 1 }}
                                                        transition={{ delay: index * 0.03 }}
                                                        className="hover:bg-slate-50/80 transition-colors group"
                                                    >
                                                        <td className="px-4 py-3">
                                                            <div className="text-sm font-medium text-slate-800">{task.service?.service_name || 'N/A'}</div>
                                                            <div className="text-xs text-slate-400 mt-0.5">{task.service?.category_name || 'N/A'}</div>
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <div className="text-sm text-slate-700">{task.client?.name || 'N/A'}</div>
                                                            <div className="text-xs text-slate-400 mt-0.5">{task.client?.mobile || 'N/A'}</div>
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <div className="flex items-center gap-2">
                                                                <FiHome className="w-3.5 h-3.5 text-slate-400" />
                                                                <span className="text-sm text-slate-700">{task.firm?.firm_name || 'N/A'}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <div className="flex items-center gap-2">
                                                                <FiCalendar className="w-3.5 h-3.5 text-slate-400" />
                                                                <span className="text-sm text-slate-700">{formatDate(task.task_details?.due_date)}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3 text-center">
                                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border ${statusConfig.bg} ${statusConfig.text} ${statusConfig.border}`}>
                                                                <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dot}`}></span>
                                                                {task.task_details?.status || 'N/A'}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 text-center">
                                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border ${dueConfig.bg} ${dueConfig.text} ${dueConfig.border}`}>
                                                                {task.task_details?.due_category || 'N/A'}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 text-right">
                                                            <div className="text-sm font-semibold text-slate-800">{formatCurrency(task.financials?.total || 0)}</div>
                                                            <div className="text-xs mt-0.5">
                                                                {task.financials?.billing_status === 'paid' ? (
                                                                    <span className="text-green-600">✓ Paid</span>
                                                                ) : (
                                                                    <span className="text-amber-600">Pending</span>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </motion.tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Professional Pagination */}
                                {pagination && pagination.total_pages > 1 && (
                                    <div className="border-t border-slate-200 bg-slate-50/30 px-6 py-4">
                                        <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
                                            <div className="text-xs text-slate-500">
                                                Showing {(pagination.page_no - 1) * pagination.limit + 1} to {Math.min(pagination.page_no * pagination.limit, pagination.total)} of {pagination.total} entries
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <button
                                                    onClick={() => handlePageChange(pagination.page_no - 1)}
                                                    disabled={!pagination.has_prev}
                                                    className="px-3 py-1.5 text-xs font-medium rounded-md border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-1 text-slate-600"
                                                >
                                                    <FiChevronLeft className="w-3 h-3" />
                                                    Previous
                                                </button>
                                                <div className="flex items-center gap-1">
                                                    {Array.from({ length: Math.min(5, pagination.total_pages) }, (_, i) => {
                                                        let pageNumber;
                                                        if (pagination.total_pages <= 5) {
                                                            pageNumber = i + 1;
                                                        } else if (pagination.page_no <= 3) {
                                                            pageNumber = i + 1;
                                                        } else if (pagination.page_no >= pagination.total_pages - 2) {
                                                            pageNumber = pagination.total_pages - 4 + i;
                                                        } else {
                                                            pageNumber = pagination.page_no - 2 + i;
                                                        }
                                                        
                                                        return (
                                                            <button
                                                                key={pageNumber}
                                                                onClick={() => handlePageChange(pageNumber)}
                                                                className={`min-w-[32px] h-8 text-xs font-medium rounded-md transition-all ${
                                                                    pagination.page_no === pageNumber
                                                                        ? 'bg-blue-600 text-white shadow-sm'
                                                                        : 'border border-slate-200 bg-white hover:bg-slate-50 text-slate-600'
                                                                }`}
                                                            >
                                                                {pageNumber}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                                <button
                                                    onClick={() => handlePageChange(pagination.page_no + 1)}
                                                    disabled={!pagination.has_next}
                                                    className="px-3 py-1.5 text-xs font-medium rounded-md border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-1 text-slate-600"
                                                >
                                                    Next
                                                    <FiChevronRight className="w-3 h-3" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </motion.div>

                    {/* Filters Info - Subtle */}
                    {filtersApplied && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.3 }}
                            className="mt-4 text-center"
                        >
                            <p className="text-xs text-slate-400">
                                Filtered by: {filtersApplied.staff_username} • {filtersApplied.category}
                            </p>
                        </motion.div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TaskDetailsPage;