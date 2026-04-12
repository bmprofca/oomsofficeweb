import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FiCheckSquare,
    FiPlus,
    FiEdit,
    FiTrash2,
    FiUser,
    FiX,
    FiChevronDown,
    FiSearch,
    FiCalendar,
    FiType,
    FiPackage,
    FiChevronLeft,
    FiChevronRight,
    FiAlertCircle,
    FiInfo
} from 'react-icons/fi';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import getHeaders from "../utils/get-headers";
import API_BASE_URL from "../utils/api-controller";

const SubtaskTab = ({ 
    taskId,
    task_id,
    availableStaff = []
}) => {
    // Use either taskId or task_id
    const effectiveTaskId = taskId || task_id;
    
    const [subtaskList, setSubtaskList] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [editingSubtask, setEditingSubtask] = useState(null);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [pagination, setPagination] = useState({
        page_no: 1,
        limit: 20,
        total: 0,
        total_pages: 1,
        is_last_page: true
    });
    
    // Form state
    const [formData, setFormData] = useState({
        type: 'text',
        text: '',
        service_id: '',
        status: 'pending'
    });

    // Services state for dropdown
    const [services, setServices] = useState([]);
    const [loadingServices, setLoadingServices] = useState(false);
    const [serviceSearch, setServiceSearch] = useState('');
    const [showServiceDropdown, setShowServiceDropdown] = useState(false);

    // Filter state
    const [filters, setFilters] = useState({
        type: '',
        status: '',
        search: ''
    });

    const [detailsSubtask, setDetailsSubtask] = useState(null);
    const [blockingConfirm, setBlockingConfirm] = useState(null);

    // Status options (API: pending, complete, cancel)
    const statusOptions = [
        { value: 'pending', label: 'Pending' },
        { value: 'complete', label: 'Complete' },
        { value: 'cancel', label: 'Cancel' }
    ];

    // Map legacy / alternate API values onto pending | complete | cancel
    const normalizeStatus = (status) => {
        if (!status || String(status).trim() === '') return 'pending';
        const s = String(status).toLowerCase().trim().replace(/\s+/g, ' ');
        if (['complete', 'completed', 'done'].includes(s)) return 'complete';
        if (['cancel', 'cancelled', 'canceled'].includes(s)) return 'cancel';
        return 'pending';
    };

    const showConfirm = (message, onConfirm, title = 'Please confirm', confirmLabel = 'Confirm') => {
        setBlockingConfirm({ title, message, onConfirm, confirmLabel });
    };

    // Helper function to format subtask data from API
    const formatSubtaskData = (apiData) => {
        return apiData.map(task => ({
            ...task,
            subtask_id: task.subtask_id,
            text: task.type === 'text' || task.type === 'task'
                ? (task.text || task.content || '')
                : '',
            status: normalizeStatus(task.status),
            service: task.service || null,
            created_by: task.created_by || task.create_by || { name: 'Unknown' },
            dates: task.dates || { create_date: task.create_date || new Date().toISOString() }
        }));
    };

    // Fetch subtasks
    const fetchSubtasks = async (page = 1) => {
        if (!effectiveTaskId) {
            setError('Please select a task');
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);
        
        try {
            const headers = getHeaders();
            if (!headers) throw new Error('Authentication failed');
            
            const params = new URLSearchParams({
                task_id: effectiveTaskId,
                page_no: page,
                limit: pagination.limit,
                ...(filters.type && { type: filters.type }),
                ...(filters.status && { status: filters.status }),
                ...(filters.search && { search: filters.search })
            });

            const response = await axios.get(
                `${API_BASE_URL}/task/details/subtask/list?${params}`,
                { headers }
            );
            
            if (response.data?.success) {
                const formattedData = formatSubtaskData(response.data.data || []);
                setSubtaskList(formattedData);
                setPagination(response.data.pagination || {
                    page_no: page,
                    limit: 20,
                    total: formattedData.length,
                    total_pages: 1,
                    is_last_page: true
                });
            } else {
                setError(response.data?.message || 'Failed to fetch subtasks');
            }
        } catch (error) {
            console.error('Error fetching subtasks:', error);
            console.error('Error response:', error.response?.data);
            setError(error.response?.data?.message || error.message);
        } finally {
            setLoading(false);
        }
    };

    // Fetch services for dropdown
    const fetchServices = async (search = '') => {
        setLoadingServices(true);
        try {
            const headers = getHeaders();
            if (!headers) throw new Error('Authentication failed');
            
            const params = new URLSearchParams({
                ...(search && { search })
            });
            
            const response = await axios.get(
                `${API_BASE_URL}/service/list?${params}`,
                { headers }
            );
            
            if (response.data?.success) {
                setServices(response.data.data || []);
            }
        } catch (error) {
            console.error('Error fetching services:', error);
        } finally {
            setLoadingServices(false);
        }
    };

    useEffect(() => {
        if (effectiveTaskId) {
            fetchSubtasks(1);
        } else {
            setError('Please select a task');
        }
    }, [effectiveTaskId, filters.type, filters.status, filters.search]);

    // Debounce service search
    useEffect(() => {
        const timer = setTimeout(() => {
            if (formData.type === 'service' && showServiceDropdown) {
                fetchServices(serviceSearch);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [serviceSearch, formData.type, showServiceDropdown]);

    const getStatusColor = (status) => {
        const normalizedStatus = normalizeStatus(status);
        const colorMap = {
            complete: 'text-green-600 border-green-200 bg-green-50',
            cancel: 'text-red-600 border-red-200 bg-red-50',
            pending: 'text-gray-600 border-gray-200 bg-gray-50'
        };
        return colorMap[normalizedStatus] || colorMap.pending;
    };

    const getTypeIcon = (type) => {
        return type === 'service'
            ? <FiPackage className="w-4 h-4" />
            : <FiType className="w-4 h-4" />;
    };

    // Create subtask - FIXED: Send as array in subtasks field
    const handleAdd = async () => {
        if (!effectiveTaskId) {
            toast.error('Task ID is missing');
            return;
        }

        // Validate form
        if (formData.type === 'text' && !formData.text.trim()) {
            toast.error('Please enter text content');
            return;
        }
        if (formData.type === 'service' && !formData.service_id) {
            toast.error('Please select a service');
            return;
        }

        setSubmitting(true);
        setError(null);
        
        try {
            const headers = getHeaders();
            if (!headers) throw new Error('Authentication failed');

            // Prepare the subtask object
            const subtaskItem = {
                type: formData.type,
                status: normalizeStatus(formData.status || 'pending')
            };

            // Add type-specific fields
            if (formData.type === 'text') {
                subtaskItem.text = formData.text.trim();
            } else {
                subtaskItem.service_id = formData.service_id;
            }

            // Create payload with array structure
            const payload = {
                task_id: effectiveTaskId,
                subtasks: [subtaskItem]  // Send as array with one item
            };

            const response = await axios.post(
                `${API_BASE_URL}/task/details/subtask/create`,
                payload,
                { headers }
            );

            if (response.data?.success) {
                resetForm();
                await fetchSubtasks(pagination.page_no);
                toast.success('Subtask created successfully.');
            } else {
                toast.error(response.data?.message || 'Failed to create subtask');
            }
        } catch (error) {
            console.error('Error creating subtask:', error);
            const errorMessage = error.response?.data?.message || 
                                error.response?.data?.error || 
                                error.message || 
                                'Failed to create subtask';
            toast.error(errorMessage);
        } finally {
            setSubmitting(false);
        }
    };

    // Update subtask — PUT /details/subtask/update (body: task_id, subtask_id, subtasks[0]; no status)
    const handleUpdate = async () => {
        if (!editingSubtask || !effectiveTaskId) return;

        if (formData.type === 'text' && !formData.text.trim()) {
            toast.error('Please enter text content');
            return;
        }
        if (formData.type === 'service' && !formData.service_id) {
            toast.error('Please select a service');
            return;
        }

        setSubmitting(true);
        try {
            const headers = getHeaders();
            if (!headers) throw new Error('Authentication failed');

            const subtaskItem = { type: formData.type };
            if (formData.type === 'text') {
                subtaskItem.text = formData.text.trim();
            } else {
                subtaskItem.service_id = formData.service_id;
            }

            const payload = {
                task_id: effectiveTaskId,
                subtask_id: editingSubtask.subtask_id,
                subtasks: [subtaskItem]
            };

            const response = await axios.put(
                `${API_BASE_URL}/task/details/subtask/update`,
                payload,
                { headers }
            );

            if (response.data?.success) {
                resetForm();
                await fetchSubtasks(pagination.page_no);
                toast.success('Subtask updated successfully.');
            } else {
                toast.error(response.data?.message || 'Failed to update subtask');
            }
        } catch (error) {
            console.error('Error updating subtask:', error);
            const errorMessage = error.response?.data?.message || 
                                error.response?.data?.error || 
                                error.message ||
                                'Failed to update subtask';
            toast.error(errorMessage);
        } finally {
            setSubmitting(false);
        }
    };

    const executeDelete = async (subtaskId) => {
        try {
            const headers = getHeaders();
            if (!headers) throw new Error('Authentication failed');

            const response = await axios.delete(
                `${API_BASE_URL}/task/details/subtask/delete/${subtaskId}`,
                {
                    headers,
                    data: { task_id: effectiveTaskId }
                }
            );

            if (response.data?.success) {
                await fetchSubtasks(pagination.page_no);
                toast.success('Subtask deleted successfully.');
            } else {
                toast.error(response.data?.message || 'Failed to delete subtask');
            }
        } catch (error) {
            console.error('Error deleting subtask:', error);
            const errorMessage = error.response?.data?.message ||
                error.response?.data?.error ||
                error.message ||
                'Failed to delete subtask';
            toast.error(errorMessage);
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = (subtaskId) => {
        if (!subtaskId) return;
        showConfirm(
            'Are you sure you want to delete this subtask? This cannot be undone.',
            () => executeDelete(subtaskId),
            'Delete subtask',
            'Delete'
        );
    };

    // Update status — PUT /details/subtask/status (body: task_id, subtask_id, status)
    const handleStatusChange = async (subtaskId, newStatus) => {
        try {
            const headers = getHeaders();
            if (!headers) throw new Error('Authentication failed');

            const statusNorm = normalizeStatus(newStatus);
            const response = await axios.put(
                `${API_BASE_URL}/task/details/subtask/status`,
                {
                    task_id: effectiveTaskId,
                    subtask_id: subtaskId,
                    status: statusNorm
                },
                { headers }
            );

            if (response.data?.success) {
                await fetchSubtasks(pagination.page_no);
                toast.success(response.data?.message || 'Status updated');
            } else {
                toast.error(response.data?.message || 'Failed to update status');
            }
        } catch (error) {
            console.error('Error updating status:', error);
            const errorMessage = error.response?.data?.message || 
                                error.response?.data?.error || 
                                error.message ||
                                'Failed to update status';
            toast.error(errorMessage);
        }
    };

    const resetForm = () => {
        setFormData({
            type: 'text',
            text: '',
            service_id: '',
            status: 'pending' // only used when creating; edit does not send status
        });
        setEditingSubtask(null);
        setShowModal(false);
        setServiceSearch('');
        setShowServiceDropdown(false);
        setError(null);
    };

    const openAddModal = () => {
        setEditingSubtask(null);
        setFormData({
            type: 'text',
            text: '',
            service_id: '',
            status: 'pending'
        });
        setServiceSearch('');
        setShowServiceDropdown(false);
        setShowModal(true);
    };

    const openEditModal = (subtask) => {
        setEditingSubtask(subtask);
        const rawType = subtask.type || 'text';
        const formType = rawType === 'service' ? 'service' : 'text';
        setFormData({
            type: formType,
            text: rawType === 'text' || rawType === 'task' ? (subtask.text || subtask.content || '') : '',
            service_id: rawType === 'service' ? subtask.service?.service_id || '' : ''
        });
        setShowModal(true);

        if (rawType === 'service' && subtask.service) {
            setServiceSearch(subtask.service.name);
        } else {
            setServiceSearch('');
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        try {
            return new Date(dateString).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (e) {
            return '-';
        }
    };

    const getCreatedByInfo = (subtask) => {
        const author = subtask.created_by || subtask.create_by;
        if (!author) return '-';
        return author.name || author.username || '-';
    };

    const isHiddenDetailKey = (key) => {
        if (!key) return true;
        const k = String(key).toLowerCase();
        if (['subtask_id', 'service_id', 'task_id', 'id', 'note_id', 'client_id', 'user_id'].includes(k)) return true;
        if (k.endsWith('_id')) return true;
        return false;
    };

    const humanizeKey = (key) =>
        String(key).replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

    const buildSubtaskDetailRows = (st) => {
        if (!st) return [];
        const rows = [];
        const typeLabel = st.type ? String(st.type).charAt(0).toUpperCase() + String(st.type).slice(1) : '-';
        rows.push({ label: 'Type', value: typeLabel });
        rows.push({ label: 'Status', value: normalizeStatus(st.status) });

        if (st.type === 'text' || st.type === 'task') {
            const content = st.text || st.content;
            if (content) rows.push({ label: 'Content', value: content });
        }
        if (st.type === 'task' && st.service?.name) {
            rows.push({ label: 'Service', value: st.service.name });
        }
        if (st.type === 'service' && st.service) {
            rows.push({ label: 'Service', value: st.service.name || '-' });
            if (st.service.category?.name) {
                rows.push({ label: 'Category', value: st.service.category.name });
            }
        }

        rows.push({ label: 'Created by', value: getCreatedByInfo(st) });
        const created =
            st.dates?.create_date || st.create_date || st.dates?.created_at;
        if (created) rows.push({ label: 'Created', value: formatDate(created) });

        if (st.dates && typeof st.dates === 'object') {
            Object.entries(st.dates).forEach(([k, v]) => {
                if (isHiddenDetailKey(k) || v == null || typeof v === 'object') return;
                if (k === 'create_date' || k === 'created_at') return;
                rows.push({ label: humanizeKey(k), value: formatDate(v) || String(v) });
            });
        }

        ['priority', 'remark', 'description', 'notes'].forEach((k) => {
            if (st[k] != null && String(st[k]).trim() !== '') {
                rows.push({ label: humanizeKey(k), value: String(st[k]) });
            }
        });

        const skip = new Set([
            'type', 'status', 'text', 'content', 'service', 'created_by', 'create_by',
            'dates', 'subtask_id', 'service_id', 'task_id'
        ]);
        Object.keys(st).forEach((key) => {
            if (skip.has(key) || isHiddenDetailKey(key)) return;
            const val = st[key];
            if (val != null && typeof val !== 'object' && typeof val !== 'function') {
                rows.push({ label: humanizeKey(key), value: String(val) });
            }
        });

        return rows;
    };

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= pagination.total_pages) {
            fetchSubtasks(newPage);
        }
    };

    const selectService = (service) => {
        setFormData(prev => ({ ...prev, service_id: service.service_id }));
        setServiceSearch(service.name);
        setShowServiceDropdown(false);
    };

    const getDisplayContent = (task) => {
        if (task.type === 'service') {
            return (
                <div className="font-medium text-gray-900">{task.service?.name || 'N/A'}</div>
            );
        }
        if (task.type === 'task') {
            const displayText = task.text || task.content || 'N/A';
            return (
                <div>
                    <div className="font-medium text-gray-900">{displayText}</div>
                    {task.service?.name && (
                        <div className="text-xs text-gray-500 mt-1">{task.service.name}</div>
                    )}
                </div>
            );
        }
        const displayText = task.text || task.content || 'N/A';
        return <div className="font-medium text-gray-900">{displayText}</div>;
    };

    const clearFilters = () => {
        setFilters({
            type: '',
            status: '',
            search: ''
        });
    };

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                    <h2 className="text-xl font-semibold text-gray-900">Sub Tasks</h2>
                    <p className="text-sm text-gray-500 mt-1">Total: {pagination.total} items</p>
                </div>
                
                {/* Filters and Add Button */}
                <div className="flex flex-wrap gap-2">
                    <div className="relative">
                        <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Search..."
                            value={filters.search}
                            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                            className="pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent w-40 outline-none transition-all duration-200"
                        />
                    </div>
                    <select
                        value={filters.type}
                        onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
                        className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200"
                    >
                        <option value="">All Types</option>
                        <option value="text">Text</option>
                        <option value="task">Task</option>
                        <option value="service">Service</option>
                    </select>
                    <select
                        value={filters.status}
                        onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                        className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200"
                    >
                        <option value="">All Status</option>
                        {statusOptions.map(option => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                    {(filters.search || filters.type || filters.status) && (
                        <button
                            onClick={clearFilters}
                            className="px-3 py-2 text-gray-600 hover:text-gray-900 border border-gray-200 rounded-xl text-sm hover:bg-gray-50 transition-colors"
                        >
                            Clear
                        </button>
                    )}
                    <motion.button
                        onClick={openAddModal}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors duration-200 font-medium shadow-sm hover:shadow"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        disabled={submitting}
                    >
                        <FiPlus className="w-4 h-4" />
                        Add Subtask
                    </motion.button>
                </div>
            </div>

            {/* Error Display */}
            {error && !loading && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
                    <FiAlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                    <p className="text-red-600 flex-1">{error}</p>
                    <button 
                        onClick={() => effectiveTaskId && fetchSubtasks(1)}
                        className="text-sm text-red-600 hover:text-red-700 font-medium"
                    >
                        Retry
                    </button>
                </div>
            )}

            {/* Table */}
            <div className="overflow-x-auto">
                {loading ? (
                    <div className="text-center py-12">
                        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 mb-4">
                            <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                        <p className="text-gray-600">Loading subtasks...</p>
                    </div>
                ) : (
                    <>
                        <table className="w-full text-sm text-left text-gray-700">
                            <thead className="bg-gray-50 text-gray-900">
                                <tr>
                                    <th className="px-4 py-3 font-semibold rounded-l-xl">#</th>
                                    <th className="px-4 py-3 font-semibold">TYPE</th>
                                    <th className="px-4 py-3 font-semibold">CONTENT / SERVICE</th>
                                    <th className="px-4 py-3 font-semibold">STATUS</th>
                                    <th className="px-4 py-3 font-semibold">CREATED BY</th>
                                    <th className="px-4 py-3 font-semibold">CREATED DATE</th>
                                    <th className="px-4 py-3 font-semibold rounded-r-xl">ACTIONS</th>
                                </tr>
                            </thead>
                            <tbody>
                                <AnimatePresence>
                                    {subtaskList.map((task, index) => (
                                        <motion.tr
                                            key={task.subtask_id}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            transition={{ delay: index * 0.05 }}
                                            className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                                        >
                                            <td className="px-4 py-3">
                                                {((pagination.page_no - 1) * pagination.limit) + index + 1}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <span className={`p-1.5 rounded-lg ${
                                                        task.type === 'service'
                                                            ? 'text-purple-600 bg-purple-50'
                                                            : 'text-blue-600 bg-blue-50'
                                                    }`}>
                                                        {getTypeIcon(task.type)}
                                                    </span>
                                                    <span className="capitalize font-medium">{task.type}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                {getDisplayContent(task)}
                                            </td>
                                            <td className="px-4 py-3">
                                                <select
                                                    value={normalizeStatus(task.status)}
                                                    onChange={(e) => handleStatusChange(task.subtask_id, e.target.value)}
                                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border focus:ring-2 focus:ring-blue-500 outline-none transition-all duration-200 ${getStatusColor(task.status)}`}
                                                >
                                                    {statusOptions.map(option => (
                                                        <option key={option.value} value={option.value}>
                                                            {option.label}
                                                        </option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center">
                                                        <FiUser className="w-3 h-3 text-indigo-600" />
                                                    </div>
                                                    <span className="text-sm">{getCreatedByInfo(task)}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-1 text-sm text-gray-600">
                                                    <FiCalendar className="w-3 h-3" />
                                                    {formatDate(task.dates?.create_date)}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <motion.button
                                                        type="button"
                                                        onClick={() => setDetailsSubtask(task)}
                                                        className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                                        whileHover={{ scale: 1.1 }}
                                                        whileTap={{ scale: 0.9 }}
                                                        title="Details"
                                                        disabled={submitting}
                                                    >
                                                        <FiInfo className="w-4 h-4" />
                                                    </motion.button>
                                                    <motion.button
                                                        type="button"
                                                        onClick={() => openEditModal(task)}
                                                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                        whileHover={{ scale: 1.1 }}
                                                        whileTap={{ scale: 0.9 }}
                                                        title="Edit"
                                                        disabled={submitting}
                                                    >
                                                        <FiEdit className="w-4 h-4" />
                                                    </motion.button>
                                                    <motion.button
                                                        type="button"
                                                        onClick={() => handleDelete(task.subtask_id)}
                                                        className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                        whileHover={{ scale: 1.1 }}
                                                        whileTap={{ scale: 0.9 }}
                                                        title="Delete"
                                                        disabled={submitting}
                                                    >
                                                        <FiTrash2 className="w-4 h-4" />
                                                    </motion.button>
                                                </div>
                                            </td>
                                        </motion.tr>
                                    ))}
                                </AnimatePresence>
                            </tbody>
                        </table>

                        {subtaskList.length === 0 && !loading && !error && (
                            <div className="text-center py-12">
                                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 mb-4">
                                    <FiCheckSquare className="w-5 h-5 text-gray-400" />
                                </div>
                                <p className="text-gray-600 mb-2">No subtasks found</p>
                                <button
                                    type="button"
                                    onClick={openAddModal}
                                    className="text-blue-600 hover:text-blue-700 font-medium"
                                >
                                    Add your first subtask
                                </button>
                            </div>
                        )}

                        {/* Pagination */}
                        {pagination.total_pages > 1 && (
                            <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
                                <p className="text-sm text-gray-600">
                                    Page {pagination.page_no} of {pagination.total_pages}
                                </p>
                                <div className="flex items-center gap-2">
                                    <motion.button
                                        onClick={() => handlePageChange(pagination.page_no - 1)}
                                        disabled={pagination.page_no === 1 || submitting}
                                        className={`p-2 rounded-lg transition-colors ${
                                            pagination.page_no === 1 
                                                ? 'text-gray-300 cursor-not-allowed' 
                                                : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                                        }`}
                                        whileHover={pagination.page_no !== 1 ? { scale: 1.05 } : {}}
                                        whileTap={pagination.page_no !== 1 ? { scale: 0.95 } : {}}
                                    >
                                        <FiChevronLeft className="w-4 h-4" />
                                    </motion.button>
                                    <motion.button
                                        onClick={() => handlePageChange(pagination.page_no + 1)}
                                        disabled={pagination.is_last_page || submitting}
                                        className={`p-2 rounded-lg transition-colors ${
                                            pagination.is_last_page 
                                                ? 'text-gray-300 cursor-not-allowed' 
                                                : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                                        }`}
                                        whileHover={!pagination.is_last_page ? { scale: 1.05 } : {}}
                                        whileTap={!pagination.is_last_page ? { scale: 0.95 } : {}}
                                    >
                                        <FiChevronRight className="w-4 h-4" />
                                    </motion.button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Add/Edit Subtask Modal */}
            <AnimatePresence>
                {showModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
                        onClick={(e) => e.target === e.currentTarget && !submitting && resetForm()}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
                        >
                            {/* Header */}
                            <div className={`px-6 py-4 border-b ${
                                formData.type === 'text' ? 'bg-blue-50' : 'bg-purple-50'
                            }`}>
                                <div className="flex items-center justify-between">
                                    <h3 className="text-lg font-semibold text-gray-900">
                                        {editingSubtask ? 'Edit Subtask' : 'Add New Subtask'}
                                    </h3>
                                    <button
                                        onClick={resetForm}
                                        disabled={submitting}
                                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
                                    >
                                        <FiX className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            {/* Content */}
                            <div className="p-6 space-y-4">
                                {/* Type Selection */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Type
                                    </label>
                                    <div className="flex gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setFormData(prev => ({ ...prev, type: 'text', service_id: '' }))}
                                            disabled={submitting}
                                            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border transition-all duration-200 ${
                                                formData.type === 'text'
                                                    ? 'border-blue-600 bg-blue-50 text-blue-600'
                                                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                                        >
                                            <FiType className="w-4 h-4" />
                                            <span>Text</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setFormData(prev => ({ ...prev, type: 'service', text: '' }))}
                                            disabled={submitting}
                                            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border transition-all duration-200 ${
                                                formData.type === 'service'
                                                    ? 'border-purple-600 bg-purple-50 text-purple-600'
                                                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                                        >
                                            <FiPackage className="w-4 h-4" />
                                            <span>Service</span>
                                        </button>
                                    </div>
                                </div>

                                {/* Content Input */}
                                {formData.type === 'text' ? (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Text Content
                                        </label>
                                        <textarea
                                            value={formData.text}
                                            onChange={(e) => setFormData(prev => ({ ...prev, text: e.target.value }))}
                                            rows={4}
                                            disabled={submitting}
                                            className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200 disabled:bg-gray-50 disabled:cursor-not-allowed resize-none"
                                            placeholder="Enter subtask description..."
                                        />
                                    </div>
                                ) : (
                                    <div className="relative">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Select Service
                                        </label>
                                        <div className="relative">
                                            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                            <input
                                                type="text"
                                                value={serviceSearch}
                                                onChange={(e) => {
                                                    setServiceSearch(e.target.value);
                                                    setShowServiceDropdown(true);
                                                }}
                                                onFocus={() => setShowServiceDropdown(true)}
                                                disabled={submitting}
                                                className="w-full pl-9 pr-10 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200 disabled:bg-gray-50 disabled:cursor-not-allowed"
                                                placeholder="Search services..."
                                            />
                                            <FiChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                        </div>

                                        {/* Services Dropdown */}
                                        <AnimatePresence>
                                            {showServiceDropdown && !submitting && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: -10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, y: -10 }}
                                                    className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto"
                                                >
                                                    {loadingServices ? (
                                                        <div className="p-4 text-center text-gray-500">
                                                            Loading services...
                                                        </div>
                                                    ) : services.length > 0 ? (
                                                        services.map(service => (
                                                            <button
                                                                key={service.service_id}
                                                                onClick={() => selectService(service)}
                                                                className="w-full text-left px-4 py-2 hover:bg-blue-50 focus:bg-blue-50 transition-colors"
                                                            >
                                                                <div className="font-medium text-gray-900">{service.name}</div>
                                                                {service.category && (
                                                                    <div className="text-xs text-gray-500">{service.category.name}</div>
                                                                )}
                                                            </button>
                                                        ))
                                                    ) : (
                                                        <div className="p-4 text-center text-gray-500">
                                                            No services found
                                                        </div>
                                                    )}
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                )}

                                {/* Status only on create; updates use the table status control + PUT .../subtask/status */}
                                {!editingSubtask && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Status
                                        </label>
                                        <select
                                            value={formData.status}
                                            onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                                            disabled={submitting}
                                            className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200 disabled:bg-gray-50 disabled:cursor-not-allowed"
                                        >
                                            {statusOptions.map(option => (
                                                <option key={option.value} value={option.value}>
                                                    {option.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>

                            {/* Footer */}
                            <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3">
                                <button
                                    onClick={resetForm}
                                    disabled={submitting}
                                    className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium transition-colors disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <motion.button
                                    onClick={editingSubtask ? handleUpdate : handleAdd}
                                    disabled={submitting}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center gap-2"
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    {submitting ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                            <span>{editingSubtask ? 'Updating...' : 'Creating...'}</span>
                                        </>
                                    ) : (
                                        <span>{editingSubtask ? 'Update' : 'Create'}</span>
                                    )}
                                </motion.button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Custom confirm (replaces window.confirm) */}
            <AnimatePresence>
                {blockingConfirm && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4"
                        onClick={(e) => !submitting && e.target === e.currentTarget && setBlockingConfirm(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="px-6 py-4 border-b border-gray-100">
                                <h3 className="text-lg font-semibold text-gray-900">{blockingConfirm.title}</h3>
                            </div>
                            <div className="px-6 py-4">
                                <p className="text-sm text-gray-600">{blockingConfirm.message}</p>
                            </div>
                            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
                                <button
                                    type="button"
                                    disabled={submitting}
                                    onClick={() => setBlockingConfirm(null)}
                                    className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg font-medium disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    disabled={submitting}
                                    onClick={async () => {
                                        const fn = blockingConfirm.onConfirm;
                                        setBlockingConfirm(null);
                                        if (typeof fn === 'function') await fn();
                                    }}
                                    className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 inline-flex items-center gap-2"
                                >
                                    {submitting && (
                                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    )}
                                    {blockingConfirm.confirmLabel}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Subtask details (no internal / backend IDs) */}
            <AnimatePresence>
                {detailsSubtask && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 flex items-center justify-center z-[55] p-4"
                        onClick={(e) => e.target === e.currentTarget && setDetailsSubtask(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex-shrink-0 px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                                <h3 className="text-lg font-semibold text-gray-900">Subtask details</h3>
                                <button
                                    type="button"
                                    onClick={() => setDetailsSubtask(null)}
                                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                                    aria-label="Close"
                                >
                                    <FiX className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4">
                                <dl className="space-y-3">
                                    {buildSubtaskDetailRows(detailsSubtask).map((row, idx) => (
                                        <div key={`${row.label}-${idx}`} className="border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                                            <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                                                {row.label}
                                            </dt>
                                            <dd className="text-sm text-gray-900 whitespace-pre-wrap break-words">
                                                {row.value}
                                            </dd>
                                        </div>
                                    ))}
                                </dl>
                            </div>
                            <div className="flex-shrink-0 px-6 py-4 border-t border-gray-100 flex justify-end">
                                <button
                                    type="button"
                                    onClick={() => setDetailsSubtask(null)}
                                    className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800"
                                >
                                    Close
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default SubtaskTab;