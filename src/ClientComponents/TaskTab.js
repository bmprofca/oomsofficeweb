import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import axios from 'axios';
import { checkPermissionSync } from '../utils/permission-helper';
import {
    FiPlus, FiCheckCircle, FiClock, FiTarget,
    FiEdit, FiEye, FiTrash2, FiArrowLeft, FiX, FiXCircle,
} from 'react-icons/fi';
import TaskTable from '../TaskComponent/TaskTable';
import MultiSelectInput from '../components/MultiSelectInput';
import SelectInput from '../components/SelectInput';
import TablePagination from '../components/TablePagination';
import TaskStatusChange from '../components/Modals/TaskStatusChange';
import CreateTask from '../components/Modals/CreateTask';
import getHeaders from '../utils/get-headers';
import API_BASE_URL from '../utils/api-controller';

/** Matches `task-display.js` status filter options */
const STATUS_OPTIONS = [
    { value: 'in process', name: 'In Process' },
    { value: 'pending from client', name: 'Pending from Client' },
    { value: 'pending from department', name: 'Pending from Department' },
    { value: 'complete', name: 'Complete' },
    { value: 'cancel', name: 'Cancel' },
];

/** Column layout aligned with task-display but without Client (single-client tab) */
const TASK_TAB_COLUMN_CONFIG = [
    {
        id: '1',
        name: 'Task Details',
        items: [
            { id: 'service_name', label: 'Service Name' },
            { id: 'fees', label: 'Fees' },
            { id: 'firm_name', label: 'Firm Name' },
        ],
        fixed: false,
    },
    {
        id: '2',
        name: 'Dates',
        items: [
            { id: 'create_date', label: 'Create Date' },
            { id: 'due_date', label: 'Due Date' },
            { id: 'target_date', label: 'Target Date' },
        ],
        fixed: false,
    },
    {
        id: '3',
        name: 'Staffs',
        items: [{ id: 'staffs', label: 'Staffs' }],
        fixed: false,
    },
    {
        id: '4',
        name: 'Status',
        items: [{ id: 'status', label: 'Status' }],
        fixed: true,
    },
    {
        id: '5',
        name: 'Action',
        items: [{ id: 'menu', label: 'Actions' }],
        fixed: true,
    },
];

const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB');
};

const getDaysLeft = (dueDate) => {
    if (!dueDate) return null;
    const due = new Date(dueDate);
    const today = new Date();
    const diffTime = due - today;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

const getStatusStyle = (status) => {
    switch (status) {
        case 'unassign': return 'bg-blue-50 text-blue-700 border-blue-200';
        case 'in process': return 'bg-orange-50 text-orange-700 border-orange-200';
        case 'pending from client': return 'bg-purple-50 text-purple-700 border-purple-200';
        case 'pending from department': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
        case 'complete': return 'bg-green-50 text-green-700 border-green-200';
        case 'cancel': return 'bg-red-50 text-red-700 border-red-200';
        default: return 'bg-gray-50 text-slate-700 border-gray-200';
    }
};

const getStatusText = (status) => {
    switch (status) {
        case 'unassign': return 'Unassign';
        case 'in process': return 'In Process';
        case 'pending from client': return 'Client Pnd';
        case 'pending from department': return 'Dept Pnd';
        case 'complete': return 'Complete';
        case 'cancel': return 'Cancel';
        default: return status || '-';
    }
};

const SEARCH_DEBOUNCE_MS = 400;

const TaskTab = ({ clientUsername: clientUsernameProp } = {}) => {
    const navigate = useNavigate();
    const taskListAbortRef = useRef(null);

    const [tasks, setTasks] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    /** Same pattern as `task-display` filters.status — empty array = all (`treatEmptyAsAll`) */
    const [statusFilterValues, setStatusFilterValues] = useState([]);
    const [selectedFirmId, setSelectedFirmId] = useState(null);
    const [firmOptions, setFirmOptions] = useState([]);
    const [pagination, setPagination] = useState({ page_no: 1, limit: 20, total: 0 });

    const [statusModal, setStatusModal] = useState({
        open: false,
        taskId: null,
        taskName: '',
        currentStatus: '',
    });

    const [selectedTasks, setSelectedTasks] = useState(new Set());
    const [selectAll, setSelectAll] = useState(false);
    const [activeRowDropdown, setActiveRowDropdown] = useState(null);
    const [loading, setLoading] = useState(false);
    const [taskStatistics, setTaskStatistics] = useState({
        total: 0,
        complete: 0,
        cancel: 0,
        inProcess: 0,
    });
    const [createTaskModalOpen, setCreateTaskModalOpen] = useState(false);

    const clientUsernameTrimmed =
        clientUsernameProp != null && String(clientUsernameProp).trim() !== ''
            ? String(clientUsernameProp).trim()
            : '';

    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(searchTerm), SEARCH_DEBOUNCE_MS);
        return () => clearTimeout(t);
    }, [searchTerm]);

    useEffect(() => {
        setPagination((prev) => (prev.page_no !== 1 ? { ...prev, page_no: 1 } : prev));
        setSelectedTasks(new Set());
        setSelectAll(false);
    }, [debouncedSearch, statusFilterValues, selectedFirmId]);

    useEffect(() => {
        if (!clientUsernameTrimmed) {
            setFirmOptions([]);
            return;
        }
        const headers = getHeaders();
        if (!headers) return;

        let cancelled = false;
        (async () => {
            try {
                const response = await axios.get(
                    `${API_BASE_URL}/client/details/firms/list?username=${encodeURIComponent(clientUsernameTrimmed)}`,
                    { headers }
                );
                if (cancelled || !response.data?.success) return;
                const firmsData = response.data.data?.firms || [];
                setFirmOptions(
                    firmsData.map((f) => ({
                        value: f.firm_id,
                        label: f.firm_name || f.name || String(f.firm_id),
                    }))
                );
            } catch (e) {
                if (!cancelled) console.error('Error fetching firms:', e);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [clientUsernameTrimmed]);

    const fetchTaskStatistics = useCallback(async () => {
        if (!clientUsernameTrimmed) {
            setTaskStatistics({ total: 0, complete: 0, cancel: 0, inProcess: 0 });
            return;
        }
        const headers = getHeaders();
        if (!headers) return;

        try {
            const response = await fetch(
                `${API_BASE_URL}/client/details/tasks/statistics?username=${encodeURIComponent(clientUsernameTrimmed)}`,
                { method: 'GET', headers }
            );
            if (!response.ok) throw new Error('Failed to fetch task statistics');

            const responseData = await response.json();
            if (responseData.success && responseData.data) {
                const d = responseData.data;
                const inProcess =
                    Number(d.in_process ?? 0) +
                    Number(d.pending_from_department ?? 0) +
                    Number(d.pending_from_client ?? 0);
                setTaskStatistics({
                    total: Number(d.total ?? 0),
                    complete: Number(d.complete ?? 0),
                    cancel: Number(d.cancel ?? 0),
                    inProcess,
                });
            }
        } catch (error) {
            console.error('Error fetching task statistics:', error);
        }
    }, [clientUsernameTrimmed]);

    useEffect(() => {
        fetchTaskStatistics();
    }, [fetchTaskStatistics]);

    const fetchTasks = useCallback(async () => {
        if (!clientUsernameTrimmed) {
            setTasks([]);
            setPagination((prev) => ({ ...prev, total: 0 }));
            setLoading(false);
            return;
        }

        if (taskListAbortRef.current) {
            taskListAbortRef.current.abort();
        }
        const controller = new AbortController();
        taskListAbortRef.current = controller;
        setLoading(true);

        try {
            const headers = getHeaders();
            if (!headers) {
                setTasks([]);
                setLoading(false);
                return;
            }

            const queryParams = new URLSearchParams({
                page_no: String(pagination.page_no),
                limit: String(pagination.limit),
            });
            queryParams.append('search', debouncedSearch || '');
            queryParams.append('username', clientUsernameTrimmed);
            queryParams.append('firm_id', selectedFirmId || '');
            queryParams.append('service_id', '');
            statusFilterValues.forEach((status) => queryParams.append('status', status));

            const response = await fetch(`${API_BASE_URL}/task/list?${queryParams.toString()}`, {
                method: 'GET',
                headers,
                signal: controller.signal,
            });

            if (!response.ok) throw new Error('Failed to fetch tasks');

            const responseData = await response.json();
            if (responseData.success && responseData.data && Array.isArray(responseData.data)) {
                setTasks(responseData.data);
                setPagination((prev) => ({
                    ...prev,
                    total:
                        responseData.pagination?.total ??
                        responseData.meta?.total ??
                        responseData.data.length,
                }));
            } else {
                setTasks([]);
            }
        } catch (error) {
            if (error.name === 'AbortError') return;
            console.error('Error fetching tasks:', error);
            setTasks([]);
        } finally {
            if (taskListAbortRef.current === controller) {
                setLoading(false);
            }
        }
    }, [
        clientUsernameTrimmed,
        pagination.page_no,
        pagination.limit,
        debouncedSearch,
        statusFilterValues,
        selectedFirmId,
    ]);

    useEffect(() => {
        fetchTasks();
    }, [fetchTasks]);

    const handleTaskSelect = useCallback((taskId) => {
        setSelectedTasks((prev) => {
            const next = new Set(prev);
            if (next.has(taskId)) next.delete(taskId);
            else next.add(taskId);
            return next;
        });
        setSelectAll(false);
    }, []);

    const handleSelectAll = useCallback(() => {
        if (selectAll) {
            setSelectedTasks(new Set());
        } else {
            setSelectedTasks(new Set(tasks.map((x) => x.task_id)));
        }
        setSelectAll(!selectAll);
    }, [selectAll, tasks]);

    const toggleRowDropdown = useCallback((taskId) => {
        setActiveRowDropdown((prev) => (prev === taskId ? null : taskId));
    }, []);

    const handleGetInOut = useCallback((taskId, action) => {
        console.log('[TaskTab] GET', action, taskId);
        setActiveRowDropdown(null);
    }, []);

    const openStatusModal = useCallback((taskId, currentStatus, taskName = '') => {
        setStatusModal({
            open: true,
            taskId,
            currentStatus,
            taskName,
        });
        setActiveRowDropdown(null);
    }, []);

    const closeStatusModal = useCallback(() => {
        setStatusModal({
            open: false,
            taskId: null,
            taskName: '',
            currentStatus: '',
        });
    }, []);

    const handleStatusChange = useCallback(
        async (taskId, newStatus) => {
            try {
                const headers = getHeaders();
                if (!headers) {
                    toast.error('Missing authentication');
                    return;
                }
                const response = await fetch(`${API_BASE_URL}/task/change-status`, {
                    method: 'PUT',
                    headers: { ...headers, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ task_ids: [taskId], status: newStatus }),
                });
                if (!response.ok) throw new Error('Failed to update status');
                const responseData = await response.json();
                if (responseData.success) {
                    toast.success(responseData.message || 'Task status updated successfully');
                    fetchTasks();
                    fetchTaskStatistics();
                } else {
                    throw new Error(responseData.message || 'Failed to update status');
                }
            } catch (error) {
                console.error('Error updating task status:', error);
                toast.error(error.message || 'Failed to update status');
            }
        },
        [fetchTasks, fetchTaskStatistics]
    );

    const openUsersModal = useCallback((staffs, taskName) => {
        console.log('[TaskTab] Staff modal', taskName, staffs?.length);
        setActiveRowDropdown(null);
    }, []);

    const openClientDetailsModal = useCallback(() => {
        setActiveRowDropdown(null);
    }, []);

    const handleEditTask = useCallback((task) => {
        console.log('[TaskTab] Edit', task?.task_id);
        setActiveRowDropdown(null);
    }, []);

    const renderCellContent = useCallback(
        (task, fieldId, hGetInOut, nav, openStat, openUsers, openClient, editTask, setActiveDrop, activeDrop, toggleDrop) => {
            const daysLeft = getDaysLeft(task.dates?.due_date);
            const isOverdue = daysLeft != null && daysLeft < 0;
            const taskUsername = task.client?.username;
            const taskUsernameQuery =
                taskUsername != null && String(taskUsername).trim() !== ''
                    ? `?username=${encodeURIComponent(String(taskUsername).trim())}`
                    : '';

            const safeGetString = (value, fallback = '-') => {
                if (!value) return fallback;
                if (typeof value === 'string') return value;
                if (typeof value === 'object') {
                    return value.mobile || value.email || value.name || value.number || value.address || JSON.stringify(value);
                }
                return String(value);
            };

            switch (fieldId) {
                case 'firm_name': {
                    const firmName = task.firm?.firm_name || task.firm_name || '-';
                    return <div className="text-slate-700 font-medium text-sm">{safeGetString(firmName)}</div>;
                }
                case 'service_name': {
                    const serviceName = task.service?.name || task.service_name || '-';
                    return (
                        <button
                            type="button"
                            onClick={() => nav(`/task/${task.task_id}${taskUsernameQuery}`)}
                            className="font-semibold text-slate-800 text-sm hover:text-indigo-600 transition-colors text-left"
                        >
                            {safeGetString(serviceName)}
                        </button>
                    );
                }
                case 'fees': {
                    const feesAmount = task.charges?.fees || task.fees || 0;
                    return (
                        <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 ${!checkPermissionSync('task_fees_view') ? 'blur-[3.5px] select-none' : ''}`}>
                            ₹{Number(feesAmount).toLocaleString()}
                        </div>
                    );
                }
                case 'due_date':
                    return (
                        <div className="flex flex-col items-start gap-1">
                            <div className="text-slate-700 font-medium text-sm">
                                {task.dates?.due_date ? formatDate(task.dates.due_date) : '-'}
                            </div>
                            {task.dates?.due_date && daysLeft != null && (
                                <span className={`text-xs font-bold ${isOverdue ? 'text-red-600' : daysLeft <= 7 ? 'text-orange-600' : 'text-green-600'}`}>
                                    {isOverdue
                                        ? `Overdue by ${Math.abs(daysLeft)} day${Math.abs(daysLeft) > 1 ? 's' : ''}`
                                        : `Due in ${daysLeft} day${daysLeft > 1 ? 's' : ''}`}
                                </span>
                            )}
                        </div>
                    );
                case 'create_date':
                    return (
                        <div className="text-slate-700 font-medium text-sm">
                            {task.dates?.create_date ? formatDate(task.dates.create_date) : '-'}
                        </div>
                    );
                case 'target_date':
                    return (
                        <div className="text-slate-700 font-medium text-sm">
                            {task.dates?.target_date ? formatDate(task.dates.target_date) : '-'}
                        </div>
                    );
                case 'staffs': {
                    const rawStaffs = task.staffs;
                    const staffs = Array.isArray(rawStaffs)
                        ? rawStaffs
                        : rawStaffs != null
                            ? [rawStaffs]
                            : [];
                    if (staffs.length === 0) {
                        return <span className="text-slate-400 text-sm">-</span>;
                    }
                    const staffDisplayName = (s) =>
                        safeGetString(s?.name || s?.profile?.name || 'S');

                    if (staffs.length === 1) {
                        const staffName = staffDisplayName(staffs[0]);
                        return (
                            <button
                                type="button"
                                onClick={() => openUsers(staffs, task.service?.name)}
                                className="flex items-center justify-start cursor-pointer hover:opacity-80 transition-opacity"
                                title={`Click to view ${staffName}'s details`}
                            >
                                <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-full border-2 border-white flex items-center justify-center text-xs font-bold text-white">
                                    {staffName.charAt(0)}
                                </div>
                            </button>
                        );
                    }
                    if (staffs.length === 2) {
                        return (
                            <div className="flex -space-x-2">
                                {staffs.map((staff, staffIndex) => {
                                    const staffName = staffDisplayName(staff);
                                    return (
                                        <button
                                            key={staff.assign_id ?? staff.username ?? staffIndex}
                                            type="button"
                                            onClick={() => openUsers(staffs, task.service?.name)}
                                            className="flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity"
                                            title={`Click to view ${staffName}'s details`}
                                        >
                                            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-full border-2 border-white flex items-center justify-center text-xs font-bold text-white">
                                                {staffName.charAt(0)}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        );
                    }
                    const showMoreCount = staffs.length - 2;
                    return (
                        <div className="flex -space-x-2">
                            {staffs.slice(0, 2).map((staff, staffIndex) => {
                                const staffName = staffDisplayName(staff);
                                return (
                                    <button
                                        key={staff.assign_id ?? staff.username ?? staffIndex}
                                        type="button"
                                        onClick={() => openUsers(staffs, task.service?.name)}
                                        className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-full border-2 border-white flex items-center justify-center text-xs font-bold text-white hover:opacity-80 transition-opacity"
                                        title={`Click to view all ${staffs.length} staff members`}
                                    >
                                        {staffName.charAt(0)}
                                    </button>
                                );
                            })}
                            <button
                                type="button"
                                onClick={() => openUsers(staffs, task.service?.name)}
                                className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-full border-2 border-white flex items-center justify-center text-xs font-bold text-white hover:opacity-80 transition-opacity"
                                title={`Click to view all ${staffs.length} staff members`}
                            >
                                +{showMoreCount}
                            </button>
                        </div>
                    );
                }
                case 'status': {
                    const statusColorClass =
                        task.status === 'unassign' ? 'bg-blue-100 text-blue-700' :
                            task.status === 'in process' ? 'bg-orange-100 text-orange-700' :
                                task.status === 'pending from client' ? 'bg-purple-100 text-purple-700' :
                                    task.status === 'pending from department' ? 'bg-yellow-100 text-yellow-700' :
                                        task.status === 'complete' ? 'bg-green-100 text-green-700' :
                                            task.status === 'cancel' ? 'bg-red-100 text-red-700' :
                                                'bg-gray-100 text-slate-700';
                    const statusText =
                        task.status === 'unassign' ? 'Unassign' :
                            task.status === 'in process' ? 'In Process' :
                                task.status === 'pending from client' ? 'Pending from Client' :
                                    task.status === 'pending from department' ? 'Pending from Department' :
                                        task.status === 'complete' ? 'Complete' :
                                            task.status === 'cancel' ? 'Cancel' :
                                                task.status || '-';
                    return (
                        <button
                            type="button"
                            onClick={() => openStat(task.task_id, task.status, task.service?.name || '')}
                            className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${statusColorClass} hover:opacity-90 transition-opacity`}
                        >
                            {safeGetString(statusText)}
                        </button>
                    );
                }
                case 'menu':
                    return (
                        <div className="relative flex items-center justify-center w-full">
                            <motion.button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    toggleDrop(task.task_id);
                                }}
                                className="w-8 h-8 flex flex-col items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors space-y-0.5"
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                <div className="w-1 h-1 rounded-full bg-gray-600" />
                                <div className="w-1 h-1 rounded-full bg-gray-600" />
                                <div className="w-1 h-1 rounded-full bg-gray-600" />
                            </motion.button>
                            <AnimatePresence>
                                {activeDrop === task.task_id && (
                                    <motion.div
                                        className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-xl border border-gray-200 z-[9999] overflow-hidden"
                                        initial={{ opacity: 0, y: -8, scale: 0.96 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: -8, scale: 0.96 }}
                                    >
                                        <button
                                            type="button"
                                            onClick={() => hGetInOut(task.task_id, 'in')}
                                            className="flex items-center w-full px-4 py-3 text-xs text-indigo-600 hover:bg-indigo-50 text-left"
                                        >
                                            <FiArrowLeft className="mr-3 w-3.5 h-3.5" />
                                            GET IN
                                        </button>
                                        <div className="border-t my-1" />
                                        <button
                                            type="button"
                                            onClick={() => openStat(task.task_id, task.status, task.service?.name || '')}
                                            className="flex items-center w-full px-4 py-3 text-xs text-blue-600 hover:bg-blue-50 text-left"
                                        >
                                            <FiCheckCircle className="mr-3 w-3.5 h-3.5" />
                                            Change Status
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setActiveDrop(null);
                                                nav(`/task/${task.task_id}${taskUsernameQuery}`);
                                            }}
                                            className="flex items-center w-full px-4 py-3 text-xs text-slate-700 hover:bg-gray-100 text-left"
                                        >
                                            <FiEye className="mr-3 w-3.5 h-3.5" />
                                            View Details
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => editTask(task)}
                                            className="flex items-center w-full px-4 py-3 text-xs text-slate-700 hover:bg-gray-100 text-left"
                                        >
                                            <FiEdit className="mr-3 w-3.5 h-3.5" />
                                            Edit Task
                                        </button>
                                        <div className="border-t my-1" />
                                        <button
                                            type="button"
                                            onClick={() => setActiveDrop(null)}
                                            className="flex items-center w-full px-4 py-3 text-xs text-red-600 hover:bg-red-50 text-left"
                                        >
                                            <FiTrash2 className="mr-3 w-3.5 h-3.5" />
                                            Delete Task
                                        </button>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    );
                default: {
                    const value = task[fieldId];
                    return (
                        <span className="text-slate-700 font-medium text-sm">
                            {safeGetString(value)}
                        </span>
                    );
                }
            }
        },
        []
    );

    const totalPages = Math.max(1, Math.ceil((pagination.total || 0) / (pagination.limit || 20)));

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-gradient-to-br from-gray-50 to-white rounded-2xl border border-gray-100 shadow-xl p-6"
        >
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-6">
                <div className="space-y-2">
                    <h3 className="text-base sm:text-lg font-bold text-slate-800 bg-gradient-to-r from-blue-600 to-indigo-700 bg-clip-text text-transparent">
                        Task Management
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-600">Track, assign, and manage client tasks efficiently</p>
                </div>
                {checkPermissionSync('task_create') && (
                    <div className="flex items-center gap-3">
                        <motion.button
                            type="button"
                            onClick={() => setCreateTaskModalOpen(true)}
                            className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-xl hover:shadow-lg hover:shadow-blue-500/25 transition-all duration-300 font-semibold"
                            whileHover={{ scale: 1.02, y: -2 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            <FiPlus className="w-5 h-5" />
                            New Task
                        </motion.button>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-semibold text-slate-600">Total Tasks</p>
                            <p className="text-base font-bold text-slate-800 mt-1">{taskStatistics.total}</p>
                        </div>
                        <div className="w-12 h-12 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-xl flex items-center justify-center">
                            <FiTarget className="w-6 h-6 text-blue-600" />
                        </div>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-semibold text-slate-600">Complete</p>
                            <p className="text-base font-bold text-slate-800 mt-1">{taskStatistics.complete}</p>
                        </div>
                        <div className="w-12 h-12 bg-gradient-to-r from-green-100 to-emerald-100 rounded-xl flex items-center justify-center">
                            <FiCheckCircle className="w-6 h-6 text-green-600" />
                        </div>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-semibold text-slate-600">Cancel</p>
                            <p className="text-base font-bold text-slate-800 mt-1">{taskStatistics.cancel}</p>
                        </div>
                        <div className="w-12 h-12 bg-gradient-to-r from-red-100 to-rose-100 rounded-xl flex items-center justify-center">
                            <FiXCircle className="w-6 h-6 text-red-600" />
                        </div>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-semibold text-slate-600">In Process</p>
                            <p className="text-base font-bold text-slate-800 mt-1">{taskStatistics.inProcess}</p>
                        </div>
                        <div className="w-12 h-12 bg-gradient-to-r from-yellow-100 to-amber-100 rounded-xl flex items-center justify-center">
                            <FiClock className="w-6 h-6 text-yellow-600" />
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4 mb-6 md:items-stretch">
                <div className="w-full min-w-0 flex-1 flex items-center">
                    <input
                        type="text"
                        placeholder="Search tasks, descriptions, or assigned to..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full h-10 px-4 py-2 text-sm text-slate-700 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm transition-all duration-300"
                    />
                </div>
                <div className="flex w-full md:w-auto md:flex-none md:shrink-0 items-stretch gap-1.5 min-w-0">
                    <div className="min-w-0 w-full md:w-[10rem]">
                        <SelectInput
                            options={firmOptions}
                            value={selectedFirmId}
                            onChange={setSelectedFirmId}
                            placeholder="All firms"
                            searchPlaceholder="Search firm..."
                            clearable={false}
                            className="w-full"
                        />
                    </div>
                    {selectedFirmId != null && (
                        <button
                            type="button"
                            aria-label="Clear firm filter"
                            onClick={() => setSelectedFirmId(null)}
                            className="inline-flex h-10 w-9 shrink-0 items-center justify-center rounded-xl border border-gray-300 bg-white text-slate-500 shadow-sm transition-colors hover:bg-gray-50 hover:text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-0"
                        >
                            <FiX className="h-4 w-4" />
                        </button>
                )}
            </div>
                <div className="w-full md:min-w-[220px] md:max-w-sm flex items-center [&_button]:min-h-[40px]">
                    <MultiSelectInput
                        options={STATUS_OPTIONS.filter((s) => s.value !== 'unassign').map((s) => ({ ...s, label: s.name }))}
                        value={statusFilterValues}
                        onChange={setStatusFilterValues}
                        placeholder="Select Status"
                        allSelectedLabel="All"
                        treatEmptyAsAll={true}
                        searchPlaceholder="Search status..."
                        showSearch={true}
                        showSelectActions={true}
                        valueKey="value"
                        labelKey="label"
                        className="w-full"
                    />
                </div>
            </div>

            {/* Same task table shell as `task-display.js` (TaskTable) */}
            <div className="rounded-xl border border-gray-200 overflow-hidden bg-white shadow-sm">
                <TaskTable
                    tasks={tasks}
                    selectedTasks={selectedTasks}
                    handleTaskSelect={handleTaskSelect}
                    selectAll={selectAll}
                    handleSelectAll={handleSelectAll}
                    columnConfig={TASK_TAB_COLUMN_CONFIG}
                    renderCellContent={renderCellContent}
                    loading={loading}
                    toggleRowDropdown={toggleRowDropdown}
                    activeRowDropdown={activeRowDropdown}
                    handleGetInOut={handleGetInOut}
                    setActiveRowDropdown={setActiveRowDropdown}
                    handleStatusChange={handleStatusChange}
                    openStatusModal={openStatusModal}
                    openUsersModal={openUsersModal}
                    openClientDetailsModal={openClientDetailsModal}
                    handleEditTask={handleEditTask}
                    navigate={navigate}
                    formatDate={formatDate}
                    getDaysLeft={getDaysLeft}
                    getStatusStyle={getStatusStyle}
                    getStatusText={getStatusText}
                />
                <TablePagination
                    page={pagination.page_no}
                    limit={pagination.limit}
                    total={pagination.total}
                    totalPages={totalPages}
                    rowOptions={[5, 10, 20, 50, 100]}
                    defaultRows={20}
                    onPageChange={(nextPage) =>
                        setPagination((prev) => ({ ...prev, page_no: nextPage }))
                    }
                    onLimitChange={(nextLimit) =>
                        setPagination((prev) => ({ ...prev, limit: nextLimit, page_no: 1 }))
                    }
                    showJump
                    showFirstLast
                />
            </div>

            <TaskStatusChange
                isOpen={statusModal.open}
                onClose={closeStatusModal}
                taskId={statusModal.taskId}
                taskName={statusModal.taskName}
                currentStatus={statusModal.currentStatus}
                onStatusChange={handleStatusChange}
                statusOptions={STATUS_OPTIONS}
            />

            <CreateTask
                isOpen={createTaskModalOpen}
                onClose={() => setCreateTaskModalOpen(false)}
                onSuccess={() => {
                    fetchTasks();
                    fetchTaskStatistics();
                }}
                onNavigateToTaskList={() => {
                    setCreateTaskModalOpen(false);
                    const q =
                        clientUsernameTrimmed !== ''
                            ? `?username=${encodeURIComponent(clientUsernameTrimmed)}`
                            : '';
                    navigate(`/task/view${q}`);
                }}
            />
        </motion.div>
    );
};

export default TaskTab;
