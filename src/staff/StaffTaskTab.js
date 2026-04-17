// TaskTab.js
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
    FiCheckSquare, 
    FiClock, 
    FiCalendar, 
    FiUser, 
    FiDollarSign,
    FiAlertCircle,
    FiCheckCircle,
    FiXCircle,
    FiTrendingUp,
    FiList,
    FiGrid,
    FiSearch,
    FiFilter,
    FiDownload,
    FiRefreshCw,
    FiEye,
    FiChevronLeft,
    FiChevronRight,
    FiFileText,
    FiBriefcase,
    FiMail,
    FiPhone,
    FiExternalLink,
    FiChevronDown
} from 'react-icons/fi';
import API_BASE_URL from '../utils/api-controller';
import getHeaders from '../utils/get-headers';

const TaskTab = ({ tasks, setTasks, username, variants }) => {
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
        switch(status?.toLowerCase()) {
            case 'complete':
                return 'bg-green-100 text-green-800 border-green-200';
            case 'cancel':
                return 'bg-red-100 text-red-800 border-red-200';
            case 'in process':
                return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'pending from client':
                return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'pending from department':
                return 'bg-purple-100 text-purple-800 border-purple-200';
            default:
                return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    const getStatusIcon = (status) => {
        switch(status?.toLowerCase()) {
            case 'complete':
                return <FiCheckCircle className="w-4 h-4" />;
            case 'cancel':
                return <FiXCircle className="w-4 h-4" />;
            case 'in process':
                return <FiTrendingUp className="w-4 h-4" />;
            case 'pending from client':
                return <FiAlertCircle className="w-4 h-4" />;
            case 'pending from department':
                return <FiClock className="w-4 h-4" />;
            default:
                return <FiClock className="w-4 h-4" />;
        }
    };

    const getBillingStatusColor = (status) => {
        switch(status) {
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
            month: '2-digit',
            year: 'numeric'
        });
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    };

    // Pagination
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentTasks = staffTasks.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(staffTasks.length / itemsPerPage);

    const statusOptions = [
        { value: 'all', label: 'All Tasks', count: summary.total, icon: FiList },
        { value: 'in process', label: 'In Process', count: summary.in_process, icon: FiTrendingUp },
        { value: 'pending from client', label: 'Pending from Client', count: summary.pending_from_client, icon: FiAlertCircle },
        { value: 'pending from department', label: 'Pending from Department', count: summary.pending_from_department, icon: FiClock },
        { value: 'complete', label: 'Completed', count: summary.complete, icon: FiCheckCircle },
        { value: 'cancel', label: 'Cancelled', count: summary.cancel, icon: FiXCircle }
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

    // Professional Fixed Table View
    const TableView = () => (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                    <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider sticky left-0 bg-gray-50">
                            S.No
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            Service
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            Client Details
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            Firm
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            Status
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            Due Date
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            Financials
                        </th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {currentTasks.map((task, index) => (
                        <motion.tr
                            key={task.task_id + index}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="hover:bg-gray-50 transition-colors duration-200 group"
                        >
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 font-medium">
                                {indexOfFirstItem + index + 1}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                                <button
                                    onClick={() => window.open(`/task/${task.task_id}`, '_blank')}
                                    className="text-left hover:text-blue-600 transition-colors duration-200"
                                >
                                    <div className="text-sm font-semibold text-gray-900 group-hover:text-blue-600">
                                        {task.service_name}
                                    </div>
                                    {/* <div className="text-xs text-gray-500 mt-0.5">
                                        ID: {task.task_id.substring(0, 12)}...
                                    </div> */}
                                </button>
                            </td>
                            <td className="px-4 py-3">
                                <div className="flex flex-col">
                                    <div className="text-sm font-medium text-gray-900 flex items-center gap-1">
                                        <FiUser className="w-3 h-3 text-blue-500" />
                                        {task.client_name}
                                    </div>
                                    <div className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                                        <FiPhone className="w-3 h-3" />
                                        {task.client_mobile}
                                    </div>
                                </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                                <div className="flex items-center gap-1">
                                    <FiBriefcase className="w-3 h-3 text-purple-500" />
                                    <span className="text-sm text-gray-900">{task.firm_name}</span>
                                </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                                    {getStatusIcon(task.status)}
                                    <span className="capitalize">{task.status}</span>
                                </span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                    <FiCalendar className="w-4 h-4 text-gray-400" />
                                    <span className="text-sm font-medium text-gray-900">
                                        {formatDate(task.due_date)}
                                    </span>
                                </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                                <div className="flex flex-col">
                                    <div className="text-sm font-bold text-gray-900">
                                        {formatCurrency(task.financials.fees)}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                        Total: {formatCurrency(task.financials.total)}
                                    </div>
                                    <span className={`inline-flex mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${getBillingStatusColor(task.financials.billing_status)}`}>
                                        {task.financials.billing_status}
                                    </span>
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
        <div className="space-y-4">
            {currentTasks.map((task, index) => (
                <motion.div
                    key={task.task_id + index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow duration-200 cursor-pointer"
                    onClick={() => window.open(`/task/${task.task_id}`, '_blank')}
                >
                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2 flex-wrap">
                                <h3 className="text-lg font-semibold text-gray-900 hover:text-blue-600 transition-colors">
                                    {task.service_name}
                                </h3>
                                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                                    {getStatusIcon(task.status)}
                                    {task.status}
                                </span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
                                <div className="flex items-center gap-2 text-gray-600">
                                    <FiUser className="w-4 h-4 text-blue-500" />
                                    <span>Client: <span className="font-medium text-gray-900">{task.client_name}</span></span>
                                </div>
                                <div className="flex items-center gap-2 text-gray-600">
                                    <FiBriefcase className="w-4 h-4 text-purple-500" />
                                    <span>Firm: <span className="font-medium text-gray-900">{task.firm_name}</span></span>
                                </div>
                                <div className="flex items-center gap-2 text-gray-600">
                                    <FiDollarSign className="w-4 h-4 text-green-500" />
                                    <span>Fees: <span className="font-medium text-gray-900">{formatCurrency(task.financials.fees)}</span></span>
                                </div>
                                <div className="flex items-center gap-2 text-gray-600">
                                    <FiCalendar className="w-4 h-4 text-orange-500" />
                                    <span>Created: <span className="font-medium text-gray-900">{formatDate(task.create_date)}</span></span>
                                </div>
                                <div className="flex items-center gap-2 text-gray-600">
                                    <FiCalendar className="w-4 h-4 text-red-500" />
                                    <span>Due Date: <span className="font-medium text-gray-900">{formatDate(task.due_date)}</span></span>
                                </div>
                                <div className="flex items-center gap-2 text-gray-600">
                                    <FiClock className="w-4 h-4 text-indigo-500" />
                                    <span>Target: <span className="font-medium text-gray-900">{formatDate(task.target_date)}</span></span>
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                window.open(`/task/${task.task_id}`, '_blank');
                            }}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-all duration-200 text-sm font-medium"
                        >
                            <FiEye className="w-4 h-4" />
                            View Details
                        </button>
                    </div>
                </motion.div>
            ))}
        </div>
    );

    // Grid View
    const GridView = () => (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {currentTasks.map((task, index) => (
                <motion.div
                    key={task.task_id + index}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.05 }}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-lg transition-all duration-200 group cursor-pointer"
                    onClick={() => window.open(`/task/${task.task_id}`, '_blank')}
                >
                    <div className="flex justify-between items-start mb-3">
                        <h3 className="text-base font-semibold text-gray-900 flex-1 group-hover:text-blue-600 transition-colors">
                            {task.service_name}
                        </h3>
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                            {getStatusIcon(task.status)}
                            {task.status}
                        </span>
                    </div>
                    
                    <div className="space-y-2 mb-4">
                        <div className="flex items-center gap-2 text-sm">
                            <FiUser className="w-4 h-4 text-blue-500" />
                            <span className="text-gray-600">Client:</span>
                            <span className="font-medium text-gray-900">{task.client_name}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                            <FiBriefcase className="w-4 h-4 text-purple-500" />
                            <span className="text-gray-600">Firm:</span>
                            <span className="font-medium text-gray-900">{task.firm_name}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                            <FiDollarSign className="w-4 h-4 text-green-500" />
                            <span className="text-gray-600">Fees:</span>
                            <span className="font-medium text-gray-900">{formatCurrency(task.financials.fees)}</span>
                        </div>
                    </div>
                    
                    <div className="pt-3 border-t border-gray-100">
                        <div className="flex justify-between items-center mb-3 text-xs text-gray-500">
                            <div className="flex items-center gap-1">
                                <FiCalendar className="w-3 h-3" />
                                <span>Due: {formatDate(task.due_date)}</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <FiClock className="w-3 h-3" />
                                <span>Target: {formatDate(task.target_date)}</span>
                            </div>
                        </div>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                window.open(`/task/${task.task_id}`, '_blank');
                            }}
                            className="w-full mt-2 inline-flex items-center justify-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-all duration-200 text-sm font-medium"
                        >
                            <FiEye className="w-4 h-4" />
                            View Task Details
                        </button>
                    </div>
                </motion.div>
            ))}
        </div>
    );

    // Pagination Component
    const Pagination = () => (
        <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-lg">
            <div className="text-sm text-gray-700">
                Showing <span className="font-medium">{indexOfFirstItem + 1}</span> to{' '}
                <span className="font-medium">{Math.min(indexOfLastItem, staffTasks.length)}</span> of{' '}
                <span className="font-medium">{staffTasks.length}</span> results
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
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-gray-200">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                            <FiCheckSquare className="w-5 h-5 text-blue-600" />
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
                                    ? 'bg-blue-600 text-white shadow-sm' 
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
                                    ? 'bg-blue-600 text-white shadow-sm' 
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
                                    ? 'bg-blue-600 text-white shadow-sm' 
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
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
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
                                                        ? 'bg-blue-50 text-blue-700'
                                                        : 'text-gray-700'
                                                }`}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <Icon className={`w-4 h-4 ${filterStatus === option.value ? 'text-blue-600' : 'text-gray-500'}`} />
                                                    <span>{option.label}</span>
                                                </div>
                                                <span className={`px-1.5 py-0.5 rounded-full text-xs ${
                                                    filterStatus === option.value
                                                        ? 'bg-blue-100 text-blue-700'
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
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
                        <p className="text-gray-600">Loading tasks...</p>
                    </div>
                ) : staffTasks.length === 0 ? (
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
                        {staffTasks.length > itemsPerPage && <Pagination />}
                    </>
                )}
            </div>
        </motion.div>
    );
};

export default TaskTab;