// TaskTab.js
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    FiCheckSquare,
    FiClock,
    FiCalendar,
    FiUser,
    FiAlertCircle,
    FiCheckCircle,
    FiXCircle,
    FiTrendingUp,
    FiList,
    FiGrid,
    FiSearch,
    FiRefreshCw,
    FiEye,
    FiChevronLeft,
    FiChevronRight,
    FiFileText,
    FiBriefcase,
    FiMail,
    FiPhone,
    FiChevronDown
} from 'react-icons/fi';
import API_BASE_URL from '../utils/api-controller';
import getHeaders from '../utils/get-headers';
import { getTaskCompliancePeriodLabel } from '../utils/taskCompliancePeriod';
import {
    getTaskCompleteDateValue,
    isTaskCompleteStatus,
} from '../utils/taskCompleteDate';

const TaskTab = ({ username, variants }) => {
    const [viewMode, setViewMode] = useState('table'); // 'table', 'list', 'grid'
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [loading, setLoading] = useState(false);
    const [staffTasks, setStaffTasks] = useState([]);
    const [staffInfo, setStaffInfo] = useState(null);
    const [summary, setSummary] = useState({
        total: 0,
        complete: 0,
        cancel: 0,
        in_process: 0,
        pending_from_client: 0,
        pending_from_department: 0
    });
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    // Fetch tasks from API
    const fetchTasks = async (status = filterStatus) => {
        if (!username) return;

        setLoading(true);
        try {
            const statusParam = status === 'all' ? '' : `&status=${encodeURIComponent(status)}`;
            const searchParam = searchTerm ? `&search=${encodeURIComponent(searchTerm)}` : '';
            const url = `${API_BASE_URL}/report/staff-tasks?staff_username=${username}${statusParam}${searchParam}`;

            const response = await fetch(url, {
                headers: getHeaders()
            });

            const result = await response.json();

            if (result.success) {
                setStaffTasks(result.data.tasks);
                setStaffInfo(result.data.staff_info);
                setSummary(result.data.summary);
                setCurrentPage(1);
            } else {
                console.error('Failed to fetch tasks:', result.message);
            }
        } catch (error) {
            console.error('Error fetching tasks:', error);
        } finally {
            setLoading(false);
        }
    };

    // Initial fetch and when dependencies change
    useEffect(() => {
        if (username) {
            fetchTasks(filterStatus);
        }
    }, [username, filterStatus]);

    // Handle search with debounce
    useEffect(() => {
        const debounceTimer = setTimeout(() => {
            if (username) {
                fetchTasks(filterStatus);
            }
        }, 500);

        return () => clearTimeout(debounceTimer);
    }, [searchTerm]);

    const getStatusColor = (status) => {
        switch (status?.toLowerCase()) {
            case 'complete':
                return 'bg-green-100 text-green-700';
            case 'cancel':
                return 'bg-red-100 text-red-700';
            case 'in process':
                return 'bg-orange-100 text-orange-700';
            case 'pending from client':
                return 'bg-purple-100 text-purple-700';
            case 'pending from department':
                return 'bg-yellow-100 text-yellow-700';
            case 'unassign':
                return 'bg-blue-100 text-blue-700';
            default:
                return 'bg-gray-100 text-gray-700';
        }
    };

    const getStatusIcon = (status) => {
        switch (status?.toLowerCase()) {
            case 'complete':
                return <FiCheckCircle className="w-3.5 h-3.5" />;
            case 'cancel':
                return <FiXCircle className="w-3.5 h-3.5" />;
            case 'in process':
                return <FiTrendingUp className="w-3.5 h-3.5" />;
            case 'pending from client':
                return <FiAlertCircle className="w-3.5 h-3.5" />;
            case 'pending from department':
                return <FiClock className="w-3.5 h-3.5" />;
            default:
                return <FiClock className="w-3.5 h-3.5" />;
        }
    };

    const getBillingStatusColor = (status) => {
        switch (status) {
            case 'billed':
                return 'bg-green-100 text-green-800';
            case 'pending':
                return 'bg-yellow-100 text-yellow-800';
            case 'non_billable':
                return 'bg-gray-100 text-gray-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    const formatCurrency = (amount) => {
        return `₹${Number(amount || 0).toLocaleString('en-IN')}`;
    };

    const openTask = (taskId) => {
        window.open(`/task/${taskId}`, '_blank');
    };

    // Filter tasks by search (client-side on already fetched list)
    const filteredTasks = staffTasks.filter((task) => {
        if (!searchTerm) return true;
        const q = searchTerm.toLowerCase();
        return (
            String(task.service_name || '').toLowerCase().includes(q) ||
            String(task.client_name || '').toLowerCase().includes(q) ||
            String(task.firm_name || '').toLowerCase().includes(q) ||
            String(task.task_id || '').toLowerCase().includes(q) ||
            String(task.compliance_period || '').toLowerCase().includes(q) ||
            String(task.compliance_year || '').toLowerCase().includes(q)
        );
    });

    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentTasks = filteredTasks.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.max(1, Math.ceil(filteredTasks.length / itemsPerPage));

    const statusOptions = [
        { value: 'all', label: 'All Tasks', icon: FiList, count: summary.total },
        { value: 'in process', label: 'In Process', icon: FiTrendingUp, count: summary.in_process },
        { value: 'pending from client', label: 'Pending from Client', icon: FiAlertCircle, count: summary.pending_from_client },
        { value: 'pending from department', label: 'Pending from Department', icon: FiClock, count: summary.pending_from_department },
        { value: 'complete', label: 'Complete', icon: FiCheckCircle, count: summary.complete },
        { value: 'cancel', label: 'Cancel', icon: FiXCircle, count: summary.cancel },
    ];

    const getSelectedStatusLabel = () => {
        const selected = statusOptions.find(opt => opt.value === filterStatus);
        return selected ? selected.label : 'All Tasks';
    };

    const getSelectedStatusIcon = () => {
        const selected = statusOptions.find(opt => opt.value === filterStatus);
        const Icon = selected ? selected.icon : FiList;
        return <Icon className="w-4 h-4" />;
    };

    const renderTaskColumn = (task) => {
        const serviceName = task.service?.name || task.service_name || '-';
        const isCompliance = String(task.task_type || '').toLowerCase() === 'compliance';
        const feesAmount = task.charges?.fees ?? task.financials?.fees ?? 0;
        const periodLabel = getTaskCompliancePeriodLabel(task);

        return (
            <div className="flex flex-col items-start gap-1.5 min-w-0">
                <button
                    type="button"
                    onClick={() => openTask(task.task_id)}
                    className="inline-flex items-center gap-1.5 font-semibold text-gray-800 text-sm hover:text-indigo-600 transition-colors text-left"
                >
                    <span className="truncate">{serviceName}</span>
                    {isCompliance ? (
                        <span
                            className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded bg-red-100 text-[10px] font-bold text-red-700"
                            title="Compliance task"
                        >
                            C
                        </span>
                    ) : null}
                </button>
                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                    {formatCurrency(feesAmount)}
                </div>
                {periodLabel ? (
                    <span className="text-xs text-gray-500 leading-snug">{periodLabel}</span>
                ) : null}
                {task.firm_name ? (
                    <div className="text-gray-700 font-medium text-sm truncate max-w-[220px]" title={task.firm_name}>
                        {task.firm_name}
                    </div>
                ) : null}
            </div>
        );
    };

    // Table View — aligned with task-display Task / Client / Dates / Status columns
    const TableView = () => (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gradient-to-r from-gray-50 to-white">
                    <tr>
                        <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-12">
                            #
                        </th>
                        <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider min-w-[200px]">
                            Task
                        </th>
                        <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider min-w-[160px]">
                            Client
                        </th>
                        <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider min-w-[140px]">
                            Dates
                        </th>
                        <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            Status
                        </th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                    {currentTasks.map((task, index) => (
                        <motion.tr
                            key={task.task_id + index}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: Math.min(index * 0.03, 0.3) }}
                            className="hover:bg-gray-50/80 transition-colors group"
                        >
                            <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-500 font-medium align-top">
                                {indexOfFirstItem + index + 1}
                            </td>
                            <td className="px-3 py-3 align-top">
                                {renderTaskColumn(task)}
                            </td>
                            <td className="px-3 py-3 align-top">
                                <div className="flex flex-col gap-1 min-w-0">
                                    <div className="text-sm font-medium text-gray-800 truncate">
                                        {task.client_name || '-'}
                                    </div>
                                    {task.client_mobile ? (
                                        <div className="text-xs text-gray-500 flex items-center gap-1">
                                            <FiPhone className="w-3 h-3 shrink-0" />
                                            {task.client_mobile}
                                        </div>
                                    ) : null}
                                    {task.firm?.file_no ? (
                                        <div className="text-xs text-gray-500 truncate">
                                            File: {task.firm.file_no}
                                        </div>
                                    ) : null}
                                </div>
                            </td>
                            <td className="px-3 py-3 align-top">
                                <div className="flex flex-col gap-1.5">
                                    <div className="flex items-center gap-1.5 text-gray-700 font-medium text-sm" title="Create Date">
                                        <FiClock className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                                        <span>{formatDate(task.create_date || task.dates?.create_date)}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-gray-700 font-medium text-sm" title="Due Date">
                                        <FiCalendar className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                                        <span>{formatDate(task.due_date || task.dates?.due_date)}</span>
                                    </div>
                                </div>
                            </td>
                            <td className="px-3 py-3 whitespace-nowrap align-top">
                                <div className="flex flex-col items-start gap-1.5">
                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold capitalize ${getStatusColor(task.status)}`}>
                                        {getStatusIcon(task.status)}
                                        {task.status || '-'}
                                    </span>
                                    {(() => {
                                        const completeDateRaw = getTaskCompleteDateValue(task);
                                        if (!isTaskCompleteStatus(task.status) || !completeDateRaw) return null;
                                        const label = formatDate(completeDateRaw);
                                        return (
                                            <span className="text-xs text-gray-500 leading-snug" title={`Completed: ${label}`}>
                                                {label}
                                            </span>
                                        );
                                    })()}
                                    {task.financials?.billing_status ? (
                                        <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${getBillingStatusColor(task.financials.billing_status)}`}>
                                            {String(task.financials.billing_status).replace(/_/g, ' ')}
                                        </span>
                                    ) : null}
                                </div>
                            </td>
                        </motion.tr>
                    ))}
                </tbody>
            </table>
        </div>
    );

    // List View
    const ListView = () => (
        <div className="space-y-3">
            {currentTasks.map((task, index) => {
                const periodLabel = getTaskCompliancePeriodLabel(task);
                const feesAmount = task.charges?.fees ?? task.financials?.fees ?? 0;
                const isCompliance = String(task.task_type || '').toLowerCase() === 'compliance';
                return (
                    <motion.div
                        key={task.task_id + index}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: Math.min(index * 0.03, 0.3) }}
                        className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50/80 transition-colors cursor-pointer"
                        onClick={() => openTask(task.task_id)}
                    >
                        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                            <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                                    <h3 className="text-sm font-semibold text-gray-800 hover:text-indigo-600 transition-colors inline-flex items-center gap-1.5">
                                        {task.service_name}
                                        {isCompliance ? (
                                            <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded bg-red-100 text-[10px] font-bold text-red-700">
                                                C
                                            </span>
                                        ) : null}
                                    </h3>
                                    <div className="flex flex-col items-start gap-0.5">
                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold capitalize ${getStatusColor(task.status)}`}>
                                            {getStatusIcon(task.status)}
                                            {task.status}
                                        </span>
                                        {(() => {
                                            const completeDateRaw = getTaskCompleteDateValue(task);
                                            if (!isTaskCompleteStatus(task.status) || !completeDateRaw) return null;
                                            const label = formatDate(completeDateRaw);
                                            return (
                                                <span className="text-xs text-gray-500 leading-snug" title={`Completed: ${label}`}>
                                                    {label}
                                                </span>
                                            );
                                        })()}
                                    </div>
                                </div>
                                <div className="flex flex-wrap items-center gap-2 mb-3">
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                        {formatCurrency(feesAmount)}
                                    </span>
                                    {periodLabel ? (
                                        <span className="text-xs text-gray-500">{periodLabel}</span>
                                    ) : null}
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-sm">
                                    <div className="flex items-center gap-2 text-gray-600">
                                        <FiUser className="w-3.5 h-3.5 text-gray-400" />
                                        <span className="font-medium text-gray-800">{task.client_name || '-'}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-gray-600">
                                        <FiBriefcase className="w-3.5 h-3.5 text-gray-400" />
                                        <span className="font-medium text-gray-800">{task.firm_name || '-'}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-gray-600">
                                        <FiCalendar className="w-3.5 h-3.5 text-gray-400" />
                                        <span>Due: <span className="font-medium text-gray-800">{formatDate(task.due_date)}</span></span>
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    openTask(task.task_id);
                                }}
                                className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 transition-colors text-sm font-medium"
                            >
                                <FiEye className="w-4 h-4" />
                                View
                            </button>
                        </div>
                    </motion.div>
                );
            })}
        </div>
    );

    // Grid View
    const GridView = () => (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {currentTasks.map((task, index) => {
                const periodLabel = getTaskCompliancePeriodLabel(task);
                const feesAmount = task.charges?.fees ?? task.financials?.fees ?? 0;
                const isCompliance = String(task.task_type || '').toLowerCase() === 'compliance';
                return (
                    <motion.div
                        key={task.task_id + index}
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: Math.min(index * 0.03, 0.3) }}
                        className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50/80 transition-colors group cursor-pointer"
                        onClick={() => openTask(task.task_id)}
                    >
                        <div className="flex justify-between items-start mb-2 gap-2">
                            <h3 className="text-sm font-semibold text-gray-800 flex-1 group-hover:text-indigo-600 transition-colors inline-flex items-center gap-1.5 min-w-0">
                                <span className="truncate">{task.service_name}</span>
                                {isCompliance ? (
                                    <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded bg-red-100 text-[10px] font-bold text-red-700">
                                        C
                                    </span>
                                ) : null}
                            </h3>
                            <div className="flex flex-col items-end gap-0.5 shrink-0">
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold capitalize ${getStatusColor(task.status)}`}>
                                    {getStatusIcon(task.status)}
                                    {task.status}
                                </span>
                                {(() => {
                                    const completeDateRaw = getTaskCompleteDateValue(task);
                                    if (!isTaskCompleteStatus(task.status) || !completeDateRaw) return null;
                                    const label = formatDate(completeDateRaw);
                                    return (
                                        <span className="text-xs text-gray-500 leading-snug" title={`Completed: ${label}`}>
                                            {label}
                                        </span>
                                    );
                                })()}
                            </div>
                        </div>

                        <div className="flex flex-col items-start gap-1 mb-3">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                {formatCurrency(feesAmount)}
                            </span>
                            {periodLabel ? (
                                <span className="text-xs text-gray-500">{periodLabel}</span>
                            ) : null}
                        </div>

                        <div className="space-y-1.5 mb-3 text-sm">
                            <div className="flex items-center gap-2">
                                <FiUser className="w-3.5 h-3.5 text-gray-400" />
                                <span className="font-medium text-gray-800 truncate">{task.client_name || '-'}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <FiBriefcase className="w-3.5 h-3.5 text-gray-400" />
                                <span className="font-medium text-gray-800 truncate">{task.firm_name || '-'}</span>
                            </div>
                        </div>

                        <div className="pt-3 border-t border-gray-100 flex justify-between items-center text-xs text-gray-500">
                            <div className="flex items-center gap-1">
                                <FiCalendar className="w-3 h-3" />
                                <span>Due: {formatDate(task.due_date)}</span>
                            </div>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    openTask(task.task_id);
                                }}
                                className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-50 text-indigo-700 rounded hover:bg-indigo-100 transition-colors font-medium"
                            >
                                <FiEye className="w-3.5 h-3.5" />
                                View
                            </button>
                        </div>
                    </motion.div>
                );
            })}
        </div>
    );

    // Pagination Component
    const Pagination = () => (
        <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-t border-gray-200 rounded-b-lg mt-4">
            <div className="text-sm text-gray-700">
                Showing <span className="font-medium">{filteredTasks.length === 0 ? 0 : indexOfFirstItem + 1}</span> to{' '}
                <span className="font-medium">{Math.min(indexOfLastItem, filteredTasks.length)}</span> of{' '}
                <span className="font-medium">{filteredTasks.length}</span> results
            </div>
            <div className="flex gap-2">
                <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
                >
                    <FiChevronLeft className="w-4 h-4" />
                    Previous
                </button>
                <span className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md">
                    Page {currentPage} of {totalPages}
                </span>
                <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
                >
                    Next
                    <FiChevronRight className="w-4 h-4" />
                </button>
            </div>
        </div>
    );

    return (
        <motion.div
            variants={variants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden"
        >
            {/* Header with Staff Info */}
            <div className="bg-gradient-to-r from-gray-50 to-white px-6 py-4 border-b border-gray-200">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                            <FiCheckSquare className="w-5 h-5 text-indigo-600" />
                            Tasks & Assignments
                        </h2>
                        {staffInfo && (
                            <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-gray-600">
                                <span className="flex items-center gap-1">
                                    <FiUser className="w-4 h-4" />
                                    {staffInfo.name}
                                </span>
                                <span className="flex items-center gap-1">
                                    <FiMail className="w-4 h-4" />
                                    {staffInfo.email}
                                </span>
                                <span className="flex items-center gap-1">
                                    <FiPhone className="w-4 h-4" />
                                    {staffInfo.mobile}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* View Toggle */}
                    <div className="flex gap-2 bg-white rounded-lg p-1 border border-gray-200 shadow-sm">
                        <button
                            onClick={() => setViewMode('table')}
                            className={`p-2 rounded-md transition-all duration-200 ${
                                viewMode === 'table'
                                    ? 'bg-indigo-600 text-white shadow-sm'
                                    : 'text-gray-600 hover:bg-gray-100'
                            }`}
                            title="Table View"
                        >
                            <FiList className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-2 rounded-md transition-all duration-200 ${
                                viewMode === 'list'
                                    ? 'bg-indigo-600 text-white shadow-sm'
                                    : 'text-gray-600 hover:bg-gray-100'
                            }`}
                            title="List View"
                        >
                            <FiFileText className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-2 rounded-md transition-all duration-200 ${
                                viewMode === 'grid'
                                    ? 'bg-indigo-600 text-white shadow-sm'
                                    : 'text-gray-600 hover:bg-gray-100'
                            }`}
                            title="Grid View"
                        >
                            <FiGrid className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <div className="flex flex-col sm:flex-row gap-4">
                    {/* Search */}
                    <div className="flex-1 relative">
                        <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Search by service, client, firm, or task ID..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                        />
                    </div>

                    {/* Status Dropdown */}
                    <div className="relative">
                        <button
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            className="px-4 py-2 rounded-lg text-sm font-medium bg-white text-gray-700 hover:bg-gray-100 border border-gray-200 transition-all duration-200 flex items-center gap-2 shadow-sm min-w-[200px] justify-between"
                        >
                            <div className="flex items-center gap-2">
                                {getSelectedStatusIcon()}
                                <span>{getSelectedStatusLabel()}</span>
                                <span className="ml-1 px-1.5 py-0.5 rounded-full text-xs bg-gray-200 text-gray-700">
                                    {statusOptions.find(opt => opt.value === filterStatus)?.count || 0}
                                </span>
                            </div>
                            <FiChevronDown className={`w-4 h-4 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {isDropdownOpen && (
                            <>
                                <div
                                    className="fixed inset-0 z-10"
                                    onClick={() => setIsDropdownOpen(false)}
                                />
                                <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-20 overflow-hidden">
                                    {statusOptions.map(option => {
                                        const Icon = option.icon;
                                        return (
                                            <button
                                                key={option.value}
                                                onClick={() => {
                                                    setFilterStatus(option.value);
                                                    setIsDropdownOpen(false);
                                                }}
                                                className={`w-full px-4 py-2 text-left text-sm font-medium transition-all duration-200 flex items-center justify-between hover:bg-gray-50 ${
                                                    filterStatus === option.value
                                                        ? 'bg-indigo-50 text-indigo-700'
                                                        : 'text-gray-700'
                                                }`}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <Icon className={`w-4 h-4 ${filterStatus === option.value ? 'text-indigo-600' : 'text-gray-500'}`} />
                                                    <span>{option.label}</span>
                                                </div>
                                                <span className={`px-1.5 py-0.5 rounded-full text-xs ${
                                                    filterStatus === option.value
                                                        ? 'bg-indigo-100 text-indigo-700'
                                                        : 'bg-gray-100 text-gray-600'
                                                }`}>
                                                    {option.count}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </>
                        )}
                    </div>

                    {/* Refresh Button */}
                    <button
                        onClick={() => fetchTasks(filterStatus)}
                        className="px-3 py-1.5 rounded-lg text-sm font-medium bg-white text-gray-700 hover:bg-gray-100 border border-gray-200 transition-all duration-200 flex items-center gap-2 shadow-sm"
                        disabled={loading}
                    >
                        <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                </div>
            </div>

            {/* Tasks Content */}
            <div className="p-6">
                {loading ? (
                    <div className="text-center py-12">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-4"></div>
                        <p className="text-gray-600">Loading tasks...</p>
                    </div>
                ) : filteredTasks.length === 0 ? (
                    <div className="text-center py-12">
                        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <FiCheckSquare className="w-10 h-10 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No tasks found</h3>
                        <p className="text-gray-600">No tasks match your search criteria</p>
                    </div>
                ) : (
                    <>
                        {viewMode === 'table' && <TableView />}
                        {viewMode === 'list' && <ListView />}
                        {viewMode === 'grid' && <GridView />}

                        {/* Pagination */}
                        {filteredTasks.length > itemsPerPage && <Pagination />}
                    </>
                )}
            </div>
        </motion.div>
    );
};

export default TaskTab;
