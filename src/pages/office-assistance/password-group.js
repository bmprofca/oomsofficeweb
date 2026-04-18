import React, { useState, useEffect } from 'react';
import {
    FiPlus, FiEdit, FiTrash, FiSettings, FiCheck, FiX,
    FiMoreVertical, FiEye, FiHome, FiAlertCircle, FiFilter,
    FiChevronLeft, FiChevronRight, FiCalendar, FiUser, FiGrid,
    FiDownload, FiRefreshCw, FiShare2
} from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { Header, Sidebar } from '../../components/header';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast, Toaster } from 'react-hot-toast';
import { passwordGroupService } from '../../services/passwordGroupService';

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
    const [searchParams, setSearchParams] = useSearchParams();
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
    const [showViewModal, setShowViewModal] = useState(false);
    const [selectedGroup, setSelectedGroup] = useState(null);
    const [activeDropdown, setActiveDropdown] = useState(null);
    const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
    const [pagination, setPagination] = useState({
        page: Number(searchParams.get('page')) || 1,
        limit: Number(searchParams.get('limit')) || 20,
        total: 0,
        total_pages: 1,
        is_last_page: false
    });
    const [jumpPageInput, setJumpPageInput] = useState(String(Number(searchParams.get('page')) || 1));
    const [statusFilter] = useState('all');

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

    const applyStatusFilter = (data, status) => {
        if (status === 'all') return data;
        return (data || []).filter((group) => group.status === status);
    };

    // Initial data load
    useEffect(() => {
        fetchGroupsData(searchTerm, pagination.page, pagination.limit);
    }, [pagination.page, pagination.limit, searchTerm]);

    useEffect(() => {
        setFilteredGroups(applyStatusFilter(groups, statusFilter));
    }, [groups, statusFilter]);

    // Fetch groups data from API
    const fetchGroupsData = async (searchValue = searchTerm, pageValue = pagination.page, limitValue = pagination.limit) => {
        setLoading(true);

        try {
            const response = await passwordGroupService.listGroups({
                search: searchValue,
                page: pageValue,
                limit: limitValue,
            });
            const result = response.data;

            if (result.success) {
                const list = result.data || [];
                setGroups(list);
                setFilteredGroups(applyStatusFilter(list, statusFilter));
                setPagination({
                    page: result.meta?.page || 1,
                    limit: result.meta?.limit || 20,
                    total: result.meta?.total || 0,
                    total_pages: result.meta?.total_pages || 1,
                    is_last_page: result.meta?.is_last_page || false
                });
                setSearchParams({
                    page: String(result.meta?.page || pageValue || 1),
                    limit: String(result.meta?.limit || limitValue || 20),
                    ...(searchValue?.trim() ? { search: searchValue.trim() } : {}),
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
            const response = await passwordGroupService.createGroup({
                group_name: createForm.group_name.trim(),
            });
            const result = response.data;

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
            const response = await passwordGroupService.editGroup(editForm.group_id, {
                group_name: editForm.group_name.trim(),
                status: editForm.status || undefined,
            });
            const result = response.data;

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
            const response = await passwordGroupService.deleteGroup(selectedGroup.group_id);
            const result = response.data;

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
            const response = await passwordGroupService.editGroup(group.group_id, {
                group_name: group.group_name,
                status: newStatus,
            });
            const result = response.data;

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
    const handleViewGroupFirms = (group) => {
        navigate(`/staff/office-assistance/password-group/${group.group_id}/firms`, {
            state: { group_name: group.group_name }
        });
    };

    const handleViewDetailsClick = (group) => {
        setSelectedGroup(group);
        setShowViewModal(true);
        setActiveDropdown(null);
    };

    // Handle group name click
    const handleGroupNameClick = (group) => {
        handleViewGroupFirms(group);
    };

    // Handle firms count click
    const handleFirmsClick = (group) => {
        handleViewGroupFirms(group);
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

    const handleJumpToPage = (e) => {
        e.preventDefault();
        const parsedPage = Number(jumpPageInput);
        if (!Number.isFinite(parsedPage)) {
            setJumpPageInput(String(pagination.page));
            return;
        }
        const clampedPage = Math.min(Math.max(1, Math.floor(parsedPage)), Math.max(1, pagination.total_pages));
        setJumpPageInput(String(clampedPage));
        handlePageChange(clampedPage);
    };

    useEffect(() => {
        setJumpPageInput(String(pagination.page));
    }, [pagination.page]);

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
                <div className="max-w-7xl mx-auto px-3 sm:px-5 lg:px-6 py-5 text-sm [&_h1]:text-2xl [&_h1]:font-bold [&_h2]:text-lg [&_h2]:font-bold [&_h3]:text-base [&_h3]:font-bold [&_label]:text-xs [&_label]:font-semibold [&_label]:text-slate-600 [&_th]:text-xs [&_th]:font-semibold [&_th]:text-slate-600 [&_td]:text-sm [&_input]:text-sm [&_input]:text-slate-700 [&_select]:text-sm [&_select]:text-slate-700 [&_textarea]:text-sm [&_textarea]:text-slate-700 [&_button]:text-sm [&_button]:font-semibold">
                    {/* Header Section with Breadcrumb */}
                    <div className="mb-5">
                        <nav className="flex items-center text-sm text-slate-500 mb-3">
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

                    {/* Main Card */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white rounded-xl shadow-lg border border-slate-200"
                    >
                        {/* Card Header */}
                        <div className="border-b border-slate-200 px-4 sm:px-5 py-4 bg-slate-50">
                            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-indigo-50 rounded-lg">
                                        <FiGrid className="w-5 h-5 text-indigo-600" />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-semibold text-slate-800">
                                            Groups Directory
                                        </h2>
                                    </div>
                                </div>

                                <div className="flex flex-col sm:flex-row gap-3">
                                    {/* Search Component */}
                                    <div className="relative w-full sm:w-72">
                                        <input
                                            type="text"
                                            placeholder="Search groups by name..."
                                            value={searchTerm}
                                            onChange={(e) => handleSearch(e.target.value)}
                                            className="w-full px-4 py-2.5 pl-10 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white shadow-sm"
                                        />
                                        <FiFilter className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Table */}
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-slate-200">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                            #
                                        </th>
                                        <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                            Group Details
                                        </th>
                                        <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                            Firms
                                        </th>
                                        <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                            Status
                                        </th>
                                        <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                            Created
                                        </th>
                                        <th scope="col" className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
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
                                                    <td key={cellIndex} className="px-4 py-3">
                                                        <div className="h-4 bg-slate-200 rounded animate-pulse"></div>
                                                    </td>
                                                ))}
                                            </tr>
                                        ))
                                    ) : filteredGroups.length === 0 ? (
                                        <tr>
                                            <td colSpan="6" className="px-4 py-12 text-center">
                                                <div className="flex flex-col items-center">
                                                    <div className="p-4 bg-slate-100 rounded-full mb-4">
                                                        <FiSettings className="w-8 h-8 text-slate-400" />
                                                    </div>
                                                    <p className="text-slate-600 text-lg font-medium mb-2">
                                                        No password groups found
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
                                                <td className="px-4 py-3 whitespace-nowrap text-sm">
                                                    <span className="inline-flex items-center justify-center w-7 h-7 bg-slate-100 text-slate-600 font-medium rounded-lg text-xs">
                                                        {((pagination.page - 1) * pagination.limit) + index + 1}
                                                    </span>
                                                </td>

                                                {/* Group Name - Clickable */}
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => handleGroupNameClick(group)}
                                                            className="group/name flex items-center gap-2 focus:outline-none flex-1"
                                                        >
                                                            <div className="p-2 bg-gradient-to-br from-indigo-50 to-blue-50 rounded-lg group-hover/name:scale-110 transition-transform duration-200">
                                                                <FiSettings className="w-4 h-4 text-indigo-600" />
                                                            </div>
                                                            <div className="text-left">
                                                                <span className="text-sm font-semibold text-slate-800 transition-colors duration-200">
                                                                    {group.group_name}
                                                                </span>
                                                                {group.description && (
                                                                    <p className="text-xs text-slate-500 mt-0.5">{group.description}</p>
                                                                )}
                                                            </div>
                                                        </button>
                                                    </div>
                                                </td>

                                                {/* Firms Count - Clickable Compact Badge */}
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    <button
                                                        onClick={() => handleFirmsClick(group)}
                                                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium transition-all duration-200 focus:outline-none ${group.unique_firms > 0
                                                            ? 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100'
                                                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                                                            }`}
                                                    >
                                                        <FiHome className={`w-3.5 h-3.5 ${group.unique_firms > 0 ? 'text-blue-600' : 'text-slate-500'
                                                            }`} />
                                                        <span>{group.unique_firms || 0} firms</span>
                                                    </button>
                                                </td>

                                                {/* Status with Toggle */}
                                                <td className="px-4 py-3 whitespace-nowrap">
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
                                                <td className="px-4 py-3 whitespace-nowrap">
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
                                                <td className="px-4 py-3 whitespace-nowrap text-right">
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
                                                                    initial={{ opacity: 0, y: index >= filteredGroups.length - 2 ? 8 : -8, scale: 0.95 }}
                                                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                                                    exit={{ opacity: 0, y: index >= filteredGroups.length - 2 ? 8 : -8, scale: 0.95 }}
                                                                    transition={{ duration: 0.15 }}
                                                                    className={`absolute right-0 w-56 bg-white rounded-xl shadow-2xl border border-slate-200 z-[9999] overflow-hidden ${index >= filteredGroups.length - 2 ? 'bottom-full mb-2' : 'top-full mt-2'}`}
                                                                >
                                                                    <div className="py-1">
                                                                        <button
                                                                            onClick={() => handleViewDetailsClick(group)}
                                                                            className="flex items-center w-full px-4 py-3 text-sm text-slate-700 hover:bg-gradient-to-r hover:from-indigo-50 hover:to-blue-50 transition-all duration-200"
                                                                        >
                                                                            <div className="p-1.5 bg-indigo-100 rounded-lg mr-3">
                                                                                <FiEye className="w-3.5 h-3.5 text-indigo-600" />
                                                                            </div>
                                                                            <span>View Details</span>
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

                                                                        <button
                                                                            onClick={() => handleDeleteClick(group)}
                                                                            className="flex items-center w-full px-4 py-3 text-sm text-red-600 hover:bg-gradient-to-r hover:from-red-50 hover:to-rose-50 transition-all duration-200"
                                                                        >
                                                                            <div className="p-1.5 bg-red-100 rounded-lg mr-3">
                                                                                <FiTrash className="w-3.5 h-3.5 text-red-600" />
                                                                            </div>
                                                                            <span>Delete Group</span>
                                                                        </button>
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
                        <div className="border-t border-slate-200 px-4 py-3 bg-slate-50">
                            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                                <div className="text-sm text-slate-500">
                                    Showing{' '}
                                    <span className="font-medium text-slate-700">
                                        {pagination.total === 0 ? 0 : ((pagination.page - 1) * pagination.limit) + 1}
                                    </span>{' '}
                                    to{' '}
                                    <span className="font-medium text-slate-700">
                                        {Math.min(pagination.page * pagination.limit, pagination.total)}
                                    </span>{' '}
                                    of <span className="font-medium text-slate-700">{pagination.total}</span>
                                </div>

                                <div className="flex flex-wrap items-center gap-2">
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

                                    <form onSubmit={handleJumpToPage} className="flex items-center gap-1 ml-0 sm:ml-2">
                                        <input
                                            type="number"
                                            min="1"
                                            max={Math.max(1, pagination.total_pages)}
                                            value={jumpPageInput}
                                            onChange={(e) => setJumpPageInput(e.target.value)}
                                            className="w-16 px-2 py-1.5 border border-slate-300 rounded-md text-sm text-center focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                            aria-label="Jump to page"
                                        />
                                        <button
                                            type="submit"
                                            className="px-2.5 py-1.5 rounded-md text-sm font-medium text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                                        >
                                            Go
                                        </button>
                                    </form>
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

            {/* View Details Modal */}
            <AnimatePresence>
                {showViewModal && selectedGroup && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm" onClick={() => setShowViewModal(false)}>
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 12 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 12 }}
                            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 px-6 py-5">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-white/20 rounded-xl">
                                        <FiEye className="w-5 h-5 text-white" />
                                    </div>
                                    <h3 className="text-lg font-semibold text-white">Group Details</h3>
                                </div>
                            </div>

                            <div className="px-6 py-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                                    <p className="text-xs font-medium text-slate-500">Group Name</p>
                                    <p className="mt-1 text-sm font-semibold text-slate-800">{selectedGroup.group_name || '-'}</p>
                                </div>
                                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                                    <p className="text-xs font-medium text-slate-500">Status</p>
                                    <p className="mt-1 text-sm font-semibold text-slate-800">{selectedGroup.status || '-'}</p>
                                </div>
                                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                                    <p className="text-xs font-medium text-slate-500">Total Credentials</p>
                                    <p className="mt-1 text-sm font-semibold text-slate-800">{selectedGroup.total_credentials ?? 0}</p>
                                </div>
                                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                                    <p className="text-xs font-medium text-slate-500">Unique Firms</p>
                                    <p className="mt-1 text-sm font-semibold text-slate-800">{selectedGroup.unique_firms ?? 0}</p>
                                </div>
                                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                                    <p className="text-xs font-medium text-slate-500">Created By</p>
                                    <p className="mt-1 text-sm font-semibold text-slate-800">{selectedGroup.created_by?.name || '-'}</p>
                                </div>
                                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                                    <p className="text-xs font-medium text-slate-500">Created On</p>
                                    <p className="mt-1 text-sm font-semibold text-slate-800">{formatDate(selectedGroup.create_date)}</p>
                                </div>
                            </div>

                            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50/60 flex justify-end">
                                <button
                                    type="button"
                                    onClick={() => setShowViewModal(false)}
                                    className="px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-white hover:border-slate-300 rounded-xl border border-slate-200 transition-all duration-200"
                                >
                                    Close
                                </button>
                            </div>
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