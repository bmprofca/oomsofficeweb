// src/pages/TaskDashboardDetailPage.js
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FiCheckCircle,
    FiX,
    FiArrowLeft,
    FiRefreshCw,
    FiChevronLeft,
    FiChevronRight,
    FiCalendar,
    FiClock,
    FiUser,
    FiBriefcase,
    FiDollarSign
} from 'react-icons/fi';
import { Sidebar, Header } from '../components/header';
import getHeaders from "../utils/get-headers";
import API_BASE_URL from "../utils/api-controller";

const TaskDashboardDetailPage = () => {
    const navigate = useNavigate();
    const { metric } = useParams();
    
    // Sidebar state
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(() => {
        const saved = localStorage.getItem('sidebarMinimized');
        return saved ? JSON.parse(saved) : false;
    });
    
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(false);
    const [summary, setSummary] = useState(null);
    const [pagination, setPagination] = useState({
        page_no: 1,
        limit: 20,
        total: 0,
        total_pages: 1,
        has_next: false,
        has_prev: false
    });
    const [search, setSearch] = useState('');
    const [expandedRows, setExpandedRows] = useState(new Set());

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

    // Fetch tasks based on metric
    const fetchTasks = useCallback(async () => {
        if (!metric) return;
        
        setLoading(true);
        try {
            let url = `${API_BASE_URL}/report/dashboard-summary-detail/${metric}`;
            url += `?page_no=${pagination.page_no}&limit=${pagination.limit}`;
            
            if (search) {
                url += `&search=${encodeURIComponent(search)}`;
            }
            
            const response = await fetch(url, {
                headers: getHeaders()
            });
            const data = await response.json();
            
            if (data.success) {
                setTasks(data.data.items);
                // Ensure numeric values are properly parsed
                const parsedSummary = {
                    ...data.data.summary,
                    total: Number(data.data.summary?.total) || 0,
                    completed: Number(data.data.summary?.completed) || 0,
                    pending: Number(data.data.summary?.pending) || 0,
                    total_amount: Number(data.data.summary?.total_amount) || 0,
                    avg_completion_days: Number(data.data.summary?.avg_completion_days) || 0
                };
                setSummary(parsedSummary);
                setPagination(data.data.pagination);
            }
        } catch (error) {
            console.error('Error fetching tasks:', error);
        } finally {
            setLoading(false);
        }
    }, [metric, pagination.page_no, pagination.limit, search]);

    useEffect(() => {
        fetchTasks();
    }, [fetchTasks]);

    const toggleRowExpand = (taskId) => {
        const newExpanded = new Set(expandedRows);
        if (newExpanded.has(taskId)) {
            newExpanded.delete(taskId);
        } else {
            newExpanded.add(taskId);
        }
        setExpandedRows(newExpanded);
    };

    const handlePageChange = (newPage) => {
        setPagination(prev => ({ ...prev, page_no: newPage }));
    };

    const handleRefresh = () => {
        fetchTasks();
    };

    const handleClearSearch = () => {
        setSearch('');
        setPagination(prev => ({ ...prev, page_no: 1 }));
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount || 0);
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };

    const getStatusBadge = (status) => {
        if (status === 'complete') {
            return <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">Completed</span>;
        } else if (status === 'cancel') {
            return <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-medium">Cancelled</span>;
        } else {
            return <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs font-medium">Pending</span>;
        }
    };

    const getDaysDiffColor = (daysDiff) => {
        if (!daysDiff) return 'text-gray-600';
        if (daysDiff < 0) return 'text-green-600';
        if (daysDiff === 0) return 'text-yellow-600';
        return 'text-red-600';
    };

    const getPageTitle = () => {
        switch(metric) {
            case 'task_created_today':
                return 'Tasks Created Today';
            case 'task_completed_today':
                return 'Tasks Completed Today';
            default:
                return 'Tasks';
        }
    };

    const getPageDescription = () => {
        switch(metric) {
            case 'task_created_today':
                return 'List of all tasks created today';
            case 'task_completed_today':
                return 'List of all tasks completed today';
            default:
                return 'Task details';
        }
    };

    if (!metric || (metric !== 'task_created_today' && metric !== 'task_completed_today')) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
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
                <div className={`pt-16 transition-all duration-300 ease-in-out w-full ${isMinimized ? 'md:pl-20' : 'md:pl-[260px]'}`}>
                    <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
                        <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
                            <h2 className="text-2xl font-bold text-gray-800 mb-4">Invalid Metric</h2>
                            <p className="text-gray-500 mb-6">Please select a valid task metric to view details.</p>
                            <button
                                onClick={() => navigate('/')}
                                className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all duration-300"
                            >
                                Go Back to Dashboard
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
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

            <div className={`pt-16 transition-all duration-300 ease-in-out w-full ${isMinimized ? 'md:pl-20' : 'md:pl-[260px]'}`}>
                <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
                    {/* Header */}
                    <div className="mb-6">
                        <button
                            onClick={() => navigate('/')}
                            className="mb-4 text-indigo-600 hover:text-indigo-800 flex items-center gap-2 transition-colors"
                        >
                            <FiArrowLeft className="w-4 h-4" /> Back to Dashboard
                        </button>
                        
                        <div className="bg-white rounded-2xl shadow-xl p-6">
                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                                <div>
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="p-3 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-xl">
                                            <FiCheckCircle className="w-6 h-6 text-indigo-600" />
                                        </div>
                                        <div>
                                            <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
                                                {getPageTitle()}
                                            </h1>
                                            <p className="text-gray-500">
                                                {getPageDescription()}
                                            </p>
                                        </div>
                                    </div>
                                    {summary && Object.keys(summary).length > 0 && (
                                        <div className="mt-4 flex flex-wrap gap-4 text-sm">
                                            {summary.total !== undefined && summary.total > 0 && (
                                                <span className="px-3 py-1 bg-gray-100 rounded-full">
                                                    Total: {summary.total}
                                                </span>
                                            )}
                                            {summary.completed !== undefined && summary.completed > 0 && (
                                                <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full">
                                                    Completed: {summary.completed}
                                                </span>
                                            )}
                                            {summary.pending !== undefined && summary.pending > 0 && (
                                                <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full">
                                                    Pending: {summary.pending}
                                                </span>
                                            )}
                                            {summary.total_amount !== undefined && summary.total_amount > 0 && (
                                                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full">
                                                    Total Amount: {formatCurrency(summary.total_amount)}
                                                </span>
                                            )}
                                            {summary.avg_completion_days !== undefined && summary.avg_completion_days > 0 && (
                                                <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full">
                                                    Avg Completion: {typeof summary.avg_completion_days === 'number' ? summary.avg_completion_days.toFixed(1) : parseFloat(summary.avg_completion_days || 0).toFixed(1)} days
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>
                                
                                <div className="flex items-center gap-3">
                                    <motion.button 
                                        onClick={handleRefresh}
                                        disabled={loading}
                                        className="p-3 bg-white border border-gray-200 rounded-xl hover:shadow-lg transition-all duration-300 disabled:opacity-50"
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                    >
                                        <FiRefreshCw className={`w-5 h-5 text-gray-600 ${loading ? 'animate-spin' : ''}`} />
                                    </motion.button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Search */}
                    <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
                        <div className="flex gap-4">
                            <div className="flex-1">
                                <input
                                    type="text"
                                    placeholder="Search by task ID, service name, or client name..."
                                    value={search}
                                    onChange={(e) => {
                                        setSearch(e.target.value);
                                        setPagination(prev => ({ ...prev, page_no: 1 }));
                                    }}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                                />
                            </div>
                            {search && (
                                <button
                                    onClick={handleClearSearch}
                                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
                                >
                                    <FiX className="w-4 h-4" /> Clear
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Tasks Table */}
                    {loading ? (
                        <div className="bg-white rounded-2xl shadow-xl p-20 flex justify-center items-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                        </div>
                    ) : (
                        <>
                            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full min-w-[1000px]">
                                        <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                                            <tr>
                                                <th className="w-10 p-4"></th>
                                                <th className="text-left p-4 font-semibold text-gray-700 text-sm uppercase tracking-wider">
                                                    SL No
                                                </th>
                                                <th className="text-left p-4 font-semibold text-gray-700 text-sm uppercase tracking-wider">
                                                    Task ID
                                                </th>
                                                <th className="text-left p-4 font-semibold text-gray-700 text-sm uppercase tracking-wider">
                                                    Client Name
                                                </th>
                                                <th className="text-left p-4 font-semibold text-gray-700 text-sm uppercase tracking-wider">
                                                    Service
                                                </th>
                                                <th className="text-left p-4 font-semibold text-gray-700 text-sm uppercase tracking-wider">
                                                    Amount
                                                </th>
                                                <th className="text-left p-4 font-semibold text-gray-700 text-sm uppercase tracking-wider">
                                                    Status
                                                </th>
                                                {metric === 'task_created_today' && (
                                                    <th className="text-left p-4 font-semibold text-gray-700 text-sm uppercase tracking-wider">
                                                        Due Date
                                                    </th>
                                                )}
                                                {metric === 'task_completed_today' && (
                                                    <th className="text-left p-4 font-semibold text-gray-700 text-sm uppercase tracking-wider">
                                                        Completed Date
                                                    </th>
                                                )}
                                                {metric === 'task_completed_today' && (
                                                    <th className="text-left p-4 font-semibold text-gray-700 text-sm uppercase tracking-wider">
                                                        Days Diff
                                                    </th>
                                                )}
                                                <th className="text-left p-4 font-semibold text-gray-700 text-sm uppercase tracking-wider">
                                                    Created Date
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {tasks.length === 0 ? (
                                                <tr>
                                                    <td colSpan={metric === 'task_created_today' ? 9 : 10} className="text-center py-12 text-gray-500">
                                                        No tasks found
                                                    </td>
                                                </tr>
                                            ) : (
                                                tasks.map((task, index) => (
                                                    <React.Fragment key={task.task_id || index}>
                                                        <tr className="hover:bg-gray-50/50 transition-colors">
                                                            <td className="p-4">
                                                                <button
                                                                    onClick={() => toggleRowExpand(task.task_id)}
                                                                    className="p-1 hover:bg-gray-100 rounded transition-colors"
                                                                >
                                                                    {expandedRows.has(task.task_id) ? 
                                                                        <FiChevronRight className="w-4 h-4 transform rotate-90" /> : 
                                                                        <FiChevronRight className="w-4 h-4" />
                                                                    }
                                                                </button>
                                                            </td>
                                                            <td className="p-4 text-gray-600">
                                                                {(pagination.page_no - 1) * pagination.limit + index + 1}
                                                            </td>
                                                            <td className="p-4">
                                                                <span className="font-mono text-sm text-gray-600">
                                                                    {task.task_id}
                                                                </span>
                                                            </td>
                                                            <td className="p-4">
                                                                <div>
                                                                    <p className="font-semibold text-gray-800">{task.client_name}</p>
                                                                </div>
                                                            </td>
                                                            <td className="p-4">
                                                                <span className="text-sm text-gray-600">
                                                                    {task.service_name || 'N/A'}
                                                                </span>
                                                            </td>
                                                            <td className="p-4">
                                                                <span className="font-semibold text-green-600">
                                                                    {formatCurrency(task.amount)}
                                                                </span>
                                                            </td>
                                                            <td className="p-4">
                                                                {getStatusBadge(task.status)}
                                                            </td>
                                                            {metric === 'task_created_today' && (
                                                                <td className="p-4">
                                                                    <span className="text-sm">
                                                                        {formatDate(task.due_date)}
                                                                    </span>
                                                                </td>
                                                            )}
                                                            {metric === 'task_completed_today' && (
                                                                <td className="p-4">
                                                                    <span className="text-sm text-green-600">
                                                                        {formatDate(task.complete_date)}
                                                                    </span>
                                                                </td>
                                                            )}
                                                            {metric === 'task_completed_today' && (
                                                                <td className="p-4">
                                                                    <span className={`text-sm font-semibold ${getDaysDiffColor(task.days_diff)}`}>
                                                                        {task.days_diff !== undefined ? `${task.days_diff} days` : 'N/A'}
                                                                    </span>
                                                                </td>
                                                            )}
                                                            <td className="p-4">
                                                                <span className="text-sm">
                                                                    {formatDate(task.create_date)}
                                                                </span>
                                                             </td>
                                                         </tr>
                                                        
                                                        {/* Expanded Row */}
                                                        <AnimatePresence>
                                                            {expandedRows.has(task.task_id) && (
                                                                <motion.tr
                                                                    initial={{ opacity: 0, height: 0 }}
                                                                    animate={{ opacity: 1, height: 'auto' }}
                                                                    exit={{ opacity: 0, height: 0 }}
                                                                    className="bg-gray-50"
                                                                >
                                                                    <td colSpan={metric === 'task_created_today' ? 9 : 10} className="p-6">
                                                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                                            <div className="bg-white p-4 rounded-lg shadow-sm">
                                                                                <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                                                                    <FiBriefcase className="w-4 h-4 text-indigo-600" />
                                                                                    Task Details
                                                                                </h4>
                                                                                <div className="space-y-2 text-sm">
                                                                                    <p><span className="text-gray-500">Task ID:</span> {task.task_id}</p>
                                                                                    <p><span className="text-gray-500">Service:</span> {task.service_name || 'N/A'}</p>
                                                                                    <p><span className="text-gray-500">Client:</span> {task.client_name}</p>
                                                                                    <p><span className="text-gray-500">Amount:</span> {formatCurrency(task.amount)}</p>
                                                                                </div>
                                                                            </div>
                                                                            <div className="bg-white p-4 rounded-lg shadow-sm">
                                                                                <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                                                                    <FiCalendar className="w-4 h-4 text-indigo-600" />
                                                                                    Timeline
                                                                                </h4>
                                                                                <div className="space-y-2 text-sm">
                                                                                    <p><span className="text-gray-500">Created:</span> {formatDate(task.create_date)}</p>
                                                                                    <p><span className="text-gray-500">Due Date:</span> {formatDate(task.due_date)}</p>
                                                                                    {task.complete_date && (
                                                                                        <p><span className="text-gray-500">Completed:</span> {formatDate(task.complete_date)}</p>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                            <div className="bg-white p-4 rounded-lg shadow-sm">
                                                                                <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                                                                    <FiDollarSign className="w-4 h-4 text-indigo-600" />
                                                                                    Status
                                                                                </h4>
                                                                                <div className="space-y-2 text-sm">
                                                                                    <p><span className="text-gray-500">Current Status:</span> {task.status}</p>
                                                                                    {task.days_diff !== undefined && (
                                                                                        <p><span className="text-gray-500">Days Difference:</span> {task.days_diff} days</p>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </td>
                                                                </motion.tr>
                                                            )}
                                                        </AnimatePresence>
                                                    </React.Fragment>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Pagination */}
                            {pagination.total_pages > 1 && (
                                <div className="mt-6 flex justify-center items-center gap-2">
                                    <button
                                        onClick={() => handlePageChange(pagination.page_no - 1)}
                                        disabled={!pagination.has_prev}
                                        className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors flex items-center gap-2"
                                    >
                                        <FiChevronLeft className="w-4 h-4" />
                                        Previous
                                    </button>
                                    <span className="px-4 py-2 text-gray-700">
                                        Page {pagination.page_no} of {pagination.total_pages}
                                    </span>
                                    <button
                                        onClick={() => handlePageChange(pagination.page_no + 1)}
                                        disabled={!pagination.has_next}
                                        className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors flex items-center gap-2"
                                    >
                                        Next
                                        <FiChevronRight className="w-4 h-4" />
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TaskDashboardDetailPage;