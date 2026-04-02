// TaskDisplay.jsx
import React, { useState, useEffect } from 'react';
import { Sidebar, Header } from '../components/header';
import { useNavigate } from 'react-router-dom';
import { FiMoreHorizontal } from 'react-icons/fi';
import SettingsModal from "../components/SettingModal";
import {
    FiUsers,
    FiBriefcase,
    FiCalendar,
    FiDollarSign,
    FiUserCheck,
    FiUserPlus,
    FiFileText,
    FiPlus,
    FiSearch,
    FiRefreshCw,
    FiPaperclip,
    FiX,
    FiMic,
    FiStopCircle,
    FiDownload,
    FiTrash2,
    FiArrowRight,
    FiArrowLeft,
    FiUser,
    FiLoader,
    FiCheckCircle,
    FiXCircle,
    FiClock,
    FiMenu,
    FiInfo,
    FiEdit,
    FiEye,
    FiSettings,
    FiGrid,
    FiMail,
    FiPrinter,
    FiPhone,
    FiFilter,
    FiMessageSquare,
    FiMove,
    FiSave,
    FiList,
    FiChevronDown,
    FiChevronUp,
    FiMapPin,
    FiCalendar as FiCalendarIcon,
    FiDollarSign as FiDollarSignIcon,
    FiCreditCard,
    FiHome,
    FiMap,
    FiGlobe
} from 'react-icons/fi';

import { PiExportBold } from "react-icons/pi";
import { PiFilePdfDuotone, PiMicrosoftExcelLogoDuotone } from "react-icons/pi";
import { AiOutlineMail } from "react-icons/ai";
import { FaWhatsapp } from "react-icons/fa6";
import DeleteConfirmationModal from '../components/delete-confirmation';
import { motion, AnimatePresence } from 'framer-motion';

// Import DnD Kit
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragOverlay
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    horizontalListSortingStrategy
} from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Import API utilities
import getHeaders from '../utils/get-headers';
import API_BASE_URL from '../utils/api-controller';

// Import Edit Task Modal
import EditTaskModal from '../TaskComponent/EdittaskModal';

// Bulk Status Change Modal Component
const BulkStatusChangeModal = ({ isOpen, onClose, selectedCount, onConfirm, loading }) => {
    const [selectedStatus, setSelectedStatus] = useState('');
    const [localLoading, setLocalLoading] = useState(false);
    
    const statusOptions = [
        { value: 'unassign', name: 'Unassign', color: 'blue' },
        { value: 'in process', name: 'In Process', color: 'orange' },
        { value: 'pending from client', name: 'Pending from Client', color: 'purple' },
        { value: 'pending from department', name: 'Pending from Department', color: 'yellow' },
        { value: 'complete', name: 'Complete', color: 'green' },
        { value: 'cancel', name: 'Cancel', color: 'red' }
    ];
    
    const getStatusColor = (status) => {
        switch (status) {
            case 'unassign': return 'bg-blue-100 text-blue-700 border-blue-300';
            case 'in process': return 'bg-orange-100 text-orange-700 border-orange-300';
            case 'pending from client': return 'bg-purple-100 text-purple-700 border-purple-300';
            case 'pending from department': return 'bg-yellow-100 text-yellow-700 border-yellow-300';
            case 'complete': return 'bg-green-100 text-green-700 border-green-300';
            case 'cancel': return 'bg-red-100 text-red-700 border-red-300';
            default: return 'bg-gray-100 text-gray-700 border-gray-300';
        }
    };
    
    const getStatusIcon = (status) => {
        switch (status) {
            case 'unassign': return <FiClock className="w-4 h-4" />;
            case 'in process': return <FiLoader className="w-4 h-4" />;
            case 'pending from client': return <FiEye className="w-4 h-4" />;
            case 'pending from department': return <FiXCircle className="w-4 h-4" />;
            case 'complete': return <FiCheckCircle className="w-4 h-4" />;
            case 'cancel': return <FiXCircle className="w-4 h-4" />;
            default: return <FiClock className="w-4 h-4" />;
        }
    };
    
    const handleConfirm = async () => {
        if (!selectedStatus) return;
        setLocalLoading(true);
        await onConfirm(selectedStatus);
        setLocalLoading(false);
        onClose();
    };
    
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
                        className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-auto overflow-hidden"
                        initial={{ scale: 0.95, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 20 }}
                        transition={{ duration: 0.2 }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white px-6 py-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                                        <FiCheckCircle className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold">Bulk Status Change</h3>
                                        <p className="text-indigo-100 text-sm">
                                            Update status for {selectedCount} selected task{selectedCount !== 1 ? 's' : ''}
                                        </p>
                                    </div>
                                </div>
                                <motion.button
                                    onClick={onClose}
                                    className="text-white hover:text-indigo-200 transition-colors p-2 rounded-lg hover:bg-white/10"
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                >
                                    <FiX className="w-5 h-5" />
                                </motion.button>
                            </div>
                        </div>
                        
                        {/* Content */}
                        <div className="p-6">
                            <div className="mb-4">
                                <label className="block text-sm font-semibold text-gray-700 mb-3">
                                    Select New Status
                                </label>
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
                                                {getStatusIcon(status.value)}
                                                <span className="font-medium">{status.name}</span>
                                            </div>
                                            {selectedStatus === status.value && (
                                                <FiCheckCircle className="w-5 h-5" />
                                            )}
                                        </motion.button>
                                    ))}
                                </div>
                            </div>
                            
                            {/* Warning Message */}
                            <div className="mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                                <div className="flex items-start gap-2">
                                    <FiInfo className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                                    <p className="text-xs text-yellow-700">
                                        This will update the status of all {selectedCount} selected task{selectedCount !== 1 ? 's' : ''} to the selected status.
                                    </p>
                                </div>
                            </div>
                        </div>
                        
                        {/* Footer */}
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
                                    <>
                                        <FiLoader className="w-4 h-4 animate-spin" />
                                        Updating...
                                    </>
                                ) : (
                                    <>
                                        <FiCheckCircle className="w-4 h-4" />
                                        Update {selectedCount} Task{selectedCount !== 1 ? 's' : ''}
                                    </>
                                )}
                            </motion.button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

// Client Details Modal Component
const ClientDetailsModal = ({ isOpen, onClose, clientData, loading }) => {
    if (!isOpen) return null;

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-GB');
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
                        className="bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-auto overflow-hidden"
                        initial={{ scale: 0.95, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 20 }}
                        transition={{ duration: 0.2 }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white px-6 py-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center overflow-hidden">
                                        {clientData?.basic?.image ? (
                                            <img 
                                                src={clientData.basic.image} 
                                                alt={clientData.basic.name}
                                                className="w-full h-full object-cover"
                                            />
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
                                    className="text-white hover:text-indigo-200 transition-colors p-2 rounded-lg hover:bg-white/10"
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                >
                                    <FiX className="w-5 h-5" />
                                </motion.button>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="p-6 max-h-[70vh] overflow-y-auto">
                            {loading ? (
                                <div className="flex justify-center py-8">
                                    <FiLoader className="w-8 h-8 text-indigo-600 animate-spin" />
                                </div>
                            ) : clientData ? (
                                <div className="space-y-6">
                                    {/* Basic Information */}
                                    <div>
                                        <h4 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                                            <FiUser className="w-4 h-4 text-indigo-600" />
                                            Basic Information
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

                                    {/* Contact Information */}
                                    <div>
                                        <h4 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                                            <FiMail className="w-4 h-4 text-indigo-600" />
                                            Contact Information
                                        </h4>
                                        <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                                            <div>
                                                <p className="text-xs text-gray-500">Mobile</p>
                                                <p className="font-medium text-gray-800">
                                                    {clientData.basic?.country_code ? `+${clientData.basic.country_code} ` : ''}{clientData.basic?.mobile || 'N/A'}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-500">Email</p>
                                                <p className="font-medium text-gray-800">{clientData.basic?.email || 'N/A'}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Address Information */}
                                    {clientData.basic?.address && (
                                        <div>
                                            <h4 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                                                <FiMapPin className="w-4 h-4 text-indigo-600" />
                                                Address Information
                                            </h4>
                                            <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                                                <div className="col-span-2">
                                                    <p className="text-xs text-gray-500">Address Line 1</p>
                                                    <p className="font-medium text-gray-800">{clientData.basic.address.address_line_1 || 'N/A'}</p>
                                                </div>
                                                <div className="col-span-2">
                                                    <p className="text-xs text-gray-500">Address Line 2</p>
                                                    <p className="font-medium text-gray-800">{clientData.basic.address.address_line_2 || 'N/A'}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-gray-500">Village/Town</p>
                                                    <p className="font-medium text-gray-800">{clientData.basic.address.village_town || 'N/A'}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-gray-500">City</p>
                                                    <p className="font-medium text-gray-800">{clientData.basic.address.city || 'N/A'}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-gray-500">District</p>
                                                    <p className="font-medium text-gray-800">{clientData.basic.address.district || 'N/A'}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-gray-500">State</p>
                                                    <p className="font-medium text-gray-800">{clientData.basic.address.state || 'N/A'}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-gray-500">Pincode</p>
                                                    <p className="font-medium text-gray-800">{clientData.basic.address.pincode || 'N/A'}</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Transactional Information */}
                                    {clientData.transactional && (
                                        <div>
                                            <h4 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                                                <FiDollarSignIcon className="w-4 h-4 text-indigo-600" />
                                                Transactional Information
                                            </h4>
                                            <div className="grid grid-cols-3 gap-4">
                                                <div className="bg-blue-50 p-3 rounded-lg text-center">
                                                    <p className="text-xs text-blue-600 font-medium">Balance</p>
                                                    <p className="text-lg font-bold text-blue-700">₹{clientData.transactional?.balance?.toLocaleString() || 0}</p>
                                                </div>
                                                <div className="bg-green-50 p-3 rounded-lg text-center">
                                                    <p className="text-xs text-green-600 font-medium">Credit</p>
                                                    <p className="text-lg font-bold text-green-700">₹{clientData.transactional?.credit?.toLocaleString() || 0}</p>
                                                </div>
                                                <div className="bg-red-50 p-3 rounded-lg text-center">
                                                    <p className="text-xs text-red-600 font-medium">Debit</p>
                                                    <p className="text-lg font-bold text-red-700">₹{clientData.transactional?.debit?.toLocaleString() || 0}</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="text-center py-8">
                                    <p className="text-gray-500">No client data available</p>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
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

// View Mode Toggle Component
const TableViewSwitch = ({ viewMode, setViewMode }) => {
    return (
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            <motion.button
                onClick={() => setViewMode('table')}
                className={`flex items-center gap-2 px-3 py-2 rounded-md transition-all ${viewMode === 'table' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-600 hover:text-gray-800'}`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
            >
                <FiList className="w-4 h-4" />
                <span className="text-xs font-medium hidden sm:inline">Table</span>
            </motion.button>
            
            <motion.button
                onClick={() => setViewMode('card')}
                className={`flex items-center gap-2 px-3 py-2 rounded-md transition-all ${viewMode === 'card' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-600 hover:text-gray-800'}`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
            >
                <FiGrid className="w-4 h-4" />
                <span className="text-xs font-medium hidden sm:inline">Cards</span>
            </motion.button>
        </div>
    );
};

// Users List Modal Component
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
                        transition={{ duration: 0.2 }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
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
                                    className="text-white hover:text-indigo-200 transition-colors p-2 rounded-lg hover:bg-white/10"
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                >
                                    <FiX className="w-5 h-5" />
                                </motion.button>
                            </div>
                        </div>
                        
                        {/* Users List */}
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
                                        <div className="text-xs text-gray-500">
                                            ID: {user.username}
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                            
                            {users.length === 0 && (
                                <div className="text-center py-8">
                                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <FiUser className="w-8 h-8 text-gray-400" />
                                    </div>
                                    <p className="text-gray-500 font-medium">No staff assigned</p>
                                </div>
                            )}
                        </div>
                        
                        {/* Footer */}
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

// Status Change Modal Component
const StatusChangeModal = ({ isOpen, onClose, taskId, currentStatus, onStatusChange, statusOptions }) => {
    const [selectedStatus, setSelectedStatus] = useState(currentStatus);
    const [loading, setLoading] = useState(false);
    
    if (!isOpen) return null;
    
    const getStatusColor = (status) => {
        switch (status) {
            case 'unassign': return 'bg-blue-100 text-blue-700 border-blue-300';
            case 'in process': return 'bg-orange-100 text-orange-700 border-orange-300';
            case 'pending from client': return 'bg-purple-100 text-purple-700 border-purple-300';
            case 'pending from department': return 'bg-yellow-100 text-yellow-700 border-yellow-300';
            case 'complete': return 'bg-green-100 text-green-700 border-green-300';
            case 'cancel': return 'bg-red-100 text-red-700 border-red-300';
            default: return 'bg-gray-100 text-gray-700 border-gray-300';
        }
    };
    
    const getStatusIcon = (status) => {
        switch (status) {
            case 'unassign': return <FiClock className="w-4 h-4" />;
            case 'in process': return <FiLoader className="w-4 h-4" />;
            case 'pending from client': return <FiEye className="w-4 h-4" />;
            case 'pending from department': return <FiXCircle className="w-4 h-4" />;
            case 'complete': return <FiCheckCircle className="w-4 h-4" />;
            case 'cancel': return <FiXCircle className="w-4 h-4" />;
            default: return <FiClock className="w-4 h-4" />;
        }
    };
    
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
                        transition={{ duration: 0.2 }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
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
                                    className="text-white hover:text-indigo-200 transition-colors p-1 rounded-lg hover:bg-white/10"
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                >
                                    <FiX className="w-4 h-4" />
                                </motion.button>
                            </div>
                        </div>
                        
                        {/* Current Status */}
                        <div className="p-4 border-b border-gray-200">
                            <div className="mb-3">
                                <label className="block text-xs font-semibold text-gray-600 mb-1">Current Status</label>
                                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border ${getStatusColor(currentStatus)}`}>
                                    {getStatusIcon(currentStatus)}
                                    <span className="font-medium text-sm">
                                        {statusOptions.find(s => s.value === currentStatus)?.name || currentStatus}
                                    </span>
                                </div>
                            </div>
                            
                            {/* New Status Selection */}
                            <div className="mb-2">
                                <label className="block text-xs font-semibold text-gray-600 mb-1">Select New Status</label>
                                <div className="space-y-1.5">
                                    {statusOptions.map((status) => (
                                        <motion.button
                                            key={status.value}
                                            onClick={() => setSelectedStatus(status.value)}
                                            className={`w-full flex items-center justify-between p-2.5 rounded-lg border transition-all ${selectedStatus === status.value ? 'ring-1 ring-indigo-500 ring-offset-1 ' : ''} ${getStatusColor(status.value)}`}
                                            whileHover={{ scale: 1.01 }}
                                            whileTap={{ scale: 0.99 }}
                                        >
                                            <div className="flex items-center gap-2">
                                                {getStatusIcon(status.value)}
                                                <span className="font-medium text-sm">{status.name}</span>
                                            </div>
                                            {selectedStatus === status.value && (
                                                <FiCheckCircle className="w-4 h-4" />
                                            )}
                                        </motion.button>
                                    ))}
                                </div>
                            </div>
                        </div>
                        
                        {/* Footer */}
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
                                {loading ? (
                                    <>
                                        <FiLoader className="w-4 h-4 animate-spin" />
                                        Updating...
                                    </>
                                ) : (
                                    'Update'
                                )}
                            </motion.button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

// Filter Row Component - Updated
const FilterRow = ({ filters, setFilters, serviceOptions, statusOptions, onSearch, onReset, showFilterRow, setShowFilterRow }) => {
    const [searchType, setSearchType] = useState('all');

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    const handleApplyFilters = () => {
        onSearch();
        setShowFilterRow(false);
    };

    const handleResetFilters = () => {
        onReset();
        setShowFilterRow(false);
    };

    if (!showFilterRow) return null;

    return (
        <motion.div 
            className="bg-gray-50 border-b border-gray-200 px-4 py-3"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
        >
            <div className="flex flex-wrap items-center gap-3">
                {/* Search Type Dropdown */}
                <div className="min-w-[120px]">
                    <select
                        value={searchType}
                        onChange={(e) => setSearchType(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-700 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                        <option value="all">Search All</option>
                        <option value="task">Task ID</option>
                        <option value="client">Client Name</option>
                        <option value="username">Username</option>
                        <option value="firm">Firm ID</option>
                        <option value="file">File No</option>
                    </select>
                </div>

                {/* Search Input */}
                <div className="flex-1 min-w-[200px]">
                    <div className="relative">
                        <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Search..."
                            value={filters.search}
                            onChange={(e) => handleFilterChange('search', e.target.value)}
                            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-gray-700 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                    </div>
                </div>

                {/* Service Filter */}
                <div className="min-w-[180px]">
                    <select
                        value={filters.service_id}
                        onChange={(e) => handleFilterChange('service_id', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-700 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                        <option value="">All Services</option>
                        {serviceOptions.map(service => (
                            <option key={service.value} value={service.value}>
                                {service.name}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Status Filter */}
                <div className="min-w-[180px]">
                    <select
                        value={filters.status}
                        onChange={(e) => handleFilterChange('status', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-700 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                        <option value="">All Status</option>
                        {statusOptions.map(status => (
                            <option key={status.value} value={status.value}>
                                {status.name}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2">
                    <motion.button
                        onClick={handleApplyFilters}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors flex items-center gap-2"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        <FiFilter className="w-4 h-4" />
                        Apply
                    </motion.button>
                    
                    <motion.button
                        onClick={handleResetFilters}
                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors"
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

// Task Table Component
const TaskTable = ({ 
    tasks, 
    selectedTasks, 
    handleTaskSelect, 
    selectAll, 
    handleSelectAll, 
    columnConfig, 
    renderCellContent,
    loading,
    toggleRowDropdown,
    activeRowDropdown,
    handleGetInOut,
    setActiveRowDropdown,
    handleStatusChange,
    navigate,
    openStatusModal,
    openUsersModal,
    openClientDetailsModal,
    handleEditTask
}) => {
    // Skeleton loader
    const SkeletonRow = () => (
        <div className="flex items-center border-b border-gray-100 animate-pulse p-3">
            <div className="w-8 md:w-10 flex-shrink-0 mr-2">
                <div className="h-4 bg-gray-200 rounded w-4"></div>
            </div>
            <div className="w-8 flex-shrink-0 mr-3">
                <div className="h-4 bg-gray-200 rounded w-4"></div>
            </div>
            {columnConfig.map((column, index) => (
                <div key={index} className="hidden md:block flex-1 p-2">
                    <div className="space-y-1">
                        {column.items.map((item, itemIndex) => (
                            <div key={itemIndex} className="min-h-[1.25rem] flex items-center">
                                <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );

    // Format date function
    const formatDate = (dateString) => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-GB');
    };

    // Calculate days left
    const getDaysLeft = (dueDate) => {
        if (!dueDate) return 0;
        const due = new Date(dueDate);
        const today = new Date();
        const diffTime = due - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    };

    // Mobile task card for table view
    const MobileTaskCard = ({ task, index }) => {
        const daysLeft = getDaysLeft(task.dates?.due_date);
        const isOverdue = daysLeft < 0;

        return (
            <motion.div
                className="bg-white border border-gray-200 rounded-lg p-3 mb-2 md:hidden"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
            >
                {/* Mobile Card Header */}
                <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            checked={selectedTasks.has(task.task_id)}
                            onChange={() => handleTaskSelect(task.task_id)}
                            className="w-4 h-4 text-indigo-600 rounded border-gray-400 focus:ring-indigo-500"
                        />
                        <div className="font-bold text-gray-800 text-sm w-4">{index + 1}</div>
                        <div className="w-7 h-7 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg flex items-center justify-center">
                            <FiBriefcase className="w-3.5 h-3.5 text-white" />
                        </div>
                        <div>
                            <div className="font-semibold text-gray-800 text-sm truncate max-w-[150px]">{task.service?.name}</div>
                            <div className="text-xs text-gray-500 truncate">{task.task_id}</div>
                        </div>
                    </div>
                    {/* 3-dot menu for mobile */}
                    <div className="relative">
                        <motion.button
                            onClick={() => toggleRowDropdown(task.task_id)}
                            className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200"
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            <div className="flex flex-col items-center justify-center space-y-0.5">
                                <div className="w-1 h-1 rounded-full bg-gray-600"></div>
                                <div className="w-1 h-1 rounded-full bg-gray-600"></div>
                                <div className="w-1 h-1 rounded-full bg-gray-600"></div>
                            </div>
                        </motion.button>
                        
                        {/* Mobile dropdown */}
                        <AnimatePresence>
                            {activeRowDropdown === task.task_id && (
                                <motion.div
                                    className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-xl border border-gray-200 z-50 overflow-hidden"
                                    initial={{ opacity: 0, y: -8, scale: 0.96 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: -8, scale: 0.96 }}
                                >
                                    {/* Get In/Out option - Placeholder */}
                                    <button
                                        onClick={() => {
                                            handleGetInOut(task.task_id, 'in');
                                            setActiveRowDropdown(null);
                                        }}
                                        className="flex items-center w-full px-4 py-3 text-sm text-indigo-600 hover:bg-indigo-50"
                                    >
                                        <FiArrowLeft className="mr-3" />
                                        GET IN
                                    </button>

                                    <div className="border-t my-1"></div>
                                    
                                    {/* Status Change Button */}
                                    <button
                                        onClick={() => {
                                            openStatusModal(task.task_id, task.status);
                                            setActiveRowDropdown(null);
                                        }}
                                        className="flex items-center w-full px-4 py-3 text-sm text-blue-600 hover:bg-blue-50"
                                    >
                                        <FiCheckCircle className="mr-3" />
                                        Change Status
                                    </button>

                                    <button
                                        onClick={() => {
                                            setActiveRowDropdown(null);
                                            navigate(`/task/${task.task_id}`);
                                        }}
                                        className="flex items-center w-full px-4 py-3 text-sm text-gray-700 hover:bg-gray-100"
                                    >
                                        <FiEye className="mr-3" />
                                        View Details
                                    </button>

                                    <button
                                        onClick={() => {
                                            setActiveRowDropdown(null);
                                            handleEditTask(task);
                                        }}
                                        className="flex items-center w-full px-4 py-3 text-sm text-gray-700 hover:bg-gray-100"
                                    >
                                        <FiEdit className="mr-3" />
                                        Edit Task
                                    </button>

                                    <div className="border-t my-1"></div>

                                    <button
                                        onClick={() => {
                                            setActiveRowDropdown(null);
                                            // delete modal
                                        }}
                                        className="flex items-center w-full px-4 py-3 text-sm text-red-600 hover:bg-red-50"
                                    >
                                        <FiTrash2 className="mr-3" />
                                        Delete Task
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                {/* Mobile Card Content */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-gray-700 text-sm">
                            <FiCalendar className="w-3 h-3 text-gray-400" />
                            <span>Target: {task.dates?.target_date ? formatDate(task.dates.target_date) : '-'}</span>
                        </div>
                        <div className="text-sm font-semibold text-gray-800">
                            ₹{task.charges?.fees?.toLocaleString() || 0}
                        </div>
                    </div>

                    <div className="flex items-center gap-2 text-gray-700 text-sm">
                        <FiCalendar className="w-3 h-3 text-gray-400" />
                        <span>Due: {task.dates?.due_date ? formatDate(task.dates.due_date) : '-'}</span>
                        {task.dates?.due_date && (
                            <span className={`text-xs font-bold ${isOverdue ? 'text-red-600' : daysLeft <= 7 ? 'text-orange-600' : 'text-green-600'}`}>
                                {isOverdue
                                    ? `Overdue by ${Math.abs(daysLeft)} day${Math.abs(daysLeft) > 1 ? 's' : ''}`
                                    : `Due in ${daysLeft} day${daysLeft > 1 ? 's' : ''}`
                                }
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-2 text-gray-700 text-sm">
                        <FiPhone className="w-3 h-3 text-gray-400" />
                        <span>{task.client?.profile?.mobile || '-'}</span>
                    </div>

                    <div className="text-sm text-gray-600">
                        <button 
                            onClick={() => navigate(`/task/${task.task_id}`)}
                            className="text-indigo-600 hover:text-indigo-800 hover:underline"
                        >
                            Service: {task.service?.name}
                        </button>
                    </div>

                    <div className="text-xs text-gray-500">
                        File: {task.file_no || '-'}
                    </div>

                    <div className="text-xs text-gray-500">
                        Firm: {task.firm?.firm_name || '-'}
                    </div>
                </div>
            </motion.div>
        );
    };

    return (
        <div className="flex-1 flex flex-col overflow-hidden">
            {/* Table Header - Fixed for desktop only */}
            <div className="hidden md:block border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100 sticky top-0 z-10">
                <div className="flex items-center min-w-max">
                    {/* Checkbox Column */}
                    <div className="w-10 p-3 flex-shrink-0">
                        <input
                            type="checkbox"
                            checked={selectAll}
                            onChange={handleSelectAll}
                            className="w-4 h-4 text-indigo-600 rounded border-gray-400 focus:ring-indigo-500"
                        />
                    </div>

                    {/* SL No Column */}
                    <div className="w-10 p-3 font-bold text-black-700 text-sm flex-shrink-0 text-center">
                        SL No
                    </div>

                    {/* Fixed Columns Layout - Equal width distribution */}
                    {columnConfig.map(column => (
                        <div
                            key={column.id}
                            className="p-3 font-semibold text-gray-700 text-sm flex-1 min-w-0 text-left"
                            style={{ flex: '1 1 0%' }}
                        >
                            <div className="truncate">{column.name === 'Users' ? 'Assigned' : column.name}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Mobile header */}
            <div className="md:hidden border-b border-gray-200 bg-white px-3 py-2 sticky top-0 z-10">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            checked={selectAll}
                            onChange={handleSelectAll}
                            className="w-4 h-4 text-indigo-600 rounded border-gray-400 focus:ring-indigo-500"
                        />
                        <span className="font-semibold text-gray-800 text-sm">Tasks</span>
                    </div>
                    <span className="text-xs text-gray-600">{tasks.length} tasks</span>
                </div>
            </div>

            {/* Scrollable Table Body */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden">
                {loading ? (
                    // Skeleton Loaders
                    <div className="md:min-w-max">
                        {Array.from({ length: 6 }).map((_, index) => (
                            <SkeletonRow key={index} />
                        ))}
                    </div>
                ) : tasks.length === 0 ? (
                    <div className="flex items-center justify-center py-8 text-gray-500 px-4">
                        <div className="text-center">
                            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                <FiUser className="w-6 h-6 text-gray-400" />
                            </div>
                            <p className="text-gray-500 font-medium text-sm">No tasks found</p>
                            <p className="text-gray-400 text-xs mt-1">Try adjusting your search or filters</p>
                        </div>
                    </div>
                ) : (
                    <div className="md:min-w-max">
                        {/* Mobile view - cards */}
                        <div className="md:hidden px-3 py-1">
                            {tasks.map((task, index) => (
                                <MobileTaskCard key={task.task_id} task={task} index={index} />
                            ))}
                        </div>

                        {/* Desktop view - table */}
                        <div className="hidden md:block">
                            {tasks.map((task, index) => (
                                <motion.div
                                    key={task.task_id}
                                    className={`flex items-center border-b border-gray-100 hover:bg-gray-50 transition-colors group`}
                                    initial={{ opacity: 0, y: 5 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.03 }}
                                >
                                    {/* Checkbox */}
                                    <div className="w-10 p-3 flex-shrink-0">
                                        <input
                                            type="checkbox"
                                            checked={selectedTasks.has(task.task_id)}
                                            onChange={() => handleTaskSelect(task.task_id)}
                                            className="w-4 h-4 text-indigo-600 rounded border-gray-400 focus:ring-indigo-500"
                                        />
                                    </div>

                                    {/* SL No - Bold */}
                                    <div className="w-10 p-3 flex-shrink-0 text-center">
                                        <span className="font-bold text-gray-800 text-sm">
                                            {index + 1}
                                        </span>
                                    </div>

                                    {/* Fixed Columns Layout - Equal width distribution */}
                                    {columnConfig.map(column => (
                                        <div 
                                            key={column.id} 
                                            className="p-3 flex-1 min-w-0 text-left"
                                            style={{ flex: '1 1 0%' }}
                                        >
                                            <div className="space-y-1">
                                                {column.items.map(item => (
                                                    <div key={item.id} className="min-h-[1.25rem] flex items-center">
                                                        {renderCellContent(task, item.id, handleGetInOut, navigate, openStatusModal, openUsersModal, openClientDetailsModal, handleEditTask)}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </motion.div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// Task Cards Component
const TaskCards = ({ 
    tasks, 
    selectedTasks, 
    handleTaskSelect, 
    columnConfig,
    renderCellContent,
    loading,
    toggleRowDropdown,
    activeRowDropdown,
    handleGetInOut,
    setActiveRowDropdown,
    handleStatusChange,
    statusOptions,
    navigate,
    openStatusModal,
    openUsersModal,
    openClientDetailsModal,
    handleEditTask
}) => {
    // Get status color
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

    // Format status
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

    // Calculate days left
    const getDaysLeft = (dueDate) => {
        if (!dueDate) return 0;
        const due = new Date(dueDate);
        const today = new Date();
        const diffTime = due - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    };

    // Format date function
    const formatDate = (dateString) => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-GB');
    };

    // Skeleton loader
    const SkeletonCard = () => (
        <div className="bg-white rounded-lg border border-gray-200 p-4 animate-pulse">
            <div className="flex items-start justify-between mb-3">
                <div>
                    <div className="h-3 bg-gray-200 rounded w-24 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-20"></div>
                </div>
                <div className="h-5 bg-gray-200 rounded w-16"></div>
            </div>
            <div className="space-y-2">
                <div className="h-3 bg-gray-200 rounded w-full"></div>
                <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
        </div>
    );

    return (
        <div className="p-3 md:p-4">
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {Array.from({ length: 6 }).map((_, index) => (
                        <SkeletonCard key={index} />
                    ))}
                </div>
            ) : tasks.length === 0 ? (
                <div className="flex items-center justify-center py-8 text-gray-500 px-4">
                    <div className="text-center">
                        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                            <FiBriefcase className="w-6 h-6 text-gray-400" />
                        </div>
                        <p className="text-gray-500 font-medium text-sm">No tasks found</p>
                        <p className="text-gray-400 text-xs mt-1">Try adjusting your search or filters</p>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {tasks.map((task, index) => {
                        const daysLeft = getDaysLeft(task.dates?.due_date);
                        const isOverdue = daysLeft < 0;

                        return (
                            <motion.div
                                key={task.task_id}
                                className={`bg-white rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all duration-200 overflow-hidden ${selectedTasks.has(task.task_id) ? 'ring-2 ring-indigo-500' : ''}`}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: index * 0.05 }}
                            >
                                {/* Card Header */}
                                <div className="p-3 border-b border-gray-100">
                                    <div className="flex items-start justify-between mb-2">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedTasks.has(task.task_id)}
                                                    onChange={() => handleTaskSelect(task.task_id)}
                                                    className="w-3.5 h-3.5 text-indigo-600 rounded border-gray-400 focus:ring-indigo-500 flex-shrink-0"
                                                />
                                                <div className="font-bold text-gray-800 text-xs w-4">{index + 1}</div>
                                                <div className="w-7 h-7 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-sm flex-shrink-0">
                                                    <FiBriefcase className="w-3.5 h-3.5 text-white" />
                                                </div>
                                                <div className="min-w-0">
                                                    <button
                                                        onClick={() => openClientDetailsModal(task.client?.username)}
                                                        className="font-semibold text-gray-800 text-xs truncate hover:text-indigo-600 hover:underline text-left"
                                                    >
                                                        {task.client?.profile?.name || 'N/A'}
                                                    </button>
                                                </div>
                                            </div>
                                            <button 
                                                onClick={() => navigate(`/task/${task.task_id}`)}
                                                className="text-left font-bold text-gray-800 text-sm truncate hover:text-indigo-600 hover:underline"
                                            >
                                                {task.service?.name}
                                            </button>
                                            <p className="text-gray-600 text-xs truncate">{task.firm?.firm_name}</p>
                                        </div>
                                        <div className="flex flex-col items-end gap-1">
                                            {/* 3-dot menu for cards */}
                                            <div className="relative">
                                                <motion.button
                                                    onClick={() => toggleRowDropdown(`card-${task.task_id}`)}
                                                    className="w-6 h-6 flex flex-col items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors space-y-0.5"
                                                    whileHover={{ scale: 1.1 }}
                                                    whileTap={{ scale: 0.95 }}
                                                >
                                                    <div className="w-1 h-1 rounded-full bg-gray-600"></div>
                                                    <div className="w-1 h-1 rounded-full bg-gray-600"></div>
                                                    <div className="w-1 h-1 rounded-full bg-gray-600"></div>
                                                </motion.button>

                                                {/* Dropdown for cards */}
                                                <AnimatePresence>
                                                    {activeRowDropdown === `card-${task.task_id}` && (
                                                        <motion.div
                                                            className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-xl border border-gray-200 z-50 overflow-hidden"
                                                            initial={{ opacity: 0, y: -8, scale: 0.96 }}
                                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                                            exit={{ opacity: 0, y: -8, scale: 0.96 }}
                                                        >
                                                            {/* Get In/Out option - Placeholder */}
                                                            <button
                                                                onClick={() => {
                                                                    handleGetInOut(task.task_id, 'in');
                                                                    setActiveRowDropdown(null);
                                                                }}
                                                                className="flex items-center w-full px-4 py-3 text-sm text-indigo-600 hover:bg-indigo-50"
                                                            >
                                                                <FiArrowLeft className="mr-3" />
                                                                GET IN
                                                            </button>

                                                            <div className="border-t my-1"></div>
                                                            
                                                            {/* Status Change Button */}
                                                            <button
                                                                onClick={() => {
                                                                    openStatusModal(task.task_id, task.status);
                                                                    setActiveRowDropdown(null);
                                                                }}
                                                                className="flex items-center w-full px-4 py-3 text-sm text-blue-600 hover:bg-blue-50"
                                                            >
                                                                <FiCheckCircle className="mr-3" />
                                                                Change Status
                                                            </button>

                                                            <button
                                                                onClick={() => {
                                                                    setActiveRowDropdown(null);
                                                                    navigate(`/task/${task.task_id}`);
                                                                }}
                                                                className="flex items-center w-full px-4 py-3 text-sm text-gray-700 hover:bg-gray-100"
                                                            >
                                                                <FiEye className="mr-3" />
                                                                View Details
                                                            </button>

                                                            <button
                                                                onClick={() => {
                                                                    setActiveRowDropdown(null);
                                                                    handleEditTask(task);
                                                                }}
                                                                className="flex items-center w-full px-4 py-3 text-sm text-gray-700 hover:bg-gray-100"
                                                            >
                                                                <FiEdit className="mr-3" />
                                                                Edit Task
                                                            </button>

                                                            <div className="border-t my-1"></div>

                                                            <button
                                                                onClick={() => {
                                                                    setActiveRowDropdown(null);
                                                                    // delete modal
                                                                }}
                                                                className="flex items-center w-full px-4 py-3 text-sm text-red-600 hover:bg-red-50"
                                                            >
                                                                <FiTrash2 className="mr-3" />
                                                                Delete Task
                                                            </button>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Card Body - Essential information */}
                                <div className="p-3">
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-1 text-gray-700 text-xs">
                                                <FiCalendar className="w-3 h-3 text-gray-400" />
                                                <span>Target: {task.dates?.target_date ? formatDate(task.dates.target_date) : '-'}</span>
                                            </div>
                                            <div className="text-xs font-semibold text-gray-800">
                                                <span className="inline-flex items-center gap-1">
                                                    <FiDollarSign className="w-2.5 h-2.5" />
                                                    ₹{task.charges?.fees?.toLocaleString() || 0}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-1 text-gray-700 text-xs">
                                            <FiCalendar className="w-3 h-3 text-gray-400" />
                                            <span>Due: {task.dates?.due_date ? formatDate(task.dates.due_date) : '-'}</span>
                                            {task.dates?.due_date && (
                                                <span className={`text-xs font-bold ${isOverdue ? 'text-red-600' : daysLeft <= 7 ? 'text-orange-600' : 'text-green-600'}`}>
                                                    {isOverdue
                                                        ? `Overdue by ${Math.abs(daysLeft)} day${Math.abs(daysLeft) > 1 ? 's' : ''}`
                                                        : `Due in ${daysLeft} day${daysLeft > 1 ? 's' : ''}`
                                                    }
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-1 text-gray-700 text-xs">
                                            <FiPhone className="w-3 h-3 text-gray-400" />
                                            <span>{task.client?.profile?.mobile || '-'}</span>
                                        </div>

                                        <div className="text-xs text-gray-500">
                                            File: {task.file_no || '-'}
                                        </div>

                                        {/* Status Display */}
                                        <div className="pt-2 border-t border-gray-100">
                                            <div className="flex items-center gap-1">
                                                <span className="text-xs font-medium text-gray-600">Status:</span>
                                                <div className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${getStatusColor(task.status)}`}>
                                                    {formatStatus(task.status)}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

const TaskDisplay = () => {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(() => {
        const saved = localStorage.getItem('sidebarMinimized');
        return saved ? JSON.parse(saved) : false;
    });
    const [showFilterDropdown, setShowFilterDropdown] = useState(false);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedStatus, setSelectedStatus] = useState('');
    const [selectedService, setSelectedService] = useState('');
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
    const [showMoreDropdown, setShowMoreDropdown] = useState(false);
    const [showMoreMenu, setShowMoreMenu] = useState(false);
    const [activeDragId, setActiveDragId] = useState(null);
    const [activeItemDragId, setActiveItemDragId] = useState(null);
    const [viewMode, setViewMode] = useState('table');
    const [isMobile, setIsMobile] = useState(false);
    const [statusModal, setStatusModal] = useState({ open: false, taskId: null, currentStatus: '' });
    const [usersModal, setUsersModal] = useState({ open: false, users: [], taskName: '' });
    const [showFilterRow, setShowFilterRow] = useState(false);
    const [clientModal, setClientModal] = useState({ open: false, clientData: null, loading: false });
    
    // Bulk Status Change Modal State
    const [bulkStatusModal, setBulkStatusModal] = useState({ open: false, loading: false });
    
    // Edit Modal State
    const [editModal, setEditModal] = useState({ open: false, taskData: null });
    
    // API States
    const [tasks, setTasks] = useState([]);
    const [serviceOptions, setServiceOptions] = useState([]);
    const [filters, setFilters] = useState({
        search: '',
        service_id: '',
        status: ''
    });
    const [pagination, setPagination] = useState({
        page_no: 1,
        limit: 20,
        total: 0
    });

    // Status Options
    const statusOptions = [
        { value: 'unassign', name: 'Unassign' },
        { value: 'in process', name: 'In Process' },
        { value: 'pending from client', name: 'Pending from Client' },
        { value: 'pending from department', name: 'Pending from Department' },
        { value: 'complete', name: 'Complete' },
        { value: 'cancel', name: 'Cancel' }
    ];

    // Initialize DnD sensors
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    // Check if mobile on mount and resize
    useEffect(() => {
        const checkIfMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };
        
        checkIfMobile();
        window.addEventListener('resize', checkIfMobile);
        
        return () => {
            window.removeEventListener('resize', checkIfMobile);
        };
    }, []);

    // Persist sidebar minimized state
    useEffect(() => {
        localStorage.setItem('sidebarMinimized', JSON.stringify(isMinimized));
    }, [isMinimized]);

    // Lock body scroll when mobile sidebar is open
    useEffect(() => {
        if (mobileMenuOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'auto';
        }
        return () => {
            document.body.style.overflow = 'auto';
        };
    }, [mobileMenuOpen]);

    // All available data fields from tasks
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

    // Fixed column configuration
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
            name: 'Actions',
            items: [
                { id: 'menu', label: 'Actions' }
            ],
            fixed: true
        }
    ];

    // Initialize column config
    useEffect(() => {
        const savedConfig = localStorage.getItem('taskColumnConfig');
        if (savedConfig) {
            try {
                const parsedConfig = JSON.parse(savedConfig);
                const updatedConfig = parsedConfig.map(col => {
                    const shouldBeFixed = col.name === 'Status' || col.name === 'Actions';
                    return {
                        ...col,
                        fixed: shouldBeFixed
                    };
                });
                setColumnConfig(updatedConfig);
            } catch (error) {
                console.error('Error parsing saved config:', error);
                setColumnConfig(defaultColumnConfig);
            }
        } else {
            setColumnConfig(defaultColumnConfig);
        }
    }, []);

    // Save column config
    const saveColumnConfig = (config) => {
        setColumnConfig(config);
        localStorage.setItem('taskColumnConfig', JSON.stringify(config));
    };

    // Fetch services
    const fetchServices = async () => {
        try {
            const headers = await getHeaders();
            const response = await fetch(`${API_BASE_URL}/service/list?search=`, {
                method: 'GET',
                headers: headers
            });
            
            if (!response.ok) {
                throw new Error('Failed to fetch services');
            }
            
            const responseData = await response.json();
            console.log('Services Response:', responseData);
            
            if (responseData.success && responseData.data && Array.isArray(responseData.data)) {
                const options = responseData.data.map(service => ({
                    value: service.service_id,
                    name: service.name
                }));
                setServiceOptions(options);
            }
        } catch (error) {
            console.error('Error fetching services:', error);
        }
    };

    // Fetch tasks
    const fetchTasks = async () => {
        setLoading(true);
        try {
            const headers = await getHeaders();
            
            // Build query string
            const queryParams = new URLSearchParams({
                page_no: pagination.page_no.toString(),
                limit: pagination.limit.toString()
            });
            
            if (filters.search) queryParams.append('search', filters.search);
            if (filters.service_id) queryParams.append('service_id', filters.service_id);
            if (filters.status) queryParams.append('status', filters.status);
            
            const response = await fetch(`${API_BASE_URL}/task/list?${queryParams.toString()}`, {
                method: 'GET',
                headers: headers
            });
            
            if (!response.ok) {
                throw new Error('Failed to fetch tasks');
            }
            
            const responseData = await response.json();
            console.log('API Response:', responseData);
            
            // Check if response has success and data structure
            if (responseData.success && responseData.data && Array.isArray(responseData.data)) {
                setTasks(responseData.data);
                setPagination(prev => ({
                    ...prev,
                    total: responseData.pagination?.total || responseData.data.length
                }));
            } else {
                console.error('Unexpected API response structure:', responseData);
                setTasks([]);
            }
        } catch (error) {
            console.error('Error fetching tasks:', error);
            setTasks([]);
        } finally {
            setLoading(false);
        }
    };

    // Bulk Status Change API Call
    const handleBulkStatusChange = async (newStatus) => {
        const taskIds = Array.from(selectedTasks);
        if (taskIds.length === 0) return;
        
        setBulkStatusModal(prev => ({ ...prev, loading: true }));
        
        try {
            const headers = await getHeaders();
            const response = await fetch(`${API_BASE_URL}/task/change-status`, {
                method: 'PUT',
                headers: {
                    ...headers,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    task_ids: taskIds,
                    status: newStatus
                })
            });
            
            if (!response.ok) {
                throw new Error('Failed to update statuses');
            }
            
            const responseData = await response.json();
            console.log('Bulk status update response:', responseData);
            
            if (responseData.success) {
                // Update local state for all updated tasks
                setTasks(prev => prev.map(task => 
                    selectedTasks.has(task.task_id) 
                        ? { ...task, status: newStatus }
                        : task
                ));
                
                // Clear selection after successful update
                setSelectedTasks(new Set());
                setSelectAll(false);
                
                // Show success message (optional)
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

    // Open bulk status change modal
    const openBulkStatusModal = () => {
        if (selectedTasks.size === 0) return;
        setBulkStatusModal({ open: true, loading: false });
    };

    // Fetch client details
    const fetchClientDetails = async (username) => {
        if (!username) return;
        
        setClientModal(prev => ({ ...prev, loading: true, open: true }));
        try {
            const headers = await getHeaders();
            const response = await fetch(`${API_BASE_URL}/client/details/profile?username=${username}`, {
                method: 'GET',
                headers: headers
            });
            
            if (!response.ok) {
                throw new Error('Failed to fetch client details');
            }
            
            const responseData = await response.json();
            console.log('Client Details Response:', responseData);
            
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

    // Open client details modal
    const openClientDetailsModal = (username) => {
        fetchClientDetails(username);
    };

    // Close client details modal
    const closeClientDetailsModal = () => {
        setClientModal({ open: false, clientData: null, loading: false });
    };

    // Initial data fetch
    useEffect(() => {
        fetchServices();
        fetchTasks();
    }, []);

    // Handle search with filters
    const handleSearch = () => {
        setPagination(prev => ({ ...prev, page_no: 1 }));
        fetchTasks();
    };

    // Handle reset filters
    const handleResetFilters = () => {
        setFilters({
            search: '',
            service_id: '',
            status: ''
        });
        setPagination(prev => ({ ...prev, page_no: 1 }));
        setTimeout(() => fetchTasks(), 100);
    };

    // Handle status change (single task)
const handleStatusChange = async (taskId, newStatus) => {
    try {
        const headers = await getHeaders();
        const response = await fetch(`${API_BASE_URL}/task/change-status`, {
            method: 'PUT',
            headers: {
                ...headers,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                task_ids: [taskId],
                status: newStatus
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to update status');
        }
        
        const responseData = await response.json();
        
        if (responseData.success) {
            // Update local state
            setTasks(prev => prev.map(task =>
                task.task_id === taskId ? { ...task, status: newStatus } : task
            ));
            // Show success message (optional)
            const statusName = statusOptions.find(s => s.value === newStatus)?.name || newStatus;
            console.log(`Task ${taskId} status updated to ${statusName}`);
        } else {
            throw new Error(responseData.message || 'Failed to update status');
        }
    } catch (error) {
        console.error('Error updating status:', error);
        alert(`Failed to update status: ${error.message}`);
    }
};

    // Handle edit task
    const handleEditTask = (task) => {
        setEditModal({ open: true, taskData: task });
    };

    // Handle task updated
    const handleTaskUpdated = () => {
        fetchTasks();
    };

    // Handle get in/out - Placeholder for now
    const handleGetInOut = (taskId, action) => {
        console.log(`Task ${taskId} - ${action}`);
        // Implement API call when endpoint is available
    };

    // Format date function
    const formatDate = (dateString) => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-GB');
    };

    // Calculate days left
    const getDaysLeft = (dueDate) => {
        if (!dueDate) return 0;
        const due = new Date(dueDate);
        const today = new Date();
        const diffTime = due - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    };

    // Handle export
    const handleExport = (type, data = null) => {
        setExportModal({ open: true, type, data });

        // Simulate export process
        setTimeout(() => {
            setExportModal({ open: false, type: '', data: null });
            alert(`${type.toUpperCase()} export completed successfully!`);
        }, 1500);
    };

    // Handle task selection
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

    // Handle select all
    const handleSelectAll = () => {
        if (selectAll) {
            setSelectedTasks(new Set());
        } else {
            const allTaskIds = new Set(tasks.map(task => task.task_id));
            setSelectedTasks(allTaskIds);
        }
        setSelectAll(!selectAll);
    };

    // Toggle row dropdown
    const toggleRowDropdown = (taskId) => {
        setActiveRowDropdown(activeRowDropdown === taskId ? null : taskId);
    };

    // Close all dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (!event.target.closest('.dropdown-container')) {
                setActiveRowDropdown(null);
                setShowExportDropdown(false);
                setShowFilterDropdown(false);
                setShowMoreMenu(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Open status modal
    const openStatusModal = (taskId, currentStatus) => {
        setStatusModal({
            open: true,
            taskId,
            currentStatus
        });
    };

    // Close status modal
    const closeStatusModal = () => {
        setStatusModal({
            open: false,
            taskId: null,
            currentStatus: ''
        });
    };

    // Open users modal
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

    // Close users modal
    const closeUsersModal = () => {
        setUsersModal({
            open: false,
            users: [],
            taskName: ''
        });
    };

    // Render cell content based on field type
    const renderCellContent = (task, fieldId, handleGetInOut, navigate, openStatusModal, openUsersModal, openClientDetailsModal, handleEditTask) => {
        const daysLeft = getDaysLeft(task.dates?.due_date);
        const isOverdue = daysLeft < 0;

        switch (fieldId) {
            case 'task_id':
                return (
                    <div className="text-gray-700 font-medium text-sm">
                        {task.task_id || '-'}
                    </div>
                );
            case 'client_name':
                return (
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-sm flex-shrink-0">
                            <FiUser className="w-3.5 h-3.5 text-white" />
                        </div>
                        <div>
                            <button
                                onClick={() => openClientDetailsModal(task.client?.username)}
                                className="font-semibold text-gray-800 group-hover:text-indigo-600 transition-colors text-sm hover:text-indigo-600 hover:underline text-left"
                            >
                                {task.client?.profile?.name || task.client?.name || '-'}
                            </button>
                        </div>
                    </div>
                );
            case 'client_mobile':
                return (
                    <div className="flex items-center gap-2 text-gray-700 font-medium text-sm">
                        <FiPhone className="w-3 h-3 text-gray-400" />
                        {task.client?.profile?.mobile || task.client?.mobile || '-'}
                    </div>
                );
            case 'client_email':
                const clientEmail = task.client?.profile?.email || task.client?.email || '-';
                const truncatedEmail = clientEmail.length > 15 ? clientEmail.substring(0, 15) + '...' : clientEmail;
                
                return (
                    <div className="flex items-center gap-2 text-gray-700 font-medium text-sm">
                        <FiMail className="w-3 h-3 text-gray-400" />
                        <span title={clientEmail}>{truncatedEmail}</span>
                    </div>
                );
            case 'firm_name':
                return (
                    <div className="text-gray-700 font-medium text-sm">
                        {task.firm?.firm_name || task.firm_name || '-'}
                    </div>
                );
            case 'service_name':
                return (
                    <button 
                        onClick={() => navigate(`/task/${task.task_id}`)}
                        className="font-semibold text-gray-800 text-sm hover:text-indigo-600 hover:underline transition-colors text-left"
                    >
                        {task.service?.name || task.service_name || '-'}
                    </button>
                );
            case 'fees':
                return (
                    <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                        <FiDollarSign className="w-3 h-3" />
                        ₹{(task.charges?.fees || task.fees || 0).toLocaleString()}
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
                return (
                    <span className="text-gray-700 font-medium text-sm capitalize">
                        {task.billing_status || '-'}
                    </span>
                );
            case 'staffs':
                const staffs = task.staffs || [];
                if (staffs.length === 1) {
                    return (
                        <button
                            onClick={() => openUsersModal(staffs, task.service?.name)}
                            className="flex items-center justify-start cursor-pointer hover:opacity-80 transition-opacity"
                            title={`Click to view ${staffs[0].name}'s details`}
                        >
                            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-full border-2 border-white flex items-center justify-center text-xs font-bold text-white">
                                {staffs[0].name?.charAt(0) || 'S'}
                            </div>
                        </button>
                    );
                } else if (staffs.length === 2) {
                    return (
                        <div className="flex -space-x-2">
                            {staffs.map((staff, staffIndex) => (
                                <button
                                    key={staff.assign_id || staffIndex}
                                    onClick={() => openUsersModal(staffs, task.service?.name)}
                                    className="flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity"
                                    title={`Click to view ${staff.name}'s details`}
                                >
                                    <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-full border-2 border-white flex items-center justify-center text-xs font-bold text-white">
                                        {staff.name?.charAt(0) || 'S'}
                                    </div>
                                </button>
                            ))}
                        </div>
                    );
                } else if (staffs.length > 2) {
                    const showMoreCount = staffs.length - 2;
                    return (
                        <div className="flex -space-x-2">
                            {staffs.slice(0, 2).map((staff, staffIndex) => (
                                <div
                                    key={staff.assign_id || staffIndex}
                                    className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-full border-2 border-white flex items-center justify-center text-xs font-bold text-white"
                                >
                                    {staff.name?.charAt(0) || 'S'}
                                </div>
                            ))}
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
                return (
                    <div className="text-gray-700 font-medium text-sm">
                        {task.create_by?.name || '-'}
                    </div>
                );
            case 'status':
                const statusColor = task.status === 'unassign' ? 'bg-blue-100 text-blue-700' :
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
                    <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${statusColor}`}>
                        {statusText}
                    </div>
                );
            case 'menu':
                return (
                    <div className="relative dropdown-container flex justify-start">
                        <motion.button
                            onClick={() => toggleRowDropdown(task.task_id)}
                            className="w-8 h-8 flex flex-col items-center justify-center rounded-full
                                   bg-gray-100 hover:bg-gray-200 transition-colors space-y-0.5"
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
                                    className="absolute left-0 mt-1 w-56 bg-white rounded-lg
                                           shadow-xl border border-gray-200 z-50 overflow-hidden"
                                    initial={{ opacity: 0, y: -8, scale: 0.96 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: -8, scale: 0.96 }}
                                    transition={{ duration: 0.15 }}
                                >
                                    <div className="py-1">
                                        <button
                                            onClick={() => {
                                                handleGetInOut(task.task_id, 'in');
                                                setActiveRowDropdown(null);
                                            }}
                                            className="flex items-center w-full px-3 py-2.5 text-sm
                                                   text-indigo-600 hover:bg-indigo-50 transition-colors"
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
                                            className="flex items-center w-full px-3 py-2.5 text-sm
                                                   text-blue-600 hover:bg-blue-50 transition-colors"
                                        >
                                            <FiCheckCircle className="mr-2 text-blue-600 w-4 h-4" />
                                            Change Status
                                        </button>

                                        <button
                                            onClick={() => {
                                                setActiveRowDropdown(null);
                                                navigate(`/task/${task.task_id}`);
                                            }}
                                            className="flex items-center w-full px-3 py-2.5 text-sm
                                                   text-gray-700 hover:bg-indigo-50 transition-colors"
                                        >
                                            <FiEye className="mr-2 text-indigo-600 w-4 h-4" />
                                            View Details
                                        </button>

                                        <button
                                            onClick={() => {
                                                setActiveRowDropdown(null);
                                                handleEditTask(task);
                                            }}
                                            className="flex items-center w-full px-3 py-2.5 text-sm
                                                   text-gray-700 hover:bg-green-50 transition-colors"
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
                                            className="flex items-center w-full px-3 py-2.5 text-sm
                                                   text-red-600 hover:bg-red-50 transition-colors"
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
                return (
                    <span className="text-gray-700 font-medium text-sm">
                        {task[fieldId] || '-'}
                    </span>
                );
        }
    };

    // Settings Modal Component with Drag & Drop
    const SettingsModal = React.memo(() => {
        const [localColumnConfig, setLocalColumnConfig] = useState(columnConfig);
        const [localActiveDragId, setLocalActiveDragId] = useState(null);
        const [localActiveItemDragId, setLocalActiveItemDragId] = useState(null);
        const [editingColumnId, setEditingColumnId] = useState(null);
        const [tempColumnName, setTempColumnName] = useState('');

        // Initialize with current column config
        useEffect(() => {
            setLocalColumnConfig(columnConfig);
        }, [columnConfig, settingsModalOpen]);

        // Handle drag end for columns in modal
        const handleModalDragEnd = (event) => {
            const { active, over } = event;
            
            if (!over || active.id === over.id) {
                setLocalActiveDragId(null);
                return;
            }
            
            const oldIndex = localColumnConfig.findIndex((col) => col.id === active.id);
            const newIndex = localColumnConfig.findIndex((col) => col.id === over.id);
            
            if (oldIndex === -1 || newIndex === -1) {
                setLocalActiveDragId(null);
                return;
            }
            
            const sourceColumn = localColumnConfig[oldIndex];
            const targetColumn = localColumnConfig[newIndex];
            
            if (sourceColumn.fixed) {
                setLocalActiveDragId(null);
                return;
            }
            
            if (targetColumn.fixed) {
                if (newIndex > oldIndex) {
                    const firstFixedIndex = localColumnConfig.findIndex(col => col.fixed);
                    if (firstFixedIndex > 0) {
                        const newConfig = arrayMove(localColumnConfig, oldIndex, firstFixedIndex - 1);
                        setLocalColumnConfig(newConfig);
                    }
                } else {
                    const lastNonFixedIndex = localColumnConfig.reduce((lastIndex, col, index) => 
                        !col.fixed ? index : lastIndex, -1
                    );
                    if (lastNonFixedIndex !== -1) {
                        const newConfig = arrayMove(localColumnConfig, oldIndex, lastNonFixedIndex);
                        setLocalColumnConfig(newConfig);
                    }
                }
            } else {
                const newConfig = arrayMove(localColumnConfig, oldIndex, newIndex);
                setLocalColumnConfig(newConfig);
            }
            
            setLocalActiveDragId(null);
        };

        // Handle drag end for items within a column in modal
        const handleModalItemDragEnd = (event, columnIndex) => {
            const { active, over } = event;
            
            if (active.id !== over.id) {
                setLocalColumnConfig((items) => {
                    const newConfig = [...items];
                    const columnItems = newConfig[columnIndex].items;
                    const oldIndex = columnItems.findIndex((item) => item.id === active.id);
                    const newIndex = columnItems.findIndex((item) => item.id === over.id);
                    
                    newConfig[columnIndex].items = arrayMove(columnItems, oldIndex, newIndex);
                    return newConfig;
                });
            }
            
            setLocalActiveItemDragId(null);
        };

        // Add item to column in modal
        const addItemToColumnInModal = (columnIndex, fieldId) => {
            const field = availableFields.find(f => f.id === fieldId);
            if (!field) return;

            const newConfig = [...localColumnConfig];
            if (newConfig[columnIndex].items.length < 5) {
                newConfig[columnIndex].items.push({
                    id: field.id,
                    label: field.label
                });
                setLocalColumnConfig(newConfig);
            }
        };

        // Remove item from column in modal
        const removeItemFromColumnInModal = (columnIndex, itemIndex) => {
            const newConfig = [...localColumnConfig];
            newConfig[columnIndex].items.splice(itemIndex, 1);
            setLocalColumnConfig(newConfig);
        };

        // Add new column in modal
        const addNewColumnInModal = () => {
            const newConfig = [...localColumnConfig];
            const newColumnId = `col-${Date.now()}`;
            
            const firstFixedIndex = newConfig.findIndex(col => col.fixed);
            const insertIndex = firstFixedIndex >= 0 ? firstFixedIndex : newConfig.length;
            
            newConfig.splice(insertIndex, 0, {
                id: newColumnId,
                name: `New Column`,
                items: [],
                fixed: false
            });
            setLocalColumnConfig(newConfig);
            
            setEditingColumnId(newColumnId);
            setTempColumnName('New Column');
        };

        // Save changes from modal
        const saveModalChanges = () => {
            saveColumnConfig(localColumnConfig);
            setSettingsModalOpen(false);
        };

        // Reset to default in modal
        const resetToDefaultInModal = () => {
            setLocalColumnConfig(defaultColumnConfig);
        };

        // Handle column name edit
        const startEditingColumn = (columnId, currentName) => {
            setEditingColumnId(columnId);
            setTempColumnName(currentName);
        };

        const saveColumnName = (columnId) => {
            if (!tempColumnName.trim()) {
                setEditingColumnId(null);
                return;
            }
            
            const newConfig = localColumnConfig.map(col => 
                col.id === columnId ? { ...col, name: tempColumnName.trim() } : col
            );
            setLocalColumnConfig(newConfig);
            setEditingColumnId(null);
        };

        // Sortable Column Component for Modal
        const ModalSortableColumn = React.memo(({ column, index }) => {
            const {
                attributes,
                listeners,
                setNodeRef,
                transform,
                transition,
                isDragging
            } = useSortable({
                id: column.id,
                disabled: column.fixed
            });

            const style = {
                transform: CSS.Transform.toString(transform),
                transition,
                opacity: isDragging ? 0.5 : 1,
                zIndex: isDragging ? 1000 : 1,
                cursor: column.fixed ? 'not-allowed' : 'move'
            };

            return (
                <motion.div
                    ref={setNodeRef}
                    style={style}
                    {...(column.fixed ? {} : attributes)}
                    {...(column.fixed ? {} : listeners)}
                    className={`border-2 rounded-xl p-4 transition-all duration-200 ${column.fixed
                        ? 'bg-indigo-50 border-indigo-300 shadow-sm cursor-not-allowed'
                        : 'bg-white border-gray-200 hover:shadow-md hover:border-gray-300 cursor-move'
                        }`}
                    whileHover={{ scale: column.fixed ? 1 : 1.02 }}
                >
                    {/* Column Header */}
                    <div className="mb-3">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                {!column.fixed && (
                                    <div className="cursor-grab active:cursor-grabbing flex-shrink-0">
                                        <FiMove className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                                    </div>
                                )}
                                <div className="min-w-0 flex-1">
                                    {editingColumnId === column.id ? (
                                        <div className="space-y-2">
                                            <input
                                                type="text"
                                                value={tempColumnName}
                                                onChange={(e) => setTempColumnName(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') saveColumnName(column.id);
                                                    if (e.key === 'Escape') setEditingColumnId(null);
                                                }}
                                                className="w-full px-3 py-2 border border-gray-300 rounded text-sm font-bold text-gray-800 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                                autoFocus
                                                placeholder="Column name"
                                            />
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => saveColumnName(column.id)}
                                                    className="flex-1 px-3 py-1.5 bg-green-500 text-white rounded text-xs font-medium hover:bg-green-600 transition-colors flex items-center justify-center gap-1"
                                                >
                                                    <FiCheckCircle className="w-3 h-3" />
                                                </button>
                                                <button
                                                    onClick={() => setEditingColumnId(null)}
                                                    className="flex-1 px-3 py-1.5 bg-red-500 text-white rounded text-xs font-medium hover:bg-red-600 transition-colors flex items-center justify-center gap-1"
                                                >
                                                    <FiX className="w-3 h-3" />
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-between">
                                            <div className="min-w-0">
                                                <h3 className="font-bold text-gray-800 text-sm truncate">
                                                    {column.name}
                                                </h3>
                                                <div className="flex items-center gap-2 mt-1">
                                                    {column.fixed && (
                                                        <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium flex-shrink-0">
                                                            Fixed
                                                        </span>
                                                    )}
                                                    <span className="text-xs text-gray-500">
                                                        {column.items.length} item{column.items.length !== 1 ? 's' : ''}
                                                    </span>
                                                </div>
                                            </div>
                                            {!column.fixed && (
                                                <button
                                                    onClick={() => startEditingColumn(column.id, column.name)}
                                                    className="text-gray-500 hover:text-gray-700 p-1 hover:bg-gray-100 rounded flex-shrink-0 ml-2"
                                                    title="Edit column name"
                                                >
                                                    <FiEdit className="w-3 h-3" />
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                            {!column.fixed && column.items.length === 0 && !editingColumnId && (
                                <button
                                    onClick={() => {
                                        const newConfig = [...localColumnConfig];
                                        newConfig.splice(index, 1);
                                        setLocalColumnConfig(newConfig);
                                    }}
                                    className="text-red-500 hover:text-red-700 transition-colors duration-200 p-1.5 rounded hover:bg-red-50 ml-2 flex-shrink-0"
                                >
                                    <FiX className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Column Items with Drag & Drop */}
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragStart={(event) => setLocalActiveItemDragId(event.active.id)}
                        onDragEnd={(event) => handleModalItemDragEnd(event, index)}
                        onDragCancel={() => setLocalActiveItemDragId(null)}
                    >
                        <SortableContext
                            items={column.items.map(item => item.id)}
                            strategy={verticalListSortingStrategy}
                        >
                            <div className="space-y-2 mb-3 min-h-[60px]">
                                {column.items.map((item, itemIndex) => (
                                    <ModalSortableItem
                                        key={item.id}
                                        item={item}
                                        columnIndex={index}
                                        itemIndex={itemIndex}
                                        columnId={column.id}
                                        removeItem={removeItemFromColumnInModal}
                                    />
                                ))}
                            </div>
                        </SortableContext>
                    </DndContext>

                    {/* Add Field Dropdown */}
                    {column.items.length < 5 && !editingColumnId && (
                        <select
                            value=""
                            onChange={(e) => {
                                if (e.target.value) {
                                    addItemToColumnInModal(index, e.target.value);
                                    e.target.value = '';
                                }
                            }}
                            className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 bg-white"
                        >
                            <option value="">Add field...</option>
                            {availableFields
                                .filter(field => field.id !== 'menu')
                                .filter(field =>
                                    !localColumnConfig.some(col =>
                                        col.items.some(item => item.id === field.id)
                                    ) ||
                                    localColumnConfig[index].items.some(item => item.id === field.id)
                                )
                                .map(field => (
                                    <option key={field.id} value={field.id}>
                                        {field.label}
                                    </option>
                                ))}
                        </select>
                    )}

                    {/* Empty State */}
                    {column.items.length === 0 && !editingColumnId && (
                        <div className="text-center py-4 text-gray-400 text-sm">
                            <p>Drag fields here or select from dropdown</p>
                        </div>
                    )}
                </motion.div>
            );
        });

        // Sortable Item Component for Modal
        const ModalSortableItem = React.memo(({ item, columnIndex, itemIndex, columnId, removeItem }) => {
            const {
                attributes,
                listeners,
                setNodeRef,
                transform,
                transition,
                isDragging
            } = useSortable({ id: item.id });

            const style = {
                transform: CSS.Transform.toString(transform),
                transition,
                opacity: isDragging ? 0.5 : 1,
                zIndex: isDragging ? 1000 : 1
            };

            return (
                <motion.div
                    ref={setNodeRef}
                    style={style}
                    {...attributes}
                    {...listeners}
                    className={`flex items-center justify-between bg-white border px-3 py-2 rounded-lg text-sm transition-all duration-200
                        ${isDragging ? 'shadow-lg border-indigo-400' : 'border-gray-200 hover:bg-gray-50 hover:border-gray-300'}`}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: itemIndex * 0.05 }}
                >
                    <div className="flex items-center gap-2">
                        <FiMove className="w-3 h-3 text-gray-400" />
                        <span className="font-medium text-gray-700">{item.label}</span>
                    </div>
                    <motion.button
                        onClick={() => removeItem(columnIndex, itemIndex)}
                        className="text-red-500 hover:text-red-700 transition-colors duration-200 p-1 rounded hover:bg-red-50"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                    >
                        <FiX className="w-3 h-3" />
                    </motion.button>
                </motion.div>
            );
        });

        return (
            <AnimatePresence>
                {settingsModalOpen && (
                    <motion.div
                        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setSettingsModalOpen(false)}
                    >
                        <motion.div
                            className="bg-white rounded-xl shadow-2xl w-full max-w-6xl
                                     max-h-[90vh] flex flex-col overflow-hidden"
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white px-6 py-4 flex justify-between items-center">
                                <div className="flex items-center gap-3 flex-wrap">
                                    <h2 className="text-xl font-bold">Table Column Settings</h2>
                                    <span className="text-indigo-100 text-sm">
                                        — Drag and drop to rearrange columns and items
                                    </span>
                                </div>
                                <motion.button
                                    onClick={() => setSettingsModalOpen(false)}
                                    className="text-white hover:text-indigo-200 transition-colors duration-200 p-1 rounded-lg hover:bg-indigo-500"
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                >
                                    <FiX className="w-6 h-6" />
                                </motion.button>
                            </div>

                            {/* Content */}
                            <div className="p-6 overflow-y-auto flex-1">
                                <DndContext
                                    sensors={sensors}
                                    collisionDetection={closestCenter}
                                    onDragStart={(event) => setLocalActiveDragId(event.active.id)}
                                    onDragEnd={handleModalDragEnd}
                                    onDragCancel={() => setLocalActiveDragId(null)}
                                >
                                    <SortableContext
                                        items={localColumnConfig.map(column => column.id)}
                                        strategy={horizontalListSortingStrategy}
                                    >
                                        <div className="grid grid-cols-1 lg:grid-cols-6 gap-4 mb-6">
                                            {localColumnConfig.map((column, index) => (
                                                <ModalSortableColumn
                                                    key={column.id}
                                                    column={column}
                                                    index={index}
                                                />
                                            ))}
                                        </div>
                                    </SortableContext>

                                    <DragOverlay>
                                        {localActiveDragId ? (
                                            <div className="bg-white border-2 border-indigo-300 shadow-xl rounded-xl p-4 w-48">
                                                <div className="flex items-center gap-2 mb-3">
                                                    <FiMove className="w-4 h-4 text-indigo-400" />
                                                    <h3 className="font-bold text-gray-800 text-sm">
                                                        {localColumnConfig.find(col => col.id === localActiveDragId)?.name || 'Column'}
                                                    </h3>
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                    {localColumnConfig.find(col => col.id === localActiveDragId)?.items.length || 0} items
                                                </div>
                                            </div>
                                        ) : null}
                                    </DragOverlay>
                                </DndContext>

                                {/* Add Column Button */}
                                <div className="mb-6">
                                    <motion.button
                                        onClick={addNewColumnInModal}
                                        className="px-4 py-3 bg-gradient-to-r from-gray-100 to-gray-200
                                               border-2 border-dashed border-gray-300 rounded-xl
                                               text-gray-700 font-medium hover:from-gray-200 hover:to-gray-300
                                               transition-all duration-200 flex items-center gap-2"
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        <FiPlus className="w-4 h-4" />
                                        Add New Column
                                    </motion.button>
                                </div>

                                {/* Available Fields */}
                                <div className="border-t pt-6">
                                    <h3 className="font-bold text-gray-800 text-sm mb-4 flex items-center gap-2">
                                        <FiGrid className="w-4 h-4 text-indigo-600" />
                                        Available Fields (Drag to columns)
                                    </h3>

                                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                                        {availableFields
                                            .filter(field => field.id !== 'menu')
                                            .map(field => (
                                                <DraggableField
                                                    key={field.id}
                                                    field={field}
                                                    localColumnConfig={localColumnConfig}
                                                />
                                            ))}
                                    </div>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="border-t px-6 py-4 bg-gray-50">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                    <motion.button
                                        onClick={resetToDefaultInModal}
                                        className="inline-flex items-center justify-center px-6 py-3 text-sm font-medium
                                               border border-gray-300 rounded-lg text-gray-700
                                               hover:bg-gray-200 transition-all duration-200 hover:shadow-sm gap-2"
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                    >
                                        <FiRefreshCw className="w-4 h-4" />
                                        Reset to Default
                                    </motion.button>

                                    <div className="flex flex-col sm:flex-row gap-3">
                                        <motion.button
                                            onClick={() => setSettingsModalOpen(false)}
                                            className="inline-flex items-center justify-center px-6 py-3 text-sm font-medium
                                                     border border-gray-300 rounded-lg text-gray-700
                                                     hover:bg-gray-200 transition-all duration-200 hover:shadow-sm"
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                        >
                                            Cancel
                                        </motion.button>

                                        <motion.button
                                            onClick={saveModalChanges}
                                            className="inline-flex items-center justify-center px-6 py-3 text-sm font-medium
                                                     bg-gradient-to-r from-indigo-600 to-indigo-700 text-white
                                                     rounded-lg hover:from-indigo-700 hover:to-indigo-800
                                                     transition-all duration-200 hover:shadow-md shadow-sm gap-2"
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                        >
                                            <FiSave className="w-4 h-4" />
                                            Save Changes
                                        </motion.button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        );
    });

    // Draggable Field Component for Available Fields
    const DraggableField = React.memo(({ field, localColumnConfig }) => {
        const {
            attributes,
            listeners,
            setNodeRef,
            transform,
            transition,
            isDragging
        } = useSortable({ id: field.id });

        const style = {
            transform: CSS.Transform.toString(transform),
            transition,
            opacity: isDragging ? 0.5 : 1,
            zIndex: isDragging ? 1000 : 1
        };

        return (
            <motion.div
                ref={setNodeRef}
                style={style}
                {...attributes}
                {...listeners}
                className="bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-300 rounded-lg px-4 py-3 text-sm font-medium text-gray-700 transition-all duration-200 hover:shadow-md hover:border-gray-400 hover:from-white hover:to-gray-50 cursor-move text-center"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
            >
                <div className="flex items-center justify-center gap-2">
                    <FiMove className="w-3 h-3 text-gray-400" />
                    {field.label}
                </div>
            </motion.div>
        );
    });

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

            {/* Main content */}
            <div className={`pt-16 transition-all duration-300 ease-in-out ${isMinimized ? 'md:pl-20' : 'md:pl-72'}`}>
                <div className="h-full flex flex-col">
                    {/* Main Card */}
                    <motion.div
                        className="bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col h-full mx-2 sm:mx-4 md:mx-8 my-3 md:my-4"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                    >
                        {/* Card Header */}
                        <div className="border-b border-gray-200 px-3 md:px-4 py-3 bg-gradient-to-r from-gray-50 to-white">
                            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-2 md:gap-3">
                                <div className="w-full md:w-auto">
                                    <h5 className="text-base md:text-lg font-bold text-gray-800 mb-0.5">
                                        Task Management
                                    </h5>
                                    <p className="text-gray-500 text-xs">
                                        Manage your tasks efficiently with multiple view options
                                    </p>
                                </div>

                                <div className="flex flex-col lg:flex-row gap-2 w-full lg:w-auto">
                                    {/* Table/Cards Toggle and Search */}
                                    <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2 w-full">
                                        <div className="flex items-center gap-2">
                                            <div className="md:hidden w-full">
                                                <TableViewSwitch viewMode={viewMode} setViewMode={setViewMode} />
                                            </div>
                                            <div className="hidden md:block">
                                                <TableViewSwitch viewMode={viewMode} setViewMode={setViewMode} />
                                            </div>
                                        </div>

                                        {/* Action Buttons */}
                                        <div className="flex items-center gap-2">
                                            {/* Filter Button */}
                                            <div className="dropdown-container relative">
                                                <motion.button
                                                    onClick={() => setShowFilterRow(!showFilterRow)}
                                                    className="px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all duration-200 text-gray-700 font-medium flex items-center gap-2 shadow-sm text-sm"
                                                    whileHover={{ scale: 1.05 }}
                                                    whileTap={{ scale: 0.95 }}
                                                >
                                                    <FiFilter className="w-4 h-4" />
                                                    <span className="hidden sm:inline">Filter</span>
                                                </motion.button>
                                            </div>

                                            {/* Create Task Button */}
                                            <motion.button
                                                onClick={() => navigate('/task/create')}
                                                className="px-3 py-2 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 shadow-sm whitespace-nowrap"
                                                whileHover={{ scale: 1.05 }}
                                                whileTap={{ scale: 0.95 }}
                                            >
                                                <FiPlus className="w-4 h-4" />
                                            </motion.button>
                                            
                                            {/* Bulk Status Change Button - Only show when tasks are selected */}
                                            {selectedTasks.size > 0 && (
                                                <motion.button
                                                    onClick={openBulkStatusModal}
                                                    className="px-3 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 shadow-sm whitespace-nowrap"
                                                    whileHover={{ scale: 1.05 }}
                                                    whileTap={{ scale: 0.95 }}
                                                >
                                                    <FiCheckCircle className="w-4 h-4" />
                                                    <span className="hidden sm:inline">Change Status ({selectedTasks.size})</span>
                                                </motion.button>
                                            )}
                                            
                                            {/* 3 Dot Menu */}
                                            <div className="relative dropdown-container">
                                                <motion.button
                                                    onClick={() => setShowMoreMenu(!showMoreMenu)}
                                                    className="w-9 h-9 flex items-center justify-center rounded-full bg-white border border-gray-300 hover:bg-gray-100 transition shadow-sm"
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
                                                            {/* Export Section */}
                                                            <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">
                                                                Export
                                                            </div>

                                                            <button
                                                                onClick={() => handleExport('pdf')}
                                                                className="flex items-center w-full px-3 py-2 text-sm text-gray-700 hover:bg-indigo-50"
                                                            >
                                                                <PiFilePdfDuotone className="w-4 h-4 mr-2 text-red-500" />
                                                                Export as PDF
                                                            </button>

                                                            <button
                                                                onClick={() => handleExport('excel')}
                                                                className="flex items-center w-full px-3 py-2 text-sm text-gray-700 hover:bg-indigo-50"
                                                            >
                                                                <PiMicrosoftExcelLogoDuotone className="w-4 h-4 mr-2 text-green-500" />
                                                                Export as Excel
                                                            </button>

                                                            <button
                                                                onClick={() => handleExport('whatsapp')}
                                                                className="flex items-center w-full px-3 py-2 text-sm text-gray-700 hover:bg-indigo-50"
                                                            >
                                                                <FaWhatsapp className="w-4 h-4 mr-2 text-green-500" />
                                                                Share via WhatsApp
                                                            </button>

                                                            <button
                                                                onClick={() => handleExport('email')}
                                                                className="flex items-center w-full px-3 py-2 text-sm text-gray-700 hover:bg-indigo-50"
                                                            >
                                                                <AiOutlineMail className="w-4 h-4 mr-2 text-blue-500" />
                                                                Share via Email
                                                            </button>

                                                            {/* Divider */}
                                                            <div className="h-px bg-gray-200 my-1" />

                                                            {/* Settings */}
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

                        {/* Filter Row */}
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

                        {/* Task Display Area */}
                        <div className="flex-1 flex flex-col overflow-hidden">
                            {viewMode === 'table' ? (
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
                                    setActiveRowDropdown={setActiveRowDropdown}
                                    handleStatusChange={handleStatusChange}
                                    navigate={navigate}
                                    openStatusModal={openStatusModal}
                                    openUsersModal={openUsersModal}
                                    openClientDetailsModal={openClientDetailsModal}
                                    handleEditTask={handleEditTask}
                                />
                            ) : (
                                <TaskCards
                                    tasks={tasks}
                                    selectedTasks={selectedTasks}
                                    handleTaskSelect={handleTaskSelect}
                                    columnConfig={columnConfig}
                                    renderCellContent={renderCellContent}
                                    loading={loading}
                                    toggleRowDropdown={toggleRowDropdown}
                                    activeRowDropdown={activeRowDropdown}
                                    handleGetInOut={handleGetInOut}
                                    setActiveRowDropdown={setActiveRowDropdown}
                                    handleStatusChange={handleStatusChange}
                                    statusOptions={statusOptions}
                                    navigate={navigate}
                                    openStatusModal={openStatusModal}
                                    openUsersModal={openUsersModal}
                                    openClientDetailsModal={openClientDetailsModal}
                                    handleEditTask={handleEditTask}
                                />
                            )}
                        </div>

                        {/* Footer */}
                        <div className="border-t border-gray-200 px-3 md:px-4 py-2 bg-gradient-to-r from-gray-50 to-gray-100">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                                    <span className="font-semibold text-gray-800 text-sm">
                                        Showing {tasks.length} of {pagination.total} tasks
                                    </span>
                                    <div className="text-sm text-gray-600">
                                        {selectedTasks.size} task(s) selected
                                    </div>
                                </div>
                                
                                <div className="flex flex-wrap gap-2">
                                    <motion.button
                                        className="px-2 py-1.5 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-lg text-xs font-medium transition-all duration-200 hover:from-indigo-700 hover:to-indigo-800 flex items-center gap-1 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                        disabled={selectedTasks.size === 0}
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                    >
                                        <FiMail className="w-3 h-3" />
                                        <span className="hidden sm:inline">Send Message</span>
                                    </motion.button>
                                    
                                    <motion.button
                                        className="px-2 py-1.5 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg text-xs font-medium transition-all duration-200 hover:from-green-700 hover:to-green-800 flex items-center gap-1 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                        disabled={selectedTasks.size === 0}
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                    >
                                        <FiDownload className="w-3 h-3" />
                                        <span className="hidden sm:inline">Export Selected</span>
                                    </motion.button>
                                    
                                    <motion.button
                                        className="px-2 py-1.5 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg text-xs font-medium transition-all duration-200 hover:from-purple-700 hover:to-purple-800 flex items-center gap-1 shadow-sm"
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                    >
                                        <FiPrinter className="w-3 h-3" />
                                        <span className="hidden sm:inline">Print All</span>
                                    </motion.button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>

            {/* Floating Action Button for Selected Tasks */}
            <AnimatePresence>
                {selectedTasks.size > 0 && (
                    <motion.div
                        className="fixed bottom-4 right-4 md:bottom-6 md:right-6 z-50"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        transition={{ duration: 0.2 }}
                    >
                        <div className="flex flex-col md:flex-row items-center gap-2 md:gap-3">
                            <motion.button
                                className="px-3 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg text-sm font-semibold hover:from-blue-700 hover:to-blue-800 flex items-center gap-2 shadow-xl"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={openBulkStatusModal}
                            >
                                <FiCheckCircle className="w-4 h-4" />
                                <span className="hidden sm:inline">Change Status</span>
                                <span className="sm:hidden">({selectedTasks.size})</span>
                            </motion.button>
                            
                            <motion.button
                                className="px-3 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-lg text-sm font-semibold hover:from-indigo-700 hover:to-indigo-800 flex items-center gap-2 shadow-xl"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => {
                                    console.log("Send message to:", [...selectedTasks]);
                                }}
                            >
                                <FiMail className="w-4 h-4" />
                                <span className="hidden sm:inline">Send Message</span>
                                <span className="sm:hidden">({selectedTasks.size})</span>
                            </motion.button>
                            
                            <motion.button
                                className="px-3 py-2.5 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg text-sm font-semibold hover:from-green-700 hover:to-green-800 flex items-center gap-2 shadow-xl"
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

            {/* Settings Modal */}
            <SettingsModal />

            {/* Status Change Modal */}
            <StatusChangeModal
                isOpen={statusModal.open}
                onClose={closeStatusModal}
                taskId={statusModal.taskId}
                currentStatus={statusModal.currentStatus}
                onStatusChange={handleStatusChange}
                statusOptions={statusOptions}
            />

            {/* Bulk Status Change Modal */}
            <BulkStatusChangeModal
                isOpen={bulkStatusModal.open}
                onClose={() => setBulkStatusModal(prev => ({ ...prev, open: false }))}
                selectedCount={selectedTasks.size}
                onConfirm={handleBulkStatusChange}
                loading={bulkStatusModal.loading}
            />

            {/* Users List Modal */}
            <UsersListModal
                isOpen={usersModal.open}
                onClose={closeUsersModal}
                users={usersModal.users}
                taskName={usersModal.taskName}
            />

            {/* Client Details Modal */}
            <ClientDetailsModal
                isOpen={clientModal.open}
                onClose={closeClientDetailsModal}
                clientData={clientModal.clientData}
                loading={clientModal.loading}
            />

            {/* Export Confirmation Modal */}
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
                                <h3 className="text-base font-semibold text-gray-800 mb-2">
                                    Exporting {exportModal.type.toUpperCase()}
                                </h3>
                                <p className="text-gray-600 mb-4 text-sm">
                                    Your {exportModal.type} export is being processed...
                                </p>
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

            {deleteModal && (
                <DeleteConfirmationModal
                    title="Task Delete"
                    onConfirm={(res) => {
                        setDeleteModal(false);
                        console.log("Confirmed:", res);
                    }}
                />
            )}

            {/* Edit Task Modal */}
            <EditTaskModal
                isOpen={editModal.open}
                onClose={() => setEditModal({ open: false, taskData: null })}
                taskData={editModal.taskData}
                onTaskUpdated={handleTaskUpdated}
            />
        </div>
    );
};

export default TaskDisplay;