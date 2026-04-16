import React, { useState, useEffect } from 'react';
import {
    FiPlus, FiEdit, FiTrash, FiSettings, FiCheck, FiX,
    FiMoreVertical, FiEye, FiHome, FiAlertCircle, FiFilter,
    FiChevronLeft, FiChevronRight, FiCalendar, FiUser, FiGrid,
    FiDownload, FiRefreshCw, FiCopy, FiShare2
} from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { Header, Sidebar } from '../../components/header';
import API_BASE_URL from '../../utils/api-controller';
import getHeaders from '../../utils/get-headers';
import { useNavigate } from 'react-router-dom';
import { toast, Toaster } from 'react-hot-toast';

// Professional Toast Configuration
const toastConfig = {
    duration: 4000,
    position: 'top-right',
    style: {
        borderRadius: '8px',
        background: '#fff',
        color: '#1e293b',
        fontSize: '14px',
        fontWeight: '500',
        padding: '12px 16px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        border: '1px solid #e2e8f0',
        maxWidth: '380px',
    },
    success: {
        style: {
            background: '#fff',
            color: '#059669',
            border: '1px solid #d1fae5',
        },
        icon: '✓',
    },
    error: {
        style: {
            background: '#fff',
            color: '#dc2626',
            border: '1px solid #fee2e2',
        },
        icon: '✕',
    },
    loading: {
        style: {
            background: '#fff',
            color: '#3b82f6',
            border: '1px solid #dbeafe',
        },
        icon: '●',
    },
};

// Custom toast functions
const showToast = {
    success: (message, options = {}) => {
        toast.success(message, {
            ...toastConfig,
            ...options,
            icon: '✓',
            style: {
                ...toastConfig.style,
                ...toastConfig.success.style,
                ...options.style,
            },
        });
    },
    error: (message, options = {}) => {
        toast.error(message, {
            ...toastConfig,
            ...options,
            icon: '✕',
            style: {
                ...toastConfig.style,
                ...toastConfig.error.style,
                ...options.style,
            },
        });
    },
    loading: (message, options = {}) => {
        return toast.loading(message, {
            ...toastConfig,
            ...options,
            icon: '●',
            style: {
                ...toastConfig.style,
                ...toastConfig.loading.style,
                ...options.style,
            },
        });
    },
    info: (message, options = {}) => {
        toast(message, {
            ...toastConfig,
            ...options,
            icon: 'ℹ️',
            style: {
                ...toastConfig.style,
                ...options.style,
            },
        });
    },
    dismiss: (toastId) => {
        toast.dismiss(toastId);
    },
    dismissAll: () => {
        toast.dismiss();
    },
};

const PasswordGroups = () => {
    const navigate = useNavigate();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(() => {
        const saved = localStorage.getItem('sidebarMinimized');
        return saved ? JSON.parse(saved) : false;
    });
    const [loading, setLoading] = useState(false);
    const [groups, setGroups] = useState([]);
    const [filteredGroups, setFilteredGroups] = useState([]);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [selectedGroup, setSelectedGroup] = useState(null);
    const [activeDropdown, setActiveDropdown] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 20,
        total: 0,
        total_pages: 1,
        is_last_page: false
    });
    const [statusFilter, setStatusFilter] = useState('all');

    // Form states
    const [createForm, setCreateForm] = useState({
        group_name: ''
    });

    const [editForm, setEditForm] = useState({
        group_id: '',
        group_name: '',
        status: ''
    });

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

    // Initial data load
    useEffect(() => {
        fetchGroupsData();
    }, [pagination.page, statusFilter]);

    // Fetch groups data from API
    const fetchGroupsData = async () => {
        setLoading(true);

        try {
            const headers = await getHeaders();
            let url = `${API_BASE_URL}/assistance/p-group/list?page=${pagination.page}&limit=${pagination.limit}`;

            if (searchTerm) {
                url += `&search=${encodeURIComponent(searchTerm)}`;
            }

            if (statusFilter !== 'all') {
                url += `&status=${statusFilter}`;
            }

            const response = await fetch(url, { headers });
            const result = await response.json();

            if (result.success) {
                setGroups(result.data || []);
                setFilteredGroups(result.data || []);
                setPagination({
                    page: result.meta?.page || 1,
                    limit: result.meta?.limit || 20,
                    total: result.meta?.total || 0,
                    total_pages: result.meta?.total_pages || 1,
                    is_last_page: result.meta?.is_last_page || false
                });
            } else {
                showToast.error(result.message || 'Failed to fetch groups');
            }
        } catch (error) {
            console.error('Error fetching groups:', error);
            showToast.error('Network error. Please check your connection.');
        } finally {
            setLoading(false);
        }
    };

    // Handle create group submit
    const handleCreateSubmit = async (e) => {
        e.preventDefault();

        if (!createForm.group_name.trim()) {
            showToast.error('Please enter a group name');
            return;
        }

        const loadingToast = showToast.loading('Creating group...');

        try {
            const headers = await getHeaders();
            const response = await fetch(`${API_BASE_URL}/assistance/p-group/create `, {
                method: 'POST',
                headers,
                body: JSON.stringify(createForm)
            });
            const result = await response.json();

            showToast.dismiss(loadingToast);

            if (result.success) {
                showToast.success(`Group "${createForm.group_name}" created successfully`);
                await fetchGroupsData();
                setShowCreateModal(false);
                setCreateForm({ group_name: '' });
            } else {
                showToast.error(result.message || 'Failed to create group');
            }
        } catch (error) {
            console.error('Error creating group:', error);
            showToast.dismiss(loadingToast);
            showToast.error('Network error. Please check your connection.');
        }
    };

    // Handle edit group submit
    const handleEditSubmit = async (e) => {
        e.preventDefault();

        if (!editForm.group_name.trim()) {
            showToast.error('Please enter a group name');
            return;
        }

        const loadingToast = showToast.loading('Updating group...');

        try {
            const headers = await getHeaders();
            const response = await fetch(`${API_BASE_URL}/assistance/p-group/edit/${editForm.group_id}`, {
                method: 'PUT',
                headers,
                body: JSON.stringify({
                    group_name: editForm.group_name,
                    status: editForm.status
                })
            });
            const result = await response.json();

            showToast.dismiss(loadingToast);

            if (result.success) {
                showToast.success(`Group "${editForm.group_name}" updated successfully`);
                await fetchGroupsData();
                setShowEditModal(false);
                setSelectedGroup(null);
                setEditForm({ group_id: '', group_name: '', status: '' });
            } else {
                showToast.error(result.message || 'Failed to update group');
            }
        } catch (error) {
            console.error('Error editing group:', error);
            showToast.dismiss(loadingToast);
            showToast.error('Network error. Please check your connection.');
        }
    };

    // Handle edit button click
    const handleEditClick = (group) => {
        setSelectedGroup(group);
        setEditForm({
            group_id: group.group_id,
            group_name: group.group_name,
            status: group.status
        });
        setShowEditModal(true);
        setActiveDropdown(null);
    };

    // Handle delete button click
    const handleDeleteClick = (group) => {
        if (group.total_credentials > 0) {
            showToast.error('Cannot delete group with firms. Please remove all firms first.');
            return;
        }
        setSelectedGroup(group);
        setShowDeleteModal(true);
        setActiveDropdown(null);
    };

    // Handle delete confirm
    const handleDeleteConfirm = async () => {
        if (!selectedGroup) return;

        const loadingToast = showToast.loading('Deleting group...');

        try {
            const headers = await getHeaders();
            const response = await fetch(`${API_BASE_URL}/assistance/p-group/delete/${selectedGroup.group_id}`, {
                method: 'DELETE',
                headers
            });
            const result = await response.json();

            showToast.dismiss(loadingToast);

            if (result.success) {
                showToast.success(`Group "${selectedGroup.group_name}" deleted successfully`);
                await fetchGroupsData();
                setShowDeleteModal(false);
                setSelectedGroup(null);
            } else {
                showToast.error(result.message || 'Failed to delete group');
            }
        } catch (error) {
            console.error('Error deleting group:', error);
            showToast.dismiss(loadingToast);
            showToast.error('Network error. Please check your connection.');
        }
    };

    // Handle status change
    const handleStatusChange = async (group) => {
        const newStatus = group.status === 'active' ? 'inactive' : 'active';
        const action = newStatus === 'active' ? 'activated' : 'deactivated';

        const loadingToast = showToast.loading(`Changing status...`);

        try {
            const headers = await getHeaders();
            const response = await fetch(`${API_BASE_URL}/assistance/password-group/edit-group/${group.group_id}`, {
                method: 'PUT',
                headers,
                body: JSON.stringify({
                    group_name: group.group_name,
                    status: newStatus
                })
            });
            const result = await response.json();

            showToast.dismiss(loadingToast);

            if (result.success) {
                await fetchGroupsData();
                showToast.success(`Group "${group.group_name}" ${action} successfully`);
            } else {
                showToast.error(result.message || 'Failed to change status');
            }
        } catch (error) {
            console.error('Error changing status:', error);
            showToast.dismiss(loadingToast);
            showToast.error('Failed to change status');
        }
    };

    // Handle view group firms
    const handleViewGroup = (group) => {
        navigate(`/staff/office-assistance/password-group/${group.group_id}/firms`, {
            state: { group_name: group.group_name }
        });
    };

    // Handle group name click
    const handleGroupNameClick = (group) => {
        handleViewGroup(group);
    };

    // Handle firms count click
    const handleFirmsClick = (group) => {
        if (group.unique_firms === 0) {
            showToast.info(`No firms in "${group.group_name}" yet`);
        } else {
            handleViewGroup(group);
        }
    };

    // Handle copy group name
    const handleCopyGroupName = (groupName) => {
        navigator.clipboard.writeText(groupName);
        showToast.success('Group name copied to clipboard');
    };

    // Toggle dropdown
    const toggleDropdown = (groupId) => {
        setActiveDropdown(activeDropdown === groupId ? null : groupId);
    };

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (!event.target.closest('.dropdown-container')) {
                setActiveDropdown(null);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Handle form changes
    const handleCreateChange = (field, value) => {
        setCreateForm(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleEditChange = (field, value) => {
        setEditForm(prev => ({
            ...prev,
            [field]: value
        }));
    };

    // Handle search
    const handleSearch = (term) => {
        setSearchTerm(term);
        setPagination(prev => ({ ...prev, page: 1 }));
        fetchGroupsData();
    };

    // Handle refresh
    const handleRefresh = () => {
        fetchGroupsData();
    };

    // Format date
    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    // Handle pagination
    const handleNextPage = () => {
        if (!pagination.is_last_page) {
            setPagination(prev => ({ ...prev, page: prev.page + 1 }));
        }
    };

    const handlePrevPage = () => {
        if (pagination.page > 1) {
            setPagination(prev => ({ ...prev, page: prev.page - 1 }));
        }
    };

    // Handle page change
    const handlePageChange = (pageNum) => {
        if (pageNum !== pagination.page) {
            setPagination(prev => ({ ...prev, page: pageNum }));
        }
    };

    // Calculate summary
    const summary = {
        totalGroups: groups.length,
        activeGroups: groups.filter(group => group.status === 'active').length,
        totalFirms: groups.reduce((sum, group) => sum + (group.unique_firms || 0), 0)
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
            {/* Toaster Component for Toast Notifications */}
            <Toaster
                position="top-right"
                toastOptions={{
                    ...toastConfig,
                    className: '',
                    style: toastConfig.style,
                    success: toastConfig.success,
                    error: toastConfig.error,
                }}
            />

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
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    {/* Header Section with Breadcrumb */}
                    <div className="mb-8">
                        <nav className="flex items-center text-sm text-slate-500 mb-4">
                            <span
                                onClick={() => navigate('/dashboard')}
                                className="hover:text-indigo-600 cursor-pointer transition-colors"
                            >
                                Dashboard
                            </span>
                            <FiChevronRight className="w-4 h-4 mx-2" />
                            <span
                                onClick={() => navigate('/staff/office-assistance')}
                                className="hover:text-indigo-600 cursor-pointer transition-colors"
                            >
                                Office Assistance
                            </span>
                            <FiChevronRight className="w-4 h-4 mx-2" />
                            <span className="text-indigo-600 font-medium">Password Groups</span>
                        </nav>

                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-indigo-100 rounded-xl">
                                    <FiGrid className="w-6 h-6 text-indigo-600" />
                                </div>
                                <div>
                                    <h1 className="text-3xl font-bold text-slate-800">Password Groups</h1>
                                    <p className="mt-1 text-sm text-slate-500">
                                        Manage and organize your password groups and associated firms
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={handleRefresh}
                                    className="p-2.5 text-slate-600 hover:text-indigo-600 bg-white hover:bg-indigo-50 rounded-xl border border-slate-200 transition-all duration-200"
                                    title="Refresh data"
                                >
                                    <FiRefreshCw className="w-4 h-4" />
                                </motion.button>
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => setShowCreateModal(true)}
                                    className="inline-flex items-center px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white text-sm font-medium rounded-xl shadow-lg shadow-indigo-200 hover:shadow-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                >
                                    <FiPlus className="w-4 h-4 mr-2" />
                                    Create New Group
                                </motion.button>
                            </div>
                        </div>
                    </div>

                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        {[
                            {
                                title: 'Total Groups',
                                value: summary.totalGroups,
                                icon: FiSettings,
                                gradient: 'from-indigo-500 to-indigo-600',
                                lightBg: 'bg-indigo-50',
                                textColor: 'text-indigo-600',
                                borderColor: 'border-indigo-100',
                            },
                            {
                                title: 'Active Groups',
                                value: summary.activeGroups,
                                icon: FiCheck,
                                gradient: 'from-green-500 to-green-600',
                                lightBg: 'bg-green-50',
                                textColor: 'text-green-600',
                                borderColor: 'border-green-100',
                            },
                            {
                                title: 'Total Firms',
                                value: summary.totalFirms,
                                icon: FiHome,
                                gradient: 'from-blue-500 to-blue-600',
                                lightBg: 'bg-blue-50',
                                textColor: 'text-blue-600',
                                borderColor: 'border-blue-100',
                            }
                        ].map((stat, idx) => (
                            <motion.div
                                key={idx}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.1 }}
                                className="group relative bg-white rounded-2xl shadow-lg border border-slate-200 p-6 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 cursor-pointer"
                            >
                                <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${stat.gradient} rounded-t-2xl`} />
                                <div className="relative flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-slate-500 mb-1">{stat.title}</p>
                                        <p className="text-3xl font-bold text-slate-800">{stat.value}</p>
                                    </div>
                                    <div className={`p-4 ${stat.lightBg} rounded-xl group-hover:scale-110 transition-transform duration-300`}>
                                        <stat.icon className={`w-6 h-6 ${stat.textColor}`} />
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    {/* Main Card */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden"
                    >
                        {/* Card Header */}
                        <div className="border-b border-slate-200 px-6 py-5 bg-gradient-to-r from-slate-50 to-white">
                            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-indigo-50 rounded-lg">
                                        <FiGrid className="w-5 h-5 text-indigo-600" />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-semibold text-slate-800">
                                            Groups Directory
                                        </h2>
                                        <p className="text-xs text-slate-500">
                                            {pagination.total} groups found • Page {pagination.page} of {pagination.total_pages}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex flex-col sm:flex-row gap-3">
                                    {/* Status Filter */}
                                    <select
                                        value={statusFilter}
                                        onChange={(e) => {
                                            setStatusFilter(e.target.value);
                                            fetchGroupsData();
                                        }}
                                        className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white shadow-sm"
                                    >
                                        <option value="all">All Status</option>
                                        <option value="active">Active Only</option>
                                        <option value="inactive">Inactive Only</option>
                                    </select>

                                    {/* Search Component */}
                                    <div className="relative w-full sm:w-72">
                                        <input
                                            type="text"
                                            placeholder="Search groups by name..."
                                            value={searchTerm}
                                            onChange={(e) => handleSearch(e.target.value)}
                                            className="w-full px-4 py-2.5 pl-10 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white shadow-sm"
                                        />
                                        <FiFilter className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Table */}
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-slate-200">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                            #
                                        </th>
                                        <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                            Group Details
                                        </th>
                                        <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                            Firms
                                        </th>
                                        <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                            Status
                                        </th>
                                        <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                            Created
                                        </th>
                                        <th scope="col" className="px-6 py-4 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-slate-200">
                                    {loading ? (
                                        // Skeleton Loading
                                        Array.from({ length: 5 }).map((_, index) => (
                                            <tr key={index}>
                                                {Array.from({ length: 6 }).map((_, cellIndex) => (
                                                    <td key={cellIndex} className="px-6 py-4">
                                                        <div className="h-4 bg-slate-200 rounded animate-pulse"></div>
                                                    </td>
                                                ))}
                                            </tr>
                                        ))
                                    ) : filteredGroups.length === 0 ? (
                                        <tr>
                                            <td colSpan="6" className="px-6 py-16 text-center">
                                                <div className="flex flex-col items-center">
                                                    <div className="p-4 bg-slate-100 rounded-full mb-4">
                                                        <FiSettings className="w-8 h-8 text-slate-400" />
                                                    </div>
                                                    <p className="text-slate-600 text-lg font-medium mb-2">
                                                        No password groups found
                                                    </p>
                                                    <p className="text-slate-400 text-sm mb-6">
                                                        {searchTerm
                                                            ? `No results for "${searchTerm}"`
                                                            : 'Get started by creating your first password group'}
                                                    </p>
                                                    <button
                                                        onClick={() => setShowCreateModal(true)}
                                                        className="inline-flex items-center px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl transition-colors duration-200"
                                                    >
                                                        <FiPlus className="w-4 h-4 mr-2" />
                                                        Create New Group
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredGroups.map((group, index) => (
                                            <motion.tr
                                                key={group.group_id}
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                transition={{ delay: index * 0.05 }}
                                                className="group hover:bg-gradient-to-r hover:from-indigo-50/50 hover:to-blue-50/50 transition-all duration-300"
                                            >
                                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                    <span className="inline-flex items-center justify-center w-7 h-7 bg-slate-100 text-slate-600 font-medium rounded-lg text-xs">
                                                        {((pagination.page - 1) * pagination.limit) + index + 1}
                                                    </span>
                                                </td>

                                                {/* Group Name - Clickable */}
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => handleGroupNameClick(group)}
                                                            className="group/name flex items-center gap-2 focus:outline-none flex-1"
                                                        >
                                                            <div className="p-2 bg-gradient-to-br from-indigo-50 to-blue-50 rounded-lg group-hover/name:scale-110 transition-transform duration-200">
                                                                <FiSettings className="w-4 h-4 text-indigo-600" />
                                                            </div>
                                                            <div className="text-left">
                                                                <span className="text-sm font-semibold text-slate-800 group-hover/name:text-indigo-600 group-hover/name:underline transition-all duration-200">
                                                                    {group.group_name}
                                                                </span>
                                                                {group.description && (
                                                                    <p className="text-xs text-slate-500 mt-0.5">{group.description}</p>
                                                                )}
                                                            </div>
                                                        </button>

                                                        {/* Copy button */}
                                                        <button
                                                            onClick={() => handleCopyGroupName(group.group_name)}
                                                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all duration-200 opacity-0 group-hover:opacity-100"
                                                            title="Copy group name"
                                                        >
                                                            <FiCopy className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                </td>

                                                {/* Firms Count - Clickable */}
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <button
                                                        onClick={() => handleFirmsClick(group)}
                                                        className={`group/firms inline-flex items-center px-4 py-2 rounded-xl border transition-all duration-200 focus:outline-none ${group.unique_firms > 0
                                                                ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-100 hover:border-indigo-300'
                                                                : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                                                            }`}
                                                    >
                                                        <FiHome className={`w-4 h-4 mr-2 group-hover/firms:scale-110 transition-transform ${group.unique_firms > 0 ? 'text-blue-600' : 'text-slate-400'
                                                            }`} />
                                                        <span className={`text-sm font-bold ${group.unique_firms > 0 ? 'text-blue-700' : 'text-slate-500'
                                                            }`}>
                                                            {group.unique_firms || 0}
                                                        </span>
                                                        <span className={`text-xs ml-1 ${group.unique_firms > 0 ? 'text-slate-600' : 'text-slate-400'
                                                            }`}>
                                                            firms
                                                        </span>
                                                        {group.unique_firms > 0 && (
                                                            <FiEye className="w-3 h-3 ml-2 text-indigo-400 opacity-0 group-hover/firms:opacity-100 transition-opacity" />
                                                        )}
                                                    </button>
                                                </td>

                                                {/* Status with Toggle */}
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <button
                                                        onClick={() => handleStatusChange(group)}
                                                        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${group.status === 'active'
                                                                ? 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 hover:from-green-200 hover:to-emerald-200 border border-green-200'
                                                                : 'bg-gradient-to-r from-slate-100 to-gray-100 text-slate-600 hover:from-slate-200 hover:to-gray-200 border border-slate-200'
                                                            }`}
                                                        title={`Click to ${group.status === 'active' ? 'deactivate' : 'activate'}`}
                                                    >
                                                        <span className={`w-2 h-2 rounded-full ${group.status === 'active' ? 'bg-green-500 animate-pulse' : 'bg-slate-400'}`} />
                                                        {group.status === 'active' ? 'Active' : 'Inactive'}
                                                    </button>
                                                </td>

                                                {/* Created Info */}
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center gap-2">
                                                        <FiCalendar className="w-3.5 h-3.5 text-slate-400" />
                                                        <div>
                                                            <div className="text-sm text-slate-700 font-medium">
                                                                {formatDate(group.create_date)}
                                                            </div>
                                                            {group.created_by?.name && (
                                                                <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
                                                                    <FiUser className="w-3 h-3" />
                                                                    <span>{group.created_by.name}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Actions */}
                                                <td className="px-6 py-4 whitespace-nowrap text-right">
                                                    <div className="relative dropdown-container">
                                                        <button
                                                            onClick={() => toggleDropdown(group.group_id)}
                                                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all duration-200"
                                                            title="More actions"
                                                        >
                                                            <FiMoreVertical className="w-5 h-5" />
                                                        </button>

                                                        <AnimatePresence>
                                                            {activeDropdown === group.group_id && (
                                                                <motion.div
                                                                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                                                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                                                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                                                    transition={{ duration: 0.15 }}
                                                                    className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-2xl border border-slate-200 z-50 overflow-hidden"
                                                                >
                                                                    <div className="py-1">
                                                                        <button
                                                                            onClick={() => handleViewGroup(group)}
                                                                            className="flex items-center w-full px-4 py-3 text-sm text-slate-700 hover:bg-gradient-to-r hover:from-indigo-50 hover:to-blue-50 transition-all duration-200"
                                                                        >
                                                                            <div className="p-1.5 bg-indigo-100 rounded-lg mr-3">
                                                                                <FiEye className="w-3.5 h-3.5 text-indigo-600" />
                                                                            </div>
                                                                            <span>View Firms</span>
                                                                            {group.unique_firms > 0 && (
                                                                                <span className="ml-auto text-xs bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full">
                                                                                    {group.unique_firms}
                                                                                </span>
                                                                            )}
                                                                        </button>

                                                                        <button
                                                                            onClick={() => handleCopyGroupName(group.group_name)}
                                                                            className="flex items-center w-full px-4 py-3 text-sm text-slate-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-cyan-50 transition-all duration-200"
                                                                        >
                                                                            <div className="p-1.5 bg-blue-100 rounded-lg mr-3">
                                                                                <FiCopy className="w-3.5 h-3.5 text-blue-600" />
                                                                            </div>
                                                                            <span>Copy Name</span>
                                                                        </button>

                                                                        <button
                                                                            onClick={() => handleEditClick(group)}
                                                                            className="flex items-center w-full px-4 py-3 text-sm text-slate-700 hover:bg-gradient-to-r hover:from-amber-50 hover:to-yellow-50 transition-all duration-200"
                                                                        >
                                                                            <div className="p-1.5 bg-amber-100 rounded-lg mr-3">
                                                                                <FiEdit className="w-3.5 h-3.5 text-amber-600" />
                                                                            </div>
                                                                            <span>Edit Group</span>
                                                                        </button>

                                                                        {group.total_credentials === 0 && (
                                                                            <button
                                                                                onClick={() => handleDeleteClick(group)}
                                                                                className="flex items-center w-full px-4 py-3 text-sm text-red-600 hover:bg-gradient-to-r hover:from-red-50 hover:to-rose-50 transition-all duration-200"
                                                                            >
                                                                                <div className="p-1.5 bg-red-100 rounded-lg mr-3">
                                                                                    <FiTrash className="w-3.5 h-3.5 text-red-600" />
                                                                                </div>
                                                                                <span>Delete Group</span>
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                </motion.div>
                                                            )}
                                                        </AnimatePresence>
                                                    </div>
                                                </td>
                                            </motion.tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Table Footer with Pagination */}
                        <div className="border-t border-slate-200 px-6 py-4 bg-gradient-to-r from-slate-50 to-white">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                <div className="text-sm text-slate-500">
                                    Showing <span className="font-medium text-slate-700">{filteredGroups.length}</span> of{' '}
                                    <span className="font-medium text-slate-700">{pagination.total}</span> groups
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={handlePrevPage}
                                        disabled={pagination.page === 1}
                                        className={`inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${pagination.page === 1
                                                ? 'text-slate-400 cursor-not-allowed'
                                                : 'text-slate-700 hover:bg-indigo-50 hover:text-indigo-600'
                                            }`}
                                    >
                                        <FiChevronLeft className="w-4 h-4 mr-1" />
                                        Previous
                                    </button>

                                    <div className="flex items-center gap-1">
                                        {Array.from({ length: Math.min(5, pagination.total_pages) }, (_, i) => {
                                            let pageNum = pagination.page;
                                            if (pagination.total_pages <= 5) {
                                                pageNum = i + 1;
                                            } else if (pagination.page <= 3) {
                                                pageNum = i + 1;
                                            } else if (pagination.page >= pagination.total_pages - 2) {
                                                pageNum = pagination.total_pages - 4 + i;
                                            } else {
                                                pageNum = pagination.page - 2 + i;
                                            }

                                            return (
                                                <button
                                                    key={i}
                                                    onClick={() => handlePageChange(pageNum)}
                                                    className={`w-8 h-8 rounded-lg text-sm font-medium transition-all duration-200 ${pagination.page === pageNum
                                                            ? 'bg-indigo-600 text-white'
                                                            : 'text-slate-700 hover:bg-indigo-50'
                                                        }`}
                                                >
                                                    {pageNum}
                                                </button>
                                            );
                                        })}
                                    </div>

                                    <button
                                        onClick={handleNextPage}
                                        disabled={pagination.is_last_page}
                                        className={`inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${pagination.is_last_page
                                                ? 'text-slate-400 cursor-not-allowed'
                                                : 'text-slate-700 hover:bg-indigo-50 hover:text-indigo-600'
                                            }`}
                                    >
                                        Next
                                        <FiChevronRight className="w-4 h-4 ml-1" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>

            {/* Create Modal */}
            <AnimatePresence>
                {showCreateModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm" onClick={() => setShowCreateModal(false)}>
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 px-6 py-5">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-white/20 rounded-xl">
                                        <FiPlus className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold text-white">Create New Group</h3>
                                        <p className="text-xs text-indigo-100 mt-1">Add a new password group</p>
                                    </div>
                                </div>
                            </div>

                            <form onSubmit={handleCreateSubmit}>
                                <div className="px-6 py-6">
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                                        Group Name <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={createForm.group_name}
                                        onChange={(e) => handleCreateChange('group_name', e.target.value)}
                                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white shadow-sm transition-all duration-200"
                                        placeholder="Enter group name (e.g., Banking Portals)"
                                        required
                                        autoFocus
                                    />
                                    <p className="mt-2 text-xs text-slate-500">
                                        Choose a descriptive name for your password group
                                    </p>
                                </div>

                                <div className="px-6 py-4 border-t border-slate-200 bg-slate-50/50 flex justify-end gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setShowCreateModal(false)}
                                        className="px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-white hover:border-slate-300 rounded-xl border border-slate-200 transition-all duration-200"
                                        disabled={loading}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white text-sm font-medium rounded-xl shadow-lg shadow-indigo-200 hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                        disabled={loading}
                                    >
                                        {loading ? (
                                            <span className="flex items-center gap-2">
                                                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                Creating...
                                            </span>
                                        ) : 'Create Group'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Edit Modal */}
            <AnimatePresence>
                {showEditModal && selectedGroup && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm" onClick={() => setShowEditModal(false)}>
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="bg-gradient-to-r from-amber-600 to-amber-700 px-6 py-5">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-white/20 rounded-xl">
                                        <FiEdit className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold text-white">Edit Group</h3>
                                        <p className="text-xs text-amber-100 mt-1">Update group information</p>
                                    </div>
                                </div>
                            </div>

                            <form onSubmit={handleEditSubmit}>
                                <div className="px-6 py-6 space-y-5">
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                                            Group Name <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={editForm.group_name}
                                            onChange={(e) => handleEditChange('group_name', e.target.value)}
                                            className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white shadow-sm transition-all duration-200"
                                            placeholder="Enter group name"
                                            required
                                            autoFocus
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                                            Status
                                        </label>
                                        <select
                                            value={editForm.status}
                                            onChange={(e) => handleEditChange('status', e.target.value)}
                                            className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white shadow-sm transition-all duration-200"
                                        >
                                            <option value="active">Active</option>
                                            <option value="inactive">Inactive</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="px-6 py-4 border-t border-slate-200 bg-slate-50/50 flex justify-end gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setShowEditModal(false)}
                                        className="px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-white hover:border-slate-300 rounded-xl border border-slate-200 transition-all duration-200"
                                        disabled={loading}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-5 py-2.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white text-sm font-medium rounded-xl shadow-lg shadow-amber-200 hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                        disabled={loading}
                                    >
                                        {loading ? 'Updating...' : 'Update Group'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Delete Modal */}
            <AnimatePresence>
                {showDeleteModal && selectedGroup && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm" onClick={() => setShowDeleteModal(false)}>
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="bg-gradient-to-r from-red-600 to-red-700 px-6 py-5">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-white/20 rounded-xl">
                                        <FiAlertCircle className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold text-white">Delete Group</h3>
                                        <p className="text-xs text-red-100 mt-1">This action cannot be undone</p>
                                    </div>
                                </div>
                            </div>

                            <div className="px-6 py-6">
                                <div className="flex items-center justify-center mb-6">
                                    <div className="p-4 bg-red-100 rounded-full">
                                        <FiAlertCircle className="w-8 h-8 text-red-600" />
                                    </div>
                                </div>

                                <p className="text-center text-slate-700 mb-3">
                                    Are you sure you want to delete this group?
                                </p>

                                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                                    <p className="text-sm text-slate-600 text-center">
                                        <span className="font-semibold text-slate-800">{selectedGroup.group_name}</span>
                                    </p>
                                </div>

                                <p className="text-center text-xs text-slate-500 mt-4">
                                    This action is permanent and cannot be reversed.
                                </p>
                            </div>

                            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50/50 flex justify-end gap-3">
                                <button
                                    onClick={() => setShowDeleteModal(false)}
                                    className="px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-white hover:border-slate-300 rounded-xl border border-slate-200 transition-all duration-200"
                                    disabled={loading}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDeleteConfirm}
                                    className="px-5 py-2.5 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white text-sm font-medium rounded-xl shadow-lg shadow-red-200 hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                    disabled={loading}
                                >
                                    {loading ? 'Deleting...' : 'Delete Group'}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default PasswordGroups;