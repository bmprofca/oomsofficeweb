import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FiAlertCircle,
  FiArrowLeft,
  FiArrowRight,
  FiBriefcase,
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiEdit,
  FiEye,
  FiLoader,
  FiLock,
  FiMail,
  FiPhone,
  FiRefreshCw,
  FiSearch,
  FiSlash,
  FiTrash2,
  FiUser,
  FiUsers,
} from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { Header, Sidebar } from '../components/header';
import TablePagination from '../components/TablePagination';
import AssignedStaffList from '../components/Modals/AssignedStaffList';
import TaskStatusChange from '../components/Modals/TaskStatusChange';
import DeleteConfirmationModal from '../components/delete-confirmation';
import TaskTable from '../TaskComponent/TaskTable';
import EditTaskModal from '../TaskComponent/EdittaskModal';
import CustomSelect from '../components/CustomSelect';
import useDebounce from '../components/useDebounce';
import getHeaders from '../utils/get-headers';
import API_BASE_URL from '../utils/api-controller';
import { useUserPermissions } from '../utils/permission-helper';
import { taskGetIn, taskGetOut } from '../services/taskService';
import { optionByValue } from '../utils/customSelectHelpers';

const getLoggedInUsername = () =>
  localStorage.getItem('user_username') || localStorage.getItem('username') || '';

const isBranchAdmin = () =>
  localStorage.getItem('branch_owned') === 'true' ||
  getLoggedInUsername().toLowerCase() === 'admin';

export const TASK_DETAIL_CATEGORIES = [
  'OD',
  'DT',
  'D7',
  'FT',
  'WIP',
  'PFC',
  'PFD',
  'CPL',
  'CNL',
];

export const CATEGORY_META = {
  OD: {
    title: 'Overdue Tasks',
    description: 'Past due date — needs immediate attention',
    Icon: FiAlertCircle,
    iconWrap: 'bg-rose-100 text-rose-600',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
    accentBar: 'from-rose-500 to-rose-600',
  },
  DT: {
    title: 'Due Today',
    description: 'Tasks due today',
    Icon: FiClock,
    iconWrap: 'bg-amber-100 text-amber-600',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
    accentBar: 'from-amber-500 to-amber-600',
  },
  D7: {
    title: 'Due in 7 Days',
    description: 'Tasks due within the next 7 days',
    Icon: FiCalendar,
    iconWrap: 'bg-orange-100 text-orange-600',
    badgeClass: 'bg-orange-50 text-orange-700 border-orange-200',
    accentBar: 'from-orange-500 to-orange-600',
  },
  FT: {
    title: 'Future Tasks',
    description: 'Tasks due later than 7 days',
    Icon: FiCalendar,
    iconWrap: 'bg-sky-100 text-sky-600',
    badgeClass: 'bg-sky-50 text-sky-700 border-sky-200',
    accentBar: 'from-sky-500 to-sky-600',
  },
  WIP: {
    title: 'Work In Progress',
    description: 'Tasks currently in process',
    Icon: FiLoader,
    iconWrap: 'bg-indigo-100 text-indigo-600',
    badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    accentBar: 'from-indigo-500 to-indigo-600',
  },
  PFC: {
    title: 'Pending From Client',
    description: 'Waiting on client input',
    Icon: FiUser,
    iconWrap: 'bg-violet-100 text-violet-600',
    badgeClass: 'bg-violet-50 text-violet-700 border-violet-200',
    accentBar: 'from-violet-500 to-violet-600',
  },
  PFD: {
    title: 'Pending From Department',
    description: 'Waiting on internal department',
    Icon: FiUsers,
    iconWrap: 'bg-yellow-100 text-yellow-700',
    badgeClass: 'bg-yellow-50 text-yellow-800 border-yellow-200',
    accentBar: 'from-yellow-500 to-yellow-600',
  },
  CPL: {
    title: 'Completed',
    description: 'Completed tasks',
    Icon: FiCheckCircle,
    iconWrap: 'bg-emerald-100 text-emerald-600',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    accentBar: 'from-emerald-500 to-emerald-600',
  },
  CNL: {
    title: 'Cancelled',
    description: 'Cancelled tasks',
    Icon: FiSlash,
    iconWrap: 'bg-slate-100 text-slate-600',
    badgeClass: 'bg-slate-50 text-slate-700 border-slate-200',
    accentBar: 'from-slate-500 to-slate-600',
  },
};

const ALL_SERVICE_OPTION = {
  value: '',
  label: 'All Services',
  name: 'All Services',
};

const STATUS_OPTIONS = [
  { value: 'in process', name: 'In Process', label: 'In Process' },
  { value: 'pending from client', name: 'Pending From Client', label: 'Pending From Client' },
  { value: 'pending from department', name: 'Pending From Department', label: 'Pending From Department' },
  { value: 'complete', name: 'Complete', label: 'Complete' },
  { value: 'cancel', name: 'Cancel', label: 'Cancel' },
];

const COLUMN_CONFIG = [
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
    id: '1',
    name: 'Client',
    items: [
      { id: 'client_name', label: 'Client Name' },
      { id: 'client_mobile', label: 'Mobile' },
      { id: 'client_email', label: 'Email' },
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
    items: [
      { id: 'staffs', label: 'Staffs' },
      { id: 'staff_ca', label: 'Show CA' },
      { id: 'staff_agent', label: 'Show Agent' },
    ],
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
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const getDaysLeft = (dueDate) => {
  if (!dueDate) return null;
  const due = new Date(dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  return Math.ceil((due - today) / (1000 * 60 * 60 * 24));
};

const formatDueDaysLabel = (dueDate) => {
  const daysLeft = getDaysLeft(dueDate);
  if (daysLeft === null || daysLeft === undefined) return null;
  if (daysLeft < 0) return `OD by ${Math.abs(daysLeft)}D`;
  if (daysLeft === 0) return 'Due today';
  return `Due in ${daysLeft}D`;
};

const getStatusStyle = (status) => {
  switch (status) {
    case 'in process':
      return 'bg-orange-100 text-orange-700';
    case 'pending from client':
      return 'bg-purple-100 text-purple-700';
    case 'pending from department':
      return 'bg-yellow-100 text-yellow-700';
    case 'complete':
      return 'bg-green-100 text-green-700';
    case 'cancel':
      return 'bg-red-100 text-red-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
};

const getStatusText = (status) => {
  switch (status) {
    case 'in process':
      return 'In Process';
    case 'pending from client':
      return 'PFC';
    case 'pending from department':
      return 'PFD';
    case 'complete':
      return 'Complete';
    case 'cancel':
      return 'Cancel';
    default:
      return status || '—';
  }
};

const normalizeCategory = (value) => String(value || '').trim().toUpperCase();

const fetchGeneralServices = async () => {
  const headers = getHeaders();
  const collected = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const response = await fetch(
      `${API_BASE_URL}/service/list?search=&page_no=${page}&limit=100&added_only=true&type=general`,
      { headers },
    );
    const data = await response.json();
    if (!data.success) break;
    collected.push(...(data.data || []));
    hasMore = data.pagination?.is_last_page === false;
    page += 1;
  }

  return collected;
};

const mapReportTaskToDisplayTask = (row) => {
  const details = row.task_details || {};
  const financials = row.financials || {};
  const assignment = row.assignment || {};
  const staffs = (assignment.staff || []).map((staff) => ({
    username: staff.username,
    name: staff.name || staff.profile?.name || staff.username,
    email: staff.profile?.email || staff.email || '',
    mobile: staff.profile?.mobile || staff.mobile || '',
  }));

  return {
    task_id: row.task_id,
    status: details.status || null,
    billing_status: financials.billing_status || null,
    has_ca: Boolean(assignment.ca),
    has_agent: Boolean(assignment.agent),
    ca: assignment.ca || null,
    agent: assignment.agent || null,
    in_user: row.in_user || assignment.in_user || null,
    is_recurring: details.task_kind === 'recurring',
    service: {
      service_id: row.service?.service_id,
      name: row.service?.service_name || row.service?.name,
    },
    client: {
      username: row.client?.username,
      name: row.client?.name,
      profile: {
        name: row.client?.name,
        email: row.client?.email,
        mobile: row.client?.phone || row.client?.mobile,
      },
    },
    firm: {
      firm_id: row.firm?.firm_id,
      firm_name: row.firm?.firm_name,
    },
    charges: {
      fees: financials.fees,
      tax_rate: financials.tax_rate,
      tax_value: financials.tax_value,
      total: financials.total,
    },
    dates: {
      due_date: details.due_date,
      create_date: details.create_date,
      complete_date: details.complete_date,
      target_date: details.target_date,
    },
    staffs,
    _raw: row,
  };
};

export const taskDetailedPath = (category, serviceId = '') => {
  const code = normalizeCategory(category).toLowerCase();
  const params = new URLSearchParams();
  if (serviceId && serviceId !== 'null' && serviceId !== 'undefined') {
    params.set('service_id', serviceId);
  }
  const query = params.toString();
  return `/task/detailed/${code}${query ? `?${query}` : ''}`;
};

/** Redirect `/task/detailed?category=OD` → `/task/detailed/od` */
export const TaskDetailedLegacyRedirect = () => {
  const [searchParams] = useSearchParams();
  const category = normalizeCategory(searchParams.get('category'));
  const serviceId = searchParams.get('service_id') || '';

  if (!TASK_DETAIL_CATEGORIES.includes(category)) {
    return <Navigate to="/" replace />;
  }

  return <Navigate to={taskDetailedPath(category, serviceId)} replace />;
};

const TaskDetailedPage = ({ category: categoryProp } = {}) => {
  const navigate = useNavigate();
  const params = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { check } = useUserPermissions();

  const category = normalizeCategory(categoryProp || params.category);
  const serviceId = searchParams.get('service_id') || '';

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(() => {
    const saved = localStorage.getItem('sidebarMinimized');
    return saved ? JSON.parse(saved) : false;
  });

  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [serviceOptions, setServiceOptions] = useState([ALL_SERVICE_OPTION]);
  const [servicesLoading, setServicesLoading] = useState(false);
  const [pagination, setPagination] = useState({
    page_no: 1,
    limit: 20,
    total: 0,
    total_pages: 1,
    is_last_page: true,
  });
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 400);
  const [statusFilter, setStatusFilter] = useState(null);
  const [selectedTasks, setSelectedTasks] = useState(new Set());
  const [activeRowDropdown, setActiveRowDropdown] = useState(null);
  const [rowDropdownPosition, setRowDropdownPosition] = useState({ top: 8, left: 8 });
  const [getInOutLoadingId, setGetInOutLoadingId] = useState(null);
  const [deleteModal, setDeleteModal] = useState(false);
  const [editModal, setEditModal] = useState({ open: false, taskData: null });
  const [usersModal, setUsersModal] = useState({ open: false, users: [], taskName: '' });
  const [statusModal, setStatusModal] = useState({
    open: false,
    taskId: null,
    taskName: '',
    currentStatus: '',
  });

  const rowMenuButtonRefs = useRef({});
  const rowDropdownRef = useRef(null);
  const rowContextPositionRef = useRef(null);

  useEffect(() => {
    localStorage.setItem('sidebarMinimized', JSON.stringify(isMinimized));
  }, [isMinimized]);

  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? 'hidden' : 'auto';
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [mobileMenuOpen]);

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
    return () => document.removeEventListener('mousedown', handleOutsideMenuClick);
  }, [activeRowDropdown]);

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
    if (!activeRowDropdown || String(activeRowDropdown).startsWith('mobile-')) {
      return undefined;
    }

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
  }, [activeRowDropdown, tasks, isMinimized]);

  useEffect(() => {
    if (
      activeRowDropdown &&
      !String(activeRowDropdown).startsWith('mobile-') &&
      !tasks.some((t) => t.task_id === activeRowDropdown)
    ) {
      setActiveRowDropdown(null);
    }
  }, [tasks, activeRowDropdown]);

  const meta = CATEGORY_META[category] || {
    title: category || 'Tasks',
    description: '',
    Icon: FiBriefcase,
    iconWrap: 'bg-slate-100 text-slate-600',
    badgeClass: 'bg-slate-50 text-slate-700 border-slate-200',
    accentBar: 'from-slate-500 to-slate-600',
  };
  const CategoryIcon = meta.Icon || FiBriefcase;

  const selectedService = useMemo(() => {
    if (!serviceId || serviceId === 'null' || serviceId === 'undefined') {
      return ALL_SERVICE_OPTION;
    }
    return (
      optionByValue(serviceOptions, serviceId) || {
        value: serviceId,
        label: 'Selected service',
        name: 'Selected service',
      }
    );
  }, [serviceId, serviceOptions]);

  const handleServiceChange = (option) => {
    const nextId = option?.value ? String(option.value) : '';
    const nextParams = new URLSearchParams(searchParams);
    if (nextId) {
      nextParams.set('service_id', nextId);
    } else {
      nextParams.delete('service_id');
    }
    setSearchParams(nextParams, { replace: true });
  };

  useEffect(() => {
    let cancelled = false;

    const loadServices = async () => {
      setServicesLoading(true);
      try {
        const services = await fetchGeneralServices();
        if (cancelled) return;
        setServiceOptions([
          ALL_SERVICE_OPTION,
          ...services.map((service) => {
            const label = service.name || service.service_name || service.service_id;
            return {
              value: service.service_id,
              label,
              name: label,
            };
          }),
        ]);
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to load services:', error);
          toast.error('Failed to load services');
        }
      } finally {
        if (!cancelled) setServicesLoading(false);
      }
    };

    loadServices();
    return () => {
      cancelled = true;
    };
  }, []);

  const fetchDetailedTasks = useCallback(async () => {
    if (!TASK_DETAIL_CATEGORIES.includes(category)) return;

    setLoading(true);
    try {
      const paramsObj = new URLSearchParams({
        category,
        page_no: String(pagination.page_no),
        limit: String(pagination.limit),
      });
      if (serviceId && serviceId !== 'null' && serviceId !== 'undefined') {
        paramsObj.set('service_id', serviceId);
      }
      if (debouncedSearch.trim()) {
        paramsObj.set('search', debouncedSearch.trim());
      }
      if (statusFilter?.value) {
        paramsObj.set('status_filter', statusFilter.value);
      }

      const response = await fetch(
        `${API_BASE_URL}/report/task-detailed?${paramsObj.toString()}`,
        { headers: getHeaders() },
      );
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || 'Failed to load tasks');
      }

      const mapped = (Array.isArray(data.data) ? data.data : [])
        .filter((row) => row?.task_id)
        .map(mapReportTaskToDisplayTask);

      setTasks(mapped);
      setPagination((prev) => ({
        ...prev,
        ...(data.pagination || {}),
        page_no: data.pagination?.page_no || prev.page_no,
        limit: data.pagination?.limit || prev.limit,
        total: data.pagination?.total ?? mapped.length,
        total_pages: data.pagination?.total_pages || 1,
        is_last_page: data.pagination?.is_last_page ?? true,
      }));
    } catch (error) {
      console.error('Error fetching detailed tasks:', error);
      toast.error(error.message || 'Failed to load tasks');
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, [category, serviceId, pagination.page_no, pagination.limit, debouncedSearch, statusFilter]);

  useEffect(() => {
    fetchDetailedTasks();
  }, [fetchDetailedTasks]);

  useEffect(() => {
    setPagination((prev) => (prev.page_no === 1 ? prev : { ...prev, page_no: 1 }));
  }, [category, serviceId, debouncedSearch, statusFilter]);

  const handleTaskSelect = (taskId) => {
    setSelectedTasks((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedTasks.size === tasks.length) {
      setSelectedTasks(new Set());
    } else {
      setSelectedTasks(new Set(tasks.map((task) => task.task_id)));
    }
  };

  const openUsersModal = (staffs, taskName) => {
    setUsersModal({
      open: true,
      users: (staffs || []).map((staff) => ({
        username: staff.username,
        name: staff.name,
        email: staff.email,
        mobile: staff.mobile,
        role: 'Staff',
      })),
      taskName,
    });
  };

  const openStatusModal = (taskId, currentStatus, taskName = '') => {
    const derivedTaskName =
      taskName || tasks.find((task) => task.task_id === taskId)?.service?.name || '';
    setStatusModal({ open: true, taskId, taskName: derivedTaskName, currentStatus });
  };

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      const response = await fetch(`${API_BASE_URL}/task/change-status`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ task_ids: [taskId], status: newStatus }),
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.message || 'Failed to update status');
      toast.success(data.message || 'Status updated');
      setStatusModal({ open: false, taskId: null, taskName: '', currentStatus: '' });
      fetchDetailedTasks();
    } catch (error) {
      toast.error(error.message || 'Failed to update status');
    }
  };

  const canForceGetOut = () => isBranchAdmin() || check('task_get_in');

  const getTaskInOutState = (task) => {
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
  };

  const handleGetInOut = async (taskId, action) => {
    if (!taskId || getInOutLoadingId) return;

    setGetInOutLoadingId(taskId);
    setActiveRowDropdown(null);

    try {
      const responseData =
        action === 'in' ? await taskGetIn(taskId) : await taskGetOut(taskId);

      if (responseData?.success) {
        toast.success(
          responseData.message || (action === 'in' ? 'Get in successful' : 'Get out successful'),
        );
        setTasks((prev) =>
          prev.map((task) =>
            task.task_id === taskId
              ? {
                  ...task,
                  in_user:
                    action === 'in'
                      ? responseData.data?.in_user ?? task.in_user
                      : null,
                }
              : task,
          ),
        );
        return;
      }

      if (responseData?.in_user) {
        setTasks((prev) =>
          prev.map((task) =>
            task.task_id === taskId ? { ...task, in_user: responseData.in_user } : task,
          ),
        );
      }

      toast.error(responseData?.message || 'Operation failed');
    } catch (error) {
      const responseData = error.response?.data;
      if (responseData?.in_user) {
        setTasks((prev) =>
          prev.map((task) =>
            task.task_id === taskId ? { ...task, in_user: responseData.in_user } : task,
          ),
        );
      }
      toast.error(responseData?.message || error.message || 'Operation failed');
    } finally {
      setGetInOutLoadingId(null);
    }
  };

  const toggleRowDropdown = (taskId, buttonElement) => {
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
  };

  const handleRowContextMenu = (e, taskId) => {
    e.preventDefault();
    e.stopPropagation();
    rowContextPositionRef.current = { top: e.clientY, left: e.clientX };
    rowMenuButtonRefs.current[taskId] = null;
    setActiveRowDropdown(taskId);
  };

  const handleEditTask = (task) => {
    setEditModal({ open: true, taskData: task });
  };

  const safeGetString = (value, fallback = '-') => {
    if (!value) return fallback;
    if (typeof value === 'string') return value;
    if (typeof value === 'object') {
      return value.mobile || value.email || value.name || value.number || fallback;
    }
    return String(value);
  };

  const renderCellContent = (
    task,
    fieldId,
    _handleGetInOut,
    nav,
    openStatus,
    openUsers,
  ) => {
    const daysLeft = getDaysLeft(task.dates?.due_date);
    const isOverdue = daysLeft !== null && daysLeft < 0;

    switch (fieldId) {
      case 'client_name':
        return (
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-sm flex-shrink-0">
              <FiUser className="w-3.5 h-3.5 text-white" />
            </div>
            <button
              type="button"
              onClick={() =>
                task.client?.username
                  ? nav(`/client/profile/${task.client.username}`)
                  : undefined
              }
              className="font-semibold text-gray-800 text-sm hover:text-indigo-600 text-left"
            >
              {safeGetString(task.client?.profile?.name || task.client?.name)}
            </button>
          </div>
        );
      case 'client_mobile':
        return (
          <div className="flex items-center gap-2 text-gray-700 font-medium text-sm">
            <FiPhone className="w-3 h-3 text-gray-400" />
            {safeGetString(task.client?.profile?.mobile)}
          </div>
        );
      case 'client_email': {
        const email = safeGetString(task.client?.profile?.email);
        const truncated = email.length > 18 ? `${email.slice(0, 18)}...` : email;
        return (
          <div className="flex items-center gap-2 text-gray-700 font-medium text-sm" title={email}>
            <FiMail className="w-3 h-3 text-gray-400" />
            <span>{truncated}</span>
          </div>
        );
      }
      case 'firm_name':
        return (
          <div className="text-gray-700 font-medium text-sm">
            {safeGetString(task.firm?.firm_name)}
          </div>
        );
      case 'service_name':
        return (
          <button
            type="button"
            onClick={() => task.task_id && nav(`/task/${task.task_id}`)}
            className="font-semibold text-gray-800 text-sm hover:text-indigo-600 text-left"
          >
            {safeGetString(task.service?.name)}
          </button>
        );
      case 'fees': {
        const feesAmount = task.charges?.fees || 0;
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
      case 'due_date':
        return (
          <div className="flex items-center gap-1.5 text-gray-700 font-medium text-sm">
            <FiCalendar className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
            <span>{task.dates?.due_date ? formatDate(task.dates.due_date) : '-'}</span>
          </div>
        );
      case 'create_date':
        return (
          <div className="flex items-center gap-1.5 text-gray-700 font-medium text-sm">
            <FiClock className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
            <span>{task.dates?.create_date ? formatDate(task.dates.create_date) : '-'}</span>
          </div>
        );
      case 'due_days': {
        const label = formatDueDaysLabel(task.dates?.due_date);
        if (!label) return <span className="text-gray-400 text-sm">-</span>;
        return (
          <span
            className={`text-sm font-semibold ${
              isOverdue ? 'text-red-600' : daysLeft <= 7 ? 'text-orange-600' : 'text-green-600'
            }`}
          >
            {label}
          </span>
        );
      }
      case 'staffs': {
        const staffs = task.staffs || [];
        const caName =
          task.has_ca && task.ca ? safeGetString(task.ca.name || task.ca.username) : null;
        const agentName =
          task.has_agent && task.agent
            ? safeGetString(task.agent.name || task.agent.username)
            : null;

        if (!staffs.length && !caName && !agentName) {
          return <span className="text-gray-400 text-sm">-</span>;
        }

        return (
          <div className="flex flex-col items-start gap-1.5">
            {staffs.length > 0 ? (
              <button
                type="button"
                onClick={() => openUsers(staffs, task.service?.name || '')}
                className="flex -space-x-2"
              >
                {staffs.slice(0, 2).map((staff, idx) => (
                  <div
                    key={staff.username || idx}
                    className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-full border-2 border-white flex items-center justify-center text-xs font-bold text-white"
                    title={staff.name}
                  >
                    {(staff.name || 'S').charAt(0).toUpperCase()}
                  </div>
                ))}
                {staffs.length > 2 ? (
                  <div className="w-8 h-8 bg-gray-200 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-bold text-gray-700">
                    +{staffs.length - 2}
                  </div>
                ) : null}
              </button>
            ) : null}
            {caName ? (
              <span className="text-[10px] font-semibold text-violet-700 bg-violet-50 px-1.5 py-0.5 rounded">
                CA: {caName}
              </span>
            ) : null}
            {agentName ? (
              <span className="text-[10px] font-semibold text-sky-700 bg-sky-50 px-1.5 py-0.5 rounded">
                Agent: {agentName}
              </span>
            ) : null}
          </div>
        );
      }
      case 'status':
        return (
          <button
            type="button"
            onClick={() => openStatus(task.task_id, task.status, task.service?.name || '')}
            className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${getStatusStyle(
              task.status,
            )} hover:opacity-90`}
          >
            {getStatusText(task.status)}
          </button>
        );
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
      default:
        return <span className="text-gray-400 text-sm">-</span>;
    }
  };

  const rowActionTask =
    activeRowDropdown && !String(activeRowDropdown).startsWith('mobile-')
      ? tasks.find((t) => t.task_id === activeRowDropdown)
      : null;

  if (!TASK_DETAIL_CATEGORIES.includes(category)) {
    return <Navigate to="/" replace />;
  }

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

      <div
        className={`pt-16 transition-all duration-300 ${
          isMinimized ? 'md:pl-20' : 'md:pl-[260px]'
        }`}
      >
        <div className="mx-2 sm:mx-4 md:mx-6 my-3 space-y-3">
          {/* Compact page header */}
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="px-3 py-2.5 sm:px-4 flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${meta.iconWrap}`}
                >
                  <CategoryIcon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-base sm:text-lg font-semibold text-slate-900 m-0 leading-tight">
                      {meta.title}
                    </h1>
                    <span
                      className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${meta.badgeClass}`}
                    >
                      {category}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 mb-0 truncate">{meta.description}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={fetchDetailedTasks}
                disabled={loading}
                className="inline-flex items-center justify-center gap-1.5 self-start sm:self-auto rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-800 disabled:opacity-50 transition-colors"
              >
                <FiRefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>

          {/* Filters + table */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2.5 p-3 border-b border-gray-100 bg-gradient-to-r from-slate-50 to-white">
              <div className="lg:col-span-4">
                <label className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1">
                  <FiBriefcase className="w-3 h-3" />
                  Service
                </label>
                <CustomSelect
                  options={serviceOptions}
                  value={selectedService}
                  onChange={handleServiceChange}
                  placeholder={servicesLoading ? 'Loading services…' : 'All Services'}
                  isClearable
                  isSearchable
                  isDisabled={servicesLoading}
                />
              </div>
              <div className="lg:col-span-3">
                <label className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1">
                  <FiCheckCircle className="w-3 h-3" />
                  Status
                </label>
                <CustomSelect
                  options={STATUS_OPTIONS}
                  value={statusFilter}
                  onChange={(option) => setStatusFilter(option || null)}
                  placeholder="All statuses"
                  isClearable
                  isSearchable={false}
                />
              </div>
              <div className="sm:col-span-2 lg:col-span-5">
                <label className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1">
                  <FiSearch className="w-3 h-3" />
                  Search
                </label>
                <div className="relative">
                  <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Client, firm, service, task ID…"
                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="min-h-[320px]">
              <TaskTable
                tasks={tasks}
                selectedTasks={selectedTasks}
                handleTaskSelect={handleTaskSelect}
                selectAll={selectedTasks.size > 0 && selectedTasks.size === tasks.length}
                isSelectionIndeterminate={
                  selectedTasks.size > 0 && selectedTasks.size < tasks.length
                }
                handleSelectAll={handleSelectAll}
                columnConfig={COLUMN_CONFIG}
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
                openClientDetailsModal={() => {}}
                handleEditTask={handleEditTask}
                navigate={navigate}
                formatDate={formatDate}
                getDaysLeft={getDaysLeft}
                getStatusStyle={getStatusStyle}
                getStatusText={getStatusText}
                onRowContextMenu={handleRowContextMenu}
              />
            </div>

            {!loading ? (
              <TablePagination
                page={pagination.page_no}
                limit={pagination.limit}
                total={pagination.total}
                totalPages={Math.max(1, pagination.total_pages || 1)}
                onPageChange={(page) =>
                  setPagination((prev) => ({ ...prev, page_no: page }))
                }
                onLimitChange={(limit) =>
                  setPagination((prev) => ({ ...prev, page_no: 1, limit }))
                }
              />
            ) : null}
          </div>
        </div>
      </div>

      <AssignedStaffList
        isOpen={usersModal.open}
        onClose={() => setUsersModal({ open: false, users: [], taskName: '' })}
        users={usersModal.users}
        taskName={usersModal.taskName}
      />

      <TaskStatusChange
        isOpen={statusModal.open}
        onClose={() =>
          setStatusModal({ open: false, taskId: null, taskName: '', currentStatus: '' })
        }
        taskId={statusModal.taskId}
        taskName={statusModal.taskName}
        currentStatus={statusModal.currentStatus}
        onStatusChange={handleStatusChange}
        statusOptions={STATUS_OPTIONS}
      />

      <EditTaskModal
        isOpen={editModal.open}
        onClose={() => setEditModal({ open: false, taskData: null })}
        taskData={editModal.taskData}
        onTaskUpdated={fetchDetailedTasks}
      />

      {deleteModal ? (
        <DeleteConfirmationModal
          title="Task Delete"
          onConfirm={() => setDeleteModal(false)}
        />
      ) : null}

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
                    {inOutState.badge ? (
                      <div
                        className={`px-4 py-2 text-xs font-medium border-b ${
                          inOutState.mode === 'self'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-100'
                            : 'bg-amber-50 text-amber-800 border-amber-100'
                        }`}
                      >
                        {inOutState.badge}
                      </div>
                    ) : null}

                    {inOutState.showGetIn ? (
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
                    ) : null}

                    {inOutState.showGetOut ? (
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
                    ) : null}

                    {inOutState.showGetIn || inOutState.showGetOut ? (
                      <div className="border-t my-1" />
                    ) : null}
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
                      rowActionTask.service?.name || '',
                    );
                    setActiveRowDropdown(null);
                  }}
                  className="flex items-center w-full px-4 py-2.5 text-sm text-blue-600 hover:bg-blue-50 transition-colors"
                >
                  <FiCheckCircle className="mr-2 text-blue-600 w-4 h-4" />
                  Change Status
                </button>
              ) : (
                <button
                  type="button"
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
                  type="button"
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
                  type="button"
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
                  onClick={() => {
                    setActiveRowDropdown(null);
                    setDeleteModal(true);
                  }}
                  className="flex items-center w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <FiTrash2 className="mr-2 w-4 h-4" />
                  Delete Task
                </button>
              ) : (
                <button
                  type="button"
                  disabled
                  className="flex items-center w-full px-4 py-2.5 text-sm text-gray-400 cursor-not-allowed opacity-60 bg-gray-50 transition-colors"
                >
                  <FiLock className="mr-2 text-gray-400 w-4 h-4" />
                  Delete Task
                </button>
              )}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
};

export default TaskDetailedPage;
