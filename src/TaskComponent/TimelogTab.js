import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DatePicker } from 'rsuite';
import 'rsuite/dist/rsuite.min.css';
import {
    FiClock,
    FiPlus,
    FiEdit,
    FiEye,
    FiX,
    FiLoader,
    FiAlertCircle,
    FiUser,
    FiCalendar,
    FiMoreVertical
} from 'react-icons/fi';
import axios from 'axios';
import getHeaders from '../utils/get-headers';
import API_BASE_URL from '../utils/api-controller';
import { TimelogTableSkeleton } from './taskTabSkeletons.jsx';

// Add custom styles for rsuite datepicker to fix z-index issue
const datePickerStyles = `
  .rs-picker-popup {
    z-index: 9999 !important;
  }
`;

const TimelogTab = ({ 
    taskId,
    task_id 
}) => {
    // Use either taskId or task_id
    const effectiveTaskId = taskId || task_id;
    
    console.log('TimelogTab initialized with taskId:', effectiveTaskId);

    const [timelogs, setTimelogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showViewModal, setShowViewModal] = useState(false);
    const [selectedTimelog, setSelectedTimelog] = useState(null);
    const [activeMenu, setActiveMenu] = useState(null);
    const menuRef = useRef(null);
    
    const [formData, setFormData] = useState({
        work_name: '',
        start_datetime: '',
        end_datetime: ''
    });
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [pagination, setPagination] = useState({
        page_no: 1,
        limit: 20,
        total: 0,
        total_pages: 1,
        is_last_page: true
    });

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setActiveMenu(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Fetch timelogs
    const fetchTimelogs = async (page = 1) => {
        if (!effectiveTaskId) {
            setError('Task ID is missing');
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
                limit: pagination.limit
            });

            console.log('Fetching timelogs from:', `${API_BASE_URL}/task/details/timelog/list?${params}`);

            const response = await axios.get(
                `${API_BASE_URL}/task/details/timelog/list?${params}`,
                { headers }
            );
            
            console.log('Timelogs response:', response.data);

            if (response.data?.success) {
                setTimelogs(response.data.data || []);
                setPagination(response.data.pagination || {
                    page_no: page,
                    limit: 20,
                    total: response.data.data?.length || 0,
                    total_pages: 1,
                    is_last_page: true
                });
            } else {
                setError(response.data?.message || 'Failed to fetch timelogs');
            }
        } catch (error) {
            console.error('Error fetching timelogs:', error);
            console.error('Error response:', error.response?.data);
            setError(error.response?.data?.message || error.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (effectiveTaskId) {
            fetchTimelogs(1);
        } else {
            setError('Please select a task');
        }
    }, [effectiveTaskId]);

    // Create timelog
    const handleCreateTimelog = async (e) => {
        e.preventDefault();
        
        if (!effectiveTaskId) {
            setError('Task ID is missing');
            return;
        }

        // Validate form
        if (!formData.work_name.trim()) {
            setError('Work name is required');
            return;
        }
        if (!formData.start_datetime) {
            setError('Start date & time is required');
            return;
        }
        if (!formData.end_datetime) {
            setError('End date & time is required');
            return;
        }

        // Validate dates
        if (new Date(formData.end_datetime) <= new Date(formData.start_datetime)) {
            setError('End date must be after start date');
            return;
        }

        setSubmitting(true);
        setError(null);
        
        try {
            const headers = getHeaders();
            if (!headers) throw new Error('Authentication failed');

            const payload = {
                task_id: effectiveTaskId,
                work_name: formData.work_name.trim(),
                start_datetime: formData.start_datetime,
                end_datetime: formData.end_datetime
            };

            console.log('Creating timelog with payload:', JSON.stringify(payload, null, 2));
            console.log('API URL:', `${API_BASE_URL}/task/details/timelog/create`);

            const response = await axios.post(
                `${API_BASE_URL}/task/details/timelog/create`,
                payload,
                { headers }
            );

            console.log('Create response:', response.data);

            if (response.data?.success) {
                resetForm();
                await fetchTimelogs(pagination.page_no);
                setShowCreateModal(false);
            } else {
                setError(response.data?.message || 'Failed to create timelog');
            }
        } catch (error) {
            console.error('Error creating timelog:', error);
            console.error('Error response:', error.response?.data);
            
            const errorMessage = error.response?.data?.message || 
                                error.response?.data?.error || 
                                error.message || 
                                'Failed to create timelog';
            setError(errorMessage);
        } finally {
            setSubmitting(false);
        }
    };

    // Edit timelog - Fixed version with correct API endpoint and payload
    const handleEditTimelog = async (e) => {
        e.preventDefault();
        
        if (!selectedTimelog || !selectedTimelog.timelog_id) {
            setError('Timelog ID is missing');
            return;
        }

        // Validate form
        if (!formData.work_name.trim()) {
            setError('Work name is required');
            return;
        }
        if (!formData.start_datetime) {
            setError('Start date & time is required');
            return;
        }
        if (!formData.end_datetime) {
            setError('End date & time is required');
            return;
        }

        // Validate dates
        if (new Date(formData.end_datetime) <= new Date(formData.start_datetime)) {
            setError('End date must be after start date');
            return;
        }

        setSubmitting(true);
        setError(null);
        
        try {
            const headers = getHeaders();
            if (!headers) throw new Error('Authentication failed');

            // Build payload with all fields (API expects all fields)
            const payload = {
                task_id: effectiveTaskId,
                work_name: formData.work_name.trim(),
                start_datetime: formData.start_datetime,
                end_datetime: formData.end_datetime
            };

            console.log('Editing timelog with payload:', JSON.stringify(payload, null, 2));
            console.log('API URL:', `${API_BASE_URL}/task/details/timelog/edit/${selectedTimelog.timelog_id}`);

            const response = await axios.put(
                `${API_BASE_URL}/task/details/timelog/edit/${selectedTimelog.timelog_id}`,
                payload,
                { headers }
            );

            console.log('Edit response:', response.data);

            if (response.data?.success) {
                resetForm();
                await fetchTimelogs(pagination.page_no);
                setShowEditModal(false);
                setSelectedTimelog(null);
                setActiveMenu(null);
            } else {
                setError(response.data?.message || 'Failed to update timelog');
            }
        } catch (error) {
            console.error('Error updating timelog:', error);
            console.error('Error response:', error.response?.data);
            
            const errorMessage = error.response?.data?.message || 
                                error.response?.data?.error || 
                                error.message || 
                                'Failed to update timelog';
            setError(errorMessage);
        } finally {
            setSubmitting(false);
        }
    };

    const resetForm = () => {
        setFormData({
            work_name: '',
            start_datetime: '',
            end_datetime: ''
        });
        setError(null);
    };

    const handleModalClose = () => {
        setShowCreateModal(false);
        setShowEditModal(false);
        setSelectedTimelog(null);
        resetForm();
    };

    const openEditModal = (timelog) => {
        setSelectedTimelog(timelog);
        setFormData({
            work_name: timelog.work_name || '',
            start_datetime: timelog.start_datetime || '',
            end_datetime: timelog.end_datetime || ''
        });
        setShowEditModal(true);
        setActiveMenu(null);
    };

    const openViewModal = (timelog) => {
        setSelectedTimelog(timelog);
        setShowViewModal(true);
        setActiveMenu(null);
    };

    const formatDateOnly = (dateString) => {
        if (!dateString) return 'N/A';
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-GB', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            }).split('/').join('/');
        } catch {
            return 'Invalid Date';
        }
    };

    const formatDateTimeForDisplay = (dateString) => {
        if (!dateString) return 'N/A';
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-GB', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            }) + ' ' + date.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            });
        } catch {
            return 'Invalid Date';
        }
    };

    const formatDateTime = (dateString) => {
        if (!dateString) return 'N/A';
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-GB', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            }) + ' ' + date.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            });
        } catch {
            return 'Invalid Date';
        }
    };

    const getCreatedByName = (timelog) => {
        if (timelog.create_by?.name) return timelog.create_by.name;
        if (timelog.staff?.profile?.name) return timelog.staff.profile.name;
        return 'N/A';
    };

    const getTotalTimeSpent = (timelog) => {
        return timelog.total_time_spent || 'N/A';
    };

    return (
        <>
            {/* Add custom styles for datepicker */}
            <style>{datePickerStyles}</style>
            
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900">Time Logs</h2>
                        <p className="text-sm text-gray-500 mt-1">Total: {pagination.total} entries</p>
                    </div>
                    
                    <motion.button
                        onClick={() => setShowCreateModal(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors duration-200 font-medium shadow-sm hover:shadow"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        disabled={submitting}
                    >
                        <FiPlus className="w-4 h-4" />
                        Add Time Log
                    </motion.button>
                </div>

                {/* Error Display */}
                {error && !loading && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
                        <FiAlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                        <p className="text-red-600 flex-1">{error}</p>
                        <button 
                            onClick={() => effectiveTaskId && fetchTimelogs(1)}
                            className="text-sm text-red-600 hover:text-red-700 font-medium"
                        >
                            Retry
                        </button>
                    </div>
                )}

                {/* Timelogs Table */}
                <div className="overflow-x-auto">
                    {loading ? (
                        <TimelogTableSkeleton rowCount={6} />
                    ) : (
                        <>
                            <table className="w-full text-sm text-left text-gray-700">
                                <thead className="bg-gray-50 text-gray-900">
                                    <tr>
                                        <th className="px-4 py-3 font-semibold rounded-l-xl">#</th>
                                        <th className="px-4 py-3 font-semibold">CREATE</th>
                                        <th className="px-4 py-3 font-semibold">NAME</th>
                                        <th className="px-4 py-3 font-semibold">USER</th>
                                        <th className="px-4 py-3 font-semibold">TIMESTAMP</th>
                                        <th className="px-4 py-3 font-semibold">SPENT</th>
                                        <th className="px-4 py-3 font-semibold rounded-r-xl">ACTION</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <AnimatePresence>
                                        {timelogs.map((log, index) => (
                                            <motion.tr
                                                key={log.id || log.timelog_id || index}
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
                                                    <div className="flex items-center gap-1 text-sm">
                                                        <FiCalendar className="w-3 h-3 text-gray-400" />
                                                        {formatDateOnly(log.create_date)}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 font-medium text-gray-900">
                                                    {log.work_name || 'N/A'}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center">
                                                            <FiUser className="w-3 h-3 text-purple-600" />
                                                        </div>
                                                        <span className="text-sm">{getCreatedByName(log)}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="text-sm">
                                                        <div>{formatDateTimeForDisplay(log.start_datetime)}</div>
                                                        <div className="text-gray-500">to</div>
                                                        <div>{formatDateTimeForDisplay(log.end_datetime)}</div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-sm font-medium text-purple-600">
                                                    {getTotalTimeSpent(log)}
                                                </td>
                                                <td className="px-4 py-3 relative">
                                                    <div className="flex items-center justify-center">
                                                        <motion.button
                                                            onClick={() => setActiveMenu(activeMenu === log.timelog_id ? null : log.timelog_id)}
                                                            className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                                            whileHover={{ scale: 1.1 }}
                                                            whileTap={{ scale: 0.9 }}
                                                        >
                                                            <FiMoreVertical className="w-4 h-4" />
                                                        </motion.button>
                                                        
                                                        {/* Dropdown Menu */}
                                                        {activeMenu === log.timelog_id && (
                                                            <div 
                                                                ref={menuRef}
                                                                className="absolute right-0 top-10 mt-1 w-32 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10"
                                                            >
                                                                <button
                                                                    onClick={() => openViewModal(log)}
                                                                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                                                >
                                                                    <FiEye className="w-3.5 h-3.5" />
                                                                    View
                                                                </button>
                                                                <button
                                                                    onClick={() => openEditModal(log)}
                                                                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                                                >
                                                                    <FiEdit className="w-3.5 h-3.5" />
                                                                    Edit
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                            </motion.tr>
                                        ))}
                                    </AnimatePresence>
                                </tbody>
                            </table>

                            {timelogs.length === 0 && !loading && !error && (
                                <div className="text-center py-12">
                                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 mb-4">
                                        <FiClock className="w-5 h-5 text-gray-400" />
                                    </div>
                                    <p className="text-gray-600 mb-2">No time logs found</p>
                                    <button
                                        onClick={() => setShowCreateModal(true)}
                                        className="text-purple-600 hover:text-purple-700 font-medium"
                                    >
                                        Add your first time log
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Create Timelog Modal */}
                <AnimatePresence>
                    {showCreateModal && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
                            onClick={(e) => e.target === e.currentTarget && !submitting && handleModalClose()}
                        >
                            <motion.div
                                initial={{ scale: 0.95, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.95, opacity: 0 }}
                                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                                className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
                            >
                                {/* Header */}
                                <div className="px-6 py-4 border-b bg-purple-50">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-lg font-semibold text-gray-900">
                                            Add Time Log
                                        </h3>
                                        <button
                                            onClick={handleModalClose}
                                            disabled={submitting}
                                            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
                                        >
                                            <FiX className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>

                                {/* Form */}
                                <form onSubmit={handleCreateTimelog} className="p-6 space-y-4">
                                    {/* Form Error */}
                                    {error && (
                                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm">
                                            <FiAlertCircle className="w-4 h-4 flex-shrink-0" />
                                            <span>{error}</span>
                                        </div>
                                    )}

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Work Name *
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            value={formData.work_name}
                                            onChange={(e) => setFormData({...formData, work_name: e.target.value})}
                                            className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all duration-200 disabled:bg-gray-50 disabled:cursor-not-allowed"
                                            placeholder="Enter work name"
                                            disabled={submitting}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Start Date & Time *
                                        </label>
                                        <DatePicker
                                            format="yyyy-MM-dd HH:mm:ss"
                                            value={formData.start_datetime ? new Date(formData.start_datetime) : null}
                                            onChange={(date) => setFormData({
                                                ...formData, 
                                                start_datetime: date ? date.toISOString().slice(0, 19).replace('T', ' ') : ''
                                            })}
                                            placeholder="Select start date & time"
                                            style={{ width: '100%' }}
                                            showMeridian
                                            block
                                            disabled={submitting}
                                            placement="autoVertical"
                                            container={() => document.body}
                                            className="rs-picker-date"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            End Date & Time *
                                        </label>
                                        <DatePicker
                                            format="yyyy-MM-dd HH:mm:ss"
                                            value={formData.end_datetime ? new Date(formData.end_datetime) : null}
                                            onChange={(date) => setFormData({
                                                ...formData, 
                                                end_datetime: date ? date.toISOString().slice(0, 19).replace('T', ' ') : ''
                                            })}
                                            placeholder="Select end date & time"
                                            style={{ width: '100%' }}
                                            showMeridian
                                            block
                                            disabled={submitting}
                                            placement="autoVertical"
                                            container={() => document.body}
                                            className="rs-picker-date"
                                        />
                                    </div>

                                    {/* Footer */}
                                    <div className="flex justify-end gap-3 pt-4">
                                        <button
                                            type="button"
                                            onClick={handleModalClose}
                                            disabled={submitting}
                                            className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium transition-colors disabled:opacity-50"
                                        >
                                            Cancel
                                        </button>
                                        <motion.button
                                            type="submit"
                                            disabled={submitting}
                                            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center gap-2"
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                        >
                                            {submitting ? (
                                                <>
                                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                    <span>Creating...</span>
                                                </>
                                            ) : (
                                                <span>Create Timelog</span>
                                            )}
                                        </motion.button>
                                    </div>
                                </form>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Edit Timelog Modal */}
                <AnimatePresence>
                    {showEditModal && selectedTimelog && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
                            onClick={(e) => e.target === e.currentTarget && !submitting && handleModalClose()}
                        >
                            <motion.div
                                initial={{ scale: 0.95, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.95, opacity: 0 }}
                                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                                className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
                            >
                                {/* Header */}
                                <div className="px-6 py-4 border-b bg-purple-50">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-lg font-semibold text-gray-900">
                                            Edit Time Log
                                        </h3>
                                        <button
                                            onClick={handleModalClose}
                                            disabled={submitting}
                                            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
                                        >
                                            <FiX className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>

                                {/* Form */}
                                <form onSubmit={handleEditTimelog} className="p-6 space-y-4">
                                    {/* Form Error */}
                                    {error && (
                                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm">
                                            <FiAlertCircle className="w-4 h-4 flex-shrink-0" />
                                            <span>{error}</span>
                                        </div>
                                    )}

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Work Name *
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            value={formData.work_name}
                                            onChange={(e) => setFormData({...formData, work_name: e.target.value})}
                                            className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all duration-200 disabled:bg-gray-50 disabled:cursor-not-allowed"
                                            placeholder="Enter work name"
                                            disabled={submitting}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Start Date & Time *
                                        </label>
                                        <DatePicker
                                            format="yyyy-MM-dd HH:mm:ss"
                                            value={formData.start_datetime ? new Date(formData.start_datetime) : null}
                                            onChange={(date) => setFormData({
                                                ...formData, 
                                                start_datetime: date ? date.toISOString().slice(0, 19).replace('T', ' ') : ''
                                            })}
                                            placeholder="Select start date & time"
                                            style={{ width: '100%' }}
                                            showMeridian
                                            block
                                            disabled={submitting}
                                            placement="autoVertical"
                                            container={() => document.body}
                                            className="rs-picker-date"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            End Date & Time *
                                        </label>
                                        <DatePicker
                                            format="yyyy-MM-dd HH:mm:ss"
                                            value={formData.end_datetime ? new Date(formData.end_datetime) : null}
                                            onChange={(date) => setFormData({
                                                ...formData, 
                                                end_datetime: date ? date.toISOString().slice(0, 19).replace('T', ' ') : ''
                                            })}
                                            placeholder="Select end date & time"
                                            style={{ width: '100%' }}
                                            showMeridian
                                            block
                                            disabled={submitting}
                                            placement="autoVertical"
                                            container={() => document.body}
                                            className="rs-picker-date"
                                        />
                                    </div>

                                    {/* Footer */}
                                    <div className="flex justify-end gap-3 pt-4">
                                        <button
                                            type="button"
                                            onClick={handleModalClose}
                                            disabled={submitting}
                                            className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium transition-colors disabled:opacity-50"
                                        >
                                            Cancel
                                        </button>
                                        <motion.button
                                            type="submit"
                                            disabled={submitting}
                                            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center gap-2"
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                        >
                                            {submitting ? (
                                                <>
                                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                    <span>Updating...</span>
                                                </>
                                            ) : (
                                                <span>Update Timelog</span>
                                            )}
                                        </motion.button>
                                    </div>
                                </form>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* View Timelog Modal */}
                <AnimatePresence>
                    {showViewModal && selectedTimelog && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
                            onClick={() => setShowViewModal(false)}
                        >
                            <motion.div
                                initial={{ scale: 0.95, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.95, opacity: 0 }}
                                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                                className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden"
                                onClick={e => e.stopPropagation()}
                            >
                                <div className="px-6 py-4 border-b bg-purple-50">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-lg font-semibold text-gray-900">Time Log Details</h3>
                                        <button
                                            onClick={() => setShowViewModal(false)}
                                            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
                                        >
                                            <FiX className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>

                                <div className="p-6 space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-sm text-gray-500">Work Name</label>
                                            <p className="font-medium text-gray-900">{selectedTimelog.work_name || 'N/A'}</p>
                                        </div>
                                        <div>
                                            <label className="text-sm text-gray-500">Created By</label>
                                            <p className="font-medium text-gray-900">{getCreatedByName(selectedTimelog)}</p>
                                        </div>
                                        <div>
                                            <label className="text-sm text-gray-500">Start Date & Time</label>
                                            <p className="font-medium text-gray-900">
                                                {formatDateTime(selectedTimelog.start_datetime)}
                                            </p>
                                        </div>
                                        <div>
                                            <label className="text-sm text-gray-500">End Date & Time</label>
                                            <p className="font-medium text-gray-900">
                                                {formatDateTime(selectedTimelog.end_datetime)}
                                            </p>
                                        </div>
                                        <div>
                                            <label className="text-sm text-gray-500">Time Spent</label>
                                            <p className="font-medium text-purple-600">
                                                {getTotalTimeSpent(selectedTimelog)}
                                            </p>
                                        </div>
                                        <div>
                                            <label className="text-sm text-gray-500">Created At</label>
                                            <p className="font-medium text-gray-900">
                                                {formatDateTime(selectedTimelog.create_date)}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-end p-6 border-t border-gray-100 bg-gray-50">
                                    <button
                                        onClick={() => setShowViewModal(false)}
                                        className="px-4 py-2 bg-white text-gray-700 rounded-lg hover:bg-gray-50 transition-colors border border-gray-200"
                                    >
                                        Close
                                    </button>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </>
    );
};

export default TimelogTab;