// TaskDisplay.jsx
import React, { useState, useEffect } from 'react';
import { Sidebar, Header } from '../components/header';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FiUsers, FiBriefcase, FiCalendar, FiDollarSign, FiUserCheck,
    FiUserPlus, FiFileText, FiPlus, FiSearch, FiRefreshCw,
    FiPaperclip, FiX, FiMic, FiStopCircle, FiDownload, FiTrash2,
    FiArrowRight, FiArrowLeft, FiUser, FiLoader, FiCheckCircle,
    FiXCircle, FiClock, FiMenu, FiInfo, FiEdit, FiEye, FiSettings,
    FiGrid, FiMail, FiPrinter, FiPhone, FiFilter, FiMessageSquare,
    FiMove, FiSave, FiList, FiChevronDown, FiChevronUp, FiMapPin,
    FiCreditCard, FiHome, FiMap, FiGlobe
} from 'react-icons/fi';
import { PiExportBold, PiFilePdfDuotone, PiMicrosoftExcelLogoDuotone } from "react-icons/pi";
import { AiOutlineMail } from "react-icons/ai";
import { FaWhatsapp } from "react-icons/fa6";

// Import components
import TaskTable from '../TaskComponent/TaskTable';
import TaskCards from '../TaskComponent/TaskCards';
import SettingsModal from '../TaskComponent/SettingsModal';

// Import other modals
import DeleteConfirmationModal from '../components/delete-confirmation';
import EditTaskModal from '../TaskComponent/EdittaskModal';

// Import API utilities
import getHeaders from '../utils/get-headers';
import API_BASE_URL from '../utils/api-controller';

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
                <div className="min-w-[120px]">
                    <select className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-700 text-sm focus:ring-2 focus:ring-indigo-500">
                        <option value="all">Search All</option>
                        <option value="task">Task ID</option>
                        <option value="client">Client Name</option>
                    </select>
                </div>
                
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
                
                <div className="min-w-[180px]">
                    <select 
                        value={filters.service_id} 
                        onChange={(e) => setFilters(prev => ({ ...prev, service_id: e.target.value }))} 
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-700 text-sm focus:ring-2 focus:ring-indigo-500"
                    >
                        <option value="">All Services</option>
                        {serviceOptions.map(service => (
                            <option key={service.value} value={service.value}>{service.name}</option>
                        ))}
                    </select>
                </div>
                
                <div className="min-w-[180px]">
                    <select 
                        value={filters.status} 
                        onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))} 
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-700 text-sm focus:ring-2 focus:ring-indigo-500"
                    >
                        <option value="">All Status</option>
                        {statusOptions.map(status => (
                            <option key={status.value} value={status.value}>{status.name}</option>
                        ))}
                    </select>
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

// Status Change Modal
const StatusChangeModal = ({ isOpen, onClose, taskId, currentStatus, onStatusChange, statusOptions }) => {
    const [selectedStatus, setSelectedStatus] = useState(currentStatus);
    const [loading, setLoading] = useState(false);
    
    if (!isOpen) return null;

    const getStatusColor = (status) => ({
        unassign: 'bg-blue-100 text-blue-700', 
        'in process': 'bg-orange-100 text-orange-700', 
        'pending from client': 'bg-purple-100 text-purple-700', 
        'pending from department': 'bg-yellow-100 text-yellow-700', 
        complete: 'bg-green-100 text-green-700', 
        cancel: 'bg-red-100 text-red-700'
    }[status] || 'bg-gray-100 text-gray-700');
    
    const getStatusIcon = (status) => ({
        unassign: <FiClock />, 
        'in process': <FiLoader />, 
        'pending from client': <FiEye />, 
        'pending from department': <FiXCircle />, 
        complete: <FiCheckCircle />, 
        cancel: <FiXCircle />
    }[status] || <FiClock />);

    const handleConfirm = async () => { 
        setLoading(true); 
        await onStatusChange(taskId, selectedStatus); 
        setLoading(false); 
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
                        className="bg-white rounded-xl shadow-2xl w-full max-w-sm mx-auto overflow-hidden" 
                        initial={{ scale: 0.95, opacity: 0, y: 20 }} 
                        animate={{ scale: 1, opacity: 1, y: 0 }} 
                        exit={{ scale: 0.95, opacity: 0, y: 20 }} 
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white px-4 py-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                                        <FiCheckCircle className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <h3 className="text-base font-bold">Change Status</h3>
                                        <p className="text-indigo-100 text-xs">Update task status</p>
                                    </div>
                                </div>
                                <motion.button 
                                    onClick={onClose} 
                                    className="text-white p-1 rounded-lg hover:bg-white/10" 
                                    whileHover={{ scale: 1.1 }} 
                                    whileTap={{ scale: 0.9 }}
                                >
                                    <FiX className="w-4 h-4" />
                                </motion.button>
                            </div>
                        </div>
                        
                        <div className="p-4 border-b border-gray-200">
                            <div className="mb-3">
                                <label className="block text-xs font-semibold text-gray-600 mb-1">Current Status</label>
                                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border ${getStatusColor(currentStatus)}`}>
                                    {getStatusIcon(currentStatus)}
                                    <span className="font-medium text-sm">{statusOptions.find(s => s.value === currentStatus)?.name || currentStatus}</span>
                                </div>
                            </div>
                            
                            <div className="mb-2">
                                <label className="block text-xs font-semibold text-gray-600 mb-1">Select New Status</label>
                                <div className="space-y-1.5">
                                    {statusOptions.map((status) => (
                                        <motion.button 
                                            key={status.value} 
                                            onClick={() => setSelectedStatus(status.value)} 
                                            className={`w-full flex items-center justify-between p-2.5 rounded-lg border transition-all ${selectedStatus === status.value ? 'ring-1 ring-indigo-500' : ''} ${getStatusColor(status.value)}`} 
                                            whileHover={{ scale: 1.01 }} 
                                            whileTap={{ scale: 0.99 }}
                                        >
                                            <div className="flex items-center gap-2">
                                                {getStatusIcon(status.value)}
                                                <span className="font-medium text-sm">{status.name}</span>
                                            </div>
                                            {selectedStatus === status.value && <FiCheckCircle className="w-4 h-4" />}
                                        </motion.button>
                                    ))}
                                </div>
                            </div>
                        </div>
                        
                        <div className="px-4 py-3 bg-gray-50 flex justify-end gap-2">
                            <motion.button 
                                onClick={onClose} 
                                className="px-3 py-1.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 font-medium text-sm" 
                                whileHover={{ scale: 1.05 }} 
                                whileTap={{ scale: 0.95 }} 
                                disabled={loading}
                            >
                                Cancel
                            </motion.button>
                            
                            <motion.button 
                                onClick={handleConfirm} 
                                className="px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-lg hover:from-indigo-700 hover:to-indigo-800 font-medium text-sm flex items-center gap-2" 
                                whileHover={{ scale: 1.05 }} 
                                whileTap={{ scale: 0.95 }} 
                                disabled={loading}
                            >
                                {loading ? (<><FiLoader className="w-4 h-4 animate-spin" />Updating...</>) : ('Update')}
                            </motion.button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
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
    ];
    
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

// Users List Modal
const UsersListModal = ({ isOpen, onClose, users, taskName }) => {
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
                        className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-auto overflow-hidden" 
                        initial={{ scale: 0.95, opacity: 0, y: 20 }} 
                        animate={{ scale: 1, opacity: 1, y: 0 }} 
                        exit={{ scale: 0.95, opacity: 0, y: 20 }} 
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white px-6 py-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                                        <FiUsers className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold">Assigned Staff</h3>
                                        <p className="text-indigo-100 text-sm">Task: {taskName}</p>
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
                        
                        <div className="p-6 max-h-[60vh] overflow-y-auto">
                            <div className="space-y-3">
                                {users.map((user, index) => (
                                    <motion.div 
                                        key={user.username} 
                                        className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200" 
                                        initial={{ opacity: 0, x: -10 }} 
                                        animate={{ opacity: 1, x: 0 }} 
                                        transition={{ delay: index * 0.05 }}
                                    >
                                        <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold">
                                            {user.name?.charAt(0) || 'U'}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-semibold text-gray-800 text-sm truncate">{user.name}</h4>
                                            <p className="text-gray-600 text-xs truncate">{user.email}</p>
                                            <p className="text-gray-500 text-xs mt-1">{user.mobile}</p>
                                        </div>
                                        <div className="text-xs text-gray-500">ID: {user.username}</div>
                                    </motion.div>
                                ))}
                                
                                {users.length === 0 && (
                                    <div className="text-center py-8">
                                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <FiUser className="w-8 h-8 text-gray-400" />
                                        </div>
                                        <p className="text-gray-500 font-medium">No staff assigned</p>
                                    </div>
                                )}
                            </div>
                        </div>
                        
                        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                            <div className="flex justify-between items-center">
                                <div className="text-sm text-gray-600">
                                    <span className="font-semibold">{users.length}</span> staff member{users.length !== 1 ? 's' : ''} assigned
                                </div>
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
    const [showExportDropdown, setShowExportDropdown] = useState(false);
    const [exportModal, setExportModal] = useState({ open: false, type: '', data: null });
    const navigate = useNavigate();
    const [deleteModal, setDeleteModal] = useState(false);
    const [deleteOtp, setDeleteOtp] = useState('');
    const [showMoreMenu, setShowMoreMenu] = useState(false);
    const [viewMode, setViewMode] = useState('table');
    const [isMobile, setIsMobile] = useState(false);
    const [statusModal, setStatusModal] = useState({ open: false, taskId: null, currentStatus: '' });
    const [usersModal, setUsersModal] = useState({ open: false, users: [], taskName: '' });
    const [showFilterRow, setShowFilterRow] = useState(false);
    const [clientModal, setClientModal] = useState({ open: false, clientData: null, loading: false });
    const [bulkStatusModal, setBulkStatusModal] = useState({ open: false, loading: false });
    const [editModal, setEditModal] = useState({ open: false, taskData: null });
    const [tasks, setTasks] = useState([]);
    const [serviceOptions, setServiceOptions] = useState([]);
    const [filters, setFilters] = useState({ search: '', service_id: '', status: '' });
    const [pagination, setPagination] = useState({ page_no: 1, limit: 20, total: 0 });
    
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
        fetchServices();
        fetchTasks();
    }, []);

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

    const fetchTasks = async () => {
        setLoading(true);
        try {
            const headers = await getHeaders();
            const queryParams = new URLSearchParams({
                page_no: pagination.page_no.toString(),
                limit: pagination.limit.toString()
            });
            
            if (filters.search) queryParams.append('search', filters.search);
            if (filters.service_id) queryParams.append('service_id', filters.service_id);
            if (filters.status) queryParams.append('status', filters.status);
            
            const response = await fetch(`${API_BASE_URL}/task/list?${queryParams.toString()}`, { 
                method: 'GET', 
                headers 
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
            console.error('Error fetching tasks:', error);
            setTasks([]);
        } finally {
            setLoading(false);
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
                setTasks(prev => prev.map(task => 
                    task.task_id === taskId 
                        ? { ...task, status: newStatus } 
                        : task
                ));
            } else {
                throw new Error(responseData.message || 'Failed to update status');
            }
        } catch (error) {
            console.error('Error updating status:', error);
            alert(`Failed to update status: ${error.message}`);
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

    const toggleRowDropdown = (taskId) => {
        setActiveRowDropdown(activeRowDropdown === taskId ? null : taskId);
    };

    const openStatusModal = (taskId, currentStatus) => {
        setStatusModal({ open: true, taskId, currentStatus });
    };

    const closeStatusModal = () => {
        setStatusModal({ open: false, taskId: null, currentStatus: '' });
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
        fetchTasks();
    };

    const handleResetFilters = () => {
        setFilters({ search: '', service_id: '', status: '' });
        setPagination(prev => ({ ...prev, page_no: 1 }));
        setTimeout(() => fetchTasks(), 100);
    };

    const handleExport = (type, data = null) => {
        setExportModal({ open: true, type, data });
        setTimeout(() => {
            setExportModal({ open: false, type: '', data: null });
            alert(`${type.toUpperCase()} export completed successfully!`);
        }, 1500);
    };

    const openBulkStatusModal = () => {
        if (selectedTasks.size === 0) return;
        setBulkStatusModal({ open: true, loading: false });
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
                        <FiDollarSign className="w-3 h-3" />
                        ₹{Number(feesAmount).toLocaleString()}
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
                                    <div
                                        key={staff.assign_id || staffIndex}
                                        className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-full border-2 border-white flex items-center justify-center text-xs font-bold text-white"
                                    >
                                        {staffName.charAt(0)}
                                    </div>
                                );
                            })}
                            {staffs.length > 2 && (
                                <button
                                    onClick={() => openUsersModal(staffs, task.service?.name)}
                                    className="w-8 h-8 bg-gray-300 rounded-full border-2 border-white flex items-center justify-center text-xs font-bold text-gray-700 hover:bg-gray-400 hover:text-gray-800 transition-colors"
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
                    <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${statusColorClass}`}>
                        {safeGetString(statusText)}
                    </div>
                );
           case 'menu':
    return (
        <div className="relative" style={{ position: 'static' }}>
            <motion.button
                onClick={(e) => {
                    e.stopPropagation();
                    toggleRowDropdown(task.task_id);
                }}
                className="w-8 h-8 flex flex-col items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors space-y-0.5"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
            >
                <div className="w-1 h-1 rounded-full bg-gray-600"></div>
                <div className="w-1 h-1 rounded-full bg-gray-600"></div>
                <div className="w-1 h-1 rounded-full bg-gray-600"></div>
            </motion.button>

            <AnimatePresence>
                {activeRowDropdown === task.task_id && (
                    <motion.div
                        className="fixed z-[9999] bg-white rounded-lg shadow-xl border border-gray-200 w-56 overflow-hidden"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        style={{
                            top: 'auto',
                            left: 'auto',
                            right: 'auto'
                        }}
                        ref={(el) => {
                            if (el && activeRowDropdown === task.task_id) {
                                // Find the button that triggered the dropdown
                                const button = el.previousSibling;
                                if (button) {
                                    const rect = button.getBoundingClientRect();
                                    const dropdownHeight = el.offsetHeight;
                                    const windowHeight = window.innerHeight;
                                    const spaceBelow = windowHeight - rect.bottom;
                                    const spaceAbove = rect.top;
                                    
                                    el.style.position = 'fixed';
                                    
                                    // Position horizontally (right-aligned)
                                    if (rect.right + 224 > window.innerWidth) {
                                        el.style.right = `${window.innerWidth - rect.right + 10}px`;
                                        el.style.left = 'auto';
                                    } else {
                                        el.style.left = `${rect.right - 224}px`;
                                        el.style.right = 'auto';
                                    }
                                    
                                    // Position vertically (prefer below, show above if not enough space)
                                    if (spaceBelow >= dropdownHeight) {
                                        el.style.top = `${rect.bottom + 4}px`;
                                        el.style.bottom = 'auto';
                                    } else if (spaceAbove >= dropdownHeight) {
                                        el.style.bottom = `${windowHeight - rect.top + 4}px`;
                                        el.style.top = 'auto';
                                    } else {
                                        el.style.top = `${Math.max(8, rect.bottom - dropdownHeight + 40)}px`;
                                        el.style.bottom = 'auto';
                                    }
                                }
                            }
                        }}
                    >
                        <div className="py-1">
                            <button
                                onClick={() => {
                                    handleGetInOut(task.task_id, 'in');
                                    setActiveRowDropdown(null);
                                }}
                                className="flex items-center w-full px-4 py-2.5 text-sm text-indigo-600 hover:bg-indigo-50 transition-colors"
                            >
                                <FiArrowLeft className="mr-2 text-indigo-600 w-4 h-4" />
                                GET IN
                            </button>

                            <div className="border-t my-1"></div>
                            
                            <button
                                onClick={() => {
                                    openStatusModal(task.task_id, task.status);
                                    setActiveRowDropdown(null);
                                }}
                                className="flex items-center w-full px-4 py-2.5 text-sm text-blue-600 hover:bg-blue-50 transition-colors"
                            >
                                <FiCheckCircle className="mr-2 text-blue-600 w-4 h-4" />
                                Change Status
                            </button>

                            <button
                                onClick={() => {
                                    setActiveRowDropdown(null);
                                    navigate(`/task/${task.task_id}`);
                                }}
                                className="flex items-center w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-indigo-50 transition-colors"
                            >
                                <FiEye className="mr-2 text-indigo-600 w-4 h-4" />
                                View Details
                            </button>

                            <button
                                onClick={() => {
                                    setActiveRowDropdown(null);
                                    handleEditTask(task);
                                }}
                                className="flex items-center w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-green-50 transition-colors"
                            >
                                <FiEdit className="mr-2 text-green-600 w-4 h-4" />
                                Edit Task
                            </button>

                            <div className="border-t my-1"></div>

                            <button
                                onClick={() => {
                                    setActiveRowDropdown(null);
                                    setDeleteModal(true);
                                }}
                                className="flex items-center w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                            >
                                <FiTrash2 className="mr-2 w-4 h-4" />
                                Delete Task
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
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
                        className="bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col h-full mx-2 sm:mx-4 md:mx-8 my-3 md:my-4" 
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
                                                onClick={() => navigate('/task/create')} 
                                                className="px-3 py-2 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white rounded-lg text-sm font-medium flex items-center gap-2 shadow-sm" 
                                                whileHover={{ scale: 1.05 }} 
                                                whileTap={{ scale: 0.95 }}
                                            >
                                                <FiPlus className="w-4 h-4" />
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
                                                            <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">Export</div>
                                                            <button onClick={() => handleExport('pdf')} className="flex items-center w-full px-3 py-2 text-sm text-gray-700 hover:bg-indigo-50">
                                                                <PiFilePdfDuotone className="w-4 h-4 mr-2 text-red-500" />Export as PDF
                                                            </button>
                                                            <button onClick={() => handleExport('excel')} className="flex items-center w-full px-3 py-2 text-sm text-gray-700 hover:bg-indigo-50">
                                                                <PiMicrosoftExcelLogoDuotone className="w-4 h-4 mr-2 text-green-500" />Export as Excel
                                                            </button>
                                                            <button onClick={() => handleExport('whatsapp')} className="flex items-center w-full px-3 py-2 text-sm text-gray-700 hover:bg-indigo-50">
                                                                <FaWhatsapp className="w-4 h-4 mr-2 text-green-500" />Share via WhatsApp
                                                            </button>
                                                            <button onClick={() => handleExport('email')} className="flex items-center w-full px-3 py-2 text-sm text-gray-700 hover:bg-indigo-50">
                                                                <AiOutlineMail className="w-4 h-4 mr-2 text-blue-500" />Share via Email
                                                            </button>
                                                            <div className="h-px bg-gray-200 my-1" />
                                                            <button 
                                                                onClick={() => { 
                                                                    if (viewMode === 'table') { 
                                                                        setSettingsModalOpen(true); 
                                                                        setShowMoreMenu(false); 
                                                                    } 
                                                                }} 
                                                                className={`flex items-center w-full px-3 py-2 text-sm ${viewMode === 'table' ? 'text-gray-700 hover:bg-gray-100' : 'text-gray-400 cursor-not-allowed'}`} 
                                                                disabled={viewMode !== 'table'}
                                                            >
                                                                <FiSettings className="w-4 h-4 mr-2" />Settings {viewMode !== 'table' && '(Table view only)'}
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
                        <div className="border-t border-gray-200 px-3 md:px-4 py-2 bg-gradient-to-r from-gray-50 to-gray-100">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                                    <span className="font-semibold text-gray-800 text-sm">Showing {tasks.length} of {pagination.total} tasks</span>
                                    <div className="text-sm text-gray-600">{selectedTasks.size} task(s) selected</div>
                                </div>
                                
                                <div className="flex flex-wrap gap-2">
                                    <motion.button 
                                        className="px-2 py-1.5 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-lg text-xs font-medium flex items-center gap-1 shadow-sm disabled:opacity-50" 
                                        disabled={selectedTasks.size === 0} 
                                        whileHover={{ scale: 1.05 }} 
                                        whileTap={{ scale: 0.95 }}
                                    >
                                        <FiMail className="w-3 h-3" />
                                        <span className="hidden sm:inline">Send Message</span>
                                    </motion.button>
                                    
                                    <motion.button 
                                        className="px-2 py-1.5 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg text-xs font-medium flex items-center gap-1 shadow-sm disabled:opacity-50" 
                                        disabled={selectedTasks.size === 0} 
                                        whileHover={{ scale: 1.05 }} 
                                        whileTap={{ scale: 0.95 }}
                                    >
                                        <FiDownload className="w-3 h-3" />
                                        <span className="hidden sm:inline">Export Selected</span>
                                    </motion.button>
                                </div>
                            </div>
                        </div>
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
                                onClick={() => handleExport('selected')}
                            >
                                <FiDownload className="w-4 h-4" />
                                <span className="hidden sm:inline">Export</span>
                                <span className="sm:hidden">({selectedTasks.size})</span>
                            </motion.button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Modals */}
            <SettingsModal 
                isOpen={settingsModalOpen} 
                onClose={() => setSettingsModalOpen(false)} 
                columnConfig={columnConfig} 
                saveColumnConfig={saveColumnConfig} 
                defaultColumnConfig={defaultColumnConfig} 
                availableFields={availableFields} 
            />
            
            <StatusChangeModal 
                isOpen={statusModal.open} 
                onClose={closeStatusModal} 
                taskId={statusModal.taskId} 
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
            
            <UsersListModal 
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
            <AnimatePresence>
                {exportModal.open && (
                    <motion.div 
                        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" 
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }} 
                        exit={{ opacity: 0 }}
                    >
                        <motion.div 
                            className="bg-white rounded-lg p-4 max-w-sm w-full mx-auto" 
                            initial={{ scale: 0.9, opacity: 0 }} 
                            animate={{ scale: 1, opacity: 1 }} 
                            exit={{ scale: 0.9, opacity: 0 }}
                        >
                            <div className="text-center">
                                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                    <PiExportBold className="w-6 h-6 text-green-600" />
                                </div>
                                <h3 className="text-base font-semibold text-gray-800 mb-2">Exporting {exportModal.type.toUpperCase()}</h3>
                                <p className="text-gray-600 mb-4 text-sm">Your {exportModal.type} export is being processed...</p>
                                <div className="flex justify-center space-x-2">
                                    <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce"></div>
                                    <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                                    <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default TaskDisplay;