import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    FiPlus,
    FiEdit,
    FiSearch,
    FiShield,
    FiTrash2,
    FiMail,
    FiDownload,
    FiPrinter,
    FiX,
    FiCheck,
    FiXCircle,
    FiEye
} from 'react-icons/fi';
import { PiExportBold } from "react-icons/pi";
import { PiFilePdfDuotone, PiMicrosoftExcelLogoDuotone } from "react-icons/pi";
import { AiOutlineMail } from "react-icons/ai";
import { FaWhatsapp } from "react-icons/fa6";
import { motion } from 'framer-motion';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { Header, Sidebar } from '../../components/header';
import DeleteConfirmationModal from '../../components/delete-confirmation';
import getHeaders from '../../utils/get-headers';
import API_BASE_URL from '../../utils/api-controller';

const PermissionList = () => {
    const navigate = useNavigate();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(() => {
        const saved = localStorage.getItem('sidebarMinimized');
        return saved ? JSON.parse(saved) : false;
    });
    const [loading, setLoading] = useState(false);
    const [permissionData, setPermissionData] = useState([]);
    const [permissionOptions, setPermissionOptions] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedPermissions, setSelectedPermissions] = useState(new Set());
    const [selectAll, setSelectAll] = useState(false);
    const [showExportDropdown, setShowExportDropdown] = useState(false);
    const [exportModal, setExportModal] = useState({ open: false, type: '', data: null });
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [deleteModal, setDeleteModal] = useState(false);
    const [selectedPermission, setSelectedPermission] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        remark: '',
        permissions: [] // Array of p_option_id strings
    });

    const getCategoryName = (pOptionId) => {
        const id = pOptionId.toLowerCase();
        if (id.startsWith('task_')) return 'Task Management';
        if (id.startsWith('client_')) return 'Client Management';
        if (id.startsWith('finance_')) return 'Finance & Ledger';
        if (id.startsWith('broadcast_')) return 'Broadcast & Messaging';
        if (id.startsWith('setting_')) return 'Settings Access';
        if (id.startsWith('subscription_')) return 'Subscription';
        if (id.startsWith('staff_')) return 'Staff & Attendance';
        if (id.startsWith('office_assistance_')) return 'Office Assistance';
        return 'Other Permissions';
    };

    const groupedPermissionOptions = useMemo(() => {
        const groups = {};
        permissionOptions.forEach(option => {
            const cat = getCategoryName(option.p_option_id);
            if (!groups[cat]) {
                groups[cat] = [];
            }
            groups[cat].push(option);
        });
        return groups;
    }, [permissionOptions]);

    // Load initial data
    const fetchPermissionData = async () => {
        setLoading(true);
        try {
            const headers = getHeaders();
            if (!headers) return;
            const res = await axios.get(`${API_BASE_URL}/settings/permissions/list`, { headers });
            if (res.data?.success) {
                setPermissionData(res.data.data || []);
            }
        } catch (err) {
            console.error('Error fetching roles:', err);
            toast.error('Failed to load permission roles');
        } finally {
            setLoading(false);
        }
    };

    const fetchPermissionOptions = async () => {
        try {
            const headers = getHeaders();
            if (!headers) return;
            const res = await axios.get(`${API_BASE_URL}/settings/permissions/options`, { headers });
            if (res.data?.success) {
                setPermissionOptions(res.data.data || []);
            }
        } catch (err) {
            console.error('Error fetching permission options:', err);
        }
    };

    useEffect(() => {
        fetchPermissionData();
        fetchPermissionOptions();
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

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (!event.target.closest('.dropdown-container')) {
                setShowExportDropdown(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const resetForm = () => {
        setFormData({
            name: '',
            remark: '',
            permissions: []
        });
    };

    // Filter permissions based on search
    const filteredPermissions = permissionData.filter(permission =>
        permission.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (permission.remark || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Handle permission selection
    const handlePermissionSelect = (permissionId) => {
        const newSelected = new Set(selectedPermissions);
        if (newSelected.has(permissionId)) {
            newSelected.delete(permissionId);
        } else {
            newSelected.add(permissionId);
        }
        setSelectedPermissions(newSelected);
    };

    // Handle select all
    const handleSelectAll = () => {
        if (selectAll) {
            setSelectedPermissions(new Set());
        } else {
            const allPermissionIds = new Set(filteredPermissions.map(permission => permission.permission_role_id || permission.id));
            setSelectedPermissions(allPermissionIds);
        }
        setSelectAll(!selectAll);
    };

    // Handle create permission
    const handleCreatePermission = async (e) => {
        e.preventDefault();
        if (!formData.name.trim()) {
            toast.error('Please enter a role name');
            return;
        }
        setLoading(true);
        try {
            const headers = getHeaders();
            const res = await axios.post(`${API_BASE_URL}/settings/permissions/role/create`, {
                name: formData.name,
                permissions: formData.permissions,
                remark: formData.remark
            }, { headers });
            
            if (res.data?.success) {
                toast.success('Role created successfully');
                setShowCreateModal(false);
                resetForm();
                fetchPermissionData();
            } else {
                toast.error(res.data?.message || 'Failed to create role');
            }
        } catch (err) {
            console.error('Error creating role:', err);
            toast.error(err.response?.data?.message || 'Failed to create role');
        } finally {
            setLoading(false);
        }
    };

    // Handle edit permission
    const handleEditPermission = async (e) => {
        e.preventDefault();
        if (!formData.name.trim()) {
            toast.error('Please enter a role name');
            return;
        }
        setLoading(true);
        try {
            const headers = getHeaders();
            const res = await axios.put(`${API_BASE_URL}/settings/permissions/role/update`, {
                permission_role_id: selectedPermission.permission_role_id,
                name: formData.name,
                permissions: formData.permissions,
                remark: formData.remark
            }, { headers });
            
            if (res.data?.success) {
                toast.success('Role updated successfully');
                setShowEditModal(false);
                resetForm();
                fetchPermissionData();
            } else {
                toast.error(res.data?.message || 'Failed to update role');
            }
        } catch (err) {
            console.error('Error updating role:', err);
            toast.error(err.response?.data?.message || 'Failed to update role');
        } finally {
            setLoading(false);
        }
    };

    // Handle delete permission
    const handleDeletePermission = async (permissionId) => {
        setLoading(true);
        try {
            const headers = getHeaders();
            const res = await axios.delete(`${API_BASE_URL}/settings/permissions/role/delete`, {
                headers,
                data: { permission_role_id: permissionId }
            });
            if (res.data?.success) {
                toast.success('Role deleted successfully');
                fetchPermissionData();
            } else {
                toast.error(res.data?.message || 'Failed to delete role');
            }
        } catch (err) {
            console.error('Error deleting role:', err);
            toast.error(err.response?.data?.message || 'Failed to delete role');
        } finally {
            setLoading(false);
            setDeleteModal(false);
        }
    };

    // Handle export
    const handleExport = (type, data = null) => {
        setExportModal({ open: true, type, data });
        setTimeout(() => {
            setExportModal({ open: false, type: '', data: null });
            toast.success(`${type.toUpperCase()} export completed successfully!`);
        }, 1500);
    };

    const openEditModal = (permission) => {
        setSelectedPermission(permission);
        setFormData({
            name: permission.name,
            remark: permission.remark || '',
            permissions: permission.permissions || []
        });
        setShowEditModal(true);
    };

    const openCreateModal = () => {
        resetForm();
        setShowCreateModal(true);
    };

    const handleInputChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    // Toggle permission option
    const togglePermissionOption = (pOptionId) => {
        setFormData(prev => {
            const permissions = prev.permissions || [];
            if (permissions.includes(pOptionId)) {
                return {
                    ...prev,
                    permissions: permissions.filter(id => id !== pOptionId)
                };
            } else {
                return {
                    ...prev,
                    permissions: [...permissions, pOptionId]
                };
            }
        });
    };

    // Skeleton loader component
    const SkeletonRow = () => (
        <tr className="animate-pulse">
            <td className="p-4">
                <div className="h-4 bg-gray-200 rounded w-4"></div>
            </td>
            <td className="p-4">
                <div className="h-3 bg-gray-200 rounded w-8"></div>
            </td>
            <td className="p-4">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gray-200 rounded-lg"></div>
                    <div className="space-y-2">
                        <div className="h-3 bg-gray-200 rounded w-32"></div>
                        <div className="h-2 bg-gray-200 rounded w-24"></div>
                    </div>
                </div>
            </td>
            <td className="p-4">
                <div className="h-3 bg-gray-200 rounded w-48"></div>
            </td>
            <td className="p-4">
                <div className="flex gap-2">
                    <div className="w-8 h-8 bg-gray-200 rounded"></div>
                    <div className="w-8 h-8 bg-gray-200 rounded"></div>
                </div>
            </td>
        </tr>
    );

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
            <div className={`pt-16 transition-all duration-300 ease-in-out ${isMinimized ? 'md:pl-20' : 'md:pl-[260px]'}`}>
                <div className="max-w-full mx-auto px-4 sm:px-6 md:px-8 py-6">
                    <div className="h-full flex flex-col">
                        {/* Main Card - Full height with scrolling */}
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col h-full">
                            {/* Card Header */}
                            <div className="border-b border-gray-200 px-6 py-4">
                                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                                    <div>
                                        <h5 className="text-xl font-bold text-gray-800 mb-1">
                                            Permission Management
                                        </h5>
                                        <p className="text-gray-500 text-xs">
                                            {filteredPermissions.length} of {permissionData.length} permissions shown
                                        </p>
                                    </div>

                                    <div className="flex flex-col lg:flex-row gap-3 w-full lg:w-auto">
                                        {/* Search Input */}
                                        <div className="flex-1 relative min-w-[300px]">
                                            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                            <input
                                                type="text"
                                                placeholder="Search permissions by name or remark..."
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 font-medium transition-all duration-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm text-sm"
                                            />
                                        </div>

                                        <div className="flex gap-2">
                                            {/* Export Dropdown */}
                                            <div className="dropdown-container relative">
                                                <motion.button
                                                    onClick={() => setShowExportDropdown(!showExportDropdown)}
                                                    className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 shadow-sm"
                                                    whileHover={{ scale: 1.02 }}
                                                    whileTap={{ scale: 0.98 }}
                                                >
                                                    <PiExportBold className="w-4 h-4" />
                                                    Export
                                                </motion.button>

                                                {showExportDropdown && (
                                                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-200 z-50 overflow-hidden">
                                                        <div className="py-1">
                                                            <button
                                                                onClick={() => handleExport('pdf')}
                                                                className="flex items-center w-full px-4 py-3 text-sm text-gray-700 hover:bg-indigo-50 transition-colors"
                                                            >
                                                                <PiFilePdfDuotone className="w-4 h-4 mr-3 text-red-500" />
                                                                Export as PDF
                                                            </button>
                                                            <button
                                                                onClick={() => handleExport('excel')}
                                                                className="flex items-center w-full px-4 py-3 text-sm text-gray-700 hover:bg-indigo-50 transition-colors"
                                                            >
                                                                <PiMicrosoftExcelLogoDuotone className="w-4 h-4 mr-3 text-green-500" />
                                                                Export as Excel
                                                            </button>
                                                            <button
                                                                onClick={() => handleExport('whatsapp')}
                                                                className="flex items-center w-full px-4 py-3 text-sm text-gray-700 hover:bg-indigo-50 transition-colors"
                                                            >
                                                                <FaWhatsapp className="w-4 h-4 mr-3 text-green-500" />
                                                                Share via WhatsApp
                                                            </button>
                                                            <button
                                                                onClick={() => handleExport('email')}
                                                                className="flex items-center w-full px-4 py-3 text-sm text-gray-700 hover:bg-indigo-50 transition-colors"
                                                            >
                                                                <AiOutlineMail className="w-4 h-4 mr-3 text-blue-500" />
                                                                Share via Email
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            <motion.button
                                                onClick={openCreateModal}
                                                className="px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 shadow-sm"
                                                whileHover={{ scale: 1.02 }}
                                                whileTap={{ scale: 0.98 }}
                                            >
                                                <FiPlus className="w-4 h-4" />
                                                Add Permission
                                            </motion.button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Table Container */}
                            <div className="flex-1 overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                                        <tr>
                                            <th className="w-12 p-4">
                                                <input
                                                    type="checkbox"
                                                    checked={selectAll}
                                                    onChange={handleSelectAll}
                                                    className="w-4 h-4 text-indigo-600 rounded border-gray-400 focus:ring-indigo-500"
                                                />
                                            </th>
                                            <th className="text-left p-4 font-semibold text-gray-700 text-sm">#</th>
                                            <th className="text-left p-4 font-semibold text-gray-700 text-sm">Name</th>
                                            <th className="text-left p-4 font-semibold text-gray-700 text-sm">Remark</th>
                                            <th className="text-center p-4 font-semibold text-gray-700 text-sm">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {loading ? (
                                            // Skeleton Loaders
                                            Array.from({ length: 5 }).map((_, index) => (
                                                <SkeletonRow key={index} />
                                            ))
                                        ) : filteredPermissions.length === 0 ? (
                                            <tr>
                                                <td colSpan="5" className="p-8 text-center">
                                                    <div className="flex flex-col items-center justify-center py-8">
                                                        <FiShield className="w-16 h-16 text-gray-300 mb-4" />
                                                        <p className="text-gray-500 text-lg font-medium mb-2">No permissions found</p>
                                                        <p className="text-gray-400 text-sm mb-6">Try adjusting your search or add a new permission</p>
                                                        <button
                                                            onClick={openCreateModal}
                                                            className="px-6 py-3 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-all duration-200 shadow-sm"
                                                        >
                                                            <FiPlus className="w-4 h-4 inline mr-2" />
                                                            Add New Permission
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredPermissions.map((permission, index) => (
                                                <tr key={permission.permission_role_id} className="hover:bg-gray-50 transition-colors">
                                                    <td className="p-4">
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedPermissions.has(permission.permission_role_id)}
                                                            onChange={() => handlePermissionSelect(permission.permission_role_id)}
                                                            className="w-4 h-4 text-indigo-600 rounded border-gray-400 focus:ring-indigo-500"
                                                        />
                                                    </td>
                                                    <td className="p-4 text-sm text-gray-600 font-medium">
                                                        {index + 1}
                                                    </td>
                                                    <td className="p-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-sm">
                                                                <FiShield className="w-4 h-4 text-white" />
                                                            </div>
                                                            <div className="font-semibold text-gray-800 text-sm">
                                                                {permission.name}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="p-4 text-sm text-gray-600">
                                                        {permission.remark}
                                                    </td>
                                                    <td className="p-4">
                                                        <div className="flex justify-center items-center gap-2">
                                                            <button
                                                                onClick={() => navigate(`/permission/details/${permission.permission_role_id}`)}
                                                                className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                                                title="View Details"
                                                            >
                                                                <FiEye className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => openEditModal(permission)}
                                                                className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                                                title="Edit Permission"
                                                            >
                                                                <FiEdit className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    setSelectedPermission(permission);
                                                                    setDeleteModal(true);
                                                                }}
                                                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                                title="Delete Permission"
                                                            >
                                                                <FiTrash2 className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Table Footer */}
                            <div className="border-t border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
                                <div className="p-4">
                                    <div className="flex items-center justify-between">
                                        <span className="font-semibold text-gray-800 text-sm">
                                            Showing {filteredPermissions.length} of {permissionData.length} permissions
                                        </span>
                                        <div className="flex gap-2 items-center">
                                            <div className="text-sm text-gray-600 mr-4">
                                                {selectedPermissions.size} permission(s) selected
                                            </div>
                                            <button
                                                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium transition-all duration-200 hover:bg-indigo-700 flex items-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                                disabled={selectedPermissions.size === 0}
                                            >
                                                <FiMail className="w-4 h-4" />
                                                Send Message
                                            </button>
                                            <button
                                                className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium transition-all duration-200 hover:bg-green-700 flex items-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                                disabled={selectedPermissions.size === 0}
                                            >
                                                <FiDownload className="w-4 h-4" />
                                                Export Selected
                                            </button>
                                            <button
                                                className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium transition-all duration-200 hover:bg-purple-700 flex items-center gap-2 shadow-sm"
                                            >
                                                <FiPrinter className="w-4 h-4" />
                                                Print All
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Create Permission Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] overflow-hidden transform transition-all duration-300">
                        <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white px-6 py-4 flex justify-between items-center">
                            <div>
                                <h2 className="text-xl font-bold">Create New Permission</h2>
                                <p className="text-indigo-100 text-sm mt-1">Define a new permission level for the system</p>
                            </div>
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="text-white hover:text-indigo-200 transition-colors duration-200 p-1 rounded-lg hover:bg-indigo-500"
                            >
                                <FiX className="w-6 h-6" />
                            </button>
                        </div>
                        
                        <form onSubmit={handleCreatePermission}>
                            <div className="p-6 overflow-y-auto max-h-[60vh]">
                                <div className="grid grid-cols-1 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Name
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.name}
                                            onChange={(e) => handleInputChange('name', e.target.value)}
                                            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all duration-200"
                                            placeholder="Enter permission name"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Remark
                                        </label>
                                        <textarea
                                            value={formData.remark}
                                            onChange={(e) => handleInputChange('remark', e.target.value)}
                                            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all duration-200"
                                            placeholder="Enter permission description"
                                            rows="3"
                                        />
                                    </div>
                                    
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">Permission Settings</h3>
                                        <div className="space-y-6">
                                            {Object.keys(groupedPermissionOptions).map(category => (
                                                <div key={category} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                                                    <h4 className="text-md font-bold text-indigo-900 mb-3 bg-indigo-50 px-3 py-1.5 rounded-lg inline-block">
                                                        {category}
                                                    </h4>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                        {groupedPermissionOptions[category]?.map(option => {
                                                            const isChecked = (formData.permissions || []).includes(option.p_option_id);
                                                            return (
                                                                <div key={option.p_option_id} className="bg-gray-50 border border-gray-200 rounded-lg p-4 flex flex-col justify-between hover:border-indigo-300 transition-all duration-200">
                                                                    <div className="flex items-center justify-between mb-2">
                                                                        <span className="text-sm font-semibold text-gray-700">
                                                                            {option.name}
                                                                        </span>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => togglePermissionOption(option.p_option_id)}
                                                                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                                                                isChecked 
                                                                                    ? 'bg-green-500' 
                                                                                    : 'bg-gray-300'
                                                                            }`}
                                                                        >
                                                                            <span
                                                                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                                                                    isChecked 
                                                                                        ? 'translate-x-6' 
                                                                                        : 'translate-x-1'
                                                                                }`}
                                                                            />
                                                                        </button>
                                                                    </div>
                                                                    <div className="text-xs text-gray-500">
                                                                        {option.remark || (isChecked ? 'Allowed' : 'Not Allowed')}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="border-t px-6 py-4 bg-gray-50 flex justify-end gap-3">
                                <motion.button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="px-6 py-3 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-200 transition-all duration-200 hover:shadow-sm text-gray-700"
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    Cancel
                                </motion.button>
                                <motion.button
                                    type="submit"
                                    disabled={loading}
                                    className="px-6 py-3 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all duration-200 hover:shadow-md shadow-sm disabled:opacity-50"
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    {loading ? 'Creating...' : 'Create Permission'}
                                </motion.button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Permission Modal */}
            {showEditModal && selectedPermission && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] overflow-hidden transform transition-all duration-300">
                        <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white px-6 py-4 flex justify-between items-center">
                            <div>
                                <h2 className="text-xl font-bold">Edit Permission</h2>
                                <p className="text-indigo-100 text-sm mt-1">Update permission level settings</p>
                            </div>
                            <button
                                onClick={() => setShowEditModal(false)}
                                className="text-white hover:text-indigo-200 transition-colors duration-200 p-1 rounded-lg hover:bg-indigo-500"
                            >
                                <FiX className="w-6 h-6" />
                            </button>
                        </div>
                        
                        <form onSubmit={handleEditPermission}>
                            <div className="p-6 overflow-y-auto max-h-[60vh]">
                                <div className="grid grid-cols-1 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Name
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.name}
                                            onChange={(e) => handleInputChange('name', e.target.value)}
                                            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all duration-200"
                                            placeholder="Enter permission name"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Remark
                                        </label>
                                        <textarea
                                            value={formData.remark}
                                            onChange={(e) => handleInputChange('remark', e.target.value)}
                                            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all duration-200"
                                            placeholder="Enter permission description"
                                            rows="3"
                                        />
                                    </div>
                                    
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">Permission Settings</h3>
                                        <div className="space-y-6">
                                            {Object.keys(groupedPermissionOptions).map(category => (
                                                <div key={category} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                                                    <h4 className="text-md font-bold text-indigo-900 mb-3 bg-indigo-50 px-3 py-1.5 rounded-lg inline-block">
                                                        {category}
                                                    </h4>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                        {groupedPermissionOptions[category]?.map(option => {
                                                            const isChecked = (formData.permissions || []).includes(option.p_option_id);
                                                            return (
                                                                <div key={option.p_option_id} className="bg-gray-50 border border-gray-200 rounded-lg p-4 flex flex-col justify-between hover:border-indigo-300 transition-all duration-200">
                                                                    <div className="flex items-center justify-between mb-2">
                                                                        <span className="text-sm font-semibold text-gray-700">
                                                                            {option.name}
                                                                        </span>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => togglePermissionOption(option.p_option_id)}
                                                                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                                                                isChecked 
                                                                                    ? 'bg-green-500' 
                                                                                    : 'bg-gray-300'
                                                                            }`}
                                                                        >
                                                                            <span
                                                                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                                                                    isChecked 
                                                                                        ? 'translate-x-6' 
                                                                                        : 'translate-x-1'
                                                                                }`}
                                                                            />
                                                                        </button>
                                                                    </div>
                                                                    <div className="text-xs text-gray-500">
                                                                        {option.remark || (isChecked ? 'Allowed' : 'Not Allowed')}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="border-t px-6 py-4 bg-gray-50 flex justify-end gap-3">
                                <motion.button
                                    type="button"
                                    onClick={() => setShowEditModal(false)}
                                    className="px-6 py-3 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-200 transition-all duration-200 hover:shadow-sm text-gray-700"
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    Cancel
                                </motion.button>
                                <motion.button
                                    type="submit"
                                    disabled={loading}
                                    className="px-6 py-3 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all duration-200 hover:shadow-md shadow-sm disabled:opacity-50"
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    {loading ? 'Updating...' : 'Update Permission'}
                                </motion.button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Export Confirmation Modal */}
            {exportModal.open && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-auto transform transition-all duration-300">
                        <div className="text-center">
                            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <PiExportBold className="w-8 h-8 text-green-600" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-800 mb-2">
                                Exporting {exportModal.type.toUpperCase()}
                            </h3>
                            <p className="text-gray-600 mb-6">
                                Your {exportModal.type} export is being processed...
                            </p>
                            <div className="flex justify-center space-x-3">
                                <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce"></div>
                                <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                                <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {deleteModal && selectedPermission && (
                <DeleteConfirmationModal
                    title={`Delete ${selectedPermission.name}`}
                    message={`Are you sure you want to delete the "${selectedPermission.name}" permission? This action cannot be undone and may affect users with this permission level.`}
                    onConfirm={(res) => {
                        if (res.confirmed) {
                            handleDeletePermission(selectedPermission.permission_role_id);
                        }
                        setDeleteModal(false);
                    }}
                />
            )}
        </div>
    );
};

export default PermissionList;