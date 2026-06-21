// TaskDisplay.jsx
import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Sidebar, Header } from '../components/header';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FiUsers, FiBriefcase, FiCalendar, FiUserCheck,
    FiUserPlus, FiFileText, FiPlus, FiSearch, FiRefreshCw,
    FiPaperclip, FiX, FiMic, FiStopCircle, FiDownload, FiTrash2,
    FiArrowRight, FiArrowLeft, FiUser, FiLoader, FiCheckCircle,
    FiXCircle, FiClock, FiMenu, FiInfo, FiEdit, FiEye, FiSettings, FiLock,
    FiGrid, FiMail, FiPrinter, FiPhone, FiFilter, FiMessageSquare,
    FiMove, FiSave, FiList, FiChevronDown, FiChevronUp, FiMapPin,
    FiCreditCard, FiHome, FiMap, FiGlobe
} from 'react-icons/fi';

import { AiOutlineMail } from "react-icons/ai";
import { FaWhatsapp, FaFileCsv } from "react-icons/fa6";
import { PiFilePdfDuotone, PiMicrosoftExcelLogoDuotone } from "react-icons/pi";
import toast from 'react-hot-toast';

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

const availableFields = [
    { id: 'task_id', label: 'Task ID', type: 'text' },
    { id: 'client_name', label: 'Client Name', type: 'text' },
    { id: 'client_mobile', label: 'Client Mobile', type: 'text' },
    { id: 'client_email', label: 'Client Email', type: 'text' },
    { id: 'firm_name', label: 'Firm Name', type: 'text' },
    { id: 'service_name', label: 'Service Name', type: 'text' },
    { id: 'fees', label: 'Fees', type: 'currency' },
    { id: 'due_date', label: 'Due Date', type: 'date' },
    { id: 'create_date', label: 'Create Date', type: 'date' },
    { id: 'target_date', label: 'Target Date', type: 'date' },
    { id: 'billing_status', label: 'Billing Status', type: 'text' },
    { id: 'status', label: 'Status', type: 'status' },
    { id: 'staffs', label: 'Staffs', type: 'array' },
    { id: 'is_recurring', label: 'Is Recurring', type: 'boolean' },
    { id: 'create_by', label: 'Created By', type: 'text' },
    { id: 'menu', label: 'Actions', type: 'actions' }
];

// Replace your existing defaultColumnConfig with this simplified version
const defaultColumnConfig = [
    {
        id: '1',
        name: 'Client',
        items: [
            { id: 'client_name', label: 'Client Name' },
            { id: 'client_mobile', label: 'Mobile' },
            { id: 'client_email', label: 'Email' }
        ],
        fixed: false
    },
    {
        id: '2',
        name: 'Task Details',
        items: [
            { id: 'service_name', label: 'Service Name' },
            { id: 'fees', label: 'Fees' },
            { id: 'firm_name', label: 'Firm Name' }
        ],
        fixed: false
    },
    {
        id: '3',
        name: 'Dates',
        items: [
            { id: 'create_date', label: 'Create Date' },
            { id: 'due_date', label: 'Due Date' },
            { id: 'target_date', label: 'Target Date' }
        ],
        fixed: false
    },
    {
        id: '4',
        name: 'Staffs',
        items: [
            { id: 'staffs', label: 'Staffs' }
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
        case 'pending from client': return 'Client Pnd';
        case 'pending from department': return 'Dept Pnd';
        case 'complete': return 'Complete';
        case 'cancel': return 'Cancel';
        default: return status || '-';
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
        case 'pending from client': return 'Pending from Client';
        case 'pending from department': return 'Pending from Department';
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

// Bulk Status Change Modal
const BulkStatusChangeModal = ({ isOpen, onClose, selectedCount, onConfirm, loading }) => {
    const [selectedStatus, setSelectedStatus] = useState('');
    const [localLoading, setLocalLoading] = useState(false);

    if (!isOpen) return null;

    const statusOptions = [
        { value: 'unassign', name: 'Unassign' },
        { value: 'in process', name: 'In Process' },
        { value: 'pending from client', name: 'Pending from Client' },
        { value: 'pending from department', name: 'Pending from Department' },
        { value: 'complete', name: 'Complete' },
        { value: 'cancel', name: 'Cancel' }
    ].filter(status => {
        if (status.value === 'cancel' && !checkPermissionSync('task_cancel')) return false;
        if (status.value === 'complete' && !checkPermissionSync('task_complete')) return false;
        return true;
    });

    const getStatusColor = (status) => ({
        unassign: 'bg-blue-100 text-blue-700',
        'in process': 'bg-orange-100 text-orange-700',
        'pending from client': 'bg-purple-100 text-purple-700',
        'pending from department': 'bg-yellow-100 text-yellow-700',
        complete: 'bg-green-100 text-green-700',
        cancel: 'bg-red-100 text-red-700'
    }[status] || 'bg-gray-100 text-gray-700');

    const handleConfirm = async () => {
        if (!selectedStatus) return;
        setLocalLoading(true);
        await onConfirm(selectedStatus);
        setLocalLoading(false);
        onClose();
    };

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
                        className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-auto overflow-hidden"
                        initial={{ scale: 0.95, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 20 }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white px-6 py-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                                        <FiCheckCircle className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold">Bulk Status Change</h3>
                                        <p className="text-indigo-100 text-sm">Update status for {selectedCount} selected task{selectedCount !== 1 ? 's' : ''}</p>
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

                        <div className="p-6">
                            <div className="mb-4">
                                <label className="block text-sm font-semibold text-gray-700 mb-3">Select New Status</label>
                                <div className="space-y-2">
                                    {statusOptions.map((status) => (
                                        <motion.button
                                            key={status.value}
                                            onClick={() => setSelectedStatus(status.value)}
                                            className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all ${selectedStatus === status.value ? 'ring-2 ring-indigo-500 ring-offset-1' : ''} ${getStatusColor(status.value)}`}
                                            whileHover={{ scale: 1.01 }}
                                            whileTap={{ scale: 0.99 }}
                                        >
                                            <div className="flex items-center gap-3">
                                                {status.value === 'unassign' ? <FiClock /> : status.value === 'in process' ? <FiLoader /> : status.value === 'pending from client' ? <FiEye /> : status.value === 'pending from department' ? <FiXCircle /> : status.value === 'complete' ? <FiCheckCircle /> : <FiXCircle />}
                                                <span className="font-medium">{status.name}</span>
                                            </div>
                                            {selectedStatus === status.value && <FiCheckCircle className="w-5 h-5" />}
                                        </motion.button>
                                    ))}
                                </div>
                            </div>

                            <div className="mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                                <div className="flex items-start gap-2">
                                    <FiInfo className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                                    <p className="text-xs text-yellow-700">This will update the status of all {selectedCount} selected task{selectedCount !== 1 ? 's' : ''} to the selected status.</p>
                                </div>
                            </div>
                        </div>

                        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
                            <motion.button
                                onClick={onClose}
                                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 font-medium text-sm"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                disabled={localLoading || loading}
                            >
                                Cancel
                            </motion.button>

                            <motion.button
                                onClick={handleConfirm}
                                disabled={!selectedStatus || localLoading || loading}
                                className={`px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 ${!selectedStatus ? 'bg-gray-300 cursor-not-allowed' : 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white hover:from-indigo-700 hover:to-indigo-800'}`}
                                whileHover={selectedStatus ? { scale: 1.05 } : {}}
                                whileTap={selectedStatus ? { scale: 0.95 } : {}}
                            >
                                {(localLoading || loading) ? (
                                    <><FiLoader className="w-4 h-4 animate-spin" />Updating...</>
                                ) : (
                                    <><FiCheckCircle className="w-4 h-4" />Update {selectedCount} Task{selectedCount !== 1 ? 's' : ''}</>
                                )}
                            </motion.button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
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
    // State declarations
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(() => {
        const saved = localStorage.getItem('sidebarMinimized');
        return saved ? JSON.parse(saved) : false;
    });
    const [loading, setLoading] = useState(false);
    const [settingsModalOpen, setSettingsModalOpen] = useState(false);
    const [columnConfig, setColumnConfig] = useState([]);
    const [selectedTasks, setSelectedTasks] = useState(new Set());
    const [selectAll, setSelectAll] = useState(false);
    const [activeRowDropdown, setActiveRowDropdown] = useState(null);
    const [exportModal, setExportModal] = useState({ open: false, type: '', data: null });
    const navigate = useNavigate();
    const [deleteModal, setDeleteModal] = useState(false);
    const [showMoreMenu, setShowMoreMenu] = useState(false);
    const [viewMode, setViewMode] = useState('table');
    const [isMobile, setIsMobile] = useState(false);
    const [statusModal, setStatusModal] = useState({ open: false, taskId: null, taskName: '', currentStatus: '' });
    const [usersModal, setUsersModal] = useState({ open: false, users: [], taskName: '' });
    const [showFilterRow, setShowFilterRow] = useState(false);
    const [clientModal, setClientModal] = useState({ open: false, clientData: null, loading: false });
    const [bulkStatusModal, setBulkStatusModal] = useState({ open: false, loading: false });
    const [editModal, setEditModal] = useState({ open: false, taskData: null });
    const [tasks, setTasks] = useState([]);
    const [serviceOptions, setServiceOptions] = useState([]);
    const [filters, setFilters] = useState({
        search: '',
        username: '',
        firm_id: '',
        service_id: '',
        status: DEFAULT_SELECTED_STATUSES,
        service_ids: []
    });
    const [pagination, setPagination] = useState({ page_no: 1, limit: 20, total: 0 });
    const taskListAbortRef = useRef(null);
    const skipNextAutoFetchRef = useRef(false);
    const rowMenuButtonRefs = useRef({});
    const rowDropdownRef = useRef(null);
    const [rowDropdownPosition, setRowDropdownPosition] = useState({ top: 8, left: 8 });

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
                    // New format with hidden states
                    const updatedConfig = parsedConfig.columns.map(col => ({
                        ...col,
                        fixed: col.name === 'Status' || col.name === 'Action'
                    }));
                    setColumnConfig(updatedConfig);
                    setHiddenColumns(parsedConfig.hiddenColumns || {});
                    setHiddenFields(parsedConfig.hiddenFields || {});
                } else {
                    // Old format (just columns array)
                    const updatedConfig = parsedConfig.map(col => ({
                        ...col,
                        fixed: col.name === 'Status' || col.name === 'Action'
                    }));
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
                if (activeRowDropdown !== null) setActiveRowDropdown(null);
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
            const button = rowMenuButtonRefs.current[activeRowDropdown];
            const dropdownHeight = rowDropdownRef.current?.offsetHeight || 220;
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
        if (activeRowDropdown && !tasks.some((t) => t.task_id === activeRowDropdown)) {
            setActiveRowDropdown(null);
        }
    }, [tasks, activeRowDropdown]);

    useEffect(() => {
        fetchServices();
    }, []);

    useEffect(() => {
        if (pagination.page_no !== 1) {
            setPagination(prev => ({ ...prev, page_no: 1 }));
        }
    }, [filters.search, filters.username, filters.firm_id, filters.service_id, filters.status, filters.service_ids]);

    useEffect(() => {
        if (skipNextAutoFetchRef.current) {
            skipNextAutoFetchRef.current = false;
            return;
        }
        fetchTasks();
    }, [pagination.page_no, pagination.limit, filters.search, filters.username, filters.firm_id, filters.service_id, filters.status, filters.service_ids]);

    // ============================================
    // HELPER FUNCTIONS
    // ============================================

    const getVisibleColumnConfig = () => {
        // Filter out hidden columns
        const visibleColumns = columnConfig.filter(col => !hiddenColumns[col.id]);

        // Filter out hidden fields from each column
        return visibleColumns.map(col => ({
            ...col,
            items: col.items.filter(item => !hiddenFields[`${col.id}_${item.id}`])
        }));
    };

    // ============================================
    // DATA FETCHING FUNCTIONS
    // ============================================

    const fetchServices = async () => {
        try {
            const headers = await getHeaders();
            const response = await fetch(`${API_BASE_URL}/service/list?search=`, {
                method: 'GET',
                headers
            });

            if (!response.ok) throw new Error('Failed to fetch services');

            const responseData = await response.json();
            if (responseData.success && responseData.data && Array.isArray(responseData.data)) {
                setServiceOptions(responseData.data.map(service => ({
                    value: service.service_id,
                    name: service.name
                })));
            }
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
                setPagination(prev => ({
                    ...prev,
                    total: responseData.pagination?.total || responseData.data.length
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

        setBulkStatusModal(prev => ({ ...prev, loading: true }));

        try {
            const headers = await getHeaders();
            const response = await fetch(`${API_BASE_URL}/task/change-status`, {
                method: 'PUT',
                headers: { ...headers, 'Content-Type': 'application/json' },
                body: JSON.stringify({ task_ids: taskIds, status: newStatus })
            });

            if (!response.ok) throw new Error('Failed to update statuses');

            const responseData = await response.json();
            if (responseData.success) {
                setTasks(prev => prev.map(task =>
                    selectedTasks.has(task.task_id)
                        ? { ...task, status: newStatus }
                        : task
                ));
                setSelectedTasks(new Set());
                setSelectAll(false);
                alert(`Successfully updated ${taskIds.length} task${taskIds.length !== 1 ? 's' : ''} to ${statusOptions.find(s => s.value === newStatus)?.name || newStatus}`);
            } else {
                throw new Error(responseData.message || 'Failed to update statuses');
            }
        } catch (error) {
            console.error('Error in bulk status update:', error);
            alert(`Failed to update statuses: ${error.message}`);
        } finally {
            setBulkStatusModal(prev => ({ ...prev, loading: false, open: false }));
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

            if (!response.ok) throw new Error('Failed to update status');

            const responseData = await response.json();
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

    const handleGetInOut = (taskId, action) => {
        console.log(`Task ${taskId} - ${action}`);
    };

    const handleTaskSelect = (taskId) => {
        const newSelected = new Set(selectedTasks);
        if (newSelected.has(taskId)) {
            newSelected.delete(taskId);
        } else {
            newSelected.add(taskId);
        }
        setSelectedTasks(newSelected);
        setSelectAll(false);
    };

    const handleSelectAll = () => {
        if (selectAll) {
            setSelectedTasks(new Set());
        } else {
            const allTaskIds = new Set(tasks.map(task => task.task_id));
            setSelectedTasks(allTaskIds);
        }
        setSelectAll(!selectAll);
    };

    const toggleRowDropdown = (taskId, buttonElement) => {
        if (activeRowDropdown === taskId) {
            setActiveRowDropdown(null);
            return;
        }
        if (buttonElement) {
            rowMenuButtonRefs.current[taskId] = buttonElement;
        }
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
                        case 'client_email':
                            value = task.client?.profile?.email || task.client?.email || '';
                            break;
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
                        case 'target_date':
                            value = formatDate(task.dates?.target_date);
                            break;
                        case 'billing_status':
                            value = task.billing_status || '';
                            break;
                        case 'status':
                            value = formatStatus(task.status);
                            break;
                        case 'staffs':
                            value = (task.staffs || []).map(s => s.name).join(', ');
                            break;
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
            case 'client_email':
                const emailValue = task.client?.profile?.email || task.client?.email || '-';
                const emailString = safeGetString(emailValue);
                const truncatedEmail = emailString.length > 15 ? emailString.substring(0, 15) + '...' : emailString;

                return (
                    <div className="flex items-center gap-2 text-gray-700 font-medium text-sm">
                        <FiMail className="w-3 h-3 text-gray-400" />
                        <span title={emailString}>{truncatedEmail}</span>
                    </div>
                );
            case 'firm_name':
                const firmName = task.firm?.firm_name || task.firm_name || '-';
                return (
                    <div className="text-gray-700 font-medium text-sm">
                        {safeGetString(firmName)}
                    </div>
                );
            case 'service_name':
                const serviceName = task.service?.name || task.service_name || '-';
                return (
                    <button
                        onClick={() => navigate(`/task/${task.task_id}`)}
                        className="font-semibold text-gray-800 text-sm hover:text-indigo-600 transition-colors text-left"
                    >
                        {safeGetString(serviceName)}
                    </button>
                );
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
            case 'due_date':
                return (
                    <div className="flex items-center gap-2">
                        <div className="text-gray-700 font-medium text-sm">
                            {task.dates?.due_date ? formatDate(task.dates.due_date) : '-'}
                        </div>
                        {task.dates?.due_date && (
                            <span className={`text-xs font-bold ${isOverdue ? 'text-red-600' : daysLeft <= 7 ? 'text-orange-600' : 'text-green-600'}`}>
                                {isOverdue
                                    ? `Overdue by ${Math.abs(daysLeft)} day${Math.abs(daysLeft) > 1 ? 's' : ''}`
                                    : `Due in ${daysLeft} day${daysLeft > 1 ? 's' : ''}`
                                }
                            </span>
                        )}
                    </div>
                );
            case 'create_date':
                return (
                    <div className="text-gray-700 font-medium text-sm">
                        {task.dates?.create_date ? formatDate(task.dates.create_date) : '-'}
                    </div>
                );
            case 'target_date':
                return (
                    <div className="text-gray-700 font-medium text-sm">
                        {task.dates?.target_date ? formatDate(task.dates.target_date) : '-'}
                    </div>
                );
            case 'billing_status':
                const billingStatus = task.billing_status || '-';
                return (
                    <span className="text-gray-700 font-medium text-sm capitalize">
                        {safeGetString(billingStatus)}
                    </span>
                );
            case 'staffs':
                const staffs = task.staffs || [];
                if (staffs.length === 1) {
                    const staffName = safeGetString(staffs[0].name || 'S');
                    return (
                        <button
                            onClick={() => openUsersModal(staffs, task.service?.name)}
                            className="flex items-center justify-start cursor-pointer hover:opacity-80 transition-opacity"
                            title={`Click to view ${staffName}'s details`}
                        >
                            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-full border-2 border-white flex items-center justify-center text-xs font-bold text-white">
                                {staffName.charAt(0)}
                            </div>
                        </button>
                    );
                } else if (staffs.length === 2) {
                    return (
                        <div className="flex -space-x-2">
                            {staffs.map((staff, staffIndex) => {
                                const staffName = safeGetString(staff.name || 'S');
                                return (
                                    <button
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
                } else if (staffs.length > 2) {
                    const showMoreCount = staffs.length - 2;
                    return (
                        <div className="flex -space-x-2">
                            {staffs.slice(0, 2).map((staff, staffIndex) => {
                                const staffName = safeGetString(staff.name || 'S');
                                return (
                                    <button
                                        key={staff.assign_id || staffIndex}
                                        onClick={() => openUsersModal(staffs, task.service?.name)}
                                        className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-full border-2 border-white flex items-center justify-center text-xs font-bold text-white hover:opacity-80 transition-opacity"
                                        title={`Click to view all ${staffs.length} staff members`}
                                    >
                                        {staffName.charAt(0)}
                                    </button>
                                );
                            })}
                            {staffs.length > 2 && (
                                <button
                                    onClick={() => openUsersModal(staffs, task.service?.name)}
                                    className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-full border-2 border-white flex items-center justify-center text-xs font-bold text-white"
                                    title={`Click to view all ${staffs.length} staff members`}
                                >
                                    +{showMoreCount}
                                </button>
                            )}
                        </div>
                    );
                } else {
                    return <span className="text-gray-400 text-sm">-</span>;
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

                const statusText = task.status === 'unassign' ? 'Unassign' :
                    task.status === 'in process' ? 'In Process' :
                        task.status === 'pending from client' ? 'Pending from Client' :
                            task.status === 'pending from department' ? 'Pending from Department' :
                                task.status === 'complete' ? 'Complete' :
                                    task.status === 'cancel' ? 'Cancel' :
                                        task.status || '-';

                return (
                    <button
                        type="button"
                        onClick={() => openStatusModal(task.task_id, task.status, task.service?.name || task.service_name || '')}
                        className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${statusColorClass} hover:opacity-90 transition-opacity`}
                    >
                        {safeGetString(statusText)}
                    </button>
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
        setBulkStatusModal({ open: true, loading: false });
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
                                                onClick={() => check('task_create') && navigate('/task/create')}
                                                className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 shadow-sm transition-all duration-200 ${
                                                    check('task_create')
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
                                    selectAll={selectAll}
                                    handleSelectAll={handleSelectAll}
                                    columnConfig={getVisibleColumnConfig()}
                                    renderCellContent={renderCellContent}
                                    loading={loading}
                                    toggleRowDropdown={toggleRowDropdown}
                                    activeRowDropdown={activeRowDropdown}
                                    handleGetInOut={handleGetInOut}
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
                            {check('task_update') ? (
                                <button
                                    type="button"
                                    onClick={() => {
                                        handleGetInOut(rowActionTask.task_id, 'in');
                                        setActiveRowDropdown(null);
                                    }}
                                    className="flex items-center w-full px-4 py-2.5 text-sm text-indigo-600 hover:bg-indigo-50 transition-colors"
                                >
                                    <FiArrowLeft className="mr-2 text-indigo-600 w-4 h-4" />
                                    GET IN
                                </button>
                            ) : (
                                <button
                                    disabled
                                    className="flex items-center w-full px-4 py-2.5 text-sm text-gray-400 cursor-not-allowed opacity-60 bg-gray-50 transition-colors"
                                >
                                    <FiLock className="mr-2 text-gray-400 w-4 h-4" />
                                    GET IN
                                </button>
                            )}

                            <div className="border-t my-1" />

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

            <BulkStatusChangeModal
                isOpen={bulkStatusModal.open}
                onClose={() => setBulkStatusModal(prev => ({ ...prev, open: false }))}
                selectedCount={selectedTasks.size}
                onConfirm={handleBulkStatusChange}
                loading={bulkStatusModal.loading}
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