import React, { useState, useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useTaskCreate } from '../context/TaskCreateProvider';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import axios from 'axios';
import { checkPermissionSync, useUserPermissions } from '../utils/permission-helper';
import {
    FiPlus, FiCheckCircle, FiClock, FiTarget,
    FiEdit, FiEye, FiTrash2, FiArrowLeft, FiArrowRight, FiXCircle, FiUser, FiX,
    FiCalendar, FiLoader, FiLock, FiUserCheck,
} from 'react-icons/fi';
import TaskTable from '../TaskComponent/TaskTable';
import MultiSelectInput from '../components/MultiSelectInput';
import CustomSelect from '../components/CustomSelect';
import { optionByValue } from '../utils/customSelectHelpers';
import TablePagination from '../components/TablePagination';
import TaskStatusChange from '../components/Modals/TaskStatusChange';
import AssignedStaffList from '../components/Modals/AssignedStaffList';
import getHeaders from '../utils/get-headers';
import API_BASE_URL from '../utils/api-controller';
import { taskGetIn, taskGetOut } from '../services/taskService';

/** Matches `task-display` status filter options */
const STATUS_OPTIONS = [
    { value: 'in process', name: 'In Process' },
    { value: 'pending from client', name: 'Pending from Client' },
    { value: 'pending from department', name: 'Pending from Department' },
    { value: 'complete', name: 'Complete' },
    { value: 'cancel', name: 'Cancel' },
];

const DEFAULT_SELECTED_STATUSES = [
    'in process',
    'pending from client',
    'pending from department',
];

const getLoggedInUsername = () =>
    localStorage.getItem('user_username') || localStorage.getItem('username') || '';

const isBranchAdmin = () =>
    localStorage.getItem('branch_owned') === 'true' ||
    getLoggedInUsername().toLowerCase() === 'admin';

/** Column layout aligned with task-display but without Client (single-client tab) */
const TASK_TAB_COLUMN_CONFIG = [
    {
        id: '2',
        name: 'Task',
        items: [
            { id: 'service_name', label: 'Service Name' },
            { id: 'fees', label: 'Fees' },
            { id: 'firm_name', label: 'Firm Name' },
        ],
        fixed: false,
    },
    {
        id: '3',
        name: 'Dates',
        items: [
            { id: 'create_date', label: 'Create Date' },
            { id: 'due_date', label: 'Due Date' },
            { id: 'due_days', label: 'Show Due Days' },
        ],
        fixed: false,
    },
    {
        id: '4',
        name: 'Staffs',
        items: [{ id: 'staffs', label: 'Staffs' }],
        fixed: false,
    },
    {
        id: '5',
        name: 'Status',
        items: [{ id: 'status', label: 'Status' }],
        fixed: true,
    },
    {
        id: '6',
        name: 'Action',
        items: [{ id: 'menu', label: 'Actions' }],
        fixed: true,
    },
];

/** CA / agent profile tab — includes client column */
const TASK_TAB_COLUMN_CONFIG_CA = [
    {
        id: '1',
        name: 'Client',
        items: [{ id: 'client_name', label: 'Client Name' }],
        fixed: false,
    },
    {
        id: '2',
        name: 'Task',
        items: [
            { id: 'service_name', label: 'Service Name' },
            { id: 'fees', label: 'Fees' },
            { id: 'firm_name', label: 'Firm Name' },
        ],
        fixed: false,
    },
    {
        id: '3',
        name: 'Dates',
        items: [
            { id: 'create_date', label: 'Create Date' },
            { id: 'due_date', label: 'Due Date' },
            { id: 'due_days', label: 'Show Due Days' },
        ],
        fixed: false,
    },
    {
        id: '4',
        name: 'Staffs',
        items: [{ id: 'staffs', label: 'Staffs' }],
        fixed: false,
    },
    {
        id: '5',
        name: 'Status',
        items: [{ id: 'status', label: 'Status' }],
        fixed: true,
    },
    {
        id: '6',
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
        case 'pending from client': return 'PFC';
        case 'pending from department': return 'PFD';
        case 'complete': return 'Complete';
        case 'cancel': return 'Cancel';
        default: return status || '-';
    }
};

const getStatusHoverTitle = (status) => {
    switch (status) {
        case 'pending from client': return 'Pending from Client';
        case 'pending from department': return 'Pending from Department';
        default: return undefined;
    }
};

const formatDueDaysLabel = (dueDate) => {
    if (!dueDate) return null;
    const daysLeft = getDaysLeft(dueDate);
    if (daysLeft === null || daysLeft === undefined) return null;
    if (daysLeft < 0) return `OD by ${Math.abs(daysLeft)}D`;
    if (daysLeft === 0) return 'Due today';
    return `Due in ${daysLeft}D`;
};

const SEARCH_DEBOUNCE_MS = 400;

const TaskTab = ({
    clientUsername: clientUsernameProp,
    caUsername: caUsernameProp,
    agentUsername: agentUsernameProp,
} = {}) => {
    const navigate = useNavigate();
    const { check } = useUserPermissions();
    const { openTaskCreate } = useTaskCreate();
    const taskListAbortRef = useRef(null);
    const rowMenuButtonRefs = useRef({});
    const rowDropdownRef = useRef(null);
    const rowContextPositionRef = useRef(null);

    const caUsernameTrimmed =
        caUsernameProp != null && String(caUsernameProp).trim() !== ''
            ? String(caUsernameProp).trim()
            : '';
    const agentUsernameTrimmed =
        agentUsernameProp != null && String(agentUsernameProp).trim() !== ''
            ? String(agentUsernameProp).trim()
            : '';
    const isCaMode = Boolean(caUsernameTrimmed);
    const isAgentMode = Boolean(agentUsernameTrimmed);
    const isProfileScopedMode = isCaMode || isAgentMode;
    const columnConfig = isProfileScopedMode ? TASK_TAB_COLUMN_CONFIG_CA : TASK_TAB_COLUMN_CONFIG;

    const [tasks, setTasks] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [statusFilterValues, setStatusFilterValues] = useState(DEFAULT_SELECTED_STATUSES);
    const [selectedFirmId, setSelectedFirmId] = useState(null);
    const [firmOptions, setFirmOptions] = useState([]);
    const [pagination, setPagination] = useState({ page_no: 1, limit: 20, total: 0 });

    const [statusModal, setStatusModal] = useState({
        open: false,
        taskId: null,
        taskName: '',
        currentStatus: '',
    });
    const [usersModal, setUsersModal] = useState({
        open: false,
        users: [],
        taskName: '',
    });

    const [selectedTasks, setSelectedTasks] = useState(new Set());
    const [selectAll, setSelectAll] = useState(false);
    const [activeRowDropdown, setActiveRowDropdown] = useState(null);
    const [rowDropdownPosition, setRowDropdownPosition] = useState({ top: 8, left: 8 });
    const [getInOutLoadingId, setGetInOutLoadingId] = useState(null);
    const [loading, setLoading] = useState(false);
    const [taskStatistics, setTaskStatistics] = useState({
        total: 0,
        complete: 0,
        cancel: 0,
        inProcess: 0,
    });
    const handleOpenCreateTask = () => {
        const baseOptions = {
            onSuccess: () => {
                fetchTasks();
                fetchTaskStatistics();
            },
            onNavigateToTaskList: () => {
                const q =
                    clientUsernameTrimmed !== ''
                        ? `?username=${encodeURIComponent(clientUsernameTrimmed)}`
                        : '';
                navigate(`/task/view${q}`);
            },
        };

        if (isCaMode) {
            openTaskCreate({ ...baseOptions, ca: caUsernameTrimmed });
            return;
        }

        if (isAgentMode) {
            openTaskCreate({ ...baseOptions, agent: agentUsernameTrimmed });
            return;
        }

        if (clientUsernameTrimmed) {
            openTaskCreate({ ...baseOptions, client: clientUsernameTrimmed });
            return;
        }

        openTaskCreate(baseOptions);
    };

    const clientUsernameTrimmed =
        !isProfileScopedMode && clientUsernameProp != null && String(clientUsernameProp).trim() !== ''
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
        if (isProfileScopedMode || !clientUsernameTrimmed) {
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
    }, [clientUsernameTrimmed, isProfileScopedMode]);

    const fetchTaskStatistics = useCallback(async () => {
        const headers = getHeaders();
        if (!headers) return;

        if (isCaMode) {
            if (!caUsernameTrimmed) {
                setTaskStatistics({ total: 0, complete: 0, cancel: 0, inProcess: 0 });
                return;
            }

            const fetchCount = async (statuses = []) => {
                const queryParams = new URLSearchParams({
                    ca: caUsernameTrimmed,
                    page_no: '1',
                    limit: '1',
                });
                statuses.forEach((status) => queryParams.append('status', status));
                const response = await fetch(
                    `${API_BASE_URL}/task/list?${queryParams.toString()}`,
                    { method: 'GET', headers }
                );
                if (!response.ok) return 0;
                const responseData = await response.json();
                return (
                    responseData.pagination?.total ??
                    responseData.meta?.total ??
                    (Array.isArray(responseData.data) ? responseData.data.length : 0)
                );
            };

            try {
                const [total, complete, cancel, inProcess] = await Promise.all([
                    fetchCount(),
                    fetchCount(['complete']),
                    fetchCount(['cancel']),
                    fetchCount(['in process', 'pending from client', 'pending from department']),
                ]);
                setTaskStatistics({ total, complete, cancel, inProcess });
            } catch (error) {
                console.error('Error fetching CA task statistics:', error);
            }
            return;
        }

        if (isAgentMode) {
            if (!agentUsernameTrimmed) {
                setTaskStatistics({ total: 0, complete: 0, cancel: 0, inProcess: 0 });
                return;
            }

            const fetchCount = async (statuses = []) => {
                const queryParams = new URLSearchParams({
                    agent: agentUsernameTrimmed,
                    page_no: '1',
                    limit: '1',
                });
                statuses.forEach((status) => queryParams.append('status', status));
                const response = await fetch(
                    `${API_BASE_URL}/task/list?${queryParams.toString()}`,
                    { method: 'GET', headers }
                );
                if (!response.ok) return 0;
                const responseData = await response.json();
                return (
                    responseData.pagination?.total ??
                    responseData.meta?.total ??
                    (Array.isArray(responseData.data) ? responseData.data.length : 0)
                );
            };

            try {
                const [total, complete, cancel, inProcess] = await Promise.all([
                    fetchCount(),
                    fetchCount(['complete']),
                    fetchCount(['cancel']),
                    fetchCount(['in process', 'pending from client', 'pending from department']),
                ]);
                setTaskStatistics({ total, complete, cancel, inProcess });
            } catch (error) {
                console.error('Error fetching agent task statistics:', error);
            }
            return;
        }

        if (!clientUsernameTrimmed) {
            setTaskStatistics({ total: 0, complete: 0, cancel: 0, inProcess: 0 });
            return;
        }

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
    }, [clientUsernameTrimmed, caUsernameTrimmed, agentUsernameTrimmed, isCaMode, isAgentMode]);

    useEffect(() => {
        fetchTaskStatistics();
    }, [fetchTaskStatistics]);

    const fetchTasks = useCallback(async () => {
        if (!clientUsernameTrimmed && !caUsernameTrimmed && !agentUsernameTrimmed) {
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
            if (isCaMode) {
                queryParams.append('ca', caUsernameTrimmed);
            } else if (isAgentMode) {
                queryParams.append('agent', agentUsernameTrimmed);
            } else {
                queryParams.append('username', clientUsernameTrimmed);
            }
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
        caUsernameTrimmed,
        agentUsernameTrimmed,
        isCaMode,
        isAgentMode,
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

    const toggleRowDropdown = useCallback((taskId, buttonElement) => {
        if (activeRowDropdown === taskId) {
            setActiveRowDropdown(null);
            rowContextPositionRef.current = null;
            return;
        }
        rowContextPositionRef.current = null;
        if (buttonElement) {
            rowMenuButtonRefs.current[taskId] = buttonElement;
        }
        setActiveRowDropdown(taskId);
    }, [activeRowDropdown]);

    const canForceGetOut = useCallback(
        () => isBranchAdmin() || check('task_get_in'),
        [check]
    );

    const getTaskInOutState = useCallback((task) => {
        const me = getLoggedInUsername();
        const inUser = task?.in_user;

        if (!inUser?.username) {
            return {
                mode: 'free',
                showGetIn: true,
                showGetOut: false,
                badge: null,
                inUser: null,
            };
        }

        if (inUser.username === me) {
            return {
                mode: 'self',
                showGetIn: false,
                showGetOut: true,
                badge: 'You',
                inUser,
            };
        }

        return {
            mode: 'other',
            showGetIn: false,
            showGetOut: canForceGetOut(),
            badge: inUser.name || inUser.username,
            inUser,
        };
    }, [canForceGetOut]);

    const handleGetInOut = useCallback(async (taskId, action) => {
        if (!taskId || getInOutLoadingId) return;

        setGetInOutLoadingId(taskId);
        setActiveRowDropdown(null);

        try {
            const responseData = action === 'in'
                ? await taskGetIn(taskId)
                : await taskGetOut(taskId);

            if (responseData?.success) {
                toast.success(responseData.message || (action === 'in' ? 'Get in successful' : 'Get out successful'));
                setTasks((prev) =>
                    prev.map((task) =>
                        task.task_id === taskId
                            ? {
                                ...task,
                                in_user: action === 'in'
                                    ? (responseData.data?.in_user ?? task.in_user)
                                    : null,
                            }
                            : task
                    )
                );
                return;
            }

            if (responseData?.in_user) {
                setTasks((prev) =>
                    prev.map((task) =>
                        task.task_id === taskId
                            ? { ...task, in_user: responseData.in_user }
                            : task
                    )
                );
            }

            toast.error(responseData?.message || 'Operation failed');
        } catch (error) {
            const responseData = error.response?.data;
            if (responseData?.in_user) {
                setTasks((prev) =>
                    prev.map((task) =>
                        task.task_id === taskId
                            ? { ...task, in_user: responseData.in_user }
                            : task
                    )
                );
            }
            console.error(`Error during get ${action}:`, error);
            toast.error(responseData?.message || error.message || 'Operation failed');
        } finally {
            setGetInOutLoadingId(null);
        }
    }, [getInOutLoadingId]);

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
                const responseData = await response.json().catch(() => ({}));
                if (!response.ok) {
                    throw new Error(responseData.message || 'Failed to update status');
                }
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
        const list = Array.isArray(staffs) ? staffs : [];
        setUsersModal({
            open: true,
            users: list.map((staff) => ({
                username: staff.username,
                name: staff.name || staff.profile?.name || staff.username || '—',
                email: staff.email || staff.profile?.email || '',
                mobile: staff.mobile || staff.profile?.mobile || '',
                role: 'Staff',
            })),
            taskName: taskName || '',
        });
        setActiveRowDropdown(null);
    }, []);

    const closeUsersModal = useCallback(() => {
        setUsersModal({ open: false, users: [], taskName: '' });
    }, []);

    const openClientDetailsModal = useCallback(() => {
        setActiveRowDropdown(null);
    }, []);

    const handleEditTask = useCallback((task) => {
        console.log('[TaskTab] Edit', task?.task_id);
        setActiveRowDropdown(null);
    }, []);

    const getRowDropdownPosition = (button, dropdownHeight = 220) => {
        if (!button) return { top: 8, left: 8 };
        const rect = button.getBoundingClientRect();
        const dropdownWidth = 224;
        const windowHeight = window.innerHeight;
        const windowWidth = window.innerWidth;
        const spaceBelow = windowHeight - rect.bottom;
        const spaceAbove = rect.top;

        let left = rect.right - dropdownWidth;
        left = Math.max(8, Math.min(left, windowWidth - dropdownWidth - 8));

        let top = 8;

        if (spaceBelow >= dropdownHeight + 8) {
            top = rect.bottom + 4;
        } else if (spaceAbove >= dropdownHeight + 8) {
            top = rect.top - dropdownHeight - 4;
        } else {
            top = Math.max(8, Math.min(windowHeight - dropdownHeight - 8, rect.bottom + 4));
        }
        return { top, left };
    };

    useLayoutEffect(() => {
        if (!activeRowDropdown) return undefined;

        const syncPosition = () => {
            const dropdownHeight = rowDropdownRef.current?.offsetHeight || 220;
            const dropdownWidth = 224;

            if (rowContextPositionRef.current) {
                let { top, left } = rowContextPositionRef.current;
                left = Math.max(8, Math.min(left, window.innerWidth - dropdownWidth - 8));
                top = Math.max(8, Math.min(top, window.innerHeight - dropdownHeight - 8));
                setRowDropdownPosition({ top, left });
                return;
            }

            const button = rowMenuButtonRefs.current[activeRowDropdown];
            if (button) {
                setRowDropdownPosition(getRowDropdownPosition(button, dropdownHeight));
            }
        };

        syncPosition();
        const raf = requestAnimationFrame(syncPosition);
        window.addEventListener('resize', syncPosition);
        window.addEventListener('scroll', syncPosition, true);

        return () => {
            cancelAnimationFrame(raf);
            window.removeEventListener('resize', syncPosition);
            window.removeEventListener('scroll', syncPosition, true);
        };
    }, [activeRowDropdown, tasks]);

    useEffect(() => {
        if (!activeRowDropdown) return;
        const rawId = String(activeRowDropdown).startsWith('mobile-')
            ? String(activeRowDropdown).slice('mobile-'.length)
            : String(activeRowDropdown);
        if (!tasks.some((t) => String(t.task_id) === rawId)) {
            setActiveRowDropdown(null);
        }
    }, [tasks, activeRowDropdown]);

    useEffect(() => {
        const handleOutsideMenuClick = (event) => {
            const clickedRowMenu = event.target.closest('.task-row-action-menu');
            const clickedRowTrigger = event.target.closest('.task-row-action-trigger');
            if (!clickedRowMenu && !clickedRowTrigger && activeRowDropdown !== null) {
                setActiveRowDropdown(null);
                rowContextPositionRef.current = null;
            }
        };

        document.addEventListener('mousedown', handleOutsideMenuClick);
        return () => {
            document.removeEventListener('mousedown', handleOutsideMenuClick);
        };
    }, [activeRowDropdown]);

    const renderCellContent = useCallback(
        (task, fieldId, hGetInOut, nav, openStat, openUsers) => {
            const daysLeft = getDaysLeft(task.dates?.due_date);
            const isOverdue = daysLeft != null && daysLeft < 0;

            const safeGetString = (value, fallback = '-') => {
                if (!value) return fallback;
                if (typeof value === 'string') return value;
                if (typeof value === 'object') {
                    return value.mobile || value.email || value.name || value.number || value.address || JSON.stringify(value);
                }
                return String(value);
            };

            switch (fieldId) {
                case 'client_name': {
                    const clientName = task.client?.profile?.name || task.client?.name || '-';
                    return (
                        <div className="flex items-center gap-2">
                            <div className="w-7 h-7 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-sm flex-shrink-0">
                                <FiUser className="w-3.5 h-3.5 text-white" />
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    const clientUser = task.client?.username;
                                    if (clientUser) nav(`/client/profile/${clientUser}`);
                                }}
                                className="font-semibold text-gray-800 text-sm hover:text-indigo-600 transition-colors text-left"
                            >
                                {safeGetString(clientName)}
                            </button>
                        </div>
                    );
                }
                case 'firm_name': {
                    const firmName = task.firm?.firm_name || task.firm_name || '-';
                    return <div className="text-gray-700 font-medium text-sm">{safeGetString(firmName)}</div>;
                }
                case 'service_name': {
                    const serviceName = task.service?.name || task.service_name || '-';
                    const isCompliance =
                        String(task.task_type || '').toLowerCase() === 'compliance';
                    return (
                        <button
                            type="button"
                            onClick={() => nav(`/task/${task.task_id}`)}
                            className="p-0 m-0 bg-transparent border-0 inline-flex items-center gap-1.5 font-semibold text-gray-800 text-sm hover:text-indigo-600 transition-colors text-left"
                        >
                            {safeGetString(serviceName)}
                            {isCompliance ? (
                                <span
                                    className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded bg-red-100 text-[10px] font-bold text-red-700"
                                    title="Compliance task"
                                >
                                    C
                                </span>
                            ) : null}
                        </button>
                    );
                }
                case 'fees': {
                    const feesAmount = task.charges?.fees || task.fees || 0;
                    return (
                        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            {check('task_fees_view') ? (
                                `₹${Number(feesAmount).toLocaleString()}`
                            ) : (
                                <span className="blur-[3.5px] select-none">₹99,999</span>
                            )}
                        </div>
                    );
                }
                case 'due_date': {
                    const dueDateValue = task.dates?.due_date ? formatDate(task.dates.due_date) : '-';
                    const dueTitle = task.dates?.due_date ? `Due Date: ${dueDateValue}` : 'Due Date';
                    return (
                        <div className="flex items-center gap-1.5 text-gray-700 font-medium text-sm" title={dueTitle}>
                            <FiCalendar className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                            <span>{dueDateValue}</span>
                        </div>
                    );
                }
                case 'create_date': {
                    const createDateValue = task.dates?.create_date ? formatDate(task.dates.create_date) : '-';
                    const createTitle = task.dates?.create_date ? `Create Date: ${createDateValue}` : 'Create Date';
                    return (
                        <div className="flex items-center gap-1.5 text-gray-700 font-medium text-sm" title={createTitle}>
                            <FiClock className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                            <span>{createDateValue}</span>
                        </div>
                    );
                }
                case 'due_days':
                case 'target_date': {
                    if (task.status === 'cancel') {
                        return <span className="text-gray-400 text-sm">-</span>;
                    }
                    if (task.status === 'complete') {
                        const completeDateValue = task.dates?.complete_date
                            ? formatDate(task.dates.complete_date)
                            : '-';
                        const completeTitle =
                            completeDateValue !== '-'
                                ? `Complete Date: ${completeDateValue}`
                                : 'Complete Date';
                        return (
                            <div
                                className="flex items-center gap-1.5 text-green-700 font-medium text-sm"
                                title={completeTitle}
                            >
                                <FiCheckCircle className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
                                <span>{completeDateValue}</span>
                            </div>
                        );
                    }
                    const dueDaysLabel = formatDueDaysLabel(task.dates?.due_date);
                    if (!dueDaysLabel) {
                        return <span className="text-gray-400 text-sm">-</span>;
                    }
                    return (
                        <span
                            className={`text-sm font-semibold ${isOverdue ? 'text-red-600' : daysLeft <= 7 ? 'text-orange-600' : 'text-green-600'}`}
                            title={dueDaysLabel}
                        >
                            {dueDaysLabel}
                        </span>
                    );
                }
                case 'staffs': {
                    const staffs = Array.isArray(task.staffs) ? task.staffs : [];
                    const caName = task.has_ca && task.ca
                        ? safeGetString(task.ca.name || task.ca.username)
                        : null;
                    const agentName = task.has_agent && task.agent
                        ? safeGetString(task.agent.name || task.agent.username)
                        : null;

                    const renderStaffAvatars = () => {
                        if (staffs.length === 1) {
                            const staffName = safeGetString(staffs[0].name || staffs[0].profile?.name || 'S');
                            return (
                                <button
                                    type="button"
                                    onClick={() => openUsers(staffs, task.service?.name)}
                                    className="flex items-center justify-start cursor-pointer hover:opacity-80 transition-opacity"
                                    title={`Click to view ${staffName}'s details`}
                                >
                                    <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-full border-2 border-white flex items-center justify-center text-xs font-bold text-white shadow-sm">
                                        {staffName.charAt(0)}
                                    </div>
                                </button>
                            );
                        }
                        if (staffs.length === 2) {
                            return (
                                <div className="flex -space-x-2">
                                    {staffs.map((staff, staffIndex) => {
                                        const staffName = safeGetString(staff.name || staff.profile?.name || 'S');
                                        return (
                                            <button
                                                type="button"
                                                key={staff.assign_id || staff.username || staffIndex}
                                                onClick={() => openUsers(staffs, task.service?.name)}
                                                className="flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity"
                                                title={`Click to view ${staffName}'s details`}
                                            >
                                                <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-full border-2 border-white flex items-center justify-center text-xs font-bold text-white shadow-sm">
                                                    {staffName.charAt(0)}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            );
                        }
                        if (staffs.length > 2) {
                            const showMoreCount = staffs.length - 2;
                            return (
                                <div className="flex -space-x-2">
                                    {staffs.slice(0, 2).map((staff, staffIndex) => {
                                        const staffName = safeGetString(staff.name || staff.profile?.name || 'S');
                                        return (
                                            <button
                                                type="button"
                                                key={staff.assign_id || staff.username || staffIndex}
                                                onClick={() => openUsers(staffs, task.service?.name)}
                                                className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-full border-2 border-white flex items-center justify-center text-xs font-bold text-white shadow-sm hover:opacity-80 transition-opacity"
                                                title={`Click to view all ${staffs.length} staff members`}
                                            >
                                                {staffName.charAt(0)}
                                            </button>
                                        );
                                    })}
                                    <button
                                        type="button"
                                        onClick={() => openUsers(staffs, task.service?.name)}
                                        className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-full border-2 border-white flex items-center justify-center text-xs font-bold text-white shadow-sm"
                                        title={`Click to view all ${staffs.length} staff members`}
                                    >
                                        +{showMoreCount}
                                    </button>
                                </div>
                            );
                        }
                        return null;
                    };

                    if (staffs.length === 0 && !caName && !agentName) {
                        return <span className="text-gray-400 text-sm">-</span>;
                    }

                    return (
                        <div className="flex flex-col items-start gap-1.5 min-w-0 max-w-full">
                            {renderStaffAvatars()}
                            {caName && (
                                <span
                                    className="text-[10px] font-semibold text-violet-700 bg-violet-50 px-1.5 py-0.5 rounded truncate max-w-full"
                                    title={`CA: ${caName}`}
                                >
                                    CA: {caName}
                                </span>
                            )}
                            {agentName && (
                                <span
                                    className="text-[10px] font-semibold text-sky-700 bg-sky-50 px-1.5 py-0.5 rounded truncate max-w-full"
                                    title={`Agent: ${agentName}`}
                                >
                                    Agent: {agentName}
                                </span>
                            )}
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
                                                'bg-gray-100 text-gray-700';
                    const inOutState = getTaskInOutState(task);
                    return (
                        <div className="flex flex-col items-start gap-1">
                            <button
                                type="button"
                                onClick={() => openStat(task.task_id, task.status, task.service?.name || '')}
                                title={getStatusHoverTitle(task.status)}
                                className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${statusColorClass} hover:opacity-90 transition-opacity`}
                            >
                                {safeGetString(getStatusText(task.status))}
                            </button>
                            {inOutState.badge ? (
                                <span
                                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${inOutState.mode === 'self'
                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                                        }`}
                                >
                                    {inOutState.mode === 'self'
                                        ? <FiUserCheck className="w-3 h-3" />
                                        : <FiClock className="w-3 h-3" />}
                                    {inOutState.badge}
                                </span>
                            ) : null}
                        </div>
                    );
                }
                case 'menu':
                    return (
                        <div className="relative flex items-center justify-center w-full">
                            <motion.button
                                type="button"
                                ref={(el) => {
                                    if (el && el.offsetParent !== null) {
                                        rowMenuButtonRefs.current[task.task_id] = el;
                                    }
                                }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    toggleRowDropdown(task.task_id, e.currentTarget);
                                }}
                                className="task-row-action-trigger w-8 h-8 flex flex-col items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors space-y-0.5"
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                <div className="w-1 h-1 rounded-full bg-gray-600" />
                                <div className="w-1 h-1 rounded-full bg-gray-600" />
                                <div className="w-1 h-1 rounded-full bg-gray-600" />
                            </motion.button>
                        </div>
                    );
                default: {
                    const value = task[fieldId];
                    return (
                        <span className="text-gray-700 font-medium text-sm">
                            {safeGetString(value)}
                        </span>
                    );
                }
            }
        },
        [check, getTaskInOutState, toggleRowDropdown]
    );

    const totalPages = Math.max(1, Math.ceil((pagination.total || 0) / (pagination.limit || 20)));
    const rowActionTask = activeRowDropdown
        ? tasks.find((t) => t.task_id === activeRowDropdown)
        : null;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-gradient-to-br from-gray-50 to-white rounded-2xl border border-gray-100 shadow-xl p-6 min-w-0 max-w-full overflow-x-hidden"
        >
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-6">
                <div className="space-y-2">
                    <h3 className="text-base sm:text-lg font-bold text-slate-800 bg-gradient-to-r from-blue-600 to-indigo-700 bg-clip-text text-transparent">
                        {isCaMode ? 'CA Task Management' : isAgentMode ? 'Agent Task Management' : 'Task Management'}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-600">
                        {isCaMode
                            ? 'Tasks assigned to this chartered accountant'
                            : isAgentMode
                                ? 'Tasks assigned to this agent'
                                : 'Track, assign, and manage client tasks efficiently'}
                    </p>
                </div>
                {checkPermissionSync('task_create') && (
                    <div className="flex items-center gap-3">
                        <motion.button
                            type="button"
                            onClick={handleOpenCreateTask}
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

            <div className="flex flex-col md:flex-row gap-4 mb-6 md:items-stretch min-w-0">
                <div className="w-full min-w-0 flex-1 flex items-center">
                    <input
                        type="text"
                        placeholder="Search tasks, descriptions, or assigned to..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full h-10 px-4 py-2 text-sm text-slate-700 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm transition-all duration-300"
                    />
                </div>
                <div className="flex w-full md:w-auto md:flex-none md:shrink-0 items-stretch gap-1.5 min-w-0 max-w-full">
                    {!isProfileScopedMode && (
                        <>
                            <div className="min-w-0 w-full md:w-[14rem]">
                                <CustomSelect
                                    options={firmOptions}
                                    value={optionByValue(firmOptions, selectedFirmId)}
                                    onChange={(opt) => setSelectedFirmId(opt ? opt.value : null)}
                                    getOptionLabel={(opt) => opt.label}
                                    getOptionValue={(opt) => opt.value}
                                    placeholder="All firms"
                                    searchPlaceholder="Search firm..."
                                    isClearable={false}
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
                        </>
                    )}
                </div>
                <div className="w-full md:min-w-0 md:max-w-sm md:w-64 min-w-0 flex items-center [&_button]:min-h-[40px]">
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
                        className="w-full min-w-0"
                    />
                </div>
            </div>

            {/* Same task table shell as `task-display` (TaskTable) */}
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm text-sm text-gray-700 min-w-0 overflow-hidden">
                <TaskTable
                    tasks={tasks}
                    selectedTasks={selectedTasks}
                    handleTaskSelect={handleTaskSelect}
                    selectAll={selectAll}
                    handleSelectAll={handleSelectAll}
                    columnConfig={columnConfig}
                    renderCellContent={renderCellContent}
                    loading={loading}
                    toggleRowDropdown={toggleRowDropdown}
                    activeRowDropdown={activeRowDropdown}
                    handleGetInOut={handleGetInOut}
                    getTaskInOutState={getTaskInOutState}
                    getInOutLoadingId={getInOutLoadingId}
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
                    fitContainer
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

            {rowActionTask &&
                typeof document !== 'undefined' &&
                createPortal(
                    <div
                        ref={rowDropdownRef}
                        className="task-row-action-menu fixed z-[10000] w-56 rounded-lg border border-gray-200 bg-white shadow-xl overflow-hidden"
                        style={{
                            top: `${rowDropdownPosition.top}px`,
                            left: `${rowDropdownPosition.left}px`,
                        }}
                    >
                        <div className="py-1">
                            {(() => {
                                const inOutState = getTaskInOutState(rowActionTask);
                                const isLoading = getInOutLoadingId === rowActionTask.task_id;

                                return (
                                    <>
                                        {inOutState.badge && (
                                            <div className={`px-4 py-2 text-xs font-medium border-b ${inOutState.mode === 'self'
                                                ? 'bg-emerald-50 text-emerald-800 border-emerald-100'
                                                : 'bg-amber-50 text-amber-800 border-amber-100'
                                                }`}>
                                                {inOutState.badge}
                                            </div>
                                        )}

                                        {inOutState.showGetIn && (
                                            <button
                                                type="button"
                                                disabled={isLoading}
                                                onClick={() => handleGetInOut(rowActionTask.task_id, 'in')}
                                                className="flex items-center w-full px-4 py-2.5 text-sm text-indigo-600 hover:bg-indigo-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                                            >
                                                {isLoading ? (
                                                    <FiLoader className="mr-2 text-indigo-600 w-4 h-4 animate-spin" />
                                                ) : (
                                                    <FiArrowLeft className="mr-2 text-indigo-600 w-4 h-4" />
                                                )}
                                                GET IN
                                            </button>
                                        )}

                                        {inOutState.showGetOut && (
                                            <button
                                                type="button"
                                                disabled={isLoading}
                                                onClick={() => handleGetInOut(rowActionTask.task_id, 'out')}
                                                className="flex items-center w-full px-4 py-2.5 text-sm text-orange-600 hover:bg-orange-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                                            >
                                                {isLoading ? (
                                                    <FiLoader className="mr-2 text-orange-600 w-4 h-4 animate-spin" />
                                                ) : (
                                                    <FiArrowRight className="mr-2 text-orange-600 w-4 h-4" />
                                                )}
                                                GET OUT
                                            </button>
                                        )}

                                        {(inOutState.showGetIn || inOutState.showGetOut) && (
                                            <div className="border-t my-1" />
                                        )}
                                    </>
                                );
                            })()}

                            {check('task_update') ? (
                                <button
                                    type="button"
                                    onClick={() => {
                                        openStatusModal(
                                            rowActionTask.task_id,
                                            rowActionTask.status,
                                            rowActionTask.service?.name || rowActionTask.service_name || ''
                                        );
                                    }}
                                    className="flex items-center w-full px-4 py-2.5 text-sm text-blue-600 hover:bg-blue-50 transition-colors"
                                >
                                    <FiCheckCircle className="mr-2 text-blue-600 w-4 h-4" />
                                    Change Status
                                </button>
                            ) : (
                                <button
                                    disabled
                                    className="flex items-center w-full px-4 py-2.5 text-sm text-gray-400 cursor-not-allowed opacity-60 bg-gray-50 transition-colors"
                                >
                                    <FiLock className="mr-2 text-gray-400 w-4 h-4" />
                                    Change Status
                                </button>
                            )}

                            {check('task_view') ? (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setActiveRowDropdown(null);
                                        navigate(`/task/${rowActionTask.task_id}`);
                                    }}
                                    className="flex items-center w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-indigo-50 transition-colors"
                                >
                                    <FiEye className="mr-2 text-indigo-600 w-4 h-4" />
                                    View Details
                                </button>
                            ) : (
                                <button
                                    disabled
                                    className="flex items-center w-full px-4 py-2.5 text-sm text-gray-400 cursor-not-allowed opacity-60 bg-gray-50 transition-colors"
                                >
                                    <FiLock className="mr-2 text-gray-400 w-4 h-4" />
                                    View Details
                                </button>
                            )}

                            {check('task_update') ? (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setActiveRowDropdown(null);
                                        handleEditTask(rowActionTask);
                                    }}
                                    className="flex items-center w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-green-50 transition-colors"
                                >
                                    <FiEdit className="mr-2 text-green-600 w-4 h-4" />
                                    Edit Task
                                </button>
                            ) : (
                                <button
                                    disabled
                                    className="flex items-center w-full px-4 py-2.5 text-sm text-gray-400 cursor-not-allowed opacity-60 bg-gray-50 transition-colors"
                                >
                                    <FiLock className="mr-2 text-green-600 w-4 h-4" />
                                    Edit Task
                                </button>
                            )}

                            <div className="border-t my-1" />

                            {check('task_delete') ? (
                                <button
                                    type="button"
                                    onClick={() => setActiveRowDropdown(null)}
                                    className="flex items-center w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                                >
                                    <FiTrash2 className="mr-2 w-4 h-4" />
                                    Delete Task
                                </button>
                            ) : (
                                <button
                                    disabled
                                    className="flex items-center w-full px-4 py-2.5 text-sm text-gray-400 cursor-not-allowed opacity-60 bg-gray-50 transition-colors"
                                >
                                    <FiLock className="mr-2 text-gray-400 w-4 h-4" />
                                    Delete Task
                                </button>
                            )}
                        </div>
                    </div>,
                    document.body
                )}

            <TaskStatusChange
                isOpen={statusModal.open}
                onClose={closeStatusModal}
                taskId={statusModal.taskId}
                taskName={statusModal.taskName}
                currentStatus={statusModal.currentStatus}
                onStatusChange={handleStatusChange}
                statusOptions={STATUS_OPTIONS}
            />

            <AssignedStaffList
                isOpen={usersModal.open}
                onClose={closeUsersModal}
                users={usersModal.users}
                taskName={usersModal.taskName}
            />
        </motion.div>
    );
};

export default TaskTab;
