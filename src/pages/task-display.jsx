// TaskDisplay.jsx
import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Sidebar, Header } from '../components/header';
import { useNavigate, useNavigationType } from 'react-router-dom';
import { useTaskCreate } from '../context/TaskCreateProvider';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FiUsers, FiBriefcase, FiCalendar, FiUserCheck,
    FiUserPlus, FiFileText, FiPlus, FiSearch, FiRefreshCw,
    FiPaperclip, FiX, FiMic, FiStopCircle, FiDownload, FiTrash2,
    FiArrowRight, FiArrowLeft, FiUser, FiLoader, FiCheckCircle,
    FiXCircle, FiClock, FiMenu, FiEdit, FiEye, FiSettings, FiLock,
    FiGrid, FiMail, FiPrinter, FiPhone, FiFilter, FiMessageSquare,
    FiMove, FiSave, FiList, FiChevronDown, FiChevronUp, FiMapPin,
    FiCreditCard, FiHome, FiMap, FiGlobe
} from 'react-icons/fi';

import { FaWhatsapp, FaFileCsv } from "react-icons/fa6";
import { PiFilePdfDuotone, PiMicrosoftExcelLogoDuotone } from "react-icons/pi";
import toast from 'react-hot-toast';
import {
    loadListViewCache,
    saveListViewCache,
    isBrowserBackNav,
    getScrollTopById,
    enableManualScrollRestoration,
} from '../utils/listViewCache';

// Import components
import TaskTable from '../TaskComponent/TaskTable';
import TaskCards from '../TaskComponent/TaskCards';
import SettingsModal from '../TaskComponent/SettingsModal';
import MultiSelectInput from '../components/MultiSelectInput';
import AssignedStaffList from '../components/Modals/AssignedStaffList';
import TaskStatusChange from '../components/Modals/TaskStatusChange';
import TablePagination from '../components/TablePagination';
import ExportModal from '../TaskComponent/Export';

// Import other modals
import DeleteConfirmationModal from '../components/delete-confirmation';
import EditTaskModal from '../TaskComponent/EdittaskModal';

// Import API utilities
import getHeaders from '../utils/get-headers';
import API_BASE_URL from '../utils/api-controller';
import { useUserPermissions, checkPermissionSync } from '../utils/permission-helper';
import { taskGetIn, taskGetOut } from '../services/taskService';

const getLoggedInUsername = () =>
    localStorage.getItem('user_username') || localStorage.getItem('username') || '';

const isBranchAdmin = () =>
    localStorage.getItem('branch_owned') === 'true' ||
    getLoggedInUsername().toLowerCase() === 'admin';

// ============================================
// CONSTANTS & HELPERS
// ============================================

const statusOptions = [
    { value: 'unassign', name: 'Unassign' },
    { value: 'in process', name: 'In Process' },
    { value: 'pending from client', name: 'Pending from Client' },
    { value: 'pending from department', name: 'Pending from Department' },
    { value: 'complete', name: 'Complete' },
    { value: 'cancel', name: 'Cancel' }
];
const DEFAULT_SELECTED_STATUSES = ['in process', 'pending from client', 'pending from department'];

// Persist list view state (filters + pagination + row data) so browser Back
// restores the same page/UI without an immediate API reset.
const TASK_LIST_STATE_KEY = 'taskListViewState';
const TASK_LIST_SCROLL_ID = 'task-table-scroll';

const buildTaskListFingerprint = (filters = {}, pagination = {}) =>
    JSON.stringify({
        search: filters.search || '',
        username: filters.username || '',
        firm_id: filters.firm_id || '',
        service_id: filters.service_id || '',
        status: [...(filters.status || [])].map(String).sort(),
        service_ids: [...(filters.service_ids || [])].map(String).sort(),
        page_no: Number(pagination.page_no) || 1,
        limit: Number(pagination.limit) || 20,
    });

const loadSavedTaskListState = () => loadListViewCache(TASK_LIST_STATE_KEY);

const STAFF_TABLE_META_FIELD_IDS = new Set(['staff_ca', 'staff_agent']);

const availableFields = [
    { id: 'task_id', label: 'Task ID', type: 'text' },
    { id: 'client_name', label: 'Client Name', type: 'text' },
    { id: 'client_mobile', label: 'Client Mobile', type: 'text' },
    { id: 'client_email', label: 'PAN / File', type: 'text' },
    { id: 'firm_name', label: 'Firm Name', type: 'text' },
    { id: 'service_name', label: 'Service Name', type: 'text' },
    { id: 'fees', label: 'Fees', type: 'currency' },
    { id: 'due_date', label: 'Due Date', type: 'date' },
    { id: 'create_date', label: 'Create Date', type: 'date' },
    { id: 'due_days', label: 'Due Days', type: 'text' },
    { id: 'billing_status', label: 'Billing Status', type: 'text' },
    { id: 'status', label: 'Status', type: 'status' },
    { id: 'staffs', label: 'Staffs', type: 'array' },
    { id: 'is_recurring', label: 'Is Compliance', type: 'boolean' },
    { id: 'create_by', label: 'Created By', type: 'text' },
    { id: 'menu', label: 'Actions', type: 'actions' }
];

const defaultColumnConfig = [
    {
        id: '2',
        name: 'Task',
        items: [
            { id: 'service_name', label: 'Service Name' },
            { id: 'fees', label: 'Fees' },
            { id: 'firm_name', label: 'Firm Name' }
        ],
        fixed: false
    },
    {
        id: '1',
        name: 'Client',
        items: [
            { id: 'client_name', label: 'Client Name' },
            { id: 'client_mobile', label: 'Mobile' },
            { id: 'client_email', label: 'PAN / File' }
        ],
        fixed: false
    },
    {
        id: '3',
        name: 'Dates',
        items: [
            { id: 'create_date', label: 'Create Date' },
            { id: 'due_date', label: 'Due Date' },
            { id: 'due_days', label: 'Show Due Days' }
        ],
        fixed: false
    },
    {
        id: '4',
        name: 'Staffs',
        items: [
            { id: 'staffs', label: 'Staffs' },
            { id: 'staff_ca', label: 'Show CA' },
            { id: 'staff_agent', label: 'Show Agent' }
        ],
        fixed: false
    },
    {
        id: '5',
        name: 'Status',
        items: [
            { id: 'status', label: 'Status' }
        ],
        fixed: true
    },
    {
        id: '6',
        name: 'Action',
        items: [
            { id: 'menu', label: 'Actions' }
        ],
        fixed: true
    }
];

const normalizeColumnConfig = (columns) => {
    if (!Array.isArray(columns)) return defaultColumnConfig;

    return columns.map((col) => {
        let items = (col.items || []).map((item) => {
            if (item.id === 'target_date') {
                return { ...item, id: 'due_days', label: 'Show Due Days' };
            }
            return item;
        });

        if (items.some((item) => item.id === 'staffs')) {
            if (!items.some((item) => item.id === 'staff_ca')) {
                items = [...items, { id: 'staff_ca', label: 'Show CA' }];
            }
            if (!items.some((item) => item.id === 'staff_agent')) {
                items = [...items, { id: 'staff_agent', label: 'Show Agent' }];
            }
        }

        return {
            ...col,
            name: col.name === 'Task Details' ? 'Task' : col.name,
            fixed: col.name === 'Status' || col.name === 'Action',
            items,
        };
    });
};

const migrateHiddenFields = (hiddenFields, columns) => {
    const next = { ...(hiddenFields || {}) };
    (columns || []).forEach((col) => {
        const oldKey = `${col.id}_target_date`;
        const newKey = `${col.id}_due_days`;
        if (next[oldKey] !== undefined && next[newKey] === undefined) {
            next[newKey] = next[oldKey];
            delete next[oldKey];
        }
    });
    return next;
};

// Helper functions
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

const formatDueDaysLabel = (dueDate) => {
    if (!dueDate) return null;
    const daysLeft = getDaysLeft(dueDate);
    if (daysLeft === null || daysLeft === undefined) return null;
    if (daysLeft < 0) return `OD by ${Math.abs(daysLeft)}D`;
    if (daysLeft === 0) return 'Due today';
    return `Due in ${daysLeft}D`;
};

const getStatusStyle = (status) => {
    switch (status) {
        case 'unassign': return 'bg-blue-50 text-blue-700 border-blue-200';
        case 'in process': return 'bg-orange-50 text-orange-700 border-orange-200';
        case 'pending from client': return 'bg-purple-50 text-purple-700 border-purple-200';
        case 'pending from department': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
        case 'complete': return 'bg-green-50 text-green-700 border-green-200';
        case 'cancel': return 'bg-red-50 text-red-700 border-red-200';
        default: return 'bg-gray-50 text-gray-700 border-gray-200';
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

const getStatusColor = (status) => {
    switch (status) {
        case 'unassign': return 'bg-blue-100 text-blue-700';
        case 'in process': return 'bg-orange-100 text-orange-700';
        case 'pending from client': return 'bg-purple-100 text-purple-700';
        case 'pending from department': return 'bg-yellow-100 text-yellow-700';
        case 'complete': return 'bg-green-100 text-green-700';
        case 'cancel': return 'bg-red-100 text-red-700';
        default: return 'bg-gray-100 text-gray-700';
    }
};

const formatStatus = (status) => {
    switch (status) {
        case 'unassign': return 'Unassign';
        case 'in process': return 'In Process';
        case 'pending from client': return 'PFC';
        case 'pending from department': return 'PFD';
        case 'complete': return 'Complete';
        case 'cancel': return 'Cancel';
        default: return status;
    }
};

// ============================================
// SUB-COMPONENTS
// ============================================

const TableViewSwitch = ({ viewMode, setViewMode }) => (
    <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
        <motion.button
            onClick={() => setViewMode('table')}
            className={`flex items-center gap-2 px-3 py-2 rounded-md transition-all ${viewMode === 'table' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-600'}`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
        >
            <FiList className="w-4 h-4" />
            <span className="text-xs font-medium hidden sm:inline">Table</span>
        </motion.button>

        <motion.button
            onClick={() => setViewMode('card')}
            className={`flex items-center gap-2 px-3 py-2 rounded-md transition-all ${viewMode === 'card' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-600'}`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
        >
            <FiGrid className="w-4 h-4" />
            <span className="text-xs font-medium hidden sm:inline">Cards</span>
        </motion.button>
    </div>
);

const FilterRow = ({ filters, setFilters, serviceOptions, statusOptions, onSearch, onReset, showFilterRow, setShowFilterRow }) => {
    if (!showFilterRow) return null;

    return (
        <motion.div
            className="bg-gray-50 border-b border-gray-200 px-4 py-3"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
        >
            <div className="flex flex-wrap items-center gap-3">

                <div className="flex-1 min-w-[200px]">
                    <div className="relative">
                        <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Search..."
                            value={filters.search}
                            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-gray-700 text-sm focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                </div>

                <div className="min-w-[220px]">
                    <MultiSelectInput
                        options={statusOptions
                            .filter((status) => status.value !== 'unassign')
                            .map((status) => ({ ...status, label: status.name }))}
                        value={filters.status}
                        onChange={(values) => setFilters((prev) => ({ ...prev, status: values }))}
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

                <div className="min-w-[220px]">
                    <MultiSelectInput
                        options={serviceOptions.map((service) => ({ ...service, label: service.name }))}
                        value={filters.service_ids}
                        onChange={(values) => setFilters((prev) => ({ ...prev, service_ids: values }))}
                        placeholder="Select Services"
                        allSelectedLabel="All"
                        treatEmptyAsAll={true}
                        searchPlaceholder="Search services..."
                        showSearch={true}
                        showSelectActions={true}
                        valueKey="value"
                        labelKey="label"
                        className="w-full"
                    />
                </div>

                <div className="flex items-center gap-2">
                    <motion.button
                        onClick={onSearch}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 flex items-center gap-2"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        <FiFilter className="w-4 h-4" /> Apply
                    </motion.button>

                    <motion.button
                        onClick={onReset}
                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-100"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        Reset
                    </motion.button>
                </div>
            </div>
        </motion.div>
    );
};

// Client Details Modal
const ClientDetailsModal = ({ isOpen, onClose, clientData, loading }) => {
    if (!isOpen) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                >
                    <motion.div
                        className="bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-auto overflow-hidden"
                        initial={{ scale: 0.95, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 20 }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white px-6 py-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center overflow-hidden">
                                        {clientData?.basic?.image ? (
                                            <img src={clientData.basic.image} alt={clientData.basic.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <FiUser className="w-6 h-6 text-white" />
                                        )}
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold">Client Details</h3>
                                        <p className="text-indigo-100 text-sm">{clientData?.basic?.name || 'Client Information'}</p>
                                    </div>
                                </div>
                                <motion.button
                                    onClick={onClose}
                                    className="text-white p-2 rounded-lg hover:bg-white/10"
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                >
                                    <FiX className="w-5 h-5" />
                                </motion.button>
                            </div>
                        </div>

                        <div className="p-6 max-h-[70vh] overflow-y-auto">
                            {loading ? (
                                <div className="flex justify-center py-8">
                                    <FiLoader className="w-8 h-8 text-indigo-600 animate-spin" />
                                </div>
                            ) : clientData ? (
                                <div className="space-y-6">
                                    <div>
                                        <h4 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                                            <FiUser className="w-4 h-4 text-indigo-600" />Basic Information
                                        </h4>
                                        <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                                            <div>
                                                <p className="text-xs text-gray-500">Full Name</p>
                                                <p className="font-medium text-gray-800">{clientData.basic?.name || 'N/A'}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-500">Care Of</p>
                                                <p className="font-medium text-gray-800">{clientData.basic?.care_of || 'N/A'}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-500">Guardian Name</p>
                                                <p className="font-medium text-gray-800">{clientData.basic?.guardian_name || 'N/A'}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-500">Date of Birth</p>
                                                <p className="font-medium text-gray-800">{formatDate(clientData.basic?.date_of_birth)}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-500">Gender</p>
                                                <p className="font-medium text-gray-800 capitalize">{clientData.basic?.gender || 'N/A'}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-500">PAN Number</p>
                                                <p className="font-medium text-gray-800">{clientData.basic?.pan_number || 'N/A'}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-500">Status</p>
                                                <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${clientData.basic?.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                    {clientData.basic?.is_active ? 'Active' : 'Inactive'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <h4 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                                            <FiMail className="w-4 h-4 text-indigo-600" />Contact Information
                                        </h4>
                                        <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                                            <div>
                                                <p className="text-xs text-gray-500">Mobile</p>
                                                <p className="font-medium text-gray-800">
                                                    {clientData.basic?.country_code ? `+${clientData.basic.country_code} ` : ''}
                                                    {clientData.basic?.mobile || 'N/A'}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-500">Email</p>
                                                <p className="font-medium text-gray-800">{clientData.basic?.email || 'N/A'}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-8">
                                    <p className="text-gray-500">No client data available</p>
                                </div>
                            )}
                        </div>

                        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                            <div className="flex justify-end">
                                <motion.button
                                    onClick={onClose}
                                    className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-lg hover:from-indigo-700 hover:to-indigo-800 font-medium text-sm"
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    Close
                                </motion.button>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

// ============================================
// MAIN COMPONENT
// ============================================

const TaskDisplay = () => {
    const { check } = useUserPermissions();
    const navigate = useNavigate();
    const navigationType = useNavigationType();
    const { openTaskCreate } = useTaskCreate();

    const savedListStateRef = useRef(loadSavedTaskListState());
    const initialFilters = {
        search: '',
        username: '',
        firm_id: '',
        service_id: '',
        status: DEFAULT_SELECTED_STATUSES,
        service_ids: [],
        ...(savedListStateRef.current?.filters || {}),
    };
    const initialPagination = {
        page_no: Math.max(1, Number(savedListStateRef.current?.pagination?.page_no) || 1),
        limit: Math.max(1, Number(savedListStateRef.current?.pagination?.limit) || 20),
        total: Math.max(0, Number(savedListStateRef.current?.pagination?.total) || 0),
    };
    const initialFingerprint = buildTaskListFingerprint(initialFilters, initialPagination);
    const canRestoreList =
        isBrowserBackNav(navigationType) &&
        Array.isArray(savedListStateRef.current?.tasks) &&
        savedListStateRef.current?.fingerprint === initialFingerprint;

    // State declarations
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(() => {
        const saved = localStorage.getItem('sidebarMinimized');
        return saved ? JSON.parse(saved) : false;
    });
    const [loading, setLoading] = useState(!canRestoreList);
    const [settingsModalOpen, setSettingsModalOpen] = useState(false);
    const [columnConfig, setColumnConfig] = useState([]);
    const [selectedTasks, setSelectedTasks] = useState(new Set());
    const [activeRowDropdown, setActiveRowDropdown] = useState(null);
    const [exportModal, setExportModal] = useState({ open: false, type: '', data: null });
    const [deleteModal, setDeleteModal] = useState(false);
    const [showMoreMenu, setShowMoreMenu] = useState(false);
    const [viewMode, setViewMode] = useState(
        () => savedListStateRef.current?.viewMode || 'table'
    );
    const [isMobile, setIsMobile] = useState(false);
    const [statusModal, setStatusModal] = useState({ open: false, taskId: null, taskName: '', currentStatus: '' });
    const [usersModal, setUsersModal] = useState({ open: false, users: [], taskName: '' });
    const [showFilterRow, setShowFilterRow] = useState(
        () => Boolean(savedListStateRef.current?.showFilterRow)
    );
    const [clientModal, setClientModal] = useState({ open: false, clientData: null, loading: false });
    const [bulkStatusModalOpen, setBulkStatusModalOpen] = useState(false);
    const [editModal, setEditModal] = useState({ open: false, taskData: null });
    const [tasks, setTasks] = useState(() =>
        canRestoreList ? savedListStateRef.current.tasks : []
    );
    const [serviceOptions, setServiceOptions] = useState([]);
    const [filters, setFilters] = useState(() => initialFilters);
    const [pagination, setPagination] = useState(() => initialPagination);
    const taskListAbortRef = useRef(null);
    const skipNextAutoFetchRef = useRef(canRestoreList);
    const restoredScrollTop = canRestoreList
        ? Number(savedListStateRef.current?.scrollTop) || 0
        : null;
    const rowMenuButtonRefs = useRef({});
    const rowContextPositionRef = useRef(null);
    const rowDropdownRef = useRef(null);
    const [rowDropdownPosition, setRowDropdownPosition] = useState({ top: 8, left: 8 });
    const [getInOutLoadingId, setGetInOutLoadingId] = useState(null);

    // Export Modal State
    const [exportModalOpen, setExportModalOpen] = useState(false);
    const [exportData, setExportData] = useState([]);
    const [exportColumns, setExportColumns] = useState([]);

    // Hidden states for columns and fields
    const [hiddenColumns, setHiddenColumns] = useState({});
    const [hiddenFields, setHiddenFields] = useState({});

    // ============================================
    // EFFECTS
    // ============================================

    useEffect(() => {
        const savedConfig = localStorage.getItem('taskColumnConfig');
        if (savedConfig) {
            try {
                const parsedConfig = JSON.parse(savedConfig);

                // Check if it's the new format (with hidden states) or old format
                if (parsedConfig.columns) {
                    const updatedConfig = normalizeColumnConfig(parsedConfig.columns);
                    setColumnConfig(updatedConfig);
                    setHiddenColumns(parsedConfig.hiddenColumns || {});
                    setHiddenFields(migrateHiddenFields(parsedConfig.hiddenFields || {}, updatedConfig));
                } else {
                    const updatedConfig = normalizeColumnConfig(parsedConfig);
                    setColumnConfig(updatedConfig);
                    setHiddenColumns({});
                    setHiddenFields({});
                }
            } catch (error) {
                console.error('Error parsing saved config:', error);
                setColumnConfig(defaultColumnConfig);
                setHiddenColumns({});
                setHiddenFields({});
            }
        } else {
            setColumnConfig(defaultColumnConfig);
            setHiddenColumns({});
            setHiddenFields({});
        }
    }, []);

    // Listen for column visibility changes from SettingsModal
    useEffect(() => {
        const handleVisibilityChange = (event) => {
            if (event.detail) {
                setHiddenColumns(event.detail.hiddenColumns || {});
                setHiddenFields(event.detail.hiddenFields || {});
            }
        };

        window.addEventListener('columnVisibilityChanged', handleVisibilityChange);

        return () => {
            window.removeEventListener('columnVisibilityChanged', handleVisibilityChange);
        };
    }, []);

    useEffect(() => {
        localStorage.setItem('sidebarMinimized', JSON.stringify(isMinimized));
    }, [isMinimized]);

    useEffect(() => {
        const handleOutsideMenuClick = (event) => {
            const clickedInsideDropdown = event.target.closest('.dropdown-container');
            const clickedRowMenu = event.target.closest('.task-row-action-menu');
            const clickedRowTrigger = event.target.closest('.task-row-action-trigger');
            if (!clickedInsideDropdown && !clickedRowMenu && !clickedRowTrigger) {
                if (showMoreMenu) setShowMoreMenu(false);
                if (activeRowDropdown !== null) {
                    setActiveRowDropdown(null);
                    rowContextPositionRef.current = null;
                }
            }
        };

        document.addEventListener('mousedown', handleOutsideMenuClick);
        return () => {
            document.removeEventListener('mousedown', handleOutsideMenuClick);
        };
    }, [showMoreMenu, activeRowDropdown]);

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
    }, [activeRowDropdown, tasks, isMinimized]);

    useEffect(() => {
        if (activeRowDropdown && !tasks.some((t) => t.task_id === activeRowDropdown)) {
            setActiveRowDropdown(null);
        }
    }, [tasks, activeRowDropdown]);

    useEffect(() => {
        fetchServices();
    }, []);

    // Reset to page 1 when filters change — but not on mount, otherwise the
    // page number restored from sessionStorage would be lost.
    const filtersMountedRef = useRef(false);
    useEffect(() => {
        if (!filtersMountedRef.current) {
            filtersMountedRef.current = true;
            return;
        }
        if (pagination.page_no !== 1) {
            setPagination(prev => ({ ...prev, page_no: 1 }));
        }
    }, [filters.search, filters.username, filters.firm_id, filters.service_id, filters.status, filters.service_ids]);

    // Keep the saved list view state in sync so back-navigation restores it
    useEffect(() => {
        saveListViewCache(TASK_LIST_STATE_KEY, {
            filters,
            pagination: {
                page_no: pagination.page_no,
                limit: pagination.limit,
                total: pagination.total,
            },
            showFilterRow,
            viewMode,
            fingerprint: buildTaskListFingerprint(filters, pagination),
            // Don't wipe cached rows while a fresh fetch is in flight
            ...(loading ? {} : { tasks }),
            scrollTop: getScrollTopById(TASK_LIST_SCROLL_ID),
        });
    }, [filters, pagination.page_no, pagination.limit, pagination.total, showFilterRow, viewMode, tasks, loading]);

    useEffect(() => {
        if (skipNextAutoFetchRef.current) {
            skipNextAutoFetchRef.current = false;
            return;
        }
        fetchTasks();
    }, [pagination.page_no, pagination.limit, filters.search, filters.username, filters.firm_id, filters.service_id, filters.status, filters.service_ids]);

    // Disable browser auto scroll restoration on this page
    useLayoutEffect(() => enableManualScrollRestoration(), []);

    // Persist scroll position when leaving the page (e.g. open task details)
    useEffect(() => {
        return () => {
            saveListViewCache(TASK_LIST_STATE_KEY, {
                scrollTop: getScrollTopById(TASK_LIST_SCROLL_ID),
            });
        };
    }, []);

    // ============================================
    // HELPER FUNCTIONS
    // ============================================

    const getVisibleColumnConfig = () => {
        const visibleColumns = columnConfig.filter(col => !hiddenColumns[col.id]);

        return visibleColumns.map(col => ({
            ...col,
            items: col.items.filter(item =>
                !hiddenFields[`${col.id}_${item.id}`] &&
                !STAFF_TABLE_META_FIELD_IDS.has(item.id)
            )
        }));
    };

    const getStaffColumnId = () =>
        columnConfig.find((col) => col.items?.some((item) => item.id === 'staffs'))?.id || '4';

    // ============================================
    // DATA FETCHING FUNCTIONS
    // ============================================

    const fetchServices = async () => {
        try {
            const headers = getHeaders();
            if (!headers) return;

            const collected = [];
            let page = 1;
            let hasMore = true;

            while (hasMore) {
                const response = await fetch(
                    `${API_BASE_URL}/service/list?search=&page_no=${page}&limit=100&added_only=true`,
                    { method: 'GET', headers },
                );

                if (!response.ok) throw new Error('Failed to fetch services');

                const responseData = await response.json();
                if (!responseData.success || !Array.isArray(responseData.data)) break;

                collected.push(...responseData.data);
                hasMore = responseData.pagination?.is_last_page === false;
                page += 1;
            }

            setServiceOptions(
                collected.map((service) => ({
                    value: service.service_id,
                    name: service.name,
                })),
            );
        } catch (error) {
            console.error('Error fetching services:', error);
        }
    };

    const fetchTasks = async (overrides = {}) => {
        const nextPageNo = overrides.page_no ?? pagination.page_no;
        const nextLimit = overrides.limit ?? pagination.limit;
        const nextFilters = overrides.filters ?? filters;

        if (taskListAbortRef.current) {
            taskListAbortRef.current.abort();
        }
        const controller = new AbortController();
        taskListAbortRef.current = controller;
        setLoading(true);
        try {
            const headers = await getHeaders();
            const queryParams = new URLSearchParams({
                page_no: nextPageNo.toString(),
                limit: nextLimit.toString()
            });

            queryParams.append('search', nextFilters.search || '');
            queryParams.append('username', nextFilters.username || '');
            queryParams.append('firm_id', nextFilters.firm_id || '');
            queryParams.append('service_id', nextFilters.service_id || '');
            (nextFilters.status || []).forEach((status) => queryParams.append('status', status));
            (nextFilters.service_ids || []).forEach((serviceId) => queryParams.append('service_ids', serviceId));

            const response = await fetch(`${API_BASE_URL}/task/list?${queryParams.toString()}`, {
                method: 'GET',
                headers,
                signal: controller.signal
            });

            if (!response.ok) throw new Error('Failed to fetch tasks');

            const responseData = await response.json();
            if (responseData.success && responseData.data && Array.isArray(responseData.data)) {
                setTasks(responseData.data);
                setPagination(prev => {
                    const next = {
                        ...prev,
                        page_no: nextPageNo,
                        limit: nextLimit,
                        total: responseData.pagination?.total || responseData.data.length
                    };
                    saveListViewCache(TASK_LIST_STATE_KEY, {
                        filters: nextFilters,
                        pagination: {
                            page_no: next.page_no,
                            limit: next.limit,
                            total: next.total,
                        },
                        fingerprint: buildTaskListFingerprint(nextFilters, next),
                        tasks: responseData.data,
                        scrollTop: getScrollTopById(TASK_LIST_SCROLL_ID),
                    });
                    return next;
                });
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
    };

    // ============================================
    // TASK OPERATION FUNCTIONS
    // ============================================

    const saveColumnConfig = (config) => {
        setColumnConfig(config);
        localStorage.setItem('taskColumnConfig', JSON.stringify(config));
    };

    const handleBulkStatusChange = async (newStatus) => {
        const taskIds = Array.from(selectedTasks);
        if (taskIds.length === 0) return;

        try {
            const headers = await getHeaders();
            const response = await fetch(`${API_BASE_URL}/task/change-status`, {
                method: 'PUT',
                headers: { ...headers, 'Content-Type': 'application/json' },
                body: JSON.stringify({ task_ids: taskIds, status: newStatus })
            });

            const responseData = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(responseData.message || 'Failed to update statuses');
            }

            if (responseData.success) {
                const updatedTaskIds = new Set(responseData.data?.task_ids || taskIds);
                setTasks(prev => prev.map(task =>
                    updatedTaskIds.has(task.task_id)
                        ? { ...task, status: newStatus }
                        : task
                ));
                setSelectedTasks(prev => {
                    const next = new Set(prev);
                    updatedTaskIds.forEach((id) => next.delete(id));
                    return next;
                });
                toast.success(
                    responseData.message ||
                    `Successfully updated ${updatedTaskIds.size} task${updatedTaskIds.size !== 1 ? 's' : ''} to ${statusOptions.find(s => s.value === newStatus)?.name || newStatus}`
                );
            } else {
                throw new Error(responseData.message || 'Failed to update statuses');
            }
        } catch (error) {
            console.error('Error in bulk status update:', error);
            toast.error(error.message || 'Failed to update statuses');
            throw error;
        }
    };

    const handleStatusChange = async (taskId, newStatus) => {
        try {
            const headers = await getHeaders();
            const response = await fetch(`${API_BASE_URL}/task/change-status`, {
                method: 'PUT',
                headers: { ...headers, 'Content-Type': 'application/json' },
                body: JSON.stringify({ task_ids: [taskId], status: newStatus })
            });

            const responseData = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(responseData.message || 'Failed to update status');
            }

            if (responseData.success) {
                toast.success(responseData.message || 'Task status updated successfully');
                setTasks((prev) => {
                    return prev.map((task) =>
                        task.task_id === taskId
                            ? { ...task, status: newStatus }
                            : task
                    );
                });
            } else {
                throw new Error(responseData.message || 'Failed to update status');
            }
        } catch (error) {
            console.error('Error updating status:', error);
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

    const allTasksSelected = tasks.length > 0 && selectedTasks.size === tasks.length;
    const isSelectionIndeterminate = selectedTasks.size > 0 && selectedTasks.size < tasks.length;

    const handleTaskSelect = (taskId) => {
        const newSelected = new Set(selectedTasks);
        if (newSelected.has(taskId)) {
            newSelected.delete(taskId);
        } else {
            newSelected.add(taskId);
        }
        setSelectedTasks(newSelected);
    };

    const handleSelectAll = () => {
        if (allTasksSelected) {
            setSelectedTasks(new Set());
        } else {
            setSelectedTasks(new Set(tasks.map((task) => task.task_id)));
        }
    };

    const handleGetInOut = async (taskId, action) => {
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

    const openStatusModal = (taskId, currentStatus, taskName = '') => {
        const derivedTaskName = taskName || tasks.find((task) => task.task_id === taskId)?.service?.name || '';
        setStatusModal({ open: true, taskId, taskName: derivedTaskName, currentStatus });
    };

    const closeStatusModal = () => {
        setStatusModal({ open: false, taskId: null, taskName: '', currentStatus: '' });
    };

    const openUsersModal = (staffs, taskName) => {
        setUsersModal({
            open: true,
            users: staffs.map(staff => ({
                username: staff.username,
                name: staff.name,
                email: staff.email,
                mobile: staff.mobile,
                role: 'Staff'
            })),
            taskName
        });
    };

    const closeUsersModal = () => {
        setUsersModal({ open: false, users: [], taskName: '' });
    };

    const openClientDetailsModal = async (username) => {
        if (!username) return;

        setClientModal(prev => ({ ...prev, loading: true, open: true }));

        try {
            const headers = await getHeaders();
            const response = await fetch(`${API_BASE_URL}/client/details/profile?username=${username}`, {
                method: 'GET',
                headers
            });

            if (!response.ok) throw new Error('Failed to fetch client details');

            const responseData = await response.json();
            if (responseData.success && responseData.data) {
                setClientModal(prev => ({ ...prev, clientData: responseData.data, loading: false }));
            } else {
                setClientModal(prev => ({ ...prev, clientData: null, loading: false }));
            }
        } catch (error) {
            console.error('Error fetching client details:', error);
            setClientModal(prev => ({ ...prev, clientData: null, loading: false }));
        }
    };

    const closeClientDetailsModal = () => {
        setClientModal({ open: false, clientData: null, loading: false });
    };

    const handleEditTask = (task) => {
        setEditModal({ open: true, taskData: task });
    };

    const handleTaskUpdated = () => {
        fetchTasks();
    };

    const handleSearch = () => {
        setPagination(prev => ({ ...prev, page_no: 1 }));
    };

    const handleResetFilters = () => {
        const resetFilters = {
            search: '',
            username: '',
            firm_id: '',
            service_id: '',
            status: DEFAULT_SELECTED_STATUSES,
            service_ids: []
        };
        skipNextAutoFetchRef.current = true;
        setFilters(resetFilters);
        setPagination(prev => ({ ...prev, page_no: 1 }));
        setTimeout(() => {
            fetchTasks({ filters: resetFilters, page_no: 1 });
        }, 0);
    };

    // ============================================
    // EXPORT FUNCTIONS
    // ============================================

    // Prepare data for export
    const prepareExportData = () => {
        // Get visible columns configuration
        const visibleColumns = getVisibleColumnConfig();

        // Prepare columns for export
        const exportColumnsConfig = [];
        const exportDataList = [];

        // Build columns array
        visibleColumns.forEach(col => {
            col.items.forEach(item => {
                exportColumnsConfig.push({
                    header: item.label,
                    key: item.id,
                    width: 20
                });
            });
        });

        // Build data array for selected tasks or all tasks
        const tasksToExport = selectedTasks.size > 0
            ? tasks.filter(task => selectedTasks.has(task.task_id))
            : tasks;

        tasksToExport.forEach(task => {
            const row = {};
            visibleColumns.forEach(col => {
                col.items.forEach(item => {
                    // Get cell content based on field type
                    let value = '';
                    switch (item.id) {
                        case 'task_id':
                            value = task.task_id || '';
                            break;
                        case 'client_name':
                            value = task.client?.profile?.name || task.client?.name || '';
                            break;
                        case 'client_mobile':
                            value = task.client?.profile?.mobile || task.client?.mobile || '';
                            break;
                        case 'client_email': {
                            const pan = task.firm?.pan_no || '';
                            const fileNo = task.firm?.file_no || '';
                            value = `PAN: ${pan || '—'} • File: ${fileNo || '—'}`;
                            break;
                        }
                        case 'firm_name':
                            value = task.firm?.firm_name || task.firm_name || '';
                            break;
                        case 'service_name':
                            value = task.service?.name || task.service_name || '';
                            break;
                        case 'fees':
                            value = check('task_fees_view') ? (task.charges?.fees || task.fees || 0) : '----';
                            break;
                        case 'due_date':
                            value = formatDate(task.dates?.due_date);
                            break;
                        case 'create_date':
                            value = formatDate(task.dates?.create_date);
                            break;
                        case 'due_days':
                        case 'target_date': {
                            const dueDate = task.dates?.due_date;
                            if (!dueDate) {
                                value = '';
                                break;
                            }
                            const daysLeftExport = getDaysLeft(dueDate);
                            if (daysLeftExport < 0) {
                                value = `OD by ${Math.abs(daysLeftExport)}D`;
                            } else if (daysLeftExport === 0) {
                                value = 'Due today';
                            } else {
                                value = `Due in ${daysLeftExport}D`;
                            }
                            break;
                        }
                        case 'billing_status':
                            value = task.billing_status || '';
                            break;
                        case 'status':
                            value = formatStatus(task.status);
                            break;
                        case 'staffs': {
                            const staffNames = (task.staffs || []).map((s) => s.name).filter(Boolean);
                            if (task.has_ca && task.ca?.name) staffNames.push(`CA: ${task.ca.name}`);
                            if (task.has_agent && task.agent?.name) staffNames.push(`Agent: ${task.agent.name}`);
                            value = staffNames.join(', ');
                            break;
                        }
                        case 'is_recurring':
                            value = task.is_recurring ? 'Yes' : 'No';
                            break;
                        case 'create_by':
                            value = task.create_by?.name || task.create_by || '';
                            break;
                        default:
                            value = task[item.id] || '';
                    }
                    row[item.id] = value;
                });
            });
            exportDataList.push(row);
        });

        return { data: exportDataList, columns: exportColumnsConfig };
    };

    // Handle export click
    const handleExportClick = () => {
        const { data, columns } = prepareExportData();

        if (data.length === 0) {
            toast.error('No data to export');
            return;
        }

        setExportData(data);
        setExportColumns(columns);
        setExportModalOpen(true);
    };

    // ============================================
    // RENDER HELPER FUNCTIONS
    // ============================================

    const renderCellContent = (task, fieldId, handleGetInOut, navigate, openStatusModal, openUsersModal, openClientDetailsModal, handleEditTask) => {
        const daysLeft = getDaysLeft(task.dates?.due_date);
        const isOverdue = daysLeft < 0;

        // Helper function to safely extract string value from object or string
        const safeGetString = (value, fallback = '-') => {
            if (!value) return fallback;
            if (typeof value === 'string') return value;
            if (typeof value === 'object') {
                return value.mobile || value.email || value.name || value.number || value.address || JSON.stringify(value);
            }
            return String(value);
        };

        switch (fieldId) {
            case 'task_id':
                return (
                    <div className="text-gray-700 font-medium text-sm">
                        {task.task_id || '-'}
                    </div>
                );
            case 'client_name':
                const clientName = task.client?.profile?.name || task.client?.name || '-';
                return (
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-sm flex-shrink-0">
                            <FiUser className="w-3.5 h-3.5 text-white" />
                        </div>
                        <div>
                            <button
                                onClick={() => navigate(`/client/profile/${task.client?.username}`)}
                                className="font-semibold text-gray-800 group-hover:text-indigo-600 transition-colors text-sm hover:text-indigo-600 text-left"
                            >
                                {safeGetString(clientName)}
                            </button>
                        </div>
                    </div>
                );
            case 'client_mobile':
                const mobileValue = task.client?.profile?.mobile || task.client?.mobile || '-';
                return (
                    <div className="flex items-center gap-2 text-gray-700 font-medium text-sm">
                        <FiPhone className="w-3 h-3 text-gray-400" />
                        {safeGetString(mobileValue)}
                    </div>
                );
            case 'client_email': {
                const pan = safeGetString(task.firm?.pan_no, '—');
                const fileNo = safeGetString(task.firm?.file_no, '—');
                const label = `PAN: ${pan} • File: ${fileNo}`;
                return (
                    <div className="text-sm font-medium tabular-nums" title={label}>
                        <span className="whitespace-nowrap text-indigo-700">
                            PAN: {pan}
                        </span>
                        <span className="mx-1 text-gray-300">•</span>
                        <span className="whitespace-nowrap text-teal-700">
                            File: {fileNo}
                        </span>
                    </div>
                );
            }
            case 'firm_name':
                const firmName = task.firm?.firm_name || task.firm_name || '-';
                return (
                    <div className="text-gray-700 font-medium text-sm">
                        {safeGetString(firmName)}
                    </div>
                );
            case 'service_name': {
                const serviceName = task.service?.name || task.service_name || '-';
                const isCompliance =
                    String(task.task_type || '').toLowerCase() === 'compliance';
                return (
                    <button
                        onClick={() => navigate(`/task/${task.task_id}`)}
                        className="inline-flex items-center gap-1.5 font-semibold text-gray-800 text-sm hover:text-indigo-600 transition-colors text-left"
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
            case 'fees':
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
            case 'billing_status':
                const billingStatus = task.billing_status || '-';
                return (
                    <span className="text-gray-700 font-medium text-sm capitalize">
                        {safeGetString(billingStatus)}
                    </span>
                );
            case 'staffs': {
                const staffs = task.staffs || [];
                const staffColId = getStaffColumnId();
                const showCa = !hiddenFields[`${staffColId}_staff_ca`];
                const showAgent = !hiddenFields[`${staffColId}_staff_agent`];
                const caName = showCa && task.has_ca && task.ca
                    ? safeGetString(task.ca.name || task.ca.username)
                    : null;
                const agentName = showAgent && task.has_agent && task.agent
                    ? safeGetString(task.agent.name || task.agent.username)
                    : null;

                const renderStaffAvatars = () => {
                    if (staffs.length === 1) {
                        const staffName = safeGetString(staffs[0].name || 'S');
                        return (
                            <button
                                type="button"
                                onClick={() => openUsersModal(staffs, task.service?.name)}
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
                                    const staffName = safeGetString(staff.name || 'S');
                                    return (
                                        <button
                                            type="button"
                                            key={staff.assign_id || staffIndex}
                                            onClick={() => openUsersModal(staffs, task.service?.name)}
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
                    if (staffs.length > 2) {
                        const showMoreCount = staffs.length - 2;
                        return (
                            <div className="flex -space-x-2">
                                {staffs.slice(0, 2).map((staff, staffIndex) => {
                                    const staffName = safeGetString(staff.name || 'S');
                                    return (
                                        <button
                                            type="button"
                                            key={staff.assign_id || staffIndex}
                                            onClick={() => openUsersModal(staffs, task.service?.name)}
                                            className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-full border-2 border-white flex items-center justify-center text-xs font-bold text-white hover:opacity-80 transition-opacity"
                                            title={`Click to view all ${staffs.length} staff members`}
                                        >
                                            {staffName.charAt(0)}
                                        </button>
                                    );
                                })}
                                <button
                                    type="button"
                                    onClick={() => openUsersModal(staffs, task.service?.name)}
                                    className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-full border-2 border-white flex items-center justify-center text-xs font-bold text-white"
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
            case 'is_recurring':
                return (
                    <span className={`text-xs font-medium ${task.is_recurring ? 'text-green-600' : 'text-gray-400'}`}>
                        {task.is_recurring ? 'Yes' : 'No'}
                    </span>
                );
            case 'create_by':
                const createdBy = task.create_by?.name || task.create_by || '-';
                return (
                    <div className="text-gray-700 font-medium text-sm">
                        {safeGetString(createdBy)}
                    </div>
                );
            case 'status':
                const statusColorClass = task.status === 'unassign' ? 'bg-blue-100 text-blue-700' :
                    task.status === 'in process' ? 'bg-orange-100 text-orange-700' :
                        task.status === 'pending from client' ? 'bg-purple-100 text-purple-700' :
                            task.status === 'pending from department' ? 'bg-yellow-100 text-yellow-700' :
                                task.status === 'complete' ? 'bg-green-100 text-green-700' :
                                    task.status === 'cancel' ? 'bg-red-100 text-red-700' :
                                        'bg-gray-100 text-gray-700';

                const statusText = getStatusText(task.status);

                return (
                    <div className="flex flex-col items-start gap-1">
                        <button
                            type="button"
                            onClick={() => openStatusModal(task.task_id, task.status, task.service?.name || task.service_name || '')}
                            title={getStatusHoverTitle(task.status)}
                            className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${statusColorClass} hover:opacity-90 transition-opacity`}
                        >
                            {safeGetString(statusText)}
                        </button>
                        {(() => {
                            const inOutState = getTaskInOutState(task);
                            if (!inOutState.badge) return null;
                            const isSelf = inOutState.mode === 'self';
                            return (
                                <span
                                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${isSelf
                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                                        }`}
                                >
                                    {isSelf ? <FiUserCheck className="w-3 h-3" /> : <FiClock className="w-3 h-3" />}
                                    {inOutState.badge}
                                </span>
                            );
                        })()}
                    </div>
                );
            case 'menu':
                return (
                    <div className="relative flex items-center justify-center w-full">
                        <motion.button
                            type="button"
                            ref={(el) => {
                                // Ignore hidden/mobile instances so dropdown anchors to visible clicked trigger.
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
                const value = task[fieldId];
                return (
                    <span className="text-gray-700 font-medium text-sm">
                        {safeGetString(value)}
                    </span>
                );
        }
    };

    // ============================================
    // RENDER
    // ============================================

    const rowActionTask = activeRowDropdown
        ? tasks.find((t) => t.task_id === activeRowDropdown)
        : null;
    const openBulkStatusModal = () => {
        if (selectedTasks.size === 0) return;
        setBulkStatusModalOpen(true);
    };

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

            <div className={`pt-16 transition-all duration-300 ease-in-out ${isMinimized ? 'md:pl-20' : 'md:pl-[260px]'}`}>
                <div className="h-full flex flex-col">
                    <motion.div
                        className="bg-white rounded-lg overflow-hidden shadow-sm border border-gray-200 flex flex-col h-full mx-2 sm:mx-4 md:mx-8 my-3 md:my-4"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                    >
                        {/* Header */}
                        <div className="border-b border-gray-200 px-3 md:px-4 py-3 bg-gradient-to-r from-gray-50 to-white">
                            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-2 md:gap-3">
                                <div>
                                    <h5 className="text-base md:text-lg font-bold text-gray-800">Task Management</h5>
                                    <p className="text-gray-500 text-xs">Manage your tasks efficiently with multiple view options</p>
                                </div>

                                <div className="flex flex-col lg:flex-row gap-2 w-full lg:w-auto">
                                    <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2 w-full">
                                        <div className="flex items-center gap-2">
                                            <div className="md:hidden w-full">
                                                <TableViewSwitch viewMode={viewMode} setViewMode={setViewMode} />
                                            </div>
                                            <div className="hidden md:block">
                                                <TableViewSwitch viewMode={viewMode} setViewMode={setViewMode} />
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <div className="dropdown-container relative">
                                                <motion.button
                                                    onClick={() => setShowFilterRow(!showFilterRow)}
                                                    className="px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 font-medium flex items-center gap-2 shadow-sm text-sm"
                                                    whileHover={{ scale: 1.05 }}
                                                    whileTap={{ scale: 0.95 }}
                                                >
                                                    <FiFilter className="w-4 h-4" />
                                                    <span className="hidden sm:inline">Filter</span>
                                                </motion.button>
                                            </div>

                                            <motion.button
                                                disabled={!check('task_create')}
                                                onClick={() =>
                                                    check('task_create') &&
                                                    openTaskCreate({
                                                        onNavigateToTaskList: () => navigate('/task/view'),
                                                    })
                                                }
                                                className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 shadow-sm transition-all duration-200 ${check('task_create')
                                                    ? 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white'
                                                    : 'bg-gray-100 border border-gray-200 text-gray-400 cursor-not-allowed opacity-60'
                                                    }`}
                                                whileHover={check('task_create') ? { scale: 1.05 } : {}}
                                                whileTap={check('task_create') ? { scale: 0.95 } : {}}
                                                title={check('task_create') ? 'Create Task' : 'Locked (No permission)'}
                                            >
                                                {check('task_create') ? <FiPlus className="w-4 h-4" /> : <FiLock className="w-4 h-4" />}
                                            </motion.button>

                                            {selectedTasks.size > 0 && (
                                                <motion.button
                                                    onClick={openBulkStatusModal}
                                                    className="px-3 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg text-sm font-medium flex items-center gap-2 shadow-sm"
                                                    whileHover={{ scale: 1.05 }}
                                                    whileTap={{ scale: 0.95 }}
                                                >
                                                    <FiCheckCircle className="w-4 h-4" />
                                                    <span className="hidden sm:inline">Change Status ({selectedTasks.size})</span>
                                                </motion.button>
                                            )}

                                            <div className="relative dropdown-container">
                                                <motion.button
                                                    onClick={() => setShowMoreMenu(!showMoreMenu)}
                                                    className="w-9 h-9 flex items-center justify-center rounded-full bg-white border border-gray-300 hover:bg-gray-100 shadow-sm"
                                                    whileHover={{ scale: 1.08 }}
                                                    whileTap={{ scale: 0.95 }}
                                                >
                                                    <FiMenu className="w-4 h-4 text-gray-700" />
                                                </motion.button>

                                                <AnimatePresence>
                                                    {showMoreMenu && (
                                                        <motion.div
                                                            className="absolute right-0 mt-2 w-52 bg-white rounded-lg shadow-xl border border-gray-200 z-50 overflow-hidden"
                                                            initial={{ opacity: 0, y: -8 }}
                                                            animate={{ opacity: 1, y: 0 }}
                                                            exit={{ opacity: 0, y: -8 }}
                                                        >
                                                            <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase border-b border-gray-100">Export Options</div>
                                                            <button
                                                                onClick={() => { handleExportClick(); setShowMoreMenu(false); }}
                                                                className="flex items-center w-full px-3 py-2.5 text-sm text-gray-700 hover:bg-green-50 transition-colors"
                                                            >
                                                                <PiMicrosoftExcelLogoDuotone className="w-4 h-4 mr-2 text-green-600" />
                                                                Export as Excel
                                                            </button>
                                                            <button
                                                                onClick={() => { handleExportClick(); setShowMoreMenu(false); }}
                                                                className="flex items-center w-full px-3 py-2.5 text-sm text-gray-700 hover:bg-blue-50 transition-colors"
                                                            >
                                                                <FaFileCsv className="w-4 h-4 mr-2 text-blue-600" />
                                                                Export as CSV
                                                            </button>
                                                            <button
                                                                onClick={() => { handleExportClick(); setShowMoreMenu(false); }}
                                                                className="flex items-center w-full px-3 py-2.5 text-sm text-gray-700 hover:bg-red-50 transition-colors"
                                                            >
                                                                <PiFilePdfDuotone className="w-4 h-4 mr-2 text-red-600" />
                                                                Export as PDF
                                                            </button>
                                                            <div className="h-px bg-gray-200 my-1" />
                                                            <button
                                                                onClick={() => {
                                                                    if (viewMode === 'table') {
                                                                        setSettingsModalOpen(true);
                                                                        setShowMoreMenu(false);
                                                                    }
                                                                }}
                                                                className={`flex items-center w-full px-3 py-2.5 text-sm ${viewMode === 'table' ? 'text-gray-700 hover:bg-gray-100' : 'text-gray-400 cursor-not-allowed'}`}
                                                                disabled={viewMode !== 'table'}
                                                            >
                                                                <FiSettings className="w-4 h-4 mr-2" />
                                                                Settings {viewMode !== 'table' && '(Table view only)'}
                                                            </button>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <FilterRow
                            filters={filters}
                            setFilters={setFilters}
                            serviceOptions={serviceOptions}
                            statusOptions={statusOptions}
                            onSearch={handleSearch}
                            onReset={handleResetFilters}
                            showFilterRow={showFilterRow}
                            setShowFilterRow={setShowFilterRow}
                        />

                        <div className="flex-1 flex flex-col overflow-hidden">
                            {viewMode === 'table' ? (
                                <TaskTable
                                    tasks={tasks}
                                    selectedTasks={selectedTasks}
                                    handleTaskSelect={handleTaskSelect}
                                    selectAll={allTasksSelected}
                                    isSelectionIndeterminate={isSelectionIndeterminate}
                                    handleSelectAll={handleSelectAll}
                                    columnConfig={getVisibleColumnConfig()}
                                    renderCellContent={renderCellContent}
                                    loading={loading}
                                    toggleRowDropdown={toggleRowDropdown}
                                    activeRowDropdown={activeRowDropdown}
                                    handleGetInOut={handleGetInOut}
                                    getTaskInOutState={getTaskInOutState}
                                    getInOutLoadingId={getInOutLoadingId}
                                    setActiveRowDropdown={setActiveRowDropdown}
                                    navigate={navigate}
                                    openStatusModal={openStatusModal}
                                    openUsersModal={openUsersModal}
                                    openClientDetailsModal={openClientDetailsModal}
                                    handleEditTask={handleEditTask}
                                    formatDate={formatDate}
                                    getDaysLeft={getDaysLeft}
                                    getStatusStyle={getStatusStyle}
                                    getStatusText={getStatusText}
                                    onRowContextMenu={handleRowContextMenu}
                                    animateRows={!canRestoreList}
                                    initialScrollTop={restoredScrollTop}
                                />
                            ) : (
                                <TaskCards
                                    tasks={tasks}
                                    selectedTasks={selectedTasks}
                                    handleTaskSelect={handleTaskSelect}
                                    columnConfig={getVisibleColumnConfig()}
                                    renderCellContent={renderCellContent}
                                    loading={loading}
                                    toggleRowDropdown={toggleRowDropdown}
                                    activeRowDropdown={activeRowDropdown}
                                    handleGetInOut={handleGetInOut}
                                    getTaskInOutState={getTaskInOutState}
                                    getInOutLoadingId={getInOutLoadingId}
                                    setActiveRowDropdown={setActiveRowDropdown}
                                    navigate={navigate}
                                    openStatusModal={openStatusModal}
                                    openClientDetailsModal={openClientDetailsModal}
                                    handleEditTask={handleEditTask}
                                    formatDate={formatDate}
                                    getDaysLeft={getDaysLeft}
                                    getStatusColor={getStatusColor}
                                    formatStatus={formatStatus}
                                />
                            )}
                        </div>

                        {/* Footer */}
                        <TablePagination
                            page={pagination.page_no}
                            limit={pagination.limit}
                            total={pagination.total}
                            totalPages={Math.max(1, Math.ceil((pagination.total || 0) / (pagination.limit || 20)))}
                            rowOptions={[5, 10, 20, 50, 100]}
                            defaultRows={20}
                            onPageChange={(nextPage) => setPagination((prev) => ({ ...prev, page_no: nextPage }))}
                            onLimitChange={(nextLimit) => setPagination((prev) => ({ ...prev, limit: nextLimit, page_no: 1 }))}
                            showJump={true}
                            showFirstLast={true}
                        />
                    </motion.div>
                </div>
            </div>

            {/* Floating Action Button */}
            <AnimatePresence>
                {selectedTasks.size > 0 && (
                    <motion.div
                        className="fixed bottom-4 right-4 md:bottom-6 md:right-6 z-50"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                    >
                        <div className="flex flex-col md:flex-row items-center gap-2 md:gap-3">
                            <motion.button
                                className="px-3 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg text-sm font-semibold flex items-center gap-2 shadow-xl"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={openBulkStatusModal}
                            >
                                <FiCheckCircle className="w-4 h-4" />
                                <span className="hidden sm:inline">Change Status</span>
                                <span className="sm:hidden">({selectedTasks.size})</span>
                            </motion.button>

                            <motion.button
                                className="px-3 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-lg text-sm font-semibold flex items-center gap-2 shadow-xl"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => console.log("Send message to:", [...selectedTasks])}
                            >
                                <FiMail className="w-4 h-4" />
                                <span className="hidden sm:inline">Send Message</span>
                                <span className="sm:hidden">({selectedTasks.size})</span>
                            </motion.button>

                            <motion.button
                                className="px-3 py-2.5 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg text-sm font-semibold flex items-center gap-2 shadow-xl"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={handleExportClick}
                            >
                                <FiDownload className="w-4 h-4" />
                                <span className="hidden sm:inline">Export</span>
                                <span className="sm:hidden">({selectedTasks.size})</span>
                            </motion.button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

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
                                        openStatusModal(rowActionTask.task_id, rowActionTask.status, rowActionTask.service?.name || rowActionTask.service_name || '');
                                        setActiveRowDropdown(null);
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

            {/* Modals */}
            <SettingsModal
                isOpen={settingsModalOpen}
                onClose={() => setSettingsModalOpen(false)}
                columnConfig={columnConfig}
                saveColumnConfig={saveColumnConfig}
                defaultColumnConfig={defaultColumnConfig}
                availableFields={availableFields}
            />

            <TaskStatusChange
                isOpen={statusModal.open}
                onClose={closeStatusModal}
                taskId={statusModal.taskId}
                taskName={statusModal.taskName}
                currentStatus={statusModal.currentStatus}
                onStatusChange={handleStatusChange}
                statusOptions={statusOptions}
            />

            <TaskStatusChange
                isOpen={bulkStatusModalOpen}
                onClose={() => setBulkStatusModalOpen(false)}
                isBulk
                selectedCount={selectedTasks.size}
                onStatusChange={async (_taskId, newStatus) => handleBulkStatusChange(newStatus)}
                statusOptions={statusOptions}
            />

            <AssignedStaffList
                isOpen={usersModal.open}
                onClose={closeUsersModal}
                users={usersModal.users}
                taskName={usersModal.taskName}
            />

            <ClientDetailsModal
                isOpen={clientModal.open}
                onClose={closeClientDetailsModal}
                clientData={clientModal.clientData}
                loading={clientModal.loading}
            />

            <EditTaskModal
                isOpen={editModal.open}
                onClose={() => setEditModal({ open: false, taskData: null })}
                taskData={editModal.taskData}
                onTaskUpdated={handleTaskUpdated}
            />

            {deleteModal && <DeleteConfirmationModal title="Task Delete" onConfirm={(res) => { setDeleteModal(false); console.log("Confirmed:", res); }} />}

            {/* Export Modal */}
            <ExportModal
                isOpen={exportModalOpen}
                onClose={() => {
                    setExportModalOpen(false);
                    setExportData([]);
                    setExportColumns([]);
                }}
                exportData={exportData}
                columns={exportColumns}
                jobType="task_report"
            />
        </div>
    );
};

export default TaskDisplay;